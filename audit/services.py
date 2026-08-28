from __future__ import annotations

from audit.models import AuditLog


def log_action(
    *,
    action: str,
    entity: str,
    entity_id="",
    organization=None,
    actor=None,
    metadata=None,
    request=None,
):
    actor_label = ""
    if actor is not None:
        actor_label = getattr(actor, "display_name", lambda: str(actor))()
        if not getattr(actor, "pk", None):
            actor = None
    ip = None
    if request is not None:
        ip = request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip() or request.META.get(
            "REMOTE_ADDR"
        )
        if organization is None:
            organization = getattr(request, "organization", None)
        if actor is None:
            user = getattr(request, "user", None)
            if getattr(user, "pk", None):
                actor = user
                actor_label = user.display_name()
    AuditLog.objects.create(
        organization=organization,
        actor=actor,
        actor_label=actor_label,
        action=action,
        entity=entity,
        entity_id=str(entity_id or ""),
        metadata=metadata or {},
        ip_address=ip,
    )
