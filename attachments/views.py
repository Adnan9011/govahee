from django.http import FileResponse
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import HasOrgPermission
from attachments.models import StoredFile
from attachments.services import save_bytes, validate_upload, ALLOWED_IMAGE
from attachments.infrastructure.storage.factory import get_storage_provider
from django.conf import settings


class UploadView(APIView):
    permission_classes = [HasOrgPermission]
    required_permission = "templates.write"

    def post(self, request):
        upload = request.FILES.get("file")
        if not upload:
            return Response({"detail": "فایل الزامی است."}, status=400)
        validate_upload(
            upload, allowed_types=ALLOWED_IMAGE, max_mb=settings.ATTACHMENT_MAX_UPLOAD_MB
        )
        stored = save_bytes(
            organization=request.organization,
            data=upload.read(),
            original_name=upload.name,
            mime_type=upload.content_type or "application/octet-stream",
            uploaded_by=request.user,
            folder="uploads",
        )
        return Response(
            {
                "id": stored.id,
                "original_name": stored.original_name,
                "size": stored.size,
                "mime_type": stored.mime_type,
                "url": f"/api/attachments/{stored.id}/file/",
            }
        )


class FileView(APIView):
    permission_classes = [HasOrgPermission]
    required_permission = "templates.read"

    def get(self, request, pk: int):
        stored = StoredFile.objects.for_org(request.organization).filter(pk=pk).first()
        if stored is None:
            return Response({"detail": "فایل پیدا نشد."}, status=404)
        result = get_storage_provider().get_download(
            storage_key=stored.storage_key,
            mime_type=stored.mime_type,
            file_name=stored.original_name,
            file_size=stored.size,
        )
        return FileResponse(
            result.stream,
            filename=stored.original_name,
            content_type=stored.mime_type or "application/octet-stream",
        )
