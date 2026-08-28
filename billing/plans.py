from datetime import timedelta

from django.utils import timezone

from billing.models import Plan, Subscription

DEFAULT_PLANS = [
    {
        "code": "free",
        "name": "Free",
        "name_fa": "رایگان",
        "interval": Plan.Interval.MONTHLY,
        "price_toman": 0,
        "sort_order": 0,
        "capabilities": {
            "certificates_per_month": 20,
            "templates_max": 3,
            "bulk_issuance": False,
            "branding": False,
            "email": True,
            "api": False,
            "webhooks": False,
            "analytics": True,
            "white_label": False,
            "team_members": 1,
        },
    },
    {
        "code": "starter",
        "name": "Starter",
        "name_fa": "استارتر",
        "interval": Plan.Interval.MONTHLY,
        "price_toman": 390000,
        "sort_order": 1,
        "capabilities": {
            "certificates_per_month": 200,
            "templates_max": 10,
            "bulk_issuance": True,
            "branding": True,
            "email": True,
            "api": False,
            "webhooks": False,
            "analytics": True,
            "white_label": False,
            "team_members": 3,
        },
    },
    {
        "code": "professional",
        "name": "Professional",
        "name_fa": "حرفه‌ای",
        "interval": Plan.Interval.MONTHLY,
        "price_toman": 890000,
        "sort_order": 2,
        "capabilities": {
            "certificates_per_month": 2000,
            "templates_max": 50,
            "bulk_issuance": True,
            "branding": True,
            "email": True,
            "api": True,
            "webhooks": True,
            "analytics": True,
            "white_label": False,
            "team_members": 10,
        },
    },
    {
        "code": "business",
        "name": "Business",
        "name_fa": "سازمانی",
        "interval": Plan.Interval.MONTHLY,
        "price_toman": 2490000,
        "sort_order": 3,
        "capabilities": {
            "certificates_per_month": 20000,
            "templates_max": 200,
            "bulk_issuance": True,
            "branding": True,
            "email": True,
            "api": True,
            "webhooks": True,
            "analytics": True,
            "white_label": True,
            "team_members": 50,
        },
    },
]


def seed_plans() -> None:
    for item in DEFAULT_PLANS:
        Plan.objects.update_or_create(code=item["code"], defaults=item)


def ensure_trial_subscription(organization) -> Subscription:
    from platform_core.models import PlatformSettings

    existing = Subscription.objects.filter(organization=organization).first()
    if existing:
        return existing
    seed_plans()
    plan = Plan.objects.get(code="free")
    settings_obj = PlatformSettings.get_singleton()
    now = timezone.now()
    return Subscription.objects.create(
        organization=organization,
        plan=plan,
        status=Subscription.Status.TRIAL,
        started_at=now,
        current_period_end=now + timedelta(days=settings_obj.trial_days or 14),
    )
