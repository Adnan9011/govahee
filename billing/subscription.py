from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from billing.models import Plan, Subscription


def period_delta(plan: Plan) -> timedelta:
    if plan.interval == Plan.Interval.YEARLY:
        return timedelta(days=365)
    return timedelta(days=30)


def apply_subscription_plan(*, organization, plan: Plan) -> Subscription:
    now = timezone.now()
    delta = period_delta(plan)
    sub = Subscription.objects.filter(organization=organization).first()
    if sub is None:
        return Subscription.objects.create(
            organization=organization,
            plan=plan,
            status=Subscription.Status.ACTIVE,
            started_at=now,
            current_period_end=now + delta,
        )
    start = now
    if (
        sub.status == Subscription.Status.ACTIVE
        and sub.current_period_end
        and sub.current_period_end > now
        and sub.plan_id == plan.pk
    ):
        start = sub.current_period_end
    sub.plan = plan
    sub.status = Subscription.Status.ACTIVE
    sub.canceled_at = None
    sub.current_period_end = start + delta
    if not sub.started_at:
        sub.started_at = now
    sub.save(
        update_fields=[
            "plan",
            "status",
            "canceled_at",
            "current_period_end",
            "started_at",
            "updated_at",
        ]
    )
    if plan.allows("api") and not organization.api_enabled:
        organization.api_enabled = True
        organization.save(update_fields=["api_enabled", "updated_at"])
    return sub
