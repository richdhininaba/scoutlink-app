'use strict';

/* Stratex Admin V5
 * Exact rebuilt-data design with live parent-company publishing controls.
 * Draft and hidden records stay private. Published records feed the public site.
 */
(function () {
  var API = (function () {
    try {
      return localStorage.getItem('sl_api_url') || 'https://scoutlink-api.vercel.app';
    } catch (_) {
      return 'https://scoutlink-api.vercel.app';
    }
  }());

  var RICHDHIN_EMAIL = 'richdhin@stratexanalytics.co.uk';
  var state = {
    route: 'dashboard',
    data: {},
    selected: {},
    modalReturn: null
  };

  var ROUTES = [
    ['dashboard', '/admin', 'Dashboard', 'Overview', 'DB'],
    ['registrations', '/admin/registrations', 'Registrations', 'Operations', 'RG'],
    ['contact', '/admin/contact-forms', 'Contact Forms', 'Operations', 'CF'],
    ['crm', '/admin/crm', 'CRM', 'Operations', 'CR'],
    ['usage', '/admin/usage-requests', 'Usage Requests', 'Operations', 'UR'],
    ['blog', '/admin/blog', 'Blog / Learning Centre', 'Content', 'BL'],
    ['leadership', '/admin/leadership', 'Leadership', 'Content', 'LD'],
    ['org', '/admin/org-charts', 'Org Charts', 'People', 'OC'],
    ['add-user', '/admin/users/add', 'Add Stratex User', 'People', 'AU'],
    ['permissions', '/admin/permissions', 'Permissions', 'People', 'PM'],
    ['profile', '/admin/my-profile', 'My Profile', 'People', 'MP'],
    ['contracts', '/admin/contracts-pay', 'Contracts & Pay', 'People', 'CP'],
    ['hiring', '/admin/hiring', 'Hiring', 'People', 'HR'],
    ['trust', '/admin/trust-concerns', 'Trust & Concerns', 'Trust', 'TC'],
    ['showcase', '/admin/showcase-event', 'Showcase Event', 'Events', 'SE'],
    ['awards', '/admin/award-ceremonies', 'Award Ceremonies', 'Events', 'AC'],
    ['settings', '/admin/settings', 'Settings', 'Company', 'ST']
  ];

  var ROUTE_BY_ID = {};
  var ID_BY_PATH = {};
  ROUTES.forEach(function (route) {
    ROUTE_BY_ID[route[0]] = route;
    ID_BY_PATH[route[1]] = route[0];
  });
  ID_BY_PATH['/admin/login'] = 'login';
  ID_BY_PATH['/admin/admin-users'] = 'add-user';
  ID_BY_PATH['/admin/users'] = 'add-user';

  var PAGE_LOADERS = {};

  function auth() {
    try {
      return typeof Auth !== 'undefined' ? Auth : null;
    } catch (_) {
      return null;
    }
  }

  function currentUser() {
    var store = auth();
    return store && store.user ? store.user : {};
  }

  function token() {
    var store = auth();
    if (store && store.token) return store.token;
    try {
      return localStorage.getItem('sl_token') || '';
    } catch (_) {
      return '';
    }
  }

  function accountType() {
    var store = auth();
    if (store && store.type) return store.type;
    try {
      return localStorage.getItem('sl_type') || '';
    } catch (_) {
      return '';
    }
  }

  function loggedIn() {
    var store = auth();
    return !!(
      store &&
      typeof store.isLoggedIn === 'function' &&
      store.isLoggedIn() &&
      accountType() === 'Stratex'
    );
  }

  function userEmail() {
    return String(currentUser().email || '').trim().toLowerCase();
  }

  function isRichdhin() {
    return userEmail() === RICHDHIN_EMAIL;
  }

  function fullName(row) {
    row = row || {};
    return [row.first_name || row.firstName, row.last_name || row.lastName]
      .filter(Boolean)
      .join(' ') || row.full_name || row.fullName || row.name || row.email || 'Stratex user';
  }

  function initials(row) {
    return fullName(row || currentUser())
      .split(/\s+/)
      .filter(Boolean)
      .map(function (part) { return part.charAt(0); })
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'SA';
  }

  function roleLabel(row) {
    row = row || currentUser();
    if (String(row.email || '').toLowerCase() === RICHDHIN_EMAIL) {
      return 'Founder & Super Admin';
    }
    return row.job_title || row.jobTitle || row.admin_role || row.adminRole || row.role || 'Stratex Admin';
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[character];
    });
  }

  function cleanPath() {
    return (window.location.pathname || '/admin').replace(/\/+$/, '') || '/admin';
  }

  function routeFromPath() {
    return ID_BY_PATH[cleanPath()] || 'dashboard';
  }

  function route(id) {
    return ROUTE_BY_ID[id] || ROUTE_BY_ID.dashboard;
  }

  function number(value) {
    return Number(value || 0).toLocaleString('en-GB');
  }

  function moneyPence(value) {
    return '£' + (Number(value || 0) / 100).toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function date(value, includeTime) {
    if (!value) return '—';
    var parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleString('en-GB', includeTime ? {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    } : {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  function dateInput(value, includeTime) {
    if (!value) return '';
    var parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value).slice(0, includeTime ? 16 : 10);
    if (includeTime) return parsed.toISOString().slice(0, 16);
    return parsed.toISOString().slice(0, 10);
  }

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100);
  }

  async function api(method, path, body, formBody) {
    var options = {
      method: method,
      credentials: 'include',
      headers: { Authorization: 'Bearer ' + token() }
    };
    if (body !== undefined && body !== null) {
      if (formBody) {
        options.body = body;
      } else {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
      }
    }
    var response = await fetch(API + path, options);
    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      throw new Error(payload.error || payload.message || 'The request could not be completed.');
    }
    return payload;
  }

  async function apiBlob(path) {
    var response = await fetch(API + path, {
      credentials: 'include',
      headers: { Authorization: 'Bearer ' + token() }
    });
    if (!response.ok) {
      var payload = await response.json().catch(function () { return {}; });
      throw new Error(payload.error || 'The file could not be downloaded.');
    }
    return response.blob();
  }

  function downloadBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function setSession(payload) {
    if (!payload || !payload.token || !payload.user || (payload.accountType || 'Stratex') !== 'Stratex') {
      throw new Error('The Stratex sign-in response was incomplete.');
    }
    var store = auth();
    if (store && typeof store.set === 'function') {
      store.set(payload.token, payload.user, 'Stratex');
    } else {
      localStorage.setItem('sl_token', payload.token);
      localStorage.setItem('sl_user', JSON.stringify(payload.user));
      localStorage.setItem('sl_type', 'Stratex');
    }
  }

  function clearSession() {
    var store = auth();
    if (store && typeof store.clear === 'function') store.clear();
    ['sl_token', 'sl_user', 'sl_type', 'sl_user_id', 'sl_user_email'].forEach(function (key) {
      try { localStorage.removeItem(key); } catch (_) {}
    });
  }

  function statusClass(value) {
    var text = String(value || '').toLowerCase();
    if (/active|approved|accepted|published|live|confirmed|completed|resolved|public|selected|paid/.test(text)) return 'green';
    if (/pending|review|submitted|scheduled|contacted|planning|waiting|draft/.test(text)) return 'gold';
    if (/declined|closed|cancelled|urgent|high|inactive|withdrawn|not a fit|archived/.test(text)) return 'red';
    if (/management|super|private|showcase/.test(text)) return 'purple';
    if (/new|open|coach|scout/.test(text)) return 'blue';
    return 'grey';
  }

  function status(value, tone) {
    return '<span class="stx5-status ' + esc(tone || statusClass(value)) + '">' + esc(value || '—') + '</span>';
  }

  function button(label, tone, attributes) {
    attributes = attributes || '';
    var type = /\btype=/.test(attributes) ? '' : 'type="button" ';
    return '<button class="stx5-btn ' + esc(tone || '') + '" ' + type + attributes + '>' + esc(label) + '</button>';
  }

  function linkButton(label, href, tone, attributes) {
    return '<a class="stx5-btn ' + esc(tone || '') + '" href="' + esc(href) + '" ' + (attributes || '') + '>' + esc(label) + '</a>';
  }

  function hero(kicker, title, copy, actions, light) {
    return '<section class="stx5-hero ' + (light ? 'light' : '') + '">' +
      '<div><span>' + esc(kicker) + '</span><h2>' + esc(title) + '</h2><p>' + esc(copy) + '</p></div>' +
      (actions ? '<div class="stx5-actions">' + actions + '</div>' : '') +
    '</section>';
  }

  function metric(label, value, copy, tone, id) {
    return '<article class="stx5-metric ' + esc(tone || '') + '"><small>' + esc(label) + '</small>' +
      '<strong' + (id ? ' id="' + esc(id) + '"' : '') + '>' + esc(value) + '</strong>' +
      '<p>' + esc(copy) + '</p></article>';
  }

  function card(title, copy, body, action) {
    return '<section class="stx5-card"><header><div><h3>' + esc(title) + '</h3>' +
      (copy ? '<p>' + esc(copy) + '</p>' : '') + '</div>' + (action || '') +
      '</header><div class="stx5-card-body">' + (body || '') + '</div></section>';
  }

  function note(title, copy, tone) {
    return '<div class="stx5-note ' + esc(tone || '') + '"><b>' + esc(title) + '</b><p>' + esc(copy) + '</p></div>';
  }

  function field(label, name, type, value, options, full, help, attributes) {
    var control;
    if (type === 'textarea') {
      control = '<textarea class="stx5-textarea" name="' + esc(name) + '" ' + (attributes || '') + '>' + esc(value || '') + '</textarea>';
    } else if (type === 'select') {
      control = '<select class="stx5-select" name="' + esc(name) + '" ' + (attributes || '') + '>' +
        (options || []).map(function (option) {
          var pair = Array.isArray(option) ? option : [option, option];
          return '<option value="' + esc(pair[0]) + '"' + (String(pair[0]) === String(value) ? ' selected' : '') + '>' + esc(pair[1]) + '</option>';
        }).join('') + '</select>';
    } else {
      control = '<input class="stx5-input" name="' + esc(name) + '" type="' + esc(type || 'text') + '" value="' + esc(value || '') + '" ' + (attributes || '') + '>';
    }
    return '<label class="stx5-field ' + (full ? 'full' : '') + '"><span>' + esc(label) + '</span>' + control + (help ? '<small>' + esc(help) + '</small>' : '') + '</label>';
  }

  function toggle(title, copy, enabled, key) {
    return '<div class="stx5-toggle-row"><div><b>' + esc(title) + '</b><span>' + esc(copy) + '</span></div>' +
      '<button class="stx5-toggle ' + (enabled ? 'on' : '') + '" type="button" data-toggle="' + esc(key || title) + '" aria-pressed="' + String(!!enabled) + '"><i></i></button></div>';
  }

  function loading() {
    return '<div class="stx5-loading"><div class="stx5-spinner" aria-label="Loading"></div></div>';
  }

  function empty(copy) {
    return '<div class="stx5-empty">' + esc(copy || 'No records yet.') + '</div>';
  }

  function message(id) {
    return '<div class="stx5-message" id="' + esc(id) + '" role="status"></div>';
  }

  function showMessage(id, text, success) {
    var node = document.getElementById(id);
    if (!node) return;
    node.textContent = text || '';
    node.className = 'stx5-message show ' + (success ? 'success' : 'error');
  }

  function detailGrid(items) {
    return '<div class="stx5-detail-grid">' + (items || []).map(function (item) {
      return '<div><small>' + esc(item[0]) + '</small><b>' + (item[2] ? String(item[1] || '—') : esc(item[1] || '—')) + '</b></div>';
    }).join('') + '</div>';
  }

  function record(name, subtitle, row, imageUrl) {
    return '<div class="stx5-record"><span class="stx5-avatar">' +
      (imageUrl ? '<img src="' + esc(imageUrl) + '" alt="">' : esc(initials(row || { name: name }))) +
      '</span><div><b>' + esc(name || '—') + '</b><small>' + esc(subtitle || '') + '</small></div></div>';
  }

  function dataTable(headers, rows, mobileRows, heading, copy) {
    var desktop = rows && rows.length ? '<div class="stx5-table-wrap"><table class="stx5-table"><thead><tr>' +
      headers.map(function (header) { return '<th>' + esc(header) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>' : empty('No records yet.');
    var mobile = mobileRows && mobileRows.length ? '<div class="stx5-mobile-list">' + mobileRows.join('') + '</div>' : '<div class="stx5-mobile-list">' + empty('No records yet.') + '</div>';
    return '<section class="stx5-data"><header class="stx5-data-head"><div><span class="stx5-kicker">Live records</span><h3>' + esc(heading || 'Records') + '</h3><p>' + esc(copy || '') + '</p></div><div class="stx5-count"><b>' + number(rows ? rows.length : 0) + '</b><span>records</span></div></header>' + desktop + mobile + '</section>';
  }

  function mobileRow(name, copy, meta, badge, id, imageUrl) {
    return '<button class="stx5-mobile-row" type="button" data-mobile-open="' + esc(id) + '"><span class="stx5-avatar">' +
      (imageUrl ? '<img src="' + esc(imageUrl) + '" alt="">' : esc(initials({ name: name }))) +
      '</span><div><h4>' + esc(name) + '</h4><p>' + esc(copy || '') + '</p><small>' + esc(meta || '') + '</small></div>' +
      (badge ? status(badge) : '') + '<i>›</i></button>';
  }

  function publicLink(path, label) {
    return linkButton(label || 'Open public page', path, 'secondary', 'target="_blank" rel="noopener"');
  }

  function navMarkup() {
    var groups = ['Overview', 'Operations', 'Content', 'People', 'Trust', 'Events', 'Company'];
    return groups.map(function (group) {
      var items = ROUTES.filter(function (item) {
        return item[3] === group && (isRichdhin() || (item[0] !== 'add-user' && item[0] !== 'permissions'));
      });
      if (!items.length) return '';
      return '<section class="stx5-nav-group"><small>' + esc(group) + '</small>' + items.map(function (item) {
        return '<a class="stx5-nav-link" href="' + esc(item[1]) + '" data-nav="' + esc(item[0]) + '"><span>' + esc(item[4]) + '</span><b>' + esc(item[2]) + '</b></a>';
      }).join('') + '</section>';
    }).join('');
  }

  function mobileBottom() {
    var items = [
      ['dashboard', 'HM', 'Home'],
      ['registrations', 'OP', 'Operations'],
      ['crm', 'CR', 'CRM'],
      ['showcase', 'EV', 'Events'],
      ['settings', 'MR', 'More']
    ];
    return '<nav class="stx5-mobile-bottom" aria-label="Admin mobile navigation">' + items.map(function (item) {
      var active = item[0] === 'settings'
        ? ['blog', 'leadership', 'org', 'add-user', 'permissions', 'profile', 'contracts', 'hiring', 'trust', 'awards', 'settings'].indexOf(state.route) >= 0
        : (item[0] === 'registrations'
          ? ['registrations', 'contact', 'usage'].indexOf(state.route) >= 0
          : item[0] === state.route);
      return '<a class="' + (active ? 'active' : '') + '" href="' + esc(route(item[0])[1]) + '" data-nav="' + esc(item[0]) + '"><span>' + item[1] + '</span><b>' + item[2] + '</b></a>';
    }).join('') + '</nav>';
  }

  function renderLogin() {
    document.body.className = 'stx-admin-v5';
    var params = new URLSearchParams(window.location.search);
    var mode = params.get('code') ? 'code' : 'password';
    document.body.innerHTML = '<a class="skip-link" href="#stx5LoginForm">Skip to sign in</a><main class="stx5-login">' +
      '<section class="stx5-login-story"><div><a class="stx5-login-brand" href="/"><span class="stx5-login-logo">SA</span></a><p class="stx5-kicker" style="color:#a8dfcc">Stratex internal administration</p><h1>Run the company from one secure workspace.</h1><p>Manage operations, people, public content, trust and events without reusing ScoutLink product credentials.</p></div><footer>Authorised internal staff only</footer></section>' +
      '<section class="stx5-login-form"><div class="stx5-login-card"><span class="stx5-kicker">Internal staff sign in</span><h2>Sign in to Stratex Admin</h2><p>Use your Stratex password or an approved one-time code.</p>' +
      '<nav class="stx5-login-tabs"><button class="' + (mode === 'password' ? 'active' : '') + '" type="button" data-login-tab="password">Email and password</button><button class="' + (mode === 'code' ? 'active' : '') + '" type="button" data-login-tab="code">Login code</button></nav>' +
      '<form id="stx5LoginForm" data-mode="' + mode + '">' +
      field('Work email', 'email', 'email', params.get('email') || '', null, true, '', 'autocomplete="email" required') +
      '<div id="stx5PasswordField" ' + (mode === 'code' ? 'hidden' : '') + '>' + field('Password', 'password', 'password', '', null, true, '', 'autocomplete="current-password"') + '</div>' +
      '<div id="stx5CodeField" ' + (mode === 'password' ? 'hidden' : '') + '>' + field('Login code', 'loginCode', 'text', params.get('code') || '', null, true, '', 'autocomplete="one-time-code" style="letter-spacing:5px;text-transform:uppercase;font-weight:900"') + '</div>' +
      message('stx5LoginMessage') + '<button class="stx5-btn" id="stx5LoginSubmit" style="width:100%;margin-top:15px" type="submit">' + (mode === 'code' ? 'Verify code securely' : 'Sign in securely') + '</button></form>' +
      note('First-time access', 'Verify the invitation code, then create a private Stratex Admin password.') +
      '</div></section></main>';
    bindLogin();
  }

  function bindLogin() {
    var form = document.getElementById('stx5LoginForm');
    document.querySelectorAll('[data-login-tab]').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var mode = tab.dataset.loginTab;
        form.dataset.mode = mode;
        document.querySelectorAll('[data-login-tab]').forEach(function (item) {
          item.classList.toggle('active', item === tab);
        });
        document.getElementById('stx5PasswordField').hidden = mode !== 'password';
        document.getElementById('stx5CodeField').hidden = mode !== 'code';
        document.getElementById('stx5LoginSubmit').textContent = mode === 'code' ? 'Verify code securely' : 'Sign in securely';
      });
    });
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      var data = new FormData(form);
      var mode = form.dataset.mode;
      var submit = document.getElementById('stx5LoginSubmit');
      submit.disabled = true;
      submit.textContent = mode === 'code' ? 'Verifying…' : 'Signing in…';
      try {
        var response = await fetch(API + '/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: String(data.get('email') || '').trim().toLowerCase(),
            password: mode === 'password' ? String(data.get('password') || '') : undefined,
            loginCode: mode === 'code' ? String(data.get('loginCode') || '').trim().toUpperCase() : undefined,
            accountType: 'Stratex'
          })
        });
        var payload = await response.json().catch(function () { return {}; });
        if (!response.ok) throw new Error(payload.error || 'The Stratex credentials were not accepted.');
        setSession(payload);
        if (mode === 'code' && payload.needsRegistration) {
          renderPasswordSetup();
          return;
        }
        window.location.replace('/admin');
      } catch (error) {
        showMessage('stx5LoginMessage', error.message, false);
        submit.disabled = false;
        submit.textContent = mode === 'code' ? 'Verify code securely' : 'Sign in securely';
      }
    });
  }

  function renderPasswordSetup() {
    document.body.innerHTML = '<main class="stx5-login"><section class="stx5-login-story"><div><span class="stx5-login-logo">SA</span><p class="stx5-kicker" style="color:#a8dfcc">Secure password setup</p><h1>Finish your Stratex Admin setup.</h1><p>Your invitation code has been confirmed. Create a private password for the internal parent-company workspace.</p></div></section><section class="stx5-login-form"><div class="stx5-login-card"><span class="stx5-kicker">Password setup</span><h2>Create your password</h2><form id="stx5SetupForm">' +
      field('New password', 'password', 'password', '', null, true, '', 'required') + field('Confirm password', 'confirm', 'password', '', null, true, '', 'required') + message('stx5SetupMessage') + '<button class="stx5-btn" style="width:100%;margin-top:15px" type="submit">Create password and continue</button></form></div></section></main>';
    document.getElementById('stx5SetupForm').addEventListener('submit', async function (event) {
      event.preventDefault();
      var data = new FormData(event.currentTarget);
      var password = String(data.get('password') || '');
      var confirm = String(data.get('confirm') || '');
      if (password.length < 8) return showMessage('stx5SetupMessage', 'Password must contain at least eight characters.', false);
      if (password !== confirm) return showMessage('stx5SetupMessage', 'The passwords do not match.', false);
      try {
        await api('POST', '/api/auth/complete-registration', { newPassword: password, accountType: 'Stratex' });
        window.location.replace('/admin');
      } catch (error) {
        showMessage('stx5SetupMessage', error.message, false);
      }
    });
  }

  function renderShell() {
    document.body.className = 'stx-admin-v5';
    document.body.innerHTML = '<a class="skip-link" href="#stx5Main">Skip to admin content</a><div class="stx5-shell">' +
      '<aside class="stx5-sidebar" id="stx5Sidebar"><a class="stx5-brand" href="/admin"><span class="stx5-brand-mark">SA</span><span><b>Stratex Admin</b><small>Internal company operations</small></span></a><nav class="stx5-nav">' + navMarkup() + '</nav><footer class="stx5-sidebar-footer"><button class="stx5-switch-experience" id="stx5SwitchExperience">Switch experience</button><div class="stx5-side-user"><span class="stx5-avatar">' + esc(initials()) + '</span><div><b>' + esc(fullName(currentUser())) + '</b><small>' + esc(roleLabel()) + '</small></div></div></footer></aside>' +
      '<section class="stx5-workspace"><header class="stx5-topbar"><div class="stx5-top-title"><button class="stx5-menu-button" id="stx5Menu" type="button" aria-label="Open admin menu">☰</button><div><h1 id="stx5TopTitle">Dashboard</h1><span id="stx5TopRoute">/admin · Stratex internal administration</span></div></div><div class="stx5-top-actions">' +
      button('Switch experience', 'secondary', 'id="stx5TopSwitch"') + button('Search', 'secondary', 'id="stx5Search"') + button('My Profile', 'secondary', 'data-nav="profile"') + button('Sign out', 'secondary', 'id="stx5SignOut"') +
      '</div></header><main class="stx5-main" id="stx5Main"></main></section><button class="stx5-mobile-backdrop" id="stx5MobileBackdrop" type="button" aria-label="Close menu"></button></div><div id="stx5MobileBottom"></div><div id="stx5ModalRoot"></div>';
    bindShell();
    navigate(routeFromPath(), false);
  }

  function bindShell() {
    document.addEventListener('click', function (event) {
      var nav = event.target.closest('[data-nav]');
      if (nav) {
        event.preventDefault();
        navigate(nav.dataset.nav, true);
        closeMenu();
      }
    });
    document.getElementById('stx5Menu').addEventListener('click', function () {
      document.body.classList.toggle('stx5-menu-open');
    });
    document.getElementById('stx5MobileBackdrop').addEventListener('click', closeMenu);
    document.getElementById('stx5SignOut').addEventListener('click', function () {
      clearSession();
      window.location.href = '/admin/login';
    });
    document.getElementById('stx5SwitchExperience').addEventListener('click', switchExperience);
    document.getElementById('stx5TopSwitch').addEventListener('click', switchExperience);
    document.getElementById('stx5Search').addEventListener('click', openCommand);
    window.addEventListener('popstate', function () { navigate(routeFromPath(), false); });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeMenu();
        closeModal();
      }
    });
  }

  function switchExperience() {
    window.location.href = '/experience-select';
  }

  function closeMenu() {
    document.body.classList.remove('stx5-menu-open');
  }

  function navigate(id, push) {
    if (!ROUTE_BY_ID[id]) id = 'dashboard';
    if ((id === 'add-user' || id === 'permissions') && !isRichdhin()) id = 'dashboard';
    state.route = id;
    var routeData = route(id);
    if (push && cleanPath() !== routeData[1]) history.pushState({}, '', routeData[1]);
    document.getElementById('stx5TopTitle').textContent = routeData[2];
    document.getElementById('stx5TopRoute').textContent = routeData[1] + ' · Stratex internal administration';
    document.querySelectorAll('.stx5-nav-link').forEach(function (node) {
      var active = node.dataset.nav === id;
      node.classList.toggle('active', active);
      if (active) node.setAttribute('aria-current', 'page');
      else node.removeAttribute('aria-current');
    });
    document.getElementById('stx5MobileBottom').innerHTML = mobileBottom();
    renderPage(id);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function openCommand() {
    var items = ROUTES.filter(function (item) {
      return isRichdhin() || (item[0] !== 'add-user' && item[0] !== 'permissions');
    });
    openModal('Search Stratex Admin', '<input class="stx5-input" id="stx5CommandSearch" type="search" placeholder="Search admin pages and actions" aria-label="Search admin pages"><div style="display:grid;gap:8px;margin-top:12px" id="stx5CommandList">' + items.map(function (item) {
      return '<button class="stx5-dash-link" type="button" data-command="' + esc(item[0]) + '"><b style="margin:0">' + esc(item[2]) + '</b><small>' + esc(item[1]) + '</small></button>';
    }).join('') + '</div>');
    var input = document.getElementById('stx5CommandSearch');
    input.focus();
    input.addEventListener('input', function () {
      var query = input.value.toLowerCase();
      document.querySelectorAll('[data-command]').forEach(function (node) {
        node.hidden = node.textContent.toLowerCase().indexOf(query) < 0;
      });
    });
    document.querySelectorAll('[data-command]').forEach(function (node) {
      node.addEventListener('click', function () {
        closeModal();
        navigate(node.dataset.command, true);
      });
    });
  }

  function openModal(title, body) {
    closeModal(false);
    state.modalReturn = document.activeElement;
    var root = document.getElementById('stx5ModalRoot');
    root.innerHTML = '<div class="stx5-modal-host"><button class="stx5-modal-backdrop" type="button" data-close-modal aria-label="Close dialog"></button><section class="stx5-modal" role="dialog" aria-modal="true" aria-labelledby="stx5ModalTitle"><header><h2 id="stx5ModalTitle">' + esc(title) + '</h2>' + button('Close', 'secondary small', 'data-close-modal') + '</header><div class="stx5-modal-body">' + body + '</div></section></div>';
    document.body.classList.add('stx5-modal-open');
    root.querySelectorAll('[data-close-modal]').forEach(function (node) {
      node.addEventListener('click', closeModal);
    });
    var first = root.querySelector('input,select,textarea,button,a[href]');
    if (first) first.focus();
  }

  function closeModal(restore) {
    var root = document.getElementById('stx5ModalRoot');
    if (root) root.innerHTML = '';
    document.body.classList.remove('stx5-modal-open');
    if (restore !== false && state.modalReturn && state.modalReturn.focus) state.modalReturn.focus();
    state.modalReturn = null;
  }

  function bindToggles(root) {
    (root || document).querySelectorAll('[data-toggle]').forEach(function (node) {
      if (node.dataset.bound === '1') return;
      node.dataset.bound = '1';
      node.addEventListener('click', function () {
        node.classList.toggle('on');
        node.setAttribute('aria-pressed', String(node.classList.contains('on')));
      });
    });
  }

  function renderPage(id) {
    var root = document.getElementById('stx5Main');
    root.innerHTML = PAGE_RENDERERS[id] ? PAGE_RENDERERS[id]() : PAGE_RENDERERS.dashboard();
    bindToggles(root);
    if (PAGE_LOADERS[id]) PAGE_LOADERS[id]();
  }

  var PAGE_RENDERERS = {};

  /* Dashboard */
  PAGE_RENDERERS.dashboard = function () {
    var links = [
      ['registrations', 'RG', 'Registrations', 'Review Coach and Scout account requests.'],
      ['contact', 'CF', 'Contact Forms', 'Triage public contact and demo forms.'],
      ['crm', 'CR', 'CRM', 'Manage Stratex and ScoutLink relationships.'],
      ['blog', 'BL', 'Learning Centre', 'Write, preview and publish public articles.'],
      ['leadership', 'LD', 'Leadership', 'Manage public leadership profiles.'],
      ['org', 'OC', 'Org Charts', 'Review reporting lines.'],
      ['contracts', 'CP', 'Contracts & Pay', 'Open private HR records.'],
      ['hiring', 'HR', 'Hiring', 'Manage roles and applicants.'],
      ['usage', 'UR', 'Usage Requests', 'Approve or price allowance uplifts.'],
      ['trust', 'TC', 'Trust & Concerns', 'Review restricted cases.'],
      ['showcase', 'SE', 'Showcase Event', 'Create events and publish the public registration experience.'],
      ['awards', 'AC', 'Award Ceremonies', 'Plan and publish recognition events.']
    ];
    return hero('Company operations', 'Company administration.', 'A cleaner company overview with the work that needs attention first.', isRichdhin() ? button('Add Stratex user', '', 'data-nav="add-user"') : '') +
      '<section class="stx5-metrics">' +
        metric('Open registrations', '—', 'Coach and Scout workflows', '', 'stx5DashRegistrations') +
        metric('New forms', '—', 'Public submissions', 'blue', 'stx5DashForms') +
        metric('Open roles', '—', 'Current vacancies', 'gold', 'stx5DashRoles') +
        metric('Urgent concerns', '—', 'High-priority cases', 'red', 'stx5DashConcerns') +
      '</section><section class="stx5-dashboard-links">' + links.map(function (item) {
        return '<button class="stx5-dash-link" type="button" data-nav="' + esc(item[0]) + '"><span>' + item[1] + '</span><b>' + esc(item[2]) + '</b><small>' + esc(item[3]) + '</small><i>Open area →</i></button>';
      }).join('') + '</section>';
  };

  PAGE_LOADERS.dashboard = async function () {
    var results = await Promise.allSettled([
      api('GET', '/api/stratex/dashboard'),
      api('GET', '/api/stratex-website/leads?limit=500'),
      api('GET', '/api/stratex/jobs'),
      api('GET', '/api/stratex-website/leads?type=concern&limit=500')
    ]);
    var dash = results[0].status === 'fulfilled' ? results[0].value : {};
    var leads = results[1].status === 'fulfilled' ? (results[1].value.data || []) : [];
    var jobs = results[2].status === 'fulfilled' ? (results[2].value.data || []) : [];
    var concerns = results[3].status === 'fulfilled' ? (results[3].value.data || []) : leads.filter(function (row) {
      return /concern/i.test(String(row.lead_type || ''));
    });
    var values = {
      stx5DashRegistrations: dash.pendingReqs || 0,
      stx5DashForms: leads.filter(function (row) { return /new|open/i.test(String(row.status || 'new')); }).length,
      stx5DashRoles: jobs.filter(function (row) { return /live|scheduled|open|published/i.test(String(row.status || '')); }).length,
      stx5DashConcerns: concerns.filter(function (row) {
        var metadata = row.safe_metadata || {};
        return /urgent|high/i.test(String(row.priority || row.severity || metadata.priority || '')) && !/closed|resolved/i.test(String(row.status || ''));
      }).length
    };
    Object.keys(values).forEach(function (id) {
      var node = document.getElementById(id);
      if (node) node.textContent = number(values[id]);
    });
  };

  /* Registrations */
  PAGE_RENDERERS.registrations = function () {
    return hero('ScoutLink access', 'Registrations.', 'Review Coach and Scout workflows without leaving Stratex Admin.', button('Refresh', 'secondary', 'id="stx5RefreshRegistrations"'), true) +
      '<section class="stx5-metrics">' +
        metric('All registrations', '—', 'Every request', '', 'stx5RegAll') +
        metric('Needs admin action', '—', 'Review, documents or payment', 'gold', 'stx5RegAction') +
        metric('Awaiting documents', '—', 'Scout verification', 'blue', 'stx5RegDocuments') +
        metric('Awaiting payment', '—', 'Verified Scout requests', 'red', 'stx5RegPayment') +
      '</section><section class="stx5-filters"><label class="stx5-field"><span>Search</span><input class="stx5-input" id="stx5RegSearch" placeholder="Name, email or organisation"></label><label class="stx5-field"><span>Type</span><select class="stx5-select" id="stx5RegType"><option value="">Coach and Scout</option><option value="coach">Coach</option><option value="scout">Scout</option></select></label><label class="stx5-field"><span>Decision</span><select class="stx5-select" id="stx5RegStatus"><option value="">All decisions</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="declined">Declined</option></select></label>' + button('Filter', '', 'id="stx5RegFilter"') + '</section>' +
      card('Registration records', 'Select a request to complete its workflow.', '<div id="stx5RegistrationRows">' + loading() + '</div>') + '<div id="stx5RegistrationDetail"></div>';
  };

  function normalizeRegistration(row) {
    row = row || {};
    var type = String(row.account_type || row.accountType || row.type || 'Registration');
    return {
      id: row.id,
      type: type,
      name: [row.first_name, row.last_name].filter(Boolean).join(' ') || row.full_name || row.name || '',
      email: row.email || '',
      phone: row.phone || '',
      organisation: row.team_name || row.scout_club || row.organisation || row.club_name || '',
      role: row.role_at_club || row.role || row.scout_league || '',
      status: row.status || 'pending',
      verification: row.verification_status || (type.toLowerCase() === 'scout' ? 'awaiting_documents' : 'not_required'),
      createdAt: row.created_at || row.submitted_at || row.updated_at,
      raw: row
    };
  }

  function registrationStage(row) {
    var statusValue = String(row.status || '').toLowerCase();
    var verification = String(row.verification || '').toLowerCase();
    if (statusValue === 'declined') return 'declined';
    if (statusValue === 'approved' || verification === 'activated') return 'account_created';
    if (String(row.type).toLowerCase() === 'coach') return 'admin_review';
    if (verification === 'verified_awaiting_payment') return 'awaiting_payment';
    if (verification === 'documents_submitted') return 'documents_ready';
    return 'awaiting_documents';
  }

  function registrationStageLabel(row) {
    return {
      admin_review: 'Admin review',
      awaiting_documents: 'Awaiting documents',
      documents_ready: 'Documents ready',
      awaiting_payment: 'Awaiting payment',
      account_created: 'Account created',
      declined: 'Declined'
    }[registrationStage(row)] || 'Review';
  }

  function registrationWorkflow(row) {
    var type = String(row.type || '').toLowerCase();
    var stage = registrationStage(row);
    var steps = type === 'scout'
      ? [
          ['Submitted', 'Registration received'],
          ['Documents', stage === 'awaiting_documents' ? 'Waiting for upload' : 'Received'],
          ['Admin review', stage === 'documents_ready' ? 'Needs action' : 'Review'],
          ['Payment', stage === 'awaiting_payment' ? 'Outstanding' : 'After verification'],
          ['Account', stage === 'account_created' ? 'Active' : 'After payment']
        ]
      : [
          ['Submitted', 'Registration received'],
          ['Admin review', stage === 'admin_review' ? 'Needs action' : 'Complete'],
          ['Account', stage === 'account_created' ? 'Active' : 'After approval']
        ];
    return '<section class="stx5-workflow">' + steps.map(function (step, index) {
      var done = stage === 'account_created' || index === 0;
      var active = /Needs action|Outstanding|Waiting/.test(step[1]);
      var declined = stage === 'declined' && index > 0;
      return '<article class="' + (declined ? 'declined' : active ? 'active' : done ? 'done' : '') + '"><span>' + (done ? '✓' : String(index + 1)) + '</span><b>' + esc(step[0]) + '</b><small>' + esc(step[1]) + '</small></article>';
    }).join('') + '</section>';
  }

  async function loadRegistrations(reopenId) {
    var root = document.getElementById('stx5RegistrationRows');
    if (!root) return;
    root.innerHTML = loading();
    try {
      var payload = await api('GET', '/api/registrations?limit=250&status=');
      state.data.registrations = (payload.data || []).map(normalizeRegistration);
      renderRegistrations();
      var queryId = new URLSearchParams(window.location.search).get('id');
      var selectedId = reopenId || queryId;
      if (selectedId) openRegistration(selectedId);
    } catch (error) {
      root.innerHTML = empty(error.message);
    }
  }

  function filteredRegistrations() {
    var query = String((document.getElementById('stx5RegSearch') || {}).value || '').toLowerCase();
    var type = String((document.getElementById('stx5RegType') || {}).value || '').toLowerCase();
    var decision = String((document.getElementById('stx5RegStatus') || {}).value || '').toLowerCase();
    return (state.data.registrations || []).filter(function (row) {
      var text = [row.name, row.email, row.organisation, row.role].join(' ').toLowerCase();
      return (!query || text.indexOf(query) >= 0) && (!type || String(row.type).toLowerCase() === type) && (!decision || String(row.status).toLowerCase() === decision);
    });
  }

  function renderRegistrations() {
    var rows = filteredRegistrations();
    var all = state.data.registrations || [];
    var values = {
      stx5RegAll: all.length,
      stx5RegAction: all.filter(function (row) { return ['admin_review', 'documents_ready', 'awaiting_payment'].indexOf(registrationStage(row)) >= 0; }).length,
      stx5RegDocuments: all.filter(function (row) { return registrationStage(row) === 'awaiting_documents'; }).length,
      stx5RegPayment: all.filter(function (row) { return registrationStage(row) === 'awaiting_payment'; }).length
    };
    Object.keys(values).forEach(function (id) { var node = document.getElementById(id); if (node) node.textContent = number(values[id]); });
    var tableRows = rows.map(function (row) {
      return '<tr data-click data-registration-id="' + esc(row.id) + '"><td>' + record(row.name, row.type + ' · ' + row.email, row) + '</td><td>' + esc(row.organisation || '—') + '</td><td>' + esc(registrationStageLabel(row)) + '</td><td>' + status(row.status) + '</td><td>' + esc(date(row.createdAt)) + '</td><td><div class="stx5-row-actions">' + button('Open request', 'small', 'data-open-registration="' + esc(row.id) + '"') + '</div></td></tr>';
    });
    var mobileRows = rows.map(function (row) {
      return mobileRow(row.name, row.type + ' · ' + (row.organisation || 'No organisation'), registrationStageLabel(row) + ' · ' + date(row.createdAt), row.status, row.id);
    });
    document.getElementById('stx5RegistrationRows').innerHTML = dataTable(['Applicant', 'Organisation', 'Workflow', 'Decision', 'Submitted', ''], tableRows, mobileRows, 'Registration records', 'Open a request to see its approval, document and account-creation workflow.');
    document.querySelectorAll('[data-registration-id],[data-open-registration]').forEach(function (node) {
      node.addEventListener('click', function (event) {
        event.stopPropagation();
        openRegistration(node.dataset.registrationId || node.dataset.openRegistration);
      });
    });
    document.querySelectorAll('[data-mobile-open]').forEach(function (node) {
      node.addEventListener('click', function () { openRegistration(node.dataset.mobileOpen); });
    });
  }

  function registrationActionPanel(row) {
    var stage = registrationStage(row);
    var actions = '';
    if (stage === 'admin_review') actions += button('Approve Coach and create account', '', 'id="stx5ApproveCoach"');
    if (stage === 'awaiting_documents') actions += button('Resend verification link', '', 'id="stx5ResendVerification"');
    if (stage === 'awaiting_payment') actions += button('Mark payment received and create Scout account', '', 'id="stx5PaymentReceived"');
    if (String(row.status).toLowerCase() === 'pending') {
      actions += button('Request information', 'secondary', 'id="stx5RequestInfo"') + button('Decline', 'danger', 'id="stx5DeclineRegistration"');
    }
    return actions ? '<div class="stx5-actions">' + actions + '</div>' : note('Permanent audit record', 'Activation, linked account and review decisions remain attached.');
  }

  function openRegistration(id) {
    var row = (state.data.registrations || []).find(function (item) { return String(item.id) === String(id); });
    if (!row) return;
    state.selected.registration = row;
    var details = [
      ['Product', 'ScoutLink'], ['Type', row.type], ['Organisation', row.organisation], ['Role', row.role],
      ['Email', row.email], ['Phone', row.phone], ['Decision', row.status], ['Verification', row.verification],
      ['Submitted', date(row.createdAt)], ['Registration ID', row.id], ['Linked account', row.raw.linked_account_id || '—'],
      ['Plan', row.raw.payment_plan || row.raw.preferred_scout_plan || '—']
    ];
    document.getElementById('stx5RegistrationDetail').innerHTML = hero('Registration workflow', row.name + '.', 'Complete each required step and retain the permanent record.', row.email ? linkButton('Email applicant', 'mailto:' + row.email, 'secondary') : '', false) + registrationWorkflow(row) + '<div class="stx5-two">' + card('Applicant record', row.type + ' registration', detailGrid(details)) + card('Workflow action', registrationStageLabel(row), registrationActionPanel(row) + message('stx5RegistrationActionMessage')) + '</div>';
    bindRegistrationActions(row);
    document.getElementById('stx5RegistrationDetail').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function registrationAction(row, endpoint, body, success) {
    try {
      var result = await api('POST', '/api/registrations/' + encodeURIComponent(row.id) + endpoint, body || {});
      showMessage('stx5RegistrationActionMessage', result.message || success, true);
      await loadRegistrations(row.id);
    } catch (error) {
      showMessage('stx5RegistrationActionMessage', error.message, false);
    }
  }

  function bindRegistrationActions(row) {
    var approve = document.getElementById('stx5ApproveCoach');
    if (approve) approve.addEventListener('click', function () {
      if (confirm('Approve this Coach registration and create the account?')) registrationAction(row, '/approve', {}, 'Coach approved.');
    });
    var resend = document.getElementById('stx5ResendVerification');
    if (resend) resend.addEventListener('click', function () { registrationAction(row, '/resend-verification', {}, 'Verification link sent.'); });
    var paid = document.getElementById('stx5PaymentReceived');
    if (paid) paid.addEventListener('click', function () {
      if (confirm('Confirm payment and create the Scout account?')) registrationAction(row, '/payment-received', { subscriptionPlan: row.raw.payment_plan || 'Core' }, 'Scout account created.');
    });
    var request = document.getElementById('stx5RequestInfo');
    if (request) request.addEventListener('click', function () {
      var copy = prompt('What information is required?');
      if (copy && copy.trim().length >= 10) registrationAction(row, '/request-information', { message: copy.trim() }, 'Information request sent.');
    });
    var decline = document.getElementById('stx5DeclineRegistration');
    if (decline) decline.addEventListener('click', function () {
      var reason = prompt('Enter the decline reason.');
      if (reason && confirm('Decline this registration and email the applicant?')) registrationAction(row, '/decline', { declineReason: 'Other', customReason: reason }, 'Registration declined.');
    });
  }

  PAGE_LOADERS.registrations = function () {
    loadRegistrations();
    document.getElementById('stx5RefreshRegistrations').addEventListener('click', function () { loadRegistrations(); });
    document.getElementById('stx5RegFilter').addEventListener('click', renderRegistrations);
    ['stx5RegSearch', 'stx5RegType', 'stx5RegStatus'].forEach(function (id) {
      document.getElementById(id).addEventListener(id === 'stx5RegSearch' ? 'input' : 'change', renderRegistrations);
    });
  };

  /* Contact forms */
  PAGE_RENDERERS.contact = function () {
    return hero('Public submissions', 'Contact Forms.', 'All public contact, demo and lead forms in one queue.', button('Refresh', 'secondary', 'id="stx5RefreshContacts"'), true) +
      card('Recent website submissions', 'Stratex and ScoutLink public forms', '<div id="stx5ContactRows">' + loading() + '</div>') + '<div id="stx5ContactDetail"></div>';
  };

  async function loadContacts(reopenId) {
    try {
      var data = await api('GET', '/api/stratex-website/leads?limit=500');
      state.data.contacts = data.data || [];
      renderContacts();
      var selectedId = reopenId || new URLSearchParams(window.location.search).get('id');
      if (selectedId) openContact(selectedId);
    } catch (error) {
      document.getElementById('stx5ContactRows').innerHTML = empty(error.message);
    }
  }

  function contactName(row) {
    return row.full_name || [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email || 'Website submission';
  }

  function renderContacts() {
    var rows = state.data.contacts || [];
    var tableRows = rows.map(function (row) {
      return '<tr data-click data-contact-id="' + esc(row.id) + '"><td>' + record(contactName(row), row.email || 'No email', row) + '</td><td>' + esc(row.organisation || '—') + '</td><td>' + esc(String(row.message || '').slice(0, 150) || '—') + '</td><td>' + status(row.status || 'new') + '</td><td>' + esc(date(row.created_at)) + '</td><td>' + button('Read', 'small', 'data-open-contact="' + esc(row.id) + '"') + '</td></tr>';
    });
    var mobileRows = rows.map(function (row) {
      return mobileRow(contactName(row), String(row.lead_type || 'Contact').replace(/_/g, ' ') + ' · ' + (row.organisation || 'No organisation'), (row.email || 'No email') + ' · ' + date(row.created_at), row.status || 'New', row.id);
    });
    document.getElementById('stx5ContactRows').innerHTML = dataTable(['Contact', 'Organisation', 'Message preview', 'Status', 'Received', ''], tableRows, mobileRows, 'Recent website submissions', 'Contact, demo and lead forms ordered by latest activity.');
    document.querySelectorAll('[data-contact-id],[data-open-contact]').forEach(function (node) {
      node.addEventListener('click', function (event) { event.stopPropagation(); openContact(node.dataset.contactId || node.dataset.openContact); });
    });
    document.querySelectorAll('[data-mobile-open]').forEach(function (node) { node.addEventListener('click', function () { openContact(node.dataset.mobileOpen); }); });
  }

  function openContact(id) {
    var row = (state.data.contacts || []).find(function (item) { return String(item.id) === String(id); });
    if (!row) return;
    var name = contactName(row);
    var form = '<form id="stx5ContactForm"><div class="stx5-form-grid">' +
      field('Status', 'status', 'select', row.status || 'new', [['new', 'New'], ['open', 'Open'], ['contacted', 'Contacted'], ['reviewed', 'Reviewed'], ['closed', 'Closed']]) +
      field('Internal note', 'notes', 'textarea', '', null, true, 'Stored on the restricted lead record.') +
      '</div>' + message('stx5ContactMessage') + '<div class="stx5-actions" style="margin-top:12px">' + button('Save note and status', '', 'type="submit"') + '</div></form>';
    document.getElementById('stx5ContactDetail').innerHTML = hero('Submission record', name + '.', 'Review the message, status and restricted notes.', row.email ? linkButton('Email contact', 'mailto:' + row.email, '') : '', false) + '<div class="stx5-two">' +
      card('Submission details', String(row.lead_type || 'Public form').replace(/_/g, ' '), detailGrid([['Email', row.email], ['Phone', row.phone], ['Organisation', row.organisation], ['Submitted', date(row.created_at)], ['Source', row.source_page], ['Message', row.message]])) +
      card('Internal handling', 'Restricted lead record', form) + '</div>';
    document.getElementById('stx5ContactForm').addEventListener('submit', async function (event) {
      event.preventDefault();
      var data = new FormData(event.currentTarget);
      try {
        await api('PATCH', '/api/stratex-website/leads/' + encodeURIComponent(row.id), { status: data.get('status'), notes: data.get('notes') });
        showMessage('stx5ContactMessage', 'Lead note and status saved.', true);
        await loadContacts(row.id);
      } catch (error) {
        showMessage('stx5ContactMessage', error.message, false);
      }
    });
    document.getElementById('stx5ContactDetail').scrollIntoView({ behavior: 'smooth' });
  }

  PAGE_LOADERS.contact = function () {
    loadContacts();
    document.getElementById('stx5RefreshContacts').addEventListener('click', function () { loadContacts(); });
  };

  /* CRM */
  PAGE_RENDERERS.crm = function () {
    return hero('Relationship management', 'CRM.', 'Stratex contacts, product registrations and event professionals share one parent-company view. Showcase players remain event-only.', button('Export CRM', 'secondary', 'id="stx5ExportCrm"') + button('Add contact', '', 'id="stx5AddContact"'), true) +
      '<section class="stx5-metrics">' + metric('Contacts', '—', 'All contact types', '', 'stx5CrmContacts') + metric('Warm leads', '—', 'Need next action', 'gold', 'stx5CrmWarm') + metric('Active customers', '—', 'ScoutLink organisations', 'blue', 'stx5CrmActive') + metric('Showcase professionals', '—', 'Coach and Scout applicants', 'purple', 'stx5CrmShowcase') + '</section>' +
      card('CRM records', 'Product users, public leads, candidates and Showcase professionals.', '<div id="stx5CrmRows">' + loading() + '</div>') + '<div id="stx5CrmDetail"></div>';
  };

  async function loadCrm() {
    try {
      var data = await api('GET', '/api/stratex-website/crm');
      state.data.crm = data.data || [];
      renderCrm();
      var rows = state.data.crm;
      document.getElementById('stx5CrmContacts').textContent = number(rows.length);
      document.getElementById('stx5CrmWarm').textContent = number(rows.filter(function (row) { return /warm|contacted|follow/i.test(String(row.status || '')); }).length);
      document.getElementById('stx5CrmActive').textContent = number(rows.filter(function (row) { return /active|approved/i.test(String(row.status || '')) && /scoutlink/i.test(String(row.product || row.source || '')); }).length);
      document.getElementById('stx5CrmShowcase').textContent = number(rows.filter(function (row) { return /showcase/i.test(String(row.product || row.source || row.type || '')); }).length);
      var id = new URLSearchParams(window.location.search).get('id');
      if (id) openCrmById(id);
    } catch (error) {
      document.getElementById('stx5CrmRows').innerHTML = empty(error.message);
    }
  }

  function renderCrm() {
    var rows = state.data.crm || [];
    var tableRows = rows.map(function (row, index) {
      return '<tr data-click data-crm-index="' + index + '"><td>' + record(row.name || '—', row.email || '—', { name: row.name }) + '</td><td>' + esc(row.organisation || '—') + '</td><td>' + esc(String(row.type || '').replace(/_/g, ' ')) + '</td><td>' + status(row.product || (/scoutlink/i.test(row.source || '') ? 'ScoutLink' : 'Stratex')) + '</td><td>' + status(row.status || 'new') + '</td><td>' + esc(date(row.createdAt)) + '</td><td>' + button('Open contact', 'small', 'data-open-crm="' + index + '"') + '</td></tr>';
    });
    var mobileRows = rows.map(function (row, index) {
      return mobileRow(row.name || '—', (row.type || 'Contact') + ' · ' + (row.organisation || 'No organisation'), (row.product || row.source || 'Stratex') + ' · ' + date(row.createdAt), row.status || 'New', String(index));
    });
    document.getElementById('stx5CrmRows').innerHTML = dataTable(['Contact', 'Relationship', 'Source', 'Product', 'Status', 'Last activity', ''], tableRows, mobileRows, 'CRM records', 'Product users, public leads, candidates and Showcase professionals in one relationship view.');
    document.querySelectorAll('[data-crm-index],[data-open-crm]').forEach(function (node) {
      node.addEventListener('click', function (event) { event.stopPropagation(); openCrm(Number(node.dataset.crmIndex || node.dataset.openCrm)); });
    });
    document.querySelectorAll('[data-mobile-open]').forEach(function (node) { node.addEventListener('click', function () { openCrm(Number(node.dataset.mobileOpen)); }); });
  }

  function openCrm(index) {
    var row = (state.data.crm || [])[index];
    if (!row) return;
    document.getElementById('stx5CrmDetail').innerHTML = hero('CRM record', (row.name || 'Contact') + '.', 'Product, public-form and event relationships remain connected to one Stratex record.', row.email ? linkButton('Email contact', 'mailto:' + row.email, '') : '', false) + '<div class="stx5-two">' +
      card('Contact record', row.type || 'Relationship', detailGrid([['Email', row.email], ['Phone', row.phone], ['Organisation', row.organisation], ['Status', row.status], ['Product', row.product], ['Source', row.source], ['Linked lead', row.linkedLeadId], ['Linked registration', row.linkedRegistrationId], ['Linked account', row.linkedAccountId], ['Application ref', row.applicationRef], ['Created', date(row.createdAt)]])) +
      card('Relationship activity', 'Connected records', note('Stratex parent-company link', 'ScoutLink registrations and product accounts remain connected to the central Stratex CRM.')) + '</div>';
    document.getElementById('stx5CrmDetail').scrollIntoView({ behavior: 'smooth' });
  }

  function openCrmById(id) {
    var index = (state.data.crm || []).findIndex(function (row) { return String(row.recordId || row.id || '') === String(id); });
    if (index >= 0) openCrm(index);
  }

  function openAddContact() {
    openModal('Add CRM contact', '<form id="stx5AddContactForm"><div class="stx5-form-grid">' + field('First name', 'firstName', 'text', '') + field('Last name', 'lastName', 'text', '') + field('Email', 'email', 'email', '') + field('Phone', 'phone', 'tel', '') + field('Organisation', 'organisation', 'text', '', null, true) + field('Message / next action', 'message', 'textarea', 'Added internally through Stratex CRM.', null, true) + '</div>' + message('stx5AddContactMessage') + '<div class="stx5-actions" style="margin-top:12px">' + button('Save contact', '', 'type="submit"') + '</div></form>');
    document.getElementById('stx5AddContactForm').addEventListener('submit', async function (event) {
      event.preventDefault();
      var data = new FormData(event.currentTarget);
      try {
        await api('POST', '/api/stratex-website/contact', {
          firstName: data.get('firstName'), lastName: data.get('lastName'), email: data.get('email'), phone: data.get('phone'), organisation: data.get('organisation'), reason: 'Internal CRM contact', message: data.get('message'), sourcePage: '/admin/crm', consentContact: true, consentText: 'Internal Stratex CRM record created by an authorised administrator.', consentVersion: '2026-07-stratex-admin-v5'
        });
        showMessage('stx5AddContactMessage', 'Contact saved to the Stratex CRM.', true);
        setTimeout(function () { closeModal(); loadCrm(); }, 500);
      } catch (error) {
        showMessage('stx5AddContactMessage', error.message, false);
      }
    });
  }

  PAGE_LOADERS.crm = function () {
    loadCrm();
    document.getElementById('stx5AddContact').addEventListener('click', openAddContact);
    document.getElementById('stx5ExportCrm').addEventListener('click', async function () {
      try { downloadBlob(await apiBlob('/api/stratex-website/crm/export'), 'stratex-crm-export.xlsx'); }
      catch (error) { alert(error.message); }
    });
  };

  /* Blog / Learning Centre */
  PAGE_RENDERERS.blog = function () {
    return hero('Public content', 'Blog / Learning Centre.', 'Write, upload, preview and publish the exact public article experience.', button('Save draft', 'secondary', 'id="stx5SaveDraft"') + button('Publish article', '', 'id="stx5PublishArticle"'), true) +
      '<section class="stx5-editor-layout"><form class="stx5-card" id="stx5BlogForm"><header><div><h3>Write a Learning Centre article</h3><p id="stx5BlogMode">New draft</p></div></header><div class="stx5-card-body"><div class="stx5-form-grid">' +
      field('Title', 'title', 'text', '', null, false, '', 'required') + field('Slug', 'slug', 'text', '', null, false, 'Public URL: /learning-centre/:slug', 'required') +
      field('Category', 'category', 'select', 'For coaches', [['For coaches', 'For coaches'], ['For scouts', 'For scouts'], ['For families', 'For families'], ['Product guide', 'Product guide'], ['Safeguarding', 'Safeguarding']]) +
      field('Author', 'author', 'text', fullName(currentUser())) + field('Excerpt', 'excerpt', 'textarea', '', null, true, 'Shown on article cards and search previews.', 'required') +
      '<label class="stx5-field full"><span>Featured image</span><div class="stx5-upload"><b>↑</b><div><span id="stx5BlogImageName">Upload article image</span><small>JPG, PNG or WebP · 1600 × 900 recommended</small><input id="stx5BlogImage" name="image" type="file" accept="image/jpeg,image/png,image/webp"></div></div></label>' +
      field('Image alt text', 'imageAlt', 'text', '', null, true, 'Required for accessibility.') +
      '<label class="stx5-field full"><span>Article body</span><div class="stx5-toolbar">' + ['H2', 'B', 'I', '•', '1.', '↗'].map(function (label, index) {
        return '<button class="stx5-tool" type="button" data-editor="' + ['heading', 'bold', 'italic', 'bullet', 'number', 'link'][index] + '">' + label + '</button>';
      }).join('') + '</div><textarea class="stx5-textarea" id="stx5BlogBody" name="body" style="min-height:250px;border-radius:0 0 7px 7px" required></textarea></label>' +
      field('SEO title', 'seoTitle', 'text', '', null, false) + field('Meta description', 'metaDescription', 'textarea', '', null, false) + field('Canonical URL', 'canonicalUrl', 'url', '', null, true) +
      field('Indexing', 'indexing', 'select', 'index', [['index', 'Index when published'], ['noindex', 'Keep noindex']]) +
      '<input type="hidden" name="featuredImageUrl"></div>' + message('stx5BlogMessage') + '</div></form>' +
      '<aside style="display:grid;gap:15px"><section class="stx5-preview"><div class="stx5-preview-image" id="stx5BlogPreviewImage"><div><small id="stx5BlogPreviewCategory">Learning Centre</small><h3 id="stx5BlogPreviewTitle">Article title preview</h3></div></div><div class="stx5-preview-body"><p id="stx5BlogPreviewExcerpt">The article excerpt will appear here.</p></div></section>' +
      card('Publishing checks', '', toggle('Featured image added', 'Used on the public card and article hero.', false, 'blog-image') + toggle('Slug available', 'Checked when the post saves.', true, 'blog-slug') + toggle('SEO metadata complete', 'Ready for search preview.', false, 'blog-seo') + toggle('Include in sitemap', 'Only when published.', true, 'blog-sitemap')) + '</aside></section>' +
      card('Previous posts', 'Published, draft and archived', '<div id="stx5BlogRows">' + loading() + '</div>');
  };

  function previewBlog() {
    var form = document.getElementById('stx5BlogForm');
    if (!form) return;
    var title = form.querySelector('[name="title"]');
    var slugNode = form.querySelector('[name="slug"]');
    var category = form.querySelector('[name="category"]');
    var excerpt = form.querySelector('[name="excerpt"]');
    if (!slugNode.value && title.value) slugNode.value = slugify(title.value);
    document.getElementById('stx5BlogPreviewTitle').textContent = title.value || 'Article title preview';
    document.getElementById('stx5BlogPreviewCategory').textContent = (category.value || 'Learning') + ' · Learning Centre';
    document.getElementById('stx5BlogPreviewExcerpt').textContent = excerpt.value || 'The article excerpt will appear here.';
    form.querySelector('[name="canonicalUrl"]').value = 'https://www.stratexanalytics.co.uk/learning-centre/' + slugNode.value;
  }

  async function loadBlog() {
    bindBlogForm();
    try {
      var data = await api('GET', '/api/stratex-website/blog');
      state.data.blog = data.data || [];
      renderBlogRows();
    } catch (error) {
      document.getElementById('stx5BlogRows').innerHTML = empty(error.message);
    }
  }

  function bindBlogForm() {
    var form = document.getElementById('stx5BlogForm');
    ['title', 'slug', 'category', 'excerpt'].forEach(function (name) {
      form.querySelector('[name="' + name + '"]').addEventListener('input', previewBlog);
    });
    document.getElementById('stx5BlogImage').addEventListener('change', function () {
      var file = this.files && this.files[0];
      if (!file) return;
      document.getElementById('stx5BlogImageName').textContent = file.name;
      var reader = new FileReader();
      reader.onload = function () {
        document.getElementById('stx5BlogPreviewImage').style.backgroundImage = 'linear-gradient(rgba(7,17,31,.18),rgba(7,17,31,.18)),url("' + reader.result + '")';
      };
      reader.readAsDataURL(file);
    });
    document.querySelectorAll('[data-editor]').forEach(function (buttonNode) {
      buttonNode.addEventListener('click', function () {
        var textarea = document.getElementById('stx5BlogBody');
        var start = textarea.selectionStart || 0;
        var end = textarea.selectionEnd || 0;
        var selected = textarea.value.slice(start, end) || 'text';
        var command = buttonNode.dataset.editor;
        var next = selected;
        if (command === 'heading') next = '## ' + selected.replace(/^#+\s*/, '');
        if (command === 'bold') next = '**' + selected + '**';
        if (command === 'italic') next = '*' + selected + '*';
        if (command === 'bullet') next = selected.split(/\n/).map(function (line) { return '- ' + line; }).join('\n');
        if (command === 'number') next = selected.split(/\n/).map(function (line, index) { return (index + 1) + '. ' + line; }).join('\n');
        if (command === 'link') next = '[' + selected + '](https://)';
        textarea.value = textarea.value.slice(0, start) + next + textarea.value.slice(end);
        textarea.focus();
      });
    });
    document.getElementById('stx5SaveDraft').addEventListener('click', function () { saveBlog('draft'); });
    document.getElementById('stx5PublishArticle').addEventListener('click', function () { saveBlog('published'); });
    previewBlog();
  }

  async function uploadBlogImage(file) {
    if (!file) return '';
    var form = new FormData();
    form.append('image', file);
    var response = await fetch(API + '/api/stratex-website/blog/image', {
      method: 'POST', headers: { Authorization: 'Bearer ' + token() }, body: form
    });
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(data.error || 'Could not upload article image.');
    return data.url || '';
  }

  async function saveBlog(statusValue) {
    var form = document.getElementById('stx5BlogForm');
    var data = new FormData(form);
    var buttonNode = statusValue === 'published' ? document.getElementById('stx5PublishArticle') : document.getElementById('stx5SaveDraft');
    buttonNode.disabled = true;
    try {
      var file = form.querySelector('[name="image"]').files[0];
      if (file) data.set('featuredImageUrl', await uploadBlogImage(file));
      var payload = {
        title: data.get('title'),
        slug: data.get('slug') || slugify(data.get('title')),
        category: data.get('category'),
        excerpt: data.get('excerpt'),
        body: data.get('body'),
        status: statusValue,
        featuredImageUrl: data.get('featuredImageUrl'),
        imageAlt: data.get('imageAlt'),
        seoTitle: data.get('seoTitle'),
        metaDescription: data.get('metaDescription'),
        canonicalUrl: data.get('canonicalUrl'),
        indexWhenPublished: data.get('indexing') === 'index'
      };
      if (statusValue === 'published' && (!payload.featuredImageUrl || !payload.imageAlt)) {
        throw new Error('A featured image and image alt text are required before publishing.');
      }
      var id = state.selected.blogId;
      if (id) await api('PATCH', '/api/stratex-website/blog/' + encodeURIComponent(id), payload);
      else {
        var saved = await api('POST', '/api/stratex-website/blog', payload);
        state.selected.blogId = saved.data && saved.data.id;
      }
      showMessage('stx5BlogMessage', statusValue === 'published' ? 'Article published to the public Learning Centre.' : 'Draft saved privately.', true);
      await loadBlog();
    } catch (error) {
      showMessage('stx5BlogMessage', error.message, false);
    } finally {
      buttonNode.disabled = false;
    }
  }

  function renderBlogRows() {
    var rows = state.data.blog || [];
    var tableRows = rows.map(function (row, index) {
      return '<tr><td>' + record(row.title, '/learning-centre/' + row.slug, { name: row.title }, row.featured_image_url) + '</td><td>' + esc(row.category || 'Learning') + '</td><td>' + status(row.status) + '</td><td>' + number(row.view_count) + '</td><td>' + esc(date(row.updated_at || row.published_at || row.created_at)) + '</td><td><div class="stx5-row-actions">' + publicLink('/learning-centre/' + encodeURIComponent(row.slug || ''), 'View') + button('Edit', 'small', 'data-edit-blog="' + index + '"') + button('Archive', 'danger small', 'data-archive-blog="' + esc(row.id) + '"') + '</div></td></tr>';
    });
    var mobileRows = rows.map(function (row, index) {
      return mobileRow(row.title, (row.category || 'Learning') + ' · ' + row.status, number(row.view_count) + ' views · ' + date(row.updated_at || row.published_at), row.status, String(index), row.featured_image_url);
    });
    document.getElementById('stx5BlogRows').innerHTML = dataTable(['Title / URL', 'Category', 'Status', 'Views', 'Updated', 'Actions'], tableRows, mobileRows, 'Previous posts', 'Published posts appear automatically in the public Learning Centre.');
    document.querySelectorAll('[data-edit-blog]').forEach(function (node) { node.addEventListener('click', function () { editBlog(rows[Number(node.dataset.editBlog)]); }); });
    document.querySelectorAll('[data-archive-blog]').forEach(function (node) {
      node.addEventListener('click', async function () {
        if (!confirm('Archive this post and remove it from public listings?')) return;
        try { await api('DELETE', '/api/stratex-website/blog/' + encodeURIComponent(node.dataset.archiveBlog)); await loadBlog(); }
        catch (error) { alert(error.message); }
      });
    });
    document.querySelectorAll('[data-mobile-open]').forEach(function (node) { node.addEventListener('click', function () { editBlog(rows[Number(node.dataset.mobileOpen)]); }); });
  }

  async function editBlog(row) {
    state.selected.blogId = row.id;
    var full = row;
    try {
      var detailData = await api('GET', '/api/stratex-website/blog/admin/' + encodeURIComponent(row.id));
      full = Object.assign({}, row, detailData.data || {});
    } catch (_) {}
    var form = document.getElementById('stx5BlogForm');
    ['title', 'slug', 'category', 'excerpt', 'body'].forEach(function (key) {
      var node = form.querySelector('[name="' + key + '"]');
      if (node) node.value = full[key] || '';
    });
    [['featuredImageUrl', 'featured_image_url'], ['imageAlt', 'image_alt'], ['seoTitle', 'seo_title'], ['metaDescription', 'meta_description'], ['canonicalUrl', 'canonical_url']].forEach(function (pair) {
      var node = form.querySelector('[name="' + pair[0] + '"]');
      if (node) node.value = full[pair[1]] || '';
    });
    document.getElementById('stx5BlogMode').textContent = 'Editing ' + (full.status || 'draft');
    if (full.featured_image_url) document.getElementById('stx5BlogPreviewImage').style.backgroundImage = 'linear-gradient(rgba(7,17,31,.18),rgba(7,17,31,.18)),url("' + full.featured_image_url + '")';
    previewBlog();
    form.scrollIntoView({ behavior: 'smooth' });
  }

  PAGE_LOADERS.blog = loadBlog;

  /* Leadership */
  PAGE_RENDERERS.leadership = function () {
    return hero('Public leadership', 'Leadership.', 'Manage public leadership profiles, images and ordering.', publicLink('/leadership', 'Open public page') + button('Add profile', '', 'id="stx5AddLeader"'), true) +
      card('Leadership profiles', 'Profiles marked Public appear automatically on the public Leadership page.', '<div id="stx5LeadershipRows">' + loading() + '</div>');
  };

  async function loadLeadership() {
    try {
      var data = await api('GET', '/api/stratex-website/leadership');
      state.data.leadership = data.data || [];
      renderLeadership();
    } catch (error) {
      document.getElementById('stx5LeadershipRows').innerHTML = empty(error.message);
    }
  }

  function renderLeadership() {
    var rows = state.data.leadership || [];
    document.getElementById('stx5LeadershipRows').innerHTML = '<section class="stx5-profile-grid">' + rows.map(function (row, index) {
      return '<article class="stx5-leader-card"><header><span class="stx5-avatar">' + (row.image_url ? '<img src="' + esc(row.image_url) + '" alt="">' : esc(initials({ name: row.full_name }))) + '</span><div class="stx5-profile-order">' + String(index + 1).padStart(2, '0') + '</div></header>' +
        status(row.is_active === false ? 'Hidden' : 'Public') + '<h3>' + esc(row.full_name) + '</h3><p>' + esc(row.job_title || '') + '</p><dl><div><dt>Department</dt><dd>' + esc(row.focus_chip || row.permission_role || 'Leadership') + '</dd></div><div><dt>Public email action</dt><dd>' + esc(row.email || 'Not shown') + '</dd></div><div><dt>Display order</dt><dd>' + esc(row.display_order || '—') + '</dd></div></dl><footer>' + button('Edit profile', '', 'data-edit-leader="' + index + '"') + '</footer></article>';
    }).join('') + '</section>';
    document.querySelectorAll('[data-edit-leader]').forEach(function (node) { node.addEventListener('click', function () { openLeaderForm(rows[Number(node.dataset.editLeader)]); }); });
  }

  function openLeaderForm(row) {
    row = row || {};
    openModal(row.id ? 'Edit ' + (row.full_name || 'leadership profile') : 'Add leadership profile', '<form id="stx5LeaderForm"><div class="stx5-form-grid">' +
      field('Full name', 'fullName', 'text', row.full_name || '', null, false, '', 'required') + field('Public role', 'jobTitle', 'text', row.job_title || '', null, false, '', 'required') + field('Department / profile chip', 'focusChip', 'text', row.focus_chip || '') + field('Profile order', 'displayOrder', 'number', row.display_order || 100) + field('Short description', 'summary', 'textarea', row.summary || '', null, true) + field('Full biography', 'bio', 'textarea', row.bio || '', null, true) +
      '<label class="stx5-field"><span>Profile image</span><input class="stx5-input" name="imageFile" type="file" accept="image/jpeg,image/png,image/webp"></label>' +
      field('Image URL', 'imageUrl', 'url', row.image_url || '') + field('Email action', 'email', 'email', row.email || '') + field('LinkedIn URL', 'linkedinUrl', 'url', row.linkedin_url || '') + field('Visibility', 'isActive', 'select', row.is_active === false ? 'false' : 'true', [['true', 'Public'], ['false', 'Hidden']]) +
      '</div>' + message('stx5LeaderMessage') + '<div class="stx5-actions" style="margin-top:12px">' + button('Save profile', '', 'type="submit"') + '</div></form>');
    document.getElementById('stx5LeaderForm').addEventListener('submit', async function (event) {
      event.preventDefault();
      var data = new FormData(event.currentTarget);
      var imageUrl = data.get('imageUrl');
      try {
        var file = data.get('imageFile');
        if (file && file.name) {
          var upload = new FormData();
          upload.append('image', file);
          upload.append('name', data.get('fullName'));
          var response = await fetch(API + '/api/stratex-website/leadership/image', { method: 'POST', headers: { Authorization: 'Bearer ' + token() }, body: upload });
          var uploaded = await response.json().catch(function () { return {}; });
          if (!response.ok) throw new Error(uploaded.error || 'Could not upload image.');
          imageUrl = uploaded.url;
        }
        var payload = {
          fullName: data.get('fullName'), jobTitle: data.get('jobTitle'), focusChip: data.get('focusChip'), displayOrder: Number(data.get('displayOrder') || 100), summary: data.get('summary'), bio: data.get('bio'), imageUrl: imageUrl, email: data.get('email'), linkedinUrl: data.get('linkedinUrl'), permissionRole: 'Management', isActive: data.get('isActive') === 'true'
        };
        if (row.id) await api('PATCH', '/api/stratex-website/leadership/' + encodeURIComponent(row.id), payload);
        else await api('POST', '/api/stratex-website/leadership', payload);
        showMessage('stx5LeaderMessage', 'Leadership profile saved and the public page has been updated.', true);
        setTimeout(function () { closeModal(); loadLeadership(); }, 450);
      } catch (error) {
        showMessage('stx5LeaderMessage', error.message, false);
      }
    });
  }

  PAGE_LOADERS.leadership = function () {
    loadLeadership();
    document.getElementById('stx5AddLeader').addEventListener('click', function () { openLeaderForm(null); });
  };

  /* Organisation and internal users */
  async function fetchOrg() {
    var data = await api('GET', '/api/stratex/org');
    state.data.org = data;
    return data;
  }

  PAGE_RENDERERS.org = function () {
    return hero('Reporting hierarchy', 'Org Charts.', 'A reporting-line view. Permissions remain separate.', isRichdhin() ? button('Add Stratex user', '', 'data-nav="add-user"') : '', true) +
      card('Stratex Analytics organisation', 'Reporting lines', '<div class="stx5-org" id="stx5OrgRows">' + loading() + '</div>');
  };

  function orgPerson(row) {
    return '<article class="stx5-org-person"><b>' + esc(fullName(row)) + '</b><span>' + esc(row.job_title || row.admin_role || row.role || 'Stratex Analytics') + '</span><small>' + esc(row.email || '') + '</small></article>';
  }

  function renderOrgRows(admins) {
    var byManager = {};
    admins.forEach(function (admin) {
      var key = admin.manager_id || 'root';
      if (!byManager[key]) byManager[key] = [];
      byManager[key].push(admin);
    });
    var roots = admins.filter(function (admin) { return !admin.manager_id; });
    function branch(row) {
      var children = byManager[row.id] || [];
      return '<div style="min-width:220px">' + orgPerson(row) + (children.length ? '<div class="stx5-org-line"></div><div class="stx5-org-level">' + children.map(branch).join('') + '</div>' : '') + '</div>';
    }
    document.getElementById('stx5OrgRows').innerHTML = roots.length ? '<div class="stx5-org-level">' + roots.map(branch).join('') + '</div>' : empty('No organisation records yet.');
  }

  PAGE_LOADERS.org = async function () {
    try { var data = await fetchOrg(); renderOrgRows(data.admins || []); }
    catch (error) { document.getElementById('stx5OrgRows').innerHTML = empty(error.message); }
  };

  PAGE_RENDERERS['add-user'] = function () {
    if (!isRichdhin()) return hero('Internal access', 'Access restricted.', 'Only Richdhin Inaba can create internal Stratex users.', '', true) + note('Super Admin only', 'The authenticated account cannot create Stratex Admin users.', 'red');
    return hero('Internal access', 'Add Stratex User.', 'Create the account, assign a reporting manager and send a secure login code.', button('Create user and send login code', '', 'id="stx5CreateUserTop"'), true) +
      '<div class="stx5-two"><section class="stx5-card"><header><div><h3>User and reporting details</h3><p>Internal staff only</p></div></header><div class="stx5-card-body"><form id="stx5AddUserForm"><div class="stx5-form-grid">' +
      field('First name', 'firstName', 'text', '', null, false, '', 'required') + field('Last name', 'lastName', 'text', '', null, false, '', 'required') + field('Stratex email', 'emailAddr', 'email', '', null, false, '', 'required') + field('Job title', 'jobTitle', 'text', '', null, false, '', 'required') +
      field('Department', 'department', 'select', 'Customer Operations', [['Customer Operations', 'Customer Operations'], ['Football Strategy & Growth', 'Football Strategy & Growth'], ['Product', 'Product'], ['Executive', 'Executive'], ['Finance', 'Finance'], ['Legal & Compliance', 'Legal & Compliance']]) +
      field('Reporting manager', 'managerId', 'select', '', [['', 'No manager']], false, 'This controls the Org Chart position.') + field('Access level', 'adminRole', 'select', 'Employee', [['Employee', 'Standard Admin'], ['Management', 'Manager Admin']]) + field('Start date', 'startDate', 'date', '') + field('Employment status', 'employmentStatus', 'select', 'Employee', [['Intern', 'Intern'], ['Employee', 'Employee'], ['Contractor', 'Contractor'], ['Advisor', 'Advisor']]) + field('Welcome note', 'welcomeNote', 'textarea', 'Welcome to Stratex Analytics. Use the secure login code to complete your Stratex Admin account.', null, true) +
      '</div>' + toggle('Send login-code email', 'Immediately after creation.', true, 'invite-email') + toggle('Require password setup', 'Create a private password.', true, 'invite-password') + toggle('Add to Org Chart', 'Use the selected manager.', true, 'invite-org') + message('stx5AddUserMessage') + '<div class="stx5-actions" style="margin-top:12px">' + button('Create user and send login code', '', 'type="submit"') + '</div></form></div></section>' +
      '<aside style="display:grid;gap:15px">' + card('Hierarchy impact', 'Updates from reporting manager', '<div id="stx5HierarchyPreview">' + empty('Select a reporting manager to preview the hierarchy position.') + '</div>') + card('Invitation email preview', 'One-time code', '<div style="padding:18px;background:#071625;color:#fff"><span class="stx5-kicker" style="color:#9fd7c2">Stratex Admin</span><h3 style="font-size:20px">Your internal account is ready.</h3><p style="color:#c4d4d9">The user verifies a one-time code and creates a private password.</p><strong style="display:block;margin:22px 0;text-align:center;font-size:25px;letter-spacing:8px">482 916</strong><div class="stx5-btn" style="width:100%">Complete Stratex Admin setup</div></div>') + '</aside></div>';
  };

  function renderHierarchyPreview() {
    var form = document.getElementById('stx5AddUserForm');
    var root = document.getElementById('stx5HierarchyPreview');
    if (!form || !root) return;
    var data = new FormData(form);
    var admins = state.data.org && state.data.org.admins || [];
    var manager = admins.find(function (admin) { return String(admin.id) === String(data.get('managerId')); });
    var newName = [data.get('firstName'), data.get('lastName')].filter(Boolean).join(' ') || 'New Stratex user';
    root.innerHTML = '<div style="display:grid;place-items:center">' + (manager ? orgPerson(manager) + '<div class="stx5-org-line"></div>' : '') + '<article class="stx5-org-person"><b>' + esc(newName) + '</b><span>' + esc(data.get('jobTitle') || 'New role') + '</span><small>' + esc(data.get('emailAddr') || '') + '</small></article></div>';
  }

  PAGE_LOADERS['add-user'] = async function () {
    if (!isRichdhin()) return;
    try {
      var data = await fetchOrg();
      var select = document.querySelector('#stx5AddUserForm [name="managerId"]');
      select.innerHTML = '<option value="">No manager</option>' + (data.admins || []).filter(function (admin) { return admin.is_active !== false; }).map(function (admin) {
        return '<option value="' + esc(admin.id) + '">' + esc(fullName(admin) + ' · ' + (admin.job_title || admin.admin_role || '')) + '</option>';
      }).join('');
      select.addEventListener('change', renderHierarchyPreview);
      ['firstName', 'lastName', 'jobTitle', 'emailAddr'].forEach(function (name) { document.querySelector('[name="' + name + '"]').addEventListener('input', renderHierarchyPreview); });
      renderHierarchyPreview();
    } catch (_) {}
    var form = document.getElementById('stx5AddUserForm');
    document.getElementById('stx5CreateUserTop').addEventListener('click', function () { form.requestSubmit(); });
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      var data = new FormData(form);
      try {
        var result = await api('POST', '/api/stratex/admins', {
          firstName: data.get('firstName'), lastName: data.get('lastName'), emailAddr: data.get('emailAddr'), jobTitle: data.get('jobTitle'), managerId: data.get('managerId') || null, adminRole: data.get('adminRole')
        });
        showMessage('stx5AddUserMessage', (result.message || 'Stratex Admin user created and invitation sent.') + (result.loginCode ? ' Login code: ' + result.loginCode : ''), true);
        await fetchOrg();
        renderHierarchyPreview();
      } catch (error) {
        showMessage('stx5AddUserMessage', error.message, false);
      }
    });
  };

  /* Permissions */
  var PERMISSION_AREAS = [
    ['dashboard', 'Dashboard'], ['registrations', 'Registrations'], ['contact_forms', 'Contact Forms'], ['crm', 'CRM'], ['usage_requests', 'Usage Requests'],
    ['content', 'Blog / Learning Centre'], ['leadership', 'Leadership'], ['org', 'Org Charts'], ['contracts', 'Contracts & Pay'], ['hiring', 'Hiring'],
    ['trust', 'Trust & Concerns'], ['showcase', 'Showcase Event'], ['awards', 'Award Ceremonies'], ['settings', 'Settings']
  ];

  PAGE_RENDERERS.permissions = function () {
    if (!isRichdhin()) return hero('Access control', 'Permissions.', 'Only Richdhin Inaba can edit access.', '', true) + note('Permission editing locked', 'Only the fixed Super Admin can change access levels or section permissions.', 'red');
    return hero('Access control', 'Permissions.', 'Only Richdhin can edit access. Website Activity has been removed from the permission model.', button('Save permission changes', '', 'id="stx5SavePermissions"'), true) + note('Super Admin confirmed', 'Changes are enforced by the backend and audited.') +
      card('Permission matrix', 'View, Create, Edit and Delete', '<div class="stx5-form-grid">' + field('User being edited', 'permissionUser', 'select', '', [['', 'Loading users…']]) + field('Access level', 'permissionRole', 'select', 'Employee', [['Employee', 'Standard Admin'], ['Management', 'Manager Admin']]) + '</div><div id="stx5PermissionRows" style="margin-top:15px">' + loading() + '</div>' + message('stx5PermissionMessage'));
  };

  function permissionAdmin() {
    var select = document.querySelector('[name="permissionUser"]');
    return (state.data.permissionAdmins || []).find(function (admin) { return String(admin.id) === String(select && select.value); });
  }

  function renderPermissionMatrix() {
    var admin = permissionAdmin();
    if (!admin) {
      document.getElementById('stx5PermissionRows').innerHTML = empty('No editable users.');
      return;
    }
    var permissions = Array.isArray(admin.permissions) ? admin.permissions.map(function (value) { return String(value).toLowerCase(); }) : [];
    state.selected.permissions = permissions.slice();
    state.selected.permissionRole = /management/i.test(String(admin.admin_role || admin.role || '')) ? 'Management' : 'Employee';
    document.querySelector('[name="permissionRole"]').value = state.selected.permissionRole;
    document.getElementById('stx5PermissionRows').innerHTML = '<div class="stx5-permission-grid stx5-permission-head"><span>Admin area</span><span>View</span><span>Create</span><span>Edit</span><span>Delete</span></div>' + PERMISSION_AREAS.map(function (area) {
      var on = permissions.indexOf(area[0]) >= 0 || area[0] === 'dashboard';
      return '<div class="stx5-permission-grid stx5-permission-row"><span><b>' + esc(area[1]) + '</b></span>' + ['view', 'create', 'edit', 'delete'].map(function (kind) {
        var enabled = kind === 'view' ? on : (on && state.selected.permissionRole === 'Management' && area[0] !== 'dashboard');
        var locked = area[0] === 'dashboard' && kind === 'view';
        return '<button class="stx5-check ' + (enabled ? 'on' : '') + '" type="button" data-permission="' + esc(area[0]) + '" data-kind="' + kind + '" ' + (locked ? 'disabled' : '') + '>' + (enabled ? '✓' : '') + '</button>';
      }).join('') + '</div>';
    }).join('');
    document.querySelectorAll('[data-permission]').forEach(function (buttonNode) {
      buttonNode.addEventListener('click', function () {
        buttonNode.classList.toggle('on');
        buttonNode.textContent = buttonNode.classList.contains('on') ? '✓' : '';
        if (buttonNode.dataset.kind === 'view') {
          var key = buttonNode.dataset.permission;
          var index = state.selected.permissions.indexOf(key);
          if (buttonNode.classList.contains('on') && index < 0) state.selected.permissions.push(key);
          if (!buttonNode.classList.contains('on') && index >= 0) state.selected.permissions.splice(index, 1);
        }
      });
    });
  }

  PAGE_LOADERS.permissions = async function () {
    if (!isRichdhin()) return;
    try {
      var data = await fetchOrg();
      state.data.permissionAdmins = (data.admins || []).filter(function (admin) { return String(admin.email || '').toLowerCase() !== RICHDHIN_EMAIL; });
      var select = document.querySelector('[name="permissionUser"]');
      select.innerHTML = state.data.permissionAdmins.map(function (admin) { return '<option value="' + esc(admin.id) + '">' + esc(fullName(admin) + ' · ' + (admin.job_title || admin.admin_role || '')) + '</option>'; }).join('') || '<option value="">No editable users</option>';
      select.addEventListener('change', renderPermissionMatrix);
      document.querySelector('[name="permissionRole"]').addEventListener('change', function () { state.selected.permissionRole = this.value; renderPermissionMatrix(); });
      renderPermissionMatrix();
    } catch (error) {
      document.getElementById('stx5PermissionRows').innerHTML = empty(error.message);
    }
    document.getElementById('stx5SavePermissions').addEventListener('click', async function () {
      var admin = permissionAdmin();
      if (!admin) return showMessage('stx5PermissionMessage', 'Choose a Stratex user.', false);
      try {
        await api('PATCH', '/api/stratex/admins/' + encodeURIComponent(admin.id) + '/permissions', {
          adminRole: document.querySelector('[name="permissionRole"]').value,
          permissions: state.selected.permissions || []
        });
        showMessage('stx5PermissionMessage', 'Permissions updated successfully.', true);
        var refreshed = await fetchOrg();
        state.data.permissionAdmins = (refreshed.admins || []).filter(function (item) { return String(item.email || '').toLowerCase() !== RICHDHIN_EMAIL; });
      } catch (error) {
        showMessage('stx5PermissionMessage', error.message, false);
      }
    });
  };

  /* My Profile */
  PAGE_RENDERERS.profile = function () {
    return hero('Internal profile', 'My Profile.', 'Your role, reporting lines and private records.', button('Change password', 'secondary', 'id="stx5ChangePassword"') + button('Edit profile', '', 'id="stx5EditProfile"'), true) +
      '<div class="stx5-two">' + card('Stratex profile', 'Internal record', '<div id="stx5ProfileRecord">' + loading() + '</div>') + card('Related records', 'Reporting and private records', '<div id="stx5ProfileRelated">' + loading() + '</div>') + '</div>';
  };

  function openPasswordModal() {
    openModal('Change Stratex Admin password', '<form id="stx5PasswordForm"><div class="stx5-form-grid">' + field('New password', 'password', 'password', '') + field('Confirm password', 'confirm', 'password', '') + '</div>' + message('stx5PasswordMessage') + '<div class="stx5-actions" style="margin-top:12px">' + button('Save password', '', 'type="submit"') + '</div></form>');
    document.getElementById('stx5PasswordForm').addEventListener('submit', async function (event) {
      event.preventDefault();
      var data = new FormData(event.currentTarget);
      var password = String(data.get('password') || '');
      if (password.length < 8) return showMessage('stx5PasswordMessage', 'Password must be at least eight characters.', false);
      if (password !== String(data.get('confirm') || '')) return showMessage('stx5PasswordMessage', 'Passwords do not match.', false);
      try { await api('POST', '/api/auth/change-password', { password: password }); showMessage('stx5PasswordMessage', 'Password updated.', true); }
      catch (error) { showMessage('stx5PasswordMessage', error.message, false); }
    });
  }

  PAGE_LOADERS.profile = async function () {
    document.getElementById('stx5ChangePassword').addEventListener('click', openPasswordModal);
    try {
      var data = await fetchOrg();
      var admins = data.admins || [];
      var self = admins.find(function (admin) { return String(admin.id) === String(currentUser().id); }) || data.currentAdmin || currentUser();
      var manager = admins.find(function (admin) { return String(admin.id) === String(self.manager_id); });
      var reports = admins.filter(function (admin) { return String(admin.manager_id) === String(self.id); });
      state.selected.profile = self;
      document.getElementById('stx5ProfileRecord').innerHTML = record(fullName(self), self.job_title || roleLabel(self), self, self.image_url) + '<div style="margin-top:16px">' + detailGrid([['Email', self.email], ['Department', self.department || '—'], ['Reports to', manager ? fullName(manager) : 'No manager'], ['Direct reports', reports.length ? reports.map(fullName).join(', ') : 'None'], ['Admin access', roleLabel(self)], ['Status', self.is_active === false ? 'Inactive' : 'Active'], ['ScoutLink profile', 'Separate']]) + '</div>';
      document.getElementById('stx5ProfileRelated').innerHTML = '<div class="stx5-toggle-row"><div><b>Contract and pay</b><span>Open your private record.</span></div>' + button('Open', 'secondary small', 'data-nav="contracts"') + '</div><div class="stx5-toggle-row"><div><b>Direct reports</b><span>' + esc(reports.length ? reports.map(fullName).join(', ') : 'No direct reports') + '</span></div>' + button('Open', 'secondary small', 'data-nav="org"') + '</div>';
      document.getElementById('stx5EditProfile').addEventListener('click', function () {
        if (!isRichdhin()) return navigate('settings', true);
        openModal('Edit Stratex profile', '<form id="stx5ProfileEditForm"><div class="stx5-form-grid">' + field('Job title', 'jobTitle', 'text', self.job_title || '') + field('Reporting manager', 'managerId', 'select', self.manager_id || '', [['', 'No manager']].concat(admins.filter(function (admin) { return admin.id !== self.id; }).map(function (admin) { return [admin.id, fullName(admin)]; }))) + '</div>' + message('stx5ProfileEditMessage') + '<div class="stx5-actions" style="margin-top:12px">' + button('Save profile', '', 'type="submit"') + '</div></form>');
        document.getElementById('stx5ProfileEditForm').addEventListener('submit', async function (event) {
          event.preventDefault();
          var formData = new FormData(event.currentTarget);
          try { await api('PATCH', '/api/stratex/admins/' + encodeURIComponent(self.id), { jobTitle: formData.get('jobTitle'), managerId: formData.get('managerId') || null }); showMessage('stx5ProfileEditMessage', 'Profile updated.', true); setTimeout(function () { closeModal(); PAGE_LOADERS.profile(); }, 400); }
          catch (error) { showMessage('stx5ProfileEditMessage', error.message, false); }
        });
      });
    } catch (error) {
      document.getElementById('stx5ProfileRecord').innerHTML = empty(error.message);
    }
  };

  /* Contracts & Pay */
  PAGE_RENDERERS.contracts = function () {
    return hero('Private people records', 'Contracts & Pay.', 'Reporting-line permissions control private records.', button('Upload contract', '', 'id="stx5UploadContractTop"'), true) + note('Permission model', 'Richdhin can view leadership and both reporting lines. Directors can view themselves and their line.', 'gold') +
      card('Contracts and pay', 'Short-lived secure file links', '<div id="stx5ContractRows">' + loading() + '</div>') + '<div id="stx5ContractDetail"></div>';
  };

  function contractMeta(row) {
    return row && row.contract_data && typeof row.contract_data === 'object' ? row.contract_data : {};
  }

  async function loadContracts() {
    try {
      var data = await api('GET', '/api/stratex/contracts-pay');
      state.data.contracts = data.data || [];
      state.data.contractCanEdit = !!data.canEdit;
      renderContracts();
    } catch (error) {
      document.getElementById('stx5ContractRows').innerHTML = empty(error.message);
    }
  }

  function renderContracts() {
    var rows = state.data.contracts || [];
    document.getElementById('stx5ContractRows').innerHTML = '<section class="stx5-contract-grid">' + rows.map(function (row, index) {
      var meta = contractMeta(row);
      return '<article class="stx5-contract-card"><header>' + record(fullName(row), row.job_title || row.admin_role || '', row) + status(meta.payStatus || meta.status || 'Active') + '</header><div class="stx5-contract-amount"><small>Annual pay</small><strong>' + (meta.payAmount ? '£' + Number(meta.payAmount).toLocaleString('en-GB') : 'Not set') + '</strong><span>' + esc(meta.payFrequency || 'Frequency not set') + '</span></div><div style="margin-top:14px">' + detailGrid([['Department', row.department || '—'], ['Contract file', meta.contractPath ? 'Uploaded' : 'Not uploaded'], ['Access', 'Private']]) + '</div><div class="stx5-actions" style="margin-top:15px">' + button(state.data.contractCanEdit ? 'Manage record' : 'Open record', '', 'data-contract="' + index + '"') + '</div></article>';
    }).join('') + '</section>';
    document.querySelectorAll('[data-contract]').forEach(function (node) { node.addEventListener('click', function () { openContract(rows[Number(node.dataset.contract)]); }); });
  }

  function openContract(row) {
    var meta = contractMeta(row);
    var form = state.data.contractCanEdit ? '<form id="stx5ContractForm"><div class="stx5-form-grid">' + field('Pay amount', 'payAmount', 'number', meta.payAmount || '') + field('Pay frequency', 'payFrequency', 'select', meta.payFrequency || '', [['', 'Select frequency'], ['Hourly', 'Hourly'], ['Daily', 'Daily'], ['Weekly', 'Weekly'], ['Monthly', 'Monthly'], ['Annually', 'Annually']]) + field('Status', 'status', 'select', meta.payStatus || meta.status || 'Active', [['Active', 'Active'], ['Draft', 'Draft'], ['Pending review', 'Pending review'], ['Archived', 'Archived']]) + '<label class="stx5-field full"><span>Upload contract PDF</span><input class="stx5-input" name="contract" type="file" accept="application/pdf"></label></div>' + message('stx5ContractMessage') + '<div class="stx5-actions" style="margin-top:12px">' + button('Save HR record', '', 'type="submit"') + '</div></form>' : '';
    var actions = meta.contractPath ? button('Download private file', 'secondary', 'id="stx5DownloadContract"') : '';
    document.getElementById('stx5ContractDetail').innerHTML = hero('Private HR record', fullName(row) + '.', row.job_title || row.admin_role || '', actions, false) + card('Contract and pay record', 'Private and reporting-line controlled', detailGrid([['Reports to', row.manager_name || '—'], ['Contract type', meta.contractType || meta.contract_type || '—'], ['Start date', date(meta.startDate || meta.start_date)], ['End date', date(meta.endDate || meta.end_date)], ['Pay', meta.payAmount ? '£' + meta.payAmount : 'Not set'], ['Frequency', meta.payFrequency || '—'], ['Contract file', meta.contractFileName || meta.fileName || (meta.contractPath ? 'Uploaded' : 'Not uploaded')], ['Status', meta.payStatus || meta.status || 'Active']]) + (form ? '<div style="margin-top:15px">' + form + '</div>' : ''));
    var download = document.getElementById('stx5DownloadContract');
    if (download) download.addEventListener('click', async function () { try { var data = await api('GET', '/api/stratex/contracts-pay/' + encodeURIComponent(row.id) + '/contract-url'); if (data.url) window.open(data.url, '_blank', 'noopener'); } catch (error) { alert(error.message); } });
    var contractForm = document.getElementById('stx5ContractForm');
    if (contractForm) contractForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      var data = new FormData(contractForm);
      try {
        await api('PATCH', '/api/stratex/contracts-pay/' + encodeURIComponent(row.id) + '/pay', { payAmount: data.get('payAmount'), payFrequency: data.get('payFrequency'), status: data.get('status') });
        var file = data.get('contract');
        if (file && file.name) { var upload = new FormData(); upload.append('contract', file); await api('POST', '/api/stratex/contracts-pay/' + encodeURIComponent(row.id) + '/contract', upload, true); }
        showMessage('stx5ContractMessage', 'Contract and pay record saved.', true);
        await loadContracts();
      } catch (error) { showMessage('stx5ContractMessage', error.message, false); }
    });
    document.getElementById('stx5ContractDetail').scrollIntoView({ behavior: 'smooth' });
  }

  PAGE_LOADERS.contracts = function () {
    loadContracts();
    document.getElementById('stx5UploadContractTop').addEventListener('click', function () {
      var first = state.data.contracts && state.data.contracts[0];
      if (first) openContract(first); else alert('No contract records are available.');
    });
  };

  /* Hiring */
  PAGE_RENDERERS.hiring = function () {
    return hero('People growth', 'Hiring.', 'Manage roles first, then applicants inside the selected role.', button('Add role', '', 'id="stx5AddRole"'), true) +
      card('Roles', 'Open, draft and closed', '<div id="stx5HiringRows">' + loading() + '</div>') + card('Applications', 'Use Shortlist, Maybe or Not a fit.', '<div id="stx5ApplicationRows">' + loading() + '</div>') + '<div id="stx5HiringDetail"></div>';
  };

  function linkedApplications(job) {
    return (state.data.applications || []).filter(function (application) {
      var linked = application.job_posts || {};
      return String(application.job_id || linked.id || linked.slug || linked.job_title || '') === String(job.id || job.slug || job.job_title || '');
    });
  }

  async function loadHiring() {
    var results = await Promise.allSettled([api('GET', '/api/stratex/jobs'), api('GET', '/api/stratex/job-applications')]);
    state.data.jobs = results[0].status === 'fulfilled' ? (results[0].value.data || []) : [];
    state.data.applications = results[1].status === 'fulfilled' ? (results[1].value.data || []) : [];
    renderHiring();
    var applicantId = new URLSearchParams(window.location.search).get('applicant');
    if (applicantId) {
      var app = state.data.applications.find(function (row) { return String(row.id) === String(applicantId); });
      if (app) openApplicant(app);
    }
  }

  function renderHiring() {
    var jobs = state.data.jobs || [];
    var applications = state.data.applications || [];
    var roleRows = jobs.map(function (job, index) {
      return '<tr><td>' + record(job.job_title || 'Untitled role', job.department || '—', { name: job.job_title }) + '</td><td>' + status(job.status || 'draft') + '</td><td>' + number(linkedApplications(job).length) + '</td><td>' + number(job.positions_available || 1) + '</td><td>' + esc(date(job.updated_at || job.release_at || job.created_at)) + '</td><td><div class="stx5-row-actions">' + button('View applicants', 'small', 'data-job-apps="' + index + '"') + button('Edit role', 'secondary small', 'data-edit-job="' + index + '"') + '</div></td></tr>';
    });
    var roleMobile = jobs.map(function (job, index) { return mobileRow(job.job_title || 'Untitled role', (job.department || '—') + ' · ' + (job.status || 'draft'), linkedApplications(job).length + ' applicants · ' + (job.positions_available || 1) + ' positions', job.status, String(index)); });
    document.getElementById('stx5HiringRows').innerHTML = dataTable(['Role / Department', 'Status', 'Applicants', 'Positions', 'Updated', 'Actions'], roleRows, roleMobile, 'Roles', 'Public roles are controlled by their status and publishing dates.');
    var appRows = applications.map(function (app, index) {
      var job = app.job_posts || {};
      return '<tr><td>' + record(fullName(app), app.email || '', app) + '</td><td>' + status(app.status || 'Submitted') + '</td><td>' + esc(app.stage || app.application_stage || 'CV sift') + '</td><td>' + esc(job.job_title || '—') + '</td><td>' + status(app.job_application_files && app.job_application_files.length ? 'Private CV' : 'No CV', app.job_application_files && app.job_application_files.length ? 'purple' : 'grey') + '</td><td>' + button('Review applicant', 'small', 'data-applicant="' + index + '"') + '</td></tr>';
    });
    var appMobile = applications.map(function (app, index) { var job = app.job_posts || {}; return mobileRow(fullName(app), (job.job_title || 'Application') + ' · ' + (app.stage || 'CV sift'), app.job_application_files && app.job_application_files.length ? 'Private CV stored' : 'No CV', app.status || 'Submitted', String(index)); });
    document.getElementById('stx5ApplicationRows').innerHTML = dataTable(['Applicant', 'Decision', 'Stage', 'Role', 'Private file', ''], appRows, appMobile, 'Applications', 'Private recruitment records with direct CV decisions.');
    document.querySelectorAll('[data-job-apps]').forEach(function (node) { node.addEventListener('click', function () { openJobApplicants(jobs[Number(node.dataset.jobApps)]); }); });
    document.querySelectorAll('[data-edit-job]').forEach(function (node) { node.addEventListener('click', function () { openJobForm(jobs[Number(node.dataset.editJob)]); }); });
    document.querySelectorAll('[data-applicant]').forEach(function (node) { node.addEventListener('click', function () { openApplicant(applications[Number(node.dataset.applicant)]); }); });
    document.querySelectorAll('#stx5HiringRows [data-mobile-open]').forEach(function (node) { node.addEventListener('click', function () { openJobApplicants(jobs[Number(node.dataset.mobileOpen)]); }); });
    document.querySelectorAll('#stx5ApplicationRows [data-mobile-open]').forEach(function (node) { node.addEventListener('click', function () { openApplicant(applications[Number(node.dataset.mobileOpen)]); }); });
  }

  function jobFormFields(job) {
    job = job || {};
    return '<div class="stx5-form-grid">' + field('Role title', 'jobTitle', 'text', job.job_title || '', null, false, '', 'required') + field('Department', 'department', 'text', job.department || '') + field('Location', 'location', 'text', job.location || 'United Kingdom') + field('Working type', 'workingType', 'select', job.working_type || 'Remote', [['Remote', 'Remote'], ['Hybrid', 'Hybrid'], ['On-site', 'On-site']]) + field('Employment type', 'employmentType', 'text', job.employment_type || 'Internship') + field('Contract type', 'contractType', 'text', job.contract_type || '') + field('Compensation type', 'compensationType', 'select', job.compensation_type || 'paid_role', [['paid_role', 'Paid role'], ['paid_internship', 'Paid internship'], ['unpaid_internship', 'Unpaid internship'], ['commission_based', 'Commission based']]) + field('Positions available', 'positionsAvailable', 'number', job.positions_available || 1) + field('Status', 'status', 'select', job.status || 'draft', [['draft', 'Draft'], ['scheduled', 'Scheduled'], ['live', 'Live'], ['closed', 'Closed'], ['archived', 'Archived']]) + field('Role overview', 'roleOverview', 'textarea', job.role_overview || '', null, true) + field('Responsibilities', 'responsibilities', 'textarea', job.responsibilities || '', null, true) + field('Must haves', 'mustHaves', 'textarea', job.must_haves || '', null, true) + field('Nice to haves', 'niceToHaves', 'textarea', job.nice_to_haves || '', null, true) + field('Benefits', 'benefits', 'textarea', job.benefits || '', null, true) + '</div>';
  }

  function openJobForm(job) {
    job = job || null;
    openModal(job ? 'Edit role' : 'Add role', '<form id="stx5JobForm">' + jobFormFields(job) + message('stx5JobMessage') + '<div class="stx5-actions" style="margin-top:12px">' + button(job ? 'Save role' : 'Create role', '', 'type="submit"') + '</div></form>');
    document.getElementById('stx5JobForm').addEventListener('submit', async function (event) {
      event.preventDefault();
      var data = new FormData(event.currentTarget);
      var payload = {};
      data.forEach(function (value, key) { payload[key] = value; });
      payload.positionsAvailable = Number(payload.positionsAvailable || 1);
      try {
        if (job && job.id) await api('PATCH', '/api/stratex/jobs/' + encodeURIComponent(job.id), payload);
        else await api('POST', '/api/stratex/jobs', payload);
        showMessage('stx5JobMessage', 'Role saved. Live roles appear automatically on the public Careers page.', true);
        setTimeout(function () { closeModal(); loadHiring(); }, 450);
      } catch (error) { showMessage('stx5JobMessage', error.message, false); }
    });
  }

  function openJobApplicants(job) {
    var applications = linkedApplications(job);
    document.getElementById('stx5HiringDetail').innerHTML = hero('Role workspace', job.job_title || 'Role', 'Review the role and every linked applicant.', button('Edit role', 'secondary', 'id="stx5InlineEditJob"') + publicLink('/careers/' + encodeURIComponent(job.slug || ''), 'Open public role'), false) + card('Role details', job.department || '', detailGrid([['Department', job.department], ['Location', job.location], ['Working type', job.working_type], ['Employment', job.employment_type], ['Status', job.status], ['Positions', job.positions_available || 1], ['Applicants', applications.length], ['Closing date', date(job.closing_at)]])) + card('Applicants', applications.length + ' linked records', applications.length ? '<div class="stx5-mobile-list" style="display:block">' + applications.map(function (app, index) { return mobileRow(fullName(app), app.email || '', app.stage || 'CV sift', app.status || 'Submitted', String(index)); }).join('') + '</div>' : empty('No applicants for this role yet.'));
    document.getElementById('stx5InlineEditJob').addEventListener('click', function () { openJobForm(job); });
    document.querySelectorAll('#stx5HiringDetail [data-mobile-open]').forEach(function (node) { node.addEventListener('click', function () { openApplicant(applications[Number(node.dataset.mobileOpen)]); }); });
    document.getElementById('stx5HiringDetail').scrollIntoView({ behavior: 'smooth' });
  }

  function openApplicant(app) {
    var job = app.job_posts || {};
    var cvAction = app.job_application_files && app.job_application_files.length ? button('Open private CV', 'secondary', 'id="stx5DownloadCv"') : '';
    var decisionForm = '<form id="stx5ApplicantForm"><div class="stx5-form-grid">' + field('CV decision', 'status', 'select', app.status || 'Submitted', [['Submitted', 'Submitted'], ['Shortlist', 'Shortlist'], ['Maybe', 'Maybe'], ['Not a fit', 'Not a fit']]) + field('Recruitment stage', 'stage', 'select', app.stage || app.application_stage || 'CV sift', [['CV sift', 'CV sift'], ['First-stage interview', 'First-stage interview'], ['Final round', 'Final round'], ['Offer', 'Offer'], ['Closed', 'Closed']]) + field('Internal note', 'notes', 'textarea', app.internal_notes || '', null, true) + '</div>' + message('stx5ApplicantMessage') + '<div class="stx5-actions" style="margin-top:12px">' + button('Save candidate decision', '', 'type="submit"') + '</div></form>';
    document.getElementById('stx5HiringDetail').innerHTML = hero('Hiring workflow', fullName(app) + '.', 'Review the private application and record the direct decision.', cvAction + (app.email ? linkButton('Email candidate', 'mailto:' + app.email, '') : ''), false) + '<div class="stx5-two">' + card('Application record', job.job_title || 'Job application', detailGrid([['Email', app.email], ['Phone', app.phone], ['Role', job.job_title], ['Department', job.department], ['Submitted', date(app.submitted_at)], ['Current stage', app.stage || app.application_stage || 'CV sift'], ['Decision', app.status || 'Submitted'], ['Application ref', app.application_ref]])) + card('Decision and stage', 'Use Shortlist, Maybe or Not a fit.', decisionForm) + '</div>';
    var cv = document.getElementById('stx5DownloadCv');
    if (cv) cv.addEventListener('click', async function () { try { var data = await api('GET', '/api/stratex/job-applications/' + encodeURIComponent(app.id) + '/cv-url'); if (data.url) window.open(data.url, '_blank', 'noopener'); } catch (error) { alert(error.message); } });
    document.getElementById('stx5ApplicantForm').addEventListener('submit', async function (event) {
      event.preventDefault();
      var data = new FormData(event.currentTarget);
      try {
        await api('PATCH', '/api/stratex/job-applications/' + encodeURIComponent(app.id), { status: data.get('status'), stage: data.get('stage'), notes: data.get('notes') });
        showMessage('stx5ApplicantMessage', 'Candidate decision saved.', true);
        await loadHiring();
      } catch (error) { showMessage('stx5ApplicantMessage', error.message, false); }
    });
    document.getElementById('stx5HiringDetail').scrollIntoView({ behavior: 'smooth' });
  }

  PAGE_LOADERS.hiring = function () {
    loadHiring();
    document.getElementById('stx5AddRole').addEventListener('click', function () { openJobForm(null); });
  };

  /* Usage Requests */
  PAGE_RENDERERS.usage = function () {
    return hero('ScoutLink allowances', 'Usage Requests.', 'Approve a free uplift, send a payment link, mark payment received or decline a request with a permanent audit stamp.', button('Refresh', 'secondary', 'id="stx5RefreshUsage"'), true) +
      '<section class="stx5-metrics">' + metric('Pending', '—', 'Needs a decision', 'gold', 'stx5UsagePending') + metric('Approved', '—', 'Allowance applied', '', 'stx5UsageApproved') + metric('Payment links', '—', 'Awaiting payment', 'blue', 'stx5UsagePayment') + metric('Revenue', '—', 'Paid uplifts', 'purple', 'stx5UsageRevenue') + '</section>' +
      '<div class="stx5-two">' + card('Request queue', 'Select a request', '<div id="stx5UsageRows">' + loading() + '</div>') + card('Request decision', 'Choose a request from the queue', '<div id="stx5UsageDetail">' + empty('No request selected.') + '</div>') + '</div>';
  };

  async function loadUsage() {
    try {
      var data = await api('GET', '/api/usage-requests');
      state.data.usage = data.data || [];
      state.data.usageSummary = data.summary || {};
      renderUsage();
    } catch (error) {
      document.getElementById('stx5UsageRows').innerHTML = empty(error.message);
    }
  }

  function allowanceLabel(type) {
    return { interests: 'Pipeline interests', predictions: 'Prediction credits', exports: 'Exports' }[type] || String(type || 'Allowance').replace(/_/g, ' ');
  }

  function renderUsage() {
    var rows = state.data.usage || [];
    var summary = state.data.usageSummary || {};
    document.getElementById('stx5UsagePending').textContent = number(summary.pending);
    document.getElementById('stx5UsageApproved').textContent = number((summary.approved_free || 0) + (summary.paid_and_applied || 0));
    document.getElementById('stx5UsagePayment').textContent = number(summary.payment_link_sent);
    document.getElementById('stx5UsageRevenue').textContent = moneyPence(summary.revenuePence);
    document.getElementById('stx5UsageRows').innerHTML = '<div class="stx5-mobile-list" style="display:block">' + rows.map(function (row, index) {
      return mobileRow(allowanceLabel(row.allowance_type), row.request_code || '', number(row.quantity_requested) + ' requested · ' + date(row.created_at), String(row.status || '').replace(/_/g, ' '), String(index));
    }).join('') + '</div>';
    document.querySelectorAll('#stx5UsageRows [data-mobile-open]').forEach(function (node) { node.addEventListener('click', function () { openUsage(rows[Number(node.dataset.mobileOpen)]); }); });
    if (rows.length && !state.selected.usage) openUsage(rows[0]);
  }

  function openUsage(row) {
    state.selected.usage = row;
    var form = '<form id="stx5UsageForm"><nav class="stx5-tabs" id="stx5UsageTabs"><button class="active" type="button" data-usage-status="approved_free">Approve free</button><button type="button" data-usage-status="payment_link_sent">Send payment link</button><button type="button" data-usage-status="paid_and_applied">Mark paid</button><button type="button" data-usage-status="declined">Decline</button></nav><input type="hidden" name="status" value="approved_free"><div class="stx5-form-grid">' + field('Quantity', 'quantity', 'number', row.quantity_requested || '') + field('Amount in pounds', 'amountPounds', 'number', row.amount_pence ? Number(row.amount_pence) / 100 : '0.00') + field('Payment URL', 'paymentUrl', 'url', row.payment_url || '', null, true, 'Required when sending a payment link.') + field('Internal decision note', 'adminNote', 'textarea', row.admin_note || '', null, true) + '</div>' + message('stx5UsageMessage') + '<div class="stx5-actions" style="margin-top:12px">' + button('Save permanent decision', '', 'type="submit"') + '</div></form>';
    document.getElementById('stx5UsageDetail').innerHTML = detailGrid([['Scout team', row.organisation_name], ['Current usage', number(row.current_used) + ' of ' + number(row.current_limit)], ['Requested', row.quantity_requested], ['Urgency', row.urgency], ['Status', String(row.status || '').replace(/_/g, ' ')], ['Request code', row.request_code]]) + '<div class="stx5-note" style="margin-top:14px"><b>Reason submitted</b><p>' + esc(row.reason || 'No reason provided.') + '</p></div><div style="margin-top:14px">' + form + '</div>';
    document.querySelectorAll('[data-usage-status]').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('[data-usage-status]').forEach(function (item) { item.classList.toggle('active', item === tab); });
        document.querySelector('#stx5UsageForm [name="status"]').value = tab.dataset.usageStatus;
      });
    });
    document.getElementById('stx5UsageForm').addEventListener('submit', async function (event) {
      event.preventDefault();
      var data = new FormData(event.currentTarget);
      try {
        await api('PATCH', '/api/usage-requests/' + encodeURIComponent(row.id) + '/action', {
          status: data.get('status'), quantity: Number(data.get('quantity') || 0), amountPence: Math.round(Number(data.get('amountPounds') || 0) * 100), paymentUrl: data.get('paymentUrl'), adminNote: data.get('adminNote')
        });
        showMessage('stx5UsageMessage', 'Usage request decision saved and allowance state updated.', true);
        state.selected.usage = null;
        await loadUsage();
      } catch (error) { showMessage('stx5UsageMessage', error.message, false); }
    });
  }

  PAGE_LOADERS.usage = function () {
    loadUsage();
    document.getElementById('stx5RefreshUsage').addEventListener('click', loadUsage);
  };

  /* Trust & Concerns */
  PAGE_RENDERERS.trust = function () {
    return hero('Safeguarding and platform safety', 'Trust & Concerns.', 'Sensitive safeguarding, access, privacy and conduct reports.', button('Create internal report', '', 'id="stx5CreateConcern"'), true) +
      '<section class="stx5-metrics">' + metric('Open reports', '—', 'All types', 'red', 'stx5ConcernOpen') + metric('High severity', '—', 'Urgent review', 'red', 'stx5ConcernHigh') + metric('Assigned', '—', 'Named owners', 'blue', 'stx5ConcernAssigned') + metric('Closed', '—', 'Completed', '', 'stx5ConcernClosed') + '</section>' +
      note('Sensitive and private', 'Concern data and evidence must never be public, crawlable or available through unsigned URLs.', 'red') + card('Concern queue', 'Restricted Stratex and ScoutLink records', '<div id="stx5ConcernRows">' + loading() + '</div>') + '<div id="stx5ConcernDetail"></div>';
  };

  async function loadTrust() {
    try {
      var data = await api('GET', '/api/stratex-website/leads?limit=500');
      state.data.concerns = (data.data || []).filter(function (row) { return /concern/i.test(String(row.lead_type || row.type || '')) || row.concern_type; });
      renderConcerns();
    } catch (error) { document.getElementById('stx5ConcernRows').innerHTML = empty(error.message); }
  }

  function concernName(row) {
    var metadata = row.safe_metadata || {};
    return row.concern_type || metadata.concern_type || row.reason || 'Concern report';
  }

  function renderConcerns() {
    var rows = state.data.concerns || [];
    document.getElementById('stx5ConcernOpen').textContent = number(rows.filter(function (row) { return !/closed|resolved/i.test(String(row.status || '')); }).length);
    document.getElementById('stx5ConcernHigh').textContent = number(rows.filter(function (row) { var metadata = row.safe_metadata || {}; return /urgent|high|yes/i.test(String(row.priority || metadata.priority || metadata.immediate_risk || '')); }).length);
    document.getElementById('stx5ConcernAssigned').textContent = number(rows.filter(function (row) { var metadata = row.safe_metadata || {}; return !!(row.owner || row.assigned_to || metadata.assigned_to); }).length);
    document.getElementById('stx5ConcernClosed').textContent = number(rows.filter(function (row) { return /closed|resolved/i.test(String(row.status || '')); }).length);
    var tableRows = rows.map(function (row, index) { var metadata = row.safe_metadata || {}; return '<tr><td>' + record(concernName(row), row.full_name || row.email || 'Reporter identity permissioned', { name: concernName(row) }) + '</td><td>' + esc(row.priority || metadata.priority || 'Standard') + '</td><td>' + status(row.status || 'new') + '</td><td>' + esc(row.owner || metadata.assigned_to || 'Unassigned') + '</td><td>' + esc(date(row.created_at)) + '</td><td>' + button('Open securely', 'small', 'data-concern="' + index + '"') + '</td></tr>'; });
    var mobileRows = rows.map(function (row, index) { var metadata = row.safe_metadata || {}; return mobileRow(concernName(row), row.full_name || row.email || 'Restricted reporter', (row.priority || metadata.priority || 'Standard') + ' · ' + date(row.created_at), row.status || 'New', String(index)); });
    document.getElementById('stx5ConcernRows').innerHTML = dataTable(['Report', 'Severity', 'Status', 'Owner', 'Received', ''], tableRows, mobileRows, 'Concern queue', 'Sensitive records are permission-controlled and never public.');
    document.querySelectorAll('[data-concern]').forEach(function (node) { node.addEventListener('click', function () { openConcern(rows[Number(node.dataset.concern)]); }); });
    document.querySelectorAll('#stx5ConcernRows [data-mobile-open]').forEach(function (node) { node.addEventListener('click', function () { openConcern(rows[Number(node.dataset.mobileOpen)]); }); });
  }

  function openConcern(row) {
    var metadata = row.safe_metadata || {};
    var form = '<form id="stx5ConcernForm"><div class="stx5-form-grid">' + field('Status', 'status', 'select', row.status || 'new', [['new', 'New'], ['open', 'Open'], ['reviewing', 'Reviewing'], ['access_restricted', 'Access restricted'], ['resolved', 'Resolved'], ['closed', 'Closed']]) + field('Internal action note', 'notes', 'textarea', '', null, true) + '</div>' + message('stx5ConcernMessage') + '<div class="stx5-actions" style="margin-top:12px">' + button('Record action', '', 'type="submit"') + '</div></form>';
    document.getElementById('stx5ConcernDetail').innerHTML = hero('Restricted concern record', concernName(row) + '.', 'Review sensitive details and record the action securely.', row.email ? linkButton('Contact reporter', 'mailto:' + row.email, 'secondary') : '', false) + '<div class="stx5-two">' + card('Report details', 'Private and access-controlled', detailGrid([['Reporter', row.full_name || 'Permissioned'], ['Email', row.email], ['Phone', row.phone], ['Person / team', metadata.player_or_team || row.organisation], ['Severity', row.priority || metadata.priority || 'Standard'], ['Status', row.status], ['Received', date(row.created_at)], ['Message', row.message]])) + card('Internal handling', 'Restricted notes', form) + '</div>';
    document.getElementById('stx5ConcernForm').addEventListener('submit', async function (event) {
      event.preventDefault();
      var data = new FormData(event.currentTarget);
      try { await api('PATCH', '/api/stratex-website/leads/' + encodeURIComponent(row.id), { status: data.get('status'), notes: data.get('notes') }); showMessage('stx5ConcernMessage', 'Concern action saved.', true); await loadTrust(); }
      catch (error) { showMessage('stx5ConcernMessage', error.message, false); }
    });
    document.getElementById('stx5ConcernDetail').scrollIntoView({ behavior: 'smooth' });
  }

  function openInternalConcern() {
    openModal('Create internal concern report', '<form id="stx5InternalConcernForm"><div class="stx5-form-grid">' + field('Contact name', 'contactName', 'text', fullName(currentUser())) + field('Contact email', 'contactEmail', 'email', userEmail()) + field('Relationship', 'relationshipToConcern', 'text', 'Stratex administrator', null, true) + field('Concern type', 'concernType', 'select', 'Platform misuse', [['Safeguarding', 'Safeguarding'], ['Scout conduct', 'Scout conduct'], ['Coach conduct', 'Coach conduct'], ['Player information', 'Player information'], ['Data/privacy', 'Data/privacy'], ['Platform misuse', 'Platform misuse'], ['Other', 'Other']]) + field('Immediate risk', 'immediateRisk', 'select', 'No', [['No', 'No'], ['Yes', 'Yes']]) + field('Player, team or account', 'playerOrTeam', 'text', '', null, true) + field('Details', 'description', 'textarea', '', null, true) + '</div>' + message('stx5InternalConcernMessage') + '<div class="stx5-actions" style="margin-top:12px">' + button('Submit internal report', '', 'type="submit"') + '</div></form>');
    document.getElementById('stx5InternalConcernForm').addEventListener('submit', async function (event) {
      event.preventDefault();
      var data = new FormData(event.currentTarget); var payload = {};
      data.forEach(function (value, key) { payload[key] = value; });
      payload.consentContact = true; payload.consentText = 'Internal Stratex concern report created by an authorised administrator.'; payload.sourcePage = '/admin/trust-concerns';
      try { await api('POST', '/api/stratex-website/concern', payload); showMessage('stx5InternalConcernMessage', 'Internal concern report saved.', true); setTimeout(function () { closeModal(); loadTrust(); }, 450); }
      catch (error) { showMessage('stx5InternalConcernMessage', error.message, false); }
    });
  }

  PAGE_LOADERS.trust = function () {
    loadTrust();
    document.getElementById('stx5CreateConcern').addEventListener('click', openInternalConcern);
  };

  /* Showcase publishing */
  PAGE_RENDERERS.showcase = function () {
    return hero('Event operations', 'Showcase Event.', 'Create events, review player and professional applications, and control the public Showcase page from one workspace.', publicLink('/showcase-event', 'Open public page') + button('Create showcase event', '', 'id="stx5CreateShowcase"'), true) +
      '<section class="stx5-metrics">' + metric('Events', '—', 'All event records', '', 'stx5ShowcaseEvents') + metric('Public events', '—', 'Visible on the website', 'blue', 'stx5ShowcasePublic') + metric('Player applications', '—', 'Across events', 'gold', 'stx5ShowcasePlayers') + metric('Professional places', '—', 'Registered coaches and scouts', 'purple', 'stx5ShowcasePros') + '</section>' +
      card('Showcase events', 'Publishing an event updates the public page. Featuring it also controls the live registration pages.', '<div id="stx5ShowcaseRows">' + loading() + '</div>') + '<div id="stx5ShowcaseDetail"></div>';
  };

  async function loadShowcase() {
    try {
      var data = await api('GET', '/api/stratex-publishing/admin/showcase-events');
      state.data.showcase = data.data || [];
      state.data.showcaseSummary = data.summary || {};
      renderShowcase();
      var params = new URLSearchParams(window.location.search);
      var id = params.get('event');
      if (id) openShowcaseById(id, params);
    } catch (error) { document.getElementById('stx5ShowcaseRows').innerHTML = empty(error.message); }
  }

  function renderShowcase() {
    var rows = state.data.showcase || [];
    var summary = state.data.showcaseSummary || {};
    document.getElementById('stx5ShowcaseEvents').textContent = number(rows.length);
    document.getElementById('stx5ShowcasePublic').textContent = number(rows.filter(function (row) { return row.public_visible; }).length);
    document.getElementById('stx5ShowcasePlayers').textContent = number(summary.playerRegistrations);
    document.getElementById('stx5ShowcasePros').textContent = number(summary.professionalRegistrations);
    document.getElementById('stx5ShowcaseRows').innerHTML = '<section class="stx5-event-grid">' + rows.map(function (row, index) {
      var eventDate = new Date(row.event_date || Date.now());
      return '<article class="stx5-event-card ' + (row.featured ? 'featured' : '') + '"><header><span class="stx5-event-date"><b>' + eventDate.toLocaleDateString('en-GB', { day: '2-digit' }) + '</b><span>' + eventDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }).toUpperCase() + '</span></span><div>' + status(row.featured ? 'Featured public event' : row.status || 'draft') + '<h3>' + esc(row.event_name || 'Showcase event') + '</h3><p>' + esc(row.venue_name || 'Venue not set') + '</p></div></header><div class="stx5-event-facts"><div><small>Players</small><b>' + number(row.player_count) + '</b><span>Applications</span></div><div><small>Professionals</small><b>' + number(row.professional_count) + '</b><span>Registered</span></div><div><small>Capacity</small><b>' + number(row.professional_capacity || row.max_scouts || 30) + '</b><span>Places</span></div></div><footer>' + button('Manage event', '', 'data-showcase="' + index + '"') + (row.public_visible ? publicLink('/showcase-event#event-' + encodeURIComponent(row.slug || row.id), 'Public page') : '') + '</footer></article>';
    }).join('') + '</section>';
    document.querySelectorAll('[data-showcase]').forEach(function (node) { node.addEventListener('click', function () { openShowcase(rows[Number(node.dataset.showcase)]); }); });
  }

  function showcaseFields(row) {
    row = row || {};
    return '<div class="stx5-form-grid">' + field('Event name', 'eventName', 'text', row.event_name || '', null, true, '', 'required') + field('Public slug', 'slug', 'text', row.slug || slugify(row.event_name || ''), null, false, 'Used on the public page.') + field('Status', 'status', 'select', row.status || 'draft', [['draft', 'Draft'], ['published', 'Published'], ['confirmed', 'Confirmed'], ['completed', 'Completed'], ['cancelled', 'Cancelled']]) + field('Event date', 'eventDate', 'date', dateInput(row.event_date)) + field('Player arrival time', 'playerArrivalTime', 'time', String(row.player_arrival_time || '12:00').slice(0, 5)) + field('Coach / Scout arrival time', 'professionalArrivalTime', 'time', String(row.professional_arrival_time || '12:30').slice(0, 5)) + field('Venue name', 'venueName', 'text', row.venue_name || '') + field('Venue address', 'venueAddress', 'text', row.venue_address || '') + field('Player minimum age', 'playerMinAge', 'number', row.player_min_age || 12) + field('Player maximum age', 'playerMaxAge', 'number', row.player_max_age || 16) + field('Professional capacity', 'professionalCapacity', 'number', row.professional_capacity || row.max_scouts || 30) + field('Hero image URL', 'heroImageUrl', 'url', row.hero_image_url || '', null, true) + field('Public summary', 'summary', 'textarea', row.summary || row.description || '', null, true) + field('Full description', 'description', 'textarea', row.description || '', null, true) + field('Public visibility', 'publicVisible', 'select', row.public_visible ? 'true' : 'false', [['false', 'Private / draft only'], ['true', 'Show on public page']]) + field('Featured registration event', 'featured', 'select', row.featured ? 'true' : 'false', [['false', 'No'], ['true', 'Yes — controls public registration pages']]) + field('Player registration', 'playerRegistrationOpen', 'select', row.player_registration_open === false ? 'false' : 'true', [['true', 'Open'], ['false', 'Closed']]) + field('Coach / Scout registration', 'professionalRegistrationOpen', 'select', row.professional_registration_open === false ? 'false' : 'true', [['true', 'Open'], ['false', 'Closed']]) + '</div>';
  }

  function openShowcaseForm(row) {
    openModal(row ? 'Edit showcase event' : 'Create Showcase Event', '<form id="stx5ShowcaseForm">' + showcaseFields(row) + message('stx5ShowcaseMessage') + '<div class="stx5-actions" style="margin-top:12px">' + button(row ? 'Save event changes' : 'Create event and link public registration', '', 'type="submit"') + '</div></form>');
    var title = document.querySelector('#stx5ShowcaseForm [name="eventName"]');
    var slugNode = document.querySelector('#stx5ShowcaseForm [name="slug"]');
    title.addEventListener('input', function () { if (!row && !slugNode.dataset.edited) slugNode.value = slugify(title.value); });
    slugNode.addEventListener('input', function () { slugNode.dataset.edited = '1'; });
    document.getElementById('stx5ShowcaseForm').addEventListener('submit', async function (event) {
      event.preventDefault(); var data = new FormData(event.currentTarget); var payload = {};
      data.forEach(function (value, key) { payload[key] = value; });
      ['playerMinAge', 'playerMaxAge', 'professionalCapacity'].forEach(function (key) { payload[key] = Number(payload[key] || 0); });
      ['publicVisible', 'featured', 'playerRegistrationOpen', 'professionalRegistrationOpen'].forEach(function (key) { payload[key] = payload[key] === 'true'; });
      try {
        var result = row ? await api('PATCH', '/api/stratex-publishing/admin/showcase-events/' + encodeURIComponent(row.id), payload) : await api('POST', '/api/stratex-publishing/admin/showcase-events', payload);
        showMessage('stx5ShowcaseMessage', result.message || (payload.publicVisible ? 'Event saved and public Showcase page updated.' : 'Event saved privately.'), true);
        setTimeout(function () { closeModal(); loadShowcase(); }, 500);
      } catch (error) { showMessage('stx5ShowcaseMessage', error.message, false); }
    });
  }

  async function openShowcase(row, params) {
    var root = document.getElementById('stx5ShowcaseDetail');
    root.innerHTML = loading();
    try {
      var data = await api('GET', '/api/stratex-publishing/admin/showcase-events/' + encodeURIComponent(row.id));
      var eventRecord = data.event || row;
      state.selected.showcase = eventRecord;
      var actions = publicLink('/showcase-event#event-' + encodeURIComponent(eventRecord.slug || eventRecord.id), 'Open public event page') + button('Edit event', 'secondary', 'id="stx5EditShowcase"') + button(eventRecord.featured ? 'Republish registration config' : 'Feature and publish', '', 'id="stx5PublishShowcase"');
      root.innerHTML = hero('Public event control', eventRecord.event_name + '.', 'Every public event link, player application and coach/scout registration is controlled from this record.', actions, false) +
        '<section class="stx5-metrics">' + metric('Players', number(data.counts && data.counts.players), 'Applications') + metric('Professionals', number(data.counts && data.counts.professionals), 'Coach and Scout places', 'blue') + metric('Waitlist', number(data.counts && data.counts.waitlist), 'When capacity is reached', 'gold') + metric('Capacity remaining', number(data.counts && data.counts.remaining), 'Professional places', 'purple') + '</section>' +
        '<nav class="stx5-tabs"><button class="active" type="button" data-event-view="overview">Overview</button><button type="button" data-event-view="players">Player applications</button><button type="button" data-event-view="professionals">Coaches and scouts</button></nav><div id="stx5ShowcaseView">' + showcaseOverview(eventRecord, data) + '</div>';
      document.getElementById('stx5EditShowcase').addEventListener('click', function () { openShowcaseForm(eventRecord); });
      document.getElementById('stx5PublishShowcase').addEventListener('click', async function () {
        if (!confirm('Publish this event and use it as the live public registration event?')) return;
        try { await api('POST', '/api/stratex-publishing/admin/showcase-events/' + encodeURIComponent(eventRecord.id) + '/publish', {}); await loadShowcase(); }
        catch (error) { alert(error.message); }
      });
      document.querySelectorAll('[data-event-view]').forEach(function (tab) {
        tab.addEventListener('click', function () {
          document.querySelectorAll('[data-event-view]').forEach(function (item) { item.classList.toggle('active', item === tab); });
          if (tab.dataset.eventView === 'overview') document.getElementById('stx5ShowcaseView').innerHTML = showcaseOverview(eventRecord, data);
          if (tab.dataset.eventView === 'players') loadShowcasePlayers(eventRecord.id);
          if (tab.dataset.eventView === 'professionals') loadShowcaseProfessionals(eventRecord.id);
        });
      });
      var requestedView = params && params.get('view');
      if (requestedView === 'players') document.querySelector('[data-event-view="players"]').click();
      if (requestedView === 'professionals') document.querySelector('[data-event-view="professionals"]').click();
      root.scrollIntoView({ behavior: 'smooth' });
    } catch (error) { root.innerHTML = empty(error.message); }
  }

  function showcaseOverview(row, data) {
    return '<div class="stx5-two" style="margin-top:15px">' + card('Event details', row.status || 'draft', detailGrid([['Public slug', row.slug], ['Date', date(row.event_date)], ['Player arrival', row.player_arrival_time], ['Professional arrival', row.professional_arrival_time], ['Venue', row.venue_name], ['Address', row.venue_address], ['Player ages', row.player_min_age + '–' + row.player_max_age], ['Capacity', row.professional_capacity], ['Public visibility', row.public_visible ? 'Public' : 'Private'], ['Featured', row.featured ? 'Yes' : 'No'], ['Player registration', row.player_registration_open ? 'Open' : 'Closed'], ['Professional registration', row.professional_registration_open ? 'Open' : 'Closed']])) + card('Public links', 'These routes read the featured event configuration.', '<div class="stx5-actions">' + publicLink('/showcase-event#event-' + encodeURIComponent(row.slug || row.id), 'Public event') + publicLink('/showcase-event/player-registration', 'Player registration') + publicLink('/showcase-event/coach-scout-registration', 'Coach / Scout registration') + '</div>' + note('Publishing rule', row.featured ? 'This event currently controls the public registration pages.' : 'Set Featured and publish to make this the live registration event.')) + '</div>';
  }

  async function loadShowcasePlayers(eventId) {
    var root = document.getElementById('stx5ShowcaseView'); root.innerHTML = loading();
    try {
      var data = await api('GET', '/api/stratex-publishing/admin/showcase-events/' + encodeURIComponent(eventId) + '/players');
      var rows = data.data || [];
      var tableRows = rows.map(function (row, index) { return '<tr><td>' + record(fullName(row), row.registration_reference || '', row) + '</td><td>' + esc(row.age_on_event_date) + '</td><td>' + esc((row.positions || []).join(', ')) + '</td><td>' + esc(row.team_name || 'No team') + '</td><td>' + status(row.selected_for_showcase ? 'Selected' : row.status || 'new') + '</td><td>' + button('Open', 'small', 'data-player="' + index + '"') + '</td></tr>'; });
      var mobileRows = rows.map(function (row, index) { return mobileRow(fullName(row), 'Age ' + row.age_on_event_date + ' · ' + (row.positions || []).join(', '), row.team_name || 'No team', row.selected_for_showcase ? 'Selected' : row.status || 'New', String(index)); });
      root.innerHTML = '<div style="margin-top:15px">' + dataTable(['Player', 'Age', 'Positions', 'Team', 'Status', ''], tableRows, mobileRows, 'Player applications', 'Highlight video and private contact details remain restricted.') + '</div><div id="stx5ShowcasePlayerDetail"></div>';
      document.querySelectorAll('[data-player]').forEach(function (node) { node.addEventListener('click', function () { openShowcasePlayer(eventId, rows[Number(node.dataset.player)]); }); });
      document.querySelectorAll('#stx5ShowcaseView [data-mobile-open]').forEach(function (node) { node.addEventListener('click', function () { openShowcasePlayer(eventId, rows[Number(node.dataset.mobileOpen)]); }); });
    } catch (error) { root.innerHTML = empty(error.message); }
  }

  function openShowcasePlayer(eventId, row) {
    var contact = row.contact_type === 'guardian' ? row.guardian_email : row.player_email;
    var form = '<form id="stx5PlayerReviewForm"><div class="stx5-form-grid">' + field('Status', 'status', 'select', row.status || 'new', [['new', 'New'], ['contacted', 'Contacted'], ['reviewing', 'Reviewing'], ['selected', 'Selected'], ['not_selected', 'Not selected']]) + field('Selected for showcase', 'selected', 'select', row.selected_for_showcase ? 'true' : 'false', [['false', 'No'], ['true', 'Yes']]) + field('Internal notes', 'notes', 'textarea', row.internal_notes || '', null, true) + '</div>' + message('stx5PlayerReviewMessage') + '<div class="stx5-actions" style="margin-top:12px">' + button('Save player review', '', 'type="submit"') + '</div></form>';
    document.getElementById('stx5ShowcasePlayerDetail').innerHTML = card(fullName(row), row.registration_reference || 'Player application', detailGrid([['Age', row.age_on_event_date], ['Date of birth', date(row.date_of_birth)], ['Contact type', row.contact_type], ['Email', contact], ['Phone', row.contact_type === 'guardian' ? row.guardian_phone : row.player_phone], ['Team', row.team_name], ['Coach', row.coach_name], ['Positions', (row.positions || []).join(', ')], ['Preferred foot', row.preferred_foot], ['Goalkeeper', row.can_play_goalkeeper ? 'Yes' : 'No'], ['Highlight video', row.highlight_file_name || 'Not supplied'], ['Submitted', date(row.submitted_at)]]) + '<div style="margin-top:15px">' + form + '</div>');
    document.getElementById('stx5PlayerReviewForm').addEventListener('submit', async function (event) {
      event.preventDefault(); var data = new FormData(event.currentTarget);
      try { await api('PATCH', '/api/stratex-publishing/admin/showcase-events/' + encodeURIComponent(eventId) + '/players/' + encodeURIComponent(row.id), { status: data.get('status'), selected: data.get('selected') === 'true', internalNotes: data.get('notes') }); showMessage('stx5PlayerReviewMessage', 'Player review saved.', true); }
      catch (error) { showMessage('stx5PlayerReviewMessage', error.message, false); }
    });
  }

  async function loadShowcaseProfessionals(eventId) {
    var root = document.getElementById('stx5ShowcaseView'); root.innerHTML = loading();
    try {
      var data = await api('GET', '/api/stratex-publishing/admin/showcase-events/' + encodeURIComponent(eventId) + '/professionals');
      var rows = (data.registered || []).concat((data.waitlist || []).map(function (row) { return Object.assign({}, row, { waitlisted: true }); }));
      var tableRows = rows.map(function (row, index) { return '<tr><td>' + record(fullName(row), row.email || '', row) + '</td><td>' + esc(row.team_name) + '</td><td>' + esc(row.role) + '</td><td>' + status(row.waitlisted ? 'Waitlist' : row.status || 'registered') + '</td><td>' + esc(date(row.submitted_at)) + '</td><td>' + button('Open', 'small', 'data-professional="' + index + '"') + '</td></tr>'; });
      var mobileRows = rows.map(function (row, index) { return mobileRow(fullName(row), row.role + ' · ' + row.team_name, row.email || '', row.waitlisted ? 'Waitlist' : row.status || 'Registered', String(index)); });
      root.innerHTML = '<div style="margin-top:15px">' + dataTable(['Professional', 'Organisation', 'Role', 'Status', 'Submitted', ''], tableRows, mobileRows, 'Coach and Scout applications', 'Professional applications are linked into the central CRM automatically.') + '</div><div id="stx5ShowcaseProfessionalDetail"></div>';
      document.querySelectorAll('[data-professional]').forEach(function (node) { node.addEventListener('click', function () { openShowcaseProfessional(eventId, rows[Number(node.dataset.professional)]); }); });
      document.querySelectorAll('#stx5ShowcaseView [data-mobile-open]').forEach(function (node) { node.addEventListener('click', function () { openShowcaseProfessional(eventId, rows[Number(node.dataset.mobileOpen)]); }); });
    } catch (error) { root.innerHTML = empty(error.message); }
  }

  function openShowcaseProfessional(eventId, row) {
    var form = '<form id="stx5ProfessionalReviewForm"><div class="stx5-form-grid">' + field('Status', 'status', 'select', row.status || (row.waitlisted ? 'waiting' : 'registered'), [['registered', 'Registered'], ['contacted', 'Contacted'], ['confirmed', 'Confirmed'], ['declined', 'Declined'], ['waiting', 'Waiting']]) + field('Internal notes', 'notes', 'textarea', row.internal_notes || '', null, true) + '</div>' + message('stx5ProfessionalReviewMessage') + '<div class="stx5-actions" style="margin-top:12px">' + button('Save professional review', '', 'type="submit"') + '</div></form>';
    document.getElementById('stx5ShowcaseProfessionalDetail').innerHTML = card(fullName(row), (row.role || 'Professional') + ' · ' + (row.team_name || ''), detailGrid([['Email', row.email], ['Phone', row.phone], ['Organisation', row.team_name], ['Role', row.role], ['Status', row.waitlisted ? 'Waitlist' : row.status], ['Reference', row.registration_reference], ['Submitted', date(row.submitted_at)], ['CRM link', 'Automatic']]) + '<div style="margin-top:15px">' + form + '</div>');
    document.getElementById('stx5ProfessionalReviewForm').addEventListener('submit', async function (event) {
      event.preventDefault(); var data = new FormData(event.currentTarget);
      try { await api('PATCH', '/api/stratex-publishing/admin/showcase-events/' + encodeURIComponent(eventId) + '/professionals/' + encodeURIComponent(row.id), { status: data.get('status'), internalNotes: data.get('notes'), waitlisted: !!row.waitlisted }); showMessage('stx5ProfessionalReviewMessage', 'Professional review saved.', true); }
      catch (error) { showMessage('stx5ProfessionalReviewMessage', error.message, false); }
    });
  }

  function openShowcaseById(id, params) {
    var row = (state.data.showcase || []).find(function (item) { return String(item.id) === String(id) || String(item.slug) === String(id); });
    if (row) openShowcase(row, params);
  }

  PAGE_LOADERS.showcase = function () {
    loadShowcase();
    document.getElementById('stx5CreateShowcase').addEventListener('click', function () { openShowcaseForm(null); });
  };

  /* Award ceremonies */
  PAGE_RENDERERS.awards = function () {
    return hero('Recognition events', 'Award Ceremonies.', 'Plan ceremonies, categories and public event information from one place.', publicLink('/award-ceremonies', 'Open public page') + button('Create award ceremony', '', 'id="stx5CreateAward"'), true) +
      card('Award ceremonies', 'Published ceremonies appear automatically on the public page.', '<div id="stx5AwardRows">' + loading() + '</div>') + '<div id="stx5AwardDetail"></div>';
  };

  async function loadAwards() {
    try {
      var data = await api('GET', '/api/stratex-publishing/admin/award-ceremonies');
      state.data.awards = data.data || [];
      renderAwards();
    } catch (error) { document.getElementById('stx5AwardRows').innerHTML = empty(error.message); }
  }

  function renderAwards() {
    var rows = state.data.awards || [];
    var tableRows = rows.map(function (row, index) { return '<tr><td>' + record(row.name || 'Award ceremony', row.description || '', { name: row.name }, row.hero_image_url) + '</td><td>' + esc(date(row.event_date)) + '</td><td>' + esc(row.location || '—') + '</td><td>' + status(row.status || 'planning') + '</td><td>' + number(Array.isArray(row.categories) ? row.categories.length : 0) + '</td><td>' + button('Edit', 'small', 'data-award="' + index + '"') + '</td></tr>'; });
    var mobileRows = rows.map(function (row, index) { return mobileRow(row.name || 'Award ceremony', (row.location || 'Location pending') + ' · ' + date(row.event_date), (Array.isArray(row.categories) ? row.categories.length : 0) + ' categories', row.public_visible ? 'Public' : row.status || 'Planning', String(index), row.hero_image_url); });
    document.getElementById('stx5AwardRows').innerHTML = dataTable(['Ceremony', 'Date', 'Location', 'Status', 'Categories', ''], tableRows, mobileRows, 'Award ceremonies', 'Public visibility and status control the public Awards page.');
    document.querySelectorAll('[data-award]').forEach(function (node) { node.addEventListener('click', function () { openAwardForm(rows[Number(node.dataset.award)]); }); });
    document.querySelectorAll('#stx5AwardRows [data-mobile-open]').forEach(function (node) { node.addEventListener('click', function () { openAwardForm(rows[Number(node.dataset.mobileOpen)]); }); });
  }

  function awardFields(row) {
    row = row || {};
    return '<div class="stx5-form-grid">' + field('Ceremony name', 'name', 'text', row.name || '', null, true, '', 'required') + field('Public slug', 'slug', 'text', row.slug || slugify(row.name || '')) + field('Status', 'status', 'select', row.status || 'planning', [['planning', 'Planning'], ['published', 'Published'], ['completed', 'Completed'], ['cancelled', 'Cancelled']]) + field('Date and time', 'eventDate', 'datetime-local', dateInput(row.event_date, true)) + field('Location', 'location', 'text', row.location || '') + field('Hero image URL', 'heroImageUrl', 'url', row.hero_image_url || '') + field('Categories', 'categories', 'textarea', Array.isArray(row.categories) ? row.categories.join('\n') : (row.categories || ''), null, true, 'One category per line.') + field('Notification audience', 'audience', 'textarea', Array.isArray(row.audience) ? row.audience.join('\n') : (row.audience || 'Coaches\nScouts\nPlayers'), null, true) + field('Description', 'description', 'textarea', row.description || '', null, true) + field('Public visibility', 'publicVisible', 'select', row.public_visible ? 'true' : 'false', [['false', 'Private / planning only'], ['true', 'Show on public page']]) + '</div>';
  }

  function openAwardForm(row) {
    openModal(row ? 'Edit award ceremony' : 'Create award ceremony', '<form id="stx5AwardForm">' + awardFields(row) + message('stx5AwardMessage') + '<div class="stx5-actions" style="margin-top:12px">' + button(row ? 'Save ceremony' : 'Create ceremony', '', 'type="submit"') + '</div></form>');
    document.getElementById('stx5AwardForm').addEventListener('submit', async function (event) {
      event.preventDefault(); var data = new FormData(event.currentTarget);
      var payload = {
        name: data.get('name'), slug: data.get('slug') || slugify(data.get('name')), status: data.get('status'), eventDate: data.get('eventDate'), location: data.get('location'), heroImageUrl: data.get('heroImageUrl'), categories: String(data.get('categories') || '').split(/\n/).map(function (value) { return value.trim(); }).filter(Boolean), audience: String(data.get('audience') || '').split(/\n/).map(function (value) { return value.trim(); }).filter(Boolean), description: data.get('description'), publicVisible: data.get('publicVisible') === 'true'
      };
      try {
        if (row) await api('PATCH', '/api/stratex-publishing/admin/award-ceremonies/' + encodeURIComponent(row.id), payload);
        else await api('POST', '/api/stratex-publishing/admin/award-ceremonies', payload);
        showMessage('stx5AwardMessage', payload.publicVisible ? 'Ceremony saved and public Awards page updated.' : 'Ceremony saved privately.', true);
        setTimeout(function () { closeModal(); loadAwards(); }, 450);
      } catch (error) { showMessage('stx5AwardMessage', error.message, false); }
    });
  }

  PAGE_LOADERS.awards = function () {
    loadAwards();
    document.getElementById('stx5CreateAward').addEventListener('click', function () { openAwardForm(null); });
  };

  /* Company settings */
  PAGE_RENDERERS.settings = function () {
    return hero('Company control', 'Settings.', 'Stratex company and public-site settings only. ScoutLink product settings remain separate.', button('Save settings', '', 'id="stx5SaveSettings"'), true) +
      '<div class="stx5-two">' +
      card('Company profile', '', '<div class="stx5-form-grid">' + field('Company name', 'companyName', 'text', 'Stratex Analytics Limited', null, true) + field('Primary email', 'primaryEmail', 'email', 'info@stratexanalytics.co.uk', null, true) + field('Country', 'country', 'text', 'United Kingdom') + field('Website', 'website', 'url', 'https://www.stratexanalytics.co.uk') + '</div>') +
      card('Public website publishing', '', toggle('Public website enabled', 'Serve production pages.', true, 'publicWebsiteEnabled') + toggle('Automatic sitemap updates', 'Include published pages and posts.', true, 'automaticSitemap') + toggle('Global favicon enabled', 'Use the Stratex favicon on every route.', true, 'globalFavicon')) +
      card('Content publishing', '', toggle('Require article featured image', 'Required before publication.', true, 'requireArticleImage') + toggle('Generate canonical URLs', 'Use approved public slugs.', true, 'canonicalUrls') + toggle('Noindex drafts and archives', 'Keep unpublished content out of search.', true, 'noindexDrafts')) +
      card('Event publishing', '', toggle('Show published Showcase events', 'Display public event cards.', true, 'showShowcaseEvents') + toggle('Show published Award ceremonies', 'Display public ceremony cards.', true, 'showAwardCeremonies') + toggle('One featured registration event', 'Featured event controls registration pages.', true, 'singleFeaturedEvent')) +
      card('Admin access', button('Change password', 'secondary small', 'id="stx5SettingsPassword"'), toggle('Separate Stratex authentication', 'Do not reuse ScoutLink credentials.', true, 'separateAuth') + toggle('Login-code invitations', 'Use for new staff.', true, 'loginCodes') + toggle('Richdhin-only permissions', 'Only the Super Admin edits access.', true, 'richdhinOnly')) +
      card('Privacy and audit', '', toggle('Private applicant files', 'Signed or authenticated access.', true, 'privateApplicants') + toggle('Private concern files', 'Never public.', true, 'privateConcerns') + toggle('Audit sensitive actions', 'Record access and edits.', true, 'auditActions')) +
      '</div>' + message('stx5SettingsMessage');
  };

  async function loadSettings() {
    try {
      var data = await api('GET', '/api/stratex-publishing/admin/settings');
      state.data.settings = data.data || {};
      var fields = state.data.settings.fields || {};
      var toggles = state.data.settings.toggles || {};
      document.querySelectorAll('.stx5-field [name]').forEach(function (node) { if (Object.prototype.hasOwnProperty.call(fields, node.name)) node.value = fields[node.name]; });
      document.querySelectorAll('[data-toggle]').forEach(function (node) { if (Object.prototype.hasOwnProperty.call(toggles, node.dataset.toggle)) { var enabled = !!toggles[node.dataset.toggle]; node.classList.toggle('on', enabled); node.setAttribute('aria-pressed', String(enabled)); } });
    } catch (_) {}
    document.getElementById('stx5SaveSettings').addEventListener('click', async function () {
      var fields = {}; var toggles = {};
      document.querySelectorAll('.stx5-field [name]').forEach(function (node) { fields[node.name] = node.value; });
      document.querySelectorAll('[data-toggle]').forEach(function (node) { toggles[node.dataset.toggle] = node.classList.contains('on'); });
      try { await api('PATCH', '/api/stratex-publishing/admin/settings', { fields: fields, toggles: toggles }); showMessage('stx5SettingsMessage', 'Company and public-site settings saved.', true); }
      catch (error) { showMessage('stx5SettingsMessage', error.message, false); }
    });
    document.getElementById('stx5SettingsPassword').addEventListener('click', openPasswordModal);
  }

  PAGE_LOADERS.settings = loadSettings;

  /* Start */
  function start() {
    if (cleanPath() === '/admin/login') {
      if (loggedIn() && !new URLSearchParams(window.location.search).has('logout')) {
        window.location.replace('/admin');
        return;
      }
      renderLogin();
      return;
    }
    if (!loggedIn()) {
      window.location.replace('/admin/login?return=' + encodeURIComponent(window.location.pathname + window.location.search));
      return;
    }
    renderShell();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}());
