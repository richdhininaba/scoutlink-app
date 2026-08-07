# Architecture

## Current Shape

The repository is a transitional monorepo with two standalone static web apps and
one shared API service.

- `apps/scoutlink-web` serves ScoutLink public pages plus the Coach, Scout and
  Player frontends.
- `apps/stratex-web` serves Stratex Analytics public pages plus the Stratex Admin
  Centre, careers and showcase pages.
- `backend` serves the Node/Express API and still contains a mirrored
  `backend/frontend` fallback while production domains are being moved.
- `database` remains the single source for Supabase schema and migrations.

## Boundary Rules

- Web apps must not depend on the root `frontend` directory at runtime.
- Static assets needed by a web app live inside that app folder.
- API, Supabase, SendGrid and privileged server logic stay in `backend`.
- Legacy root and mirrored frontend files remain until production traffic has
  been proven on the dedicated web projects.

## Future Target

After the two web projects are proven live, the API can be moved from `backend`
to `services/scoutlink-api`. That move should be a separate reversible change.
