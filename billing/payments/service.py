from __future__ import annotations

import logging
from decimal import Decimal
from urllib.parse import urlencode

from django.conf import settings as django_settings
from django.db import transaction
from django.urls import reverse
from django.utils import timezone

from audit.services import log_action
from billing.models import PaymentTransaction, Plan
from billing.payments import bitpay, zibal
from billing.payments.settings import effective_payment_settings
from billing.subscription import apply_subscription_plan

logger = logging.getLogger(__name__)


class PaymentError(Exception):
    pass


def bitpay_callback_url(request) -> str:
    cfg = effective_payment_settings()
    if cfg["bitpay_callback_url"]:
        return cfg["bitpay_callback_url"]
    return request.build_absolute_uri(reverse("payment-bitpay-callback"))


def zibal_callback_url(request) -> str:
    cfg = effective_payment_settings()
    if cfg["zibal_callback_url"]:
        return cfg["zibal_callback_url"]
    return request.build_absolute_uri(reverse("payment-zibal-callback"))


def frontend_payment_url(status: str, transaction_id: int | None = None) -> str:
    base = (getattr(django_settings, "FRONTEND_SITE_URL", "") or "").rstrip("/")
    params = {"payment": status}
    if transaction_id:
        params["transaction"] = str(transaction_id)
    query = urlencode(params)
    path = f"/app/billing?{query}"
    if base:
        return f"{base}{path}"
    return path


def _log_payment(payment: PaymentTransaction, action: str) -> None:
    log_action(
        action=action,
        entity="payment",
        entity_id=payment.pk,
        organization=payment.organization,
        metadata={
            "gateway": payment.gateway,
            "amount": payment.amount,
            "factor_id": payment.factor_id,
        },
    )


def start_bitpay_payment(*, request, organization, plan: Plan, amount: int):
    cfg = effective_payment_settings()
    if not cfg["bitpay_enabled"]:
        raise PaymentError("درگاه بیت‌پی غیرفعال است.")
    if not cfg["bitpay_api_key"]:
        raise PaymentError("کلید API بیت‌پی تنظیم نشده است.")
    if amount <= 0:
        raise PaymentError("مبلغ پرداخت معتبر نیست.")

    payment = PaymentTransaction.objects.create(
        organization=organization,
        plan=plan,
        gateway=PaymentTransaction.Gateway.BITPAY,
        amount=amount,
    )
    payment.factor_id = f"gvh-{payment.pk}"
    redirect = bitpay_callback_url(request)
    payment.request_payload = {
        "redirect": redirect,
        "amount": str(int(bitpay.amount_toman_to_rial(Decimal(amount)))),
        "factorId": payment.factor_id,
        "name": organization.name,
        "description": f"اشتراک {plan.name_fa or plan.name}",
    }
    payment.save(update_fields=["factor_id", "request_payload", "updated_at"])

    try:
        result = bitpay.request_payment(
            api_key=cfg["bitpay_api_key"],
            redirect_url=redirect,
            amount=Decimal(amount),
            factor_id=payment.factor_id,
            name=organization.name,
            email=organization.contact_email or "",
            description=f"اشتراک {plan.name_fa or plan.name}",
        )
    except bitpay.BitPayError as exc:
        payment.status = PaymentTransaction.Status.FAILED
        payment.error_message = str(exc)[:500]
        payment.save(update_fields=["status", "error_message", "updated_at"])
        _log_payment(payment, "payment.failed")
        raise PaymentError(str(exc)) from exc

    payment.gateway_reference = result.id_get
    payment.request_response = result.raw
    payment.save(update_fields=["gateway_reference", "request_response", "updated_at"])
    _log_payment(payment, "payment.start")
    return payment, result.redirect_url


