"""Production overrides — DJANGO_SETTINGS_MODULE=config.settings.prod"""

from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F403
from .base import BASE_DIR, LOG_DIR, env
from .logging_config import build_logging_config

if not env("SECRET_KEY", default=""):
    raise ImproperlyConfigured("SECRET_KEY must be set to a strong production value.")

DEBUG = env.bool("DEBUG", default=False)

LOG_LEVEL = env("LOG_LEVEL", default="INFO")
LOG_JSON = env.bool("LOG_JSON", default=True)

# Nginx Proxy Manager terminates TLS and must send X-Forwarded-Proto: https.
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=31_536_000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool(
    "SECURE_HSTS_INCLUDE_SUBDOMAINS", default=True
)
SECURE_HSTS_PRELOAD = env.bool("SECURE_HSTS_PRELOAD", default=True)
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = env("SECURE_REFERRER_POLICY", default="same-origin")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_SAMESITE = env("CSRF_COOKIE_SAMESITE", default="Lax")
SESSION_COOKIE_SAMESITE = env("SESSION_COOKIE_SAMESITE", default="Lax")
X_FRAME_OPTIONS = "DENY"
JWT_COOKIE_SECURE = True

LOGGING = build_logging_config(
    base_dir=BASE_DIR,
    debug=DEBUG,
    log_level=LOG_LEVEL,
    log_json=LOG_JSON,
    log_dir=LOG_DIR,
)
