'use strict';

(function () {
  var SCOUT_PAGE_FILES = {
    'scout-dashboard.html': 'dashboard',
    'player-search.html': 'player-search',
    'scout-pipeline.html': 'pipeline',
    'scout-rankings.html': 'rankings',
    'scout-fixtures.html': 'fixtures',
    'scout-predictions.html': 'predictions',
    'scout-exports.html': 'exports',
    'compare-players.html': 'compare-players',
    'scout-setup.html': 'setup',
    'scout-events.html': 'events',
    'scout-chat.html': 'chat',
    'scout-notifications.html': 'notifications',
    'scout-settings.html': 'settings',
    'report-concern.html': 'report-a-concern',
    'player-profile.html': 'profile'
  };

  function path() {
    return window.location.pathname.toLowerCase();
  }

  function fileName() {
    return path().split('/').pop() || '';
  }

  function isScoutUser() {
    try {
      return (window.Auth && window.Auth.type === 'Scout') ||
        localStorage.getItem('sl_type') === 'Scout' ||
        sessionStorage.getItem('demoRole') === 'scout';
    } catch (e) {
      return false;
    }
  }

  function isScoutRoute() {
    var p = path();
    if (p.indexOf('/scout/') === 0) return true;
    if (p.indexOf('/player/profile') === 0) return isScoutUser();
    if (fileName() === 'player-profile.html') return isScoutUser();
    return !!SCOUT_PAGE_FILES[fileName()] && fileName().indexOf('coach-') !== 0;
  }

  function pageKey() {
    var p = path();
    if (p.indexOf('/scout/dashboard') === 0) return 'dashboard';
    if (p.indexOf('/scout/player-search') === 0) return 'player-search';
    if (p.indexOf('/scout/pipeline') === 0) return 'pipeline';
    if (p.indexOf('/scout/rankings') === 0) return 'rankings';
    if (p.indexOf('/scout/fixtures') === 0) return 'fixtures';
    if (p.indexOf('/scout/predictions') === 0) return 'predictions';
    if (p.indexOf('/scout/exports') === 0) return 'exports';
    if (p.indexOf('/scout/compare-players') === 0) return 'compare-players';
    if (p.indexOf('/scout/setup') === 0) return 'setup';
    if (p.indexOf('/scout/events') === 0) return 'events';
    if (p.indexOf('/scout/chat') === 0) return 'chat';
    if (p.indexOf('/scout/notifications') === 0) return 'notifications';
    if (p.indexOf('/scout/report-a-concern') === 0 || p.indexOf('/scout/report-concern') === 0) return 'report-a-concern';
    if (p.indexOf('/scout/settings') === 0) return 'settings';
    if (p.indexOf('/player/profile') === 0 && isScoutUser()) return 'profile';
    if (fileName() === 'player-profile.html' && isScoutUser()) return 'profile';
    return SCOUT_PAGE_FILES[fileName()] || 'scout';
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function hrefFor(target) {
    target = String(target || '');
    if (!target || target.charAt(0) === '#' || target.charAt(0) === '/' || /^https?:/i.test(target)) return target;
    var parts = target.split('?');
    var base = parts[0];
    var query = parts.length > 1 ? '?' + parts.slice(1).join('?') : '';
    var map = {
      'scout-dashboard.html': '/scout/dashboard',
      'player-search.html': '/scout/player-search',
      'scout-pipeline.html': '/scout/pipeline',
      'scout-rankings.html': '/scout/rankings',
      'scout-fixtures.html': '/scout/fixtures',
      'scout-predictions.html': '/scout/predictions',
      'scout-exports.html': '/scout/exports',
      'compare-players.html': '/scout/compare-players',
      'scout-setup.html': '/scout/setup',
      'scout-events.html': '/scout/events',
      'scout-chat.html': '/scout/chat',
      'scout-notifications.html': '/scout/notifications',
      'scout-settings.html': '/scout/settings',
      'report-concern.html': '/scout/report-a-concern',
      'player-profile.html': '/player/profile'
    };
    return (map[base] || target) + (map[base] ? query : '');
  }

  function firstName() {
    try {
      return (window.Auth && window.Auth.user && window.Auth.user.firstName) || localStorage.getItem('sl_first_name') || '';
    } catch (e) {
      return '';
    }
  }

  function pageTitle() {
    var map = {
      dashboard: 'Dashboard',
      'player-search': 'Player database',
      pipeline: 'Pipeline',
      rankings: 'Rankings',
      fixtures: 'Fixtures',
      predictions: 'Predictions',
      exports: 'Exports',
      'compare-players': 'Compare players',
      setup: 'Scout setup',
      events: 'Events',
      chat: 'Chat',
      notifications: 'Notifications',
      'report-a-concern': 'Report a concern',
      settings: 'Settings',
      profile: 'Player profile'
    };
    return map[pageKey()] || 'Scout';
  }

  function enable() {
    if (!document.body || !isScoutRoute()) return;
    if (fileName() === 'player-profile.html' && !isScoutUser()) return;
    var key = pageKey();
    document.body.classList.add('scout-v1', 'scout-page-' + key);
    document.body.classList.remove('theme-dark', 'coach-v2');
    document.body.classList.add('theme-light');
  }

  function tidyNavGroups() {
    var nav = document.getElementById('sidebarNav');
    if (!nav || nav.dataset.scoutV1Grouped) return;
    nav.dataset.scoutV1Grouped = '1';
    var groups = [
      ['Overview', ['Dashboard']],
      ['Recruitment', ['Player search', 'My pipeline', 'Rankings', 'Compare players']],
      ['Analysis', ['Fixtures', 'Predictions', 'Exports']],
      ['Workspace', ['Scout setup', 'Events', 'Chat', 'Notifications', 'Settings', 'Report a Concern']]
    ];
    var links = Array.prototype.slice.call(nav.querySelectorAll('a'));
    if (!links.length) return;
    var html = '';
    groups.forEach(function (group) {
      var groupLinks = links.filter(function (link) {
        var text = (link.textContent || '').trim().toLowerCase();
        return group[1].some(function (label) { return text.indexOf(label.toLowerCase()) >= 0; });
      });
      if (!groupLinks.length) return;
      html += '<div class="scout-v1-nav-group"><span class="scout-v1-nav-label">' + esc(group[0]) + '</span>';
      groupLinks.forEach(function (link) { html += link.outerHTML; });
      html += '</div>';
    });
    if (html) nav.innerHTML = html;
  }

  function tidyTopbar() {
    var title = document.querySelector('.topbar-title');
    if (title && !title.dataset.scoutV1Title) {
      title.dataset.scoutV1Title = '1';
      title.textContent = pageTitle();
    }
    document.querySelectorAll('.topbar .btn[onclick*="logout"], .topbar button[onclick*="logout"], .topbar #logoutBtn').forEach(function (btn) {
      btn.classList.add('btn-outline');
      btn.textContent = 'Sign out';
    });
  }

  function heroCopy() {
    var name = firstName();
    var map = {
      dashboard: ['Find the right player' + (name ? ', ' + name : ''), 'Search, shortlist, compare and run predictions from a calmer scout workspace.'],
      'player-search': ['Player database.', 'Search by evidence, compatibility and location without squeezing a desktop table onto the page.'],
      pipeline: ['Your recruitment pipeline.', 'Track coach-mediated interest and keep every player stage clear.'],
      rankings: ['Rankings that stay usable.', 'Review top players with explainable performance and profile evidence.'],
      fixtures: ['Fixtures worth attending.', 'See scout-visible games and respond with a clear attendance status.'],
      predictions: ['Prediction history.', 'Review the analysis your team has run and return to the player profile when needed.'],
      exports: ['Export history.', 'Track profile and prediction exports without wasting limits on redownloads.'],
      'compare-players': ['Compare two players.', 'Select players, review strengths and make the recommendation easy to scan.'],
      setup: ['Scout setup.', 'Set your weaknesses, role expectations and long-term recruitment priorities.'],
      events: ['Showcase events.', 'Track invitations and scout responses in one view.'],
      chat: ['Coach conversations.', 'Message coaches only where player interest has been registered.'],
      notifications: ['Notifications.', 'Keep recruitment, fixture and message activity in one focused feed.'],
      'report-a-concern': ['Report a concern.', 'Tell Stratex about inappropriate contact, data misuse, inaccurate access or a product safety issue.'],
      settings: ['Settings.', 'Manage your profile, region, plan and preferences.']
    };
    return map[pageKey()] || ['Scout workspace.', 'ScoutLink tools for reviewed recruitment workflows.'];
  }

  function addHero() {
    var key = pageKey();
    if (key === 'profile') return;
    var content = document.querySelector('.page-content');
    if (!content || content.querySelector('.scout-v1-hero')) return;
    var copy = heroCopy();
    var actions = {
      dashboard: [['Player database', 'player-search.html', 'btn-primary'], ['Pipeline', 'scout-pipeline.html', 'btn-outline']],
      'player-search': [['Pipeline', 'scout-pipeline.html', 'btn-outline']],
      pipeline: [['Find players', 'player-search.html', 'btn-primary']],
      predictions: [['Find players', 'player-search.html', 'btn-primary']],
      exports: [['Find players', 'player-search.html', 'btn-primary']],
      'compare-players': [['Player database', 'player-search.html', 'btn-outline']],
      setup: [['Save setup', '#', 'btn-primary']]
    }[key] || [];
    var hero = document.createElement('section');
    hero.className = 'scout-v1-hero';
    hero.innerHTML = '<div><span class="scout-v1-chip">Scout workspace</span><h1>' + esc(copy[0]) + '</h1><p>' + esc(copy[1]) + '</p></div>' +
      (actions.length ? '<div class="scout-v1-hero-actions">' + actions.map(function (a) {
        return '<a class="btn ' + a[2] + '" href="' + esc(hrefFor(a[1])) + '">' + esc(a[0]) + '</a>';
      }).join('') + '</div>' : '');
    content.insertBefore(hero, content.firstChild);
  }

  function dashboardActions() {
    if (pageKey() !== 'dashboard') return;
    var content = document.querySelector('.page-content');
    if (!content || content.querySelector('.scout-v1-action-grid')) return;
    var grid = document.createElement('section');
    grid.className = 'scout-v1-action-grid';
    grid.innerHTML = [
      ['Player database', 'Search cards', 'player-search.html', 'DB'],
      ['Pipeline', 'Track interest', 'scout-pipeline.html', 'PL'],
      ['Compare players', 'Stacked review', 'compare-players.html', 'CP'],
      ['Predictions', 'Run analysis', 'scout-predictions.html', 'PR'],
      ['Fixtures', 'Attend games', 'scout-fixtures.html', 'FX'],
      ['Chat', 'Message coaches', 'scout-chat.html', 'CH'],
      ['Rankings', 'Top players', 'scout-rankings.html', 'RK'],
      ['Setup', 'Preferences', 'scout-setup.html', 'ST']
    ].map(function (item) {
      return '<a class="scout-v1-action-card" href="' + esc(hrefFor(item[2])) + '"><span class="scout-v1-action-icon">' + esc(item[3]) + '</span><span><h3>' + esc(item[0]) + '</h3><p>' + esc(item[1]) + '</p></span></a>';
    }).join('');
    var afterHero = content.querySelector('.scout-v1-hero');
    if (afterHero && afterHero.nextSibling) content.insertBefore(grid, afterHero.nextSibling);
    else content.insertBefore(grid, content.firstChild);
  }

  function addBottomNav() {
    if (document.querySelector('.scout-v1-bottom-nav')) return;
    var items = [
      ['Home', 'scout-dashboard.html', 'H', 'dashboard'],
      ['Search', 'player-search.html', 'S', 'player-search'],
      ['Pipeline', 'scout-pipeline.html', 'P', 'pipeline'],
      ['Compare', 'compare-players.html', 'C', 'compare-players'],
      ['More', 'scout-settings.html', 'M', 'settings']
    ];
    var key = pageKey();
    var nav = document.createElement('nav');
    nav.className = 'scout-v1-bottom-nav';
    nav.setAttribute('aria-label', 'Scout quick navigation');
    nav.innerHTML = items.map(function (item) {
      var active = key === item[3] || (item[3] === 'settings' && ['rankings', 'fixtures', 'predictions', 'exports', 'setup', 'events', 'chat', 'notifications', 'report-a-concern', 'settings'].indexOf(key) >= 0);
      return '<a class="' + (active ? 'active' : '') + '" href="' + esc(hrefFor(item[1])) + '"><span>' + esc(item[2]) + '</span>' + esc(item[0]) + '</a>';
    }).join('');
    document.body.appendChild(nav);
  }

  function stripSensitiveDisplay() {
    if (!document.body || !document.body.classList.contains('scout-v1')) return;
    var banned = /\b(email|e-mail|date of birth|dob|guardian|parent)\b/i;
    document.querySelectorAll('th,td,label,dt,span,small,p,div').forEach(function (el) {
      if (!el || el.closest('script,style')) return;
      if (el.children && el.children.length > 1 && !/^(TH|TD|LABEL|DT)$/i.test(el.tagName || '')) return;
      var text = (el.textContent || '').trim();
      if (!text || text.length > 80 || !banned.test(text)) return;
      var row = el.closest('tr,.form-group,.profile-row,.detail-row,.value-factor-row,.scout-v1-review-card div');
      if (row && !row.dataset.scoutV1SensitiveHidden) {
        row.dataset.scoutV1SensitiveHidden = '1';
        row.classList.add('scout-v1-sensitive-hidden');
      }
    });
  }

  function bindHeroActions() {
    if (pageKey() !== 'setup') return;
    var heroBtn = document.querySelector('.scout-v1-hero a[href="#"]');
    if (!heroBtn || heroBtn.dataset.scoutV1Bound) return;
    heroBtn.dataset.scoutV1Bound = '1';
    heroBtn.addEventListener('click', function (e) {
      e.preventDefault();
      var save = document.querySelector('button[type="submit"], #saveSetupBtn, .btn-primary');
      if (save && save !== heroBtn) save.click();
    });
  }

  function refresh() {
    enable();
    if (!document.body || !document.body.classList.contains('scout-v1')) return;
    tidyTopbar();
    tidyNavGroups();
    addHero();
    dashboardActions();
    stripSensitiveDisplay();
    addBottomNav();
    bindHeroActions();
  }

  window.ScoutV1 = { refresh: refresh, pageKey: pageKey };

  if (document.body) enable();
  document.addEventListener('DOMContentLoaded', function () {
    refresh();
    setTimeout(refresh, 300);
    setTimeout(refresh, 1200);
  });
  window.addEventListener('resize', refresh);
})();
