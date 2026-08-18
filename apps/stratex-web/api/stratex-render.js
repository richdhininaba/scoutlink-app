'use strict';

const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const SITE = 'https://www.stratexanalytics.co.uk';
const OG_IMAGE = SITE + '/images/og/stratex-og.png';

const ABOUT_PARAGRAPHS = [
  'Stratex Analytics builds professional technology for non professional grassroots players, coaches and organisations. We create products that give grassroots football access to tools, structure and visibility that are usually only available in academy or professional environments.',
  'Our work is focused on improving player development and creating clearer pathways for talent to be seen by scouts, agents and decision makers. We build tools that help coaches properly understand, track and support their players, while giving serious grassroots players stronger ways to showcase who they are, how they play and what they could become.',
  'Stratex was created by a team that understands the reality of non professional grassroots football: limited resources, limited exposure, and too many players relying on chance. We exist to help grassroots football leverage better technology, better data and better visibility, so talent is not held back by the level it starts at.'
];

const TRUST_PARAGRAPHS = [
  'ScoutLink works with grassroots players, so safeguarding, access and data controls are part of how the platform is built.',
  'From coach verification to player information and account access, the platform is designed to make sure young players can be represented properly, while keeping responsibility, protection and trust at the centre of the experience.'
];

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizePath(value) {
  let route = String(value || '/').split('?')[0].trim();
  if (!route.startsWith('/')) route = '/' + route;
  return route.replace(/\/+$/, '') || '/';
}

function publicPathFromRequest(req) {
  const queryPath = req.query && req.query.path;
  const candidate = Array.isArray(queryPath) ? queryPath[0] : queryPath;
  if (candidate) return normalizePath(candidate);
  const parsed = new URL(req.url || '/', 'https://stratex-render.local');
  return normalizePath(parsed.searchParams.get('path') || parsed.pathname || '/');
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
  if (!bundlePath) {
    throw new Error('Missing Stratex bundle file: ' + segments.join('/'));
  }
  return fs.readFileSync(bundlePath, 'utf8');
}

function siteHeader(activePath) {
  const links = [
    ['/scoutlink', 'ScoutLink'],
    ['/about', 'About'],
    ['/leadership', 'Leadership'],
    ['/trust', 'Trust'],
    ['/learning-centre', 'Learning'],
    ['/careers', 'Careers'],
    ['/contact', 'Contact']
  ];

  return (
    '<header class="s-nav">' +
      '<a class="s-logo-link" href="/" aria-label="Stratex Analytics home">' +
        '<span class="s-logoimg" role="img" aria-label="Stratex Analytics"></span>' +
      '</a>' +
      '<nav aria-label="Main navigation">' +
        links.map(([href, label]) =>
          '<a href="' + href + '"' + (activePath === href ? ' class="on"' : '') + '>' + label + '</a>'
        ).join('') +
      '</nav>' +
      '<div class="s-nav-r">' +
        '<a class="s-tel" href="tel:+442071640181">020 7164 0181</a>' +
        '<a class="s-sign" href="https://www.scoutlink.app/login">Sign in</a>' +
        '<a class="s-tel-ic" href="tel:+442071640181" aria-label="Call Stratex">☎</a>' +
        '<button class="s-menu-button" type="button" data-stratex-menu-button aria-expanded="false" aria-label="Open navigation"><i></i><i></i><i></i></button>' +
      '</div>' +
    '</header>' +
    '<div class="s-mobile-menu" data-stratex-menu-panel aria-hidden="true">' +
      '<nav aria-label="Mobile navigation">' +
        links.map(([href, label]) => '<a href="' + href + '">' + label + '</a>').join('') +
        '<a href="https://www.scoutlink.app/login">Sign in</a>' +
      '</nav>' +
    '</div>'
  );
}

