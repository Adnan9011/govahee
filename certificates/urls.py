from django.urls import include, path
from rest_framework.routers import DefaultRouter

from certificates.views import (
    AnalyticsView,
    BatchViewSet,
    BulkIssueView,
    CertificateTypeViewSet,
    CertificateViewSet,
    DashboardView,
    PublicIssuerView,
    PublicVerifySearchView,
    PublicVerifyView,
    RecipientViewSet,
    TemplateViewSet,
)

router = DefaultRouter()
router.register("certificate-types", CertificateTypeViewSet, basename="certificate-types")
router.register("templates", TemplateViewSet, basename="templates")
router.register("recipients", RecipientViewSet, basename="recipients")
router.register("certificates", CertificateViewSet, basename="certificates")
router.register("batches", BatchViewSet, basename="batches")

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("analytics/", AnalyticsView.as_view(), name="analytics"),
    path("bulk-issue/", BulkIssueView.as_view(), name="bulk-issue"),
    path("verify/search/", PublicVerifySearchView.as_view(), name="public-verify-search"),
    path("verify/<str:token>/", PublicVerifyView.as_view(), name="public-verify"),
    path("issuer/<slug:slug>/", PublicIssuerView.as_view(), name="public-issuer"),
    path("", include(router.urls)),
]
