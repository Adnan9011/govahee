from django.db.models.signals import post_migrate
from django.dispatch import receiver

from platform_core.legal import LEGAL
from platform_core.models import LegalDocument, PlatformSettings


@receiver(post_migrate)
def seed_platform(sender, **kwargs):
    if sender.name != "platform_core":
        return
    PlatformSettings.get_singleton()
    for kind, payload in LEGAL.items():
        LegalDocument.objects.get_or_create(kind=kind, defaults=payload)
