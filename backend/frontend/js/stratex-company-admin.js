(function () {
  'use strict';

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function rowTable(headers, rows) {
    if (!rows.length) return '<div style="padding:28px;color:#8b949e;text-align:center">No records yet.</div>';
    return '<div style="overflow:auto"><table class="sl-table"><thead><tr>' + headers.map(h => '<th>' + escapeHtml(h[0]) + '</th>').join('') + '</tr></thead><tbody>' +
      rows.map(row => '<tr>' + headers.map(h => '<td>' + escapeHtml(row[h[1]] || '') + '</td>').join('') + '</tr>').join('') +
      '</tbody></table></div>';
  }

  function showMessage(id, text, ok) {
    var el = document.getElementById(id);
    if (!el) return;
    el.style.display = 'block';
    el.style.padding = '10px 12px';
    el.style.borderRadius = '10px';
    el.style.margin = '8px 0';
    el.style.background = ok ? 'rgba(29,158,117,.12)' : 'rgba(244,67,54,.12)';
    el.style.color = ok ? '#1d9e75' : '#f44336';
    el.textContent = text;
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
    } catch (err) {
      root.innerHTML = '<div style="padding:18px;color:#f44336">Could not load CRM.</div>';
    }
  }

  async function loadLeads() {
    var root = document.getElementById('leadRows');
    if (!root) return;
    root.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    try {
      var data = await api('GET', '/api/stratex-website/leads');
      root.innerHTML = rowTable([
        ['Type', 'lead_type'], ['Name', 'full_name'], ['Email', 'email'], ['Phone', 'phone'],
        ['Organisation', 'organisation'], ['Reason', 'reason'], ['Status', 'status'], ['Created', 'created_at']
      ], data.data || []);
    } catch (err) {
      root.innerHTML = '<div style="padding:18px;color:#f44336">Could not load website leads.</div>';
    }
  }

  async function loadBlog() {
    var root = document.getElementById('blogRows');
    if (!root) return;
    root.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    try {
      var data = await api('GET', '/api/stratex-website/blog');
      root.innerHTML = rowTable([
        ['Title', 'title'], ['Category', 'category'], ['Status', 'status'], ['Published', 'published_at'], ['Updated', 'updated_at']
      ], data.data || []);
    } catch (err) {
      root.innerHTML = '<div style="padding:18px;color:#f44336">Could not load posts.</div>';
    }
  }

  async function loadLeadership() {
    var root = document.getElementById('leadershipRows');
    if (!root) return;
    root.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    try {
      var data = await api('GET', '/api/stratex-website/leadership');
      root.innerHTML = rowTable([
        ['Name', 'full_name'], ['Job title', 'job_title'], ['Email', 'email'], ['Role', 'permission_role']
      ], data.data || []);
    } catch (err) {
      root.innerHTML = '<div style="padding:18px;color:#f44336">Could not load leadership profiles.</div>';
    }
  }

  function switchTab(tab) {
    document.querySelectorAll('.filter-chip[data-tab]').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
    document.querySelectorAll('.stx-admin-tab').forEach(el => el.style.display = el.id === 'tab-' + tab ? '' : 'none');
    if (tab === 'crm') loadCrm();
    if (tab === 'leads') loadLeads();
    if (tab === 'blog') loadBlog();
    if (tab === 'leadership') loadLeadership();
  }

  function formPayload(form) {
    var payload = {};
    new FormData(form).forEach((value, key) => payload[key] = value);
    return payload;
  }

  function applyEditorCommand(cmd) {
    var textarea = document.getElementById('blogBody');
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

  document.addEventListener('DOMContentLoaded', function () {
    if (!initStratexPage()) return;
    var logout = document.getElementById('logoutBtn');
    if (logout) logout.addEventListener('click', logoutToLogin);

    document.querySelectorAll('.filter-chip[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    var refresh = document.getElementById('refreshLeadsBtn');
    if (refresh) refresh.addEventListener('click', loadLeads);
    var exportBtn = document.getElementById('crmExportBtn');
    if (exportBtn) exportBtn.addEventListener('click', function (event) {
      event.preventDefault();
      var token = Auth.token || '';
      fetch(API + '/api/stratex-website/crm/export', { headers: { Authorization: 'Bearer ' + token } })
        .then(res => {
          if (!res.ok) throw new Error('Export failed');
          return res.blob();
        })
        .then(blob => {
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'stratex-crm-export.xlsx';
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        })
        .catch(() => alert('Could not export CRM right now.'));
    });

    var blogForm = document.getElementById('blogForm');
    document.querySelectorAll('[data-editor-cmd]').forEach(btn => {
      btn.addEventListener('click', () => applyEditorCommand(btn.getAttribute('data-editor-cmd')));
    });
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
        await api('POST', '/api/stratex-website/leadership', formPayload(leadershipForm));
        leadershipForm.reset();
        showMessage('leadershipMsg', 'Leadership member saved.', true);
        loadLeadership();
      } catch (err) {
        showMessage('leadershipMsg', err.message || 'Could not save leadership member.', false);
      }
    });

    switchTab('crm');
  });
})();
