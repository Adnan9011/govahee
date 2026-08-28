from __future__ import annotations

from datetime import timedelta

from django.db.models import Sum
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from accounts.auth import database_user_or_none
from accounts.permissions import HasOrgPermission
from billing.entitlements import assert_feature, current_usage, get_entitlements
from certificates.bulk import parse_tabular, suggested_mapping
from certificates.models import (
    Certificate,
    CertificateEvent,
    CertificateTemplate,
    CertificateType,
    IssuanceBatch,
    IssuanceItem,
    Recipient,
    TemplateVersion,
    VerificationEvent,
)
from certificates.pdf import canvas_to_html, render_certificate_pdf
from certificates.serializers import (
    CertificateDetailSerializer,
    CertificateListSerializer,
    CertificateTemplateSerializer,
    CertificateTypeSerializer,
    IssueCertificateSerializer,
    IssuanceBatchSerializer,
    RecipientSerializer,
    TemplateSaveSerializer,
)
from certificates.services import (
    issue_certificate,
    revoke_certificate,
    verification_url_for,
)
from organizations.mixins import OrganizationScopedViewSet
from organizations.rbac import role_has_permission


class CertificateTypeViewSet(OrganizationScopedViewSet):
    serializer_class = CertificateTypeSerializer
    queryset = CertificateType.objects.all()
    required_permission = "templates.read"

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            self.required_permission = "templates.write"
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(organization=self.request.organization)


class TemplateViewSet(OrganizationScopedViewSet):
    serializer_class = CertificateTemplateSerializer
    queryset = CertificateTemplate.objects.select_related("current_version")
    required_permission = "templates.read"

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy", "save_version"}:
            self.required_permission = "templates.write"
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(organization=self.request.organization)

    def perform_destroy(self, instance):
        if instance.certificates.exists():
            from rest_framework.exceptions import ValidationError

            raise ValidationError(
                "امکان حذف این قالب وجود ندارد چون تعدادی گواهینامه با آن صادر شده است."
            )
        instance.delete()

    @action(detail=True, methods=["post"], url_path="versions")
    def save_version(self, request, pk=None):
        template = self.get_object()
        ser = TemplateSaveSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        for field in ("name", "description", "format", "width_mm", "height_mm", "locale"):
            if field in data:
                setattr(template, field, data[field])
        last = template.versions.order_by("-version").first()
        version_no = (last.version + 1) if last else 1
        version = TemplateVersion.objects.create(
            template=template,
            version=version_no,
            canvas=data["canvas"],
            variables=data.get("variables") or [],
            created_by=database_user_or_none(request.user),
        )
        template.current_version = version
        template.save()
        return Response(CertificateTemplateSerializer(template).data)


class RecipientViewSet(OrganizationScopedViewSet):
    serializer_class = RecipientSerializer
    queryset = Recipient.objects.all()
    required_permission = "recipients.read"
    search_fields = ["full_name", "email", "phone", "external_id"]

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            self.required_permission = "recipients.write"
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(organization=self.request.organization)


