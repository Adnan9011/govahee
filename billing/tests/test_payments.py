from unittest.mock import patch

import pytest
from rest_framework.test import APIClient

from accounts.models import User
from billing.models import PaymentTransaction, Plan, Subscription
from billing.payments.bitpay import BitPayRequestResult, BitPayVerifyResult
from billing.plans import seed_plans
from billing.subscription import apply_subscription_plan
from organizations.services import provision_organization


@pytest.fixture
def owner(db):
    return User.objects.create_user(
        email="bill@example.com", password="Secret123", full_name="Biller"
    )


@pytest.fixture
def org(owner):
    return provision_organization(owner=owner, name="Pay Org")


@pytest.fixture
def auth_client(owner, org):
    client = APIClient()
    client.post("/api/auth/login/", {"login": owner.email, "password": "Secret123"}, format="json")
    client.credentials(HTTP_X_ORGANIZATION_ID=str(org.id))
    return client


@pytest.mark.django_db
def test_apply_subscription_plan(org):
    seed_plans()
    plan = Plan.objects.get(code="professional")
    sub = apply_subscription_plan(organization=org, plan=plan)
    assert sub.status == Subscription.Status.ACTIVE
    assert sub.plan.code == "professional"
    org.refresh_from_db()
    assert org.api_enabled is True


@pytest.mark.django_db
def test_payment_start_requires_enabled_gateway(auth_client):
    seed_plans()
    plan = Plan.objects.get(code="starter")
    res = auth_client.post(
        "/api/payments/start/",
        {"gateway": "zibal", "plan_id": plan.id},
        format="json",
    )
    assert res.status_code == 400


@pytest.mark.django_db
def test_bitpay_checkout_and_callback(auth_client, org, settings):
    settings.PAYMENT_BITPAY_ENABLED = True
    settings.BITPAY_API_KEY = "test-key"
    seed_plans()
    plan = Plan.objects.get(code="starter")
    request_result = BitPayRequestResult(
        id_get="99", redirect_url="https://bitpay.ir/payment/gateway-99-get", raw={"id_get": "99"}
    )
    verify_result = BitPayVerifyResult(
        success=True, status=1, amount=plan.price_toman, card_number="", factor_id="", raw={"status": 1}
    )
    with patch("billing.payments.service.bitpay.request_payment", return_value=request_result):
        res = auth_client.post(
            "/api/payments/start/",
            {"gateway": "bitpay", "plan_id": plan.id},
            format="json",
        )
    assert res.status_code == 201, res.data
    payment = PaymentTransaction.objects.get(pk=res.data["id"])
    assert payment.gateway_reference == "99"
    with patch("billing.payments.service.bitpay.verify_payment", return_value=verify_result):
        cb = APIClient().get(
            "/api/payments/bitpay/callback/",
            {"id_get": "99", "trans_id": "tx-1"},
        )
    assert cb.status_code in (302, 301)
    payment.refresh_from_db()
    assert payment.status == PaymentTransaction.Status.PAID
    sub = Subscription.objects.get(organization=org)
    assert sub.plan_id == plan.id
    assert sub.status == Subscription.Status.ACTIVE
