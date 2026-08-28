from __future__ import annotations

from django.db import models

from organizations.models import OrganizationOwnedModel


class Plan(models.Model):
    class Code(models.TextChoices):
        FREE = "free"
        STARTER = "starter"
        PROFESSIONAL = "professional"
        BUSINESS = "business"

    class Interval(models.TextChoices):
        MONTHLY = "monthly"
        YEARLY = "yearly"

    code = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=80)
    name_fa = models.CharField(max_length=80)
    interval = models.CharField(
        max_length=16, choices=Interval.choices, default=Interval.MONTHLY
    )
    price_toman = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveSmallIntegerField(default=0)
    capabilities = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "id"]

    def limit(self, key: str, default=0):
        return self.capabilities.get(key, default)

    def allows(self, feature: str) -> bool:
        return bool(self.capabilities.get(feature, False))


class Subscription(OrganizationOwnedModel):
    class Status(models.TextChoices):
        TRIAL = "trial"
        ACTIVE = "active"
        PAST_DUE = "past_due"
        CANCELED = "canceled"
        EXPIRED = "expired"

    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name="subscriptions")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TRIAL)
    started_at = models.DateTimeField()
    current_period_end = models.DateTimeField()
    canceled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["organization"], name="uniq_org_subscription")
        ]


class PaymentTransaction(OrganizationOwnedModel):
    class Gateway(models.TextChoices):
        BITPAY = "bitpay"
        ZIBAL = "zibal"
        CARD = "card"

    class Status(models.TextChoices):
        PENDING = "pending"
        PAID = "paid"
        FAILED = "failed"
        CANCELED = "canceled"

    plan = models.ForeignKey(Plan, null=True, on_delete=models.SET_NULL, related_name="+")
    gateway = models.CharField(max_length=20, choices=Gateway.choices)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    amount = models.PositiveIntegerField()
    factor_id = models.CharField(max_length=64, blank=True)
    gateway_reference = models.CharField(max_length=80, blank=True)
    gateway_transaction_id = models.CharField(max_length=80, blank=True)
    request_payload = models.JSONField(default=dict, blank=True)
    request_response = models.JSONField(default=dict, blank=True)
    verify_response = models.JSONField(default=dict, blank=True)
    card_number = models.CharField(max_length=32, blank=True)
    error_message = models.CharField(max_length=500, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    applied_at = models.DateTimeField(null=True, blank=True)


class UsageCounter(OrganizationOwnedModel):
    period = models.CharField(max_length=7)  # YYYY-MM
    key = models.CharField(max_length=40)
    value = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "period", "key"], name="uniq_org_usage"
            )
        ]
