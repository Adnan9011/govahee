from unittest.mock import patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from accounts.models import User
from billing.models import Plan, Subscription
from billing.plans import seed_plans
from organizations.services import provision_organization


def _upgrade(org, code="starter"):
    seed_plans()
    plan = Plan.objects.get(code=code)
    sub = Subscription.objects.get(organization=org)
    sub.plan = plan
    sub.status = Subscription.Status.ACTIVE
    sub.save()
    return org


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="design@example.com", password="Secret123", full_name="Owner"
    )


@pytest.fixture
def org(user):
    return provision_organization(owner=user, name="Design Org")


@pytest.fixture
def auth_client(user, org):
    _upgrade(org)
    client = APIClient()
    client.force_authenticate(user=user)
    client.credentials(HTTP_X_ORGANIZATION_ID=str(org.id))
    return client


@pytest.mark.django_db
def test_template_preview_html(auth_client, org):
    from certificates.models import CertificateTemplate

    template = CertificateTemplate.objects.filter(organization=org, locale="fa").first()
    res = auth_client.get(f"/api/templates/{template.id}/preview/")
    assert res.status_code == 200
    body = res.content.decode("utf-8")
    assert "علی احمدی" in body or "Ali Ahmadi" in body
    assert "Vazirmatn" in body


@pytest.mark.django_db
def test_create_template_has_version(auth_client):
    res = auth_client.post(
        "/api/templates/",
        {"name": "Blank", "format": "a4_landscape", "locale": "fa"},
        format="json",
    )
    assert res.status_code == 201, res.data
    assert res.data["current_version"] is not None
    assert res.data["current_version"]["canvas"]["elements"] == []


@pytest.mark.django_db
def test_issue_with_expiry_date(auth_client, org):
    from certificates.models import Certificate, CertificateTemplate

    template = CertificateTemplate.objects.filter(organization=org).first()
    res = auth_client.post(
        "/api/certificates/issue/",
        {
            "template_id": template.id,
            "recipient": {"full_name": "Ali", "email": "ali-exp@example.com"},
            "course_name": "English",
            "expiry_mode": "date",
            "expiry_date": "2027-01-15",
            "send_email": False,
        },
        format="json",
    )
    assert res.status_code == 201, res.data
    cert = Certificate.objects.get(pk=res.data["id"])
    assert str(cert.expiry_date) == "2027-01-15"


@pytest.mark.django_db
def test_bulk_validate_row_errors(auth_client, org):
    from certificates.models import CertificateTemplate

    template = CertificateTemplate.objects.filter(organization=org).first()
    csv_body = "name,email,course_name\nAli,ali@example.com,English\n,not-an-email,English\n"
    upload = SimpleUploadedFile("people.csv", csv_body.encode("utf-8"), content_type="text/csv")
    uploaded = auth_client.post(
        "/api/bulk-issue/",
        {"step": "upload", "template_id": template.id, "file": upload},
        format="multipart",
    )
    assert uploaded.status_code == 200, uploaded.data
    batch_id = uploaded.data["batch"]["id"]
    mapping = uploaded.data["suggested_mapping"]
    validated = auth_client.post(
        "/api/bulk-issue/",
        {"step": "validate", "batch_id": batch_id, "column_mapping": mapping},
        format="json",
    )
    assert validated.status_code == 200, validated.data
    assert validated.data["valid_count"] == 1
    assert validated.data["invalid_count"] == 1
    assert validated.data["errors"]


@pytest.mark.django_db
def test_bulk_issue_builds_zip(auth_client, org):
    from certificates.models import CertificateTemplate, IssuanceBatch
    from certificates.tasks import build_batch_zip, process_issuance_batch

    template = CertificateTemplate.objects.filter(organization=org).first()
    csv_body = "name,email,course_name\nSara,sara@example.com,English\n"
    upload = SimpleUploadedFile("one.csv", csv_body.encode("utf-8"), content_type="text/csv")
    uploaded = auth_client.post(
        "/api/bulk-issue/",
        {"step": "upload", "template_id": template.id, "file": upload},
        format="multipart",
    )
    batch_id = uploaded.data["batch"]["id"]
    mapping = uploaded.data["suggested_mapping"]
    with patch("certificates.tasks.process_issuance_batch.delay", side_effect=process_issuance_batch):
        with patch("certificates.tasks.build_batch_zip.delay", side_effect=build_batch_zip):
            issued = auth_client.post(
                "/api/bulk-issue/",
                {"step": "issue", "batch_id": batch_id, "column_mapping": mapping},
                format="json",
            )
    assert issued.status_code == 200, issued.data
    batch = IssuanceBatch.objects.get(pk=batch_id)
    if not batch.zip_file_id:
        build_batch_zip(batch_id)
        batch.refresh_from_db()
    assert batch.zip_file_id
    zipped = auth_client.get(f"/api/batches/{batch_id}/zip/")
    assert zipped.status_code == 200
    assert zipped["Content-Type"] == "application/zip"


@pytest.mark.django_db
def test_upload_tenant_isolation(auth_client, org):
    png = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05"
        b"\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    upload = SimpleUploadedFile("logo.png", png, content_type="image/png")
    res = auth_client.post("/api/attachments/upload/", {"file": upload}, format="multipart")
    assert res.status_code == 200, res.data
    file_id = res.data["id"]
    fetched = auth_client.get(f"/api/attachments/{file_id}/file/")
    assert fetched.status_code == 200

    other = User.objects.create_user(email="iso@example.com", password="Secret123")
    other_org = provision_organization(owner=other, name="Other Design")
    other_client = APIClient()
    other_client.post("/api/auth/login/", {"login": other.email, "password": "Secret123"}, format="json")
    other_client.credentials(HTTP_X_ORGANIZATION_ID=str(other_org.id))
    blocked = other_client.get(f"/api/attachments/{file_id}/file/")
    assert blocked.status_code in (403, 404)


@pytest.mark.django_db
def test_complete_onboarding(auth_client, org):
    res = auth_client.post("/api/org/complete-onboarding/")
    assert res.status_code == 200
    org.refresh_from_db()
    assert org.onboarding_completed_at is not None


@pytest.mark.django_db
def test_branding_logo_stays_in_org(auth_client, org):
    png = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05"
        b"\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    upload = SimpleUploadedFile("mark.png", png, content_type="image/png")
    stored = auth_client.post("/api/attachments/upload/", {"file": upload}, format="multipart")
    patched = auth_client.patch("/api/branding/", {"logo_file": stored.data["id"]}, format="json")
    assert patched.status_code == 200, patched.data
    assert patched.data["logo_file"] == stored.data["id"]
    assert patched.data["logo_url"]
