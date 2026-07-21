'use strict';

(function () {
  var RICHDHIN_EMAIL = 'richdhin@stratexanalytics.co.uk';
  var API_BASE = (function () {
    try {
      return localStorage.getItem('sl_api_url') ||
        'https://scoutlink-api.vercel.app';
    } catch (_) {
      return 'https://scoutlink-api.vercel.app';
    }
  })();

  var PERMISSION_AREAS = [
    ['dashboard','Dashboard','dashboard'],
    ['registrations','Registrations','registrations'],
    ['contact_forms','Contact Forms','contact_forms'],
    ['crm','CRM','crm'],
    ['website_activity','Website Activity','website_activity'],
    ['content','Blog / Learning Centre','content'],
    ['leadership','Leadership','leadership'],
    ['org','Org Charts','org'],
    ['contracts','Contracts & Pay','contracts'],
    ['hiring','Hiring','hiring'],
    ['trust','Trust & Concerns','trust'],
    ['showcase','Showcase Event','showcase'],
    ['awards','Award Ceremonies','awards'],
    ['settings','Settings','settings']
  ];

  var NAV_GROUPS = [
    ['Overview',['dashboard']],
    ['Operations',['registrations','contactForms','crm']],
    ['Analytics',['activity']],
    ['Content',['blog','leadership']],
    ['People',['org','adminUsers','permissions','profile','contracts','leave','hiring','meetings']],
    ['Trust',['concerns']],
    ['Events',['showcase','awards']],
    ['Company',['settings']]
  ];

  var observer = null;
  var shellEnhanced = false;
  var loginEnhanced = false;
  var dashboardMetricsLoaded = false;
  var permissionState = {
    admins:[],
    current:null,
    selectedId:'',
    selectedPermissions:[]
  };

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

  function token() {
    var auth = authStore();

    if (auth && auth.token) return auth.token;

    try {
      return localStorage.getItem('sl_token') || '';
    } catch (_) {
      return '';
    }
  }

  function emailAddress() {
    return String(authUser().email || '').trim().toLowerCase();
  }

  function isRichdhin() {
    return emailAddress() === RICHDHIN_EMAIL;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(
      /[&<>"']/g,
      function (char) {
        return {
          '&':'&amp;',
          '<':'&lt;',
          '>':'&gt;',
          '"':'&quot;',
          "'":'&#39;'
        }[char];
      }
    );
  }

  function currentPath() {
    return (window.location.pathname || '/admin')
      .replace(/\/+$/,'') || '/admin';
  }

  function setSession(data) {
    var auth = authStore();
    var accountType = data && data.accountType || 'Stratex';

    if (
      !data ||
      !data.token ||
      !data.user ||
      accountType !== 'Stratex'
    ) {
      throw new Error('The Stratex sign-in response was incomplete.');
    }

    if (auth && typeof auth.set === 'function') {
      auth.set(data.token,data.user,'Stratex');
      return;
    }

    localStorage.setItem('sl_token',data.token);
    localStorage.setItem('sl_user',JSON.stringify(data.user));
    localStorage.setItem('sl_type','Stratex');

    if (data.user.id) {
      localStorage.setItem('sl_user_id',data.user.id);
    }

    if (data.user.email) {
      localStorage.setItem('sl_user_email',data.user.email);
    }
  }

  async function api(method,path,body,isForm) {
    var options = {
      method:method,
      headers:{
        Authorization:'Bearer ' + token()
      },
      credentials:'include'
    };

    if (body !== undefined && body !== null) {
      if (isForm) {
        options.body = body;
      } else {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
      }
    }

    var response = await fetch(API_BASE + path,options);
    var data = await response.json().catch(function () {
      return {};
    });

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        'The request could not be completed.'
      );
    }

    return data;
  }

  function message(node,text,type) {
    if (!node) return;

    node.textContent = text || '';
    node.className = node.className
      .replace(/\s+is-visible|\s+is-error|\s+is-success/g,'');

    if (!text) return;

    node.classList.add('is-visible');
    node.classList.add(
      type === 'success' ? 'is-success' : 'is-error'
    );
  }

  function loginMarkup(mode,email,code) {
    return '<main class="saa-login">' +
      '<section class="saa-login-story">' +
        '<a class="saa-login-brand" href="/">' +
          '<span class="saa-login-logo">SA</span>' +
          '<span><b>Stratex Admin</b>' +
          '<span>Internal staff access</span></span>' +
        '</a>' +
        '<h1>Run the company from one secure workspace.</h1>' +
        '<p>Stratex Admin is the parent-company operating centre for Stratex Analytics. It brings together company operations, people, public-site activity and records created through ScoutLink.</p>' +
        '<div class="saa-login-points">' +
          '<div class="saa-login-point">' +
            '<b>Separate internal authentication</b>' +
            '<span>Stratex Admin access is separate from Coach, Scout and Player product access.</span>' +
          '</div>' +
          '<div class="saa-login-point">' +
            '<b>Parent-company visibility</b>' +
            '<span>ScoutLink registrations, customers, forms and linked activity remain visible to authorised Stratex staff.</span>' +
          '</div>' +
          '<div class="saa-login-point">' +
            '<b>One Super Admin</b>' +
            '<span>Only Richdhin Inaba can create internal users or change company-wide permissions.</span>' +
          '</div>' +
        '</div>' +
        '<footer>Stratex Analytics internal system · Authorised staff only</footer>' +
      '</section>' +
      '<section class="saa-login-right">' +
        '<div class="saa-login-card">' +
          '<p class="saa-eyebrow">Internal staff sign in</p>' +
          '<h2 id="saaLoginTitle">Sign in to Stratex Admin</h2>' +
          '<p id="saaLoginIntro">Use your approved Stratex email with your password or one-time invitation code.</p>' +
          '<div class="saa-login-tabs" role="tablist" aria-label="Sign-in method">' +
            '<button class="saa-login-tab' +
              (mode === 'password' ? ' is-active' : '') +
              '" type="button" role="tab" data-saa-login-mode="password" aria-selected="' +
              (mode === 'password' ? 'true' : 'false') +
              '">Email and password</button>' +
            '<button class="saa-login-tab' +
              (mode === 'code' ? ' is-active' : '') +
              '" type="button" role="tab" data-saa-login-mode="code" aria-selected="' +
              (mode === 'code' ? 'true' : 'false') +
              '">Login code</button>' +
          '</div>' +
          '<form id="saaLoginForm" data-mode="' + escapeHtml(mode) + '">' +
            '<label class="saa-login-field">' +
              '<span>Stratex work email</span>' +
              '<input class="saa-login-input" id="saaLoginEmail" name="email" type="email" autocomplete="email" value="' +
                escapeHtml(email || '') +
                '" placeholder="name@stratexanalytics.co.uk" required>' +
            '</label>' +
            '<label class="saa-login-field" id="saaPasswordField"' +
              (mode === 'code' ? ' hidden' : '') + '>' +
              '<span>Password</span>' +
              '<input class="saa-login-input" id="saaLoginPassword" name="password" type="password" autocomplete="current-password"' +
                (mode === 'password' ? ' required' : '') + '>' +
            '</label>' +
            '<label class="saa-login-field" id="saaCodeField"' +
              (mode === 'password' ? ' hidden' : '') + '>' +
              '<span>One-time login code</span>' +
              '<input class="saa-login-input saa-code-input" id="saaLoginCode" name="loginCode" maxlength="12" autocomplete="one-time-code" value="' +
                escapeHtml(code || '') +
                '"' + (mode === 'code' ? ' required' : '') + '>' +
            '</label>' +
            '<div class="saa-login-message" id="saaLoginMessage" role="alert"></div>' +
            '<button class="saa-login-submit" id="saaLoginSubmit" type="submit">' +
              (mode === 'code' ? 'Verify code securely' : 'Sign in securely') +
            '</button>' +
          '</form>' +
          '<div class="saa-login-note">' +
            '<b>First-time access</b><br>' +
            'Use the code in your Stratex invitation email. After verification, create your own password before entering the workspace.' +
          '</div>' +
          '<div class="saa-login-links">' +
            '<a href="/forgot-password?type=Stratex">Forgot password</a>' +
            '<a href="/login">Open ScoutLink login</a>' +
          '</div>' +
        '</div>' +
      '</section>' +
    '</main>';
  }

  function setupMarkup() {
    return '<main class="saa-login">' +
      '<section class="saa-login-story">' +
        '<a class="saa-login-brand" href="/">' +
          '<span class="saa-login-logo">SA</span>' +
          '<span><b>Stratex Admin</b><span>Internal staff setup</span></span>' +
        '</a>' +
        '<h1>Finish your secure Stratex Admin setup.</h1>' +
        '<p>Your invitation code has been confirmed. Create a private password for the internal parent-company workspace.</p>' +
        '<div class="saa-login-points">' +
          '<div class="saa-login-point"><b>Internal account only</b><span>This password controls Stratex Admin access.</span></div>' +
          '<div class="saa-login-point"><b>Keep it private</b><span>Do not reuse a shared team or ScoutLink demo password.</span></div>' +
          '<div class="saa-login-point"><b>Permissioned access</b><span>Your available pages are based on the access assigned by Richdhin.</span></div>' +
        '</div>' +
      '</section>' +
      '<section class="saa-login-right">' +
        '<div class="saa-login-card">' +
          '<p class="saa-eyebrow">Password setup</p>' +
          '<h2>Create your Stratex password</h2>' +
          '<p>Use at least eight characters. A longer unique password is recommended.</p>' +
          '<form id="saaSetupForm">' +
            '<label class="saa-login-field">' +
              '<span>New password</span>' +
              '<input class="saa-login-input" id="saaNewPassword" type="password" minlength="8" autocomplete="new-password" required>' +
            '</label>' +
            '<label class="saa-login-field">' +
              '<span>Confirm new password</span>' +
              '<input class="saa-login-input" id="saaConfirmPassword" type="password" minlength="8" autocomplete="new-password" required>' +
            '</label>' +
            '<div class="saa-login-message" id="saaSetupMessage" role="alert"></div>' +
            '<button class="saa-login-submit" id="saaSetupSubmit" type="submit">Create password and continue</button>' +
          '</form>' +
        '</div>' +
      '</section>' +
    '</main>';
  }

  function renderLoginV2() {
    if (loginEnhanced) return;

    loginEnhanced = true;
    shellEnhanced = false;

    document.body.className =
      'theme-light stratex-admin-complete-v2 saa-login-body';

    var params = new URLSearchParams(window.location.search);
    var code = params.get('code') || '';
    var email = params.get('email') || '';
    var mode = code ? 'code' : 'password';

    document.body.innerHTML = loginMarkup(mode,email,code);
    bindLogin(mode);
  }

  function bindLogin(initialMode) {
    var form = document.getElementById('saaLoginForm');
    var mode = initialMode || 'password';

    function applyMode(next) {
      mode = next;
      form.setAttribute('data-mode',mode);

      document.querySelectorAll('[data-saa-login-mode]').forEach(
        function (tab) {
          var active = tab.getAttribute('data-saa-login-mode') === mode;
          tab.classList.toggle('is-active',active);
          tab.setAttribute('aria-selected',active ? 'true' : 'false');
        }
      );

      var passwordField = document.getElementById('saaPasswordField');
      var codeField = document.getElementById('saaCodeField');
      var password = document.getElementById('saaLoginPassword');
      var code = document.getElementById('saaLoginCode');
      var submit = document.getElementById('saaLoginSubmit');

      passwordField.hidden = mode !== 'password';
      codeField.hidden = mode !== 'code';
      password.required = mode === 'password';
      code.required = mode === 'code';
      submit.textContent = mode === 'code'
        ? 'Verify code securely'
        : 'Sign in securely';

      message(document.getElementById('saaLoginMessage'),'','');
    }

    document.querySelectorAll('[data-saa-login-mode]').forEach(
      function (tab) {
        tab.addEventListener('click',function () {
          applyMode(tab.getAttribute('data-saa-login-mode'));
        });
      }
    );

    form.addEventListener('submit',async function (event) {
      event.preventDefault();

      var email = document.getElementById('saaLoginEmail').value
        .trim()
        .toLowerCase();

      var password = document.getElementById('saaLoginPassword').value;
      var code = document.getElementById('saaLoginCode').value
        .trim()
        .toUpperCase();

      var feedback = document.getElementById('saaLoginMessage');
      var submit = document.getElementById('saaLoginSubmit');

      message(feedback,'','');

      if (!email || email.indexOf('@') < 1) {
        message(feedback,'Enter a valid approved Stratex email.','error');
        return;
      }

      if (mode === 'password' && !password) {
        message(feedback,'Enter your Stratex Admin password.','error');
        return;
      }

      if (mode === 'code' && !code) {
        message(feedback,'Enter the one-time code from your invitation email.','error');
        return;
      }

      submit.disabled = true;
      submit.textContent = mode === 'code'
        ? 'Verifying…'
        : 'Signing in…';

      try {
        var response = await fetch(
          API_BASE + '/api/auth/login',
          {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({
              email:email,
              password:mode === 'password' ? password : undefined,
              loginCode:mode === 'code' ? code : undefined,
              accountType:'Stratex'
            })
          }
        );

        var data = await response.json().catch(function () {
          return {};
        });

        if (!response.ok) {
          throw new Error(
            data.error || 'The Stratex credentials were not accepted.'
          );
        }

        setSession(data);

        if (mode === 'code' && data.needsRegistration) {
          renderPasswordSetup();
          return;
        }

        window.location.replace('/admin');
      } catch (error) {
        message(
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

    applyMode(mode);
  }

  function renderPasswordSetup() {
    document.body.innerHTML = setupMarkup();

    var form = document.getElementById('saaSetupForm');

    form.addEventListener('submit',async function (event) {
      event.preventDefault();

      var password = document.getElementById('saaNewPassword').value;
      var confirm = document.getElementById('saaConfirmPassword').value;
      var feedback = document.getElementById('saaSetupMessage');
      var submit = document.getElementById('saaSetupSubmit');

      message(feedback,'','');

      if (password.length < 8) {
        message(feedback,'Password must contain at least eight characters.','error');
        return;
      }

      if (password !== confirm) {
        message(feedback,'The two passwords do not match.','error');
        return;
      }

      submit.disabled = true;
      submit.textContent = 'Saving password…';

      try {
        await api(
          'POST',
          '/api/auth/complete-registration',
          {
            newPassword:password,
            accountType:'Stratex'
          }
        );

        message(
          feedback,
          'Password created. Opening Stratex Admin…',
          'success'
        );

        setTimeout(function () {
          window.location.replace('/admin');
        },600);
      } catch (error) {
        message(
          feedback,
          error.message || 'The password could not be saved.',
          'error'
        );

        submit.disabled = false;
        submit.textContent = 'Create password and continue';
      }
    });
  }

  function cleanAdminRole() {
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

  function icon(label) {
    return '<span aria-hidden="true" style="font-size:9px;font-weight:950">' +
      escapeHtml(label) +
    '</span>';
  }

  function permissionNavButton() {
    return '<button class="stx-admin-nav-item" type="button" ' +
      'data-saa-permissions-nav>' +
      '<i class="stx-admin-nav-icon">' + icon('PM') + '</i>' +
      '<span><b>Permissions</b><small>Richdhin-only access</small></span>' +
    '</button>';
  }

  function groupNavigation() {
    var nav = document.querySelector('.stx-admin-nav');
    if (!nav || nav.dataset.saaGrouped === '1') return;

    nav.dataset.saaGrouped = '1';

    var buttons = {};
    nav.querySelectorAll('[data-admin-module]').forEach(function (button) {
      buttons[button.getAttribute('data-admin-module')] = button;
    });

    if (isRichdhin()) {
      var holder = document.createElement('div');
      holder.innerHTML = permissionNavButton();
      buttons.permissions = holder.firstElementChild;
    } else if (buttons.adminUsers) {
      buttons.adminUsers.remove();
      delete buttons.adminUsers;
    }

    nav.innerHTML = '';

    NAV_GROUPS.forEach(function (group) {
      var available = group[1].filter(function (id) {
        return !!buttons[id];
      });

      if (!available.length) return;

      var section = document.createElement('section');
      section.className = 'saa-nav-group';
      section.innerHTML =
        '<div class="saa-nav-title">' +
        escapeHtml(group[0]) +
        '</div>';

      available.forEach(function (id) {
        section.appendChild(buttons[id]);

        if (id === 'adminUsers') {
          buttons[id].querySelector('b').textContent = 'Add User';
          buttons[id].querySelector('small').textContent =
            'Richdhin-only invitations';
        }
      });

      nav.appendChild(section);
    });

    var permissionsButton = nav.querySelector('[data-saa-permissions-nav]');

    if (permissionsButton) {
      permissionsButton.addEventListener('click',function () {
        history.pushState({},'', '/admin/permissions');
        showPermissionsPage();
        closeMobileMenu();
      });
    }
  }

  function setUserIdentity() {
    var label = cleanAdminRole();

    document.querySelectorAll('.stx-admin-user span').forEach(
      function (node) {
        node.textContent = label;
      }
    );

    var titleBlock = document.querySelector('.stx-admin-titleblock p');
    if (titleBlock) {
      titleBlock.textContent =
        'Stratex internal administration · ' + label;
    }
  }

  function parentBanner(moduleId,className,title,copy) {
    var module = document.getElementById('module-' + moduleId);
    if (!module || module.querySelector('.saa-parent-banner')) return;

    var head = module.querySelector('.stx-module-head');

    if (!head) return;

    head.insertAdjacentHTML(
      'afterend',
      '<div class="saa-parent-banner ' + (className || '') + '">' +
        '<b>' + escapeHtml(title) + '</b>' +
        escapeHtml(copy) +
      '</div>'
    );
  }

  function addParentCompanyBanners() {
    parentBanner(
      'registrations',
      '',
      'Parent-company registration queue',
      'This queue contains ScoutLink Coach and Scout requests. The registration remains visible in Stratex Admin before approval, after a decision and when an active product account is linked.'
    );

    parentBanner(
      'contactForms',
      'is-blue',
      'All Stratex-owned public submissions',
      'Contact, demo, newsletter and concern forms belong to Stratex Analytics. ScoutLink product contacts continue into the central CRM rather than disappearing into a separate product-only list.'
    );

    parentBanner(
      'crm',
      '',
      'Stratex parent-company CRM',
      'The CRM combines Stratex website leads, ScoutLink registration requests, active Coach and Scout accounts, and Stratex career applicants. Linked registration and product-account identifiers remain attached to the record.'
    );

    parentBanner(
      'adminUsers',
      'is-gold',
      'Richdhin-only account creation',
      'Only richdhin@stratexanalytics.co.uk can create internal Stratex users, assign initial access or change company-wide permissions.'
    );

    parentBanner(
      'concerns',
      'is-red',
      'Sensitive records across the Stratex ecosystem',
      'This queue may include Stratex website concerns and ScoutLink-related reports. Sensitive evidence remains private and is never exposed through public URLs.'
    );
  }

  function addInvitePreview() {
    var module = document.getElementById('module-adminUsers');
    if (!module || module.querySelector('.saa-invite-preview')) return;

    var layout = module.querySelector('.stx-admin-two-col');
    if (!layout) return;

    var preview = document.createElement('aside');
    preview.className = 'saa-invite-preview';
    preview.innerHTML =
      '<p class="saa-eyebrow" style="color:#9edccc">Invitation email preview</p>' +
      '<h3>Your internal account is ready.</h3>' +
      '<p>The new user receives a one-time Stratex Admin code and completes password setup through the separate internal login.</p>' +
      '<div class="saa-invite-code">482 916</div>' +
      '<p>The code expires after the configured invitation period. Coach, Scout and Player credentials are not reused.</p>';

    layout.appendChild(preview);
  }

  async function loadDashboardMetrics() {
    if (dashboardMetricsLoaded) return;

    var dashboard = document.getElementById('module-dashboard');
    var hero = dashboard && dashboard.querySelector('.stx-admin-hero');

    if (!dashboard || !hero) return;

    dashboardMetricsLoaded = true;

    var root = document.createElement('div');
    root.className = 'saa-dashboard-kpis';
    root.innerHTML =
      '<article class="saa-kpi"><small>Open registrations</small><b>—</b><span>ScoutLink access requests</span></article>' +
      '<article class="saa-kpi is-blue"><small>Parent CRM records</small><b>—</b><span>Website and product contacts</span></article>' +
      '<article class="saa-kpi is-gold"><small>Career applicants</small><b>—</b><span>All current applications</span></article>' +
      '<article class="saa-kpi is-red"><small>Open concerns</small><b>—</b><span>Trust and safeguarding queue</span></article>';

    hero.insertAdjacentElement('afterend',root);

    try {
      var results = await Promise.allSettled([
        api('GET','/api/stratex/dashboard'),
        api('GET','/api/stratex-website/crm'),
        api('GET','/api/stratex/job-applications'),
        api('GET','/api/stratex-website/leads?limit=500')
      ]);

      var dashboardData = results[0].status === 'fulfilled'
        ? results[0].value
        : {};

      var crm = results[1].status === 'fulfilled'
        ? (results[1].value.data || [])
        : [];

      var applicants = results[2].status === 'fulfilled'
        ? (results[2].value.data || [])
        : [];

      var leads = results[3].status === 'fulfilled'
        ? (results[3].value.data || [])
        : [];

      var concerns = leads.filter(function (row) {
        return String(row.lead_type || '').toLowerCase()
          .indexOf('concern') >= 0 &&
          !/closed|resolved/i.test(String(row.status || ''));
      });

      var values = [
        Number(dashboardData.pendingReqs || 0),
        crm.length,
        applicants.length,
        concerns.length
      ];

      root.querySelectorAll('.saa-kpi b').forEach(function (node,index) {
        node.textContent = values[index].toLocaleString('en-GB');
      });
    } catch (_) {}
  }

  function markActiveCustomNav() {
    var permissions = currentPath() === '/admin/permissions';

    document.querySelectorAll('.stx-admin-nav-item').forEach(
      function (button) {
        if (button.hasAttribute('data-saa-permissions-nav')) {
          button.classList.toggle('is-active',permissions);
          button.setAttribute(
            'aria-current',
            permissions ? 'page' : 'false'
          );
        } else if (permissions) {
          button.classList.remove('active','is-active');
          button.removeAttribute('aria-current');
        }
      }
    );
  }

  function closeMobileMenu() {
    document.body.classList.remove('stx-admin-menu-open');

    var button = document.getElementById('stxAdminMenuButton');
    if (button) button.setAttribute('aria-expanded','false');
  }

  function routeEnhancement() {
    var path = currentPath();

    document.body.classList.toggle(
      'saa-add-user-route',
      path === '/admin/users/add'
    );

    if (path === '/admin/users/add') {
      var addButton = document.querySelector(
        '[data-admin-module="adminUsers"]'
      );

      if (addButton) addButton.click();

      var heading = document.querySelector(
        '#module-adminUsers .stx-module-head h2'
      );

      var copy = document.querySelector(
        '#module-adminUsers .stx-module-head p:not(.stx-eyebrow)'
      );

      if (heading) heading.textContent = 'Add Stratex User';

      if (copy) {
        copy.textContent =
          'Create the internal account, place the user in the reporting structure and send the secure one-time setup code.';
      }
    }

    if (path === '/admin/permissions') {
      showPermissionsPage();
    }
  }

  function normalisePermissions(value) {
    if (!Array.isArray(value)) return [];

    return value.map(function (item) {
      return String(item || '').trim().toLowerCase();
    }).filter(Boolean);
  }

  function adminName(admin) {
    return [
      admin && admin.first_name,
      admin && admin.last_name
    ].filter(Boolean).join(' ') ||
      admin && admin.email ||
      'Stratex user';
  }

  function selectedAdmin() {
    return permissionState.admins.find(function (admin) {
      return String(admin.id) === String(permissionState.selectedId);
    }) || null;
  }

  function canAlwaysAccess(permission) {
    return permission === 'dashboard' ||
      permission === 'profile';
  }

  function permissionTable(admin) {
    var richdhinTarget = String(admin && admin.email || '')
      .toLowerCase() === RICHDHIN_EMAIL;

    var permissions = richdhinTarget
      ? PERMISSION_AREAS.map(function (area) { return area[0]; })
      : permissionState.selectedPermissions;

    return '<div class="saa-permission-table-wrap">' +
      '<table class="saa-permission-table">' +
        '<thead><tr>' +
          '<th>Admin area</th>' +
          '<th>Access</th>' +
          '<th>Notes</th>' +
        '</tr></thead>' +
        '<tbody>' +
          PERMISSION_AREAS.map(function (area) {
            var on = richdhinTarget ||
              permissions.indexOf(area[0]) >= 0 ||
              canAlwaysAccess(area[0]);

            var locked = richdhinTarget ||
              canAlwaysAccess(area[0]);

            return '<tr>' +
              '<td><strong>' + escapeHtml(area[1]) + '</strong></td>' +
              '<td>' +
                '<button class="saa-permission-check' +
                  (on ? ' is-on' : '') +
                  (locked ? ' is-locked' : '') +
                  '" type="button" data-saa-permission="' +
                  escapeHtml(area[0]) +
                  '"' + (locked ? ' disabled' : '') +
                  ' aria-pressed="' + (on ? 'true' : 'false') + '">' +
                  (locked ? '—' : on ? '✓' : '') +
                '</button>' +
              '</td>' +
              '<td>' +
                escapeHtml(
                  richdhinTarget
                    ? 'Super Admin access is permanently controlled by Richdhin’s approved email.'
                    : locked
                      ? 'Core access'
                      : area[2].replace(/_/g,' ')
                ) +
              '</td>' +
            '</tr>';
          }).join('') +
        '</tbody>' +
      '</table>' +
    '</div>';
  }

  function renderPermissionsPage() {
    var module = document.getElementById('module-permissions');
    if (!module) return;

    if (!isRichdhin()) {
      module.innerHTML =
        '<div class="stx-module-head"><div>' +
          '<p class="stx-eyebrow">Stratex Analytics</p>' +
          '<h2>Permissions</h2>' +
          '<p>Company-wide permission editing is restricted.</p>' +
        '</div></div>' +
        '<div class="saa-parent-banner is-red">' +
          '<b>Permission editing locked</b>' +
          'Only Richdhin Inaba can create internal users or change Stratex Admin permissions.' +
        '</div>';

      return;
    }

    var selected = selectedAdmin();

    module.innerHTML =
      '<div class="stx-module-head"><div>' +
        '<p class="stx-eyebrow">Stratex Analytics</p>' +
        '<h2>Permissions</h2>' +
        '<p>Only Richdhin Inaba can edit company-wide Stratex Admin access.</p>' +
      '</div></div>' +
      '<div class="saa-parent-banner">' +
        '<b>Super Admin access confirmed</b>' +
        'You are signed in as richdhin@stratexanalytics.co.uk. Every permission change is enforced by the backend and recorded against the authenticated Stratex account.' +
      '</div>' +
      '<div class="saa-permissions-shell">' +
        '<div class="saa-permissions-controls">' +
          '<label class="saa-field">' +
            '<span>User being edited</span>' +
            '<select class="saa-select" id="saaPermissionUser">' +
              permissionState.admins.map(function (admin) {
                return '<option value="' + escapeHtml(admin.id) + '"' +
                  (String(admin.id) === String(permissionState.selectedId)
                    ? ' selected'
                    : '') +
                  '>' +
                  escapeHtml(adminName(admin) + ' · ' +
                    (admin.job_title || admin.admin_role || admin.role || 'Stratex user')) +
                '</option>';
              }).join('') +
            '</select>' +
          '</label>' +
          '<label class="saa-field">' +
            '<span>Access level</span>' +
            '<select class="saa-select" id="saaPermissionRole"' +
              (selected && String(selected.email || '').toLowerCase() === RICHDHIN_EMAIL
                ? ' disabled'
                : '') +
              '>' +
              '<option value="Employee"' +
                (/employee|read/i.test(String(selected && (selected.admin_role || selected.role) || ''))
                  ? ' selected'
                  : '') +
                '>Employee</option>' +
              '<option value="Management"' +
                (!/employee|read/i.test(String(selected && (selected.admin_role || selected.role) || ''))
                  ? ' selected'
                  : '') +
                '>Management</option>' +
            '</select>' +
          '</label>' +
          '<button class="saa-button is-primary" id="saaSavePermissions" type="button"' +
            (selected && String(selected.email || '').toLowerCase() === RICHDHIN_EMAIL
              ? ' disabled'
              : '') +
            '>Save permission changes</button>' +
        '</div>' +
        '<div class="saa-permissions-message" id="saaPermissionsMessage" role="status"></div>' +
        permissionTable(selected) +
      '</div>';

    bindPermissionsPage();
  }

  function bindPermissionsPage() {
    var user = document.getElementById('saaPermissionUser');
    var role = document.getElementById('saaPermissionRole');
    var save = document.getElementById('saaSavePermissions');

    if (user) {
      user.addEventListener('change',function () {
        permissionState.selectedId = user.value;

        var selected = selectedAdmin();
        permissionState.selectedPermissions =
          normalisePermissions(selected && selected.permissions);

        renderPermissionsPage();
      });
    }

    document.querySelectorAll('[data-saa-permission]').forEach(
      function (button) {
        button.addEventListener('click',function () {
          if (button.disabled) return;

          var permission = button.getAttribute('data-saa-permission');
          var index = permissionState.selectedPermissions
            .indexOf(permission);

          if (index >= 0) {
            permissionState.selectedPermissions.splice(index,1);
          } else {
            permissionState.selectedPermissions.push(permission);
          }

          button.classList.toggle('is-on',index < 0);
          button.setAttribute(
            'aria-pressed',
            index < 0 ? 'true' : 'false'
          );
          button.textContent = index < 0 ? '✓' : '';
        });
      }
    );

    if (save) {
      save.addEventListener('click',async function () {
        var feedback = document.getElementById('saaPermissionsMessage');
        var selected = selectedAdmin();

        message(feedback,'','');

        if (!selected) {
          message(feedback,'Choose a Stratex user.','error');
          return;
        }

        if (
          String(selected.email || '').toLowerCase() === RICHDHIN_EMAIL
        ) {
          message(
            feedback,
            'Richdhin’s Super Admin access is fixed and cannot be reduced.',
            'error'
          );
          return;
        }

        save.disabled = true;
        save.textContent = 'Saving…';

        try {
          await api(
            'PATCH',
            '/api/stratex/admins/' +
              encodeURIComponent(selected.id) +
              '/permissions',
            {
              adminRole:role ? role.value : 'Employee',
              permissions:permissionState.selectedPermissions
            }
          );

          message(
            feedback,
            'Permissions updated successfully.',
            'success'
          );

          await loadPermissionsData();
        } catch (error) {
          message(
            feedback,
            error.message || 'Permissions could not be saved.',
            'error'
          );
        } finally {
          save.disabled = false;
          save.textContent = 'Save permission changes';
        }
      });
    }
  }

  async function loadPermissionsData() {
    var module = document.getElementById('module-permissions');
    if (!module) return;

    module.innerHTML =
      '<div class="stx-module-head"><div>' +
        '<p class="stx-eyebrow">Stratex Analytics</p>' +
        '<h2>Permissions</h2>' +
        '<p>Loading internal users and access records.</p>' +
      '</div></div>' +
      '<div class="loading-state"><div class="spinner"></div></div>';

    try {
      var data = await api('GET','/api/stratex/org');

      permissionState.admins = Array.isArray(data.admins)
        ? data.admins
        : [];

      permissionState.current = data.currentAdmin || null;

      if (
        !permissionState.selectedId ||
        !permissionState.admins.some(function (admin) {
          return String(admin.id) === String(permissionState.selectedId);
        })
      ) {
        var firstNonRichdhin = permissionState.admins.find(
          function (admin) {
            return String(admin.email || '').toLowerCase() !==
              RICHDHIN_EMAIL;
          }
        );

        permissionState.selectedId =
          firstNonRichdhin && firstNonRichdhin.id ||
          permissionState.admins[0] && permissionState.admins[0].id ||
          '';
      }

      var selected = selectedAdmin();

      permissionState.selectedPermissions =
        normalisePermissions(selected && selected.permissions);

      renderPermissionsPage();
    } catch (error) {
      module.innerHTML =
        '<div class="stx-module-head"><div>' +
          '<p class="stx-eyebrow">Stratex Analytics</p>' +
          '<h2>Permissions</h2>' +
          '<p>Permission records could not be loaded.</p>' +
        '</div></div>' +
        '<div class="stx-admin-error">' +
          escapeHtml(error.message || 'Permission records are unavailable.') +
        '</div>';
    }
  }

  function showPermissionsPage() {
    if (!document.querySelector('.stx-admin-layout')) return;

    var content = document.querySelector('.stx-admin-content');
    if (!content) return;

    document.querySelectorAll('.stx-company-module').forEach(
      function (module) {
        module.hidden = true;
      }
    );

    var module = document.getElementById('module-permissions');

    if (!module) {
      module = document.createElement('section');
      module.className = 'stx-company-module';
      module.id = 'module-permissions';
      content.appendChild(module);
    }

    module.hidden = false;

    var title = document.getElementById('stxAdminTitle');
    if (title) title.textContent = 'Permissions';

    markActiveCustomNav();
    loadPermissionsData();
  }

  function interceptPopstate() {
    window.addEventListener('popstate',function () {
      setTimeout(function () {
        if (currentPath() === '/admin/permissions') {
          showPermissionsPage();
        } else {
          var custom = document.getElementById('module-permissions');
          if (custom) custom.hidden = true;
        }

        routeEnhancement();
      },0);
    });
  }

  function enhanceShell() {
    if (shellEnhanced) return;

    var layout = document.querySelector('.stx-admin-layout');
    if (!layout) return;

    shellEnhanced = true;
    loginEnhanced = false;

    document.body.classList.add('stratex-admin-complete-v2');

    groupNavigation();
    setUserIdentity();
    addParentCompanyBanners();
    addInvitePreview();
    loadDashboardMetrics();
    routeEnhancement();
    markActiveCustomNav();

    var mobileSiteLink = document.querySelector(
      '.stx-admin-mobile-site-link'
    );

    if (mobileSiteLink) {
      mobileSiteLink.textContent = 'Site';
      mobileSiteLink.setAttribute(
        'href',
        'https://www.stratexanalytics.co.uk/'
      );
    }

    interceptPopstate();
  }

  function observe() {
    if (observer) return;

    observer = new MutationObserver(function () {
      var oldLogin = document.querySelector('.stx-admin-login-screen');

      if (oldLogin && !loginEnhanced) {
        renderLoginV2();
        return;
      }

      if (document.querySelector('.stx-admin-layout')) {
        enhanceShell();
      }
    });

    observer.observe(document.documentElement,{
      childList:true,
      subtree:true
    });
  }

  function start() {
    document.body.classList.add('stratex-admin-complete-v2');

    observe();

    if (document.querySelector('.stx-admin-login-screen')) {
      renderLoginV2();
      return;
    }

    if (document.querySelector('.stx-admin-layout')) {
      enhanceShell();
    }
  }

  start();
})();
