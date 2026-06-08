'use strict';
/* ScoutLink mobile.js v1.1 */
(function(){
var _done=false;
function initMobileNav(){
  if(_done)return;
  var sidebar=document.getElementById('sidebar');
  var topbar=document.querySelector('.topbar');
  var topbarRight=document.querySelector('.topbar-right');
  if(!sidebar||!topbar){setTimeout(initMobileNav,250);return;}
  _done=true;
  // Fix broken logo
  var logoLink=sidebar.querySelector('.sidebar-logo a');
  if(logoLink){
    var lhtml=logoLink.innerHTML||'';
    lhtml=lhtml.replace(/^[\s\S]*?(?=Scout)/i,'');
    logoLink.innerHTML='<svg style="width:20px;height:20px;flex-shrink:0" viewBox="0 0 24 24" fill="none" stroke="#00E676" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>'+lhtml;
  }
  // Inject hamburger
  if(!document.getElementById('mobileHamburger')){
    var ham=document.createElement('button');
    ham.id='mobileHamburger';
    ham.className='topbar-hamburger';
    ham.setAttribute('aria-label','Toggle navigation');
    ham.innerHTML='<div class="hamburger-icon"><span></span><span></span><span></span></div>';
    topbar.insertBefore(ham,topbarRight||topbar.firstChild);
  }
  // Mark desktop sign-out
  var btns=topbar.querySelectorAll('.btn-ghost');
  btns.forEach(function(b){if(b.textContent.trim()==='Sign Out')b.classList.add('desktop-signout');});
  // Mobile sign-out in sidebar
  if(!document.getElementById('mobileSidebarSignout')){
    var soWrap=document.createElement('div');
    soWrap.id='mobileSidebarSignout';
    soWrap.className='sidebar-signout-mobile';
    soWrap.innerHTML='<button class="btn btn-ghost" style="width:100%;justify-content:flex-start;color:#ff7b7b" onclick="if(typeof logout===\'function\')logout();else{localStorage.clear();window.location.href=\'login.html?logout=1\';}" >&#9166; Sign Out</button>';
    sidebar.appendChild(soWrap);
  }
  // Inject backdrop
  if(!document.getElementById('sidebarBackdrop')){
    var bd=document.createElement('div');
    bd.id='sidebarBackdrop';bd.className='sidebar-backdrop';
    document.body.appendChild(bd);
  }
  var hamBtn=document.getElementById('mobileHamburger');
  var backdrop=document.getElementById('sidebarBackdrop');
  function openDrawer(){sidebar.classList.add('mobile-open');backdrop.classList.add('active');document.body.style.overflow='hidden';}
  function closeDrawer(){sidebar.classList.remove('mobile-open');backdrop.classList.remove('active');document.body.style.overflow='';}
  hamBtn.addEventListener('click',function(){sidebar.classList.contains('mobile-open')?closeDrawer():openDrawer();});
  backdrop.addEventListener('click',closeDrawer);
  sidebar.querySelectorAll('.nav-item').forEach(function(item){item.addEventListener('click',function(){if(window.innerWidth<768)closeDrawer();});});
  window.addEventListener('resize',function(){if(window.innerWidth>=1024){closeDrawer();document.body.style.overflow='';}});
  // Watch for nav items added dynamically
  var sn=document.getElementById('sidebarNav');
  if(sn&&window.MutationObserver){new MutationObserver(function(){sn.querySelectorAll('.nav-item').forEach(function(i){if(!i.dataset.mc){i.dataset.mc='1';i.addEventListener('click',function(){if(window.innerWidth<768)closeDrawer();});}});}).observe(sn,{childList:true});}
  window._mobileDrawer={open:openDrawer,close:closeDrawer};
}
function fixTruncation(){
  document.querySelectorAll('.sl-table td').forEach(function(td){
    td.querySelectorAll('span').forEach(function(s){
      var t=s.textContent||'';
      if(t.indexOf('@')!==-1||t.indexOf('.com')!==-1||t.length>28){
        s.style.cssText+=';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px;display:block';
      }
    });
  });
}
function init(){initMobileNav();fixTruncation();}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',function(){setTimeout(init,150);});}else{setTimeout(init,150);}
window.initMobileNav=initMobileNav;
})();