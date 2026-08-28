"""Custom logging formatters, filters, and database handler."""

from __future__ import annotations

import json
import logging
import re
import traceback
from datetime import UTC, datetime
from logging import Handler, LogRecord
from typing import Any

from config.logging_context import get_log_context

# Keys whose values must be redacted in log output.
_SENSITIVE_KEY_RE = re.compile(
    r"(password|passwd|token|secret|authorization|api[_-]?key|refresh|access)",
    re.IGNORECASE,
)
_SENSITIVE_VALUE_PATTERNS = (
    re.compile(r"Bearer\s+\S+", re.IGNORECASE),
    re.compile(r"(password|token|secret)\s*[=:]\s*\S+", re.IGNORECASE),
)

_LEVEL_COLORS = {
    "DEBUG": "\033[36m",
    "INFO": "\033[32m",
    "WARNING": "\033[33m",
    "ERROR": "\033[31m",
    "CRITICAL": "\033[35m",
}
_RESET = "\033[0m"


def _redact_string(value: str) -> str:
    redacted = value
    for pattern in _SENSITIVE_VALUE_PATTERNS:
        redacted = pattern.sub("[REDACTED]", redacted)
    return redacted


def _redact_value(key: str, value: Any) -> Any:
    if _SENSITIVE_KEY_RE.search(key):
        return "[REDACTED]"
    if isinstance(value, str):
        return _redact_string(value)
    if isinstance(value, dict):
        return {k: _redact_value(str(k), v) for k, v in value.items()}
    if isinstance(value, list | tuple):
        return [_redact_value(key, item) for item in value]
    return value


class SensitiveDataFilter(logging.Filter):
    """Strip passwords, tokens, and secrets from log records."""

    def filter(self, record: LogRecord) -> bool:
        record.msg = _redact_string(str(record.msg))
        if record.args:
            if isinstance(record.args, dict):
                record.args = {
                    k: _redact_value(str(k), v) for k, v in record.args.items()
                }
            elif isinstance(record.args, tuple):
                record.args = tuple(_redact_value("arg", arg) for arg in record.args)
        return True


class RequestContextFilter(logging.Filter):
    """Inject request/task context fields into every log record."""

    def filter(self, record: LogRecord) -> bool:
        ctx = get_log_context()
        record.request_id = ctx.get("request_id") or "-"
        record.user_id = ctx.get("user_id") or "-"
        record.tenant_id = ctx.get("tenant_id") or "-"
        record.user_phone = ctx.get("user_phone") or ""
        record.user_role = ctx.get("user_role") or ""
        record.trace_id = ctx.get("trace_id") or record.request_id
        return True


class ColoredFormatter(logging.Formatter):
    """ANSI-colored console formatter for local development."""

    def format(self, record: LogRecord) -> str:
        color = _LEVEL_COLORS.get(record.levelname, "")
        message = super().format(record)
        if color:
            message = message.replace(
                record.levelname, f"{color}{record.levelname}{_RESET}", 1
            )
        return message


class JSONFormatter(logging.Formatter):
    """Structured JSON logs for production (ELK/Loki/Sentry-ready)."""

    def format(self, record: LogRecord) -> str:
        ctx = get_log_context()
        payload: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", ctx.get("request_id")),
            "user_id": getattr(record, "user_id", ctx.get("user_id")),
            "tenant_id": getattr(record, "tenant_id", ctx.get("tenant_id")),
            "user_phone": getattr(record, "user_phone", ctx.get("user_phone")),
            "user_role": getattr(record, "user_role", ctx.get("user_role")),
            "trace_id": getattr(record, "trace_id", ctx.get("trace_id")),
        }

        for key in (
            "method",
            "path",
            "status_code",
            "duration_ms",
            "task_name",
            "task_id",
        ):
            value = getattr(record, key, None)
            if value is not None:
                payload[key] = value

        extra = getattr(record, "extra_data", None)
        if isinstance(extra, dict) and extra:
            payload["extra"] = _redact_value("extra", extra)

        if record.exc_info:
            payload["exception"] = "".join(traceback.format_exception(*record.exc_info))

        return json.dumps(payload, ensure_ascii=False, default=str)


class DatabaseLogHandler(Handler):
    """Persist log records to ApplicationLog for the platform admin UI."""

    def emit(self, record: LogRecord) -> None:
        try:
            from audit.models import ApplicationLog

            ctx = get_log_context()
            extra_data: dict[str, Any] = {}
            for key in (
                "method",
                "path",
                "status_code",
                "duration_ms",
                "task_name",
                "task_id",
            ):
                value = getattr(record, key, None)
                if value is not None:
                    extra_data[key] = value
            record_extra = getattr(record, "extra_data", None)
            if isinstance(record_extra, dict):
                extra_data.update(record_extra)

            ApplicationLog.objects.create(
                level=record.levelname,
                logger_name=record.name[:120],
                message=record.getMessage()[:4000],
                request_id=(
                    getattr(record, "request_id", None) or ctx.get("request_id") or ""
                )[:64],
                user_id=_safe_int(
                    getattr(record, "user_id", None) or ctx.get("user_id")
                ),
                tenant_id=_safe_int(
                    getattr(record, "tenant_id", None) or ctx.get("tenant_id")
                ),
                user_phone=(
                    getattr(record, "user_phone", None) or ctx.get("user_phone") or ""
                )[:20],
                user_role=(
                    getattr(record, "user_role", None) or ctx.get("user_role") or ""
                )[:20],
                source=_infer_source(record.name),
                extra_data=extra_data,
            )
        except Exception:
            self.handleError(record)


def _safe_int(value: Any) -> int | None:
    if value in (None, "", "-"):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _infer_source(logger_name: str) -> str:
    if logger_name.startswith("celery"):
        return "celery"
    if logger_name.endswith(".request"):
        return "request"
    if logger_name.startswith("frontend"):
        return "frontend"
    return "app"
