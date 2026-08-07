'use strict';

const fs = require('fs');
const path = require('path');

const SITE = 'https://www.stratexanalytics.co.uk';
const STATIC_PUBLIC_ROUTES = [
  '/',
  '/scoutlink',
  '/about',
  '/leadership',
  '/trust',
  '/careers',
  '/learning-centre',
  '/contact',
  '/report-a-concern',
  '/privacy-policy',
  '/terms',
  '/cookie-policy',
  '/security',
  '/accessibility',
  '/showcase-event'
];

function renderSitemapXml(routes) {
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    routes.map((route) => `  <url><loc>${SITE}${route}</loc></url>`).join('\n') +
    '\n</urlset>\n';
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

function getBundledRoutes() {
  const contentPath = findBundlePath('assets', 'stratex-public-v4-pages.json');
  if (!contentPath) return STATIC_PUBLIC_ROUTES.slice();

  const store = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
  const pageKeys = Object.keys(store.pages || {})
    .filter((route) => !route.includes('{'))
    .filter((route) => route !== '/award-ceremonies');

  return pageKeys.length ? pageKeys : STATIC_PUBLIC_ROUTES.slice();
}

async function fetchSupabaseRows(table, query) {
  const url = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || typeof fetch !== 'function') return [];

  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/${table}?${query}`, {
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        accept: 'application/json'
      }
    });
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('[Stratex sitemap]', error);
    return [];
  }
}

module.exports = async function handler(req, res) {
  const routes = getBundledRoutes();

  const [posts, jobs] = await Promise.all([
    fetchSupabaseRows(
      'stratex_learning_posts',
      'select=slug&status=eq.published&index_when_published=eq.true'
    ),
    fetchSupabaseRows(
      'job_posts',
      'select=slug,status&status=in.(published,open,live)'
    )
  ]);

  posts.forEach((post) => {
    if (post && post.slug) routes.push(`/learning-centre/${encodeURIComponent(post.slug)}`);
  });
  jobs.forEach((job) => {
    if (job && job.slug) routes.push(`/careers/${encodeURIComponent(job.slug)}`);
  });

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.end(renderSitemapXml(Array.from(new Set(routes))));
};
