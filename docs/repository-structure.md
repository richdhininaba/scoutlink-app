# Repository Structure

## App Folders

`apps/scoutlink-web` and `apps/stratex-web` are the intended frontend deployment
roots. Each app contains its own pages, route wrappers, static assets and
`vercel.json` routing file.

The current split intentionally mirrors some shared runtime files into both app
folders. This keeps the static apps deployable without introducing a build system
or shared package before there is a clear need.

## API Folder

`backend` remains the API deployment root for now. It owns:

- Express route registration.
- Supabase service-role writes.
- SendGrid server-side email sends.
- Storage and privileged backend workflows.

Do not move this folder to `services/scoutlink-api` until the web domains have
already been separated and verified.

## Legacy Fallbacks

These paths are intentionally still present:

- Root clean-route folders such as `coach`, `scout`, `admin`, `login` and
  `register`.
- `frontend`.
- `backend/frontend`.
- Root `vercel.json`.
- Root `CNAME` and GitHub Pages files.

They should be removed only in a later cleanup commit after production has moved
to the dedicated Vercel web projects.
