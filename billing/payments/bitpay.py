from __future__ import annotations

import json
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

BITPAY_REQUEST_URL = "https://bitpay.ir/payment/gateway-send"
BITPAY_VERIFY_URL = "https://bitpay.ir/payment/gateway-result-second"
BITPAY_REDIRECT_TEMPLATE = "https://bitpay.ir/payment/gateway-{id_get}-get"


class BitPayError(Exception):
    """Raised when BitPay rejects or fails a payment operation."""


@dataclass(frozen=True)
class BitPayRequestResult:
    id_get: str
    redirect_url: str
    raw: dict


@dataclass(frozen=True)
class BitPayVerifyResult:
    success: bool
    status: object
    amount: Decimal | None
    card_number: str
    factor_id: str
    raw: dict


def _post_form(url: str, payload: dict, *, timeout: int = 30) -> str:
    data = urlencode(payload).encode("utf-8")
    request = Request(
        url,
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            return response.read().decode("utf-8").strip()
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise BitPayError(f"خطای بیت‌پی ({exc.code}): {body}") from exc
    except URLError as exc:
        raise BitPayError("اتصال به بیت‌پی برقرار نشد.") from exc


def _decimal_or_none(value) -> Decimal | None:
    if value in (None, ""):
        return None
    try:
        return Decimal(str(value))
    except Exception:
        return None


def amount_toman_to_rial(amount: Decimal) -> Decimal:
    return (Decimal(str(amount)) * Decimal("10")).quantize(
        Decimal("1"), rounding=ROUND_HALF_UP
    )


def amount_rial_to_toman(amount: Decimal) -> Decimal:
    return (Decimal(str(amount)) / Decimal("10")).quantize(
        Decimal("1"), rounding=ROUND_HALF_UP
    )


def _status_is_success(status: object) -> bool:
    if isinstance(status, bool):
        return status
    if isinstance(status, int | float) and status in {1, 11}:
        return True
    normalized = str(status).strip().lower()
    return normalized in {"1", "11", "success", "successful", "paid", "ok", "true"}


def _amount_matches_expected(verified_amount: Decimal, expected_toman: Decimal) -> bool:
    expected = Decimal(str(expected_toman)).quantize(Decimal("1"))
    verified = Decimal(str(verified_amount)).quantize(Decimal("1"))
    if verified == expected:
        return True
    if amount_rial_to_toman(verified) == expected:
        return True
    if verified == amount_toman_to_rial(expected):
        return True
    return False


def request_payment(
    *,
    api_key: str,
    redirect_url: str,
    amount: Decimal,
    factor_id: str,
    name: str,
    email: str = "",
    description: str = "",
    timeout: int = 30,
) -> BitPayRequestResult:
    amount_rials = amount_toman_to_rial(amount)
    payload = {
        "api": api_key,
        "redirect": redirect_url,
        "amount": str(int(amount_rials)),
        "factorId": factor_id,
        "name": name,
        "email": email,
        "description": description,
    }
    text = _post_form(BITPAY_REQUEST_URL, payload, timeout=timeout)
    try:
        id_number = int(text)
    except (TypeError, ValueError) as exc:
        raise BitPayError(f"پاسخ نامعتبر بیت‌پی: {text}") from exc
    if id_number <= 0:
        raise BitPayError(f"بیت‌پی درخواست پرداخت را رد کرد. کد خطا: {text}")
    id_get = str(id_number)
    return BitPayRequestResult(
        id_get=id_get,
        redirect_url=BITPAY_REDIRECT_TEMPLATE.format(id_get=id_get),
        raw={"id_get": id_get},
    )


def verify_payment(
    *,
    api_key: str,
    trans_id: str,
    id_get: str,
    timeout: int = 30,
) -> BitPayVerifyResult:
    payload = {
        "api": api_key,
        "trans_id": trans_id,
        "id_get": id_get,
        "json": 1,
    }
    text = _post_form(BITPAY_VERIFY_URL, payload, timeout=timeout)
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise BitPayError(f"پاسخ verify بیت‌پی نامعتبر است: {text}") from exc

    # BitPay returns a JSON object on success, but some error responses come back
    # as a bare status code (e.g. -4 or "11"). Normalize both shapes so callers
    # always get a structured result instead of crashing on ``.get``.
    if not isinstance(data, dict):
        return BitPayVerifyResult(
            success=_status_is_success(data),
            status=data,
            amount=None,
            card_number="",
            factor_id="",
            raw={"status": data},
        )

    status = data.get("status")
    amount = _decimal_or_none(data.get("amount"))
    return BitPayVerifyResult(
        success=_status_is_success(status),
        status=status,
        amount=amount,
        card_number=str(data.get("cardNum") or ""),
        factor_id=str(data.get("factorId") or ""),
        raw=data,
    )
