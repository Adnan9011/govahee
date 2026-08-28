from __future__ import annotations

import hashlib
import hmac
import json
from datetime import timedelta
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.db import transaction
from django.utils import timezone

from billing.entitlements import get_entitlements
from organizations.models import Webhook, WebhookDelivery

RETRY_DELAYS = [60, 300, 1800, 7200, 21600]
MAX_ATTEMPTS = 5


def sign_payload(secret: str, body: bytes) -> str:
    digest = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


def enqueue_event(organization_id: int, event: str, payload: dict) -> list[int]:
    from organizations.models import Organization

    org = Organization.objects.filter(pk=organization_id).first()
    if org is None:
        return []
    if not get_entitlements(org).get("webhooks"):
        return []
    ids = []
    hooks = Webhook.objects.filter(organization=org, is_active=True)
    for hook in hooks:
        events = hook.events or []
        if event not in events and "*" not in events:
            continue
        delivery = WebhookDelivery.objects.create(
            webhook=hook,
            event=event,
            payload={
                "event": event,
                "created_at": timezone.now().isoformat(),
                "organization_id": organization_id,
                "data": payload,
            },
            status=WebhookDelivery.Status.PENDING,
        )
        ids.append(delivery.pk)
        from organizations.tasks import deliver_webhook_delivery

        deliver_webhook_delivery.delay(delivery.pk)
    return ids


def dispatch_certificate_event(organization, event: str, payload: dict) -> None:
    org_id = organization.pk

    def _run():
        enqueue_event(org_id, event, payload)

    transaction.on_commit(_run)


def post_delivery(delivery: WebhookDelivery) -> WebhookDelivery:
    webhook = delivery.webhook
    body = json.dumps(delivery.payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    signature = sign_payload(webhook.secret, body)
    request = Request(
        webhook.url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "X-Webhook-Signature": signature,
            "X-Webhook-Event": delivery.event,
            "User-Agent": "certificate-saas-webhook/1.0",
        },
        method="POST",
    )
    delivery.attempt_count += 1
    try:
        with urlopen(request, timeout=12) as response:
            delivery.response_code = response.status
            delivery.response_body = response.read()[:2000].decode("utf-8", errors="replace")
            if 200 <= response.status < 300:
                delivery.status = WebhookDelivery.Status.SUCCESS
                delivery.next_retry_at = None
            else:
                _schedule_retry(delivery)
    except HTTPError as exc:
        delivery.response_code = exc.code
        delivery.response_body = exc.read()[:2000].decode("utf-8", errors="replace")
        _schedule_retry(delivery)
    except (URLError, TimeoutError, OSError) as exc:
        delivery.response_code = None
        delivery.response_body = str(exc)[:500]
        _schedule_retry(delivery)
    delivery.save(
        update_fields=[
            "status",
            "response_code",
            "response_body",
            "attempt_count",
            "next_retry_at",
        ]
    )
    return delivery


def _schedule_retry(delivery: WebhookDelivery) -> None:
    if delivery.attempt_count >= MAX_ATTEMPTS:
        delivery.status = WebhookDelivery.Status.FAILED
        delivery.next_retry_at = None
        return
    delay = RETRY_DELAYS[min(delivery.attempt_count - 1, len(RETRY_DELAYS) - 1)]
    delivery.status = WebhookDelivery.Status.FAILED
    delivery.next_retry_at = timezone.now() + timedelta(seconds=delay)
