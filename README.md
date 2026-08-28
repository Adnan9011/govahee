# Certificate SaaS (Govahi)

Multi-tenant SaaS for issuing, managing and verifying certificates.
Display name is configurable (`PLATFORM_DISPLAY_NAME`) and is not hardcoded.

This product is **not** a government credential system. The platform only
lets a verifier confirm that a **registered organization issued a record**.
Legal validity of the content is the issuer's responsibility.

## Stack (from Nobita)

Django 5.2 + DRF + SimpleJWT, React 18 + MUI 6 RTL, PostgreSQL, Redis, Celery.
Payment clients (Zibal/BitPay) and `StorageProvider` are reused from Nobita.

## Setup

```bash
cp .env.example .env
poetry install --with dev
poetry run python manage.py migrate
poetry run python manage.py seed_demo
poetry run python manage.py runserver
```

Frontend:

```bash
cd frontend && npm install && npm run dev
```

Demo login: `demo@example.com` / `Demo12345`

Super admin (optional): `SUPER_ADMIN_USERNAME` / `SUPER_ADMIN_PASSWORD` in `.env`

## Tests

```bash
poetry run pytest --no-cov
```

## Docs

- `docs/ARCHITECTURE.md` — reuse vs refactor, tenancy, RBAC
- `docs/PHASE_1.md` — foundation notes

## Core flow

Register → Organization → Template → Issue → PDF → `/verify/{token}`
