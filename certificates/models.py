from __future__ import annotations

import secrets
import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

from organizations.models import OrganizationOwnedModel
from organizations.querysets import OrganizationOwnedQuerySet


def new_verification_token() -> str:
    # 32 bytes → 43 urlsafe chars, high entropy, non-sequential.
    return secrets.token_urlsafe(32)


class CertificateType(OrganizationOwnedModel):
    name = models.CharField(max_length=160)
    slug = models.SlugField(max_length=80)
    description = models.TextField(blank=True)
    default_template = models.ForeignKey(
        "CertificateTemplate",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="default_for_types",
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "slug"], name="uniq_org_cert_type_slug"
            )
        ]


class CertificateTemplate(OrganizationOwnedModel):
    class Format(models.TextChoices):
        A4_PORTRAIT = "a4_portrait"
        A4_LANDSCAPE = "a4_landscape"
        A5_PORTRAIT = "a5_portrait"
        A5_LANDSCAPE = "a5_landscape"
        LETTER_PORTRAIT = "letter_portrait"
        LETTER_LANDSCAPE = "letter_landscape"
        CUSTOM = "custom"

    name = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    format = models.CharField(
        max_length=32, choices=Format.choices, default=Format.A4_LANDSCAPE
    )
    width_mm = models.PositiveSmallIntegerField(default=297)
    height_mm = models.PositiveSmallIntegerField(default=210)
    locale = models.CharField(max_length=8, default="fa")
    is_system = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    current_version = models.ForeignKey(
        "TemplateVersion",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    thumbnail_file = models.ForeignKey(
        "attachments.StoredFile",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )

    class Meta:
        ordering = ["name"]


class TemplateVersion(models.Model):
    template = models.ForeignKey(
        CertificateTemplate, on_delete=models.CASCADE, related_name="versions"
    )
    version = models.PositiveIntegerField()
    canvas = models.JSONField(default=dict)
    variables = models.JSONField(default=list)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["template", "version"], name="uniq_template_version"
            )
        ]
        ordering = ["-version"]


class Recipient(OrganizationOwnedModel):
    email = models.EmailField(blank=True)
    full_name = models.CharField(max_length=200)
    first_name = models.CharField(max_length=80, blank=True)
    last_name = models.CharField(max_length=80, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    external_id = models.CharField(max_length=80, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["organization", "email"]),
            models.Index(fields=["organization", "full_name"]),
        ]


class CertificateQuerySet(OrganizationOwnedQuerySet):
    def issued(self):
        return self.filter(status=Certificate.Status.ISSUED)

    def live(self):
        return self.filter(status=Certificate.Status.ISSUED)


class Certificate(OrganizationOwnedModel):
    class Status(models.TextChoices):
        DRAFT = "draft"
        ISSUED = "issued"
        EXPIRED = "expired"
        REVOKED = "revoked"
        VOID = "void"

    class ExpiryMode(models.TextChoices):
        NONE = "none"
        DATE = "date"
        DAYS = "days"
        MONTHS = "months"
        YEARS = "years"

    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    certificate_number = models.CharField(max_length=64)
    verification_token = models.CharField(
        max_length=64, unique=True, default=new_verification_token
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT
    )
    certificate_type = models.ForeignKey(
        CertificateType, null=True, on_delete=models.SET_NULL, related_name="certificates"
    )
    template = models.ForeignKey(
        CertificateTemplate, null=True, on_delete=models.PROTECT, related_name="certificates"
    )
    template_version = models.ForeignKey(
        TemplateVersion, null=True, on_delete=models.PROTECT, related_name="certificates"
    )
    recipient = models.ForeignKey(
        Recipient, on_delete=models.PROTECT, related_name="certificates"
    )
    title = models.CharField(max_length=240)
    course_name = models.CharField(max_length=240, blank=True)
    course_code = models.CharField(max_length=80, blank=True)
    duration = models.CharField(max_length=80, blank=True)
    score = models.CharField(max_length=40, blank=True)
    grade = models.CharField(max_length=40, blank=True)
    instructor_name = models.CharField(max_length=160, blank=True)
    issuer_name = models.CharField(max_length=160, blank=True)
    issuer_title = models.CharField(max_length=160, blank=True)
    description = models.TextField(blank=True)
    skills = models.JSONField(default=list, blank=True)
    custom_fields = models.JSONField(default=dict, blank=True)
    issue_date = models.DateField(null=True, blank=True)
    expiry_mode = models.CharField(
        max_length=16, choices=ExpiryMode.choices, default=ExpiryMode.NONE
    )
    expiry_value = models.PositiveIntegerField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    issued_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoke_reason = models.TextField(blank=True)
    previous_certificate = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="renewals",
    )
    batch = models.ForeignKey(
        "IssuanceBatch",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="certificates",
    )
    pdf_file = models.ForeignKey(
        "attachments.StoredFile",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    integrity_hash = models.CharField(max_length=64, blank=True)
    public_field_overrides = models.JSONField(default=dict, blank=True)
    view_count = models.PositiveIntegerField(default=0)
    download_count = models.PositiveIntegerField(default=0)
    share_count = models.PositiveIntegerField(default=0)
    verification_count = models.PositiveIntegerField(default=0)
    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )
    idempotency_key = models.CharField(max_length=80, blank=True)

    objects = CertificateQuerySet.as_manager()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "certificate_number"],
                name="uniq_org_certificate_number",
            ),
            models.UniqueConstraint(
                fields=["organization", "idempotency_key"],
                condition=~models.Q(idempotency_key=""),
                name="uniq_org_cert_idempotency",
            ),
        ]
        indexes = [
            models.Index(fields=["organization", "status"]),
            models.Index(fields=["organization", "issue_date"]),
            models.Index(fields=["verification_token"]),
        ]

    @property
    def public_status(self) -> str:
        if self.status == self.Status.REVOKED:
            return self.Status.REVOKED
        if self.status == self.Status.VOID:
            return self.Status.VOID
        if self.status == self.Status.DRAFT:
            return self.Status.DRAFT
        if self.expiry_date and self.expiry_date < timezone.localdate():
            return self.Status.EXPIRED
        if self.status == self.Status.ISSUED:
            return "active"
        return self.status


