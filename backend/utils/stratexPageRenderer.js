'use strict';

const fs = require('fs');
const path = require('path');

const SITE = 'https://www.stratexanalytics.co.uk';

const leaders = [
  {
    name: 'Richdhin Inaba',
    title: 'Founder & CEO',
    chip: 'Founder / CEO',
    summary: 'Sets the vision, strategy and direction for Stratex Analytics and ScoutLink.',
    bio: 'Richdhin sets the vision, strategy and direction for Stratex Analytics and ScoutLink. He leads the company executive decisions, product direction and long-term growth.',
    email: 'richdhin@stratexanalytics.co.uk',
    linkedin: 'https://www.linkedin.com/in/richdhin-i-470a15109/',
    image: SITE + '/images/leadership/richdhin-inaba.svg',
    alt: 'Richdhin Inaba, Founder and CEO of Stratex Analytics'
  },
  {
    name: 'Lucy Ali',
    title: 'Director of Operations & Customer Success',
    chip: 'Operations / Customer Success',
    summary: 'Leads day-to-day operations, outreach delivery and customer management.',
    bio: 'Lucy leads the day-to-day operations of ScoutLink, including internal processes, outreach delivery, coach and scout relationships, customer management and event operations. She ensures the business runs smoothly as ScoutLink grows.',
    email: 'lucy.ali@stratexanalytics.co.uk',
    linkedin: 'https://www.linkedin.com/in/lucy-ali-654b79160/',
    image: SITE + '/images/leadership/lucy-ali.svg',
    alt: 'Lucy Ali, Director of Operations and Customer Success at Stratex Analytics'
  },
  {
    name: 'Alexandro Ilioaie',
    title: 'Director of Football Strategy & Growth',
    chip: 'Football Strategy / Growth',
    summary: 'Leads football strategy, growth initiatives and sporting direction.',
    bio: 'Alexandro leads ScoutLink football strategy, growth initiatives and sporting direction. He shapes showcase events, awards, partnerships and community ideas that help ScoutLink grow credibly within the football world.',
    email: 'alexandro.ilioaie@stratexanalytics.co.uk',
    linkedin: 'https://www.linkedin.com/in/alexandro-ilioaie-a0347025a/',
    image: SITE + '/images/leadership/alexandro-ilioaie.svg',
    alt: 'Alexandro Ilioaie, Director of Football Strategy and Growth at Stratex Analytics'
  }
];

