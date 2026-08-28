from django.db.models import F

from billing.entitlements import current_period
from billing.models import UsageCounter


def increment_usage(organization, key: str, amount: int = 1) -> None:
    period = current_period()
    row, created = UsageCounter.objects.get_or_create(
        organization=organization,
        period=period,
        key=key,
        defaults={"value": amount},
    )
    if not created:
        UsageCounter.objects.filter(pk=row.pk).update(value=F("value") + amount)
