from rest_framework import permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import HasOrgPermission, IsPlatformAdmin
from billing.entitlements import get_entitlements
from billing.models import Plan, Subscription
from billing.plans import seed_plans


class PlanViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.AllowAny]
    queryset = Plan.objects.filter(is_active=True)

    def list(self, request):
        seed_plans()
        data = [
            {
                "id": p.id,
                "code": p.code,
                "name": p.name,
                "name_fa": p.name_fa,
                "interval": p.interval,
                "price_toman": p.price_toman,
                "capabilities": p.capabilities,
            }
            for p in self.get_queryset()
        ]
        return Response(data)


class SubscriptionView(APIView):
    permission_classes = [HasOrgPermission]
    required_permission = "billing.read"

    def get(self, request):
        sub = Subscription.objects.select_related("plan").filter(
            organization=request.organization
        ).first()
        return Response(
            {
                "subscription": {
                    "status": sub.status if sub else None,
                    "plan": sub.plan.code if sub else "free",
                    "current_period_end": sub.current_period_end if sub else None,
                }
                if sub
                else None,
                "entitlements": get_entitlements(request.organization),
            }
        )