const pages = {
  home: {
    path: '/',
    title: 'Stratex Analytics | Football Intelligence for Grassroots Talent',
    description: 'Stratex Analytics is the parent company behind ScoutLink, building safer football intelligence products for overlooked grassroots football talent.',
    kicker: 'Football intelligence for overlooked talent',
    h1: 'Building the intelligence layer for grassroots football.',
    body: 'Stratex Analytics creates data-led products that help coaches organise player evidence, help verified scouts make better decisions, and give overlooked grassroots players a safer route to visibility. ScoutLink is the first flagship product in the Stratex ecosystem.'
  },
  scoutlink: {
    path: '/scoutlink',
    title: 'ScoutLink | Stratex Analytics',
    description: 'ScoutLink is the first flagship product from Stratex Analytics, helping grassroots coaches build player evidence and verified scouts assess player fit.',
    kicker: 'ScoutLink',
    h1: 'Coach-led. Scout verified. Youth football, properly.',
    body: 'ScoutLink is owned and operated by Stratex Analytics. It helps coaches structure player evidence, gives verified scouts better context, and keeps youth visibility controlled through safer routes.'
  },
  about: {
    path: '/about',
    title: 'About Stratex Analytics',
    description: 'Stratex Analytics is a sports technology company building football intelligence products for overlooked grassroots talent.',
    kicker: 'About Stratex',
    h1: 'A football intelligence company built around better evidence.',
    body: 'Stratex Analytics exists because grassroots football has talent, but not always the structure, visibility and decision support needed to help that talent be understood properly.'
  },
  leadership: {
    path: '/leadership',
    title: 'Leadership | Stratex Analytics',
    description: 'Meet the leadership team behind Stratex Analytics and ScoutLink.',
    kicker: 'Leadership',
    h1: 'The team building Stratex Analytics.',
    body: 'Stratex is led by a small operating team focused on product quality, customer operations, growth and safer grassroots football visibility.'
  },
  trust: {
    path: '/trust',
    title: 'Trust & Safeguarding | Stratex Analytics',
    description: 'How Stratex Analytics approaches safeguarding, scout verification, data protection and controlled visibility for youth football.',
    kicker: 'Trust & Safeguarding',
    h1: 'Controlled visibility, verified access and clear concern routes.',
    body: 'Stratex designs ScoutLink around safer youth football workflows, controlled scout access and restricted concern handling.'
  },
  'scout-verification': {
    path: '/scout-verification',
    title: 'Scout Verification | Stratex Analytics',
    description: 'ScoutLink access is reviewed to support safer youth football visibility and responsible scouting workflows.',
    kicker: 'Scout Verification',
    h1: 'ScoutLink is not open access.',
    body: 'Verified scout access helps keep youth player information away from open public browsing and gives coaches more confidence in who can view player evidence.'
  },
  'parent-guardian-notice': {
    path: '/parent-guardian-notice',
    title: 'Parent/Guardian Notice | Stratex Analytics',
    description: 'A plain-English notice for parents and guardians explaining ScoutLink player visibility, data and safeguards.',
    kicker: 'Parent/Guardian Notice',
    h1: 'How ScoutLink handles young player visibility.',
    body: 'ScoutLink helps coaches organise player evidence and verified scouts assess fit. It is designed to avoid public exposure of youth player information and to keep contact routes controlled.'
  },
  careers: {
    path: '/careers',
    title: 'Careers | Stratex Analytics',
    description: 'Explore careers at Stratex Analytics, the company behind ScoutLink.',
    kicker: 'Stratex Careers',
    h1: 'Build the future of football intelligence.',
    body: 'Join the team behind ScoutLink, where product-led football intelligence and grassroots football operations come together to help talent get seen with better evidence.'
  },
  'career-detail': {
    path: '/careers',
    title: 'Career Role | Stratex Analytics',
    description: 'View and apply for a Stratex Analytics role securely.',
    kicker: 'Stratex Careers',
    h1: 'Career role at Stratex Analytics.',
    body: 'This role is part of the Stratex Analytics team behind ScoutLink. Applications are stored securely and CV files are not made public.'
  },
  contact: {
    path: '/contact',
    title: 'Contact Stratex Analytics',
    description: 'Contact Stratex Analytics about ScoutLink, clubs, schools, academies, partnerships or company enquiries.',
    kicker: 'Contact',
    h1: 'Tell us what you need help with.',
    body: 'Use the Stratex contact form for company, partnership, club, school, academy or ScoutLink product enquiries.'
  },
  'report-a-concern': {
    path: '/report-a-concern',
    title: 'Report a Concern | Stratex Analytics',
    description: 'Report a safeguarding, privacy or platform concern to Stratex Analytics.',
    kicker: 'Report a Concern',
    h1: 'Tell us about a safeguarding or platform concern.',
    body: 'If someone is in immediate danger, contact emergency services or the relevant safeguarding authority first. Stratex is not an emergency service.'
  },
  'privacy-policy': {
    path: '/privacy-policy',
    title: 'Privacy Policy | Stratex Analytics',
    description: 'How Stratex Analytics handles personal data across the Stratex website and ScoutLink routes.',
    kicker: 'Privacy Policy',
    h1: 'Privacy Policy',
    body: 'Stratex Analytics handles website enquiries, demo requests, newsletter signups, concern reports and ScoutLink product account data through restricted workflows.'
  },
  terms: {
    path: '/terms',
    title: 'Terms of Use | Stratex Analytics',
    description: 'The rules for using Stratex Analytics public pages and ScoutLink routes.',
    kicker: 'Terms of Use',
    h1: 'Terms of Use',
    body: 'ScoutLink does not guarantee scouting, trials, contracts or selection. Youth player information must be handled with appropriate permissions and safeguarding controls.'
  },
  'cookie-policy': {
    path: '/cookie-policy',
    title: 'Cookie Policy | Stratex Analytics',
    description: 'How Stratex Analytics uses cookies and analytics.',
    kicker: 'Cookie Policy',
    h1: 'Cookie Policy',
    body: 'Stratex uses essential cookies and safe analytics events to understand page usage without sending concern descriptions or personal contact details to analytics.'
  },
  security: {
    path: '/security',
    title: 'Security | Stratex Analytics',
    description: 'How Stratex protects website submissions and ScoutLink platform data.',
    kicker: 'Security',
    h1: 'Security',
    body: 'Public forms are submitted through backend routes. Service-role credentials remain server-side only and submissions are not publicly readable.'
  },
  accessibility: {
    path: '/accessibility',
    title: 'Accessibility | Stratex Analytics',
    description: 'Our commitment to accessible Stratex and ScoutLink experiences.',
    kicker: 'Accessibility',
    h1: 'Accessibility',
    body: 'Stratex aims to provide keyboard-accessible navigation, visible focus states, labelled forms and readable contrast.'
  },
  'learning-centre': {
    path: '/learning-centre',
    title: 'Learning Centre | Stratex Analytics',
    description: 'Read Stratex Analytics learning content about grassroots football intelligence, trust and ScoutLink product thinking.',
    kicker: 'Learning Centre',
    h1: 'Football intelligence notes from Stratex.',
    body: 'Short, practical writing about ScoutLink, structured evidence, safeguarding and grassroots football visibility.'
  },
  'blog-detail': {
    path: '/learning-centre',
    title: 'Learning Centre Post | Stratex Analytics',
    description: 'Read Stratex Analytics learning content.',
    kicker: 'Learning Centre',
    h1: 'Stratex learning centre post.',
    body: 'A Stratex Analytics article about ScoutLink, structured evidence, safeguarding or grassroots football visibility.'
  },
  admin: {
    path: '/admin',
    title: 'Stratex Admin Centre',
    description: 'Restricted Stratex Analytics company-level admin centre.',
    kicker: 'Admin Centre',
    h1: 'Stratex Admin Centre',
    body: 'The Stratex Admin Centre is for authorised Stratex team members only. ScoutLink-specific product administration remains inside the ScoutLink product environment.',
    noindex: true
  }
};

