from datetime import timedelta
from pathlib import Path
from urllib.parse import quote_plus, urlparse

import environ
from django.core.management.utils import get_random_secret_key

from config.settings.logging_config import build_logging_config

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
    CORS_ALLOWED_ORIGINS=(list, ["http://localhost:5173", "http://localhost:3000"]),
    CORS_ALLOW_ALL_ORIGINS=(bool, False),
    JWT_ACCESS_TOKEN_LIFETIME=(int, 60),
    JWT_REFRESH_TOKEN_LIFETIME=(int, 1440),
    JWT_COOKIE_SECURE=(bool, False),
    JWT_COOKIE_SAMESITE=(str, "Lax"),
    JWT_EXPOSE_TOKENS_IN_RESPONSE=(bool, True),
    DRF_ANON_THROTTLE_RATE=(str, "200/min"),
    DRF_USER_THROTTLE_RATE=(str, "1000/min"),
    DRF_AUTH_THROTTLE_RATE=(str, "20/min"),
    DRF_PASSWORD_RESET_THROTTLE_RATE=(str, "10/min"),
    DRF_VERIFY_THROTTLE_RATE=(str, "60/min"),
    DRF_BULK_THROTTLE_RATE=(str, "10/min"),
    DRF_API_KEY_THROTTLE_RATE=(str, "120/min"),
    LOGIN_MAX_FAILED_ATTEMPTS=(int, 5),
    LOGIN_LOCKOUT_SECONDS=(int, 900),
    LOG_LEVEL=(str, ""),
    LOG_JSON=(bool, False),
    LOG_TO_DB=(bool, False),
)

environ.Env.read_env(BASE_DIR / ".env")

def _hostnames(values: list[str]) -> list[str]:
    hosts: list[str] = []
    seen: set[str] = set()
    for raw in values:
        value = (raw or "").strip()
        if not value:
            continue
        if "://" in value:
            hostname = urlparse(value).hostname
            value = hostname or value
        if value not in seen:
            seen.add(value)
            hosts.append(value)
    return hosts


SECRET_KEY = env("SECRET_KEY", default="") or get_random_secret_key()
DEBUG = env("DEBUG")
ALLOWED_HOSTS = _hostnames(env.list("ALLOWED_HOSTS"))
SITE_URL = env("SITE_URL", default="http://localhost:5173")
FRONTEND_SITE_URL = env("FRONTEND_SITE_URL", default=SITE_URL)
FRONTEND_INDEX_PATH = env(
    "FRONTEND_INDEX_PATH",
    default=str(BASE_DIR / "frontend" / "dist" / "index.html"),
)

PLATFORM_DISPLAY_NAME = env("PLATFORM_DISPLAY_NAME", default="Govahi")
PLATFORM_DISPLAY_NAME_FA = env("PLATFORM_DISPLAY_NAME_FA", default="گواهی")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "drf_spectacular",
    "django_filters",
    "django_celery_beat",
    "accounts",
    "organizations",
    "certificates",
    "billing",
    "attachments",
    "audit",
    "platform_core",
    "emails",
    "pdfs",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "accounts.middleware.RequestIdMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

POSTGRES_DB = env("POSTGRES_DB", default="")
POSTGRES_USER = env("POSTGRES_USER", default="")
POSTGRES_PASSWORD = env("POSTGRES_PASSWORD", default="")
POSTGRES_HOST = env("POSTGRES_HOST", default="localhost")
POSTGRES_PORT = env.int("POSTGRES_PORT", default=5432)


def _database_url() -> str:
    explicit = env("DATABASE_URL", default="")
    if explicit:
        return explicit
    if POSTGRES_DB and POSTGRES_USER:
        password = quote_plus(POSTGRES_PASSWORD)
        return (
            f"postgresql://{POSTGRES_USER}:{password}"
            f"@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
        )
    return "sqlite:///db.sqlite3"


DATABASES = {
    "default": env.db_url_config(_database_url()),
}

_CACHE_URL = env("CACHE_URL", default="")
if _CACHE_URL:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": _CACHE_URL,
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "govahi-default",
        }
    }

