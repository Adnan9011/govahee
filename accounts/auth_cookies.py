from __future__ import annotations

from django.conf import settings
from rest_framework_simplejwt.tokens import AccessToken


def _cookie_kwargs(max_age_seconds: int | None = None) -> dict:
    kwargs = {
        "httponly": True,
        "secure": settings.JWT_COOKIE_SECURE,
        "samesite": settings.JWT_COOKIE_SAMESITE,
        "path": "/api/",
    }
    if max_age_seconds is not None:
        kwargs["max_age"] = max_age_seconds
    return kwargs


def auth_response_payload(tokens: dict) -> dict:
    payload = {"role": tokens.get("role", "member")}
    if settings.JWT_EXPOSE_TOKENS_IN_RESPONSE:
        payload.update(
            {"access": tokens.get("access", ""), "refresh": tokens.get("refresh", "")}
        )
    return payload


def set_auth_cookies(response, *, access: str, refresh: str | None = None) -> None:
    access_max_age = int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds())
    refresh_max_age = int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())
    response.set_cookie(
        settings.JWT_AUTH_COOKIE, access, **_cookie_kwargs(access_max_age)
    )
    if refresh:
        response.set_cookie(
            settings.JWT_AUTH_REFRESH_COOKIE,
            refresh,
            **_cookie_kwargs(refresh_max_age),
        )


def clear_auth_cookies(response) -> None:
    response.delete_cookie(settings.JWT_AUTH_COOKIE, path="/api/")
    response.delete_cookie(settings.JWT_AUTH_REFRESH_COOKIE, path="/api/")


def _role_from_access(access: str) -> str:
    if not access:
        return ""
    try:
        return AccessToken(access).get("role", "")
    except Exception:
        return ""