function siteFooter() {
  return (
    '<footer class="s-foot"><div class="s-foot-grid">' +
      '<div>' +
        '<a href="/" aria-label="Stratex Analytics home"><span class="s-logoimg w big" role="img" aria-label="Stratex Analytics"></span></a>' +
        '<p class="s-foot-strap">Data, technology and responsible football visibility for overlooked grassroots talent.</p>' +
        '<a class="contact" href="tel:+442071640181">020 7164 0181</a>' +
        '<a class="contact" href="mailto:people@stratexanalytics.co.uk">people@stratexanalytics.co.uk</a>' +
      '</div>' +
      '<div><h5>Company</h5><a href="/about">About</a><a href="/leadership">Leadership</a><a href="/careers">Careers</a><a href="/contact">Contact</a></div>' +
      '<div><h5>ScoutLink</h5><a href="/scoutlink">Product</a><a href="https://www.scoutlink.app/demo">Demo</a><a href="https://www.scoutlink.app/register/coach">Coach registration</a><a href="https://www.scoutlink.app/register/scout">Scout registration</a></div>' +
      '<div><h5>Trust &amp; legal</h5><a href="/trust">Trust</a><a href="/privacy-policy">Privacy</a><a href="/terms">Terms</a><a href="/cookie-policy">Cookies</a><a href="/security">Security</a><a href="/accessibility">Accessibility</a></div>' +
    '</div></footer>'
  );
}

function awardCeremoniesPage() {
  return {
    title: 'Stratex Football Honours and Award Ceremonies',
    description: 'Explore public Stratex award ceremonies celebrating grassroots football players, coaches and community impact.',
    html:
      '<div class="site">' +
        siteHeader('/award-ceremonies') +
        '<main>' +
          '<section class="s-hero" style="padding-bottom:76px">' +
            '<div class="s-lines"></div><div class="s-shade"></div>' +
            '<div class="s-hero-in">' +
              '<span class="s-eb">Stratex Football Honours</span>' +
              '<h1 class="s-h1">Recognising the people moving grassroots football forward.</h1>' +
              '<p class="s-sub">Public ceremonies, dates, locations and award categories are published directly from the secure Stratex Admin Centre.</p>' +
              '<div class="s-cta-row"><a class="s-btn volt" href="/scoutlink">Explore ScoutLink</a><a class="s-btn ghost" href="/contact">Contact the team</a></div>' +
            '</div>' +
          '</section>' +
          '<section class="s-sec">' +
            '<span class="s-eb dk">Published by Stratex Admin</span>' +
            '<h2 class="s-h2">Award ceremonies</h2>' +
            '<p class="s-kick">Draft and planning records remain private. Ceremonies only appear here once the Stratex team publishes them.</p>' +
            '<div id="stratexAwardsList" class="s-grid3" style="margin-top:22px">' +
              '<div class="s-empty"><b>Loading award ceremonies…</b><p>Published ceremonies will appear here.</p></div>' +
            '</div>' +
          '</section>' +
        '</main>' +
        siteFooter() +
      '</div>'
  };
}

function removeDashCharactersFromVisibleText(html) {
  return String(html || '')
    .split(/(<[^>]+>)/g)
    .map(part => {
      if (!part || part.charAt(0) === '<') return part;
      return part
        .replace(/[—–-]+/g, ' ')
        .replace(/[ \t]{2,}/g, ' ');
    })
    .join('');
}

function replaceLeadershipEmail(html, personName, emailAddress) {
  const escapedName = personName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    '(<h3>' + escapedName + '<\\/h3>[\\s\\S]*?<div class="acts"><a class="s-btn line sm" href="mailto:)[^"]+',
    'i'
  );
  return html.replace(pattern, '$1' + emailAddress);
}

