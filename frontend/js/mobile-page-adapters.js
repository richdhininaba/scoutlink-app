'use strict';

/* Phone page adapters. These do not alter backend/business logic. */
(function () {
  function isMobile() {
    return window.ScoutLinkMobileShell ? ScoutLinkMobileShell.isMobile() : (window.matchMedia && window.matchMedia('(max-width: 767px)').matches);
  }

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function slugFromPath() {
    var p = window.location.pathname.replace(/\/$/, '').split('/').filter(Boolean).pop() || 'home';
    return p.replace(/\.html$/, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  }

  function applyBodyContext() {
    document.body.classList.add('mobile-route-' + slugFromPath());
    var role = (window.MobileNavigation && MobileNavigation.currentRole()) || '';
    if (role) document.body.classList.add('mobile-role-' + role.toLowerCase());
  }

  function score100(v) {
    var n = parseFloat(v);
    if (Number.isNaN(n)) return '--';
    return String(Math.round(n > 10 ? n : n * 10));
  }

  function money(v) {
    var n = Number(v || 0);
    if (!n) return 'Calculating';
    if (typeof formatValue === 'function') return formatValue(n);
    return 'GBP ' + n.toLocaleString('en-GB', { maximumFractionDigits: 0 });
  }

  function completion(p) {
    if (p.profile_completion != null) return Math.max(0, Math.min(100, Math.round(Number(p.profile_completion) || 0)));
    var keys = ['first_name', 'last_name', 'age_group', 'specific_position', 'overall_rating', 'transfer_value', 'height_category', 'build_category', 'foot'];
    var done = keys.filter(function (k) { return p[k] != null && String(p[k]).trim() !== ''; }).length;
    if (Number(p.appearances) > 0) done++;
    if (Number(p.goals) > 0 || Number(p.assists) > 0 || Number(p.clean_sheets) > 0) done++;
    return Math.min(100, Math.round(done / 11 * 100));
  }

  function playerName(p) {
    return ([p.first_name, p.last_name].filter(Boolean).join(' ') || p.name || 'Player').trim();
  }

  function initials(first, last) {
    if (typeof window.initials === 'function') return window.initials(first, last);
    return ((first || '').charAt(0) + (last || '').charAt(0) || 'SL').toUpperCase();
  }

  function fact(label, value) {
    return '<div class="mobile-fact"><b>' + esc(value) + '</b><span>' + esc(label) + '</span></div>';
  }

  function renderPlayerCard(p, opts) {
    opts = opts || {};
    var name = playerName(p);
    var comp = completion(p);
    var href = opts.href || ('player-profile.html?id=' + encodeURIComponent(p.id || ''));
    return '<article class="mobile-list-card">' +
      '<div class="mobile-list-head">' +
      '<div class="mobile-avatar">' + esc(initials(p.first_name, p.last_name)) + '</div>' +
      '<div><div class="mobile-list-title">' + esc(name) + '</div><div class="mobile-list-meta">' + esc([p.age_group || (p.age ? p.age + ' yrs' : ''), p.specific_position || p.primary_position || p.position_group || 'Position TBC'].filter(Boolean).join(' - ')) + '</div></div>' +
      '<div class="mobile-score">' + esc(score100(p.overall_rating)) + '</div>' +
      '</div>' +
      '<div class="mobile-fact-grid">' + fact('Value', money(p.transfer_value)) + fact('Apps', p.appearances || 0) + fact('Goals', p.goals || 0) + '</div>' +
      '<div><div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;color:var(--m-muted);margin-bottom:6px"><span>Profile completion</span><b>' + comp + '%</b></div><div class="mobile-progress"><i style="width:' + comp + '%"></i></div></div>' +
      (opts.extra || '') +
      '<a class="btn btn-outline" href="' + esc(href) + '">' + esc(opts.cta || 'View / edit profile') + '</a>' +
      '</article>';
  }

  window.renderCoachMobilePlayerCard = function (p) { return renderPlayerCard(p, { cta: 'View / edit profile' }); };
  window.renderCoachMyPlayerCard = function (p, opts) {
    opts = opts || {};
    opts.cta = 'View / edit profile';
    return renderPlayerCard(p, opts);
  };
  window.applyCoachMobileEnhancements = function () {};
  window.isScoutLinkPhone = isMobile;

  function addLauncher(selector, items) {
    var content = document.querySelector(selector || '.page-content');
    if (!content || document.getElementById('mobileLauncher')) return;
    var html = '<section id="mobileLauncher" class="mobile-only"><div class="mobile-action-grid">' +
      items.map(function (item) {
        return '<a class="mobile-action-card" href="' + esc(item.href) + '"><b>' + esc(item.title) + '</b><span>' + esc(item.sub || '') + '</span></a>';
      }).join('') +
      '</div></section>';
    content.insertAdjacentHTML('afterbegin', html);
  }

  function adaptLaunchers() {
    var p = window.location.pathname;
    if (p.indexOf('/coach/dashboard') >= 0 || /coach-dashboard\.html$/.test(p)) {
      addLauncher('.page-content', [
        { title: 'My players', sub: 'Review squad', href: 'coach-my-players.html' },
        { title: 'Add player', sub: 'Create profile', href: 'add-player.html' },
        { title: 'Match facts', sub: 'Record game', href: 'match-facts.html' },
        { title: 'Fixtures', sub: 'Upcoming games', href: 'coach-fixtures.html' },
        { title: 'Chat', sub: 'Scout messages', href: 'coach-chat.html' },
        { title: 'Video reels', sub: 'Upload clips', href: 'coach-video-reels.html' },
        { title: 'Notifications', sub: 'Updates', href: 'coach-notifications.html' },
        { title: 'Settings', sub: 'Account', href: 'coach-settings.html' }
      ]);
    }
    if (p.indexOf('/scout/dashboard') >= 0 || /scout-dashboard\.html$/.test(p)) {
      addLauncher('.page-content', [
        { title: 'Player database', sub: 'Find prospects', href: 'player-search.html' },
        { title: 'My pipeline', sub: 'Track interest', href: 'scout-pipeline.html' },
        { title: 'Compare players', sub: 'Side-by-side', href: 'compare-players.html' },
        { title: 'Predictions', sub: 'Saved analysis', href: 'scout-predictions.html' },
        { title: 'Fixtures', sub: 'Attend games', href: 'scout-fixtures.html' },
        { title: 'Exports', sub: 'Reports', href: 'scout-exports.html' },
        { title: 'Chat', sub: 'Coach messages', href: 'scout-chat.html' },
        { title: 'Setup', sub: 'Preferences', href: 'scout-setup.html' }
      ]);
    }
    if (p.indexOf('/stratex/dashboard') >= 0 || /stratex-dashboard\.html$/.test(p)) {
      addLauncher('.page-content', [
        { title: 'Registrations', sub: 'Review requests', href: 'stratex-registrations.html' },
        { title: 'Users', sub: 'Manage access', href: 'stratex-users.html' },
        { title: 'Org', sub: 'Team structure', href: 'stratex-org.html' },
        { title: 'Hiring', sub: 'Careers admin', href: 'stratex-hiring.html' },
        { title: 'Players', sub: 'Database', href: 'stratex-players.html' },
        { title: 'Scouts', sub: 'Scout users', href: 'stratex-scouts.html' },
        { title: 'Coaches', sub: 'Coach users', href: 'stratex-coaches.html' },
        { title: 'Notifications', sub: 'System updates', href: 'stratex-notifications.html' }
      ]);
    }
  }

  function addBulkMessage() {
    if (!/bulk-add-players/.test(window.location.pathname) && !/bulk-add-players\.html$/.test(window.location.pathname)) return;
    var content = document.querySelector('.page-content');
    if (!content || document.getElementById('bulkMobileMessage')) return;
    content.insertAdjacentHTML('afterbegin',
      '<section id="bulkMobileMessage" class="mobile-desktop-message">' +
      '<h3>Bulk import works best on a bigger screen</h3>' +
      '<p>Bulk player import is available on desktop and tablet so you can review every column properly.</p>' +
      '<a class="btn btn-primary" href="add-player.html">Add single player</a>' +
      '<a class="btn btn-outline" href="mailto:?subject=ScoutLink bulk import&body=' + encodeURIComponent(window.location.href) + '">Send myself the desktop link</a>' +
      '<a class="btn btn-ghost" href="coach-my-players.html">View my players</a>' +
      '</section>');
  }

  function stepifyFormPage() {
    if (!isMobile()) return;
    var path = window.location.pathname;
    var isAdd = /add-player/.test(path);
    var isSetup = /scout\/setup|scout-setup/.test(path);
    if (!isAdd && !isSetup) return;
    var content = document.querySelector('.page-content > div, .page-content');
    if (!content || content.dataset.mobileStepper) return;
    var panels = Array.prototype.filter.call(content.querySelectorAll('.table-card'), function (card) {
      return !card.closest('.modal-overlay');
    });
    if (panels.length < 2) return;
    content.dataset.mobileStepper = '1';
    content.classList.add('mobile-stepper');
    panels.forEach(function (panel, idx) {
      panel.classList.add('mobile-step-panel');
      if (idx === 0) panel.classList.add('active');
    });
    var controls = document.createElement('div');
    controls.className = 'mobile-step-controls mobile-only';
    controls.innerHTML = '<button class="btn btn-outline" type="button" data-step-prev>Back</button><button class="btn btn-primary" type="button" data-step-next>Next</button>';
    content.appendChild(controls);
    var index = 0;
    function show(i) {
      index = Math.max(0, Math.min(panels.length - 1, i));
      panels.forEach(function (p, n) { p.classList.toggle('active', n === index); });
      controls.querySelector('[data-step-prev]').disabled = index === 0;
      controls.querySelector('[data-step-next]').textContent = index === panels.length - 1 ? 'Review' : 'Next';
    }
    controls.querySelector('[data-step-prev]').addEventListener('click', function () { show(index - 1); });
    controls.querySelector('[data-step-next]').addEventListener('click', function () { show(index + 1); });
    show(0);
  }

  function headersFor(table) {
    return Array.prototype.map.call(table.querySelectorAll('thead th'), function (th) {
      return th.textContent.trim();
    });
  }

  function cardifyTable(table) {
    if (!isMobile() || table.dataset.mobileCardified || table.classList.contains('bulk-table')) return;
    var headers = headersFor(table);
    if (!headers.length) return;
    var rows = Array.prototype.slice.call(table.querySelectorAll('tbody tr'));
    if (!rows.length) return;
    var holder = document.createElement('div');
    holder.className = 'mobile-card-list mobile-table-cards mobile-only';
    rows.forEach(function (row) {
      var cells = Array.prototype.slice.call(row.children);
      var title = (cells[0] && cells[0].textContent.trim()) || 'Item';
      var score = '';
      var facts = cells.slice(1, 4).map(function (td, idx) {
        var label = headers[idx + 1] || 'Detail';
        var val = td.textContent.trim() || '--';
        if (/overall|score|rating/i.test(label)) score = val;
        return fact(label, val);
      }).join('');
      var actions = cells.map(function (td) {
        return Array.prototype.map.call(td.querySelectorAll('a,button,select'), function (el) {
          return el.outerHTML;
        }).join('');
      }).filter(Boolean).join('');
      holder.insertAdjacentHTML('beforeend',
        '<article class="mobile-list-card">' +
        '<div class="mobile-list-head"><div class="mobile-avatar">SL</div><div><div class="mobile-list-title">' + esc(title) + '</div><div class="mobile-list-meta">' + esc(headers[0] || 'Record') + '</div></div>' +
        (score ? '<div class="mobile-score" style="font-size:18px">' + esc(score) + '</div>' : '') + '</div>' +
        '<div class="mobile-fact-grid">' + facts + '</div>' +
        (actions ? '<div style="display:grid;gap:8px">' + actions + '</div>' : '') +
        '</article>');
    });
    table.dataset.mobileCardified = '1';
    table.insertAdjacentElement('afterend', holder);
  }

  function cardifyTables() {
    document.querySelectorAll('table.sl-table, .table-card table').forEach(cardifyTable);
  }

  function enhanceChat() {
    var shell = document.querySelector('.chat-shell');
    if (!shell) return;
    if (!shell.classList.contains('mobile-chat-detail')) shell.classList.add('mobile-chat-list');
    var head = shell.querySelector('.chat-head');
    if (head && !head.querySelector('.mobile-chat-back')) {
      var back = document.createElement('button');
      back.type = 'button';
      back.className = 'mobile-chat-back btn btn-ghost mobile-only';
      back.setAttribute('aria-label', 'Back to conversations');
      back.textContent = '<';
      back.addEventListener('click', function () {
        shell.classList.remove('mobile-chat-detail');
        shell.classList.add('mobile-chat-list');
      });
      head.insertBefore(back, head.firstChild);
    }
    if (!window.__mobileSelectThreadWrapped && typeof window.selectThread === 'function') {
      var original = window.selectThread;
      window.selectThread = function () {
        var result = original.apply(this, arguments);
        if (isMobile()) {
          shell.classList.remove('mobile-chat-list');
          shell.classList.add('mobile-chat-detail');
        }
        return result;
      };
      window.__mobileSelectThreadWrapped = true;
    }
    shell.querySelectorAll('.thread-item').forEach(function (item) {
      if (!item.dataset.mobileClickHint) {
        item.dataset.mobileClickHint = '1';
        item.setAttribute('role', 'button');
        item.tabIndex = 0;
      }
    });
  }

  function patchDesktopTablesMessage() {
    document.querySelectorAll('.bulk-table-wrap').forEach(function (wrap) {
      wrap.closest('.table-card') && wrap.closest('.table-card').classList.add('desktop-only-table');
    });
  }

  function init() {
    applyBodyContext();
    adaptLaunchers();
    addBulkMessage();
    stepifyFormPage();
    patchDesktopTablesMessage();
    cardifyTables();
    enhanceChat();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 80); });
  } else {
    setTimeout(init, 80);
  }

  if (window.MutationObserver) {
    var timer = null;
    new MutationObserver(function () {
      clearTimeout(timer);
      timer = setTimeout(init, 160);
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  window.ScoutLinkMobileAdapters = { init: init, cardifyTables: cardifyTables };
})();
