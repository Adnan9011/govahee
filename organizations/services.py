from __future__ import annotations

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.utils.text import slugify

from audit.services import log_action
from billing.entitlements import get_entitlements
from billing.plans import ensure_trial_subscription
from certificates.default_templates import builtin_templates
from certificates.models import CertificateTemplate, CertificateType, TemplateVersion
from emails.provider import get_email_provider
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


def invite_member(*, organization, actor, email: str, role: str, full_name: str = ""):
    from accounts.models import User
    from rest_framework.exceptions import ValidationError

    email = email.strip().lower()
    if role == OrganizationRole.OWNER:
        raise ValidationError("نمی‌توان مالک جدید از طریق دعوت افزود.")
    entitlements = get_entitlements(organization)
    limit = int(entitlements.get("team_members") or 0)
    active_count = OrganizationMembership.objects.filter(
        organization=organization, is_active=True
    ).count()
    if limit and active_count >= limit:
        raise ValidationError("ظرفیت اعضای تیم در پلن فعلی تکمیل شده است.")

    created_user = False
    user = User.objects.filter(email__iexact=email).first()
    if user is None:
        user = User.objects.create_user(
            email=email,
            password=None,
            full_name=full_name or email.split("@")[0],
        )
        user.set_unusable_password()
        user.save(update_fields=["password"])
        created_user = True
    membership, created = OrganizationMembership.objects.get_or_create(
        organization=organization,
        user=user,
        defaults={"role": role, "is_active": True},
    )
    if not created:
        if membership.is_active:
            raise ValidationError("این کاربر هم‌اکنون عضو سازمان است.")
        membership.is_active = True
        membership.role = role
        membership.save(update_fields=["is_active", "role", "updated_at"])

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    base = (getattr(settings, "FRONTEND_SITE_URL", "") or "").rstrip("/")
    set_password_url = f"{base}/set-password/{uid}/{token}"
    org_name = organization.name
    if created_user:
        subject = f"دعوت به {org_name}"
        body = (
            f"شما به سازمان «{org_name}» دعوت شده‌اید.\n\n"
            f"برای تعیین رمز عبور و ورود:\n{set_password_url}\n"
        )
    else:
        subject = f"عضویت در {org_name}"
        body = (
            f"شما به سازمان «{org_name}» اضافه شدید. با همان حساب خود وارد شوید.\n"
            f"{base}/login\n"
        )
    try:
        get_email_provider().send(to=email, subject=subject, body=body)
    except Exception:
        pass
    log_action(
        action="user.invited",
        entity="membership",
        entity_id=membership.pk,
        organization=organization,
        actor=actor,
        metadata={"email": email, "role": role},
    )
    return membership
