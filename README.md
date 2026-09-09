# Govahi (Certificate SaaS)

Multi-tenant SaaS for issuing, managing, and verifying certificates.

Display name is configurable (`PLATFORM_DISPLAY_NAME` / `PlatformSettings`) and is not hardcoded.

This product is **not** a government credential system. Public verification only confirms that a **registered organization issued a record**. Legal validity of the content is the issuer’s responsibility.

## Stack

| Layer | Choice |
|-------|--------|
| Backend | Python 3.11, Django 5.2, DRF, SimpleJWT (httpOnly cookies) |
| Frontend | React 18, TypeScript, Vite 5, MUI 6 (RTL, `fa` + `en`) |
| Data | PostgreSQL 16 (SQLite is the local default in `.env`) |
| Jobs | Redis 7, Celery 5 |
| PDF | `PDF_PROVIDER=html` (dev/tests) or `weasyprint` (production) |
| Payments | Zibal, BitPay |
| Storage | local / MinIO / Parspack (`StorageProvider`) |
| API docs | OpenAPI at `/api/schema/`, Swagger UI at `/api/docs/` |

## Apps

```
config/           Django project (brand-agnostic)
accounts/         User, JWT cookie auth, password set
organizations/    Org, membership, RBAC, branding, API keys, webhooks
certificates/     Types, templates, issue, bulk, PDF, verify, analytics
billing/          Plans, subscriptions, payments, usage
attachments/      Storage abstraction + org-scoped files
audit/            AuditLog
platform_core/    PlatformSettings, legal pages, site config
emails/           EmailProvider ABC
pdfs/             PdfProvider ABC
frontend/         SPA
```

Business logic does not import a concrete payment, storage, email, or PDF vendor.

## Features

- Register → organization → onboarding → template designer → issue → PDF → public `/verify/{token}`
- Template canvas (text, QR, logo, signature, seal, line, shape, watermark, table) with versioning
- Bulk CSV/Excel: upload → map columns → validate → Celery issue → ZIP download
- Team invite (`owner | admin | issuer | designer | viewer`) and set-password links
- Billing plans in DB (`Plan.capabilities`); checkout via Zibal/BitPay
- Org API keys (`gvh_…`) and REST `/api/v1/`
- Webhooks (HMAC, delivery log, retry)
- Analytics, CSV export, branding, custom fields, email templates
- Platform admin: org list, suspend, verification status (`/platform`)

## Local setup

