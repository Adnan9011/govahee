from __future__ import annotations

from collections import Counter
from datetime import timedelta

from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone

from certificates.models import Certificate, VerificationEvent


def analytics_payload(organization) -> dict:
    qs = Certificate.objects.for_org(organization).exclude(status=Certificate.Status.DRAFT)
    today = timezone.localdate()
    start = today - timedelta(days=29)
    issued_by_day = {
        row["day"]: row["c"]
        for row in qs.filter(issue_date__gte=start)
        .annotate(day=TruncDate("issue_date"))
        .values("day")
        .annotate(c=Count("id"))
        .order_by("day")
        if row["day"]
    }
    verified_by_day = {
        row["day"]: row["c"]
        for row in VerificationEvent.objects.filter(
            organization=organization,
            created_at__date__gte=start,
            result__in=["active", "issued"],
        )
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(c=Count("id"))
        .order_by("day")
    }
    series = []
    cursor = start
    while cursor <= today:
        series.append(
            {
                "date": cursor.isoformat(),
                "issued": issued_by_day.get(cursor, 0),
                "verified": verified_by_day.get(cursor, 0),
            }
        )
        cursor += timedelta(days=1)

    top_courses = [
        {"name": row["course_name"] or "—", "count": row["c"]}
        for row in qs.values("course_name").annotate(c=Count("id")).order_by("-c")[:8]
    ]
    top_templates = [
        {"name": row["template__name"] or "—", "count": row["c"]}
        for row in qs.values("template__name").annotate(c=Count("id")).order_by("-c")[:8]
    ]
    countries = Counter(
        VerificationEvent.objects.filter(organization=organization)
        .exclude(country="")
        .values_list("country", flat=True)[:2000]
    )
    unique_tokens = (
        VerificationEvent.objects.filter(organization=organization)
        .exclude(token_prefix="")
        .values("token_prefix")
        .distinct()
        .count()
    )
    return {
        "series": series,
        "top_courses": top_courses,
        "top_templates": top_templates,
        "top_countries": [{"country": k, "count": v} for k, v in countries.most_common(8)],
        "unique_visitors": unique_tokens,
        "verifications": VerificationEvent.objects.filter(organization=organization).count(),
    }
