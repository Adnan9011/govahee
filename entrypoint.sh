#!/bin/bash
set -e
if [ "${RUN_MIGRATE:-0}" = "1" ]; then
  python manage.py migrate --noinput
  python manage.py collectstatic --noinput || true
fi
exec "$@"
