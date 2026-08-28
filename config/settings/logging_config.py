from pathlib import Path
from typing import Any


def build_logging_config(
    *,
    base_dir: Path,
    debug: bool,
    log_level: str,
    log_json: bool,
    log_dir: Path,
) -> dict[str, Any]:
    log_dir.mkdir(parents=True, exist_ok=True)
    console_formatter = "json" if log_json else "colored"
    file_formatter = "json" if log_json else "verbose"

    return {
        "version": 1,
        "disable_existing_loggers": False,
        "filters": {
            "sensitive": {"()": "config.log_handlers.SensitiveDataFilter"},
            "context": {"()": "config.log_handlers.RequestContextFilter"},
        },
        "formatters": {
            "verbose": {
                "format": (
                    "%(asctime)s [%(levelname)s] %(name)s "
                    "rid=%(request_id)s uid=%(user_id)s tenant=%(tenant_id)s | %(message)s"
                ),
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
            "colored": {
                "()": "config.log_handlers.ColoredFormatter",
                "format": (
                    "%(asctime)s %(levelname)s %(name)s rid=%(request_id)s | %(message)s"
                ),
                "datefmt": "%H:%M:%S",
            },
            "json": {"()": "config.log_handlers.JSONFormatter"},
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": console_formatter,
                "filters": ["sensitive", "context"],
                "level": log_level,
            },
            "file": {
                "class": "logging.handlers.TimedRotatingFileHandler",
                "filename": str(log_dir / "app.log"),
                "when": "midnight",
                "backupCount": 30,
                "encoding": "utf-8",
                "formatter": file_formatter,
                "filters": ["sensitive", "context"],
                "level": log_level,
            },
        },
        "root": {"handlers": ["console", "file"], "level": log_level},
        "loggers": {
            "django": {
                "handlers": ["console", "file"],
                "level": "INFO" if not debug else "DEBUG",
                "propagate": False,
            },
            "celery": {
                "handlers": ["console", "file"],
                "level": log_level,
                "propagate": False,
            },
        },
    }
