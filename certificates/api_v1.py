from rest_framework import status
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework.response import Response

from accounts.permissions import HasOrgPermission
from certificates.models import Certificate, CertificateTemplate
from certificates.serializers import (
    CertificateDetailSerializer,
    CertificateListSerializer,
    CertificateTemplateSerializer,
    IssueCertificateSerializer,
)
from certificates.services import issue_certificate, revoke_certificate


class V1Throttle(ScopedRateThrottle):
    scope = "api_key"


class V1CertificatesView(APIView):
    permission_classes = [HasOrgPermission]
    throttle_classes = [V1Throttle]
    required_permission = "certificates.read"

    def get_permissions(self):
        self.required_permission = (
            "certificates.issue" if self.request.method == "POST" else "certificates.read"
        )
        return super().get_permissions()

    def get(self, request):
        from django.db.models import Q

        qs = (
            Certificate.objects.for_org(request.organization)
            .select_related("recipient", "template")
            .order_by("-created_at")
        )
        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        search = request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(certificate_number__icontains=search)
                | Q(recipient__full_name__icontains=search)
            )
        page = list(qs[:100])
        return Response(CertificateListSerializer(page, many=True).data)

    def post(self, request):
        ser = IssueCertificateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        template = CertificateTemplate.objects.for_org(request.organization).get(
            pk=data["template_id"]
        )
        cert = issue_certificate(
            organization=request.organization,
            actor=request.user,
            recipient_data=data["recipient"],
            fields=data,
            template=template,
            idempotency_key=request.headers.get("Idempotency-Key")
            or data.get("idempotency_key")
            or "",
            request=request,
        )
        return Response(CertificateDetailSerializer(cert).data, status=status.HTTP_201_CREATED)


class V1CertificateDetailView(APIView):
    permission_classes = [HasOrgPermission]
    throttle_classes = [V1Throttle]
    required_permission = "certificates.read"

    def get(self, request, pk: int):
        cert = (
            Certificate.objects.for_org(request.organization)
            .select_related("recipient", "template")
            .prefetch_related("events")
            .filter(pk=pk)
            .first()
        )
        if cert is None:
            return Response({"detail": "یافت نشد."}, status=404)
        return Response(CertificateDetailSerializer(cert).data)


class V1CertificateRevokeView(APIView):
    permission_classes = [HasOrgPermission]
    throttle_classes = [V1Throttle]
    required_permission = "certificates.revoke"

    def post(self, request, pk: int):
        cert = Certificate.objects.for_org(request.organization).filter(pk=pk).first()
        if cert is None:
            return Response({"detail": "یافت نشد."}, status=404)
        revoke_certificate(
            certificate=cert,
            actor=request.user,
            reason=request.data.get("reason") or "",
            request=request,
        )
        return Response(CertificateDetailSerializer(cert).data)


class V1TemplatesView(APIView):
    permission_classes = [HasOrgPermission]
    throttle_classes = [V1Throttle]
    required_permission = "templates.read"

    def get(self, request):
        qs = CertificateTemplate.objects.for_org(request.organization).select_related(
            "current_version"
        )
        return Response(CertificateTemplateSerializer(qs, many=True).data)
