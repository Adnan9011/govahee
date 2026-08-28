from __future__ import annotations

from functools import lru_cache

from django.conf import settings

from attachments.domain.enums import StorageProviderType
from attachments.domain.exceptions import AttachmentConfigurationError
from attachments.infrastructure.storage.base import StorageProvider
from attachments.infrastructure.storage.local import LocalStorageProvider
from attachments.infrastructure.storage.minio import MinIOStorageProvider
from attachments.infrastructure.storage.parspack import ParspackStorageProvider


def build_storage_provider(provider: str | None) -> StorageProvider:
    name = (provider or StorageProviderType.LOCAL).strip().lower()
    if name == StorageProviderType.MINIO:
        return MinIOStorageProvider(
            endpoint=settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            bucket=settings.MINIO_BUCKET,
            use_ssl=settings.MINIO_USE_SSL,
            region=settings.MINIO_REGION,
        )
    if name == StorageProviderType.PARSPACK:
        return ParspackStorageProvider(
            endpoint=settings.PARSPACK_S3_ENDPOINT_URL,
            access_key=settings.PARSPACK_S3_ACCESS_KEY,
            secret_key=settings.PARSPACK_S3_SECRET_KEY,
            bucket=settings.PARSPACK_S3_BUCKET_NAME,
            region=settings.PARSPACK_S3_REGION,
            signed_url_expiry_seconds=settings.PARSPACK_S3_PRESIGNED_EXPIRE_SECONDS,
            use_signed_urls=settings.ATTACHMENT_USE_SIGNED_URLS,
            addressing_style=settings.PARSPACK_S3_ADDRESSING_STYLE,
            signature_version=settings.PARSPACK_S3_SIGNATURE_VERSION,
        )
    if name != StorageProviderType.LOCAL:
        raise AttachmentConfigurationError("ارائه‌دهنده ذخیره‌سازی پشتیبانی نمی‌شود.")
    return LocalStorageProvider()


@lru_cache(maxsize=1)
def get_storage_provider() -> StorageProvider:
    return build_storage_provider(settings.ATTACHMENT_STORAGE_PROVIDER)


def reset_storage_provider_cache() -> None:
    get_storage_provider.cache_clear()
