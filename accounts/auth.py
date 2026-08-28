from __future__ import annotations

import secrets

from django.conf import settings
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User


class SuperAdminPrincipal:
    is_authenticated = True
    is_active = True
    is_anonymous = False
    is_staff = True
    is_superuser = False
    is_platform_admin = True
    pk = None
    id = None
    email = None
    phone = None
    full_name = "Platform Admin"

    def __init__(self, username: str = ""):
        self.username = username

    def __str__(self) -> str:
        return f"SuperAdmin({self.username})"

    def display_name(self) -> str:
        return self.full_name


def super_admin_credentials_configured() -> bool:
    return bool(settings.SUPER_ADMIN_USERNAME and settings.SUPER_ADMIN_PASSWORD)


def check_super_admin_login(login: str, password: str) -> bool:
    if not super_admin_credentials_configured():
        return False
    return secrets.compare_digest(
        login, settings.SUPER_ADMIN_USERNAME
    ) and secrets.compare_digest(password, settings.SUPER_ADMIN_PASSWORD)


def make_super_admin_refresh_token(username: str) -> RefreshToken:
    refresh = RefreshToken()
    refresh[api_settings.USER_ID_CLAIM] = 0
    refresh["role"] = "platform_admin"
    refresh["super_admin"] = True
    refresh["username"] = username
    return refresh


def database_user_or_none(user):
    if not getattr(user, "is_authenticated", False):
        return None
    if getattr(user, "pk", None) is None:
        return None
    return user


def is_platform_admin(user) -> bool:
    return bool(getattr(user, "is_platform_admin", False) or getattr(user, "pk", None) is None and getattr(user, "is_authenticated", False))


class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        header_result = super().authenticate(request)
        if header_result is not None:
            return header_result

        raw_token = request.COOKIES.get(settings.JWT_AUTH_COOKIE)
        if not raw_token:
            return None
        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token

    def get_user(self, validated_token):
        if validated_token.get("super_admin"):
            return SuperAdminPrincipal(username=validated_token.get("username", ""))
        user = super().get_user(validated_token)
        if not user.is_active:
            raise AuthenticationFailed("حساب کاربری غیرفعال است.")
        return user


def issue_tokens_for_user(user: User) -> dict:
    refresh = RefreshToken.for_user(user)
    refresh["role"] = "platform_admin" if user.is_platform_admin else "member"
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "role": refresh["role"],
    }
