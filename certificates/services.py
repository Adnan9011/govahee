from __future__ import annotations

from datetime import date

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from audit.services import log_action
from billing.entitlements import assert_can_issue
from certificates.models import (
    Certificate,
    CertificateEvent,
    Recipient,
    TemplateVersion,
)
from certificates.numbering import next_certificate_number
from certificates.variables import compute_expiry_date, integrity_hash


def verification_url_for(token: str) -> str:
    base = (getattr(settings, "FRONTEND_SITE_URL", "") or "").rstrip("/")
    return f"{base}/verify/{token}"


def _split_name(full_name: str) -> tuple[str, str]:
    parts = (full_name or "").strip().split(None, 1)
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], parts[1]


@transaction.atomic
def issue_certificate(
    *,
    organization,
    actor,
    recipient_data: dict,
    fields: dict,
    template,
    certificate_type=None,
    batch=None,
    idempotency_key: str = "",
    request=None,
) -> Certificate:
    if not organization.issuance_enabled:
        raise ValidationError("صدور گواهینامه برای این سازمان غیرفعال است.")
    if organization.is_suspended:
        raise ValidationError("سازمان تعلیق شده است.")

    if idempotency_key:
        existing = (
            Certificate.objects.select_for_update()
            .filter(organization=organization, idempotency_key=idempotency_key)
            .first()
        )
        if existing:
            return existing

    assert_can_issue(organization)

    email = (recipient_data.get("email") or "").strip().lower()
    full_name = (recipient_data.get("full_name") or "").strip()
    if not full_name:
        raise ValidationError({"recipient": "نام دریافت‌کننده الزامی است."})

    recipient = None
    if email:
        recipient = Recipient.objects.filter(
            organization=organization, email=email
        ).first()
    if recipient is None:
        first, last = _split_name(full_name)
        recipient = Recipient.objects.create(
            organization=organization,
            email=email,
            full_name=full_name,
            first_name=recipient_data.get("first_name") or first,
            last_name=recipient_data.get("last_name") or last,
            phone=recipient_data.get("phone") or "",
            external_id=recipient_data.get("external_id") or "",
            metadata=recipient_data.get("metadata") or {},
        )
    else:
        recipient.full_name = full_name or recipient.full_name
        recipient.save(update_fields=["full_name", "updated_at"])

    version: TemplateVersion | None = template.current_version
    if version is None:
        raise ValidationError("قالب گواهینامه نسخه فعالی ندارد.")

    issue_date = fields.get("issue_date") or timezone.localdate()
    if isinstance(issue_date, str):
        issue_date = date.fromisoformat(issue_date)
    expiry_mode = fields.get("expiry_mode") or Certificate.ExpiryMode.NONE
    expiry_value = fields.get("expiry_value")
    expiry_date = fields.get("expiry_date")
    if expiry_date and isinstance(expiry_date, str):
        expiry_date = date.fromisoformat(expiry_date)
    if expiry_mode != Certificate.ExpiryMode.DATE:
        expiry_date = compute_expiry_date(
            issue_date=issue_date, mode=expiry_mode, value=expiry_value
        )

    number = next_certificate_number(organization, issued_on=issue_date)
    cert = Certificate.objects.create(
        organization=organization,
        certificate_number=number,
        status=Certificate.Status.ISSUED,
        certificate_type=certificate_type,
        template=template,
        template_version=version,
        recipient=recipient,
        title=(
            fields.get("title")
            or (certificate_type.name if certificate_type else "")
            or template.name
        ),
        course_name=fields.get("course_name") or "",
        course_code=fields.get("course_code") or "",
        duration=fields.get("duration") or "",
        score=fields.get("score") or "",
        grade=fields.get("grade") or "",
        instructor_name=fields.get("instructor_name") or "",
        issuer_name=fields.get("issuer_name") or organization.name,
        issuer_title=fields.get("issuer_title") or "",
        description=fields.get("description") or "",
        skills=fields.get("skills") or [],
        custom_fields=fields.get("custom_fields") or {},
        issue_date=issue_date,
        expiry_mode=expiry_mode,
        expiry_value=expiry_value,
        expiry_date=expiry_date,
        issued_at=timezone.now(),
        batch=batch,
        issued_by=actor if getattr(actor, "pk", None) else None,
        idempotency_key=idempotency_key or "",
    )
    cert.integrity_hash = integrity_hash(cert)
    cert.save(update_fields=["integrity_hash"])
    CertificateEvent.objects.create(
        certificate=cert,
        kind=CertificateEvent.Kind.ISSUED,
        actor=actor if getattr(actor, "pk", None) else None,
    )
    from billing.usage import increment_usage

    increment_usage(organization, "certificates_issued")
    log_action(
        action="certificate.issued",
        entity="certificate",
        entity_id=cert.pk,
        organization=organization,
        actor=actor,
        request=request,
        metadata={"number": cert.certificate_number},
    )
    return cert


@transaction.atomic
def revoke_certificate(*, certificate: Certificate, actor, reason: str = "", request=None):
    if certificate.status == Certificate.Status.REVOKED:
        return certificate
    if certificate.status == Certificate.Status.DRAFT:
        raise ValidationError("گواهینامه پیش‌نویس قابل ابطال نیست.")
    certificate.status = Certificate.Status.REVOKED
    certificate.revoked_at = timezone.now()
    certificate.revoke_reason = reason
    certificate.save(update_fields=["status", "revoked_at", "revoke_reason", "updated_at"])
    CertificateEvent.objects.create(
        certificate=certificate,
        kind=CertificateEvent.Kind.REVOKED,
        actor=actor if getattr(actor, "pk", None) else None,
        metadata={"reason": reason},
    )
    log_action(
        action="certificate.revoked",
        entity="certificate",
        entity_id=certificate.pk,
        organization=certificate.organization,
        actor=actor,
        request=request,
        metadata={"reason": reason},
    )
    return certificate
