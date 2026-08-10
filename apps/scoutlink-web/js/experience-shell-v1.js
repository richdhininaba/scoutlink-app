'use strict';

/*
 * ScoutLink shared experience shell.
 * Coach no longer inherits any geometry or visual rules from this file.
 * Coach Desk / Coach Field are owned exclusively by coach-v2.js,
 * coach-exact-routes-v1.js and coach-desk-field-v1.css.
 */
(function(){
  if(window.__experienceShellNoCoachV1)return;
  window.__experienceShellNoCoachV1=true;

  function role(){
    try{
      return String(
        sessionStorage.getItem('sl_public_demo_role') ||
        sessionStorage.getItem('sl_admin_demo_role') ||
        (window.Auth&&window.Auth.type) ||
        localStorage.getItem('sl_type') || ''
      ).toLowerCase();
    }catch(_){return'';}
  }
  function path(){return String(location.pathname||'').toLowerCase();}

  function apply(){
    if(!document.body)return;
    document.body.classList.remove('experience-shell-coach','experience-shell-scout','experience-shell-player','experience-shell-stratex');

    var p=path(),r=role();
    if(p.indexOf('/coach')===0 || r==='coach'){
      /* Intentionally do nothing. Coach owns itself. */
      return;
    }
    if(p.indexOf('/scout')===0 || r==='scout')document.body.classList.add('experience-shell-scout');
    else if(p.indexOf('/player')===0 || r==='player')document.body.classList.add('experience-shell-player');
    else if(p.indexOf('/stratex')===0 || p.indexOf('/admin')===0 || r==='stratex')document.body.classList.add('experience-shell-stratex');

    if(document.body.classList.contains('experience-shell-scout')){
      document.querySelectorAll('#publicDemoBanner,.public-demo-banner').forEach(function(n){
        if(!n.classList.contains('slwf-demo-banner'))n.remove();
      });
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  window.addEventListener('pageshow',apply);
  window.addEventListener('popstate',apply);
  window.addEventListener('storage',apply);
}());
