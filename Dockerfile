FROM python:3.11-slim AS base

ARG PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple
ARG PIP_TRUSTED_HOST=pypi.tuna.tsinghua.edu.cn files.pythonhosted.org pypi.org

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_INDEX_URL=${PIP_INDEX_URL} \
    PIP_TRUSTED_HOST=${PIP_TRUSTED_HOST} \
    PIP_DEFAULT_TIMEOUT=120 \
    PIP_RETRIES=15 \
    PIP_PROGRESS_BAR=on \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Docker often hangs on IPv6 to pypi.org; prefer IPv4.
RUN printf "precedence ::ffff:0:0/96  100\n" >> /etc/gai.conf

WORKDIR /app
COPY requirements.txt ./
RUN pip install --upgrade pip -v \
    && pip install -r requirements.txt -v --progress-bar on

FROM base AS production
RUN apt-get update && apt-get install -y --no-install-recommends \
        postgresql-client \
        libpango-1.0-0 \
        libpangocairo-1.0-0 \
        libgdk-pixbuf-2.0-0 \
        libffi-dev \
        shared-mime-info \
    && rm -rf /var/lib/apt/lists/*
COPY . .
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && mkdir -p /app/staticfiles /app/media /app/logs
EXPOSE 8000
ENTRYPOINT ["/entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4"]
