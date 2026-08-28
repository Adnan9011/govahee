from __future__ import annotations

import hashlib
from io import BytesIO

from attachments.domain.enums import StorageProviderType
from attachments.domain.exceptions import AttachmentStorageError
from attachments.infrastructure.storage.base import (
    DownloadResult,
    StorageProvider,
    StoredFile,
)


class MinIOStorageProvider(StorageProvider):
    provider_type = StorageProviderType.MINIO

    def __init__(
        self,
        *,
        endpoint: str,
        access_key: str,
        secret_key: str,
        bucket: str,
        use_ssl: bool = False,
        region: str = "us-east-1",
    ):
        self.endpoint = endpoint
        self.access_key = access_key
        self.secret_key = secret_key
        self.bucket = bucket
        self.use_ssl = use_ssl
        self.region = region
        self._client = None

    @property
    def client(self):
        if self._client is None:
            import boto3
            from botocore.client import Config

            self._client = boto3.client(
                "s3",
                endpoint_url=self.endpoint,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                region_name=self.region,
                config=Config(signature_version="s3v4"),
                use_ssl=self.use_ssl,
            )
        return self._client

    def _ensure_bucket(self) -> None:
        import botocore.exceptions

        try:
            self.client.head_bucket(Bucket=self.bucket)
            return
        except botocore.exceptions.ClientError:
            pass

        try:
            self.client.create_bucket(Bucket=self.bucket)
        except botocore.exceptions.ClientError as exc:
            code = exc.response.get("Error", {}).get("Code", "")
            if code not in ("BucketAlreadyOwnedByYou", "BucketAlreadyExists"):
                raise AttachmentStorageError("خطا در آماده‌سازی باکت MinIO.") from exc

    def save(self, *, storage_key: str, file_obj, mime_type: str) -> StoredFile:
        self._ensure_bucket()
        hasher = hashlib.sha256()
        buffer = BytesIO()
        size = 0
        for chunk in self.iter_chunks(file_obj):
            buffer.write(chunk)
            hasher.update(chunk)
            size += len(chunk)
        buffer.seek(0)
        try:
            self.client.put_object(
                Bucket=self.bucket,
                Key=storage_key,
                Body=buffer,
                ContentType=mime_type,
            )
        except Exception as exc:
            raise AttachmentStorageError("خطا در ذخیره فایل در MinIO.") from exc
        return StoredFile(
            storage_key=storage_key, size=size, checksum=hasher.hexdigest()
        )

    def open_stream(self, *, storage_key: str):
        try:
            response = self.client.get_object(Bucket=self.bucket, Key=storage_key)
            return response["Body"]
        except Exception as exc:
            raise AttachmentStorageError("فایل در MinIO پیدا نشد.") from exc

    def get_download(
        self,
        *,
        storage_key: str,
        mime_type: str,
        file_name: str,
        file_size: int,
    ) -> DownloadResult:
        stream = self.open_stream(storage_key=storage_key)
        return DownloadResult(
            storage_key=storage_key,
            mime_type=mime_type,
            file_name=file_name,
            file_size=file_size,
            stream=stream,
        )

    def delete(self, *, storage_key: str) -> None:
        try:
            self.client.delete_object(Bucket=self.bucket, Key=storage_key)
        except Exception as exc:
            raise AttachmentStorageError("خطا در حذف فایل از MinIO.") from exc

    def exists(self, *, storage_key: str) -> bool:
        try:
            self.client.head_object(Bucket=self.bucket, Key=storage_key)
            return True
        except Exception:
            return False
