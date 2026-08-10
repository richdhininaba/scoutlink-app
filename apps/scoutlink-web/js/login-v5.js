\'use strict\';
(function () {
  var CANONICAL_API = 'https://scoutlink-api.vercel.app';

  function shouldUseSameOriginApi() {
    var host = String(window.location.hostname || '').toLowerCase();
    return host === 'scoutlink.app' ||
      host === 'www.scoutlink.app' ||
      host.endsWith('.vercel.app') ||
      host.endsWith('.app.github.dev');
  }

  var API = (function () {
    var host = String(window.location.hostname || '').toLowerCase();
    var isProduction = host === 'scoutlink.app' || host === 'www.scoutlink.app';

    /*
     * Production login must not trust a browser-persisted API override.
     * A stale sl_api_url can point login at an old preview/local API and make
     * fetch() fail before the request reaches the live ScoutLink API.
     *
     * Keep the canonical value in storage so the signed-in ScoutLink pages
     * that still read sl_api_url also recover after a successful login page load.
     */
    if (isProduction) {
      try { localStorage.setItem('sl_api_url', CANONICAL_API); } catch (_) {}
    }

    /*
     * On production, Vercel previews and Codespaces running `vercel dev`, use
     * the ScoutLink web project's same-origin /api proxy. This removes browser
     * CORS / stale-host failure modes from the login request itself.
     */
    if (shouldUseSameOriginApi()) return '';

    try { return localStorage.getItem('sl_api_url') || CANONICAL_API; }
    catch (_) { return CANONICAL_API; }
  }()).replace(/\/+$/, '');

  var pendingLogin = null;
  var pendingReset = null;
  var viewNames = ['password','code','reset-request','reset-confirm','role'];

  function byId(id) { return document.getElementById(id); }

  function showMessage(id, text) {
    var el = byId(id);
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('show', !!text);
  }

  function clearMessages() {
    showMessage('loginError', '');
    showMessage('loginOk', '');
  }

  function setBusy(button, busy) {
    if (!button) return;
    button.disabled = !!busy;
    button.classList.toggle('busy', !!busy);
  }

  function setView(name, updateHash) {
    clearMessages();
    if (viewNames.indexOf(name) < 0) name = 'password';
    document.querySelectorAll('[data-login-view]').forEach(function (view) {
      view.classList.toggle('active', view.getAttribute('data-login-view') === name);
    });
    if (updateHash !== false) {
      var hash = name === 'code' ? '#code' :
        (name === 'reset-request' || name === 'reset-confirm') ? '#reset' : '';
      history.replaceState(null, '', location.pathname + location.search + hash);
    }
    window.setTimeout(function () {
      var target = name === 'code' ? byId('codeEmail') :
        name === 'reset-request' ? byId('resetRequestEmail') :
        name === 'reset-confirm' ? byId('resetCode') : byId('email');
      if (target) target.focus();
    }, 30);
  }

  function routeFor(data) {
    if (!data) return '/login';
    if (data.needsRegistration) {
      return '/complete-registration?token=' + encodeURIComponent(data.token || '') +
        '&type=' + encodeURIComponent(data.accountType || '');
    }
    if (data.accountType === 'Stratex') return '/experience-select';
    if (data.accountType === 'Scout') {
      return (data.needsOnboarding || data.needsPreferences) ? '/scout/onboarding' : '/scout/dashboard';
    }
    if (data.accountType === 'Coach') return data.needsOnboarding ? '/coach/onboarding' : '/coach/dashboard';
    if (data.accountType === 'Player') return '/player/dashboard';
    return '/login';
  }

  function storeSession(data) {
    localStorage.setItem('sl_token', data.token || '');
    localStorage.setItem('sl_type', data.accountType || '');
    localStorage.setItem('sl_user', JSON.stringify(data.user || {}));
    localStorage.setItem('sl_user_id', data.user && data.user.id ? data.user.id : '');
    localStorage.setItem('sl_user_email', data.user && data.user.email ? data.user.email : '');
  }

  function finishLogin(data) {
    storeSession(data);
    location.href = routeFor(data);
  }

  async function post(path, body, token) {
    var headers = { 'Content-Type':'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;

    var response;
    try {
      response = await fetch(API + path, {
        method:'POST',
        headers:headers,
        credentials:'include',
        body:JSON.stringify(body || {})
      });
    } catch (error) {
      console.error('[ScoutLink login] API request failed', error);
      throw new Error('ScoutLink could not reach the sign-in service. Please try again.');
    }

    var json = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(json.error || 'The request could not be completed.');
    return json;
  }

  function roleButton(role, index, target) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'roleline' + (index === 0 ? ' on' : '');
    button.innerHTML =
      '<span class="k">' + String(role.accountType || 'SL').toUpperCase().slice(0,6) + '</span>' +
      '<div><h4>' + (role.label || role.accountType || 'ScoutLink workspace') + '</h4>' +
      '<p>Open this approved workspace</p></div><span class="go">→</span>';
    button.addEventListener('click', function () { chooseLoginRole(index); });
    target.appendChild(button);
  }

  function showLoginRoles(data, mode, credentials) {
    pendingLogin = { mode:mode, credentials:credentials, roles:data.roles || [] };
    var root = byId('loginRoleOptions');
    root.innerHTML = '';
    pendingLogin.roles.forEach(function (role, index) { roleButton(role, index, root); });
    setView('role');
  }

  async function chooseLoginRole(index) {
    if (!pendingLogin || !pendingLogin.roles[index]) return;
    var role = pendingLogin.roles[index];
    var body = {
      email:pendingLogin.credentials.email,
      accountType:role.accountType
    };
    if (pendingLogin.mode === 'code') body.loginCode = pendingLogin.credentials.loginCode;
    else body.password = pendingLogin.credentials.password;
    try {
      var data = await post('/api/auth/login', body);
      finishLogin(data);
    } catch (error) {
      setView('role', false);
      showMessage('loginError', error.message);
    }
  }

  byId('passwordLoginForm').addEventListener('submit', async function (event) {
    event.preventDefault();
    clearMessages();
    var email = byId('email').value.trim();
    var password = byId('password').value;
    if (!email || !password) { showMessage('loginError','Enter your email and password.'); return; }
    setBusy(byId('loginBtn'), true);
    try {
      var data = await post('/api/auth/login', { email:email, password:password });
      if (data.requiresRoleSelection) {
        setBusy(byId('loginBtn'), false);
        showLoginRoles(data, 'password', { email:email, password:password });
        return;
      }
      finishLogin(data);
    } catch (error) {
      showMessage('loginError', error.message || "That email and password don't match.");
      setBusy(byId('loginBtn'), false);
      byId('email').focus();
    }
  });

  byId('codeLoginForm').addEventListener('submit', async function (event) {
    event.preventDefault();
    clearMessages();
    var email = byId('codeEmail').value.trim();
    var code = byId('loginCode').value.trim().toUpperCase();
    if (!email || !code) { showMessage('loginError','Enter your email and login code.'); return; }
    setBusy(byId('codeBtn'), true);
    try {
      var data = await post('/api/auth/login', { email:email, loginCode:code });
      if (data.requiresRoleSelection) {
        setBusy(byId('codeBtn'), false);
        showLoginRoles(data, 'code', { email:email, loginCode:code });
        return;
      }
      finishLogin(data);
    } catch (error) {
      showMessage('loginError', error.message || 'That login code could not be verified.');
      setBusy(byId('codeBtn'), false);
    }
  });

  byId('resetRequestForm').addEventListener('submit', async function (event) {
    event.preventDefault();
    clearMessages();
    var email = byId('resetRequestEmail').value.trim();
    if (!email) { showMessage('loginError','Enter your email address.'); return; }
    setBusy(byId('resetRequestBtn'), true);
    try {
      var data = await post('/api/auth/forgot-password', { email:email });
      byId('resetEmail').value = email;
      setView('reset-confirm');
      showMessage('loginOk', data.message || 'If that email exists, a reset code has been sent.');
    } catch (error) {
      showMessage('loginError', error.message || 'The reset request could not be completed.');
    } finally {
      setBusy(byId('resetRequestBtn'), false);
    }
  });

  function renderResetRoleChooser(roles) {
    var root = byId('resetRoleChooser');
    root.innerHTML = '';
    root.hidden = false;
    roles.forEach(function (role, index) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'roleline' + (index === 0 ? ' on' : '');
      button.innerHTML = '<span class="k">' + String(role.accountType || '').toUpperCase() +
        '</span><div><h4>' + (role.label || role.accountType) +
        '</h4><p>Reset this workspace password</p></div><span class="go">→</span>';
      button.addEventListener('click', function () {
        pendingReset.accountType = role.accountType;
        submitReset(true);
      });
      root.appendChild(button);
    });
  }

  async function submitReset(fromRoleChoice) {
    clearMessages();
    var email = byId('resetEmail').value.trim();
    var code = byId('resetCode').value.trim().toUpperCase();
    var password = byId('newPassword').value;
    var confirm = byId('confirmResetPassword').value;
    if (!email || !code || !password || !confirm) {
      showMessage('loginError','Complete every reset field.'); return;
    }
    if (password.length < 8) { showMessage('loginError','Password must be at least 8 characters.'); return; }
    if (password !== confirm) { showMessage('loginError','Passwords do not match.'); return; }
    setBusy(byId('resetConfirmBtn'), true);
    try {
      var body = { email:email, code:code, newPassword:password };
      if (pendingReset && pendingReset.accountType) body.accountType = pendingReset.accountType;
      var data = await post('/api/auth/reset-password', body);
      if (data.requiresRoleSelection && !fromRoleChoice) {
        pendingReset = { accountType:null };
        renderResetRoleChooser(data.roles || []);
        showMessage('loginOk','Choose which approved workspace password to reset.');
        return;
      }
      var login = await post('/api/auth/login', {
        email:email,
        password:password,
        accountType:data.accountType || (pendingReset && pendingReset.accountType) || undefined
      });
      if (login.requiresRoleSelection) {
        showLoginRoles(login, 'password', { email:email, password:password });
        return;
      }
      showMessage('loginOk', data.message || 'Password updated.');
      window.setTimeout(function () { finishLogin(login); }, 350);
    } catch (error) {
      showMessage('loginError', error.message || 'The reset code could not be verified.');
    } finally {
      setBusy(byId('resetConfirmBtn'), false);
    }
  }

  byId('resetConfirmForm').addEventListener('submit', function (event) {
    event.preventDefault();
    submitReset(false);
  });

  document.querySelectorAll('[data-login-link]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      var name = link.getAttribute('data-login-link');
      if (name === 'reset') setView('reset-request');
      else setView(name);
    });
  });

  document.querySelectorAll('[data-toggle-password]').forEach(function (button) {
    button.addEventListener('click', function () {
      var input = byId(button.getAttribute('data-toggle-password'));
      if (!input) return;
      var hidden = input.type === 'password';
      input.type = hidden ? 'text' : 'password';
      button.textContent = hidden ? 'Hide' : 'Show';
    });
  });

  [byId('loginCode'),byId('resetCode')].forEach(function (input) {
    if (input) input.addEventListener('input', function () { input.value = input.value.toUpperCase(); });
  });

  window.addEventListener('hashchange', function () {
    if (location.hash === '#code') setView('code', false);
    else if (location.hash === '#reset') setView('reset-request', false);
    else setView('password', false);
  });

  var params = new URLSearchParams(location.search);
  var prefillEmail = params.get('email') || '';
  if (prefillEmail) {
    ['email','codeEmail','resetRequestEmail','resetEmail'].forEach(function (id) {
      if (byId(id)) byId(id).value = prefillEmail;
    });
  }
  if (params.get('code')) {
    byId('loginCode').value = params.get('code').toUpperCase();
    setView('code', false);
  } else if (location.hash === '#code') setView('code', false);
  else if (location.hash === '#reset') setView('reset-request', false);
  else setView('password', false);
}());
