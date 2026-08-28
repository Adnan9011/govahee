from unittest.mock import patch

import pytest
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APIClient

from accounts.models import User
from billing.models import Plan, Subscription
from billing.plans import seed_plans
from organizations.models import OrganizationMembership, OrganizationRole
from organizations.services import provision_organization


def _upgrade(org, code="starter"):
    seed_plans()
    plan = Plan.objects.get(code=code)
    sub = Subscription.objects.get(organization=org)
    sub.plan = plan
    sub.status = Subscription.Status.ACTIVE
    sub.save()
    if plan.allows("api"):
        org.api_enabled = True
        org.save(update_fields=["api_enabled"])
    return org


@pytest.fixture
def owner(db):
    return User.objects.create_user(
        email="owner2@example.com", password="Secret123", full_name="Owner"
    )


@pytest.fixture
def org(owner):
    return provision_organization(owner=owner, name="Team Org")


@pytest.fixture
def auth_client(owner, org):
    _upgrade(org, "starter")
    client = APIClient()
    client.post("/api/auth/login/", {"login": owner.email, "password": "Secret123"}, format="json")
    client.credentials(HTTP_X_ORGANIZATION_ID=str(org.id))
    return client


@pytest.mark.django_db
def test_invite_and_set_password(auth_client, org):
    res = auth_client.post(
        "/api/team/",
        {"email": "new@example.com", "role": "issuer", "full_name": "New Member"},
        format="json",
    )
    assert res.status_code == 201, res.data
    user = User.objects.get(email="new@example.com")
    assert OrganizationMembership.objects.filter(organization=org, user=user).exists()
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    set_res = APIClient().post(
        "/api/auth/set-password/",
        {"uid": uid, "token": token, "password": "Newpass123"},
        format="json",
    )
    assert set_res.status_code == 200
    login = APIClient().post(
        "/api/auth/login/",
        {"login": "new@example.com", "password": "Newpass123"},
        format="json",
    )
    assert login.status_code == 200


@pytest.mark.django_db
def test_viewer_cannot_invite(owner, org):
    _upgrade(org, "starter")
    viewer = User.objects.create_user(email="v@example.com", password="Secret123")
    OrganizationMembership.objects.create(
        organization=org, user=viewer, role=OrganizationRole.VIEWER
    )
    client = APIClient()
    client.post("/api/auth/login/", {"login": viewer.email, "password": "Secret123"}, format="json")
    client.credentials(HTTP_X_ORGANIZATION_ID=str(org.id))
    res = client.post("/api/team/", {"email": "x@example.com", "role": "issuer"}, format="json")
    assert res.status_code == 403


@pytest.mark.django_db
def test_api_key_issue_and_isolation(auth_client, org, owner):
    _upgrade(org, "professional")
    other = User.objects.create_user(email="iso@example.com", password="Secret123")
    other_org = provision_organization(owner=other, name="Other API Org")
    created = auth_client.post(
        "/api/api-keys/",
        {
            "name": "ci",
            "permissions": ["certificates:read", "certificates:write", "certificates:revoke"],
        },
        format="json",
    )
    assert created.status_code == 201, created.data
    raw = created.data["key"]
    assert raw.startswith("gvh_")
    from certificates.models import CertificateTemplate

    template = CertificateTemplate.objects.filter(organization=org).first()
    api = APIClient()
    issued = api.post(
        "/api/v1/certificates/",
        {
            "template_id": template.id,
            "recipient": {"full_name": "API Person", "email": "api.person@example.com"},
            "course_name": "API Course",
        },
        format="json",
        HTTP_X_API_KEY=raw,
        HTTP_IDEMPOTENCY_KEY="api-row-1",
    )
    assert issued.status_code == 201, issued.data
    cert_id = issued.data["id"]
    listed = api.get("/api/v1/certificates/", HTTP_X_API_KEY=raw)
    assert listed.status_code == 200
    assert any(row["id"] == cert_id for row in listed.data)

    other_client = APIClient()
    other_client.post(
        "/api/auth/login/",
        {"login": other.email, "password": "Secret123"},
        format="json",
    )
    other_client.credentials(HTTP_X_ORGANIZATION_ID=str(other_org.id))
    leak = other_client.get(f"/api/certificates/{cert_id}/")
    assert leak.status_code in (403, 404)

    revoked = api.post(
        f"/api/v1/certificates/{cert_id}/revoke/",
        {"reason": "test"},
        format="json",
        HTTP_X_API_KEY=raw,
    )
    assert revoked.status_code == 200
    assert revoked.data["public_status"] == "revoked"


@pytest.mark.django_db
def test_webhook_signature_and_enqueue(org):
    _upgrade(org, "professional")
    from organizations.models import Webhook
    from organizations.webhooks import enqueue_event, sign_payload

    hook = Webhook.objects.create(
        organization=org,
        url="https://example.test/hook",
        secret="s3cret",
        events=["certificate.issued"],
        is_active=True,
    )
    with patch("organizations.tasks.deliver_webhook_delivery.delay") as delay:
        ids = enqueue_event(org.id, "certificate.issued", {"id": 1})
    assert ids
    delay.assert_called_once_with(ids[0])
    delivery = hook.deliveries.get(pk=ids[0])
    assert delivery.event == "certificate.issued"
    body = b'{"a":1}'
    sig = sign_payload("s3cret", body)
    assert sig.startswith("sha256=")


@pytest.mark.django_db
def test_csv_export_sanitizes_injection(auth_client, org):
    from certificates.export import sanitize_csv_cell
    from certificates.models import CertificateTemplate
    from certificates.services import issue_certificate

    assert sanitize_csv_cell("=cmd") == "'=cmd"
    template = CertificateTemplate.objects.filter(organization=org).first()
    issue_certificate(
        organization=org,
        actor=None,
        recipient_data={"full_name": "Export User", "email": "ex@example.com"},
        fields={"course_name": "+hijack"},
        template=template,
    )
    res = auth_client.get("/api/certificates/export/")
    assert res.status_code == 200
    body = res.content.decode("utf-8")
    assert "'+hijack" in body or "+hijack" in body
