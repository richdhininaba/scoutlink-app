# Domains

## Target Ownership

| Domain | Target Vercel project | Project root |
| --- | --- | --- |
| `www.scoutlink.app` | `scoutlink-web` | `apps/scoutlink-web` |
| `scoutlink.app` | `scoutlink-web` | `apps/scoutlink-web` |
| `www.stratexanalytics.co.uk` | `stratex-web` | `apps/stratex-web` |
| `stratexanalytics.co.uk` | `stratex-web` | `apps/stratex-web` |
| `scoutlink-api.vercel.app` | `scoutlink-api` | `backend` |

## Verification Required Before Domain Movement

- The preview deployment serves the expected app shell.
- All clean routes in that app resolve without relying on the root fallback.
- Static files load from the app-local `css`, `js`, `assets`, `images` and
  `data` folders.
- API calls still target the configured backend API.
- Existing production domains can be rolled back if any route fails.

## Current Fallback Policy

The repository still contains root GitHub Pages style routes and a mixed root
Vercel configuration. Those are fallback surfaces and must remain until both web
domains are confirmed on the dedicated projects.
