(function () {
  'use strict';

  var MODULES = [
    ['dashboard', 'Dashboard', 'Company overview'],
    ['registrations', 'Registrations', 'ScoutLink access requests'],
    ['contactForms', 'Website Leads', 'Form enquiries'],
    ['crm', 'CRM', 'Website and product contacts'],
    ['activity', 'Website Activity', 'Traffic and engagement'],
    ['blog', 'Blog / Learning Centre', 'Articles, views and live posts'],
    ['leadership', 'Leadership', 'Public leadership profiles'],
    ['org', 'Org Directory', 'Reporting hierarchy'],
    ['adminUsers', 'Users', 'Management and employee access'],
    ['profile', 'My Profile', 'Your Stratex record'],
    ['contracts', 'Contracts & Pay', 'HR documents'],
    ['leave', 'Leave / Sick Leave', 'Absence records'],
    ['hiring', 'Hiring', 'Jobs and applicants'],
    ['meetings', 'Meetings', 'Internal meetings'],
    ['concerns', 'Trust & Concerns', 'Safeguarding and reports'],
    ['showcase', 'Showcase Event', 'ScoutLink event operations'],
    ['awards', 'Award Ceremonies', 'ScoutLink awards operations'],
    ['settings', 'Settings', 'Company settings']
  ];
  var MODULE_BY_ID = MODULES.reduce(function (acc, item) {
    acc[item[0]] = item;
    return acc;
  }, {});
  var MODULE_PATHS = {
    dashboard: '/admin',
    registrations: '/admin/registrations',
    contactForms: '/admin/contact-forms',
    crm: '/admin/crm',
    activity: '/admin/website-activity',
    blog: '/admin/blog',
    leadership: '/admin/leadership',
    org: '/admin/org-charts',
    adminUsers: '/admin/admin-users',
    profile: '/admin/my-profile',
    contracts: '/admin/contracts-pay',
    leave: '/admin/leave-sick-leave',
    hiring: '/admin/hiring',
    meetings: '/admin/meetings',
    concerns: '/admin/trust-concerns',
    settings: '/admin/settings',
    showcase: '/admin/showcase-event',
    awards: '/admin/award-ceremonies'
  };
  var PATH_TO_MODULE = Object.keys(MODULE_PATHS).reduce(function (acc, id) {
    acc[MODULE_PATHS[id]] = id;
    return acc;
  }, {});
  PATH_TO_MODULE['/admin/website-leads'] = 'contactForms';
  PATH_TO_MODULE['/admin/org-directory'] = 'org';
  PATH_TO_MODULE['/admin/users'] = 'adminUsers';
  PATH_TO_MODULE['/admin/leave'] = 'leave';
  PATH_TO_MODULE['/admin/showcase-events'] = 'showcase';
  PATH_TO_MODULE['/admin/award-nominations'] = 'awards';
  var MODULE_ICONS = {
    dashboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v4H4zM14 15h6v4h-6z"/></svg>',
    activity: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18h16M6 15l4-4 3 3 5-7"/><path d="M18 7h2v2"/></svg>',
    contactForms: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4z"/><path d="m4 7 8 6 8-6"/></svg>',
    registrations: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h12v16H6z"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>',
    crm: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a6 6 0 0 1 12 0"/><path d="M17 10h4M19 8v4M16 16h5"/></svg>',
    blog: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
    leadership: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 4v5c0 4-3 7-7 9-4-2-7-5-7-9V7z"/><path d="M9 12l2 2 4-5"/></svg>',
    org: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v6M6 14v6M18 14v6M6 14h12M12 10h6"/><circle cx="12" cy="4" r="2"/><circle cx="6" cy="20" r="2"/><circle cx="18" cy="20" r="2"/></svg>',
    adminUsers: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M16 11h6"/></svg>',
    profile: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    contracts: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></svg>',
    leave: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v4M17 3v4M4 8h16M5 5h14v16H5z"/><path d="M9 14h6"/></svg>',
    hiring: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M4 7h16v13H4z"/><path d="M9 13h6"/></svg>',
    meetings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14v10H8l-3 3z"/><path d="M8 10h8M8 13h5"/></svg>',
    concerns: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 3 21h18z"/><path d="M12 9v5M12 17h.01"/></svg>',
    settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.8-1L12.5 3h-4l-.4 3.1a7 7 0 0 0-1.8 1l-2.4-1-2 3.4L4 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.8 1l.4 3.1h4l.4-3.1a7 7 0 0 0 1.8-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.6.1-1z"/></svg>',
    showcase: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v14H5zM8 3v4M16 3v4M5 10h14"/><path d="M9 15h6"/></svg>',
    awards: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l3 6 6 .9-4.5 4.3 1.1 6.1L12 17l-5.6 3.3 1.1-6.1L3 9.9 9 9z"/></svg>'
  };
  var DASHBOARD_GROUPS = [
    ['Operations', ['registrations', 'contactForms', 'crm', 'activity']],
    ['Content', ['blog', 'leadership']],
    ['People', ['org', 'adminUsers', 'profile', 'contracts', 'leave', 'hiring', 'meetings']],
    ['Trust and Events', ['concerns', 'showcase', 'awards']],
    ['Platform', ['settings']]
  ];
  var DETAIL_ROWS = {};
  var DETAIL_META = {};
  var popstateBound = false;

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function userName() {
    var user = Auth && Auth.user ? Auth.user : {};
    return [user.firstName || user.first_name, user.lastName || user.last_name].filter(Boolean).join(' ') || user.email || 'Stratex Admin';
  }

  function initials() {
    return userName().split(/\s+/).map(function (part) { return part.charAt(0); }).join('').slice(0, 2).toUpperCase() || 'SA';
  }

  var EMPLOYEE_MODULES = {
    dashboard: true,
    contactForms: true,
    crm: true,
    activity: true,
    profile: true,
    settings: true
  };
  var MANAGEMENT_ROLES = {
    management: true,
    'super admin': true,
    founder: true,
    operations: true,
    acquisition: true,
    'safeguarding reviewer': true,
    'product demo': true
  };

  function adminSessionUser() {
    return Auth && Auth.user ? Auth.user : {};
  }

  function rawAdminRole() {
    var user = adminSessionUser();
    return String(user.adminRole || user.admin_role || user.permissionRole || user.permission_role || user.role || user.userType || user.user_type || '').trim();
  }

  function currentAdminRole() {
    var user = adminSessionUser();
    var email = String(user.email || '').toLowerCase();
    var raw = rawAdminRole().toLowerCase();
    if (email === 'richdhin@stratexanalytics.co.uk') return 'Super Admin';
    if (email === 'lucy.ali@stratexanalytics.co.uk') return 'Management';
    if (raw === 'employee' || raw === 'read only' || raw === 'readonly') return 'Employee';
    if (raw === 'super admin' || raw === 'superadmin' || raw === 'founder') return 'Super Admin';
    if (MANAGEMENT_ROLES[raw]) return 'Management';
    return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : 'Employee';
  }

  function isManagement() {
    var role = currentAdminRole();
    return role === 'Management' || role === 'Super Admin';
  }

  function isAllowedModule(id) {
    return isManagement() || !!EMPLOYEE_MODULES[id];
  }

  function visibleModules() {
    return MODULES.filter(function (item) { return isAllowedModule(item[0]); });
  }

  function dashboardQuickActions() {
    if (!isManagement()) {
      return '<button class="stx-admin-action-card primary" data-admin-module="contactForms" type="button"><span>Review contact forms</span><small>Open website submissions</small></button>' +
        '<button class="stx-admin-action-card" data-admin-module="crm" type="button"><span>Open CRM</span><small>Manage contacts</small></button>' +
        '<button class="stx-admin-action-card danger" data-admin-logout type="button"><span>Sign out</span><small>Leave admin centre</small></button>';
    }
    return '<button class="stx-admin-action-card primary" data-admin-module="registrations" type="button"><span>Review registrations</span><small>ScoutLink access requests</small></button>' +
      '<button class="stx-admin-action-card" data-admin-module="contactForms" type="button"><span>Review contact forms</span><small>Open website submissions</small></button>' +
      '<button class="stx-admin-action-card" data-admin-module="hiring" type="button"><span>Create job role</span><small>Roles and applicants</small></button>' +
      '<button class="stx-admin-action-card" data-admin-module="blog" type="button"><span>Add Learning Centre post</span><small>Public content</small></button>' +
      '<button class="stx-admin-action-card" data-admin-module="leadership" type="button"><span>Add leadership member</span><small>Public profiles</small></button>' +
      '<button class="stx-admin-action-card" data-admin-module="showcase" type="button"><span>Manage showcase</span><small>Events and scout responses</small></button>' +
      '<button class="stx-admin-action-card" data-admin-module="awards" type="button"><span>Manage awards</span><small>Nominations and ceremonies</small></button>' +
      '<button class="stx-admin-action-card danger" data-admin-logout type="button"><span>Sign out</span><small>Leave admin centre</small></button>';
  }

  function showMessage(id, text, ok) {
    var el = document.getElementById(id);
    if (!el) return;
    el.style.display = 'block';
    el.className = 'stx-admin-message ' + (ok ? 'ok' : 'err');
    el.textContent = text;
  }

  function apiBase() {
    return typeof API !== 'undefined' ? API : 'https://scoutlink-api.vercel.app';
  }

  function storeStratexSession(data) {
    var token = data && data.token;
    var user = data && data.user;
    var type = data && data.accountType ? data.accountType : 'Stratex';
    if (!token || !user) throw new Error('The sign-in response was incomplete.');
    if (type !== 'Stratex') throw new Error('Please use a Stratex admin account for this area.');
    if (typeof Auth !== 'undefined' && Auth && typeof Auth.set === 'function') {
      Auth.set(token, user, type);
    } else {
      localStorage.setItem('sl_token', token);
      localStorage.setItem('sl_user', JSON.stringify(user));
      localStorage.setItem('sl_type', type);
    }
    if (user.id) localStorage.setItem('sl_user_id', user.id);
    if (user.email) localStorage.setItem('sl_user_email', user.email);
  }

  function logoutToLogin(event) {
    if (event && event.preventDefault) event.preventDefault();
    if (typeof Auth !== 'undefined' && Auth && typeof Auth.clear === 'function') {
      Auth.clear();
    } else {
      localStorage.removeItem('sl_token');
      localStorage.removeItem('sl_user');
      localStorage.removeItem('sl_type');
      localStorage.removeItem('sl_user_id');
      localStorage.removeItem('sl_user_email');
    }
    window.location.href = '/admin';
  }

  function startAdminShell() {
    renderAdminShell();
    if (typeof ensureStratexNotificationPanel === 'function') ensureStratexNotificationPanel();
    if (typeof updateNotifBadge === 'function') updateNotifBadge();
    bindHandlers();
    var initialModule = moduleFromPath() || decodeURIComponent((window.location.hash || '').replace(/^#/, '')) || 'dashboard';
    switchModule(initialModule, true);
    if (!popstateBound) {
      popstateBound = true;
      window.addEventListener('popstate', function () {
        switchModule(moduleFromPath() || decodeURIComponent((window.location.hash || '').replace(/^#/, '')) || 'dashboard', true);
      });
    }
  }

  function showStratexLoginError(text) {
    var error = document.getElementById('stxAdminLoginError');
    if (!error) return;
    error.textContent = text || 'Could not sign in.';
    error.classList.add('show');
  }

  function renderStratexAdminLogin(message) {
    document.body.className = 'theme-light stx-company-admin stx-admin-login-body';
    document.body.innerHTML =
      '<main class="stx-admin-login-screen">' +
        '<section class="stx-admin-login-card" aria-labelledby="stxAdminLoginTitle">' +
          '<a class="stx-admin-login-brand" href="/">Stratex<span>Analytics</span></a>' +
          '<div class="stx-admin-login-copy">' +
            '<p class="stx-eyebrow">Admin centre</p>' +
            '<h1 id="stxAdminLoginTitle">Sign in to Stratex Admin</h1>' +
            '<p>' + escapeHtml(message || 'Use your Stratex admin email and password to manage company operations.') + '</p>' +
          '</div>' +
          '<form class="stx-admin-login-form" id="stxAdminLoginForm" novalidate>' +
            '<label>Email address<input id="stxAdminEmail" name="email" type="email" autocomplete="email" placeholder="richdhin@stratexanalytics.co.uk" required></label>' +
            '<label>Password<input id="stxAdminPassword" name="password" type="password" autocomplete="current-password" placeholder="Enter your password" required></label>' +
            '<div class="stx-admin-login-error" id="stxAdminLoginError" role="alert"></div>' +
            '<button class="stx-btn stx-btn-primary" id="stxAdminLoginButton" type="submit">Sign in</button>' +
          '</form>' +
          '<p class="stx-admin-login-foot">Need the general ScoutLink login? <a href="/login">Open ScoutLink login</a>.</p>' +
        '</section>' +
      '</main>';
    var form = document.getElementById('stxAdminLoginForm');
    if (!form) return;
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      var email = document.getElementById('stxAdminEmail').value.trim();
      var password = document.getElementById('stxAdminPassword').value;
      var button = document.getElementById('stxAdminLoginButton');
      var error = document.getElementById('stxAdminLoginError');
      if (error) {
        error.textContent = '';
        error.classList.remove('show');
      }
      if (!email || email.indexOf('@') < 1 || email.indexOf('.', email.indexOf('@') + 2) < 0 || !password) {
        showStratexLoginError('Enter a valid email address and password.');
        return;
      }
      if (button) {
        button.disabled = true;
        button.textContent = 'Signing in...';
      }
      try {
        var response = await fetch(apiBase() + '/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, password: password, accountType: 'Stratex' })
        });
        var data = await response.json().catch(function () { return {}; });
        if (!response.ok) throw new Error(data.error || 'Invalid Stratex admin credentials.');
        storeStratexSession(data);
        startAdminShell();
      } catch (err) {
        showStratexLoginError(err.message || 'Could not sign in.');
      } finally {
        if (button) {
          button.disabled = false;
          button.textContent = 'Sign in';
        }
      }
    });
  }

  function rowTable(headers, rows, detail) {
    if (!rows.length) return '<div class="stx-admin-empty">No records yet.</div>';
    var key = detail && detail.key;
    if (key) {
      DETAIL_ROWS[key] = rows;
      DETAIL_META[key] = detail;
    }
    return '<div class="stx-admin-table-wrap"><table class="sl-table stx-admin-table"><thead><tr>' +
      headers.map(function (h) { return '<th>' + escapeHtml(h[0]) + '</th>'; }).join('') +
      '</tr></thead><tbody>' +
      rows.map(function (row, index) {
        var attrs = key ? ' tabindex="0" role="button" data-detail-key="' + escapeHtml(key) + '" data-detail-index="' + escapeHtml(index) + '"' : '';
        return '<tr' + attrs + '>' + headers.map(function (h) {
          var value = typeof h[2] === 'function' ? h[2](row) : escapeHtml(row[h[1]] || '');
          return '<td data-label="' + escapeHtml(h[0]) + '">' + value + '</td>';
        }).join('') + '</tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  function detailFieldsFromRow(row) {
    return Object.keys(row || {}).filter(function (key) {
      return row[key] == null || ['string', 'number', 'boolean'].indexOf(typeof row[key]) >= 0;
    }).map(function (key) {
      return { label: key.replace(/_/g, ' '), value: row[key] };
    });
  }

  function renderDetailFields(fields) {
    return '<dl class="stx-admin-detail-grid">' + fields.map(function (field) {
      var value = typeof field.value === 'function' ? field.value() : field.value;
      return '<div><dt>' + escapeHtml(field.label) + '</dt><dd>' + (field.html ? String(value || '') : escapeHtml(value || '-')) + '</dd></div>';
    }).join('') + '</dl>';
  }

  function openDetailPanel(title, subtitle, fields, actions, extraHtml) {
    var panel = document.getElementById('stxAdminDetailPanel');
    var content = document.getElementById('stxAdminDetailContent');
    var backdrop = document.getElementById('stxAdminDetailBackdrop');
    if (!panel || !content) return;
    content.innerHTML =
      '<p class="stx-eyebrow">Record detail</p>' +
      '<h2>' + escapeHtml(title || 'Record') + '</h2>' +
      (subtitle ? '<p class="stx-muted">' + escapeHtml(subtitle) + '</p>' : '') +
      renderDetailFields(fields || []) +
      (extraHtml || '') +
      (actions ? '<div class="stx-admin-inline-actions stx-admin-detail-actions">' + actions + '</div>' : '');
    panel.hidden = false;
    if (backdrop) backdrop.hidden = false;
    document.body.classList.add('stx-admin-detail-open');
    var close = document.getElementById('stxAdminDetailClose');
    if (close) close.focus();
  }

  function closeDetailPanel() {
    var panel = document.getElementById('stxAdminDetailPanel');
    var backdrop = document.getElementById('stxAdminDetailBackdrop');
    document.body.classList.remove('stx-admin-detail-open');
    if (panel) panel.hidden = true;
    if (backdrop) backdrop.hidden = true;
  }

  function openRowDetail(key, index) {
    var rows = DETAIL_ROWS[key] || [];
    var row = rows[Number(index)];
    var meta = DETAIL_META[key] || {};
    if (!row) return;
    var fields = typeof meta.fields === 'function' ? meta.fields(row) : (meta.fields || detailFieldsFromRow(row));
    var actions = typeof meta.actions === 'function' ? meta.actions(row) : '';
    var title = typeof meta.title === 'function' ? meta.title(row) : (meta.title || row.name || row.title || row.email || 'Record');
    var subtitle = typeof meta.subtitle === 'function' ? meta.subtitle(row) : (meta.subtitle || row.email || row.status || '');
    openDetailPanel(title, subtitle, fields, actions, typeof meta.extra === 'function' ? meta.extra(row) : '');
  }

  function moduleCard(id, title, copy) {
    return '<button class="stx-admin-card" type="button" data-admin-module="' + escapeHtml(id) + '">' +
      '<span class="stx-admin-card-icon" aria-hidden="true">' + (MODULE_ICONS[id] || escapeHtml(title.charAt(0))) + '</span>' +
      '<span class="stx-admin-card-text"><span>' + escapeHtml(title) + '</span><small>' + escapeHtml(copy) + '</small></span>' +
      '<span class="stx-admin-card-arrow" aria-hidden="true">&rsaquo;</span></button>';
  }

  function moduleFromPath() {
    var path = (window.location.pathname || '').replace(/\/$/, '') || '/admin';
    return PATH_TO_MODULE[path] || null;
  }

  function dashboardGroups() {
    return '<div class="stx-admin-section-groups">' + DASHBOARD_GROUPS.map(function (group) {
      var ids = group[1].filter(isAllowedModule);
      if (!ids.length) return '';
      return '<section class="stx-admin-section-group"><h3>' + escapeHtml(group[0]) + '</h3><div class="stx-admin-section-list">' +
        ids.map(function (id) {
          var item = MODULE_BY_ID[id];
          return item ? moduleCard(item[0], item[1], item[2]) : '';
        }).join('') +
      '</div></section>';
    }).join('') + '</div>';
  }

  function modulePanel(id, title, copy, body) {
    return '<section class="stx-company-module" id="module-' + escapeHtml(id) + '" hidden>' +
      '<div class="stx-module-head"><div><p class="stx-eyebrow">Stratex Analytics</p><h2>' + escapeHtml(title) + '</h2><p>' + escapeHtml(copy) + '</p></div></div>' +
      body +
    '</section>';
  }

  function renderAdminShell() {
    var modules = visibleModules();
    var roleLabel = currentAdminRole();
    document.body.className = 'theme-light stx-company-admin';
    document.body.innerHTML =
      '<div class="stx-admin-layout">' +
        '<header class="stx-admin-mobile-header">' +
          '<button class="stx-admin-menu-button" id="stxAdminMenuButton" type="button" aria-label="Open admin menu" aria-controls="stxAdminSidebar" aria-expanded="false"><span></span><span></span><span></span></button>' +
          '<a class="stx-admin-brand" href="/admin">Stratex<span>Analytics</span></a>' +
          '<a class="stx-admin-mobile-site-link" href="/" target="_blank" rel="noopener">Site</a>' +
        '</header>' +
        '<div class="stx-admin-backdrop" id="stxAdminBackdrop" tabindex="-1" aria-hidden="true"></div>' +
        '<aside class="stx-admin-sidebar" id="stxAdminSidebar" aria-label="Stratex admin menu">' +
          '<div class="stx-admin-sidebar-head"><a class="stx-admin-brand" href="/admin">Stratex<span>Analytics</span></a><button class="stx-admin-drawer-close" id="stxAdminMenuClose" type="button" aria-label="Close admin menu">Close</button></div>' +
          '<nav class="stx-admin-nav" aria-label="Stratex admin sections">' +
            modules.map(function (item) {
              return '<button class="stx-admin-nav-item" type="button" data-admin-module="' + escapeHtml(item[0]) + '">' +
                '<i class="stx-admin-nav-icon" aria-hidden="true">' + (MODULE_ICONS[item[0]] || '') + '</i><span><b>' + escapeHtml(item[1]) + '</b><small>' + escapeHtml(item[2]) + '</small></span></button>';
            }).join('') +
          '</nav>' +
          '<div class="stx-admin-sidebar-actions"><a class="stx-admin-external-link" href="/stratex/dashboard"><span>Open ScoutLink Admin</span><small>Product admin tools</small></a></div>' +
          '<div class="stx-admin-user"><div class="stx-admin-avatar">' + escapeHtml(initials()) + '</div><div><b>' + escapeHtml(userName()) + '</b><span>' + escapeHtml(roleLabel) + '</span></div></div>' +
        '</aside>' +
        '<main class="stx-admin-main">' +
          '<header class="stx-admin-topbar"><div class="stx-admin-titleblock"><p>Company admin centre - ' + escapeHtml(roleLabel) + '</p><h1 id="stxAdminTitle">Dashboard</h1></div><div class="stx-admin-top-actions"><a class="btn btn-sm btn-outline" href="/" target="_blank" rel="noopener">Open Stratex site</a><button class="btn btn-sm btn-ghost" data-admin-logout type="button">Sign out</button></div></header>' +
          '<div class="stx-admin-content">' +
            modulePanel('dashboard', 'Dashboard', 'A clean operating view for Stratex Analytics, separate from ScoutLink product administration.',
              '<div class="stx-admin-hero"><div><p class="stx-eyebrow">Welcome</p><h2>' + escapeHtml(userName()) + '</h2><p>' + (isManagement() ? 'Manage the company website, public content, contact forms, hiring, team records and trust routes from here.' : 'Review assigned company activity, CRM records, website traffic, your own profile and account settings from here.') + '</p></div><div class="stx-admin-identity-row"><div class="stx-admin-avatar">' + escapeHtml(initials()) + '</div><div><b>' + escapeHtml(userName()) + '</b><span>' + escapeHtml(roleLabel) + '</span></div></div></div>' +
              '<div class="stx-admin-quick-actions">' + dashboardQuickActions() + '</div>' +
              dashboardGroups()) +
            modulePanel('activity', 'Website Activity', 'Public Stratex site traffic, page performance and visitor sessions.',
              '<div class="stx-admin-surface"><div class="stx-admin-table-toolbar"><div><h3>Traffic overview</h3><p>Headline analytics stay focused on traffic, not CRM, blog likes or product records.</p></div><button class="btn btn-sm btn-outline" id="refreshActivityBtn" type="button">Refresh</button></div><div class="stx-admin-filter-row"><label>Page<select class="form-control" id="activityPageFilter"><option value="">All public pages</option><option>/</option><option>/scoutlink</option><option>/scoutlink/compatibility-score</option><option>/pricing</option><option>/leadership</option><option>/careers</option><option>/learning-centre</option></select></label><label>Date range<select class="form-control" id="activityDateFilter"><option value="30">Last 30 days</option><option value="7">Last 7 days</option><option value="90">Last 90 days</option><option value="all">All time</option></select></label></div><div class="stx-admin-kpis"><div><b id="activityPageViews">-</b><span>Total page views</span></div><div><b id="activitySessions">-</b><span>Sessions</span></div><div><b id="activityVisitors">-</b><span>Unique visitors</span></div></div><div id="activityBreakdownRows" class="loading-state"><div class="spinner"></div></div></div>') +
            modulePanel('contactForms', 'Website Leads', 'Contact, demo, newsletter and concern submissions from the Stratex public website.',
              '<div class="stx-admin-surface"><div class="stx-admin-row-head"><h3>Recent website submissions</h3><button class="btn btn-sm btn-outline" id="refreshContactFormsBtn" type="button">Refresh</button></div><div id="contactFormRows" class="loading-state"><div class="spinner"></div></div></div>') +
            modulePanel('registrations', 'Registrations', 'ScoutLink registration and access records with product context.',
              '<div class="stx-admin-surface"><div class="stx-admin-table-toolbar"><div><h3>Registration records</h3><p>Review ScoutLink coach and scout registration records from the Stratex admin centre.</p></div><div class="stx-admin-filter-row compact"><label>Product<select class="form-control" id="registrationProductFilter"><option value="">All products</option><option value="ScoutLink">ScoutLink</option></select></label><label>Status<select class="form-control" id="registrationStatusFilter"><option value="">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="declined">Declined</option></select></label><button class="btn btn-sm btn-outline" id="refreshRegistrationsBtn" type="button">Refresh</button></div></div><div id="registrationRows" class="loading-state"><div class="spinner"></div></div></div>') +
            modulePanel('crm', 'CRM', 'One place for public website contacts and ScoutLink registration/application contacts.',
              '<div class="stx-admin-surface"><div class="stx-admin-row-head"><h3>CRM records</h3><a class="btn btn-sm btn-primary" href="#" id="crmExportBtn">Export CSV</a></div><div id="crmRows" class="loading-state"><div class="spinner"></div></div></div>') +
            modulePanel('blog', 'Blog / Learning Centre', 'Create public learning posts and monitor live engagement.',
              '<div class="stx-admin-stack"><form class="stx-admin-surface" id="blogForm"><h3>Create Learning Centre post</h3>' +
              input('Title', 'title', 'text', true) + input('Category', 'category', 'text', false, 'Football intelligence') +
              textarea('Excerpt', 'excerpt', 3) + editorToolbar() + textarea('Body', 'body', 10, true) +
              '<label class="form-group"><span>Status</span><select class="form-control" name="status"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>' +
              '<div class="form-message" id="blogMsg" style="display:none"></div><button class="btn btn-primary" type="submit">Save post</button></form>' +
              '<div class="stx-admin-surface"><div class="stx-admin-row-head"><h3>Posts</h3><a class="btn btn-sm btn-outline" href="/learning-centre" target="_blank" rel="noopener">Public Learning Centre</a></div><div id="blogDetailPanel" class="stx-admin-blog-detail" hidden></div><div id="blogRows" class="loading-state"><div class="spinner"></div></div></div></div>') +
            modulePanel('leadership', 'Leadership', 'Manage crawlable public leadership profiles and image URLs.',
              '<div class="stx-admin-stack"><form class="stx-admin-surface" id="leadershipForm"><h3>Add leadership member</h3>' +
              input('Full name', 'fullName', 'text', true) + input('Email', 'email', 'email') + input('Job title', 'jobTitle', 'text', true) +
              '<label class="form-group"><span>Upload image</span><input class="form-control" name="imageFile" type="file" accept="image/jpeg,image/png,image/webp"></label>' +
              input('Image URL', 'imageUrl', 'url', false, '/images/leadership/name.jpg') + input('LinkedIn URL', 'linkedinUrl', 'url') +
              input('Profile chip', 'focusChip', 'text') + textarea('Summary', 'summary', 3) +
              '<label class="form-group"><span>User type</span><select class="form-control" name="permissionRole"><option>Management</option><option>Employee</option></select></label>' +
              textarea('Bio', 'bio', 5) + input('Display order', 'displayOrder', 'number', false, '100') +
              '<div class="form-message" id="leadershipMsg" style="display:none"></div><button class="btn btn-primary" type="submit">Save leadership member</button></form>' +
              '<div class="stx-admin-surface"><div class="stx-admin-row-head"><h3>Leadership profiles</h3><a class="btn btn-sm btn-outline" href="/leadership" target="_blank" rel="noopener">Public Leadership</a></div><div id="leadershipRows" class="loading-state"><div class="spinner"></div></div></div></div>') +
            modulePanel('org', 'Org Directory', 'Maintain Stratex reporting lines, roles, permissions and direct reports without leaving the company admin centre.', orgPanel()) +
            modulePanel('adminUsers', 'Users', 'Invite, review and manage Management and Employee access for Stratex Analytics.', adminUsersPanel()) +
            modulePanel('profile', 'My Profile', 'Your Stratex identity, reporting line and own company records.', profilePanel()) +
            modulePanel('contracts', 'Contracts & Pay', 'Restricted HR records with private contract access and permissioned pay visibility.', contractsPanel()) +
            modulePanel('leave', 'Leave / Sick Leave', 'Record and review absence without crowding the org chart.', leavePanel()) +
            modulePanel('hiring', 'Hiring', 'Create roles, review applications and manage careers activity inside Stratex Admin.', hiringPanel()) +
            modulePanel('meetings', 'Meetings', 'Book and review internal Stratex meetings.', meetingsPanel()) +
            modulePanel('concerns', 'Trust & Concerns', 'Review safeguarding, privacy and platform concerns submitted through Stratex routes.', concernsPanel()) +
            modulePanel('settings', 'Settings', 'Company, website, CRM, blog and admin dashboard settings scoped to Stratex Analytics.', settingsPanel()) +
            modulePanel('showcase', 'Showcase Event', 'Manage ScoutLink showcase events from the Stratex operating centre while preserving event notifications.', showcasePanel()) +
            modulePanel('awards', 'Award Ceremonies', 'Manage award nominations and ceremonies from the Stratex operating centre while preserving nomination actions.', awardsPanel()) +
            '<section class="stx-company-module" id="module-accessDenied" hidden><div class="stx-admin-surface"><p class="stx-eyebrow">Access denied</p><h2>Super Admin or Management access required</h2><p class="stx-muted">This section is restricted to authorised Stratex admin users. Your menu only shows the areas available to your account.</p><div class="stx-admin-inline-actions"><button class="btn btn-primary" data-admin-module="dashboard" type="button">Back to dashboard</button><button class="btn btn-outline" data-admin-module="contactForms" type="button">Open contact forms</button></div></div></section>' +
          '</div>' +
        '</main>' +
        '<div class="stx-admin-detail-backdrop" id="stxAdminDetailBackdrop" hidden></div>' +
        '<aside class="stx-admin-detail-panel" id="stxAdminDetailPanel" aria-label="Admin record detail" hidden><button class="stx-admin-detail-close" id="stxAdminDetailClose" type="button">Close</button><div id="stxAdminDetailContent"></div></aside>' +
      '</div>';
  }

  function orgPanel() {
    return '<div class="stx-admin-surface"><div class="stx-admin-row-head"><h3>Team structure</h3><button class="btn btn-sm btn-outline" id="refreshOrgBtn" type="button">Refresh</button></div><div class="stx-admin-kpis" id="orgKpis"><div><b>-</b><span>Team members</span></div><div><b>-</b><span>Active records</span></div><div><b>-</b><span>Managers</span></div></div><div id="orgRows" class="loading-state"><div class="spinner"></div></div></div>';
  }

  function adminUsersPanel() {
    return '<div class="stx-admin-two-col"><form class="stx-admin-surface" id="adminUserForm"><h3>Invite admin user</h3>' +
      '<div class="form-row">' + input('First name', 'firstName', 'text', true) + input('Last name', 'lastName', 'text', true) + '</div>' +
      input('Email', 'emailAddr', 'email', true, 'name@stratexanalytics.co.uk') +
      input('Job title', 'jobTitle', 'text', false, 'e.g. Operations Executive') +
      '<label class="form-group"><span>Manager</span><select class="form-control" id="adminUserManager" name="managerId"><option value="">No manager</option></select></label>' +
      '<label class="form-group"><span>User type</span><select class="form-control" name="adminRole"><option>Employee</option><option>Management</option></select></label>' +
      '<p class="stx-muted">Only Management users can invite or update Stratex admin users. Invites use the same complete-signup email flow as other ScoutLink accounts.</p>' +
      '<div class="form-message" id="adminUserMsg" style="display:none"></div><button class="btn btn-primary" type="submit">Send invite</button></form>' +
      '<div class="stx-admin-surface"><div class="stx-admin-row-head"><h3>Admin users</h3><button class="btn btn-sm btn-outline" id="refreshAdminUsersBtn" type="button">Refresh</button></div><div id="adminUserRows" class="loading-state"><div class="spinner"></div></div></div></div>';
  }

  function profilePanel() {
    return '<div class="stx-admin-two-col"><div class="stx-admin-surface"><h3>Your Stratex record</h3><div id="profileDetails" class="loading-state"><div class="spinner"></div></div></div><div class="stx-admin-surface"><h3>Reporting view</h3><div id="profileReports" class="stx-admin-empty">Open this page to load your manager, direct reports and upcoming leave.</div></div></div>';
  }

  function contractsPanel() {
    return '<div class="stx-admin-surface"><div class="stx-admin-row-head"><h3>Contracts and pay</h3><button class="btn btn-sm btn-outline" id="refreshContractsBtn" type="button">Refresh</button></div><p class="stx-muted">Contract files stay private. Downloads are generated as short-lived secure links by the backend.</p><div id="contractRows" class="loading-state"><div class="spinner"></div></div></div>';
  }

  function leavePanel() {
    return '<div class="stx-admin-two-col"><form class="stx-admin-surface" id="leaveForm"><h3>Book leave / sick leave</h3><label class="form-group"><span>Person</span><select class="form-control" id="leavePerson" name="stratexId" required><option value="">Loading team...</option></select></label><label class="form-group"><span>Leave type</span><select class="form-control" name="leaveType" required><option>Annual leave</option><option>Sick leave</option><option>Compassionate leave</option><option>Unpaid leave</option></select></label><div class="form-row"><label class="form-group"><span>Start date</span><input class="form-control" name="startDate" type="date" required></label><label class="form-group"><span>End date</span><input class="form-control" name="endDate" type="date" required></label></div><label class="form-group"><span>Notes</span><textarea class="form-control" name="notes" rows="4"></textarea></label><div class="form-message" id="leaveMsg" style="display:none"></div><button class="btn btn-primary" type="submit">Save leave</button></form><div class="stx-admin-surface"><h3>Recent absence records</h3><div id="leaveRows" class="loading-state"><div class="spinner"></div></div></div></div>';
  }

  function hiringPanel() {
    return '<div class="stx-admin-two-col"><div class="stx-admin-surface"><div class="stx-admin-row-head"><h3>Open roles</h3><a class="btn btn-sm btn-outline" href="/careers" target="_blank" rel="noopener">Public careers</a></div><div id="hiringRows" class="loading-state"><div class="spinner"></div></div></div><div class="stx-admin-surface"><div class="stx-admin-row-head"><h3>Applications</h3><button class="btn btn-sm btn-outline" id="refreshHiringBtn" type="button">Refresh</button></div><div id="applicationRows" class="stx-admin-empty">Applications will appear here when candidates apply.</div></div></div>';
  }

  function meetingsPanel() {
    return '<div class="stx-admin-two-col"><form class="stx-admin-surface" id="meetingForm"><h3>Book meeting</h3>' + input('Meeting title', 'title', 'text', true) + '<label class="form-group"><span>Date and time</span><input class="form-control" name="meetingDate" type="datetime-local" required></label>' + input('Location or video link', 'location', 'text') + '<label class="form-group"><span>Attendees</span><select class="form-control" id="meetingAttendees" multiple size="5"></select></label>' + textarea('Agenda / notes', 'notes', 5) + '<div class="form-message" id="meetingMsg" style="display:none"></div><button class="btn btn-primary" type="submit">Book meeting</button></form><div class="stx-admin-surface"><h3>Upcoming meetings</h3><div id="meetingRows" class="loading-state"><div class="spinner"></div></div></div></div>';
  }

  function concernsPanel() {
    return '<div class="stx-admin-surface"><div class="stx-admin-row-head"><h3>Concern queue</h3><button class="btn btn-sm btn-outline" id="refreshConcernsBtn" type="button">Refresh</button></div><p class="stx-muted">This queue is sourced from Stratex and ScoutLink concern routes. Sensitive detail remains in restricted backend records.</p><div id="concernRows" class="loading-state"><div class="spinner"></div></div></div>';
  }

  function settingsPanel() {
    var management = isManagement();
    return '<div class="stx-admin-two-col settings-layout">' +
      '<form class="stx-admin-surface" id="stratexPasswordForm"><h3>Account & security</h3>' +
        '<label class="form-group"><span>Current password</span><input class="form-control" name="currentPassword" type="password" autocomplete="current-password"></label>' +
        '<label class="form-group"><span>New password</span><input class="form-control" name="newPassword" type="password" autocomplete="new-password" minlength="8" placeholder="Minimum 8 characters"></label>' +
        '<label class="form-group"><span>Confirm new password</span><input class="form-control" name="confirmPassword" type="password" autocomplete="new-password"></label>' +
        '<p class="stx-muted">Use a strong password. Changes apply to your Stratex admin login.</p><div class="form-message" id="stratexPasswordMsg" style="display:none"></div><button class="btn btn-primary" type="submit">Save password</button>' +
      '</form>' +
      '<form class="stx-admin-surface" id="stratexPreferencesForm"><h3>Personal preferences</h3>' +
        '<label class="form-group"><span>Timezone</span><select class="form-control" name="timezone"><option>Europe/London</option><option>UTC</option></select></label>' +
        '<label class="form-group"><span>Date format</span><select class="form-control" name="dateFormat"><option>10 Jul 2026</option><option>2026-07-10</option></select></label>' +
        '<label class="form-group"><span>Notifications</span><select class="form-control" name="notifications"><option>Important admin updates</option><option>All assigned updates</option><option>Email only</option></select></label>' +
        '<div class="form-message" id="stratexPreferencesMsg" style="display:none"></div><button class="btn btn-primary" type="submit">Save preferences</button>' +
      '</form>' +
      (management ? '<form class="stx-admin-surface" id="stratexCompanySettingsForm"><h3>Company settings</h3>' +
        '<label class="form-group"><span>Company name</span><input class="form-control" name="companyName" value="Stratex Analytics"></label>' +
        '<label class="form-group"><span>Support email</span><input class="form-control" name="supportEmail" type="email" value="info@scoutlink.app"></label>' +
        '<label class="form-group"><span>Public contact routing</span><select class="form-control" name="routing"><option>Send to CRM and contact forms</option><option>Send to CRM only</option></select></label>' +
        '<div class="form-message" id="stratexCompanySettingsMsg" style="display:none"></div><button class="btn btn-primary" type="submit">Save company settings</button>' +
      '</form><form class="stx-admin-surface" id="stratexNotificationSettingsForm"><h3>Management notifications</h3>' +
        '<label class="form-group"><span>Registration alerts</span><select class="form-control" name="registrationAlerts"><option>Enabled</option><option>Disabled</option></select></label>' +
        '<label class="form-group"><span>Hiring alerts</span><select class="form-control" name="hiringAlerts"><option>Enabled</option><option>Disabled</option></select></label>' +
        '<label class="form-group"><span>Trust concern alerts</span><select class="form-control" name="trustAlerts"><option>Immediate</option><option>Daily summary</option></select></label>' +
        '<div class="form-message" id="stratexNotificationSettingsMsg" style="display:none"></div><button class="btn btn-primary" type="submit">Save notification rules</button>' +
      '</form>' : '') +
    '</div>';
  }

  function showcasePanel() {
    return '<div class="stx-admin-stack">' +
      '<form class="stx-admin-surface" id="showcaseForm"><div class="stx-admin-row-head"><h3>Create showcase event</h3><button class="btn btn-sm btn-outline" id="refreshShowcaseBtn" type="button">Refresh events</button></div>' +
        input('Event name', 'eventName', 'text', true, 'e.g. Northgate Talent Showcase') +
        '<div class="form-row">' + input('Event date and time', 'eventDate', 'datetime-local', false) + input('Max scouts', 'maxScouts', 'number', false, '20') + '</div>' +
        '<div class="form-row">' + input('Venue name', 'venueName', 'text', false, 'e.g. Northgate Training Ground') + input('Venue address', 'venueAddress', 'text', false, 'Full venue address') + '</div>' +
        '<label class="form-group"><span>Status</span><select class="form-control" name="status"><option value="draft">Draft</option><option value="published">Published</option><option value="confirmed">Confirmed</option></select></label>' +
        textarea('Description', 'description', 4) +
        '<div class="form-message" id="showcaseMsg" style="display:none"></div><button class="btn btn-primary" type="submit">Save showcase event</button>' +
      '</form>' +
      '<div class="stx-admin-surface"><div class="stx-admin-row-head"><h3>Showcase events</h3><a class="btn btn-sm btn-outline" href="/stratex/showcase-events">Open legacy view</a></div><div id="showcaseRows" class="loading-state"><div class="spinner"></div></div></div>' +
      '<div class="stx-admin-surface"><div class="stx-admin-row-head"><h3>Scout responses</h3><p class="stx-muted">Select an event to review accepted, declined and no-response scouts.</p></div><div id="showcaseAttendeeRows" class="stx-admin-empty">Select an event above.</div></div>' +
    '</div>';
  }

  function awardsPanel() {
    var currentYear = new Date().getFullYear();
    return '<div class="stx-admin-stack">' +
      '<form class="stx-admin-surface" id="awardNominationForm"><div class="stx-admin-row-head"><h3>Confirm nomination</h3><button class="btn btn-sm btn-outline" id="refreshAwardsBtn" type="button">Refresh nominations</button></div>' +
        '<label class="form-group"><span>Player *</span><select class="form-control" id="awardPlayerSelect" name="playerId" required><option value="">Loading players...</option></select></label>' +
        input('Award name', 'awardName', 'text', true, 'e.g. Player of the Year') +
        input('Awards year', 'year', 'number', false, String(currentYear)) +
        '<div class="form-message" id="awardMsg" style="display:none"></div><button class="btn btn-primary" type="submit">Confirm nomination</button>' +
      '</form>' +
      '<div class="stx-admin-surface"><div class="stx-admin-row-head"><h3>Nominations</h3><div class="stx-admin-filter-row compact"><label>Year<select class="form-control" id="awardYearFilter"><option value="' + currentYear + '">' + currentYear + '</option><option value="' + (currentYear + 1) + '">' + (currentYear + 1) + '</option><option value="">All years</option></select></label><a class="btn btn-sm btn-outline" href="/stratex/award-nominations">Open legacy view</a></div></div><div id="awardRows" class="loading-state"><div class="spinner"></div></div></div>' +
    '</div>';
  }

  function input(label, name, type, required, placeholder) {
    return '<label class="form-group"><span>' + escapeHtml(label) + (required ? ' *' : '') + '</span><input class="form-control" name="' + escapeHtml(name) + '" type="' + escapeHtml(type || 'text') + '"' + (required ? ' required' : '') + (placeholder ? ' placeholder="' + escapeHtml(placeholder) + '"' : '') + '></label>';
  }

  function textarea(label, name, rows, required) {
    return '<label class="form-group"><span>' + escapeHtml(label) + (required ? ' *' : '') + '</span><textarea class="form-control" name="' + escapeHtml(name) + '" rows="' + Number(rows || 4) + '"' + (required ? ' required' : '') + '></textarea></label>';
  }

  function editorToolbar() {
    return '<div class="stx-editor-toolbar" aria-label="Learning Centre editor toolbar">' +
      ['bold:Bold', 'italic:Italic', 'heading:Heading', 'bullet:Bullet list', 'number:Numbered list', 'link:Link'].map(function (item) {
        var parts = item.split(':');
        return '<button type="button" class="btn btn-sm btn-outline" data-editor-cmd="' + parts[0] + '">' + parts[1] + '</button>';
      }).join('') + '</div>';
  }

  function linkPanel(id, title, copy, href, label) {
    return modulePanel(id, title, copy, '<div class="stx-admin-surface"><p class="stx-muted">' + escapeHtml(copy) + '</p><a class="btn btn-primary" href="' + escapeHtml(href) + '">' + escapeHtml(label) + '</a></div>');
  }

  function toolPanel(title, copy, href, label) {
    return '<div class="stx-admin-surface stx-admin-tool-panel"><div><p class="stx-eyebrow">Connected workflow</p><h3>' + escapeHtml(title) + '</h3><p class="stx-muted">' + escapeHtml(copy) + '</p></div><a class="btn btn-primary" href="' + escapeHtml(href) + '">' + escapeHtml(label) + '</a></div>';
  }

  function switchModule(id, skipHistory) {
    if (!MODULE_BY_ID[id]) id = 'dashboard';
    var denied = !isAllowedModule(id);
    if (denied) id = 'accessDenied';
    document.querySelectorAll('[data-admin-module]').forEach(function (el) { el.classList.toggle('active', el.getAttribute('data-admin-module') === id); });
    document.querySelectorAll('.stx-company-module').forEach(function (el) { el.hidden = el.id !== 'module-' + id; });
    var item = denied ? ['accessDenied', 'Access denied', ''] : (MODULES.find(function (row) { return row[0] === id; }) || MODULES[0]);
    var title = document.getElementById('stxAdminTitle');
    if (title) title.textContent = item[1];
    if (id === 'crm') loadCrm();
    if (id === 'activity') loadActivity();
    if (id === 'contactForms') loadContactForms();
    if (id === 'registrations') loadRegistrations();
    if (id === 'blog') loadBlog();
    if (id === 'leadership') loadLeadership();
    if (id === 'org' || id === 'adminUsers' || id === 'profile' || id === 'leave' || id === 'meetings') loadOrg();
    if (id === 'contracts') loadContracts();
    if (id === 'hiring') loadHiring();
    if (id === 'concerns') loadConcerns();
    if (id === 'showcase') loadShowcaseAdmin();
    if (id === 'awards') loadAwardsAdmin();
    if (!skipHistory && !denied && window.history && window.history.pushState) {
      var nextUrl = MODULE_PATHS[id] || (window.location.pathname + (id === 'dashboard' ? '' : '#' + encodeURIComponent(id)));
      window.history.pushState({ adminModule: id }, '', nextUrl);
    }
    closeDetailPanel();
    closeAdminMenu();
  }

  function formPayload(form) {
    var payload = {};
    new FormData(form).forEach(function (value, key) {
      if (typeof File !== 'undefined' && value instanceof File) return;
      payload[key] = value;
    });
    return payload;
  }

  function formatDate(value) {
    if (!value) return '';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function adminName(row) {
    return [row && row.first_name, row && row.last_name].filter(Boolean).join(' ') || (row && row.email) || 'Stratex user';
  }

  function adminRole(row) {
    return (row && (row.job_title || row.admin_role || row.role)) || 'Stratex team';
  }

  function compactRecord(title, meta, body, action) {
    return '<article class="stx-admin-record"><div><h4>' + escapeHtml(title) + '</h4><p>' + escapeHtml(meta || '') + '</p>' + (body ? '<div class="stx-admin-record-body">' + body + '</div>' : '') + '</div>' + (action || '') + '</article>';
  }

  function statusPill(text, tone) {
    return '<span class="stx-admin-pill ' + escapeHtml(tone || '') + '">' + escapeHtml(text || 'Status') + '</span>';
  }

  function renderAdminRecords(rows, mapFn) {
    if (!rows || !rows.length) return '<div class="stx-admin-empty">No records yet.</div>';
    return '<div class="stx-admin-record-list">' + rows.map(mapFn).join('') + '</div>';
  }

  function populatePeopleControls(admins) {
    var active = (admins || []).filter(function (row) { return row.is_active !== false; });
    var peopleOptions = active.map(function (row) {
      return '<option value="' + escapeHtml(row.id) + '">' + escapeHtml(adminName(row) + ' - ' + adminRole(row)) + '</option>';
    }).join('');
    var leavePerson = document.getElementById('leavePerson');
    if (leavePerson) leavePerson.innerHTML = peopleOptions || '<option value="">No active team members</option>';
    var attendees = document.getElementById('meetingAttendees');
    if (attendees) attendees.innerHTML = peopleOptions;
    var adminManager = document.getElementById('adminUserManager');
    if (adminManager) adminManager.innerHTML = '<option value="">No manager</option>' + peopleOptions;
  }

  function renderOrgData(data) {
    data = data || {};
    var admins = data.admins || [];
    var byManager = {};
    admins.forEach(function (row) {
      var key = row.manager_id || 'root';
      if (!byManager[key]) byManager[key] = [];
      byManager[key].push(row);
    });
    var activeCount = admins.filter(function (row) { return row.is_active !== false; }).length;
    var managerCount = admins.filter(function (row) { return (byManager[row.id] || []).length > 0; }).length;
    var kpis = document.getElementById('orgKpis');
    if (kpis) {
      kpis.innerHTML = '<div><b>' + escapeHtml(admins.length) + '</b><span>Team members</span></div><div><b>' + escapeHtml(activeCount) + '</b><span>Active records</span></div><div><b>' + escapeHtml(managerCount) + '</b><span>Managers</span></div>';
    }
    var roots = admins.filter(function (row) { return !row.manager_id; });
    var orgRows = document.getElementById('orgRows');
    if (orgRows) {
      orgRows.innerHTML = roots.length ? '<div class="stx-org-tree">' + roots.map(function (row) { return renderOrgNode(row, byManager, 0); }).join('') + '</div>' : '<div class="stx-admin-empty">No active organisation records yet.</div>';
    }
    renderProfileData(data);
    renderAdminUsers(data);
    renderLeaveData(data);
    renderMeetingData(data);
    populatePeopleControls(admins);
  }

  function renderOrgNode(row, byManager, depth) {
    var reports = byManager[row.id] || [];
    var meta = [adminRole(row), row.email].filter(Boolean).join(' - ');
    var body = statusPill(normalizeUserType(row.admin_role || row.role), 'info') + statusPill(reports.length + ' direct report' + (reports.length === 1 ? '' : 's'), '') + (row.is_active === false ? statusPill('Inactive', 'danger') : statusPill('Active', 'success'));
    return '<div class="stx-org-node" style="--depth:' + Number(depth || 0) + '">' + compactRecord(adminName(row), meta, body, '') +
      (reports.length ? '<div class="stx-org-children">' + reports.map(function (child) { return renderOrgNode(child, byManager, depth + 1); }).join('') + '</div>' : '') +
    '</div>';
  }

  function renderProfileData(data) {
    data = data || {};
    var current = data.currentAdmin || {};
    var admins = data.admins || [];
    var self = admins.find(function (row) { return row.id === current.id; }) || current;
    var manager = admins.find(function (row) { return row.id && row.id === self.manager_id; });
    var reports = admins.filter(function (row) { return row.manager_id === self.id; });
    var root = document.getElementById('profileDetails');
    if (root) {
      root.innerHTML = '<div class="stx-profile-detail"><div class="stx-admin-avatar">' + escapeHtml(initials()) + '</div><div><h3>' + escapeHtml(adminName(self)) + '</h3><p>' + escapeHtml(adminRole(self)) + '</p><p>' + escapeHtml(self.email || '') + '</p></div></div>' +
        '<div class="stx-admin-record-body">' + statusPill(normalizeUserType(self.admin_role || self.role), 'info') + statusPill(self.is_active === false ? 'Inactive' : 'Active', self.is_active === false ? 'danger' : 'success') + '</div>' +
        '<p class="stx-muted">Reports to: ' + escapeHtml(manager ? adminName(manager) : 'No manager assigned') + '</p>';
    }
    var reportsRoot = document.getElementById('profileReports');
    if (reportsRoot) {
      reportsRoot.innerHTML = reports.length
        ? renderAdminRecords(reports, function (row) { return compactRecord(adminName(row), adminRole(row), statusPill(row.email || '', 'info'), ''); })
        : '<div class="stx-admin-empty">No direct reports on your current Stratex record.</div>';
    }
  }

  function renderAdminUsers(data) {
    var root = document.getElementById('adminUserRows');
    if (!root) return;
    var admins = (data && data.admins) || [];
    root.innerHTML = rowTable([
      ['Name', 'name'],
      ['Email', 'email'],
      ['Job title', 'jobTitle'],
      ['Manager', 'manager'],
      ['User type', 'userType'],
      ['Status', 'status']
    ], admins.map(function (row) {
      var manager = admins.find(function (item) { return item.id && item.id === row.manager_id; });
      return {
        name: adminName(row),
        email: row.email || '',
        jobTitle: adminRole(row),
        manager: manager ? adminName(manager) : 'No manager',
        userType: statusPill(normalizeUserType(row.admin_role || row.role), normalizeUserType(row.admin_role || row.role) === 'Management' ? 'info' : ''),
        status: statusPill(row.is_active === false ? 'Inactive' : 'Active', row.is_active === false ? 'danger' : 'success')
      };
    }), {
      key: 'adminUsers',
      title: function (row) { return row.name; },
      subtitle: function (row) { return [row.jobTitle, row.email].filter(Boolean).join(' - '); }
    });
  }

  function normalizeUserType(value) {
    var raw = String(value || '').trim().toLowerCase();
    if (raw === 'employee' || raw === 'read only' || raw === 'readonly') return 'Employee';
    return 'Management';
  }

  function renderLeaveData(data) {
    var admins = data.admins || [];
    var names = {};
    admins.forEach(function (row) { names[row.id] = adminName(row); });
    var root = document.getElementById('leaveRows');
    if (!root) return;
    root.innerHTML = renderAdminRecords(data.leave || [], function (row) {
      var title = (names[row.stratex_id] || 'Stratex user') + ' - ' + (row.leave_type || 'Leave');
      var meta = [formatDate(row.start_date), formatDate(row.end_date)].filter(Boolean).join(' to ');
      var body = statusPill(row.status || 'Submitted', 'info') + (row.notes ? '<p>' + escapeHtml(row.notes) + '</p>' : '');
      return compactRecord(title, meta, body, '');
    });
  }

  function renderMeetingData(data) {
    var root = document.getElementById('meetingRows');
    if (!root) return;
    root.innerHTML = renderAdminRecords(data.meetings || [], function (row) {
      var attendees = Array.isArray(row.attendees) ? row.attendees.length + ' attendee' + (row.attendees.length === 1 ? '' : 's') : '';
      var body = statusPill(row.status || 'Scheduled', 'success') + (row.notes ? '<p>' + escapeHtml(row.notes) + '</p>' : '');
      return compactRecord(row.title || 'Meeting', [formatDate(row.meeting_date), row.location, attendees].filter(Boolean).join(' - '), body, '');
    });
  }

  async function loadOrg() {
    try {
      var data = await api('GET', '/api/stratex/org');
      renderOrgData(data);
    } catch (_) {
      ['orgRows', 'profileDetails', 'leaveRows', 'meetingRows'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.innerHTML = '<div class="stx-admin-error">Could not load Stratex org records.</div>';
      });
      var users = document.getElementById('adminUserRows');
      if (users) users.innerHTML = '<div class="stx-admin-error">Could not load Stratex admin users.</div>';
    }
  }

  async function loadContracts() {
    var root = document.getElementById('contractRows');
    if (!root) return;
    root.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    try {
      var data = await api('GET', '/api/stratex/contracts-pay');
      var rows = data.data || [];
      root.innerHTML = renderAdminRecords(rows, function (row) {
        var contract = row.contract_data && typeof row.contract_data === 'object' ? row.contract_data : {};
        var body = statusPill(contract.contractPath ? 'Contract uploaded' : 'No contract uploaded', contract.contractPath ? 'success' : '') +
          statusPill(contract.payAmount ? 'Pay set' : 'Pay not set', contract.payAmount ? 'info' : '') +
          '<p>' + escapeHtml([contract.payAmount ? ('GBP ' + contract.payAmount) : '', contract.payFrequency || ''].filter(Boolean).join(' / ') || 'Private HR record') + '</p>';
        var action = contract.contractPath ? '<button class="btn btn-sm btn-outline" type="button" data-contract-download="' + escapeHtml(row.id) + '">Secure download</button>' : '';
        return compactRecord(adminName(row), [adminRole(row), row.email].filter(Boolean).join(' - '), body, action);
      });
      bindContractDownloads();
    } catch (_) {
      root.innerHTML = '<div class="stx-admin-error">Could not load contracts and pay.</div>';
    }
  }

  function bindContractDownloads() {
    document.querySelectorAll('[data-contract-download]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        try {
          var data = await api('GET', '/api/stratex/contracts-pay/' + encodeURIComponent(btn.getAttribute('data-contract-download')) + '/contract-url');
          if (data.url) window.open(data.url, '_blank', 'noopener');
        } catch (err) {
          alert(err.message || 'Could not create secure contract link.');
        }
      });
    });
  }

  async function loadHiring() {
    var jobsRoot = document.getElementById('hiringRows');
    var appsRoot = document.getElementById('applicationRows');
    var jobRows = [];
    var appRows = [];
    try {
      var jobs = await api('GET', '/api/stratex/jobs');
      jobRows = jobs.data || [];
      if (jobsRoot) {
        jobsRoot.innerHTML = renderAdminRecords(jobRows, function (job) {
          var meta = [job.department, job.location, job.working_type, job.status].filter(Boolean).join(' - ');
          var body = statusPill(job.status || 'Draft', job.status === 'live' ? 'success' : 'info') + statusPill((job.positions_available || 1) + ' position' + (Number(job.positions_available || 1) === 1 ? '' : 's'), '');
          var action = '<button class="btn btn-sm btn-outline" type="button" data-job-detail="' + escapeHtml(job.id || job.slug || job.job_title || '') + '">View applicants</button>';
          return compactRecord(job.job_title || 'Untitled role', meta, body, action);
        });
      }
    } catch (_) {
      if (jobsRoot) jobsRoot.innerHTML = '<div class="stx-admin-error">Could not load job posts.</div>';
    }
    try {
      var apps = await api('GET', '/api/stratex/job-applications');
      appRows = apps.data || [];
      if (appsRoot) {
        appsRoot.innerHTML = renderAdminRecords(appRows, function (app) {
          var job = app.job_posts || {};
          var body = statusPill(app.status || 'Submitted', 'info') + (app.job_application_files && app.job_application_files.length ? statusPill('CV stored privately', 'success') : statusPill('No CV record', ''));
          var action = '<button class="btn btn-sm btn-outline" type="button" data-applicant-detail="' + escapeHtml(app.id || app.email || '') + '">Open applicant</button>';
          return compactRecord([app.first_name, app.last_name].filter(Boolean).join(' ') || app.email || 'Applicant', [job.job_title, app.email, formatDate(app.submitted_at)].filter(Boolean).join(' - '), body, action);
        });
      }
    } catch (_) {
      if (appsRoot) appsRoot.innerHTML = '<div class="stx-admin-empty">Applications are not available in this environment yet.</div>';
    }
    bindHiringDetailButtons(jobRows, appRows);
  }

  function bindHiringDetailButtons(jobs, applications) {
    document.querySelectorAll('[data-job-detail]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-job-detail');
        var job = (jobs || []).find(function (row) { return String(row.id || row.slug || row.job_title || '') === String(id); }) || {};
        var apps = (applications || []).filter(function (app) {
          var linked = app.job_posts || {};
          return String(app.job_id || linked.id || linked.slug || linked.job_title || '') === String(job.id || job.slug || job.job_title || '');
        });
        var applicants = apps.length ? '<div class="stx-admin-detail-list"><h3>Applicants</h3>' + apps.map(function (app) {
          return compactRecord([app.first_name, app.last_name].filter(Boolean).join(' ') || app.email || 'Applicant', [app.email, formatDate(app.submitted_at)].filter(Boolean).join(' - '), statusPill(app.status || 'Submitted', 'info'), '');
        }).join('') + '</div>' : '<div class="stx-admin-empty">No applicants for this role yet.</div>';
        openDetailPanel(job.job_title || 'Role', [job.department, job.location, job.status].filter(Boolean).join(' - '), [
          { label: 'Department', value: job.department },
          { label: 'Location', value: job.location },
          { label: 'Working type', value: job.working_type },
          { label: 'Employment type', value: job.employment_type },
          { label: 'Contract type', value: job.contract_type },
          { label: 'Status', value: job.status },
          { label: 'Positions available', value: job.positions_available || 1 },
          { label: 'Closing date', value: formatDate(job.closing_at) }
        ], '<a class="btn btn-sm btn-primary" href="/admin/hiring">Manage role</a>', applicants);
      });
    });
    document.querySelectorAll('[data-applicant-detail]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-applicant-detail');
        var app = (applications || []).find(function (row) { return String(row.id || row.email || '') === String(id); }) || {};
        var job = app.job_posts || {};
        openDetailPanel([app.first_name, app.last_name].filter(Boolean).join(' ') || app.email || 'Applicant', job.job_title || 'Job application', [
          { label: 'Email', value: app.email },
          { label: 'Phone', value: app.phone },
          { label: 'Role', value: job.job_title },
          { label: 'Status', value: app.status || 'Submitted' },
          { label: 'Submitted', value: formatDate(app.submitted_at) },
          { label: 'CV', value: app.job_application_files && app.job_application_files.length ? 'Stored privately' : 'No CV record' }
        ], app.email ? '<a class="btn btn-sm btn-primary" href="mailto:' + escapeHtml(app.email) + '">Email applicant</a>' : '');
      });
    });
  }

  async function loadConcerns() {
    var root = document.getElementById('concernRows');
    if (!root) return;
    root.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    try {
      var data = await api('GET', '/api/stratex-website/leads');
      var rows = (data.data || []).filter(function (row) {
        return String(row.lead_type || row.type || '').toLowerCase().indexOf('concern') >= 0 || row.concern_type;
      });
      root.innerHTML = renderAdminRecords(rows, function (row) {
        var title = row.concern_type || row.reason || 'Concern report';
        var meta = [row.full_name, row.email, formatDate(row.created_at)].filter(Boolean).join(' - ');
        var body = statusPill(row.status || 'New', 'info') + statusPill(row.priority || 'Standard', row.priority === 'urgent' ? 'danger' : '');
        var action = '<button class="btn btn-sm btn-outline" type="button" data-concern-detail="' + escapeHtml(row.id || row.email || row.created_at || '') + '">Open detail</button>';
        return compactRecord(title, meta, body, action);
      });
      bindConcernDetailButtons(rows);
    } catch (_) {
      root.innerHTML = '<div class="stx-admin-error">Could not load concern submissions.</div>';
    }
  }

  function bindConcernDetailButtons(rows) {
    document.querySelectorAll('[data-concern-detail]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-concern-detail');
        var row = (rows || []).find(function (item) { return String(item.id || item.email || item.created_at || '') === String(id); }) || {};
        openDetailPanel(row.concern_type || row.reason || 'Concern report', [row.full_name, row.email, formatDate(row.created_at)].filter(Boolean).join(' - '), [
          { label: 'Name', value: row.full_name },
          { label: 'Email', value: row.email },
          { label: 'Phone', value: row.phone },
          { label: 'Concern type', value: row.concern_type || row.reason },
          { label: 'Priority', value: row.priority || 'Standard' },
          { label: 'Status', value: row.status || 'New' },
          { label: 'Submitted', value: formatDate(row.created_at) },
          { label: 'Message', value: row.message || row.notes || row.reason }
        ], row.email ? '<a class="btn btn-sm btn-primary" href="mailto:' + escapeHtml(row.email) + '">Email reporter</a>' : '');
      });
    });
  }

  async function loadCrm() {
    var root = document.getElementById('crmRows');
    if (!root) return;
    root.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    try {
      var data = await api('GET', '/api/stratex-website/crm');
      root.innerHTML = rowTable([
        ['Source', 'source'], ['Type', 'type'], ['Name', 'name'], ['Email', 'email'],
        ['Organisation', 'organisation'], ['Role', 'role'], ['Status', 'status'], ['Created', 'createdAt']
      ], data.data || [], {
        key: 'crm',
        title: function (row) { return row.name || row.email || 'CRM record'; },
        subtitle: function (row) { return [row.source, row.type].filter(Boolean).join(' - '); },
        fields: function (row) {
          return [
            { label: 'Source', value: row.source },
            { label: 'Type', value: row.type },
            { label: 'Name', value: row.name },
            { label: 'Email', value: row.email },
            { label: 'Organisation', value: row.organisation },
            { label: 'Role', value: row.role },
            { label: 'Status', value: row.status },
            { label: 'Created', value: formatDate(row.createdAt) }
          ];
        },
        actions: function (row) {
          return row.email ? '<a class="btn btn-sm btn-primary" href="mailto:' + escapeHtml(row.email) + '">Email contact</a>' : '';
        }
      });
    } catch (_) {
      root.innerHTML = '<div class="stx-admin-error">Could not load CRM.</div>';
    }
  }

  function normaliseRegistration(row) {
    var accountType = row.account_type || row.accountType || row.type || '';
    return {
      source: 'Registration request',
      product: row.product || 'ScoutLink',
      type: accountType,
      name: [row.first_name, row.last_name].filter(Boolean).join(' ') || row.full_name || row.name || '',
      email: row.email || '',
      organisation: row.team_name || row.scout_club || row.organisation || row.club_name || '',
      role: row.role_at_club || row.role || row.scout_league || '',
      status: row.status || row.decision || '',
      createdAt: row.created_at || row.submitted_at || row.updated_at || '',
      raw: row
    };
  }

  async function loadRegistrations() {
    var root = document.getElementById('registrationRows');
    if (!root) return;
    root.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    try {
      var statusFilter = document.getElementById('registrationStatusFilter');
      var productFilter = document.getElementById('registrationProductFilter');
      var query = statusFilter && statusFilter.value ? ('?status=' + encodeURIComponent(statusFilter.value) + '&limit=250') : '?limit=250';
      var data = await api('GET', '/api/registrations' + query);
      var rows = (data.data || []).map(normaliseRegistration).filter(function (row) {
        return !productFilter || !productFilter.value || row.product === productFilter.value;
      });
      root.innerHTML = rowTable([
        ['Source', 'source'],
        ['Product', 'product', function (row) { return statusPill(row.product || 'ScoutLink', 'success'); }],
        ['Type', 'type', function (row) { return statusPill(row.type || 'Registration', row.type === 'Scout' ? 'info' : ''); }],
        ['Name', 'name'],
        ['Email', 'email'],
        ['Organisation', 'organisation'],
        ['Role', 'role'],
        ['Status', 'status', function (row) { return statusPill(row.status || 'pending', row.status === 'approved' ? 'success' : row.status === 'declined' ? 'danger' : 'info'); }],
        ['Created', 'createdAt', function (row) { return escapeHtml(formatDate(row.createdAt)); }],
        ['Actions', 'email', function () { return '<button class="btn btn-sm btn-outline" type="button" data-detail-open>Open</button>'; }]
      ], rows, {
        key: 'registrations',
        title: function (row) { return row.name || row.email || 'Registration'; },
        subtitle: function (row) { return [row.product, row.type, row.status].filter(Boolean).join(' - '); },
        fields: function (row) {
          return [
            { label: 'Product', value: row.product || 'ScoutLink' },
            { label: 'Source', value: row.source },
            { label: 'Type', value: row.type },
            { label: 'Name', value: row.name },
            { label: 'Email', value: row.email },
            { label: 'Organisation', value: row.organisation },
            { label: 'Role', value: row.role },
            { label: 'Status', value: row.status || 'pending' },
            { label: 'Created', value: formatDate(row.createdAt) }
          ];
        },
        actions: function (row) {
          return '<a class="btn btn-sm btn-outline" href="/stratex/registrations">Open registration workflow</a>' + (row.email ? '<a class="btn btn-sm btn-primary" href="mailto:' + escapeHtml(row.email) + '">Email applicant</a>' : '');
        }
      });
    } catch (_) {
      root.innerHTML = '<div class="stx-admin-error">Could not load registration records.</div>';
    }
  }

  async function loadActivity() {
    var root = document.getElementById('activityBreakdownRows');
    if (root) root.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    try {
      var pageFilter = document.getElementById('activityPageFilter');
      var selected = pageFilter && pageFilter.value ? pageFilter.value : '';
      var dateFilter = document.getElementById('activityDateFilter');
      var range = dateFilter && dateFilter.value ? dateFilter.value : '30';
      var qs = '?range=' + encodeURIComponent(range) + (selected ? '&page=' + encodeURIComponent(selected) : '');
      var data = await api('GET', '/api/stratex-website/activity' + qs);
      var rows = data.pages || [];
      var summary = data.summary || {};
      var totalViews = Number(summary.pageViews || 0);
      var sessions = Number(summary.sessions || 0);
      var visitors = Number(summary.visitors || 0);
      var viewEl = document.getElementById('activityPageViews');
      var sessionEl = document.getElementById('activitySessions');
      var visitorEl = document.getElementById('activityVisitors');
      if (viewEl) viewEl.textContent = totalViews.toLocaleString('en-GB');
      if (sessionEl) sessionEl.textContent = sessions.toLocaleString('en-GB');
      if (visitorEl) visitorEl.textContent = visitors.toLocaleString('en-GB');
      if (root) {
        root.innerHTML = rowTable([
          ['Page', 'pageTitle'],
          ['Path', 'page'],
          ['Page views', 'views', function (row) { return escapeHtml(Number(row.views || 0).toLocaleString('en-GB')); }],
          ['Sessions', 'sessions', function (row) { return escapeHtml(Number(row.sessions || 0).toLocaleString('en-GB')); }],
          ['Unique visitors', 'visitors', function (row) { return escapeHtml(Number(row.visitors || 0).toLocaleString('en-GB')); }],
          ['Last seen', 'lastSeen', function (row) { return escapeHtml(formatDate(row.lastSeen)); }]
        ], rows, {
          key: 'activity',
          title: function (row) { return row.pageTitle || row.page || 'Page activity'; },
          subtitle: function (row) { return row.page || ''; },
          fields: function (row) {
            return [
              { label: 'Page views', value: Number(row.views || 0).toLocaleString('en-GB') },
              { label: 'Sessions', value: Number(row.sessions || 0).toLocaleString('en-GB') },
              { label: 'Unique visitors', value: Number(row.visitors || 0).toLocaleString('en-GB') },
              { label: 'Last seen', value: formatDate(row.lastSeen) },
              { label: 'Top referrer', value: row.topReferrer || 'Direct / unknown' }
            ];
          }
        });
      }
    } catch (_) {
      if (root) root.innerHTML = '<div class="stx-admin-error">Could not load website activity.</div>';
      ['activityPageViews', 'activitySessions', 'activityVisitors'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.textContent = '-';
      });
    }
  }

  async function loadShowcaseAdmin() {
    var root = document.getElementById('showcaseRows');
    if (root) root.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    try {
      var data = await api('GET', '/api/showcase');
      var rows = data.data || [];
      if (root) {
        root.innerHTML = rowTable([
          ['Event', 'event_name'],
          ['Date', 'event_date', function (row) { return escapeHtml(formatDate(row.event_date)); }],
          ['Venue', 'venue_name'],
          ['Status', 'status', function (row) {
            var status = row.status || (row.confirmed ? 'confirmed' : 'draft');
            return statusPill(status, status === 'confirmed' ? 'success' : status === 'cancelled' ? 'danger' : 'info');
          }],
          ['Scout responses', 'confirmedCount', function (row) {
            return escapeHtml(Number(row.confirmedCount || 0)) + ' accepted / ' + escapeHtml(Number(row.waitlistedCount || 0)) + ' waitlisted';
          }],
          ['Actions', 'id', function (row) {
            var id = escapeHtml(row.id);
            return '<div class="stx-admin-inline-actions"><button class="btn btn-sm btn-outline" type="button" data-showcase-attendees="' + id + '">View responses</button>' +
              '<button class="btn btn-sm btn-primary" type="button" data-showcase-confirm="' + id + '">Confirm</button>' +
              '<button class="btn btn-sm btn-outline" type="button" data-showcase-cancel="' + id + '">Cancel</button></div>';
          }]
        ], rows, {
          key: 'showcase',
          title: function (row) { return row.event_name || 'Showcase event'; },
          subtitle: function (row) { return [formatDate(row.event_date), row.venue_name, row.status].filter(Boolean).join(' - '); },
          fields: function (row) {
            return [
              { label: 'Event name', value: row.event_name },
              { label: 'Date', value: formatDate(row.event_date) },
              { label: 'Venue', value: row.venue_name },
              { label: 'Address', value: row.venue_address },
              { label: 'Status', value: row.status || (row.confirmed ? 'confirmed' : 'draft') },
              { label: 'Max scouts', value: row.max_scouts || 20 },
              { label: 'Accepted scouts', value: Number(row.confirmedCount || 0) },
              { label: 'Waitlisted scouts', value: Number(row.waitlistedCount || 0) },
              { label: 'Description', value: row.description }
            ];
          },
          actions: function (row) {
            var id = escapeHtml(row.id);
            return '<button class="btn btn-sm btn-outline" type="button" data-showcase-attendees="' + id + '">View responses</button>' +
              '<button class="btn btn-sm btn-primary" type="button" data-showcase-confirm="' + id + '">Confirm event</button>' +
              '<button class="btn btn-sm btn-outline" type="button" data-showcase-cancel="' + id + '">Cancel event</button>';
          }
        });
      }
      bindShowcaseAdminButtons();
    } catch (err) {
      if (root) root.innerHTML = '<div class="stx-admin-error">Could not load showcase events.</div>';
    }
  }

  function bindShowcaseAdminButtons() {
    document.querySelectorAll('[data-showcase-attendees]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var id = btn.getAttribute('data-showcase-attendees');
        var root = document.getElementById('showcaseAttendeeRows');
        if (root) root.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
        try {
          var data = await api('GET', '/api/showcase/' + encodeURIComponent(id) + '/attendees');
          var rows = data.scouts || [];
          if (!root) return;
          var summary = '<div class="stx-admin-kpis"><div><b>' + escapeHtml(data.total || rows.length || 0) + '</b><span>Scouts invited</span></div><div><b>' + escapeHtml((data.confirmed || []).length) + '</b><span>Accepted</span></div><div><b>' + escapeHtml((data.notResponded || []).length) + '</b><span>No response</span></div></div>';
          root.innerHTML = summary + rowTable([
            ['Scout', 'scouts', function (row) {
              var scout = row.scouts || {};
              return escapeHtml([scout.first_name, scout.last_name].filter(Boolean).join(' ') || scout.email || 'Scout');
            }],
            ['Email', 'scouts', function (row) { return escapeHtml((row.scouts && row.scouts.email) || ''); }],
            ['Club / team', 'scouts', function (row) { return escapeHtml((row.scouts && (row.scouts.club_name || row.scouts.scout_team_id)) || ''); }],
            ['Response', 'display_status', function (row) {
              var status = row.display_status || row.status || 'not_responded';
              return statusPill(status.replace(/_/g, ' '), status === 'accepted' ? 'success' : status === 'declined' ? 'danger' : 'info');
            }],
            ['Responded', 'confirmed_at', function (row) { return escapeHtml(formatDate(row.confirmed_at)); }]
          ], rows, {
            key: 'showcaseAttendees',
            title: function (row) {
              var scout = row.scouts || {};
              return [scout.first_name, scout.last_name].filter(Boolean).join(' ') || scout.email || 'Scout response';
            },
            subtitle: function (row) { return row.display_status || row.status || 'not responded'; }
          });
        } catch (err) {
          if (root) root.innerHTML = '<div class="stx-admin-error">Could not load scout responses.</div>';
        }
      });
    });
    document.querySelectorAll('[data-showcase-confirm]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        if (!window.confirm('Confirm this showcase event and notify active scouts?')) return;
        try {
          await api('POST', '/api/showcase/' + encodeURIComponent(btn.getAttribute('data-showcase-confirm')) + '/confirm', {});
          loadShowcaseAdmin();
        } catch (err) {
          alert(err.message || 'Could not confirm this showcase event.');
        }
      });
    });
    document.querySelectorAll('[data-showcase-cancel]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var reason = window.prompt('Reason for cancellation (optional)');
        if (reason === null) return;
        try {
          await api('POST', '/api/showcase/' + encodeURIComponent(btn.getAttribute('data-showcase-cancel')) + '/cancel', { reason: reason });
          loadShowcaseAdmin();
        } catch (err) {
          alert(err.message || 'Could not cancel this showcase event.');
        }
      });
    });
  }

  async function loadAwardsAdmin() {
    var root = document.getElementById('awardRows');
    if (root) root.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    try {
      var yearFilter = document.getElementById('awardYearFilter');
      var year = yearFilter && yearFilter.value ? yearFilter.value : '';
      var nominations = await api('GET', '/api/awards' + (year ? '?year=' + encodeURIComponent(year) : ''));
      var players = await api('GET', '/api/awards/players');
      populateAwardPlayers(players.data || []);
      var rows = nominations.data || [];
      if (root) {
        root.innerHTML = rowTable([
          ['Player', 'players', function (row) {
            var player = row.players || {};
            return escapeHtml([player.first_name, player.last_name].filter(Boolean).join(' ') || row.player_id || 'Player');
          }],
          ['Award', 'award_name'],
          ['Year', 'year', function (row) { return escapeHtml(row.year || (row.nominated_at ? new Date(row.nominated_at).getFullYear() : '')); }],
          ['Status', 'status', function (row) { return statusPill(row.status || 'pending', row.status === 'withdrawn' ? 'danger' : 'success'); }],
          ['Nominated', 'nominated_at', function (row) { return escapeHtml(formatDate(row.nominated_at)); }],
          ['Actions', 'id', function (row) {
            if (row.status === 'withdrawn') return '<span class="stx-admin-muted-pill">Withdrawn</span>';
            return '<button class="btn btn-sm btn-outline" type="button" data-award-withdraw="' + escapeHtml(row.id) + '">Withdraw</button>';
          }]
        ], rows, {
          key: 'awards',
          title: function (row) {
            var player = row.players || {};
            return [player.first_name, player.last_name].filter(Boolean).join(' ') || row.award_name || 'Award nomination';
          },
          subtitle: function (row) { return [row.award_name, row.status].filter(Boolean).join(' - '); },
          fields: function (row) {
            var player = row.players || {};
            return [
              { label: 'Player', value: [player.first_name, player.last_name].filter(Boolean).join(' ') },
              { label: 'Team', value: player.team_name },
              { label: 'Age group', value: player.age_group },
              { label: 'Award', value: row.award_name },
              { label: 'Year', value: row.year || (row.nominated_at ? new Date(row.nominated_at).getFullYear() : '') },
              { label: 'Status', value: row.status || 'pending' },
              { label: 'Nominated by', value: row.nominated_by },
              { label: 'Nominated', value: formatDate(row.nominated_at) }
            ];
          },
          actions: function (row) {
            if (row.status === 'withdrawn') return '';
            return '<button class="btn btn-sm btn-outline" type="button" data-award-withdraw="' + escapeHtml(row.id) + '">Withdraw nomination</button>';
          }
        });
      }
      bindAwardsAdminButtons();
    } catch (err) {
      if (root) root.innerHTML = '<div class="stx-admin-error">Could not load award nominations.</div>';
    }
  }

  function populateAwardPlayers(players) {
    var select = document.getElementById('awardPlayerSelect');
    if (!select) return;
    select.innerHTML = '<option value="">Select player</option>' + (players || []).map(function (player) {
      var name = [player.first_name, player.last_name].filter(Boolean).join(' ') || player.id;
      var meta = [player.team_name, player.age_group, player.specific_position || player.primary_position || player.position_group].filter(Boolean).join(' - ');
      return '<option value="' + escapeHtml(player.id) + '">' + escapeHtml(name + (meta ? ' - ' + meta : '')) + '</option>';
    }).join('');
  }

  function bindAwardsAdminButtons() {
    document.querySelectorAll('[data-award-withdraw]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        if (!window.confirm('Withdraw this award nomination?')) return;
        try {
          await api('PATCH', '/api/awards/' + encodeURIComponent(btn.getAttribute('data-award-withdraw')) + '/withdraw', {});
          loadAwardsAdmin();
        } catch (err) {
          alert(err.message || 'Could not withdraw this nomination.');
        }
      });
    });
  }

  async function loadContactForms() {
    var root = document.getElementById('contactFormRows');
    if (root) root.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    try {
      var data = await api('GET', '/api/stratex-website/leads');
      if (!root) return;
      root.innerHTML = rowTable([
        ['Form type', 'lead_type'], ['Name', 'full_name'], ['Email', 'email'], ['Organisation', 'organisation'],
        ['Message', 'reason'], ['Status', 'status'], ['Submitted', 'created_at', function (row) { return escapeHtml(formatDate(row.created_at)); }],
        ['Actions', 'email', function (row) { return row.email ? '<a class="btn btn-sm btn-outline" href="mailto:' + escapeHtml(row.email) + '">Email</a>' : '<button class="btn btn-sm btn-outline" type="button" data-detail-open>Open</button>'; }]
      ], data.data || [], {
        key: 'contactForms',
        title: function (row) { return row.full_name || row.email || row.lead_type || 'Website submission'; },
        subtitle: function (row) { return [row.lead_type, row.status].filter(Boolean).join(' - '); },
        fields: function (row) {
          return [
            { label: 'Form type', value: row.lead_type || row.type },
            { label: 'Name', value: row.full_name },
            { label: 'Email', value: row.email },
            { label: 'Phone', value: row.phone },
            { label: 'Organisation', value: row.organisation },
            { label: 'Reason', value: row.reason },
            { label: 'Message', value: row.message || row.notes },
            { label: 'Status', value: row.status || 'New' },
            { label: 'Submitted', value: formatDate(row.created_at) }
          ];
        },
        actions: function (row) {
          return row.email ? '<a class="btn btn-sm btn-primary" href="mailto:' + escapeHtml(row.email) + '">Email contact</a>' : '';
        }
      });
    } catch (_) {
      root.innerHTML = '<div class="stx-admin-error">Could not load website submissions.</div>';
    }
  }

  async function loadBlog() {
    var root = document.getElementById('blogRows');
    try {
      var data = await api('GET', '/api/stratex-website/blog');
      var rows = data.data || [];
      if (!root) return;
      root.innerHTML = rowTable([
        ['Title', 'title'],
        ['Status', 'status', function (row) { return statusPill(row.status || 'draft', row.status === 'published' ? 'success' : row.status === 'archived' ? '' : 'info'); }],
        ['Category', 'category'],
        ['Views', 'view_count', function (row) { return escapeHtml(Number(row.view_count || 0).toLocaleString('en-GB')); }],
        ['Likes', 'like_count', function (row) { return escapeHtml(Number(row.like_count || 0).toLocaleString('en-GB')); }],
        ['Public URL', 'slug', function (row) {
          var url = 'https://www.stratexanalytics.co.uk/learning-centre/' + encodeURIComponent(row.slug || '');
          return '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' + escapeHtml(row.slug || 'Open') + '</a>';
        }],
        ['LinkedIn', 'slug', function (row) {
          var url = 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent('https://www.stratexanalytics.co.uk/learning-centre/' + encodeURIComponent(row.slug || ''));
          return '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener">Share</a>';
        }],
        ['Actions', 'id', function (row) {
          if (row.status === 'archived' || row.status === 'deleted') return '<span class="stx-admin-muted-pill">Archived</span>';
          return '<div class="stx-admin-inline-actions"><button class="btn btn-sm btn-outline" type="button" data-blog-detail="' + escapeHtml(row.id) + '">Details</button><button class="btn btn-sm btn-outline stx-admin-archive-post" type="button" data-blog-archive="' + escapeHtml(row.id) + '">Remove from site</button></div>';
        }]
      ], rows, {
        key: 'blog',
        title: function (row) { return row.title || 'Learning Centre post'; },
        subtitle: function (row) { return [row.category, row.status].filter(Boolean).join(' - '); },
        fields: function (row) {
          return [
            { label: 'Title', value: row.title },
            { label: 'Status', value: row.status || 'draft' },
            { label: 'Category', value: row.category || 'Learning' },
            { label: 'Views', value: Number(row.view_count || 0).toLocaleString('en-GB') },
            { label: 'Likes', value: Number(row.like_count || 0).toLocaleString('en-GB') },
            { label: 'Slug', value: row.slug },
            { label: 'Excerpt', value: row.excerpt }
          ];
        },
        actions: function (row) {
          var publicUrl = '/learning-centre/' + encodeURIComponent(row.slug || '');
          return '<a class="btn btn-sm btn-primary" href="' + escapeHtml(publicUrl) + '" target="_blank" rel="noopener">View live post</a>' +
            '<button class="btn btn-sm btn-outline stx-admin-archive-post" type="button" data-blog-archive="' + escapeHtml(row.id) + '">Delete / archive</button>';
        }
      });
      bindBlogDetailButtons(rows);
      bindBlogArchiveButtons();
    } catch (_) {
      if (root) root.innerHTML = '<div class="stx-admin-error">Could not load posts.</div>';
    }
  }

  function bindBlogDetailButtons(rows) {
    var panel = document.getElementById('blogDetailPanel');
    if (!panel) return;
    document.querySelectorAll('[data-blog-detail]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var row = (rows || []).find(function (item) { return String(item.id) === String(btn.getAttribute('data-blog-detail')); });
        if (!row) return;
        var publicUrl = '/learning-centre/' + encodeURIComponent(row.slug || '');
        panel.hidden = false;
        panel.innerHTML = '<div><p class="stx-eyebrow">Post details</p><h3>' + escapeHtml(row.title || 'Untitled post') + '</h3><p>' + escapeHtml(row.excerpt || 'No excerpt added.') + '</p></div>' +
          '<div class="stx-admin-record-body">' + statusPill(row.status || 'draft', row.status === 'published' ? 'success' : 'info') + statusPill(row.category || 'Learning', '') + statusPill(Number(row.view_count || 0).toLocaleString('en-GB') + ' views', 'info') + statusPill(Number(row.like_count || 0).toLocaleString('en-GB') + ' likes', '') + '</div>' +
          '<div class="stx-admin-inline-actions"><a class="btn btn-sm btn-primary" href="' + escapeHtml(publicUrl) + '" target="_blank" rel="noopener">View live post</a><button class="btn btn-sm btn-outline stx-admin-archive-post" type="button" data-blog-archive="' + escapeHtml(row.id) + '">Delete / archive</button><a class="btn btn-sm btn-outline" href="https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent('https://www.stratexanalytics.co.uk' + publicUrl) + '" target="_blank" rel="noopener">Share on LinkedIn</a></div>';
        bindBlogArchiveButtons();
      });
    });
  }

  function bindBlogArchiveButtons() {
    document.querySelectorAll('[data-blog-archive]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        if (!window.confirm('Remove this post from the public site? It will no longer appear in public listings.')) return;
        try {
          await api('DELETE', '/api/stratex-website/blog/' + encodeURIComponent(btn.getAttribute('data-blog-archive')));
          loadBlog();
        } catch (err) {
          alert(err.message || 'Could not remove this post from the public site.');
        }
      });
    });
  }

  async function loadLeadership() {
    var root = document.getElementById('leadershipRows');
    if (!root) return;
    root.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    try {
      var data = await api('GET', '/api/stratex-website/leadership');
      root.innerHTML = rowTable([
        ['Image', 'image_url', function (row) {
          return row.image_url ? '<img alt="" src="' + escapeHtml(row.image_url) + '" style="width:44px;height:44px;border-radius:12px;object-fit:cover">' : '';
        }],
        ['Name', 'full_name'], ['Job title', 'job_title'], ['Email', 'email'], ['User type', 'permission_role', function (row) { return statusPill(normalizeUserType(row.permission_role), 'info'); }]
      ], data.data || [], {
        key: 'leadership',
        title: function (row) { return row.full_name || 'Leadership profile'; },
        subtitle: function (row) { return row.job_title || row.permission_role || ''; },
        fields: function (row) {
          return [
            { label: 'Name', value: row.full_name },
            { label: 'Job title', value: row.job_title },
            { label: 'Email', value: row.email },
            { label: 'User type', value: normalizeUserType(row.permission_role) },
            { label: 'Focus chip', value: row.focus_chip },
            { label: 'Image URL', value: row.image_url },
            { label: 'Summary', value: row.summary }
          ];
        },
        actions: function () {
          return '<a class="btn btn-sm btn-outline" href="/leadership" target="_blank" rel="noopener">View public leadership</a>';
        }
      });
    } catch (_) {
      root.innerHTML = '<div class="stx-admin-error">Could not load leadership profiles.</div>';
    }
  }

  function applyEditorCommand(cmd) {
    var textarea = document.getElementById('blogBody') || document.querySelector('[name="body"]');
    if (!textarea) return;
    var start = textarea.selectionStart || 0;
    var end = textarea.selectionEnd || 0;
    var selected = textarea.value.slice(start, end) || 'text';
    var before = textarea.value.slice(0, start);
    var after = textarea.value.slice(end);
    var next = selected;
    if (cmd === 'bold') next = '**' + selected + '**';
    if (cmd === 'italic') next = '*' + selected + '*';
    if (cmd === 'heading') next = '## ' + selected.replace(/^#+\s*/, '');
    if (cmd === 'bullet') next = selected.split(/\r?\n/).map(function (line) { return line.trim() ? '- ' + line.replace(/^[-*]\s*/, '') : line; }).join('\n');
    if (cmd === 'number') next = selected.split(/\r?\n/).map(function (line, index) { return line.trim() ? (index + 1) + '. ' + line.replace(/^\d+\.\s*/, '') : line; }).join('\n');
    if (cmd === 'link') next = '[' + selected + '](https://)';
    textarea.value = before + next + after;
    textarea.focus();
    textarea.setSelectionRange(before.length, before.length + next.length);
  }

  function bindHandlers() {
    document.querySelectorAll('[data-admin-module]').forEach(function (el) {
      el.addEventListener('click', function () { switchModule(el.getAttribute('data-admin-module')); });
    });
    document.querySelectorAll('[data-admin-logout]').forEach(function (logout) {
      logout.addEventListener('click', logoutToLogin);
    });
    bindAdminDrawer();
    bindDetailPanel();
    var refreshActivity = document.getElementById('refreshActivityBtn');
    if (refreshActivity) refreshActivity.addEventListener('click', loadActivity);
    ['activityPageFilter', 'activityDateFilter'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', loadActivity);
    });
    var refresh = document.getElementById('refreshContactFormsBtn');
    if (refresh) refresh.addEventListener('click', loadContactForms);
    var refreshRegistrations = document.getElementById('refreshRegistrationsBtn');
    if (refreshRegistrations) refreshRegistrations.addEventListener('click', loadRegistrations);
    ['registrationProductFilter', 'registrationStatusFilter'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', loadRegistrations);
    });
    var refreshOrg = document.getElementById('refreshOrgBtn');
    if (refreshOrg) refreshOrg.addEventListener('click', loadOrg);
    var refreshAdminUsers = document.getElementById('refreshAdminUsersBtn');
    if (refreshAdminUsers) refreshAdminUsers.addEventListener('click', loadOrg);
    var refreshContracts = document.getElementById('refreshContractsBtn');
    if (refreshContracts) refreshContracts.addEventListener('click', loadContracts);
    var refreshHiring = document.getElementById('refreshHiringBtn');
    if (refreshHiring) refreshHiring.addEventListener('click', loadHiring);
    var refreshConcerns = document.getElementById('refreshConcernsBtn');
    if (refreshConcerns) refreshConcerns.addEventListener('click', loadConcerns);
    var refreshShowcase = document.getElementById('refreshShowcaseBtn');
    if (refreshShowcase) refreshShowcase.addEventListener('click', loadShowcaseAdmin);
    var refreshAwards = document.getElementById('refreshAwardsBtn');
    if (refreshAwards) refreshAwards.addEventListener('click', loadAwardsAdmin);
    var awardYearFilter = document.getElementById('awardYearFilter');
    if (awardYearFilter) awardYearFilter.addEventListener('change', loadAwardsAdmin);
    var exportBtn = document.getElementById('crmExportBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportCrm);
    document.querySelectorAll('[data-editor-cmd]').forEach(function (btn) {
      btn.addEventListener('click', function () { applyEditorCommand(btn.getAttribute('data-editor-cmd')); });
    });
    var blogForm = document.getElementById('blogForm');
    if (blogForm) blogForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      try {
        await api('POST', '/api/stratex-website/blog', formPayload(blogForm));
        blogForm.reset();
        showMessage('blogMsg', 'Post saved.', true);
        loadBlog();
      } catch (err) {
        showMessage('blogMsg', err.message || 'Could not save post.', false);
      }
    });
    var showcaseForm = document.getElementById('showcaseForm');
    if (showcaseForm) showcaseForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      try {
        var payload = formPayload(showcaseForm);
        payload.maxScouts = payload.maxScouts ? Number(payload.maxScouts) : undefined;
        await api('POST', '/api/showcase', payload);
        showcaseForm.reset();
        showMessage('showcaseMsg', 'Showcase event saved.', true);
        loadShowcaseAdmin();
      } catch (err) {
        showMessage('showcaseMsg', err.message || 'Could not save showcase event.', false);
      }
    });
    var awardNominationForm = document.getElementById('awardNominationForm');
    if (awardNominationForm) awardNominationForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      try {
        var payload = formPayload(awardNominationForm);
        payload.year = payload.year ? Number(payload.year) : undefined;
        await api('POST', '/api/awards/nominate', payload);
        awardNominationForm.reset();
        showMessage('awardMsg', 'Award nomination saved and notifications queued.', true);
        loadAwardsAdmin();
      } catch (err) {
        showMessage('awardMsg', err.message || 'Could not save award nomination.', false);
      }
    });
    var leadershipForm = document.getElementById('leadershipForm');
    if (leadershipForm) leadershipForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      try {
        var payload = formPayload(leadershipForm);
        var fileInput = leadershipForm.querySelector('[name="imageFile"]');
        if (fileInput && fileInput.files && fileInput.files[0]) payload.imageUrl = await uploadLeadershipImage(fileInput.files[0]);
        await api('POST', '/api/stratex-website/leadership', payload);
        leadershipForm.reset();
        showMessage('leadershipMsg', 'Leadership member saved.', true);
        loadLeadership();
      } catch (err) {
        showMessage('leadershipMsg', err.message || 'Could not save leadership member.', false);
      }
    });
    var adminUserForm = document.getElementById('adminUserForm');
    if (adminUserForm) adminUserForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      try {
        var payload = formPayload(adminUserForm);
        await api('POST', '/api/stratex/admins', payload);
        adminUserForm.reset();
        showMessage('adminUserMsg', 'Admin invite sent.', true);
        loadOrg();
      } catch (err) {
        showMessage('adminUserMsg', err.message || 'Could not invite this admin user.', false);
      }
    });
    var leaveForm = document.getElementById('leaveForm');
    if (leaveForm) leaveForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      try {
        await api('POST', '/api/stratex/org/leave', formPayload(leaveForm));
        leaveForm.reset();
        showMessage('leaveMsg', 'Leave record saved.', true);
        loadOrg();
      } catch (err) {
        showMessage('leaveMsg', err.message || 'Could not save leave record.', false);
      }
    });
    var meetingForm = document.getElementById('meetingForm');
    if (meetingForm) meetingForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      try {
        var payload = formPayload(meetingForm);
        var attendees = document.getElementById('meetingAttendees');
        payload.attendees = attendees ? Array.from(attendees.selectedOptions).map(function (option) { return option.value; }) : [];
        await api('POST', '/api/stratex/org/meetings', payload);
        meetingForm.reset();
        showMessage('meetingMsg', 'Meeting booked.', true);
        loadOrg();
      } catch (err) {
        showMessage('meetingMsg', err.message || 'Could not book meeting.', false);
      }
    });
    bindSettingsForms();
  }

  function bindSettingsForms() {
    var passwordForm = document.getElementById('stratexPasswordForm');
    if (passwordForm) passwordForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      var payload = formPayload(passwordForm);
      if (!payload.currentPassword || !payload.newPassword || !payload.confirmPassword) {
        showMessage('stratexPasswordMsg', 'Complete all password fields before saving.', false);
        return;
      }
      if (String(payload.newPassword).length < 8) {
        showMessage('stratexPasswordMsg', 'New password must be at least 8 characters.', false);
        return;
      }
      if (payload.newPassword !== payload.confirmPassword) {
        showMessage('stratexPasswordMsg', 'The new passwords do not match.', false);
        return;
      }
      try {
        await api('POST', '/api/auth/change-password', { password: payload.newPassword });
        passwordForm.reset();
        showMessage('stratexPasswordMsg', 'Password updated.', true);
      } catch (err) {
        showMessage('stratexPasswordMsg', err.message || 'Could not update password.', false);
      }
    });
    [
      ['stratexPreferencesForm', 'stratexPreferencesMsg', 'Preferences saved for this browser.'],
      ['stratexCompanySettingsForm', 'stratexCompanySettingsMsg', 'Company settings saved.'],
      ['stratexNotificationSettingsForm', 'stratexNotificationSettingsMsg', 'Notification rules saved.']
    ].forEach(function (item) {
      var form = document.getElementById(item[0]);
      if (!form) return;
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        try {
          localStorage.setItem(item[0], JSON.stringify(formPayload(form)));
          showMessage(item[1], item[2], true);
        } catch (_) {
          showMessage(item[1], 'Could not save these settings in this browser.', false);
        }
      });
    });
  }

  function bindDetailPanel() {
    var close = document.getElementById('stxAdminDetailClose');
    var backdrop = document.getElementById('stxAdminDetailBackdrop');
    if (close) close.addEventListener('click', closeDetailPanel);
    if (backdrop) backdrop.addEventListener('click', closeDetailPanel);
    document.addEventListener('click', function (event) {
      var row = event.target.closest('[data-detail-key]');
      if (!row) return;
      var interactive = event.target.closest('a,button,input,select,textarea,label');
      if (interactive && !interactive.hasAttribute('data-detail-open')) return;
      openRowDetail(row.getAttribute('data-detail-key'), row.getAttribute('data-detail-index'));
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeDetailPanel();
      if ((event.key === 'Enter' || event.key === ' ') && event.target && event.target.matches('[data-detail-key]')) {
        event.preventDefault();
        openRowDetail(event.target.getAttribute('data-detail-key'), event.target.getAttribute('data-detail-index'));
      }
    });
  }

  function bindAdminDrawer() {
    var open = document.getElementById('stxAdminMenuButton');
    var close = document.getElementById('stxAdminMenuClose');
    var backdrop = document.getElementById('stxAdminBackdrop');
    if (open) open.addEventListener('click', openAdminMenu);
    if (close) close.addEventListener('click', closeAdminMenu);
    if (backdrop) backdrop.addEventListener('click', closeAdminMenu);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeAdminMenu();
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 900) closeAdminMenu();
    });
  }

  function openAdminMenu() {
    document.body.classList.add('stx-admin-menu-open');
    var button = document.getElementById('stxAdminMenuButton');
    var close = document.getElementById('stxAdminMenuClose');
    if (button) button.setAttribute('aria-expanded', 'true');
    if (close) close.focus();
  }

  function closeAdminMenu() {
    document.body.classList.remove('stx-admin-menu-open');
    var button = document.getElementById('stxAdminMenuButton');
    if (button) button.setAttribute('aria-expanded', 'false');
  }

  async function uploadLeadershipImage(file) {
    var fd = new FormData();
    fd.append('image', file);
    var res = await fetch(API + '/api/stratex-website/leadership/image', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + (Auth.token || '') },
      body: fd
    });
    var json = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(json.error || 'Could not upload image.');
    return json.url || (json.data && json.data.url);
  }

  function exportCrm(event) {
    event.preventDefault();
    fetch(API + '/api/stratex-website/crm/export', { headers: { Authorization: 'Bearer ' + (Auth.token || '') } })
      .then(function (res) {
        if (!res.ok) throw new Error('Export failed');
        return res.blob();
      })
      .then(function (blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'stratex-crm-export.xlsx';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      })
      .catch(function () { alert('Could not export CRM right now.'); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (typeof Auth === 'undefined' || !Auth.isLoggedIn() || Auth.type !== 'Stratex') {
      var hasOtherSession = typeof Auth !== 'undefined' && Auth && Auth.isLoggedIn && Auth.isLoggedIn();
      renderStratexAdminLogin(hasOtherSession ? 'This area is for Stratex admin accounts. Sign in with your Stratex admin email to continue.' : '');
      return;
    }
    startAdminShell();
  });
})();
