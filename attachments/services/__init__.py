from __future__ import annotations

import hashlib
import uuid
from io import BytesIO
from pathlib import Path

from rest_framework.exceptions import ValidationError

from attachments.infrastructure.storage.factory import get_storage_provider
from attachments.models import StoredFile

ALLOWED_IMAGE = {"image/png", "image/jpeg", "image/webp", "image/svg+xml"}
ALLOWED_DOC = {"application/pdf"}
ALLOWED_BULK = {
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


def save_bytes(
    *,
    organization,
    data: bytes,
    original_name: str,
    mime_type: str,
    uploaded_by=None,
    folder: str = "files",
) -> StoredFile:
    checksum = hashlib.sha256(data).hexdigest()
    ext = Path(original_name).suffix.lower() or ".bin"
    org_part = organization.pk if organization else "platform"
    key = f"orgs/{org_part}/{folder}/{uuid.uuid4().hex}{ext}"
    provider = get_storage_provider()
    stored = provider.save(storage_key=key, file_obj=BytesIO(data), mime_type=mime_type)
    return StoredFile.objects.create(
        organization=organization,
        original_name=original_name,
        mime_type=mime_type,
        size=stored.size,
        checksum=checksum,
        storage_key=stored.storage_key,
        storage_provider=str(provider.provider_type),
        uploaded_by=uploaded_by if getattr(uploaded_by, "pk", None) else None,
    )


def validate_upload(file, *, allowed_types: set[str], max_mb: int):
    if file.size > max_mb * 1024 * 1024:
        raise ValidationError(f"حجم فایل نباید بیشتر از {max_mb} مگابایت باشد.")
    content_type = getattr(file, "content_type", "") or ""
    name = (getattr(file, "name", "") or "").lower()
    if content_type not in allowed_types and not any(
        name.endswith(ext) for ext in (".png", ".jpg", ".jpeg", ".webp", ".pdf", ".csv", ".xlsx")
    ):
        raise ValidationError("نوع فایل مجاز نیست.")
    return file
