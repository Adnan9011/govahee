"""Root pytest configuration."""

import os

import pytest


def pytest_configure(config):
    os.environ.setdefault("SECRET_KEY", "ci-test-secret-key-not-for-production")
    os.environ.setdefault("DEBUG", "True")
    os.environ.setdefault("DATABASE_URL", "sqlite:///test.db")
    os.environ.setdefault("CELERY_BROKER_URL", "redis://localhost:6379/0")
    os.environ.setdefault("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
    os.environ.setdefault("ALLOWED_HOSTS", "localhost,127.0.0.1,testserver")
    os.environ.setdefault("EMAIL_BACKEND", "django.core.mail.backends.locmem.EmailBackend")
    os.environ.setdefault("PDF_PROVIDER", "html")


@pytest.fixture
def api_client():
    from rest_framework.test import APIClient

    return APIClient()
