from rest_framework.permissions import BasePermission

from accounts.auth import is_platform_admin
from organizations.api_scopes import api_scopes_allow
from organizations.models import OrganizationMembership
from organizations.rbac import role_has_permission


class IsPlatformAdmin(BasePermission):
    message = "دسترسی محدود به مدیر پلتفرم است."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and is_platform_admin(request.user)
        )


class HasOrganization(BasePermission):
    message = "سازمان معتبری انتخاب نشده است."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if getattr(user, "is_api_key", False):
            request.organization = user.organization
            request.membership = None
            request.org_role = "api"
            request.api_permissions = getattr(user, "permissions", [])
            if request.organization.is_suspended and not getattr(
                view, "allow_suspended_org", False
            ):
                self.message = "سازمان شما تعلیق شده است."
                return False
            return True
        org_id = request.headers.get("X-Organization-Id")
        if is_platform_admin(user):
            if org_id:
                from organizations.models import Organization

                org = Organization.objects.filter(pk=org_id).first()
                if org is None:
                    self.message = "سازمان پیدا نشد."
                    return False
                request.organization = org
                request.membership = None
                request.org_role = "owner"
                return True
            if getattr(view, "allow_missing_org", False):
                return True
            self.message = "سازمان را انتخاب کنید."
            return False
        qs = OrganizationMembership.objects.select_related("organization").filter(
            user=user, is_active=True
        )
        membership = None
        if org_id:
            membership = qs.filter(organization_id=org_id).first()
        else:
            membership = qs.order_by("id").first()
        if membership is None:
            return False
        org = membership.organization
        if org.is_suspended and not getattr(view, "allow_suspended_org", False):
            self.message = "سازمان شما تعلیق شده است."
            return False
        request.organization = org
        request.membership = membership
        request.org_role = membership.role
        return True


class HasOrgPermission(HasOrganization):
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        if is_platform_admin(request.user):
            return True
        required = getattr(view, "required_permission", None)
        if required is None:
            return True
        if getattr(request.user, "is_api_key", False):
            if not api_scopes_allow(getattr(request, "api_permissions", []), required):
                self.message = "کلید API مجوز این عملیات را ندارد."
                return False
            return True
        if not role_has_permission(request.org_role, required):
            self.message = "شما مجوز این عملیات را ندارید."
            return False
        return True
