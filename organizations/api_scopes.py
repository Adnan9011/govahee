from __future__ import annotations

API_SCOPES = {
    "certificates:read",
    "certificates:write",
    "certificates:revoke",
    "templates:read",
    "templates:write",
    "analytics:read",
    "webhooks:manage",
}

SCOPE_GRANTS: dict[str, set[str]] = {
    "certificates:read": {"certificates.read"},
    "certificates:write": {
        "certificates.read",
        "certificates.write",
        "certificates.issue",
        "certificates.export",
    },
    "certificates:revoke": {"certificates.revoke", "certificates.read"},
    "templates:read": {"templates.read"},
    "templates:write": {"templates.read", "templates.write"},
    "analytics:read": {"analytics.read"},
    "webhooks:manage": {"webhooks.manage", "webhooks.read"},
}


def api_scopes_allow(scopes: list[str] | None, permission: str) -> bool:
    granted: set[str] = set()
    for scope in scopes or []:
        granted |= SCOPE_GRANTS.get(scope, set())
    return permission in granted
