from celery import shared_task
from django.utils import timezone

from organizations.models import WebhookDelivery
from organizations.webhooks import post_delivery


@shared_task
def deliver_webhook_delivery(delivery_id: int) -> None:
    delivery = (
        WebhookDelivery.objects.select_related("webhook", "webhook__organization")
        .filter(pk=delivery_id)
        .first()
    )
    if delivery is None:
        return
    if delivery.status == WebhookDelivery.Status.SUCCESS:
        return
    post_delivery(delivery)


@shared_task
def retry_pending_webhooks() -> int:
    now = timezone.now()
    qs = WebhookDelivery.objects.filter(
        status=WebhookDelivery.Status.FAILED,
        next_retry_at__isnull=False,
        next_retry_at__lte=now,
    ).exclude(attempt_count__gte=5)[:50]
    count = 0
    for delivery in qs:
        deliver_webhook_delivery.delay(delivery.pk)
        count += 1
    return count
