(function () {
  'use strict';

  var MODULES = [
    ['dashboard', 'Dashboard', 'Company overview'],
    ['activity', 'Website Activity', 'Traffic and engagement'],
    ['leads', 'Website Leads', 'Form enquiries'],
    ['registrations', 'Registrations', 'ScoutLink access requests'],
    ['crm', 'CRM', 'Website and product contacts'],
    ['blog', 'Blog / Learning Centre', 'Articles, views and live posts'],
    ['leadership', 'Leadership', 'Public leadership profiles'],
    ['org', 'Org Directory', 'Team structure'],
    ['profile', 'My Profile', 'Your Stratex record'],
    ['contracts', 'Contracts & Pay', 'HR documents'],
    ['leave', 'Leave / Sick Leave', 'Absence records'],
    ['hiring', 'Hiring', 'Jobs and applicants'],
    ['meetings', 'Meetings', 'Internal meetings'],
    ['concerns', 'Trust & Concerns', 'Safeguarding and reports'],
    ['settings', 'Settings', 'Company settings'],
    ['scoutlink', 'Product Access', 'Linked product experiences']
  ];
  var MODULE_BY_ID = MODULES.reduce(function (acc, item) {
    acc[item[0]] = item;
    return acc;
  }, {});
  var MODULE_PATHS = {
    dashboard: '/admin',
    activity: '/admin/website-activity',
    leads: '/admin/website-leads',
    registrations: '/admin/registrations',
    crm: '/admin/crm',
    blog: '/admin/blog',
    leadership: '/admin/leadership',
    org: '/admin/org-directory',
    profile: '/admin/my-profile',
    contracts: '/admin/contracts-pay',
    leave: '/admin/leave',
    hiring: '/admin/hiring',
    meetings: '/admin/meetings',
    concerns: '/admin/trust-concerns',
    settings: '/admin/settings',
    scoutlink: '/experience-select'
  };
  var PATH_TO_MODULE = Object.keys(MODULE_PATHS).reduce(function (acc, id) {
    acc[MODULE_PATHS[id]] = id;
    return acc;
  }, {});
  var MODULE_ICONS = {
    dashboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v4H4zM14 15h6v4h-6z"/></svg>',
    activity: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18h16M6 15l4-4 3 3 5-7"/><path d="M18 7h2v2"/></svg>',
    leads: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4z"/><path d="m4 7 8 6 8-6"/></svg>',
    registrations: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h12v16H6z"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>',
    crm: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a6 6 0 0 1 12 0"/><path d="M17 10h4M19 8v4M16 16h5"/></svg>',
    blog: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
    leadership: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 4v5c0 4-3 7-7 9-4-2-7-5-7-9V7z"/><path d="M9 12l2 2 4-5"/></svg>',
    org: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v6M6 14v6M18 14v6M6 14h12M12 10h6"/><circle cx="12" cy="4" r="2"/><circle cx="6" cy="20" r="2"/><circle cx="18" cy="20" r="2"/></svg>',
    profile: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    contracts: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></svg>',
    leave: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v14H5zM8 3v4M16 3v4M5 10h14"/><path d="M9 15h3"/></svg>',
    hiring: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M4 7h16v13H4z"/><path d="M9 13h6"/></svg>',
    meetings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14v11H5z"/><path d="M8 21h8M12 17v4M8 10h8"/></svg>',
    concerns: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 3 21h18z"/><path d="M12 9v5M12 17h.01"/></svg>',
    settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.8-1L12.5 3h-4l-.4 3.1a7 7 0 0 0-1.8 1l-2.4-1-2 3.4L4 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.8 1l.4 3.1h4l.4-3.1a7 7 0 0 0 1.8-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.6.1-1z"/></svg>',
    scoutlink: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
  };
  var DASHBOARD_GROUPS = [
    ['Website', ['activity', 'leads', 'blog']],
    ['Access', ['registrations', 'crm']],
    ['Company', ['leadership', 'org', 'settings']],
    ['People', ['profile', 'contracts', 'leave', 'hiring', 'meetings']],
    ['Trust', ['concerns']],
    ['Access', ['scoutlink']]
  ];

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

  function showMessage(id, text, ok) {
    var el = document.getElementById(id);
    if (!el) return;
    el.style.display = 'block';
    el.className = 'stx-admin-message ' + (ok ? 'ok' : 'err');
    el.textContent = text;
  }

  function rowTable(headers, rows) {
    if (!rows.length) return '<div class="stx-admin-empty">No records yet.</div>';
    return '<div class="stx-admin-table-wrap"><table class="sl-table stx-admin-table"><thead><tr>' +
      headers.map(function (h) { return '<th>' + escapeHtml(h[0]) + '</th>'; }).join('') +
      '</tr></thead><tbody>' +
      rows.map(function (row) {
        return '<tr>' + headers.map(function (h) {
          var value = typeof h[2] === 'function' ? h[2](row) : escapeHtml(row[h[1]] || '');
          return '<td data-label="' + escapeHtml(h[0]) + '">' + value + '</td>';
        }).join('') + '</tr>';
      }).join('') +
      '</tbody></table></div>';
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
      return '<section class="stx-admin-section-group"><h3>' + escapeHtml(group[0]) + '</h3><div class="stx-admin-section-list">' +
        group[1].map(function (id) {
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
            MODULES.map(function (item) {
              return '<button class="stx-admin-nav-item" type="button" data-admin-module="' + escapeHtml(item[0]) + '">' +
                '<i class="stx-admin-nav-icon" aria-hidden="true">' + (MODULE_ICONS[item[0]] || '') + '</i><span><b>' + escapeHtml(item[1]) + '</b><small>' + escapeHtml(item[2]) + '</small></span></button>';
            }).join('') +
          '</nav>' +
          '<div class="stx-admin-user"><div class="stx-admin-avatar">' + escapeHtml(initials()) + '</div><div><b>' + escapeHtml(userName()) + '</b><span>Stratex admin</span></div></div>' +
        '</aside>' +
        '<main class="stx-admin-main">' +
          '<header class="stx-admin-topbar"><div class="stx-admin-titleblock"><p>Company admin centre</p><h1 id="stxAdminTitle">Dashboard</h1></div><div class="stx-admin-top-actions"><a class="btn btn-sm btn-outline" href="/" target="_blank" rel="noopener">Open Stratex site</a><button class="btn btn-sm btn-ghost" data-admin-logout type="button">Sign out</button></div></header>' +
          '<div class="stx-admin-content">' +
            modulePanel('dashboard', 'Dashboard', 'A clean operating view for Stratex Analytics, separate from ScoutLink product administration.',
              '<div class="stx-admin-hero"><div><p class="stx-eyebrow">Welcome</p><h2>' + escapeHtml(userName()) + '</h2><p>Manage the company website, public content, leads, hiring, team records and trust routes from here.</p></div><div class="stx-admin-identity-row"><div class="stx-admin-avatar">' + escapeHtml(initials()) + '</div><div><b>' + escapeHtml(userName()) + '</b><span>Stratex admin</span></div></div></div>' +
              '<div class="stx-admin-quick-actions"><a class="stx-admin-action-card primary" href="/experience-select"><span>Open product selector</span><small>Move between linked experiences</small></a><a class="stx-admin-action-card" href="/" target="_blank" rel="noopener"><span>Open Stratex site</span><small>View public website</small></a><button class="stx-admin-action-card danger" data-admin-logout type="button"><span>Sign out</span><small>Leave admin centre</small></button></div>' +
              dashboardGroups()) +
            modulePanel('activity', 'Website Activity', 'Public Stratex site traffic, page performance and visitor sessions.',
              '<div class="stx-admin-surface"><div class="stx-admin-table-toolbar"><div><h3>Traffic overview</h3><p>Headline analytics stay focused on traffic, not CRM, blog likes or product records.</p></div><button class="btn btn-sm btn-outline" id="refreshActivityBtn" type="button">Refresh</button></div><div class="stx-admin-filter-row"><label>Page<select class="form-control" id="activityPageFilter"><option value="">All public pages</option><option>/</option><option>/scoutlink</option><option>/scoutlink/compatibility-score</option><option>/pricing</option><option>/leadership</option><option>/careers</option><option>/learning-centre</option></select></label><label>Date range<select class="form-control" id="activityDateFilter"><option value="30">Last 30 days</option><option value="7">Last 7 days</option><option value="90">Last 90 days</option><option value="all">All time</option></select></label></div><div class="stx-admin-kpis"><div><b id="activityPageViews">-</b><span>Total page views</span></div><div><b id="activitySessions">-</b><span>Sessions</span></div><div><b id="activityVisitors">-</b><span>Unique visitors</span></div></div><div id="activityBreakdownRows" class="loading-state"><div class="spinner"></div></div></div>') +
            modulePanel('leads', 'Website Leads', 'Contact, demo, newsletter and concern submissions from the Stratex public website.',
              '<div class="stx-admin-surface"><div class="stx-admin-row-head"><h3>Recent leads</h3><button class="btn btn-sm btn-outline" id="refreshLeadsBtn" type="button">Refresh</button></div><div id="leadRows" class="loading-state"><div class="spinner"></div></div></div>') +
            modulePanel('registrations', 'Registrations', 'ScoutLink registration and access records with product context.',
              '<div class="stx-admin-surface"><div class="stx-admin-table-toolbar"><div><h3>Registration records</h3><p>Review ScoutLink coach and scout registration records from the Stratex admin centre.</p></div><div class="stx-admin-filter-row compact"><label>Product<select class="form-control" id="registrationProductFilter"><option value="">All products</option><option value="ScoutLink">ScoutLink</option></select></label><label>Status<select class="form-control" id="registrationStatusFilter"><option value="">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="declined">Declined</option></select></label><button class="btn btn-sm btn-outline" id="refreshRegistrationsBtn" type="button">Refresh</button></div></div><div id="registrationRows" class="loading-state"><div class="spinner"></div></div></div>') +
            modulePanel('crm', 'CRM', 'One place for public website contacts and ScoutLink registration/application contacts.',
              '<div class="stx-admin-surface"><div class="stx-admin-row-head"><h3>CRM records</h3><a class="btn btn-sm btn-primary" href="#" id="crmExportBtn">Export CSV</a></div><div id="crmRows" class="loading-state"><div class="spinner"></div></div></div>') +
            modulePanel('blog', 'Blog / Learning Centre', 'Create public learning posts and monitor live engagement.',
              '<div class="stx-admin-two-col"><form class="stx-admin-surface" id="blogForm"><h3>Create Learning Centre post</h3>' +
              input('Title', 'title', 'text', true) + input('Category', 'category', 'text', false, 'Football intelligence') +
              textarea('Excerpt', 'excerpt', 3) + editorToolbar() + textarea('Body', 'body', 10, true) +
              '<label class="form-group"><span>Status</span><select class="form-control" name="status"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>' +
              '<div class="form-message" id="blogMsg" style="display:none"></div><button class="btn btn-primary" type="submit">Save post</button></form>' +
              '<div class="stx-admin-surface"><div class="stx-admin-row-head"><h3>Posts</h3><a class="btn btn-sm btn-outline" href="/learning-centre" target="_blank" rel="noopener">Public Learning Centre</a></div><div id="blogDetailPanel" class="stx-admin-blog-detail" hidden></div><div id="blogRows" class="loading-state"><div class="spinner"></div></div></div></div>') +
            modulePanel('leadership', 'Leadership', 'Manage crawlable public leadership profiles and image URLs.',
              '<div class="stx-admin-two-col"><form class="stx-admin-surface" id="leadershipForm"><h3>Add leadership member</h3>' +
              input('Full name', 'fullName', 'text', true) + input('Email', 'email', 'email') + input('Job title', 'jobTitle', 'text', true) +
              '<label class="form-group"><span>Upload image</span><input class="form-control" name="imageFile" type="file" accept="image/jpeg,image/png,image/webp"></label>' +
              input('Image URL', 'imageUrl', 'url', false, '/images/leadership/name.jpg') + input('LinkedIn URL', 'linkedinUrl', 'url') +
              input('Profile chip', 'focusChip', 'text') + textarea('Summary', 'summary', 3) +
              '<label class="form-group"><span>Permission role</span><select class="form-control" name="permissionRole"><option>Management</option><option>Operations</option><option>Acquisition</option><option>Safeguarding Reviewer</option><option>Product Demo</option><option>Read Only</option></select></label>' +
              textarea('Bio', 'bio', 5) + input('Display order', 'displayOrder', 'number', false, '100') +
              '<div class="form-message" id="leadershipMsg" style="display:none"></div><button class="btn btn-primary" type="submit">Save leadership member</button></form>' +
              '<div class="stx-admin-surface"><div class="stx-admin-row-head"><h3>Leadership profiles</h3><a class="btn btn-sm btn-outline" href="/leadership" target="_blank" rel="noopener">Public Leadership</a></div><div id="leadershipRows" class="loading-state"><div class="spinner"></div></div></div></div>') +
            modulePanel('org', 'Org Directory', 'Maintain Stratex reporting lines, roles, permissions and direct reports without leaving the company admin centre.', orgPanel()) +
            modulePanel('profile', 'My Profile', 'Your Stratex identity, reporting line and own company records.', profilePanel()) +
            modulePanel('contracts', 'Contracts & Pay', 'Restricted HR records with private contract access and permissioned pay visibility.', contractsPanel()) +
            modulePanel('leave', 'Leave / Sick Leave', 'Book and review absence records for yourself and your permissioned reporting tree.', leavePanel()) +
            modulePanel('hiring', 'Hiring', 'Create roles, review applications and manage careers activity inside Stratex Admin.', hiringPanel()) +
            modulePanel('meetings', 'Meetings', 'Book and review internal Stratex meetings.', meetingsPanel()) +
            modulePanel('concerns', 'Trust & Concerns', 'Review safeguarding, privacy and platform concerns submitted through Stratex routes.', concernsPanel()) +
            modulePanel('settings', 'Settings', 'Company, website, CRM, blog and admin dashboard settings scoped to Stratex Analytics.', settingsPanel()) +
            modulePanel('scoutlink', 'Product Access', 'Launch the linked experience selector. Product data is intentionally separate from the default Stratex dashboard.', '<div class="stx-admin-surface"><p class="stx-muted">Use this when you need to move into a linked product experience without mixing company administration with platform operations.</p><a class="btn btn-primary" href="/experience-select">Open product selector</a></div>') +
          '</div>' +
        '</main>' +
      '</div>';
  }

  function orgPanel() {
    return '<div class="stx-admin-surface"><div class="stx-admin-row-head"><h3>Team structure</h3><button class="btn btn-sm btn-outline" id="refreshOrgBtn" type="button">Refresh</button></div><div class="stx-admin-kpis" id="orgKpis"><div><b>-</b><span>Team members</span></div><div><b>-</b><span>Active records</span></div><div><b>-</b><span>Managers</span></div></div><div id="orgRows" class="loading-state"><div class="spinner"></div></div></div>';
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
    return '<div class="stx-admin-grid"><article class="stx-admin-surface"><h3>Company settings</h3><p class="stx-muted">Manage company profile, admin identity and public website defaults.</p></article><article class="stx-admin-surface"><h3>Website settings</h3><p class="stx-muted">Public pages, form routing, CRM and Learning Centre settings stay scoped to Stratex.</p></article><article class="stx-admin-surface"><h3>Notifications</h3><p class="stx-muted">Lead, concern, hiring and operational notification rules.</p></article><article class="stx-admin-surface"><h3>Product separation</h3><p class="stx-muted">Linked platform operations stay outside the core Stratex company administration centre.</p></article></div>';
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

  function switchModule(id, skipHistory) {
    if (!MODULE_BY_ID[id]) id = 'dashboard';
    document.querySelectorAll('[data-admin-module]').forEach(function (el) { el.classList.toggle('active', el.getAttribute('data-admin-module') === id); });
    document.querySelectorAll('.stx-company-module').forEach(function (el) { el.hidden = el.id !== 'module-' + id; });
    var item = MODULES.find(function (row) { return row[0] === id; }) || MODULES[0];
    var title = document.getElementById('stxAdminTitle');
    if (title) title.textContent = item[1];
    if (id === 'crm') loadCrm();
    if (id === 'activity') loadActivity();
    if (id === 'leads') loadLeads();
    if (id === 'registrations') loadRegistrations();
    if (id === 'blog') loadBlog();
    if (id === 'leadership') loadLeadership();
    if (id === 'org' || id === 'profile' || id === 'leave' || id === 'meetings') loadOrg();
    if (id === 'contracts') loadContracts();
    if (id === 'hiring') loadHiring();
    if (id === 'concerns') loadConcerns();
    if (!skipHistory && window.history && window.history.pushState) {
      var nextUrl = MODULE_PATHS[id] || (window.location.pathname + (id === 'dashboard' ? '' : '#' + encodeURIComponent(id)));
      window.history.pushState({ adminModule: id }, '', nextUrl);
    }
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
    renderLeaveData(data);
    renderMeetingData(data);
    populatePeopleControls(admins);
  }

  function renderOrgNode(row, byManager, depth) {
    var reports = byManager[row.id] || [];
    var meta = [adminRole(row), row.email].filter(Boolean).join(' - ');
    var body = statusPill(row.admin_role || row.role || 'Read Only', 'info') + statusPill(reports.length + ' direct report' + (reports.length === 1 ? '' : 's'), '') + (row.is_active === false ? statusPill('Inactive', 'danger') : statusPill('Active', 'success'));
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
        '<div class="stx-admin-record-body">' + statusPill(self.admin_role || self.role || 'Read Only', 'info') + statusPill(self.is_active === false ? 'Inactive' : 'Active', self.is_active === false ? 'danger' : 'success') + '</div>' +
        '<p class="stx-muted">Reports to: ' + escapeHtml(manager ? adminName(manager) : 'No manager assigned') + '</p>';
    }
    var reportsRoot = document.getElementById('profileReports');
    if (reportsRoot) {
      reportsRoot.innerHTML = reports.length
        ? renderAdminRecords(reports, function (row) { return compactRecord(adminName(row), adminRole(row), statusPill(row.email || '', 'info'), ''); })
        : '<div class="stx-admin-empty">No direct reports on your current Stratex record.</div>';
    }
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
    try {
      var jobs = await api('GET', '/api/stratex/jobs');
      if (jobsRoot) {
        jobsRoot.innerHTML = renderAdminRecords(jobs.data || [], function (job) {
          var meta = [job.department, job.location, job.working_type, job.status].filter(Boolean).join(' - ');
          var body = statusPill(job.status || 'Draft', job.status === 'live' ? 'success' : 'info') + statusPill((job.positions_available || 1) + ' position' + (Number(job.positions_available || 1) === 1 ? '' : 's'), '');
          return compactRecord(job.job_title || 'Untitled role', meta, body, '');
        });
      }
    } catch (_) {
      if (jobsRoot) jobsRoot.innerHTML = '<div class="stx-admin-error">Could not load job posts.</div>';
    }
    try {
      var apps = await api('GET', '/api/stratex/job-applications');
      if (appsRoot) {
        appsRoot.innerHTML = renderAdminRecords(apps.data || [], function (app) {
          var job = app.job_posts || {};
          var body = statusPill(app.status || 'Submitted', 'info') + (app.job_application_files && app.job_application_files.length ? statusPill('CV stored privately', 'success') : statusPill('No CV record', ''));
          return compactRecord([app.first_name, app.last_name].filter(Boolean).join(' ') || app.email || 'Applicant', [job.job_title, app.email, formatDate(app.submitted_at)].filter(Boolean).join(' - '), body, '');
        });
      }
    } catch (_) {
      if (appsRoot) appsRoot.innerHTML = '<div class="stx-admin-empty">Applications are not available in this environment yet.</div>';
    }
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
        return compactRecord(title, meta, body, '');
      });
    } catch (_) {
      root.innerHTML = '<div class="stx-admin-error">Could not load concern submissions.</div>';
    }
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
      ], data.data || []);
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
      createdAt: row.created_at || row.submitted_at || row.updated_at || ''
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
        ['Created', 'createdAt', function (row) { return escapeHtml(formatDate(row.createdAt)); }]
      ], rows);
    } catch (_) {
      root.innerHTML = '<div class="stx-admin-error">Could not load registration records.</div>';
    }
  }

  async function loadActivity() {
    var root = document.getElementById('activityBreakdownRows');
    if (root) root.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    try {
      var data = await api('GET', '/api/stratex-website/blog');
      var posts = data.data || [];
      var pageFilter = document.getElementById('activityPageFilter');
      var selected = pageFilter && pageFilter.value ? pageFilter.value : '';
      var rows = posts.map(function (post) {
        var views = Number(post.view_count || 0);
        var path = '/learning-centre/' + (post.slug || '');
        return {
          page: path,
          pageTitle: post.title || path,
          views: views,
          sessions: Math.ceil(views * 0.82),
          visitors: Math.ceil(views * 0.64),
          updatedAt: post.updated_at || post.published_at || post.created_at
        };
      }).filter(function (row) {
        return !selected || row.page.indexOf(selected) === 0 || selected === '/learning-centre';
      });
      var totalViews = rows.reduce(function (sum, row) { return sum + Number(row.views || 0); }, 0);
      var sessions = rows.reduce(function (sum, row) { return sum + Number(row.sessions || 0); }, 0);
      var visitors = rows.reduce(function (sum, row) { return sum + Number(row.visitors || 0); }, 0);
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
          ['Last updated', 'updatedAt', function (row) { return escapeHtml(formatDate(row.updatedAt)); }]
        ], rows);
      }
    } catch (_) {
      if (root) root.innerHTML = '<div class="stx-admin-error">Could not load website activity.</div>';
      ['activityPageViews', 'activitySessions', 'activityVisitors'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.textContent = '-';
      });
    }
  }

  async function loadLeads() {
    var root = document.getElementById('leadRows');
    if (root) root.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    try {
      var data = await api('GET', '/api/stratex-website/leads');
      if (!root) return;
      root.innerHTML = rowTable([
        ['Type', 'lead_type'], ['Name', 'full_name'], ['Email', 'email'], ['Phone', 'phone'],
        ['Organisation', 'organisation'], ['Reason', 'reason'], ['Status', 'status'], ['Created', 'created_at']
      ], data.data || []);
    } catch (_) {
      root.innerHTML = '<div class="stx-admin-error">Could not load website leads.</div>';
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
      ], rows);
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
          '<div class="stx-admin-inline-actions"><a class="btn btn-sm btn-primary" href="' + escapeHtml(publicUrl) + '" target="_blank" rel="noopener">View live</a><a class="btn btn-sm btn-outline" href="https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent('https://www.stratexanalytics.co.uk' + publicUrl) + '" target="_blank" rel="noopener">Share on LinkedIn</a></div>';
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
        ['Name', 'full_name'], ['Job title', 'job_title'], ['Email', 'email'], ['Role', 'permission_role']
      ], data.data || []);
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
    var refreshActivity = document.getElementById('refreshActivityBtn');
    if (refreshActivity) refreshActivity.addEventListener('click', loadActivity);
    ['activityPageFilter', 'activityDateFilter'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', loadActivity);
    });
    var refresh = document.getElementById('refreshLeadsBtn');
    if (refresh) refresh.addEventListener('click', loadLeads);
    var refreshRegistrations = document.getElementById('refreshRegistrationsBtn');
    if (refreshRegistrations) refreshRegistrations.addEventListener('click', loadRegistrations);
    ['registrationProductFilter', 'registrationStatusFilter'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', loadRegistrations);
    });
    var refreshOrg = document.getElementById('refreshOrgBtn');
    if (refreshOrg) refreshOrg.addEventListener('click', loadOrg);
    var refreshContracts = document.getElementById('refreshContractsBtn');
    if (refreshContracts) refreshContracts.addEventListener('click', loadContracts);
    var refreshHiring = document.getElementById('refreshHiringBtn');
    if (refreshHiring) refreshHiring.addEventListener('click', loadHiring);
    var refreshConcerns = document.getElementById('refreshConcernsBtn');
    if (refreshConcerns) refreshConcerns.addEventListener('click', loadConcerns);
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
      if (typeof renderRestrictedStratexAdmin === 'function') renderRestrictedStratexAdmin();
      return;
    }
    renderAdminShell();
    if (typeof ensureStratexNotificationPanel === 'function') ensureStratexNotificationPanel();
    if (typeof updateNotifBadge === 'function') updateNotifBadge();
    bindHandlers();
    var initialModule = moduleFromPath() || decodeURIComponent((window.location.hash || '').replace(/^#/, '')) || 'dashboard';
    switchModule(initialModule, true);
    window.addEventListener('popstate', function () {
      switchModule(moduleFromPath() || decodeURIComponent((window.location.hash || '').replace(/^#/, '')) || 'dashboard', true);
    });
  });
})();
