# Deployment

## Vercel Projects

Target project mapping:

- `scoutlink-web`
  - Root directory: `apps/scoutlink-web`
  - Production branch: `main`
  - Build command: none unless Vercel requires an explicit static build setting
  - Output directory: project root
- `stratex-web`
  - Root directory: `apps/stratex-web`
  - Production branch: `main`
  - Build command: none unless Vercel requires an explicit static build setting
  - Output directory: project root
- `scoutlink-api`
  - Root directory: `backend`
  - Runtime: Node/Express through Vercel Functions

## Safe Rollout Order

1. Deploy `scoutlink-web` preview from `apps/scoutlink-web`.
2. Verify ScoutLink public and authenticated routes on the preview.
3. Attach `www.scoutlink.app` and `scoutlink.app` only after preview verification.
4. Deploy `stratex-web` preview from `apps/stratex-web`.
5. Verify Stratex public and admin routes on the preview.
6. Attach `www.stratexanalytics.co.uk` and `stratexanalytics.co.uk` only after
   preview verification.
7. Move the API service only after both web projects are stable.
8. Delete legacy root and mirror fallbacks only after production domains are
   confirmed on the dedicated web projects.

## Do Not Do

- Do not delete root clean-route wrappers during web project setup.
- Do not delete `frontend` or `backend/frontend` during web project setup.
- Do not repoint production domains without a working preview URL.
- Do not expose Supabase service-role or SendGrid secrets to either web app.
