from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import HasOrgPermission, IsPlatformAdmin
from organizations.mixins import OrganizationScopedViewSet
from organizations.models import (
    Branding,
    CustomField,
    EmailTemplate,
    Organization,
    OrganizationMembership,
    PublicIssuerProfile,
)
from organizations.serializers import (
    BrandingSerializer,
    CustomFieldSerializer,
    EmailTemplateSerializer,
    MembershipSerializer,
    OrganizationSerializer,
    PublicIssuerProfileSerializer,
)


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
