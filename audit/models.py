from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    organization = models.ForeignKey(
        "organizations.Organization",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )
    actor_label = models.CharField(max_length=160, blank=True)
    action = models.CharField(max_length=80)
    entity = models.CharField(max_length=80)
    entity_id = models.CharField(max_length=64, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["organization", "created_at"]),
            models.Index(fields=["action"]),
        ]
        ordering = ["-created_at"]


class ApplicationLog(models.Model):
    level = models.CharField(max_length=16)
    logger_name = models.CharField(max_length=120)
    message = models.TextField()
    request_id = models.CharField(max_length=64, blank=True)
    user_id = models.IntegerField(null=True, blank=True)
    tenant_id = models.IntegerField(null=True, blank=True)
    user_phone = models.CharField(max_length=20, blank=True)
    user_role = models.CharField(max_length=20, blank=True)
    source = models.CharField(max_length=20, blank=True)
    extra_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