const careerDetails = {
  'outreach-associate': {
    title: 'Outreach Associate | Stratex Analytics Careers',
    description: 'Apply for the Outreach Associate role at Stratex Analytics, helping introduce ScoutLink to grassroots football coaches and scouts.',
    kicker: 'Commercial - Live Role',
    h1: 'Outreach Associate',
    body: 'Commission-based pay, remote and flexible. This Stratex Analytics role helps introduce ScoutLink to grassroots football coaches and scouts, supports onboarding and builds trusted grassroots football relationships.'
  }
};

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function routeFromRequest(req) {
  let requestPath = (req.path || req.originalUrl || '/').split('?')[0].replace(/\/$/, '') || '/';
  if (requestPath.indexOf('/company') === 0) requestPath = requestPath.replace(/^\/company/, '') || '/';
  const parts = requestPath.split('/').filter(Boolean);
  if (!parts.length) return { key: 'home', canonicalPath: '/' };
  if (parts[0] === 'careers' && parts[1]) {
    const slug = parts.slice(1).join('/');
    return { key: 'career-detail', slug, canonicalPath: '/careers/' + encodeURIComponent(slug) };
  }
  if (parts[0] === 'learning-centre' && parts[1]) return { key: 'blog-detail', canonicalPath: '/learning-centre/' + encodeURIComponent(parts.slice(1).join('/')) };
  if (parts[0] === 'terms-of-use') return { key: 'terms', canonicalPath: '/terms' };
  return { key: parts[0], canonicalPath: '/' + parts[0] };
}

function pageConfig(req) {
  const route = routeFromRequest(req);
  let page = pages[route.key] || pages.home;
  if (route.key === 'career-detail' && careerDetails[route.slug]) {
    page = {
      ...page,
      ...careerDetails[route.slug]
    };
  }
  return {
    ...page,
    canonical: SITE + (route.canonicalPath === '/' ? '/' : route.canonicalPath)
  };
}

function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Stratex Analytics',
    legalName: 'Stratex Analytics Limited',
    url: SITE,
    description: 'Stratex Analytics builds football intelligence products for overlooked grassroots talent. ScoutLink is the first flagship product in the Stratex ecosystem.',
    sameAs: ['https://www.scoutlink.app'],
    brand: {
      '@type': 'Brand',
      name: 'ScoutLink',
      url: 'https://www.scoutlink.app'
    }
  };
}

function productSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'ScoutLink',
    brand: { '@type': 'Brand', name: 'Stratex Analytics' },
    category: 'Football intelligence and grassroots football scouting platform',
    description: 'ScoutLink is the first flagship product from Stratex Analytics, helping grassroots coaches structure player evidence and verified scouts assess player fit.',
    url: SITE + '/scoutlink'
  };
}

function peopleSchema() {
  return leaders.map((person) => ({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: person.name,
    jobTitle: person.title,
    email: person.email,
    image: person.image,
    worksFor: { '@type': 'Organization', name: 'Stratex Analytics', url: SITE },
    sameAs: [person.linkedin]
  }));
}

