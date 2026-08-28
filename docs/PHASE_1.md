# Phase 1 — Foundation

Shipped:

- Multi-tenant `Organization` + `OrganizationMembership` + RBAC
- JWT cookie auth (Nobita pattern) + env super-admin
- Dashboard API + SPA shell (MUI design system copied from Nobita)
- Platform admin org list / suspend / verification status
- Plans in DB (`billing.Plan.capabilities`) — limits not hardcoded in views
- Configurable brand via `PlatformSettings` / env

Database: see initial migrations after `manage.py makemigrations`.

Env: copy `.env.example`.

Known issues:

- Team invite UI is not finished (membership API exists).
- Payment start/callback is not wired to a checkout page yet (gateway clients are copied).