def start_zibal_payment(*, request, organization, plan: Plan, amount: int):
    cfg = effective_payment_settings()
    if not cfg["zibal_enabled"]:
        raise PaymentError("درگاه زیبال غیرفعال است.")
    if not cfg["zibal_merchant_id"]:
        raise PaymentError("مرچنت زیبال تنظیم نشده است.")
    if amount <= 0:
        raise PaymentError("مبلغ پرداخت معتبر نیست.")

    amount_rials = zibal.amount_toman_to_rial(Decimal(amount))
    if amount_rials <= 1000:
        raise PaymentError("مبلغ پرداخت زیبال باید بیشتر از ۱۰۰۰ ریال باشد.")

    payment = PaymentTransaction.objects.create(
        organization=organization,
        plan=plan,
        gateway=PaymentTransaction.Gateway.ZIBAL,
        amount=amount,
    )
    payment.factor_id = f"gvh-{payment.pk}"
    callback = zibal_callback_url(request)
    payment.request_payload = {
        "callbackUrl": callback,
        "amount": str(int(amount_rials)),
        "orderId": payment.factor_id,
        "description": f"اشتراک {plan.name_fa or plan.name}",
    }
    payment.save(update_fields=["factor_id", "request_payload", "updated_at"])

    try:
        result = zibal.request_payment(
            merchant=cfg["zibal_merchant_id"],
            callback_url=callback,
            amount=Decimal(amount),
            order_id=payment.factor_id,
            description=f"اشتراک {plan.name_fa or plan.name}",
        )
    except zibal.ZibalError as exc:
        payment.status = PaymentTransaction.Status.FAILED
        payment.error_message = str(exc)[:500]
        payment.save(update_fields=["status", "error_message", "updated_at"])
        _log_payment(payment, "payment.failed")
        raise PaymentError(str(exc)) from exc

    payment.gateway_reference = result.track_id
    payment.request_response = result.raw
    payment.save(update_fields=["gateway_reference", "request_response", "updated_at"])
    _log_payment(payment, "payment.start")
    return payment, result.redirect_url


def find_bitpay_transaction(*, id_get: str = "", factor_id: str = ""):
    qs = PaymentTransaction.objects.filter(gateway=PaymentTransaction.Gateway.BITPAY)
    if id_get:
        found = qs.filter(gateway_reference=str(id_get)).order_by("-created_at").first()
        if found:
            return found
    if factor_id:
        return qs.filter(factor_id=str(factor_id)).order_by("-created_at").first()
    return None


def find_zibal_transaction(*, track_id: str = "", order_id: str = ""):
    qs = PaymentTransaction.objects.filter(gateway=PaymentTransaction.Gateway.ZIBAL)
    if track_id:
        found = qs.filter(gateway_reference=str(track_id)).order_by("-created_at").first()
        if found:
            return found
    if order_id:
        return qs.filter(factor_id=str(order_id)).order_by("-created_at").first()
    return None


def _mark_payment_failed(payment: PaymentTransaction, message: str, extra_fields: list[str]):
    payment.status = PaymentTransaction.Status.FAILED
    payment.error_message = message[:500]
    payment.save(update_fields=[*extra_fields, "status", "error_message", "updated_at"])
    _log_payment(payment, "payment.failed")


def _apply_paid(payment: PaymentTransaction) -> None:
    plan = payment.plan
    if not plan:
        raise PaymentError("پلن مرتبط با تراکنش یافت نشد.")
    apply_subscription_plan(organization=payment.organization, plan=plan)
    _log_payment(payment, "payment.success")


def _already_applied(payment: PaymentTransaction) -> bool:
    return payment.status == PaymentTransaction.Status.PAID and bool(payment.applied_at)


