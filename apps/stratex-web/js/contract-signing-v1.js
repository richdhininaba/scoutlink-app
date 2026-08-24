(function () {
  'use strict';

  var API = (function () {
    try { return localStorage.getItem('sl_api_url') || 'https://scoutlink-api.vercel.app'; }
    catch (_) { return 'https://scoutlink-api.vercel.app'; }
  }());
  var root = document.getElementById('contractApp');
  var token = contractToken();
  var state = { data: null, method: 'typed', drawing: false };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function contractToken() {
    var parts = location.pathname.split('/').filter(Boolean);
    var index = parts.indexOf('contracts');
    return index >= 0 && parts[index + 1] ? decodeURIComponent(parts[index + 1]) : '';
  }

  function nav() {
    return '<header class="nav" id="siteNav"><a class="wordmark" href="/"><strong>Stratex</strong> Analytics</a>' +
      '<nav class="navlinks"><a href="/scoutlink">ScoutLink</a><a href="/about">About</a><a href="/leadership">Leadership</a><a href="/trust">Trust</a><a href="/learning-centre">Learning</a><a href="/careers">Careers</a><a href="/contact">Contact</a></nav>' +
      '<div class="navright"><span class="tel">020 7164 0181</span><a class="signin" href="/admin/login">Sign in</a><button class="burger" id="menuButton" aria-label="Open menu"></button></div>' +
      '<nav class="mobile-menu"><a href="/scoutlink">ScoutLink</a><a href="/about">About</a><a href="/leadership">Leadership</a><a href="/trust">Trust</a><a href="/learning-centre">Learning</a><a href="/careers">Careers</a><a href="/contact">Contact</a><a href="/admin/login">Sign in</a></nav></header>';
  }

  function footer() {
    return '<footer class="footer"><div class="wrap footrow"><div class="footcopy"><a class="wordmark" href="/"><strong>Stratex</strong> Analytics</a><p>Data, technology and responsible football visibility for overlooked grassroots talent.</p></div><div class="footlinks"><a href="/privacy-policy">Privacy</a><a href="/terms">Terms</a><a href="/trust">Trust</a><a href="/accessibility">Accessibility</a><a href="/contact">Contact</a></div></div></footer>';
  }

  function shell(content) {
    root.innerHTML = '<div class="site">' + nav() + '<main class="main">' + content + '</main>' + footer() + '</div>';
    var menu = document.getElementById('menuButton');
    if (menu) menu.onclick = function () { document.getElementById('siteNav').classList.toggle('menu-open'); };
  }

  function previewHtml(data) {
    var sections = (data.sections || []).slice(0, 5);
    var body = sections.map(function (section, index) {
      var heading = (section.number ? section.number + '. ' : '') + section.heading;
      var paragraphs = String(section.body || '').split(/\n+/).filter(Boolean).slice(0, index === 0 ? 4 : 3);
      return '<h4>' + esc(heading) + '</h4>' + paragraphs.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
    }).join('');
    return '<span class="doc-label">Stratex Analytics Limited</span><h2>' + esc(data.title || 'Contract of Employment') + '</h2>' + body + '<div class="fade"></div>';
  }

  function reviewPage(data) {
    shell('<div class="wrap"><div class="contract-top"><div><span class="eyebrow">Secure agreement</span><h1 class="title">Review and sign your agreement.</h1><p class="sub">Open or download the exact contract, confirm you intend to be bound by it, then sign by typing your name or drawing a signature.</p></div><span class="secure-pill">✓ Recipient verified · ' + esc(data.recipientEmail) + '</span></div>' +
      '<div class="contract-grid"><section class="document-card"><div class="doc-toolbar"><div class="doc-name"><span class="pdf-icon">PDF</span><div><b>' + esc(data.title || 'Contract of Employment') + '.pdf</b><small>Version ' + esc(data.version) + ' · Contract ' + esc(data.contractReference) + '</small></div></div><div class="doc-actions"><button class="soft-btn ghost small" id="openFull">Open full contract</button><a class="soft-btn ghost small" href="' + API + '/api/stratex-contracts/public/' + encodeURIComponent(token) + '/pdf" target="_blank" rel="noopener">Download PDF</a></div></div><article class="paper">' + previewHtml(data) + '</article></section>' +
      '<aside class="sign-card"><div class="verified"><i>✓</i><div><b>Signing as ' + esc(data.recipientName) + '</b><small>Verified from the secure recipient link</small></div></div><h2>Sign the agreement</h2><p class="desc">Your signature and acceptance are recorded against this exact contract version.</p>' +
      '<label class="accept"><input type="checkbox" id="acceptBox"><span><b>' + esc(data.acceptanceText) + '</b><small>This wording is stored with the signing record.</small></span></label>' +
      '<div class="sig-method" id="sigMethod"><div class="seg"><button class="on" type="button" data-tab="typed">Type signature</button><button type="button" data-tab="drawn">Draw signature</button></div><label class="sig-label" for="signatureName">Full legal name</label><input class="sig-input" id="signatureName" value="' + esc(data.recipientName) + '" autocomplete="name"><canvas class="sig-canvas" id="signatureCanvas" width="520" height="150"></canvas></div>' +
      '<div class="audit"><span class="audit-title">Signing record</span><div class="audit-row"><span>Contract</span><b>' + esc(data.contractReference) + ' · v' + esc(data.version) + '</b></div><div class="audit-row"><span>Document fingerprint</span><b>SHA-256 · ' + esc(String(data.fingerprint || '').slice(0, 12).toUpperCase()) + '…</b></div><div class="audit-row"><span>Recorded</span><b>Server timestamp on submit</b></div></div>' +
      '<div class="state-message error" id="signError" hidden></div><button class="soft-btn primary" id="signButton">Sign & accept agreement →</button></aside></div></div>');
    bindReview(data);
  }

  function fullContractModal(data) {
    var sections = (data.sections || []).map(function (section) {
      return '<section class="contract-full-section"><h3>' + esc((section.number ? section.number + '. ' : '') + section.heading) + '</h3><p>' + esc(section.body) + '</p></section>';
    }).join('');
    var host = document.createElement('div');
    host.className = 'contract-modal';
    host.id = 'contractModal';
    host.innerHTML = '<div class="contract-modal-card" role="dialog" aria-modal="true"><div class="contract-modal-head"><div><span class="eyebrow">' + esc(data.contractReference) + '</span><h2>' + esc(data.title) + '</h2></div><button class="contract-modal-close" type="button" aria-label="Close">×</button></div>' + sections + '</div>';
    document.body.appendChild(host);
    host.querySelector('.contract-modal-close').onclick = function () { host.remove(); };
    host.onclick = function (event) { if (event.target === host) host.remove(); };
  }

  function bindCanvas() {
    var canvas = document.getElementById('signatureCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#0C201A'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    function pos(e) { var r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) * canvas.width / r.width, (e.clientY - r.top) * canvas.height / r.height]; }
    canvas.onpointerdown = function (e) { state.drawing = true; var p = pos(e); ctx.beginPath(); ctx.moveTo(p[0], p[1]); canvas.setPointerCapture(e.pointerId); };
    canvas.onpointermove = function (e) { if (!state.drawing) return; var p = pos(e); ctx.lineTo(p[0], p[1]); ctx.stroke(); };
    canvas.onpointerup = canvas.onpointercancel = function () { state.drawing = false; };
  }

  function bindReview(data) {
    document.getElementById('openFull').onclick = function () { fullContractModal(data); };
    document.querySelectorAll('[data-tab]').forEach(function (button) {
      button.onclick = function () {
        state.method = button.getAttribute('data-tab');
        document.querySelectorAll('[data-tab]').forEach(function (other) { other.classList.toggle('on', other === button); });
        document.getElementById('sigMethod').classList.toggle('draw-mode', state.method === 'drawn');
      };
    });
    bindCanvas();
    document.getElementById('signButton').onclick = signContract;
  }

  function canvasIsBlank(canvas) {
    var blank = document.createElement('canvas'); blank.width = canvas.width; blank.height = canvas.height;
    return canvas.toDataURL() === blank.toDataURL();
  }

  async function signContract() {
    var error = document.getElementById('signError');
    error.hidden = true;
    var accepted = document.getElementById('acceptBox').checked;
    var signatureName = document.getElementById('signatureName').value.trim();
    var canvas = document.getElementById('signatureCanvas');
    if (!accepted) { error.textContent = 'Confirm that you have read and accept the agreement.'; error.hidden = false; return; }
    if (!signatureName) { error.textContent = 'Enter your full legal name.'; error.hidden = false; return; }
    if (state.method === 'drawn' && canvasIsBlank(canvas)) { error.textContent = 'Draw your signature before submitting.'; error.hidden = false; return; }

    var button = document.getElementById('signButton'); button.disabled = true; button.textContent = 'Signing agreement…';
    try {
      var response = await fetch(API + '/api/stratex-contracts/public/' + encodeURIComponent(token) + '/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accepted: true,
          signatureMethod: state.method,
          signatureName: signatureName,
          signatureData: state.method === 'drawn' ? canvas.toDataURL('image/png') : null
        })
      });
      var json = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(json.error || 'Could not sign the agreement.');
      history.replaceState({}, '', '/contracts/' + encodeURIComponent(token) + '/complete');
      await load();
    } catch (e) {
      error.textContent = e.message; error.hidden = false; button.disabled = false; button.textContent = 'Sign & accept agreement →';
    }
  }

  function completePage(data) {
    shell('<div class="wrap"><div class="receipt-layout"><section class="receipt-hero"><span class="receipt-icon">✓</span><span class="eyebrow" style="display:block;margin-top:22px">Agreement complete</span><h1>Your agreement is signed.</h1><p>The contract has been accepted and the signing evidence has been stored against the exact document version. Keep the signed copy and receipt for your records.</p><div class="download-row"><a class="download-card" href="' + API + '/api/stratex-contracts/public/' + encodeURIComponent(token) + '/pdf" target="_blank" rel="noopener"><div><b>Signed agreement</b><span>PDF · includes signature page</span></div><span class="dl">↓</span></a><a class="download-card" href="' + API + '/api/stratex-contracts/public/' + encodeURIComponent(token) + '/receipt" target="_blank" rel="noopener"><div><b>Electronic signature receipt</b><span>PDF · audit evidence summary</span></div><span class="dl">↓</span></a></div></section>' +
      '<aside class="receipt-side"><span class="eyebrow">Signature receipt</span><h3>' + esc(data.contractReference) + '</h3><div class="rmeta"><span>Signed by</span><b>' + esc(data.recipientName) + '</b></div><div class="rmeta"><span>Contract version</span><b>' + esc(data.version) + '</b></div><div class="rmeta"><span>Signed at</span><b>' + esc(formatDate(data.signedAt)) + '</b></div><div class="rmeta"><span>Document fingerprint</span><b>' + esc(String(data.fingerprint || '').slice(0, 18).toUpperCase()) + '…</b></div><div class="rmeta"><span>Receipt reference</span><b>' + esc(data.receiptReference) + '</b></div><a class="soft-btn volt" href="/">Done</a></aside></div></div>');
  }

  function formatDate(value) {
    try { return new Date(value).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' }); }
    catch (_) { return value || 'Recorded'; }
  }

  async function load() {
    if (!token) { shell('<div class="wrap"><div class="loading-card">This contract link is invalid.</div></div>'); return; }
    shell('<div class="wrap"><div class="loading-card">Loading secure agreement…</div></div>');
    try {
      var response = await fetch(API + '/api/stratex-contracts/public/' + encodeURIComponent(token), { cache: 'no-store' });
      var json = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(json.error || 'Could not open this contract.');
      state.data = json.data;
      if (state.data.signed || location.pathname.indexOf('/complete') >= 0) completePage(state.data);
      else reviewPage(state.data);
    } catch (e) {
      shell('<div class="wrap"><div class="loading-card"><span class="eyebrow">Secure agreement</span><h1 class="title" style="font-size:28px">This agreement cannot be opened.</h1><p class="sub">' + esc(e.message) + '</p><div class="actions"><a class="soft-btn ghost" href="/contact">Contact Stratex</a></div></div></div>');
    }
  }

  load();
}());
