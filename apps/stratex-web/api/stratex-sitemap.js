'use strict';

const fs = require('fs');
const path = require('path');

const SITE = 'https://www.stratexanalytics.co.uk';

const STATIC_LASTMOD_OVERRIDES = {
  '/about': '2026-08-18',
  '/leadership': '2026-08-18',
  '/trust': '2026-08-18'
};

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

function xml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function dateValue(value) {
  if (!value) return '';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  return parsed.toISOString();
}

function latestDate(...values) {
  const valid = values
    .map(value => {
      const date = value ? new Date(value) : null;
      return date && !Number.isNaN(date.getTime()) ? date : null;
    })
    .filter(Boolean);

  if (!valid.length) return '';

  return new Date(
    Math.max(...valid.map(value => value.getTime()))
  ).toISOString();
}

function bundleVersionDate(store) {
  const match = String(store && store.version || '')
    .match(/^(\d{4})(\d{2})(\d{2})/);

  if (!match) return '';

  return `${match[1]}-${match[2]}-${match[3]}`;
}

function visibleJob(job) {
  if (!job) return false;

  const now = Date.now();
  const status = String(job.status || '').toLowerCase();

  const released =
    status === 'live' ||
    (
      status === 'scheduled' &&
      job.release_at &&
      new Date(job.release_at).getTime() <= now
    );

  const notClosed =
    !job.closing_at ||
    new Date(job.closing_at).getTime() >= now;

  return released && notClosed;
}

function renderSitemapXml(entries) {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries.map(entry => {
      const lastmod = entry.lastmod
        ? `<lastmod>${xml(entry.lastmod)}</lastmod>`
        : '';

      return (
        '  <url>' +
          `<loc>${xml(SITE + entry.route)}</loc>` +
          lastmod +
        '</url>'
      );
    }).join('\n') +
    '\n</urlset>\n'
  );
}

async function fetchSupabaseRows(table, params) {
  const url =
    process.env.SUPABASE_URL ||
    process.env.SUPABASE_PROJECT_URL;

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key || typeof fetch !== 'function') {
    return [];
  }

  try {
    const query = new URLSearchParams(params || {});
    const response = await fetch(
      `${url.replace(/\/$/, '')}/rest/v1/${table}?${query.toString()}`,
      {
        headers: {
          apikey: key,
          authorization: `Bearer ${key}`,
          accept: 'application/json'
        }
      }
    );

    return response.ok ? await response.json() : [];
  } catch (_) {
    return [];
  }
}

function upsertEntry(map, route, lastmod) {
  if (!route || route.includes('{')) return;

  const existing = map.get(route);
  const nextLastmod = latestDate(
    existing && existing.lastmod,
    lastmod
  );

  map.set(route, {
    route,
    lastmod: nextLastmod || lastmod || ''
  });
}

module.exports = async function handler(req, res) {
  const contentPath =
    findBundlePath(
      'assets',
      'stratex-public-v5-pages.json'
    );

  const entries = new Map();
  let store = { pages: {} };
  let defaultStaticDate = '';

  if (contentPath) {
    try {
      store = JSON.parse(
        fs.readFileSync(contentPath, 'utf8')
      );

      defaultStaticDate =
        bundleVersionDate(store);

      Object.keys(store.pages || {})
        .filter(route => !route.includes('{'))
        .forEach(route => {
          upsertEntry(
            entries,
            route,
            STATIC_LASTMOD_OVERRIDES[route] ||
              defaultStaticDate
          );
        });
    } catch (_) {}
  }

  const [
    posts,
    jobs,
    showcaseEvents,
    awardCeremonies
  ] = await Promise.all([
    fetchSupabaseRows(
      'stratex_learning_posts',
      {
        select:
          'slug,status,index_when_published,' +
          'published_at,created_at,updated_at',
        status: 'eq.published',
        index_when_published: 'eq.true',
        order: 'published_at.desc.nullslast'
      }
    ),
    fetchSupabaseRows(
      'job_posts',
      {
        select:
          'slug,status,release_at,closing_at,' +
          'created_at,updated_at',
        status: 'in.(live,scheduled)',
        order: 'release_at.desc.nullslast'
      }
    ),
    fetchSupabaseRows(
      'showcase_events',
      {
        select:
          'public_visible,status,featured,event_date,' +
          'created_at,updated_at',
        public_visible: 'eq.true',
        order: 'event_date.desc.nullslast'
      }
    ),
    fetchSupabaseRows(
      'award_ceremonies',
      {
        select:
          'public_visible,status,event_date,' +
          'created_at,updated_at',
        public_visible: 'eq.true',
        status: 'in.(published,completed)',
        order: 'event_date.desc.nullslast'
      }
    )
  ]);

  posts.forEach(post => {
    if (!post || !post.slug) return;

    upsertEntry(
      entries,
      `/learning-centre/${encodeURIComponent(post.slug)}`,
      latestDate(
        post.updated_at,
        post.published_at,
        post.created_at
      )
    );
  });

  const visibleJobs = jobs.filter(visibleJob);

  visibleJobs.forEach(job => {
    if (!job || !job.slug) return;

    upsertEntry(
      entries,
      `/careers/${encodeURIComponent(job.slug)}`,
      latestDate(
        job.updated_at,
        job.release_at,
        job.created_at
      )
    );
  });

  if (entries.has('/learning-centre')) {
    upsertEntry(
      entries,
      '/learning-centre',
      latestDate(
        defaultStaticDate,
        ...posts.map(post =>
          post.updated_at ||
          post.published_at ||
          post.created_at
        )
      )
    );
  }

  if (entries.has('/careers')) {
    upsertEntry(
      entries,
      '/careers',
      latestDate(
        defaultStaticDate,
        ...visibleJobs.map(job =>
          job.updated_at ||
          job.release_at ||
          job.created_at
        )
      )
    );
  }

  if (entries.has('/showcase-event')) {
    upsertEntry(
      entries,
      '/showcase-event',
      latestDate(
        defaultStaticDate,
        ...showcaseEvents.map(event =>
          event.updated_at ||
          event.event_date ||
          event.created_at
        )
      )
    );
  }

  upsertEntry(
    entries,
    '/award-ceremonies',
    latestDate(
      defaultStaticDate,
      ...awardCeremonies.map(event =>
        event.updated_at ||
        event.event_date ||
        event.created_at
      )
    )
  );

  const output = Array.from(entries.values())
    .sort((a, b) =>
      a.route.localeCompare(b.route)
    )
    .map(entry => ({
      route: entry.route,
      lastmod:
        entry.lastmod &&
        /^\d{4}-\d{2}-\d{2}$/.test(entry.lastmod)
          ? entry.lastmod
          : dateValue(entry.lastmod)
    }));

  res.statusCode = 200;
  res.setHeader(
    'Content-Type',
    'application/xml; charset=utf-8'
  );
  res.setHeader(
    'Cache-Control',
    'public, max-age=300'
  );
  res.end(renderSitemapXml(output));
};
