'use strict';

const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const SITE = 'https://www.stratexanalytics.co.uk';
const OG_IMAGE = SITE + '/images/og/stratex-og.png';

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function publicPathFromRequest(req) {
  const queryPath = req.query && req.query.path;
  const candidate = Array.isArray(queryPath) ? queryPath[0] : queryPath;
  if (candidate) return normalizePath(candidate);

  const parsed = new URL(req.url || '/', 'https://stratex-render.local');
  return normalizePath(parsed.searchParams.get('path') || parsed.pathname || '/');
}

function normalizePath(value) {
  let route = String(value || '/').split('?')[0].trim();
  if (!route.startsWith('/')) route = '/' + route;
  route = route.replace(/\/+$/, '') || '/';
  return route;
}

function resolveRoute(req) {
  const requestPath = publicPathFromRequest(req);
  if (/^\/careers\/[^/]+/.test(requestPath)) {
    return { key: '/careers/{job-slug}', canonicalPath: requestPath };
  }
  if (/^\/learning-centre\/[^/]+/.test(requestPath)) {
    return { key: '/learning-centre/{article-slug}', canonicalPath: requestPath };
  }
  return { key: requestPath, canonicalPath: requestPath };
}

function replaceTag(html, expression, replacement) {
  return html.replace(expression, replacement);
}

function schemaFor(page, canonical) {
  const pieces = canonical.replace(SITE, '').split('/').filter(Boolean);
  const items = [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' }];

  pieces.forEach((piece, index) => {
    const current = '/' + pieces.slice(0, index + 1).join('/');
    items.push({
      '@type': 'ListItem',
      position: index + 2,
      name: piece.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      item: SITE + current
    });
  });

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': SITE + '/#organization',
        name: 'Stratex Analytics',
        legalName: 'Stratex Analytics Limited',
        url: SITE + '/',
        image: OG_IMAGE,
        sameAs: ['https://www.scoutlink.app']
      },
      {
        '@type': 'WebPage',
        '@id': canonical + '#webpage',
        url: canonical,
        name: page.title,
        description: page.description,
        isPartOf: {
          '@type': 'WebSite',
          '@id': SITE + '/#website',
          name: 'Stratex Analytics',
          url: SITE + '/'
        },
        publisher: { '@id': SITE + '/#organization' },
        breadcrumb: { '@type': 'BreadcrumbList', itemListElement: items }
      }
    ]
  };
}

function findBundlePath(...segments) {
  const bases = [
    process.cwd(),
    path.join(__dirname, '..'),
    path.join(process.cwd(), 'apps', 'stratex-web'),
    path.join(__dirname, '..', '..', 'apps', 'stratex-web')
  ];

  for (const base of bases) {
    const candidate = path.join(base, ...segments);
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

function readBundleFile(...segments) {
  const bundlePath = findBundlePath(...segments);
  if (!bundlePath) throw new Error('Missing Stratex bundle file: ' + segments.join('/'));
  return fs.readFileSync(bundlePath, 'utf8');
}

module.exports = function handler(req, res) {
  const shellPath = findBundlePath('pages', 'stratex-public-v4.html');
  const contentPath = findBundlePath('assets', 'stratex-public-v4-pages.json');

  if (!fs.existsSync(shellPath) || !fs.existsSync(contentPath)) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('The Stratex public website bundle is missing.');
    return;
  }

  const route = resolveRoute(req);
  const store = JSON.parse(readBundleFile('assets', 'stratex-public-v4-pages.json'));
  const page = store.pages && store.pages[route.key];

  if (!page) {
    const notFoundPath = findBundlePath('pages', '404.html');
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(notFoundPath ? fs.readFileSync(notFoundPath, 'utf8') : 'Not found');
    return;
  }

  let html = readBundleFile('pages', 'stratex-public-v4.html');
  const canonical = SITE + (route.canonicalPath === '/' ? '/' : route.canonicalPath);
  const schema = JSON.stringify(schemaFor(page, canonical)).replace(/</g, '\\u003c');

  html = replaceTag(html, /<title>[\s\S]*?<\/title>/i, '<title>' + esc(page.title) + '</title>');
  html = replaceTag(html, /<meta name="description" content="[^"]*">/i, '<meta name="description" content="' + esc(page.description) + '">');
  html = replaceTag(html, /<link rel="canonical" href="[^"]*">/i, '<link rel="canonical" href="' + esc(canonical) + '">');
  html = replaceTag(html, /<meta property="og:title" content="[^"]*">/i, '<meta property="og:title" content="' + esc(page.title) + '">');
  html = replaceTag(html, /<meta property="og:description" content="[^"]*">/i, '<meta property="og:description" content="' + esc(page.description) + '">');
  html = replaceTag(html, /<meta property="og:url" content="[^"]*">/i, '<meta property="og:url" content="' + esc(canonical) + '">');
  html = replaceTag(html, /<meta name="twitter:title" content="[^"]*">/i, '<meta name="twitter:title" content="' + esc(page.title) + '">');
  html = replaceTag(html, /<meta name="twitter:description" content="[^"]*">/i, '<meta name="twitter:description" content="' + esc(page.description) + '">');
  html = replaceTag(
    html,
    /<script type="application\/ld\+json" id="stratexJsonLd">[\s\S]*?<\/script>/i,
    '<script type="application/ld+json" id="stratexJsonLd">' + schema + '</script>'
  );
  html = html.replace(
    '<div id="stratexPublicRoot" aria-live="polite"></div>',
    '<div id="stratexPublicRoot" aria-live="polite" data-server-rendered="true">' + page.html + '</div>'
  );

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');
  res.end(html);
};
