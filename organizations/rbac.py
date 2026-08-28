"""Role → permission map. Add roles here without a migration."""

from __future__ import annotations

from organizations.models import OrganizationRole

ALL = "*"

PERMISSIONS = {
    "certificates.read",
    "certificates.write",
    "certificates.issue",
    "certificates.revoke",
    "certificates.export",
    "templates.read",
    "templates.write",
    "recipients.read",
    "recipients.write",
    "team.read",
    "team.write",
    "settings.read",
    "settings.write",
    "analytics.read",
    "billing.read",
    "billing.write",
    "api.manage",
    "webhooks.manage",
}

ROLE_PERMISSIONS: dict[str, set[str]] = {
    OrganizationRole.OWNER: {ALL},
    OrganizationRole.ADMIN: set(PERMISSIONS),
    OrganizationRole.ISSUER: {
        "certificates.read",
        "certificates.write",
        "certificates.issue",
        "certificates.revoke",
        "certificates.export",
        "templates.read",
        "recipients.read",
        "recipients.write",
        "analytics.read",
        "settings.read",
    },
    OrganizationRole.DESIGNER: {
        "templates.read",
        "templates.write",
        "certificates.read",
        "settings.read",
    },
    OrganizationRole.VIEWER: {
        "certificates.read",
        "templates.read",
        "recipients.read",
        "analytics.read",
        "settings.read",
        "team.read",
        "billing.read",
    },
}


def role_has_permission(role: str, permission: str) -> bool:
    granted = ROLE_PERMISSIONS.get(role, set())
    if ALL in granted:
        return True
    return permission in granted
