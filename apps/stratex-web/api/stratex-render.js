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
    return {
      key: '/careers/{job-slug}',
      canonicalPath: requestPath,
      slug: decodeURIComponent(requestPath.split('/').slice(2).join('/'))
    };
  }

  if (/^\/learning-centre\/[^/]+/.test(requestPath)) {
    return {
      key: '/learning-centre/{article-slug}',
      canonicalPath: requestPath,
      slug: decodeURIComponent(requestPath.split('/').slice(2).join('/'))
    };
  }

  return {
    key: requestPath,
    canonicalPath: requestPath,
    slug: ''
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

function cleanMetaText(value, max = 320) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function publicImage(value) {
  const raw = String(value || '').trim();

  if (!raw) return '';

  if (raw.charAt(0) === '/') {
    return SITE + raw;
  }

  if (/^https:\/\//i.test(raw)) {
    return raw;
  }

  return '';
}

function sameSiteCanonical(value, fallback) {
  const raw = String(value || '').trim();

  if (!raw) return fallback;

  try {
    const parsed = new URL(raw, SITE);

    if (
      parsed.protocol === 'https:' &&
      (
        parsed.hostname === 'www.stratexanalytics.co.uk' ||
        parsed.hostname === 'stratexanalytics.co.uk'
      )
    ) {
      parsed.protocol = 'https:';
      parsed.hostname = 'www.stratexanalytics.co.uk';
      parsed.hash = '';
      parsed.search = '';

      return parsed.toString().replace(/\/$/, '') ||
        SITE + '/';
    }
  } catch (_) {}

  return fallback;
}

function dateIso(value) {
  if (!value) return undefined;

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString();
}

function visibleJob(job) {
  if (!job) return false;

  const now = Date.now();
  const status =
    String(job.status || '').toLowerCase();

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

async function fetchSupabaseRows(table, params) {
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.SUPABASE_PROJECT_URL;

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !supabaseUrl ||
    !key ||
    typeof fetch !== 'function'
  ) {
    return [];
  }

  try {
    const query =
      new URLSearchParams(params || {});

    const response = await fetch(
      supabaseUrl.replace(/\/$/, '') +
        '/rest/v1/' +
        table +
        '?' +
        query.toString(),
      {
        headers: {
          apikey: key,
          authorization: 'Bearer ' + key,
          accept: 'application/json'
        }
      }
    );

    if (!response.ok) {
      return [];
    }

    const rows = await response.json();

    return Array.isArray(rows) ? rows : [];
  } catch (_) {
    return [];
  }
}

async function dynamicContext(route) {
  const context = {
    job: null,
    article: null,
    showcase: null,
    awards: []
  };

  if (
    route.key === '/careers/{job-slug}' &&
    route.slug
  ) {
    const jobs = await fetchSupabaseRows(
      'job_posts',
      {
        select: '*',
        slug: 'eq.' + route.slug,
        limit: '1'
      }
    );

    context.job =
      jobs[0] && visibleJob(jobs[0])
        ? jobs[0]
        : null;

    return context;
  }

  if (
    route.key === '/learning-centre/{article-slug}' &&
    route.slug
  ) {
    const posts = await fetchSupabaseRows(
      'stratex_learning_posts',
      {
        select:
          'id,slug,title,excerpt,body,category,status,' +
          'published_at,created_at,updated_at,' +
          'featured_image_url,image_alt,seo_title,' +
          'meta_description,canonical_url,index_when_published',
        slug: 'eq.' + route.slug,
        status: 'eq.published',
        limit: '1'
      }
    );

    context.article = posts[0] || null;

    return context;
  }

  if (route.key === '/showcase-event') {
    const events = await fetchSupabaseRows(
      'showcase_events',
      {
        select:
          'id,event_name,slug,event_date,venue_name,' +
          'venue_address,description,summary,status,' +
          'confirmed,public_visible,featured,' +
          'registration_deadline,player_min_age,' +
          'player_max_age,updated_at,created_at',
        public_visible: 'eq.true',
        order: 'featured.desc,event_date.asc',
        limit: '20'
      }
    );

    context.showcase =
      events.find(event => event.featured) ||
      events[0] ||
      null;

    return context;
  }

  if (route.key === '/award-ceremonies') {
    context.awards = await fetchSupabaseRows(
      'award_ceremonies',
      {
        select:
          'id,name,slug,event_date,location,status,' +
          'categories,audience,description,' +
          'hero_image_url,public_visible,' +
          'created_at,updated_at',
        public_visible: 'eq.true',
        status: 'in.(published,completed)',
        order: 'event_date.asc'
      }
    );
  }

  return context;
}

function applyDynamicMetadata(page, route, context) {
  const next = {
    ...page
  };

  if (
    route.key === '/careers/{job-slug}' &&
    context.job
  ) {
    const job = context.job;

    next.title =
      cleanMetaText(job.job_title, 120) +
      ' | Stratex Analytics Careers';

    next.description =
      cleanMetaText(
        job.role_overview ||
        job.about_company ||
        'View and apply for this Stratex Analytics role.',
        300
      );
  }

  if (
    route.key === '/learning-centre/{article-slug}' &&
    context.article
  ) {
    const article = context.article;

    next.title =
      cleanMetaText(
        article.seo_title ||
        (
          cleanMetaText(article.title, 120) +
          ' | Stratex Analytics'
        ),
        160
      );

    next.description =
      cleanMetaText(
        article.meta_description ||
        article.excerpt ||
        'Read practical football intelligence guidance from Stratex Analytics.',
        300
      );
  }

  return next;
}

function pageRobots(route, context) {
  if (
    route.key === '/learning-centre/{article-slug}' &&
    context.article &&
    context.article.index_when_published === false
  ) {
    return 'noindex,follow';
  }

  return (
    'index,follow,' +
    'max-image-preview:large,' +
    'max-snippet:-1,' +
    'max-video-preview:-1'
  );
}

function breadcrumbSchema(canonical) {
  const pieces =
    canonical.replace(SITE, '')
      .split('/')
      .filter(Boolean);

  const items = [
    {
      '@type':'ListItem',
      position:1,
      name:'Home',
      item:SITE + '/'
    }
  ];

  pieces.forEach((piece, index) => {
    items.push({
      '@type':'ListItem',
      position:index + 2,
      name:piece
        .split('-')
        .map(word =>
          word.charAt(0).toUpperCase() +
          word.slice(1)
        )
        .join(' '),
      item:
        SITE +
        '/' +
        pieces
          .slice(0, index + 1)
          .join('/')
    });
  });

  return {
    '@type':'BreadcrumbList',
    '@id':canonical + '#breadcrumb',
    itemListElement:items
  };
}

function organizationSchema() {
  return {
    '@type':'Organization',
    '@id':SITE + '/#organization',
    name:'Stratex Analytics',
    legalName:'Stratex Analytics Limited',
    url:SITE + '/',
    logo:SITE + '/images/redesign/stratex-header.png',
    image:OG_IMAGE,
    description:
      'UK football intelligence and sports technology company focused on grassroots player development, evidence, visibility and recruitment.',
    areaServed:{
      '@type':'Country',
      name:'United Kingdom'
    },
    contactPoint:{
      '@type':'ContactPoint',
      telephone:'+44 20 7164 0181',
      contactType:'customer support',
      availableLanguage:['English']
    },
    sameAs:[
      'https://www.scoutlink.app'
    ]
  };
}

function websiteSchema() {
  return {
    '@type':'WebSite',
    '@id':SITE + '/#website',
    url:SITE + '/',
    name:'Stratex Analytics',
    publisher:{
      '@id':SITE + '/#organization'
    }
  };
}

function webPageType(routeKey) {
  if (routeKey === '/about') {
    return 'AboutPage';
  }

  if (
    routeKey === '/contact' ||
    routeKey === '/report-a-concern'
  ) {
    return 'ContactPage';
  }

  if (
    routeKey === '/careers' ||
    routeKey === '/learning-centre' ||
    routeKey === '/award-ceremonies'
  ) {
    return 'CollectionPage';
  }

  return 'WebPage';
}

function leadershipPeople() {
  return [
    {
      '@type':'Person',
      '@id':SITE + '/leadership#richdhin-inaba',
      name:'Richdhin Inaba',
      jobTitle:'Founder & CEO',
      email:'mailto:richdhin@stratexanalytics.co.uk',
      description:
        'Founder and CEO responsible for company direction, product priorities and partnerships.',
      worksFor:{
        '@id':SITE + '/#organization'
      }
    },
    {
      '@type':'Person',
      '@id':SITE + '/leadership#lucy-ali',
      name:'Lucy Ali',
      jobTitle:
        'Director of Operations & Customer Success',
      email:'mailto:lucy.ali@stratexanalytics.co.uk',
      description:
        'Leads operations, customer success and customer relationships at Stratex Analytics.',
      worksFor:{
        '@id':SITE + '/#organization'
      }
    },
    {
      '@type':'Person',
      '@id':SITE + '/leadership#alexandro-ilioaie',
      name:'Alexandro Ilioaie',
      jobTitle:
        'Director of Football Strategy & Growth',
      email:
        'mailto:alexandro.ilioaie@stratexanalytics.co.uk',
      description:
        'Leads football strategy, growth, events and partnerships at Stratex Analytics.',
      worksFor:{
        '@id':SITE + '/#organization'
      }
    }
  ];
}

function scoutLinkServiceSchema(canonical, page) {
  return {
    '@type':'Service',
    '@id':canonical + '#service',
    name:'ScoutLink',
    url:canonical,
    serviceType:
      'Grassroots football intelligence and player discovery platform',
    description:page.description,
    provider:{
      '@id':SITE + '/#organization'
    },
    audience:[
      {
        '@type':'Audience',
        audienceType:'Grassroots football coaches'
      },
      {
        '@type':'Audience',
        audienceType:'Football scouts'
      },
      {
        '@type':'Audience',
        audienceType:'Football clubs and recruitment teams'
      }
    ],
    termsOfService:
      SITE + '/terms'
  };
}

function jobPostingSchema(job, canonical) {
  const schema = {
    '@type':'JobPosting',
    '@id':canonical + '#job',
    title:cleanMetaText(job.job_title, 160),
    description:cleanMetaText(
      job.role_overview ||
      job.about_company ||
      job.responsibilities,
      5000
    ),
    url:canonical,
    hiringOrganization:{
      '@id':SITE + '/#organization'
    },
    identifier:{
      '@type':'PropertyValue',
      name:'Stratex Analytics',
      value:String(job.id || job.slug || canonical)
    }
  };

  const posted =
    dateIso(job.release_at || job.created_at);

  const validThrough =
    dateIso(job.closing_at);

  if (posted) {
    schema.datePosted = posted;
  }

  if (validThrough) {
    schema.validThrough = validThrough;
  }

  if (job.employment_type) {
    schema.employmentType =
      cleanMetaText(job.employment_type, 100);
  }

  if (
    String(job.working_type || '')
      .toLowerCase() === 'remote'
  ) {
    schema.jobLocationType = 'TELECOMMUTE';
  } else if (job.location) {
    schema.jobLocation = {
      '@type':'Place',
      address:{
        '@type':'PostalAddress',
        addressLocality:
          cleanMetaText(job.location, 160),
        addressCountry:'GB'
      }
    };
  }

  return schema;
}

function articleSchema(article, canonical, page) {
  const image =
    publicImage(article.featured_image_url);

  const schema = {
    '@type':'BlogPosting',
    '@id':canonical + '#article',
    headline:
      cleanMetaText(article.title, 180),
    description:page.description,
    url:canonical,
    mainEntityOfPage:{
      '@id':canonical + '#webpage'
    },
    author:{
      '@id':SITE + '/#organization'
    },
    publisher:{
      '@id':SITE + '/#organization'
    }
  };

  const published =
    dateIso(article.published_at);

  const modified =
    dateIso(
      article.updated_at ||
      article.published_at
    );

  if (published) {
    schema.datePublished = published;
  }

  if (modified) {
    schema.dateModified = modified;
  }

  if (image) {
    schema.image = image;
  }

  if (article.category) {
    schema.articleSection =
      cleanMetaText(article.category, 120);
  }

  return schema;
}

function showcaseEventSchema(event, canonical) {
  if (!event) return null;

  const schema = {
    '@type':'Event',
    '@id':canonical + '#event',
    name:
      cleanMetaText(
        event.event_name ||
        'ScoutLink Showcase Event',
        180
      ),
    url:canonical,
    organizer:{
      '@id':SITE + '/#organization'
    },
    eventStatus:
      'https://schema.org/EventScheduled',
    audience:{
      '@type':'Audience',
      audienceType:
        'Grassroots football players, coaches and scouts'
    }
  };

  const startDate =
    dateIso(event.event_date);

  if (startDate) {
    schema.startDate = startDate;
  }

  if (
    event.venue_name ||
    event.venue_address
  ) {
    schema.location = {
      '@type':'Place',
      name:
        cleanMetaText(
          event.venue_name ||
          event.venue_address,
          180
        ),
      address:
        cleanMetaText(
          event.venue_address ||
          event.venue_name,
          300
        )
    };
  }

  const description =
    cleanMetaText(
      event.summary ||
      event.description,
      600
    );

  if (description) {
    schema.description = description;
  }

  return schema;
}

function awardEventSchemas(awards, canonical) {
  return (awards || [])
    .filter(Boolean)
    .map((award, index) => {
      const schema = {
        '@type':'Event',
        '@id':
          canonical +
          '#event-' +
          (
            award.slug ||
            award.id ||
            index + 1
          ),
        name:cleanMetaText(
          award.name ||
          'Stratex Football Honours',
          180
        ),
        url:canonical,
        organizer:{
          '@id':SITE + '/#organization'
        },
        eventStatus:
          award.status === 'cancelled'
            ? 'https://schema.org/EventCancelled'
            : 'https://schema.org/EventScheduled'
      };

      const date =
        dateIso(award.event_date);

      if (date) {
        schema.startDate = date;
      }

      if (award.location) {
        schema.location = {
          '@type':'Place',
          name:cleanMetaText(
            award.location,
            240
          )
        };
      }

      if (award.description) {
        schema.description =
          cleanMetaText(
            award.description,
            600
          );
      }

      return schema;
    });
}

function schemaFor(
  page,
  canonical,
  route,
  context
) {
  const graph = [
    organizationSchema(),
    websiteSchema(),
    breadcrumbSchema(canonical)
  ];

  graph.push({
    '@type':webPageType(route.key),
    '@id':canonical + '#webpage',
    url:canonical,
    name:page.title,
    description:page.description,
    isPartOf:{
      '@id':SITE + '/#website'
    },
    publisher:{
      '@id':SITE + '/#organization'
    },
    breadcrumb:{
      '@id':canonical + '#breadcrumb'
    }
  });

  if (route.key === '/scoutlink') {
    graph.push(
      scoutLinkServiceSchema(
        canonical,
        page
      )
    );
  }

  if (route.key === '/leadership') {
    graph.push(
      ...leadershipPeople()
    );
  }

  if (
    route.key === '/careers/{job-slug}' &&
    context.job
  ) {
    graph.push(
      jobPostingSchema(
        context.job,
        canonical
      )
    );
  }

  if (
    route.key === '/learning-centre/{article-slug}' &&
    context.article
  ) {
    graph.push(
      articleSchema(
        context.article,
        canonical,
        page
      )
    );
  }

  if (
    route.key === '/showcase-event' &&
    context.showcase
  ) {
    const event =
      showcaseEventSchema(
        context.showcase,
        canonical
      );

    if (event) {
      graph.push(event);
    }
  }

  if (route.key === '/award-ceremonies') {
    graph.push(
      ...awardEventSchemas(
        context.awards,
        canonical
      )
    );
  }

  return {
    '@context':'https://schema.org',
    '@graph':graph
  };
}

function readStore() {
  const raw =
    readBundleFile(
      'assets',
      'stratex-public-v5-pages.json'
    );

  const store =
    JSON.parse(raw);

  if (
    !store ||
    typeof store !== 'object' ||
    !store.pages ||
    typeof store.pages !== 'object'
  ) {
    throw new Error(
      'Invalid Stratex public page bundle.'
    );
  }

  return store;
}

function sendNotFound(res) {
  const notFoundPath =
    findBundlePath(
      'pages',
      '404.html'
    );

  res.statusCode = 404;
  res.setHeader(
    'Content-Type',
    'text/html; charset=utf-8'
  );
  res.setHeader(
    'Cache-Control',
    'no-store'
  );
  res.setHeader(
    'X-Robots-Tag',
    'noindex, nofollow'
  );
  res.end(
    notFoundPath
      ? fs.readFileSync(
          notFoundPath,
          'utf8'
        )
      : 'Not found'
  );
}

module.exports = async function handler(req, res) {
  try {
    const shellPath =
      findBundlePath(
        'pages',
        'stratex-public-v5.html'
      );

    const contentPath =
      findBundlePath(
        'assets',
        'stratex-public-v5-pages.json'
      );

    if (!shellPath || !contentPath) {
      res.statusCode = 500;
      res.setHeader(
        'Content-Type',
        'text/plain; charset=utf-8'
      );
      res.end(
        'The Stratex public website bundle is missing.'
      );
      return;
    }

    const route = resolveRoute(req);
    const store = readStore();

    let page =
      route.key === '/award-ceremonies'
        ? awardCeremoniesPage()
        : store.pages[route.key];

    if (!page) {
      sendNotFound(res);
      return;
    }

    const context =
      await dynamicContext(route);

    if (
      route.key === '/careers/{job-slug}' &&
      !context.job
    ) {
      sendNotFound(res);
      return;
    }

    if (
      route.key === '/learning-centre/{article-slug}' &&
      !context.article
    ) {
      sendNotFound(res);
      return;
    }

    page =
      applyEditorialOverrides(
        page,
        route.key
      );

    page =
      applyDynamicMetadata(
        page,
        route,
        context
      );

    let canonical =
      SITE +
      (
        route.canonicalPath === '/'
          ? '/'
          : route.canonicalPath
      );

    if (
      route.key === '/learning-centre/{article-slug}' &&
      context.article
    ) {
      canonical =
        sameSiteCanonical(
          context.article.canonical_url,
          canonical
        );
    }

    const robots =
      pageRobots(
        route,
        context
      );

    const schema =
      JSON.stringify(
        schemaFor(
          page,
          canonical,
          route,
          context
        )
      ).replace(
        /</g,
        '\\u003c'
      );

    let html =
      readBundleFile(
        'pages',
        'stratex-public-v5.html'
      );

    html = html.replace(
      /<title>[\s\S]*?<\/title>/i,
      '<title>' +
        esc(page.title) +
        '</title>'
    );

    html = html.replace(
      /<meta name="description" content="[^"]*">/i,
      '<meta name="description" content="' +
        esc(page.description) +
        '">'
    );

    html = html.replace(
      /<meta name="robots" content="[^"]*">/i,
      '<meta name="robots" content="' +
        esc(robots) +
        '">'
    );

    html = html.replace(
      /<link rel="canonical" href="[^"]*">/i,
      '<link rel="canonical" href="' +
        esc(canonical) +
        '">'
    );

    html = html.replace(
      /<meta property="og:title" content="[^"]*">/i,
      '<meta property="og:title" content="' +
        esc(page.title) +
        '">'
    );

    html = html.replace(
      /<meta property="og:description" content="[^"]*">/i,
      '<meta property="og:description" content="' +
        esc(page.description) +
        '">'
    );

    html = html.replace(
      /<meta property="og:url" content="[^"]*">/i,
      '<meta property="og:url" content="' +
        esc(canonical) +
        '">'
    );

    html = html.replace(
      /<meta name="twitter:title" content="[^"]*">/i,
      '<meta name="twitter:title" content="' +
        esc(page.title) +
        '">'
    );

    html = html.replace(
      /<meta name="twitter:description" content="[^"]*">/i,
      '<meta name="twitter:description" content="' +
        esc(page.description) +
        '">'
    );

    if (
      route.key === '/learning-centre/{article-slug}' &&
      context.article
    ) {
      const articleImage =
        publicImage(
          context.article.featured_image_url
        );

      if (articleImage) {
        html = html.replace(
          /<meta property="og:image" content="[^"]*">/i,
          '<meta property="og:image" content="' +
            esc(articleImage) +
            '">'
        );

        html = html.replace(
          /<meta name="twitter:image" content="[^"]*">/i,
          '<meta name="twitter:image" content="' +
            esc(articleImage) +
            '">'
        );
      }

      if (context.article.image_alt) {
        html = html.replace(
          /<meta property="og:image:alt" content="[^"]*">/i,
          '<meta property="og:image:alt" content="' +
            esc(
              cleanMetaText(
                context.article.image_alt,
                300
              )
            ) +
            '">'
        );
      }
    }

    html = html.replace(
      /<script type="application\/ld\+json" id="stratexJsonLd">[\s\S]*?<\/script>/i,
      '<script type="application/ld+json" id="stratexJsonLd">' +
        schema +
        '</script>'
    );

    html = html.replace(
      '<div id="stratexPublicRoot" aria-live="polite"></div>',
      '<div id="stratexPublicRoot" aria-live="polite" data-server-rendered="true">' +
        page.html +
        '</div>'
    );

    res.statusCode = 200;
    res.setHeader(
      'Content-Type',
      'text/html; charset=utf-8'
    );
    res.setHeader(
      'Cache-Control',
      'public, max-age=0, s-maxage=60, stale-while-revalidate=300'
    );
    res.setHeader(
      'X-Stratex-Public-Renderer',
      'v5-ssr'
    );
    res.setHeader(
      'X-Robots-Tag',
      robots.replace(/,/g, ', ')
    );
    res.end(html);
  } catch (error) {
    console.error(
      '[stratex-render]',
      error
    );

    res.statusCode = 500;
    res.setHeader(
      'Content-Type',
      'text/html; charset=utf-8'
    );
    res.setHeader(
      'Cache-Control',
      'no-store'
    );
    res.setHeader(
      'X-Robots-Tag',
      'noindex, nofollow'
    );
    res.end(
      '<!doctype html><html lang="en"><head>' +
      '<meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<meta name="robots" content="noindex,nofollow">' +
      '<title>Stratex Analytics</title></head>' +
      '<body><main style="padding:32px;font-family:Arial,sans-serif">' +
      '<h1>Stratex Analytics</h1>' +
      '<p>The public website could not be loaded. Please try again.</p>' +
      '<p><a href="/contact">Contact Stratex</a></p>' +
      '</main></body></html>'
    );
  }
};