Requires Python 3.10–3.12, [Poetry](https://python-poetry.org/), Node 20+, and (for jobs) Redis.

```bash
poetry install --with dev
poetry run python manage.py migrate
poetry run python manage.py seed_demo
poetry run python manage.py runserver
```

Frontend (proxies `/api` to `http://localhost:8000`):

```bash
cd frontend && npm install && npm run dev
```

Optional Celery worker (bulk issue, ZIP, certificate email, webhook delivery):

```bash
poetry run celery -A config worker -l info
```

Optional Redis via Docker only:

```bash
docker compose -f docker-compose.dev.yml up db redis minio
```

Then point `DATABASE_URL` / `CELERY_BROKER_URL` in `.env` at those services (do not leave `DATABASE_URL=sqlite:///…` if you intend to use Postgres).

### Demo accounts

| Role | Login | Password |
|------|--------|----------|
| Org owner | `demo@example.com` | `Demo12345` |
| Platform admin (env) | `SUPER_ADMIN_USERNAME` | `SUPER_ADMIN_PASSWORD` |
| Platform admin (DB user) | `poetry run python manage.py create_platform_admin` | default `admin@example.com` / `Admin12345` |

SPA: `http://localhost:5173` — dashboard at `/app`, verify at `/verify/{token}`.

## Docker

```bash
docker compose -f docker-compose.dev.yml up --build
```

Services: Postgres, Redis, MinIO, Django (`:8000`), Celery worker, Vite (`:5173`). The web container runs migrations when `RUN_MIGRATE=1`.

Production (`docker-compose.yml`) uses four images by default: Postgres, Redis, `govahi-app` (Django + Celery worker + beat), and `govahi-frontend`. MinIO is opt-in (`docker compose --profile minio up -d`) when `ATTACHMENT_STORAGE_PROVIDER=minio`. Python installs from the Tsinghua PyPI mirror. The frontend build probes Iranian npm mirrors; set `NPM_REGISTRY` to force a registry.

## Tests

Backend (coverage is on by default; `fail_under` is 40):

```bash
poetry run pytest --no-cov
```

Frontend:

```bash
cd frontend && npm test
```

Lint / format (backend):

```bash
poetry run ruff check .
poetry run black --check .
```

## Configuration

Configure `.env` locally (gitignored). Important keys:

| Variable | Purpose |
|----------|---------|
| `PLATFORM_DISPLAY_NAME` / `_FA` | Product name in API and UI |
| `SITE_URL` / `FRONTEND_SITE_URL` | Public links (verify URLs, invites) |
| `DATABASE_URL` | Default example is SQLite; use Postgres in Docker/prod |
| `CELERY_BROKER_URL` | Redis; bulk/email/webhooks need a worker unless `CELERY_TASK_ALWAYS_EAGER=True` |
| `PDF_PROVIDER` | `html` (no WeasyPrint) or `weasyprint` |
| `ATTACHMENT_STORAGE_PROVIDER` | `local`, `minio`, or Parspack |
| `PAYMENT_ZIBAL_ENABLED` / `ZIBAL_MERCHANT_ID` | Zibal |
| `PAYMENT_BITPAY_ENABLED` / `BITPAY_API_KEY` | BitPay |
| `SUPER_ADMIN_USERNAME` / `SUPER_ADMIN_PASSWORD` | Env-based platform admin (not a DB user) |
| `JWT_COOKIE_SECURE` | Set `True` behind HTTPS |

Org-scoped API calls send `X-Organization-Id`. Cookie JWT is used by the SPA; API keys are for `/api/v1/`.

## Auth, tenancy, RBAC

- Identities: email and/or phone + password. Access/refresh JWT in httpOnly cookies.
- Every org-owned row has `organization_id`. QuerySets use `.for_org(organization)`.
- Org roles: `owner | admin | issuer | designer | viewer` (permission map in `organizations/rbac.py`).
- Issued certificates are immutable; corrections go through reissue + audit.
- Public verify uses a high-entropy `verification_token` (not the PK). QR encodes only the public URL. `integrity_hash` is SHA-256 of canonical payload fields.

## HTTP API (selected)

Interactive docs: [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/). Health: `GET /api/health/`.

**Auth**

- `POST /api/auth/register/` `POST /api/auth/login/` `POST /api/auth/logout/`
- `GET /api/auth/session/` `POST /api/auth/set-password/`
- `POST /api/token/refresh/`

**Certificates**

- `POST /api/certificates/issue/`
- `GET /api/certificates/{id}/` `POST …/revoke/` `GET …/pdf/` `GET …/preview/` `POST …/send/`
- `GET /api/certificates/export/` `POST /api/certificates/bulk-actions/`
- `GET /api/templates/` `GET /api/templates/{id}/preview/` `POST /api/templates/{id}/versions/`
- `POST /api/bulk-issue/` steps: `upload` \| `validate` \| `issue`
- `GET /api/batches/{id}/zip/`
- `GET /api/verify/{token}/` `GET /api/verify/search/`
- `GET /api/issuer/{slug}/`
- `GET /api/dashboard/` `GET /api/analytics/`

**Org, billing, files**

- `GET\|PATCH /api/org/current/` `POST /api/org/complete-onboarding/`
- `GET\|PATCH /api/branding/` `GET\|POST /api/team/`
- `GET\|POST /api/api-keys/` `GET\|POST /api/webhooks/`
- `GET /api/plans/` `GET /api/subscription/` `POST /api/payments/start/`
- `GET /api/payments/zibal/callback/` `GET /api/payments/bitpay/callback/`
- `POST /api/attachments/upload/` `GET /api/attachments/{id}/file/`
- `GET /api/site/config/` `GET /api/legal/{kind}/`
- `GET /api/admin/organizations/` (platform admin)

**External API v1** (header `X-Api-Key: gvh_…` or `Authorization: Bearer gvh_…`)

- `GET\|POST /api/v1/certificates/`
- `GET /api/v1/certificates/{id}/` `POST /api/v1/certificates/{id}/revoke/`
- `GET /api/v1/templates/`

## SPA routes

| Path | Page |
|------|------|
| `/` | Landing |
| `/login` `/register` | Auth |
| `/set-password/:uid/:token` | Team invite |
| `/verify/:token` `/issuer/:slug` | Public |
| `/legal/:kind` | Legal |
| `/app` | Dashboard |
| `/app/onboarding` | Owner/admin onboarding gate |
| `/app/certificates` `/app/issue` `/app/bulk` | Issue |
| `/app/templates` `/app/templates/:id` | Designer |
| `/app/recipients` `/app/team` `/app/analytics` | Org |
| `/app/integrations` `/app/settings` `/app/billing` | Settings |
| `/app/verify-search` | Lookup by number |
| `/platform` | Platform admin |

## Known gaps

- Custom domain / white-label DNS is stored on Branding but not routed yet.
- Webhook delivery, bulk ZIP, and certificate email need a Celery worker in production (`CELERY_TASK_ALWAYS_EAGER` is test-only).
- Recipient wallet / Open Badges are out of MVP.

## Docs

- `README_REQUIRE.md` — product requirements and per-item status
- `README_PLAN.md` — shipped phases, production gaps, next priorities
- `README_SUGGEST_NAMES.md` — brand and domain name suggestions
- `docs/ARCHITECTURE.md` — tenancy, RBAC, reuse vs new domain
- `docs/PHASE_1.md` — foundation (org, auth, plans, admin)
- `docs/PHASE_2.md` — certificates, PDF, bulk
- `docs/PHASE_5.md` — billing, API keys, webhooks, team, analytics
- `docs/PHASE_6.md` — designer, bulk ZIP, onboarding
