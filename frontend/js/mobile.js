'use strict';
/* ScoutLink mobile shell */
(function(){
  var drawerReady = false;

  function isPhone(){
    return window.matchMedia && window.matchMedia('(max-width: 767px)').matches;
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
      window.addEventListener('resize', function(){ if (!isPhone()) closeDrawer(); enhanceTablesForMobile(); enhanceChatMobile(); });
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
      return;
    }
    shell.classList.toggle('chat-mobile-list', mode !== 'conversation');
    shell.classList.toggle('chat-mobile-conversation', mode === 'conversation');
  }

  function enhanceChatMobile(){
    var shell = document.querySelector('.chat-shell');
    if (!shell) return;
    var head = shell.querySelector('.chat-head');
    if (head && !head.querySelector('.chat-mobile-back')) {
      var back = document.createElement('button');
      back.type = 'button';
      back.className = 'chat-mobile-back btn btn-sm btn-ghost';
      back.textContent = 'Back to chats';
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
    initMobileNav();
    enhanceTablesForMobile();
    enhanceActionGroups();
    enhanceChatMobile();
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
  window.refreshMobileLayout = init;
})();
