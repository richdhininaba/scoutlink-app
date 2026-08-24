(function () {
  'use strict';

  if (window.__stratexContractWorkflowV1) return;
  window.__stratexContractWorkflowV1 = true;

  var API = (function () {
    try { return localStorage.getItem('sl_api_url') || 'https://scoutlink-api.vercel.app'; }
    catch (_) { return 'https://scoutlink-api.vercel.app'; }
  }());
  var activeDraft = null;
  var observer = null;

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function token() {
    try { return localStorage.getItem('sl_token') || ''; }
    catch (_) { return ''; }
  }
  function isContractsRoute() {
    return (location.pathname || '').replace(/\/+$/, '') === '/admin/contracts-pay';
  }
  async function jsonFetch(path, options) {
    var opts = options || {};
    opts.headers = Object.assign({}, opts.headers || {}, { Authorization: 'Bearer ' + token() });
    var response = await fetch(API + path, opts);
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(data.error || data.message || 'Request failed.');
    return data;
  }

  function addStyles() {
    if (document.getElementById('stxContractWorkflowStyles')) return;
    var style = document.createElement('style');
    style.id = 'stxContractWorkflowStyles';
    style.textContent = '' +
      '.stx-contract-tools{margin:20px 0 0;background:#fff;border:1px solid rgba(12,32,26,.10);border-radius:24px;overflow:hidden}' +
      '.stx-contract-tools-head{display:flex;justify-content:space-between;gap:18px;align-items:center;padding:20px 22px;border-bottom:1px solid rgba(12,32,26,.08)}' +
      '.stx-contract-tools-head h3{margin:0;font-size:18px}.stx-contract-tools-head p{margin:5px 0 0;color:#71847A;font-size:11px}' +
      '.stx-contract-list{display:grid}.stx-contract-row{display:grid;grid-template-columns:1.1fr 1fr .7fr .7fr auto;gap:14px;align-items:center;padding:15px 22px;border-bottom:1px solid rgba(12,32,26,.08)}' +
      '.stx-contract-row:last-child{border-bottom:0}.stx-contract-row b{display:block;font-size:12px}.stx-contract-row small{display:block;color:#71847A;font-size:9px;margin-top:4px}.stx-contract-pill{display:inline-flex;padding:6px 9px;border-radius:999px;background:#EAF1EB;color:#075F48;font:700 8px "IBM Plex Mono",monospace;text-transform:uppercase}' +
      '.stx-contract-empty{padding:22px;color:#71847A;font-size:11px}' +
      '.stx-cw-overlay{position:fixed;inset:0;z-index:9999;background:rgba(4,53,42,.72);display:grid;place-items:center;padding:24px}' +
      '.stx-cw-modal{width:min(980px,100%);max-height:90vh;overflow:auto;background:#F4F7F3;border-radius:28px;box-shadow:0 30px 90px rgba(0,0,0,.24)}' +
      '.stx-cw-head{position:sticky;top:0;z-index:3;background:#fff;display:flex;justify-content:space-between;gap:18px;align-items:center;padding:20px 24px;border-bottom:1px solid rgba(12,32,26,.09)}' +
      '.stx-cw-head h2{margin:0;font-size:22px}.stx-cw-head p{margin:4px 0 0;color:#71847A;font-size:10px}.stx-cw-close{width:42px;height:42px;border-radius:13px;border:1px solid rgba(12,32,26,.15);background:#fff;font-size:22px}' +
      '.stx-cw-body{padding:24px}.stx-cw-card{background:#fff;border-radius:22px;padding:20px;border:1px solid rgba(12,32,26,.08);margin-bottom:16px}.stx-cw-card h3{margin:0 0 12px;font-size:15px}' +
      '.stx-cw-upload{border:1px dashed rgba(7,95,72,.28);background:#F8FAF7;border-radius:20px;padding:24px;text-align:center}.stx-cw-upload input{display:block;margin:12px auto 0;max-width:100%}' +
      '.stx-cw-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}.stx-cw-field{display:grid;gap:6px}.stx-cw-field.full{grid-column:1/-1}.stx-cw-field span{font:700 8px "IBM Plex Mono",monospace;text-transform:uppercase;letter-spacing:.05em;color:#71847A}.stx-cw-field input,.stx-cw-field textarea{width:100%;border:1px solid rgba(12,32,26,.12);border-radius:14px;background:#F8FAF7;padding:12px 13px;font:500 11px Archivo,sans-serif;color:#0C201A;outline:none}.stx-cw-field textarea{min-height:74px;resize:vertical}' +
      '.stx-cw-locked{padding:11px 12px;border-radius:13px;background:#EAF1EB;font-size:10px}.stx-cw-groups{display:grid;gap:16px}.stx-cw-headings{display:flex;flex-wrap:wrap;gap:7px}.stx-cw-heading{padding:7px 9px;border-radius:999px;background:#EAF1EB;font:600 8px "IBM Plex Mono",monospace;color:#40534A}' +
      '.stx-cw-actions{display:flex;justify-content:flex-end;gap:10px;align-items:center;margin-top:16px}.stx-cw-btn{min-height:42px;border:0;border-radius:13px;padding:0 16px;background:#04352A;color:#fff;font-weight:800;font-size:10px}.stx-cw-btn.alt{background:#fff;color:#0C201A;border:1px solid rgba(12,32,26,.15)}.stx-cw-btn.volt{background:#D8F547;color:#0C201A}.stx-cw-btn:disabled{opacity:.45}' +
      '.stx-cw-message{padding:12px 14px;border-radius:14px;margin-top:12px;font-size:10px}.stx-cw-message.err{background:#FDECEC;color:#8D2F2F}.stx-cw-message.ok{background:#EAF4EF;color:#075F48}' +
      '.stx-cw-link{display:grid;grid-template-columns:1fr auto;gap:10px;margin-top:12px}.stx-cw-link input{min-width:0;border:1px solid rgba(12,32,26,.12);border-radius:14px;padding:12px;background:#F8FAF7;font-size:10px}' +
      '@media(max-width:780px){.stx-contract-tools-head{display:grid}.stx-contract-row{grid-template-columns:1fr;gap:7px}.stx-cw-overlay{padding:10px}.stx-cw-modal{border-radius:22px;max-height:94vh}.stx-cw-body{padding:16px}.stx-cw-grid{grid-template-columns:1fr}.stx-cw-field.full{grid-column:auto}.stx-cw-actions{display:grid}.stx-cw-btn{width:100%}.stx-cw-link{grid-template-columns:1fr}}';
    document.head.appendChild(style);
  }

  function modal(title, copy, body) {
    closeModal();
    var host = document.createElement('div');
    host.className = 'stx-cw-overlay';
    host.id = 'stxContractWorkflowModal';
    host.innerHTML = '<section class="stx-cw-modal" role="dialog" aria-modal="true"><header class="stx-cw-head"><div><h2>' + esc(title) + '</h2><p>' + esc(copy || '') + '</p></div><button class="stx-cw-close" type="button" aria-label="Close">×</button></header><div class="stx-cw-body">' + body + '</div></section>';
    document.body.appendChild(host);
    host.querySelector('.stx-cw-close').onclick = closeModal;
    host.onclick = function (event) { if (event.target === host) closeModal(); };
    return host;
  }
  function closeModal() {
    var old = document.getElementById('stxContractWorkflowModal');
    if (old) old.remove();
  }
  function message(host, text, ok) {
    var box = host.querySelector('[data-cw-message]');
    if (!box) return;
    box.className = 'stx-cw-message ' + (ok ? 'ok' : 'err');
    box.textContent = text;
    box.hidden = false;
  }

  function openUpload() {
    activeDraft = null;
    var host = modal('Generate employee contract link', 'Attach the contract first. Stratex will read the PDF, extract its section headings and detect the employee-specific values that need confirming.',
      '<div class="stx-cw-card"><h3>1. Attach contract PDF</h3><div class="stx-cw-upload"><b>Choose the employment contract template</b><p style="font-size:10px;color:#71847A">PDF only · up to 10 MB. The original upload remains private.</p><input id="cwContractFile" type="file" accept="application/pdf,.pdf"></div><div data-cw-message hidden></div><div class="stx-cw-actions"><button class="stx-cw-btn" id="cwAnalyse" type="button">Analyse contract →</button></div></div>');
    host.querySelector('#cwAnalyse').onclick = async function () {
      var file = host.querySelector('#cwContractFile').files[0];
      if (!file) return message(host, 'Attach the PDF before continuing.', false);
      var button = host.querySelector('#cwAnalyse'); button.disabled = true; button.textContent = 'Reading contract…';
      try {
        var form = new FormData(); form.append('contract', file);
        var response = await fetch(API + '/api/stratex-contracts/admin/analyse', { method: 'POST', headers: { Authorization: 'Bearer ' + token() }, body: form });
        var json = await response.json().catch(function () { return {}; });
        if (!response.ok) throw new Error(json.error || 'Could not analyse the contract.');
        activeDraft = json.data;
        renderDetected();
      } catch (e) {
        message(host, e.message, false); button.disabled = false; button.textContent = 'Analyse contract →';
      }
    };
  }

  function groupFields(fields) {
    var groups = {};
    (fields || []).forEach(function (item) {
      var group = item.group || 'Contract details';
      if (!groups[group]) groups[group] = [];
      groups[group].push(item);
    });
    return groups;
  }

  function renderDetected() {
    var draft = activeDraft;
    var groups = groupFields(draft.fields || []);
    var groupHtml = Object.keys(groups).map(function (group) {
      return '<section class="stx-cw-card"><h3>' + esc(group) + '</h3><div class="stx-cw-grid">' + groups[group].map(function (item) {
        if (item.editable === false) return '<div class="stx-cw-field"><span>' + esc(item.label) + '</span><div class="stx-cw-locked">' + esc(item.value || 'Not detected') + '</div></div>';
        var input = item.multiline
          ? '<textarea name="' + esc(item.key) + '" ' + (item.required ? 'required' : '') + '>' + esc(item.value || '') + '</textarea>'
          : '<input name="' + esc(item.key) + '" value="' + esc(item.value || '') + '" ' + (item.required ? 'required' : '') + '>';
        return '<label class="stx-cw-field ' + (item.multiline ? 'full' : '') + '"><span>' + esc(item.label) + (item.required ? ' · Required' : '') + '</span>' + input + '</label>';
      }).join('') + '</div></section>';
    }).join('');
    var headingHtml = (draft.headings || []).map(function (h) { return '<span class="stx-cw-heading">' + esc((h.number ? h.number + '. ' : '') + h.heading) + '</span>'; }).join('');

    var host = modal('Confirm contract details', 'The fields below were detected from the attached PDF. Change the employee-specific values before generating the secure signing link.',
      '<form id="cwGenerateForm"><section class="stx-cw-card"><h3>Detected contract</h3><div class="stx-cw-grid"><div class="stx-cw-field"><span>Reference</span><div class="stx-cw-locked">' + esc(draft.contractReference) + '</div></div><div class="stx-cw-field"><span>Source file</span><div class="stx-cw-locked">' + esc(draft.sourceFileName) + '</div></div></div><div class="stx-cw-headings" style="margin-top:14px">' + headingHtml + '</div></section>' +
      groupHtml +
      '<section class="stx-cw-card"><h3>Secure link</h3><div class="stx-cw-grid"><label class="stx-cw-field"><span>Recipient full name · Required</span><input name="recipientName" value="' + esc(draft.recipientName || '') + '" required></label><label class="stx-cw-field"><span>Recipient email · Required</span><input name="recipientEmail" type="email" value="' + esc(draft.recipientEmail || '') + '" required></label><label class="stx-cw-field"><span>Link expiry</span><input name="expiresDays" type="number" min="1" max="90" value="21"></label><label class="stx-cw-field"><span>Email link now</span><div class="stx-cw-locked"><label style="display:flex;gap:8px;align-items:center"><input name="sendEmail" type="checkbox"> Send the secure link to the employee after generation</label></div></label></div></section><div data-cw-message hidden></div><div class="stx-cw-actions"><button class="stx-cw-btn alt" type="button" id="cwBack">Attach a different PDF</button><button class="stx-cw-btn" type="submit">Generate secure link →</button></div></form>');
    host.querySelector('#cwBack').onclick = openUpload;
    host.querySelector('#cwGenerateForm').onsubmit = generateLink;
  }

  async function generateLink(event) {
    event.preventDefault();
    var form = event.currentTarget;
    var host = document.getElementById('stxContractWorkflowModal');
    var button = form.querySelector('button[type="submit"]');
    button.disabled = true; button.textContent = 'Generating secure contract…';
    var values = {};
    (activeDraft.fields || []).forEach(function (item) {
      var control = form.elements[item.key];
      values[item.key] = control ? control.value : item.value;
    });
    try {
      var json = await jsonFetch('/api/stratex-contracts/admin/' + encodeURIComponent(activeDraft.id) + '/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientName: form.elements.recipientName.value,
          recipientEmail: form.elements.recipientEmail.value,
          expiresDays: Number(form.elements.expiresDays.value || 21),
          sendEmail: form.elements.sendEmail.checked,
          fieldValues: values
        })
      });
      renderGenerated(json.data);
      loadGeneratedList();
    } catch (e) {
      message(host, e.message, false); button.disabled = false; button.textContent = 'Generate secure link →';
    }
  }

  function renderGenerated(data) {
    var host = modal('Contract link ready', 'This URL opens the V8 contract review and signature page. The raw token is shown only as part of this generated URL.',
      '<section class="stx-cw-card"><h3>' + esc(data.contractReference) + '</h3><p style="font-size:10px;color:#71847A">Expires ' + esc(new Date(data.expiresAt).toLocaleString('en-GB')) + '</p><div class="stx-cw-link"><input id="cwLink" readonly value="' + esc(data.url) + '"><button class="stx-cw-btn volt" id="cwCopy" type="button">Copy link</button></div><div style="margin-top:12px;font:600 8px IBM Plex Mono,monospace;color:#71847A">SHA-256 · ' + esc(String(data.fingerprint || '').toUpperCase()) + '</div><div data-cw-message hidden></div></section><div class="stx-cw-actions"><button class="stx-cw-btn alt" id="cwDone" type="button">Done</button><a class="stx-cw-btn" style="display:inline-flex;align-items:center;text-decoration:none" href="' + esc(data.url) + '" target="_blank" rel="noopener">Open recipient page</a></div>');
    host.querySelector('#cwCopy').onclick = async function () {
      var input = host.querySelector('#cwLink');
      try { await navigator.clipboard.writeText(input.value); message(host, 'Secure link copied.', true); }
      catch (_) { input.select(); document.execCommand('copy'); message(host, 'Secure link copied.', true); }
    };
    host.querySelector('#cwDone').onclick = closeModal;
  }

  async function loadGeneratedList() {
    var mount = document.getElementById('stxGeneratedContractList');
    if (!mount) return;
    mount.innerHTML = '<div class="stx-contract-empty">Loading generated signing links…</div>';
    try {
      var json = await jsonFetch('/api/stratex-contracts/admin');
      var rows = json.data || [];
      if (!rows.length) { mount.innerHTML = '<div class="stx-contract-empty">No secure employee signing links have been generated yet.</div>'; return; }
      mount.innerHTML = rows.map(function (row) {
        var action = row.status !== 'signed' && row.status !== 'revoked' && row.status !== 'expired'
          ? '<button class="stx-cw-btn alt" style="min-height:34px" data-revoke="' + esc(row.id) + '" type="button">Revoke</button>' : '';
        return '<div class="stx-contract-row"><div><b>' + esc(row.recipient_name || 'Unassigned recipient') + '</b><small>' + esc(row.recipient_email || '') + '</small></div><div><b>' + esc(row.contract_reference) + '</b><small>' + esc(row.source_file_name || '') + '</small></div><div><span class="stx-contract-pill">' + esc(row.status || 'draft') + '</span></div><div><b>' + esc(row.signed_at ? new Date(row.signed_at).toLocaleDateString('en-GB') : '—') + '</b><small>Signed</small></div><div>' + action + '</div></div>';
      }).join('');
      mount.querySelectorAll('[data-revoke]').forEach(function (button) {
        button.onclick = async function () {
          if (!confirm('Revoke this signing link? The employee will no longer be able to open or sign it.')) return;
          button.disabled = true;
          try { await jsonFetch('/api/stratex-contracts/admin/' + encodeURIComponent(button.getAttribute('data-revoke')) + '/revoke', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); await loadGeneratedList(); }
          catch (e) { alert(e.message); button.disabled = false; }
        };
      });
    } catch (e) {
      mount.innerHTML = '<div class="stx-contract-empty" style="color:#8D2F2F">' + esc(e.message) + '</div>';
    }
  }

  function enhance() {
    if (!isContractsRoute()) return;
    addStyles();
    var contractRows = document.getElementById('contractRows');
    if (!contractRows) return;
    var hero = document.querySelector('section.hero');
    if (hero && !document.getElementById('stxGenerateContractLink')) {
      var actions = hero.querySelector('.hero-actions');
      if (!actions) { actions = document.createElement('div'); actions.className = 'hero-actions'; hero.appendChild(actions); }
      var button = document.createElement('button');
      button.className = 'btn volt'; button.type = 'button'; button.id = 'stxGenerateContractLink'; button.textContent = 'Generate contract link'; button.onclick = openUpload;
      actions.appendChild(button);
    }
    if (!document.getElementById('stxContractTools')) {
      var section = document.createElement('section');
      section.className = 'stx-contract-tools'; section.id = 'stxContractTools';
      section.innerHTML = '<div class="stx-contract-tools-head"><div><h3>Employee signing links</h3><p>Uploaded contracts, secure recipient links and signature status.</p></div><button class="btn small" type="button" id="stxGenerateContractLinkSecondary">Generate link</button></div><div class="stx-contract-list" id="stxGeneratedContractList"></div>';
      contractRows.parentNode.insertBefore(section, contractRows);
      section.querySelector('#stxGenerateContractLinkSecondary').onclick = openUpload;
      loadGeneratedList();
    }
  }

  function scheduleEnhance() { setTimeout(enhance, 40); setTimeout(enhance, 300); }
  var originalPush = history.pushState;
  var originalReplace = history.replaceState;
  history.pushState = function () { originalPush.apply(history, arguments); scheduleEnhance(); };
  history.replaceState = function () { originalReplace.apply(history, arguments); scheduleEnhance(); };
  window.addEventListener('popstate', scheduleEnhance);
  observer = new MutationObserver(scheduleEnhance);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  scheduleEnhance();
}());
