from django.db import models


class OrganizationOwnedQuerySet(models.QuerySet):
    def for_org(self, organization):
        return self.filter(organization=organization)

    def for_org_id(self, organization_id: int):
        return self.filter(organization_id=organization_id)
