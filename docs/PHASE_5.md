# Phase 5–8 — Email, analytics, API, billing

Shipped:

- Team invite by email + set-password link (`/set-password/:uid/:token`)
- Subscription checkout via Zibal/BitPay (Nobita payment clients + org-scoped service)
- API keys (hashed, shown once) and REST `/api/v1/`
- Webhooks with HMAC signature, delivery log, exponential retry
- Analytics series (issuance / verification over time)
- CSV export with formula injection sanitization
- Settings tabs: branding, custom fields, email templates

API:

- `POST /api/team/` invite
- `POST /api/payments/start/`
- `GET /api/payments/bitpay/callback/` `GET /api/payments/zibal/callback/`
- `GET|POST /api/api-keys/`
- `GET|POST /api/webhooks/`
- `GET /api/analytics/`
- `GET /api/certificates/export/`
- `POST /api/auth/set-password/`
- `GET|POST /api/v1/certificates/`
- `POST /api/v1/certificates/{id}/revoke/`
- `GET /api/v1/templates/`

Auth for v1: `X-Api-Key: gvh_...` or `Authorization: Bearer gvh_...`

Env (unchanged names): `PAYMENT_BITPAY_ENABLED`, `BITPAY_API_KEY`, `PAYMENT_ZIBAL_ENABLED`, `ZIBAL_MERCHANT_ID`.
PlatformSettings can override the same fields.

Known issues:

- Custom domain / white-label DNS is stored on Branding but not routed yet
- Webhook HTTP delivery needs Celery worker in production (`CELERY_TASK_ALWAYS_EAGER` is test-only)
- Recipient wallet / Open Badges still out of MVP
