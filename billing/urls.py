from django.urls import path
from rest_framework.routers import DefaultRouter

from billing.views import (
    BitPayCallbackView,
    PaymentStartView,
    PlanViewSet,
    SubscriptionView,
    ZibalCallbackView,
)

router = DefaultRouter()
router.register("plans", PlanViewSet, basename="plans")

urlpatterns = [
    path("subscription/", SubscriptionView.as_view(), name="subscription"),
    path("payments/start/", PaymentStartView.as_view(), name="payment-start"),
    path(
        "payments/bitpay/callback/",
        BitPayCallbackView.as_view(),
        name="payment-bitpay-callback",
    ),
    path(
        "payments/zibal/callback/",
        ZibalCallbackView.as_view(),
        name="payment-zibal-callback",
    ),
    *router.urls,
]
