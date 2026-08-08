'use strict';
(function(){
  var API=(function(){try{return localStorage.getItem('sl_api_url')||'https://scoutlink-api.vercel.app';}catch(_){return'https://scoutlink-api.vercel.app';}})().replace(/\/+$/,'');
  var params=new URLSearchParams(location.search);
  var code=(params.get('code')||'').trim().toUpperCase();
  var email=(params.get('email')||'').trim();
  var token='',user=null;

  function byId(id){return document.getElementById(id);}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function msg(id,text){var el=byId(id);if(!el)return;el.textContent=text||'';el.classList.toggle('show',!!text);}
  function busy(on){var b=byId('confirmPasswordBtn');b.disabled=!!on;b.classList.toggle('busy',!!on);}
  async function post(path,body,bearer){
    var headers={'Content-Type':'application/json'};if(bearer)headers.Authorization='Bearer '+bearer;
    var r=await fetch(API+path,{method:'POST',headers:headers,credentials:'include',body:JSON.stringify(body||{})});
    var d=await r.json().catch(function(){return{};});if(!r.ok)throw new Error(d.error||'The request could not be completed.');return d;
  }

  function store(data){
    token=data.token||'';user=data.user||{};
    localStorage.setItem('sl_token',token);localStorage.setItem('sl_type','Scout');
    localStorage.setItem('sl_user',JSON.stringify(user));
    localStorage.setItem('sl_user_id',user.id||'');localStorage.setItem('sl_user_email',user.email||email);
  }

  if(!code||!email){
    msg('confirmError','This approval link is missing the email or login code. Request a fresh approval email from Stratex.');
    byId('confirmPasswordForm').hidden=true;
  }else{
    byId('confirmIntro').textContent='Welcome. One password stands between you and player search.';
  }

  byId('confirmPasswordForm').addEventListener('submit',async function(e){
    e.preventDefault();msg('confirmError','');msg('confirmOk','');
    var p=byId('confirmNewPassword').value,c=byId('confirmRepeatPassword').value;
    if(p.length<8){msg('confirmError','Password must be at least eight characters.');return;}
    if(p!==c){msg('confirmError','Passwords do not match.');return;}
    busy(true);
    try{
      var login=await post('/api/auth/login',{email:email,loginCode:code,accountType:'Scout'});
      store(login);
      await post('/api/auth/complete-registration',{newPassword:p,accountType:'Scout'},token);
      try{
        await post('/api/onboarding/scout-wizard',{
          teamWeaknesses:[],preferredPositions:[],ageGroups:[],
          scoutCountry:'',scoutRegion:'',alertPreference:'weekly_digest',
          setupSummary:'First-access password confirmation completed. Recruitment brief can be refined in Scout Setup.'
        },token);
      }catch(_){}
      byId('confirmFormView').hidden=true;byId('confirmDoneView').hidden=false;
      var first=user&&(user.firstName||user.first_name)||'';
      byId('confirmDoneHeading').textContent=first?'Good scouting, '+first+'.':'Good scouting.';
      byId('confirmTicket').innerHTML='<div><small>Scout</small><b>'+esc([user&&user.firstName,user&&user.lastName].filter(Boolean).join(' ')||email)+'</b></div>'+
        '<div><small>Status</small><b>Active</b></div><div><small>Workspace</small><b>'+esc(user&&user.teamName||'ScoutLink Scout')+'</b></div><div><small>Next</small><b>Player search</b></div>';
      msg('confirmOk','Password set.');
    }catch(error){msg('confirmError',error.message||'This approval link could not be verified.');}
    finally{busy(false);}
  });

  document.querySelectorAll('[data-toggle-password]').forEach(function(button){button.addEventListener('click',function(){var input=byId(button.getAttribute('data-toggle-password'));var hidden=input.type==='password';input.type=hidden?'text':'password';button.textContent=hidden?'Hide':'Show';});});
}());
