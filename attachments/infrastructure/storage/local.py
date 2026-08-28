from __future__ import annotations

import hashlib
from pathlib import Path

from django.conf import settings

from attachments.domain.enums import StorageProviderType
from attachments.domain.exceptions import AttachmentStorageError
from attachments.infrastructure.storage.base import (
    DownloadResult,
    StorageProvider,
    StoredFile,
)


class LocalStorageProvider(StorageProvider):
    provider_type = StorageProviderType.LOCAL

    def __init__(self, root: Path | None = None):
        self.root = root or Path(settings.ATTACHMENT_LOCAL_ROOT)

    def _full_path(self, storage_key: str) -> Path:
        return self.root / storage_key

    def save(self, *, storage_key: str, file_obj, mime_type: str) -> StoredFile:
        dest = self._full_path(storage_key)
        dest.parent.mkdir(parents=True, exist_ok=True)
        hasher = hashlib.sha256()
        size = 0
        try:
            with open(dest, "wb") as out:
                for chunk in self.iter_chunks(file_obj):
                    out.write(chunk)
                    hasher.update(chunk)
                    size += len(chunk)
        except OSError as exc:
            raise AttachmentStorageError("خطا در ذخیره فایل روی دیسک.") from exc
        return StoredFile(
            storage_key=storage_key, size=size, checksum=hasher.hexdigest()
        )

    def open_stream(self, *, storage_key: str):
        path = self._full_path(storage_key)
        if not path.exists():
            raise AttachmentStorageError("فایل در ذخیره‌سازی محلی پیدا نشد.")
        return open(path, "rb")

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
        path = self._full_path(storage_key)
        if path.exists():
            path.unlink()
        parent = path.parent
        if parent.exists() and not any(parent.iterdir()):
            parent.rmdir()

    def exists(self, *, storage_key: str) -> bool:
        return self._full_path(storage_key).exists()
