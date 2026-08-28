from __future__ import annotations

from datetime import date

from django.db import transaction
from django.utils import timezone

from certificates.models import CertificateNumberSequence


def next_certificate_number(organization, issued_on: date | None = None) -> str:
    """Allocate a unique number per organization+year under row lock."""
    issued_on = issued_on or timezone.localdate()
    year = issued_on.year
    prefix = (organization.certificate_number_prefix or "CERT-").strip() or "CERT-"
    with transaction.atomic():
        seq, _ = CertificateNumberSequence.objects.select_for_update().get_or_create(
            organization=organization,
            year=year,
            defaults={"last_value": 0},
        )
        seq.last_value += 1
        seq.save(update_fields=["last_value"])
        return f"{prefix}{year}-{seq.last_value:06d}"
