'use strict';

/*
 * ScoutLink Coach Desk / Coach Field — exact-design Coach player profile.
 * The shared player-profile router still owns role resolution and data loading.
 * This renderer activates only for Coach context and turns that live data into
 * the supplied Coach Desk / Coach Field visual specification.
 */
(function () {
  var S = { tab:'overview', options:null, activity:null, editRatings:null };

  var FALLBACK = {
    positions:[
      ['GK','Goalkeeper','Goalkeeper'],
      ['RB','Right-back','Defender'],['CB','Centre-back','Defender'],['LB','Left-back','Defender'],['RWB','Right wing-back','Defender'],['LWB','Left wing-back','Defender'],
      ['DM','Defensive midfielder','Midfielder'],['CM','Central midfielder','Midfielder'],['AM','Attacking midfielder','Midfielder'],['RM','Right midfielder','Midfielder'],['LM','Left midfielder','Midfielder'],
      ['RW','Right winger','Attacker'],['LW','Left winger','Attacker'],['CF','Centre-forward','Attacker'],['ST','Striker','Attacker']
    ],
    attributes:{
      general:[
        ['first_touch','First touch and ball control'],['passing','Passing'],['dribbling','Dribbling and ball carrying'],
        ['weak_foot','Weak-foot ability'],['awareness','Scanning and awareness'],['decision_making','Decision-making'],
        ['pace','Pace'],['agility_balance','Agility and balance'],['strength','Strength in physical contact'],
        ['stamina','Stamina and repeat intensity'],['composure','Composure under pressure'],
        ['coachability','Coachability'],['response_to_mistakes','Response to mistakes and setbacks']
      ],
      goalkeeper:[
        ['gk_positioning','Positioning'],['gk_shot_stopping','Shot-stopping'],['gk_reflexes','Reflexes'],['gk_handling','Handling'],
        ['gk_one_v_one','One-vers-one goalkeeping'],['gk_aerial_command','Aerial command'],['gk_sweeping','Sweeping'],
        ['gk_distribution','Distribution'],['gk_communication','Communication and organisation'],['gk_decision_making','Decision-making'],
        ['gk_composure','Composure'],['gk_agility_explosiveness','Agility and explosiveness']
      ],
      defender:[
        ['one_v_one_defending','One-vers-one defending'],['tackling','Tackling'],['defensive_positioning','Defensive positioning'],
        ['marking_covering','Marking and covering'],['anticipation_interceptions','Anticipation and interceptions'],['aerial_defending','Aerial defending'],
        ['recovery_defending','Recovery defending'],['pressing_defensive_transition','Pressing and defensive transitions'],
        ['communication_organisation','Communication and organisation'],['progression_from_defence','Progression from defence'],
        ['crossing_attacking_support','Crossing and attacking support']
      ],
      midfielder:[
        ['receiving_under_pressure','Receiving under pressure'],['ball_retention','Ball retention'],['progressive_passing','Progressive passing'],
        ['long_passing_switching','Long passing and switching play'],['tempo_control','Tempo control'],
        ['chance_creation','Chance creation and final pass'],['anticipation_interceptions','Anticipation and interceptions'],
        ['defensive_positioning_covering','Defensive positioning and covering'],['pressing_counter_pressing','Pressing and counter-pressing'],
        ['off_ball_movement_box_arrivals','Off-ball movement and box arrivals']
      ],
      attacker:[
        ['finishing','Finishing'],['shooting','Shooting technique and range'],['attacking_movement','Attacking movement'],
        ['one_v_one_attacking','One-vers-one attacking'],['runs_in_behind','Runs in behind'],['chance_creation','Chance creation and final pass'],
        ['crossing','Crossing'],['link_up_play','Link-up play'],['hold_up_play','Hold-up play'],
        ['aerial_ability','Attacking aerial ability'],['pressing_from_front','Pressing from the front']
      ]
    }
  };

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function api(m,p,b){return window.CoachV2&&window.CoachV2.api?window.CoachV2.api(m,p,b):window.api(m,p,b);}
  function route(p){return window.CoachV2?window.CoachV2.clean(p):p;}
  function player(){return window._profilePlayer||{};}
  function matches(){return Array.isArray(window._profileMatches)?window._profileMatches:[];}
  function videos(){return Array.isArray(window._profileVideos)?window._profileVideos:[];}
  function analysis(){return window._profileAnalysis||{};}
  function coachContext(){
    var c=window.__SCOUTLINK_PROFILE_CONTEXT__;
    if(c&&c.role)return c.role==='Coach';
    try{return String((window.Auth&&window.Auth.type)||localStorage.getItem('sl_type')||'').toLowerCase()==='coach';}catch(_){return false;}
  }
  function name(p){return[p.first_name,p.last_name].filter(Boolean).join(' ')||p.name||'Player';}
  function initials(v){return window.CoachV2?window.CoachV2.initials(v):String(v||'PL').split(/\s+/).map(function(x){return x[0]||'';}).slice(0,2).join('').toUpperCase();}
  function pos(p){return p.primary_position||p.specific_position||p.position||'—';}
  function age(p){return p.age_group||p.ageGroup||'—';}
  function team(p){return p.team_name||p.teamName||(window.CoachV2&&window.CoachV2.teamName())||'';}
  function coachName(p){return p.assigned_coach_name||p.assignedCoachName||(window.CoachV2&&window.CoachV2.fullName())||'Coach';}
  function n(v,d){v=Number(v);return Number.isFinite(v)?v:(d==null?0:d);}
  function flatten(o,out){out=out||{};if(!o||typeof o!=='object'||Array.isArray(o))return out;Object.keys(o).forEach(function(k){var v=o[k];if(v&&typeof v==='object'&&!Array.isArray(v))flatten(v,out);else if(v!==null&&v!==undefined&&v!=='')out[k]=v;});return out;}
  function ratings(p){return flatten(p.attribute_ratings||p.attributeRatings||p.attributes||{});}
  function fmtMoney(v){
    var a=analysis(), x=a.transferValueFormatted||a.transfer_value_formatted||pvalue(v);
    return x;
  }
  function pvalue(v){
    var x=Number(v); if(!Number.isFinite(x)||x<=0)return'Not estimated';
    if(x>=1000000)return'£'+(x/1000000).toFixed(x>=10000000?0:1)+'m';
    if(x>=1000)return'£'+Math.round(x/1000)+'k';
    return'£'+Math.round(x);
  }
  function overall(p){var a=analysis(),v=n(a.overallRating!=null?a.overallRating:(a.overall_rating!=null?a.overall_rating:p.overall_rating),NaN);if(!Number.isFinite(v))return'—';return Math.round(v<=10?v*10:v);}
  function bestRole(p){var a=analysis();return a.bestCurrentRole||a.best_current_role||a.best_role||pos(p);}
  function height(p){return p.height_range_cm||p.heightRangeCm||p.height_category||'—';}
  function build(p){return String(p.build_category||p.buildCategory||'—').replace(/_/g,' ').replace(/\b\w/g,function(x){return x.toUpperCase();});}
  function status(v){return String(v||'pending').toLowerCase();}
  function formatDate(raw){if(!raw)return'—';var d=new Date(raw);if(Number.isNaN(d.getTime()))return String(raw).slice(0,10);return d.toLocaleDateString('en-GB',{day:'numeric',month:'short'});}
  function score(m){var v=n(m.performance_score!=null?m.performance_score:(m.overall_performance!=null?m.overall_performance:m.rating),NaN);return Number.isFinite(v)?v.toFixed(1):'—';}

  function normaliseOptions(raw){
    var o=JSON.parse(JSON.stringify(FALLBACK)); raw=raw&&raw.data?raw.data:raw;
    if(!raw||typeof raw!=='object')return o;
    if(Array.isArray(raw.positions)&&raw.positions.length){
      o.positions=raw.positions.map(function(x){return[x.code||x.value,x.label||x.code||x.value,x.group||''];});
    }
    if(raw.attributeGroups&&raw.attributeDefinitions){
      ['general','goalkeeper','defender','midfielder','attacker'].forEach(function(g){
        if(Array.isArray(raw.attributeGroups[g]))o.attributes[g]=raw.attributeGroups[g].map(function(k){var d=raw.attributeDefinitions[k]||{};return[k,d.label||k.replace(/_/g,' ')];});
      });
    }else if(raw.attributes){
      ['general','goalkeeper','defender','midfielder','attacker'].forEach(function(g){if(Array.isArray(raw.attributes[g]))o.attributes[g]=raw.attributes[g].map(function(x){return Array.isArray(x)?x:[x.key||x.value,x.label||x.key||x.value];});});
    }
    return o;
  }
  function groupFor(code){
    var row=(S.options||FALLBACK).positions.find(function(x){return String(x[0]).toUpperCase()===String(code||'').toUpperCase();});
    return row?row[2]:'Attacker';
  }
  function positionLabel(code){
    var row=(S.options||FALLBACK).positions.find(function(x){return String(x[0]).toUpperCase()===String(code||'').toUpperCase();});
    return row?row[1]:code||'Position';
  }
  function applicable(p){
    var g=groupFor(pos(p)),o=S.options||FALLBACK;
    if(g==='Goalkeeper')return[{key:'goalkeeper',label:'Goalkeeper attributes',rows:o.attributes.goalkeeper||[]}];
    var k=String(g).toLowerCase();
    return[{key:'general',label:'General attributes',rows:o.attributes.general||[]},{key:k,label:g+' attributes',rows:o.attributes[k]||[]}];
  }
  function counts(p){var all=applicable(p).reduce(function(a,s){return a.concat(s.rows);},[]),r=ratings(p),rated=all.filter(function(x){return n(r[x[0]],NaN)>=1;}).length;return{total:all.length,rated:rated,missing:Math.max(0,all.length-rated)};}
  function readiness(p){
    var c=counts(p), vv=videos(), mm=matches();
    var attrPart=c.total?Math.round(c.rated/c.total*70):0;
    var physical=(p.height_category||p.height_range_cm?5:0)+(p.build_category||p.weight_range_kg?5:0);
    var matchPart=mm.length?10:0;
    var videoPart=vv.some(function(v){return status(v.moderation_status||v.status)==='approved';})?10:0;
    return Math.max(0,Math.min(100,attrPart+physical+matchPart+videoPart));
  }
  function interests(){var a=S.activity||{},arr=a.interests||a.scoutInterest||[];return Array.isArray(arr)?arr:[];}
  function threads(){var a=S.activity||{},arr=a.threads||[];return Array.isArray(arr)?arr:[];}
  function interestCount(){var ids={};interests().forEach(function(x){if(x.scout_id)ids[x.scout_id]=1;});return Object.keys(ids).length||interests().length;}
  function approvedVideos(){return videos().filter(function(v){return status(v.moderation_status||v.status)==='approved'||(!v.moderation_status&&!v.status);});}
  function pendingVideos(){return videos().filter(function(v){return status(v.moderation_status||v.status)==='pending';});}
  function externalVideo(v){var u=String(v&&((v.signed_url||v.video_url||v.url))||'');return /^https?:\/\//i.test(u)&&!v.file_path;}
  function resolvedUploadUrl(d){d=d||{};if(d.uploadPath)return location.origin.replace(/\/$/,'')+d.uploadPath;return d.uploadUrl||d.cleanUploadUrl||d.url||'';}

  function shell(){
    var root=document.getElementById('profileRouteRoot');if(!root)return false;
    root.className='coach-profile-hydrated';
    root.innerHTML='<div class="coach-desk"><div class="screen"><div class="shell" data-coach-shell data-active="My Players" data-title="'+esc(name(player()))+'" data-crumb="Player profile · coach view"><main class="cv" id="coachDeskPage"></main></div></div></div>'+
      '<div class="coach-field"><div class="scr"><main class="body" id="coachFieldPage"></main><nav class="tabs"></nav><div class="homebar"></div></div></div>';
    document.body.classList.add('coach-product','coach-profile-ready');
    if(window.CoachV2)window.CoachV2.refresh();
    return true;
  }

  function tags(p){
    return(interests().length?'<span class="tag b"><i></i>'+interestCount()+' scout'+(interestCount()===1?'':'s')+' interested</span>':'')+
      (readiness(p)>=80?'<span class="tag g"><i></i>Match-ready</span>':'<span class="tag a"><i></i>Evidence incomplete</span>');
  }
  function tabbar(p,active){
    var c=counts(p);
    return '<div class="profile-tabs" style="display:flex;gap:0;border-top:1px solid var(--line);padding:0 16px">'+
      [['overview','Overview',''],['attributes','Attributes',c.total],['facts','Match Facts',matches().length],['video','Videos',videos().length],['scout','Scout activity',''],['development','Development plan','']].map(function(t){
        return'<button type="button" data-profile-tab="'+t[0]+'" style="border:0;background:transparent;padding:11px 14px;font-size:12.5px;color:'+(active===t[0]?'var(--blue)':'var(--ink3)')+';font-weight:'+(active===t[0]?'700':'500')+';border-bottom:'+(active===t[0]?'2px solid var(--blue)':'2px solid transparent')+'">'+t[1]+(t[2]!==''?' <span>'+t[2]+'</span>':'')+'</button>';
      }).join('')+'</div>';
  }
  function hero(p,active){
    return'<div class="card" style="margin-bottom:14px"><div class="card-b" style="display:flex;gap:22px;align-items:flex-start">'+
      '<div class="av" style="width:64px;height:64px;flex:0 0 64px;font-size:21px;border-radius:4px">'+esc(initials(name(p)))+'</div>'+
      '<div style="flex:1"><div style="display:flex;align-items:center;gap:10px"><h2 style="margin:0;font-size:22px;letter-spacing:-.02em">'+esc(name(p))+'</h2>'+tags(p)+'</div>'+
      '<div class="mut" style="font-size:12.5px;margin-top:5px">'+esc(pos(p)+' · '+positionLabel(pos(p))+' · '+age(p)+' · '+(p.foot||'—')+' footed · '+team(p)+' · Assigned to '+coachName(p))+'</div>'+
      '<div class="g" style="grid-template-columns:repeat(6,1fr);margin-top:16px;gap:0;border-top:1px solid var(--line);padding-top:14px">'+
      metric('Overall',overall(p),true)+metric('Best role',bestRole(p),false)+metric('Est. value',fmtMoney(p.transfer_value),true)+metric('Height',height(p),false)+metric('Build',build(p),false)+metric('Readiness',readiness(p)+'%',true)+'</div></div>'+
      '<div style="display:flex;flex-direction:column;gap:7px;align-items:flex-end"><button class="btn p" type="button" data-profile-edit>Edit assessment</button><a class="btn" href="'+esc(route('/coach/match-facts?playerId='+encodeURIComponent(p.id||'')))+'">Record Match Facts</a><button class="btn" type="button" data-profile-upload-link>Generate upload link</button>'+(threads()[0]?'<a class="btn q" href="'+esc(route('/coach/chat?threadId='+encodeURIComponent(threads()[0].id||'')))+'">Open conversation</a>':'')+'</div>'+
      '</div>'+tabbar(p,active)+'</div>';
  }
  function metric(label,value,big){return'<div class="coach-profile-metric"><div class="lbl">'+esc(label)+'</div><div class="value">'+esc(value)+'</div></div>'; }

  function lineChart(vals){
    vals=vals.length?vals:[0];var max=Math.max.apply(null,vals.concat([10])),min=5,range=Math.max(1,max-min),pts=vals.map(function(v,i){var x=20+(vals.length===1?0:i/(vals.length-1)*760),y=180-(Math.max(min,Math.min(10,v))-min)/5*150;return x.toFixed(1)+','+y.toFixed(1);}).join(' ');
    return'<svg viewBox="0 0 800 220" width="100%" height="220" style="display:block"><rect x="20" y="30" width="760" height="60" fill="var(--green-t)"></rect><rect x="20" y="90" width="760" height="90" fill="var(--blue-t)"></rect>'+
      [5,6,7,8,9,10].map(function(v){var y=180-(v-min)/5*150;return'<line x1="20" x2="780" y1="'+y+'" y2="'+y+'" stroke="var(--line)"></line><text x="0" y="'+(y+4)+'" font-size="10" fill="var(--ink3)">'+v+'</text>';}).join('')+
      '<polyline points="'+pts+'" fill="none" stroke="var(--blue)" stroke-width="2.5"></polyline>'+vals.map(function(v,i){var x=20+(vals.length===1?0:i/(vals.length-1)*760),y=180-(Math.max(min,Math.min(10,v))-min)/5*150;return'<circle cx="'+x+'" cy="'+y+'" r="4" fill="var(--paper)" stroke="var(--blue)" stroke-width="2"></circle>';}).join('')+'</svg>';
  }
  function attrRow(row,r){
    var v=n(r[row[0]],NaN);
    if(!Number.isFinite(v))return'<div class="at"><div class="an">'+esc(row[1])+'</div><div class="track"></div><div class="atv no">Not observed</div></div>';
    return'<div class="at"><div class="an">'+esc(row[1])+'</div><div class="track"><u style="width:'+Math.max(0,Math.min(100,v*10))+'%"></u></div><div class="atv">'+v+'<span class="mut" style="font-weight:500;font-size:10.5px">/10</span></div></div>';
  }
  function matchTable(rows){
    return'<table><thead><tr><th>Fixture</th><th>Result</th><th>Played</th><th class="r">Mins</th><th class="r">G</th><th class="r">A</th><th class="r">Rating</th><th class="r">Observations</th></tr></thead><tbody>'+rows.slice(0,5).map(function(m){
      var result=(m.home_score!=null&&m.away_score!=null)?m.home_score+'–'+m.away_score:(m.result||'—');
      return'<tr><td><b>'+esc(m.opponent||m.opponent_name||'Opponent')+'</b><br><span class="mut">'+esc(formatDate(m.match_date||m.date))+'</span></td><td><span class="tag">'+esc(result)+'</span></td><td>'+esc(m.position_played||pos(player()))+'</td><td class="r">'+esc(m.minutes_played==null?'—':m.minutes_played)+'</td><td class="r">'+n(m.goals,0)+'</td><td class="r">'+n(m.assists,0)+'</td><td class="r"><b>'+score(m)+'</b></td><td class="r">'+Object.keys(flatten(m.attribute_ratings||m.ratings||{})).length+'</td></tr>';
    }).join('')+'</tbody></table>';
  }
  function videoRows(p){
    var list=videos();
    if(!list.length)return'<div class="card-b mut">No video reels yet.</div>';
    return list.slice(0,5).map(function(v){
      var st=status(v.moderation_status||v.status||'approved');
      return'<div class="row"><span class="icn '+(st==='approved'?'g':st==='pending'?'a':'r')+'">▶</span><span class="sp"><b class="rt">'+esc(v.title||'Video reel')+'</b><s class="rs">'+esc((v.category||v.video_type||'Highlight')+' · '+formatDate(v.created_at))+'</s></span><span class="tag '+(st==='approved'?'g':st==='pending'?'a':'r')+'">'+esc(st.charAt(0).toUpperCase()+st.slice(1))+'</span>'+(st==='pending'?'<button class="btn sm" data-review-video="'+esc(v.id||'')+'">Review</button>':'')+'</div>';
    }).join('');
  }
  function scoutRows(){
    var rows=interests();
    if(!rows.length)return'<div class="card-b mut">No explicit scout interest yet.</div>';
    return rows.slice(0,6).map(function(x){
      var club=x.club_name||x.scout_club||x.clubName||'Reviewed scout';
      return'<div class="row"><span class="sp"><b class="rt">'+esc(club)+'</b><s class="rs">'+esc('Interest registered '+formatDate(x.interest_registered_at||x.created_at))+'</s></span>'+(x.thread_id?'<a class="btn sm" href="'+esc(route('/coach/chat?threadId='+encodeURIComponent(x.thread_id)))+'">Open</a>':'')+'</div>';
    }).join('');
  }
  function overview(p){
    var r=ratings(p),c=counts(p),ms=matches(),vals=ms.slice().reverse().map(function(m){return n(m.performance_score,NaN);}).filter(Number.isFinite).slice(-9);
    var totalMins=ms.reduce(function(a,m){return a+n(m.minutes_played,0);},0);
    return hero(p,'overview')+
      '<div class="g" style="grid-template-columns:minmax(0,1fr) 300px;align-items:start"><div class="g">'+
        '<div class="card"><div class="card-h"><h3>Development trend</h3><div class="sp"></div><span class="hint">Last '+Math.min(9,vals.length)+' matches</span></div><div class="card-b">'+lineChart(vals) + '<div class="lgd"><span><i style="background:var(--blue)"></i>Match Facts rating</span><span><i style="background:var(--green-t);border:1px solid var(--line)"></i>Target band 8.0–9.0</span></div></div></div>'+
        '<div class="card"><div class="card-h"><h3>Recent Match Facts</h3><div class="sp"></div><span class="hint">'+ms.length+' matches recorded</span><a class="btn q sm" href="'+esc(route('/coach/match-facts?playerId='+encodeURIComponent(p.id||'')))+'">View all</a></div>'+matchTable(ms)+'</div>'+
        '<div class="card"><div class="card-h"><h3>Season output</h3></div><div class="card-b"><div class="g" style="grid-template-columns:repeat(5,1fr)">'+
          metric('Appearances',p.appearances||ms.length,true)+metric('Goals',p.goals||0,true)+metric('Assists',p.assists||0,true)+metric('Average rating',vals.length?(vals.reduce(function(a,b){return a+b;},0)/vals.length).toFixed(1):'—',true)+metric('Minutes',totalMins.toLocaleString('en-GB'),true)+'</div></div></div>'+
      '</div><div class="g">'+
        '<div class="card"><div class="card-h"><h3>Profile readiness</h3></div><div class="card-b"><div style="display:flex;align-items:center;gap:16px"><div class="coach-ring" style="--pc:'+readiness(p)+'"><b>'+readiness(p)+'%</b><small>ready</small></div><div><div class="lbl">Needs attention</div><div class="mut" style="font-size:11.5px;line-height:1.9">'+
          '<div>● '+c.missing+' applicable attributes Not observed</div><div>● '+(approvedVideos().length?'Video evidence present':'No approved match video')+'</div><div>● '+(ms.length?'Match Facts evidence present':'No Match Facts yet')+'</div></div><div style="margin-top:11px"><button class="btn sm p" data-profile-edit>Complete profile</button></div></div></div></div></div>'+
        '<div class="card"><div class="card-h"><h3>Attribute coverage</h3><div class="sp"></div><span class="hint">Position-aware</span></div><div class="card-b"><div class="coach-stacked"><span style="width:'+(c.total?c.rated/c.total*100:0)+'%;background:var(--blue)">'+c.rated+'</span><span style="flex:1;background:var(--grey)">'+c.missing+'</span></div><div class="lgd" style="margin-top:8px"><span><i style="background:var(--blue)"></i>Rated '+c.rated+'</span><span><i style="background:var(--grey)"></i>Not observed '+c.missing+'</span></div></div></div>'+
        '<div class="card"><div class="card-h"><h3>Scout activity</h3><div class="sp"></div><span class="hint">'+interestCount()+' scouts</span></div>'+scoutRows()+'<div class="card-b" style="border-top:1px solid var(--line)"><span class="mut" style="font-size:11px">Scout reports, scoring and recruitment notes are private and are never shown here.</span></div></div>'+
        '<div class="card"><div class="card-h"><h3>Videos</h3><div class="sp"></div><span class="hint">'+approvedVideos().length+' approved · '+pendingVideos().length+' pending</span></div>'+videoRows(p)+'<div class="foot"><button class="btn sm" data-profile-upload>Upload video</button><button class="btn sm" data-profile-upload-link>Generate upload link</button></div></div>'+
      '</div></div>';
  }
  function attributesView(p){
    var sections=applicable(p),r=ratings(p),c=counts(p),g=groupFor(pos(p));
    return hero(p,'attributes')+
      '<div class="card" style="margin-bottom:14px"><div class="card-b" style="display:flex;align-items:center;gap:16px"><div><div class="lbl">Applicable set</div><div style="font-size:13px;font-weight:600;margin-top:4px">'+esc(pos(p)+' · '+positionLabel(pos(p))+' → '+(g==='Goalkeeper'?'Goalkeeper '+c.total:'General '+sections[0].rows.length+' + '+g+' '+sections[1].rows.length+' = '+c.total))+'</div></div><div class="sp"></div><div class="lgd"><span><i style="background:var(--blue)"></i>Rated '+c.rated+'</span><span><i style="background:var(--grey)"></i>Not observed '+c.missing+'</span></div><button class="btn" type="button" data-show-observations>Show Match Facts observations</button><button class="btn p" type="button" data-profile-edit>Edit assessment</button></div></div>'+
      '<div class="g" style="grid-template-columns:1fr 1fr">'+sections.map(function(sec,i){
        return'<div class="'+(i?'g':'')+'"><div class="card"><div class="card-h"><h3>'+esc(sec.label)+'</h3><div class="sp"></div><span class="hint">'+sec.rows.length+(sec.key==='general'?' · every outfield player':' · '+esc(groupFor(pos(p))) )+'</span></div><div class="card-b">'+sec.rows.map(function(row){return attrRow(row,r);}).join('')+'</div></div>'+
        (i===1?'<div class="card"><div class="card-h"><h3>Evidence behind the ratings</h3><div class="sp"></div><span class="hint">Profile rating vs Match Facts</span></div><div class="card-b">'+evidenceRows(sec.rows,r)+'</div></div>':'')+'</div>';
      }).join('')+'</div>';
  }
  function evidenceRows(rows,r){
    var facts=matches(),items=[];
    rows.forEach(function(row){
      var vals=facts.map(function(m){return n(flatten(m.attribute_ratings||m.ratings||{})[row[0]],NaN);}).filter(Number.isFinite);
      if(!vals.length||!Number.isFinite(n(r[row[0]],NaN)))return;
      var avg=vals.reduce(function(a,b){return a+b;},0)/vals.length,diff=avg-n(r[row[0]],0);
      items.push({row:row,avg:avg,diff:diff,count:vals.length});
    });
    items.sort(function(a,b){return Math.abs(b.diff)-Math.abs(a.diff);});
    if(!items.length)return'<div class="mut">No Match Facts observations are available to compare yet.</div>';
    return items.slice(0,3).map(function(x){var amber=Math.abs(x.diff)>=1;return'<div class="at"><div class="an">'+esc(x.row[1])+'</div><div class="track"><u style="width:'+Math.round(x.avg*10)+'%;'+(amber?'background:var(--amber)':'')+'"></u></div><div class="atv">'+x.avg.toFixed(1)+'</div></div><div class="mut" style="font-size:11.5px;margin:8px 0 14px">'+esc('Observed '+x.count+' time'+(x.count===1?'':'s')+' in Match Facts. '+(amber?'Worth a fresh profile assessment.':'Profile rating and match evidence are broadly aligned.'))+'</div>';}).join('');
  }
  function factsView(p){
    return hero(p,'facts')+'<div class="card"><div class="card-h"><h3>Match Facts</h3><div class="sp"></div><span class="hint">'+matches().length+' matches recorded</span><a class="btn p sm" href="'+esc(route('/coach/match-facts?playerId='+encodeURIComponent(p.id||'')))+'">Record Match Facts</a></div>'+matchTable(matches())+'</div>';
  }
  function videoView(p){
    return hero(p,'video')+'<div class="g" style="grid-template-columns:minmax(0,1fr) 300px"><div class="card"><div class="card-h"><h3>Video reels</h3><div class="sp"></div><span class="hint">'+approvedVideos().length+' approved · '+pendingVideos().length+' pending</span></div>'+videoRows(p)+'</div><div class="g"><div class="card"><div class="card-h"><h3>Upload video</h3></div><div class="card-b"><button class="btn p" data-profile-upload>Upload a file</button></div></div><div class="card"><div class="card-h"><h3>Safeguarded upload link</h3></div><div class="card-b"><div class="mut" style="margin-bottom:10px">Token-protected, single-player. New uploads wait for coach approval before scouts can see them.</div><button class="btn" data-profile-upload-link>Generate upload link</button></div></div></div></div>';
  }
  function scoutView(p){return hero(p,'scout')+'<div class="card"><div class="card-h"><h3>Scout activity</h3><div class="sp"></div><span class="hint">Explicit interest only</span></div>'+scoutRows()+'<div class="card-b" style="border-top:1px solid var(--line)"><div class="callout"><b>Privacy boundary.</b> Scout reports, recruitment notes, ratings and private decision rationale are never shown to coaches.</div></div></div>';}
  function developmentView(p){
    var c=counts(p),ms=matches(),approved=approvedVideos(),steps=[];
    if(c.missing)steps.push({title:'Complete the assessment',detail:c.missing+' applicable attributes are still Not observed.',action:'Edit assessment',kind:'edit'});
    if(!ms.length)steps.push({title:'Add Match Facts evidence',detail:'No match record exists yet. Add the next played fixture to create a performance baseline.',action:'Record Match Facts',href:'/coach/match-facts?playerId='+encodeURIComponent(p.id||'')});
    else if(ms.length<3)steps.push({title:'Build the match evidence base',detail:'Add more Match Facts so development trends are based on repeated observations.',action:'Record Match Facts',href:'/coach/match-facts?playerId='+encodeURIComponent(p.id||'')});
    if(!approved.length)steps.push({title:'Add approved video evidence',detail:'No approved clip is attached to this profile yet.',action:'Generate upload link',kind:'upload'});
    if(!steps.length)steps.push({title:'Maintain the evidence trail',detail:'Assessment, Match Facts and approved video are all present. Keep Match Facts current after fixtures.',action:'Record next match',href:'/coach/match-facts?playerId='+encodeURIComponent(p.id||'')});
    return hero(p,'development')+
      '<div class="g" style="grid-template-columns:minmax(0,1fr) 300px;align-items:start"><div class="card"><div class="card-h"><h3>Development plan</h3><div class="sp"></div><span class="hint">Derived from the coach-managed evidence gaps</span></div>'+
      steps.map(function(x,i){return'<div class="row"><span class="icn '+(i===0?'b':'')+'">'+(i+1)+'</span><span class="sp"><b class="rt">'+esc(x.title)+'</b><s class="rs">'+esc(x.detail)+'</s></span>'+(x.kind==='edit'?'<button class="btn sm" data-profile-edit>'+esc(x.action)+'</button>':x.kind==='upload'?'<button class="btn sm" data-profile-upload-link>'+esc(x.action)+'</button>':'<a class="btn sm" href="'+esc(route(x.href))+'">'+esc(x.action)+'</a>')+'</div>';}).join('')+
      '</div><div class="g"><div class="card"><div class="card-h"><h3>Evidence summary</h3></div><div class="card-b">'+metric('Readiness',readiness(p)+'%',true)+'<hr class="sep">'+metric('Attributes',c.rated+' of '+c.total,false)+'<hr class="sep">'+metric('Match Facts',ms.length,false)+'<hr class="sep">'+metric('Approved videos',approved.length,false)+'</div></div><div class="callout"><b>Coach-owned plan.</b> This view only uses data available to coaches. Private scout notes and internal recruitment decisions are never used here.</div></div></div>';
  }

  function phoneHero(p){
    var c=counts(p);
    if(window.CoachV2&&window.CoachV2.setFieldHeader)window.CoachV2.setFieldHeader(name(p),pos(p)+' · '+age(p),'<button class="ic" type="button" aria-label="Player actions">⋯</button>','back');
    return '<div class="card coach-profile-phone-hero"><div class="flex" style="gap:9px"><span class="avm" style="width:40px;height:40px;font-size:12px">'+esc(initials(name(p)))+'</span><span class="who" style="flex:1"><b style="font-size:15px">'+esc(name(p))+'</b><span>'+esc(pos(p)+' · '+age(p)+' · '+(p.foot||'—')+' footed · '+team(p))+'</span></span></div>'+
      '<div class="flex" style="gap:6px;margin-top:10px">'+tags(p)+'</div>'+
      '<div class="coach-profile-phone-metrics"><div><div class="lbl">Overall</div><div class="value">'+esc(overall(p))+'</div></div><div><div class="lbl">Value</div><div class="value">'+esc(fmtMoney(p.transfer_value))+'</div></div><div><div class="lbl">Ready</div><div class="value">'+readiness(p)+'%</div></div></div></div>'+
      '<div class="pseg" style="margin-top:10px">'+[['overview','Overview'],['attributes','Attributes'],['facts','Facts'],['video','Video']].map(function(x){return'<u data-profile-tab="'+x[0]+'" class="'+(S.tab===x[0]?'on':'')+'">'+x[1]+'</u>';}).join('')+'</div>';
  }
  function phone(p){
    var c=counts(p),r=ratings(p),sections=applicable(p),ms=matches(),approved=approvedVideos(),pending=pendingVideos(),trend=ms.slice().reverse().map(function(m){return n(m.performance_score,NaN);}).filter(Number.isFinite).slice(-9);
    if(S.tab==='attributes')return phoneHero(p)+'<div class="pcap">Applicable set <span>'+c.rated+'/'+c.total+' rated</span></div>'+sections.map(function(sec){return'<div class="card" style="margin-bottom:10px"><div class="card-h"><h3>'+esc(sec.label)+'</h3><div class="sp"></div><span class="hint">'+sec.rows.length+'</span></div>'+sec.rows.map(function(row){var v=n(r[row[0]],NaN);return'<div class="rowline"><span class="who"><b>'+esc(row[1])+'</b><span>'+(Number.isFinite(v)?'Profile assessment':'Not observed')+'</span></span><span class="ratem '+(Number.isFinite(v)?'set':'')+'">'+(Number.isFinite(v)?v:'—')+'</span></div>';}).join('')+'</div>';}).join('')+'<button class="bt spend blk" data-profile-edit>Edit assessment</button>';
    if(S.tab==='facts')return phoneHero(p)+'<div class="pcap">Match Facts <span>'+ms.length+'</span></div><div class="card">'+(ms.length?ms.slice(0,8).map(function(m){return'<div class="rowline"><span class="who"><b>vs '+esc(m.opponent||m.opponent_name||'Opponent')+'</b><span>'+esc(formatDate(m.match_date))+' · '+esc(m.position_played||pos(p))+'</span></span><span class="ratem set">'+score(m)+'</span></div>';}).join(''):'<div class="card-b mut">No Match Facts yet.</div>')+'</div><a class="bt spend blk" style="margin-top:10px" href="'+esc(route('/coach/match-facts?playerId='+encodeURIComponent(p.id||'')))+'">Record Match Facts</a>';
    if(S.tab==='video')return phoneHero(p)+'<div class="pcap">Video <span>'+approved.length+' approved · '+pending.length+' pending</span></div><div class="card">'+videoRows(p)+'</div><div class="g" style="grid-template-columns:1fr 1fr;margin-top:10px"><button class="bt" data-profile-upload>Add video</button><button class="bt spend" data-profile-upload-link>Upload link</button></div>';
    return phoneHero(p)+
      '<div class="pcap">Development <span>Last '+Math.min(9,ms.length)+'</span></div><div class="card"><div class="card-b">'+lineChart(trend)+'</div></div>'+
      '<div class="pcap">Season output</div><div class="card"><div class="card-b"><div class="coach-profile-phone-metrics" style="border-top:0;margin-top:0;padding-top:0"><div><div class="lbl">Apps</div><div class="value">'+n(p.appearances)+'</div></div><div><div class="lbl">Goals</div><div class="value">'+n(p.goals)+'</div></div><div><div class="lbl">Assists</div><div class="value">'+n(p.assists)+'</div></div></div></div></div>'+
      '<div class="pcap">Profile readiness <span>'+readiness(p)+'%</span></div><div class="card">'+
        '<div class="rowline"><span class="who"><b>Attributes</b><span>'+c.rated+' of '+c.total+' rated</span></span><span class="tag '+(c.missing?'a':'g')+'">'+(c.missing?c.missing+' Not observed':'Complete')+'</span></div>'+
        '<div class="rowline"><span class="who"><b>Match Facts</b><span>'+ms.length+' records</span></span><span class="tag '+(ms.length?'g':'a')+'">'+(ms.length?'Added':'Add')+'</span></div>'+
        '<div class="rowline"><span class="who"><b>Approved video</b><span>'+approved.length+' clips</span></span><span class="tag '+(approved.length?'g':'a')+'">'+(approved.length?'Added':'Add')+'</span></div></div>'+
      '<div class="pcap">Recent Match Facts <span>'+ms.length+'</span></div><div class="card">'+(ms.length?ms.slice(0,4).map(function(m){return'<div class="rowline"><span class="who"><b>vs '+esc(m.opponent||'Opponent')+'</b><span>'+esc(formatDate(m.match_date))+' · '+esc(m.result||'')+' · '+esc(m.position_played||pos(p))+'</span></span><span class="ratem set">'+score(m)+'</span></div>';}).join(''):'<div class="card-b mut">No Match Facts yet.</div>')+'</div>'+
      '<div class="pcap">Scout activity <span>'+interestCount()+'</span></div><div class="card">'+scoutRows()+'</div>'+
      '<div class="pcap">Videos <span>'+approved.length+' approved</span></div><div class="card">'+videoRows(p)+'</div>'+
      '<div class="g" style="grid-template-columns:1fr 1fr;margin-top:10px"><a class="bt" href="'+esc(route('/coach/match-facts?playerId='+encodeURIComponent(p.id||'')))+'">Record facts</a><button class="bt spend" data-profile-edit>Edit assessment</button></div>';
  }

  function render(){
    var p=player();if(!p||!p.id)return;
    var desk=document.getElementById('coachDeskPage'),field=document.getElementById('coachFieldPage');if(!desk||!field)return;
    desk.innerHTML=S.tab==='attributes'?attributesView(p):S.tab==='facts'?factsView(p):S.tab==='video'?videoView(p):S.tab==='scout'?scoutView(p):S.tab==='development'?developmentView(p):overview(p);
    field.innerHTML=phone(p);
    bind();
    document.dispatchEvent(new CustomEvent('coach:rendered'));
  }

  function openEdit(){
    var p=player(),sections=applicable(p),r=ratings(p);S.editRatings=Object.assign({},r);
    var box=window.CoachV2.openDrawer({title:'Edit assessment',html:
      '<div class="mut" style="margin-bottom:10px">'+esc(name(p)+' · '+pos(p)+' · '+counts(p).total+' applicable attributes')+'</div>'+
      '<div class="chips" style="margin-bottom:12px">'+sections.map(function(sec,i){return'<span class="chip '+(i===0?'on':'')+'">'+esc(sec.label.replace(' attributes','')+' '+sec.rows.length)+'</span>';}).join('')+'</div>'+
      sections.map(function(sec){return'<section class="profile-edit-section"><div class="lbl" style="margin:14px 0 8px">'+esc(sec.label)+'</div>'+sec.rows.map(function(row){var v=n(S.editRatings[row[0]],NaN);return'<div class="profile-scale-row"><div style="display:flex;justify-content:space-between;gap:8px"><b>'+esc(row[1])+'</b><span class="mut" data-rating-label="'+esc(row[0])+'">'+(Number.isFinite(v)?v+'/10':'Not observed')+'</span></div><div class="scale" style="margin-top:7px">'+Array.from({length:10},function(_,i){var x=i+1;return'<button type="button" data-rate-key="'+esc(row[0])+'" data-rate-value="'+x+'" class="'+(v===x?'on':'')+'">'+x+'</button>';}).join('')+'<button type="button" class="na '+(!Number.isFinite(v)?'on':'')+'" data-rate-key="'+esc(row[0])+'" data-rate-value="">Not observed</button></div></div>';}).join('')+'</section>';}).join(''),
      footer:'<button class="btn" type="button" data-close-coach-overlay>Cancel</button><button class="btn p" id="saveProfileAssessment" type="button">Save assessment</button>'
    });
    if(!box)return;
    box.querySelectorAll('[data-rate-key]').forEach(function(b){b.onclick=function(){
      var key=b.dataset.rateKey,val=b.dataset.rateValue===''?null:Number(b.dataset.rateValue);
      if(val==null)delete S.editRatings[key];else S.editRatings[key]=val;
      box.querySelectorAll('[data-rate-key="'+CSS.escape(key)+'"]').forEach(function(x){x.classList.toggle('on',x===b);});
      var label=box.querySelector('[data-rating-label="'+CSS.escape(key)+'"]');if(label)label.textContent=val==null?'Not observed':val+'/10';
    };});
    var save=document.getElementById('saveProfileAssessment');if(save)save.onclick=function(){
      save.disabled=true;save.textContent='Saving…';
      api('PUT','/api/players/'+encodeURIComponent(p.id),{
        firstName:p.first_name,lastName:p.last_name,ageGroup:p.age_group,primaryPosition:pos(p),
        alternativePositions:p.alternative_positions||[],foot:p.foot||'Right',
        heightCategory:p.height_category||'average',buildCategory:p.build_category||'athletic',
        attributeRatings:S.editRatings
      }).then(function(resp){
        var d=resp&&resp.data?resp.data:resp,updated=d.player||d;
        p.attribute_ratings=updated.attribute_ratings||S.editRatings;
        if(updated.overall_rating!=null)p.overall_rating=updated.overall_rating;
        window.CoachV2.closeAll();window.CoachV2.showToast('Assessment saved.');render();
      }).catch(function(e){save.disabled=false;save.textContent='Save assessment';window.CoachV2.showToast(e.message||'Could not save assessment.',true);});
    };
  }

  function uploadLink(){
    var p=player();window.CoachV2.openSheet({title:'Safeguarded upload link',html:'<div class="callout"><b>Safeguarded.</b> Token-protected, single-player. New uploads enter the coach review queue and are not visible to scouts until approved.</div><div class="field"><label>Player</label><div class="in">'+esc(name(p))+'</div></div><div id="profileLinkResult"></div>',footer:'<button class="btn p" id="makeProfileLink">Generate link</button>'});
    setTimeout(function(){var b=document.getElementById('makeProfileLink');if(b)b.onclick=function(){b.disabled=true;api('POST','/api/videos/upload-link',{playerId:p.id}).then(function(r){var d=r.data||r,url=resolvedUploadUrl(d);document.getElementById('profileLinkResult').innerHTML='<div class="linkbox">'+esc(url)+'</div><button class="btn sm" id="copyProfileLink">Copy link</button>';document.getElementById('copyProfileLink').onclick=function(){navigator.clipboard.writeText(url);window.CoachV2.showToast('Link copied.');};}).catch(function(e){document.getElementById('profileLinkResult').innerHTML='<div class="coach-route-message error">'+esc(e.message)+'</div>';}).finally(function(){b.disabled=false;});};},0);
  }
  function uploadFile(){
    var p=player();window.CoachV2.openSheet({title:'Add video',html:'<form id="profileUploadForm"><div class="field"><label>Title</label><input class="in" name="title" required></div><div class="field"><label>Category</label><select class="in" name="category"><option>Highlight</option><option>Match</option><option>Training</option><option>Skills</option></select></div>'+
      '<div class="pseg"><u class="on" data-profile-video-source="file">Upload file</u><u data-profile-video-source="link">Paste link</u></div>'+
      '<div data-profile-video-panel="file" class="field" style="margin-top:12px"><label>Video file</label><input class="in" name="file" type="file" accept="video/*"></div>'+
      '<div data-profile-video-panel="link" hidden style="margin-top:12px"><div class="field"><label>Video URL</label><input class="in" type="url" name="videoUrl" placeholder="https://youtube.com/…"></div><div class="help">Any valid HTTPS share link can be stored. Access on YouTube, Drive, Dropbox, Veo or another provider still follows that provider permissions.</div></div>'+
      '<div id="profileUploadMsg"></div><button class="btn p" type="submit">Add video</button></form>'});
    setTimeout(function(){var f=document.getElementById('profileUploadForm'),mode='file';if(!f)return;document.querySelectorAll('[data-profile-video-source]').forEach(function(tab){tab.onclick=function(){mode=tab.dataset.profileVideoSource;document.querySelectorAll('[data-profile-video-source]').forEach(function(x){x.classList.toggle('on',x===tab)});document.querySelectorAll('[data-profile-video-panel]').forEach(function(x){x.hidden=x.dataset.profileVideoPanel!==mode;});};});f.onsubmit=function(e){e.preventDefault();var fd=new FormData(f);
      if(mode==='link'){var url=String(fd.get('videoUrl')||'').trim();if(!url)return;api('POST','/api/videos/link',{playerId:p.id,title:fd.get('title'),category:fd.get('category'),videoUrl:url}).then(function(){window.CoachV2.closeAll();window.CoachV2.showToast('Video link added.');location.reload();}).catch(function(err){document.getElementById('profileUploadMsg').innerHTML='<div class="coach-route-message error">'+esc(err.message)+'</div>';});return;}
      var file=fd.get('file');if(!file||!file.size)return;var body=new FormData();body.append('file',file);body.append('title',fd.get('title')||file.name);body.append('category',fd.get('category')||'Highlight');body.append('playerId',p.id);fetch((window.API||'')+'/api/videos/upload',{method:'POST',headers:{Authorization:'Bearer '+((window.Auth&&window.Auth.token)||'')},body:body}).then(function(r){return r.json().then(function(d){if(!r.ok)throw new Error(d.error||'Upload failed');return d;});}).then(function(){window.CoachV2.closeAll();window.CoachV2.showToast('Video uploaded for review.');location.reload();}).catch(function(err){document.getElementById('profileUploadMsg').innerHTML='<div class="coach-route-message error">'+esc(err.message)+'</div>';});
    };},0);
  }
  function reviewVideo(id){
    var v=videos().find(function(x){return String(x.id)===String(id);});if(!v)return;
    var url=v.signed_url||v.video_url||v.url||'',isExternal=externalVideo(v);
    window.CoachV2.openSheet({title:'Review video',html:'<div class="card"><div class="card-b"><b>'+esc(v.title||'Video')+'</b><div class="mut">'+esc(v.category||v.video_type||'Highlight')+'</div>'+(url?(isExternal?'<a class="btn p" style="margin-top:12px" target="_blank" rel="noopener noreferrer" href="'+esc(url)+'">Open external video</a>':'<video controls style="width:100%;margin-top:10px" src="'+esc(url)+'"></video>'):'<div class="mut" style="margin-top:10px">Video preview unavailable.</div>')+'</div></div>',footer:'<button class="btn dgr" data-video-decision="rejected">Reject</button><button class="btn p" data-video-decision="approved">Approve</button>'});
    setTimeout(function(){document.querySelectorAll('[data-video-decision]').forEach(function(b){b.onclick=function(){api('PATCH','/api/videos/'+encodeURIComponent(id)+'/moderation',{status:b.dataset.videoDecision}).then(function(){window.CoachV2.closeAll();window.CoachV2.showToast('Video '+b.dataset.videoDecision+'.');v.moderation_status=b.dataset.videoDecision;render();}).catch(function(e){window.CoachV2.showToast(e.message,true);});};});},0);
  }

  function bind(){
    document.querySelectorAll('[data-profile-tab]').forEach(function(b){b.onclick=function(e){e.preventDefault();S.tab=b.dataset.profileTab;render();};});
    document.querySelectorAll('[data-profile-edit]').forEach(function(b){b.onclick=openEdit;});
    document.querySelectorAll('[data-profile-upload-link]').forEach(function(b){b.onclick=uploadLink;});
    document.querySelectorAll('[data-profile-upload]').forEach(function(b){b.onclick=uploadFile;});
    document.querySelectorAll('[data-review-video]').forEach(function(b){b.onclick=function(){reviewVideo(b.dataset.reviewVideo);};});
    document.querySelectorAll('[data-show-observations]').forEach(function(b){b.onclick=function(){var p=player();window.CoachV2.openDrawer({title:'Match Facts observations',html:evidenceRows(applicable(p).reduce(function(a,s){return a.concat(s.rows);},[]),ratings(p))});};});
  }

  async function loadSupporting(){
    var p=player();
    var rs=await Promise.allSettled([api('GET','/api/scoring/options'),api('GET','/api/coach-experience/players/'+encodeURIComponent(p.id)+'/activity')]);
    S.options=normaliseOptions(rs[0].status==='fulfilled'?rs[0].value:null);
    S.activity=rs[1].status==='fulfilled'?(rs[1].value.data||rs[1].value):{};
    /* Prefer moderated video rows from the safe Coach activity endpoint. */
    if(S.activity&&Array.isArray(S.activity.videos))window._profileVideos=S.activity.videos;
  }
  async function activate(){
    if(!coachContext()||!player().id)return;
    await loadSupporting().catch(function(){S.options=FALLBACK;S.activity={};});
    if(!shell())return;
    render();
  }

  document.addEventListener('scoutlink:profile-ready',function(e){if(e.detail&&e.detail.role==='Coach')activate();});
  if(window.__SCOUTLINK_PROFILE_CONTEXT__&&window.__SCOUTLINK_PROFILE_CONTEXT__.role==='Coach'&&player().id)activate();
}());
