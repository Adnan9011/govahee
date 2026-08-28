from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import HasOrgPermission
from billing.entitlements import assert_feature
from organizations.api_keys import generate_api_key
from organizations.api_scopes import API_SCOPES
from organizations.mixins import OrganizationScopedViewSet
from organizations.models import (
    ApiKey,
    Branding,
    CustomField,
    EmailTemplate,
    Organization,
    OrganizationMembership,
    OrganizationRole,
    PublicIssuerProfile,
    Webhook,
    WebhookDelivery,
)
from organizations.serializers import (
    ApiKeyCreateSerializer,
    ApiKeySerializer,
    BrandingSerializer,
    CustomFieldSerializer,
    EmailTemplateSerializer,
    InviteMemberSerializer,
    MembershipSerializer,
    OrganizationSerializer,
    PublicIssuerProfileSerializer,
    WebhookDeliverySerializer,
    WebhookSerializer,
)
from organizations.services import invite_member
from audit.services import log_action
import secrets


class OrganizationViewSet(viewsets.GenericViewSet):
    serializer_class = OrganizationSerializer
    permission_classes = [HasOrgPermission]
    required_permission = "settings.read"
    queryset = Organization.objects.all()

    @action(detail=False, methods=["get", "patch"], url_path="current")
    def current(self, request):
        org = request.organization
        if request.method == "PATCH":
            from organizations.rbac import role_has_permission
            from accounts.auth import is_platform_admin

            if not is_platform_admin(request.user) and not role_has_permission(
                getattr(request, "org_role", ""), "settings.write"
            ):
                return Response({"detail": "مجوز ویرایش تنظیمات را ندارید."}, status=403)
            ser = OrganizationSerializer(org, data=request.data, partial=True)
            ser.is_valid(raise_exception=True)
            ser.save()
            return Response(ser.data)
        return Response(OrganizationSerializer(org).data)

    @action(detail=False, methods=["post"], url_path="complete-onboarding")
    def complete_onboarding(self, request):
        org = request.organization
        if not org.onboarding_completed_at:
            org.onboarding_completed_at = timezone.now()
            org.save(update_fields=["onboarding_completed_at"])
        return Response({"ok": True})


class MembershipViewSet(OrganizationScopedViewSet):
    serializer_class = MembershipSerializer
    queryset = OrganizationMembership.objects.select_related("user")
    required_permission = "team.read"

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            self.required_permission = "team.write"
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        ser = InviteMemberSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        membership = invite_member(
            organization=request.organization,
            actor=request.user,
            email=ser.validated_data["email"],
            role=ser.validated_data["role"],
            full_name=ser.validated_data.get("full_name") or "",
        )
        return Response(MembershipSerializer(membership).data, status=status.HTTP_201_CREATED)

    def perform_destroy(self, instance):
        if instance.role == OrganizationRole.OWNER:
            owners = OrganizationMembership.objects.filter(
                organization=instance.organization,
                role=OrganizationRole.OWNER,
                is_active=True,
            ).count()
            if owners <= 1:
                from rest_framework.exceptions import ValidationError

                raise ValidationError("نمی‌توان آخرین مالک سازمان را حذف کرد.")
        instance.delete()
        log_action(
            action="user.removed",
            entity="membership",
            entity_id=instance.pk,
            organization=self.request.organization,
            actor=self.request.user,
        )


class ApiKeyViewSet(OrganizationScopedViewSet):
    serializer_class = ApiKeySerializer
    queryset = ApiKey.objects.all()
    required_permission = "api.manage"
    http_method_names = ["get", "post", "delete", "head", "options"]

    def create(self, request, *args, **kwargs):
        assert_feature(request.organization, "api", "API در پلن فعلی فعال نیست.")
        if not request.organization.api_enabled:
            from rest_framework.exceptions import ValidationError

            raise ValidationError("API این سازمان توسط پلتفرم غیرفعال شده است.")
        ser = ApiKeyCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        scopes = [s for s in (ser.validated_data.get("permissions") or []) if s in API_SCOPES]
        if not scopes:
            scopes = ["certificates:read"]
        raw, prefix, hashed = generate_api_key()
        from accounts.auth import database_user_or_none

        key = ApiKey.objects.create(
            organization=request.organization,
            name=ser.validated_data["name"],
            prefix=prefix,
            hashed_key=hashed,
            permissions=scopes,
            created_by=database_user_or_none(request.user),
        )
        log_action(
            action="api_key.created",
            entity="api_key",
            entity_id=key.pk,
            organization=request.organization,
            actor=request.user,
        )
        data = ApiKeySerializer(key).data
        data["key"] = raw
        return Response(data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        key = self.get_object()
        key.revoked_at = timezone.now()
        key.save(update_fields=["revoked_at", "updated_at"])
        log_action(
            action="api_key.revoked",
            entity="api_key",
            entity_id=key.pk,
            organization=request.organization,
            actor=request.user,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class WebhookViewSet(OrganizationScopedViewSet):
    serializer_class = WebhookSerializer
    queryset = Webhook.objects.all()
    required_permission = "webhooks.manage"

    def get_permissions(self):
        if self.action in {"list", "retrieve", "deliveries"}:
            self.required_permission = "webhooks.read"
        return super().get_permissions()

    def perform_create(self, serializer):
        assert_feature(self.request.organization, "webhooks", "Webhook در پلن فعلی فعال نیست.")
        serializer.save(
            organization=self.request.organization,
            secret=secrets.token_urlsafe(32),
        )
        log_action(
            action="webhook.created",
            entity="webhook",
            entity_id=serializer.instance.pk,
            organization=self.request.organization,
            actor=self.request.user,
        )

    @action(detail=True, methods=["get"])
    def deliveries(self, request, pk=None):
        hook = self.get_object()
        qs = hook.deliveries.order_by("-created_at")[:50]
        return Response(WebhookDeliverySerializer(qs, many=True).data)



class BrandingView(APIView):
    permission_classes = [HasOrgPermission]
    required_permission = "settings.read"

    def get(self, request):
        branding, _ = Branding.objects.get_or_create(organization=request.organization)
        return Response(BrandingSerializer(branding).data)

    def patch(self, request):
        self.required_permission = "settings.write"
        branding, _ = Branding.objects.get_or_create(organization=request.organization)
        ser = BrandingSerializer(branding, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)


class CustomFieldViewSet(OrganizationScopedViewSet):
    serializer_class = CustomFieldSerializer
    queryset = CustomField.objects.all()
    required_permission = "settings.write"

    def perform_create(self, serializer):
        serializer.save(organization=self.request.organization)


class EmailTemplateViewSet(OrganizationScopedViewSet):
    serializer_class = EmailTemplateSerializer
    queryset = EmailTemplate.objects.all()
    required_permission = "settings.write"

    def perform_create(self, serializer):
        serializer.save(organization=self.request.organization)


class PublicProfileView(APIView):
    permission_classes = [HasOrgPermission]
    required_permission = "settings.read"

    def get(self, request):
        profile, _ = PublicIssuerProfile.objects.get_or_create(
            organization=request.organization
        )
        return Response(PublicIssuerProfileSerializer(profile).data)

    def patch(self, request):
        profile, _ = PublicIssuerProfile.objects.get_or_create(
            organization=request.organization
        )
        ser = PublicIssuerProfileSerializer(profile, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)
