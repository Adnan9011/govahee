"""Thread-local logging context (request_id, user, tenant) shared across the app."""

from __future__ import annotations

import uuid
from collections.abc import Iterator
from contextlib import contextmanager
from contextvars import ContextVar
from typing import Any

_log_context: ContextVar[dict[str, Any] | None] = ContextVar(
    "log_context", default=None
)


def get_log_context() -> dict[str, Any]:
    current = _log_context.get()
    return dict(current) if current else {}


def set_log_context(**kwargs: Any) -> None:
    current = dict(_log_context.get() or {})
    for key, value in kwargs.items():
        if value is not None:
            current[key] = value
    _log_context.set(current)


def clear_log_context() -> None:
    _log_context.set(None)


def generate_request_id() -> str:
    return uuid.uuid4().hex


@contextmanager
def log_context(**kwargs: Any) -> Iterator[None]:
    """Temporarily extend logging context (e.g. Celery tasks)."""
    previous = _log_context.get() or {}
    merged = dict(previous)
    merged.update({k: v for k, v in kwargs.items() if v is not None})
    token = _log_context.set(merged)
    try:
        yield
    finally:
        _log_context.reset(token)
