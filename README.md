# Stratex Platform

This repository contains the ScoutLink product, the Stratex Analytics public and
admin web experience, the shared ScoutLink API, and Supabase database history.

## Structure

- `apps/scoutlink-web` - standalone ScoutLink web app for public pages and
  logged-in Coach, Scout and Player routes.
- `apps/stratex-web` - standalone Stratex Analytics web app for public company,
  admin, careers and showcase routes.
- `backend` - current Node/Express API service.
- `database` - Supabase schema and ordered migrations.
- `docs` - architecture, deployment, domain and repository notes.

Legacy root pages, `frontend/`, `backend/frontend/`, and the mixed root
`vercel.json` are still intentionally retained as production fallbacks. Do not
delete them until the dedicated web Vercel projects and domains are proven live.

## Deployment Targets

- `scoutlink-web` uses root directory `apps/scoutlink-web`.
- `stratex-web` uses root directory `apps/stratex-web`.
- `scoutlink-api` currently uses root directory `backend`.

See [docs/deployment.md](docs/deployment.md) and
[docs/domains.md](docs/domains.md) before changing project roots or domains.