def verify_and_apply_bitpay_payment(*, payment: PaymentTransaction, trans_id: str, id_get: str):
    payment.refresh_from_db()
    if _already_applied(payment):
        return payment

    cfg = effective_payment_settings()
    if not cfg["bitpay_api_key"]:
        raise PaymentError("کلید API بیت‌پی تنظیم نشده است.")
    if not trans_id:
        raise PaymentError("شناسه trans_id از بیت‌پی دریافت نشد.")
    id_get = id_get or payment.gateway_reference
    if not id_get:
        raise PaymentError("شناسه id_get از بیت‌پی دریافت نشد.")

    payment.gateway_transaction_id = str(trans_id)
    try:
        result = bitpay.verify_payment(
            api_key=cfg["bitpay_api_key"],
            trans_id=str(trans_id),
            id_get=str(id_get),
        )
    except bitpay.BitPayError as exc:
        logger.warning("BitPay verify failed for payment %s: %s", payment.pk, exc)
        _mark_payment_failed(payment, str(exc), extra_fields=["gateway_transaction_id"])
        raise PaymentError(str(exc)) from exc

    payment.verify_response = result.raw
    payment.card_number = result.card_number
    persisted = ["gateway_transaction_id", "verify_response", "card_number"]

    if result.amount is not None and not bitpay._amount_matches_expected(
        result.amount, Decimal(payment.amount)
    ):
        _mark_payment_failed(
            payment,
            "مبلغ پرداختی بیت‌پی با مبلغ تراکنش همخوانی ندارد.",
            extra_fields=persisted,
        )
        return payment

    if not result.success:
        _mark_payment_failed(
            payment,
            f"پرداخت بیت‌پی ناموفق بود. وضعیت: {result.status}",
            extra_fields=persisted,
        )
        return payment

    with transaction.atomic():
        locked = PaymentTransaction.objects.select_for_update().get(pk=payment.pk)
        if _already_applied(locked):
            return locked
        payment.verified_at = timezone.now()
        payment.save(update_fields=[*persisted, "verified_at", "updated_at"])
        _apply_paid(payment)
        payment.status = PaymentTransaction.Status.PAID
        payment.applied_at = timezone.now()
        payment.error_message = ""
        payment.save(update_fields=["status", "applied_at", "error_message", "updated_at"])
    return payment


def verify_and_apply_zibal_payment(*, payment: PaymentTransaction, track_id: str):
    payment.refresh_from_db()
    if _already_applied(payment):
        return payment

    cfg = effective_payment_settings()
    if not cfg["zibal_merchant_id"]:
        raise PaymentError("مرچنت زیبال تنظیم نشده است.")
    track_id = track_id or payment.gateway_reference
    if not track_id:
        raise PaymentError("شناسه trackId از زیبال دریافت نشد.")

    try:
        result = zibal.verify_payment(
            merchant=cfg["zibal_merchant_id"],
            track_id=str(track_id),
        )
    except zibal.ZibalError as exc:
        logger.warning("Zibal verify failed for payment %s: %s", payment.pk, exc)
        _mark_payment_failed(payment, str(exc), extra_fields=[])
        raise PaymentError(str(exc)) from exc

    payment.gateway_reference = str(track_id)
    payment.gateway_transaction_id = result.ref_number
    payment.verify_response = result.raw
    payment.card_number = result.card_number
    persisted = [
        "gateway_reference",
        "gateway_transaction_id",
        "verify_response",
        "card_number",
    ]

    expected_rials = zibal.amount_toman_to_rial(Decimal(payment.amount))
    if result.amount_rials is not None and result.amount_rials != expected_rials:
        _mark_payment_failed(
            payment,
            "مبلغ پرداختی زیبال با مبلغ تراکنش همخوانی ندارد.",
            extra_fields=persisted,
        )
        return payment

    if not result.success:
        _mark_payment_failed(
            payment,
            f"پرداخت زیبال ناموفق بود. نتیجه: {result.result}",
            extra_fields=persisted,
        )
        return payment

    with transaction.atomic():
        locked = PaymentTransaction.objects.select_for_update().get(pk=payment.pk)
        if _already_applied(locked):
            return locked
        payment.verified_at = timezone.now()
        payment.save(update_fields=[*persisted, "verified_at", "updated_at"])
        _apply_paid(payment)
        payment.status = PaymentTransaction.Status.PAID
        payment.applied_at = timezone.now()
        payment.error_message = ""
        payment.save(update_fields=["status", "applied_at", "error_message", "updated_at"])
    return payment
