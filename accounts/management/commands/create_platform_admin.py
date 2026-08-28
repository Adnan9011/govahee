from django.core.management.base import BaseCommand

from accounts.models import User


class Command(BaseCommand):
    help = "Create a platform admin user."

    def add_arguments(self, parser):
        parser.add_argument("--email", default="admin@example.com")
        parser.add_argument("--password", default="Admin12345")

    def handle(self, *args, **options):
        user, created = User.objects.get_or_create(
            email=options["email"],
            defaults={"full_name": "Platform Admin", "is_platform_admin": True, "is_staff": True},
        )
        user.is_platform_admin = True
        user.is_staff = True
        user.set_password(options["password"])
        user.save()
        self.stdout.write(self.style.SUCCESS(f"Admin: {user.email}"))