class CertificateViewSet(OrganizationScopedViewSet):
    serializer_class = CertificateListSerializer
    queryset = Certificate.objects.select_related("recipient", "template")
    required_permission = "certificates.read"
    filterset_fields = ["status", "template", "certificate_type", "batch"]
    search_fields = [
        "certificate_number",
        "recipient__full_name",
        "recipient__email",
        "course_name",
        "title",
    ]
    ordering_fields = ["created_at", "issue_date", "certificate_number"]

    def get_permissions(self):
        mapping = {
            "issue": "certificates.issue",
            "revoke": "certificates.revoke",
            "send": "certificates.write",
            "bulk_actions": "certificates.revoke",
            "pdf": "certificates.read",
            "preview": "certificates.read",
        }
        self.required_permission = mapping.get(self.action, "certificates.read")
        return super().get_permissions()

    def get_serializer_class(self):
        if self.action == "retrieve":
            return CertificateDetailSerializer
        return CertificateListSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == "retrieve":
            qs = qs.prefetch_related("events")
        return qs

    @action(detail=False, methods=["post"], url_path="issue")
    def issue(self, request):
        self.required_permission = "certificates.issue"
        if not role_has_permission(request.org_role, "certificates.issue") and not getattr(
            request.user, "is_platform_admin", False
        ):
            return Response({"detail": "مجوز صدور ندارید."}, status=403)
        ser = IssueCertificateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        template = CertificateTemplate.objects.for_org(request.organization).get(
            pk=data["template_id"]
        )
        cert_type = None
        if data.get("certificate_type_id"):
            cert_type = CertificateType.objects.for_org(request.organization).get(
                pk=data["certificate_type_id"]
            )
        cert = issue_certificate(
            organization=request.organization,
            actor=request.user,
            recipient_data=data["recipient"],
            fields=data,
            template=template,
            certificate_type=cert_type,
            idempotency_key=request.headers.get("Idempotency-Key")
            or data.get("idempotency_key")
            or "",
            request=request,
        )
        if data.get("send_email") and cert.recipient.email:
            from certificates.tasks import send_certificate_email

            send_certificate_email.delay(cert.pk)
        return Response(CertificateDetailSerializer(cert).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def revoke(self, request, pk=None):
        self.required_permission = "certificates.revoke"
        cert = self.get_object()
        revoke_certificate(
            certificate=cert,
            actor=request.user,
            reason=request.data.get("reason") or "",
            request=request,
        )
        return Response(CertificateDetailSerializer(cert).data)

    @action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        cert = self.get_object()
        pdf_bytes = render_certificate_pdf(cert)
        cert.download_count += 1
        cert.save(update_fields=["download_count"])
        CertificateEvent.objects.create(
            certificate=cert, kind=CertificateEvent.Kind.DOWNLOADED, actor=database_user_or_none(request.user)
        )
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{cert.certificate_number}.pdf"'
        return response

    @action(detail=True, methods=["get"])
    def preview(self, request, pk=None):
        cert = self.get_object()
        return HttpResponse(canvas_to_html(cert), content_type="text/html")

    @action(detail=True, methods=["post"])
    def send(self, request, pk=None):
        cert = self.get_object()
        if not cert.recipient.email:
            return Response({"detail": "ایمیل دریافت‌کننده ثبت نشده است."}, status=400)
        from certificates.tasks import send_certificate_email

        send_certificate_email.delay(cert.pk)
        return Response({"ok": True})

    @action(detail=False, methods=["post"], url_path="bulk-actions")
    def bulk_actions(self, request):
        ids = request.data.get("ids") or []
        action_name = request.data.get("action")
        qs = self.get_queryset().filter(pk__in=ids)
        if action_name == "revoke":
            for cert in qs:
                revoke_certificate(certificate=cert, actor=request.user, request=request)
            return Response({"ok": True, "count": qs.count()})
        return Response({"detail": "عملیات نامعتبر است."}, status=400)


class DashboardView(APIView):
    permission_classes = [HasOrgPermission]
    required_permission = "analytics.read"

    def get(self, request):
        org = request.organization
        qs = Certificate.objects.for_org(org)
        today = timezone.localdate()
        week_start = today - timedelta(days=7)
        month_start = today.replace(day=1)
        issued = qs.exclude(status=Certificate.Status.DRAFT)
        data = {
            "issued": issued.count(),
            "active": sum(1 for c in issued if c.public_status == "active"),
            "expired": sum(1 for c in issued if c.public_status == "expired"),
            "revoked": issued.filter(status=Certificate.Status.REVOKED).count(),
            "this_month": issued.filter(issue_date__gte=month_start).count(),
            "this_week": issued.filter(issue_date__gte=week_start).count(),
            "recipients": Recipient.objects.for_org(org).count(),
            "verifications": issued.aggregate(total=Sum("verification_count"))["total"] or 0,
            "downloads": issued.aggregate(total=Sum("download_count"))["total"] or 0,
            "views": issued.aggregate(total=Sum("view_count"))["total"] or 0,
            "shares": issued.aggregate(total=Sum("share_count"))["total"] or 0,
            "entitlements": get_entitlements(org),
            "usage_issued": current_usage(org, "certificates_issued"),
            "recent_certificates": CertificateListSerializer(
                issued.order_by("-created_at")[:8], many=True
            ).data,
            "recent_batches": IssuanceBatchSerializer(
                IssuanceBatch.objects.for_org(org).order_by("-created_at")[:5], many=True
            ).data,
        }
        return Response(data)


class BulkIssueView(APIView):
    permission_classes = [HasOrgPermission]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "bulk"
    required_permission = "certificates.issue"

    def post(self, request):
        assert_feature(
            request.organization,
            "bulk_issuance",
            "صدور انبوه در پلن فعلی فعال نیست.",
        )
        step = request.data.get("step") or "upload"
        if step == "upload":
            return self._upload(request)
        if step == "issue":
            return self._issue(request)
        return Response({"detail": "مرحله نامعتبر است."}, status=400)

    def _upload(self, request):
        upload = request.FILES.get("file")
        if not upload:
            return Response({"detail": "فایل را انتخاب کنید."}, status=400)
        from django.conf import settings as dj

        if upload.size > dj.BULK_IMPORT_MAX_UPLOAD_MB * 1024 * 1024:
            return Response({"detail": "حجم فایل بیش از حد مجاز است."}, status=400)
        template_id = request.data.get("template_id")
        template = CertificateTemplate.objects.for_org(request.organization).get(pk=template_id)
        headers, rows = parse_tabular(upload, upload.name)
        batch = IssuanceBatch.objects.create(
            organization=request.organization,
            template=template,
            source_filename=upload.name[:200],
            column_mapping=suggested_mapping(headers),
            total_rows=len(rows),
            created_by=database_user_or_none(request.user),
            status=IssuanceBatch.Status.DRAFT,
        )
        IssuanceItem.objects.bulk_create(
            [
                IssuanceItem(
                    batch=batch,
                    row_number=row["row_number"],
                    payload=row["data"],
                )
                for row in rows
            ]
        )
        preview = rows[:20]
        return Response(
            {
                "batch": IssuanceBatchSerializer(batch).data,
                "headers": headers,
                "suggested_mapping": batch.column_mapping,
                "preview": preview,
            }
        )

    def _issue(self, request):
        batch = IssuanceBatch.objects.for_org(request.organization).get(pk=request.data.get("batch_id"))
        mapping = request.data.get("column_mapping") or batch.column_mapping
        batch.column_mapping = mapping
        batch.send_email = bool(request.data.get("send_email"))
        batch.status = IssuanceBatch.Status.PROCESSING
        batch.started_at = timezone.now()
        batch.save()
        from certificates.tasks import process_issuance_batch

        process_issuance_batch.delay(batch.pk)
        return Response(IssuanceBatchSerializer(batch).data)


class BatchViewSet(OrganizationScopedViewSet):
    serializer_class = IssuanceBatchSerializer
    queryset = IssuanceBatch.objects.all()
    required_permission = "certificates.read"
    http_method_names = ["get", "head", "options"]


class PublicVerifyView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "verify"

    def get(self, request, token: str):
        cert = (
            Certificate.objects.select_related("organization", "recipient", "template")
            .filter(verification_token=token)
            .first()
        )
        ua = request.META.get("HTTP_USER_AGENT", "")[:200]
        VerificationEvent.objects.create(
            certificate=cert,
            organization=cert.organization if cert else None,
            token_prefix=token[:8],
            result=cert.public_status if cert else "not_found",
            browser=ua[:40],
            referrer=(request.META.get("HTTP_REFERER") or "")[:300],
        )
        if cert is None:
            return Response({"status": "not_found"}, status=404)
        cert.verification_count += 1
        cert.view_count += 1
        cert.save(update_fields=["verification_count", "view_count"])
        CertificateEvent.objects.create(certificate=cert, kind=CertificateEvent.Kind.VERIFIED)
        org = cert.organization
        public_fields = {
            "recipient_name": cert.recipient.full_name,
            "title": cert.title,
            "course_name": cert.course_name,
            "issuer_name": cert.issuer_name or org.name,
            "issue_date": cert.issue_date,
            "expiry_date": cert.expiry_date,
            "certificate_number": cert.certificate_number,
            "organization_name": org.name,
            "organization_slug": org.slug,
            "verification_status": org.verification_status,
        }
        extras = {}
        if org.public_issuer_page_enabled:
            extras = {
                "duration": cert.duration,
                "score": cert.score,
                "grade": cert.grade,
                "instructor_name": cert.instructor_name,
                "skills": cert.skills,
                "description": cert.description,
            }
        # Never include sensitive custom fields unless marked public.
        from organizations.models import CustomField

        public_keys = set(
            CustomField.objects.filter(organization=org, is_public=True).values_list("key", flat=True)
        )
        extras["custom_fields"] = {
            k: v for k, v in (cert.custom_fields or {}).items() if k in public_keys
        }
        return Response(
            {
                "status": cert.public_status,
                "verified_at": timezone.now(),
                "indexable": org.verification_indexable,
                "disclaimer": (
                    "این صفحه اصالت صدور توسط سازمان ثبت‌شده در سامانه را نشان می‌دهد "
                    "و اعتبار قانونی محتوای گواهی را تضمین نمی‌کند."
                ),
                **public_fields,
                **extras,
                "verification_url": verification_url_for(cert.verification_token),
            }
        )


class PublicVerifySearchView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "verify"

    def post(self, request):
        number = (request.data.get("certificate_number") or "").strip()
        slug = (request.data.get("organization_slug") or "").strip()
        if not number:
            return Response({"detail": "شماره گواهینامه الزامی است."}, status=400)
        qs = Certificate.objects.select_related("organization")
        if slug:
            qs = qs.filter(organization__slug=slug)
        cert = qs.filter(certificate_number=number).first()
        if cert is None or not cert.organization.verification_search_enabled:
            return Response({"status": "not_found"}, status=404)
        return Response(
            {
                "status": cert.public_status,
                "redirect_token": cert.verification_token,
            }
        )


class PublicIssuerView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug: str):
        from organizations.models import Organization, PublicIssuerProfile

        org = Organization.objects.filter(slug=slug, public_issuer_page_enabled=True).first()
        if org is None:
            return Response({"detail": "not_found"}, status=404)
        profile = PublicIssuerProfile.objects.filter(organization=org).first()
        issued = Certificate.objects.for_org(org).exclude(status=Certificate.Status.DRAFT).count()
        return Response(
            {
                "name": org.name,
                "slug": org.slug,
                "description": org.description,
                "website": org.website,
                "verification_status": org.verification_status,
                "headline": profile.headline if profile else "",
                "about": profile.about if profile else "",
                "certificates_issued": issued if (not profile or profile.show_certificate_count) else None,
                "disclaimer": (
                    "وضعیت «تأییدشده» به معنای صحت محتوای هر گواهی نیست؛ "
                    "تنها هویت سازمان در این سامانه بررسی شده است."
                ),
            }
        )
