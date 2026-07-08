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

  function renderAdminShell() {
    document.body.className = '';
    document.body.innerHTML =
      '<div class="dashboard">' +
        '<nav class="sidebar" id="sidebar">' +
          '<div class="sidebar-logo"><a href="../index.html" style="font-size:20px;font-weight:900;color:#fff;text-decoration:none">Scout<span style="color:var(--accent,#1d9e75)">Link</span></a></div>' +
          '<div class="sidebar-nav" id="sidebarNav"></div>' +
          '<div class="sidebar-user" id="sidebarUser"></div>' +
        '</nav>' +
        '<main class="dashboard-main">' +
          '<div class="topbar">' +
            '<span class="topbar-title" id="dashTitle">Company site</span>' +
            '<div class="topbar-right">' +
              '<a class="btn btn-sm btn-outline" href="/company" target="_blank" rel="noopener">Open Stratex site</a>' +
              '<button class="btn btn-sm btn-ghost" id="logoutBtn">Sign out</button>' +
            '</div>' +
          '</div>' +
          '<div class="page-content">' +
            '<div class="table-card" style="padding:18px;margin-bottom:18px">' +
              '<h2 style="margin:0 0 6px">Stratex Analytics website admin</h2>' +
              '<p style="margin:0;color:#8b949e">Manage company website leads, CRM, Learning Centre content and leadership profiles. ScoutLink player data is intentionally excluded from this CRM.</p>' +
            '</div>' +
            '<div class="filter-bar" role="tablist" aria-label="Company site admin sections" style="margin-bottom:18px">' +
              '<button class="filter-chip active" data-tab="crm" type="button">CRM</button>' +
              '<button class="filter-chip" data-tab="leads" type="button">Website leads</button>' +
              '<button class="filter-chip" data-tab="blog" type="button">Learning Centre</button>' +
              '<button class="filter-chip" data-tab="leadership" type="button">Leadership</button>' +
            '</div>' +
            '<section class="table-card stx-admin-tab" id="tab-crm">' +
              '<div class="table-header"><h3>CRM</h3><a class="btn btn-sm btn-primary" href="#" id="crmExportBtn">Export CSV</a></div>' +
              '<div id="crmRows" class="loading-state"><div class="spinner"></div></div>' +
            '</section>' +
            '<section class="table-card stx-admin-tab" id="tab-leads" style="display:none">' +
              '<div class="table-header"><h3>Website leads</h3><button class="btn btn-sm btn-outline" id="refreshLeadsBtn" type="button">Refresh</button></div>' +
              '<div id="leadRows" class="loading-state"><div class="spinner"></div></div>' +
            '</section>' +
            '<section class="stx-admin-tab" id="tab-blog" style="display:none">' +
              '<div style="display:grid;grid-template-columns:minmax(320px,.55fr) 1fr;gap:18px">' +
                '<form class="table-card" id="blogForm" style="padding:18px">' +
                  '<h3>Create Learning Centre post</h3>' +
                  '<label class="form-group"><span>Title</span><input class="form-control" name="title" required></label>' +
                  '<label class="form-group"><span>Category</span><input class="form-control" name="category" value="Football intelligence"></label>' +
                  '<label class="form-group"><span>Excerpt</span><textarea class="form-control" name="excerpt" rows="3"></textarea></label>' +
                  '<div class="stx-editor-toolbar" aria-label="Learning Centre editor toolbar">' +
                    '<button type="button" class="btn btn-sm btn-outline" data-editor-cmd="bold">Bold</button>' +
                    '<button type="button" class="btn btn-sm btn-outline" data-editor-cmd="italic">Italic</button>' +
                    '<button type="button" class="btn btn-sm btn-outline" data-editor-cmd="heading">Heading</button>' +
                    '<button type="button" class="btn btn-sm btn-outline" data-editor-cmd="bullet">Bullet list</button>' +
                    '<button type="button" class="btn btn-sm btn-outline" data-editor-cmd="number">Numbered list</button>' +
                    '<button type="button" class="btn btn-sm btn-outline" data-editor-cmd="link">Link</button>' +
                  '</div>' +
                  '<label class="form-group"><span>Body</span><textarea class="form-control" id="blogBody" name="body" rows="8" required></textarea></label>' +
                  '<label class="form-group"><span>Status</span><select class="form-control" name="status"><option value="draft">Draft</option><option value="published">Published</option></select></label>' +
                  '<div class="form-message" id="blogMsg" style="display:none"></div>' +
                  '<button class="btn btn-primary" type="submit">Save post</button>' +
                '</form>' +
                '<div class="table-card"><div class="table-header"><h3>Posts</h3></div><div id="blogRows" class="loading-state"><div class="spinner"></div></div></div>' +
              '</div>' +
            '</section>' +
            '<section class="stx-admin-tab" id="tab-leadership" style="display:none">' +
              '<div style="display:grid;grid-template-columns:minmax(320px,.45fr) 1fr;gap:18px">' +
                '<form class="table-card" id="leadershipForm" style="padding:18px">' +
                  '<h3>Add leadership member</h3>' +
                  '<label class="form-group"><span>Full name</span><input class="form-control" name="fullName" required></label>' +
                  '<label class="form-group"><span>Email</span><input class="form-control" name="email" type="email"></label>' +
                  '<label class="form-group"><span>Job title</span><input class="form-control" name="jobTitle" required></label>' +
                  '<label class="form-group"><span>Permission role</span><select class="form-control" name="permissionRole"><option>Management</option><option>Operations</option><option>Acquisition</option><option>Safeguarding Reviewer</option><option>Product Demo</option><option>Read Only</option></select></label>' +
                  '<label class="form-group"><span>Bio</span><textarea class="form-control" name="bio" rows="4"></textarea></label>' +
                  '<label class="form-group"><span>Display order</span><input class="form-control" name="displayOrder" type="number" value="100"></label>' +
                  '<div class="form-message" id="leadershipMsg" style="display:none"></div>' +
                  '<button class="btn btn-primary" type="submit">Save leadership member</button>' +
                '</form>' +
                '<div class="table-card"><div class="table-header"><h3>Leadership profiles</h3></div><div id="leadershipRows" class="loading-state"><div class="spinner"></div></div></div>' +
              '</div>' +
            '</section>' +
          '</div>' +
        '</main>' +
      '</div>';
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
    if (typeof Auth === 'undefined' || !Auth.isLoggedIn() || Auth.type !== 'Stratex') {
      if (typeof renderRestrictedStratexAdmin === 'function') renderRestrictedStratexAdmin();
      return;
    }
    renderAdminShell();
    if (typeof buildStratexNav === 'function') buildStratexNav('sidebarNav', Auth.user);
    if (typeof ensureStratexNotificationPanel === 'function') ensureStratexNotificationPanel();
    if (typeof updateNotifBadge === 'function') updateNotifBadge();
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
