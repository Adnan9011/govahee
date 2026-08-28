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
    os.environ.setdefault("CELERY_TASK_ALWAYS_EAGER", "True")
    os.environ.setdefault("LOG_LEVEL", "WARNING")
    os.environ.setdefault("DRF_AUTH_THROTTLE_RATE", "1000/min")
    os.environ.setdefault("DRF_BULK_THROTTLE_RATE", "1000/min")
    os.environ.setdefault("DRF_ANON_THROTTLE_RATE", "1000/min")


@pytest.fixture(autouse=True)
def _disable_throttles(monkeypatch):
    monkeypatch.setattr(
        "rest_framework.throttling.SimpleRateThrottle.allow_request",
        lambda self, request, view: True,
    )


@pytest.fixture
def api_client():
    from rest_framework.test import APIClient

    return APIClient()
