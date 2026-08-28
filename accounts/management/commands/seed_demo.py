from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import User
from billing.plans import seed_plans
from certificates.models import Certificate
from certificates.services import issue_certificate
from organizations.models import OrganizationMembership
from organizations.services import provision_organization
from platform_core.models import PlatformSettings


class Command(BaseCommand):
    help = "Create demo organization, user, templates and sample certificates."

    def handle(self, *args, **options):
        seed_plans()
        PlatformSettings.get_singleton()
        user, created = User.objects.get_or_create(
            email="demo@example.com",
            defaults={"full_name": "Demo Owner", "phone": "09120000000"},
        )
        if created:
            user.set_password("Demo12345")
            user.save()
        membership = OrganizationMembership.objects.filter(user=user).select_related("organization").first()
        if membership:
            org = membership.organization
        else:
            org = provision_organization(owner=user, name="آموزشگاه نمونه")
        template = org.certificatetemplate_set.first()
        if not org.onboarding_completed_at:
            org.onboarding_completed_at = timezone.now()
            org.save(update_fields=["onboarding_completed_at"])
        if template and not Certificate.objects.filter(organization=org).exists():
            issue_certificate(
                organization=org,
                actor=user,
                recipient_data={"full_name": "علی احمدی", "email": "ali@example.com"},
                fields={
                    "course_name": "English Language – B2",
                    "title": "گواهینامه پایان دوره",
                    "issue_date": timezone.localdate(),
                    "score": "92",
                },
                template=template,
            )
        self.stdout.write(self.style.SUCCESS(f"Demo ready: {user.email} / Demo12345 org={org.slug}"))
