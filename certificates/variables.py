from __future__ import annotations

import calendar
import hashlib
import json
from datetime import date, timedelta
from typing import Any

BUILT_IN_VARIABLES = [
    "recipient_name",
    "recipient_first_name",
    "recipient_last_name",
    "certificate_number",
    "course_name",
    "course_code",
    "issue_date",
    "expiry_date",
    "duration",
    "score",
    "grade",
    "issuer_name",
    "issuer_title",
    "organization_name",
    "verification_url",
    "verification_code",
    "recipient_id",
]


def compute_expiry_date(
    *, issue_date: date, mode: str, value: int | None
) -> date | None:
    if mode in ("", "none") or not issue_date:
        return None
    if mode == "date":
        return None  # caller supplies expiry_date
    if not value:
        return None
    if mode == "days":
        return issue_date + timedelta(days=value)
    if mode == "months":
        return _add_months(issue_date, value)
    if mode == "years":
        return _add_months(issue_date, value * 12)
    return None


def _add_months(value: date, months: int) -> date:
    month = value.month - 1 + months
    year = value.year + month // 12
    month = month % 12 + 1
    day = min(value.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def canonical_payload(certificate) -> dict[str, Any]:
    return {
        "certificate_id": str(certificate.uuid),
        "recipient": certificate.recipient.full_name,
        "course": certificate.course_name,
        "issuer": certificate.issuer_name or certificate.organization.name,
        "issue_date": certificate.issue_date.isoformat() if certificate.issue_date else "",
        "expiry_date": (
            certificate.expiry_date.isoformat() if certificate.expiry_date else ""
        ),
        "certificate_number": certificate.certificate_number,
    }


def integrity_hash(certificate) -> str:
    blob = json.dumps(canonical_payload(certificate), ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()


def render_variables(certificate, *, verification_url: str) -> dict[str, str]:
    recipient = certificate.recipient
    values = {
        "recipient_name": recipient.full_name,
        "recipient_first_name": recipient.first_name,
        "recipient_last_name": recipient.last_name,
        "certificate_number": certificate.certificate_number,
        "course_name": certificate.course_name,
        "course_code": certificate.course_code,
        "issue_date": certificate.issue_date.isoformat() if certificate.issue_date else "",
        "expiry_date": (
            certificate.expiry_date.isoformat() if certificate.expiry_date else ""
        ),
        "duration": certificate.duration,
        "score": certificate.score,
        "grade": certificate.grade,
        "issuer_name": certificate.issuer_name or certificate.organization.name,
        "issuer_title": certificate.issuer_title,
        "organization_name": certificate.organization.name,
        "verification_url": verification_url,
        "verification_code": certificate.verification_token,
        "recipient_id": recipient.external_id,
    }
    custom = certificate.custom_fields or {}
    for key, val in custom.items():
        values[str(key)] = "" if val is None else str(val)
    return {k: "" if v is None else str(v) for k, v in values.items()}


def substitute(text: str, variables: dict[str, str]) -> str:
    if not text:
        return ""
    out = text
    for key, val in variables.items():
        out = out.replace("{{" + key + "}}", val)
    return out


def substitute_canvas(canvas: dict, variables: dict[str, str]) -> dict:
    import copy

    data = copy.deepcopy(canvas or {})
    for element in data.get("elements", []):
        if "content" in element and isinstance(element["content"], str):
            element["content"] = substitute(element["content"], variables)
    return data