LOGIN_MAX_FAILED_ATTEMPTS = env("LOGIN_MAX_FAILED_ATTEMPTS")
LOGIN_LOCKOUT_SECONDS = env("LOGIN_LOCKOUT_SECONDS")

AUTH_USER_MODEL = "accounts.User"

SUPER_ADMIN_USERNAME = env("SUPER_ADMIN_USERNAME", default="")
SUPER_ADMIN_PASSWORD = env("SUPER_ADMIN_PASSWORD", default="")

PAYMENT_BITPAY_ENABLED = env.bool("PAYMENT_BITPAY_ENABLED", default=False)
BITPAY_API_KEY = env("BITPAY_API_KEY", default="")
BITPAY_CALLBACK_URL = env("BITPAY_CALLBACK_URL", default="")
PAYMENT_ZIBAL_ENABLED = env.bool("PAYMENT_ZIBAL_ENABLED", default=False)
ZIBAL_MERCHANT_ID = env("ZIBAL_MERCHANT_ID", default="")
ZIBAL_CALLBACK_URL = env("ZIBAL_CALLBACK_URL", default="")

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
]

LANGUAGE_CODE = env("LANGUAGE_CODE", default="fa")
TIME_ZONE = env("TIME_ZONE", default="Asia/Tehran")
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"] if (BASE_DIR / "static").exists() else []
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "organizations.authentication.ApiKeyAuthentication",
        "accounts.auth.CookieJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.ScopedRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": env("DRF_ANON_THROTTLE_RATE"),
        "user": env("DRF_USER_THROTTLE_RATE"),
        "auth": env("DRF_AUTH_THROTTLE_RATE"),
        "password_reset": env("DRF_PASSWORD_RESET_THROTTLE_RATE"),
        "verify": env("DRF_VERIFY_THROTTLE_RATE"),
        "bulk": env("DRF_BULK_THROTTLE_RATE"),
        "api_key": env("DRF_API_KEY_THROTTLE_RATE"),
    },
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "config.pagination.StandardPageNumberPagination",
    "PAGE_SIZE": 20,
    "EXCEPTION_HANDLER": "config.exceptions.api_exception_handler",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env("JWT_ACCESS_TOKEN_LIFETIME")),
    "REFRESH_TOKEN_LIFETIME": timedelta(minutes=env("JWT_REFRESH_TOKEN_LIFETIME")),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

JWT_AUTH_COOKIE = env("JWT_AUTH_COOKIE", default="govahi_access")
JWT_AUTH_REFRESH_COOKIE = env("JWT_AUTH_REFRESH_COOKIE", default="govahi_refresh")
JWT_COOKIE_SECURE = env.bool("JWT_COOKIE_SECURE")
JWT_COOKIE_SAMESITE = env("JWT_COOKIE_SAMESITE")
JWT_EXPOSE_TOKENS_IN_RESPONSE = env.bool("JWT_EXPOSE_TOKENS_IN_RESPONSE")

SPECTACULAR_SETTINGS = {
    "TITLE": "Certificate SaaS API",
    "DESCRIPTION": "Issuance, management and verification of certificates",
    "VERSION": "1.0.0",
}

CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS")
CORS_ALLOW_ALL_ORIGINS = env("CORS_ALLOW_ALL_ORIGINS")
CORS_ALLOW_CREDENTIALS = env.bool("CORS_ALLOW_CREDENTIALS", default=True)

from corsheaders.defaults import default_headers as _cors_default_headers

CORS_ALLOW_HEADERS = list(_cors_default_headers) + [
    "x-request-id",
    "x-organization-id",
    "x-api-key",
    "idempotency-key",
]

CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])

CELERY_BROKER_URL = env("CELERY_BROKER_URL", default="redis://localhost:6379/0")
CELERY_RESULT_BACKEND = env("CELERY_RESULT_BACKEND", default="redis://localhost:6379/0")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"
CELERY_WORKER_HIJACK_ROOT_LOGGER = False
CELERY_TASK_ALWAYS_EAGER = env.bool("CELERY_TASK_ALWAYS_EAGER", default=False)
CELERY_TASK_EAGER_PROPAGATES = True
CELERY_BEAT_SCHEDULE = {
    "retry-webhooks": {
        "task": "organizations.tasks.retry_pending_webhooks",
        "schedule": 60.0,
    },
}

