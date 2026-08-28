from django.urls import include, path
from rest_framework.routers import DefaultRouter

from organizations.views import (
    BrandingView,
    CustomFieldViewSet,
    EmailTemplateViewSet,
    MembershipViewSet,
    OrganizationViewSet,
    PublicProfileView,
)

router = DefaultRouter()
router.register("org", OrganizationViewSet, basename="org")
router.register("team", MembershipViewSet, basename="team")
router.register("custom-fields", CustomFieldViewSet, basename="custom-fields")
router.register("email-templates", EmailTemplateViewSet, basename="email-templates")

urlpatterns = [
    path("", include(router.urls)),
    path("branding/", BrandingView.as_view(), name="branding"),
    path("issuer-profile/", PublicProfileView.as_view(), name="issuer-profile"),
]