function applyAboutOverride(page) {
  let html = String(page.html || '');

  html = html.replace(
    /<h1 class="s-h1">[\s\S]*?<\/h1>/i,
    '<h1 class="s-h1">STRATEX STARTED ON TOUCHLINES FROM <span class="accent">GRASSROOTS FOOTBALL PROFESSIONALS.</span></h1>'
  );

  html = html.replace(
    /<p class="s-sub">[\s\S]*?<\/p>/i,
    '<p class="s-sub">Stratex Analytics builds professional technology for non professional grassroots players, coaches and organisations.</p>'
  );

  const storyCopy = ABOUT_PARAGRAPHS.map((paragraph, index) => {
    const margin = index < ABOUT_PARAGRAPHS.length - 1 ? 'margin-bottom:12px' : '';
    const style = 'font-size:12.8px;line-height:1.75' + (margin ? ';' + margin : '');
    return '<p style="' + style + '">' + paragraph + '</p>';
  }).join('\n');

  html = html.replace(
    /(<span class="s-eb dk">The actual story<\/span>)[\s\S]*?(?=<\/div>\s*<div>\s*<p class="s-quote">)/i,
    '$1\n' + storyCopy + '\n'
  );

  /*
   * This is deliberately applied to visible text only. It removes the dash
   * heavy editorial punctuation the About page previously used without
   * touching hrefs, file names, CSS classes or other HTML attributes.
   */
  html = removeDashCharactersFromVisibleText(html);

  return {
    ...page,
    description: 'Stratex Analytics builds professional technology for grassroots players, coaches and organisations, improving development, visibility and pathways into football.',
    html
  };
}

function applyLeadershipOverride(page) {
  let html = String(page.html || '');

  html = replaceLeadershipEmail(
    html,
    'Richdhin Inaba',
    'richdhin@stratexanalytics.co.uk'
  );

  html = replaceLeadershipEmail(
    html,
    'Lucy Ali',
    'lucy.ali@stratexanalytics.co.uk'
  );

  html = replaceLeadershipEmail(
    html,
    'Alexandro Ilioaie',
    'alexandro.ilioaie@stratexanalytics.co.uk'
  );

  return {
    ...page,
    html
  };
}

function applyTrustOverride(page) {
  let html = String(page.html || '');

  html = html.replace(
    /<h1 class="s-h1 s-fluid-title">[\s\S]*?<\/h1>/i,
    '<h1 class="s-h1 s-fluid-title">Built with young players in mind.</h1>'
  );

  html = html.replace(
    /<p class="s-sub">[\s\S]*?<\/p>/i,
    '<div class="s-sub">' +
      '<p style="margin:0 0 12px">' + TRUST_PARAGRAPHS[0] + '</p>' +
      '<p style="margin:0">' + TRUST_PARAGRAPHS[1] + '</p>' +
    '</div>'
  );

  return {
    ...page,
    description: 'ScoutLink is built with young players in mind, with safeguarding, access, data controls and responsible representation at the centre of the platform.',
    html
  };
}

function applyEditorialOverrides(page, routeKey) {
  if (!page || !routeKey) return page;

  if (routeKey === '/about') {
    return applyAboutOverride(page);
  }

  if (routeKey === '/leadership') {
    return applyLeadershipOverride(page);
  }

  if (routeKey === '/trust') {
    return applyTrustOverride(page);
  }

  return page;
}

function schemaFor(page, canonical) {
  const pieces = canonical.replace(SITE, '').split('/').filter(Boolean);
  const items = [{ '@type':'ListItem', position:1, name:'Home', item:SITE + '/' }];

  pieces.forEach((piece, index) => {
    items.push({
      '@type':'ListItem',
      position:index + 2,
      name:piece.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      item:SITE + '/' + pieces.slice(0, index + 1).join('/')
    });
  });

  return {
    '@context':'https://schema.org',
    '@graph':[
      {
        '@type':'Organization',
        '@id':SITE + '/#organization',
        name:'Stratex Analytics',
        legalName:'Stratex Analytics Limited',
        url:SITE + '/',
        image:OG_IMAGE,
        sameAs:['https://www.scoutlink.app']
      },
      {
        '@type':'WebPage',
        '@id':canonical + '#webpage',
        url:canonical,
        name:page.title,
        description:page.description,
        isPartOf:{ '@type':'WebSite', '@id':SITE + '/#website', name:'Stratex Analytics', url:SITE + '/' },
        publisher:{ '@id':SITE + '/#organization' },
        breadcrumb:{ '@type':'BreadcrumbList', itemListElement:items }
      }
    ]
  };
}

