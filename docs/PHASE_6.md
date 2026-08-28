# Phase 6 — Designer, bulk ZIP, onboarding

Shipped:

- Template designer: text, QR, logo, signature, seal, line, shape, watermark, table; drag/resize; RTL; print preview HTML
- PDF/HTML canvas renderer with Vazirmatn `@font-face`, embedded images, watermark and table
- Bulk: validate with row errors, preview, issue, ZIP download of issued files
- Onboarding wizard (org, logo, template) + `/app/onboarding` gate for owner/admin
- Issue wizard: dates (Jalali), expiry modes, custom fields, send email
- Branding logo upload (`logo_file` + `logo_url`)

API:

- `GET /api/templates/{id}/`
- `GET /api/templates/{id}/preview/`
- `POST /api/bulk-issue/` steps: `upload` | `validate` | `issue`
- `GET /api/batches/{id}/zip/`
- `POST /api/attachments/upload/`
- `GET /api/attachments/{id}/file/`
- `POST /api/org/complete-onboarding/`
- `GET|PATCH /api/branding/` includes `logo_file`, `logo_url`

ZIP and certificate email still need a Celery worker in production.
