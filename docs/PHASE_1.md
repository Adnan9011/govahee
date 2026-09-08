# Phase 1 — Foundation

Shipped:

- Multi-tenant `Organization` + `OrganizationMembership` + RBAC
- JWT cookie auth (Nobita pattern) + env super-admin
- Dashboard API + SPA shell (MUI design system copied from Nobita)
- Platform admin org list / suspend / verification status
- Plans in DB (`billing.Plan.capabilities`) — limits not hardcoded in views
- Configurable brand via `PlatformSettings` / env

Database: see initial migrations after `manage.py makemigrations`.

Env: use local `.env` (gitignored).

Known issues:

- Custom domain routing is not implemented yet (field exists on Branding).
- Payment start/callback is wired; enable gateways via env or PlatformSettings.