function readStore() {
  const raw = readBundleFile('assets', 'stratex-public-v5-pages.json');
  const store = JSON.parse(raw);
  if (!store || typeof store !== 'object' || !store.pages || typeof store.pages !== 'object') {
    throw new Error('Invalid Stratex public page bundle.');
  }
  return store;
}

module.exports = function handler(req, res) {
  try {
    const shellPath = findBundlePath('pages', 'stratex-public-v5.html');
    const contentPath = findBundlePath('assets', 'stratex-public-v5-pages.json');

    if (!shellPath || !contentPath) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('The Stratex public website bundle is missing.');
      return;
    }

    const route = resolveRoute(req);
    const store = readStore();

    let page = route.key === '/award-ceremonies'
      ? awardCeremoniesPage()
      : store.pages[route.key];

    if (!page) {
      const notFoundPath = findBundlePath('pages', '404.html');
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(notFoundPath ? fs.readFileSync(notFoundPath, 'utf8') : 'Not found');
      return;
    }

    page = applyEditorialOverrides(page, route.key);

    let html = readBundleFile('pages', 'stratex-public-v5.html');
    const canonical = SITE + (route.canonicalPath === '/' ? '/' : route.canonicalPath);
    const schema = JSON.stringify(schemaFor(page, canonical)).replace(/</g, '\\u003c');

    html = html.replace(/<title>[\s\S]*?<\/title>/i, '<title>' + esc(page.title) + '</title>');
    html = html.replace(/<meta name="description" content="[^"]*">/i, '<meta name="description" content="' + esc(page.description) + '">');
    html = html.replace(/<link rel="canonical" href="[^"]*">/i, '<link rel="canonical" href="' + esc(canonical) + '">');
    html = html.replace(/<meta property="og:title" content="[^"]*">/i, '<meta property="og:title" content="' + esc(page.title) + '">');
    html = html.replace(/<meta property="og:description" content="[^"]*">/i, '<meta property="og:description" content="' + esc(page.description) + '">');
    html = html.replace(/<meta property="og:url" content="[^"]*">/i, '<meta property="og:url" content="' + esc(canonical) + '">');
    html = html.replace(/<meta name="twitter:title" content="[^"]*">/i, '<meta name="twitter:title" content="' + esc(page.title) + '">');
    html = html.replace(/<meta name="twitter:description" content="[^"]*">/i, '<meta name="twitter:description" content="' + esc(page.description) + '">');
    html = html.replace(
      /<script type="application\/ld\+json" id="stratexJsonLd">[\s\S]*?<\/script>/i,
      '<script type="application/ld+json" id="stratexJsonLd">' + schema + '</script>'
    );
    html = html.replace(
      '<div id="stratexPublicRoot" aria-live="polite"></div>',
      '<div id="stratexPublicRoot" aria-live="polite" data-server-rendered="true">' + page.html + '</div>'
    );

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
    res.setHeader('X-Stratex-Public-Renderer', 'v5-ssr');
    res.end(html);
  } catch (error) {
    console.error('[stratex-render]', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(
      '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Stratex Analytics</title></head><body><main style="padding:32px;font-family:Arial,sans-serif">' +
      '<h1>Stratex Analytics</h1><p>The public website could not be loaded. Please try again.</p>' +
      '<p><a href="/contact">Contact Stratex</a></p></main></body></html>'
    );
  }
};
