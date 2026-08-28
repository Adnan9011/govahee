from django.http import HttpResponseRedirect
from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import HasOrgPermission
from billing.entitlements import get_entitlements
from billing.models import Plan, Subscription
from billing.payments.service import (
    PaymentError,
    find_bitpay_transaction,
    find_zibal_transaction,
    frontend_payment_url,
    start_bitpay_payment,
    start_zibal_payment,
    verify_and_apply_bitpay_payment,
    verify_and_apply_zibal_payment,
)
from billing.payments.settings import effective_payment_settings
from billing.plans import seed_plans
from billing.models import PaymentTransaction


class PlanViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.AllowAny]
    queryset = Plan.objects.filter(is_active=True)

    def list(self, request):
        seed_plans()
        data = [
            {
                "id": p.id,
                "code": p.code,
                "name": p.name,
                "name_fa": p.name_fa,
                "interval": p.interval,
                "price_toman": p.price_toman,
                "capabilities": p.capabilities,
            }
            for p in self.get_queryset()
        ]
        return Response(data)


class SubscriptionView(APIView):
    permission_classes = [HasOrgPermission]
    required_permission = "billing.read"

    def get(self, request):
        sub = (
            Subscription.objects.select_related("plan")
            .filter(organization=request.organization)
            .first()
        )
        gateways = effective_payment_settings()
        return Response(
            {
                "subscription": {
                    "status": sub.status if sub else None,
                    "plan": sub.plan.code if sub else "free",
                    "current_period_end": sub.current_period_end if sub else None,
                }
                if sub
                else None,
                "entitlements": get_entitlements(request.organization),
                "gateways": {
                    "bitpay": bool(gateways["bitpay_enabled"] and gateways["bitpay_api_key"]),
                    "zibal": bool(gateways["zibal_enabled"] and gateways["zibal_merchant_id"]),
                },
            }
        )


class PaymentStartView(APIView):
    permission_classes = [HasOrgPermission]
    required_permission = "billing.write"

    def post(self, request):
        gateway = (request.data.get("gateway") or "").strip()
        plan_id = request.data.get("plan_id")
        plan = Plan.objects.filter(pk=plan_id, is_active=True).first()
        if plan is None:
            raise ValidationError({"plan_id": "پلن یافت نشد."})
        if plan.price_toman <= 0:
            raise ValidationError({"plan_id": "این پلن نیاز به پرداخت ندارد."})
        try:
            if gateway == PaymentTransaction.Gateway.BITPAY:
                payment, redirect_url = start_bitpay_payment(
                    request=request,
                    organization=request.organization,
                    plan=plan,
                    amount=plan.price_toman,
                )
            elif gateway == PaymentTransaction.Gateway.ZIBAL:
                payment, redirect_url = start_zibal_payment(
                    request=request,
                    organization=request.organization,
                    plan=plan,
                    amount=plan.price_toman,
                )
            else:
                raise ValidationError({"gateway": "درگاه نامعتبر است."})
        except PaymentError as exc:
            raise ValidationError({"detail": str(exc)}) from exc
        return Response(
            {
                "id": payment.pk,
                "gateway": payment.gateway,
                "status": payment.status,
                "amount": payment.amount,
                "redirect_url": redirect_url,
            },
            status=status.HTTP_201_CREATED,
        )


def _callback_param(request, *keys: str) -> str:
    for key in keys:
        value = request.query_params.get(key)
        if value:
            return str(value)
        if hasattr(request, "data"):
            value = request.data.get(key)
            if value:
                return str(value)
    return ""


class BitPayCallbackView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return self._handle(request)

    def post(self, request):
        return self._handle(request)

    def _handle(self, request):
        id_get = _callback_param(request, "id_get", "id", "get_id")
        trans_id = _callback_param(request, "trans_id", "transId", "transaction_id", "transid")
        factor_id = _callback_param(request, "factorId", "factor_id")
        payment = find_bitpay_transaction(id_get=id_get, factor_id=factor_id)
        if not payment:
            return Response({"detail": "تراکنش بیت‌پی یافت نشد."}, status=404)
        try:
            payment = verify_and_apply_bitpay_payment(
                payment=payment, trans_id=trans_id, id_get=id_get
            )
        except PaymentError:
            return HttpResponseRedirect(frontend_payment_url("failed", payment.pk))
        result = "success" if payment.status == PaymentTransaction.Status.PAID else "failed"
        return HttpResponseRedirect(frontend_payment_url(result, payment.pk))


class ZibalCallbackView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return self._handle(request)

    def post(self, request):
        return self._handle(request)

    def _handle(self, request):
        track_id = _callback_param(request, "trackId", "track_id")
        order_id = _callback_param(request, "orderId", "order_id")
        success = _callback_param(request, "success")
        payment = find_zibal_transaction(track_id=track_id, order_id=order_id)
        if not payment:
            return Response({"detail": "تراکنش زیبال یافت نشد."}, status=404)
        if success in {"0", "false", "False"}:
            payment.status = PaymentTransaction.Status.CANCELED
            payment.error_message = "کاربر پرداخت را لغو کرد."
            payment.save(update_fields=["status", "error_message", "updated_at"])
            return HttpResponseRedirect(frontend_payment_url("canceled", payment.pk))
        try:
            payment = verify_and_apply_zibal_payment(payment=payment, track_id=track_id)
        except PaymentError:
            return HttpResponseRedirect(frontend_payment_url("failed", payment.pk))
        result = "success" if payment.status == PaymentTransaction.Status.PAID else "failed"
        return HttpResponseRedirect(frontend_payment_url(result, payment.pk))
