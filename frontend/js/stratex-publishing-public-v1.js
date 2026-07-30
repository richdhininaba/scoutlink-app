'use strict';

(function () {
  var path = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
  if (path !== '/showcase-event' && path !== '/award-ceremonies') return;

  var API = (function () {
    try {
      return localStorage.getItem('sl_api_url') || 'https://scoutlink-api.vercel.app';
    } catch (_) {
      return 'https://scoutlink-api.vercel.app';
    }
  }());

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }

  function date(value, options) {
    if (!value) return 'To be confirmed';
    var parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleDateString('en-GB', options || {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  function time(value) {
    if (!value) return 'To be confirmed';
    var match = String(value).match(/^(\d{2}):(\d{2})/);
    if (!match) return String(value);
    var hour = Number(match[1]);
    var minute = match[2];
    return String(hour % 12 || 12) + ':' + minute + ' ' + (hour >= 12 ? 'PM' : 'AM');
  }

  function api(pathname) {
    var separator = pathname.indexOf('?') >= 0 ? '&' : '?';
    return fetch(API + pathname + separator + '_=' + Date.now(), { credentials: 'include', cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (payload) {
        if (!response.ok) throw new Error(payload.error || 'The public page could not be loaded.');
        return payload;
      });
    });
  }

  function button(label, href, tone) {
    return '<a class="spub-btn ' + esc(tone || '') + '" href="' + esc(href) + '">' + esc(label) + '</a>';
  }

  function header(active) {
    return '<header class="spub-header"><a class="spub-brand" href="/"><span>SA</span><div>Stratex Analytics<small>Football intelligence for overlooked talent</small></div></a><nav class="spub-nav" aria-label="Public navigation"><a href="/scoutlink">ScoutLink</a><a href="/about">About</a><a href="/leadership">Leadership</a><a href="/learning-centre">Learning Centre</a><a class="' + (active === 'events' ? 'active' : '') + '" href="/showcase-event">Events</a><a href="/careers">Careers</a></nav><div class="spub-header-actions">' + button('Contact us', '/contact', 'secondary') + button('Explore ScoutLink', '/scoutlink', '') + '</div><button class="spub-menu" type="button" aria-label="Open navigation">Menu</button></header>';
  }

  function footer() {
    return '<footer class="spub-footer"><div><b>Stratex Analytics</b><p>Data and technology improving grassroots football development, visibility and progression.</p></div><nav><a href="/about">About</a><a href="/leadership">Leadership</a><a href="/learning-centre">Learning Centre</a><a href="/showcase-event">Showcase events</a><a href="/award-ceremonies">Award ceremonies</a><a href="/contact">Contact</a><a href="/privacy-policy">Privacy</a></nav></footer>';
  }

  function setMeta(title, description, canonical) {
    document.title = title;
    var descriptionNode = document.querySelector('meta[name="description"]');
    if (descriptionNode) descriptionNode.setAttribute('content', description);
    var canonicalNode = document.querySelector('link[rel="canonical"]');
    if (canonicalNode) canonicalNode.setAttribute('href', canonical);
    var ogTitle = document.querySelector('meta[property="og:title"]');
    var ogDescription = document.querySelector('meta[property="og:description"]');
    var ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogTitle) ogTitle.setAttribute('content', title);
    if (ogDescription) ogDescription.setAttribute('content', description);
    if (ogUrl) ogUrl.setAttribute('content', canonical);
  }

  function eventCard(event) {
    var percentage = event.professionalCapacity
      ? Math.min(100, Math.round((Number(event.professionalRegistrations || 0) / Number(event.professionalCapacity)) * 100))
      : 0;
    var imageStyle = event.heroImageUrl
      ? 'style="background-image:linear-gradient(rgba(6,22,37,.28),rgba(6,22,37,.28)),url(\'' + esc(event.heroImageUrl) + '\')"'
      : '';
    var actions = '';
    if (event.featured && event.registrationRoutes) {
      if (event.playerRegistrationOpen) actions += button('Register as a player', event.registrationRoutes.player, '');
      if (event.professionalRegistrationOpen && event.remainingProfessionalPlaces > 0) actions += button('Register as a coach or scout', event.registrationRoutes.professional, 'secondary');
      if (!event.professionalRegistrationOpen || event.remainingProfessionalPlaces <= 0) actions += button('Coach and Scout places sold out', '/showcase-event/coach-scout-registration/sold-out', 'secondary');
    }
    return '<article class="spub-event ' + (event.featured ? 'featured' : '') + '" id="event-' + esc(event.slug || event.id) + '"><div class="spub-event-image" ' + imageStyle + '><span class="spub-badge">' + esc(event.featured ? 'Featured registration event' : String(event.status || 'Published')) + '</span></div><div class="spub-event-body"><span class="spub-kicker">ScoutLink Showcase</span><h3>' + esc(event.eventName) + '</h3><p>' + esc(event.summary || event.description || 'A ScoutLink football event connecting grassroots players with coaches and verified scouts.') + '</p><div class="spub-event-meta"><div><small>Date</small><b>' + esc(date(event.eventDate, { day: 'numeric', month: 'short', year: 'numeric' })) + '</b></div><div><small>Venue</small><b>' + esc(event.venueName || 'To be confirmed') + '</b></div><div><small>Player ages</small><b>' + esc(event.playerMinAge + '–' + event.playerMaxAge) + '</b></div></div>' + (event.featured ? '<div class="spub-capacity"><b>We are nearly at capacity.</b><span>Coach and Scout registration remains open while the final professional places are allocated.</span><div class="spub-track"><i style="width:' + Math.max(82, percentage) + '%"></i></div></div>' : '') + (actions ? '<div class="spub-actions">' + actions + '</div>' : '<div class="spub-capacity"><b>Event details published</b><span>Registration links appear when Stratex Admin marks this as the featured registration event.</span></div>') + '</div></article>';
  }

  function awardCard(row) {
    var imageStyle = row.hero_image_url
      ? 'style="background-image:linear-gradient(rgba(6,22,37,.28),rgba(6,22,37,.28)),url(\'' + esc(row.hero_image_url) + '\')"'
      : '';
    var categories = Array.isArray(row.categories) ? row.categories : [];
    return '<article class="spub-event" id="award-' + esc(row.slug || row.id) + '"><div class="spub-event-image" ' + imageStyle + '><span class="spub-badge">Stratex Football Honours</span></div><div class="spub-event-body"><span class="spub-kicker">Award ceremony</span><h3>' + esc(row.name) + '</h3><p>' + esc(row.description || 'A Stratex recognition event celebrating grassroots football achievement, development and impact.') + '</p><div class="spub-event-meta"><div><small>Date</small><b>' + esc(date(row.event_date, { day: 'numeric', month: 'short', year: 'numeric' })) + '</b></div><div><small>Location</small><b>' + esc(row.location || 'To be confirmed') + '</b></div><div><small>Status</small><b>' + esc(row.status || 'Published') + '</b></div></div>' + (categories.length ? '<div class="spub-award-categories">' + categories.map(function (category) { return '<span>' + esc(category) + '</span>'; }).join('') + '</div>' : '') + '</div></article>';
  }

  async function renderShowcase(root) {
    setMeta(
      'ScoutLink Showcase Events | Stratex Analytics',
      'Explore ScoutLink Showcase events and register as a grassroots player, coach or verified scout.',
      'https://www.stratexanalytics.co.uk/showcase-event'
    );
    try {
      var payload = await api('/api/stratex-publishing/showcase-events');
      var events = payload.data || [];
      var featured = events.find(function (event) { return event.featured; }) || events[0];
      var heroCopy = featured
        ? (featured.summary || 'A live ScoutLink event connecting grassroots players with verified football professionals.')
        : 'Upcoming ScoutLink Showcase events will appear here as soon as Stratex publishes them.';
      var facts = featured ? '<aside class="spub-hero-facts"><div class="spub-fact"><div><small>Event date</small><b>' + esc(date(featured.eventDate)) + '</b></div></div><div class="spub-fact"><div><small>Player arrival</small><b>' + esc(time(featured.playerArrivalTime)) + '</b></div></div><div class="spub-fact"><div><small>Coach and Scout arrival</small><b>' + esc(time(featured.professionalArrivalTime)) + '</b></div></div><div class="spub-fact"><div><small>Venue</small><b>' + esc(featured.venueName) + '</b></div></div></aside>' : '<aside class="spub-hero-facts"><div class="spub-fact"><div><small>Next event</small><b>To be announced</b></div></div></aside>';
      root.innerHTML = '<div class="spub-page">' + header('events') + '<main class="spub-main"><section class="spub-hero"><div><span class="spub-kicker">ScoutLink Showcase events</span><h1>Where grassroots talent meets real football opportunity.</h1><p>' + esc(heroCopy) + '</p><div class="spub-actions">' + (featured && featured.playerRegistrationOpen ? button('Register as a player', '/showcase-event/player-registration', '') : '') + (featured && featured.professionalRegistrationOpen ? button('Attend as a coach or scout', '/showcase-event/coach-scout-registration', 'ghost') : '') + '</div></div>' + facts + '</section><section class="spub-section"><header class="spub-section-head"><div><span class="spub-kicker">Published by Stratex Admin</span><h2>ScoutLink Showcase events</h2><p>Only events published by the internal Stratex team appear here. Registration status, venue, capacity and public details come from the same admin record.</p></div></header>' + (events.length ? '<div class="spub-event-grid">' + events.map(eventCard).join('') + '</div>' : '<div class="spub-empty"><div><h2>No public Showcase event yet.</h2><p>The Stratex team is preparing the next event. Published details and registration routes will appear here automatically.</p></div></div>') + '</section></main>' + footer() + '</div>';
      if (window.location.hash) setTimeout(function () { var target = document.querySelector(window.location.hash); if (target) target.scrollIntoView({ behavior: 'smooth' }); }, 80);
    } catch (error) {
      root.innerHTML = '<div class="spub-page">' + header('events') + '<main class="spub-main"><div class="spub-error">' + esc(error.message) + '</div></main>' + footer() + '</div>';
    }
  }

  async function renderAwards(root) {
    setMeta(
      'Stratex Football Honours and Award Ceremonies',
      'Explore public Stratex award ceremonies celebrating grassroots football players, coaches and community impact.',
      'https://www.stratexanalytics.co.uk/award-ceremonies'
    );
    try {
      var payload = await api('/api/stratex-publishing/award-ceremonies');
      var rows = payload.data || [];
      root.innerHTML = '<div class="spub-page">' + header('events') + '<main class="spub-main"><section class="spub-hero"><div><span class="spub-kicker">Stratex Football Honours</span><h1>Recognising the people moving grassroots football forward.</h1><p>Public ceremonies, dates, locations and award categories are published directly from the secure Stratex Admin Centre.</p><div class="spub-actions">' + button('Explore ScoutLink', '/scoutlink', '') + button('Contact the team', '/contact', 'ghost') + '</div></div><aside class="spub-hero-facts"><div class="spub-fact"><div><small>Public ceremonies</small><b>' + esc(rows.length) + '</b></div></div><div class="spub-fact"><div><small>Recognition</small><b>Players, coaches and community</b></div></div></aside></section><section class="spub-section"><header class="spub-section-head"><div><span class="spub-kicker">Published by Stratex Admin</span><h2>Award ceremonies</h2><p>Draft and planning records remain private. Ceremonies only appear here once the Stratex team publishes them.</p></div></header>' + (rows.length ? '<div class="spub-event-grid">' + rows.map(awardCard).join('') + '</div>' : '<div class="spub-empty"><div><h2>No public award ceremony yet.</h2><p>The next Stratex Football Honours announcement will appear here automatically after publication.</p></div></div>') + '</section></main>' + footer() + '</div>';
    } catch (error) {
      root.innerHTML = '<div class="spub-page">' + header('events') + '<main class="spub-main"><div class="spub-error">' + esc(error.message) + '</div></main>' + footer() + '</div>';
    }
  }

  function start() {
    var root = document.getElementById('stratexPublicRoot');
    if (!root) return;
    var task = path === '/showcase-event' ? renderShowcase(root) : renderAwards(root);
    Promise.resolve(task).finally(function () {
      document.documentElement.classList.add('stratex-publishing-ready');
      root.style.visibility = 'visible';
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}());
