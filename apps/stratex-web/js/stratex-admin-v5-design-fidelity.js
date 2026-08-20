'use strict';
(function () {
  if (window.__stratexAdminDesignFidelityV3) return;
  window.__stratexAdminDesignFidelityV3 = true;

  var API = 'https://scoutlink-api.vercel.app';
  var state = {
    lastPath: '',
    shellBadgesLoaded: false,
    dashboardLoading: false,
    scoutlinkLoading: false,
    profileLoading: false,
    crmLoading: false,
    crmRendered: false,
    crmRows: [],
    showcaseIndex: null,
    showcaseEventId: null,
    showcaseView: 'overview',
    showcasePlayersLoading: false,
    showcasePlayersEventId: null,
    showcasePlayers: [],
    userDetailOpen: false,
    timer: null
  };

  var EMPLOYEE_ALLOWED = new Set(['dashboard','contact','crm','activity','profile','settings']);
  var ROUTE_IDS = {
    '/admin':'dashboard',
    '/admin/registrations':'registrations',
    '/admin/contact-forms':'contact',
    '/admin/crm':'crm',
    '/admin/website-activity':'activity',
    '/admin/blog':'blog',
    '/admin/scoutlink':'scoutlink',
    '/admin/scoutlink/players':'players',
    '/admin/scoutlink/coaches':'coaches',
    '/admin/scoutlink/teams':'teams',
    '/admin/scoutlink/scouts':'scouts',
    '/admin/leadership':'leadership',
    '/admin/org-charts':'org',
    '/admin/admin-users':'users',
    '/admin/my-profile':'profile',
    '/admin/contracts-pay':'contracts',
    '/admin/leave-sick-leave':'leave',
    '/admin/hiring':'hiring',
    '/admin/meetings':'meetings',
    '/admin/trust-concerns':'trust',
    '/admin/showcase-event':'showcase',
    '/admin/award-ceremonies':'awards',
    '/admin/settings':'settings',
    '/admin/audit-log':'audit'
  };

  function path() {
    return (location.pathname || '/admin').replace(/\/+$/, '') || '/admin';
  }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function getUser() {
    try { return JSON.parse(localStorage.getItem('sl_user') || '{}') || {}; }
    catch (_) { return {}; }
  }
  function token() {
    try { return localStorage.getItem('sl_token') || ''; }
    catch (_) { return ''; }
  }
  function role() {
    var u = getUser();
    var email = String(u.email || '').toLowerCase();
    if (email === 'richdhin@stratexanalytics.co.uk') return 'Super Admin';
    var r = String(u.admin_role || u.role || '').toLowerCase();
    return r === 'management' || r === 'manager' || r === 'super_admin' || r === 'super admin'
      ? 'Management'
      : 'Employee';
  }
  function firstName() {
    var u = getUser();
    return u.first_name || u.firstName || String(u.full_name || u.name || 'Admin').split(/\s+/)[0] || 'Admin';
  }
  function fullName(r) {
    r = r || {};
    return [r.first_name || r.firstName, r.last_name || r.lastName].filter(Boolean).join(' ')
      || r.full_name || r.fullName || r.name || r.email || 'Stratex user';
  }
  function initials(r) {
    return fullName(r).split(/\s+/).filter(Boolean).map(function (x) { return x[0]; }).join('').slice(0,2).toUpperCase() || 'SA';
  }
  function num(v) {
    return Number(v || 0).toLocaleString('en-GB');
  }
  function fmtDate(v, withTime) {
    if (!v) return '—';
    var d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString('en-GB', withTime
      ? {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}
      : {day:'2-digit',month:'short',year:'numeric'});
  }
  async function api(url) {
    var r = await fetch(API + url, {
      credentials: 'include',
      headers: {Authorization: 'Bearer ' + token(), 'Cache-Control': 'no-store'}
    });
    var p = await r.json().catch(function () { return {}; });
    if (!r.ok) throw new Error(p.error || p.message || 'Request failed');
    return p;
  }
  async function apiWrite(method, url, body) {
    var r = await fetch(API + url, {
      method: method,
      credentials: 'include',
      headers: {Authorization:'Bearer ' + token(), 'Content-Type':'application/json'},
      body: JSON.stringify(body || {})
    });
    var p = await r.json().catch(function () { return {}; });
    if (!r.ok) throw new Error(p.error || p.message || 'Request failed');
    return p;
  }

  function button(label, route, cls) {
    return '<button class="btn ' + esc(cls || '') + '" type="button" data-nav="' + esc(route) + '">' + esc(label) + '</button>';
  }
  function metric(label, value, copy, tone, id) {
    return '<div class="metric ' + esc(tone || '') + '"><small>' + esc(label) + '</small><strong' +
      (id ? ' id="' + esc(id) + '"' : '') + '>' + esc(value) + '</strong><p>' + esc(copy || '') + '</p></div>';
  }
  function pill(value, tone) {
    return '<span class="pill ' + esc(tone || statusTone(value)) + '">' + esc(value || '—') + '</span>';
  }
  function statusTone(v) {
    var s = String(v || '').toLowerCase();
    if (/approved|active|complete|resolved|published|selected|live|paid/.test(s)) return 'green';
    if (/pending|review|waiting|recorded|scheduled|draft/.test(s)) return 'gold';
    if (/declined|inactive|archived|closed|urgent|high/.test(s)) return 'red';
    if (/scout|coach|open|new/.test(s)) return 'blue';
    return 'grey';
  }
  function avatar(r) {
    return '<div class="avatar-sm">' + esc(initials(r)) + '</div>';
  }
  function empty(copy) {
    return '<div class="empty-state"><div><b>No records</b><p>' + esc(copy || 'Nothing here yet.') + '</p></div></div>';
  }

  /* ---------------- Shell fidelity + permissions ---------------- */
  function routeIdForPath() {
    return ROUTE_IDS[path()] || 'dashboard';
  }
  function applyAccess() {
    var r = role();
    var current = routeIdForPath();

    if (r === 'Employee' && !EMPLOYEE_ALLOWED.has(current) && path() !== '/admin/login') {
      location.replace('/admin');
      return false;
    }

    document.querySelectorAll('.side-link[data-nav]').forEach(function (link) {
      var allowed = r !== 'Employee' || EMPLOYEE_ALLOWED.has(link.dataset.nav);
      link.hidden = !allowed;
      var group = link.closest('.side-group');
      if (group) {
        var visible = Array.from(group.querySelectorAll('.side-link[data-nav]')).some(function (x) { return !x.hidden; });
        group.hidden = !visible;
      }
    });

    var bottom = document.querySelector('.m-bottom-bar');
    if (bottom && r === 'Employee') {
      bottom.innerHTML =
        '<a href="/admin" data-nav="dashboard"><b>☉</b>Home</a>' +
        '<a href="/admin/contact-forms" data-nav="contact"><b>✉</b>Leads</a>' +
        '<a href="/admin/crm" data-nav="crm"><b>📊</b>CRM</a>' +
        '<a href="/admin/website-activity" data-nav="activity"><b>📈</b>Activity</a>' +
        '<a href="#" data-menu><b>⋮</b>More</a>';
      var currentBottom = bottom.querySelector('[data-nav="' + current + '"]');
      if (currentBottom) currentBottom.classList.add('active');
    }
    return true;
  }

  function applyShell() {
    var app = document.querySelector('.admin-app');
    if (!app) return;
    app.classList.add('app-shell');

    var crumb = document.getElementById('crumb');
    if (crumb && crumb.textContent.indexOf(' · Stratex Admin Centre') >= 0) {
      crumb.textContent = crumb.textContent.replace(' · Stratex Admin Centre', '');
    }

    document.querySelectorAll('.side-link[data-nav="scoutlink"] .label').forEach(function (n) {
      n.textContent = 'Overview';
    });
    document.querySelectorAll('.side-link[data-nav="awards"] .ic').forEach(function (n) {
      n.textContent = '🏅';
    });

    document.querySelectorAll('.side-foot .side-user small').forEach(function (n) {
      n.textContent = role();
    });

    applyAccess();

    if (!state.shellBadgesLoaded && token()) {
      state.shellBadgesLoaded = true;
      Promise.all([
        api('/api/stratex-admin-centre/overview').catch(function () { return {data:{}}; }),
        api('/api/stratex-website/leads?limit=500').catch(function () { return {data:[]}; })
      ]).then(function (results) {
        var overview = results[0].data || {};
        var leads = results[1].data || [];
        setNavBadge('registrations', overview.pendingRegistrations || 0);
        var concerns = overview.openConcerns;
        if (concerns == null) {
          concerns = leads.filter(function (x) {
            return (/concern/i.test(String(x.lead_type || x.type || '')) || x.concern_type) &&
              !/resolved|closed/i.test(String(x.status || ''));
          }).length;
        }
        setNavBadge('trust', concerns || 0);
      });
    }
  }
  function setNavBadge(id, count) {
    document.querySelectorAll('.side-link[data-nav="' + id + '"]').forEach(function (link) {
      var b = link.querySelector('.badge');
      if (!count) {
        if (b) b.remove();
        return;
      }
      if (!b) {
        b = document.createElement('span');
        b.className = 'badge';
        link.appendChild(b);
      }
      b.textContent = count > 99 ? '99+' : String(count);
    });
  }

  /* ---------------- Login fidelity ---------------- */
  function patchLogin() {
    var card = document.querySelector('.login-card');
    if (!card || card.dataset.fidelity === '1') return;
    card.dataset.fidelity = '1';

    var params = new URLSearchParams(location.search);
    var codeMode = !!params.get('code');
    if (codeMode) return; // invitation flow remains deliberately functional.

    var logo = card.querySelector('.admin-logo');
    if (logo) {
      var wrap = document.createElement('div');
      wrap.className = 'cover-logo';
      logo.parentNode.insertBefore(wrap, logo);
      wrap.appendChild(logo);
      logo.style.width = '168px';
      logo.style.height = '74px';
    }

    var eyebrow = card.querySelector('.eyebrow');
    var h1 = card.querySelector('h1');
    var sub = card.querySelector('.sub');
    if (eyebrow) eyebrow.textContent = 'Admin Centre';
    if (h1) h1.textContent = 'Sign in';
    if (sub) sub.textContent = 'Staff access only — use your Stratex Analytics email to continue.';

    var email = card.querySelector('input[name="email"]');
    if (email) email.placeholder = 'you@stratexanalytics.co.uk';
    var pw = card.querySelector('input[name="password"]');
    if (pw) pw.placeholder = '••••••••••';

    var submit = document.getElementById('loginSubmit');
    if (submit) {
      submit.textContent = 'Sign in';
      submit.classList.add('volt');
    }

    var row = card.querySelector('.row-between');
    if (row) {
      row.innerHTML = '<button type="button" class="fidelity-login-forgot" data-forgot-password>Forgot password?</button>';
    }

    var foot = card.querySelector('.footnote');
    if (foot) foot.textContent = 'Two-factor authentication is required for Super Admin. Locked out? Contact Lucy Ali or Alexandro Ilioaie.';
  }

  function dialog(title, body) {
    var old = document.getElementById('fidelityDialog');
    if (old) old.remove();
    var host = document.createElement('div');
    host.id = 'fidelityDialog';
    host.innerHTML = matchMedia('(max-width:760px)').matches
      ? '<div class="sheet-host"><section class="sheet" role="dialog" aria-modal="true"><div class="sheet-grip"></div><header><h2>' + esc(title) + '</h2><button class="modal-close" type="button" data-fidelity-close>×</button></header><div class="sheet-body">' + body + '</div></section></div>'
      : '<div class="modal-host" style="position:fixed"><section class="modal narrow" role="dialog" aria-modal="true"><header><h2>' + esc(title) + '</h2><button class="modal-close" type="button" data-fidelity-close>×</button></header><div class="modal-body">' + body + '</div></section></div>';
    document.body.appendChild(host);
    document.body.classList.add('modal-open');
  }
  function closeDialog() {
    var host = document.getElementById('fidelityDialog');
    if (host) host.remove();
    document.body.classList.remove('modal-open');
  }
  function forgotPassword() {
    dialog('Reset password',
      '<form id="fidelityForgot"><label class="field full"><span>Work email</span><input class="input" name="email" type="email" placeholder="you@stratexanalytics.co.uk" required></label>' +
      '<div class="state-message" id="fidelityForgotMsg" hidden></div>' +
      '<button class="btn volt full" type="submit">Send reset code</button></form>');
  }

  /* ---------------- Exact dashboard composition ---------------- */
  function dashboardMarkup() {
    var hour = new Date().getHours();
    var greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    return (
      '<div class="hero"><div><span class="eyebrow">Admin Centre</span><h2>' + esc(greeting + ', ' + firstName()) + '</h2>' +
      '<p>One place to run Stratex Analytics and everything live on ScoutLink.</p></div>' +
      '<div class="hero-actions">' + button('Review registrations','registrations','') + button('Book a meeting','meetings','ghost') + '</div></div>' +
      '<div class="metrics n5">' +
        metric('Active players','—','Across grassroots teams','','fdPlayers') +
        metric('Active coaches','—','Live grassroots coaches','blue','fdCoaches') +
        metric('Active scouts','—','Reviewed Scout accounts','gold','fdScouts') +
        metric('Pending registrations','—','Awaiting review','red','fdPending') +
        metric('Open concerns','—','Trust & Concerns queue','purple','fdConcerns') +
      '</div>' +
      '<div class="quicklinks">' +
        quick('registrations','📄','Registrations','Awaiting review','Review →','fdQRegs') +
        quick('contact','✉','Website Leads','Public enquiries','Open →','fdQLeads') +
        quick('crm','📊','CRM','Connected records','Open →','fdQCrm') +
        quick('players','🏃','Players','Active records','Manage →','fdQPlayers') +
        quick('coaches','📝','Coaches','Active accounts','Manage →','fdQCoaches') +
        quick('teams','🏁','Teams','Grassroots teams','Manage →','fdQTeams') +
        quick('hiring','💼','Hiring','Roles and applicants','Open →','fdQHiring') +
        quick('trust','🔒','Trust & Concerns','Open cases','Review →','fdQTrust') +
      '</div>' +
      '<div class="two-col fidelity-dashboard-panels">' +
        '<div class="card"><header><div><h3>Recent pending registrations</h3><p>Newest first, across coaches and scouts</p></div></header><div class="card-body" id="fdRecentRegs"><div class="loading-state">Loading live records</div></div></div>' +
        '<div class="card"><header><div><h3>This week</h3><p>Meetings and leave across the team</p></div></header><div class="card-body" id="fdThisWeek"><div class="loading-state">Loading schedule</div></div></div>' +
      '</div>' +
      '<div class="note blue"><b>Coming soon</b><p style="margin:4px 0 0">AgentLink is in build. Once it ships, its accounts, revenue and support queues will surface here alongside ScoutLink — same shell, same permissions model.</p></div>'
    );
  }
  function quick(routeId, icon, title, copy, action, id) {
    return '<button class="qlink" type="button" data-nav="' + esc(routeId) + '"><span class="ic">' + icon + '</span><b>' +
      esc(title) + '</b><small id="' + esc(id) + '">' + esc(copy) + '</small><i>' + esc(action) + '</i></button>';
  }
  function setText(id, value) {
    var n = document.getElementById(id);
    if (n) n.textContent = value;
  }
  function renderRecentRegs(rows) {
    rows = (rows || []).slice(0,3);
    if (!rows.length) return empty('There are no registrations waiting for review.');
    var desktop = '<div class="table-wrap desktop-only"><table class="data-table"><thead><tr><th>Applicant</th><th>Type</th><th>Stage</th><th>Submitted</th><th>Actions</th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr class="clickable"><td><div class="record-cell">' + avatar(r) + '<div><b>' + esc(fullName(r)) + '</b><small>' +
          esc(r.team_name || r.scout_club || r.email || '') + '</small></div></div></td><td>' + esc(r.account_type || '—') +
          '</td><td>' + esc(regStageLabel(r)) + '</td><td>' + esc(fmtDate(r.created_at)) + '</td><td><div class="row-actions">' +
          '<button class="btn secondary small" data-nav="registrations">Review</button></div></td></tr>';
      }).join('') + '</tbody></table></div>';
    var mobile = '<div class="mrow-list mobile-only">' + rows.map(function (r) {
      return '<button class="mrow" data-nav="registrations" type="button">' + avatar(r) + '<div><h4>' + esc(fullName(r)) +
        '</h4><p>' + esc(r.team_name || r.scout_club || r.email || '') + '</p><small>' + esc(regStageLabel(r) + ' · ' + fmtDate(r.created_at)) +
        '</small></div><i class="chev">›</i></button>';
    }).join('') + '</div>';
    return desktop + mobile;
  }
  function regStageLabel(r) {
    var s = String(r.status || '').toLowerCase();
    var v = String(r.verification_status || '').toLowerCase();
    if (s === 'declined') return 'Declined';
    if (s === 'approved' || v === 'activated') return 'Account created';
    if (v === 'documents_submitted') return 'Safeguarding review';
    if (v === 'verified_awaiting_payment') return 'Awaiting payment';
    if (String(r.account_type || '').toLowerCase() === 'coach') return 'Admin review';
    return 'Awaiting documents';
  }
  function renderThisWeek(meetings, leave) {
    var items = [];
    (meetings || []).forEach(function (r) {
      items.push({
        when: new Date(r.meeting_date || r.start_at || 0).getTime(),
        title: r.title || 'Meeting',
        copy: fmtDate(r.meeting_date || r.start_at, true) + ' · ' + (r.location || 'No location'),
        status: ''
      });
    });
    (leave || []).forEach(function (r) {
      items.push({
        when: new Date(r.start_date || 0).getTime(),
        title: r.person ? fullName(r.person) : (r.person_name || 'Leave record'),
        copy: (r.leave_type || 'Leave') + ', ' + fmtDate(r.start_date) + ' to ' + fmtDate(r.end_date),
        status: r.status || ''
      });
    });
    items.sort(function (a,b) { return a.when - b.when; });
    items = items.filter(function (x) { return Number.isFinite(x.when) && x.when >= Date.now() - 86400000; }).slice(0,4);
    if (!items.length) return empty('No meetings or leave are scheduled in the current view.');
    return items.map(function (x) {
      return '<div class="toggle-row" style="cursor:default"><div><b>' + esc(x.title) + '</b><span>' + esc(x.copy) +
        '</span></div>' + (x.status ? pill(x.status) : '') + '</div>';
    }).join('');
  }
  async function renderDashboard() {
    var root = document.getElementById('adminMain');
    if (!root || root.dataset.fidelityDashboard === '1' || state.dashboardLoading) return;
    state.dashboardLoading = true;
    root.dataset.fidelityDashboard = '1';
    root.innerHTML = dashboardMarkup();
    try {
      var results = await Promise.all([
        api('/api/stratex-admin-centre/overview').catch(function () { return {data:{}}; }),
        api('/api/registrations?limit=50&status=').catch(function () { return {data:[]}; }),
        api('/api/stratex-admin-centre/meetings').catch(function () { return {data:[]}; }),
        api('/api/stratex-admin-centre/time-off').catch(function () { return {data:[],people:[]}; }),
        api('/api/stratex-website/leads?limit=500').catch(function () { return {data:[]}; }),
        api('/api/stratex/jobs').catch(function () { return {data:[]}; })
      ]);
      var o = results[0].data || {};
      var regs = results[1].data || [];
      var meetings = results[2].data || [];
      var leave = results[3].data || [];
      var leads = results[4].data || [];
      var jobs = results[5].data || [];

      var pendingRegs = regs.filter(function (r) {
        return !/approved|declined|activated/i.test(String(r.status || '') + ' ' + String(r.verification_status || ''));
      });
      var concerns = o.openConcerns;
      if (concerns == null) {
        concerns = leads.filter(function (x) {
          return (/concern/i.test(String(x.lead_type || x.type || '')) || x.concern_type) &&
            !/resolved|closed/i.test(String(x.status || ''));
        }).length;
      }

      setText('fdPlayers', num(o.players));
      setText('fdCoaches', num(o.coaches));
      setText('fdScouts', num(o.scouts));
      setText('fdPending', num(o.pendingRegistrations == null ? pendingRegs.length : o.pendingRegistrations));
      setText('fdConcerns', num(concerns || 0));

      setText('fdQRegs', num(pendingRegs.length) + ' awaiting review');
      setText('fdQLeads', num(leads.filter(function (x) { return /new|open|pending/i.test(String(x.status || 'new')); }).length) + ' open');
      setText('fdQCrm', 'Combined company records');
      setText('fdQPlayers', num(o.players) + ' active');
      setText('fdQCoaches', num(o.coaches) + ' active');
      setText('fdQTeams', num(o.teams) + ' grassroots teams');
      setText('fdQHiring', num(jobs.filter(function (x) { return /live|open|published/i.test(String(x.status || '')); }).length) + ' roles live');
      setText('fdQTrust', num(concerns || 0) + ' open');

      var rr = document.getElementById('fdRecentRegs');
      var tw = document.getElementById('fdThisWeek');
      if (rr) rr.innerHTML = renderRecentRegs(pendingRegs.sort(function (a,b) {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }));
      if (tw) tw.innerHTML = renderThisWeek(meetings, leave);
    } finally {
      state.dashboardLoading = false;
    }
  }

  /* ---------------- Exact ScoutLink overview composition ---------------- */
  async function renderScoutlinkOverview() {
    var root = document.getElementById('adminMain');
    if (!root || root.dataset.fidelityScoutlink === '1' || state.scoutlinkLoading) return;
    state.scoutlinkLoading = true;
    root.dataset.fidelityScoutlink = '1';
    root.innerHTML =
      '<div class="hero"><div><span class="eyebrow">ScoutLink Control</span><h2>Everything live on ScoutLink, in one place</h2>' +
      '<p>Players, coaches, teams, scouts and agencies. View, edit and act on any of it without leaving the Admin Centre.</p></div>' +
      '<div class="hero-actions">' + button('Add a team','teams','') + button('Invite a coach','coaches','ghost') + '</div></div>' +
      '<div class="metrics n5">' +
        metric('Active players','—','Grassroots player records','','slfPlayers') +
        metric('Active coaches','—','Coach accounts','blue','slfCoaches') +
        metric('Active scouts','—','Reviewed scouts','gold','slfScouts') +
        metric('Grassroots teams','—','Verified teams','purple','slfTeams') +
        metric('Scout agencies','—','Agency workspaces','grey','slfAgencies') +
      '</div>' +
      '<div class="quicklinks n3">' +
        quick('players','🏃','Players','Live player records','Manage →','slfQPlayers') +
        quick('coaches','📝','Coaches','Live coach accounts','Manage →','slfQCoaches') +
        quick('teams','🏁','Teams','Grassroots teams','Manage →','slfQTeams') +
        quick('scouts','🔍','Scouts & Agencies','Accounts and plans','Manage →','slfQScouts') +
        quick('registrations','📄','Registrations','Pending access','Review →','slfQRegs') +
        quick('trust','🔒','Trust & Concerns','Open cases','Review →','slfQTrust') +
      '</div>' +
      '<div class="two-col"><div class="card"><header><div><h3>Needs attention</h3><p>Items requiring an admin decision</p></div></header><div class="card-body" id="slfAttention"><div class="loading-state">Loading</div></div></div>' +
      '<div class="card"><header><div><h3>Recent actions</h3><p>Latest auditable Admin Centre changes</p></div></header><div class="card-body" id="slfActions"><div class="loading-state">Loading</div></div></div></div>';

    try {
      var results = await Promise.all([
        api('/api/stratex-admin-centre/overview').catch(function () { return {data:{}}; }),
        api('/api/stratex-admin-centre/scouts').catch(function () { return {data:{scouts:[],agencies:[]}}; }),
        api('/api/registrations?limit=50&status=').catch(function () { return {data:[]}; }),
        api('/api/stratex-admin-centre/audit-log?limit=8').catch(function () { return {data:[]}; }),
        api('/api/usage-requests').catch(function () { return {data:[]}; })
      ]);
      var o = results[0].data || {};
      var bundle = results[1].data || {};
      var regs = results[2].data || [];
      var audits = results[3].data || [];
      var usage = results[4].data || [];
      var pendingRegs = regs.filter(function (r) {
        return !/approved|declined|activated/i.test(String(r.status || '') + ' ' + String(r.verification_status || ''));
      });
      var pendingUsage = usage.filter(function (r) { return /pending|new|review/i.test(String(r.status || 'pending')); });

      setText('slfPlayers', num(o.players));
      setText('slfCoaches', num(o.coaches));
      setText('slfScouts', num(o.scouts));
      setText('slfTeams', num(o.teams));
      setText('slfAgencies', num((bundle.agencies || []).length));
      setText('slfQPlayers', num(o.players) + ' records');
      setText('slfQCoaches', num(o.coaches) + ' accounts');
      setText('slfQTeams', num(o.teams) + ' grassroots teams');
      setText('slfQScouts', num(o.scouts) + ' scouts, ' + num((bundle.agencies || []).length) + ' agencies');
      setText('slfQRegs', num(pendingRegs.length) + ' pending');
      setText('slfQTrust', num(o.openConcerns || 0) + ' open');

      var attention = pendingRegs.slice(0,3).map(function (r) {
        return '<div class="toggle-row"><div><b>' + esc(fullName(r)) + '</b><span>' +
          esc((r.team_name || r.scout_club || 'ScoutLink registration') + ' · ' + regStageLabel(r)) +
          '</span></div><button class="btn secondary small" data-nav="registrations">Review ›</button></div>';
      });
      pendingUsage.slice(0,2).forEach(function (r) {
        attention.push('<div class="toggle-row"><div><b>' + esc(r.organisation_name || 'Usage request') + '</b><span>' +
          esc((r.allowance_type || 'Allowance') + ' · ' + (r.quantity_requested || 0) + ' requested') +
          '</span></div><button class="btn secondary small" data-nav="scouts">Review ›</button></div>');
      });
      var a = document.getElementById('slfAttention');
      if (a) a.innerHTML = attention.length ? attention.join('') : empty('Nothing currently needs attention.');

      var recent = audits.slice(0,5).map(function (r) {
        return '<div class="toggle-row" style="cursor:default"><div><b>' + esc(r.action || 'Admin action') +
          '</b><span>' + esc((r.affected_table || 'Record') + ' · ' + fmtDate(r.created_at, true)) + '</span></div></div>';
      });
      var ar = document.getElementById('slfActions');
      if (ar) ar.innerHTML = recent.length ? recent.join('') : empty('No recent audit actions.');
    } finally {
      state.scoutlinkLoading = false;
    }
  }


  /* ---------------- CRM: exact combined pipeline, backed by live source APIs ---------------- */
  function crmId(prefix, row) {
    var explicit = row && (row.recordId || row.lead_code || row.registration_reference || row.coach_id || row.scout_id || row.application_ref);
    if (explicit) return String(explicit);
    var id = String(row && row.id || '').replace(/-/g,'').toUpperCase();
    return prefix + '-' + (id ? id.slice(-6) : '—');
  }
  function crmTypeTone(category) {
    if (category === 'lead') return 'blue';
    if (category === 'registration') return 'gold';
    if (category === 'account') return 'green';
    if (category === 'job') return 'purple';
    return 'grey';
  }
  function crmNormalise(results) {
    var rows = [];
    var leads = results[0] && results[0].data || [];
    var registrations = results[1] && results[1].data || [];
    var coaches = results[2] && results[2].data || [];
    var scoutPayload = results[3] && results[3].data || {};
    var scouts = Array.isArray(scoutPayload) ? scoutPayload : (scoutPayload.scouts || []);
    var applications = results[4] && results[4].data || [];
    var central = results[5] && results[5].data || [];

    function add(row) {
      var email = String(row.email || '').toLowerCase();
      var duplicate = rows.some(function (x) {
        if (row.id && x.id === row.id) return true;
        return email && email === String(x.email || '').toLowerCase() &&
          row.category === x.category && row.typeLabel === x.typeLabel;
      });
      if (!duplicate) rows.push(row);
    }

    central.forEach(function (r) {
      var typeText = String(r.type || r.source || '').toLowerCase();
      var category = /registration/.test(typeText) ? 'registration'
        : /job|candidate|career/.test(typeText) ? 'job'
        : /lead|contact|form|enquiry/.test(typeText) ? 'lead'
        : 'account';
      var typeLabel = category === 'job' ? 'Job application'
        : category === 'registration' ? 'ScoutLink registration'
        : category === 'lead' ? 'Lead'
        : /coach/.test(typeText) ? 'ScoutLink Coach account'
        : /scout/.test(typeText) ? 'ScoutLink Scout account'
        : (r.type || 'ScoutLink account');
      add({
        id: String(r.recordId || r.id || crmId(category === 'lead' ? 'LD' : category === 'registration' ? 'REG' : category === 'job' ? 'JA' : 'ACC', r)),
        raw: r,
        category: category,
        typeLabel: typeLabel,
        product: r.product || (/scoutlink/i.test(String(r.source || '') + ' ' + typeText) ? 'ScoutLink' : 'Stratex'),
        name: r.name || r.full_name || r.email || '—',
        email: r.email || '',
        organisation: r.organisation || '—',
        status: r.status || 'Active',
        created: r.createdAt || r.created_at,
        source: r.source || r.type || 'CRM'
      });
    });

    leads.forEach(function (r) {
      var scoutLink = /scoutlink/i.test(String(r.product || '') + ' ' + String(r.source_page || '') + ' ' + String(r.lead_type || ''));
      add({
        id: crmId('LD', r),
        raw: r,
        category: 'lead',
        typeLabel: 'Lead',
        product: scoutLink ? 'ScoutLink' : 'Stratex',
        name: r.full_name || fullName(r),
        email: r.email || '',
        organisation: r.organisation || '—',
        status: r.status || 'New',
        created: r.created_at,
        source: r.lead_type || r.reason || 'Website lead'
      });
    });

    registrations.forEach(function (r) {
      add({
        id: crmId('REG', r),
        raw: r,
        category: 'registration',
        typeLabel: 'ScoutLink registration',
        product: 'ScoutLink',
        name: fullName(r),
        email: r.email || '',
        organisation: r.team_name || r.scout_club || '—',
        status: r.status || r.verification_status || 'Pending',
        created: r.created_at,
        source: String(r.account_type || 'Registration')
      });
    });

    coaches.forEach(function (r) {
      add({
        id: crmId('CHC', r),
        raw: r,
        category: 'account',
        typeLabel: 'ScoutLink Coach account',
        product: 'ScoutLink',
        name: fullName(r),
        email: r.email || '',
        organisation: r.team_name || '—',
        status: r.is_active === false ? 'Inactive' : 'Active',
        created: r.created_at,
        source: r.role_at_club || 'Coach'
      });
    });

    scouts.forEach(function (r) {
      add({
        id: crmId('SCT', r),
        raw: r,
        category: 'account',
        typeLabel: 'ScoutLink Scout account',
        product: 'ScoutLink',
        name: fullName(r),
        email: r.email || '',
        organisation: r.club_name || '—',
        status: r.is_active === false ? 'Inactive' : 'Active',
        created: r.created_at,
        source: 'Scout'
      });
    });

    applications.forEach(function (r) {
      var job = r.job_posts || {};
      add({
        id: crmId('JA', r),
        raw: r,
        category: 'job',
        typeLabel: 'Job application',
        product: 'Stratex',
        name: fullName(r),
        email: r.email || '',
        organisation: job.department || r.department || '—',
        status: r.status || 'Submitted',
        created: r.submitted_at || r.created_at,
        source: job.job_title || r.job_title || 'Careers'
      });
    });

    rows.sort(function (a,b) {
      return new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime();
    });
    return rows;
  }
  function crmTableRows(rows) {
    return rows.map(function (r) {
      return '<tr class="clickable" data-crm-record="' + esc(r.id) + '">' +
        '<td><span class="mono-id">' + esc(r.id) + '</span></td>' +
        '<td><div class="record-cell">' + avatar({name:r.name}) + '<div><b>' + esc(r.name || '—') + '</b><small>' + esc(r.email || '') + '</small></div></div></td>' +
        '<td>' + esc(r.organisation || '—') + '</td>' +
        '<td>' + pill(r.typeLabel, crmTypeTone(r.category)) + '</td>' +
        '<td>' + esc(r.product || 'Stratex') + '</td>' +
        '<td>' + esc(r.status || '—') + '</td>' +
        '<td>' + esc(fmtDate(r.created)) + '</td>' +
      '</tr>';
    }).join('');
  }
  function crmMobileRows(rows) {
    return rows.map(function (r) {
      return '<button class="mrow" type="button" data-crm-record="' + esc(r.id) + '">' +
        avatar({name:r.name}) +
        '<div><h4>' + esc(r.name || '—') + '</h4><p>' + esc(r.organisation || '—') + '</p><small>' +
        esc(r.id + ' · ' + fmtDate(r.created)) + '</small></div>' +
        pill(r.typeLabel, crmTypeTone(r.category)) + '<i class="chev">›</i></button>';
    }).join('');
  }
  function crmFiltered(tab) {
    var rows = state.crmRows || [];
    if (!tab || tab === 'all') return rows;
    return rows.filter(function (r) { return r.category === tab; });
  }
  function paintCrm(tab) {
    var rows = crmFiltered(tab);
    var tbody = document.getElementById('fidelityCrmBody');
    var mobileRows = document.getElementById('fidelityCrmMobile');
    var count = document.getElementById('fidelityCrmCount');
    if (tbody) tbody.innerHTML = crmTableRows(rows);
    if (mobileRows) mobileRows.innerHTML = crmMobileRows(rows);
    if (count) count.textContent = num(rows.length);
    document.querySelectorAll('[data-crm-tab]').forEach(function (b) {
      b.classList.toggle('active', (b.dataset.crmTab || 'all') === (tab || 'all'));
    });
  }
  function crmDetail(recordId) {
    var r = (state.crmRows || []).find(function (x) { return x.id === recordId; });
    if (!r) return;
    var raw = r.raw || {};
    dialog('CRM · ' + (r.name || 'Record'),
      '<div class="detail-grid n2">' +
        '<div><small>Record ID</small><b>' + esc(r.id) + '</b></div>' +
        '<div><small>Type</small><b>' + esc(r.typeLabel) + '</b></div>' +
        '<div><small>Email</small><b>' + esc(r.email || '—') + '</b></div>' +
        '<div><small>Organisation</small><b>' + esc(r.organisation || '—') + '</b></div>' +
        '<div><small>Product</small><b>' + esc(r.product || '—') + '</b></div>' +
        '<div><small>Status</small><b>' + esc(r.status || '—') + '</b></div>' +
        '<div><small>Source</small><b>' + esc(r.source || '—') + '</b></div>' +
        '<div><small>Created</small><b>' + esc(fmtDate(r.created, true)) + '</b></div>' +
      '</div>' +
      '<div class="linked-rail" style="margin-top:18px"><b>Connected source record</b><div class="linked-chip-row">' +
        '<span class="linked-chip"><span class="ic c-lead">' + esc(r.category === 'account' ? 'A' : r.category === 'registration' ? 'R' : r.category === 'job' ? 'J' : 'L') +
        '</span><b>' + esc(r.typeLabel) + '</b><span>' + esc(raw.id || r.id) + '</span></span>' +
      '</div></div>');
  }
  async function renderCrm() {
    var root = document.getElementById('adminMain');
    if (!root || state.crmLoading || state.crmRendered) return;

    /* Let the core route initialise first so its async loader cannot race a removed DOM. */
    var coreRows = document.getElementById('crmRows');
    if (coreRows && coreRows.querySelector('.loading-state')) return;

    state.crmLoading = true;
    try {
      var results = await Promise.all([
        api('/api/stratex-website/leads?limit=500').catch(function () { return {data:[]}; }),
        api('/api/registrations?limit=500&status=').catch(function () { return {data:[]}; }),
        api('/api/stratex-admin-centre/coaches').catch(function () { return {data:[]}; }),
        api('/api/stratex-admin-centre/scouts').catch(function () { return {data:{scouts:[]}}; }),
        api('/api/stratex/job-applications').catch(function () { return {data:[]}; }),
        api('/api/stratex-website/crm').catch(function () { return {data:[]}; })
      ]);
      state.crmRows = crmNormalise(results);
      state.crmRendered = true;
      root.dataset.fidelityLayout = path();
      root.innerHTML =
        '<div class="tabs fidelity-crm-tabs">' +
          '<button class="active" type="button" data-crm-tab="all">All records (' + num(state.crmRows.length) + ')</button>' +
          '<button type="button" data-crm-tab="lead">Leads</button>' +
          '<button type="button" data-crm-tab="registration">Registrations</button>' +
          '<button type="button" data-crm-tab="account">ScoutLink accounts</button>' +
          '<button type="button" data-crm-tab="job">Job applications</button>' +
        '</div>' +
        '<section class="data fidelity-crm-data"><div class="data-head"><div><h3>CRM</h3><p>Leads, registrations, ScoutLink accounts and job applications in one pipeline</p></div>' +
          '<div class="data-head-actions"><div class="data-count"><b id="fidelityCrmCount">' + num(state.crmRows.length) + '</b><span>Records</span></div>' +
          '<button class="btn small" type="button" data-crm-export>Export to Excel</button></div></div>' +
          '<div class="table-wrap desktop-only"><table class="data-table"><thead><tr><th>Record ID</th><th>Name</th><th>Organisation</th><th>Type</th><th>Product</th><th>Status</th><th>Created</th></tr></thead>' +
          '<tbody id="fidelityCrmBody">' + crmTableRows(state.crmRows) + '</tbody></table></div>' +
          '<div class="mrow-list mobile-only" id="fidelityCrmMobile">' + crmMobileRows(state.crmRows) + '</div>' +
        '</section>';
    } finally {
      state.crmLoading = false;
    }
  }

  /* ---------------- Compact list-page composition ---------------- */
  function extractHeroActions(root, keep) {
    var hero = root.querySelector(':scope > .hero');
    if (!hero) return [];
    var actions = keep ? Array.from(hero.querySelectorAll('.hero-actions > *')) : [];
    hero.remove();
    return actions;
  }
  function actionRow(actions) {
    if (!actions || !actions.length) return null;
    var row = document.createElement('div');
    row.className = 'fidelity-section-action';
    actions.forEach(function (x) { row.appendChild(x); });
    return row;
  }
  function tabMarkup(items) {
    return '<div class="tabs fidelity-tabs">' + items.map(function (x, i) {
      return '<button type="button" class="' + (i === 0 ? 'active' : '') + '" data-fidelity-tab="' + esc(x[1] || '') + '">' + esc(x[0]) + '</button>';
    }).join('') + '</div>';
  }
  function filterMarkup(fields) {
    return '<div class="filters fidelity-filters">' + fields.map(function (f) {
      if (f.type === 'search') {
        return '<label class="field"><span>' + esc(f.label) + '</span><input class="input" type="search" data-fidelity-filter="' + esc(f.key) + '" placeholder="' + esc(f.placeholder || '') + '"></label>';
      }
      return '<label class="field"><span>' + esc(f.label) + '</span><select class="select" data-fidelity-filter="' + esc(f.key) + '">' +
        f.options.map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>'; }).join('') + '</select></label>';
    }).join('') + '<button class="btn" type="button" data-fidelity-apply>Apply filters</button></div>';
  }
  function prepend(root, html) {
    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    Array.from(wrap.childNodes).reverse().forEach(function (n) {
      root.insertBefore(n, root.firstChild);
    });
  }
  function prepareListRoute(root, cfg) {
    if (root.dataset.fidelityLayout === path()) return;
    root.dataset.fidelityLayout = path();

    var actions = extractHeroActions(root, !!cfg.keepHeroActions);
    if (cfg.removeMetrics) {
      var m = root.querySelector(':scope > .metrics');
      if (m) m.remove();
    }
    if (cfg.removeNotes) {
      root.querySelectorAll(':scope > .note').forEach(function (n) { n.remove(); });
    }

    var chunks = [];
    if (cfg.tabs) chunks.push(tabMarkup(cfg.tabs));
    if (cfg.filters) chunks.push(filterMarkup(cfg.filters));
    if (chunks.length) prepend(root, chunks.join(''));

    var ar = actionRow(actions);
    if (ar) {
      var controls = root.querySelector('.fidelity-filters');
      if (controls) controls.insertAdjacentElement('afterend', ar);
      else root.insertBefore(ar, root.firstChild);
    }

    if (cfg.stackTwoCol) {
      var two = root.querySelector(':scope > .two-col');
      if (two) two.classList.add('fidelity-stack');
    }
  }

  var layouts = {
    '/admin/registrations': {
      keepHeroActions:true, removeMetrics:true,
      tabs:[['All',''],['Coaches','coach'],['Scouts','scout']],
      filters:[
        {type:'search',label:'Search',key:'search',placeholder:'Name, email or organisation'},
        {type:'select',label:'Type',key:'type',options:[['','All types'],['coach','Coach'],['scout','Scout']]},
        {type:'select',label:'Stage',key:'stage',options:[['','All stages'],['documents','Documents'],['review','Review'],['payment','Payment']]}
      ]
    },
    '/admin/contact-forms': {
      filters:[
        {type:'search',label:'Search',key:'search',placeholder:'Name, email or organisation'},
        {type:'select',label:'Type',key:'type',options:[['','All types'],['contact','Contact'],['demo','Demo request'],['newsletter','Newsletter']]},
        {type:'select',label:'Status',key:'status',options:[['','All statuses'],['new','New'],['pending','Pending'],['active','Active'],['closed','Archived']]}
      ]
    },
    '/admin/crm': {
      keepHeroActions:true, removeMetrics:true,
      tabs:[['All records',''],['Leads','lead'],['Registrations','registration'],['ScoutLink accounts','scoutlink'],['Job applications','job']]
    },
    '/admin/website-activity': {stackTwoCol:true},
    '/admin/blog': {tabs:[['All',''],['Published','published'],['Draft','draft']]},
    '/admin/scoutlink/players': {
      keepHeroActions:true,
      filters:null
    },
    '/admin/scoutlink/coaches': {
      keepHeroActions:true,
      filters:[
        {type:'search',label:'Search',key:'search',placeholder:'Coach, email or team'},
        {type:'select',label:'Access',key:'access',options:[['','All access'],['super user','Super User'],['standard','Standard']]},
        {type:'select',label:'Status',key:'status',options:[['','All statuses'],['active','Active'],['inactive','Inactive']]}
      ]
    },
    '/admin/scoutlink/teams': {
      keepHeroActions:true,
      filters:[
        {type:'search',label:'Search',key:'search',placeholder:'Team, county, city or league'},
        {type:'select',label:'Status',key:'status',options:[['','All statuses'],['active','Active'],['archived','Archived']]}
      ]
    },
    '/admin/scoutlink/scouts': {
      keepHeroActions:true,
      filters:[
        {type:'search',label:'Search',key:'search',placeholder:'Scout, agency or organisation'},
        {type:'select',label:'Plan',key:'plan',options:[['','All plans'],['core','Core'],['plus','Plus'],['elite','Elite'],['enterprise','Enterprise']]},
        {type:'select',label:'Status',key:'status',options:[['','All statuses'],['active','Active'],['inactive','Inactive']]}
      ]
    },
    '/admin/leadership': {keepHeroActions:true},
    '/admin/org-charts': {},
    '/admin/admin-users': {keepHeroActions:true},
    '/admin/contracts-pay': {},
    '/admin/leave-sick-leave': {
      keepHeroActions:true,
      filters:[
        {type:'search',label:'Staff',key:'search',placeholder:'Name or job title'},
        {type:'select',label:'Type',key:'type',options:[['','All types'],['annual leave','Annual Leave'],['sick leave','Sick Leave']]},
        {type:'select',label:'Status',key:'status',options:[['','All statuses'],['pending','Pending'],['approved','Approved'],['recorded','Recorded'],['declined','Declined']]}
      ]
    },
    '/admin/hiring': {keepHeroActions:true},
    '/admin/meetings': {keepHeroActions:true},
    '/admin/trust-concerns': {
      keepHeroActions:true, removeNotes:true,
      filters:[
        {type:'search',label:'Search',key:'search',placeholder:'Case, reporter or category'},
        {type:'select',label:'Status',key:'status',options:[['','All statuses'],['open','Open'],['review','Reviewing'],['resolved','Resolved'],['closed','Closed']]},
        {type:'select',label:'Priority',key:'priority',options:[['','All priorities'],['high','High'],['standard','Medium'],['low','Low']]}
      ]
    },
    '/admin/showcase-event': {keepHeroActions:true},
    '/admin/award-ceremonies': {keepHeroActions:true},
    '/admin/settings': {tabs:[['General & Publishing','general'],['Security & Notifications','security']]},
    '/admin/audit-log': {
      filters:[
        {type:'search',label:'Actor / target',key:'search',placeholder:'Admin, action or record'},
        {type:'select',label:'Action type',key:'action',options:[['','All actions'],['scout','ScoutLink'],['registration','Registrations'],['crm','CRM'],['contract','Contracts'],['concern','Concerns']]}
      ]
    }
  };

  function applyListLayout() {
    var root = document.getElementById('adminMain');
    var cfg = layouts[path()];
    if (!root || !cfg) return;
    prepareListRoute(root, cfg);
  }

  function filterRows(root) {
    if (!root) return;
    var filters = Array.from(root.querySelectorAll('[data-fidelity-filter]')).map(function (el) {
      return String(el.value || '').trim().toLowerCase();
    }).filter(Boolean);
    var tab = String(root.dataset.fidelityTab || '').toLowerCase();
    var data = root.querySelector('.data') || root;
    var rows = Array.from(data.querySelectorAll('tbody tr, .mrow-list > .mrow'));
    rows.forEach(function (row) {
      var text = String(row.textContent || '').toLowerCase();
      var ok = filters.every(function (value) { return text.indexOf(value) >= 0; });
      if (tab) ok = ok && text.indexOf(tab) >= 0;
      row.style.display = ok ? '' : 'none';
    });
  }

  /* ---------------- Profile composition incl. own contract/pay ---------------- */
  async function enhanceProfile() {
    var root = document.getElementById('adminMain');
    var host = document.getElementById('profileRows');
    if (!root || !host || host.dataset.fidelity === '1' || state.profileLoading) return;
    state.profileLoading = true;
    extractHeroActions(root, false);
    try {
      var results = await Promise.all([
        api('/api/stratex/org').catch(function () { return {data:[]}; }),
        api('/api/stratex/contracts-pay').catch(function () { return {data:[]}; })
      ]);
      var orgPayload = results[0];
      var people = Array.isArray(orgPayload) ? orgPayload : (orgPayload.admins || orgPayload.data || orgPayload.users || []);
      var me = people.find(function (x) { return String(x.id) === String(getUser().id); }) || getUser();
      var contracts = results[1].data || [];
      var mine = contracts.find(function (x) { return String(x.id) === String(me.id) || String(x.stratex_id || '') === String(me.id); });
      var c = mine && (mine.contract_data || {}) || {};

      host.innerHTML =
        '<div class="card"><div class="profile-identity"><div class="side-avatar">' + esc(initials(me)) + '</div><div><h3>' + esc(fullName(me)) +
        '</h3><p>' + esc((me.job_title || 'Stratex Analytics') + ' · ' + role()) + '</p></div></div></div>' +
        '<div class="two-col">' +
          '<div class="card"><header><h3>Contact details</h3></header><div class="card-body">' +
            '<div class="toggle-row"><div><b>Name</b><span>' + esc(fullName(me)) + '</span></div></div>' +
            '<div class="toggle-row"><div><b>Email</b><span>' + esc(me.email || '') + '</span></div></div>' +
            '<div class="toggle-row"><div><b>Job title</b><span>' + esc(me.job_title || '—') + '</span></div></div>' +
            '<div class="toggle-row"><div><b>Phone</b><span>' + esc(me.phone || '—') + '</span></div></div>' +
          '</div></div>' +
          '<div class="card"><header><h3>Security</h3></header><div class="card-body">' +
            '<div class="toggle-row"><div><b>Two-factor authentication</b><span>' + (role() === 'Super Admin' ? 'Required for Super Admin' : 'Account security setting') + '</span></div>' +
              (role() === 'Super Admin' ? pill('Required','green') : pill('Account level','grey')) + '</div>' +
            '<div class="toggle-row"><div><b>Password</b><span>Update your Stratex Admin password</span></div><button class="btn secondary small" data-change-password>Change password</button></div>' +
          '</div></div>' +
        '</div>' +
        '<div class="two-col">' +
          '<div class="card"><header><h3>Notifications</h3></header><div class="card-body">' +
            '<div class="toggle-row"><div><b>New registration submitted</b><span>Email + in-app</span></div>' + pill('On','green') + '</div>' +
            '<div class="toggle-row"><div><b>Trust & Concerns case opened</b><span>Email + in-app</span></div>' + pill('On','green') + '</div>' +
            '<div class="toggle-row"><div><b>Weekly summary digest</b><span>Email only</span></div>' + pill('On','green') + '</div>' +
          '</div></div>' +
          '<div class="card"><header><h3>My contract & pay</h3><p>Visible only to you and authorised Management</p></header><div class="card-body">' +
            (mine ? '<div class="contract-amount"><small>Pay record</small><strong>' + esc(c.payAmount ? '£' + c.payAmount : 'Not set') +
              '</strong><span>' + esc(c.payFrequency || 'Frequency not set') + '</span></div>' +
              '<div class="detail-grid n2" style="margin-top:14px"><div><small>Contract type</small><b>' + esc(c.contractType || c.contract_type || '—') +
              '</b></div><div><small>Status</small><b>' + esc(c.payStatus || c.status || '—') + '</b></div></div>'
              : empty('No contract or pay record is available to this account.')) +
          '</div></div>' +
        '</div>';
      host.dataset.fidelity = '1';
    } finally {
      state.profileLoading = false;
    }
  }




  async function ensureShowcaseEventId() {
    if (state.showcaseEventId) return state.showcaseEventId;
    if (state.showcaseIndex == null) return null;
    try {
      var payload = await api('/api/stratex-publishing/admin/showcase-events');
      var events = payload.data || [];
      var ev = events[Number(state.showcaseIndex)];
      state.showcaseEventId = ev && ev.id || null;
      return state.showcaseEventId;
    } catch (_) {
      return null;
    }
  }
  function showcasePlayerStatus(r) {
    return r.selected_for_showcase ? 'Selected' : (r.status || 'Submitted');
  }
  function showcasePlayerRows(rows) {
    return rows.map(function (r) {
      return '<tr class="clickable">' +
        '<td><div class="record-cell">' + avatar({name:fullName(r)}) + '<div><b>' + esc(fullName(r)) + '</b><small>' + esc(r.team_name || 'No team') + '</small></div></div></td>' +
        '<td>' + pill(showcasePlayerStatus(r), statusTone(showcasePlayerStatus(r))) + '</td>' +
        '<td>' + esc(fmtDate(r.submitted_at || r.created_at)) + '</td>' +
        '<td><button class="btn secondary small" type="button" data-showcase-player-review="' + esc(r.id) + '">Review</button></td>' +
      '</tr>';
    }).join('');
  }
  function showcasePlayerMobileRows(rows) {
    return rows.map(function (r) {
      return '<button class="mrow" type="button" data-showcase-player-review="' + esc(r.id) + '">' +
        avatar({name:fullName(r)}) +
        '<div><h4>' + esc(fullName(r)) + '</h4><p>' + esc(r.team_name || 'No team') + '</p><small>' +
          esc(fmtDate(r.submitted_at || r.created_at)) + '</small></div>' +
        pill(showcasePlayerStatus(r), statusTone(showcasePlayerStatus(r))) + '<i class="chev">›</i></button>';
    }).join('');
  }
  async function renderShowcasePlayersExact() {
    if (path() !== '/admin/showcase-event' || state.showcaseView !== 'players' || state.showcasePlayersLoading) return;
    var host = document.getElementById('shview');
    if (!host) return;
    var eventId = await ensureShowcaseEventId();
    if (!eventId) return;
    var exactTable = host.querySelector('[data-fidelity-player-table]');
    if (exactTable && String(exactTable.dataset.fidelityPlayerTable) === String(eventId)) return;
    state.showcasePlayersLoading = true;
    try {
      var rows;
      if (state.showcasePlayersEventId === eventId && state.showcasePlayers.length) {
        rows = state.showcasePlayers;
      } else {
        rows = (await api('/api/stratex-publishing/admin/showcase-events/' + encodeURIComponent(eventId) + '/players')).data || [];
        state.showcasePlayersEventId = eventId;
        state.showcasePlayers = rows;
      }
      host.innerHTML =
        '<section class="data" data-fidelity-player-table="' + esc(eventId) + '"><div class="data-head"><div><h3>Player applications</h3>' +
        '<p>submitted / reviewing / selected / declined</p></div><div class="data-head-actions"><div class="data-count"><b>' +
        num(rows.length) + '</b><span>Total</span></div></div></div>' +
        '<div class="table-wrap desktop-only"><table class="data-table"><thead><tr><th>Player</th><th>Status</th><th>Submitted</th><th>Actions</th></tr></thead><tbody>' +
        showcasePlayerRows(rows) + '</tbody></table></div>' +
        '<div class="mrow-list mobile-only">' + showcasePlayerMobileRows(rows) + '</div></section>';
    } catch (x) {
      host.innerHTML = empty(x.message || 'Player applications could not be loaded.');
    } finally {
      state.showcasePlayersLoading = false;
    }
  }
  function reviewShowcasePlayer(playerId) {
    var player = (state.showcasePlayers || []).find(function (r) { return String(r.id) === String(playerId); });
    if (!player || !state.showcaseEventId) return;
    var status = String(showcasePlayerStatus(player) || 'Submitted').toLowerCase();
    dialog('Review · ' + fullName(player),
      '<div class="detail-grid n2">' +
        '<div><small>Player</small><b>' + esc(fullName(player)) + '</b></div>' +
        '<div><small>Team</small><b>' + esc(player.team_name || '—') + '</b></div>' +
        '<div><small>Age</small><b>' + esc(player.age_on_event_date == null ? '—' : player.age_on_event_date) + '</b></div>' +
        '<div><small>Positions</small><b>' + esc((player.positions || []).join(', ') || '—') + '</b></div>' +
        '<div><small>Reference</small><b>' + esc(player.registration_reference || '—') + '</b></div>' +
        '<div><small>Submitted</small><b>' + esc(fmtDate(player.submitted_at || player.created_at, true)) + '</b></div>' +
      '</div>' +
      '<form id="fidelityShowcasePlayerReview" data-player-id="' + esc(player.id) + '" style="margin-top:18px">' +
        '<label class="field full"><span>Status</span><select class="select" name="status">' +
          '<option value="submitted"' + (status === 'submitted' || status === 'new' ? ' selected' : '') + '>Submitted</option>' +
          '<option value="reviewing"' + (status === 'reviewing' ? ' selected' : '') + '>Reviewing</option>' +
          '<option value="selected"' + (status === 'selected' ? ' selected' : '') + '>Selected</option>' +
          '<option value="declined"' + (status === 'declined' ? ' selected' : '') + '>Declined</option>' +
        '</select></label>' +
        '<label class="field full"><span>Internal notes</span><textarea class="textarea" name="internalNotes">' + esc(player.internal_notes || '') + '</textarea></label>' +
        '<div class="state-message" id="fidelityShowcasePlayerMsg" hidden></div>' +
        '<button class="btn full" type="submit">Save review</button>' +
      '</form>');
  }

  /* ---------------- Showcase: match each supplied screen state, not one permanent overview ---------------- */
  function enhanceShowcaseState() {
    if (path() !== '/admin/showcase-event') return;
    var root = document.getElementById('adminMain');
    var detail = document.getElementById('showcaseDetail');
    var rowsHost = document.getElementById('showcaseRows');
    if (!root || !detail || !detail.children.length) return;

    detail.classList.add('fidelity-showcase-state');

    var hero = detail.querySelector(':scope > .hero');
    if (hero) {
      var heroActions = hero.querySelector('.hero-actions');
      var actions = document.createElement('div');
      actions.className = 'fidelity-showcase-actions';
      if (heroActions) {
        while (heroActions.firstChild) actions.appendChild(heroActions.firstChild);
      }
      hero.remove();
      if (actions.children.length) detail.insertBefore(actions, detail.firstChild);
    }

    var tabs = detail.querySelector(':scope > .tabs');
    if (tabs) {
      tabs.querySelectorAll('[data-shview]').forEach(function (b) {
        if (b.dataset.shview === 'overview') b.textContent = 'Event details';
        if (b.dataset.shview === 'pros') b.textContent = 'Professional registrations';
      });
    }

    var active = tabs && tabs.querySelector('[data-shview].active');
    var view = active ? active.dataset.shview : 'overview';
    state.showcaseView = view || 'overview';

    var metrics = detail.querySelector(':scope > .metrics');
    if (metrics) {
      metrics.classList.add('n3');
      var cards = Array.from(metrics.querySelectorAll(':scope > .metric'));
      if (cards[0]) {
        var s0 = cards[0].querySelector('small');
        if (s0) s0.textContent = 'Player applications';
      }
      if (cards[1]) {
        var s1 = cards[1].querySelector('small');
        if (s1) s1.textContent = 'Professional registrations';
      }
      if (cards[2]) {
        var s2 = cards[2].querySelector('small');
        if (s2) s2.textContent = 'Waitlist';
      }
      cards.slice(3).forEach(function (x) { x.remove(); });
      metrics.hidden = view !== 'overview';
    }

    var summary = detail.querySelector(':scope > .fidelity-showcase-summary');
    if (!summary && rowsHost && state.showcaseIndex != null) {
      var cardsInList = rowsHost.querySelectorAll('.event-card');
      var sourceCard = cardsInList[Number(state.showcaseIndex)];
      if (sourceCard) {
        summary = sourceCard.cloneNode(true);
        summary.classList.add('fidelity-showcase-summary');
        var footer = summary.querySelector('footer');
        if (footer) footer.remove();
        detail.insertBefore(summary, detail.firstChild);
      }
    }

    var actionHost = detail.querySelector(':scope > .fidelity-showcase-actions');
    if (actionHost) {
      var edit = Array.from(actionHost.children).find(function (x) { return /edit event/i.test(x.textContent || ''); });
      if (summary && edit && !summary.querySelector('[data-showcase-edit]')) {
        var foot = document.createElement('footer');
        foot.className = 'fidelity-showcase-summary-footer';
        foot.appendChild(edit);
        summary.appendChild(foot);
      }
      actionHost.hidden = view !== 'overview' || !actionHost.children.length;
    }

    if (summary) summary.hidden = view !== 'overview';
    if (rowsHost) rowsHost.hidden = true;
    var sectionAction = root.querySelector(':scope > .fidelity-section-action');
    if (sectionAction) sectionAction.hidden = true;

    var title = document.getElementById('title');
    var mobileTitle = document.getElementById('mtitle');
    if (view === 'players') {
      if (title) title.textContent = 'Player applications';
      if (mobileTitle) mobileTitle.textContent = 'Player applications';
    } else if (view === 'pros') {
      if (title) title.textContent = 'Professional registrations';
      if (mobileTitle) mobileTitle.textContent = 'Pro registrations';
    } else {
      if (title) title.textContent = 'Showcase Event';
      if (mobileTitle) mobileTitle.textContent = 'Showcase Event';
    }

    if (view === 'players') renderShowcasePlayersExact();
  }

  /* ---------------- Admin user detail: dedicated design state ---------------- */
  function managerName(person, people) {
    if (!person) return '—';
    if (person.manager_name) return person.manager_name;
    if (!person.manager_id) return 'No manager';
    var manager = (people || []).find(function (x) { return String(x.id) === String(person.manager_id); });
    return manager ? fullName(manager) : 'Manager not available';
  }
  function permissionChips(person) {
    var permissions = Array.isArray(person && person.permissions) ? person.permissions : [];
    if (!permissions.length) return '<span class="linked-chip"><b>No explicit permission keys</b><span>Role defaults apply</span></span>';
    return permissions.map(function (x) {
      return '<span class="linked-chip"><b>' + esc(String(x).replace(/_/g,' ')) + '</b></span>';
    }).join('');
  }
  async function openAdminUserDetail(index) {
    if (path() !== '/admin/admin-users') return;
    var root = document.getElementById('adminMain');
    if (!root) return;
    state.userDetailOpen = true;
    root.innerHTML = '<div class="loading-state">Loading user record</div>';
    try {
      var payload = await api('/api/stratex/org');
      var people = Array.isArray(payload) ? payload : (payload.admins || payload.data || payload.users || []);
      var person = people[Number(index)];
      if (!person) throw new Error('That Stratex user could not be found.');
      var manager = managerName(person, people);
      var userRole = person.admin_role || person.role || 'Employee';
      var title = document.getElementById('title');
      var mobileTitle = document.getElementById('mtitle');
      var crumb = document.getElementById('crumb');
      if (title) title.textContent = 'User - ' + fullName(person);
      if (mobileTitle) mobileTitle.textContent = fullName(person);
      if (crumb) crumb.textContent = 'Company · Stratex Admin Centre';

      root.dataset.fidelityUserDetail = '1';
      root.innerHTML =
        '<section class="card fidelity-user-identity"><div class="card-body fidelity-user-identity-body">' +
          '<div class="avatar-lg">' + esc(initials(person)) + '</div>' +
          '<div class="fidelity-user-heading"><h3>' + esc(fullName(person)) + '</h3><p>' +
            esc((person.job_title || 'Stratex') + ' · reports to ' + manager) + '</p></div>' +
          pill(userRole, /management|super/i.test(String(userRole)) ? 'blue' : 'grey') +
          '<button class="btn secondary small" type="button" data-user-detail-back>Back to users</button>' +
        '</div></section>' +
        '<div class="detail-grid fidelity-user-grid">' +
          '<div><small>Email</small><b>' + esc(person.email || '—') + '</b></div>' +
          '<div><small>Role</small><b>' + esc(userRole) + '</b></div>' +
          '<div><small>Last login</small><b>' + esc(fmtDate(person.last_login, true)) + '</b></div>' +
          '<div><small>Created</small><b>' + esc(fmtDate(person.created_at)) + '</b></div>' +
          '<div><small>Job title</small><b>' + esc(person.job_title || '—') + '</b></div>' +
          '<div><small>Manager</small><b>' + esc(manager) + '</b></div>' +
          '<div><small>Annual leave</small><b>' + esc(person.annual_leave_days == null ? '—' : person.annual_leave_days + ' days') + '</b></div>' +
          '<div><small>Status</small><b>' + esc(person.is_active === false ? 'Inactive' : 'Active') + '</b></div>' +
        '</div>' +
        '<div class="two-col fidelity-user-linked">' +
          '<section class="card"><header><div><h3>Linked records</h3><p>Private people records connected to this staff account</p></div></header><div class="card-body">' +
            '<div class="linked-rail"><b>People Ops</b><div class="linked-chip-row">' +
              '<button class="linked-chip fidelity-linked-button" type="button" data-nav="contracts"><span class="ic c-app">CP</span><b>Contract & pay</b><span>Open permissioned record</span><span class="go">Open →</span></button>' +
              '<button class="linked-chip fidelity-linked-button" type="button" data-nav="leave"><span class="ic c-coach">LV</span><b>Leave balance</b><span>' +
                esc(person.annual_leave_days == null ? 'Balance unavailable' : person.annual_leave_days + ' days annual allowance') +
                '</span><span class="go">Open →</span></button>' +
            '</div></div>' +
          '</div></section>' +
          '<section class="card"><header><div><h3>Permissions</h3><p>Current permission keys</p></div></header><div class="card-body"><div class="linked-chip-row">' +
            permissionChips(person) +
          '</div></div></section>' +
        '</div>';
    } catch (x) {
      root.innerHTML = empty(x.message || 'The user record could not be loaded.');
    }
  }

  /* ---------------- Settings tabs ---------------- */
  function enhanceSettingsTabs() {
    if (path() !== '/admin/settings') return;
    var root = document.getElementById('adminMain');
    if (!root) return;
    var tabs = root.querySelector('.fidelity-tabs');
    var grid = root.querySelector('#settingsRows .two-col');
    if (!tabs || !grid) return;
    var cards = Array.from(grid.children);
    if (cards.length < 2) return;
    var mode = root.dataset.fidelityTab || 'general';
    cards.forEach(function (card, i) {
      card.hidden = mode === 'security' ? i === 0 : i > 0;
    });
  }

  /* ---------------- Event delegation ---------------- */
  function onCaptureClick(e) {
    var userButton = e.target.closest('[data-admin-user]');
    if (userButton && path() === '/admin/admin-users') {
      e.preventDefault();
      e.stopPropagation();
      openAdminUserDetail(userButton.dataset.adminUser);
      return;
    }

    var showcaseButton = e.target.closest('[data-showcase]');
    if (showcaseButton && path() === '/admin/showcase-event') {
      state.showcaseIndex = Number(showcaseButton.dataset.showcase);
      state.showcaseEventId = null;
      state.showcasePlayersEventId = null;
      state.showcasePlayers = [];
    }
  }

  function onClick(e) {
    var crmTab = e.target.closest('[data-crm-tab]');
    if (crmTab) {
      e.preventDefault();
      paintCrm(crmTab.dataset.crmTab || 'all');
      return;
    }
    var crmRecord = e.target.closest('[data-crm-record]');
    if (crmRecord) {
      e.preventDefault();
      crmDetail(crmRecord.dataset.crmRecord);
      return;
    }
    if (e.target.closest('[data-crm-export]')) {
      e.preventDefault();
      (async function () {
        try {
          var r = await fetch(API + '/api/stratex-website/crm/export', {
            credentials:'include',
            headers:{Authorization:'Bearer ' + token()}
          });
          if (!r.ok) throw new Error('CRM export could not be created.');
          var blob = await r.blob();
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'stratex-crm-export.xlsx';
          a.click();
          setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        } catch (x) {
          dialog('CRM export', '<div class="state-message error">' + esc(x.message) + '</div>');
        }
      }());
      return;
    }
    if (e.target.closest('[data-user-detail-back]')) {
      e.preventDefault();
      location.href = '/admin/admin-users';
      return;
    }

    var showcaseReview = e.target.closest('[data-showcase-player-review]');
    if (showcaseReview) {
      e.preventDefault();
      reviewShowcasePlayer(showcaseReview.dataset.showcasePlayerReview);
      return;
    }

    if (path() === '/admin/showcase-event' && e.target.closest('[data-shview]')) {
      setTimeout(enhanceShowcaseState, 0);
    }

    var close = e.target.closest('[data-fidelity-close]');
    if (close) { e.preventDefault(); closeDialog(); return; }

    if (e.target.closest('[data-forgot-password]')) {
      e.preventDefault(); forgotPassword(); return;
    }
    if (e.target.closest('[data-change-password]')) {
      e.preventDefault();
      dialog('Change password',
        '<form id="fidelityPassword"><label class="field full"><span>New password</span><input class="input" name="password" type="password" minlength="8" required></label>' +
        '<label class="field full"><span>Confirm password</span><input class="input" name="confirm" type="password" minlength="8" required></label>' +
        '<div class="state-message" id="fidelityPasswordMsg" hidden></div><button class="btn full" type="submit">Change password</button></form>');
      return;
    }

    var tab = e.target.closest('[data-fidelity-tab]');
    if (tab) {
      e.preventDefault();
      var root = document.getElementById('adminMain');
      if (!root) return;
      root.dataset.fidelityTab = tab.dataset.fidelityTab || '';
      var tabs = tab.closest('.tabs');
      if (tabs) tabs.querySelectorAll('[data-fidelity-tab]').forEach(function (x) { x.classList.toggle('active', x === tab); });
      filterRows(root);
      enhanceSettingsTabs();
      return;
    }

    if (e.target.closest('[data-fidelity-apply]')) {
      e.preventDefault();
      filterRows(document.getElementById('adminMain'));
    }
  }
  function onInput(e) {
    if (e.target.matches('[data-fidelity-filter]')) {
      filterRows(document.getElementById('adminMain'));
    }
  }
  async function onSubmit(e) {
    if (e.target.id === 'fidelityForgot') {
      e.preventDefault();
      var d = new FormData(e.target);
      var msg = document.getElementById('fidelityForgotMsg');
      try {
        var r = await fetch(API + '/api/auth/forgot-password', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({email:String(d.get('email') || '').trim().toLowerCase()})
        });
        var p = await r.json().catch(function () { return {}; });
        if (!r.ok) throw new Error(p.error || 'Unable to start password reset.');
        msg.hidden = false; msg.className = 'state-message success';
        msg.textContent = p.message || 'If that email exists, a reset code has been sent.';
        e.target.insertAdjacentHTML('beforeend',
          '<label class="field full"><span>Reset code</span><input class="input" name="code" required></label>' +
          '<label class="field full"><span>New password</span><input class="input" name="newPassword" type="password" minlength="8" required></label>' +
          '<button class="btn full" type="button" data-complete-reset>Reset password</button>');
        e.target.querySelector('button[type="submit"]').hidden = true;
      } catch (x) {
        msg.hidden = false; msg.className = 'state-message error'; msg.textContent = x.message;
      }
      return;
    }

    if (e.target.id === 'fidelityShowcasePlayerReview') {
      e.preventDefault();
      var sf = new FormData(e.target);
      var playerId = e.target.dataset.playerId;
      var status = String(sf.get('status') || 'submitted');
      var messageNode = document.getElementById('fidelityShowcasePlayerMsg');
      try {
        await apiWrite('PATCH',
          '/api/stratex-publishing/admin/showcase-events/' + encodeURIComponent(state.showcaseEventId) +
          '/players/' + encodeURIComponent(playerId),
          {
            status: status,
            selected: status === 'selected',
            internalNotes: String(sf.get('internalNotes') || '')
          }
        );
        if (messageNode) {
          messageNode.hidden = false;
          messageNode.className = 'state-message success';
          messageNode.textContent = 'Player review saved.';
        }
        state.showcasePlayersEventId = null;
        state.showcasePlayers = [];
        setTimeout(function () {
          closeDialog();
          var host = document.getElementById('shview');
          if (host) host.innerHTML = '<div class="loading-state">Refreshing applications</div>';
          renderShowcasePlayersExact();
        }, 350);
      } catch (x) {
        if (messageNode) {
          messageNode.hidden = false;
          messageNode.className = 'state-message error';
          messageNode.textContent = x.message;
        }
      }
      return;
    }

    if (e.target.id === 'fidelityPassword') {
      e.preventDefault();
      var fd = new FormData(e.target);
      var pw = String(fd.get('password') || '');
      var confirmPw = String(fd.get('confirm') || '');
      var out = document.getElementById('fidelityPasswordMsg');
      if (pw.length < 8 || pw !== confirmPw) {
        out.hidden = false; out.className = 'state-message error';
        out.textContent = pw.length < 8 ? 'Password must be at least eight characters.' : 'The passwords do not match.';
        return;
      }
      try {
        await apiWrite('POST','/api/auth/change-password',{password:pw});
        out.hidden = false; out.className = 'state-message success'; out.textContent = 'Password updated.';
      } catch (x) {
        out.hidden = false; out.className = 'state-message error'; out.textContent = x.message;
      }
    }
  }
  async function completeReset(btn) {
    var form = btn.closest('form');
    var d = new FormData(form);
    var msg = document.getElementById('fidelityForgotMsg');
    try {
      var r = await fetch(API + '/api/auth/reset-password', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          email:String(d.get('email') || '').trim().toLowerCase(),
          code:String(d.get('code') || '').trim().toUpperCase(),
          newPassword:String(d.get('newPassword') || ''),
          accountType:'Stratex'
        })
      });
      var p = await r.json().catch(function () { return {}; });
      if (!r.ok) throw new Error(p.error || 'Password reset failed.');
      msg.hidden = false; msg.className = 'state-message success';
      msg.textContent = 'Password updated. You can now sign in.';
      setTimeout(closeDialog, 800);
    } catch (x) {
      msg.hidden = false; msg.className = 'state-message error'; msg.textContent = x.message;
    }
  }

  /* ---------------- Main enhancer ---------------- */
  function enhance() {
    if (path() === '/admin/login') {
      patchLogin();
      return;
    }
    var app = document.querySelector('.admin-app');
    if (!app) return;
    if (!applyAccess()) return;
    applyShell();

    var p = path();
    var root = document.getElementById('adminMain');
    if (!root) return;
    if (state.lastPath !== p) {
      state.lastPath = p;
      state.crmLoading = false;
      state.crmRendered = false;
      state.crmRows = [];
      state.userDetailOpen = false;
      state.showcaseView = 'overview';
      state.showcasePlayersLoading = false;
      state.showcasePlayersEventId = null;
      state.showcasePlayers = [];
      if (p !== '/admin/showcase-event') {
        state.showcaseIndex = null;
        state.showcaseEventId = null;
      }
      root.removeAttribute('data-fidelity-layout');
      root.removeAttribute('data-fidelity-dashboard');
      root.removeAttribute('data-fidelity-scoutlink');
      root.removeAttribute('data-fidelity-tab');
      root.removeAttribute('data-fidelity-user-detail');
    }

    if (p === '/admin') {
      renderDashboard();
      return;
    }
    if (p === '/admin/scoutlink') {
      renderScoutlinkOverview();
      return;
    }
    if (p === '/admin/my-profile') {
      enhanceProfile();
      return;
    }
    if (p === '/admin/crm') {
      renderCrm();
      return;
    }
    if (p === '/admin/admin-users' && root.dataset.fidelityUserDetail === '1') {
      return;
    }
    if (p === '/admin/showcase-event') {
      applyListLayout();
      enhanceShowcaseState();
      return;
    }

    applyListLayout();
    enhanceSettingsTabs();
    filterRows(root);
  }

  function scheduleEnhance() {
    clearTimeout(state.timer);
    state.timer = setTimeout(enhance, 20);
  }

  function boot() {
    document.addEventListener('click', onCaptureClick, true);
    document.addEventListener('click', function (e) {
      var complete = e.target.closest('[data-complete-reset]');
      if (complete) { e.preventDefault(); completeReset(complete); return; }
      onClick(e);
    });
    document.addEventListener('input', onInput);
    document.addEventListener('change', onInput);
    document.addEventListener('submit', onSubmit);

    var observer = new MutationObserver(scheduleEnhance);
    observer.observe(document.documentElement, {subtree:true, childList:true, characterData:true});
    window.addEventListener('popstate', scheduleEnhance);
    window.addEventListener('resize', scheduleEnhance);
    scheduleEnhance();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
}());
