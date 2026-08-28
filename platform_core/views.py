from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsPlatformAdmin
from platform_core.legal import LEGAL
from platform_core.models import LegalDocument, PlatformSettings
from django.conf import settings as dj


class SiteConfigView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        platform = PlatformSettings.get_singleton()
        return Response(
            {
                "display_name": platform.display_name or dj.PLATFORM_DISPLAY_NAME,
                "display_name_fa": platform.display_name_fa or dj.PLATFORM_DISPLAY_NAME_FA,
                "default_locale": platform.default_locale,
                "support_email": platform.support_email,
            }
        )


class LegalView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, kind: str):
        doc = LegalDocument.objects.filter(kind=kind).first()
        if doc:
            return Response(
                {
                    "kind": doc.kind,
                    "title_fa": doc.title_fa,
                    "title_en": doc.title_en,
                    "body_fa": doc.body_fa,
                    "body_en": doc.body_en,
                }
            )
        fallback = LEGAL.get(kind)
        if not fallback:
            return Response({"detail": "not_found"}, status=404)
        return Response({"kind": kind, **fallback})


class PlatformOrganizationView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        from organizations.models import Organization
        from organizations.serializers import OrganizationSerializer

        qs = Organization.objects.all().order_by("-created_at")[:200]
        return Response(OrganizationSerializer(qs, many=True).data)

    def patch(self, request):
        from organizations.models import Organization
        from audit.services import log_action

        org = Organization.objects.get(pk=request.data.get("id"))
        for field in (
            "is_suspended",
            "issuance_enabled",
            "api_enabled",
            "verification_status",
        ):
            if field in request.data:
                setattr(org, field, request.data[field])
        org.save()
        log_action(
            action="organization.updated",
            entity="organization",
            entity_id=org.pk,
            actor=request.user,
            request=request,
            metadata=request.data,
        )
        from organizations.serializers import OrganizationSerializer

        return Response(OrganizationSerializer(org).data)
