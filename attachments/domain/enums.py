from django.db import models


class FileCategory(models.TextChoices):
    IMAGE = "image", "تصویر"
    AUDIO = "audio", "صوت"
    DOCUMENT = "document", "سند"


class StorageProviderType(models.TextChoices):
    LOCAL = "local", "Local"
    MINIO = "minio", "MinIO"
    PARSPACK = "parspack", "Parspack"


class AuditAction(models.TextChoices):
    UPLOAD = "upload", "آپلود"
    DOWNLOAD = "download", "دانلود"
    SOFT_DELETE = "soft_delete", "حذف نرم"
    RESTORE = "restore", "بازیابی"
    PERMANENT_DELETE = "permanent_delete", "حذف دائمی"
