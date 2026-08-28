from __future__ import annotations

from rest_framework.exceptions import ValidationError

from billing.models import Plan, Subscription, UsageCounter
from django.utils import timezone


DEFAULT_FREE_CAPABILITIES = {
    "certificates_per_month": 20,
    "templates_max": 3,
    "bulk_issuance": False,
    "branding": False,
    "email": True,
    "api": False,
    "webhooks": False,
    "analytics": False,
    "white_label": False,
    "team_members": 1,
}


def get_subscription(organization) -> Subscription | None:
    return (
        Subscription.objects.select_related("plan")
        .filter(organization=organization)
        .first()
    )


def get_entitlements(organization) -> dict:
    sub = get_subscription(organization)
    if sub and sub.status in {Subscription.Status.ACTIVE, Subscription.Status.TRIAL}:
        if sub.current_period_end >= timezone.now():
            return dict(sub.plan.capabilities or DEFAULT_FREE_CAPABILITIES)
    plan = Plan.objects.filter(code="free", is_active=True).first()
    if plan:
        return dict(plan.capabilities or DEFAULT_FREE_CAPABILITIES)
    return dict(DEFAULT_FREE_CAPABILITIES)


def current_period() -> str:
    now = timezone.localdate()
    return f"{now.year:04d}-{now.month:02d}"


def current_usage(organization, key: str) -> int:
    row = UsageCounter.objects.filter(
        organization=organization, period=current_period(), key=key
    ).first()
    return row.value if row else 0


def assert_can_issue(organization) -> None:
    entitlements = get_entitlements(organization)
    limit = int(entitlements.get("certificates_per_month") or 0)
    if limit <= 0:
        return
    used = current_usage(organization, "certificates_issued")
    if used >= limit:
        raise ValidationError(
            "سهمیه صدور گواهینامه این ماه تمام شده است. پلن خود را ارتقا دهید."
        )


def assert_feature(organization, feature: str, message: str) -> None:
    if not get_entitlements(organization).get(feature):
        raise ValidationError(message)
