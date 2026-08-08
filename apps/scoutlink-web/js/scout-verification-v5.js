'use strict';
(function(){
  var API=(function(){try{return localStorage.getItem('sl_api_url')||'https://scoutlink-api.vercel.app';}catch(_){return'https://scoutlink-api.vercel.app';}})().replace(/\/+$/,'');
  var token=new URLSearchParams(location.search).get('token')||'';
  var MAX=5*1024*1024;
  var allowed=/\.(pdf|jpe?g|png|doc|docx)$/i;

  function byId(id){return document.getElementById(id);}
  function show(name){document.querySelectorAll('[data-verification-view]').forEach(function(v){v.classList.toggle('active',v.getAttribute('data-verification-view')===name);});}
  function msg(id,text){var el=byId(id);if(!el)return;el.textContent=text||'';el.classList.toggle('show',!!text);}
  function busy(id,on){var b=byId(id);if(!b)return;b.disabled=!!on;b.classList.toggle('busy',!!on);}
  function valid(file){if(!file)return'Both verification files are required.';if(file.size>MAX)return file.name+' is larger than 5MB.';if(!allowed.test(file.name))return file.name+' is not an accepted file type.';return'';}

  async function load(){
    if(!token){show('unavailable');return;}
    try{
      var r=await fetch(API+'/api/registrations/scout-verification/'+encodeURIComponent(token),{credentials:'include'});
      var d=await r.json().catch(function(){return{};});
      if(!r.ok)throw new Error(d.error||'The verification link is unavailable.');
      if(d.verificationStatus==='documents_submitted'||d.verificationStatus==='verified_awaiting_payment'||d.verificationStatus==='activated'){show('received');return;}
      var name=[d.firstName,d.lastName].filter(Boolean).join(' ');
      byId('verificationApplicant').textContent=(name?name+' — ':'')+'two files are required. They go directly to Stratex’s restricted verification workflow and nowhere else.';
      show('form');
    }catch(error){
      msg('verificationError',error.message);show('unavailable');
    }
  }

  byId('verificationForm').addEventListener('submit',async function(e){
    e.preventDefault();msg('verificationError','');msg('verificationOk','');
    var proof=this.querySelector('[name="proofOfId"]').files[0];
    var safeguarding=this.querySelector('[name="safeguardingEvidence"]').files[0];
    var error=valid(proof)||valid(safeguarding);if(error){msg('verificationError',error);return;}
    var data=new FormData();data.append('proofOfId',proof);data.append('safeguardingEvidence',safeguarding);
    busy('verificationSubmit',true);
    try{
      var r=await fetch(API+'/api/registrations/scout-verification/'+encodeURIComponent(token),{method:'POST',body:data,credentials:'include'});
      var d=await r.json().catch(function(){return{};});if(!r.ok)throw new Error(d.error||'The files could not be submitted.');
      show('received');
    }catch(err){msg('verificationError',err.message);}
    finally{busy('verificationSubmit',false);}
  });

  byId('verificationResendForm').addEventListener('submit',async function(e){
    e.preventDefault();msg('verificationError','');msg('verificationOk','');
    var email=byId('verificationEmail').value.trim();if(!email){msg('verificationError','Enter the application email.');return;}
    busy('verificationResend',true);
    try{
      var r=await fetch(API+'/api/registrations/scout-verification/resend',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email}),credentials:'include'});
      var d=await r.json().catch(function(){return{};});if(!r.ok)throw new Error(d.error||'A new link could not be requested.');
      msg('verificationOk',d.message||'If a pending Scout application exists for that email, a fresh verification link has been sent.');
    }catch(err){msg('verificationError',err.message);}
    finally{busy('verificationResend',false);}
  });

  load();
}());
