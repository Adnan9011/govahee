from django.urls import path

from attachments.views import FileView, UploadView

urlpatterns = [
    path("upload/", UploadView.as_view(), name="attachment-upload"),
    path("<int:pk>/file/", FileView.as_view(), name="attachment-file"),
]
