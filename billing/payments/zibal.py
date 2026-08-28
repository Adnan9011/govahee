from __future__ import annotations

import json
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ZIBAL_REQUEST_URL = "https://gateway.zibal.ir/v1/request"
ZIBAL_VERIFY_URL = "https://gateway.zibal.ir/v1/verify"
ZIBAL_REDIRECT_TEMPLATE = "https://gateway.zibal.ir/start/{track_id}"
ZIBAL_SUCCESS_RESULT_CODES = {100, 201}


class ZibalError(Exception):
    """Raised when Zibal rejects or fails a payment operation."""


@dataclass(frozen=True)
class ZibalRequestResult:
    track_id: str
    redirect_url: str
    raw: dict


@dataclass(frozen=True)
class ZibalVerifyResult:
    success: bool
    result: int | None
    status: object
    amount_rials: Decimal | None
    card_number: str
    ref_number: str
    order_id: str
    raw: dict


def amount_toman_to_rial(amount: Decimal) -> Decimal:
    return (Decimal(str(amount)) * Decimal("10")).quantize(
        Decimal("1"), rounding=ROUND_HALF_UP
    )


def _post_json(url: str, payload: dict, *, timeout: int = 30) -> dict:
    data = json.dumps(payload).encode("utf-8")
    request = Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            text = response.read().decode("utf-8").strip()
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise ZibalError(f"خطای زیبال ({exc.code}): {body}") from exc
    except URLError as exc:
        raise ZibalError("اتصال به زیبال برقرار نشد.") from exc
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ZibalError(f"پاسخ زیبال نامعتبر است: {text}") from exc
    if not isinstance(data, dict):
        raise ZibalError(f"پاسخ زیبال ساختار معتبری ندارد: {text}")
    return data


def _decimal_or_none(value) -> Decimal | None:
    if value in (None, ""):
        return None
    try:
        return Decimal(str(value))
    except Exception:
        return None


def _int_or_none(value) -> int | None:
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _status_is_paid(status: object) -> bool:
    if status in (None, ""):
        return True
    return str(status).strip() == "1"


def request_payment(
    *,
    merchant: str,
    callback_url: str,
    amount: Decimal,
    order_id: str,
    mobile: str = "",
    description: str = "",
    timeout: int = 30,
) -> ZibalRequestResult:
    amount_rials = amount_toman_to_rial(amount)
    payload = {
        "merchant": merchant,
        "amount": int(amount_rials),
        "callbackUrl": callback_url,
        "description": description,
        "orderId": order_id,
    }
    if mobile:
        payload["mobile"] = mobile

    data = _post_json(ZIBAL_REQUEST_URL, payload, timeout=timeout)
    result = _int_or_none(data.get("result"))
    if result != 100:
        message = data.get("message") or "درخواست پرداخت زیبال رد شد."
        raise ZibalError(f"{message} کد نتیجه: {data.get('result')}")
    track_id = str(data.get("trackId") or "")
    if not track_id:
        raise ZibalError("زیبال trackId معتبر برنگرداند.")
    return ZibalRequestResult(
        track_id=track_id,
        redirect_url=ZIBAL_REDIRECT_TEMPLATE.format(track_id=track_id),
        raw=data,
    )


def verify_payment(
    *,
    merchant: str,
    track_id: str,
    timeout: int = 30,
) -> ZibalVerifyResult:
    try:
        normalized_track_id = int(track_id)
    except (TypeError, ValueError) as exc:
        raise ZibalError("trackId زیبال نامعتبر است.") from exc
    payload = {"merchant": merchant, "trackId": normalized_track_id}
    data = _post_json(ZIBAL_VERIFY_URL, payload, timeout=timeout)
    result = _int_or_none(data.get("result"))
    status = data.get("status")
    return ZibalVerifyResult(
        success=bool(result in ZIBAL_SUCCESS_RESULT_CODES and _status_is_paid(status)),
        result=result,
        status=status,
        amount_rials=_decimal_or_none(data.get("amount")),
        card_number=str(data.get("cardNumber") or ""),
        ref_number=str(data.get("refNumber") or ""),
        order_id=str(data.get("orderId") or ""),
        raw=data,
    )
