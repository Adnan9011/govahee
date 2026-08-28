from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Iterator
from dataclasses import dataclass
from datetime import datetime
from typing import BinaryIO


@dataclass(frozen=True)
class StoredFile:
    storage_key: str
    size: int
    checksum: str


@dataclass(frozen=True)
class StorageObject:
    """One stored object as reported by a prefix listing."""

    storage_key: str
    size: int
    last_modified: datetime | None = None


@dataclass(frozen=True)
class DownloadResult:
    """Result of a download request — either a stream or a signed URL."""

    storage_key: str
    mime_type: str
    file_name: str
    file_size: int
    stream: BinaryIO | None = None
    signed_url: str | None = None
    signed_url_expires_in: int | None = None


class StorageProvider(ABC):
    provider_type: str

    @abstractmethod
    def save(
        self, *, storage_key: str, file_obj: BinaryIO, mime_type: str
    ) -> StoredFile:
        raise NotImplementedError

    @abstractmethod
    def open_stream(self, *, storage_key: str) -> BinaryIO:
        raise NotImplementedError

    @abstractmethod
    def get_download(
        self,
        *,
        storage_key: str,
        mime_type: str,
        file_name: str,
        file_size: int,
    ) -> DownloadResult:
        raise NotImplementedError

    @abstractmethod
    def delete(self, *, storage_key: str) -> None:
        raise NotImplementedError

    @abstractmethod
    def exists(self, *, storage_key: str) -> bool:
        raise NotImplementedError

    #: Whether ``list_objects`` is implemented for this provider. Backup
    #: retention needs to enumerate a prefix; a provider that cannot do that
    #: must say so instead of silently reporting "nothing to prune".
    supports_listing: bool = False

    def list_objects(self, *, prefix: str) -> Iterator[StorageObject]:
        """Yield every object whose key starts with ``prefix``."""
        raise NotImplementedError(
            f"{type(self).__name__} does not support prefix listing."
        )

    def iter_chunks(
        self, file_obj: BinaryIO, chunk_size: int = 8192
    ) -> Iterator[bytes]:
        while True:
            chunk = file_obj.read(chunk_size)
            if not chunk:
                break
            yield chunk
