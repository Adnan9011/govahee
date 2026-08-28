from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from attachments.services import save_bytes, validate_upload, ALLOWED_IMAGE
from django.conf import settings


class UploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        upload = request.FILES.get("file")
        if not upload:
            return Response({"detail": "فایل الزامی است."}, status=400)
        validate_upload(
            upload, allowed_types=ALLOWED_IMAGE, max_mb=settings.ATTACHMENT_MAX_UPLOAD_MB
        )
        org = getattr(request, "organization", None)
        stored = save_bytes(
            organization=org,
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
            }
        )
