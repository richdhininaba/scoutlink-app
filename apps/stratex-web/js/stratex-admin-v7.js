(function () {
  'use strict';

  if (window.__STRATEX_ADMIN_PHONE_BLOCKED__) return;

  var API = (function () {
    try {
      return window.API_BASE_URL || window.API_URL || '';
    } catch (_) {
      return '';
    }
  }());

  var SUPPORTED = [
    ['Overview', [['/admin', '☉', 'Dashboard']]],
    ['Growth', [['/admin/registrations', '📄', 'Registrations'], ['/admin/crm', '📊', 'CRM']]],
    ['Content', [['/admin/blog', '📚', 'Blog / Learning Centre']]],
    ['ScoutLink Control', [
      ['/admin/scoutlink', '⚽', 'Overview'],
      ['/admin/scoutlink/players', '🏃', 'Players'],
      ['/admin/scoutlink/coaches', '📝', 'Coaches'],
      ['/admin/scoutlink/teams', '🏁', 'Teams'],
      ['/admin/scoutlink/scouts', '🔍', 'Scouts & Agencies']
    ]],
    ['Company', [
      ['/admin/leadership', '⭐', 'Leadership'],
      ['/admin/org-charts', '🏢', 'Org Directory'],
      ['/admin/admin-users', '👤', 'Users'],
      ['/admin/permissions', '🔐', 'Permissions'],
      ['/admin/my-profile', '⚙', 'My Profile']
    ]],
    ['Finance', [['/admin/financials', '£', 'Financials']]],
    ['Operations', [['/admin/trust-concerns', '🔒', 'Trust & Concerns']]],
    ['System', [['/admin/settings', '⚙', 'Settings']]]
  ];

  var state = {
    registrations: [],
    currentRegistration: null,
    registrationFetchedAt: 0,
    lastPath: ''
  };

  function path() {
    return (location.pathname || '/admin').replace(/\/+$/, '') || '/admin';
  }

  function token() {
    try {
      if (typeof Auth !== 'undefined' && Auth && Auth.token) return Auth.token;
    } catch (_) {}
    try {
      return localStorage.getItem('sl_token') || '';
    } catch (_) {
      return '';
    }
  }

  async function api(method, url, body) {
    var options = {
      method: method,
      credentials: 'include',
      headers: { Authorization: 'Bearer ' + token() }
    };
    if (body !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
    var response = await fetch(API + url, options);
    var contentType = response.headers.get('content-type') || '';
    var payload = contentType.indexOf('json') >= 0
      ? await response.json().catch(function () { return {}; })
      : { text: await response.text().catch(function () { return ''; }) };
    if (!response.ok) {
      throw new Error(payload.error || payload.details || payload.message || payload.text || ('Request failed (' + response.status + ')'));
    }
    return payload;
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function date(value, withTime) {
    if (!value) return '—';
    var d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString('en-GB', withTime
      ? { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }
      : { day:'2-digit', month:'short', year:'numeric' });
  }

  function number(value) {
    return Number(value || 0).toLocaleString('en-GB');
  }

  function initials(person) {
    var name = person.name || [person.firstName || person.first_name, person.lastName || person.last_name].filter(Boolean).join(' ');
    return String(name || 'ST').split(/\s+/).filter(Boolean).slice(0, 2).map(function (part) { return part.charAt(0); }).join('').toUpperCase();
  }

  function activeLink(href) {
    var current = path();
    if (href === '/admin') return current === '/admin';
    return current === href;
  }

  function rebuildNavigation() {
    var nav = document.getElementById('adminNav');
    if (!nav || nav.dataset.v7 === '1') return;
    nav.dataset.v7 = '1';
    nav.innerHTML = SUPPORTED.map(function (group) {
      return '<section class="side-group"><small>' + esc(group[0]) + '</small>' +
        group[1].map(function (item) {
          return '<a class="side-link' + (activeLink(item[0]) ? ' active' : '') + '" href="' + item[0] + '">' +
            '<span class="ic">' + esc(item[1]) + '</span><span class="label">' + esc(item[2]) + '</span></a>';
        }).join('') + '</section>';
    }).join('');

    var mail = document.querySelector('.topbar-actions [data-nav="contact"]');
    if (mail) mail.remove();
  }

  function routeTitle(title, crumb) {
    var desktop = document.getElementById('title');
    var mobile = document.getElementById('mtitle');
    var trail = document.getElementById('crumb');
    if (desktop) desktop.textContent = title;
    if (mobile) mobile.textContent = title;
    if (trail) trail.textContent = crumb + ' · Stratex Admin Centre';
  }

  function dashboardSkeleton() {
    return '<div class="v7-dashboard" data-v7-dashboard="1">' +
      '<section class="page-intro"><div><span class="eyebrow">STRATEX ANALYTICS</span><h2>Company administration.</h2><p>One secure workspace for growth, content, ScoutLink control, company records, trust and live financial reporting.</p></div><div class="intro-meta"><span>Supabase live</span><span>Stripe live</span></div></section>' +
      '<section class="dash-actions"><div class="dash-section-heading"><div><span>QUICK ACTIONS</span><h3>Get something done</h3></div></div><div class="dash-action-grid">' +
        '<a class="dash-action primary" href="/admin/admin-users"><span class="dash-action-icon">＋</span><div><b>Add staff user</b><small>Create a Stratex Admin account</small></div><i>→</i></a>' +
        '<a class="dash-action" href="/admin/blog"><span class="dash-action-icon">✎</span><div><b>Publish content</b><small>Create or edit Learning Centre posts</small></div><i>→</i></a>' +
        '<a class="dash-action" href="/admin/trust-concerns"><span class="dash-action-icon">◇</span><div><b>Review concerns</b><small>Open trust & safeguarding items</small></div><i>→</i></a>' +
        '<a class="dash-action" href="/admin/crm"><span class="dash-action-icon">↗</span><div><b>Open CRM</b><small>Review company leads and outreach</small></div><i>→</i></a>' +
      '</div></section>' +
      '<section class="dash-company-strip" id="v7CompanyPulse"><div class="company-strip-lead"><span>COMPANY PULSE</span><b>Stratex today</b></div><div class="company-pulse"><span>Active staff</span><strong>—</strong><small>Supabase</small></div><div class="company-pulse alert"><span>Open concerns</span><strong>—</strong><small>Needs review</small></div><div class="company-pulse"><span>Website leads</span><strong>—</strong><small>All-time records</small></div><div class="company-pulse"><span>Live learning posts</span><strong>—</strong><small>Content</small></div></section>' +
      '<section class="dash-main-grid"><article class="dash-panel attention-panel"><div class="dash-panel-head"><div><span>ATTENTION</span><h3>What needs you</h3></div><a href="/admin/trust-concerns">View all →</a></div><div class="attention-list" id="v7Attention"><div class="v7-empty">Loading live company status…</div></div></article>' +
        '<aside class="dash-panel products-panel"><div class="dash-panel-head"><div><span>PRODUCTS</span><h3>Product workspaces</h3></div></div><div class="product-stack"><a class="product-row live" href="/admin/scoutlink"><span class="product-monogram">SL</span><div><b>ScoutLink</b><small>Live football scouting product</small></div><em>LIVE</em><i>→</i></a><div class="product-row soon"><span class="product-monogram">AL</span><div><b>AgentLink</b><small>Future product workspace</small></div><em>COMING</em><i>→</i></div></div></aside>' +
      '</section>' +
      '<section class="dash-lower-grid"><article class="dash-panel people-panel"><div class="dash-panel-head"><div><span>PEOPLE</span><h3>Team today</h3></div><a href="/admin/org-charts">Open directory →</a></div><div class="people-compact" id="v7People"><div class="v7-empty">Loading team…</div></div></article>' +
        '<article class="dash-panel content-panel"><div class="dash-panel-head"><div><span>CONTENT</span><h3>Publishing</h3></div><a href="/admin/blog">Open Learning Centre →</a></div><div class="content-status" id="v7Publishing"><div><strong>—</strong><span>Learning Centre posts in Supabase</span></div></div></article>' +
      '</section>' +
    '</div>';
  }

  async function renderDashboard() {
    var root = document.getElementById('adminMain');
    if (!root || path() !== '/admin') return;
    if (!root.querySelector('[data-v7-dashboard]')) root.innerHTML = dashboardSkeleton();
    routeTitle('Dashboard', 'Overview');

    try {
      var data = (await api('GET', '/api/stratex-admin-centre/v7/dashboard')).data || {};
      var counts = data.counts || {};
      var pulse = document.getElementById('v7CompanyPulse');
      if (pulse) {
        var values = [counts.activeStaff, counts.openConcerns, counts.websiteLeads, counts.publishedLearningPosts];
        pulse.querySelectorAll('.company-pulse strong').forEach(function (node, index) {
          node.textContent = number(values[index]);
        });
      }

      var concernCopy = counts.openConcerns === 1 ? '1 trust & safeguarding concern is open' : number(counts.openConcerns) + ' trust & safeguarding concerns are open';
      var leadCopy = counts.websiteLeads === 1 ? '1 website lead is in Stratex' : number(counts.websiteLeads) + ' website leads are in Stratex';
      var eventCopy = counts.showcaseEvents === 1 ? '1 showcase event is configured' : number(counts.showcaseEvents) + ' showcase events are configured';
      var awayCopy = counts.awayToday
        ? number(counts.awayToday) + (counts.awayToday === 1 ? ' staff member is currently recorded as away' : ' staff members are currently recorded as away')
        : 'No staff are currently recorded as away';
      var newest = data.newestConcernAt ? 'Newest concern was submitted on ' + date(data.newestConcernAt) + '.' : 'No unresolved concern is currently recorded.';
      var eventSmall = data.showcaseEvent
        ? esc(data.showcaseEvent.event_name || 'Open the event workspace for registrations and operations.')
        : 'No showcase event is currently configured.';

      var attention = document.getElementById('v7Attention');
      if (attention) attention.innerHTML =
        '<div class="attention-item urgent"><span class="attention-mark">!</span><div><b>' + esc(concernCopy) + '</b><small>' + esc(newest) + '</small></div><a class="btn small secondary" href="/admin/trust-concerns">Open queue</a></div>' +
        '<div class="attention-item"><span class="attention-mark">↗</span><div><b>' + esc(leadCopy) + '</b><small>Review ownership, notes and next action in CRM.</small></div><a class="btn small secondary" href="/admin/crm">View leads</a></div>' +
        '<div class="attention-item"><span class="attention-mark">★</span><div><b>' + esc(eventCopy) + '</b><small>' + eventSmall + '</small></div><span></span></div>' +
        '<div class="attention-item"><span class="attention-mark">✓</span><div><b>' + esc(awayCopy) + '</b><small>People availability has no open time-off records today.</small></div><a class="btn small secondary" href="/admin/admin-users">People</a></div>';

      var people = document.getElementById('v7People');
      if (people) people.innerHTML = (data.staff || []).map(function (person) {
        return '<div class="person-chip"><span>' + esc(initials(person)) + '</span><div><b>' + esc(person.name) + '</b><small>' + esc(person.jobTitle || 'Stratex') + '</small></div></div>';
      }).join('') || '<div class="v7-empty">No active staff records.</div>';

      var publishing = document.getElementById('v7Publishing');
      if (publishing) publishing.innerHTML = '<div><strong>' + number(counts.publishedLearningPosts) + '</strong><span>Learning Centre ' + (counts.publishedLearningPosts === 1 ? 'post' : 'posts') + ' in Supabase</span></div>';
    } catch (error) {
      var attentionError = document.getElementById('v7Attention');
      if (attentionError) attentionError.innerHTML = '<div class="v7-empty">' + esc(error.message) + '</div>';
    }
  }

  function pounds(pence) {
    return new Intl.NumberFormat('en-GB', { style:'currency', currency:'GBP', maximumFractionDigits:0 }).format(Number(pence || 0) / 100);
  }

  function financialSkeleton() {
    return '<div class="v7-financials" data-v7-financials="1">' +
      '<section class="finance-intro"><div><span class="eyebrow">FINANCE</span><h2>Financials.</h2><p>Live ScoutLink subscription catalogue, subscription status and successful Stripe Checkout activity. No design-board revenue is hard-coded.</p></div><div class="v7-live-source"><i></i> Stripe live</div></section>' +
      '<section class="metrics" id="v7FinanceMetrics">' +
        '<article class="metric green"><small>ARR</small><strong>—</strong><p>Active Stripe subscriptions</p></article>' +
        '<article class="metric blue"><small>Active subscriptions</small><strong>—</strong><p>Stripe Billing</p></article>' +
        '<article class="metric gold"><small>Gross this month</small><strong>—</strong><p>Successful Checkout sessions</p></article>' +
        '<article class="metric purple"><small>Top-up revenue</small><strong>—</strong><p>ScoutLink usage purchases this month</p></article>' +
      '</section>' +
      '<section><div class="section-heading"><div><span class="section-kicker">SUBSCRIPTIONS</span><h3>Live ScoutLink catalogue</h3><p>Prices are read directly from the active Stripe account.</p></div></div><div class="v7-plan-grid" id="v7PlanGrid"><div class="v7-empty">Loading Stripe catalogue…</div></div></section>' +
      '<section class="v7-finance-table-wrap"><div class="data-head"><div><span class="section-kicker">ACTIVITY</span><h3>Successful purchases this month</h3><p>Subscription Checkout and self-serve top-up payments.</p></div></div><div id="v7PurchaseRows"><div class="v7-empty">Loading Stripe activity…</div></div></section>' +
    '</div>';
  }

  async function renderFinancials() {
    var root = document.getElementById('adminMain');
    if (!root || path() !== '/admin/financials') return;
    if (!root.querySelector('[data-v7-financials]')) root.innerHTML = financialSkeleton();
    routeTitle('Financials', 'Finance');

    try {
      var data = (await api('GET', '/api/stratex-admin-centre/v7/financials')).data || {};
      var metrics = data.metrics || {};
      var metricNodes = document.querySelectorAll('#v7FinanceMetrics .metric strong');
      if (metricNodes[0]) metricNodes[0].textContent = pounds(metrics.arr);
      if (metricNodes[1]) metricNodes[1].textContent = number(metrics.activeSubscriptions);
      if (metricNodes[2]) metricNodes[2].textContent = pounds(metrics.mtdGross);
      if (metricNodes[3]) metricNodes[3].textContent = pounds(metrics.mtdTopUpRevenue);

      var grid = document.getElementById('v7PlanGrid');
      if (grid) grid.innerHTML = (data.subscriptionCatalogue || []).map(function (plan) {
        return '<article class="v7-plan-card"><small>' + esc(plan.active ? 'ACTIVE PRICE' : 'INACTIVE') + '</small><h3>' + esc(plan.plan) + '</h3><strong>' + esc(pounds(plan.unitAmount)) + '</strong><span>per ' + esc(plan.interval || 'year') + ' · ' + number((data.planCounts || {})[plan.plan] || 0) + ' active subscription' + (((data.planCounts || {})[plan.plan] || 0) === 1 ? '' : 's') + '</span></article>';
      }).join('') || '<div class="v7-empty">No active ScoutLink subscription prices found in Stripe.</div>';

      var activity = document.getElementById('v7PurchaseRows');
      var rows = data.recentPurchaseActivity || [];
      if (activity) {
        if (!rows.length) {
          activity.innerHTML = '<div class="v7-empty">No successful Stripe Checkout payments have been recorded this month.</div>';
        } else {
          activity.innerHTML = '<div class="table-wrap"><table class="data-table"><thead><tr><th>Purchase</th><th>Type</th><th>Amount</th><th>Date</th></tr></thead><tbody>' + rows.map(function (row) {
            var label = row.plan || row.topUpType || 'ScoutLink';
            return '<tr><td><b>' + esc(label) + '</b></td><td>' + esc(String(row.purchaseType || 'checkout').replace(/_/g, ' ')) + '</td><td>' + esc(pounds(row.amountTotal)) + '</td><td>' + esc(date(row.created, true)) + '</td></tr>';
          }).join('') + '</tbody></table></div>';
        }
      }
    } catch (error) {
      var rowsError = document.getElementById('v7PurchaseRows');
      if (rowsError) rowsError.innerHTML = '<div class="v7-empty">' + esc(error.message) + '</div>';
    }
  }

  function userSkeleton() {
    return '<div class="v7-users" data-v7-users="1">' +
      '<section class="page-intro compact-intro"><div><span class="eyebrow">COMPANY</span><h2>Admin users.</h2><p>Internal Stratex accounts, reporting lines, role access and contract records.</p></div><div class="hero-actions"><button class="btn" type="button" id="v7AddUser">Add Stratex user</button></div></section>' +
      '<section class="data"><div class="data-head"><div><span class="section-kicker">PEOPLE</span><h3>Stratex Admin users</h3><p>Active and inactive internal accounts.</p></div></div><div id="v7UserRows"><div class="v7-empty">Loading users…</div></div></section>' +
      '<div id="v7ContractMount"></div>' +
    '</div>';
  }

  async function renderUsers() {
    var root = document.getElementById('adminMain');
    if (!root || path() !== '/admin/admin-users') return;
    if (!root.querySelector('[data-v7-users]')) root.innerHTML = userSkeleton();
    routeTitle('Users', 'Company');

    try {
      var result = await api('GET', '/api/stratex/org');
      var rows = Array.isArray(result) ? result : (result.admins || result.data || result.users || []);
      var byId = {};
      rows.forEach(function (row) { byId[row.id] = row; });
      var target = document.getElementById('v7UserRows');
      if (target) target.innerHTML = '<div class="table-wrap"><table class="data-table"><thead><tr><th>User</th><th>Job title</th><th>Manager</th><th>Admin role</th><th>Access</th><th>Status</th></tr></thead><tbody>' + rows.map(function (row) {
        var manager = row.manager_name || (row.manager_id && byId[row.manager_id] ? [byId[row.manager_id].first_name, byId[row.manager_id].last_name].filter(Boolean).join(' ') : '—');
        var access = Array.isArray(row.permissions) && row.permissions.length ? row.permissions.length + ' permissions' : (row.admin_role || row.role || 'Employee');
        return '<tr><td><div class="record-cell"><span class="avatar-sm">' + esc(initials({ first_name:row.first_name, last_name:row.last_name })) + '</span><div><b>' + esc([row.first_name, row.last_name].filter(Boolean).join(' ')) + '</b><small>' + esc(row.email || '') + '</small></div></div></td><td>' + esc(row.job_title || '—') + '</td><td>' + esc(manager) + '</td><td>' + esc(row.admin_role || row.role || 'Employee') + '</td><td>' + esc(access) + '</td><td><span class="pill ' + (row.is_active === false ? 'grey' : 'green') + '">' + (row.is_active === false ? 'Inactive' : 'Active') + '</span></td></tr>';
      }).join('') + '</tbody></table></div>';

      var add = document.getElementById('v7AddUser');
      if (add) add.onclick = function () { location.href = '/admin/users/add'; };

      window.dispatchEvent(new CustomEvent('stratex:v7-users-ready', { detail:{ users:rows } }));
    } catch (error) {
      var userError = document.getElementById('v7UserRows');
      if (userError) userError.innerHTML = '<div class="v7-empty">' + esc(error.message) + '</div>';
    }
  }

  function registrationStage(row) {
    var status = String(row.status || '').toLowerCase();
    var verification = String(row.verification_status || '').toLowerCase();
    if (status === 'approved' || verification === 'activated') return 'activated';
    if (status === 'declined') return 'declined';
    if (String(row.account_type || '').toLowerCase() !== 'scout') return 'coach_review';
    if (verification === 'verified_awaiting_payment') return 'awaiting_payment';
    if (verification === 'documents_submitted') return 'documents_ready';
    return 'awaiting_documents';
  }

  async function loadRegistrations(force) {
    if (!force && state.registrations.length && Date.now() - state.registrationFetchedAt < 15000) return state.registrations;
    var result = await api('GET', '/api/registrations?limit=250&status=');
    state.registrations = result.data || [];
    state.registrationFetchedAt = Date.now();
    var queryId = new URLSearchParams(location.search).get('id');
    if (queryId) state.currentRegistration = state.registrations.find(function (row) { return String(row.id) === String(queryId); }) || null;
    return state.registrations;
  }

  function closeModal() {
    var host = document.getElementById('v7ModalHost');
    if (host) host.remove();
  }

  function modal(title, eyebrow, body) {
    closeModal();
    var host = document.createElement('div');
    host.id = 'v7ModalHost';
    host.className = 'v7-modal-host';
    host.innerHTML = '<section class="v7-modal" role="dialog" aria-modal="true"><header class="v7-modal-head"><div><small>' + esc(eyebrow || 'ADMIN') + '</small><h2>' + esc(title) + '</h2></div><button class="v7-modal-close" type="button" aria-label="Close">×</button></header><div class="v7-modal-body">' + body + '</div></section>';
    document.body.appendChild(host);
    host.querySelector('.v7-modal-close').onclick = closeModal;
    host.addEventListener('click', function (event) { if (event.target === host) closeModal(); });
    return host;
  }

  async function approveScout(row) {
    var docs = [];
    try {
      docs = (await api('GET', '/api/registrations/' + encodeURIComponent(row.id) + '/verification-documents')).data || [];
    } catch (_) {}
    var docHtml = docs.length ? docs.map(function (doc) {
      return '<a class="linked-chip" target="_blank" rel="noopener" href="' + esc(doc.signedUrl) + '"><b>' + esc(doc.fileName || doc.kind || 'Verification document') + '</b></a>';
    }).join('') : '<span class="pill gold">Verification uploads are attached to this application</span>';

    var host = modal('Approve Scout & send Stripe checkout', 'SCOUT SAFEGUARDING',
      '<div class="note"><b>Selected Scout plan: ' + esc(row.preferred_scout_plan || 'Core') + '</b>This is read-only. The Stripe Checkout Session will be generated from the plan the Scout selected in their application.</div>' +
      '<div class="linked-chip-row" style="margin-top:16px">' + docHtml + '</div>' +
      '<form id="v7ScoutApproval"><div class="v7-check-grid">' +
        [['identity','Identity verified'],['dbs','Enhanced DBS verified'],['faCredentials','FA credentials verified'],['clubAssociation','Club association verified'],['contactDetails','Contact details verified'],['noSafeguardingFlags','No safeguarding flags'],['termsAccepted','Terms/declarations accepted']].map(function (item) {
          return '<label class="v7-check"><input type="checkbox" name="' + item[0] + '" required><span>' + item[1] + '</span></label>';
        }).join('') +
      '</div><div class="form-grid">' +
        '<label class="field"><span>DBS certificate number</span><input class="input" name="dbsCertificateNumber" required></label>' +
        '<label class="field"><span>DBS issue date</span><input class="input" name="dbsIssueDate" type="date" required></label>' +
        '<label class="field"><span>DBS level</span><select class="select" name="dbsLevel"><option value="Enhanced">Enhanced</option></select></label>' +
        '<label class="field"><span>Internal note</span><input class="input" name="notes" placeholder="Optional"></label>' +
      '</div><div class="v7-msg" id="v7ScoutApprovalMsg"></div><div class="v7-inline-actions"><button class="btn" type="submit">Approve & email Stripe checkout</button><button class="btn secondary" type="button" data-cancel>Cancel</button></div></form>'
    );

    host.querySelector('[data-cancel]').onclick = closeModal;
    host.querySelector('#v7ScoutApproval').onsubmit = async function (event) {
      event.preventDefault();
      var form = event.currentTarget;
      var data = new FormData(form);
      var msg = host.querySelector('#v7ScoutApprovalMsg');
      var submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      msg.className = 'v7-msg';
      msg.textContent = 'Creating the Stripe Checkout Session and sending the payment email…';
      try {
        var checklist = {};
        ['identity','dbs','faCredentials','clubAssociation','contactDetails','noSafeguardingFlags','termsAccepted'].forEach(function (key) {
          checklist[key] = data.get(key) === 'on';
        });
        var response = await api('POST', '/api/registrations/' + encodeURIComponent(row.id) + '/approve', {
          safeguardingReview: {
            checklist: checklist,
            dbsCertificateNumber: data.get('dbsCertificateNumber'),
            dbsIssueDate: data.get('dbsIssueDate'),
            dbsLevel: data.get('dbsLevel'),
            notes: data.get('notes') || ''
          }
        });
        msg.className = 'v7-msg success';
        msg.textContent = response.message || 'Scout approved and Stripe checkout emailed.';
        state.registrationFetchedAt = 0;
        setTimeout(function () { closeModal(); location.reload(); }, 900);
      } catch (error) {
        msg.className = 'v7-msg error';
        msg.textContent = error.message;
        submit.disabled = false;
      }
    };
  }

  async function resendStripe(row, button) {
    if (button) button.disabled = true;
    try {
      var response = await api('POST', '/api/registrations/' + encodeURIComponent(row.id) + '/resend-payment', {});
      alert(response.message || 'Fresh Stripe Checkout link emailed.');
      state.registrationFetchedAt = 0;
      location.reload();
    } catch (error) {
      alert(error.message);
      if (button) button.disabled = false;
    }
  }

  function patchRegistrationDetail() {
    if (path() !== '/admin/registrations' || !state.currentRegistration) return;
    var row = state.currentRegistration;
    var stage = registrationStage(row);
    var actions = document.querySelector('#regDetail .hero-actions');
    if (!actions) return;

    if (stage === 'documents_ready' && !actions.querySelector('[data-v7-scout-approve]')) {
      var approve = document.createElement('button');
      approve.type = 'button';
      approve.className = 'btn';
      approve.dataset.v7ScoutApprove = '1';
      approve.textContent = 'Approve Scout & send Stripe checkout';
      approve.onclick = function () { approveScout(row); };
      actions.insertBefore(approve, actions.firstChild);
    }

    if (stage === 'awaiting_payment' && row.stripe_checkout_session_id) {
      var paid = actions.querySelector('[data-reg-action="paid"]');
      if (paid && !actions.querySelector('[data-v7-resend-stripe]')) {
        var fresh = paid.cloneNode(true);
        fresh.removeAttribute('data-reg-action');
        fresh.dataset.v7ResendStripe = '1';
        fresh.textContent = 'Resend Stripe checkout';
        fresh.onclick = function () { resendStripe(row, fresh); };
        paid.replaceWith(fresh);
      }
    }
  }

  async function patchRegistrations() {
    if (path() !== '/admin/registrations') return;
    try {
      var rows = await loadRegistrations(false);
      document.querySelectorAll('[data-reg]').forEach(function (node) {
        if (node.dataset.v7Bound === '1') return;
        node.dataset.v7Bound = '1';
        node.addEventListener('click', function () {
          state.currentRegistration = rows[Number(node.dataset.reg)] || null;
          setTimeout(patchRegistrationDetail, 0);
          setTimeout(patchRegistrationDetail, 80);
        }, true);
      });
      patchRegistrationDetail();
    } catch (_) {}
  }

  function apply() {
    if (window.__STRATEX_ADMIN_PHONE_BLOCKED__) return;
    rebuildNavigation();
    var current = path();
    if (current !== state.lastPath) {
      state.lastPath = current;
      var nav = document.getElementById('adminNav');
      if (nav) nav.dataset.v7 = '';
      rebuildNavigation();
    }
    if (current === '/admin') renderDashboard();
    if (current === '/admin/financials') renderFinancials();
    if (current === '/admin/admin-users') renderUsers();
    if (current === '/admin/registrations') patchRegistrations();
  }

  var scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      apply();
    });
  }

  document.addEventListener('click', function (event) {
    var registrationButton = event.target.closest && event.target.closest('[data-reg]');
    if (registrationButton && state.registrations.length) {
      state.currentRegistration = state.registrations[Number(registrationButton.dataset.reg)] || null;
      setTimeout(schedule, 0);
    }
  }, true);

  window.addEventListener('popstate', function () { setTimeout(schedule, 0); });
  window.addEventListener('load', schedule);
  document.addEventListener('DOMContentLoaded', schedule);
  new MutationObserver(schedule).observe(document.documentElement, { childList:true, subtree:true });
  setTimeout(schedule, 20);
  setTimeout(schedule, 250);
  setTimeout(schedule, 800);
}());
