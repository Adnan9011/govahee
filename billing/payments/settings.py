from __future__ import annotations

from django.conf import settings

from platform_core.models import PlatformSettings


def effective_payment_settings() -> dict:
    """PlatformSettings overrides env, same layering idea as Nobita."""
    obj = PlatformSettings.get_singleton()
    return {
        "bitpay_enabled": bool(obj.payment_bitpay_enabled or settings.PAYMENT_BITPAY_ENABLED),
        "bitpay_api_key": (obj.bitpay_api_key or settings.BITPAY_API_KEY or "").strip(),
        "bitpay_callback_url": (obj.bitpay_callback_url or settings.BITPAY_CALLBACK_URL or "").strip(),
        "zibal_enabled": bool(obj.payment_zibal_enabled or settings.PAYMENT_ZIBAL_ENABLED),
        "zibal_merchant_id": (obj.zibal_merchant_id or settings.ZIBAL_MERCHANT_ID or "").strip(),
        "zibal_callback_url": (obj.zibal_callback_url or settings.ZIBAL_CALLBACK_URL or "").strip(),
    }
