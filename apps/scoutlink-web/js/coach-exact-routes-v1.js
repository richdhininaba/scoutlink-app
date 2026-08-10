'use strict';

window.CoachExactRoutes=(function(){
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function path(){return String(location.pathname||'').toLowerCase();}
  function key(){
    var p=path();
    if(p.indexOf('/coach/dashboard')===0)return'dashboard';
    if(p.indexOf('/coach/my-players')===0)return'my-players';
    if(p.indexOf('/coach/add-player')===0)return'add-player';
    if(p.indexOf('/coach/bulk-add-players')===0)return'bulk-add-players';
    if(p.indexOf('/coach/fixtures')===0)return'fixtures';
    if(p.indexOf('/coach/match-facts')===0)return'match-facts';
    if(p.indexOf('/coach/video-reels')===0)return'video-reels';
    if(p.indexOf('/coach/chat')===0)return'chat';
    if(p.indexOf('/coach/notifications')===0)return'notifications';
    if(p.indexOf('/coach/report-a-concern')===0)return'report-a-concern';
    if(p.indexOf('/coach/settings')===0)return'settings';
    if(p.indexOf('/player/profile')===0)return'profile';
    return'';
  }
  function user(){try{return(window.Auth&&window.Auth.user)||JSON.parse(localStorage.getItem('sl_user')||'{}')||{};}catch(_){return{};}}
  function name(){var u=user();return[u.firstName||u.first_name,u.lastName||u.last_name].filter(Boolean).join(' ')||'Coach';}
  function first(){return name().split(/\s+/)[0]||'Coach';}
  function initials(v){var a=String(v||name()).split(/\s+/);return((a[0]||'C')[0]+((a[1]||a[0]||'O')[0])).toUpperCase();}
  function team(){var u=user();try{return localStorage.getItem('sl_team_name')||u.teamName||u.team_name||u.clubName||u.club_name||'Your team';}catch(_){return'Your team';}}
  function age(){var u=user();try{return localStorage.getItem('sl_team_age_group')||u.ageGroup||u.age_group||'';}catch(_){return'';}}

  function mobileHeader(title,sub,action){
    return '<div class="coach-field-hd"><div><div class="t">'+esc(title)+'</div><div class="sub">'+esc(sub||'')+'</div></div><div class="r">'+(action||'')+'<span class="avm">'+esc(initials())+'</span></div></div>';
  }
  function field(){
    var f=document.getElementById('coachExactFieldBody');if(!f)return null;return f;
  }
  function cloneSource(selector){
    var n=document.querySelector('#coachExactDeskBody '+selector);return n?n.cloneNode(true):null;
  }

  function dashboard(){
    var f=field();if(!f)return;
    f.innerHTML=mobileHeader('Morning, '+first(),team()+(age()?' · '+age():''),'<button class="icb" onclick="location.href=\'/coach/notifications\'">🔔</button>')+
      '<div class="stack" id="fieldDashboardStack"></div>';
    var stack=document.getElementById('fieldDashboardStack');
    var next=document.getElementById('dashboardNextFixture');
    stack.innerHTML=
      '<div class="card hero" id="fieldNext"><div class="ck g">Next fixture</div><div class="mut" style="margin-top:4px">Loading fixture…</div><div class="flex" style="margin-top:9px"><a class="bt spend" style="flex:1" href="/coach/match-facts?mode=live">Open Matchday Log</a><a class="bt sm gh" href="/coach/fixtures">Fixture</a></div></div>'+
      '<div class="card rule"><div class="ck" style="margin-bottom:7px">Needs attention</div><div id="fieldAttention"></div></div>'+
      '<div class="two"><div class="card"><div class="ck">Evidence complete</div><div class="fitn" id="fieldEvidence">--</div></div><div class="card"><div class="ck">MF coverage</div><div class="fitn" id="fieldCoverage">--</div></div></div>'+
      '<div class="card rule"><div class="ck" style="margin-bottom:7px">Weakest evidence</div><div id="fieldWeakest"></div></div>';
    function sync(){
      var kE=document.getElementById('kpiEvidence'),kC=document.getElementById('kpiCoverage');
      if(kE)document.getElementById('fieldEvidence').textContent=kE.textContent;
      if(kC)document.getElementById('fieldCoverage').textContent=kC.textContent;
      if(next){
        var dst=document.getElementById('fieldNext');
        var strong=next.querySelector('strong'),p=next.querySelector('p');
        if(strong)dst.querySelector('.mut').innerHTML='<b style="color:var(--ink)">'+esc(strong.textContent)+'</b><br>'+esc(p?p.textContent:'');
      }
      var a=document.getElementById('attentionQueue'),fa=document.getElementById('fieldAttention');
      if(a&&fa)fa.innerHTML=a.innerHTML;
      var e=document.getElementById('evidenceByPlayer'),fw=document.getElementById('fieldWeakest');
      if(e&&fw)fw.innerHTML=e.innerHTML;
    }
    sync();new MutationObserver(sync).observe(document.getElementById('coachExactDeskBody'),{childList:true,subtree:true,characterData:true});
  }

  function squad(){
    var f=field();if(!f)return;
    f.innerHTML=mobileHeader('Squad',team()+(age()?' · '+age():''),'<a class="bt sm spend" href="/coach/add-player">Add</a>')+
      '<div class="stack"><div class="srch"><input id="fieldPlayerSearch" type="search" placeholder="Search players…" style="border:0;background:transparent;width:100%;outline:0"></div>'+
      '<div class="seg" id="fieldPosSeg"><button class="on" data-v="">All</button><button data-v="Goalkeeper">GK</button><button data-v="Defender">DEF</button><button data-v="Midfielder">MID</button><button data-v="Forward">ATT</button></div>'+
      '<div class="flex" style="gap:6px"><span class="chip on">Needs work</span><span class="chip">Scout interest</span><span class="chip">Match-ready</span></div>'+
      '<div class="card rule" id="fieldPlayerList"><div class="mut">Loading squad…</div></div>'+
      '<div class="mut" style="font-size:9px;text-align:center">Full table, sorting and CSV live on Coach Desk.</div></div>';
    var deskSearch=document.getElementById('searchInput'),pos=document.getElementById('positionFilter');
    document.getElementById('fieldPlayerSearch').addEventListener('input',function(){if(deskSearch){deskSearch.value=this.value;deskSearch.dispatchEvent(new Event('input',{bubbles:true}));}});
    document.getElementById('fieldPosSeg').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;this.querySelectorAll('button').forEach(function(x){x.classList.toggle('on',x===b);});if(pos){pos.value=b.dataset.v||'';pos.dispatchEvent(new Event('change',{bubbles:true}));}});
    function sync(){
      var list=document.querySelector('#playersContainer .cv9-mobile-player-list');
      var out=document.getElementById('fieldPlayerList');
      if(list&&out){out.innerHTML=list.innerHTML;return;}
      var rows=document.querySelectorAll('#playersContainer tbody tr');
      if(rows.length&&out){
        out.innerHTML=Array.prototype.slice.call(rows,0,8).map(function(r){
          var c=r.querySelectorAll('td'),nm=c[0]?c[0].textContent.trim():'Player',posn=c[1]?c[1].textContent.trim():'',ev=c[7]?c[7].textContent.trim():'';
          return '<div class="rowline" style="padding:7px 0;border-bottom:1px solid var(--ln)"><span class="avm">'+esc(initials(nm))+'</span><span class="who"><b>'+esc(nm)+'</b><span>'+esc(posn)+'</span></span><span class="mut">'+esc(ev)+'</span></div>';
        }).join('');
      }
    }
    sync();var pc=document.getElementById('playersContainer');if(pc)new MutationObserver(sync).observe(pc,{childList:true,subtree:true});
  }

  function match(){
    var f=field();if(!f)return;
    f.innerHTML=mobileHeader('Match Facts','Drafts resume automatically','')+
      '<div id="fieldMatchHost"></div>';
    var host=document.getElementById('fieldMatchHost'),steps=document.getElementById('stepIndicator'),content=document.getElementById('stepContent');
    if(steps)steps.classList.add('wiz');
    function sync(){
      if(!content)return;
      host.innerHTML='<div class="card rule">'+content.innerHTML+'</div>';
    }
    sync();if(content)new MutationObserver(sync).observe(content,{childList:true,subtree:true,characterData:true});
  }

  function fixtures(){
    var f=field();if(!f)return;
    f.innerHTML=mobileHeader('Fixtures','Agenda · Match Facts state','<button class="bt sm spend" id="fieldAddFixture">Add</button>')+
      '<div class="stack"><div class="card rule"><div class="ck">Upcoming</div><div id="fieldUpcoming"></div></div><div class="card rule"><div class="ck">Completed</div><div id="fieldPast"></div></div>'+
      '<div class="field-desktop-handoff"><b>On Coach Desk:</b> season CSV fixture import and bulk review.</div></div>';
    function sync(id,to){var s=document.getElementById(id),d=document.getElementById(to);if(s&&d)d.innerHTML=s.innerHTML;}
    sync('upcomingList','fieldUpcoming');sync('pastList','fieldPast');
    ['upcomingList','pastList'].forEach(function(id){var n=document.getElementById(id);if(n)new MutationObserver(function(){sync(id,id==='upcomingList'?'fieldUpcoming':'fieldPast');}).observe(n,{childList:true,subtree:true});});
    var add=document.getElementById('fieldAddFixture');if(add)add.onclick=function(){var btn=document.getElementById('toggleAddBtn');if(btn)btn.click();window.scrollTo({top:0,behavior:'smooth'});};
  }

  function generic(label,sub){
    var f=field();if(!f)return;
    f.innerHTML=mobileHeader(label,sub||team(),'')+'<div class="stack"><div class="card rule" id="fieldGenericHost"></div></div>';
    var desk=document.getElementById('coachExactDeskBody'),host=document.getElementById('fieldGenericHost');
    function sync(){if(desk&&host)host.innerHTML=desk.innerHTML;}
    sync();
  }

  function deskOnly(label,copy,href){
    var f=field();if(!f)return;
    f.innerHTML=mobileHeader(label,team(),'')+'<div class="stack"><div class="card rule"><div class="ck">Coach Desk</div><h3 style="margin:5px 0 4px">'+esc(label)+' is a Desk task.</h3><p class="mut">'+esc(copy)+'</p><a class="bt pri blk" style="margin-top:10px" href="'+esc(href||location.pathname)+'">Open on Coach Desk</a></div></div>';
  }

  function render(){
    if(innerWidth>760)return;
    var k=key();
    if(k==='dashboard')dashboard();
    else if(k==='my-players')squad();
    else if(k==='match-facts')match();
    else if(k==='fixtures')fixtures();
    else if(k==='bulk-add-players')deskOnly('Bulk Import','The full row-review table stays on Coach Desk. The same draft and imported squad remain available there.',location.pathname);
    else if(k==='settings')deskOnly('Settings','Coach invites, password changes and the Danger Zone stay on Coach Desk.',location.pathname);
    else if(k==='chat'||k==='notifications')generic('Inbox',k==='chat'?'Player conversations':'Notifications');
    else if(k==='video-reels')generic('Video Reels','Review clips and upload links');
    else if(k==='report-a-concern')generic('Report a concern','Stratex trust & safeguarding');
    else if(k==='profile')generic('Player card','Evidence record');
    else if(k==='add-player')generic('Add player','Four-stage player wizard');
  }

  function openMore(){
    var old=document.getElementById('coachFieldMoreSheet');if(old){old.remove();return;}
    var s=document.createElement('section');s.id='coachFieldMoreSheet';s.className='sheetm';s.innerHTML='<div class="grab"></div><div class="stack">'+
      '<a class="rowline" href="/coach/video-reels"><span class="who"><b>Video Reels</b><span>Review clips and upload links</span></span><span>›</span></a>'+
      '<a class="rowline" href="/coach/fixtures"><span class="who"><b>Fixtures</b><span>Agenda and Match Facts state</span></span><span>›</span></a>'+
      '<a class="rowline" href="/coach/add-player"><span class="who"><b>Add Player</b><span>The four-stage wizard</span></span><span>›</span></a>'+
      '<a class="rowline" href="/coach/settings"><span class="who"><b>Settings</b><span>Deep settings continue on Coach Desk</span></span><span>›</span></a>'+
      '<a class="rowline" href="/coach/report-a-concern"><span class="who"><b style="color:var(--rd)">Report a Concern</b><span>Reviewed by the Stratex trust team</span></span><span>›</span></a>'+
      '<div class="field-desktop-handoff"><b>On Coach Desk:</b> Bulk Import · CSV fixtures · full My Players table · coach invites · Change Password · the Danger Zone.</div>'+
      '<button class="bt gh blk" type="button" data-coach-signout>Sign out</button></div>';
    document.body.appendChild(s);
  }

  return{render:render,openMore:openMore};
}());
