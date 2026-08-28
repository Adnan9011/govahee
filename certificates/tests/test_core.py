import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from accounts.models import User
from certificates.models import Certificate
from organizations.models import OrganizationMembership, OrganizationRole
from organizations.services import provision_organization


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="owner@example.com", password="Secret123", full_name="Owner"
    )


@pytest.fixture
def org(user):
    return provision_organization(owner=user, name="Lang Institute")


@pytest.fixture
def other_user(db):
    u = User.objects.create_user(
        email="other@example.com", password="Secret123", full_name="Other"
    )
    provision_organization(owner=u, name="Other Org")
    return u


@pytest.fixture
def auth_client(user, org):
    client = APIClient()
    res = client.post("/api/auth/login/", {"login": user.email, "password": "Secret123"}, format="json")
    assert res.status_code == 200
    client.credentials(HTTP_X_ORGANIZATION_ID=str(org.id))
    return client


@pytest.mark.django_db
def test_register_creates_org_and_templates():
    client = APIClient()
    res = client.post(
        "/api/auth/register/",
        {
            "full_name": "Sara",
            "email": "sara@example.com",
            "password": "Secret123",
            "organization_name": "Sara Academy",
        },
        format="json",
    )
    assert res.status_code == 201
    assert OrganizationMembership.objects.filter(user__email="sara@example.com").exists()


@pytest.mark.django_db
def test_issue_and_verify(auth_client, org):
    from certificates.models import CertificateTemplate

    template = CertificateTemplate.objects.filter(organization=org).first()
    assert template
    res = auth_client.post(
        "/api/certificates/issue/",
        {
            "template_id": template.id,
            "recipient": {"full_name": "Ali Ahmadi", "email": "ali@example.com"},
            "course_name": "English B2",
            "title": "Completion",
        },
        format="json",
    )
    assert res.status_code == 201, res.data
    token = Certificate.objects.get(pk=res.data["id"]).verification_token
    assert token != str(res.data["id"])
    public = APIClient().get(f"/api/verify/{token}/")
    assert public.status_code == 200
    assert public.data["status"] == "active"
    assert public.data["recipient_name"] == "Ali Ahmadi"
    assert "national" not in str(public.data).lower()


@pytest.mark.django_db
def test_certificate_number_unique(auth_client, org):
    from certificates.models import CertificateTemplate
    from certificates.services import issue_certificate

    template = CertificateTemplate.objects.filter(organization=org).first()
    c1 = issue_certificate(
        organization=org,
        actor=None,
        recipient_data={"full_name": "A"},
        fields={"course_name": "C"},
        template=template,
    )
    c2 = issue_certificate(
        organization=org,
        actor=None,
        recipient_data={"full_name": "B"},
        fields={"course_name": "C"},
        template=template,
    )
    assert c1.certificate_number != c2.certificate_number


@pytest.mark.django_db
def test_revoke(auth_client, org):
    from certificates.models import CertificateTemplate
    from certificates.services import issue_certificate, revoke_certificate

    template = CertificateTemplate.objects.filter(organization=org).first()
    cert = issue_certificate(
        organization=org,
        actor=None,
        recipient_data={"full_name": "A"},
        fields={"course_name": "C"},
        template=template,
    )
    revoke_certificate(certificate=cert, actor=None, reason="mistake")
    public = APIClient().get(f"/api/verify/{cert.verification_token}/")
    assert public.data["status"] == "revoked"


@pytest.mark.django_db
def test_tenant_isolation(auth_client, org, other_user):
    from certificates.models import CertificateTemplate
    from certificates.services import issue_certificate

    template = CertificateTemplate.objects.filter(organization=org).first()
    cert = issue_certificate(
        organization=org,
        actor=None,
        recipient_data={"full_name": "Secret Person"},
        fields={"course_name": "C"},
        template=template,
    )
    other_client = APIClient()
    other_client.post(
        "/api/auth/login/",
        {"login": other_user.email, "password": "Secret123"},
        format="json",
    )
    other_org = OrganizationMembership.objects.get(user=other_user).organization
    other_client.credentials(HTTP_X_ORGANIZATION_ID=str(other_org.id))
    res = other_client.get(f"/api/certificates/{cert.id}/")
    assert res.status_code in (403, 404)


@pytest.mark.django_db
def test_idempotent_issue(org):
    from certificates.models import CertificateTemplate
    from certificates.services import issue_certificate

    template = CertificateTemplate.objects.filter(organization=org).first()
    kwargs = dict(
        organization=org,
        actor=None,
        recipient_data={"full_name": "A", "email": "a@x.com"},
        fields={"course_name": "C"},
        template=template,
        idempotency_key="batch-1-row-1",
    )
    c1 = issue_certificate(**kwargs)
    c2 = issue_certificate(**kwargs)
    assert c1.pk == c2.pk
    assert Certificate.objects.filter(organization=org).count() == 1


@pytest.mark.django_db
def test_template_variables_substitute():
    from certificates.variables import substitute

    assert substitute("Hi {{recipient_name}}", {"recipient_name": "Ali"}) == "Hi Ali"


@pytest.mark.django_db
def test_rbac_viewer_cannot_issue(user, org):
    viewer = User.objects.create_user(email="view@example.com", password="Secret123")
    OrganizationMembership.objects.create(
        organization=org, user=viewer, role=OrganizationRole.VIEWER
    )
    client = APIClient()
    client.post("/api/auth/login/", {"login": viewer.email, "password": "Secret123"}, format="json")
    client.credentials(HTTP_X_ORGANIZATION_ID=str(org.id))
    from certificates.models import CertificateTemplate

    template = CertificateTemplate.objects.filter(organization=org).first()
    res = client.post(
        "/api/certificates/issue/",
        {"template_id": template.id, "recipient": {"full_name": "X"}},
        format="json",
    )
    assert res.status_code == 403
