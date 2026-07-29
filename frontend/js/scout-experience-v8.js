/* ScoutLink Scout Experience V10 exact production adapter
   Source of truth: ScoutLink Scout Experience Full Redesign V10.
   The existing Scout Intelligence runtime remains responsible for real
   authenticated data and workflows. This file corrects presentation and
   supplies isolated, session-only public-demo workflows for Compare, Chat
   and Notifications. */
(function () {
  'use strict';

  var API_FALLBACK = 'https://scoutlink-api.vercel.app';
  var DEMO_CHAT_KEY = 'sl_scout_v10_demo_chat';
  var DEMO_NOTIFICATION_KEY = 'sl_scout_v10_demo_notifications';
  var V10_VERSION = '20260729.10.1';

  var ROUTES = [
    { id:'dashboard', code:'DB', label:'Dashboard', href:'/scout/dashboard', group:'Core' },
    { id:'search', code:'PS', label:'Player search', href:'/scout/player-search', group:'Core' },
    { id:'pipeline', code:'MP', label:'My pipeline', href:'/scout/pipeline', group:'Core' },
    { id:'rankings', code:'RK', label:'Rankings', href:'/scout/rankings', group:'Core' },
    { id:'fixtures', code:'FX', label:'Fixtures', href:'/scout/fixtures', group:'Scouting tools' },
    { id:'predictions', code:'PR', label:'Predictions', href:'/scout/predictions', group:'Scouting tools' },
    { id:'exports', code:'EX', label:'Exports', href:'/scout/exports', group:'Scouting tools' },
    { id:'compare', code:'CP', label:'Compare players', href:'/scout/compare-players', group:'Scouting tools' },
    { id:'setup', code:'SS', label:'Scout setup', href:'/scout/setup', group:'Scouting tools' },
    { id:'events', code:'EV', label:'Events', href:'/scout/events', group:'Network' },
    { id:'chat', code:'CH', label:'Chat', href:'/scout/chat', group:'Network' },
    { id:'notifications', code:'NT', label:'Notifications', href:'/scout/notifications', group:'Network' },
    { id:'concern', code:'RC', label:'Report a concern', href:'/scout/report-a-concern', group:'Network' },
    { id:'usage', code:'UR', label:'Usage requests', href:'/scout/usage-requests', group:'Account' },
    { id:'settings', code:'ST', label:'Settings', href:'/scout/settings', group:'Account' }
  ];

  var TITLES = {
    confirm:'Scout onboarding',
    dashboard:'Scout workspace',
    search:'Player search',
    profile:'Player profile',
    pipeline:'My pipeline',
    rankings:'Rankings',
    fixtures:'Fixtures',
    predictions:'Predictions',
    usage:'Usage requests',
    exports:'Exports',
    compare:'Compare players',
    setup:'Scout setup',
    events:'Events',
    chat:'Chat',
    notifications:'Notifications',
    concern:'Report a concern',
    settings:'Settings'
  };

  var PATHS = {
    '/scout/onboarding':'confirm',
    '/confirm-password':'confirm',
    '/scout/dashboard':'dashboard',
    '/scout/player-search':'search',
    '/player/profile':'profile',
    '/scout/pipeline':'pipeline',
    '/scout/rankings':'rankings',
    '/scout/fixtures':'fixtures',
    '/scout/predictions':'predictions',
    '/scout/usage-requests':'usage',
    '/scout/exports':'exports',
    '/scout/compare-players':'compare',
    '/scout/setup':'setup',
    '/scout/events':'events',
    '/scout/chat':'chat',
    '/scout/notifications':'notifications',
    '/scout/report-a-concern':'concern',
    '/scout/settings':'settings'
  };

  var playerPromise = null;
  var playerMap = Object.create(null);
  var observer = null;
  var scheduled = false;
  var decorating = false;

  function q(root, selector) {
    return (root || document).querySelector(selector);
  }

  function qa(root, selector) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return {
        '&':'&amp;',
        '<':'&lt;',
        '>':'&gt;',
        '"':'&quot;',
        "'":'&#39;'
      }[character];
    });
  }

  function number(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : (fallback == null ? 0 : fallback);
  }

  function clamp(value) {
    return Math.max(0, Math.min(100, Math.round(number(value, 0))));
  }

  function cleanPath() {
    return String(window.location.pathname || '/').replace(/\/+$/, '') || '/';
  }

  function routeId() {
    var declared = document.body && document.body.getAttribute('data-scout-route');
    if (declared) return declared;
    return PATHS[cleanPath()] || '';
  }

  function activeRoute() {
    return routeId() === 'profile' ? 'search' : routeId();
  }

  function isMobile() {
    return window.matchMedia('(max-width:767px)').matches;
  }

  function token() {
    try {
      return localStorage.getItem('sl_token') || '';
    } catch (_) {
      return '';
    }
  }

  function isPublicDemo() {
    try {
      return sessionStorage.getItem('sl_public_demo') === '1' ||
        token() === 'public-demo-session';
    } catch (_) {
      return token() === 'public-demo-session';
    }
  }

  function currentUser() {
    try {
      return JSON.parse(localStorage.getItem('sl_user') || '{}') || {};
    } catch (_) {
      return {};
    }
  }

  function userName() {
    var user = currentUser();
    return user.name ||
      [user.first_name || user.firstName, user.last_name || user.lastName]
        .filter(Boolean)
        .join(' ') ||
      'Noah Patel';
  }

  function firstName() {
    return userName().split(/\s+/)[0] || 'Noah';
  }

  function initialsFromName(name) {
    return String(name || 'ScoutLink Scout')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(function (part) { return part.charAt(0); })
      .join('')
      .toUpperCase() || 'SL';
  }

  function apiBase() {
    var configured = '';
    try {
      configured = window.API || localStorage.getItem('sl_api_url') || '';
    } catch (_) {}
    return String(configured || API_FALLBACK).replace(/\/+$/, '');
  }

  async function api(method, path, body, includeAuth) {
    var headers = { Accept:'application/json' };
    var auth = token();
    if (includeAuth !== false && auth) headers.Authorization = 'Bearer ' + auth;
    if (body !== undefined && body !== null) headers['Content-Type'] = 'application/json';

    var response = await fetch(apiBase() + path, {
      method:method,
      headers:headers,
      credentials:'include',
      body:body === undefined || body === null ? undefined : JSON.stringify(body)
    });

    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      throw new Error(payload.error || payload.message || 'The request could not be completed.');
    }
    return payload;
  }

  function money(value) {
    var amount = number(value, 0);
    if (!amount) return 'Not assessed';
    if (amount >= 1000000) {
      return '£' + (amount / 1000000).toFixed(amount % 1000000 ? 1 : 0) + 'm';
    }
    if (amount >= 1000) return '£' + Math.round(amount / 1000) + 'k';
    return '£' + Math.round(amount).toLocaleString('en-GB');
  }

  function playerName(player) {
    return [player && player.first_name, player && player.last_name]
      .filter(Boolean)
      .join(' ') ||
      (player && player.name) ||
      'Player';
  }

  function playerPosition(player) {
    return player && (
      player.specific_position ||
      player.primary_position ||
      player.position_group
    ) || 'Position TBC';
  }

  function playerAge(player) {
    return player && (
      player.age_group ||
      (player.age ? 'U' + player.age : '')
    ) || 'Age TBC';
  }

  function playerTeam(player) {
    return player && (
      player.team_name ||
      (player.team && player.team.team_name)
    ) || 'Team TBC';
  }

  function playerRegion(player) {
    return player && (
      player.region ||
      player.team_city ||
      (player.team && (player.team.city || player.team.county))
    ) || 'Not set';
  }

  function playerFit(player) {
    return clamp(
      player && (
        player.compatibilityScore ||
        player.compatibility_score ||
        player.compatibility
      )
    );
  }

  function playerOverall(player) {
    return clamp(player && (player.overall_rating || player.overall || 0));
  }

  function playerEvidence(player) {
    var score = number(player && (player.evidence_score || player.dataConfidence), 0);
    if (score >= 80) return 'Strong';
    if (score >= 60) return 'Medium';
    if (score >= 40) return 'Low';
    return 'Very low';
  }

  function playerInitials(player) {
    return initialsFromName(playerName(player));
  }

  function playerLine(player) {
    return [
      playerPosition(player),
      playerAge(player),
      playerTeam(player)
    ].filter(Boolean).join(' · ');
  }

  function profileUrl(player) {
    return '/player/profile?id=' + encodeURIComponent(player && player.id || '');
  }

  function toast(message, error) {
    qa(document, '.slv10-toast').forEach(function (node) { node.remove(); });
    var node = document.createElement('div');
    node.className = 'slv10-toast' + (error ? ' error' : '');
    node.setAttribute('role', error ? 'alert' : 'status');
    node.textContent = message;
    document.body.appendChild(node);
    window.setTimeout(function () { node.remove(); }, 4200);
  }

  function downloadText(filename, content, mime) {
    var blob = new Blob([content], { type:mime || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function fallbackPlayers() {
    return [
      {
        id:'demo-ethan-cole',
        first_name:'Ethan',
        last_name:'Cole',
        specific_position:'ST',
        age_group:'U16',
        team_name:'Northgate United',
        region:'London',
        overall_rating:84,
        compatibilityScore:86,
        evidence_score:82,
        transfer_value:160000,
        pace:87, agility:88, strength:82, stamina:91, jumping:83,
        composure:90, shooting:84, passing:89, dribbling:86,
        defending:58, vision:91, positioning:88, goals:14,
        appearances:18,
        compatibilityBreakdown:{
          needFit:90, roleFit:86, tacticalStyleFit:88,
          formationPositionFit:92, dataConfidence:82
        }
      },
      {
        id:'demo-reuben-hughes',
        first_name:'Reuben',
        last_name:'Hughes',
        specific_position:'ST',
        age_group:'U16',
        team_name:'Eastbrook Athletic',
        region:'Manchester',
        overall_rating:85,
        compatibilityScore:82,
        evidence_score:88,
        transfer_value:344000,
        pace:84, agility:82, strength:91, stamina:88, jumping:89,
        composure:85, shooting:86, passing:81, dribbling:82,
        defending:60, vision:83, positioning:88, goals:13,
        appearances:17,
        compatibilityBreakdown:{
          needFit:87, roleFit:83, tacticalStyleFit:85,
          formationPositionFit:86, dataConfidence:88
        }
      },
      {
        id:'demo-carter-hill',
        first_name:'Carter',
        last_name:'Hill',
        specific_position:'RW',
        age_group:'U16',
        team_name:'Northgate United',
        region:'London',
        overall_rating:82,
        compatibilityScore:83,
        evidence_score:78,
        transfer_value:145000,
        pace:91, agility:90, strength:69, stamina:84, jumping:70,
        composure:82, shooting:80, passing:84, dribbling:89,
        defending:48, vision:86, positioning:80, goals:12,
        appearances:19,
        compatibilityBreakdown:{
          needFit:85, roleFit:87, tacticalStyleFit:90,
          formationPositionFit:88, dataConfidence:78
        }
      },
      {
        id:'demo-maya-johnson',
        first_name:'Maya',
        last_name:'Johnson',
        specific_position:'CAM',
        age_group:'U15',
        team_name:'Eastbrook Athletic',
        region:'Manchester',
        overall_rating:80,
        compatibilityScore:81,
        evidence_score:68,
        transfer_value:128000,
        pace:81, agility:88, strength:64, stamina:82, jumping:62,
        composure:88, shooting:78, passing:91, dribbling:87,
        defending:55, vision:93, positioning:84, goals:11,
        appearances:18,
        compatibilityBreakdown:{
          needFit:84, roleFit:89, tacticalStyleFit:88,
          formationPositionFit:84, dataConfidence:68
        }
      }
    ];
  }

  function rememberPlayers(players) {
    (players || []).forEach(function (player) {
      if (player && player.id != null) playerMap[String(player.id)] = player;
    });
    return players || [];
  }

  function loadPlayers() {
    if (playerPromise) return playerPromise;

    playerPromise = (async function () {
      try {
        var response;
        if (isPublicDemo()) {
          response = await api('GET', '/api/players/public-demo', null, false);
        } else {
          response = await api('GET', '/api/scout-intelligence-v64/players');
        }
        var rows = response.data || response.players || [];
        if (!Array.isArray(rows) || !rows.length) throw new Error('No players returned.');
        return rememberPlayers(rows);
      } catch (_) {
        return rememberPlayers(fallbackPlayers());
      }
    }());

    return playerPromise;
  }

  function rootNode() {
    return document.getElementById('scoutExperienceApp') ||
      q(document, '.usage-shell') ||
      q(document, '.scout-page');
  }

  function navMarkup(containerClass) {
    var current = activeRoute();
    var groups = ['Core', 'Scouting tools', 'Network', 'Account'];
    return groups.map(function (group) {
      var links = ROUTES.filter(function (route) {
        return route.group === group;
      }).map(function (route) {
        return '<a class="nav-link ' + (route.id === current ? 'active' : '') +
          '" href="' + route.href + '"' +
          (route.id === current ? ' aria-current="page"' : '') + '>' +
          '<span>' + route.code + '</span><b>' + esc(route.label) + '</b></a>';
      }).join('');
      return '<section class="nav-group"><small>' + esc(group) + '</small>' +
        links + '</section>';
    }).join('');
  }

  function rebuildSidebar(root) {
    var sidebar = q(root, '.sidebar');
    if (!sidebar) return;

    sidebar.classList.add('scout-sidebar');
    var logoWrap = q(sidebar, '.side-logo');
    if (logoWrap) {
      logoWrap.classList.add('sidebar-logo');
      var logo = q(logoWrap, '.logo');
      if (logo) {
        logo.classList.add('sl-logo');
        logo.href = '/scout/dashboard';
        logo.innerHTML = 'Scout<span>Link</span>';
      }
    }

    var nav = q(sidebar, '.side-nav');
    var current = activeRoute();
    if (nav && nav.dataset.v10Route !== current) {
      nav.innerHTML = navMarkup();
      nav.dataset.v10Route = current;
    }

    var user = q(sidebar, '.side-user');
    if (user) {
      user.classList.add('sidebar-user');
      var avatar = q(user, '.user-avatar,.initials,.avatar');
      if (avatar) {
        avatar.classList.add('initials-box');
        avatar.textContent = initialsFromName(userName());
      }
      var nameNode = q(user, 'b,[data-live-user-name]');
      if (nameNode) nameNode.textContent = userName();
      var roleNode = q(user, '[data-live-user-role],span');
      if (roleNode && roleNode !== avatar) {
        roleNode.textContent = 'Reviewed Scout · ' + (isPublicDemo() ? 'Elite' : 'Scout');
      }
    }
  }

  function topbarMarkup() {
    var title = TITLES[routeId()] || 'Scout workspace';
    var unread = isPublicDemo() ? '<i>3</i>' : '';
    return '<div><span>Scout workspace</span><h1>' + esc(title) + '</h1></div>' +
      '<div class="top-actions">' +
      '<a class="icon-btn" href="/scout/notifications" aria-label="Notifications">NT' + unread + '</a>' +
      '<span class="team-chip">ScoutLink Recruitment Team</span>' +
      '<a class="user-btn" href="/scout/settings">' +
      '<span class="initials-box small">' + esc(initialsFromName(userName())) + '</span>' +
      '<b>' + esc(firstName()) + '</b></a></div>';
  }

  function rebuildTopbar(root) {
    var topbar = q(root, '.workspace-top');
    if (!topbar) return;
    topbar.classList.add('desktop-topbar');
    var current = routeId();
    if (topbar.dataset.v10Route !== current) {
      topbar.innerHTML = topbarMarkup();
      topbar.dataset.v10Route = current;
    }
  }

  function decorateButtons(root) {
    qa(root, '.hero .btn').forEach(function (button) {
      if (!button.classList.contains('primary')) button.classList.add('ghost');
    });
    qa(root, '.panel .btn:not(.primary),.compare-selection .btn:not(.primary),.comparison-actions .btn:not(.primary)').forEach(function (button) {
      button.classList.add('secondary');
    });
    qa(root, '.text-action').forEach(function (button) {
      button.setAttribute('type', button.getAttribute('type') || 'button');
    });
  }

  function restructureProfile(root) {
    if (routeId() !== 'profile') return;

    var head = q(root, '.profile-head');
    if (head) {
      head.classList.add('profile-hero');
      qa(head, '.initials,.profile-avatar').forEach(function (node) {
        node.classList.add('initials-box');
      });
    }

    var summary = q(root, '.rating-summary-grid');
    if (summary) summary.classList.add('rating-summary');
    var detail = q(root, '.rating-detail-layout');
    if (detail) detail.classList.add('rating-layout');
    var roleCard = q(root, '.role-analysis-card');
    if (roleCard) roleCard.classList.add('role-card');

    var profileRow = q(root, '.profile-three-column');
    if (
      profileRow &&
      profileRow.dataset.v10Aligned !== '1' &&
      profileRow.children.length >= 3
    ) {
      var panels = Array.prototype.slice.call(profileRow.children);
      var stack = document.createElement('div');
      stack.className = 'profile-side-stack';
      panels.slice(1).forEach(function (panel) { stack.appendChild(panel); });
      profileRow.appendChild(stack);
      profileRow.classList.add('profile-three', 'aligned-profile-row');
      profileRow.dataset.v10Aligned = '1';
    }

    var evidence = q(root, '.evidence-grid');
    if (evidence) evidence.classList.add('evidence-grid');
    var valueHead = q(root, '.value-head');
    if (valueHead) valueHead.classList.add('value-head');
  }

  function decorateCoreClasses(root) {
    root.classList.toggle('desktop-site', !isMobile());
    root.classList.toggle('mobile-site', isMobile());

    var page = q(root, '.scout-page');
    if (page) page.classList.add('desktop-shell');

    var content = q(root, '.content');
    if (content) content.classList.add('workspace-content', 'mobile-content');

    qa(root, '.hero').forEach(function (hero) {
      hero.classList.add('page-hero', 'navy');
    });

    qa(root, '.metric-grid').forEach(function (grid) {
      grid.classList.add('metric-strip');
      if (grid.children.length === 3) grid.classList.add('three');
    });

    qa(root, '.split').forEach(function (grid) { grid.classList.add('two-col'); });
    qa(root, '.grid3').forEach(function (grid) { grid.classList.add('three-col'); });

    var lower = q(root, '.dashboard-lower-grid');
    if (lower) lower.classList.add('two-col');

    if (routeId() === 'dashboard') {
      var heading = q(root, '.hero h2');
      if (heading) heading.textContent = 'Good morning, ' + firstName() + '.';
      var review = qa(root, '.hero button').find(function (button) {
        return /review top matches|review compatible players/i.test(button.textContent);
      });
      if (review) review.textContent = 'Review compatible players';
      var pipelineMetric = qa(root, '.metric-grid .metric small').find(function (node) {
        return /active pipeline/i.test(node.textContent);
      });
      if (pipelineMetric) pipelineMetric.textContent = 'Active pipeline';
    }

    decorateButtons(root);
    restructureProfile(root);
  }

  function drawerMarkup() {
    return '<aside class="slv10-drawer" id="slv10Drawer" aria-hidden="true">' +
      '<header class="slv10-drawer-head">' +
      '<a class="sl-logo" href="/scout/dashboard">Scout<span>Link</span></a>' +
      '<button class="slv10-drawer-close" type="button" data-v10-close-menu aria-label="Close menu">×</button>' +
      '</header><nav aria-label="Scout workspace">' +
      navMarkup() +
      '</nav></aside>' +
      '<button class="slv10-drawer-backdrop" type="button" data-v10-close-menu aria-label="Close menu"></button>';
  }

  function ensureDrawer() {
    if (!q(document, '#slv10Drawer')) {
      document.body.insertAdjacentHTML('beforeend', drawerMarkup());
    }
  }

  function menuButtons() {
    return qa(document, '[data-global-menu],.mobile-top button,.mobile-nav button,.mobile-bottom button')
      .filter(function (button) {
        return button.hasAttribute('data-global-menu') ||
          /menu|more/i.test(String(button.textContent || ''));
      });
  }

  function setMenu(open) {
    ensureDrawer();
    var drawer = q(document, '#slv10Drawer');
    var backdrop = q(document, '.slv10-drawer-backdrop');
    if (!drawer || !backdrop) return;

    drawer.classList.toggle('open', Boolean(open));
    backdrop.classList.toggle('open', Boolean(open));
    drawer.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('slv10-menu-open', Boolean(open));

    menuButtons().forEach(function (button) {
      button.setAttribute('aria-expanded', String(Boolean(open)));
      button.setAttribute('aria-controls', 'slv10Drawer');
    });
  }

  function bindMenu() {
    ensureDrawer();

    menuButtons().forEach(function (button) {
      if (button.dataset.v10MenuBound === '1') return;
      button.dataset.v10MenuBound = '1';
      button.setAttribute('type', 'button');
      button.setAttribute('aria-label', /more/i.test(button.textContent) ? 'Open more Scout pages' : 'Open Scout menu');
      button.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        var drawer = q(document, '#slv10Drawer');
        setMenu(!(drawer && drawer.classList.contains('open')));
      });
    });

    qa(document, '[data-v10-close-menu]').forEach(function (button) {
      if (button.dataset.v10CloseBound === '1') return;
      button.dataset.v10CloseBound = '1';
      button.addEventListener('click', function () { setMenu(false); });
    });

    var drawer = q(document, '#slv10Drawer');
    if (drawer && drawer.dataset.v10LinksBound !== '1') {
      drawer.dataset.v10LinksBound = '1';
      drawer.addEventListener('click', function (event) {
        if (event.target.closest('a')) setMenu(false);
      });
    }
  }

  function ensureMobileNavigation(root) {
    if (!isMobile()) return;

    var existing = q(root, '.mobile-bottom,.mobile-nav');
    var current = activeRoute();
    var activeMore = ['rankings','fixtures','predictions','usage','exports','compare','setup','events','notifications','concern','settings'].indexOf(current) >= 0;

    var markup =
      '<a class="' + (current === 'dashboard' ? 'active' : '') + '" href="/scout/dashboard"><span>HM</span><b>Home</b></a>' +
      '<a class="' + (current === 'search' ? 'active' : '') + '" href="/scout/player-search"><span>PS</span><b>Search</b></a>' +
      '<a class="' + (current === 'pipeline' ? 'active' : '') + '" href="/scout/pipeline"><span>MP</span><b>Pipeline</b></a>' +
      '<a class="' + (current === 'chat' ? 'active' : '') + '" href="/scout/chat"><span>CH</span><b>Chat</b></a>' +
      '<button class="' + (activeMore ? 'active' : '') + '" type="button" data-global-menu><span>MR</span><b>More</b></button>';

    if (!existing) {
      existing = document.createElement('nav');
      existing.className = 'mobile-nav';
      existing.setAttribute('aria-label', 'Scout mobile navigation');
      root.appendChild(existing);
    }

    existing.classList.add('mobile-nav');
    if (existing.dataset.v10Route !== current) {
      existing.innerHTML = markup;
      existing.dataset.v10Route = current;
    }
  }

  function ensureMobileTopbar(root) {
    if (!isMobile()) return;
    var existing = q(root, '.mobile-top,.slv10-mobile-topbar');
    if (!existing) {
      var workspace = q(root, '.workspace') || root;
      existing = document.createElement('header');
      existing.className = 'slv10-mobile-topbar';
      workspace.insertBefore(existing, workspace.firstChild);
    }
    existing.classList.add('slv10-mobile-topbar');
    var current = routeId();
    if (existing.dataset.v10Route !== current) {
      existing.innerHTML =
        '<a class="sl-logo" href="/scout/dashboard">Scout<span>Link</span></a>' +
        '<strong>' + esc(TITLES[current] || 'Scout workspace') + '</strong>' +
        '<button type="button" data-global-menu>Menu</button>';
      existing.dataset.v10Route = current;
    }
  }

  function decorateSearchRows(root) {
    if (routeId() !== 'search') return;
    var table = q(root, '.search-table table');
    if (!table) return;

    table.classList.add('scout-v10-search-table');
    var header = q(table, 'thead tr');
    if (header && header.dataset.v10Header !== '1') {
      header.innerHTML =
        '<th>Player</th><th>Region</th><th>Fit</th><th>Evidence</th>' +
        '<th>Rating</th><th>Value</th><th></th>';
      header.dataset.v10Header = '1';
    }

    qa(table, 'tbody tr[data-player-id]').forEach(function (row) {
      if (row.dataset.v10Row === '1') return;
      var cells = Array.prototype.slice.call(row.children);
      if (cells.length < 7) return;

      var id = row.dataset.playerId;
      var playerCellHtml = cells[0].innerHTML;
      var positionAge = String(cells[1].textContent || '').trim();
      var region = cells[2] ? cells[2].textContent.trim() : 'Not set';
      var fit = cells[3] ? cells[3].textContent.trim() : '—';
      var evidence = cells[4] ? cells[4].textContent.trim() : 'Very low';
      var value = cells[5] ? cells[5].textContent.trim() : 'Not assessed';
      var player = playerMap[String(id)] || null;
      var rating = player ? playerOverall(player) : '—';

      var temp = document.createElement('div');
      temp.innerHTML = playerCellHtml;
      var small = q(temp, 'small');
      if (small) {
        var team = small.textContent.trim();
        small.textContent = positionAge + (team ? ' · ' + team : '');
      }

      var evidenceClass = /strong|high/i.test(evidence)
        ? 'green'
        : /medium/i.test(evidence)
          ? 'gold'
          : /low/i.test(evidence)
            ? 'red'
            : 'green';

      row.innerHTML =
        '<td>' + temp.innerHTML + '</td>' +
        '<td>' + esc(region) + '</td>' +
        '<td><strong>' + esc(fit) + '</strong></td>' +
        '<td><span class="status ' + evidenceClass + '">' + esc(evidence) + '</span></td>' +
        '<td data-v10-player-rating="' + esc(id) + '">' + esc(rating) + '</td>' +
        '<td>' + esc(value) + '</td>' +
        '<td><button class="text-action" type="button" data-v10-open-player>View profile</button></td>';

      row.dataset.v10Row = '1';
      var open = q(row, '[data-v10-open-player]');
      if (open) {
        open.addEventListener('click', function () {
          window.location.assign('/player/profile?id=' + encodeURIComponent(id));
        });
      }
    });

    loadPlayers().then(function (players) {
      players.forEach(function (player) {
        var selector = '[data-v10-player-rating="' +
          String(player.id).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]';
        var rating = q(root, selector);
        var nextRating = String(playerOverall(player) || '—');
        if (rating && rating.textContent !== nextRating) rating.textContent = nextRating;
      });
    });
  }

  function decoratePagination(root) {
    if (routeId() !== 'search') return;

    var original = q(root, '.pagination[data-search-pagination]');
    if (!original || !original.children.length) {
      var old = q(root, '.v10-compact-pagination');
      if (old) old.remove();
      return;
    }

    var footer = original.nextElementSibling;
    if (!footer || !footer.classList.contains('v10-compact-pagination')) {
      footer = document.createElement('footer');
      footer.className = 'v10-compact-pagination';
      original.insertAdjacentElement('afterend', footer);
    }

    var active = q(original, '[aria-current="page"]');
    var currentPage = active ? number(active.textContent, 1) : 1;
    var summaryText = (q(root, '[data-search-summary]') || {}).textContent || '';
    var match = summaryText.match(/Showing\s+(\d+)[–-](\d+)\s+of\s+(\d+)/i);
    var first = match ? number(match[1], 0) : 0;
    var last = match ? number(match[2], 0) : 0;
    var total = match ? number(match[3], 0) : 0;
    var pageCount = Math.max(1, Math.ceil(total / 20));

    var paginationKey = [first, last, total, currentPage, pageCount].join('|');
    if (footer.dataset.v10PaginationKey !== paginationKey) {
      footer.innerHTML =
        '<span>' + first + '–' + last + ' of ' + total + '</span>' +
        '<div><button type="button" data-v10-page-prev aria-label="Previous page"' +
        (currentPage <= 1 ? ' disabled' : '') + '>‹</button>' +
        '<b>' + currentPage + ' / ' + pageCount + '</b>' +
        '<button type="button" data-v10-page-next aria-label="Next page"' +
        (currentPage >= pageCount ? ' disabled' : '') + '>›</button></div>';
      footer.dataset.v10PaginationKey = paginationKey;
    }

    var previous = qa(original, 'button').find(function (button) {
      return /^previous$/i.test(button.textContent.trim());
    });
    var next = qa(original, 'button').find(function (button) {
      return /^next$/i.test(button.textContent.trim());
    });

    var prevButton = q(footer, '[data-v10-page-prev]');
    var nextButton = q(footer, '[data-v10-page-next]');
    if (prevButton && previous) {
      prevButton.onclick = function () { previous.click(); };
    }
    if (nextButton && next) {
      nextButton.onclick = function () { next.click(); };
    }
  }

  function demoCompareMarkup() {
    return '<section class="page-hero navy">' +
      '<div><span>Comparison decision engine</span>' +
      '<h2>Compare two players in the real recruitment context.</h2>' +
      '<p>Select two accessible player records. The decision context changes the category weights and the recommendation.</p></div>' +
      '<div class="button-row hero-actions"><button class="btn primary" type="button" data-v10-new-comparison>New comparison</button></div></section>' +
      '<section class="metric-strip">' +
      '<article><small>Accessible players</small><strong data-v10-compare-count>0</strong><p>Current database</p></article>' +
      '<article><small>Selected players</small><strong data-v10-selected-count>0 / 2</strong><p>Two different records</p></article>' +
      '<article><small>Decision context</small><strong data-v10-context-label>Immediate starter</strong><p>Changes category weights</p></article>' +
      '<article><small>Current plan</small><strong>Elite</strong><p>Comparison uses no prediction credit</p></article></section>' +
      '<section class="compare-selection">' +
      '<div><label class="field"><span>Player A</span><select class="control" data-v10-player-a><option value="">Choose player A</option></select></label><article class="selected-player" data-v10-selected-a><span>Choose a player</span></article></div>' +
      '<div><label class="field"><span>Player B</span><select class="control" data-v10-player-b><option value="">Choose player B</option></select></label><article class="selected-player" data-v10-selected-b><span>Choose a player</span></article></div>' +
      '</section>' +
      '<section class="compare-context">' +
      '<label class="field"><span>Decision context</span><select class="control" data-v10-compare-context>' +
      '<option>Immediate starter</option><option>Development prospect</option><option>Specific tactical role</option><option>Low financial risk</option><option>Resale upside</option><option>Squad depth</option></select></label>' +
      '<label class="field"><span>Target position</span><select class="control" data-v10-compare-position>' +
      '<option>Current roles</option><option>GK</option><option>CB</option><option>RB</option><option>LB</option><option>CDM</option><option>CM</option><option>CAM</option><option>LW</option><option>RW</option><option>ST</option></select></label>' +
      '<label class="field"><span>Budget</span><input class="control" data-v10-compare-budget type="number" min="0" step="1000" placeholder="Optional"></label>' +
      '<button class="btn primary" type="button" data-v10-run-comparison>Compare and explain</button></section>' +
      '<div class="recommendation" data-v10-compare-status hidden></div>' +
      '<div data-v10-comparison-results hidden></div>';
  }

  function selectedPlayerMarkup(player) {
    if (!player) return '<span>Choose a player</span>';
    return '<span class="initials-box">' + esc(playerInitials(player)) + '</span>' +
      '<div><b>' + esc(playerName(player)) + '</b><small>' +
      esc(playerLine(player)) + '</small></div>' +
      '<strong>' + esc(playerOverall(player) || '—') + '</strong>';
  }

  function metricScore(player, keys, fallback) {
    var values = keys.map(function (key) { return number(player && player[key], NaN); })
      .filter(Number.isFinite);
    if (!values.length) return clamp(fallback);
    return clamp(values.reduce(function (sum, value) { return sum + value; }, 0) / values.length);
  }

  function breakdownScore(player, keys, fallback) {
    var source = player && (
      player.compatibilityBreakdown ||
      player.compatibility_breakdown ||
      player.compatibility ||
      {}
    ) || {};
    for (var index = 0; index < keys.length; index += 1) {
      if (source[keys[index]] != null) return clamp(source[keys[index]]);
    }
    return clamp(fallback);
  }

  function localComparison(playerA, playerB, contextLabel) {
    var contexts = {
      'Immediate starter':[.16,.14,.12,.14,.16,.12,.08,.08],
      'Development prospect':[.12,.12,.12,.08,.10,.12,.10,.24],
      'Specific tactical role':[.14,.18,.10,.08,.12,.20,.12,.06],
      'Low financial risk':[.10,.10,.08,.08,.12,.10,.08,.12],
      'Resale upside':[.12,.10,.12,.08,.10,.10,.08,.16],
      'Squad depth':[.12,.12,.10,.10,.16,.14,.12,.04]
    };
    var weights = contexts[contextLabel] || contexts['Immediate starter'];

    function categories(player) {
      var output = player.appearances
        ? clamp((number(player.goals) + number(player.assists)) / Math.max(1, number(player.appearances)) * 100)
        : playerOverall(player);
      return [
        ['Technical quality', metricScore(player, ['shooting','passing','dribbling','vision','composure'], playerOverall(player))],
        ['Tactical intelligence', metricScore(player, ['positioning','vision','composure'], playerOverall(player))],
        ['Physical profile', metricScore(player, ['pace','agility','strength','stamina','jumping'], playerOverall(player))],
        ['Match output', output],
        ['Need fit', breakdownScore(player, ['needFit','need_fit'], playerFit(player))],
        ['Role fit', breakdownScore(player, ['roleFit','role_fit'], playerFit(player))],
        ['Formation fit', breakdownScore(player, ['formationPositionFit','formation_fit','formationFit'], playerFit(player))],
        ['Evidence fit', clamp(player.evidence_score || player.dataConfidence || 55)]
      ];
    }

    var a = categories(playerA);
    var b = categories(playerB);
    var totalA = 0;
    var totalB = 0;
    var rows = a.map(function (row, index) {
      var aValue = row[1];
      var bValue = b[index][1];
      totalA += aValue * weights[index];
      totalB += bValue * weights[index];
      return {
        category:row[0],
        playerA:aValue,
        playerB:bValue,
        weight:weights[index],
        winner:aValue === bValue ? 'Tie' : aValue > bValue ? playerName(playerA) : playerName(playerB),
        margin:Math.abs(aValue - bValue)
      };
    });

    var winner = totalA === totalB ? null : totalA > totalB ? playerA : playerB;
    var runner = winner === playerA ? playerB : playerA;
    var margin = Math.abs(totalA - totalB);

    return {
      context:{ label:contextLabel },
      playerA:{ totalScore:totalA },
      playerB:{ totalScore:totalB },
      winnerPlayerId:winner && winner.id,
      decisionScoreMargin:margin,
      recommendation:winner
        ? playerName(winner) + ' is the stronger ' + contextLabel.toLowerCase() +
          ' fit. The weighted football context creates a ' + margin.toFixed(1) +
          '-point decision-score advantage over ' + playerName(runner) + '.'
        : 'The two players are level in this context. Review the category trade-offs and live evidence.',
      categories:rows,
      changeFactors:[
        'Changing the decision context changes the category weights.',
        'Additional recent Match Facts can change evidence confidence and readiness.',
        'A different target position or budget can change role and financial fit.'
      ],
      tradeOff:'Immediate team fit must be balanced against physical output, evidence strength and working value.'
    };
  }

  function comparisonRows(result, playerA, playerB) {
    var rows = Array.isArray(result.categories) ? result.categories : [];
    return rows.map(function (row) {
      var aValue = row.playerA != null ? row.playerA : row.player_a;
      var bValue = row.playerB != null ? row.playerB : row.player_b;
      var winner = row.winner || (
        number(aValue) === number(bValue)
          ? 'Tie'
          : number(aValue) > number(bValue)
            ? playerName(playerA)
            : playerName(playerB)
      );
      return '<div class="compare-category-row">' +
        '<span>' + esc(row.category || row.name || 'Category') + '</span>' +
        '<b>' + esc(Math.round(number(aValue, 0))) + '</b>' +
        '<b>' + esc(Math.round(number(bValue, 0))) + '</b>' +
        '<span>' + esc(winner) + '</span></div>';
    }).join('');
  }

  function comparePlayerCard(player, total) {
    return '<article class="compare-player-card">' +
      '<span class="initials-box">' + esc(playerInitials(player)) + '</span>' +
      '<div><h4>' + esc(playerName(player)) + '</h4><p>' +
      esc(playerPosition(player) + ' · ' + playerAge(player) + ' · ' +
        money(player.transfer_value) + ' · Fit ' + playerFit(player) + '%') +
      '</p></div><strong>' + esc(number(total, playerOverall(player)).toFixed(1)) +
      '</strong></article>';
  }

  function renderDemoComparison(results, playerA, playerB, result) {
    var totalA = number(result && result.playerA && result.playerA.totalScore, playerOverall(playerA));
    var totalB = number(result && result.playerB && result.playerB.totalScore, playerOverall(playerB));
    var winnerId = result && result.winnerPlayerId;
    var winner = winnerId
      ? (String(winnerId) === String(playerA.id) ? playerA : playerB)
      : (totalA === totalB ? null : totalA > totalB ? playerA : playerB);
    var margin = number(result && result.decisionScoreMargin, Math.abs(totalA - totalB));
    var changeFactors = result && result.changeFactors || [
      'Changing the decision context changes the category weights.',
      'Additional current Match Facts can change the evidence score.',
      'A different target position or budget can change the recommendation.'
    ];

    results.innerHTML =
      '<section class="compare-recommendation"><div><span>' +
      esc(result && result.context && result.context.label || 'Recommendation') +
      '</span><h3>' + esc(winner ? playerName(winner) + ' is the stronger fit.' : 'No clear winner.') +
      '</h3><p>' + esc(result && result.recommendation || 'Review the category trade-offs before making the human decision.') +
      '</p></div><strong>+' + margin.toFixed(1) + '</strong></section>' +
      '<section class="compare-head">' +
      comparePlayerCard(playerA, totalA) +
      comparePlayerCard(playerB, totalB) +
      '</section>' +
      '<section class="panel"><header class="panel-head"><div><h3>Category-by-category explanation</h3>' +
      '<p>Each row uses the selected decision-context weight</p></div></header>' +
      '<div class="data-table"><div class="data-head compare-category-head">' +
      '<span>Category</span><span>' + esc(firstNameFromPlayer(playerA)) + '</span>' +
      '<span>' + esc(firstNameFromPlayer(playerB)) + '</span><span>Leader</span></div>' +
      comparisonRows(result || {}, playerA, playerB) + '</div></section>' +
      '<div class="two-col"><section class="panel"><header class="panel-head"><div>' +
      '<h3>What could change the recommendation</h3></div></header><div class="panel-body">' +
      '<ul style="margin:0;padding-left:16px;font-size:8px;line-height:1.6">' +
      changeFactors.map(function (item) { return '<li>' + esc(item) + '</li>'; }).join('') +
      '</ul></div></section><section class="panel"><header class="panel-head"><div>' +
      '<h3>Most important trade-off</h3></div></header><div class="panel-body">' +
      '<div class="recommendation"><b>Football context versus the strongest raw category.</b><br/>' +
      esc(result && result.tradeOff || 'Review the largest weighted margins and validate them with live observation.') +
      '</div></div></section></div>' +
      '<div class="button-row comparison-actions">' +
      '<button class="btn primary" type="button" data-v10-open-recommended>Open recommended profile</button>' +
      '<button class="btn secondary" type="button" data-v10-export-comparison>Export comparison</button></div>';

    results.hidden = false;
    results.dataset.winnerId = winner && winner.id || '';

    var open = q(results, '[data-v10-open-recommended]');
    if (open) {
      open.onclick = function () {
        if (!winner) return toast('There is no clear recommended player yet.', true);
        window.location.assign(profileUrl(winner));
      };
    }

    var exportButton = q(results, '[data-v10-export-comparison]');
    if (exportButton) {
      exportButton.onclick = function () {
        var rows = [
          ['ScoutLink comparison', playerName(playerA), playerName(playerB)],
          ['Decision context', result && result.context && result.context.label || '', ''],
          ['Decision score', totalA.toFixed(1), totalB.toFixed(1)]
        ];
        (result.categories || []).forEach(function (row) {
          rows.push([
            row.category || row.name || 'Category',
            row.playerA != null ? row.playerA : '',
            row.playerB != null ? row.playerB : ''
          ]);
        });
        var csv = rows.map(function (row) {
          return row.map(function (cell) {
            return '"' + String(cell == null ? '' : cell).replace(/"/g, '""') + '"';
          }).join(',');
        }).join('\n');
        downloadText('scoutlink-demo-comparison.csv', csv, 'text/csv;charset=utf-8');
      };
    }
  }

  function firstNameFromPlayer(player) {
    return playerName(player).split(/\s+/)[0] || 'Player';
  }

  function setupDemoCompare(root, content) {
    if (!isPublicDemo() || routeId() !== 'compare') return;
    if (content.dataset.v10DemoPage === 'compare') return;

    content.innerHTML = demoCompareMarkup();
    content.dataset.v10DemoPage = 'compare';
    content.classList.add('workspace-content', 'mobile-content', 'scout-v10-demo-compare');

    var selectA = q(content, '[data-v10-player-a]');
    var selectB = q(content, '[data-v10-player-b]');
    var selectedA = q(content, '[data-v10-selected-a]');
    var selectedB = q(content, '[data-v10-selected-b]');
    var selectedCount = q(content, '[data-v10-selected-count]');
    var count = q(content, '[data-v10-compare-count]');
    var context = q(content, '[data-v10-compare-context]');
    var contextLabel = q(content, '[data-v10-context-label]');
    var position = q(content, '[data-v10-compare-position]');
    var budget = q(content, '[data-v10-compare-budget]');
    var run = q(content, '[data-v10-run-comparison]');
    var fresh = q(content, '[data-v10-new-comparison]');
    var status = q(content, '[data-v10-compare-status]');
    var results = q(content, '[data-v10-comparison-results]');
    var players = [];

    function optionMarkup(excludedId) {
      return '<option value="">Choose a player</option>' +
        players.filter(function (player) {
          return !excludedId || String(player.id) !== String(excludedId);
        }).map(function (player) {
          return '<option value="' + esc(player.id) + '">' +
            esc(playerName(player) + ' · ' + playerPosition(player) + ' · ' +
              playerAge(player) + ' · ' + playerTeam(player)) +
            '</option>';
        }).join('');
    }

    function selected(select) {
      return players.find(function (player) {
        return String(player.id) === String(select.value);
      }) || null;
    }

    function refreshSelections() {
      var playerA = selected(selectA);
      var playerB = selected(selectB);
      selectedA.innerHTML = selectedPlayerMarkup(playerA);
      selectedB.innerHTML = selectedPlayerMarkup(playerB);
      selectedCount.textContent = (playerA ? 1 : 0) + (playerB ? 1 : 0) + ' / 2';
      results.hidden = true;
      status.hidden = true;

      var aValue = selectA.value;
      var bValue = selectB.value;
      selectA.innerHTML = optionMarkup(bValue);
      selectB.innerHTML = optionMarkup(aValue);
      selectA.value = aValue;
      selectB.value = bValue;
    }

    function setStatus(message, error) {
      status.hidden = !message;
      status.classList.toggle('error', Boolean(error));
      status.innerHTML = message
        ? '<b>' + esc(error ? 'Comparison could not run' : 'Comparing players') +
          '</b><br/>' + esc(message)
        : '';
    }

    loadPlayers().then(function (rows) {
      players = rows.slice();
      count.textContent = players.length;

      var params = new URLSearchParams(window.location.search);
      var requestedA = params.get('player');
      var requestedB = params.get('playerB');
      selectA.innerHTML = optionMarkup(requestedB);
      selectB.innerHTML = optionMarkup(requestedA);

      selectA.value = players.some(function (player) {
        return String(player.id) === String(requestedA);
      }) ? requestedA : (players[0] && players[0].id || '');

      selectB.value = players.some(function (player) {
        return String(player.id) === String(requestedB) && String(requestedB) !== String(selectA.value);
      }) ? requestedB : (players[1] && players[1].id || '');

      refreshSelections();
    });

    selectA.onchange = refreshSelections;
    selectB.onchange = refreshSelections;
    context.onchange = function () {
      contextLabel.textContent = context.value;
      results.hidden = true;
    };

    fresh.onclick = function () {
      selectA.value = '';
      selectB.value = '';
      budget.value = '';
      context.value = 'Immediate starter';
      position.value = 'Current roles';
      contextLabel.textContent = context.value;
      refreshSelections();
      history.replaceState(null, '', location.pathname);
    };

    run.onclick = async function () {
      var playerA = selected(selectA);
      var playerB = selected(selectB);
      if (!playerA || !playerB) {
        setStatus('Choose two valid players.', true);
        return;
      }
      if (String(playerA.id) === String(playerB.id)) {
        setStatus('Choose two different players.', true);
        return;
      }

      run.disabled = true;
      run.textContent = 'Comparing…';
      setStatus('Calculating the decision-context comparison…', false);

      var result;
      try {
        var response = await api('POST', '/api/scout-intelligence-v64/public-demo/compare', {
          playerAId:playerA.id,
          playerBId:playerB.id,
          contextKey:{
            'Immediate starter':'immediate_starter',
            'Development prospect':'development_prospect',
            'Specific tactical role':'specific_tactical_role',
            'Low financial risk':'low_financial_risk',
            'Resale upside':'resale_upside',
            'Squad depth':'squad_depth'
          }[context.value] || 'immediate_starter',
          targetPosition:position.value === 'Current roles' ? null : position.value,
          budget:budget.value ? number(budget.value) : null
        }, false);
        result = response.result || null;
      } catch (_) {
        result = null;
      }

      if (!result) result = localComparison(playerA, playerB, context.value);
      renderDemoComparison(results, playerA, playerB, result);
      setStatus('', false);
      run.disabled = false;
      run.textContent = 'Compare and explain';
      results.scrollIntoView({ behavior:'smooth', block:'start' });
    };
  }

  function demoChatDefaults(players) {
    var rows = players && players.length ? players : fallbackPlayers();
    var chosen = [rows[0], rows[1] || rows[0], rows[2] || rows[0]];
    var coaches = ['Marcus Reed', 'Amir Khan', 'Marcus Reed'];
    var previews = [
      'Thanks, I can confirm the fixture.',
      'New reply about availability.',
      'Observation notes shared.'
    ];

    return chosen.map(function (player, index) {
      var baseTime = Date.now() - index * 86400000;
      return {
        id:'demo-thread-' + index,
        player:player,
        coach:coaches[index],
        stage:index === 0 ? 'Shortlisted' : index === 1 ? 'Interested' : 'Watching',
        preview:previews[index],
        updatedAt:new Date(baseTime).toISOString(),
        messages:index === 0 ? [
          {
            id:'m-1',
            mine:false,
            author:coaches[index],
            body:playerName(player) + ' is available for the fixture on 2 August.',
            createdAt:new Date(Date.now() - 16 * 60000).toISOString()
          },
          {
            id:'m-2',
            mine:true,
            author:'You',
            body:'Thank you. I would like to attend and focus on the agreed live-observation objective.',
            createdAt:new Date(Date.now() - 10 * 60000).toISOString()
          },
          {
            id:'m-3',
            mine:false,
            author:coaches[index],
            body:'That is fine. I will confirm the arrival point.',
            createdAt:new Date(Date.now() - 1 * 60000).toISOString()
          }
        ] : [
          {
            id:'m-' + index + '-1',
            mine:false,
            author:coaches[index],
            body:'I have shared the latest availability and fixture context for ' + playerName(player) + '.',
            createdAt:new Date(baseTime).toISOString()
          }
        ]
      };
    });
  }

  function readDemoChats(players) {
    try {
      var stored = JSON.parse(sessionStorage.getItem(DEMO_CHAT_KEY) || 'null');
      if (Array.isArray(stored) && stored.length) {
        stored.forEach(function (thread) {
          if (!thread.player || !thread.player.id) {
            thread.player = (players || []).find(function (player) {
              return String(player.id) === String(thread.playerId);
            }) || fallbackPlayers()[0];
          }
        });
        return stored;
      }
    } catch (_) {}
    return demoChatDefaults(players);
  }

  function saveDemoChats(threads) {
    try {
      sessionStorage.setItem(DEMO_CHAT_KEY, JSON.stringify(threads));
    } catch (_) {}
  }

  function formatChatTime(value) {
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
  }

  function demoChatMarkup() {
    return '<section class="chat-shell scout-v10-desktop-chat">' +
      '<aside class="thread-list"><header><h3>Player conversations</h3>' +
      '<p>One thread for each registered player interest.</p></header>' +
      '<div class="chat-search"><input type="search" data-v10-chat-search placeholder="Search by player or coach"></div>' +
      '<div data-v10-chat-thread-list></div></aside>' +
      '<section class="chat-thread"><header data-v10-chat-head></header>' +
      '<div class="messages" data-v10-chat-messages></div>' +
      '<footer class="composer"><textarea class="compose-box" data-v10-chat-message placeholder="Write a player-specific message"></textarea>' +
      '<button class="btn primary" type="button" data-v10-chat-send>Send</button></footer></section>' +
      '<aside class="chat-context" data-v10-chat-context></aside></section>' +
      '<section class="chat-mobile scout-v10-mobile-chat">' +
      '<div class="mobile-chat-top"><header class="mobile-chat-title" data-v10-mobile-chat-head></header>' +
      '<section class="mobile-chat-person" data-v10-mobile-chat-person></section>' +
      '<section class="mobile-chat-context" data-v10-mobile-chat-context></section></div>' +
      '<div class="mobile-chat-messages" data-v10-mobile-chat-messages></div>' +
      '<footer class="mobile-chat-composer"><textarea class="compose-box" data-v10-mobile-chat-message placeholder="Write a player-specific message"></textarea>' +
      '<button class="btn primary" type="button" data-v10-mobile-chat-send>Send</button></footer></section>';
  }

  function setupDemoChat(root, content) {
    if (!isPublicDemo() || routeId() !== 'chat') return;
    if (content.dataset.v10DemoPage === 'chat') return;

    content.innerHTML = demoChatMarkup();
    content.dataset.v10DemoPage = 'chat';
    content.classList.add('workspace-content', 'mobile-content', 'scout-v10-demo-chat');

    loadPlayers().then(function (players) {
      var threads = readDemoChats(players);
      var activeId = new URLSearchParams(location.search).get('thread') ||
        (threads[0] && threads[0].id);
      var search = q(content, '[data-v10-chat-search]');
      var desktopInput = q(content, '[data-v10-chat-message]');
      var mobileInput = q(content, '[data-v10-mobile-chat-message]');

      function activeThread() {
        return threads.find(function (thread) {
          return String(thread.id) === String(activeId);
        }) || threads[0] || null;
      }

      function renderThreads() {
        var term = String(search.value || '').trim().toLowerCase();
        var filtered = threads.filter(function (thread) {
          return !term ||
            playerName(thread.player).toLowerCase().indexOf(term) >= 0 ||
            String(thread.coach || '').toLowerCase().indexOf(term) >= 0;
        });

        q(content, '[data-v10-chat-thread-list]').innerHTML = filtered.length
          ? filtered.map(function (thread) {
              return '<button class="thread-item ' +
                (String(thread.id) === String(activeId) ? 'active' : '') +
                '" type="button" data-v10-thread="' + esc(thread.id) + '">' +
                '<span class="initials-box">' + esc(playerInitials(thread.player)) + '</span>' +
                '<div><b>' + esc(playerName(thread.player)) + '</b>' +
                '<span>' + esc(thread.coach + ' · ' + playerTeam(thread.player)) + '</span>' +
                '<small>' + esc(thread.preview || 'Player conversation') + '</small></div>' +
                '<time>' + esc(formatChatTime(thread.updatedAt)) + '</time></button>';
            }).join('')
          : '<div class="empty-state"><h4>No matching conversations</h4>' +
            '<p>Clear the search to return to all demo conversations.</p></div>';

        qa(content, '[data-v10-thread]').forEach(function (button) {
          button.onclick = function () {
            activeId = button.dataset.v10Thread;
            history.replaceState(null, '', '/scout/chat?thread=' + encodeURIComponent(activeId));
            render();
          };
        });
      }

      function messageMarkup(thread) {
        return thread.messages.map(function (message) {
          return '<article class="message ' + (message.mine ? 'mine' : '') + '">' +
            '<small>' + esc(message.mine ? 'You' : message.author) + '</small>' +
            '<p>' + esc(message.body) + '</p><time>' +
            esc(formatChatTime(message.createdAt)) + '</time></article>';
        }).join('');
      }

      function contextMarkup(thread, mobile) {
        var player = thread.player;
        if (mobile) {
          return '<small>Player context</small><b>' +
            esc(playerPosition(player) + ' · ' + playerAge(player) + ' · ' +
              playerOverall(player) + ' overall') +
            '</b><span>' + esc(playerFit(player) + '% compatibility · ' +
              playerEvidence(player) + ' evidence') +
            '</span><a class="btn secondary" href="' + profileUrl(player) +
            '">View player profile</a>';
        }

        return '<span>Player context</span><h3>' + esc(playerName(player)) +
          '</h3><p>' + esc(playerLine(player)) + '</p><div class="context-facts">' +
          '<div><span>Overall</span><b>' + esc(playerOverall(player) || '—') + '</b></div>' +
          '<div><span>Compatibility</span><b>' + esc(playerFit(player)) + '%</b></div>' +
          '<div><span>Evidence</span><b>' + esc(playerEvidence(player)) + '</b></div>' +
          '<div><span>Pipeline</span><b>' + esc(thread.stage) + '</b></div>' +
          '<div><span>Next fixture</span><b>2 Aug</b></div></div>' +
          '<a class="btn secondary" href="' + profileUrl(player) + '">View player profile</a>';
      }

      function render() {
        var thread = activeThread();
        renderThreads();
        if (!thread) return;

        q(content, '[data-v10-chat-head]').innerHTML =
          '<div><b>' + esc(playerName(thread.player)) + '</b><span>' +
          esc('Conversation with ' + thread.coach + ' · Coach') + '</span></div>';

        q(content, '[data-v10-chat-messages]').innerHTML = messageMarkup(thread);
        q(content, '[data-v10-chat-context]').innerHTML = contextMarkup(thread, false);

        q(content, '[data-v10-mobile-chat-head]').innerHTML =
          '<button type="button" data-global-menu aria-label="Open conversations">‹</button>' +
          '<div><h3>' + esc(playerName(thread.player)) + '</h3><p>Player conversation</p></div>';

        q(content, '[data-v10-mobile-chat-person]').innerHTML =
          '<div><small>Coach</small><b>' + esc(thread.coach) +
          '</b></div><span class="status green">' + esc(thread.stage) + '</span>';

        q(content, '[data-v10-mobile-chat-context]').innerHTML = contextMarkup(thread, true);
        q(content, '[data-v10-mobile-chat-messages]').innerHTML = messageMarkup(thread);
        bindMenu();
      }

      function send(input) {
        var thread = activeThread();
        var body = String(input.value || '').trim();
        if (!thread || !body) return;

        thread.messages.push({
          id:'demo-message-' + Date.now(),
          mine:true,
          author:'You',
          body:body,
          createdAt:new Date().toISOString()
        });
        thread.preview = body;
        thread.updatedAt = new Date().toISOString();
        input.value = '';
        desktopInput.value = '';
        mobileInput.value = '';
        saveDemoChats(threads);
        render();
      }

      search.oninput = renderThreads;
      q(content, '[data-v10-chat-send]').onclick = function () { send(desktopInput); };
      q(content, '[data-v10-mobile-chat-send]').onclick = function () { send(mobileInput); };

      [desktopInput, mobileInput].forEach(function (input) {
        input.onkeydown = function (event) {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            send(input);
          }
        };
      });

      render();
    });
  }

  function demoNotificationDefaults(players) {
    var rows = players && players.length ? players : fallbackPlayers();
    var a = rows[0] || fallbackPlayers()[0];
    var b = rows[1] || fallbackPlayers()[1];
    var c = rows[2] || fallbackPlayers()[2];
    return [
      {
        id:'demo-notification-chat',
        code:'CH',
        group:'messages',
        title:'New message from Marcus Reed',
        copy:'Conversation about ' + playerName(a) + '.',
        when:'Today · 09:18',
        label:'Open conversation',
        url:'/scout/chat',
        read:false
      },
      {
        id:'demo-notification-match',
        code:'MF',
        group:'match facts',
        title:'New Match Facts for ' + playerName(b),
        copy:'Evidence confidence increased after the latest match.',
        when:'Today · 08:42',
        label:'Review player',
        url:profileUrl(b),
        read:false
      },
      {
        id:'demo-notification-fixture',
        code:'FX',
        group:'fixtures',
        title:'Pipeline fixture updated',
        copy:playerName(c) + ' has a new fixture on 9 August.',
        when:'Yesterday',
        label:'Plan visit',
        url:'/scout/fixtures',
        read:false
      },
      {
        id:'demo-notification-prediction',
        code:'PR',
        group:'recruitment',
        title:'Position-fit prediction saved',
        copy:playerName(a) + ' · ' + playerPosition(a) + ' · ' + playerFit(a) + '/100.',
        when:'27 Jul',
        label:'Open result',
        url:'/scout/predictions',
        read:true
      },
      {
        id:'demo-notification-export',
        code:'EX',
        group:'system',
        title:'Profile dossier ready',
        copy:'The ' + playerName(a) + ' demo dossier is available to download.',
        when:'27 Jul',
        label:'Download',
        action:'download',
        read:true
      }
    ];
  }

  function readDemoNotifications(players) {
    try {
      var stored = JSON.parse(sessionStorage.getItem(DEMO_NOTIFICATION_KEY) || 'null');
      if (Array.isArray(stored) && stored.length) return stored;
    } catch (_) {}
    return demoNotificationDefaults(players);
  }

  function saveDemoNotifications(rows) {
    try {
      sessionStorage.setItem(DEMO_NOTIFICATION_KEY, JSON.stringify(rows));
    } catch (_) {}
  }

  function notificationMarkup() {
    return '<section class="page-hero navy"><div><span>Scout activity</span>' +
      '<h2>Only the updates that need your attention.</h2>' +
      '<p>Player, coach, pipeline, fixture and system activity stays grouped around meaningful actions.</p></div>' +
      '<div class="button-row hero-actions"><button class="btn ghost" type="button" data-v10-mark-all>Mark all read</button></div></section>' +
      '<section class="notification-controls"><div class="segment-row">' +
      ['All','Messages','Scout interest','Match Facts','Recruitment','Fixtures','System']
        .map(function (label, index) {
          return '<button class="segment ' + (index === 0 ? 'active' : '') +
            '" type="button" data-v10-notification-filter="' +
            esc(label.toLowerCase()) + '">' + esc(label) + '</button>';
        }).join('') +
      '</div><button class="btn secondary" type="button" data-v10-refresh-notifications>Refresh</button></section>' +
      '<section class="notification-list" data-v10-notification-list></section>';
  }

  function setupDemoNotifications(root, content) {
    if (!isPublicDemo() || routeId() !== 'notifications') return;
    if (content.dataset.v10DemoPage === 'notifications') return;

    content.innerHTML = notificationMarkup();
    content.dataset.v10DemoPage = 'notifications';
    content.classList.add('workspace-content', 'mobile-content', 'scout-v10-demo-notifications');

    loadPlayers().then(function (players) {
      var rows = readDemoNotifications(players);
      var filter = 'all';
      var list = q(content, '[data-v10-notification-list]');

      function filteredRows() {
        if (filter === 'all') return rows;
        return rows.filter(function (row) {
          return String(row.group || '').toLowerCase() === filter;
        });
      }

      function render() {
        var visible = filteredRows();
        list.innerHTML = visible.length
          ? visible.map(function (row) {
              return '<article class="notification-row ' + (row.read ? '' : 'unread') +
                '" data-v10-notification="' + esc(row.id) + '">' +
                '<span class="notification-icon">' + esc(row.code) + '</span>' +
                '<div><b>' + esc(row.title) + '</b><p>' + esc(row.copy) +
                '</p><small>' + esc(row.when) + '</small></div>' +
                '<button class="text-action" type="button" data-v10-notification-action>' +
                esc(row.label) + '</button></article>';
            }).join('')
          : '<div class="empty-state"><h4>No notifications in this category</h4>' +
            '<p>Choose another filter to review the remaining demo activity.</p></div>';

        qa(list, '[data-v10-notification]').forEach(function (card) {
          var row = rows.find(function (item) {
            return String(item.id) === String(card.dataset.v10Notification);
          });
          var action = q(card, '[data-v10-notification-action]');
          if (!row || !action) return;

          action.onclick = function () {
            row.read = true;
            saveDemoNotifications(rows);

            if (row.action === 'download') {
              downloadText(
                'scoutlink-demo-profile-dossier.txt',
                'ScoutLink demo profile dossier\n\nThis public-demo download is isolated from production reports.'
              );
              render();
              return;
            }

            if (row.url) window.location.assign(row.url);
          };
        });

        var unread = rows.filter(function (row) { return !row.read; }).length;
        qa(document, '.icon-btn i').forEach(function (badge) {
          badge.textContent = unread;
          badge.hidden = unread === 0;
        });
      }

      qa(content, '[data-v10-notification-filter]').forEach(function (button) {
        button.onclick = function () {
          filter = button.dataset.v10NotificationFilter || 'all';
          qa(content, '[data-v10-notification-filter]').forEach(function (item) {
            item.classList.toggle('active', item === button);
          });
          render();
        };
      });

      q(content, '[data-v10-mark-all]').onclick = function () {
        rows.forEach(function (row) { row.read = true; });
        saveDemoNotifications(rows);
        render();
        toast('All demo notifications marked as read.');
      };

      q(content, '[data-v10-refresh-notifications]').onclick = function () {
        render();
        toast('Demo notifications refreshed.');
      };

      render();
    });
  }

  function decorateLiveCommunication(root) {
    if (routeId() === 'chat' && !isPublicDemo()) {
      var layout = q(root, '.chat-layout');
      if (layout) {
        layout.classList.add('chat-shell', 'scout-v10-desktop-chat');
        var list = q(layout, '.conversation-list');
        if (list) list.classList.add('thread-list');
        var thread = q(layout, '.thread');
        if (thread) thread.classList.add('chat-thread');
        qa(layout, '.conversation').forEach(function (item) {
          item.classList.add('thread-item');
        });
        qa(layout, '.msg').forEach(function (message) {
          message.classList.add('message');
          if (message.classList.contains('outgoing')) message.classList.add('mine');
        });
        var context = q(layout, '.chat-player-context');
        if (
          context &&
          !context.classList.contains('chat-context') &&
          layout.children.length < 3
        ) {
          context.classList.add('chat-context');
          layout.appendChild(context);
        }
      }
    }

    if (routeId() === 'notifications' && !isPublicDemo()) {
      var toolbar = q(root, '.notification-toolbar');
      if (toolbar) toolbar.classList.add('notification-controls');
      var segments = q(root, '.segments');
      if (segments) segments.classList.add('segment-row');
      qa(root, '[data-notification-filter]').forEach(function (button) {
        button.classList.add('segment');
      });
      qa(root, '.notification').forEach(function (row) {
        row.classList.add('notification-row');
        var icon = q(row, '.initials');
        if (icon) icon.classList.add('notification-icon');
      });
    }
  }

  function setupDemoPages(root) {
    if (!isPublicDemo()) return;
    var content = q(root, '.content');
    if (!content) return;

    if (routeId() === 'compare') setupDemoCompare(root, content);
    if (routeId() === 'chat') setupDemoChat(root, content);
    if (routeId() === 'notifications') setupDemoNotifications(root, content);
  }

  function decorate() {
    if (decorating) return;
    var root = rootNode();
    if (!root) return;

    decorating = true;
    try {
      root.dataset.scoutV10 = V10_VERSION;
      rebuildSidebar(root);
      rebuildTopbar(root);
      decorateCoreClasses(root);
      ensureMobileTopbar(root);
      ensureMobileNavigation(root);
      setupDemoPages(root);
      decorateLiveCommunication(root);
      decorateSearchRows(root);
      decoratePagination(root);
      bindMenu();
      root.removeAttribute('aria-busy');
      root.classList.remove('is-loading');
    } finally {
      decorating = false;
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    window.setTimeout(function () {
      scheduled = false;
      decorate();
    }, 60);
  }

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') setMenu(false);
  });

  window.addEventListener('resize', function () {
    if (!isMobile()) setMenu(false);
    schedule();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule);
  } else {
    schedule();
  }

  observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, {
    childList:true,
    subtree:true
  });
}());
