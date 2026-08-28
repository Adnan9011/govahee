from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


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
    path("api/attachments/", include("attachments.urls")),
]
