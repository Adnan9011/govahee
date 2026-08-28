from __future__ import annotations

import hashlib
from collections.abc import Iterable
from io import BytesIO
from urllib.parse import quote

from django.conf import settings

from attachments.domain.enums import StorageProviderType
from attachments.domain.exceptions import AttachmentStorageError
from attachments.infrastructure.storage.base import (
    DownloadResult,
    StorageObject,
    StorageProvider,
    StoredFile,
)


def format_s3_connection_error(
    exc: BaseException, *, redact: Iterable[str] = ()
) -> str:
    """Human-readable S3/boto error chain for the admin connection test."""
    chunks: list[str] = []
    seen: set[int] = set()
    current: BaseException | None = exc
    while current is not None and id(current) not in seen and len(chunks) < 8:
        seen.add(id(current))
        chunks.append(_describe_s3_exception(current))
        nxt = current.__cause__
        if nxt is None and not getattr(current, "__suppress_context__", False):
            nxt = current.__context__
        current = nxt
    text = "\n".join(part for part in chunks if part)
    for secret in redact:
        value = (secret or "").strip()
        if value:
            text = text.replace(value, "***")
    return text or f"{type(exc).__name__}: {exc}"


def _describe_s3_exception(exc: BaseException) -> str:
    try:
        import botocore.exceptions

        if isinstance(exc, botocore.exceptions.ClientError):
            response = getattr(exc, "response", None) or {}
            error = response.get("Error") or {}
            meta = response.get("ResponseMetadata") or {}
            code = error.get("Code") or ""
            message = error.get("Message") or str(exc)
            status = meta.get("HTTPStatusCode", "")
            request_id = meta.get("RequestId") or ""
            extra = f" RequestId={request_id}" if request_id else ""
            return (
                f"ClientError: HTTP {status} Code={code} Message={message}{extra}"
            ).strip()
        if isinstance(exc, botocore.exceptions.BotoCoreError):
            return f"{type(exc).__name__}: {exc}"
    except Exception:
        pass
    return f"{type(exc).__name__}: {exc}"


