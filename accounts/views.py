from django.conf import settings
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.auth import is_platform_admin, issue_tokens_for_user
from accounts.auth_cookies import (
    auth_response_payload,
    clear_auth_cookies,
    set_auth_cookies,
)
from accounts.serializers import LoginSerializer, MeSerializer, RegisterSerializer
from organizations.serializers import OrganizationSerializer


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        ser = RegisterSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user, org = ser.save()
        tokens = issue_tokens_for_user(user)
        body = auth_response_payload(tokens)
        body["organization"] = OrganizationSerializer(org).data
        response = Response(body, status=status.HTTP_201_CREATED)
        set_auth_cookies(response, access=tokens["access"], refresh=tokens["refresh"])
        return response


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request):
        ser = LoginSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        tokens = ser.validated_data
        response = Response(auth_response_payload(tokens))
        set_auth_cookies(response, access=tokens["access"], refresh=tokens.get("refresh"))
        return response


class LogoutView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        response = Response({"ok": True})
        clear_auth_cookies(response)
        return response


class SessionView(APIView):
    def get(self, request):
        user = request.user
        role = "platform_admin" if is_platform_admin(user) else "member"
        memberships = []
        if getattr(user, "pk", None):
            from organizations.models import OrganizationMembership

            memberships = [
                {
                    "organization_id": m.organization_id,
                    "organization_name": m.organization.name,
                    "organization_slug": m.organization.slug,
                    "role": m.role,
                    "onboarding_completed": bool(m.organization.onboarding_completed_at),
                }
                for m in OrganizationMembership.objects.select_related("organization").filter(
                    user=user, is_active=True
                )
            ]
        data = {
            "role": role,
            "user": MeSerializer(user).data
            if getattr(user, "pk", None)
            else {"full_name": getattr(user, "full_name", "")},
            "memberships": memberships,
        }
        return Response(data)


class CookieTokenRefreshView(TokenRefreshView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
        if not data.get("refresh"):
            cookie = request.COOKIES.get(settings.JWT_AUTH_REFRESH_COOKIE)
            if cookie:
                data["refresh"] = cookie
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        access = serializer.validated_data["access"]
        refresh = serializer.validated_data.get("refresh")
        response = Response(
            auth_response_payload({"access": access, "refresh": refresh, "role": "member"})
        )
        set_auth_cookies(response, access=access, refresh=refresh)
        return response
