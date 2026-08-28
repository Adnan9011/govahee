from django.urls import path

from platform_core.views import LegalView, PlatformOrganizationView, SiteConfigView

urlpatterns = [
    path("site/config/", SiteConfigView.as_view(), name="site-config"),
    path("legal/<slug:kind>/", LegalView.as_view(), name="legal"),
    path("admin/organizations/", PlatformOrganizationView.as_view(), name="platform-orgs"),
]
