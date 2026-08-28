from __future__ import annotations

from django.conf import settings
from django.db import models

from organizations.querysets import OrganizationOwnedQuerySet


class OrganizationQuerySet(models.QuerySet):
    def active(self):
        return self.filter(is_suspended=False)


class Organization(models.Model):
    class VerificationStatus(models.TextChoices):
        PENDING = "pending"
        VERIFIED = "verified"
        REJECTED = "rejected"
        SUSPENDED = "suspended"

    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=80, unique=True)
    legal_name = models.CharField(max_length=200, blank=True)
    registration_number = models.CharField(max_length=80, blank=True)
    license_number = models.CharField(max_length=80, blank=True)
    issuing_authority = models.CharField(max_length=200, blank=True)
    website = models.URLField(blank=True)
    address = models.TextField(blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    description = models.TextField(blank=True)
    locale = models.CharField(max_length=8, default="fa")
    timezone = models.CharField(max_length=64, default="Asia/Tehran")
    certificate_number_prefix = models.CharField(max_length=16, default="CERT-")
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
    )
    is_suspended = models.BooleanField(default=False)
    issuance_enabled = models.BooleanField(default=True)
    api_enabled = models.BooleanField(default=False)
    verification_search_enabled = models.BooleanField(default=True)
    public_issuer_page_enabled = models.BooleanField(default=True)
    verification_indexable = models.BooleanField(default=False)
    onboarding_completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = OrganizationQuerySet.as_manager()

    def __str__(self) -> str:
        return self.name


class OrganizationRole(models.TextChoices):
    OWNER = "owner"
    ADMIN = "admin"
    ISSUER = "issuer"
    DESIGNER = "designer"
    VIEWER = "viewer"


class OrganizationMembership(models.Model):
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="memberships"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="memberships"
    )
    role = models.CharField(max_length=20, choices=OrganizationRole.choices)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "user"], name="uniq_org_membership"
            )
        ]


class OrganizationOwnedModel(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = OrganizationOwnedQuerySet.as_manager()

    class Meta:
        abstract = True


class Branding(OrganizationOwnedModel):
    logo_file = models.ForeignKey(
        "attachments.StoredFile",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    primary_color = models.CharField(max_length=16, default="#0f766e")
    secondary_color = models.CharField(max_length=16, default="#134e4a")
    font_family = models.CharField(max_length=80, default="Vazirmatn")
    email_from_name = models.CharField(max_length=120, blank=True)
    verification_footer = models.TextField(blank=True)
    custom_domain = models.CharField(max_length=200, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["organization"], name="uniq_org_branding")
        ]


class CustomField(OrganizationOwnedModel):
    class FieldType(models.TextChoices):
        TEXT = "text"
        NUMBER = "number"
        DATE = "date"
        EMAIL = "email"
        SENSITIVE = "sensitive"

    key = models.SlugField(max_length=40)
    label = models.CharField(max_length=120)
    field_type = models.CharField(max_length=20, choices=FieldType.choices, default=FieldType.TEXT)
    is_public = models.BooleanField(default=False)
    is_required = models.BooleanField(default=False)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "key"], name="uniq_org_custom_field"
            )
        ]
        ordering = ["sort_order", "id"]


class EmailTemplate(OrganizationOwnedModel):
    class Kind(models.TextChoices):
        CERTIFICATE_ISSUED = "certificate_issued"
        CERTIFICATE_REVOKED = "certificate_revoked"
        CUSTOM = "custom"

    kind = models.CharField(max_length=40, choices=Kind.choices)
    subject = models.CharField(max_length=200)
    body = models.TextField()
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "kind"], name="uniq_org_email_template"
            )
        ]


class PublicIssuerProfile(OrganizationOwnedModel):
    headline = models.CharField(max_length=200, blank=True)
    about = models.TextField(blank=True)
    show_certificate_count = models.BooleanField(default=True)
    show_programs = models.BooleanField(default=True)
    is_published = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["organization"], name="uniq_org_public_profile"
            )
        ]


class ApiKey(OrganizationOwnedModel):
    name = models.CharField(max_length=80)
    prefix = models.CharField(max_length=12)
    hashed_key = models.CharField(max_length=64)
    permissions = models.JSONField(default=list)
    last_used_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["hashed_key"], name="uniq_api_key_hash")
        ]


class Webhook(OrganizationOwnedModel):
    url = models.URLField()
    secret = models.CharField(max_length=64)
    events = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)


class WebhookDelivery(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending"
        SUCCESS = "success"
        FAILED = "failed"

    webhook = models.ForeignKey(
        Webhook, on_delete=models.CASCADE, related_name="deliveries"
    )
    event = models.CharField(max_length=80)
    payload = models.JSONField(default=dict)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    response_code = models.PositiveSmallIntegerField(null=True, blank=True)
    response_body = models.TextField(blank=True)
    attempt_count = models.PositiveSmallIntegerField(default=0)
    next_retry_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
