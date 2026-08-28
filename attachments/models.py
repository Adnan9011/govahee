from django.conf import settings
from django.db import models

from organizations.querysets import OrganizationOwnedQuerySet


class StoredFile(models.Model):
    organization = models.ForeignKey(
        "organizations.Organization",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="files",
    )
    original_name = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=120)
    size = models.PositiveIntegerField()
    checksum = models.CharField(max_length=64, blank=True)
    storage_key = models.CharField(max_length=400, unique=True)
    storage_provider = models.CharField(max_length=20, default="local")
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    objects = OrganizationOwnedQuerySet.as_manager()
