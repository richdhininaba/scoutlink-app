# Architecture

## Current Shape

The repository is a monorepo with two standalone static web apps and one shared
API service.

- `apps/scoutlink-web` serves ScoutLink public pages plus the Coach, Scout and
  Player frontends.
- `apps/stratex-web` serves Stratex Analytics public pages plus the Stratex Admin
  Centre, careers and showcase pages.
- `backend` serves the API-only Node/Express backend.
- `database` remains the single source for Supabase schema and migrations.

## Boundary Rules

- Web apps must not depend on the root `frontend` directory at runtime.
- Static assets needed by a web app live inside that app folder.
- API, Supabase, SendGrid and privileged server logic stay in `backend`.
- Legacy root and mirrored frontend files have been removed and should not be
  reintroduced.

## Future Target

The API can later move from `backend` to `services/scoutlink-api`, but only after
the Vercel project root directory is updated and verified. That move should be a
separate reversible change.
