'use strict';

/*
 * ScoutLink Coach Desk / Coach Field V6 shell.
 * Visual source of truth:
 *   - scoutlink-coach-desk-design-v6.html (desktop / Desk)
 *   - scoutlink-coach-field-design-v6.html (mobile / Field)
 *
 * Route renderers continue to own data/business actions. This file owns the
 * shared shell, navigation, search, account controls, overlays and V6 chrome.
 */
(function () {
  if (window.__scoutlinkCoachV6Shell) return;
  window.__scoutlinkCoachV6Shell = true;

  var ROUTES = {
    Dashboard: '/coach/dashboard',
    'My Players': '/coach/my-players',
    Fixtures: '/coach/fixtures',
    'Match Facts': '/coach/match-facts',
    'Video Reels': '/coach/video-reels',
    Chat: '/coach/chat',
    Notifications: '/coach/notifications',
    Settings: '/coach/settings',
    'Report a Concern': '/coach/report-a-concern'
  };

  var DESK_NAV = [
    ['Overview', ['Dashboard']],
    ['Squad', ['My Players']],
    ['Matches', ['Fixtures', 'Match Facts']],
    ['Evidence', ['Video Reels']],
    ['Messages', ['Chat', 'Notifications']],
    ['Team', ['Settings']],
    ['Support', ['Report a Concern']]
  ];

  var FIELD_NAV = [
    ['Home', '/coach/dashboard', 'home'],
    ['Players', '/coach/my-players', 'players'],
    ['Fixtures', '/coach/fixtures', 'fixtures'],
    ['Chat', '/coach/chat', 'chat'],
    ['More', '#', 'more']
  ];

  var WIZARD_PAGES = {
    onboarding: true,
    'add-player': true,
    'bulk-add-players': true,
    'match-facts': true
  };

  var ICONS = {
    home: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/></svg>',
    players: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.6c2.6.5 4.5 2.3 4.5 5.4"/></svg>',
    fixtures: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.2" y="5" width="17.6" height="15.5" rx="2.5"/><path d="M3.2 9.3h17.6M8 3v4M16 3v4"/></svg>',
    facts: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5.5" y="4" width="13" height="17" rx="2.3"/><path d="M9 4V3.2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V4"/><path d="M8.5 10.5h7M8.5 14h7M8.5 17.5h4"/></svg>',
    video: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="15" rx="2.2"/><path d="M8 4.5v15M16 4.5v15M3 9.8h5M16 9.8h5M3 15h5M16 15h5"/></svg>',
    chat: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9.5l-5 3.8V6.5a1 1 0 0 1 1-1Z"/></svg>',
    bell: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6.2 9a5.8 5.8 0 1 1 11.6 0c0 4 1.9 4.8 1.9 5.7H4.3c0-.9 1.9-1.7 1.9-5.7Z"/><path d="M10 19.5a2 2 0 0 0 4 0"/></svg>',
    settings: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.1"/><path d="M12 2.5v2.8M12 18.7v2.8M4.6 4.6l2 2M17.4 17.4l2 2M2.5 12h2.8M18.7 12h2.8M4.6 19.4l2-2M17.4 6.6l2-2"/></svg>',
    shield: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.2 19.5 6v6.2c0 4.6-3.2 7.4-7.5 8.6-4.3-1.2-7.5-4-7.5-8.6V6L12 3.2Z"/></svg>',
    more: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>',
    back: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19.5 12h-15M11 18l-6-6 6-6"/></svg>',
    close: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    search: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="10.8" cy="10.8" r="6.8"/><path d="M20 20l-3.6-3.6"/></svg>'
  };

  var counts = { notifications: 0, chat: 0, players: 0, facts: 0, videos: 0 };
  var titleOverride = '';
  var subtitleOverride = '';
  var fieldTitleOverride = null;
  var fieldSubtitleOverride = null;
  var fieldRightOverride = null;
  var fieldLeftOverride = null;
  var routeActions = { secondary: null, primary: null };
  var searchCache = null;
  var searchLoading = null;
  var demoCache = null;
  var demoLoading = null;

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function clean(path) {
    return typeof window.cleanRouteFor === 'function' ? window.cleanRouteFor(path) : path;
  }

  function isPublicDemo() {
    try {
      return (typeof window.isPublicDemoMode === 'function' && window.isPublicDemoMode()) || sessionStorage.getItem('sl_public_demo') === '1';
    } catch (_) { return false; }
  }

  function apiBase() {
    try { return window.API || localStorage.getItem('sl_api_url') || 'https://scoutlink-api.vercel.app'; }
    catch (_) { return window.API || 'https://scoutlink-api.vercel.app'; }
  }

  function list(response, keys) {
    if (Array.isArray(response)) return response;
    for (var i = 0; i < keys.length; i += 1) {
      if (response && Array.isArray(response[keys[i]])) return response[keys[i]];
    }
    return [];
  }

  function fetchDemo(force) {
    if (!force && demoCache) return Promise.resolve(demoCache);
    if (!force && demoLoading) return demoLoading;
    demoLoading = fetch(apiBase() + '/api/coach-experience/public-demo', { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) throw new Error(d.error || 'Demo data could not be loaded.'); return d.data || d; }); })
      .then(function (data) { demoCache = data || {}; return demoCache; })
      .finally(function () { demoLoading = null; });
    return demoLoading;
  }

  function demoRead(path) {
    var u = new URL(path, 'https://scoutlink.local');
    var p = u.pathname;
    var supported = p === '/api/coach-experience/overview' || p === '/api/coaches/profile' || p === '/api/coaches/my-players' ||
      p === '/api/coaches/team-coaches' || p === '/api/fixtures' || p === '/api/videos' || p === '/api/match-facts' ||
      p === '/api/notifications' || p === '/api/chat/threads' || p === '/api/coach-experience/last-lineup' ||
      p === '/api/coach-experience/notification-preferences' || /^\/api\/chat\/threads\/[^/]+\/messages$/.test(p) ||
      /^\/api\/coach-experience\/fixtures\/[^/]+$/.test(p) || /^\/api\/coach-experience\/players\/[^/]+\/activity$/.test(p);
    if (!supported) return null;
    return fetchDemo(false).then(function (o) {
      var players = list(o, ['players']);
      var fixtures = list(o, ['fixtures']);
      var videos = list(o, ['videos']);
      var facts = list(o, ['matchFacts']);
      var notifications = list(o, ['notifications']);
      var threads = list(o, ['threads']);
      var messages = list(o, ['chatMessages']);
      var attendance = list(o, ['attendance']);
      var interest = list(o, ['interest']);
      if (p === '/api/coach-experience/overview') return o;
      if (p === '/api/coaches/profile') return { coach: o.coach || null };
      if (p === '/api/coaches/my-players') return { players: players, data: players };
      if (p === '/api/coaches/team-coaches') { var coaches = list(o, ['teamCoaches']); return { coaches: coaches, data: coaches }; }
      if (p === '/api/fixtures') return { fixtures: fixtures, data: fixtures };
      if (p === '/api/videos') return { videos: videos, data: videos };
      if (p === '/api/match-facts') return { matchFacts: facts, data: facts };
      if (p === '/api/notifications') return { notifications: notifications, data: notifications, unreadCount: notifications.filter(function (x) { return !x.is_read; }).length };
      if (p === '/api/chat/threads') return { threads: threads, data: threads };
      if (p === '/api/coach-experience/notification-preferences') return { preferences: o.notificationPreferences || {} };
      if (p === '/api/coach-experience/last-lineup') {
        var last = facts.filter(function (x) { return x.confirmed !== false; }).sort(function (a, b) { return new Date(b.match_date || b.created_at || 0) - new Date(a.match_date || a.created_at || 0); })[0] || null;
        return { match: last };
      }
      var mm = p.match(/^\/api\/chat\/threads\/([^/]+)\/messages$/);
      if (mm) { var tid = decodeURIComponent(mm[1]); var ms = messages.filter(function (x) { return String(x.thread_id) === String(tid); }); return { messages: ms, data: ms }; }
      var fm = p.match(/^\/api\/coach-experience\/fixtures\/([^/]+)$/);
      if (fm) {
        var fid = decodeURIComponent(fm[1]);
        return {
          fixture: fixtures.find(function (x) { return String(x.id) === String(fid); }) || null,
          attendance: attendance.filter(function (x) { return String(x.fixture_id) === String(fid); }),
          scouts: o.scouts || {},
          videos: videos.filter(function (x) { return String(x.fixture_id) === String(fid); }),
          matchFacts: facts.filter(function (x) { return String(x.fixture_id) === String(fid); })
        };
      }
      var pm = p.match(/^\/api\/coach-experience\/players\/([^/]+)\/activity$/);
      if (pm) {
        var pid = decodeURIComponent(pm[1]);
        return {
          player: players.find(function (x) { return String(x.id) === String(pid); }) || null,
          interest: interest.filter(function (x) { return String(x.player_id) === String(pid); }),
          threads: threads.filter(function (x) { return String(x.player_id) === String(pid); }),
          videos: videos.filter(function (x) { return String(x.player_id) === String(pid); }),
          scouts: o.scouts || {}
        };
      }
      return null;
    });
  }

  function api(method, path, body) {
    if (isPublicDemo() && String(method || 'GET').toUpperCase() === 'GET') {
      var demo = demoRead(path);
      if (demo) return demo;
    }
    if (typeof window.api === 'function') return window.api(method, path, body);
    return Promise.reject(new Error('ScoutLink API client is unavailable.'));
  }

  function user() { return window.Auth && window.Auth.user ? window.Auth.user : {}; }
  function fullName() {
    var u = user();
    var n = [u.firstName || u.first_name, u.lastName || u.last_name].filter(Boolean).join(' ').trim();
    try { return n || localStorage.getItem('sl_user_name') || 'Coach'; } catch (_) { return n || 'Coach'; }
  }
  function firstName() { return fullName().split(/\s+/)[0] || 'Coach'; }
  function initials(value) {
    var parts = String(value || fullName()).trim().split(/\s+/).filter(Boolean);
    return (((parts[0] || 'C')[0] || 'C') + ((parts[1] || parts[0] || 'O')[0] || 'O')).toUpperCase();
  }
  function teamName() {
    var u = user();
    try { return localStorage.getItem('sl_team_name') || u.team_name || u.teamName || u.club_name || u.clubName || 'Your team'; }
    catch (_) { return u.team_name || u.teamName || 'Your team'; }
  }
  function ageGroup() {
    var u = user();
    try { return localStorage.getItem('sl_team_age_group') || u.age_group || u.ageGroup || ''; }
    catch (_) { return u.age_group || u.ageGroup || ''; }
  }
  function allowedCoach() {
    if (isPublicDemo()) return true;
    var type = window.Auth && window.Auth.type;
    return type === 'Coach' || type === 'Stratex' || type === 'Stratex Admin';
  }
  function pageKey() { return document.body ? document.body.getAttribute('data-coach-page') || '' : ''; }
  function wizard() { return !!WIZARD_PAGES[pageKey()]; }

  function currentShell() { return document.querySelector('.coach-desk [data-coach-shell]'); }
  function activeLabel() { var s = currentShell(); return s && s.getAttribute('data-active') || 'Dashboard'; }
  function pageTitle() { var s = currentShell(); return titleOverride || (s && s.getAttribute('data-title')) || activeLabel(); }
  function pageSubtitle() { var s = currentShell(); return subtitleOverride || (s && s.getAttribute('data-crumb')) || [teamName(), ageGroup()].filter(Boolean).join(' · '); }

  function iconFor(label) {
    return label === 'Dashboard' ? ICONS.home : label === 'My Players' ? ICONS.players : label === 'Fixtures' ? ICONS.fixtures :
      label === 'Match Facts' ? ICONS.facts : label === 'Video Reels' ? ICONS.video : label === 'Chat' ? ICONS.chat :
      label === 'Notifications' ? ICONS.bell : label === 'Settings' ? ICONS.settings : ICONS.shield;
  }

  function badge(label) {
    var count = label === 'My Players' ? counts.players : label === 'Match Facts' ? counts.facts : label === 'Video Reels' ? counts.videos : label === 'Chat' ? counts.chat : label === 'Notifications' ? counts.notifications : 0;
    return count ? '<span class="badge">' + count + '</span>' : '';
  }

  function deskNav(active) {
    return DESK_NAV.map(function (group) {
      return '<div class="rail-grp">' + esc(group[0]) + '</div>' + group[1].map(function (label) {
        return '<a class="rail-item' + (label === active ? ' on' : '') + '" href="' + esc(clean(ROUTES[label])) + '">' + iconFor(label) + '<span>' + esc(label) + '</span>' + badge(label) + '</a>';
      }).join('');
    }).join('');
  }

  function searchMarkup() {
    return '<div class="rail-search coach-v6-search" style="position:relative">' + ICONS.search + '<input type="search" aria-label="Search players and fixtures" placeholder="Search players, fixtures..." style="border:0;outline:0;background:transparent;width:100%;font:inherit;color:inherit"><div class="coach-search-results"></div></div>';
  }

  function hydrateDesk() {
    var shell = currentShell();
    if (!shell) return;
    var cv = shell.querySelector('#coachDeskPage') || shell.querySelector('.cv');
    if (!cv) return;

    if (wizard()) {
      document.body.classList.add('coach-v6-wizard');
      var screen = shell.closest('.screen') || shell.parentNode;
      screen.classList.add('app-shell');
      shell.className = 'wizard-shell';
      if (!shell.querySelector('.wizard-head')) {
        var head = document.createElement('header');
        head.className = 'wizard-head';
        head.innerHTML = '<a class="wizard-brand" href="' + esc(clean('/coach/dashboard')) + '" aria-label="ScoutLink"></a>' +
          '<div class="wizard-copy"><small>ScoutLink Wizard</small><b>' + esc(pageTitle()) + '</b></div><span class="sp"></span>' +
          '<button class="btn outline sm" type="button" data-wizard-exit>' + ICONS.close + ' Exit</button>';
        shell.insertBefore(head, cv);
      }
      cv.className = 'cv body';
      return;
    }

    var screenNormal = shell.closest('.screen') || shell.parentNode;
    screenNormal.classList.add('app-shell');
    if (shell.dataset.v6Mounted !== '1') {
      if (!routeActions.secondary && shell.getAttribute('data-tbx')) {
        routeActions.secondary = {
          label: shell.getAttribute('data-tbx'),
          href: shell.getAttribute('data-tbx-href') || '',
          id: shell.getAttribute('data-tbx-id') || ''
        };
      }
      if (!routeActions.primary && shell.getAttribute('data-tbx-spend')) {
        routeActions.primary = {
          label: shell.getAttribute('data-tbx-spend'),
          href: shell.getAttribute('data-tbx-spend-href') || '',
          id: shell.getAttribute('data-tbx-spend-id') || ''
        };
      }
      shell.dataset.v6Mounted = '1';
      shell.className = 'app rel';
      var nav = document.createElement('nav');
      nav.className = 'rail-nav';
      nav.id = 'coachDeskNav';
      nav.innerHTML = '<div class="rail-brand"><div class="sl-logo-mark colour" style="width:128px;height:41px"></div></div>' + searchMarkup() +
        '<div class="rail-scroll">' + deskNav(activeLabel()) + '</div>' +
        '<button type="button" class="rail-foot" data-coach-account style="border-left:0;border-right:0;border-bottom:0;width:100%;text-align:left">' +
          '<span class="avatar">' + esc(initials()) + '</span><span class="txt"><b>' + esc(fullName()) + '</b><span class="role-txt">' + esc((user().role_at_club || 'Head Coach') + ' · ' + teamName()) + '</span></span></button>';
      var main = document.createElement('div');
      main.className = 'main';
      var top = document.createElement('header');
      top.className = 'top';
      top.id = 'coachDeskTop';
      main.appendChild(top);
      cv.className = 'cv body';
      main.appendChild(cv);
      shell.innerHTML = '';
      shell.appendChild(nav);
      shell.appendChild(main);
    }
    refreshChrome();
    bindSearch(document.querySelector('.coach-v6-search'));
  }

  function fieldActive(label) {
    var p = location.pathname;
    if (/\/coach\/dashboard/.test(p)) return label === 'Home';
    if (/\/coach\/(my-players|add-player|bulk-add-players)/.test(p) || /\/player\/profile/.test(p)) return label === 'Players';
    if (/\/coach\/(fixtures|match-facts)/.test(p)) return label === 'Fixtures';
    if (/\/coach\/chat/.test(p)) return label === 'Chat';
    return label === 'More';
  }

  function fieldTabs() {
    return FIELD_NAV.map(function (item) {
      var label = item[0], href = item[1], key = item[2], on = fieldActive(label);
      var icon = key === 'home' ? ICONS.home : key === 'players' ? ICONS.players : key === 'fixtures' ? ICONS.fixtures : key === 'chat' ? ICONS.chat : ICONS.more;
      var extra = label === 'Chat' && counts.chat ? '<span class="bdg">' + counts.chat + '</span>' : '';
      return '<a class="' + (on ? 'on' : '') + '" href="' + esc(href === '#' ? '#' : clean(href)) + '"' + (label === 'More' ? ' data-coach-more' : '') + '>' + icon + esc(label) + extra + '</a>';
    }).join('');
  }

  function hydrateField() {
    var root = document.querySelector('.coach-field .scr');
    var body = document.getElementById('coachFieldPage');
    if (!root || !body) return;
    root.classList.add('rel');
    body.className = 'pbody';

    var ptop = root.querySelector('.ptop');
    if (!ptop) {
      ptop = document.createElement('header');
      ptop.className = 'ptop';
      root.insertBefore(ptop, body);
    }
    var title = fieldTitleOverride !== null ? fieldTitleOverride : pageTitle();
    var left = fieldLeftOverride !== null ? fieldLeftOverride : (wizard() ? '<button class="icon-btn" style="width:34px;height:34px" type="button" data-field-back>' + ICONS.back + '</button><span style="width:26px;height:26px;flex:0 0 26px"><span class="sl-logo-mark colour" style="width:26px;height:8px"></span></span>' : '');
    var right = fieldRightOverride !== null ? fieldRightOverride : (wizard() ? '<button class="icon-btn" style="width:34px;height:34px" type="button" data-wizard-exit>' + ICONS.close + '</button>' : '<button class="icon-btn" style="width:38px;height:38px" type="button" data-coach-notifications>' + ICONS.bell + (counts.notifications ? '<u style="font-size:8px;min-width:14px;height:14px">' + counts.notifications + '</u>' : '') + '</button>');
    ptop.innerHTML = left + '<h1>' + esc(title) + '</h1><span class="sp"></span>' + right;

    var oldTabs = root.querySelector('.tabs');
    if (oldTabs) oldTabs.remove();
    var oldHome = root.querySelector('.homebar');
    if (oldHome) oldHome.remove();
    var tabs = root.querySelector('.ptabs');
    if (wizard()) {
      if (tabs) tabs.remove();
    } else {
      if (!tabs) { tabs = document.createElement('nav'); tabs.className = 'ptabs'; root.appendChild(tabs); }
      tabs.innerHTML = fieldTabs();
    }
  }

  function routeActionMarkup(action, primary) {
    if (!action || !action.label) return '';
    var cls = primary ? 'btn volt sm' : 'btn outline sm';
    if (action.href) return '<a class="' + cls + '" href="' + esc(clean(action.href)) + '">' + esc(action.label) + '</a>';
    return '<button class="' + cls + '" type="button"' + (action.id ? ' id="' + esc(action.id) + '"' : '') + '>' + esc(action.label) + '</button>';
  }

  function refreshChrome() {
    var top = document.getElementById('coachDeskTop');
    if (top) {
      top.innerHTML = '<div><div class="eyebrow">' + esc(pageSubtitle() || ('Good morning, ' + firstName())) + '</div><h1>' + esc(pageTitle()) + '</h1></div><span class="sp"></span>' +
        routeActionMarkup(routeActions.secondary, false) + routeActionMarkup(routeActions.primary, true) +
        '<button class="icon-btn" type="button" data-coach-notifications>' + ICONS.bell + (counts.notifications ? '<u>' + counts.notifications + '</u>' : '') + '</button>';
    }
    var scroll = document.querySelector('#coachDeskNav .rail-scroll');
    if (scroll) scroll.innerHTML = deskNav(activeLabel());
  }

  function closeAll() {
    document.querySelectorAll('[data-coach-overlay]').forEach(function (node) { node.remove(); });
  }

  function openOverlay(kind, options) {
    options = options || {};
    closeAll();
    var backdrop = document.createElement('div');
    backdrop.className = 'coach-drawer-backdrop';
    backdrop.dataset.coachOverlay = '1';
    var box = document.createElement('section');
    box.dataset.coachOverlay = '1';
    var mobile = innerWidth <= 760;
    box.className = 'coach-overlay ' + (mobile ? 'psheet' : kind === 'modal' ? 'modal' : 'drw');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', options.title || 'Details');
    box.innerHTML = (mobile ? '<div class="gr"></div>' : '') + '<div class="' + (mobile ? 'sh' : 'drw-h') + '"><h3 style="margin:0">' + esc(options.title || 'Details') + '</h3><span class="sp"></span><button class="icon-btn" style="width:38px;height:38px" type="button" data-close-coach-overlay>' + ICONS.close + '</button></div>' +
      '<div class="ob">' + (options.html || '') + '</div>' + (options.footer ? '<div class="of">' + options.footer + '</div>' : '');
    document.body.appendChild(backdrop);
    document.body.appendChild(box);
    return box;
  }

  function openDrawer(options) { return openOverlay('drawer', options); }
  function openModal(options) { return openOverlay('modal', options); }
  function openSheet(options) { return openOverlay('sheet', options); }

  function showToast(message, error) {
    var node = document.createElement('div');
    node.className = 'toast';
    node.setAttribute('role', error ? 'alert' : 'status');
    node.textContent = message;
    document.body.appendChild(node);
    setTimeout(function () { node.remove(); }, 3400);
  }

  function signOut() {
    if (isPublicDemo() && typeof window.exitPublicDemo === 'function') { window.exitPublicDemo(); return; }
    if (window.Auth && typeof window.Auth.clear === 'function') window.Auth.clear();
    location.href = clean('/login?logout=1');
  }

  function switchWorkspace() {
    if (typeof window.openExperienceSelector === 'function') { window.openExperienceSelector(); return; }
    location.href = clean('/experience-select');
  }

  function openAccount() {
    openSheet({
      title: fullName(),
      html: '<div class="list-row" style="cursor:default"><span class="avatar">' + esc(initials()) + '</span><span class="who"><b>' + esc(fullName()) + '</b><span>' + esc(teamName()) + '</span></span></div>' +
        '<a class="list-row" href="' + esc(clean('/experience-select')) + '" style="text-decoration:none"><span class="who"><b>Switch workspace</b><span>Choose another ScoutLink experience</span></span><span class="chev">›</span></a>',
      footer: '<button class="btn danger" type="button" data-coach-signout>Sign out</button>'
    });
  }

  function openMore() {
    openSheet({
      title: 'More',
      html: '<a class="list-row" href="' + esc(clean('/coach/match-facts')) + '" style="text-decoration:none">' + ICONS.facts + '<span class="who"><b>Match Facts</b><span>Record post-match evidence</span></span><span class="chev">›</span></a>' +
        '<a class="list-row" href="' + esc(clean('/coach/video-reels')) + '" style="text-decoration:none">' + ICONS.video + '<span class="who"><b>Video Reels</b><span>Upload links and moderation</span></span><span class="chev">›</span></a>' +
        '<a class="list-row" href="' + esc(clean('/coach/add-player')) + '" style="text-decoration:none">' + ICONS.players + '<span class="who"><b>Add Player</b><span>New player assessment</span></span><span class="chev">›</span></a>' +
        '<a class="list-row" href="' + esc(clean('/coach/notifications')) + '" style="text-decoration:none">' + ICONS.bell + '<span class="who"><b>Notifications</b><span>Scout and platform activity</span></span><span class="chev">›</span></a>' +
        '<a class="list-row" href="' + esc(clean('/coach/settings')) + '" style="text-decoration:none">' + ICONS.settings + '<span class="who"><b>Settings</b><span>Team, account and preferences</span></span><span class="chev">›</span></a>' +
        '<a class="list-row" href="' + esc(clean('/coach/report-a-concern')) + '" style="text-decoration:none">' + ICONS.shield + '<span class="who"><b>Report a Concern</b><span>Safeguarding and trust</span></span><span class="chev">›</span></a>',
      footer: '<button class="btn danger full" type="button" data-coach-signout>Sign out</button>'
    });
  }

  function searchItems() {
    if (searchCache) return Promise.resolve(searchCache);
    if (searchLoading) return searchLoading;
    searchLoading = Promise.allSettled([api('GET', '/api/coaches/my-players'), api('GET', '/api/fixtures')]).then(function (results) {
      var players = results[0].status === 'fulfilled' ? list(results[0].value, ['data', 'players']) : [];
      var fixtures = results[1].status === 'fulfilled' ? list(results[1].value, ['data', 'fixtures']) : [];
      searchCache = players.map(function (p) {
        return { title: [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Player', meta: [p.age_group, p.specific_position || p.primary_position].filter(Boolean).join(' · '), href: '/player/profile?id=' + encodeURIComponent(p.id) };
      }).concat(fixtures.map(function (f) {
        return { title: 'vs ' + (f.opponent || 'Opponent'), meta: [f.fixture_date, f.venue].filter(Boolean).join(' · '), href: '/coach/fixtures?fixtureId=' + encodeURIComponent(f.id) };
      }));
      return searchCache;
    }).finally(function () { searchLoading = null; });
    return searchLoading;
  }

  function bindSearch(wrap) {
    if (!wrap || wrap.dataset.bound === '1') return;
    wrap.dataset.bound = '1';
    var input = wrap.querySelector('input');
    var panel = wrap.querySelector('.coach-search-results');
    if (!input || !panel) return;
    panel.style.cssText = 'display:none;position:absolute;left:0;right:0;top:46px;max-height:380px;overflow:auto;background:var(--paper);border:1px solid var(--line2);border-radius:16px;z-index:920;padding:6px;box-shadow:var(--shadow-2)';
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      if (q.length < 2) { panel.style.display = 'none'; return; }
      panel.style.display = 'block';
      panel.innerHTML = '<div class="list-row"><span class="mut">Searching…</span></div>';
      searchItems().then(function (items) {
        var matches = items.filter(function (x) { return (x.title + ' ' + x.meta).toLowerCase().indexOf(q) >= 0; }).slice(0, 10);
        panel.innerHTML = matches.length ? matches.map(function (x) {
          return '<a class="list-row" href="' + esc(clean(x.href)) + '" style="text-decoration:none"><span class="who"><b>' + esc(x.title) + '</b><span>' + esc(x.meta) + '</span></span></a>';
        }).join('') : '<div class="list-row"><span class="mut">No matches.</span></div>';
      });
    });
  }

  function refreshBadges() {
    return Promise.allSettled([
      api('GET', '/api/notifications?limit=100'), api('GET', '/api/coaches/my-players'), api('GET', '/api/chat/threads'), api('GET', '/api/videos?type=player'), api('GET', '/api/match-facts?limit=100')
    ]).then(function (r) {
      if (r[0].status === 'fulfilled') { var ns = list(r[0].value, ['data', 'notifications']); counts.notifications = Number(r[0].value.unreadCount != null ? r[0].value.unreadCount : ns.filter(function (x) { return !(x.is_read || x.isRead); }).length) || 0; }
      if (r[1].status === 'fulfilled') counts.players = list(r[1].value, ['data', 'players']).length;
      if (r[2].status === 'fulfilled') counts.chat = list(r[2].value, ['data', 'threads']).filter(function (x) { return Number(x.unread_count || x.unreadCount || 0) > 0; }).length;
      if (r[3].status === 'fulfilled') counts.videos = list(r[3].value, ['data', 'videos']).filter(function (x) { return String(x.moderation_status || x.status || '').toLowerCase() === 'pending'; }).length;
      if (r[4].status === 'fulfilled') counts.facts = list(r[4].value, ['data', 'matchFacts', 'matches']).filter(function (x) { return x.confirmed === false || String(x.status || '').toLowerCase() === 'draft'; }).length;
      refreshChrome(); hydrateField();
    }).catch(function () {});
  }

  function setTitle(title, subtitle) { titleOverride = title || ''; if (arguments.length > 1) subtitleOverride = subtitle || ''; refreshChrome(); hydrateField(); }
  function setSubtitle(value) { subtitleOverride = value || ''; refreshChrome(); hydrateField(); }
  function setFieldHeader(title, subtitle, rightHtml, leftHtml) {
    fieldTitleOverride = arguments.length > 0 ? String(title || '') : null;
    fieldSubtitleOverride = arguments.length > 1 ? String(subtitle || '') : null;
    fieldRightOverride = arguments.length > 2 ? String(rightHtml || '') : null;
    fieldLeftOverride = arguments.length > 3 ? String(leftHtml || '') : null;
    hydrateField();
  }
  function setTopChip() { /* V6 intentionally has no persistent global chip. */ }
  function setRouteActions(secondaryLabel, secondaryHref, primaryLabel, primaryHref) {
    if (secondaryLabel && typeof secondaryLabel === 'object') {
      var config = secondaryLabel || {};
      routeActions.secondary = config.secondary || null;
      routeActions.primary = config.primary || null;
    } else {
      routeActions.secondary = secondaryLabel ? { label: secondaryLabel, href: secondaryHref || '' } : null;
      routeActions.primary = primaryLabel ? { label: primaryLabel, href: primaryHref || '' } : null;
    }
    refreshChrome();
  }
  function refresh() { hydrateDesk(); hydrateField(); }

  function loadAdapter() {
    if (document.querySelector('script[data-coach-v6-adapter]')) return;
    var s = document.createElement('script');
    s.src = '/js/coach-design-v6.js?v=6.0.0';
    s.defer = true;
    s.dataset.coachV6Adapter = '1';
    document.head.appendChild(s);
  }

  function init() {
    if (!allowedCoach()) return;
    document.body.classList.add('coach-product');
    hydrateDesk();
    hydrateField();
    refreshBadges();
    loadAdapter();
    document.addEventListener('click', function (event) {
      var target = event.target;
      if (target.closest('[data-field-back]')) { event.preventDefault(); history.back(); return; }
      if (target.closest('[data-wizard-exit]')) { event.preventDefault(); location.href = clean('/coach/dashboard'); return; }
      if (target.closest('[data-coach-notifications]')) { event.preventDefault(); location.href = clean('/coach/notifications'); return; }
      if (target.closest('[data-coach-more]')) { event.preventDefault(); openMore(); return; }
      if (target.closest('[data-coach-account]')) { event.preventDefault(); openAccount(); return; }
      if (target.closest('[data-coach-signout]')) { event.preventDefault(); signOut(); return; }
      if (target.closest('[data-coach-switch]')) { event.preventDefault(); switchWorkspace(); return; }
      if (target.closest('[data-close-coach-overlay]') || target.classList && target.classList.contains('coach-drawer-backdrop')) { event.preventDefault(); closeAll(); }
    });
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeAll(); });
  }

  window.CoachV2 = {
    esc: esc, clean: clean, api: api, refresh: refresh, refreshBadges: refreshBadges,
    openDrawer: openDrawer, openModal: openModal, openSheet: openSheet, openOverlay: openOverlay,
    closeAll: closeAll, closeOverlay: closeAll, showToast: showToast,
    teamName: teamName, ageGroup: ageGroup, fullName: fullName, firstName: firstName, initials: initials,
    isPublicDemo: isPublicDemo, allowedCoach: allowedCoach, signOut: signOut,
    setTopChip: setTopChip, setTitle: setTitle, setSubtitle: setSubtitle, setFieldHeader: setFieldHeader, setRouteActions: setRouteActions
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
}());
