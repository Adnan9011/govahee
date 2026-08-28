from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from certificates.api_v1 import (
    V1CertificateDetailView,
    V1CertificateRevokeView,
    V1CertificatesView,
    V1TemplatesView,
)


def health(_request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("api/health/", health, name="health"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path("api/", include("accounts.urls")),
    path("api/", include("organizations.urls")),
    path("api/", include("certificates.urls")),
    path("api/", include("billing.urls")),
    path("api/", include("platform_core.urls")),
    path(
        "api/v1/certificates/<int:pk>/revoke/",
        V1CertificateRevokeView.as_view(),
        name="v1-certificate-revoke",
    ),
    path(
        "api/v1/certificates/<int:pk>/",
        V1CertificateDetailView.as_view(),
        name="v1-certificate-detail",
    ),
    path("api/v1/certificates/", V1CertificatesView.as_view(), name="v1-certificates"),
    path("api/v1/templates/", V1TemplatesView.as_view(), name="v1-templates"),
    path("api/attachments/", include("attachments.urls")),
]
