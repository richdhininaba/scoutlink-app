'use strict';

const fs = require('fs');
const path = require('path');

const SITE = 'https://www.stratexanalytics.co.uk';

const leaders = [
  {
    name: 'Richdhin Inaba',
    title: 'Founder & CEO',
    chip: 'Founder / Product Strategy',
    summary: 'Leads company vision, product direction and long-term strategy.',
    linkedin: 'https://www.linkedin.com/in/richdhin-i-470a15109/'
  },
  {
    name: 'Lucy Ali',
    title: 'Director of Customer Operations',
    chip: 'Operations',
    summary: 'Leads onboarding, customer operations and user success.',
    linkedin: 'https://www.linkedin.com/in/lucy-ali-654b79160/'
  },
  {
    name: 'Alexandro Ilioaie',
    title: 'Director of Growth',
    chip: 'Growth / Partnerships',
    summary: 'Leads growth, partnerships and market visibility.',
    linkedin: 'https://www.linkedin.com/in/alexandro-ilioaie-a0347025a/'
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
  'terms-of-use': {
    path: '/terms-of-use',
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
  if (parts[0] === 'careers' && parts[1]) return { key: 'career-detail', canonicalPath: '/careers/' + encodeURIComponent(parts.slice(1).join('/')) };
  if (parts[0] === 'learning-centre' && parts[1]) return { key: 'blog-detail', canonicalPath: '/learning-centre/' + encodeURIComponent(parts.slice(1).join('/')) };
  return { key: parts[0], canonicalPath: '/' + parts[0] };
}

function pageConfig(req) {
  const route = routeFromRequest(req);
  const page = pages[route.key] || pages.home;
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

function fallbackContent(page) {
  const leadership = page.path === '/leadership'
    ? '<div class="stx-leadership-grid">' + leaders.map((person) => (
        '<article class="stx-card stx-person-card">' +
          '<span class="stx-tag green">' + esc(person.chip) + '</span>' +
          '<h2>' + esc(person.name) + '</h2>' +
          '<p class="stx-person-title">' + esc(person.title) + '</p>' +
          '<p>' + esc(person.summary) + '</p>' +
          '<p><a class="stx-btn stx-btn-soft" href="' + esc(person.linkedin) + '">View ' + esc(person.name.split(' ')[0]) + ' on LinkedIn</a></p>' +
        '</article>'
      )).join('') + '</div>'
    : '';
  return '<section class="stx-page-hero"><div class="stx-container">' +
    '<span class="stx-kicker">' + esc(page.kicker) + '</span>' +
    '<h1>' + esc(page.h1) + '</h1>' +
    '<p class="stx-lede">' + esc(page.body) + '</p>' +
    leadership +
  '</div></section>';
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
  html = replaceTag(html, /<meta name="twitter:title" content="[^"]*">/i, '<meta name="twitter:title" content="' + esc(page.title) + '">');
  html = replaceTag(html, /<meta name="twitter:description" content="[^"]*">/i, '<meta name="twitter:description" content="' + esc(page.description) + '">');
  html = replaceTag(html, /<script type="application\/ld\+json" id="stratexJsonLd">[\s\S]*?<\/script>/i, '<script type="application/ld+json" id="stratexJsonLd">' + schema + '</script>' + robotsTag);
  html = html.replace('<div id="stratexSiteApp" aria-live="polite"></div>', '<div id="stratexSiteApp" aria-live="polite">' + fallbackContent(page) + '</div>');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(html);
}

module.exports = { renderStratexPage };