EMAIL_BACKEND = env(
    "EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend"
)
EMAIL_HOST = env("EMAIL_HOST", default="")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="noreply@localhost")

ATTACHMENT_STORAGE_PROVIDER = env("ATTACHMENT_STORAGE_PROVIDER", default="local")
ATTACHMENT_LOCAL_ROOT = Path(
    env("ATTACHMENT_LOCAL_ROOT", default=str(BASE_DIR / "media" / "files"))
)
ATTACHMENT_SIGNED_URL_EXPIRY_SECONDS = env.int(
    "ATTACHMENT_SIGNED_URL_EXPIRY_SECONDS", default=300
)
ATTACHMENT_USE_SIGNED_URLS = env.bool("ATTACHMENT_USE_SIGNED_URLS", default=True)
ATTACHMENT_MAX_UPLOAD_MB = env.int("ATTACHMENT_MAX_UPLOAD_MB", default=10)
BULK_IMPORT_MAX_UPLOAD_MB = env.int("BULK_IMPORT_MAX_UPLOAD_MB", default=8)
BULK_IMPORT_MAX_ROWS = env.int("BULK_IMPORT_MAX_ROWS", default=10000)

PARSPACK_S3_ENDPOINT_URL = env("PARSPACK_S3_ENDPOINT_URL", default="")
PARSPACK_S3_ACCESS_KEY = env("PARSPACK_S3_ACCESS_KEY", default="")
PARSPACK_S3_SECRET_KEY = env("PARSPACK_S3_SECRET_KEY", default="")
PARSPACK_S3_BUCKET_NAME = env("PARSPACK_S3_BUCKET_NAME", default="")
PARSPACK_S3_REGION = env("PARSPACK_S3_REGION", default="us-east-1")
PARSPACK_S3_PRESIGNED_EXPIRE_SECONDS = env.int(
    "PARSPACK_S3_PRESIGNED_EXPIRE_SECONDS", default=300
)
PARSPACK_S3_ADDRESSING_STYLE = env("PARSPACK_S3_ADDRESSING_STYLE", default="path")
PARSPACK_S3_SIGNATURE_VERSION = env("PARSPACK_S3_SIGNATURE_VERSION", default="s3v4")
MINIO_ENDPOINT = env("MINIO_ENDPOINT", default="http://localhost:9000")
MINIO_ACCESS_KEY = env("MINIO_ACCESS_KEY", default="minioadmin")
MINIO_SECRET_KEY = env("MINIO_SECRET_KEY", default="minioadmin")
MINIO_BUCKET = env("MINIO_BUCKET", default="govahi-files")
MINIO_USE_SSL = env.bool("MINIO_USE_SSL", default=False)
MINIO_REGION = env("MINIO_REGION", default="us-east-1")

PDF_PROVIDER = env("PDF_PROVIDER", default="weasyprint")
EMAIL_PROVIDER = env("EMAIL_PROVIDER", default="django")

DATA_UPLOAD_MAX_MEMORY_SIZE = 20 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024

LOG_DIR = Path(env("LOG_DIR", default=str(BASE_DIR / "logs")))
LOG_LEVEL = env("LOG_LEVEL", default="DEBUG" if DEBUG else "INFO")
LOG_JSON = env.bool("LOG_JSON", default=not DEBUG)
LOG_TO_DB = env.bool("LOG_TO_DB", default=False)
LOG_DB_MIN_LEVEL = env("LOG_DB_MIN_LEVEL", default="WARNING")
SENTRY_DSN = env("SENTRY_DSN", default="")

LOGGING = build_logging_config(
    base_dir=BASE_DIR,
    debug=DEBUG,
    log_level=LOG_LEVEL,
    log_json=LOG_JSON,
    log_dir=LOG_DIR,
)
