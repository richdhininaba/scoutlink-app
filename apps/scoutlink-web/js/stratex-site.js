(function () {
  'use strict';

  var API = localStorage.getItem('sl_api_url') || 'https://scoutlink-api.vercel.app';
  var STRATEX_BASE = 'https://www.stratexanalytics.co.uk';
  var STRATEX_OG_IMAGE = STRATEX_BASE + '/images/og/stratex-og.png';
  var STRATEX_OG_IMAGE_ALT = 'Stratex Analytics and ScoutLink football intelligence platform preview';
  var SCOUTLINK = {
    base: 'https://www.scoutlink.app',
    login: 'https://www.scoutlink.app/login',
    coach: 'https://www.scoutlink.app/register/coach',
    scout: 'https://www.scoutlink.app/register/scout',
    demo: 'https://www.scoutlink.app/demo'
  };
  var SCOUT_PLANS = [
    { name: 'Core', label: 'Starter scout access', annualPrice: '&pound;599/year', monthlyPrice: '&pound;69/month', annualAlt: 'Monthly option: &pound;69/month', monthlyAlt: 'Annual option: &pound;599/year', billingAnnual: 'One annual payment for reviewed scout access.', billingMonthly: 'Flexible monthly billing for a single reviewed scout.', seats: '1 scout seat', interests: '30 coach-mediated interest requests', exports: '20 profile exports', predictions: '60 prediction runs', note: 'Best for one reviewed scout starting structured grassroots search.' },
    { name: 'Plus', label: 'Growing scout team', annualPrice: '&pound;1,999/year', monthlyPrice: '&pound;219/month', annualAlt: 'Monthly option: &pound;219/month', monthlyAlt: 'Annual option: &pound;1,999/year', billingAnnual: 'Annual team access with lower total cost than monthly.', billingMonthly: 'Monthly access for teams that need flexibility.', seats: '5 scout seats', interests: '120 coach-mediated interest requests', exports: '100 profile exports', predictions: '300 prediction runs', note: 'Best for small recruitment teams managing regular shortlists.' },
    { name: 'Elite', label: 'Advanced scout team', annualPrice: '&pound;4,999/year', monthlyPrice: '&pound;549/month', annualAlt: 'Monthly option: &pound;549/month', monthlyAlt: 'Annual option: &pound;4,999/year', billingAnnual: 'Annual access for higher-volume scouting workflows.', billingMonthly: 'Monthly access for higher-volume teams.', seats: '10 scout seats', interests: '300 coach-mediated interest requests', exports: '300 profile exports', predictions: '900 prediction runs', note: 'Best for teams using predictions, exports and deeper search heavily.' },
    { name: 'Enterprise', label: 'Custom organisation', annualPrice: 'Custom', monthlyPrice: 'Custom', annualAlt: 'Custom', monthlyAlt: 'Custom', billingAnnual: 'Tailored annual access for larger organisations.', billingMonthly: 'Custom commercial terms for larger organisations.', seats: 'Custom scout seats', interests: 'Custom coach-mediated interest limits', exports: 'Custom profile exports', predictions: 'Custom prediction runs', note: 'Best for academies, clubs and networks that need onboarding and custom caps.' }
  ];
  var currentPricingMode = 'annual';

  var LEADERS = [
    {
      key: 'richdhin',
      name: 'Richdhin Inaba',
      title: 'Founder & CEO',
      chip: 'Founder / CEO',
      summary: 'Sets the vision, strategy and direction for Stratex Analytics and ScoutLink.',
      email: 'richdhin@stratexanalytics.co.uk',
      linkedin: 'https://www.linkedin.com/in/richdhin-i-470a15109/',
      image: '/images/leadership/richdhin-inaba.jpg',
      alt: 'Richdhin Inaba, Founder and CEO of Stratex Analytics',
      bio: 'Richdhin sets the vision, strategy and direction for Stratex Analytics and ScoutLink. He leads the company executive decisions, product direction and long-term growth.',
      focus: ['Company vision', 'Executive decisions', 'Product direction', 'Long-term growth']
    },
    {
      key: 'lucy',
      name: 'Lucy Ali',
      title: 'Director of Operations',
      chip: 'Operations',
      summary: 'Leads day-to-day operations, outreach delivery and customer management.',
      email: 'lucy.ali@stratexanalytics.co.uk',
      linkedin: 'https://www.linkedin.com/in/lucy-ali-654b79160/',
      image: '/images/leadership/lucy-ali.jpg',
      alt: 'Lucy Ali, Director of Operations at Stratex Analytics',
      bio: 'Lucy leads the day-to-day operations of ScoutLink, including internal processes, outreach delivery, coach and scout relationships, customer management and event operations. She ensures the business runs smoothly as ScoutLink grows.',
      focus: ['Internal processes', 'Outreach delivery', 'Customer management', 'Event operations']
    },
    {
      key: 'alexandro',
      name: 'Alexandro Ilioaie',
      title: 'Director of Football Strategy & Growth',
      chip: 'Football Strategy / Growth',
      summary: 'Leads football strategy, growth initiatives and sporting direction.',
      email: 'alexandro.ilioaie@stratexanalytics.co.uk',
      linkedin: 'https://www.linkedin.com/in/alexandro-ilioaie-a0347025a/',
      image: '/images/leadership/alexandro-ilioaie.jpg',
      alt: 'Alexandro Ilioaie, Director of Football Strategy and Growth at Stratex Analytics',
      bio: 'Alexandro leads ScoutLink football strategy, growth initiatives and sporting direction. He shapes showcase events, awards, partnerships and community ideas that help ScoutLink grow credibly within the football world.',
      focus: ['Football strategy', 'Showcase events', 'Awards', 'Partnerships']
    }
  ];

  var sitePages = [
    ['scoutlink', 'ScoutLink'],
    ['scoutlink/compatibility-score', 'Compatibility Score'],
    ['scoutlink/pricing', 'ScoutLink Pricing'],
    ['scoutlink/scouts', 'For Scouts'],
    ['scoutlink/coaches', 'For Coaches'],
    ['grassroots-football-scouting-tools', 'Grassroots Tools'],
    ['about', 'About Stratex'],
    ['leadership', 'Leadership'],
    ['trust', 'Trust & Safeguarding'],
    ['scout-verification', 'Scout Verification'],
    ['parent-guardian-notice', 'Parent/Guardian Notice'],
    ['careers', 'Careers'],
    ['contact', 'Contact'],
    ['report-a-concern', 'Report a Concern'],
    ['privacy-policy', 'Privacy Policy'],
    ['terms', 'Terms of Use'],
    ['cookie-policy', 'Cookie Policy'],
    ['security', 'Security'],
    ['accessibility', 'Accessibility'],
    ['learning-centre', 'Learning Centre']
  ];

  function isStratexHost() {
    return /(^|\.)stratexanalytics\.co\.uk$/i.test(window.location.hostname);
  }

  function sitePath(slug) {
    if (!slug || slug === 'home') return '/';
    return '/' + slug;
  }

  function normalizePath() {
    var path = window.location.pathname.replace(/\/$/, '') || '/';
    if (!isStratexHost() && path.indexOf('/company') === 0) path = path.replace(/^\/company/, '') || '/';
    if (path === '/') return { page: 'home' };
    var parts = path.split('/').filter(Boolean);
    if (parts[0] === 'careers' && parts[1]) return { page: 'career-detail', slug: parts.slice(1).join('/') };
    if (parts[0] === 'learning-centre' && parts[1]) return { page: 'blog-detail', slug: parts.slice(1).join('/') };
    if (parts[0] === 'compatibility-score') return { page: 'compatibility-score' };
    if (parts[0] === 'pricing') return { page: 'scoutlink-pricing' };
    if (parts[0] === 'scouts') return { page: 'scoutlink-scouts' };
    if (parts[0] === 'coaches') return { page: 'scoutlink-coaches' };
    if (parts[0] === 'grassroots-football-scouting-tools') return { page: 'grassroots-football-scouting-tools' };
    if (parts[0] === 'scoutlink' && parts[1] === 'compatibility-score') return { page: 'compatibility-score' };
    if (parts[0] === 'scoutlink' && parts[1] === 'pricing') return { page: 'scoutlink-pricing' };
    if (parts[0] === 'scoutlink' && parts[1] === 'scouts') return { page: 'scoutlink-scouts' };
    if (parts[0] === 'scoutlink' && parts[1] === 'coaches') return { page: 'scoutlink-coaches' };
    return { page: parts[0] || 'home' };
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function track(name) {
    try {
      if (window.heap && typeof window.heap.track === 'function') window.heap.track(name);
    } catch (_) {}
  }

  function trackPageView(route) {
    try {
      var path = window.location.pathname.replace(/\/+$/, '') || '/';
      var payload = {
        pagePath: path,
        pageTitle: document.title || '',
        canonicalUrl: window.location.href.split('#')[0],
        referrer: document.referrer || ''
      };
      if (navigator.sendBeacon) {
        var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        if (navigator.sendBeacon(API + '/api/stratex-website/activity', blob)) return;
      }
      fetch(API + '/api/stratex-website/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
        credentials: 'include'
      }).catch(function () {});
    } catch (_) {}
  }

  function setMeta(title, description, canonical) {
    document.title = title;
    canonical = canonical || (STRATEX_BASE + (normalizePath().page === 'home' ? '/' : '/' + normalizePath().page));
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', description);
    var ogTitle = document.querySelector('meta[property="og:title"]');
    var ogDesc = document.querySelector('meta[property="og:description"]');
    var ogUrl = document.querySelector('meta[property="og:url"]');
    var ogImage = document.querySelector('meta[property="og:image"]');
    var ogImageAlt = document.querySelector('meta[property="og:image:alt"]');
    var twitterTitle = document.querySelector('meta[name="twitter:title"]');
    var twitterDesc = document.querySelector('meta[name="twitter:description"]');
    var twitterImage = document.querySelector('meta[name="twitter:image"]');
    var twitterImageAlt = document.querySelector('meta[name="twitter:image:alt"]');
    var canon = document.querySelector('link[rel="canonical"]');
    if (ogTitle) ogTitle.setAttribute('content', title);
    if (ogDesc) ogDesc.setAttribute('content', description);
    if (ogUrl) ogUrl.setAttribute('content', canonical);
    if (ogImage) ogImage.setAttribute('content', STRATEX_OG_IMAGE);
    if (ogImageAlt) ogImageAlt.setAttribute('content', STRATEX_OG_IMAGE_ALT);
    if (twitterTitle) twitterTitle.setAttribute('content', title);
    if (twitterDesc) twitterDesc.setAttribute('content', description);
    if (twitterImage) twitterImage.setAttribute('content', STRATEX_OG_IMAGE);
    if (twitterImageAlt) twitterImageAlt.setAttribute('content', STRATEX_OG_IMAGE_ALT);
    if (canon) canon.setAttribute('href', canonical);
    setJsonLd(title, description, canonical);
  }

  function setJsonLd(title, description, canonical) {
    var ld = document.getElementById('stratexJsonLd');
    if (!ld) return;
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': STRATEX_BASE + '/#organization',
          name: 'Stratex Analytics',
          url: STRATEX_BASE + '/',
          image: STRATEX_OG_IMAGE,
          sameAs: ['https://www.scoutlink.app'],
          description: 'Stratex Analytics builds football intelligence products for overlooked grassroots talent.'
        },
        {
          '@type': 'WebPage',
          '@id': canonical + '#webpage',
          url: canonical,
          name: title,
          description: description,
          isPartOf: { '@type': 'WebSite', '@id': STRATEX_BASE + '/#website', name: 'Stratex Analytics', url: STRATEX_BASE + '/' },
          publisher: { '@id': STRATEX_BASE + '/#organization' }
        }
      ]
    });
  }

  function btn(label, href, cls, attrs) {
    return '<a class="stx-btn ' + (cls || '') + '" href="' + esc(href) + '" ' + (attrs || '') + '>' + esc(label) + '</a>';
  }

  function pageHero(kicker, title, copy, actions) {
    return '<section class="stx-page-hero"><div class="stx-container"><span class="stx-kicker">' + esc(kicker) + '</span><h1>' + esc(title) + '</h1><p class="stx-lede">' + esc(copy) + '</p>' + (actions ? '<div class="stx-actions">' + actions + '</div>' : '') + '</div></section>';
  }

  function profilePreview() {
    return '<div class="stx-profile-preview" aria-label="ScoutLink player profile preview including rating, compatibility and player evidence">' +
      '<div class="stx-preview-top"><div style="display:flex;gap:14px;align-items:center"><div class="stx-avatar">EC</div><div><div class="stx-preview-name">Ethan Cole</div><div class="stx-preview-meta">ST - U16 - Northgate United</div></div></div><div class="stx-score"><strong>82</strong><span>Compatibility</span></div></div>' +
      '<div class="stx-preview-body">' +
        metric('Overall rating', 78, 78) +
        metric('Match evidence', 84, 84) +
        metric('Data confidence', 72, 72) +
        metric('Development upside', 88, 88) +
      '</div>' +
      '<div class="stx-preview-cards"><div><b>5</b><span>Match facts</span></div><div><b>&pound;126k</b><span>Value estimate</span></div><div><b>High</b><span>Coach evidence</span></div></div>' +
    '</div>';
  }

  function compatRow(label, score, note) {
    return '<div class="stx-compat-row"><div><span>' + esc(label) + '</span><small>' + esc(note) + '</small></div><i style="--score:' + Math.max(0, Math.min(100, score)) + '%"></i><b>' + esc(score) + '</b></div>';
  }

  function compatibilityProductCard() {
    return '<div class="stx-compat-product-card" aria-label="Example ScoutLink compatibility score card">' +
      '<div class="stx-compat-product-head"><div><span class="stx-card-status live">Compatibility preview</span><h3>Carter Hill</h3><p>ST - U16 - Northgate United</p></div><div class="stx-compat-ring"><strong>82%</strong><span>score</span></div></div>' +
      '<div class="stx-fit-pill-row"><span>High-press forward</span><span>Very high confidence</span></div>' +
      '<div class="stx-compat-breakdown">' +
        compatRow('Need fit', 86, 'Solves pace and finishing gap') +
        compatRow('Role fit', 78, 'Fits striker role expectations') +
        compatRow('Evidence confidence', 72, 'Supported by match facts') +
      '</div>' +
      '<p class="stx-compat-insight">Strong role fit for a high-pressing U16 side that needs pace, finishing and transitional attacking output.</p>' +
    '</div>';
  }

  function metric(label, value, width) {
    return '<div class="stx-metric-row"><span>' + esc(label) + '</span><div class="stx-bar"><span style="width:' + Math.max(0, Math.min(100, width)) + '%"></span></div><b>' + esc(value) + '</b></div>';
  }

  function card(title, copy, status, href, label) {
    return '<article class="stx-card">' +
      (status ? '<span class="stx-card-status ' + (/live/i.test(status) ? 'live' : '') + '">' + esc(status) + '</span>' : '') +
      '<h3>' + esc(title) + '</h3><p>' + esc(copy) + '</p>' +
      (href ? '<div class="stx-card-actions"><a class="stx-btn stx-btn-soft" href="' + esc(href) + '">' + esc(label || 'Learn more') + '</a></div>' : '') +
    '</article>';
  }

  function homePage() {
    setMeta('Stratex Analytics | Football Intelligence for Grassroots Talent', 'Stratex Analytics builds football intelligence products for overlooked grassroots talent.', 'https://www.stratexanalytics.co.uk/');
    track('stratex_home_viewed');
    return '<section class="stx-hero"><div class="stx-container stx-hero-grid">' +
      '<div class="stx-hero-card"><span class="stx-kicker">Football intelligence for overlooked talent</span><h1>Building the intelligence layer for grassroots football.</h1><p class="stx-lede">Stratex Analytics creates data-led products that help coaches organise player evidence, help reviewed scouts make better decisions, and give overlooked grassroots players a safer route to visibility.</p><div class="stx-actions">' +
      btn('Explore ScoutLink', sitePath('scoutlink'), 'stx-btn-primary') + btn('About Stratex', sitePath('about'), '') + btn('Contact Us', sitePath('contact'), '') +
      '</div></div><div class="stx-preview">' + profilePreview() + '</div></div></section>' +
      section('Products built around football intelligence.', 'ScoutLink is the first product in the Stratex ecosystem. Future products will build on the same structured football intelligence layer.',
        '<div class="stx-grid">' +
        card('ScoutLink', 'A grassroots scouting platform that helps coaches build structured player profiles and helps reviewed scouts search, compare and shortlist better-fit players with more context.', 'Live / First product', sitePath('scoutlink'), 'Explore ScoutLink') +
        card('AgentLink', 'A future product designed to help agents identify emerging talent, understand development upside and organise player opportunities with stronger context.', 'Planned') +
        card('CoachHub', 'A future development product for coaches, designed to support player progress tracking, training guidance and structured workflows.', 'Planned') +
        '</div>') +
      section('Grassroots talent is not the problem. Visibility is.', 'At grassroots level, talented players are often missed because evidence is fragmented across messages, spreadsheets, local knowledge, short clips and isolated match observations.',
        '<div class="stx-grid four">' +
        card('Fragmented evidence', 'Player information often sits across different people, teams and formats.') +
        card('Limited visibility', 'Promising players can be overlooked because they are not in the right network, postcode or pathway.') +
        card('Poor scouting structure', 'Scouts often need better context before deciding who is worth watching live.') +
        card('Safeguarding risk', 'Youth football needs controlled visibility, reviewed access and clear contact routes.') +
        '</div>') +
      '<section class="stx-section"><div class="stx-container"><div class="stx-dark-section"><span class="stx-kicker dark">ScoutLink preview</span><h2>ScoutLink is the first product in the Stratex ecosystem.</h2><p>ScoutLink gives grassroots coaches a way to build professional player evidence and gives reviewed scouts a cleaner way to assess fit.</p><div class="stx-actions">' + btn('Explore ScoutLink', sitePath('scoutlink'), 'stx-btn-primary') + '</div></div></div></section>' +
      section('Built around trust, not open exposure.', 'ScoutLink is designed around reviewed access, controlled visibility, safer contact routes and explainable scoring. Stratex does not promise scouting outcomes or direct contact with minors.',
        '<div class="stx-grid three">' + card('Coach-led evidence', 'Player profiles start from coach-managed information and structured match facts.') + card('Reviewed scout access', 'Scout access is reviewed so youth player information is not treated like an open directory.') + card('Clear safeguarding routes', 'Concerns and privacy requests are routed through restricted Stratex workflows.') + '</div>') +
      '<section class="stx-section"><div class="stx-container"><div class="stx-newsletter-card">' + newsletterForm() + '</div></div></section>' +
      finalCta('Ready to see the first Stratex product?', 'Explore ScoutLink or contact Stratex about clubs, schools, academies and partnerships.', btn('Explore ScoutLink', sitePath('scoutlink'), 'stx-btn-primary') + btn('Compatibility score', sitePath('scoutlink/compatibility-score'), '') + btn('Contact Stratex', sitePath('contact'), ''));
  }

  function section(title, copy, body, extraClass) {
    return '<section class="stx-section' + (extraClass ? ' ' + esc(extraClass) : '') + '"><div class="stx-container"><div class="stx-section-head"><h2>' + esc(title) + '</h2><p>' + esc(copy) + '</p></div>' + body + '</div></section>';
  }

  function finalCta(title, copy, actions) {
    return '<section class="stx-section"><div class="stx-container"><div class="stx-dark-section"><h2>' + esc(title) + '</h2><p>' + esc(copy) + '</p><div class="stx-actions">' + actions + '</div></div></div></section>';
  }

  function scoutLinkPage() {
    setMeta('ScoutLink | Stratex Analytics', 'ScoutLink is the first product from Stratex Analytics, helping grassroots coaches build player evidence and reviewed scouts assess player fit.', 'https://www.stratexanalytics.co.uk/scoutlink');
    track('scoutlink_page_viewed');
    return pageHero('ScoutLink', 'Coach-led. Scout-reviewed. Youth football, properly.', 'ScoutLink helps coaches structure player evidence, gives reviewed scouts better context, and keeps youth visibility controlled through safer routes.', btn('Open ScoutLink', SCOUTLINK.base, 'stx-btn-primary', 'data-outbound="open"') + btn('Register as Coach', SCOUTLINK.coach, '', 'data-outbound="coach"')) +
      section('Built for the people around grassroots talent.', 'ScoutLink separates the experience for coaches, reviewed scouts, clubs, schools, academies, players and families.',
        '<div class="stx-grid four">' + card('Coaches', 'Create player profiles, add match facts, upload evidence and make fixtures scout-visible.', null, SCOUTLINK.coach, 'Register as Coach') + card('Scouts', 'Search, compare, shortlist and run structured predictions once access is reviewed.', null, SCOUTLINK.scout, 'Request Scout Access') + card('Clubs, schools and academies', 'Give your players a more structured route to visibility without scattering evidence across messages.', null, sitePath('contact'), 'Contact Stratex') + card('Parents and players', 'Understand how youth data, visibility and safeguarding routes are handled.', null, sitePath('parent-guardian-notice'), 'Read notice') + '</div>', 'stx-scoutlink-section stx-scoutlink-audience') +
      '<section class="stx-section stx-scoutlink-section stx-scoutlink-evidence"><div class="stx-container stx-page-grid"><div class="stx-card"><h2>Player evidence with context.</h2><p>ScoutLink profiles combine coach-rated attributes, match facts, video reels, data confidence, compatibility scoring and estimated value. Scores are explainable and designed to support decisions, not replace live judgement.</p><div class="stx-actions">' + btn('Explore demo', SCOUTLINK.demo, 'stx-btn-primary', 'data-outbound="demo"') + btn('ScoutLink login', SCOUTLINK.login, '') + '</div></div><div class="stx-preview">' + profilePreview() + '</div></div></section>' +
      section('Compatibility scoring explained.', 'ScoutLink compatibility combines the scout setup, player position, attributes, physical profile, match output and evidence confidence into a fit signal. It is not a guarantee of selection or signing.', '<div class="stx-grid three stx-compat-summary-grid">' + card('Need fit', 'Player strengths are compared to the scout setup and weaknesses a team is trying to solve.') + card('Evidence confidence', 'Recent match facts, coach ratings and profile completion affect how much confidence the platform places in a score.') + card('Explainable output', 'Breakdowns show why a player scored well or poorly rather than hiding the reasoning.', null, sitePath('scoutlink/compatibility-score'), 'How scoring works') + '</div>', 'stx-scoutlink-section stx-scoutlink-compat-summary') +
      '<section class="stx-section stx-scoutlink-section"><div class="stx-container stx-page-grid"><div class="stx-card"><h2>See ScoutLink in context.</h2><p>Request a short walkthrough for a club, school, academy or partner organisation. Demo requests are reviewed by the Stratex team.</p></div><div class="stx-form-card">' + demoRequestPanel() + '</div></div></section>';
  }

  function faqBlock(items) {
    if (!items || !items.length) return '';
    return '<section class="stx-section"><div class="stx-container"><div class="stx-section-head"><h2>Frequently asked questions</h2><p>Short answers for coaches, scouts and families.</p></div><div class="stx-grid">' +
      items.map(function (item) {
        return '<article class="stx-card"><h3>' + esc(item[0]) + '</h3><p>' + esc(item[1]) + '</p></article>';
      }).join('') + '</div></div></section>';
  }

  function compatibilityPage() {
    setMeta('ScoutLink Compatibility Score | Football Player-Team Fit', 'How ScoutLink uses compatibility scoring to support football player-team fit review for reviewed scout accounts and coach-led player profiles.', 'https://www.stratexanalytics.co.uk/scoutlink/compatibility-score');
    track('compatibility_score_page_viewed');
    return pageHero('ScoutLink Compatibility Score', 'Player-team fit review, supported by structured evidence.', 'ScoutLink compatibility scoring helps reviewed scouts understand whether a player looks suited to a team need, role expectation or squad gap. It is decision support, not a guarantee of scouting, trials, selection or contracts.', btn('Request scout access', SCOUTLINK.scout, 'stx-btn-primary', 'data-outbound="scout"') + btn('For coaches', sitePath('scoutlink/coaches'), '')) +
      '<section class="stx-section"><div class="stx-container stx-page-grid"><div class="stx-card stx-prose"><h2>What the score brings together</h2><p>ScoutLink combines coach-led player evidence with the scout setup. The result is an explainable fit signal that helps scouts prioritise who to watch, compare and discuss with the relevant coach.</p><ul><li>Player position, age band and role profile.</li><li>Coach-rated attributes and match performance.</li><li>Recent match facts, discipline and availability.</li><li>Physical profile, evidence confidence and profile completion.</li><li>Scout-entered team weaknesses, role expectations and long-term goals.</li></ul><p>The exact weighting model is proprietary to Stratex Analytics, but the product explains the evidence areas that influenced the recommendation.</p></div>' + compatibilityProductCard() + '</div></section>' +
      section('How scouts should use it.', 'The score helps prioritise review, but football judgement remains human.', '<div class="stx-grid three">' + card('Shortlist faster', 'Find players who appear closer to the team profile a scout has entered.') + card('Compare with context', 'Review compatibility alongside overall rating, match output, attributes and confidence.') + card('Keep contact controlled', 'Interest remains coach-mediated. ScoutLink does not support direct scout-to-child contact.') + '</div>') +
      faqBlock([
        ['Does the score guarantee a trial?', 'No. ScoutLink compatibility scoring supports review and does not guarantee scouting, trials, contracts or selection.'],
        ['Is the formula public?', 'No. The exact methodology is proprietary to Stratex Analytics, but the platform explains the main evidence areas that influence a result.'],
        ['Can scouts contact children directly?', 'No. ScoutLink is designed around coach-mediated interest and reviewed scout access.'],
        ['Can a low score improve?', 'Yes. Better match facts, clearer attributes, video evidence and a different scout setup can all change the fit signal.'],
        ['Does compatibility replace live scouting?', 'No. It is a structured starting point for review and comparison, not a replacement for watching football.'],
        ['Does it show personal data?', 'ScoutLink focuses the score on football evidence, team fit and development context rather than exposing unnecessary personal details.'],
        ['Who controls player evidence?', 'Player profiles are coach-led and should only include information the coach or organisation is authorised to manage.']
      ]);
  }

  function pricingCards() {
    return '<div class="stx-pricing-grid">' + SCOUT_PLANS.map(function (plan) {
      var mode = currentPricingMode || 'annual';
      var price = mode === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
      var billing = mode === 'monthly' ? plan.billingMonthly : plan.billingAnnual;
      var cta = plan.name === 'Enterprise' ? 'Talk to Stratex' : 'Request scout access';
      var featured = plan.name === 'Plus';
      return '<article class="stx-card stx-pricing-card' + (featured ? ' is-featured' : '') + '">' +
        '<div class="stx-plan-top"><span class="stx-card-status">' + esc(plan.label) + '</span>' + (featured ? '<span class="stx-popular-badge">Most popular</span>' : '') + '</div>' +
        '<h3>' + esc(plan.name) + '</h3>' +
        '<div class="stx-price-panel"><p class="stx-price">' + price + '</p><p class="stx-price-note">' + esc(billing) + '</p></div>' +
        '<p class="stx-plan-note">' + esc(plan.note) + '</p>' +
        '<div class="stx-limit-chips"><span>' + esc(plan.seats) + '</span><span>' + esc(plan.interests) + '</span><span>' + esc(plan.exports) + '</span><span>' + esc(plan.predictions) + '</span></div>' +
        '<div class="stx-card-actions"><a class="stx-btn stx-btn-primary" href="' + (plan.name === 'Enterprise' ? sitePath('contact') : SCOUTLINK.scout) + '" data-outbound="scout">' + esc(cta) + '</a></div>' +
      '</article>';
    }).join('') + '</div>';
  }

  function pricingPage(canonicalPath) {
    var canonical = canonicalPath || '/scoutlink/pricing';
    setMeta('ScoutLink Pricing | Reviewed Scout Access', 'ScoutLink pricing for reviewed scout access, interests, exports and prediction usage. All scout access is reviewed before activation.', 'https://www.stratexanalytics.co.uk' + canonical);
    track('pricing_page_viewed');
    return pageHero('ScoutLink Pricing', 'Reviewed scout access with annual and monthly options.', 'ScoutLink scout plans are designed for controlled player visibility, coach-mediated interest workflows and clear usage limits. Pricing does not create instant platform access; every scout request is reviewed first.', btn('Request scout access', SCOUTLINK.scout, 'stx-btn-primary', 'data-outbound="scout"') + btn('Compatibility score', sitePath('scoutlink/compatibility-score'), '')) +
      '<section class="stx-section stx-pricing-hero"><div class="stx-container"><div class="stx-pricing-header-panel"><span class="stx-kicker dark">ScoutLink scout plans</span><h2>Choose annual or monthly billing.</h2><p>Annual plans provide the lowest total cost. Monthly plans provide greater flexibility.</p><div class="stx-price-toggle" aria-label="Pricing period"><button type="button" class="active" data-pricing-mode="annual">Annual</button><button type="button" data-pricing-mode="monthly">Monthly</button></div></div></div></section>' +
      '<section class="stx-section stx-pricing-section"><div class="stx-container">' + pricingCards() + '</div></section>' +
      section('Important access notes.', 'ScoutLink is built for responsible youth football visibility.', '<div class="stx-grid three">' + card('Reviewed access', 'Scout requests are reviewed before any product access is activated.') + card('No direct child contact', 'Interest is routed through coach-mediated workflows.') + card('Decision support', 'Compatibility and prediction tools support judgement; they do not guarantee outcomes.') + '</div>');
  }

  function scoutAudiencePage() {
    setMeta('ScoutLink for Football Scouts', 'How reviewed football scouts use ScoutLink to search, compare and shortlist U7-U16 player profiles with coach-led evidence.', 'https://www.stratexanalytics.co.uk/scoutlink/scouts');
    return pageHero('For Scouts', 'Search, compare and shortlist players with better context.', 'ScoutLink helps reviewed scouts find structured U7-U16 player profiles, compare player-team fit and manage a coach-mediated recruitment pipeline.', btn('Request scout access', SCOUTLINK.scout, 'stx-btn-primary', 'data-outbound="scout"') + btn('Pricing', sitePath('scoutlink/pricing'), '')) +
      section('Scout workflows.', 'ScoutLink brings evidence together before a scout decides who is worth watching live.', '<div class="stx-grid three">' + card('Player database', 'Search by position, age, location, rating, value and compatibility.') + card('Compatibility review', 'Understand why a player may or may not solve a role need before adding them to a pipeline.') + card('Predictions and exports', 'Run structured analyses and export football evidence where your plan allows.') + '</div>') +
      faqBlock([['Is scout access instant?', 'No. Scout requests are reviewed before access is activated.'], ['Can scouts message players?', 'No. ScoutLink keeps interest coach-mediated and does not support direct scout-to-child contact.']]);
  }

  function coachAudiencePage() {
    setMeta('ScoutLink for Grassroots Football Coaches', 'How grassroots football coaches use ScoutLink to create structured player profiles, match facts, fixtures and scout-visible evidence.', 'https://www.stratexanalytics.co.uk/scoutlink/coaches');
    return pageHero('For Coaches', 'Turn player evidence into structured football profiles.', 'ScoutLink helps coaches organise player ratings, match facts, fixtures and approved video evidence so reviewed scouts can assess players with better context.', btn('Register as Coach', SCOUTLINK.coach, 'stx-btn-primary', 'data-outbound="coach"') + btn('Compatibility score', sitePath('scoutlink/compatibility-score'), '')) +
      section('Coach workflows.', 'Coach-led evidence keeps youth football visibility structured and safer.', '<div class="stx-grid three">' + card('Player profiles', 'Create structured U7-U16 player records with ratings, position, physical profile and evidence.') + card('Match facts', 'Record game output, events and player performance to improve data confidence.') + card('Scout visibility', 'Make the right profile information visible to reviewed scouts without turning children into a public directory.') + '</div>') +
      faqBlock([['Does ScoutLink guarantee players will be scouted?', 'No. ScoutLink improves evidence and visibility but does not guarantee scouting outcomes.'], ['Who controls player evidence?', 'Player profiles are coach-led and should only include information and media where appropriate permissions are in place.']]);
  }

  function grassrootsToolsPage() {
    setMeta('Grassroots Football Scouting Tools | ScoutLink', 'ScoutLink provides grassroots football scouting tools for coach-led profiles, reviewed scout search, compatibility scoring and safer visibility.', 'https://www.stratexanalytics.co.uk/grassroots-football-scouting-tools');
    return pageHero('Grassroots Football Scouting Tools', 'A more structured way to review youth football talent.', 'ScoutLink brings together player profiles, match evidence, compatibility scoring, scout setup, pipeline tracking and coach-mediated interest workflows.', btn('Explore ScoutLink', sitePath('scoutlink'), 'stx-btn-primary') + btn('Request scout access', SCOUTLINK.scout, '', 'data-outbound="scout"')) +
      section('Tools in one workflow.', 'ScoutLink is designed for grassroots contexts where evidence is often fragmented.', '<div class="stx-grid four">' + card('Coach-led profiles', 'Player records with position, age group, attributes, physical profile and evidence confidence.') + card('Match facts', 'Structured game records, events, ratings and player output.') + card('Compatibility scoring', 'Decision-support player-team fit review with explainable breakdowns.') + card('Reviewed scout pipeline', 'Controlled access, coach-mediated interest and clear recruitment stages.') + '</div>') +
      faqBlock([['What age groups does ScoutLink support?', 'ScoutLink public messaging is focused on U7-U16 grassroots football.'], ['Does ScoutLink replace scouts?', 'No. ScoutLink supports scouting decisions with better evidence and context.']]);
  }

  function aboutPage() {
    setMeta('About Stratex Analytics', 'Stratex Analytics is a sports technology company building football intelligence products for overlooked grassroots talent.', 'https://www.stratexanalytics.co.uk/about');
    track('about_page_viewed');
    return pageHero('About Stratex', 'A football intelligence company built around better evidence.', 'Stratex Analytics exists because grassroots football has talent, but not always the structure, visibility and decision support needed to help that talent be understood properly.') +
      section('What we believe.', 'Good football decisions need better evidence, clearer context and safer access routes.', '<div class="stx-grid three">' + card('Talent is distributed.', 'Opportunity and visibility are not. Grassroots players need structured evidence that can travel beyond local networks.') + card('Context matters.', 'A rating or video clip is more useful when it sits alongside match facts, role expectations and development evidence.') + card('Safety is non-negotiable.', 'Youth football products must control access, contact routes and sensitive data.') + '</div>');
  }

  function trustPage() {
    setMeta('Trust & Safeguarding | Stratex Analytics', 'How Stratex Analytics approaches safeguarding, scout verification, data protection and controlled visibility for youth football.', 'https://www.stratexanalytics.co.uk/trust');
    track('trust_page_viewed');
    return pageHero('Trust & Safeguarding', 'Controlled visibility, reviewed access and clear concern routes.', 'Stratex designs ScoutLink around safer youth football workflows. We do not operate as an emergency service, but we provide clear reporting routes and restrict access to sensitive records.', btn('Report a Concern', sitePath('report-a-concern'), 'stx-btn-primary')) +
      section('Trust principles.', 'The platform is built around practical safeguards, not vague promises.', '<div class="stx-grid four">' + card('Verified access', 'Scout access is reviewed before platform use.') + card('Coach-led profiles', 'Coaches manage player evidence and context.') + card('No open minor directory', 'ScoutLink is not a public database of children.') + card('Restricted concerns', 'Concern records are handled through restricted admin workflows.') + '</div>');
  }

  function scoutVerificationPage() {
    setMeta('Scout Verification | Stratex Analytics', 'ScoutLink access is reviewed to support safer youth football visibility and responsible scouting workflows.', 'https://www.stratexanalytics.co.uk/scout-verification');
    var token = new URLSearchParams(window.location.search).get('token');
    if (token) {
      return pageHero('Scout Verification', 'Upload your verification documents.', 'ScoutLink access is reviewed before activation. Upload safeguarding or DBS evidence and proof of ID so the Stratex team can review your request.') +
        '<section class="stx-section"><div class="stx-container stx-page-grid"><div class="stx-card stx-prose" id="scoutVerificationSummary"><div class="stx-empty">Checking verification link...</div></div><div class="stx-form-card">' +
        '<form class="stx-form" data-scout-verification data-token="' + esc(token) + '"><span class="stx-kicker">Secure upload</span><h2>Submit documents</h2><p>Accepted files: PDF, JPG, PNG, DOC or DOCX. Maximum 5MB per file.</p>' +
        '<label class="stx-label">Safeguarding or DBS evidence<input class="stx-input" type="file" name="safeguardingEvidence" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required></label>' +
        '<label class="stx-label">Proof of ID<input class="stx-input" type="file" name="proofOfId" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required></label>' +
        '<div class="stx-message" role="status"></div><button class="stx-btn stx-btn-primary" type="submit">Submit verification documents</button></form></div></div></section>';
    }
    return pageHero('Scout Verification', 'ScoutLink is not open access.', 'Reviewed scout access helps keep youth player information away from open public browsing and gives coaches more confidence in who can view player evidence.') +
      section('What scouts confirm.', 'ScoutLink access can be declined or removed if the platform is misused.', '<div class="stx-prose stx-card"><ul><li>They are using ScoutLink in a legitimate scouting, recruitment or football evaluation capacity.</li><li>They will not misuse player information or attempt to contact minors directly outside approved safeguarding routes.</li><li>They understand player data must not be scraped, sold or shared outside their organisation without permission.</li></ul></div>');
  }

  function parentNoticePage() {
    setMeta('Parent/Guardian Notice | Stratex Analytics', 'A plain-English notice for parents and guardians explaining ScoutLink player visibility, data and safeguards.', 'https://www.stratexanalytics.co.uk/parent-guardian-notice');
    return pageHero('Parent/Guardian Notice', 'How ScoutLink handles young player visibility.', 'ScoutLink helps coaches organise player evidence and reviewed scouts assess fit. It is designed to avoid public exposure of youth player information and to keep contact routes controlled.') +
      section('What parents and guardians should know.', 'ScoutLink does not guarantee scouting, trials, contracts or selection.', '<div class="stx-prose stx-card"><ul><li>Player profiles are managed by authorised coaches or organisations.</li><li>Scout access is reviewed and monitored.</li><li>Video and player information should only be uploaded where the correct permissions are in place.</li><li>Concerns can be reported to Stratex through the Report a Concern route.</li></ul></div>');
  }

  function leadershipPage() {
    setMeta('Leadership | Stratex Analytics', 'Meet the leadership team behind Stratex Analytics and ScoutLink.', 'https://www.stratexanalytics.co.uk/leadership');
    track('leadership_page_viewed');
    return pageHero('Leadership', 'The team building Stratex Analytics.', 'Stratex is led by a small operating team focused on product quality, customer operations, growth and safer grassroots football visibility.') +
      '<section class="stx-section"><div class="stx-container"><div class="stx-leadership-grid" id="leadershipGrid">' + leadershipFallback() + '</div></div></section>' +
      section('How the team operates.', 'Stratex keeps leadership deliberately close to product quality, customer support and trust decisions.', '<div class="stx-grid three">' + card('Product clarity', 'We build practical football intelligence tools that explain how evidence is used.') + card('Customer closeness', 'Operational feedback from coaches, scouts and partners feeds directly into product decisions.') + card('Controlled visibility', 'Youth football visibility is treated as a trust workflow, not an open marketplace.') + '</div>') +
      finalCta('Need to speak to Stratex?', 'Contact the team about partnerships, operations, ScoutLink or trust-related questions.', btn('Contact Stratex', sitePath('contact'), 'stx-btn-primary'));
  }

  function leadershipFallback() {
    return LEADERS.map(personCard).join('');
  }

  function personCard(person) {
    var firstName = person.name.split(' ')[0];
    return '<article class="stx-card stx-person-card">' +
      '<img class="stx-person-image" src="' + esc(person.image) + '" alt="' + esc(person.alt) + '" loading="lazy" width="320" height="320">' +
      '<span class="stx-tag green stx-person-chip">' + esc(person.chip || 'Leadership') + '</span>' +
      '<div class="stx-person-copy">' +
      '<h3>' + esc(person.name) + '</h3>' +
      '<p class="stx-person-title">' + esc(person.title) + '</p>' +
      '<p>' + esc(person.summary || '') + '</p></div>' +
      '<div class="stx-person-actions"><a class="stx-btn stx-btn-soft stx-btn-small" href="mailto:' + esc(person.email) + '">Email ' + esc(firstName) + '</a>' +
      '<button class="stx-btn stx-btn-soft stx-btn-small" type="button" data-leader-profile="' + esc(person.key) + '">View profile</button></div>' +
    '</article>';
  }

  function leaderByKey(key) {
    return LEADERS.find(function (person) { return person.key === key; }) || null;
  }

  function normalizeLeadershipTitle(name, title) {
    return /lucy ali/i.test(String(name || '')) ? 'Director of Operations' : title;
  }

  function normalizeLeadershipChip(name, chip) {
    return /lucy ali/i.test(String(name || '')) ? 'Operations' : chip;
  }

  function renderLeadershipModal(person) {
    return '<div class="stx-modal-backdrop" data-leader-close></div>' +
      '<section class="stx-modal" role="dialog" aria-modal="true" aria-labelledby="leaderModalTitle">' +
        '<div class="stx-sheet-handle" aria-hidden="true"></div>' +
        '<button class="stx-modal-close" type="button" data-leader-close aria-label="Close leadership profile">Close</button>' +
        '<div class="stx-modal-head"><img class="stx-person-image large" src="' + esc(person.image) + '" alt="' + esc(person.alt) + '" width="180" height="180"><div><span class="stx-tag green">' + esc(person.chip) + '</span><h2 id="leaderModalTitle">' + esc(person.name) + '</h2><p>' + esc(person.title) + '</p></div></div>' +
        '<p class="stx-modal-copy">' + esc(person.bio) + '</p>' +
        '<div class="stx-tags">' + person.focus.map(function (item) { return '<span class="stx-tag">' + esc(item) + '</span>'; }).join('') + '</div>' +
        '<div class="stx-actions">' +
          '<a class="stx-btn stx-btn-primary" href="mailto:' + esc(person.email) + '">Email ' + esc(person.name.split(' ')[0]) + '</a>' +
          '<a class="stx-btn stx-btn-soft" href="' + esc(person.linkedin) + '" target="_blank" rel="noopener">View ' + esc(person.name.split(' ')[0]) + ' on LinkedIn</a>' +
        '</div>' +
      '</section>';
  }

  function openLeadershipModal(key) {
    var person = leaderByKey(key);
    if (!person) return;
    closeLeadershipModal();
    var host = document.createElement('div');
    host.className = 'stx-modal-host';
    host.innerHTML = renderLeadershipModal(person);
    document.body.appendChild(host);
    document.body.classList.add('stx-modal-open');
    var focusable = host.querySelectorAll('a[href], button:not([disabled])');
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (first) first.focus();
    host.addEventListener('click', function (event) {
      if (event.target.hasAttribute('data-leader-close')) closeLeadershipModal();
    });
    host.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeLeadershipModal();
      if (event.key === 'Tab' && focusable.length) {
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });
  }

  function closeLeadershipModal() {
    var existing = document.querySelector('.stx-modal-host');
    if (existing) existing.remove();
    document.body.classList.remove('stx-modal-open');
  }

  function bindLeadershipCards() {
    document.querySelectorAll('[data-leader-profile]').forEach(function (button) {
      button.addEventListener('click', function () {
        openLeadershipModal(button.getAttribute('data-leader-profile'));
      });
    });
  }

  function careersPage() {
    setMeta('Careers | Stratex Analytics', 'Explore careers at Stratex Analytics, the company behind ScoutLink.', 'https://www.stratexanalytics.co.uk/careers');
    track('careers_page_viewed');
    return pageHero('Stratex Careers', 'Build the future of football intelligence.', 'Join the team behind ScoutLink, where product-led football intelligence and grassroots football operations come together to help talent get seen with better evidence.') +
      '<section class="stx-section"><div class="stx-container"><div class="stx-section-head"><h2>Open roles</h2><p>Live and released roles appear here. Applications are saved securely and CVs are not made public.</p></div><div class="stx-job-list" id="careerJobs"><div class="stx-empty">Loading roles...</div></div></div></section>';
  }

  function careerDetailPage(slug) {
    setMeta('Career Role | Stratex Analytics', 'View a Stratex Analytics role and apply securely.', 'https://www.stratexanalytics.co.uk/careers/' + encodeURIComponent(slug || 'role'));
    track('careers_page_viewed');
    return '<section class="stx-section"><div class="stx-container">' +
      '<a class="stx-link-back" href="' + sitePath('careers') + '">Back to careers</a>' +
      '<div class="stx-page-grid stx-career-detail-grid">' +
        '<div id="careerDetailMain" class="stx-card stx-prose"><div class="stx-empty">Loading role...</div></div>' +
        '<aside class="stx-form-card stx-application-card"><span class="stx-kicker">Application</span><h2>Start your application</h2><p>Send your details and CV. The Stratex team will confirm receipt by email.</p><div class="stx-application-facts"><span><b>Review time</b>Around 2 weeks</span><span><b>CV format</b>PDF, DOC or DOCX</span></div>' + careerApplyForm(slug) + '</aside>' +
      '</div>' +
    '</div></section>';
  }

  function careerApplyForm(slug) {
    return '<form class="stx-form" data-career-apply data-slug="' + esc(slug || '') + '">' +
      '<div class="stx-form-row"><label class="stx-label">First name<input class="stx-input" name="firstName" required></label><label class="stx-label">Last name<input class="stx-input" name="lastName" required></label></div>' +
      '<label class="stx-label">Email<input class="stx-input" type="email" name="email" required></label>' +
      '<label class="stx-label">Phone<input class="stx-input" name="phone" required></label>' +
      '<label class="stx-label">CV upload<input class="stx-input" type="file" name="cv" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required></label>' +
      '<p class="stx-help">PDF, DOC or DOCX only. Maximum 5MB.</p>' +
      '<div class="stx-message" role="status"></div>' +
      '<button class="stx-btn stx-btn-primary" type="submit">Submit application</button>' +
    '</form>';
  }

  function contactPage() {
    setMeta('Contact Stratex Analytics', 'Contact Stratex Analytics about ScoutLink, clubs, schools, academies, partnerships or company enquiries.', 'https://www.stratexanalytics.co.uk/contact');
    track('contact_page_viewed');
    return pageHero('Contact', 'Tell us what you need help with.', 'Use this form for company, partnership, club, school, academy or ScoutLink product enquiries. We will review your message and respond where a reply is needed.') +
      '<section class="stx-section"><div class="stx-container stx-page-grid"><div class="stx-form-card">' + contactForm() + '</div><aside class="stx-panel"><h3>Looking for ScoutLink access?</h3><p>Use the ScoutLink routes if you want to register as a coach, request scout access or log into the product.</p><div class="stx-actions">' + btn('Register as Coach', SCOUTLINK.coach, 'stx-btn-primary', 'data-outbound="coach"') + btn('Request Scout Access', SCOUTLINK.scout, '') + '</div><div class="stx-mini-form">' + demoRequestPanel() + '</div></aside></div></section>';
  }

  function contactForm() {
    return '<form class="stx-form" data-stx-form="contact"><div class="stx-form-row"><label class="stx-label">First name<input class="stx-input" name="firstName" required></label><label class="stx-label">Last name<input class="stx-input" name="lastName" required></label></div><div class="stx-form-row"><label class="stx-label">Email<input class="stx-input" type="email" name="email" required></label><label class="stx-label">Phone<input class="stx-input" name="phone"></label></div><label class="stx-label">Organisation<input class="stx-input" name="organisation"></label><label class="stx-label">Reason<select class="stx-select" name="reason"><option>General enquiry</option><option>Club, school or academy enquiry</option><option>ScoutLink demo request</option><option>Partnership enquiry</option><option>Press or media</option></select></label><label class="stx-label">Message<textarea class="stx-textarea" name="message" required></textarea></label><label class="stx-check"><input type="checkbox" name="consentContact" required><span>I agree that Stratex Analytics may use these details to respond to my enquiry.</span></label><label class="stx-check"><input type="checkbox" name="consentMarketing"><span>I would like to receive occasional Stratex and ScoutLink updates.</span></label><div class="stx-message" role="status"></div><button class="stx-btn stx-btn-primary" type="submit">Submit enquiry</button></form>';
  }

  function concernPage() {
    setMeta('Report a Concern | Stratex Analytics', 'Report a safeguarding, privacy or platform concern to Stratex Analytics.', 'https://www.stratexanalytics.co.uk/report-a-concern');
    track('report_concern_started');
    return pageHero('Report a Concern', 'Tell us about a safeguarding or platform concern.', 'If someone is in immediate danger, contact emergency services or the relevant safeguarding authority first. Stratex is not an emergency service.') +
      '<section class="stx-section"><div class="stx-container stx-page-grid"><div class="stx-form-card">' + concernForm() + '</div><aside class="stx-panel"><h3>Urgent risk guidance</h3><p>If there is immediate risk of harm, contact emergency services on 999 in the UK or your local emergency service. You can still submit this form afterwards so Stratex can restrict or review platform access where appropriate.</p></aside></div></section>';
  }

  function concernForm() {
    return '<form class="stx-form" data-stx-form="concern">' +
      '<div class="stx-warning"><strong>Immediate danger?</strong><span>If someone is in immediate danger, contact emergency services or the relevant safeguarding authority first. This form is not an emergency service.</span></div>' +
      '<div class="stx-form-row"><label class="stx-label">Name<input class="stx-input" name="contactName" required></label><label class="stx-label">Email<input class="stx-input" type="email" name="contactEmail" required></label></div>' +
      '<label class="stx-label">Relationship to concern<input class="stx-input" name="relationshipToConcern" placeholder="Parent, coach, scout, player, club official..." required></label>' +
      '<label class="stx-label">Player, team or organisation involved<input class="stx-input" name="playerOrTeam"></label>' +
      '<label class="stx-label">Type of concern<select class="stx-select" name="concernType" required><option value="">Select one</option><option>Safeguarding</option><option>Scout conduct</option><option>Coach conduct</option><option>Player information</option><option>Data/privacy</option><option>Platform misuse</option><option>Other</option></select></label>' +
      '<label class="stx-label">Description<textarea class="stx-textarea" name="description" required></textarea></label>' +
      '<label class="stx-label">Is anyone at immediate risk?<select class="stx-select" name="immediateRisk" required><option value="">Select one</option><option>No</option><option>Yes</option></select></label>' +
      '<label class="stx-check"><input type="checkbox" name="consentContact" required><span>I give Stratex permission to contact me if follow-up is needed.</span></label>' +
      '<input type="hidden" name="sourcePage" value="/report-a-concern"><input type="hidden" name="utm_source"><input type="hidden" name="utm_medium"><input type="hidden" name="utm_campaign">' +
      '<div class="stx-message" role="status"></div><button class="stx-btn stx-btn-danger" type="submit">Submit concern</button></form>';
  }

  function legalPage(page) {
    var map = {
      'privacy-policy': ['Privacy Policy', 'How Stratex Analytics handles personal data across the Stratex website and ScoutLink routes.', ['We collect company website enquiries, demo requests, newsletter signups and concern reports through server-side forms.', 'ScoutLink product account data is kept separate from Stratex website lead data.', 'We use platform activity records to operate and secure the platform, support safeguarding, investigate misuse and maintain audit trails.', 'You can contact Stratex to request access, correction or deletion where applicable.']],
      'terms': ['Terms of Use', 'The rules for using Stratex Analytics public pages and ScoutLink routes.', ['Do not misuse ScoutLink or Stratex pages, scrape information, impersonate another organisation or attempt to bypass access controls.', 'ScoutLink does not guarantee scouting, trials, contracts or selection.', 'Youth player information must be handled with appropriate permissions and safeguarding controls.']],
      'terms-of-use': ['Terms of Use', 'The rules for using Stratex Analytics public pages and ScoutLink routes.', ['Do not misuse ScoutLink or Stratex pages, scrape information, impersonate another organisation or attempt to bypass access controls.', 'ScoutLink does not guarantee scouting, trials, contracts or selection.', 'Youth player information must be handled with appropriate permissions and safeguarding controls.']],
      'cookie-policy': ['Cookie Policy', 'How Stratex Analytics uses cookies and analytics.', ['We use essential cookies for product operation and safe analytics events to understand page usage.', 'We do not send concern descriptions, message content, names, emails or phone numbers to Heap analytics.', 'You can manage browser cookies through your browser settings.']],
      'security': ['Security', 'How Stratex protects website submissions and ScoutLink platform data.', ['Public forms are submitted through backend routes.', 'Supabase service-role credentials are server-side only.', 'Form submissions are not publicly readable.', 'CV and private document storage should remain private and accessible only through restricted admin flows.']],
      'accessibility': ['Accessibility', 'Our commitment to accessible Stratex and ScoutLink experiences.', ['We aim to provide keyboard-accessible navigation, visible focus states, labelled forms and readable contrast.', 'If you find an accessibility issue, contact Stratex with the page and problem so it can be reviewed.']]
    };
    var data = map[page] || map['privacy-policy'];
    setMeta(data[0] + ' | Stratex Analytics', data[1], 'https://www.stratexanalytics.co.uk/' + (page === 'terms-of-use' ? 'terms' : page));
    return pageHero(data[0], data[0], data[1]) + '<section class="stx-section"><div class="stx-container"><div class="stx-card stx-prose"><ul>' + data[2].map(function (item) { return '<li>' + esc(item) + '</li>'; }).join('') + '</ul></div></div></section>';
  }

  function learningPage() {
    setMeta('Learning Centre | Stratex Analytics', 'Read Stratex Analytics learning content about grassroots football intelligence, trust and ScoutLink product thinking.', 'https://www.stratexanalytics.co.uk/learning-centre');
    return pageHero('Learning Centre', 'Football intelligence notes from Stratex.', 'Short, practical writing about ScoutLink, evidence, safeguarding and grassroots football visibility.') +
      '<section class="stx-section"><div class="stx-container"><div class="stx-post-list" id="learningPosts"><div class="stx-empty">Loading posts...</div></div></div></section>';
  }

  function blogDetailPage(slug) {
    setMeta('Learning Centre Post | Stratex Analytics', 'Read Stratex Analytics learning content.', 'https://www.stratexanalytics.co.uk/learning-centre/' + encodeURIComponent(slug || 'post'));
    return '<section class="stx-section"><div class="stx-container">' +
      '<a class="stx-link-back" href="' + sitePath('learning-centre') + '">Back to learning centre</a>' +
      '<article id="blogDetail" class="stx-card stx-prose stx-blog-detail"><div class="stx-empty">Loading post...</div></article>' +
    '</div></section>';
  }

  function demoRequestPanel() {
    return '<form class="stx-form" data-stx-form="demo"><h3>Request a ScoutLink demo</h3><div class="stx-form-row"><label class="stx-label">First name<input class="stx-input" name="firstName" required></label><label class="stx-label">Last name<input class="stx-input" name="lastName" required></label></div><label class="stx-label">Email<input class="stx-input" type="email" name="email" required></label><label class="stx-label">Organisation<input class="stx-input" name="organisation"></label><label class="stx-check"><input type="checkbox" name="consentContact" required><span>I agree Stratex may contact me about this demo request.</span></label><div class="stx-message" role="status"></div><button class="stx-btn stx-btn-primary" type="submit">Request demo</button></form>';
  }

  function newsletterForm() {
    return '<form class="stx-form stx-newsletter-form" data-stx-form="newsletter"><div><h3>Get Stratex updates</h3><p>Occasional notes about ScoutLink, product updates and grassroots football intelligence.</p></div><div class="stx-form-row"><label class="stx-label">First name<input class="stx-input" name="firstName"></label><label class="stx-label">Email<input class="stx-input" type="email" name="email" required></label></div><label class="stx-check"><input type="checkbox" name="consentContact" required><span>I agree to receive Stratex and ScoutLink updates.</span></label><div class="stx-message" role="status"></div><button class="stx-btn stx-btn-primary" type="submit">Subscribe</button></form>';
  }

  function adminPage() {
    setMeta('Stratex Admin Centre', 'Restricted Stratex Analytics company-level admin centre.', 'https://www.stratexanalytics.co.uk/admin');
    return pageHero('Admin Centre', 'Stratex Admin Centre', 'A central space for Stratex team members to access company-level admin tools, operational workflows and internal resources.') +
      '<section class="stx-section"><div class="stx-container"><div class="stx-admin-centre-card"><span class="stx-kicker">Restricted access</span><h2>Authorised Stratex team members only.</h2><p>The Stratex Admin Centre is for company-level workflows. Linked product operations open through the separate product experience selector.</p><div class="stx-grid three">' +
        card('Company Operations', 'Manage general company workflows, internal processes and operational resources.') +
        card('Customer Operations', 'Access onboarding, support and customer-success workflows across the Stratex ecosystem.') +
        card('Growth & Partnerships', 'Track partnership activity, growth workflows and outreach resources.') +
        card('Trust & Concerns', 'Access safeguarding, concern-handling and trust-related workflows.') +
        card('Product Access', 'Open the linked product experience selector when you need platform-specific workflows.', null, 'https://www.scoutlink.app/login', 'Open product selector') +
      '</div><div class="stx-actions">' + btn('Sign in', 'https://www.scoutlink.app/login', 'stx-btn-primary') + btn('Open product selector', 'https://www.scoutlink.app/login', '') + '</div></div></div></section>';
  }

  function fallbackPage() {
    return pageHero('Page not found', 'This page is out of play.', 'The page you are looking for could not be found on the Stratex Analytics site.', btn('Go home', sitePath('home'), 'stx-btn-primary') + btn('Contact support', sitePath('contact'), ''));
  }

  function render() {
    rewriteLinks();
    var app = document.getElementById('stratexSiteApp');
    var route = normalizePath();
    document.body.setAttribute('data-stx-page', route.page || 'home');
    var html = '';
    if (route.page === 'home') html = homePage();
    else if (route.page === 'scoutlink') html = scoutLinkPage();
    else if (route.page === 'compatibility-score') html = compatibilityPage();
    else if (route.page === 'pricing') html = pricingPage('/scoutlink/pricing/');
    else if (route.page === 'scoutlink-pricing') html = pricingPage('/scoutlink/pricing/');
    else if (route.page === 'scoutlink-scouts') html = scoutAudiencePage();
    else if (route.page === 'scoutlink-coaches') html = coachAudiencePage();
    else if (route.page === 'grassroots-football-scouting-tools') html = grassrootsToolsPage();
    else if (route.page === 'about') html = aboutPage();
    else if (route.page === 'leadership') html = leadershipPage();
    else if (route.page === 'trust') html = trustPage();
    else if (route.page === 'scout-verification') html = scoutVerificationPage();
    else if (route.page === 'parent-guardian-notice') html = parentNoticePage();
    else if (route.page === 'careers') html = careersPage();
    else if (route.page === 'career-detail') html = careerDetailPage(route.slug);
    else if (route.page === 'contact') html = contactPage();
    else if (route.page === 'report-a-concern') html = concernPage();
    else if (route.page === 'admin') html = adminPage();
    else if (['privacy-policy','terms','terms-of-use','cookie-policy','security','accessibility'].indexOf(route.page) >= 0) html = legalPage(route.page);
    else if (route.page === 'learning-centre') html = learningPage();
    else if (route.page === 'blog-detail') html = blogDetailPage(route.slug);
    else html = fallbackPage();
    app.innerHTML = html;
    renderFooter();
    bindForms();
    bindScoutVerification();
    bindCareerApply();
    bindLeadershipCards();
    bindPricingToggle();
    loadAsync(route);
    trackPageView(route);
  }

  function bindPricingToggle() {
    var buttons = document.querySelectorAll('[data-pricing-mode]');
    if (!buttons.length) return;
    function apply(mode) {
      currentPricingMode = mode === 'monthly' ? 'monthly' : 'annual';
      buttons.forEach(function (button) { button.classList.toggle('active', button.getAttribute('data-pricing-mode') === mode); });
      var grid = document.querySelector('.stx-pricing-grid');
      if (grid) {
        var wrapper = document.createElement('div');
        wrapper.innerHTML = pricingCards();
        grid.replaceWith(wrapper.firstElementChild);
      }
    }
    buttons.forEach(function (button) {
      button.addEventListener('click', function () { apply(button.getAttribute('data-pricing-mode') || 'annual'); });
    });
    apply('annual');
  }

  function rewriteLinks() {
    document.querySelectorAll('[data-site-link]').forEach(function (el) {
      var slug = el.getAttribute('data-site-link');
      el.setAttribute('href', sitePath(slug));
    });
  }

  function renderFooter() {
    var footer = document.getElementById('stratexFooter');
    if (!footer) return;
    var groups = footerGroups();
    footer.innerHTML = '<div class="stx-footer-grid"><div><a class="stx-brand" href="' + sitePath('home') + '"><span class="stx-mark">Stratex</span><span>Analytics</span></a><p>Stratex Analytics builds football intelligence products for overlooked grassroots talent.</p><p>&copy; 2026 Stratex Analytics Limited. All rights reserved.</p></div><div class="stx-footer-links">' +
      groups.map(function (group) { return footerColumn(group.title, group.links); }).join('') +
      '</div><div class="stx-footer-accordion">' +
      groups.map(footerAccordionGroup).join('') +
      '</div></div>';
    bindFooterAccordions();
  }

  function footerGroups() {
    return [
      { title: 'Stratex', links: [['About', 'about'], ['Leadership', 'leadership'], ['Careers', 'careers'], ['Contact', 'contact']] },
      { title: 'Products', links: [['ScoutLink', 'scoutlink'], ['Compatibility score', 'scoutlink/compatibility-score'], ['Pricing', 'scoutlink/pricing'], ['For scouts', 'scoutlink/scouts'], ['For coaches', 'scoutlink/coaches']] },
      { title: 'Trust', links: [['Trust & Safeguarding', 'trust'], ['Scout Verification', 'scout-verification'], ['Parent/Guardian Notice', 'parent-guardian-notice'], ['Report a Concern', 'report-a-concern'], ['Security', 'security']] },
      { title: 'Legal', links: [['Privacy Policy', 'privacy-policy'], ['Terms of Use', 'terms'], ['Cookie Policy', 'cookie-policy'], ['Accessibility', 'accessibility']] }
    ];
  }

  function footerColumn(title, links) {
    return '<div><strong>' + esc(title) + '</strong>' + links.map(function (item) { return '<a href="' + sitePath(item[1]) + '">' + esc(item[0]) + '</a>'; }).join('') + '</div>';
  }

  function footerAccordionGroup(group) {
    var id = 'footer-' + group.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return '<section class="stx-footer-accordion-group"><button class="stx-footer-accordion-button" type="button" aria-expanded="false" aria-controls="' + esc(id) + '">' +
      '<span>' + esc(group.title) + '</span><span class="stx-footer-chevron" aria-hidden="true">+</span></button>' +
      '<div class="stx-footer-accordion-panel" id="' + esc(id) + '" hidden>' +
      group.links.map(function (item) { return '<a href="' + sitePath(item[1]) + '">' + esc(item[0]) + '</a>'; }).join('') +
      '</div></section>';
  }

  function bindFooterAccordions() {
    document.querySelectorAll('.stx-footer-accordion-button').forEach(function (button) {
      button.addEventListener('click', function () {
        var panel = document.getElementById(button.getAttribute('aria-controls'));
        var open = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', open ? 'false' : 'true');
        var icon = button.querySelector('.stx-footer-chevron');
        if (icon) icon.textContent = open ? '+' : '-';
        if (panel) panel.hidden = open;
      });
    });
  }

  function bindForms() {
    document.querySelectorAll('[data-stx-form]').forEach(function (form) {
      form.addEventListener('submit', async function (event) {
        event.preventDefault();
        var type = form.getAttribute('data-stx-form');
        var message = form.querySelector('.stx-message');
        if (message) { message.className = 'stx-message'; message.textContent = ''; }
        var data = {};
        new FormData(form).forEach(function (value, key) { data[key] = value; });
        data.consentContact = !!form.querySelector('[name="consentContact"]:checked');
        data.consentMarketing = !!form.querySelector('[name="consentMarketing"]:checked');
        data.sourcePage = window.location.pathname;
        data.consentText = type === 'newsletter' ? 'I agree to receive Stratex and ScoutLink updates.' : 'I agree that Stratex Analytics may use these details to respond to this submission.';
        data.consentVersion = '2026-07-stratex-site-v1';
        var endpoint = { contact: '/api/stratex-website/contact', demo: '/api/stratex-website/demo-request', newsletter: '/api/stratex-website/newsletter', concern: '/api/stratex-website/concern' }[type];
        try {
          if (type === 'contact') track('contact_form_started');
          if (type === 'demo') track('demo_request_started');
          var res = await fetch(API + endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
          var json = await res.json().catch(function () { return {}; });
          if (!res.ok) throw new Error(json.error || 'Submission failed');
          form.reset();
          if (message) {
            message.className = 'stx-message show ok';
            message.textContent = type === 'concern'
              ? 'Thanks - we have received your report. Our team will review it and contact you if follow-up is needed. If someone is in immediate danger, contact emergency services or the relevant safeguarding authority first.'
              : (json.message || 'Thanks. Your submission has been received.');
          }
          if (type === 'contact') track('contact_form_submitted');
          if (type === 'demo') track('demo_request_submitted');
          if (type === 'newsletter') track('newsletter_signup_submitted');
          if (type === 'concern') track('report_concern_submitted');
        } catch (err) {
          if (message) {
            message.className = 'stx-message show err';
            message.textContent = err.message || 'Could not submit this form right now.';
          }
        }
      });
    });
    document.querySelectorAll('[data-outbound]').forEach(function (el) {
      el.addEventListener('click', function () {
        var key = el.getAttribute('data-outbound');
        var map = { login: 'outbound_scoutlink_login_clicked', coach: 'outbound_scoutlink_register_coach_clicked', scout: 'outbound_scoutlink_request_scout_access_clicked', demo: 'outbound_scoutlink_demo_clicked', open: 'outbound_scoutlink_login_clicked' };
        if (map[key]) track(map[key]);
      });
    });
  }

  async function loadAsync(route) {
    if (route.page === 'careers') loadJobs();
    if (route.page === 'career-detail') loadJobDetail(route.slug);
    if (route.page === 'scout-verification') loadScoutVerification();
    if (route.page === 'leadership') loadLeadership();
    if (route.page === 'learning-centre') loadPosts();
    if (route.page === 'blog-detail') loadPostDetail(route.slug);
  }

  async function loadScoutVerification() {
    var token = new URLSearchParams(window.location.search).get('token');
    var root = document.getElementById('scoutVerificationSummary');
    if (!token || !root) return;
    try {
      var res = await fetch(API + '/api/registrations/scout-verification/' + encodeURIComponent(token));
      var json = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(json.error || 'Verification link could not be loaded.');
      root.innerHTML = '<span class="stx-card-status live">' + esc(json.verificationStatus || 'Awaiting documents') + '</span><h2>' + esc(json.firstName || 'Scout') + ', complete your verification</h2><p>Upload the requested documents for ' + esc(json.scoutClub || 'your scouting organisation') + '. The review usually takes less than 24 hours after documents are submitted.</p><p><strong>Documents uploaded:</strong> ' + esc(json.documentsUploaded || 0) + '</p>';
    } catch (err) {
      root.innerHTML = '<div class="stx-empty"><h2>Verification link unavailable</h2><p>' + esc(err.message || 'This link may have expired.') + '</p></div>';
      var form = document.querySelector('[data-scout-verification]');
      if (form) form.querySelectorAll('input,button').forEach(function (el) { el.disabled = true; });
    }
  }

  function bindScoutVerification() {
    var form = document.querySelector('[data-scout-verification]');
    if (!form) return;
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      var token = form.getAttribute('data-token');
      var message = form.querySelector('.stx-message');
      if (message) { message.className = 'stx-message'; message.textContent = ''; }
      try {
        var data = new FormData(form);
        ['safeguardingEvidence', 'proofOfId'].forEach(function (name) {
          var file = form.querySelector('[name="' + name + '"]').files[0];
          if (!file) throw new Error('Both verification files are required.');
          if (file.size > 5 * 1024 * 1024) throw new Error(file.name + ' must be 5MB or smaller.');
        });
        var res = await fetch(API + '/api/registrations/scout-verification/' + encodeURIComponent(token), { method: 'POST', body: data });
        var json = await res.json().catch(function () { return {}; });
        if (!res.ok) throw new Error(json.error || 'Could not upload verification documents.');
        form.reset();
        if (message) {
          message.className = 'stx-message show ok';
          message.textContent = json.message || 'Verification documents received.';
        }
        loadScoutVerification();
      } catch (err) {
        if (message) {
          message.className = 'stx-message show err';
          message.textContent = err.message || 'Could not upload verification documents.';
        }
      }
    });
  }

  function bindCareerApply() {
    var form = document.querySelector('[data-career-apply]');
    if (!form) return;
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      var slug = form.getAttribute('data-slug');
      var message = form.querySelector('.stx-message');
      if (message) { message.className = 'stx-message'; message.textContent = ''; }
      try {
        var fileInput = form.querySelector('[name="cv"]');
        var file = fileInput && fileInput.files ? fileInput.files[0] : null;
        if (!file) throw new Error('Please attach your CV.');
        if (file.size > 5 * 1024 * 1024) throw new Error('CV file must be 5MB or smaller.');
        var data = new FormData(form);
        var res = await fetch(API + '/api/careers/' + encodeURIComponent(slug) + '/apply', {
          method: 'POST',
          body: data
        });
        var json = await res.json().catch(function () { return {}; });
        if (!res.ok) throw new Error(json.error || 'Application could not be submitted.');
        form.reset();
        if (message) {
          message.className = 'stx-message show ok';
          message.textContent = json.message || 'Application received. Please check your email, including junk, for confirmation.';
        }
      } catch (err) {
        if (message) {
          message.className = 'stx-message show err';
          message.textContent = err.message || 'Could not submit this application right now.';
        }
      }
    });
  }

  async function loadJobs() {
    var root = document.getElementById('careerJobs');
    if (!root) return;
    try {
      var res = await fetch(API + '/api/careers');
      var json = await res.json();
      var rows = json.data || json.jobs || [];
      if (!rows.length) {
        root.innerHTML = '<div class="stx-empty"><h3>No open roles right now</h3><p>Check back soon for new Stratex and ScoutLink opportunities.</p></div>';
        return;
      }
      root.innerHTML = rows.map(function (job) {
        var href = sitePath('careers') + '/' + encodeURIComponent(job.slug || job.id);
        return '<article class="stx-job-card"><span class="stx-card-status live">' + esc(job.department || 'Open role') + '</span><h3>' + esc(job.jobTitle || job.job_title) + '</h3><p>' + esc([job.location, job.workingType || job.working_type, job.employmentType || job.employment_type].filter(Boolean).join(' - ')) + '</p><div class="stx-actions">' + btn('View role', href, 'stx-btn-primary') + '</div></article>';
      }).join('');
    } catch (_) {
      root.innerHTML = '<div class="stx-empty">Could not load roles right now.</div>';
    }
  }

  async function loadJobDetail(slug) {
    var root = document.getElementById('careerDetailMain');
    if (!root) return;
    try {
      var res = await fetch(API + '/api/careers/' + encodeURIComponent(slug));
      var json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Role not found');
      var job = json.data || json.job || {};
      setMeta((job.jobTitle || job.job_title || 'Career role') + ' | Stratex Analytics', job.roleOverview || job.role_overview || 'View and apply for this Stratex Analytics role.', 'https://www.stratexanalytics.co.uk/careers/' + encodeURIComponent(slug));
      root.innerHTML = '<span class="stx-card-status live">' + esc(job.department || 'Open role') + '</span>' +
        '<h1>' + esc(job.jobTitle || job.job_title || 'Open role') + '</h1>' +
        '<p class="stx-lede">' + esc([job.location, job.workingType || job.working_type, job.employmentType || job.employment_type].filter(Boolean).join(' - ')) + '</p>' +
        infoGrid(job) +
        contentBlock('About Stratex Analytics', job.aboutCompany || job.about_company) +
        contentBlock('Role overview', job.roleOverview || job.role_overview) +
        contentBlock('What you will be doing', job.whatYouWillBeDoing || job.what_you_will_be_doing || job.responsibilities) +
        contentBlock('Must-haves', job.mustHaves || job.must_haves) +
        contentBlock('Nice-to-haves', job.niceToHaves || job.nice_to_haves) +
        contentBlock('Interview process', job.interviewProcess || job.interview_process);
    } catch (_) {
      root.innerHTML = '<div class="stx-empty"><h2>Role not found</h2><p>This role may have closed or moved.</p>' + btn('View all roles', sitePath('careers'), 'stx-btn-primary') + '</div>';
    }
  }

  function infoGrid(job) {
    var salary = job.salaryRange || job.salary_range || [job.salaryMin || job.salary_min, job.salaryMax || job.salary_max].filter(Boolean).join(' - ');
    var items = [
      ['Department', job.department],
      ['Location', job.location],
      ['Working type', job.workingType || job.working_type],
      ['Employment', [job.employmentType || job.employment_type, job.contractType || job.contract_type].filter(Boolean).join(' - ')],
      ['Pay type', salary || job.payType || job.pay_type],
      ['Positions available', job.positionsAvailable || job.positions_available]
    ];
    return '<div class="stx-info-grid">' + items.map(function (item) {
      return '<div><span>' + esc(item[0]) + '</span><strong>' + esc(item[1] || 'TBC') + '</strong></div>';
    }).join('') + '</div>';
  }

  function cleanMarkdown(value) {
    return String(value || '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/\bAI-powered\b/gi, 'product-led')
      .replace(/\bdata and AI\b/gi, 'data-led football intelligence')
      .trim();
  }

  function formatLongText(value) {
    var text = cleanMarkdown(value);
    if (!text) return '';
    var lines = text.split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
    if (lines.length > 1 && lines.every(function (line) { return /^[-*]\s+/.test(line); })) {
      return '<ul>' + lines.map(function (line) { return '<li>' + esc(line.replace(/^[-*]\s+/, '')) + '</li>'; }).join('') + '</ul>';
    }
    return '<p>' + esc(text).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>') + '</p>';
  }

  function contentBlock(title, body) {
    if (!body) return '';
    return '<section class="stx-content-block"><h2>' + esc(title) + '</h2>' + formatLongText(body) + '</section>';
  }

  async function loadLeadership() {
    var root = document.getElementById('leadershipGrid');
    if (!root) return;
    try {
      var res = await fetch(API + '/api/stratex-website/leadership');
      var json = await res.json();
      var rows = json.data || [];
      if (rows.length) {
        root.innerHTML = mergeLeadership(rows).map(personCard).join('');
        bindLeadershipCards();
      }
    } catch (_) {}
  }

  function mergeLeadership(rows) {
    var byName = {};
    (rows || []).forEach(function (row) {
      var name = String(row.full_name || row.fullName || '').toLowerCase();
      byName[name] = row;
    });
    var knownNames = {};
    var merged = LEADERS.map(function (person) {
      var row = byName[person.name.toLowerCase()];
      knownNames[person.name.toLowerCase()] = true;
      if (!row) return person;
      return Object.assign({}, person, {
        title: normalizeLeadershipTitle(person.name, row.job_title || row.jobTitle || person.title),
        summary: row.summary || person.summary,
        bio: row.bio || person.bio,
        chip: normalizeLeadershipChip(person.name, row.focus_chip || row.permission_role || person.chip),
        linkedin: row.linkedin_url || person.linkedin,
        image: row.image_url || row.imageUrl || person.image,
        alt: row.alt || person.alt
      });
    });
    (rows || []).forEach(function (row) {
      var name = String(row.full_name || row.fullName || '').trim();
      if (!name || knownNames[name.toLowerCase()]) return;
      merged.push({
        key: row.id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: name,
        title: normalizeLeadershipTitle(name, row.job_title || row.jobTitle || 'Leadership'),
        chip: normalizeLeadershipChip(name, row.focus_chip || row.permission_role || 'Leadership'),
        summary: row.summary || '',
        email: row.email || '',
        linkedin: row.linkedin_url || '',
        image: row.image_url || row.imageUrl || '/images/leadership/richdhin-inaba.jpg',
        alt: name + ', Stratex Analytics leadership',
        bio: row.bio || row.summary || '',
        focus: Array.isArray(row.focus_areas) ? row.focus_areas : []
      });
    });
    LEADERS = merged;
    return merged;
  }

  async function loadPosts() {
    var root = document.getElementById('learningPosts');
    if (!root) return;
    try {
      var res = await fetch(API + '/api/stratex-website/blog?published=true');
      var json = await res.json();
      var rows = json.data || [];
      if (!rows.length) {
        root.innerHTML = '<div class="stx-empty">Learning Centre posts will appear here soon.</div>';
        return;
      }
      root.innerHTML = rows.map(function (post) {
        return '<article class="stx-job-card"><span class="stx-card-status">' + esc(post.category || 'Learning') + '</span><h3>' + esc(post.title) + '</h3><p>' + esc(post.excerpt || '') + '</p><div class="stx-post-meta"><span>' + esc(Number(post.view_count || 0).toLocaleString('en-GB')) + ' views</span><span>' + esc(Number(post.like_count || 0).toLocaleString('en-GB')) + ' likes</span></div><div class="stx-actions">' + btn('Read post', sitePath('learning-centre') + '/' + encodeURIComponent(post.slug), 'stx-btn-soft') + '</div></article>';
      }).join('');
    } catch (_) {
      root.innerHTML = '<div class="stx-empty">Could not load posts right now.</div>';
    }
  }

  async function loadPostDetail(slug) {
    var root = document.getElementById('blogDetail');
    if (!root) return;
    try {
      var res = await fetch(API + '/api/stratex-website/blog/' + encodeURIComponent(slug));
      var json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Post not found');
      var post = json.data || {};
      setMeta((post.title || 'Learning Centre') + ' | Stratex Analytics', post.excerpt || 'Read Stratex Analytics learning content.', 'https://www.stratexanalytics.co.uk/learning-centre/' + encodeURIComponent(slug));
      root.innerHTML = '<span class="stx-card-status">' + esc(post.category || 'Learning') + '</span><h1>' + esc(post.title || 'Learning Centre') + '</h1><p class="stx-lede">' + esc(post.excerpt || '') + '</p>' +
        '<div class="stx-post-actions"><span id="postViewCount">' + esc(Number(post.view_count || 0).toLocaleString('en-GB')) + ' views</span><span id="postLikeCount">' + esc(Number(post.like_count || 0).toLocaleString('en-GB')) + ' likes</span><button class="stx-btn stx-btn-soft" type="button" data-blog-like="' + esc(slug) + '">Like</button><button class="stx-btn" type="button" data-blog-share>Share</button></div>' +
        '<div><p>' + esc(post.body || '').replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>') + '</p></div>';
      bindBlogEngagement(slug, post.title || 'Learning Centre');
    } catch (_) {
      root.innerHTML = '<div class="stx-empty"><h2>Post not found</h2><p>This post may have moved.</p>' + btn('View learning centre', sitePath('learning-centre'), 'stx-btn-primary') + '</div>';
    }
  }

  function bindBlogEngagement(slug, title) {
    var likeButton = document.querySelector('[data-blog-like]');
    var shareButton = document.querySelector('[data-blog-share]');
    if (likeButton) {
      likeButton.addEventListener('click', async function () {
        likeButton.disabled = true;
        try {
          var res = await fetch(API + '/api/stratex-website/blog/' + encodeURIComponent(slug) + '/like', { method: 'POST' });
          var json = await res.json().catch(function () { return {}; });
          if (!res.ok) throw new Error(json.error || 'Could not save like');
          var count = document.getElementById('postLikeCount');
          if (count) count.textContent = Number(json.likeCount || 0).toLocaleString('en-GB') + ' likes';
          likeButton.textContent = 'Liked';
        } catch (_) {
          likeButton.disabled = false;
        }
      });
    }
    if (shareButton) {
      shareButton.addEventListener('click', async function () {
        var url = window.location.href;
        try {
          if (navigator.share) {
            await navigator.share({ title: title, url: url });
          } else if (navigator.clipboard) {
            await navigator.clipboard.writeText(url);
            shareButton.textContent = 'Link copied';
          }
        } catch (_) {}
      });
    }
  }

  function initNav() {
    var menu = document.getElementById('stxMenuButton');
    var login = document.getElementById('stxLoginButton');
    var loginMenu = document.getElementById('stxLoginMenu');
    if (menu) {
      menu.addEventListener('click', function () {
        var open = !document.body.classList.contains('stx-menu-open');
        document.body.classList.toggle('stx-menu-open', open);
        menu.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
    if (login && loginMenu) {
      login.addEventListener('click', function () {
        var open = !loginMenu.classList.contains('open');
        loginMenu.classList.toggle('open', open);
        login.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        document.body.classList.remove('stx-menu-open');
        if (menu) menu.setAttribute('aria-expanded', 'false');
        if (loginMenu) loginMenu.classList.remove('open');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initNav();
    render();
  });
})();

