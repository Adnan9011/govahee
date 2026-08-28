# Certificate SaaS — Architecture Plan

Internal name of this repository: **Govahi**. Product display name is **not** hardcoded;
it comes from `PLATFORM_DISPLAY_NAME` / `PlatformSettings`.

## 1. Stack (reused from Nobita)

| Layer | Choice | Source |
|-------|--------|--------|
| Python | 3.11 | Nobita |
| Django | 5.2 | Nobita |
| DRF + SimpleJWT | 3.15 / 5.5 | Nobita |
| PostgreSQL 16 + Redis 7 + Celery 5 | same | Nobita |
| Frontend | React 18 + TS + Vite 5 + MUI 6 RTL | Nobita design system copied |
| Payments | Zibal + BitPay clients | `scheduling/payments/` copied into `billing/payments/` |
| Storage | `StorageProvider` ABC (local / MinIO / Parspack) | `attachments/` infrastructure copied |
| Dates | Gregorian in DB, Jalali in FA UI | Nobita `jalaali-js` utilities |
| i18n | `fa` + `en` translation modules | **Extended** (Nobita was fa-only) |

## 2. What we reuse vs change

### Reuse as-is (adapted names only)

- MUI design system (`frontend/src/components/ui`, `theme/`)
- JWT cookie auth pattern (`SuperAdminJWTAuthentication`, httpOnly cookies)
- Payment gateway HTTP clients (Zibal, BitPay)
- Storage provider abstraction
- Dashboard shell (sidebar Layout, StatCard, Hero, Jalali fields)
- Docker / Poetry / pytest / ruff / black conventions
- Request-id logging, throttle rates, CORS cookie JWT

### Refactor (intentional)

Nobita tenancy is **manager-as-user**. This product needs a first-class **Organization**
with team roles. Blindly copying `User.role=manager` would fight the domain model.

```
Nobita                         This product
────────────────────────────────────────────
User(manager)                  Organization
ManagerStaff                   OrganizationMembership + Role
User.sms_balance               UsageCounter (metered keys)
ManagerLandingPage             PublicIssuerProfile + /verify + /issuer/:slug
```

### New domain

Certificates, templates, verification, bulk issuance, PDF, QR, webhooks, API keys.

## 3. App layout

```
config/              Django project (brand-agnostic)
accounts/            User, JWT auth, password reset
organizations/       Org, membership, RBAC, branding, custom fields
certificates/        Types, templates, certificates, batches, verification
billing/             Plans, subscriptions, payments, usage
attachments/         Storage abstraction + org-scoped files
audit/               AuditLog
platform_core/       PlatformSettings, legal pages, site config
emails/              EmailProvider ABC
pdfs/                PdfProvider ABC
frontend/            SPA
```

Business logic never imports a concrete payment/storage/email/PDF vendor.

## 4. Multi-tenancy

Every org-owned row has `organization_id` (non-nullable FK).

- QuerySets expose `.for_org(organization)`.
- API views mix in `OrganizationScopedMixin` which:
  1. Resolves org from `X-Organization-Id` (else the user's default membership).
  2. Loads `request.organization` + `request.membership`.
  3. Filters querysets by that org.
- Unique constraints are `(organization, …)` never global IDs as public tokens.
- Changing an ID in the URL cannot leak another tenant: lookups always include org.

## 5. Auth & RBAC

**Identities:** email and/or phone + password. JWT access/refresh in httpOnly cookies
(same as Nobita). Super-admin from `SUPER_ADMIN_USERNAME` / `SUPER_ADMIN_PASSWORD` env.

**Platform role:** `User.is_platform_admin` or SuperAdmin principal.

**Org roles (extensible):** `owner | admin | issuer | designer | viewer`

Permissions are strings (`certificates.issue`, `templates.write`, …). Roles map to
permission sets in `organizations/rbac.py` so new roles can be added without migrations
of enum-only tables (a `Role` table is reserved for later custom roles).

## 6. Certificate integrity

- Public verification uses a high-entropy `verification_token` (urlsafe, not PK).
- QR encodes only the public verification URL.
- `integrity_hash` = SHA-256 of canonical payload (id, recipient, course, issuer, dates).
- Issued certificates are immutable; corrections go through reissue + audit.
- Template **versioning**: issued certs point at `TemplateVersion`, not the live draft.

## 7. Jobs

Celery queue `celery`:

- bulk certificate generation
- PDF + ZIP
- email send / retry
- webhook delivery (HMAC + exponential retry)
- expire certificates
- usage aggregation

Single issuance may run synchronously when the plan allows.

API keys authenticate `/api/v1/` via `X-Api-Key` / `Bearer gvh_...` (SHA-256 stored hash).

## 8. Billing

Plans are DB rows (`Plan.capabilities` JSON). Limits are never hardcoded in views.
Payment service copies Nobita's start → callback → verify → apply flow, keyed by
`Organization` instead of manager `User`. Gateways: Zibal and BitPay.

## 9. Legal

Public verification and Terms state that the platform verifies *issuance by a
registered organization*, not legal validity of the credential content.

## 10. Phases

See `docs/PHASE_*.md`. Phase 1–4 are the MVP path (org + issue + PDF + bulk).
