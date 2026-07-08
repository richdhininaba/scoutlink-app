(function () {
  'use strict';

  var MODULES = [
    ['dashboard', 'Dashboard', 'Company overview'],
    ['activity', 'Website Activity', 'Traffic and engagement'],
    ['leads', 'Website Leads', 'Form enquiries'],
    ['crm', 'CRM', 'Website and product contacts'],
    ['blog', 'Blog / Learning Centre', 'Articles, views and likes'],
    ['leadership', 'Leadership', 'Public leadership profiles'],
    ['org', 'Org Directory', 'Team structure'],
    ['profile', 'My Profile', 'Your Stratex record'],
    ['contracts', 'Contracts & Pay', 'HR documents'],
    ['leave', 'Leave / Sick Leave', 'Absence records'],
    ['hiring', 'Hiring', 'Jobs and applicants'],
    ['meetings', 'Meetings', 'Internal meetings'],
    ['concerns', 'Trust & Concerns', 'Safeguarding and reports'],
    ['settings', 'Settings', 'Company settings'],
    ['scoutlink', 'Open ScoutLink Admin', 'Product admin tools']
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
          return '<td>' + value + '</td>';
        }).join('') + '</tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  function moduleCard(id, title, copy) {
    return '<button class="stx-admin-card" type="button" data-admin-module="' + escapeHtml(id) + '">' +
      '<span>' + escapeHtml(title) + '</span><small>' + escapeHtml(copy) + '</small></button>';
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
        '<aside class="stx-admin-sidebar">' +
          '<a class="stx-admin-brand" href="/admin">Stratex<span>Analytics</span></a>' +
          '<nav class="stx-admin-nav" aria-label="Stratex admin sections">' +
            MODULES.map(function (item) {
              return '<button class="stx-admin-nav-item" type="button" data-admin-module="' + escapeHtml(item[0]) + '">' +
                '<span>' + escapeHtml(item[1]) + '</span><small>' + escapeHtml(item[2]) + '</small></button>';
            }).join('') +
          '</nav>' +
          '<div class="stx-admin-user"><div class="stx-admin-avatar">' + escapeHtml(initials()) + '</div><div><b>' + escapeHtml(userName()) + '</b><span>Stratex admin</span></div></div>' +
        '</aside>' +
        '<main class="stx-admin-main">' +
          '<header class="stx-admin-topbar"><div><p>Company admin centre</p><h1 id="stxAdminTitle">Dashboard</h1></div><div class="stx-admin-top-actions"><a class="btn btn-sm btn-outline" href="/" target="_blank" rel="noopener">Open Stratex site</a><button class="btn btn-sm btn-ghost" id="logoutBtn" type="button">Sign out</button></div></header>' +
          '<div class="stx-admin-content">' +
            modulePanel('dashboard', 'Dashboard', 'A clean operating view for Stratex Analytics, separate from ScoutLink product administration.',
              '<div class="stx-admin-hero"><div><p class="stx-eyebrow">Welcome</p><h2>' + escapeHtml(userName()) + '</h2><p>Manage the company website, public content, leads, hiring, team records and trust routes from here.</p></div><a class="btn btn-primary" href="/experience-select">Open product experience selector</a></div>' +
              '<div class="stx-admin-grid">' + MODULES.filter(function (item) { return item[0] !== 'dashboard'; }).map(function (item) { return moduleCard(item[0], item[1], item[2]); }).join('') + '</div>') +
            modulePanel('activity', 'Website Activity', 'Public Stratex site activity, content engagement and crawler-visible pages.',
              '<div class="stx-admin-surface"><div class="stx-admin-kpis"><div><b id="activityViews">-</b><span>Learning views</span></div><div><b id="activityLikes">-</b><span>Learning likes</span></div><div><b>Stratex-only</b><span>Sitemap scope</span></div></div><p class="stx-muted">Views and likes are deduped with a private visitor cookie. Admin previews are not the public content source.</p></div>') +
            modulePanel('leads', 'Website Leads', 'Contact, demo, newsletter and concern submissions from the Stratex public website.',
              '<div class="stx-admin-surface"><div class="stx-admin-row-head"><h3>Recent leads</h3><button class="btn btn-sm btn-outline" id="refreshLeadsBtn" type="button">Refresh</button></div><div id="leadRows" class="loading-state"><div class="spinner"></div></div></div>') +
            modulePanel('crm', 'CRM', 'One place for public website contacts and ScoutLink registration/application contacts.',
              '<div class="stx-admin-surface"><div class="stx-admin-row-head"><h3>CRM records</h3><a class="btn btn-sm btn-primary" href="#" id="crmExportBtn">Export CSV</a></div><div id="crmRows" class="loading-state"><div class="spinner"></div></div></div>') +
            modulePanel('blog', 'Blog / Learning Centre', 'Create public learning posts and monitor live engagement.',
              '<div class="stx-admin-two-col"><form class="stx-admin-surface" id="blogForm"><h3>Create Learning Centre post</h3>' +
              input('Title', 'title', 'text', true) + input('Category', 'category', 'text', false, 'Football intelligence') +
              textarea('Excerpt', 'excerpt', 3) + editorToolbar() + textarea('Body', 'body', 10, true) +
              '<label class="form-group"><span>Status</span><select class="form-control" name="status"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>' +
              '<div class="form-message" id="blogMsg" style="display:none"></div><button class="btn btn-primary" type="submit">Save post</button></form>' +
              '<div class="stx-admin-surface"><div class="stx-admin-row-head"><h3>Posts</h3><a class="btn btn-sm btn-outline" href="/learning-centre" target="_blank" rel="noopener">Public Learning Centre</a></div><div id="blogRows" class="loading-state"><div class="spinner"></div></div></div></div>') +
            modulePanel('leadership', 'Leadership', 'Manage crawlable public leadership profiles and image URLs.',
              '<div class="stx-admin-two-col"><form class="stx-admin-surface" id="leadershipForm"><h3>Add leadership member</h3>' +
              input('Full name', 'fullName', 'text', true) + input('Email', 'email', 'email') + input('Job title', 'jobTitle', 'text', true) +
              input('Image URL', 'imageUrl', 'url', false, '/images/leadership/name.svg') + input('LinkedIn URL', 'linkedinUrl', 'url') +
              input('Profile chip', 'focusChip', 'text') + textarea('Summary', 'summary', 3) +
              '<label class="form-group"><span>Permission role</span><select class="form-control" name="permissionRole"><option>Management</option><option>Operations</option><option>Acquisition</option><option>Safeguarding Reviewer</option><option>Product Demo</option><option>Read Only</option></select></label>' +
              textarea('Bio', 'bio', 5) + input('Display order', 'displayOrder', 'number', false, '100') +
              '<div class="form-message" id="leadershipMsg" style="display:none"></div><button class="btn btn-primary" type="submit">Save leadership member</button></form>' +
              '<div class="stx-admin-surface"><div class="stx-admin-row-head"><h3>Leadership profiles</h3><a class="btn btn-sm btn-outline" href="/leadership" target="_blank" rel="noopener">Public Leadership</a></div><div id="leadershipRows" class="loading-state"><div class="spinner"></div></div></div></div>') +
            linkPanel('org', 'Org Directory', 'Maintain company reporting lines in the Stratex org view.', '/stratex/org', 'Open org directory') +
            modulePanel('profile', 'My Profile', 'Your admin identity and account details.', '<div class="stx-admin-surface"><h3>' + escapeHtml(userName()) + '</h3><p>' + escapeHtml((Auth.user && Auth.user.email) || localStorage.getItem('sl_user_email') || '') + '</p><p class="stx-muted">Use Settings for account and notification preferences.</p></div>') +
            linkPanel('contracts', 'Contracts & Pay', 'Open restricted HR contract and pay records.', '/stratex/contracts-pay', 'Open contracts & pay') +
            linkPanel('leave', 'Leave / Sick Leave', 'Book and review leave and sickness records.', '/stratex/leave', 'Open leave') +
            linkPanel('hiring', 'Hiring', 'Create jobs, review applications and publish careers roles.', '/stratex/hiring', 'Open hiring') +
            linkPanel('meetings', 'Meetings', 'Book and review Stratex meetings.', '/stratex/meetings', 'Open meetings') +
            linkPanel('concerns', 'Trust & Concerns', 'Review restricted trust and safeguarding submissions.', '/stratex/concerns', 'Open concerns') +
            linkPanel('settings', 'Settings', 'Open Stratex admin settings.', '/stratex/settings', 'Open settings') +
            modulePanel('scoutlink', 'Open ScoutLink Admin', 'Launch the product admin experience selector. Product data is intentionally not the default Stratex dashboard.', '<div class="stx-admin-surface"><p class="stx-muted">Use this when you need to manage ScoutLink player, coach, scout, team, award or showcase workflows.</p><a class="btn btn-primary" href="/experience-select">Open ScoutLink product admin</a></div>') +
          '</div>' +
        '</main>' +
      '</div>';
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

  function switchModule(id) {
    if (id === 'scoutlink') {
      document.querySelectorAll('.stx-company-module').forEach(function (el) { el.hidden = true; });
    }
    document.querySelectorAll('[data-admin-module]').forEach(function (el) { el.classList.toggle('active', el.getAttribute('data-admin-module') === id); });
    document.querySelectorAll('.stx-company-module').forEach(function (el) { el.hidden = el.id !== 'module-' + id; });
    var item = MODULES.find(function (row) { return row[0] === id; }) || MODULES[0];
    var title = document.getElementById('stxAdminTitle');
    if (title) title.textContent = item[1];
    if (id === 'crm') loadCrm();
    if (id === 'leads') loadLeads();
    if (id === 'blog' || id === 'activity') loadBlog();
    if (id === 'leadership') loadLeadership();
  }

  function formPayload(form) {
    var payload = {};
    new FormData(form).forEach(function (value, key) { payload[key] = value; });
    return payload;
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
    } catch (_) {
      root.innerHTML = '<div class="stx-admin-error">Could not load website leads.</div>';
    }
  }

  async function loadBlog() {
    var root = document.getElementById('blogRows');
    try {
      var data = await api('GET', '/api/stratex-website/blog');
      var rows = data.data || [];
      var views = rows.reduce(function (sum, row) { return sum + Number(row.view_count || 0); }, 0);
      var likes = rows.reduce(function (sum, row) { return sum + Number(row.like_count || 0); }, 0);
      var viewEl = document.getElementById('activityViews');
      var likeEl = document.getElementById('activityLikes');
      if (viewEl) viewEl.textContent = views.toLocaleString('en-GB');
      if (likeEl) likeEl.textContent = likes.toLocaleString('en-GB');
      if (!root) return;
      root.innerHTML = rowTable([
        ['Title', 'title'],
        ['Status', 'status'],
        ['Views', 'view_count', function (row) { return escapeHtml(Number(row.view_count || 0).toLocaleString('en-GB')); }],
        ['Likes', 'like_count', function (row) { return escapeHtml(Number(row.like_count || 0).toLocaleString('en-GB')); }],
        ['Public URL', 'slug', function (row) {
          var url = 'https://www.stratexanalytics.co.uk/learning-centre/' + encodeURIComponent(row.slug || '');
          return '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' + escapeHtml(row.slug || 'Open') + '</a>';
        }],
        ['LinkedIn', 'slug', function (row) {
          var url = 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent('https://www.stratexanalytics.co.uk/learning-centre/' + encodeURIComponent(row.slug || ''));
          return '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener">Share</a>';
        }]
      ], rows);
    } catch (_) {
      if (root) root.innerHTML = '<div class="stx-admin-error">Could not load posts.</div>';
    }
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
    var logout = document.getElementById('logoutBtn');
    if (logout) logout.addEventListener('click', logoutToLogin);
    var refresh = document.getElementById('refreshLeadsBtn');
    if (refresh) refresh.addEventListener('click', loadLeads);
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
        await api('POST', '/api/stratex-website/leadership', formPayload(leadershipForm));
        leadershipForm.reset();
        showMessage('leadershipMsg', 'Leadership member saved.', true);
        loadLeadership();
      } catch (err) {
        showMessage('leadershipMsg', err.message || 'Could not save leadership member.', false);
      }
    });
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
    switchModule('dashboard');
  });
})();
