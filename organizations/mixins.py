from rest_framework import viewsets

from accounts.permissions import HasOrgPermission


class OrganizationScopedMixin:
    required_permission = None
    permission_classes = [HasOrgPermission]

    def get_organization(self):
        org = getattr(self.request, "organization", None)
        if org is None:
            raise RuntimeError("Organization context missing")
        return org

    def get_queryset(self):
        qs = super().get_queryset()
        org = getattr(self.request, "organization", None)
        if org is None:
            return qs.none()
        if hasattr(qs, "for_org"):
            return qs.for_org(org)
        return qs.filter(organization=org)


class OrganizationScopedViewSet(OrganizationScopedMixin, viewsets.ModelViewSet):
    pass
