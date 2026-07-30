
'use strict';

/*
 * ScoutLink functional repairs V1.
 *
 * This file deliberately leaves the approved V10 and Coach profile markup
 * untouched. It binds the existing controls inside the V10 Shadow DOM and
 * corrects value presentation without changing page structure.
 */
(function () {
  var VERSION = '20260730.1-functional-repairs';
  var API_FALLBACK = 'https://scoutlink-api.vercel.app';
  var STYLE_ID = 'slFunctionalRepairsStyle';
  var boundRoots = new WeakSet();
  var playerCache = null;
  var profileCache = null;

  function path() {
    return String(location.pathname || '/').replace(/\/+$/, '') || '/';
  }
  function normal(value) {
    return String(value == null ? '' : value).trim().toLowerCase().replace(/\s+/g, ' ');
  }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
    });
  }
  function num(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : (fallback == null ? 0 : fallback);
  }
  function token() {
    try { return localStorage.getItem('sl_token') || ''; } catch (_) { return ''; }
  }
  function isPublicDemo() {
    try {
      return sessionStorage.getItem('sl_public_demo') === '1' || token() === 'public-demo-session';
    } catch (_) { return token() === 'public-demo-session'; }
  }
  function isCoach() {
    try {
      return String((window.Auth && window.Auth.type) || localStorage.getItem('sl_type') || '').toLowerCase() === 'coach';
    } catch (_) { return false; }
  }
  function apiBase() {
    try { return String(window.API || localStorage.getItem('sl_api_url') || API_FALLBACK).replace(/\/+$/, ''); }
    catch (_) { return API_FALLBACK; }
  }
  async function request(method, pathname, body, auth) {
    var headers = {Accept:'application/json'};
    var access = token();
    if (auth !== false && access) headers.Authorization = 'Bearer ' + access;
    if (body != null) headers['Content-Type'] = 'application/json';
    var response = await fetch(apiBase() + pathname, {
      method:method,
      headers:headers,
      credentials:'include',
      cache:'no-store',
      body:body == null ? undefined : JSON.stringify(body)
    });
    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(payload.error || payload.message || 'The request could not be completed.');
    return payload;
  }
  function rootHost() { return document.getElementById('scoutExperienceApp'); }
  function shadow() { var host = rootHost(); return host && host.shadowRoot; }
  function q(root, selector) { return (root || shadow() || document).querySelector(selector); }
  function qa(root, selector) { return Array.prototype.slice.call((root || shadow() || document).querySelectorAll(selector)); }
  function visibleCopy(root) {
    return matchMedia('(max-width:767px)').matches
      ? q(root, '.slv10-mobile-copy')
      : q(root, '.slv10-desktop-copy');
  }
  function currentRoute() {
    var declared = document.body && document.body.getAttribute('data-scout-route');
    if (declared) return declared;
    var p = path();
    if (p.indexOf('/player/profile') === 0) return 'profile';
    if (p.indexOf('/scout/rankings') === 0) return 'rankings';
    if (p.indexOf('/scout/fixtures') === 0) return 'fixtures';
    if (p.indexOf('/scout/predictions') === 0) return 'predictions';
    if (p.indexOf('/scout/exports') === 0) return 'exports';
    if (p.indexOf('/scout/compare-players') === 0) return 'compare';
    if (p.indexOf('/scout/setup') === 0) return 'setup';
    if (p.indexOf('/scout/usage-requests') === 0) return 'usage';
    return '';
  }
  function playerName(p) {
    return [p && p.first_name, p && p.last_name].filter(Boolean).join(' ') || (p && p.name) || 'Player';
  }
  function playerLine(p) {
    return [p && (p.specific_position || p.primary_position || p.position_group), p && p.age_group, p && (p.team_name || (p.team && p.team.team_name))].filter(Boolean).join(' · ');
  }
  function playerIdFromUrl() { return new URLSearchParams(location.search).get('id') || ''; }
  function demoKey(name) { return 'sl_functional_demo_' + name; }
  function demoRows(name) {
    try { return JSON.parse(sessionStorage.getItem(demoKey(name)) || '[]') || []; } catch (_) { return []; }
  }
  function saveDemo(name, row) {
    var rows = demoRows(name); rows.unshift(row);
    try { sessionStorage.setItem(demoKey(name), JSON.stringify(rows.slice(0, 100))); } catch (_) {}
    return row;
  }

  async function loadPlayers(force) {
    if (playerCache && !force) return playerCache;
    var endpoint = isPublicDemo() ? '/api/players/public-demo' : '/api/scout-intelligence-v64/players';
    var response;
    try { response = await request('GET', endpoint, null, !isPublicDemo()); }
    catch (error) {
      if (!isPublicDemo()) throw error;
      response = await request('GET', '/api/scout-intelligence-v64/players', null, true);
    }
    playerCache = response.data || response.players || [];
    return playerCache;
  }
  async function loadProfile() {
    var id = playerIdFromUrl();
    if (profileCache && (!id || String(profileCache.player && profileCache.player.id) === String(id))) return profileCache;
    if (!id) {
      var players = await loadPlayers();
      id = players[0] && players[0].id;
    }
    if (!id) throw new Error('No player is available.');
    try {
      profileCache = await request('GET', '/api/players/' + encodeURIComponent(id), null, true);
    } catch (_) {
      var rows = await loadPlayers();
      profileCache = {player:rows.find(function (p) { return String(p.id) === String(id); }) || rows[0], videos:[], upcomingFixtures:[], recentMatches:[]};
    }
    return profileCache;
  }

  function addStyle(root) {
    if (!root || root.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.slv10-exact-root .blurred-role-output,.slv10-exact-root .sl-role-locked{filter:blur(7px)!important;user-select:none!important;pointer-events:none!important}',
      '.slv10-exact-root .sl-role-revealed{filter:none!important;user-select:text!important;pointer-events:auto!important}',
      '.slv10-exact-root .slfr-modal{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;padding:18px;background:rgba(6,22,37,.68)}',
      '.slv10-exact-root .slfr-modal-box{width:min(720px,100%);max-height:calc(100dvh - 36px);overflow:auto;border:1px solid #dbe4e9;background:#fff;color:#07141f;box-shadow:0 24px 70px rgba(6,22,37,.25)}',
      '.slv10-exact-root .slfr-modal-head{min-height:62px;padding:14px 17px;border-bottom:1px solid #dbe4e9;display:flex;align-items:center;justify-content:space-between;gap:12px}',
      '.slv10-exact-root .slfr-modal-head h3{margin:0;font-size:17px}.slv10-exact-root .slfr-close{min-height:36px;padding:0 11px;border:1px solid #dbe4e9;background:#fff;font-weight:900}',
      '.slv10-exact-root .slfr-modal-body{padding:17px}.slv10-exact-root .slfr-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
      '.slv10-exact-root .slfr-field{display:grid;gap:6px}.slv10-exact-root .slfr-field.wide{grid-column:1/-1}.slv10-exact-root .slfr-field span{font-size:9px;font-weight:900}',
      '.slv10-exact-root .slfr-field input,.slv10-exact-root .slfr-field select,.slv10-exact-root .slfr-field textarea{width:100%;min-height:42px;padding:9px;border:1px solid #c8d4da;background:#fff;color:#07141f;font:inherit}',
      '.slv10-exact-root .slfr-field textarea{min-height:92px;resize:vertical}.slv10-exact-root .slfr-actions{margin-top:16px;display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}',
      '.slv10-exact-root .slfr-video-list{display:grid;gap:9px}.slv10-exact-root .slfr-video{padding:12px;border:1px solid #dbe4e9;display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center}',
      '.slv10-exact-root .slfr-select{width:100%;min-height:39px;border:0;background:transparent;color:inherit;font:inherit;font-weight:800;outline:none}',
      '.slv10-exact-root .slfr-empty-selection{color:#71818a!important;font-style:normal!important}',
      '@media(max-width:767px){.slv10-exact-root .slfr-grid{grid-template-columns:1fr}.slv10-exact-root .slfr-modal{padding:10px}.slv10-exact-root .slfr-actions{display:grid;grid-template-columns:1fr}.slv10-exact-root .slfr-actions .btn{width:100%}}'
    ].join('');
    root.appendChild(style);
  }
  function toast(root, message, error) {
    var old = q(root, '.slfr-toast'); if (old) old.remove();
    var node = document.createElement('div');
    node.className = 'slv10-toast slfr-toast' + (error ? ' error' : '');
    node.setAttribute('role', error ? 'alert' : 'status'); node.textContent = message;
    (q(root, '.slv10-exact-root') || root).appendChild(node);
    setTimeout(function () { node.remove(); }, 3800);
  }
  function modal(root, title, html, bind) {
    var old = q(root, '.slfr-modal'); if (old) old.remove();
    var wrap = document.createElement('div'); wrap.className='slfr-modal';
    wrap.innerHTML='<section class="slfr-modal-box" role="dialog" aria-modal="true"><header class="slfr-modal-head"><h3>'+esc(title)+'</h3><button class="slfr-close" type="button">Close</button></header><div class="slfr-modal-body">'+html+'</div></section>';
    (q(root, '.slv10-exact-root') || root).appendChild(wrap);
    function close(){ wrap.remove(); }
    q(wrap,'.slfr-close').onclick=close;
    wrap.addEventListener('click',function(e){if(e.target===wrap)close();});
    if(bind) bind(wrap,close);
    return wrap;
  }
  function field(label, control, wide) { return '<label class="slfr-field'+(wide?' wide':'')+'"><span>'+esc(label)+'</span>'+control+'</label>'; }
  function actionButton(label, attr) { return '<button class="btn primary" type="button" '+attr+'>'+esc(label)+'</button>'; }
  function download(filename, mime, content) {
    var blob = new Blob([content],{type:mime||'text/plain'}); var url=URL.createObjectURL(blob); var a=document.createElement('a');
    a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);
  }
  function downloadBase64(filename,mime,base64){
    var binary=atob(base64||''), bytes=new Uint8Array(binary.length); for(var i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    var url=URL.createObjectURL(new Blob([bytes],{type:mime||'application/octet-stream'})); var a=document.createElement('a');a.href=url;a.download=filename||'download';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);
  }

  function roleOutputNodes(root) {
    return qa(root,'.role-results>div').filter(function (box) {
      var label=normal(q(box,'span') && q(box,'span').textContent);
      return label==='best current role'||label==='best future role'||label==='target role'||label==='role-fit score';
    }).map(function(box){return q(box,'b');}).filter(Boolean);
  }
  function lockRoles(root, playerId) {
    var revealed=false; try{revealed=sessionStorage.getItem('sl_position_fit_revealed_'+playerId)==='1';}catch(_){}
    roleOutputNodes(root).forEach(function(node){node.classList.toggle('sl-role-revealed',revealed);node.classList.toggle('sl-role-locked',!revealed);node.classList.toggle('blurred-role-output',!revealed);});
  }
  function revealRoles(root, result, player, target) {
    var outputs=roleOutputNodes(root);
    var current=result.bestCurrentRole||result.currentRole||result.position||player.specific_position||player.primary_position||'Current role';
    var future=result.bestFutureRole||result.futureRole||result.projectedRole||current;
    var score=Math.round(num(result.roleFitScore||result.targetScore||result.score||player.overall_rating,0));
    var values=[current,future,target||current,score+' / 100'];
    outputs.forEach(function(node,index){node.textContent=values[index]||'—';node.classList.remove('blurred-role-output','sl-role-locked');node.classList.add('sl-role-revealed');});
    try{sessionStorage.setItem('sl_position_fit_revealed_'+player.id,'1');}catch(_){}
  }
  function displayAttribute(raw) {
    var n=num(raw,0); if(n>0&&n<=10) return {bar:Math.max(0,Math.min(100,n*10)),label:Number.isInteger(n)?String(n):n.toFixed(1)};
    var scaled=Math.max(0,Math.min(100,n)); return {bar:scaled,label:(scaled/10).toFixed(scaled%10===0?0:1)};
  }
  async function repairProfile(root) {
    var bundle=await loadProfile(); var player=bundle.player||{}; lockRoles(root,player.id);
    var attrs={pace:player.pace,agility:player.agility,strength:player.strength,stamina:player.stamina,shooting:player.shooting,passing:player.passing,dribbling:player.dribbling,defending:player.defending,composure:player.composure,crossing:player.crossing,vision:player.vision,positioning:player.positioning,heading:player.heading,tackling:player.tackling,jumping:player.jumping};
    qa(root,'.bar-row').forEach(function(row){var label=normal(q(row,'span')&&q(row,'span').textContent);if(!(label in attrs)||attrs[label]==null)return;var v=displayAttribute(attrs[label]);var bar=q(row,'em');var out=q(row,'b');if(bar)bar.style.width=v.bar+'%';if(out)out.textContent=v.label;});

    var selected='Position fit';
    function selectPrediction(button){selected=String(button.textContent||'').split(/Test|Assess|Model|Review/)[0].trim()||'Position fit';qa(root,'.prediction-type').forEach(function(x){x.classList.toggle('active',x===button);});renderPredictionInputs();}
    function predictionPanel(){return qa(root,'.prediction-analysis-panel').find(function(p){return p.offsetParent!==null;})||q(root,'.prediction-analysis-panel');}
    function renderPredictionInputs(){var panel=predictionPanel();if(!panel)return;var controls=qa(panel,'.field');var definitions={
      'Position fit':[['Target role','select',['Centre Forward','Striker','Left Winger','Right Winger','Attacking Midfielder','Central Midfielder','Defensive Midfielder','Centre Back','Full Back','Goalkeeper']]],
      'Match scenario':[['Target scenario','select',['High press against low block','Protect a one-goal lead','Chasing a goal','Counter-attacking transition','Defending wide overloads']]],
      'Development projection':[['Development focus','select',['Balanced growth','Technical quality','Physical development','Tactical intelligence','Match output']]],
      'ROI and value':[['Budget','number',[]]]
    }[selected]||[];
    controls.forEach(function(c,i){if(i>=definitions.length){c.style.display='none';return;}c.style.display='grid';var d=definitions[i], label=q(c,'span');if(label)label.textContent=d[0];var ctl=q(c,'.control');if(!ctl)return;if(d[1]==='select')ctl.innerHTML='<select class="slfr-select">'+d[2].map(function(v){return'<option>'+esc(v)+'</option>';}).join('')+'</select><i>⌄</i>';else ctl.innerHTML='<input class="slfr-select" type="number" min="0" step="1000" value="350000">';});}
    qa(root,'.prediction-type').forEach(function(btn){btn.dataset.slfr='1';btn.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();selectPrediction(btn);},true);});
    renderPredictionInputs();

    qa(root,'button').forEach(function(btn){var label=normal(btn.textContent);if(label==='run prediction analysis'){
      btn.dataset.slfr='1';btn.addEventListener('click',async function(e){e.preventDefault();e.stopImmediatePropagation();var panel=predictionPanel(), selects=qa(panel,'select,input'), input={};if(selected==='Position fit')input.targetPosition=selects[0]&&selects[0].value||player.specific_position;if(selected==='Match scenario')input.scenarioKey=selects[0]&&selects[0].value;if(selected==='Development projection')input.focus=selects[0]&&selects[0].value;if(selected==='ROI and value')input.budget=num(selects[0]&&selects[0].value,350000);var original=btn.textContent;btn.disabled=true;btn.textContent='Running…';try{var result;if(isPublicDemo()){result={recommendation:'Validate this output through live football evidence.',summary:selected+' completed from the current demo evidence.',score:Math.max(55,num(player.overall_rating,75)),bestCurrentRole:player.specific_position||player.primary_position||'Centre Forward',bestFutureRole:input.targetPosition||player.specific_position||'Left Winger',roleFitScore:Math.max(55,num(player.overall_rating,75))};saveDemo('predictions',{id:'demo-'+Date.now(),player_id:player.id,prediction_type:selected,result:result,created_at:new Date().toISOString()});}else{var apiType={'Position fit':'Position Fit Projection','Match scenario':'Match Scenario Prediction','Development projection':'Attribute Development','ROI and value':'ROI Analysis'}[selected]||selected;var response=await request('POST','/api/predictions/run',{playerId:player.id,predictionType:apiType,inputParams:input});result=response.result||response;}if(selected==='Position fit')revealRoles(root,result,player,input.targetPosition);modal(root,selected+' result','<h3 style="margin:0">'+esc(result.recommendation||'Prediction completed')+'</h3><p style="margin-top:9px">'+esc(result.summary||'Review the output with live football evidence.')+'</p><div class="slfr-actions">'+actionButton('Record decision','data-prediction-decision')+'</div>',function(m){q(m,'[data-prediction-decision]').onclick=function(){m.remove();openDecision(root,player);};});toast(root,selected+' completed.');}catch(error){toast(root,error.message,true);}finally{btn.disabled=false;btn.textContent=original;}},true);
    }});

    bindProfileButtons(root,bundle);
  }

  function openVideos(root,bundle){var rows=bundle.videos||bundle.playerVideos||[];var html=rows.length?'<div class="slfr-video-list">'+rows.map(function(v){var url=v.video_url||v.signed_url||v.url||v.file_url||'';return'<article class="slfr-video"><div><b>'+esc(v.title||'Video reel')+'</b><p>'+esc(v.category||v.description||'Approved player video')+'</p></div>'+(url?'<a class="btn primary" target="_blank" rel="noopener" href="'+esc(url)+'">Watch</a>':'<button class="btn" type="button" disabled>No playable link</button>')+'</article>';}).join('')+'</div>':'<p>No approved video reels are connected to this player yet.</p>';modal(root,'Player video reels',html);}
  function openWatch(root,p){modal(root,'Watch meaningful player changes','<div class="slfr-grid">'+field('Reason','<textarea id="slWatchReason" placeholder="What change would affect the decision?"></textarea>',true)+field('Minimum overall','<input id="slWatchOverall" type="number" min="0" max="100" value="80">')+field('Minimum evidence','<input id="slWatchEvidence" type="number" min="0" max="100" value="70">')+'</div><div class="slfr-actions">'+actionButton('Save player watch','data-save-watch')+'</div>',function(m,close){q(m,'[data-save-watch]').onclick=async function(){var payload={playerId:p.id,reason:q(m,'#slWatchReason').value.trim()||'Monitor meaningful player changes.',thresholds:{minOverall:num(q(m,'#slWatchOverall').value),minEvidence:num(q(m,'#slWatchEvidence').value),anyProfileUpdate:true,newMatchFacts:true}};try{if(isPublicDemo())saveDemo('watches',Object.assign({id:'demo-'+Date.now()},payload));else await request('POST','/api/scout-intelligence/watches',payload);close();toast(root,'Player watch saved.');}catch(error){toast(root,error.message,true);}};});}
  function openObservation(root,p){modal(root,'Add live observation','<div class="slfr-grid">'+field('Observation date','<input id="slObsDate" type="datetime-local">')+field('Recommendation','<select id="slObsRec"><option>Prioritise</option><option>Shortlist</option><option>Monitor</option><option>Do not progress</option></select>')+field('Objective','<textarea id="slObsObjective"></textarea>',true)+field('Technical and tactical notes','<textarea id="slObsNotes"></textarea>',true)+field('Follow-up action','<input id="slObsFollow" placeholder="Example: observe the next fixture">',true)+'</div><div class="slfr-actions">'+actionButton('Save observation','data-save-observation')+'</div>',function(m,close){q(m,'[data-save-observation]').onclick=async function(){var payload={playerId:p.id,observationDate:q(m,'#slObsDate').value||new Date().toISOString(),objective:q(m,'#slObsObjective').value,technicalNotes:q(m,'#slObsNotes').value,recommendation:q(m,'#slObsRec').value,followUpAction:q(m,'#slObsFollow').value,structuredRatings:{}};try{if(isPublicDemo())saveDemo('observations',Object.assign({id:'demo-'+Date.now()},payload));else await request('POST','/api/scout-intelligence/observations',payload);close();toast(root,'Live observation saved.');}catch(error){toast(root,error.message,true);}};});}
  function openDecision(root,p){modal(root,'Record recruitment decision','<div class="slfr-grid">'+field('Decision','<select id="slDecision"><option>Prioritise</option><option>Shortlist</option><option>Trial before deciding</option><option>Monitor</option><option>Do not progress</option></select>')+field('Primary reason','<select id="slReason"><option value="team_fit">Team fit</option><option value="position_fit">Position fit</option><option value="evidence">Evidence confidence</option><option value="financial">Financial fit</option><option value="risk">Recruitment risk</option></select>')+field('Decision rationale','<textarea id="slRationale"></textarea>',true)+field('Next action','<input id="slNext">')+field('Due date','<input id="slDue" type="date">')+'</div><div class="slfr-actions">'+actionButton('Save decision','data-save-decision')+'</div>',function(m,close){q(m,'[data-save-decision]').onclick=async function(){var rationale=q(m,'#slRationale').value.trim();if(!rationale)return toast(root,'Add a decision rationale.',true);var payload={playerId:p.id,decision:q(m,'#slDecision').value,reasonCode:q(m,'#slReason').value,rationale:rationale,nextAction:q(m,'#slNext').value,dueAt:q(m,'#slDue').value||null,context:{source:'profile'}};try{if(isPublicDemo())saveDemo('decisions',Object.assign({id:'demo-'+Date.now()},payload));else await request('POST','/api/scout-intelligence/decisions',payload);close();toast(root,'Recruitment decision saved.');}catch(error){toast(root,error.message,true);}};});}
  function bindProfileButtons(root,bundle){var p=bundle.player||{};qa(root,'button').forEach(function(btn){var label=normal(btn.textContent);var fn=null;if(/watch all videos|watch videos|watch video reels/.test(label))fn=function(){openVideos(root,bundle);};else if(label==='watch player')fn=function(){openWatch(root,p);};else if(label==='add observation')fn=function(){openObservation(root,p);};else if(label==='record decision')fn=function(){openDecision(root,p);};if(fn){btn.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();fn();},true);}});}

  function optionsForRanking(){return {types:['Top goalscorers','Goals per game','Top assists','Assists per game','Most clean sheets','Clean sheets per game','Most sought after','Overall rating','Current readiness','Development potential','Evidence confidence','Financial value','Team fit'],positions:['All positions','GK','CB','RB','LB','CDM','CM','CAM','LW','RW','CF','ST'],ages:['All ages','U7','U8','U9','U10','U11','U12','U13','U14','U15','U16'],regions:['All regions','London','Manchester']};}
  function installSelect(control,values){if(!control)return null;var select=document.createElement('select');select.className='slfr-select';select.innerHTML=values.map(function(v){return'<option>'+esc(v)+'</option>';}).join('');control.innerHTML='';control.appendChild(select);return select;}
  async function repairRankings(root){var players=await loadPlayers();var opt=optionsForRanking();qa(root,'.rank-filters').forEach(function(bar){var controls=qa(bar,'.control');var selects=[installSelect(controls[0],opt.types),installSelect(controls[1],opt.positions),installSelect(controls[2],opt.ages),installSelect(controls[3],opt.regions)];function metric(p,type){var apps=Math.max(1,num(p.appearances,0));if(type==='Top goalscorers')return num(p.goals);if(type==='Goals per game')return num(p.goals)/apps;if(type==='Top assists')return num(p.assists);if(type==='Assists per game')return num(p.assists)/apps;if(type==='Most clean sheets')return num(p.clean_sheets);if(type==='Clean sheets per game')return num(p.clean_sheets)/apps;if(type==='Financial value')return num(p.transfer_value);if(type==='Evidence confidence')return num(p.evidence_score,50);if(type==='Development potential')return Math.min(100,num(p.overall_rating,70)+7);if(type==='Current readiness')return num(p.overall_rating,70);if(type==='Team fit')return num(p.compatibilityScore,0);return num(p.overall_rating,0);}function render(){var type=selects[0].value,pos=selects[1].value,age=selects[2].value,region=selects[3].value;var rows=players.filter(function(p){return(pos==='All positions'||String(p.specific_position||p.primary_position||p.position_group).toUpperCase()===pos)&&(age==='All ages'||p.age_group===age)&&(region==='All regions'||String(p.region||p.team_city||'')===region);}).sort(function(a,b){return metric(b,type)-metric(a,type);}).slice(0,20);var copy=bar.closest('.slv10-desktop-copy,.slv10-mobile-copy');var podium=q(copy,'.podium');if(podium)podium.innerHTML=rows.slice(0,3).map(function(p){return'<article data-open-player="'+esc(p.id)+'"><span class="initials-box">'+esc(playerName(p).split(/\s+/).map(function(x){return x[0]}).slice(0,2).join(''))+'</span><h4>'+esc(playerName(p))+'</h4><p>'+esc(playerLine(p))+'</p><strong>'+esc(Math.round(metric(p,type)*100)/100)+' '+esc(type.replace(/^Top /,''))+'</strong></article>';}).join('');var list=q(copy,'.rank-list,.ranking-mobile-list');if(list)list.innerHTML=rows.map(function(p,i){return'<button class="rank-row mobile-list-row" type="button" data-open-player="'+esc(p.id)+'"><span class="rank-no">'+(i+1)+'</span><div><b>'+esc(playerName(p))+'</b><small>'+esc(playerLine(p))+'</small></div><strong>'+esc(Math.round(metric(p,type)*100)/100)+'</strong><i>›</i></button>';}).join('');qa(copy,'[data-open-player]').forEach(function(n){n.onclick=function(){location.href='/player/profile?id='+encodeURIComponent(n.dataset.openPlayer);};});}selects.forEach(function(s){s.onchange=render;});var update=qa(bar.closest('.slv10-desktop-copy,.slv10-mobile-copy'),'button').find(function(b){return normal(b.textContent)==='update ranking';});if(update)update.onclick=render;render();});}

  async function loadFixtures(){try{var r=await request('GET','/api/scout-intelligence/fixtures');return r.data||[];}catch(_){return [];}}
  function fixtureRecord(row){return row.fixture||row;}
  function fixturePlayer(row,players){return row.player||players.find(function(p){return String(p.id)===String(row.player_id||fixtureRecord(row).player_id);})||players[0]||{};}
  async function fixtureWorkflow(root,row,assignOnly){var players=await loadPlayers(),f=fixtureRecord(row),p=fixturePlayer(row,players),members=[];try{members=(await request('GET','/api/scout-intelligence-v64/team-members')).data||[];}catch(_){}if(!members.length)members=[{id:'current',first_name:'Current',last_name:'scout'}];modal(root,assignOnly?'Assign scout':'Plan live-scouting visit','<div class="slfr-grid">'+field('Fixture','<input value="'+esc((f.opponent_name||f.opponent||'Opponent')+' · '+(f.fixture_date||'Date TBC'))+'" readonly>',true)+field('Assigned scout','<select id="slFixtureScout">'+members.map(function(m){return'<option value="'+esc(m.id)+'">'+esc([m.first_name,m.last_name].filter(Boolean).join(' ')||'Scout')+'</option>';}).join('')+'</select>')+field('Observation objective','<textarea id="slFixtureObjective">'+(assignOnly?'Observe the agreed player evidence objective.':'Test the player against the current recruitment question.')+'</textarea>',true)+field('Priority','<select id="slFixturePriority"><option value="90">High</option><option value="60" selected>Medium</option><option value="30">Low</option></select>')+'</div><div class="slfr-actions">'+actionButton(assignOnly?'Assign scout and notify':'Save plan and notify coach','data-save-fixture')+'</div>',function(m,close){q(m,'[data-save-fixture]').onclick=async function(){var payload={fixtureId:f.id,playerId:p.id,assignedScoutId:q(m,'#slFixtureScout').value==='current'?null:q(m,'#slFixtureScout').value,priority:num(q(m,'#slFixturePriority').value,60),objective:q(m,'#slFixtureObjective').value,status:'planned'};try{if(isPublicDemo())saveDemo('fixture-plans',Object.assign({id:'demo-'+Date.now()},payload));else await request('POST','/api/scout-workflow-actions/fixture-plan',payload);close();toast(root,assignOnly?'Scout assigned and notified.':'Visit planned and the player coach will be notified.');}catch(error){toast(root,error.message,true);}};});}
  async function repairFixtures(root){var rows=await loadFixtures();var copies=qa(root,'.slv10-desktop-copy,.slv10-mobile-copy');copies.forEach(function(copy){var planButtons=qa(copy,'button').filter(function(b){return normal(b.textContent)==='plan visit';});planButtons.forEach(function(btn,index){btn.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();fixtureWorkflow(root,rows[index%Math.max(1,rows.length)]||{},false);},true);});var assignButtons=qa(copy,'button').filter(function(b){return normal(b.textContent)==='assign scout';});assignButtons.forEach(function(btn,index){btn.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();fixtureWorkflow(root,rows[index%Math.max(1,rows.length)]||{},true);},true);});var settings=qa(copy,'button').find(function(b){return normal(b.textContent)==='calendar settings';});if(settings)settings.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();modal(root,'Calendar settings','<div class="slfr-grid">'+field('Week starts','<select id="slWeekStart"><option>Monday</option><option>Sunday</option></select>')+field('Default view','<select id="slCalView"><option>Month</option><option>Agenda</option></select>')+field('Fixture notifications','<select id="slCalAlerts"><option>On</option><option>Off</option></select>')+'</div><div class="slfr-actions">'+actionButton('Save settings','data-save-calendar')+'</div>',function(m,close){q(m,'[data-save-calendar]').onclick=function(){try{localStorage.setItem('sl_scout_calendar_settings',JSON.stringify({weekStart:q(m,'#slWeekStart').value,view:q(m,'#slCalView').value,alerts:q(m,'#slCalAlerts').value}));}catch(_){}close();toast(root,'Calendar settings saved.');};});},true);});}

  async function predictionRows(){if(isPublicDemo())return demoRows('predictions');try{var r=await request('GET','/api/scouts/predictions');return r.data||[];}catch(_){return [];}}
  async function repairPredictions(root){var rows=await predictionRows();qa(root,'button').forEach(function(btn){var label=normal(btn.textContent);if(label==='export history'){btn.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();var csv=['Player,Prediction,Result,Date'].concat(rows.map(function(r){var result=r.result||{};return[JSON.stringify(playerName(r.players||{})),JSON.stringify(r.prediction_type||'Prediction'),JSON.stringify(result.recommendation||result.summary||''),JSON.stringify(r.created_at||r.run_at||'')].join(',');})).join('\n');download('scoutlink-prediction-history.csv','text/csv',csv);toast(root,'Prediction history downloaded.');},true);}});var opens=qa(root,'button').filter(function(b){return normal(b.textContent)==='open'||normal(b.textContent)==='open result';});opens.forEach(function(btn,index){btn.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();var r=rows[index]||{},result=r.result||{};modal(root,r.prediction_type||'Prediction result','<h3 style="margin:0">'+esc(result.recommendation||result.summary||'Prediction result')+'</h3><p style="margin-top:9px">'+esc(result.summary||'Review the saved prediction evidence and context.')+'</p><div class="slfr-actions">'+actionButton('Export prediction','data-export-result')+'</div>',function(m){q(m,'[data-export-result]').onclick=function(){download('prediction-'+(index+1)+'.txt','text/plain',(r.prediction_type||'Prediction')+'\n\n'+(result.recommendation||result.summary||''));};});},true);});}

  async function reportRows(){if(isPublicDemo())return demoRows('reports');try{var r=await request('GET','/api/scout-intelligence/reports');return r.data||[];}catch(_){return [];}}
  async function repairExports(root){var rows=await reportRows();var buttons=qa(root,'button').filter(function(b){return normal(b.textContent)==='download';});buttons.forEach(function(btn,index){btn.addEventListener('click',async function(e){e.preventDefault();e.stopImmediatePropagation();var row=rows[index]||{};try{if(isPublicDemo()){download((row.file_name||'scoutlink-demo-export-'+(index+1)+'.txt'),'text/plain',(row.title||'ScoutLink demo export')+'\nGenerated from the public demo.');toast(root,'Demo export downloaded.');return;}var playerId=row.subject_id||row.player_id||(row.player&&row.player.id);if(!playerId)throw new Error('This report is not connected to a player.');var response=await request('POST','/api/exports/player',{playerId:playerId,format:(row.config&&row.config.format)||row.format||'PDF',source:'report_history',existingReportId:row.id||null});if(!response.contentBase64)throw new Error('The export file was not returned.');downloadBase64(response.filename,response.mime,response.contentBase64);toast(root,'Export downloaded.');}catch(error){toast(root,error.message,true);}},true);});}

  async function repairCompare(root){var players=await loadPlayers();qa(root,'.compare-selection').forEach(function(section){var controls=qa(section,'.field .control');controls.slice(0,2).forEach(function(control,index){var sel=document.createElement('select');sel.className='slfr-select';sel.innerHTML='<option value="">Choose a player</option>'+players.map(function(p){return'<option value="'+esc(p.id)+'">'+esc(playerName(p))+'</option>';}).join('');control.innerHTML='';control.appendChild(sel);control.dataset.side=index===0?'a':'b';});qa(section,'.selected-player').forEach(function(box){box.innerHTML='<span class="slfr-empty-selection">Choose a player</span>';box.classList.add('empty-selection');delete box.dataset.playerId;});});var results=qa(root,'[data-comparison-results],.comparison-results,.comparison-output');results.forEach(function(r){r.hidden=true;r.classList.add('is-hidden');});var selectors=qa(root,'.compare-selection select');var run=qa(root,'button').find(function(b){return normal(b.textContent)==='compare and explain';});if(run)run.addEventListener('click',async function(e){e.preventDefault();e.stopImmediatePropagation();var a=selectors[0]&&selectors[0].value,b=selectors[1]&&selectors[1].value;if(!a||!b||a===b)return toast(root,'Choose two different players.',true);try{var endpoint=isPublicDemo()?'/api/scout-intelligence-v64/public-demo/compare':'/api/scout-intelligence-v64/compare';var response=await request('POST',endpoint,{playerAId:a,playerBId:b,contextKey:'immediate_starter'});modal(root,'Player comparison','<h3 style="margin:0">'+esc(response.result&&response.result.recommendation||'Comparison completed')+'</h3><p style="margin-top:9px">Decision margin: '+esc(response.result&&response.result.decisionScoreMargin||0)+'</p>');toast(root,'Comparison completed.');}catch(error){toast(root,error.message,true);}},true);var fresh=qa(root,'button').find(function(b){return normal(b.textContent)==='new comparison';});if(fresh)fresh.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();selectors.forEach(function(s){s.value='';});qa(root,'.selected-player').forEach(function(box){box.innerHTML='<span class="slfr-empty-selection">Choose a player</span>';});results.forEach(function(r){r.hidden=true;r.classList.add('is-hidden');});history.replaceState(null,'',location.pathname);},true);}

  function setupGroup(button){var grid=button.closest('.choice-grid');return grid||button.parentElement;}
  function repairSetup(root){qa(root,'.choice').forEach(function(btn){btn.disabled=false;btn.removeAttribute('aria-disabled');btn.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();var group=setupGroup(btn),selected=qa(group,'.choice.selected');if(!btn.classList.contains('selected')&&selected.length>=3)return toast(root,'Select up to three options in this section.',true);btn.classList.toggle('selected');var marker=q(btn,'span');if(marker)marker.textContent=btn.classList.contains('selected')?'✓':'';},true);});qa(root,'button').forEach(function(btn){var label=normal(btn.textContent);if(label==='save changes'||label==='save and apply'){btn.addEventListener('click',async function(e){e.preventDefault();e.stopImmediatePropagation();var data={choices:qa(root,'.choice.selected').map(function(x){var b=q(x,'b');return b?b.textContent.trim():x.textContent.replace('✓','').trim();}),fields:{}};qa(root,'.field').forEach(function(f){var l=q(f,'span'),c=q(f,'select,input');if(l&&c)data.fields[l.textContent.trim()]=c.value;});try{localStorage.setItem('sl_scout_setup_v6_4',JSON.stringify(data));if(!isPublicDemo())await request('POST','/api/scouts/setup',data);toast(root,'Scout setup saved and applied.');}catch(error){toast(root,error.message,true);}},true);}});}

  function refreshCoachProfileAssets(){if(path().indexOf('/player/profile')!==0||!isCoach())return;var cssId='coachProfileV4Css';if(!document.getElementById(cssId)){var link=document.createElement('link');link.id=cssId;link.rel='stylesheet';link.href='/frontend/css/coach-player-profile-v3.css?v=20260730-4';document.head.appendChild(link);}if(document.readyState==='loading'&&!document.getElementById('coachProfileV4Script')){var script=document.createElement('script');script.id='coachProfileV4Script';script.src='/frontend/js/coach-player-profile-v3.js?v=20260730-4';document.head.appendChild(script);}}
  function repairCoachUpload(){if(path().indexOf('/player/profile')!==0||!isCoach())return;document.addEventListener('click',async function(e){var btn=e.target.closest('#btnGenerateVideoUploadLink,[data-scroll-video]');if(!btn)return;e.preventDefault();e.stopImmediatePropagation();var playerId=playerIdFromUrl()||(window._profilePlayer&&window._profilePlayer.id);var output=document.getElementById('videoUploadLinkResult');if(!output){var section=document.getElementById('cp3Video');output=document.createElement('div');output.id='videoUploadLinkResult';if(section)section.appendChild(output);}var original=btn.textContent;btn.disabled=true;btn.textContent='Generating…';try{var url;if(isPublicDemo()){url=location.origin+'/video-upload?demo=1&playerId='+encodeURIComponent(playerId||'demo-player');}else{var response=await request('POST','/api/videos/upload-link',{playerId:playerId});url=(response.data||response).uploadUrl||(response.data||response).url;}if(!url)throw new Error('The upload link was not returned.');output.style.display='block';output.innerHTML='<label style="display:block;margin:10px 0 6px;font-size:10px;font-weight:900">Private upload link</label><div style="display:flex;gap:8px;flex-wrap:wrap"><input id="generatedVideoUploadUrl" value="'+esc(url)+'" readonly style="flex:1;min-width:220px;padding:10px;border:1px solid #dce5ee"><button class="cp3-btn is-primary" type="button" data-copy-upload>Copy link</button></div>';output.querySelector('[data-copy-upload]').onclick=async function(){try{await navigator.clipboard.writeText(url);}catch(_){var i=document.getElementById('generatedVideoUploadUrl');i.select();document.execCommand('copy');}this.textContent='Copied';};}catch(error){if(output){output.style.display='block';output.innerHTML='<div style="color:#d94a5b;font-weight:800">'+esc(error.message)+'</div>';}}finally{btn.disabled=false;btn.textContent=original;}},true);}

  async function bindRoot(root){if(!root||boundRoots.has(root))return;boundRoots.add(root);addStyle(root);var route=currentRoute();try{if(route==='profile')await repairProfile(root);else if(route==='rankings')await repairRankings(root);else if(route==='fixtures')await repairFixtures(root);else if(route==='predictions')await repairPredictions(root);else if(route==='exports')await repairExports(root);else if(route==='compare')await repairCompare(root);else if(route==='setup')repairSetup(root);}catch(error){toast(root,error.message||'This control could not be prepared.',true);}}
  function waitForScout(){var attempts=0;(function check(){attempts++;var s=shadow();if(s&&q(s,'.slv10-exact-root')){bindRoot(s);return;}if(attempts<240)setTimeout(check,50);})();}
  function start(){refreshCoachProfileAssets();repairCoachUpload();waitForScout();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('pageshow',start);
}());