function schemaFor(page) {
  const schema = [organizationSchema()];
  if (page.path === '/scoutlink' || page.path === '/') schema.push(productSchema());
  if (page.path === '/leadership' || page.path === '/') schema.push(...peopleSchema());
  return schema.length === 1 ? schema[0] : schema;
}

function fallbackSections(page) {
  if (page.path === '/') {
    return '<section class="stx-section"><div class="stx-container"><div class="stx-grid three">' +
      '<article class="stx-card"><h2>ScoutLink is the first flagship product.</h2><p>ScoutLink helps grassroots coaches build coach-led player profiles for U7-U16 players and gives verified scouts structured evidence to review.</p><p><a class="stx-btn stx-btn-soft" href="/scoutlink">Explore ScoutLink</a></p></article>' +
      '<article class="stx-card"><h2>Why it matters.</h2><p>Grassroots football evidence is often scattered across messages, clips and local knowledge. Stratex builds tools that organise that evidence safely.</p></article>' +
      '<article class="stx-card"><h2>Trust by design.</h2><p>ScoutLink uses reviewed scout access, controlled visibility and concern routes. Compatibility scoring supports decisions but does not guarantee trials, contracts or selection.</p></article>' +
    '</div></div></section>';
  }
  if (page.path === '/scoutlink') {
    return '<section class="stx-section"><div class="stx-container stx-prose"><h2>ScoutLink by Stratex Analytics</h2><p>ScoutLink supports U7-U16 grassroots football players through coach-led player profiles, structured match evidence, video reels, verified scout access and compatibility scoring as decision support.</p><h2>Who ScoutLink helps</h2><ul><li>Coaches can structure player evidence and make fixture information scout-visible.</li><li>Verified scouts can search, compare and shortlist players with context.</li><li>Parents and guardians can understand how youth player data and visibility are handled.</li></ul><p><a class="stx-btn stx-btn-primary" href="https://www.scoutlink.app">Open ScoutLink</a></p></div></section>';
  }
  if (page.path === '/trust') {
    return '<section class="stx-section"><div class="stx-container stx-prose"><h2>Safeguarding-conscious visibility</h2><ul><li>Player visibility is coach-led and controlled.</li><li>Scout access is reviewed before platform use.</li><li>ScoutLink is not a public directory of children.</li><li>Concern reports are routed through restricted Stratex workflows.</li></ul><p><a class="stx-btn stx-btn-primary" href="/report-a-concern">Report a Concern</a></p></div></section>';
  }
  if (page.path === '/careers') {
    return '<section class="stx-section"><div class="stx-container stx-prose"><h2>Careers at Stratex</h2><p>Open roles are published when they are active and meaningful. Applications are stored securely and CV files are private.</p><p><a class="stx-btn stx-btn-soft" href="/contact">Contact Stratex</a></p></div></section>';
  }
  if (page.path === '/learning-centre') {
    return '<section class="stx-section"><div class="stx-container stx-prose"><h2>Learning Centre</h2><p>Read Stratex notes about grassroots football intelligence, structured player evidence, safer visibility and ScoutLink product thinking.</p></div></section>';
  }
  if (page.path === '/contact') {
    return '<section class="stx-section"><div class="stx-container stx-prose"><h2>Contact Stratex</h2><p>Use the Stratex contact form for partnerships, ScoutLink enquiries, club, school, academy and company questions.</p></div></section>';
  }
  if (page.path === '/report-a-concern') {
    return '<section class="stx-section"><div class="stx-container stx-prose"><h2>Report a safeguarding or platform concern</h2><p>If someone is in immediate danger, contact emergency services or the relevant safeguarding authority first. Stratex is not an emergency service.</p></div></section>';
  }
  if (['/privacy-policy', '/terms', '/cookie-policy', '/security', '/accessibility', '/parent-guardian-notice', '/scout-verification'].includes(page.path)) {
    return '<section class="stx-section"><div class="stx-container stx-prose"><h2>' + esc(page.h1) + '</h2><p>' + esc(page.body) + '</p></div></section>';
  }
  return '';
}