class ParspackStorageProvider(StorageProvider):
    """S3-compatible Parspack Object Storage. Does not auto-create buckets."""

    provider_type = StorageProviderType.PARSPACK

    def __init__(
        self,
        *,
        endpoint: str,
        access_key: str,
        secret_key: str,
        bucket: str,
        region: str = "us-east-1",
        signed_url_expiry_seconds: int | None = None,
        use_signed_urls: bool | None = None,
        addressing_style: str = "path",
        signature_version: str = "s3v4",
    ):
        self.endpoint = self._normalize_endpoint(endpoint)
        self.access_key = access_key or ""
        self.secret_key = secret_key or ""
        self.bucket = bucket or ""
        self.region = region or "us-east-1"
        style = (addressing_style or "path").strip().lower()
        self.addressing_style = style if style in ("path", "virtual") else "path"
        self.signature_version = (signature_version or "s3v4").strip() or "s3v4"
        self.signed_url_expiry_seconds = (
            signed_url_expiry_seconds
            if signed_url_expiry_seconds is not None
            else int(
                getattr(settings, "PARSPACK_S3_PRESIGNED_EXPIRE_SECONDS", None)
                or getattr(settings, "ATTACHMENT_SIGNED_URL_EXPIRY_SECONDS", 300)
                or 300
            )
        )
        self.use_signed_urls = (
            use_signed_urls
            if use_signed_urls is not None
            else bool(getattr(settings, "ATTACHMENT_USE_SIGNED_URLS", True))
        )
        self._client = None

    @staticmethod
    def _normalize_endpoint(endpoint: str) -> str:
        value = (endpoint or "").strip().rstrip("/")
        if value and "://" not in value:
            value = f"https://{value}"
        return value

    def _build_client(self):
        import boto3
        from botocore.client import Config

        kwargs = {
            "endpoint_url": self.endpoint or None,
            "aws_access_key_id": self.access_key,
            "aws_secret_access_key": self.secret_key,
            "config": Config(
                signature_version=self.signature_version,
                s3={"addressing_style": self.addressing_style},
            ),
            "use_ssl": self.endpoint.startswith("https://"),
        }
        if self.region:
            kwargs["region_name"] = self.region
        return boto3.client("s3", **kwargs)

    @property
    def client(self):
        if self._client is None:
            self._client = self._build_client()
        return self._client

    def save(self, *, storage_key: str, file_obj, mime_type: str) -> StoredFile:
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
            raise AttachmentStorageError("خطا در ذخیره فایل در Parspack.") from exc
        return StoredFile(
            storage_key=storage_key, size=size, checksum=hasher.hexdigest()
        )

    def open_stream(self, *, storage_key: str):
        try:
            response = self.client.get_object(Bucket=self.bucket, Key=storage_key)
            return response["Body"]
        except Exception as exc:
            raise AttachmentStorageError("فایل در Parspack پیدا نشد.") from exc

    def _content_disposition(self, *, file_name: str, as_attachment: bool) -> str:
        disposition = "attachment" if as_attachment else "inline"
        safe_ascii = (
            "".join(
                ch if 32 <= ord(ch) < 127 and ch not in '\\"' else "_"
                for ch in file_name
            )
            or "file"
        )
        encoded = quote(file_name, safe="")
        return f"{disposition}; filename=\"{safe_ascii}\"; filename*=UTF-8''{encoded}"

    def get_download(
        self,
        *,
        storage_key: str,
        mime_type: str,
        file_name: str,
        file_size: int,
        as_attachment: bool = True,
    ) -> DownloadResult:
        if self.use_signed_urls:
            try:
                params = {
                    "Bucket": self.bucket,
                    "Key": storage_key,
                    "ResponseContentType": mime_type,
                    "ResponseContentDisposition": self._content_disposition(
                        file_name=file_name, as_attachment=as_attachment
                    ),
                }
                signed_url = self.client.generate_presigned_url(
                    "get_object",
                    Params=params,
                    ExpiresIn=self.signed_url_expiry_seconds,
                )
                return DownloadResult(
                    storage_key=storage_key,
                    mime_type=mime_type,
                    file_name=file_name,
                    file_size=file_size,
                    signed_url=signed_url,
                    signed_url_expires_in=self.signed_url_expiry_seconds,
                )
            except Exception as exc:
                raise AttachmentStorageError(
                    "خطا در ساخت لینک موقت دانلود Parspack."
                ) from exc

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
            raise AttachmentStorageError("خطا در حذف فایل از Parspack.") from exc

    def exists(self, *, storage_key: str) -> bool:
        try:
            self.client.head_object(Bucket=self.bucket, Key=storage_key)
            return True
        except Exception:
            return False

    def head(self, *, storage_key: str) -> dict:
        """Raise unless the object exists; used to confirm an upload landed."""
        try:
            return self.client.head_object(Bucket=self.bucket, Key=storage_key)
        except Exception as exc:
            raise AttachmentStorageError(
                "آبجکت در Parspack یافت نشد یا قابل بررسی نیست."
            ) from exc

    supports_listing = True

    def list_objects(self, *, prefix: str):
        if not (prefix or "").strip():
            raise AttachmentStorageError("پیشوند خالی برای فهرست آبجکت‌ها مجاز نیست.")
        paginator = self.client.get_paginator("list_objects_v2")
        try:
            pages = paginator.paginate(Bucket=self.bucket, Prefix=prefix)
            for page in pages:
                for item in page.get("Contents", []) or []:
                    yield StorageObject(
                        storage_key=item["Key"],
                        size=int(item.get("Size") or 0),
                        last_modified=item.get("LastModified"),
                    )
        except AttachmentStorageError:
            raise
        except Exception as exc:
            raise AttachmentStorageError("خطا در فهرست‌کردن آبجکت‌های Parspack.") from exc

    def test_connection(self) -> None:
        """List objects, matching Parspack's official `bucket.objects.all()` sample."""
        self.client.list_objects_v2(Bucket=self.bucket, MaxKeys=1)
