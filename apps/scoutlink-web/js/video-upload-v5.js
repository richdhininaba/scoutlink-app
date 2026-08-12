'use strict';
(function(){
  var API=(function(){var h=String(location.hostname||'').toLowerCase();if(h==='scoutlink.app'||h==='www.scoutlink.app'||h.endsWith('.vercel.app'))return'';try{return localStorage.getItem('sl_api_url')||'https://scoutlink-api.vercel.app'}catch(_){return'https://scoutlink-api.vercel.app'}})().replace(/\/+$/,'');
  var token=new URLSearchParams(location.search).get('token')||'',category='Match',mode='file',form=document.getElementById('videoUploadForm');
  function id(x){return document.getElementById(x)}
  function message(el,text){var n=id(el);n.textContent=text||'';n.classList.toggle('show',!!text)}
  function fmtDate(v){if(!v)return'';var d=new Date(v);return isNaN(d)?'':d.toLocaleDateString('en-GB',{day:'numeric',month:'long'})}
  function renderCategories(){id('videoCategories').innerHTML=['Match','Highlight','Training','Skills','Goal'].map(function(x){return'<button type="button" class="chip '+(x===category?'on':'')+'" data-category="'+x+'">'+x+'</button>'}).join('');document.querySelectorAll('[data-category]').forEach(function(b){b.onclick=function(){category=b.dataset.category;renderCategories()}})}
  function setMode(next){mode=next==='link'?'link':'file';document.querySelectorAll('[data-video-mode]').forEach(function(b){b.classList.toggle('on',b.dataset.videoMode===mode)});id('videoFileMode').hidden=mode!=='file';id('videoLinkMode').hidden=mode!=='link';id('videoSubmit').textContent=mode==='file'?'Upload video':'Submit video link'}
  function validHttps(value){try{var u=new URL(String(value||'').trim());return u.protocol==='https:'}catch(_){return false}}
  async function load(){renderCategories();setMode('file');if(!token){message('videoLoadError','This upload link is missing a token.');return}try{var r=await fetch(API+'/api/videos/upload-link/'+encodeURIComponent(token));var d=await r.json().catch(function(){return{}});if(!r.ok)throw new Error(d.error||'Upload link unavailable');var p=d.player||{},req=d.requestedBy||{};id('videoPlayerName').textContent=[p.firstName,p.lastName].filter(Boolean).join(' ')||'this player';var who=[req.firstName||req.first_name,req.lastName||req.last_name].filter(Boolean).join(' ')||'your coach';var role=req.roleAtClub||req.role_at_club||'Coach';id('videoPlayerTeam').textContent='Requested by '+who+', '+role+(p.teamName?' at '+p.teamName:'')+'. This secure link works for this player only'+(d.expiresAt?' and expires on '+fmtDate(d.expiresAt):'')+'.';form.hidden=false}catch(e){message('videoLoadError',e.message);id('videoPlayerName').textContent='this player';id('videoPlayerTeam').textContent='Upload link unavailable.'}}
  document.querySelectorAll('[data-video-mode]').forEach(function(b){b.onclick=function(){setMode(b.dataset.videoMode)}});
  id('videoFile').onchange=function(){var f=this.files[0];id('selectedFile').textContent=f?f.name+' · '+Math.max(.1,Math.round(f.size/1024/1024*10)/10)+'MB':'';if(f&&!id('videoTitle').value)id('videoTitle').value=f.name.replace(/\.[^.]+$/,'')};
  form.onsubmit=async function(e){
    e.preventDefault();message('videoLoadError','');message('videoMessage','');var btn=id('videoSubmit'),title=id('videoTitle').value.trim();if(!title){message('videoLoadError','Add a video title.');return}
    var submittedMode=mode;btn.disabled=true;btn.textContent=mode==='file'?'Uploading…':'Submitting…';
    try{
      var r,d;
      if(mode==='file'){
        var f=id('videoFile').files[0];if(!f)throw new Error('Choose a video file first.');if(f.size>4*1024*1024)throw new Error('This video is larger than the current 4MB secure-upload limit.');
        var fd=new FormData();fd.append('token',token);fd.append('title',title);fd.append('category',category);fd.append('description',id('videoDescription').value.trim());fd.append('file',f);
        r=await fetch(API+'/api/videos/public-upload',{method:'POST',body:fd});
      }else{
        var url=id('videoUrl').value.trim();if(!validHttps(url))throw new Error('Paste a valid HTTPS video share URL.');
        r=await fetch(API+'/api/videos/public-link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:token,title:title,category:category,description:id('videoDescription').value.trim(),url:url})});
      }
      d=await r.json().catch(function(){return{}});if(!r.ok)throw new Error(d.error||'Video submission failed');
      form.reset();id('selectedFile').textContent='';setMode('file');message('videoMessage',submittedMode==='link'?'Video link submitted. It is waiting for the coach to review and approve it.':'Video uploaded. It is waiting for the coach to review and approve it.');btn.textContent='Submitted';
    }catch(er){message('videoLoadError',er.message);btn.disabled=false;btn.textContent=mode==='file'?'Upload video':'Submit video link'}
  };
  load();
}());
