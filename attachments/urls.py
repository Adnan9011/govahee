from django.urls import path

from attachments.views import UploadView

urlpatterns = [
    path("upload/", UploadView.as_view(), name="attachment-upload"),
]
