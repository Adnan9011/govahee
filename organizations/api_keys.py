from __future__ import annotations

import hashlib
import secrets

from organizations.models import ApiKey

KEY_PREFIX = "gvh_"


def hash_api_key(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def generate_api_key() -> tuple[str, str, str]:
    """Return (raw_key, prefix, hashed_key). Raw is shown once."""
    prefix = secrets.token_hex(4)
    secret = secrets.token_urlsafe(32)
    raw = f"{KEY_PREFIX}{prefix}_{secret}"
    return raw, prefix, hash_api_key(raw)


def lookup_api_key(raw: str) -> ApiKey | None:
    raw = (raw or "").strip()
    if not raw.startswith(KEY_PREFIX):
        return None
    hashed = hash_api_key(raw)
    return (
        ApiKey.objects.select_related("organization")
        .filter(hashed_key=hashed, revoked_at__isnull=True)
        .first()
    )