function fallbackContent(page) {
  const leadership = page.path === '/leadership'
    ? '<div class="stx-leadership-grid">' + leaders.map((person) => (
        '<article class="stx-card stx-person-card">' +
          '<img class="stx-person-image" src="' + esc(person.image.replace(SITE, '')) + '" alt="' + esc(person.alt) + '" width="320" height="320">' +
          '<span class="stx-tag green">' + esc(person.chip) + '</span>' +
          '<h2>' + esc(person.name) + '</h2>' +
          '<p class="stx-person-title">' + esc(person.title) + '</p>' +
          '<p>' + esc(person.summary) + '</p>' +
          '<p>' + esc(person.bio) + '</p>' +
          '<p><a href="mailto:' + esc(person.email) + '">' + esc(person.email) + '</a></p>' +
          '<p><a class="stx-btn stx-btn-soft" href="' + esc(person.linkedin) + '">View ' + esc(person.name.split(' ')[0]) + ' on LinkedIn</a></p>' +
        '</article>'
      )).join('') + '</div>'
    : '';
  return '<section class="stx-page-hero"><div class="stx-container">' +
    '<span class="stx-kicker">' + esc(page.kicker) + '</span>' +
    '<h1>' + esc(page.h1) + '</h1>' +
    '<p class="stx-lede">' + esc(page.body) + '</p>' +
    leadership +
  '</div></section>' + fallbackSections(page);
}

function staticFooter() {
  const groups = [
    ['Stratex', [['About', '/about'], ['Leadership', '/leadership'], ['Careers', '/careers'], ['Contact', '/contact']]],
    ['Products', [['ScoutLink', '/scoutlink'], ['AgentLink planned', '/about'], ['CoachHub planned', '/about']]],
    ['Trust', [['Trust & Safeguarding', '/trust'], ['Scout Verification', '/scout-verification'], ['Parent/Guardian Notice', '/parent-guardian-notice'], ['Report a Concern', '/report-a-concern'], ['Security', '/security']]],
    ['Legal', [['Privacy Policy', '/privacy-policy'], ['Terms of Use', '/terms'], ['Cookie Policy', '/cookie-policy'], ['Accessibility', '/accessibility']]]
  ];
  return '<div class="stx-footer-grid"><div><a class="stx-brand" href="/"><span class="stx-mark">Stratex</span><span>Analytics</span></a><p>Stratex Analytics builds football intelligence products for overlooked grassroots talent.</p><p>&copy; 2026 Stratex Analytics Limited. All rights reserved.</p></div><div class="stx-footer-links">' +
    groups.map((group) => '<div><strong>' + esc(group[0]) + '</strong>' + group[1].map((item) => '<a href="' + esc(item[1]) + '">' + esc(item[0]) + '</a>').join('') + '</div>').join('') +
  '</div></div>';
}

function replaceTag(html, pattern, replacement) {
  return html.replace(pattern, replacement);
}

function renderStratexPage(req, res, frontendDir) {
  const filePath = path.join(frontendDir, 'pages', 'stratex-site.html');
  let html = fs.readFileSync(filePath, 'utf8');
  const page = pageConfig(req);
  const schema = JSON.stringify(schemaFor(page)).replace(/</g, '\\u003c');
  const robotsTag = page.noindex ? '\n  <meta name="robots" content="noindex,nofollow">' : '';

  html = replaceTag(html, /<title>[\s\S]*?<\/title>/i, '<title>' + esc(page.title) + '</title>');
  html = replaceTag(html, /<meta name="description" content="[^"]*">/i, '<meta name="description" content="' + esc(page.description) + '">');
  html = replaceTag(html, /<link rel="canonical" href="[^"]*">/i, '<link rel="canonical" href="' + esc(page.canonical) + '">');
  html = replaceTag(html, /<meta property="og:title" content="[^"]*">/i, '<meta property="og:title" content="' + esc(page.title) + '">');
  html = replaceTag(html, /<meta property="og:description" content="[^"]*">/i, '<meta property="og:description" content="' + esc(page.description) + '">');
  html = replaceTag(html, /<meta property="og:url" content="[^"]*">/i, '<meta property="og:url" content="' + esc(page.canonical) + '">');
  html = replaceTag(html, /<meta name="twitter:title" content="[^"]*">/i, '<meta name="twitter:title" content="' + esc(page.title) + '">');
  html = replaceTag(html, /<meta name="twitter:description" content="[^"]*">/i, '<meta name="twitter:description" content="' + esc(page.description) + '">');
  html = replaceTag(html, /<script type="application\/ld\+json" id="stratexJsonLd">[\s\S]*?<\/script>/i, '<script type="application/ld+json" id="stratexJsonLd">' + schema + '</script>' + robotsTag);
  html = html.replace('<div id="stratexSiteApp" aria-live="polite"></div>', '<div id="stratexSiteApp" aria-live="polite">' + fallbackContent(page) + '</div>');
  html = html.replace('<footer class="stx-footer" id="stratexFooter"></footer>', '<footer class="stx-footer" id="stratexFooter">' + staticFooter() + '</footer>');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(html);
}

module.exports = { renderStratexPage };
