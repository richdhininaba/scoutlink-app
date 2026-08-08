'use strict';
(function(){
  var API=(function(){try{return localStorage.getItem('sl_api_url')||'https://scoutlink-api.vercel.app';}catch(_){return'https://scoutlink-api.vercel.app';}})().replace(/\/+$/,'');
  var token=new URLSearchParams(location.search).get('token')||'';
  var form=document.getElementById('videoUploadForm');
  function byId(id){return document.getElementById(id);}
  function msg(id,text){var el=byId(id);el.textContent=text||'';el.classList.toggle('show',!!text);}
  function busy(on){var b=byId('videoSubmit');b.disabled=!!on;b.classList.toggle('busy',!!on);}
  async function load(){
    if(!token){msg('videoLoadError','This upload link is missing a token.');return;}
    try{
      var r=await fetch(API+'/api/videos/upload-link/'+encodeURIComponent(token));
      var d=await r.json().catch(function(){return{};});if(!r.ok)throw new Error(d.error||'Upload link unavailable');
      var p=d.player||{};
      byId('videoPlayerName').textContent=([p.firstName,p.lastName].filter(Boolean).join(' ')||'Player');
      byId('videoPlayerTeam').textContent=p.teamName||'Coach-managed ScoutLink profile';
      form.hidden=false;
    }catch(error){msg('videoLoadError',error.message);byId('videoPlayerName').textContent='Upload link unavailable';}
  }
  form.addEventListener('submit',async function(e){
    e.preventDefault();msg('videoMessage','');msg('videoLoadError','');
    var file=byId('videoFile').files[0];if(!file){msg('videoLoadError','Choose a video file first.');return;}
    if(file.size>4*1024*1024){msg('videoLoadError','This video is larger than the 4MB secure-upload limit.');return;}
    var fd=new FormData();fd.append('token',token);fd.append('title',byId('videoTitle').value.trim());fd.append('category',byId('videoCategory').value);fd.append('description',byId('videoDescription').value.trim());fd.append('file',file);
    busy(true);
    try{
      var r=await fetch(API+'/api/videos/public-upload',{method:'POST',body:fd});
      var d=await r.json().catch(function(){return{};});if(!r.ok)throw new Error(d.error||'Upload failed');
      form.reset();msg('videoMessage','Video uploaded. The coach can now review it in ScoutLink.');
    }catch(error){msg('videoLoadError',error.message);}
    finally{busy(false);}
  });
  load();
}());
