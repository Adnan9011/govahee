from __future__ import annotations

from datetime import timedelta

from django.utils import timezone
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from organizations.api_keys import KEY_PREFIX, lookup_api_key


class ApiKeyPrincipal:
    is_authenticated = True
    is_active = True
    is_anonymous = False
    is_staff = False
    is_superuser = False
    is_platform_admin = False
    is_api_key = True
    pk = None
    id = None
    email = None
    phone = None

    def __init__(self, api_key):
        self.api_key = api_key
        self.organization = api_key.organization
        self.permissions = list(api_key.permissions or [])
        self.full_name = f"API:{api_key.name}"

    def __str__(self) -> str:
        return self.full_name

    def display_name(self) -> str:
        return self.full_name


class ApiKeyAuthentication(BaseAuthentication):
    def authenticate(self, request):
        raw = request.headers.get("X-Api-Key") or ""
        auth = request.headers.get("Authorization") or ""
        if not raw and auth.lower().startswith(f"bearer {KEY_PREFIX}"):
            raw = auth.split(None, 1)[1]
        if not raw:
            return None
        key = lookup_api_key(raw)
        if key is None:
            raise AuthenticationFailed("کلید API نامعتبر یا باطل شده است.")
        org = key.organization
        if org.is_suspended:
            raise AuthenticationFailed("سازمان تعلیق شده است.")
        if not org.api_enabled:
            raise AuthenticationFailed("API این سازمان غیرفعال است.")
        now = timezone.now()
        if not key.last_used_at or now - key.last_used_at > timedelta(seconds=30):
            key.last_used_at = now
            key.save(update_fields=["last_used_at"])
        return ApiKeyPrincipal(key), None
