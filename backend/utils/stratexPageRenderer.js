'use strict';

const fs = require('fs');
const path = require('path');

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

function resolveRoute(req) {
  const requestPath = String(req.path || req.originalUrl || '/').split('?')[0].replace(/\/+$/, '') || '/';
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
  let current = '';
  pieces.forEach((piece, index) => {
    current += '/' + piece;
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
        isPartOf: { '@type': 'WebSite', '@id': SITE + '/#website', name: 'Stratex Analytics', url: SITE + '/' },
        publisher: { '@id': SITE + '/#organization' },
        breadcrumb: { '@type': 'BreadcrumbList', itemListElement: items }
      }
    ]
  };
}

function renderStratexPage(req, res, frontendDir) {
  const shellPath = path.join(frontendDir, 'pages', 'stratex-public-v4.html');
  const contentPath = path.join(frontendDir, 'assets', 'stratex-public-v4-pages.json');
  if (!fs.existsSync(shellPath) || !fs.existsSync(contentPath)) {
    return res.status(500).send('The Stratex public website bundle is missing.');
  }

  const route = resolveRoute(req);
  const store = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
  const page = store.pages && store.pages[route.key];

  if (!page) {
    return res.status(404).sendFile(path.join(frontendDir, 'pages', '404.html'));
  }

  let html = fs.readFileSync(shellPath, 'utf8');
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

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');
  return res.send(html);
}

module.exports = { renderStratexPage };
