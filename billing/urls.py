from django.urls import path
from rest_framework.routers import DefaultRouter

from billing.views import PlanViewSet, SubscriptionView

router = DefaultRouter()
router.register("plans", PlanViewSet, basename="plans")

urlpatterns = [
    path("subscription/", SubscriptionView.as_view(), name="subscription"),
    *router.urls,
]
