from __future__ import annotations

from django.utils.text import slugify

from audit.services import log_action
from billing.plans import ensure_trial_subscription
from certificates.default_templates import builtin_templates
from certificates.models import CertificateTemplate, CertificateType, TemplateVersion
from organizations.models import (
    Branding,
    EmailTemplate,
    Organization,
    OrganizationMembership,
    OrganizationRole,
    PublicIssuerProfile,
)


def unique_slug(name: str) -> str:
    base = slugify(name, allow_unicode=True) or "org"
    slug = base
    i = 2
    while Organization.objects.filter(slug=slug).exists():
        slug = f"{base}-{i}"
        i += 1
    return slug


def provision_organization(*, owner, name: str) -> Organization:
    org = Organization.objects.create(name=name, slug=unique_slug(name))
    OrganizationMembership.objects.create(
        organization=org, user=owner, role=OrganizationRole.OWNER
    )
    Branding.objects.create(organization=org, email_from_name=name)
    PublicIssuerProfile.objects.create(organization=org)
    EmailTemplate.objects.create(
        organization=org,
        kind=EmailTemplate.Kind.CERTIFICATE_ISSUED,
        subject="گواهینامه شما صادر شد",
        body=(
            "سلام {{recipient_name}}\n\n"
            "گواهینامه {{course_name}} برای شما صادر شد.\n\n"
            "مشاهده و استعلام:\n{{verification_url}}\n"
        ),
    )
    ensure_trial_subscription(org)
    seed_org_templates(org, actor=owner)
    seed_org_types(org)
    log_action(
        action="organization.created",
        entity="organization",
        entity_id=org.pk,
        organization=org,
        actor=owner,
    )
    return org


def seed_org_templates(organization, actor=None) -> None:
    if CertificateTemplate.objects.filter(organization=organization).exists():
        return
    for spec in builtin_templates():
        template = CertificateTemplate.objects.create(
            organization=organization,
            name=spec["name"],
            format=spec["format"],
            width_mm=spec["width_mm"],
            height_mm=spec["height_mm"],
            locale=spec["locale"],
            is_system=True,
        )
        version = TemplateVersion.objects.create(
            template=template,
            version=1,
            canvas=spec["canvas"],
            variables=[
                "recipient_name",
                "course_name",
                "organization_name",
                "issue_date",
                "issuer_name",
                "certificate_number",
                "verification_url",
            ],
            created_by=actor if getattr(actor, "pk", None) else None,
        )
        template.current_version = version
        template.save(update_fields=["current_version"])


def seed_org_types(organization) -> None:
    defaults = [
        ("completion", "گواهینامه پایان دوره"),
        ("attendance", "گواهی حضور"),
        ("workshop", "گواهی کارگاه"),
        ("achievement", "گواهی موفقیت"),
        ("language", "گواهی زبان"),
    ]
    templates = list(CertificateTemplate.objects.filter(organization=organization))
    for i, (slug, name) in enumerate(defaults):
        CertificateType.objects.get_or_create(
            organization=organization,
            slug=slug,
            defaults={
                "name": name,
                "default_template": templates[i] if i < len(templates) else None,
            },
        )
