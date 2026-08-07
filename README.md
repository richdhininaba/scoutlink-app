# Stratex Platform

This repository is the working platform monorepo for Stratex Analytics products.
It currently contains the ScoutLink product, the Stratex Analytics public/admin
web experience, the shared backend API, database migrations and operational
documentation.

## Applications

- `apps/scoutlink-web` - ScoutLink public website and logged-in Coach, Scout and
  Player frontend routes.
- `apps/stratex-web` - Stratex Analytics public website, Stratex Admin Centre,
  careers, showcase and company routes.

The legacy root static routes and `frontend/` mirrors are intentionally still in
place during this migration. They must not be deleted until the new app folders
have been verified in production and are the active Vercel project roots.

## Backend

- `backend` - Node/Express API used by ScoutLink and Stratex Admin workflows.

The backend is deliberately unchanged in the first web separation phase. A later
phase may rename it to `services/scoutlink-api` after the web projects and
production domains are stable.

## Database

- `database` - Supabase schema and ordered migrations.

Keep this folder at the repository root. Do not reorder or reorganise historical
migrations during the web app split.

## Production Services

Target long-term Vercel ownership:

- `scoutlink-web` -> `apps/scoutlink-web` -> `scoutlink.app` and
  `www.scoutlink.app`
- `stratex-web` -> `apps/stratex-web` -> `stratexanalytics.co.uk` and
  `www.stratexanalytics.co.uk`
- `scoutlink-api` -> `backend` -> API routes and backend services

The current production setup may still use the legacy mixed root while this
branch is reviewed. Move production domains only after each new app project has
been preview-tested.

## Branch Model

- `main` is the production branch.
- `agent/*`, `feature/*` and `chore/*` branches are preview/development work.
- Structural migrations should be reviewed on a branch before merging to `main`.

## Migration Safety Rules

- Do not combine repository transfer, Vercel project splitting, production-domain
  movement and legacy deletion in one change.
- Keep every phase reversible.
- Do not delete `frontend/`, `backend/frontend/`, root clean-route wrappers or the
  mixed root `vercel.json` until the new app projects are serving production.
- Do not create shared packages until there is a genuine build or runtime need.
