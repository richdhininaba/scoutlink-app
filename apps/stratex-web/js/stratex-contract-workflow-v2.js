(function () {
  'use strict';

  if (window.__STRATEX_ADMIN_PHONE_BLOCKED__) return;

  var API = (function () {
    try { return window.API_BASE_URL || window.API_URL || ''; } catch (_) { return ''; }
  }());

  var state = {
    users: [],
    contracts: [],
    selectedUser: null,
    draft: null,
    generatedUrl: '',
    mounted: false
  };

  function path() {
    return (location.pathname || '').replace(/\/+$/, '') || '/admin';
  }

  function token() {
    try {
      if (typeof Auth !== 'undefined' && Auth && Auth.token) return Auth.token;
    } catch (_) {}
    try { return localStorage.getItem('sl_token') || ''; } catch (_) { return ''; }
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

  function name(user) {
    return [user.first_name, user.last_name].filter(Boolean).join(' ') || user.name || 'Staff member';
  }

  async function api(method, url, body, isForm) {
    var options = {
      method: method,
      credentials:'include',
      headers:{ Authorization:'Bearer ' + token() }
    };
    if (body != null) {
      if (isForm) {
        options.body = body;
      } else {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
      }
    }
    var response = await fetch(API + url, options);
    var contentType = response.headers.get('content-type') || '';
    var payload = contentType.indexOf('json') >= 0
      ? await response.json().catch(function () { return {}; })
      : { text:await response.text().catch(function () { return ''; }) };
    if (!response.ok) throw new Error(payload.error || payload.details || payload.text || ('Request failed (' + response.status + ')'));
    return payload;
  }

  function pill(status) {
    var value = String(status || 'draft').toLowerCase();
    var cls = value === 'signed' ? 'green' : value === 'sent' || value === 'viewed' ? 'blue' : value === 'revoked' || value === 'expired' ? 'red' : 'grey';
    return '<span class="pill ' + cls + '">' + esc(value.replace(/_/g, ' ')) + '</span>';
  }

  function contractList() {
    if (!state.contracts.length) return '<div class="v7-empty">No employment contracts have been generated yet.</div>';
    var byEmail = {};
    state.users.forEach(function (user) { if (user.email) byEmail[String(user.email).toLowerCase()] = user; });
    return state.contracts.map(function (contract) {
      var user = byEmail[String(contract.recipient_email || '').toLowerCase()] || null;
      var who = user ? name(user) : contract.recipient_name || 'Unlinked recipient';
      return '<div class="v7-contract-row"><div><b>' + esc(contract.contract_reference || contract.document_title || 'Contract') + '</b><small>' + esc(who) + ' · ' + esc(contract.recipient_email || 'No recipient email') + '</small></div><div><b>' + esc(contract.document_title || 'Contract of Employment') + '</b><small>Created ' + esc(date(contract.created_at)) + '</small></div>' + pill(contract.status) + '<div class="v7-contract-link-actions">' + (contract.status === 'signed' ? '<span class="pill green">Signed ' + esc(date(contract.signed_at)) + '</span>' : '<button type="button" data-new-for-email="' + esc(contract.recipient_email || '') + '">New contract</button>') + '</div></div>';
    }).join('');
  }

  function panel() {
    return '<section class="v7-contracts-panel" data-v7-contract-panel="1"><header class="v7-contracts-head"><div><small>CONTRACTS</small><h3>Employment contract links</h3><p>Generate a secure signing link and attach each contract record to the intended Stratex user.</p></div><button class="btn" type="button" id="v7GenerateContract">Generate contract</button></header><div class="v7-contracts-list" id="v7ContractList">' + contractList() + '</div></section>';
  }

  function closeModal() {
    var host = document.getElementById('v7ContractModalHost');
    if (host) host.remove();
  }

  function modal(title, body) {
    closeModal();
    var host = document.createElement('div');
    host.id = 'v7ContractModalHost';
    host.className = 'v7-modal-host';
    host.innerHTML = '<section class="v7-modal" role="dialog" aria-modal="true"><header class="v7-modal-head"><div><small>CONTRACTS</small><h2>' + esc(title) + '</h2></div><button class="v7-modal-close" type="button" aria-label="Close">×</button></header><div class="v7-modal-body">' + body + '</div></section>';
    document.body.appendChild(host);
    host.querySelector('.v7-modal-close').onclick = closeModal;
    host.addEventListener('click', function (event) { if (event.target === host) closeModal(); });
    return host;
  }

  function chooseUser(prefillEmail) {
    state.selectedUser = prefillEmail
      ? state.users.find(function (user) { return String(user.email || '').toLowerCase() === String(prefillEmail).toLowerCase(); }) || null
      : null;
    state.draft = null;
    state.generatedUrl = '';

    var options = state.users.map(function (user) {
      return '<option value="' + esc(user.id) + '"' + (state.selectedUser && state.selectedUser.id === user.id ? ' selected' : '') + '>' + esc(name(user) + ' — ' + (user.email || 'No email')) + '</option>';
    }).join('');

    var host = modal('Generate contract',
      '<p style="margin:0;color:var(--ink3);font-size:12px;line-height:1.6">Select the intended signer first. The generated contract record is attached to this user by their Stratex email. Uploading another PDF creates a separate contract record and secure link.</p>' +
      '<form id="v7ContractStart"><label class="field"><span>Intended signer</span><select class="select" name="userId" required><option value="">Select staff user</option>' + options + '</select></label>' +
      '<label class="field"><span>Contract PDF</span><input class="input" type="file" name="contract" accept="application/pdf" required></label><div class="v7-msg" id="v7ContractMsg"></div><div class="v7-inline-actions"><button class="btn" type="submit">Analyse contract</button><button class="btn secondary" type="button" data-cancel>Cancel</button></div></form>'
    );

    host.querySelector('[data-cancel]').onclick = closeModal;
    host.querySelector('#v7ContractStart').onsubmit = async function (event) {
      event.preventDefault();
      var form = event.currentTarget;
      var data = new FormData(form);
      var user = state.users.find(function (item) { return String(item.id) === String(data.get('userId')); });
      var file = data.get('contract');
      var msg = host.querySelector('#v7ContractMsg');
      if (!user || !user.email) {
        msg.className = 'v7-msg error';
        msg.textContent = 'Select a Stratex user with a work email.';
        return;
      }
      if (!file || !file.name) {
        msg.className = 'v7-msg error';
        msg.textContent = 'Attach the contract PDF.';
        return;
      }
      state.selectedUser = user;
      var upload = new FormData();
      upload.append('contract', file);
      msg.className = 'v7-msg';
      msg.textContent = 'Reading contract fields…';
      form.querySelector('button[type="submit"]').disabled = true;
      try {
        state.draft = (await api('POST', '/api/stratex-contracts/admin/analyse', upload, true)).data;
        renderFieldReview(host);
      } catch (error) {
        msg.className = 'v7-msg error';
        msg.textContent = error.message;
        form.querySelector('button[type="submit"]').disabled = false;
      }
    };
  }

  function renderFieldReview(host) {
    var body = host.querySelector('.v7-modal-body');
    var fields = state.draft && state.draft.fields || [];
    var selected = state.selectedUser;
    body.innerHTML = '<div class="note"><b>Attached to ' + esc(name(selected)) + '</b>' + esc(selected.email) + '</div>' +
      '<form id="v7ContractReview"><div class="v7-detected-fields">' + fields.map(function (field) {
        var value = field.key === 'employee_name' ? name(selected) : field.key === 'employee_email' ? selected.email : field.value || '';
        return '<div class="v7-detected-field"><label for="v7Field_' + esc(field.key) + '">' + esc(field.label || field.key) + (field.required ? ' *' : '') + '</label><input class="input" id="v7Field_' + esc(field.key) + '" name="' + esc(field.key) + '" value="' + esc(value) + '"' + (field.required ? ' required' : '') + '></div>';
      }).join('') + '</div><div class="v7-field-grid"><label class="field"><span>Link expires after</span><select class="select" name="expiresDays"><option value="7">7 days</option><option value="14">14 days</option><option value="21" selected>21 days</option><option value="30">30 days</option><option value="60">60 days</option></select></label><label class="field"><span>Delivery</span><select class="select" name="delivery"><option value="copy" selected>Generate link for me to copy</option><option value="email">Generate and email signer</option></select></label></div><div class="v7-msg" id="v7GenerateMsg"></div><div class="v7-inline-actions"><button class="btn" type="submit">Generate secure signing link</button><button class="btn secondary" type="button" data-start-over>Start over</button></div></form>';

    body.querySelector('[data-start-over]').onclick = function () { chooseUser(selected.email); };
    body.querySelector('#v7ContractReview').onsubmit = async function (event) {
      event.preventDefault();
      var form = event.currentTarget;
      var data = new FormData(form);
      var fieldValues = {};
      fields.forEach(function (field) { fieldValues[field.key] = data.get(field.key) || ''; });
      fieldValues.employee_name = name(selected);
      fieldValues.employee_email = selected.email;
      var msg = body.querySelector('#v7GenerateMsg');
      var submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      msg.className = 'v7-msg';
      msg.textContent = 'Generating secure signing link…';
      try {
        var response = await api('POST', '/api/stratex-contracts/admin/' + encodeURIComponent(state.draft.id) + '/generate', {
          recipientName:name(selected),
          recipientEmail:selected.email,
          fieldValues:fieldValues,
          expiresDays:Number(data.get('expiresDays') || 21),
          sendEmail:data.get('delivery') === 'email'
        });
        state.generatedUrl = response.data && response.data.url || '';
        renderGenerated(host, response.data || {});
        await loadContracts();
      } catch (error) {
        msg.className = 'v7-msg error';
        msg.textContent = error.message;
        submit.disabled = false;
      }
    };
  }

  function renderGenerated(host, data) {
    var body = host.querySelector('.v7-modal-body');
    body.innerHTML = '<div class="note"><b>Contract link ready</b>The contract is attached to ' + esc(name(state.selectedUser)) + ' in the Admin Centre. For security, the raw signing token is shown now and is not stored in readable form.</div>' +
      '<label class="field"><span>Secure signing link</span><input class="input" id="v7GeneratedUrl" readonly value="' + esc(state.generatedUrl) + '"></label>' +
      '<div class="detail-grid n2" style="margin-top:18px"><div><small>Reference</small><b>' + esc(data.contractReference || '—') + '</b></div><div><small>Expires</small><b>' + esc(date(data.expiresAt, true)) + '</b></div></div>' +
      '<div class="v7-msg" id="v7CopyMsg"></div><div class="v7-inline-actions"><button class="btn" type="button" data-copy-link>Copy signing link</button><button class="btn secondary" type="button" data-another>Generate another contract</button><button class="btn secondary" type="button" data-done>Done</button></div>';

    body.querySelector('[data-copy-link]').onclick = async function () {
      var msg = body.querySelector('#v7CopyMsg');
      try {
        await navigator.clipboard.writeText(state.generatedUrl);
        msg.className = 'v7-msg success';
        msg.textContent = 'Signing link copied.';
      } catch (_) {
        var input = body.querySelector('#v7GeneratedUrl');
        input.select();
        document.execCommand('copy');
        msg.className = 'v7-msg success';
        msg.textContent = 'Signing link copied.';
      }
    };
    body.querySelector('[data-another]').onclick = function () { chooseUser(state.selectedUser && state.selectedUser.email); };
    body.querySelector('[data-done]').onclick = closeModal;
  }

  async function loadContracts() {
    try {
      var result = await api('GET', '/api/stratex-contracts/admin');
      state.contracts = result.data || [];
      var list = document.getElementById('v7ContractList');
      if (list) {
        list.innerHTML = contractList();
        bindListActions(list);
      }
    } catch (error) {
      var mount = document.getElementById('v7ContractMount');
      if (mount && /permission|forbidden|403/i.test(error.message)) {
        mount.innerHTML = '';
      } else if (mount) {
        mount.innerHTML = '<div class="v7-empty">' + esc(error.message) + '</div>';
      }
    }
  }

  function bindListActions(root) {
    root.querySelectorAll('[data-new-for-email]').forEach(function (button) {
      button.onclick = function () { chooseUser(button.dataset.newForEmail || ''); };
    });
  }

  async function mount(users) {
    if (path() !== '/admin/admin-users') return;
    var mountPoint = document.getElementById('v7ContractMount');
    if (!mountPoint) return;

    try {
      if (Array.isArray(users) && users.length) {
        state.users = users;
      } else {
        var staff = await api('GET', '/api/stratex-admin-centre/v7/staff');
        state.users = staff.data || [];
      }
      var contracts = await api('GET', '/api/stratex-contracts/admin');
      state.contracts = contracts.data || [];
      mountPoint.innerHTML = panel();
      document.getElementById('v7GenerateContract').onclick = function () { chooseUser(''); };
      bindListActions(document.getElementById('v7ContractList'));
      state.mounted = true;
    } catch (error) {
      if (/permission|forbidden|403/i.test(error.message)) {
        mountPoint.innerHTML = '';
        return;
      }
      mountPoint.innerHTML = '<div class="v7-empty">' + esc(error.message) + '</div>';
    }
  }

  window.addEventListener('stratex:v7-users-ready', function (event) {
    mount(event.detail && event.detail.users || []);
  });

  var observer = new MutationObserver(function () {
    if (path() !== '/admin/admin-users') return;
    var point = document.getElementById('v7ContractMount');
    if (point && !point.querySelector('[data-v7-contract-panel]') && !state.mounted) mount([]);
  });
  observer.observe(document.documentElement, { childList:true, subtree:true });
  setTimeout(function () { if (path() === '/admin/admin-users') mount([]); }, 500);
}());
