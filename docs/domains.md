# Domains

## Target Ownership

| Domain | Target Vercel project | Project root |
| --- | --- | --- |
| `www.scoutlink.app` | `scoutlink-web` | `apps/scoutlink-web` |
| `scoutlink.app` | `scoutlink-web` | `apps/scoutlink-web` |
| `www.stratexanalytics.co.uk` | `stratex-web` | `apps/stratex-web` |
| `stratexanalytics.co.uk` | `stratex-web` | `apps/stratex-web` |
| `scoutlink-api.vercel.app` | `scoutlink-api` | `backend` |

## Verification Required Before Domain Movement Or Root Changes

- The preview deployment serves the expected app shell.
- All clean routes in that app resolve without relying on the root fallback.
- Static files load from the app-local `css`, `js`, `assets`, `images` and
  `data` folders.
- API calls still target the configured backend API.
- Existing production domains can be rolled back if any route fails.

## Current Fallback Policy

There are no root GitHub Pages route wrappers, root static frontend mirrors, or
mixed root Vercel frontend config left in the repository. The public domains
should stay attached to the dedicated web projects listed above.

The `scoutlink-api` project remains rooted at `backend`. Moving it to a future
`services/scoutlink-api` folder is blocked until the Vercel project root
directory can be updated and verified.
