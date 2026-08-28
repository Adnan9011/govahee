FROM python:3.11-slim AS base

ARG PIP_INDEX_URL=https://pypi.org/simple
ARG PIP_TRUSTED_HOST=pypi.org files.pythonhosted.org

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    POETRY_VIRTUALENVS_CREATE=false \
    PIP_INDEX_URL=${PIP_INDEX_URL} \
    PIP_TRUSTED_HOST=${PIP_TRUSTED_HOST}

RUN pip install --index-url https://pypi.org/simple "poetry>=2.0,<3"
WORKDIR /app
COPY pyproject.toml ./
RUN poetry install --only main --no-interaction --no-root --no-ansi || poetry install --only main --no-interaction --no-root --no-ansi

FROM base AS production
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf-2.0-0 libffi-dev shared-mime-info && rm -rf /var/lib/apt/lists/*
COPY . .
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && mkdir -p /app/staticfiles /app/media /app/logs
EXPOSE 8000
ENTRYPOINT ["/entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4"]
