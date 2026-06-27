'use strict';
/* ScoutLink mobile shell */
(function(){
  var drawerReady = false;

  function isPhone(){
    return window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
  }

  function ensureMobileAppStyles(){
    if (document.querySelector('link[href$="mobile-app.css"]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '../css/mobile-app.css';
    document.head.appendChild(link);
  }

  function slug(v){
    return String(v || '').toLowerCase().replace(/\.html$/,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') || 'index';
  }

  function applyBodyContext(){
    var path = window.location.pathname.split('/').filter(Boolean).pop() || 'index';
    document.body.classList.add('mobile-route-' + slug(path));
    if (window.Auth && Auth.type) document.body.classList.add('mobile-role-' + String(Auth.type).toLowerCase());
    if (typeof isDemoMode === 'function' && isDemoMode()) document.body.classList.add('mobile-demo-mode');
  }

  function closeDrawer(){
    var sidebar = document.getElementById('sidebar');
    var backdrop = document.getElementById('sidebarBackdrop');
    var ham = document.getElementById('mobileHamburger');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (backdrop) backdrop.classList.remove('active');
    if (ham) ham.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('mobile-drawer-open');
    document.body.style.overflow = '';
  }

  function openDrawer(){
    var sidebar = document.getElementById('sidebar');
    var backdrop = document.getElementById('sidebarBackdrop');
    var ham = document.getElementById('mobileHamburger');
    if (sidebar) sidebar.classList.add('mobile-open');
    if (backdrop) backdrop.classList.add('active');
    if (ham) ham.setAttribute('aria-expanded', 'true');
    document.body.classList.add('mobile-drawer-open');
    document.body.style.overflow = 'hidden';
  }

  function normalizeTopbar(){
    var topbar = document.querySelector('.topbar');
    if (!topbar) return;
    var title = topbar.querySelector('.topbar-title');
    if (title && !title.getAttribute('title')) title.setAttribute('title', title.textContent.trim());
    topbar.querySelectorAll('button,a').forEach(function(el){
      var txt = (el.textContent || '').trim().toLowerCase();
      if (txt === 'sign out' || txt === 'logout') el.classList.add('desktop-signout');
    });
  }

  function navIcon(label) {
    var key = String(label || '').toLowerCase();
    if (key.indexOf('dashboard') >= 0) return 'H';
    if (key.indexOf('player') >= 0 || key.indexOf('squad') >= 0 || key.indexOf('profile') >= 0) return 'P';
    if (key.indexOf('add') >= 0) return '+';
    if (key.indexOf('fixture') >= 0 || key.indexOf('registrations') >= 0) return 'F';
    if (key.indexOf('chat') >= 0) return 'C';
    if (key.indexOf('search') >= 0) return 'S';
    if (key.indexOf('pipeline') >= 0) return 'L';
    if (key.indexOf('prediction') >= 0) return 'R';
    if (key.indexOf('settings') >= 0) return 'G';
    if (key.indexOf('demo') >= 0) return 'D';
    return '*';
  }

  function primaryItemsForRole(role) {
    if (role === 'Coach') return [
      { label:'Home', href:'coach-dashboard.html' },
      { label:'Squad', href:'coach-my-players.html' },
      { label:'Add', href:'add-player.html' },
      { label:'Fixtures', href:'coach-fixtures.html' },
      { label:'Chat', href:'coach-chat.html' }
    ];
    if (role === 'Scout') return [
      { label:'Home', href:'scout-dashboard.html' },
      { label:'Search', href:'player-search.html' },
      { label:'Pipeline', href:'scout-pipeline.html' },
      { label:'Predict', href:'scout-predictions.html' },
      { label:'Chat', href:'scout-chat.html' }
    ];
    if (role === 'Player') return [
      { label:'Home', href:'player-dashboard.html' },
      { label:'Profile', href:'player-profile-edit.html' },
      { label:'Reels', href:'player-video-reels.html' },
      { label:'Alerts', href:'player-notifications.html' },
      { label:'Settings', href:'player-settings.html' }
    ];
    if (role === 'Stratex') return [
      { label:'Home', href:'stratex-dashboard.html' },
      { label:'Requests', href:'stratex-registrations.html' },
      { label:'Users', href:'stratex-users.html' },
      { label:'Demo', href:'experience-select.html' },
      { label:'Settings', href:'stratex-settings.html' }
    ];
    return [];
  }

  function initBottomNav(){
    if (!isPhone()) return;
    if (!window.Auth || !Auth.isLoggedIn()) return;
    var items = primaryItemsForRole(Auth.type);
    if (!items.length) return;
    var existing = document.getElementById('mobileBottomNav');
    if (!existing) {
      existing = document.createElement('nav');
      existing.id = 'mobileBottomNav';
      existing.className = 'mobile-bottom-nav';
      existing.setAttribute('aria-label', 'Primary mobile navigation');
      document.body.appendChild(existing);
    }
    var cur = window.location.pathname.split('/').pop();
    existing.innerHTML = items.map(function(item){
      var href = typeof cleanRouteFor === 'function' ? cleanRouteFor(item.href) : item.href;
      var active = cur === item.href || window.location.pathname === href;
      return '<a class="mobile-bottom-item' + (active ? ' active' : '') + '" href="' + href + '">' +
        '<span class="mobile-bottom-icon" aria-hidden="true">' + navIcon(item.label) + '</span>' +
        '<span class="mobile-bottom-label">' + item.label + '</span>' +
        '</a>';
    }).join('');
    document.body.classList.add('has-mobile-bottom-nav');
  }

  function initMobileNav(){
    var sidebar = document.getElementById('sidebar');
    var topbar = document.querySelector('.topbar');
    if (!sidebar || !topbar) {
      setTimeout(initMobileNav, 200);
      return;
    }
    document.body.classList.add('has-mobile-shell');
    normalizeTopbar();

    var logoLink = sidebar.querySelector('.sidebar-logo a');
    if (logoLink && !logoLink.dataset.mobileLogoCleaned) {
      logoLink.dataset.mobileLogoCleaned = '1';
      logoLink.innerHTML = 'Scout<span style="color:var(--green,#00E676)">Link</span>';
    }

    if (!document.getElementById('mobileHamburger')) {
      var ham = document.createElement('button');
      ham.id = 'mobileHamburger';
      ham.className = 'topbar-hamburger';
      ham.type = 'button';
      ham.setAttribute('aria-label', 'Open navigation menu');
      ham.setAttribute('aria-expanded', 'false');
      ham.innerHTML = '<span class="hamburger-icon" aria-hidden="true"><span></span><span></span><span></span></span><span class="hamburger-label">Menu</span>';
      topbar.insertBefore(ham, topbar.firstChild);
    }

    if (!document.getElementById('mobileSidebarSignout')) {
      var soWrap = document.createElement('div');
      soWrap.id = 'mobileSidebarSignout';
      soWrap.className = 'sidebar-signout-mobile';
      soWrap.innerHTML = '<button class="btn btn-ghost" type="button">Sign out</button>';
      sidebar.appendChild(soWrap);
      soWrap.querySelector('button').addEventListener('click', function(){
        if (typeof logout === 'function') logout();
        else if (typeof logoutToLogin === 'function') logoutToLogin();
        else {
          localStorage.clear();
          window.location.href = '/login?logout=1';
        }
      });
    }

    if (!document.getElementById('sidebarBackdrop')) {
      var bd = document.createElement('div');
      bd.id = 'sidebarBackdrop';
      bd.className = 'sidebar-backdrop';
      document.body.appendChild(bd);
    }

    if (!drawerReady) {
      drawerReady = true;
      document.getElementById('mobileHamburger').addEventListener('click', function(){
        var sidebarEl = document.getElementById('sidebar');
        if (sidebarEl && sidebarEl.classList.contains('mobile-open')) closeDrawer();
        else openDrawer();
      });
      document.getElementById('sidebarBackdrop').addEventListener('click', closeDrawer);
      document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeDrawer(); });
      window.addEventListener('resize', function(){ if (!isPhone()) closeDrawer(); enhanceTablesForMobile(); enhanceChatMobile(); initBottomNav(); });
    }

    sidebar.querySelectorAll('.nav-item').forEach(function(item){
      if (!item.dataset.mobileClose) {
        item.dataset.mobileClose = '1';
        item.addEventListener('click', function(){ if (isPhone()) closeDrawer(); });
      }
    });

    var sn = document.getElementById('sidebarNav');
    if (sn && window.MutationObserver && !sn.dataset.mobileObserver) {
      sn.dataset.mobileObserver = '1';
      new MutationObserver(function(){
        sidebar.querySelectorAll('.nav-item').forEach(function(item){
          if (!item.dataset.mobileClose) {
            item.dataset.mobileClose = '1';
            item.addEventListener('click', function(){ if (isPhone()) closeDrawer(); });
          }
        });
      }).observe(sn, { childList:true, subtree:true });
    }

    window._mobileDrawer = { open: openDrawer, close: closeDrawer };
  }

  function tableShouldBecomeCards(table){
    if (!table || table.classList.contains('bulk-table') || table.closest('.bulk-table-wrap') || table.classList.contains('no-mobile-cards')) return false;
    if (!table.classList.contains('sl-table') && !table.closest('.table-card')) return false;
    return true;
  }

  function enhanceTablesForMobile(){
    document.querySelectorAll('table').forEach(function(table){
      if (!tableShouldBecomeCards(table)) return;
      var headers = Array.prototype.map.call(table.querySelectorAll('thead th'), function(th){ return th.textContent.trim(); });
      if (!headers.length) return;
      table.classList.add('mobile-card-table');
      table.querySelectorAll('tbody tr').forEach(function(row){
        row.querySelectorAll('td').forEach(function(td, idx){
          var label = headers[idx] || '';
          if (label && !td.getAttribute('data-label')) td.setAttribute('data-label', label);
          var text = (td.textContent || '').trim();
          if (!text) td.classList.add('mobile-empty-cell');
          if (/actions?|view|edit|delete|download|profile/i.test(label)) td.classList.add('mobile-actions-cell');
        });
      });
    });
  }

  function enhanceActionGroups(){
    document.querySelectorAll('.table-header,.topbar-right,.modal-actions,.form-actions').forEach(function(group){
      if (group.dataset.mobileActions) return;
      var controls = group.querySelectorAll('button,a.btn,select');
      if (controls.length > 1) group.classList.add('mobile-action-group');
      group.dataset.mobileActions = '1';
    });
    document.querySelectorAll('.detail-modal,.modal-overlay').forEach(function(modal){
      if (!modal.dataset.mobileModal) {
        modal.dataset.mobileModal = '1';
        modal.classList.add('mobile-sheet-modal');
      }
    });
  }

  function setMobileChatMode(mode){
    var shell = document.querySelector('.chat-shell');
    if (!shell) return;
    if (!isPhone()) {
      shell.classList.remove('chat-mobile-list','chat-mobile-conversation');
      document.body.classList.remove('mobile-chat-list','mobile-chat-conversation');
      return;
    }
    shell.classList.toggle('chat-mobile-list', mode !== 'conversation');
    shell.classList.toggle('chat-mobile-conversation', mode === 'conversation');
    document.body.classList.toggle('mobile-chat-list', mode !== 'conversation');
    document.body.classList.toggle('mobile-chat-conversation', mode === 'conversation');
  }

  function enhanceChatMobile(){
    var shell = document.querySelector('.chat-shell');
    if (!shell) return;
    var head = shell.querySelector('.chat-head');
    if (head && !head.querySelector('.chat-mobile-back')) {
      var back = document.createElement('button');
      back.type = 'button';
      back.className = 'chat-mobile-back btn btn-sm btn-ghost';
      back.textContent = 'Back';
      back.addEventListener('click', function(){ setMobileChatMode('list'); });
      head.insertBefore(back, head.firstChild);
    }
    if (!window._mobileSelectThreadWrapped && typeof window.selectThread === 'function') {
      var originalSelect = window.selectThread;
      window.selectThread = function(){
        var result = originalSelect.apply(this, arguments);
        if (isPhone()) setMobileChatMode('conversation');
        return result;
      };
      window._mobileSelectThreadWrapped = true;
    }
    if (isPhone() && !shell.classList.contains('chat-mobile-conversation')) setMobileChatMode('list');
  }

  function fitLongText(){
    document.querySelectorAll('.sl-table td span,.thread-meta,.notif-body,.topbar-title,.badge,.detail-value').forEach(function(el){
      if (!el.dataset.mobileOverflow) {
        el.dataset.mobileOverflow = '1';
        el.style.overflow = 'hidden';
        el.style.textOverflow = 'ellipsis';
      }
    });
  }

  function init(){
    ensureMobileAppStyles();
    applyBodyContext();
    initMobileNav();
    enhanceTablesForMobile();
    enhanceActionGroups();
    enhanceChatMobile();
    initBottomNav();
    fitLongText();
  }

  function observeAsyncContent(){
    if (window._mobileAsyncObserver || !window.MutationObserver || !document.body) return;
    window._mobileAsyncObserver = true;
    var timer = null;
    new MutationObserver(function(){
      clearTimeout(timer);
      timer = setTimeout(init, 120);
    }).observe(document.body, { childList:true, subtree:true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(function(){ init(); observeAsyncContent(); }, 80); });
  } else {
    setTimeout(function(){ init(); observeAsyncContent(); }, 80);
  }

  window.initMobileNav = initMobileNav;
  window.setMobileChatMode = setMobileChatMode;
  window.initBottomNav = initBottomNav;
  window.refreshMobileLayout = init;
})();
