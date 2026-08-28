from django.db.models.signals import post_migrate
from django.dispatch import receiver

from billing.plans import seed_plans


@receiver(post_migrate)
def seed_default_plans(sender, **kwargs):
    if sender.name != "billing":
        return
    seed_plans()