class CertificateNumberSequence(models.Model):
    organization = models.ForeignKey(
        "organizations.Organization", on_delete=models.CASCADE, related_name="+"
    )
    year = models.PositiveSmallIntegerField()
    last_value = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "year"], name="uniq_org_number_seq"
            )
        ]


class CertificateEvent(models.Model):
    class Kind(models.TextChoices):
        CREATED = "created"
        ISSUED = "issued"
        SENT = "sent"
        VIEWED = "viewed"
        DOWNLOADED = "downloaded"
        VERIFIED = "verified"
        SHARED = "shared"
        REVOKED = "revoked"
        RENEWED = "renewed"
        REISSUED = "reissued"
        CORRECTED = "corrected"
        PDF_GENERATED = "pdf_generated"

    certificate = models.ForeignKey(
        Certificate, on_delete=models.CASCADE, related_name="events"
    )
    kind = models.CharField(max_length=32, choices=Kind.choices)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


class IssuanceBatch(OrganizationOwnedModel):
    class Status(models.TextChoices):
        DRAFT = "draft"
        VALIDATING = "validating"
        PROCESSING = "processing"
        COMPLETED = "completed"
        FAILED = "failed"
        PARTIAL = "partial"

    template = models.ForeignKey(
        CertificateTemplate, on_delete=models.PROTECT, related_name="batches"
    )
    certificate_type = models.ForeignKey(
        CertificateType, null=True, on_delete=models.SET_NULL, related_name="+"
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT
    )
    source_filename = models.CharField(max_length=200, blank=True)
    column_mapping = models.JSONField(default=dict)
    total_rows = models.PositiveIntegerField(default=0)
    processed_rows = models.PositiveIntegerField(default=0)
    success_count = models.PositiveIntegerField(default=0)
    error_count = models.PositiveIntegerField(default=0)
    zip_file = models.ForeignKey(
        "attachments.StoredFile",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    error_report = models.JSONField(default=list, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    send_email = models.BooleanField(default=False)
    idempotency_key = models.CharField(max_length=80, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "idempotency_key"],
                condition=~models.Q(idempotency_key=""),
                name="uniq_org_batch_idempotency",
            )
        ]


class IssuanceItem(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending"
        VALID = "valid"
        INVALID = "invalid"
        ISSUED = "issued"
        FAILED = "failed"

    batch = models.ForeignKey(
        IssuanceBatch, on_delete=models.CASCADE, related_name="items"
    )
    row_number = models.PositiveIntegerField()
    payload = models.JSONField(default=dict)
    errors = models.JSONField(default=list, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    certificate = models.ForeignKey(
        Certificate, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )


class VerificationEvent(models.Model):
    certificate = models.ForeignKey(
        Certificate,
        null=True,
        on_delete=models.SET_NULL,
        related_name="verification_events",
    )
    organization = models.ForeignKey(
        "organizations.Organization",
        null=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    token_prefix = models.CharField(max_length=8, blank=True)
    result = models.CharField(max_length=20)
    country = models.CharField(max_length=8, blank=True)
    device = models.CharField(max_length=40, blank=True)
    browser = models.CharField(max_length=40, blank=True)
    referrer = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["created_at"])]
