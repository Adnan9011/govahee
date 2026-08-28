# Phase 2–4 — Certificate core, PDF, bulk

Shipped:

- Certificate types, templates with **versioning**
- Issue wizard, certificate list/detail, revoke
- High-entropy `verification_token`, QR encodes only verification URL
- Public `/verify/{token}` + number search
- Integrity hash (SHA-256 of canonical fields)
- WeasyPrint PDF from canvas JSON (fallback `PDF_PROVIDER=html` in tests)
- Bulk CSV/Excel upload → column map → Celery batch
- Email send via `EmailProvider` abstraction
- Legal pages stating the platform does not confer legal validity

API:

- `POST /api/certificates/issue/`
- `GET /api/verify/<token>/`
- `POST /api/bulk-issue/`
- `GET /api/certificates/<id>/pdf/`
