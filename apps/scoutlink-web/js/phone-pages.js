'use strict';

(function () {
  var mq = window.matchMedia ? window.matchMedia('(max-width: 950px), ((hover: none) and (pointer: coarse) and (max-width: 1024px))') : { matches: window.innerWidth <= 950 };
  var coarseMq = window.matchMedia ? window.matchMedia('(hover: none) and (pointer: coarse)') : { matches: false };
  var observerStarted = false;

  function isPhone() {
    return mq.matches || window.innerWidth <= 950 || (coarseMq.matches && window.innerWidth <= 1024);
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function routeKey() {
    var p = window.location.pathname.toLowerCase();
    var routes = [
      ['/coach/dashboard', 'coach-dashboard'],
      ['/coach/my-players', 'coach-my-players'],
      ['/coach/add-player', 'add-player'],
      ['/coach/bulk-add-players', 'bulk-add-players'],
      ['/coach/match-facts', 'match-facts'],
      ['/coach/fixtures', 'coach-fixtures'],
      ['/coach/video-reels', 'coach-video-reels'],
      ['/coach/chat', 'chat'],
      ['/coach/notifications', 'notifications'],
      ['/coach/settings', 'settings'],
      ['/scout/dashboard', 'scout-dashboard'],
      ['/scout/player-search', 'player-search'],
      ['/scout/pipeline', 'scout-pipeline'],
      ['/scout/rankings', 'scout-rankings'],
      ['/scout/fixtures', 'scout-fixtures'],
      ['/scout/predictions', 'scout-predictions'],
      ['/scout/exports', 'scout-exports'],
      ['/scout/compare-players', 'compare-players'],
      ['/scout/setup', 'scout-setup'],
      ['/scout/chat', 'chat'],
      ['/scout/notifications', 'notifications'],
      ['/player/dashboard', 'player-dashboard'],
      ['/player/profile', 'player-profile'],
      ['/player/video-reels', 'player-video-reels'],
      ['/player/notifications', 'notifications'],
      ['/stratex/dashboard', 'stratex-dashboard'],
      ['/stratex/registrations', 'stratex-registrations'],
      ['/stratex/org', 'stratex-org'],
      ['/stratex/hiring', 'stratex-hiring'],
      ['/stratex/contracts-pay', 'stratex-contracts-pay'],
      ['/stratex/leave', 'stratex-leave'],
      ['/stratex/meetings', 'stratex-meetings'],
      ['/stratex/users', 'stratex-users'],
      ['/stratex/players', 'stratex-players'],
      ['/stratex/scouts', 'stratex-scouts'],
      ['/stratex/coaches', 'stratex-coaches'],
      ['/stratex/notifications', 'notifications']
    ];
    for (var i = 0; i < routes.length; i++) {
      if (p.indexOf(routes[i][0]) === 0) return routes[i][1];
    }
    var file = p.split('/').pop().replace('.html', '');
    if (!file || file === 'pages') file = p.split('/').filter(Boolean).join('-') || 'home';
    return file;
  }

  function cleanTextNode(value) {
    return String(value || '')
      .replace(/\u00c3[\u0080-\u00bfA-Za-z0-9\u00a0-\u017f]{1,10}/g, '')
      .replace(/\u00c2/g, '')
      .replace(/\u00e2[\u0080-\u00bf\u2010-\u203f]{1,4}/g, ' - ')
      .replace(/\u00f0[\u0080-\u00bfA-Za-z0-9]{1,8}/g, '')
      .replace(/\s+-\s+-\s+/g, ' - ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function cleanEncoding() {
    if (!document.body) return;
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue || !/[\u00c2\u00c3\u00e2\u00f0]/.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        var parent = node.parentElement;
        if (parent && /SCRIPT|STYLE|TEXTAREA/.test(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var node;
    while ((node = walker.nextNode())) node.nodeValue = cleanTextNode(node.nodeValue);
  }

  function money(v) {
    if (typeof window.formatValue === 'function') return window.formatValue(Number(v) || 0).replace(/\u00c2/g, '');
    var n = Number(v) || 0;
    if (!n) return '\u00a30';
    if (n >= 1000000) return '\u00a3' + (n / 1000000).toFixed(1) + 'm';
    if (n >= 1000) return '\u00a3' + Math.round(n / 1000) + 'k';
    return '\u00a3' + n;
  }
  function playerName(p) {
    return (((p && p.first_name) || '') + ' ' + ((p && p.last_name) || '')).trim() || 'Player';
  }

  function playerInitials(p) {
    if (typeof window.initials === 'function') return window.initials(p && p.first_name, p && p.last_name) || 'SL';
    return ((((p && p.first_name) || '')[0] || 'S') + (((p && p.last_name) || '')[0] || 'L')).toUpperCase();
  }

  function overall100(v) {
    var n = Number(v);
    if (!Number.isFinite(n)) return '--';
    return String(Math.round(n > 10 ? n : n * 10));
  }

  function completion(p) {
    var keys = ['first_name', 'last_name', 'age_group', 'specific_position', 'overall_rating', 'transfer_value', 'height_category', 'build_category', 'foot'];
    var done = keys.filter(function (k) { return p && p[k] !== null && p[k] !== undefined && String(p[k]).trim() !== ''; }).length;
    if (Number(p && p.appearances) > 0) done++;
    if (Number(p && p.goals) > 0 || Number(p && p.assists) > 0) done++;
    return Math.min(100, Math.round(done / 11 * 100));
  }

  window.isScoutLinkPhone = isPhone;
  window.renderCoachMobilePlayerCard = function (p) {
    return renderPlayerCard(p, { edit: true, url: 'player-profile.html?id=' + encodeURIComponent(p.id || '') });
  };
  window.renderCoachMyPlayerCard = function (p, opts) {
    opts = opts || {};
    return renderPlayerCard(p, { edit: true, coachControl: opts.coachControl, url: opts.url || ('player-profile.html?id=' + encodeURIComponent(p.id || '')) });
  };

  function renderPlayerCard(p, opts) {
    opts = opts || {};
    var comp = completion(p);
    var pos = p.specific_position || p.primary_position || p.position_group || 'Position TBC';
    var age = p.age_group || (p.age ? p.age + ' yrs' : 'Age TBC');
    return '<article class="phone-player-card">' +
      '<div class="phone-player-top">' + (window.playerAvatarMarkup ? window.playerAvatarMarkup(p,40) : '<div class="phone-player-avatar">' + esc(playerInitials(p)) + '</div>') + '<div class="phone-player-main"><h4>' + esc(playerName(p)) + '</h4><p>' + esc(age) + ' - ' + esc(pos) + '</p></div><div class="phone-rating">' + esc(overall100(p.overall_rating)) + '</div></div>' +
      '<div class="phone-player-facts"><span><b>' + esc(money(p.transfer_value || 0)) + '</b><small>Value</small></span><span><b>' + esc(p.appearances || 0) + '</b><small>Apps</small></span><span><b>' + esc(p.goals || 0) + '</b><small>Goals</small></span></div>' +
      '<div class="phone-progress"><div><span>Profile completion</span><b>' + comp + '%</b></div><i style="width:' + comp + '%"></i></div>' +
      (opts.coachControl || '') +
      '<a class="btn btn-outline phone-full-btn" href="' + esc(opts.url || '#') + '">' + (opts.edit ? 'View / edit profile' : 'View profile') + '</a>' +
      '</article>';
  }

  function addHub(kind, config) {
    if (!isPhone()) return;
    var content = document.querySelector('.page-content');
    if (!content || content.querySelector('.phone-hub[data-kind="' + kind + '"]')) return;
    var section = document.createElement('section');
    section.className = 'phone-hub';
    section.dataset.kind = kind;
    var actions = config.actions.map(function (a) {
      return '<a class="phone-action-card" href="' + esc(a.href) + '"><b>' + esc(a.label) + '</b><span>' + esc(a.sub || '') + '</span></a>';
    }).join('');
    var stats = (config.stats || []).map(function (s) {
      return '<div class="phone-mini-stat"><span>' + esc(s.label) + '</span><b data-source="' + esc(s.source || '') + '">' + esc(s.value || '-') + '</b></div>';
    }).join('');
    section.innerHTML =
      '<div class="phone-welcome-card"><span>' + esc(config.label || 'ScoutLink') + '</span><h2>' + esc(config.title || 'Welcome') + '</h2><p>' + esc(config.copy || '') + '</p></div>' +
      (stats ? '<div class="phone-summary-strip">' + stats + '</div>' : '') +
      '<div class="phone-action-grid">' + actions + '</div>' +
      '<div class="phone-activity-card"><h3>Recent activity</h3><p>' + esc(config.empty || 'Nothing urgent right now.') + '</p></div>';
    content.insertBefore(section, content.firstChild);
    refreshHubStats(section);
  }

  function refreshHubStats(root) {
    (root || document).querySelectorAll('[data-source]').forEach(function (el) {
      var id = el.dataset.source;
      if (!id) return;
      var src = document.getElementById(id);
      if (src && src.textContent.trim()) el.textContent = src.textContent.trim();
    });
  }

  function setupDashboardHubs() {
    var r = routeKey();
    var first = (window.Auth && window.Auth.user && window.Auth.user.firstName) || '';
    if (r === 'coach-dashboard') {
      addHub('coach-dashboard', {
        label: 'Coach workspace',
        title: 'Welcome' + (first ? ', ' + first : ''),
        copy: 'Manage your squad, fixtures and match facts from one clean phone hub.',
        stats: [
          { label: 'Players', source: 'kpiPlayers' },
          { label: 'Interest', source: 'kpiInterest' },
          { label: 'Value', source: 'kpiValue' }
        ],
        actions: [
          { label: 'My players', sub: 'Squad cards', href: 'coach-my-players.html' },
          { label: 'Add player', sub: 'Create profile', href: 'add-player.html' },
          { label: 'Match facts', sub: 'Log a game', href: 'match-facts.html' },
          { label: 'Fixtures', sub: 'Upcoming games', href: 'coach-fixtures.html' },
          { label: 'Chat', sub: 'Messages', href: 'coach-chat.html' },
          { label: 'Video reels', sub: 'Upload clips', href: 'coach-video-reels.html' }
        ],
        empty: 'Add players or match facts to start building live activity.'
      });
    }
    if (r === 'scout-dashboard') {
      addHub('scout-dashboard', {
        label: 'Scout workspace',
        title: 'Find the right player',
        copy: 'Search, shortlist, compare and run predictions from a phone-first view.',
        stats: [
          { label: 'Players', source: 'kpiTotal' },
          { label: 'Pipeline', source: 'kpiPipeline' },
          { label: 'Plan', source: 'kpiPlan' }
        ],
        actions: [
          { label: 'Player database', sub: 'Search cards', href: 'player-search.html' },
          { label: 'Pipeline', sub: 'Track interest', href: 'scout-pipeline.html' },
          { label: 'Compare players', sub: 'Stacked review', href: 'compare-players.html' },
          { label: 'Predictions', sub: 'Run analysis', href: 'scout-predictions.html' },
          { label: 'Fixtures', sub: 'Attend games', href: 'scout-fixtures.html' },
          { label: 'Chat', sub: 'Message coaches', href: 'scout-chat.html' },
          { label: 'Rankings', sub: 'Top players', href: 'scout-rankings.html' },
          { label: 'Setup', sub: 'Preferences', href: 'scout-setup.html' }
        ],
        empty: 'Your compatible players and pipeline previews sit below.'
      });
    }
    if (r === 'stratex-dashboard') {
      addHub('stratex-dashboard', {
        label: 'Stratex admin',
        title: 'Platform control',
        copy: 'Review registrations, users, hiring and platform health.',
        stats: [
          { label: 'Players', source: 'kpiPlayers' },
          { label: 'Coaches', source: 'kpiCoaches' },
          { label: 'Scouts', source: 'kpiScouts' }
        ],
        actions: [
          { label: 'Registrations', sub: 'Review requests', href: 'stratex-registrations.html' },
          { label: 'Users', sub: 'Manage access', href: 'stratex-users.html' },
          { label: 'Org', sub: 'Reporting lines', href: 'stratex-org.html' },
          { label: 'Hiring', sub: 'Careers admin', href: '/stratex/hiring' },
          { label: 'Players', sub: 'Database', href: 'stratex-players.html' },
          { label: 'Scouts', sub: 'Accounts', href: 'stratex-scouts.html' },
          { label: 'Coaches', sub: 'Accounts', href: 'stratex-coaches.html' },
          { label: 'Settings', sub: 'Platform', href: 'stratex-settings.html' }
        ],
        empty: 'Use the cards to jump into the area you need.'
      });
    }
  }

  function setupBulkMessage() {
    if (!isPhone() || routeKey() !== 'bulk-add-players') return;
    var content = document.querySelector('.page-content');
    if (!content || content.querySelector('.phone-desktop-only-message')) return;
    var box = document.createElement('section');
    box.className = 'phone-desktop-only-message';
    box.innerHTML = '<h2>Bulk import works best on a bigger screen</h2><p>Bulk player import is available on desktop and tablet so you can review every column properly.</p><div><a class="btn btn-primary" href="add-player.html">Add single player</a><a class="btn btn-outline" href="coach-my-players.html">View my players</a></div>';
    content.insertBefore(box, content.firstChild);
  }

  function setupWizardFromCards() {
    if (!isPhone()) return;
    var r = routeKey();
    if (r !== 'add-player') return;
    var content = document.querySelector('.page-content > div');
    if (!content || content.dataset.phoneWizard === '1') return;
    var cards = Array.prototype.slice.call(content.querySelectorAll(':scope > .table-card'));
    if (cards.length < 4) return;
    content.dataset.phoneWizard = '1';
    content.classList.add('phone-wizard');
    var labels = ['Basic details', 'Position', 'Coach', 'Physical profile', 'Attributes'];
    var current = 0;
    var nav = document.createElement('div');
    nav.className = 'phone-wizard-nav';
    nav.innerHTML = '<div class="phone-wizard-progress"><span id="phoneWizardStep"></span><b id="phoneWizardLabel"></b></div><div class="phone-wizard-buttons"><button class="btn btn-outline" type="button" id="phoneWizardBack">Back</button><button class="btn btn-primary" type="button" id="phoneWizardNext">Next</button></div>';
    content.insertBefore(nav, cards[0]);
    function render() {
      cards.forEach(function (card, i) { card.classList.toggle('phone-wizard-active', i === current); });
      document.getElementById('phoneWizardStep').textContent = 'Step ' + (current + 1) + ' of ' + cards.length;
      document.getElementById('phoneWizardLabel').textContent = labels[current] || 'Review';
      document.getElementById('phoneWizardBack').disabled = current === 0;
      document.getElementById('phoneWizardNext').textContent = current === cards.length - 1 ? 'Review' : 'Next';
    }
    document.getElementById('phoneWizardBack').addEventListener('click', function () { current = Math.max(0, current - 1); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    document.getElementById('phoneWizardNext').addEventListener('click', function () { current = Math.min(cards.length - 1, current + 1); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    render();
  }

  function setupChatMode() {
    if (!isPhone()) return;
    var shell = document.querySelector('.chat-shell');
    if (!shell || shell.dataset.phoneChat === '1') return;
    shell.dataset.phoneChat = '1';
    shell.classList.add('phone-chat', 'is-list');
    var head = shell.querySelector('.chat-head');
    if (head && !head.querySelector('.phone-chat-back')) {
      var back = document.createElement('button');
      back.className = 'phone-chat-back';
      back.type = 'button';
      back.textContent = 'Back';
      back.addEventListener('click', function () { window.setMobileChatMode('list'); });
      head.insertBefore(back, head.firstChild);
    }
    window.setMobileChatMode = function (mode) {
      shell.classList.toggle('is-list', mode !== 'conversation');
      shell.classList.toggle('is-conversation', mode === 'conversation');
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
  }

  function setupFilterSheets() {
    if (!isPhone()) return;
    var searchFilters = document.querySelector('.filter-bar, .filter-card');
    if (!searchFilters || searchFilters.dataset.phoneFilters === '1') return;
    searchFilters.dataset.phoneFilters = '1';
    searchFilters.classList.add('phone-filter-block');
    if (routeKey() === 'player-search' && !searchFilters.querySelector('.phone-filter-toggle')) {
      var toggle = document.createElement('button');
      toggle.className = 'phone-filter-toggle btn btn-outline';
      toggle.type = 'button';
      toggle.textContent = 'Filters';
      toggle.addEventListener('click', function () {
        searchFilters.classList.toggle('phone-filters-open');
        toggle.textContent = searchFilters.classList.contains('phone-filters-open') ? 'Hide filters' : 'Filters';
      });
      searchFilters.insertBefore(toggle, searchFilters.firstElementChild);
    }
  }

  function setupPlayerOptions() {
    if (!isPhone()) return;
    var r = routeKey();
    if (r !== 'player-profile' && r !== 'player-dashboard') return;
    var content = document.querySelector('.page-content');
    if (!content || content.querySelector('.phone-player-options')) return;
    var box = document.createElement('nav');
    box.className = 'phone-player-options';
    box.setAttribute('aria-label', 'Player actions');
    box.innerHTML =
      '<a href="player-profile.html"><b>View my profile</b><span>Profile and evidence</span></a>' +
      '<a href="player-video-reels.html"><b>Add video reel</b><span>Your own clips</span></a>' +
      '<a href="player-profile.html#fixtureSection"><b>Fixtures</b><span>Upcoming games</span></a>' +

      '<a href="player-notifications.html"><b>Notifications</b><span>Interest and updates</span></a>' +
      '<a href="player-settings.html"><b>Settings</b><span>Account and support</span></a>';
    content.insertBefore(box, content.firstChild);
  }

  function cleanEmptyProfileBits() {
    if (!isPhone() || routeKey() !== 'player-profile') return;
    document.querySelectorAll('.physical-metric, .value-factor-row, .phone-table-card-row').forEach(function (el) {
      var text = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (!text || /^(height|feet\/inches|build|weight range|nationality|date of birth)?\s*(--|n\/a|null|undefined|not added yet)?$/.test(text)) {
        el.style.display = 'none';
      }
    });
    document.querySelectorAll('[style]').forEach(function (el) {
      if (el.textContent && /undefined|null/.test(el.textContent)) {
        el.textContent = el.textContent.replace(/undefined|null/g, 'Not added yet');
      }
    });
  }

  function markMobileThemePanels() {
    if (!isPhone()) return;
    document.querySelectorAll('.settings-panel, .table-card').forEach(function (panel) {
      var heading = panel.querySelector('.table-header h3, h3, h2');
      var hasThemeControls = panel.querySelector('.seg[aria-label="Theme"], #darkThemeBtn, #lightThemeBtn');
      var title = heading ? heading.textContent.trim() : '';
      if (hasThemeControls || /appearance|theme/i.test(title)) {
        panel.setAttribute('data-phone-hide-theme', 'true');
      }
    });
    document.querySelectorAll('.toast, .toast-message, [role="status"]').forEach(function (el) {
      if (/theme saved/i.test(el.textContent || '')) el.style.display = 'none';
    });
  }

  function cardifyTables() {
    if (!isPhone()) return;
    document.querySelectorAll('.page-content table.sl-table').forEach(function (table) {
      if (table.dataset.phoneCards === '1' || table.closest('.phone-allow-table')) return;
      var headers = Array.prototype.slice.call(table.querySelectorAll('thead th')).map(function (th) { return th.textContent.trim() || 'Info'; });
      var rows = Array.prototype.slice.call(table.querySelectorAll('tbody tr'));
      if (!headers.length || !rows.length) return;
      table.dataset.phoneCards = '1';
      var cards = document.createElement('div');
      cards.className = 'phone-table-cards';
      rows.forEach(function (row) {
        var cells = Array.prototype.slice.call(row.children);
        var title = cells[0] ? cells[0].innerText.trim() : 'Record';
        var html = '<article class="phone-table-card"><div class="phone-table-card-title">' + esc(title) + '</div>';
        cells.slice(1).forEach(function (cell, idx) {
          var label = headers[idx + 1] || 'Info';
          var value = cell.innerText.trim();
          var links = Array.prototype.slice.call(cell.querySelectorAll('a,button')).map(function (el) { return el.outerHTML; }).join('');
          html += '<div class="phone-table-card-row"><span>' + esc(label) + '</span><b>' + (links || esc(value || '--')) + '</b></div>';
        });
        html += '</article>';
        cards.insertAdjacentHTML('beforeend', html);
      });
      var wrap = table.parentElement;
      if (wrap) {
        wrap.classList.add('phone-hide-table');
        wrap.insertAdjacentElement('afterend', cards);
      }
    });
  }

  function setupCompareAccordions() {
    if (!isPhone() || routeKey() !== 'compare-players') return;
    document.body.classList.add('phone-compare');
    document.querySelectorAll('.comparison-section, .compare-section, .table-card').forEach(function (section, i) {
      if (section.dataset.phoneAccordion === '1') return;
      section.dataset.phoneAccordion = '1';
      section.classList.add('phone-accordion-section');
      if (i > 0) section.classList.add('collapsed');
      var head = section.querySelector('.table-header h3, h3, h2');
      if (head) head.addEventListener('click', function () { section.classList.toggle('collapsed'); });
    });
  }

  function refresh() {
    document.body.classList.toggle('phone-active', isPhone());
    document.body.classList.add('phone-route-' + routeKey());
    cleanEncoding();
    setupDashboardHubs();
    setupBulkMessage();
    setupWizardFromCards();
    setupChatMode();
    setupFilterSheets();
    setupPlayerOptions();
    cleanEmptyProfileBits();
    markMobileThemePanels();
    setupCompareAccordions();
    cardifyTables();
    document.querySelectorAll('.phone-hub').forEach(refreshHubStats);
  }

  function startObserver() {
    if (observerStarted || !document.body) return;
    observerStarted = true;
    var timer = null;
    new MutationObserver(function () {
      if (!isPhone()) return;
      clearTimeout(timer);
      timer = setTimeout(refresh, 120);
    }).observe(document.body, { childList: true, subtree: true });
  }

  window.PhonePages = { refresh: refresh, isPhone: isPhone };
  document.addEventListener('DOMContentLoaded', function () {
    refresh();
    startObserver();
    setTimeout(refresh, 500);
    setTimeout(refresh, 1500);
  });
  window.addEventListener('resize', refresh);
})();

