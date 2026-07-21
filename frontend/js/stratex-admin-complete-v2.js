'use strict';

(function () {
  var RICHDHIN_EMAIL = 'richdhin@stratexanalytics.co.uk';
  var exactStarted = false;
  var loginStarted = false;
  var observer = null;
  var detailObserver = null;
  var dashboardLoaded = false;
  var permissionsState = {
    admins: [],
    selectedId: '',
    matrix: {}
  };

  var BOARD_ROUTES = {
    dashboard: '/admin',
    registrations: '/admin/registrations',
    contactForms: '/admin/contact-forms',
    crm: '/admin/crm',
    activity: '/admin/website-activity',
    blog: '/admin/blog',
    leadership: '/admin/leadership',
    org: '/admin/org-charts',
    adminUsers: '/admin/users/add',
    permissions: '/admin/permissions',
    profile: '/admin/my-profile',
    contracts: '/admin/contracts-pay',
    hiring: '/admin/hiring',
    concerns: '/admin/trust-concerns',
    settings: '/admin/settings',
    showcase: '/admin/showcase-event',
    awards: '/admin/award-ceremonies'
  };

  var BOARD_NAMES = {
    dashboard: 'Dashboard',
    registrations: 'Registrations',
    contactForms: 'Contact Forms',
    crm: 'CRM',
    activity: 'Website Activity',
    blog: 'Blog / Learning Centre',
    leadership: 'Leadership',
    org: 'Org Charts',
    adminUsers: 'Add Stratex User',
    permissions: 'Permissions',
    profile: 'My Profile',
    contracts: 'Contracts & Pay',
    hiring: 'Hiring',
    concerns: 'Trust & Concerns',
    settings: 'Settings',
    showcase: 'Showcase Event',
    awards: 'Award Ceremonies'
  };

  var BOARD_GROUPS = [
    ['Overview', ['dashboard']],
    ['Operations', ['registrations', 'contactForms', 'crm']],
    ['Analytics', ['activity']],
    ['Content', ['blog', 'leadership']],
    ['People', ['org', 'adminUsers', 'permissions', 'profile', 'contracts', 'hiring']],
    ['Trust', ['concerns']],
    ['Events', ['showcase', 'awards']],
    ['Company', ['settings']]
  ];

  var BOARD_CODES = {
    dashboard: 'DB',
    registrations: 'RG',
    contactForms: 'CF',
    crm: 'CR',
    activity: 'WA',
    blog: 'BL',
    leadership: 'LD',
    org: 'OC',
    adminUsers: 'AU',
    permissions: 'PM',
    profile: 'MP',
    contracts: 'CP',
    hiring: 'HR',
    concerns: 'TC',
    showcase: 'SE',
    awards: 'AC',
    settings: 'ST'
  };

  var PERMISSION_AREAS = [
    ['dashboard', 'Dashboard'],
    ['registrations', 'Registrations'],
    ['contact_forms', 'Contact Forms'],
    ['crm', 'CRM'],
    ['website_activity', 'Website Activity'],
    ['content', 'Blog / Learning Centre'],
    ['leadership', 'Leadership'],
    ['org', 'Org Charts'],
    ['contracts', 'Contracts & Pay'],
    ['hiring', 'Hiring'],
    ['trust', 'Trust & Concerns'],
    ['settings', 'Settings'],
    ['showcase', 'Showcase Event'],
    ['awards', 'Award Ceremonies']
  ];

  var PERMISSION_ACTIONS = ['view', 'create', 'edit', 'delete'];

  function authStore() {
    try {
      return typeof Auth !== 'undefined' ? Auth : null;
    } catch (_) {
      return null;
    }
  }

  function authUser() {
    var auth = authStore();
    return auth && auth.user ? auth.user : {};
  }

  function authToken() {
    var auth = authStore();
    if (auth && auth.token) return auth.token;
    try {
      return localStorage.getItem('sl_token') || '';
    } catch (_) {
      return '';
    }
  }

  function apiBase() {
    try {
      return typeof API !== 'undefined'
        ? API
        : 'https://scoutlink-api.vercel.app';
    } catch (_) {
      return 'https://scoutlink-api.vercel.app';
    }
  }

  function currentEmail() {
    return String(authUser().email || '').trim().toLowerCase();
  }

  function isRichdhin() {
    return currentEmail() === RICHDHIN_EMAIL;
  }

  function currentName() {
    var user = authUser();
    return [
      user.firstName || user.first_name,
      user.lastName || user.last_name
    ].filter(Boolean).join(' ') ||
      user.email ||
      'Stratex Admin';
  }

  function initials() {
    return currentName()
      .split(/\s+/)
      .map(function (part) { return part.charAt(0); })
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'SA';
  }

  function currentRoleLabel() {
    var user = authUser();
    var raw = String(
      user.adminRole ||
      user.admin_role ||
      user.role ||
      ''
    ).trim();

    if (isRichdhin()) return 'Founder & Super Admin';

    if (/super\s*admin|founder/i.test(raw)) {
      return 'Management';
    }

    return raw || 'Employee';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDate(value) {
    if (!value) return '—';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  function pathNow() {
    return (window.location.pathname || '/admin')
      .replace(/\/+$/, '') || '/admin';
  }

  function moduleFromPath() {
    var path = pathNow();
    var found = Object.keys(BOARD_ROUTES).find(function (key) {
      return BOARD_ROUTES[key] === path;
    });
    return found || 'dashboard';
  }

  function saveSession(data) {
    if (!data || !data.token || !data.user) {
      throw new Error('The Stratex sign-in response was incomplete.');
    }

    if ((data.accountType || 'Stratex') !== 'Stratex') {
      throw new Error('Use a Stratex Admin account for this area.');
    }

    var auth = authStore();
    if (auth && typeof auth.set === 'function') {
      auth.set(data.token, data.user, 'Stratex');
      return;
    }

    localStorage.setItem('sl_token', data.token);
    localStorage.setItem('sl_user', JSON.stringify(data.user));
    localStorage.setItem('sl_type', 'Stratex');
    if (data.user.id) localStorage.setItem('sl_user_id', data.user.id);
    if (data.user.email) localStorage.setItem('sl_user_email', data.user.email);
  }

  async function api(method, path, body) {
    var options = {
      method: method,
      headers: {
        Authorization: 'Bearer ' + authToken()
      }
    };

    if (body !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    var response = await fetch(apiBase() + path, options);
    var data = await response.json().catch(function () { return {}; });

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        'The request could not be completed.'
      );
    }

    return data;
  }

  function status(text, colour) {
    return '<span class="stx-board-status ' +
      escapeHtml(colour || '') +
      '">' + escapeHtml(text || '—') + '</span>';
  }

  function boardButton(text, colour, attrs) {
    return '<button class="stx-board-btn ' +
      escapeHtml(colour || '') +
      '" type="button" ' +
      (attrs || '') +
      '>' + escapeHtml(text) + '</button>';
  }

  function metric(label, value, note, colour, id) {
    return '<article class="stx-board-metric ' +
      escapeHtml(colour || '') +
      '">' +
      '<small>' + escapeHtml(label) + '</small>' +
      '<b' + (id ? ' id="' + escapeHtml(id) + '"' : '') + '>' +
        escapeHtml(value) +
      '</b>' +
      '<span>' + escapeHtml(note) + '</span>' +
    '</article>';
  }

  function cardHead(title, note, actions) {
    return '<div class="stx-board-card-head">' +
      '<h3>' + escapeHtml(title) + '</h3>' +
      (actions || (note ? '<span>' + escapeHtml(note) + '</span>' : '')) +
    '</div>';
  }

  function note(kind, title, copy) {
    return '<div class="stx-board-note ' +
      escapeHtml(kind || '') +
      '"><b>' + escapeHtml(title) + '</b><br>' +
      escapeHtml(copy) +
    '</div>';
  }

  function setMessage(node, text, type) {
    if (!node) return;
    node.textContent = text || '';
    node.className = 'stx-board-login-message';
    if (!text) return;
    node.classList.add('show');
    node.classList.add(type === 'success' ? 'success' : 'error');
  }

  function loginBrand() {
    return '<a class="stx-board-login-brand" href="/">' +
      '<span class="stx-board-logo">SA</span>' +
      '<span class="stx-board-brand-copy">' +
        '<b>Stratex Admin</b>' +
        '<span>Internal staff access</span>' +
      '</span>' +
    '</a>';
  }

  function renderExactLogin() {
    if (loginStarted) return;
    loginStarted = true;
    exactStarted = false;

    var params = new URLSearchParams(window.location.search);
    var suppliedCode = params.get('code') || '';
    var suppliedEmail = params.get('email') || '';
    var mode = suppliedCode ? 'code' : 'password';

    document.body.className =
      'theme-light stx-company-admin stx-admin-login-body stx-exact-board-v3';

    document.body.innerHTML =
      '<main class="stx-board-login">' +
        '<section class="stx-board-login-story">' +
          loginBrand() +
          '<h1>Run the company from one secure workspace.</h1>' +
          '<p>Stratex Admin is for authorised internal staff managing company operations, people, content, trust, events and public website activity. ScoutLink product access remains separate.</p>' +
          '<div class="stx-board-story-points">' +
            '<div class="stx-board-story-point">' +
              '<b>Separate from ScoutLink</b>' +
              '<span>Internal Stratex authentication and permissions do not reuse the ScoutLink login.</span>' +
            '</div>' +
            '<div class="stx-board-story-point">' +
              '<b>Role-based access</b>' +
              '<span>Staff see only the records and areas permitted by their role and reporting line.</span>' +
            '</div>' +
            '<div class="stx-board-story-point">' +
              '<b>Richdhin as Super Admin</b>' +
              '<span>Richdhin Inaba controls initial access, user permissions and company-wide administration.</span>' +
            '</div>' +
          '</div>' +
          '<footer>Stratex Analytics internal system · Authorised staff only</footer>' +
        '</section>' +
        '<section class="stx-board-login-right">' +
          '<div class="stx-board-login-card">' +
            '<small style="color:#08745b;font-weight:900;text-transform:uppercase">Internal staff sign in</small>' +
            '<h2>Sign in to Stratex Admin</h2>' +
            '<p>Use your Stratex Admin password or the one-time login code sent to your approved staff email.</p>' +
            '<div class="stx-board-login-tabs" role="tablist" aria-label="Sign-in method">' +
              '<button class="stx-board-login-tab' +
                (mode === 'password' ? ' active' : '') +
                '" type="button" role="tab" data-login-mode="password" aria-selected="' +
                (mode === 'password' ? 'true' : 'false') +
                '">Email and password</button>' +
              '<button class="stx-board-login-tab' +
                (mode === 'code' ? ' active' : '') +
                '" type="button" role="tab" data-login-mode="code" aria-selected="' +
                (mode === 'code' ? 'true' : 'false') +
                '">Login code</button>' +
            '</div>' +
            '<form id="stxExactLoginForm" data-mode="' + mode + '">' +
              '<label class="form-group">' +
                '<span>Stratex work email</span>' +
                '<input class="form-control" id="stxExactLoginEmail" type="email" autocomplete="email" value="' +
                  escapeHtml(suppliedEmail) +
                  '" placeholder="name@stratexanalytics.co.uk" required>' +
              '</label>' +
              '<label class="form-group" id="stxExactPasswordField"' +
                (mode === 'code' ? ' hidden' : '') +
                ' style="margin-top:10px">' +
                '<span>Password</span>' +
                '<input class="form-control" id="stxExactLoginPassword" type="password" autocomplete="current-password"' +
                  (mode === 'password' ? ' required' : '') +
                '>' +
              '</label>' +
              '<label class="form-group" id="stxExactCodeField"' +
                (mode === 'password' ? ' hidden' : '') +
                ' style="margin-top:10px">' +
                '<span>One-time login code</span>' +
                '<input class="form-control" id="stxExactLoginCode" type="text" autocomplete="one-time-code" maxlength="12" value="' +
                  escapeHtml(suppliedCode) +
                  '" style="text-transform:uppercase;letter-spacing:5px;font-weight:950"' +
                  (mode === 'code' ? ' required' : '') +
                '>' +
              '</label>' +
              '<div class="stx-board-login-message" id="stxExactLoginMessage" role="alert"></div>' +
              '<button class="stx-board-btn primary" id="stxExactLoginSubmit" type="submit" style="width:100%;margin-top:13px">' +
                (mode === 'code' ? 'Verify code securely' : 'Sign in securely') +
              '</button>' +
            '</form>' +
            note(
              'green',
              'First-time access',
              'New users verify the code in their Stratex invitation email, then set their own password before entering the workspace.'
            ) +
            '<div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:12px;font-size:9px">' +
              '<a href="/forgot-password?type=Stratex" style="color:#08745b;font-weight:900">Forgot password</a>' +
              '<button class="stx-board-btn small" id="stxExactRequestCode" type="button">Request a new code</button>' +
            '</div>' +
          '</div>' +
        '</section>' +
      '</main>';

    bindExactLogin(mode);
  }

  function bindExactLogin(initialMode) {
    var form = document.getElementById('stxExactLoginForm');
    var mode = initialMode;

    function applyMode(nextMode) {
      mode = nextMode;
      form.dataset.mode = mode;

      document.querySelectorAll('[data-login-mode]').forEach(function (tab) {
        var active = tab.dataset.loginMode === mode;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
      });

      var passwordField = document.getElementById('stxExactPasswordField');
      var codeField = document.getElementById('stxExactCodeField');
      var passwordInput = document.getElementById('stxExactLoginPassword');
      var codeInput = document.getElementById('stxExactLoginCode');
      var submit = document.getElementById('stxExactLoginSubmit');

      passwordField.hidden = mode !== 'password';
      codeField.hidden = mode !== 'code';
      passwordInput.required = mode === 'password';
      codeInput.required = mode === 'code';
      submit.textContent = mode === 'code'
        ? 'Verify code securely'
        : 'Sign in securely';

      setMessage(document.getElementById('stxExactLoginMessage'), '', '');
    }

    document.querySelectorAll('[data-login-mode]').forEach(function (tab) {
      tab.addEventListener('click', function () {
        applyMode(tab.dataset.loginMode);
      });
    });

    form.addEventListener('submit', async function (event) {
      event.preventDefault();

      var email = document.getElementById('stxExactLoginEmail')
        .value.trim().toLowerCase();
      var password = document.getElementById('stxExactLoginPassword').value;
      var code = document.getElementById('stxExactLoginCode')
        .value.trim().toUpperCase();
      var feedback = document.getElementById('stxExactLoginMessage');
      var submit = document.getElementById('stxExactLoginSubmit');

      setMessage(feedback, '', '');

      if (!email || email.indexOf('@') < 1) {
        setMessage(feedback, 'Enter a valid approved Stratex email.', 'error');
        return;
      }

      if (mode === 'password' && !password) {
        setMessage(feedback, 'Enter your Stratex Admin password.', 'error');
        return;
      }

      if (mode === 'code' && !code) {
        setMessage(feedback, 'Enter the one-time invitation code.', 'error');
        return;
      }

      submit.disabled = true;
      submit.textContent = mode === 'code'
        ? 'Verifying…'
        : 'Signing in…';

      try {
        var response = await fetch(apiBase() + '/api/auth/login', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            email: email,
            password: mode === 'password' ? password : undefined,
            loginCode: mode === 'code' ? code : undefined,
            accountType: 'Stratex'
          })
        });

        var data = await response.json().catch(function () { return {}; });
        if (!response.ok) {
          throw new Error(
            data.error || 'The Stratex credentials were not accepted.'
          );
        }

        saveSession(data);

        if (mode === 'code' && data.needsRegistration) {
          renderPasswordSetup();
          return;
        }

        window.location.replace('/admin');
      } catch (error) {
        setMessage(
          feedback,
          error.message || 'Stratex Admin sign-in failed.',
          'error'
        );
        submit.disabled = false;
        submit.textContent = mode === 'code'
          ? 'Verify code securely'
          : 'Sign in securely';
      }
    });

    var requestCode = document.getElementById('stxExactRequestCode');
    if (requestCode) {
      requestCode.addEventListener('click', async function () {
        var email = document.getElementById('stxExactLoginEmail')
          .value.trim().toLowerCase();
        var feedback = document.getElementById('stxExactLoginMessage');

        if (!email || email.indexOf('@') < 1) {
          setMessage(
            feedback,
            'Enter your approved Stratex email first.',
            'error'
          );
          return;
        }

        requestCode.disabled = true;
        requestCode.textContent = 'Requesting…';

        try {
          await fetch(apiBase() + '/api/auth/forgot-password', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              email: email,
              accountType: 'Stratex'
            })
          });

          applyMode('code');
          setMessage(
            feedback,
            'A new code has been requested. Check your approved Stratex email.',
            'success'
          );
        } catch (_) {
          setMessage(
            feedback,
            'The code could not be requested right now.',
            'error'
          );
        } finally {
          requestCode.disabled = false;
          requestCode.textContent = 'Request a new code';
        }
      });
    }

    applyMode(mode);
  }

  function renderPasswordSetup() {
    document.body.innerHTML =
      '<main class="stx-board-login">' +
        '<section class="stx-board-login-story">' +
          loginBrand() +
          '<h1>Finish your secure Stratex Admin setup.</h1>' +
          '<p>Your invitation code has been verified. Set your own private password before entering the internal workspace.</p>' +
          '<div class="stx-board-story-points">' +
            '<div class="stx-board-story-point"><b>Internal account only</b><span>This password controls Stratex Admin access.</span></div>' +
            '<div class="stx-board-story-point"><b>Keep it private</b><span>Do not reuse a shared team or ScoutLink demo password.</span></div>' +
            '<div class="stx-board-story-point"><b>Permissioned access</b><span>Your available areas are based on the access assigned by Richdhin.</span></div>' +
          '</div>' +
        '</section>' +
        '<section class="stx-board-login-right">' +
          '<div class="stx-board-login-card">' +
            '<small style="color:#08745b;font-weight:900;text-transform:uppercase">Password setup</small>' +
            '<h2>Create your Stratex password</h2>' +
            '<p>Use at least eight characters. A longer unique password is recommended.</p>' +
            '<form id="stxExactSetupForm">' +
              '<label class="form-group" style="margin-top:14px"><span>New password</span><input class="form-control" id="stxExactNewPassword" type="password" minlength="8" autocomplete="new-password" required></label>' +
              '<label class="form-group" style="margin-top:10px"><span>Confirm new password</span><input class="form-control" id="stxExactConfirmPassword" type="password" minlength="8" autocomplete="new-password" required></label>' +
              '<div class="stx-board-login-message" id="stxExactSetupMessage" role="alert"></div>' +
              '<button class="stx-board-btn primary" id="stxExactSetupSubmit" type="submit" style="width:100%;margin-top:13px">Create password and continue</button>' +
            '</form>' +
          '</div>' +
        '</section>' +
      '</main>';

    var form = document.getElementById('stxExactSetupForm');
    form.addEventListener('submit', async function (event) {
      event.preventDefault();

      var password = document.getElementById('stxExactNewPassword').value;
      var confirm = document.getElementById('stxExactConfirmPassword').value;
      var feedback = document.getElementById('stxExactSetupMessage');
      var submit = document.getElementById('stxExactSetupSubmit');

      if (password.length < 8) {
        setMessage(
          feedback,
          'Password must contain at least eight characters.',
          'error'
        );
        return;
      }

      if (password !== confirm) {
        setMessage(feedback, 'The two passwords do not match.', 'error');
        return;
      }

      submit.disabled = true;
      submit.textContent = 'Saving password…';

      try {
        await api('POST', '/api/auth/complete-registration', {
          newPassword: password,
          accountType: 'Stratex'
        });

        setMessage(
          feedback,
          'Password created. Opening Stratex Admin…',
          'success'
        );

        setTimeout(function () {
          window.location.replace('/admin');
        }, 500);
      } catch (error) {
        setMessage(
          feedback,
          error.message || 'The password could not be saved.',
          'error'
        );
        submit.disabled = false;
        submit.textContent = 'Create password and continue';
      }
    });
  }

  function canShowModule(id) {
    if (id === 'adminUsers') return isRichdhin();
    return !!document.querySelector('[data-admin-module="' + id + '"]') ||
      id === 'permissions';
  }

  function rebuildSidebar() {
    var sidebar = document.getElementById('stxAdminSidebar');
    var nav = sidebar && sidebar.querySelector('.stx-admin-nav');
    var head = sidebar && sidebar.querySelector('.stx-admin-sidebar-head');
    var user = sidebar && sidebar.querySelector('.stx-admin-user');

    if (!sidebar || !nav || sidebar.dataset.exactBoard === '1') return;
    sidebar.dataset.exactBoard = '1';

    if (head) {
      head.innerHTML =
        '<a href="/admin" style="display:flex;gap:9px;align-items:center;text-decoration:none">' +
          '<span class="stx-board-logo">SA</span>' +
          '<span class="stx-board-brand-copy"><b>Stratex Admin</b><span>Internal company operations</span></span>' +
        '</a>' +
        '<button class="stx-admin-drawer-close" id="stxAdminMenuClose" type="button" aria-label="Close admin menu">Close</button>';
    }

    var oldButtons = {};
    nav.querySelectorAll('[data-admin-module]').forEach(function (button) {
      oldButtons[button.dataset.adminModule] = button;
    });

    nav.innerHTML = '';

    BOARD_GROUPS.forEach(function (group) {
      var ids = group[1].filter(canShowModule);
      if (!ids.length) return;

      var section = document.createElement('section');
      section.className = 'stx-board-nav-group';
      section.innerHTML =
        '<div class="stx-board-nav-title">' +
          escapeHtml(group[0]) +
        '</div>';

      ids.forEach(function (id) {
        var button = oldButtons[id];

        if (!button) {
          button = document.createElement('button');
          button.className = 'stx-admin-nav-item';
          button.type = 'button';
          button.dataset.exactModule = id;
        }

        button.innerHTML =
          '<i class="stx-admin-nav-icon" aria-hidden="true">' +
            escapeHtml(BOARD_CODES[id] || '') +
          '</i>' +
          '<span><b>' + escapeHtml(BOARD_NAMES[id]) +
          '</b><small>' + escapeHtml(BOARD_ROUTES[id]) + '</small></span>';

        if (id === 'adminUsers') {
          button.removeAttribute('data-admin-module');
          button.dataset.exactModule = 'adminUsers';
        }

        if (id === 'permissions') {
          button.removeAttribute('data-admin-module');
          button.dataset.exactModule = 'permissions';
        }

        section.appendChild(button);
      });

      nav.appendChild(section);
    });

    if (user) {
      user.innerHTML =
        '<div class="stx-admin-avatar">' + escapeHtml(initials()) + '</div>' +
        '<div><b>' + escapeHtml(currentName()) + '</b><span>' +
        escapeHtml(currentRoleLabel()) + '</span></div>';
    }

    sidebar.querySelectorAll('[data-exact-module]').forEach(function (button) {
      button.addEventListener('click', function () {
        var id = button.dataset.exactModule;
        if (id === 'permissions') {
          history.pushState({}, '', BOARD_ROUTES.permissions);
          showPermissionsPage();
        } else if (id === 'adminUsers') {
          var old = oldButtons.adminUsers;
          if (old) old.click();
          history.pushState({}, '', BOARD_ROUTES.adminUsers);
          applyRoutePresentation('adminUsers');
        }
        closeMobileMenu();
      });
    });
  }

  function rebuildTopBar() {
    var topbar = document.querySelector('.stx-admin-topbar');
    if (!topbar || topbar.dataset.exactBoard === '1') return;
    topbar.dataset.exactBoard = '1';

    var titleBlock = topbar.querySelector('.stx-admin-titleblock');
    var actions = topbar.querySelector('.stx-admin-top-actions');

    if (titleBlock) {
      titleBlock.innerHTML =
        '<h1 id="stxAdminTitle">' +
          escapeHtml(BOARD_NAMES[moduleFromPath()] || 'Dashboard') +
        '</h1>' +
        '<p id="stxExactTopRoute">' +
          escapeHtml(pathNow()) +
          ' · Stratex internal administration</p>';
    }

    var mobileMenuButton = document.getElementById('stxAdminMenuButton');
    if (mobileMenuButton && mobileMenuButton.parentElement !== topbar) {
      topbar.insertBefore(mobileMenuButton, titleBlock);
    }

    if (actions) {
      actions.innerHTML =
        '<button class="btn btn-sm btn-outline" id="stxExactSearch" type="button">Search</button>' +
        '<button class="btn btn-sm btn-outline" id="stxExactProfile" type="button">My Profile</button>' +
        '<button class="btn btn-sm btn-outline" data-admin-logout type="button">Sign out</button>';
    }

    var search = document.getElementById('stxExactSearch');
    if (search) {
      search.addEventListener('click', function () {
        var active = document.querySelector('.stx-company-module:not([hidden])');
        var input = active && active.querySelector(
          'input[type="search"], input[placeholder*="Search"], .stx-board-search'
        );
        if (input) {
          input.focus();
          return;
        }
        alert('This page does not currently have a search field.');
      });
    }

    var profile = document.getElementById('stxExactProfile');
    if (profile) {
      profile.addEventListener('click', function () {
        openModule('profile');
      });
    }
  }

  function closeMobileMenu() {
    document.body.classList.remove('stx-admin-menu-open');
    var sidebar = document.getElementById('stxAdminSidebar');
    if (sidebar) sidebar.classList.remove('open');
    var trigger = document.getElementById('stxAdminMenuButton');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }

  function openModule(id) {
    if (id === 'permissions') {
      history.pushState({}, '', BOARD_ROUTES.permissions);
      showPermissionsPage();
      return;
    }

    var button = document.querySelector('[data-admin-module="' + id + '"]');
    if (button) {
      button.click();
      return;
    }

    if (id === 'adminUsers') {
      var adminButton = document.querySelector('[data-exact-module="adminUsers"]');
      if (adminButton) adminButton.click();
    }
  }

  function dashboardCard(id, code, title, copy) {
    return '<button class="stx-board-dash" type="button" data-board-open="' +
      escapeHtml(id) + '">' +
      '<i>' + escapeHtml(code) + '</i>' +
      '<h3>' + escapeHtml(title) + '</h3>' +
      '<p>' + escapeHtml(copy) + '</p>' +
      '<span>Open area →</span>' +
    '</button>';
  }

  function rebuildDashboard() {
    var module = document.getElementById('module-dashboard');
    if (!module || module.dataset.exactBoard === '1') return;
    module.dataset.exactBoard = '1';

    var head = module.querySelector('.stx-module-head');
    var bodyNodes = Array.prototype.slice.call(module.children).filter(
      function (node) { return node !== head; }
    );
    bodyNodes.forEach(function (node) { node.remove(); });

    addPageActions(module, [
      {
        label: 'Add Stratex User',
        className: 'primary',
        hidden: !isRichdhin(),
        action: function () {
          history.pushState({}, '', BOARD_ROUTES.adminUsers);
          openModule('adminUsers');
        }
      }
    ]);

    module.insertAdjacentHTML(
      'beforeend',
      '<div class="stx-board-metrics">' +
        metric('Open registrations', '—', 'Awaiting decision', '', 'stxBoardOpenRegistrations') +
        metric('New forms', '—', 'New public submissions', 'blue', 'stxBoardNewForms') +
        metric('Open roles', '—', 'Published vacancies', 'gold', 'stxBoardOpenRoles') +
        metric('Urgent concerns', '—', 'Immediate attention', 'red', 'stxBoardUrgentConcerns') +
      '</div>' +
      '<div class="stx-board-dashboard">' +
        dashboardCard('registrations', 'RG', 'Registrations', 'Review product registrations.') +
        dashboardCard('contactForms', 'CF', 'Contact Forms', 'Triage public submissions.') +
        dashboardCard('crm', 'CR', 'CRM', 'Manage contacts and activity.') +
        dashboardCard('activity', 'WA', 'Website Activity', 'See public-site performance.') +
        dashboardCard('blog', 'BL', 'Blog / Learning', 'Write and publish articles.') +
        dashboardCard('leadership', 'LD', 'Leadership', 'Manage public leadership profiles.') +
        dashboardCard('org', 'OC', 'Org Charts', 'View reporting lines.') +
        dashboardCard('profile', 'MP', 'My Profile', 'See your internal profile.') +
        dashboardCard('contracts', 'CP', 'Contracts & Pay', 'Private people records.') +
        dashboardCard('hiring', 'HR', 'Hiring', 'Roles first, then applicants.') +
        dashboardCard('concerns', 'TC', 'Trust & Concerns', 'Private reports and actions.') +
        dashboardCard('settings', 'ST', 'Settings', 'Company settings only.') +
        dashboardCard('showcase', 'SE', 'Showcase Event', 'Manage showcase events.') +
        dashboardCard('awards', 'AC', 'Award Ceremonies', 'Manage awards and notices.') +
      '</div>'
    );

    module.querySelectorAll('[data-board-open]').forEach(function (button) {
      button.addEventListener('click', function () {
        openModule(button.dataset.boardOpen);
      });
    });

    loadDashboardMetrics();
  }

  async function loadDashboardMetrics() {
    if (dashboardLoaded) return;
    dashboardLoaded = true;

    var setValue = function (id, value) {
      var node = document.getElementById(id);
      if (node) node.textContent = Number(value || 0).toLocaleString('en-GB');
    };

    try {
      var results = await Promise.allSettled([
        api('GET', '/api/stratex/dashboard'),
        api('GET', '/api/stratex-website/leads?limit=500'),
        api('GET', '/api/stratex/job-posts'),
        api('GET', '/api/stratex-website/leads?type=concern&limit=500')
      ]);

      var dashboard = results[0].status === 'fulfilled'
        ? results[0].value
        : {};
      var leads = results[1].status === 'fulfilled'
        ? results[1].value.data || []
        : [];
      var roles = results[2].status === 'fulfilled'
        ? results[2].value.data || []
        : [];
      var concerns = results[3].status === 'fulfilled'
        ? results[3].value.data || []
        : leads.filter(function (row) {
            return /concern/i.test(String(row.lead_type || ''));
          });

      setValue('stxBoardOpenRegistrations', dashboard.pendingReqs || 0);
      setValue(
        'stxBoardNewForms',
        leads.filter(function (row) {
          return /new|open/i.test(String(row.status || 'new'));
        }).length
      );
      setValue(
        'stxBoardOpenRoles',
        roles.filter(function (row) {
          return /open|published/i.test(String(row.status || ''));
        }).length
      );
      setValue(
        'stxBoardUrgentConcerns',
        concerns.filter(function (row) {
          return /urgent|high/i.test(
            String(row.priority || row.severity || '')
          ) && !/closed|resolved/i.test(String(row.status || ''));
        }).length
      );
    } catch (_) {}
  }

  function addPageActions(module, actions) {
    var head = module && module.querySelector('.stx-module-head');
    if (!head) return;

    var old = head.querySelector('.stx-board-page-actions');
    if (old) old.remove();

    var holder = document.createElement('div');
    holder.className = 'stx-board-page-actions';

    (actions || []).forEach(function (item) {
      if (item.hidden) return;
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'stx-board-btn ' + (item.className || '');
      button.textContent = item.label;
      button.addEventListener('click', item.action);
      holder.appendChild(button);
    });

    if (holder.children.length) head.appendChild(holder);
  }

  function stylePageHead(module, title, copy) {
    var head = module && module.querySelector('.stx-module-head');
    if (!head) return;
    var heading = head.querySelector('h2');
    var paragraph = head.querySelector('p:not(.stx-eyebrow)');
    if (heading && title) heading.textContent = title;
    if (paragraph && copy) paragraph.textContent = copy;
  }

  function addSearchFilters(module, options) {
    if (!module || module.querySelector('.stx-board-filters')) return;

    var firstSurface = module.querySelector('.stx-admin-surface');
    var table = module.querySelector('.stx-admin-table-wrap');
    var anchor = firstSurface || table;
    if (!anchor) return;

    var filters = document.createElement('div');
    filters.className = 'stx-board-filters';
    filters.innerHTML =
      '<input class="stx-board-input stx-board-search" type="search" placeholder="' +
        escapeHtml(options.placeholder || 'Search records') +
      '" aria-label="Search records">' +
      (options.selects || []).map(function (select, index) {
        return '<select class="stx-board-select" data-board-filter="' + index + '" aria-label="' +
          escapeHtml(select.label) + '">' +
          select.options.map(function (option) {
            return '<option value="' + escapeHtml(option.value) + '">' +
              escapeHtml(option.label) +
            '</option>';
          }).join('') +
        '</select>';
      }).join('') +
      '<button class="stx-board-btn primary stx-board-filter-action" type="button">Filter</button>';

    module.insertBefore(filters, anchor);

    function filterRows() {
      var term = filters.querySelector('.stx-board-search').value
        .trim().toLowerCase();
      var values = Array.prototype.slice.call(
        filters.querySelectorAll('[data-board-filter]')
      ).map(function (select) {
        return select.value.trim().toLowerCase();
      });

      module.querySelectorAll('.stx-admin-table tbody tr').forEach(function (row) {
        var text = row.textContent.toLowerCase();
        var matchesTerm = !term || text.indexOf(term) >= 0;
        var matchesSelects = values.every(function (value) {
          return !value || text.indexOf(value) >= 0;
        });
        row.hidden = !(matchesTerm && matchesSelects);
      });
    }

    filters.querySelector('.stx-board-filter-action')
      .addEventListener('click', filterRows);
    filters.querySelector('.stx-board-search')
      .addEventListener('input', filterRows);
    filters.querySelectorAll('[data-board-filter]').forEach(function (select) {
      select.addEventListener('change', filterRows);
    });
  }

  function transformRegistrations() {
    var module = document.getElementById('module-registrations');
    if (!module || module.dataset.exactPage === '1') return;
    module.dataset.exactPage = '1';

    stylePageHead(
      module,
      'Registrations',
      'Review all Stratex product registrations and keep ScoutLink status synchronised.'
    );

    addSearchFilters(module, {
      placeholder: 'Search name, email or organisation',
      selects: [
        {
          label: 'Product',
          options: [
            {value: '', label: 'All products'},
            {value: 'scoutlink', label: 'ScoutLink'}
          ]
        },
        {
          label: 'Type',
          options: [
            {value: '', label: 'All types'},
            {value: 'coach', label: 'Coach'},
            {value: 'scout', label: 'Scout'}
          ]
        },
        {
          label: 'Status',
          options: [
            {value: '', label: 'All statuses'},
            {value: 'pending', label: 'Pending'},
            {value: 'approved', label: 'Approved'},
            {value: 'declined', label: 'Declined'}
          ]
        }
      ]
    });

    var productFilter = document.getElementById('registrationProductFilter');
    var statusFilter = document.getElementById('registrationStatusFilter');
    if (productFilter) productFilter.closest('label').hidden = true;
    if (statusFilter) statusFilter.closest('label').hidden = true;

    addPageActions(module, [
      {
        label: 'Refresh',
        action: function () {
          var button = document.getElementById('refreshRegistrationsBtn');
          if (button) button.click();
        }
      }
    ]);
  }

  function transformContactForms() {
    var module = document.getElementById('module-contactForms');
    if (!module || module.dataset.exactPage === '1') return;
    module.dataset.exactPage = '1';

    stylePageHead(
      module,
      'Contact Forms',
      'All website contact, demo, lead and public form submissions in one queue.'
    );

    addSearchFilters(module, {
      placeholder: 'Search name, email, organisation or message',
      selects: [
        {
          label: 'Submission type',
          options: [
            {value: '', label: 'All submission types'},
            {value: 'contact', label: 'Contact'},
            {value: 'demo', label: 'Demo'},
            {value: 'coach', label: 'Coach enquiry'},
            {value: 'scout', label: 'Scout access'},
            {value: 'partnership', label: 'Partnership'}
          ]
        },
        {
          label: 'Status',
          options: [
            {value: '', label: 'All statuses'},
            {value: 'open', label: 'Open'},
            {value: 'contacted', label: 'Contacted'},
            {value: 'reviewed', label: 'Reviewed'},
            {value: 'closed', label: 'Closed'}
          ]
        },
        {
          label: 'Owner',
          options: [
            {value: '', label: 'All owners'},
            {value: 'richdhin', label: 'Richdhin'},
            {value: 'lucy', label: 'Lucy'},
            {value: 'alexandro', label: 'Alexandro'}
          ]
        }
      ]
    });
  }

  function transformCrm() {
    var module = document.getElementById('module-crm');
    if (!module || module.dataset.exactPage === '1') return;
    module.dataset.exactPage = '1';

    stylePageHead(
      module,
      'CRM',
      'Stratex and product contacts with forms, registrations, notes and activity.'
    );

    addPageActions(module, [
      {
        label: 'Export CRM',
        action: function () {
          var exportButton = document.getElementById('crmExportBtn');
          if (exportButton) exportButton.click();
        }
      },
      {
        label: 'Add contact',
        className: 'primary',
        action: function () {
          alert('The Add contact form will use the existing Stratex CRM create endpoint when it is added.');
        }
      }
    ]);

    var crmHead = module.querySelector('.stx-module-head');
    if (crmHead) crmHead.insertAdjacentHTML(
      'afterend',
      '<div class="stx-board-metrics" id="stxBoardCrmMetrics">' +
        metric('Contacts', '—', 'All contact types', '', 'stxBoardCrmContacts') +
        metric('Warm leads', '—', 'Need next action', 'gold', 'stxBoardCrmWarm') +
        metric('Active customers', '—', 'ScoutLink organisations', 'blue', 'stxBoardCrmActive') +
        metric('Unassigned', '—', 'New records', 'red', 'stxBoardCrmUnassigned') +
      '</div>'
    );

    addSearchFilters(module, {
      placeholder: 'Search contact, email or organisation',
      selects: [
        {
          label: 'Type',
          options: [
            {value: '', label: 'All contact types'},
            {value: 'lead', label: 'Lead'},
            {value: 'coach', label: 'Coach'},
            {value: 'scout', label: 'Scout'},
            {value: 'registration', label: 'Registration'},
            {value: 'job', label: 'Applicant'}
          ]
        },
        {
          label: 'Product',
          options: [
            {value: '', label: 'All products'},
            {value: 'scoutlink', label: 'ScoutLink'},
            {value: 'stratex', label: 'Stratex Analytics'}
          ]
        },
        {
          label: 'Status',
          options: [
            {value: '', label: 'All statuses'},
            {value: 'active', label: 'Active'},
            {value: 'warm', label: 'Warm'},
            {value: 'pending', label: 'Pending'},
            {value: 'new', label: 'New'}
          ]
        }
      ]
    });

    loadCrmMetrics();
  }

  async function loadCrmMetrics() {
    try {
      var result = await api('GET', '/api/stratex-website/crm');
      var rows = result.data || [];
      var set = function (id, value) {
        var node = document.getElementById(id);
        if (node) node.textContent = Number(value || 0).toLocaleString('en-GB');
      };

      set('stxBoardCrmContacts', rows.length);
      set(
        'stxBoardCrmWarm',
        rows.filter(function (row) {
          return /warm|contacted|follow/i.test(String(row.status || ''));
        }).length
      );
      set(
        'stxBoardCrmActive',
        rows.filter(function (row) {
          return /active|approved/i.test(String(row.status || '')) &&
            /scoutlink/i.test(String(row.product || row.source || ''));
        }).length
      );
      set(
        'stxBoardCrmUnassigned',
        rows.filter(function (row) {
          return !row.owner && !row.assignedTo && /new/i.test(String(row.status || 'new'));
        }).length
      );
    } catch (_) {}
  }

  function transformActivity() {
    var module = document.getElementById('module-activity');
    if (!module || module.dataset.exactPage === '1') return;
    module.dataset.exactPage = '1';

    stylePageHead(
      module,
      'Website Activity',
      'Headline metrics for the public Stratex website only.'
    );

    var existingKpis = module.querySelector('.stx-admin-kpis');
    if (existingKpis) {
      existingKpis.className = 'stx-board-metrics';
      var items = existingKpis.querySelectorAll(':scope > div');
      items.forEach(function (item, index) {
        item.className = 'stx-board-metric ' +
          (index === 1 ? 'blue' : index === 2 ? 'gold' : '');
      });
    }

    var surface = module.querySelector('.stx-admin-surface');
    if (surface && !module.querySelector('.stx-board-traffic-chart')) {
      var chart = document.createElement('section');
      chart.className = 'stx-board-card stx-board-traffic-chart';
      chart.style.marginBottom = '11px';
      chart.innerHTML =
        cardHead('Traffic trend', 'Daily-series display') +
        '<div class="stx-board-card-body">' +
          '<svg viewBox="0 0 760 170" width="100%" height="170" role="img" aria-label="Website traffic trend">' +
            '<line x1="25" y1="145" x2="735" y2="145" stroke="#dbe4ed"/>' +
            '<line x1="25" y1="95" x2="735" y2="95" stroke="#edf1f4"/>' +
            '<line x1="25" y1="45" x2="735" y2="45" stroke="#edf1f4"/>' +
            '<polyline fill="none" stroke="#0e9f78" stroke-width="4" points="25,130 80,116 135,122 190,89 245,98 300,70 355,80 410,53 465,63 520,40 575,55 630,31 685,44 735,28"/>' +
          '</svg>' +
        '</div>';
      surface.insertBefore(chart, surface.querySelector('#activityBreakdownRows'));
    }
  }

  function blogExactFormMarkup() {
    return cardHead('Write a Learning Centre article', 'Draft autosaved') +
      '<div class="stx-board-card-body">' +
        '<div class="stx-board-form-grid">' +
          '<label class="form-group" style="grid-column:1/-1"><span>Title</span><input class="form-control" name="title" required></label>' +
          '<label class="form-group" style="grid-column:1/-1"><span>Slug</span><input class="form-control" name="slug" placeholder="coach-led-player-evidence"><small>Public URL: /learning-centre/:slug</small></label>' +
          '<label class="form-group"><span>Category</span><select class="form-control" name="category"><option>For coaches</option><option>For scouts</option><option>For families</option><option>Product guide</option><option>Safeguarding</option></select></label>' +
          '<label class="form-group"><span>Author</span><select class="form-control" name="author"><option>Richdhin Inaba</option><option>Lucy Ali</option><option>Alexandro Ilioaie</option></select></label>' +
          '<label class="form-group" style="grid-column:1/-1"><span>Excerpt</span><textarea class="form-control" name="excerpt" rows="4"></textarea><small>Shown on article cards and search previews.</small></label>' +
          '<label class="form-group" style="grid-column:1/-1"><span>Featured image</span><span class="stx-board-upload"><span class="stx-board-upload-icon">↑</span><strong>Upload article image</strong><span style="margin:4px 0 8px;color:#65798c;font-size:8px">JPG, PNG or WebP · 1600 × 900 recommended</span><input class="form-control" type="file" name="featuredImage" accept="image/jpeg,image/png,image/webp"></span></label>' +
          '<label class="form-group" style="grid-column:1/-1"><span>Image alt text</span><input class="form-control" name="imageAlt"><small>Required for accessibility.</small></label>' +
          '<div class="form-group" style="grid-column:1/-1"><span>Article body</span>' +
            '<div class="stx-editor-toolbar" aria-label="Article editor toolbar">' +
              '<button type="button" data-board-format="heading">H2</button>' +
              '<button type="button" data-board-format="bold">B</button>' +
              '<button type="button" data-board-format="italic">I</button>' +
              '<button type="button" data-board-format="bullet">•</button>' +
              '<button type="button" data-board-format="number">1.</button>' +
              '<button type="button" data-board-format="link">↗</button>' +
              '<button type="button" data-board-format="image">IMG</button>' +
            '</div>' +
            '<textarea class="form-control" name="body" rows="14" required style="border-radius:0 0 7px 7px"></textarea>' +
          '</div>' +
          '<label class="form-group" style="grid-column:1/-1"><span>SEO title</span><input class="form-control" name="seoTitle"></label>' +
          '<label class="form-group" style="grid-column:1/-1"><span>Meta description</span><textarea class="form-control" name="metaDescription" rows="3"></textarea></label>' +
          '<label class="form-group" style="grid-column:1/-1"><span>Canonical URL</span><input class="form-control" name="canonicalUrl"><small>Generated from the approved slug.</small></label>' +
          '<label class="form-group"><span>Indexing</span><select class="form-control" name="indexing"><option>Index when published</option><option>Keep noindex</option></select></label>' +
          '<label class="form-group"><span>Status</span><select class="form-control" name="status"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>' +
        '</div>' +
        '<div class="form-message" id="blogMsg" style="display:none"></div>' +
        '<div class="actions" style="justify-content:flex-end;margin-top:11px">' +
          '<button class="stx-board-btn" type="submit" name="saveMode" value="draft">Save draft</button>' +
          '<button class="stx-board-btn primary" type="submit" name="saveMode" value="publish">Publish article</button>' +
        '</div>' +
      '</div>';
  }

  function transformBlog() {
    var module = document.getElementById('module-blog');
    if (!module || module.dataset.exactPage === '1') return;
    module.dataset.exactPage = '1';

    stylePageHead(
      module,
      'Blog / Learning Centre',
      'Write, upload the article image and preview the exact public /learning-centre/:slug presentation.'
    );

    var stack = module.querySelector('.stx-admin-stack');
    var form = document.getElementById('blogForm');
    var posts = form && form.nextElementSibling;
    if (!stack || !form || !posts) return;

    form.className = 'stx-board-card';
    form.innerHTML = blogExactFormMarkup();

    var editor = document.createElement('div');
    editor.className = 'stx-board-editor';

    var aside = document.createElement('aside');
    aside.className = 'stx-board-grid';
    aside.innerHTML =
      '<section class="stx-board-preview">' +
        '<div class="stx-board-preview-image"><div><small id="stxBlogPreviewCategory">For coaches · Learning Centre</small><h3 id="stxBlogPreviewTitle">Article title preview</h3></div></div>' +
        '<div class="stx-board-preview-body"><p id="stxBlogPreviewExcerpt">The article excerpt appears here.</p></div>' +
      '</section>' +
      '<section class="stx-board-card">' +
        cardHead('Publishing checks', '') +
        '<div class="stx-board-card-body">' +
          toggleMarkup('Featured image added', 'Used on card and article hero.', false) +
          toggleMarkup('Slug available', 'No published post uses it.', true) +
          toggleMarkup('SEO metadata complete', 'Ready for search preview.', false) +
          toggleMarkup('Include in sitemap', 'Only when published.', true) +
        '</div>' +
      '</section>';

    editor.appendChild(form);
    editor.appendChild(aside);
    stack.insertBefore(editor, posts);

    posts.classList.add('stx-board-card');
    var postsHeader = posts.querySelector('.stx-admin-row-head');
    if (postsHeader) postsHeader.className = 'stx-board-card-head';

    bindBlogPreview(form);
    bindBoardEditor(form);
    bindBoardSwitches(module);
  }

  function toggleMarkup(title, copy, on) {
    return '<div class="stx-board-toggle"><div><b>' +
      escapeHtml(title) + '</b><span>' + escapeHtml(copy) +
      '</span></div><button class="stx-board-switch' +
      (on ? ' on' : '') +
      '" type="button" aria-pressed="' + (on ? 'true' : 'false') +
      '"><i></i></button></div>';
  }

  function bindBoardSwitches(root) {
    root.querySelectorAll('.stx-board-switch').forEach(function (button) {
      if (button.dataset.bound === '1') return;
      button.dataset.bound = '1';
      button.addEventListener('click', function () {
        button.classList.toggle('on');
        button.setAttribute(
          'aria-pressed',
          button.classList.contains('on') ? 'true' : 'false'
        );
      });
    });
  }

  function bindBlogPreview(form) {
    var title = form.querySelector('[name="title"]');
    var category = form.querySelector('[name="category"]');
    var excerpt = form.querySelector('[name="excerpt"]');
    var slug = form.querySelector('[name="slug"]');
    var canonical = form.querySelector('[name="canonicalUrl"]');

    function update() {
      var titleNode = document.getElementById('stxBlogPreviewTitle');
      var categoryNode = document.getElementById('stxBlogPreviewCategory');
      var excerptNode = document.getElementById('stxBlogPreviewExcerpt');

      if (titleNode) titleNode.textContent = title.value || 'Article title preview';
      if (categoryNode) categoryNode.textContent =
        (category.value || 'Learning') + ' · Learning Centre';
      if (excerptNode) excerptNode.textContent =
        excerpt.value || 'The article excerpt appears here.';

      if (slug && canonical && slug.value.trim()) {
        canonical.value =
          'https://www.stratexanalytics.co.uk/learning-centre/' +
          slug.value.trim().replace(/^\/+|\/+$/g, '');
      }
    }

    [title, category, excerpt, slug].forEach(function (input) {
      if (input) input.addEventListener('input', update);
      if (input) input.addEventListener('change', update);
    });

    update();
  }

  function bindBoardEditor(form) {
    var body = form.querySelector('[name="body"]');
    if (!body) return;

    form.querySelectorAll('[data-board-format]').forEach(function (button) {
      button.addEventListener('click', function () {
        var format = button.dataset.boardFormat;
        var start = body.selectionStart || 0;
        var end = body.selectionEnd || 0;
        var selected = body.value.slice(start, end);
        var before = '';
        var after = '';

        if (format === 'heading') before = '## ';
        if (format === 'bold') { before = '**'; after = '**'; }
        if (format === 'italic') { before = '*'; after = '*'; }
        if (format === 'bullet') before = '- ';
        if (format === 'number') before = '1. ';
        if (format === 'link') { before = '['; after = '](https://)'; }
        if (format === 'image') { before = '!['; after = '](image-url)'; }

        body.setRangeText(before + selected + after, start, end, 'end');
        body.focus();
      });
    });
  }

  function transformLeadership() {
    var module = document.getElementById('module-leadership');
    if (!module || module.dataset.exactPage === '1') return;
    module.dataset.exactPage = '1';

    stylePageHead(
      module,
      'Leadership',
      'Manage the public leadership profiles, images and ordering.'
    );

    addPageActions(module, [{
      label: 'Add profile',
      className: 'primary',
      action: function () {
        var form = document.getElementById('leadershipForm');
        if (form) form.scrollIntoView({behavior: 'smooth', block: 'start'});
      }
    }]);

    var stack = module.querySelector('.stx-admin-stack');
    var form = document.getElementById('leadershipForm');
    var rows = form && form.nextElementSibling;
    if (stack && form && rows) {
      rows.parentNode.insertBefore(rows, form);
      form.classList.add('stx-board-card');
      rows.classList.add('stx-board-card');
    }
  }

  function transformOrg() {
    var module = document.getElementById('module-org');
    if (!module || module.dataset.exactPage === '1') return;
    module.dataset.exactPage = '1';

    stylePageHead(
      module,
      'Org Charts',
      'A hierarchy based on reporting managers, not access levels.'
    );

    addPageActions(module, [{
      label: 'Add Stratex User',
      className: 'primary',
      hidden: !isRichdhin(),
      action: function () {
        history.pushState({}, '', BOARD_ROUTES.adminUsers);
        openModule('adminUsers');
      }
    }]);
  }

  function exactAdminUserForm(form) {
    form.innerHTML =
      cardHead('User and reporting details', 'Internal staff only') +
      '<div class="stx-board-card-body">' +
        '<div class="stx-board-form-grid">' +
          '<label class="form-group"><span>First name</span><input class="form-control" name="firstName" required></label>' +
          '<label class="form-group"><span>Last name</span><input class="form-control" name="lastName" required></label>' +
          '<label class="form-group" style="grid-column:1/-1"><span>Stratex email</span><input class="form-control" name="emailAddr" type="email" placeholder="name@stratexanalytics.co.uk" required></label>' +
          '<label class="form-group"><span>Job title</span><input class="form-control" name="jobTitle" required></label>' +
          '<label class="form-group"><span>Department</span><select class="form-control" name="department"><option>Customer Operations</option><option>Football Strategy & Growth</option><option>Product</option><option>Executive</option><option>Finance</option><option>Legal & Compliance</option></select></label>' +
          '<label class="form-group"><span>Reporting manager</span><select class="form-control" id="adminUserManager" name="managerId"><option value="">No manager</option></select></label>' +
          '<label class="form-group"><span>Access level</span><select class="form-control" name="adminRole"><option value="Employee">Standard Admin</option><option value="Management">Manager Admin</option><option value="Read Only">Read-only Admin</option></select></label>' +
          '<label class="form-group"><span>Start date</span><input class="form-control" name="startDate" type="date"></label>' +
          '<label class="form-group"><span>Employment status</span><select class="form-control" name="employmentStatus"><option>Intern</option><option>Employee</option><option>Contractor</option><option>Advisor</option></select></label>' +
          '<label class="form-group" style="grid-column:1/-1"><span>Welcome message</span><textarea class="form-control" name="welcomeMessage" rows="4">Welcome to Stratex Analytics. Use the secure code to complete your Stratex Admin account.</textarea><small>Included in the invitation email.</small></label>' +
        '</div>' +
        toggleMarkup('Send Stratex Admin login-code email', 'Send after the account is created.', true) +
        toggleMarkup('Require password setup', 'Set a password after code verification.', true) +
        toggleMarkup('Add to org chart', 'Use the selected reporting manager.', true) +
        toggleMarkup('Allow sign-in after setup', 'Activate once password is set.', true) +
        '<div class="form-message" id="adminUserMsg" style="display:none"></div>' +
        '<div style="text-align:right;margin-top:11px"><button class="stx-board-btn primary" type="submit">Create user and send code</button></div>' +
      '</div>';
  }

  function transformAdminUsers() {
    var module = document.getElementById('module-adminUsers');
    if (!module || module.dataset.exactPage === '1') return;
    module.dataset.exactPage = '1';

    stylePageHead(
      module,
      'Add Stratex User',
      'Create the internal account, place the user in the org chart and send the secure login-code email.'
    );

    var form = document.getElementById('adminUserForm');
    var layout = module.querySelector('.stx-admin-two-col');
    var list = form && form.nextElementSibling;

    if (!isRichdhin()) {
      module.innerHTML =
        '<div class="stx-module-head"><div><h2>Add Stratex User</h2><p>Internal user creation is restricted.</p></div></div>' +
        note(
          'red',
          'Richdhin-only access',
          'Only Richdhin Inaba can create internal Stratex users.'
        );
      return;
    }

    if (form) {
      form.className = 'stx-board-card';
      exactAdminUserForm(form);
      bindBoardSwitches(form);
    }

    if (layout && list) {
      var preview = document.createElement('aside');
      preview.className = 'stx-board-grid';
      preview.innerHTML =
        '<section class="stx-board-card">' +
          cardHead('Invitation email preview', 'Stratex Admin template') +
          '<div class="stx-board-card-body">' +
            '<div style="padding:17px;background:#07111f;color:white">' +
              '<b style="font-size:9px">STRATEX ADMIN</b>' +
              '<h3 style="font-size:21px;margin:18px 0 7px;color:white">Your internal account is ready.</h3>' +
              '<p style="font-size:9px;color:#c6d5e2;line-height:1.5">Use the one-time code below to verify your email and set your password.</p>' +
              '<div style="margin:16px 0;padding:12px;background:white;color:#07111f;text-align:center;font-size:24px;font-weight:950;letter-spacing:6px">482 916</div>' +
              '<div class="stx-board-btn primary" style="width:100%">Complete Stratex Admin setup</div>' +
              '<p style="font-size:8px;color:#90a7b9">ScoutLink login details are not used.</p>' +
            '</div>' +
          '</div>' +
        '</section>' +
        note(
          'green',
          'After creation',
          'The user verifies the code, sets a password and appears under the selected manager in the Org Chart.'
        );

      layout.innerHTML = '';
      layout.appendChild(form);
      layout.appendChild(preview);
      module.appendChild(list);
    }
  }

  function permissionsForAdmin(admin) {
    var list = Array.isArray(admin && admin.permissions)
      ? admin.permissions.map(function (item) {
          return String(item || '').trim().toLowerCase();
        })
      : [];

    var matrix = {};

    PERMISSION_AREAS.forEach(function (area) {
      matrix[area[0]] = {};
      PERMISSION_ACTIONS.forEach(function (action) {
        var actionKey = area[0] + '_' + action;
        matrix[area[0]][action] =
          list.indexOf(actionKey) >= 0 ||
          (action === 'view' && list.indexOf(area[0]) >= 0);
      });
    });

    return matrix;
  }

  function selectedPermissionAdmin() {
    return permissionsState.admins.find(function (admin) {
      return String(admin.id) === String(permissionsState.selectedId);
    }) || null;
  }

  function renderPermissionsModule() {
    var module = document.getElementById('module-permissions');
    if (!module) return;

    var selected = selectedPermissionAdmin();
    var editable = isRichdhin();
    var targetIsRichdhin = String(selected && selected.email || '')
      .trim().toLowerCase() === RICHDHIN_EMAIL;

    var matrixRows = PERMISSION_AREAS.map(function (area) {
      return '<tr>' +
        '<td><span class="stx-board-row-title">' +
          escapeHtml(area[1]) +
        '</span></td>' +
        PERMISSION_ACTIONS.map(function (action) {
          var on = targetIsRichdhin ||
            !!(
              permissionsState.matrix[area[0]] &&
              permissionsState.matrix[area[0]][action]
            );
          var locked = !editable || targetIsRichdhin;
          return '<td><button class="stx-board-check' +
            (on ? ' on' : '') +
            (locked ? ' locked' : '') +
            '" type="button" data-permission-area="' +
            escapeHtml(area[0]) +
            '" data-permission-action="' +
            escapeHtml(action) +
            '"' + (locked ? ' disabled' : '') +
            ' aria-pressed="' + (on ? 'true' : 'false') + '">' +
            (locked ? '—' : on ? '✓' : '') +
          '</button></td>';
        }).join('') +
      '</tr>';
    }).join('');

    module.innerHTML =
      '<div class="stx-module-head">' +
        '<div><h2>Permissions</h2><p>Only Richdhin Inaba can edit Stratex Admin permissions. Other admins can view their effective access.</p></div>' +
        (editable && !targetIsRichdhin
          ? '<div class="stx-board-page-actions"><button class="stx-board-btn primary" id="stxSavePermissionMatrix" type="button">Save permission changes</button></div>'
          : '<div class="stx-board-page-actions">' + status('Read only', '') + '</div>') +
      '</div>' +
      note(
        editable ? 'green' : 'red',
        editable ? 'Super Admin access confirmed' : 'Permission editing locked',
        editable
          ? 'You are signed in as Richdhin Inaba. Changes are editable and recorded in the audit log.'
          : 'Only Richdhin Inaba can change access levels or section permissions.'
      ) +
      '<section class="stx-board-card" style="margin-top:11px">' +
        cardHead(
          'Permission matrix',
          selected
            ? 'Selected user: ' + currentAdminName(selected)
            : 'No user selected'
        ) +
        '<div class="stx-board-permissions-wrap">' +
          '<table class="stx-admin-table stx-board-permissions">' +
            '<thead><tr><th>Admin area</th><th>View</th><th>Create</th><th>Edit</th><th>Delete</th></tr></thead>' +
            '<tbody>' + matrixRows + '</tbody>' +
          '</table>' +
        '</div>' +
      '</section>' +
      '<div class="stx-board-grid two" style="margin-top:11px">' +
        '<section class="stx-board-card">' +
          cardHead('Access ownership', '') +
          '<div class="stx-board-card-body">' +
            '<label class="form-group"><span>Super Admin</span><select class="form-control" disabled><option>Richdhin Inaba</option></select></label>' +
            '<label class="form-group" style="margin-top:10px"><span>User being edited</span><select class="form-control" id="stxPermissionUser">' +
              permissionsState.admins.map(function (admin) {
                return '<option value="' + escapeHtml(admin.id) + '"' +
                  (String(admin.id) === String(permissionsState.selectedId)
                    ? ' selected'
                    : '') +
                  '>' + escapeHtml(currentAdminName(admin)) + '</option>';
              }).join('') +
            '</select></label>' +
            '<label class="form-group" style="margin-top:10px"><span>Access level</span><select class="form-control" id="stxPermissionLevel"' +
              ((!editable || targetIsRichdhin) ? ' disabled' : '') +
              '><option value="Management">Manager Admin</option><option value="Employee">Standard Admin</option><option value="Read Only">Read-only Admin</option></select></label>' +
          '</div>' +
        '</section>' +
        '<section class="stx-board-card">' +
          cardHead('Security controls', '') +
          '<div class="stx-board-card-body">' +
            toggleMarkup('Require login verification', 'Protect sensitive changes.', true) +
            toggleMarkup('Notify Richdhin of changes', 'Send an audit email.', true) +
            toggleMarkup('Block ScoutLink account reuse', 'Keep identities separate.', true) +
          '</div>' +
        '</section>' +
      '</div>' +
      '<div class="stx-board-login-message" id="stxPermissionMessage" role="status"></div>';

    bindPermissionMatrix();
    bindBoardSwitches(module);

    var level = document.getElementById('stxPermissionLevel');
    if (level && selected) {
      var raw = String(selected.admin_role || selected.role || '').toLowerCase();
      level.value = /read/.test(raw)
        ? 'Read Only'
        : /management|operations|acquisition/.test(raw)
          ? 'Management'
          : 'Employee';
    }
  }

  function currentAdminName(admin) {
    return [
      admin && admin.first_name,
      admin && admin.last_name
    ].filter(Boolean).join(' ') ||
      admin && admin.email ||
      'Stratex user';
  }

  function bindPermissionMatrix() {
    var userSelect = document.getElementById('stxPermissionUser');
    if (userSelect) {
      userSelect.addEventListener('change', function () {
        permissionsState.selectedId = userSelect.value;
        permissionsState.matrix = permissionsForAdmin(selectedPermissionAdmin());
        renderPermissionsModule();
      });
    }

    document.querySelectorAll('[data-permission-area]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (button.disabled) return;

        var area = button.dataset.permissionArea;
        var action = button.dataset.permissionAction;
        permissionsState.matrix[area] = permissionsState.matrix[area] || {};
        permissionsState.matrix[area][action] =
          !permissionsState.matrix[area][action];

        var on = permissionsState.matrix[area][action];
        button.classList.toggle('on', on);
        button.textContent = on ? '✓' : '';
        button.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    });

    var save = document.getElementById('stxSavePermissionMatrix');
    if (save) {
      save.addEventListener('click', savePermissionMatrix);
    }
  }

  async function savePermissionMatrix() {
    var selected = selectedPermissionAdmin();
    var feedback = document.getElementById('stxPermissionMessage');
    var save = document.getElementById('stxSavePermissionMatrix');
    var level = document.getElementById('stxPermissionLevel');

    if (!selected || !isRichdhin()) return;

    var permissions = [];
    Object.keys(permissionsState.matrix).forEach(function (area) {
      var actions = permissionsState.matrix[area];
      if (actions.view) permissions.push(area);
      PERMISSION_ACTIONS.forEach(function (action) {
        if (actions[action]) permissions.push(area + '_' + action);
      });
    });

    save.disabled = true;
    save.textContent = 'Saving…';

    try {
      await api(
        'PATCH',
        '/api/stratex/admins/' + encodeURIComponent(selected.id) + '/permissions',
        {
          adminRole: level ? level.value : 'Employee',
          permissions: permissions
        }
      );

      setMessage(feedback, 'Permissions updated successfully.', 'success');
      await loadPermissions();
    } catch (error) {
      setMessage(
        feedback,
        error.message || 'Permissions could not be saved.',
        'error'
      );
    } finally {
      save.disabled = false;
      save.textContent = 'Save permission changes';
    }
  }

  async function loadPermissions() {
    var module = document.getElementById('module-permissions');
    if (!module) return;

    module.innerHTML =
      '<div class="stx-module-head"><div><h2>Permissions</h2><p>Loading internal access records.</p></div></div>' +
      '<div class="loading-state"><div class="spinner"></div></div>';

    try {
      var data = await api('GET', '/api/stratex/org');
      permissionsState.admins = data.admins || [];

      if (
        !permissionsState.selectedId ||
        !permissionsState.admins.some(function (admin) {
          return String(admin.id) === String(permissionsState.selectedId);
        })
      ) {
        var preferred = permissionsState.admins.find(function (admin) {
          return String(admin.email || '').toLowerCase() !== RICHDHIN_EMAIL;
        }) || permissionsState.admins[0];
        permissionsState.selectedId = preferred ? preferred.id : '';
      }

      permissionsState.matrix = permissionsForAdmin(selectedPermissionAdmin());
      renderPermissionsModule();
    } catch (error) {
      module.innerHTML =
        '<div class="stx-module-head"><div><h2>Permissions</h2><p>Permission records could not be loaded.</p></div></div>' +
        '<div class="stx-admin-error">' +
          escapeHtml(error.message || 'Permissions are unavailable.') +
        '</div>';
    }
  }

  function showPermissionsPage() {
    var content = document.querySelector('.stx-admin-content');
    if (!content) return;

    document.querySelectorAll('.stx-company-module').forEach(function (module) {
      module.hidden = true;
    });

    var module = document.getElementById('module-permissions');
    if (!module) {
      module = document.createElement('section');
      module.className = 'stx-company-module';
      module.id = 'module-permissions';
      content.appendChild(module);
    }

    module.hidden = false;

    updateTopRoute('permissions');
    markActiveNavigation('permissions');
    moveDetailPanel(module);
    loadPermissions();
  }

  function transformProfile() {
    var module = document.getElementById('module-profile');
    if (!module || module.dataset.exactPage === '1') return;
    module.dataset.exactPage = '1';

    stylePageHead(
      module,
      'My Profile',
      'Your Stratex role, reporting lines and internal access information.'
    );

    addPageActions(module, [
      {
        label: 'Change password',
        action: function () { openModule('settings'); }
      },
      {
        label: 'Edit profile',
        className: 'primary',
        action: function () {
          var details = document.getElementById('profileDetails');
          if (details) details.scrollIntoView({behavior: 'smooth'});
        }
      }
    ]);
  }

  function transformContracts() {
    var module = document.getElementById('module-contracts');
    if (!module || module.dataset.exactPage === '1') return;
    module.dataset.exactPage = '1';

    stylePageHead(
      module,
      'Contracts & Pay',
      'Private records controlled by reporting-line permissions.'
    );

    var head = module.querySelector('.stx-module-head');
    if (head) {
      head.insertAdjacentHTML(
        'afterend',
        note(
          'gold',
          'Permission model',
          'Richdhin can view leadership and both reporting lines. Directors can view themselves and their own reporting line.'
        )
      );
    }

    addPageActions(module, [{
      label: 'Upload contract',
      className: 'primary',
      action: function () {
        var manage = module.querySelector('[data-contract-detail]');
        if (manage) manage.click();
      }
    }]);
  }

  function transformHiring() {
    var module = document.getElementById('module-hiring');
    if (!module || module.dataset.exactPage === '1') return;
    module.dataset.exactPage = '1';

    stylePageHead(
      module,
      'Hiring',
      'Roles first, then applicants inside the selected role.'
    );

    addPageActions(module, [{
      label: 'Add role',
      className: 'primary',
      action: function () {
        var publicCareers = module.querySelector('a[href="/careers"]');
        if (publicCareers) publicCareers.focus();
      }
    }]);

    var layout = module.querySelector('.stx-admin-two-col');
    if (layout) {
      layout.style.gridTemplateColumns = '1fr';
    }
  }

  function transformConcerns() {
    var module = document.getElementById('module-concerns');
    if (!module || module.dataset.exactPage === '1') return;
    module.dataset.exactPage = '1';

    stylePageHead(
      module,
      'Trust & Concerns',
      'Sensitive safeguarding, access, privacy and conduct reports.'
    );

    var head = module.querySelector('.stx-module-head');
    if (head) {
      head.insertAdjacentHTML(
        'afterend',
        '<div class="stx-board-metrics">' +
          metric('Open reports', '—', 'All types', 'red', 'stxTrustOpen') +
          metric('High severity', '—', 'Urgent review', 'red', 'stxTrustHigh') +
          metric('Assigned', '—', 'Named owners', 'blue', 'stxTrustAssigned') +
          metric('Closed this month', '—', 'Completed', '', 'stxTrustClosed') +
        '</div>' +
        note(
          'red',
          'Sensitive and private',
          'Concern data and evidence must never be public, crawlable or available through unsigned URLs.'
        )
      );
    }

    loadConcernMetrics();
  }

  async function loadConcernMetrics() {
    try {
      var data = await api('GET', '/api/stratex-website/leads?limit=500');
      var rows = (data.data || []).filter(function (row) {
        return /concern/i.test(String(row.lead_type || row.type || ''));
      });

      var set = function (id, value) {
        var node = document.getElementById(id);
        if (node) node.textContent = Number(value || 0).toLocaleString('en-GB');
      };

      set('stxTrustOpen', rows.filter(function (row) {
        return !/closed|resolved/i.test(String(row.status || ''));
      }).length);

      set('stxTrustHigh', rows.filter(function (row) {
        return /high|urgent/i.test(String(row.priority || row.severity || ''));
      }).length);

      set('stxTrustAssigned', rows.filter(function (row) {
        return !!(row.assigned_to || row.owner);
      }).length);

      var now = new Date();
      set('stxTrustClosed', rows.filter(function (row) {
        var date = new Date(row.updated_at || row.created_at || 0);
        return /closed|resolved/i.test(String(row.status || '')) &&
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear();
      }).length);
    } catch (_) {}
  }

  function transformSettings() {
    var module = document.getElementById('module-settings');
    if (!module || module.dataset.exactPage === '1') return;
    module.dataset.exactPage = '1';

    stylePageHead(
      module,
      'Settings',
      'Stratex company settings only. ScoutLink product settings remain separate.'
    );

    addPageActions(module, [{
      label: 'Save settings',
      className: 'primary',
      action: function () {
        var activeForm = module.querySelector('form');
        if (activeForm && typeof activeForm.requestSubmit === 'function') {
          activeForm.requestSubmit();
        }
      }
    }]);
  }

  function transformShowcase() {
    var module = document.getElementById('module-showcase');
    if (!module || module.dataset.exactPage === '1') return;
    module.dataset.exactPage = '1';

    stylePageHead(
      module,
      'Showcase Event',
      'Manage showcase events while preserving ScoutLink notifications.'
    );

    addPageActions(module, [{
      label: 'Create showcase event',
      className: 'primary',
      action: function () {
        var form = document.getElementById('showcaseForm');
        if (form) form.scrollIntoView({behavior: 'smooth'});
      }
    }]);
  }

  function transformAwards() {
    var module = document.getElementById('module-awards');
    if (!module || module.dataset.exactPage === '1') return;
    module.dataset.exactPage = '1';

    stylePageHead(
      module,
      'Award Ceremonies',
      'Manage ceremonies, categories and ScoutLink notification audiences.'
    );

    addPageActions(module, [{
      label: 'Create award ceremony',
      className: 'primary',
      action: function () {
        var form = document.getElementById('awardNominationForm');
        if (form) form.scrollIntoView({behavior: 'smooth'});
      }
    }]);
  }

  function transformGenericSurfaces(module) {
    if (!module) return;

    module.querySelectorAll('.stx-admin-surface').forEach(function (surface) {
      surface.classList.add('stx-board-card');
    });

    module.querySelectorAll('.stx-admin-row-head, .stx-admin-table-toolbar')
      .forEach(function (head) {
        head.classList.add('stx-board-card-head');
      });

    module.querySelectorAll('.stx-admin-table-wrap').forEach(function (table) {
      table.classList.add('stx-board-table');
    });
  }

  function transformModule(id) {
    var module = document.getElementById('module-' + id);
    if (!module) return;

    transformGenericSurfaces(module);

    if (id === 'dashboard') rebuildDashboard();
    if (id === 'registrations') transformRegistrations();
    if (id === 'contactForms') transformContactForms();
    if (id === 'crm') transformCrm();
    if (id === 'activity') transformActivity();
    if (id === 'blog') transformBlog();
    if (id === 'leadership') transformLeadership();
    if (id === 'org') transformOrg();
    if (id === 'adminUsers') transformAdminUsers();
    if (id === 'profile') transformProfile();
    if (id === 'contracts') transformContracts();
    if (id === 'hiring') transformHiring();
    if (id === 'concerns') transformConcerns();
    if (id === 'settings') transformSettings();
    if (id === 'showcase') transformShowcase();
    if (id === 'awards') transformAwards();

    bindBoardSwitches(module);
  }

  function markActiveNavigation(id) {
    document.querySelectorAll('.stx-admin-nav-item').forEach(function (button) {
      var buttonId =
        button.dataset.adminModule ||
        button.dataset.exactModule ||
        '';
      var active = buttonId === id;
      button.classList.toggle('active', active);
      if (active) {
        button.setAttribute('aria-current', 'page');
      } else {
        button.removeAttribute('aria-current');
      }
    });
  }

  function updateTopRoute(id) {
    var title = document.getElementById('stxAdminTitle');
    var route = document.getElementById('stxExactTopRoute');
    if (title) title.textContent = BOARD_NAMES[id] || 'Dashboard';
    if (route) route.textContent =
      (BOARD_ROUTES[id] || pathNow()) +
      ' · Stratex internal administration';
  }

  function moveDetailPanel(module) {
    var panel = document.getElementById('stxAdminDetailPanel');
    if (!panel || !module) return;
    if (panel.parentElement !== module) module.appendChild(panel);
  }

  function watchDetailPanel() {
    var panel = document.getElementById('stxAdminDetailPanel');
    if (!panel || detailObserver) return;

    detailObserver = new MutationObserver(function () {
      if (panel.hidden) return;
      var active = document.querySelector('.stx-company-module:not([hidden])');
      if (active) moveDetailPanel(active);
    });

    detailObserver.observe(panel, {
      attributes: true,
      attributeFilter: ['hidden']
    });
  }

  function applyRoutePresentation(forcedId) {
    var id = forcedId || moduleFromPath();

    if (id === 'permissions') {
      showPermissionsPage();
      return;
    }

    var module = document.getElementById('module-' + id);
    if (!module) return;

    transformModule(id);
    updateTopRoute(id);
    markActiveNavigation(id);
    moveDetailPanel(module);

    if (id === 'adminUsers' && pathNow() !== BOARD_ROUTES.adminUsers) {
      history.replaceState({}, '', BOARD_ROUTES.adminUsers);
    }
  }

  function bindRouteWatcher() {
    window.addEventListener('popstate', function () {
      setTimeout(function () {
        applyRoutePresentation();
      }, 0);
    });

    document.querySelectorAll('[data-admin-module]').forEach(function (button) {
      if (button.dataset.exactRouteBound === '1') return;
      button.dataset.exactRouteBound = '1';

      button.addEventListener('click', function () {
        setTimeout(function () {
          var id = button.dataset.adminModule;
          if (BOARD_ROUTES[id]) {
            transformModule(id);
            updateTopRoute(id);
            markActiveNavigation(id);
            moveDetailPanel(document.getElementById('module-' + id));
          }
          closeMobileMenu();
        }, 0);
      });
    });
  }

  function enhanceShell() {
    if (exactStarted) return;

    var layout = document.querySelector('.stx-admin-layout');
    if (!layout) return;

    exactStarted = true;
    loginStarted = false;

    document.body.classList.add('stx-exact-board-v3');
    document.body.classList.remove('stratex-admin-complete-v2');

    rebuildSidebar();
    rebuildTopBar();

    Object.keys(BOARD_NAMES).forEach(function (id) {
      if (id !== 'permissions') transformModule(id);
    });

    bindRouteWatcher();
    watchDetailPanel();

    var initial = moduleFromPath();

    if (initial === 'adminUsers') {
      var oldAdmin = document.querySelector('[data-admin-module="adminUsers"]');
      if (oldAdmin) oldAdmin.click();
      setTimeout(function () {
        applyRoutePresentation('adminUsers');
      }, 0);
    } else {
      applyRoutePresentation(initial);
    }
  }

  function observePage() {
    if (observer) return;

    observer = new MutationObserver(function () {
      var oldLogin = document.querySelector('.stx-admin-login-screen');

      if (oldLogin && !loginStarted) {
        renderExactLogin();
        return;
      }

      if (document.querySelector('.stx-admin-layout')) {
        enhanceShell();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function start() {
    document.body.classList.add('stx-exact-board-v3');
    document.body.classList.remove('stratex-admin-complete-v2');

    observePage();

    if (document.querySelector('.stx-admin-login-screen')) {
      renderExactLogin();
      return;
    }

    if (document.querySelector('.stx-admin-layout')) {
      enhanceShell();
    }
  }

  start();
})();
