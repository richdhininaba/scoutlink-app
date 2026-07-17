'use strict';

(function () {
  var COACH_PAGE_FILES = {
    'coach-dashboard.html': 'dashboard',
    'coach-my-players.html': 'my-players',
    'add-player.html': 'add-player',
    'bulk-add-players.html': 'bulk-add-players',
    'coach-fixtures.html': 'fixtures',
    'coach-video-reels.html': 'video-reels',
    'coach-chat.html': 'chat',
    'coach-notifications.html': 'notifications',
    'coach-settings.html': 'settings',
    'match-facts.html': 'match-facts'
  };

  function path() {
    return window.location.pathname.toLowerCase();
  }

  function fileName() {
    return path().split('/').pop() || '';
  }

  function isCoachRoute() {
    var p = path();
    if (p.indexOf('/coach/') === 0) return true;
    if (COACH_PAGE_FILES[fileName()]) return true;
    try {
      return (window.Auth && window.Auth.type === 'Coach') || localStorage.getItem('sl_type') === 'Coach';
    } catch (e) {
      return false;
    }
  }

  function pageKey() {
    var p = path();
    if (p.indexOf('/coach/dashboard') === 0) return 'dashboard';
    if (p.indexOf('/coach/my-players') === 0) return 'my-players';
    if (p.indexOf('/coach/add-player') === 0) return 'add-player';
    if (p.indexOf('/coach/bulk-add-players') === 0) return 'bulk-add-players';
    if (p.indexOf('/coach/fixtures') === 0) return 'fixtures';
    if (p.indexOf('/coach/video-reels') === 0) return 'video-reels';
    if (p.indexOf('/coach/chat') === 0) return 'chat';
    if (p.indexOf('/coach/notifications') === 0) return 'notifications';
    if (p.indexOf('/coach/settings') === 0) return 'settings';
    if (p.indexOf('/coach/match-facts') === 0) return 'match-facts';
    return COACH_PAGE_FILES[fileName()] || 'coach';
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function money(value) {
    if (typeof window.formatValue === 'function') return window.formatValue(Number(value) || 0).replace(/\u00c2/g, '');
    var n = Number(value) || 0;
    if (!n) return '\u00a30';
    if (n >= 1000000) return '\u00a3' + (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
    if (n >= 1000) return '\u00a3' + Math.round(n / 1000) + 'k';
    return '\u00a3' + n.toLocaleString('en-GB');
  }

  function nameOf(p) {
    return (((p && p.first_name) || '') + ' ' + ((p && p.last_name) || '')).trim() || 'Player';
  }

  function initialsOf(p) {
    if (typeof window.initials === 'function') return window.initials((p && p.first_name) || '', (p && p.last_name) || '') || 'SL';
    var first = ((p && p.first_name) || 'S').charAt(0);
    var last = ((p && p.last_name) || 'L').charAt(0);
    return (first + last).toUpperCase();
  }

  function overall(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) return '--';
    return String(Math.round(n > 10 ? n : n * 10));
  }

  function completion(p) {
    var keys = ['first_name', 'last_name', 'age_group', 'specific_position', 'overall_rating', 'transfer_value', 'height_category', 'build_category', 'foot'];
    var done = keys.filter(function (k) {
      return p && p[k] !== null && p[k] !== undefined && String(p[k]).trim() !== '';
    }).length;
    if (Number(p && p.appearances) > 0) done++;
    if (Number(p && p.goals) > 0 || Number(p && p.assists) > 0) done++;
    return Math.min(100, Math.round(done / 11 * 100));
  }

  function renderPlayerCard(p, opts) {
    opts = opts || {};
    var comp = completion(p);
    var position = p.specific_position || p.primary_position || p.position_group || 'Position TBC';
    var age = p.age_group || (p.age ? p.age + ' yrs' : 'Age TBC');
    var url = opts.url || ('player-profile.html?id=' + encodeURIComponent(p.id || ''));
    var coachControl = opts.coachControl || '';
    return '<article class="coach-v2-player-card">' +
      '<div class="coach-v2-player-top">' +
      '<div class="coach-v2-avatar">' + esc(initialsOf(p)) + '</div>' +
      '<div class="coach-v2-player-main"><h4>' + esc(nameOf(p)) + '</h4><p>' + esc(age) + ' - ' + esc(position) + '</p></div>' +
      '<div class="coach-v2-rating">' + esc(overall(p.overall_rating)) + '</div>' +
      '</div>' +
      '<div class="coach-v2-player-facts">' +
      '<span><b>' + esc(money(p.transfer_value || 0)) + '</b><small>Value</small></span>' +
      '<span><b>' + esc(p.appearances || 0) + '</b><small>Apps</small></span>' +
      '<span><b>' + esc(p.goals || 0) + '</b><small>Goals</small></span>' +
      '</div>' +
      '<div class="coach-v2-progress"><div><span>Profile completion</span><b>' + comp + '%</b></div><i style="width:' + comp + '%"></i></div>' +
      coachControl +
      '<a class="btn btn-outline" href="' + esc(url) + '" style="width:100%;text-decoration:none">View / edit profile</a>' +
      '</article>';
  }

  function enable() {
    if (!document.body || !isCoachRoute() || path().indexOf('/coach/onboarding') === 0 || fileName() === 'coach-onboarding.html') return;
    var key = pageKey();
    document.body.classList.add('coach-v2', 'coach-page-' + key);
    document.body.classList.remove('theme-dark');
    document.body.classList.add('theme-light');
  }

  function firstName() {
    try {
      return (window.Auth && window.Auth.user && window.Auth.user.firstName) || localStorage.getItem('sl_first_name') || '';
    } catch (e) {
      return '';
    }
  }

  function pageTitle() {
    var key = pageKey();
    var map = {
      dashboard: 'Dashboard',
      'my-players': 'My players',
      'add-player': 'Add player',
      'bulk-add-players': 'Bulk import',
      fixtures: 'Fixtures',
      'video-reels': 'Video reels',
      chat: 'Chat',
      notifications: 'Notifications',
      settings: 'Settings',
      'match-facts': 'Match facts'
    };
    return map[key] || 'Coach';
  }

  function addHero() {
    var content = document.querySelector('.page-content');
    if (!content || content.querySelector('.coach-v2-hero')) return;
    var key = pageKey();
    var copy = {
      dashboard: ['Welcome' + (firstName() ? ', ' + firstName() : ''), 'Manage your squad, fixtures, match facts and messages from one calm coach workspace.'],
      'my-players': ['Your squad, clearly organised.', 'Search, review and update player profiles without fighting tables or clutter.'],
      'add-player': ['Create a player profile.', 'Add the details scouts need, then build evidence with fixtures, match facts and video.'],
      'bulk-add-players': ['Bulk player import.', 'Use the desktop-sized import view when you need to review every player column properly.'],
      fixtures: ['Fixtures that scouts can act on.', 'Publish upcoming games with enough context for reviewed scouts to plan attendance.'],
      'video-reels': ['Video evidence that stays organised.', 'Upload clips, assign them to players and keep approved evidence easy to find.'],
      chat: ['Coach-mediated conversations.', 'Keep scout conversations attached to the right player context and safeguarding route.'],
      notifications: ['What needs your attention.', 'Important player, fixture and scout activity without noise.'],
      settings: ['Settings that match how you coach.', 'Manage team access, alerts, security and preferences.'],
      'match-facts': ['Match facts.', 'Record the evidence that feeds coach profiles, scout search and player development.']
    }[key] || ['Coach workspace', 'ScoutLink coach tools.'];
    var actions = {
      dashboard: [
        ['Add player', 'add-player.html', 'btn-primary'],
        ['Log match facts', 'match-facts.html', 'btn-outline']
      ],
      'my-players': [
        ['Add player', 'add-player.html', 'btn-primary'],
        ['Bulk import', 'bulk-add-players.html', 'btn-outline']
      ],
      fixtures: [
        ['Add fixture', '#', 'btn-primary']
      ],
      'video-reels': [
        ['Upload video', '#', 'btn-primary']
      ],
      chat: [
        ['Refresh chats', '#', 'btn-outline']
      ]
    }[key] || [];
    var actionHtml = actions.map(function (a) {
      return '<a class="btn ' + a[2] + '" href="' + esc(a[1]) + '">' + esc(a[0]) + '</a>';
    }).join('');
    var hero = document.createElement('section');
    hero.className = 'coach-v2-hero';
    hero.innerHTML = '<div><span class="coach-v2-chip">Coach workspace</span><h1>' + esc(copy[0]) + '</h1><p>' + esc(copy[1]) + '</p></div>' +
      (actionHtml ? '<div class="coach-v2-actions">' + actionHtml + '</div>' : '');
    if (key === 'dashboard') {
      content.insertBefore(hero, content.firstChild);
    } else if (key !== 'chat') {
      content.insertBefore(hero, content.firstChild);
    }
  }

  function addBottomNav() {
    if (document.querySelector('.coach-v2-bottom-nav')) return;
    var items = [
      ['Dashboard', 'coach-dashboard.html', 'H', 'dashboard'],
      ['Players', 'coach-my-players.html', 'P', 'my-players'],
      ['Add', 'add-player.html', '+', 'add-player'],
      ['Fixtures', 'coach-fixtures.html', 'F', 'fixtures'],
      ['More', 'coach-settings.html', 'S', 'settings']
    ];
    var key = pageKey();
    var nav = document.createElement('nav');
    nav.className = 'coach-v2-bottom-nav';
    nav.setAttribute('aria-label', 'Coach quick navigation');
    nav.innerHTML = items.map(function (item) {
      var active = key === item[3] || (item[3] === 'settings' && ['video-reels', 'chat', 'notifications', 'settings', 'match-facts', 'bulk-add-players'].indexOf(key) >= 0);
      return '<a class="' + (active ? 'active ' : '') + (item[3] === 'add-player' ? 'add' : '') + '" href="' + item[1] + '"><span>' + esc(item[2]) + '</span>' + esc(item[0]) + '</a>';
    }).join('');
    document.body.appendChild(nav);
  }

  function tidyTopbar() {
    var title = document.querySelector('.topbar-title');
    if (title && !title.dataset.coachV2Title) {
      title.dataset.coachV2Title = '1';
      if (!/welcome/i.test(title.textContent || '')) title.textContent = pageTitle();
    }
    document.querySelectorAll('.topbar .btn[onclick*="logout"], .topbar button[onclick*="logout"]').forEach(function (btn) {
      btn.classList.add('btn-outline');
      btn.textContent = 'Sign out';
    });
  }

  function dashboardActions() {
    var key = pageKey();
    if (key !== 'dashboard') return;
    var content = document.querySelector('.page-content');
    if (!content || content.querySelector('.coach-v2-action-grid')) return;
    var grid = document.createElement('section');
    grid.className = 'coach-v2-action-grid';
    grid.innerHTML = [
      ['My players', 'Squad profiles', 'coach-my-players.html', 'MP'],
      ['Add player', 'Create profile', 'add-player.html', 'AP'],
      ['Match facts', 'Log a game', 'match-facts.html', 'MF'],
      ['Fixtures', 'Upcoming games', 'coach-fixtures.html', 'FX'],
      ['Chat', 'Scout messages', 'coach-chat.html', 'CH'],
      ['Video reels', 'Evidence clips', 'coach-video-reels.html', 'VR']
    ].map(function (a) {
      return '<a class="coach-v2-action-card" href="' + esc(a[2]) + '"><span>' + esc(a[3]) + '</span><div><h3>' + esc(a[0]) + '</h3><p>' + esc(a[1]) + '</p></div></a>';
    }).join('');
    var hero = content.querySelector('.coach-v2-hero');
    content.insertBefore(grid, hero ? hero.nextSibling : content.firstChild);
  }

  function setupAddPlayerWizard() {
    if (pageKey() !== 'add-player') return;
    var host = document.querySelector('.page-content > div') || document.querySelector('.page-content');
    if (!host || host.querySelector('.coach-v2-stepper')) return;
    var cards = Array.prototype.slice.call(host.children).filter(function (node) {
      return node.classList && node.classList.contains('table-card');
    });
    if (cards.length < 4) return;

    var submit = document.getElementById('submitBtn');
    var error = document.getElementById('formError');
    var success = document.getElementById('formSuccess');
    var reviewCard = document.createElement('section');
    reviewCard.className = 'table-card coach-v2-review-card';
    reviewCard.style.padding = '24px';
    reviewCard.style.marginBottom = '20px';
    reviewCard.innerHTML =
      '<h3 style="font-size:16px;font-weight:900;margin-bottom:8px">Review and save</h3>' +
      '<p style="color:var(--coach-muted);font-size:13px;margin-bottom:16px">Check the profile summary before creating the player.</p>' +
      '<dl>' +
      '<div><dt>Name</dt><dd data-review="name">--</dd></div>' +
      '<div><dt>Age group</dt><dd data-review="age">--</dd></div>' +
      '<div><dt>Position</dt><dd data-review="position">--</dd></div>' +
      '<div><dt>Profile</dt><dd data-review="profile">Average / Athletic</dd></div>' +
      '</dl>';
    host.insertBefore(reviewCard, error || success || submit || null);

    var assignment = document.getElementById('coachAssignmentCard');
    var steps = [
      { label: 'Basic', helper: 'Player identity and age group.', nodes: [cards[0]] },
      { label: 'Position', helper: 'Role, preferred foot and coach assignment.', nodes: [cards[1], assignment].filter(Boolean) },
      { label: 'Physical', helper: 'Height and build ranges.', nodes: [cards[3] || cards[2]] },
      { label: 'Attributes', helper: 'Coach ratings out of 10.', nodes: [cards[4] || cards[cards.length - 1]] },
      { label: 'Review', helper: 'Save the player once the details look right.', nodes: [reviewCard, error, success, submit].filter(Boolean) }
    ];
    var owned = [];
    steps.forEach(function (step) {
      step.nodes.forEach(function (node) {
        if (node && owned.indexOf(node) === -1) owned.push(node);
      });
    });
    cards.forEach(function (card) {
      if (owned.indexOf(card) === -1) steps[4].nodes.unshift(card);
    });

    var tracker = document.createElement('div');
    tracker.className = 'coach-v2-stepper';
    tracker.setAttribute('role', 'tablist');
    tracker.innerHTML = steps.map(function (step, i) {
      return '<button type="button" class="coach-v2-step" data-step="' + i + '" role="tab">Step ' + (i + 1) + ' ' + esc(step.label) + '</button>';
    }).join('');
    var caption = document.createElement('p');
    caption.className = 'coach-v2-wizard-caption';
    var nav = document.createElement('div');
    nav.className = 'coach-v2-wizard-nav';
    nav.innerHTML = '<button type="button" class="btn btn-outline" data-wizard-prev>Back</button><span class="coach-v2-wizard-progress"></span><button type="button" class="btn btn-primary" data-wizard-next>Next</button>';
    host.insertBefore(tracker, cards[0]);
    host.insertBefore(caption, cards[0]);
    host.appendChild(nav);

    var current = 0;
    var stepButtons = Array.prototype.slice.call(tracker.querySelectorAll('[data-step]'));
    var prev = nav.querySelector('[data-wizard-prev]');
    var next = nav.querySelector('[data-wizard-next]');
    var progress = nav.querySelector('.coach-v2-wizard-progress');

    function val(id) {
      var el = document.getElementById(id);
      return el ? (el.value || '').trim() : '';
    }

    function updateReview() {
      var first = val('firstName');
      var last = val('lastName');
      var position = val('specificPosition') || val('positionGroup') || '--';
      var height = val('heightCategory') || 'average';
      var build = val('buildCategory') || 'athletic';
      var set = function (key, value) {
        var el = reviewCard.querySelector('[data-review="' + key + '"]');
        if (el) el.textContent = value || '--';
      };
      set('name', ((first + ' ' + last).trim() || '--'));
      set('age', val('ageGroup') || '--');
      set('position', position);
      set('profile', height.replace(/_/g, ' ') + ' / ' + build.replace(/_/g, ' '));
    }

    function showStep(index) {
      current = Math.max(0, Math.min(steps.length - 1, index));
      updateReview();
      owned.forEach(function (node) { node.classList.add('coach-v2-step-hidden'); });
      steps[current].nodes.forEach(function (node) { node.classList.remove('coach-v2-step-hidden'); });
      stepButtons.forEach(function (btn, i) {
        btn.classList.toggle('is-active', i === current);
        btn.setAttribute('aria-selected', i === current ? 'true' : 'false');
      });
      caption.textContent = steps[current].helper;
      prev.style.visibility = current === 0 ? 'hidden' : 'visible';
      next.style.display = current === steps.length - 1 ? 'none' : '';
      if (progress) progress.textContent = 'Section ' + (current + 1) + ' of ' + steps.length;
      if (next && current < steps.length - 1) next.textContent = 'Next: ' + steps[current + 1].label;
    }

    stepButtons.forEach(function (btn) {
      btn.addEventListener('click', function () { showStep(Number(btn.getAttribute('data-step')) || 0); });
    });
    if (prev) prev.addEventListener('click', function () { showStep(current - 1); tracker.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    if (next) next.addEventListener('click', function () { showStep(current + 1); tracker.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    host.addEventListener('input', updateReview);
    host.addEventListener('change', updateReview);
    if (submit) submit.classList.add('coach-v2-save-player');
    showStep(0);
  }

  function patchChatRefreshHero() {
    var key = pageKey();
    if (key !== 'chat') return;
    var refresh = document.getElementById('refreshThreads');
    var heroBtn = document.querySelector('.coach-v2-hero a[href="#"]');
    if (refresh && heroBtn && !heroBtn.dataset.bound) {
      heroBtn.dataset.bound = '1';
      heroBtn.addEventListener('click', function (e) {
        e.preventDefault();
        refresh.click();
      });
    }
  }

  function bindHeroActions() {
    var key = pageKey();
    var heroBtn = document.querySelector('.coach-v2-hero a[href="#"]');
    if (!heroBtn || heroBtn.dataset.coachV2Bound) return;
    heroBtn.dataset.coachV2Bound = '1';
    heroBtn.addEventListener('click', function (e) {
      e.preventDefault();
      if (key === 'fixtures') {
        var target = document.getElementById('addFixtureCard') || document.getElementById('fOpponent');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        var input = document.getElementById('fOpponent');
        if (input) setTimeout(function () { input.focus(); }, 350);
      } else if (key === 'video-reels') {
        var upload = document.querySelector('input[type="file"], .dropzone, .upload-zone, #uploadVideoBtn');
        if (upload) upload.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }

  function refresh() {
    enable();
    if (!document.body || !document.body.classList.contains('coach-v2')) return;
    installRenderers();
    tidyTopbar();
    addHero();
    dashboardActions();
    setupAddPlayerWizard();
    addBottomNav();
    patchChatRefreshHero();
    bindHeroActions();
  }

  window.CoachV2 = {
    refresh: refresh,
    renderPlayerCard: renderPlayerCard,
    pageKey: pageKey
  };

  function installRenderers() {
    window.renderCoachMobilePlayerCard = function (p) {
      return renderPlayerCard(p, { url: 'player-profile.html?id=' + encodeURIComponent(p.id || '') });
    };
    window.renderCoachMyPlayerCard = function (p, opts) {
      opts = opts || {};
      return renderPlayerCard(p, {
        url: opts.url || ('player-profile.html?id=' + encodeURIComponent(p.id || '')),
        coachControl: opts.coachControl
      });
    };
  }

  installRenderers();

  if (document.body) enable();
  document.addEventListener('DOMContentLoaded', function () {
    refresh();
    setTimeout(refresh, 300);
    setTimeout(refresh, 1200);
  });
  window.addEventListener('resize', refresh);
})();
