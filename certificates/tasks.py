from celery import shared_task
from django.utils import timezone

from certificates.models import (
    Certificate,
    CertificateEvent,
    IssuanceBatch,
    IssuanceItem,
)
from certificates.services import issue_certificate, verification_url_for
from emails.provider import get_email_provider
from organizations.models import EmailTemplate


@shared_task
def process_issuance_batch(batch_id: int) -> None:
    batch = IssuanceBatch.objects.select_related("organization", "template").get(pk=batch_id)
    mapping = batch.column_mapping or {}
    success = 0
    errors = 0
    items = list(batch.items.all())
    for index, item in enumerate(items, start=1):
        mapped = {}
        for col, field in mapping.items():
            mapped[field] = (item.payload or {}).get(col, "")
        try:
            cert = issue_certificate(
                organization=batch.organization,
                actor=batch.created_by,
                recipient_data={
                    "full_name": mapped.get("recipient_name") or mapped.get("name") or "",
                    "email": mapped.get("email") or "",
                    "phone": mapped.get("phone") or "",
                    "external_id": mapped.get("recipient_id") or "",
                },
                fields={
                    "title": mapped.get("title") or "",
                    "course_name": mapped.get("course_name") or "",
                    "course_code": mapped.get("course_code") or "",
                    "score": mapped.get("score") or "",
                    "grade": mapped.get("grade") or "",
                    "issue_date": mapped.get("issue_date") or None,
                    "duration": mapped.get("duration") or "",
                    "instructor_name": mapped.get("instructor_name") or "",
                    "issuer_name": mapped.get("issuer_name") or "",
                    "custom_fields": {
                        k: v
                        for k, v in mapped.items()
                        if k not in {
                            "recipient_name",
                            "name",
                            "email",
                            "phone",
                            "recipient_id",
                            "title",
                            "course_name",
                            "course_code",
                            "score",
                            "grade",
                            "issue_date",
                            "duration",
                            "instructor_name",
                            "issuer_name",
                        }
                    },
                },
                template=batch.template,
                certificate_type=batch.certificate_type,
                batch=batch,
            )
            item.status = IssuanceItem.Status.ISSUED
            item.certificate = cert
            item.errors = []
            item.save(update_fields=["status", "certificate", "errors"])
            success += 1
            if batch.send_email and cert.recipient.email:
                send_certificate_email.delay(cert.pk)
        except Exception as exc:
            item.status = IssuanceItem.Status.FAILED
            item.errors = [f"Row {item.row_number}: {exc}"]
            item.save(update_fields=["status", "errors"])
            errors += 1
        batch.processed_rows = index
        batch.success_count = success
        batch.error_count = errors
        batch.save(update_fields=["processed_rows", "success_count", "error_count"])
    batch.status = (
        IssuanceBatch.Status.COMPLETED
        if errors == 0
        else IssuanceBatch.Status.PARTIAL if success else IssuanceBatch.Status.FAILED
    )
    batch.finished_at = timezone.now()
    batch.error_report = [
        {"row": i.row_number, "errors": i.errors}
        for i in batch.items.exclude(status=IssuanceItem.Status.ISSUED)
    ]
    batch.save()


@shared_task
def send_certificate_email(certificate_id: int) -> None:
    cert = Certificate.objects.select_related("recipient", "organization").get(pk=certificate_id)
    email = cert.recipient.email
    if not email:
        return
    tmpl = EmailTemplate.objects.filter(
        organization=cert.organization,
        kind=EmailTemplate.Kind.CERTIFICATE_ISSUED,
        is_active=True,
    ).first()
    url = verification_url_for(cert.verification_token)
    subject = (tmpl.subject if tmpl else "گواهینامه شما صادر شد").replace(
        "{{recipient_name}}", cert.recipient.full_name
    ).replace("{{course_name}}", cert.course_name)
    body = (
        tmpl.body
        if tmpl
        else "سلام {{recipient_name}}\n\nگواهینامه {{course_name}} صادر شد.\n{{verification_url}}\n"
    )
    body = (
        body.replace("{{recipient_name}}", cert.recipient.full_name)
        .replace("{{course_name}}", cert.course_name)
        .replace("{{verification_url}}", url)
        .replace("{{certificate_number}}", cert.certificate_number)
    )
    get_email_provider().send(to=email, subject=subject, body=body)
    CertificateEvent.objects.create(certificate=cert, kind=CertificateEvent.Kind.SENT)
    from billing.usage import increment_usage

    increment_usage(cert.organization, "emails_sent")
    from organizations.webhooks import dispatch_certificate_event

    dispatch_certificate_event(
        cert.organization,
        "certificate.sent",
        {"id": cert.pk, "certificate_number": cert.certificate_number},
    )
