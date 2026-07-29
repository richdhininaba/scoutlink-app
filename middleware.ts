import { next } from '@vercel/functions';

const SCOUTLINK_HOSTS = new Set([
  'scoutlink.app',
  'www.scoutlink.app'
]);

const REMOVED_EXACT_PATHS = new Set([
  '/parents-players',
  '/parents-and-players',
  '/about',
  '/accessibility',
  '/leadership',
  '/trust',
  '/scout-verification',
  '/security',
  '/scoutlink',
  '/scoutlink/compatibility-score',
  '/scoutlink/scouts',
  '/scoutlink/coaches',
  '/grassroots-football-scouting-tools',
  '/compatibility-score',
  '/pricing',
  '/parent-guardian-notice',
  '/privacy-request',
  '/contact',
  '/applicant-privacy-notice',
  '/careers',
  '/careers/interview-availability',
  '/learning-centre',
  '/privacy',
  '/terms-of-use',
  '/cookies',
  '/company',
  '/showcase-event'
]);

export const config = {
  matcher: [
    '/parents-players',
    '/parents-and-players',
    '/about',
    '/accessibility',
    '/leadership',
    '/trust',
    '/scout-verification',
    '/security',
    '/scoutlink',
    '/scoutlink/:path*',
    '/grassroots-football-scouting-tools',
    '/compatibility-score',
    '/pricing',
    '/parent-guardian-notice',
    '/privacy-request',
    '/contact',
    '/applicant-privacy-notice',
    '/careers',
    '/careers/:path*',
    '/learning-centre',
    '/learning-centre/:path*',
    '/privacy',
    '/terms-of-use',
    '/cookies',
    '/company',
    '/company/:path*',
    '/showcase-event',
    '/showcase-event/:path*'
  ]
};

function normalisePath(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}

function isRemovedScoutLinkPath(pathname: string): boolean {
  if (pathname === '/scoutlink/pricing') return false;
  if (pathname === '/company/admin') return false;

  if (REMOVED_EXACT_PATHS.has(pathname)) return true;
  if (pathname.startsWith('/scoutlink/')) return true;
  if (pathname.startsWith('/careers/')) return true;
  if (pathname.startsWith('/learning-centre/')) return true;
  if (pathname.startsWith('/company/')) return true;
  if (pathname.startsWith('/showcase-event/')) return true;

  return false;
}

function notFoundPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>Page Not Found | ScoutLink</title>
  <style>
    :root {
      color-scheme: light;
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f2f5f6;
      color: #071525;
    }

    * {
      box-sizing: border-box;
    }

    body {
      min-height: 100vh;
      margin: 0;
      display: grid;
      place-items: center;
      padding: 24px;
      background:
        radial-gradient(circle at 80% 18%, rgba(8, 120, 92, 0.12), transparent 32%),
        #f2f5f6;
    }

    main {
      width: min(680px, 100%);
      padding: clamp(30px, 7vw, 62px);
      border: 1px solid #d8e1e7;
      background: #ffffff;
      box-shadow: 0 18px 50px rgba(7, 21, 37, 0.10);
    }

    .brand {
      display: inline-block;
      margin-bottom: 42px;
      color: #071525;
      font-size: 25px;
      font-weight: 950;
      letter-spacing: -1px;
      text-decoration: none;
    }

    .brand span {
      color: #08785c;
    }

    .eyebrow {
      display: block;
      color: #08785c;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    h1 {
      margin: 12px 0 0;
      font-size: clamp(36px, 8vw, 62px);
      line-height: 1;
      letter-spacing: -0.04em;
    }

    p {
      max-width: 520px;
      margin: 20px 0 0;
      color: #526678;
      font-size: 16px;
      line-height: 1.6;
    }

    nav {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #d8e1e7;
    }

    a.action {
      min-height: 44px;
      padding: 0 17px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #08785c;
      background: #08785c;
      color: #ffffff;
      font-size: 14px;
      font-weight: 900;
      text-decoration: none;
    }

    a.action.secondary {
      background: #ffffff;
      color: #08785c;
    }
  </style>
</head>
<body>
  <main>
    <a class="brand" href="/">Scout<span>Link</span></a>
    <span class="eyebrow">404 · Page removed</span>
    <h1>This page is no longer available.</h1>
    <p>The ScoutLink public website has been streamlined. Use one of the current pages below.</p>
    <nav aria-label="Current ScoutLink pages">
      <a class="action" href="/">ScoutLink home</a>
      <a class="action secondary" href="/coaches">For coaches</a>
      <a class="action secondary" href="/scouts">For scouts</a>
    </nav>
  </main>
</body>
</html>`;
}

export default function middleware(request: Request): Response {
  const url = new URL(request.url);
  const hostname = (
    request.headers.get('host') ||
    url.hostname
  ).split(':')[0].toLowerCase();

  if (!SCOUTLINK_HOSTS.has(hostname)) {
    return next();
  }

  const pathname = normalisePath(url.pathname);

  if (!isRemovedScoutLinkPath(pathname)) {
    return next();
  }

  return new Response(notFoundPage(), {
    status: 404,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store, max-age=0',
      'x-robots-tag': 'noindex, nofollow'
    }
  });
}
