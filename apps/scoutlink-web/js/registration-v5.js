'use strict';
(function () {
  var root = document.getElementById('slv5RegistrationApp');
  if (!root) return;

  var API = (function () {
    try { return localStorage.getItem('sl_api_url') || 'https://scoutlink-api.vercel.app'; }
    catch (_) { return 'https://scoutlink-api.vercel.app'; }
  }()).replace(/\/+$/, '');

  var role = (document.body.getAttribute('data-registration-role') || '').toLowerCase();
  if (role !== 'coach' && role !== 'scout') return;

  var STORAGE_KEY = 'scoutlink_registration_v5_' + role;
  var PLAN_DATA = [
    {
      name:'Core',
      seat:'1 seat',
      annual:'£599/year',
      monthly:'£69/month',
      copy:'U7 to U16 player database search, player profile access, compatibility scoring, shortlisting, basic pipeline, 20 exports/year, 60 predictions/year, 30 coach-mediated interest requests/year'
    },
    {
      name:'Plus',
      seat:'5 seats',
      annual:'£1,999/year',
      monthly:'£219/month',
      copy:'Everything in Core, shared team usage, stronger team workflow, more player dossier exports, more prediction usage, 100 exports/year, 300 predictions/year, 120 coach-mediated interest requests/year'
    },
    {
      name:'Elite',
      seat:'10 seats',
      annual:'£4,999/year',
      monthly:'£549/month',
      copy:'Everything in Plus, advanced recruitment workflow, team reporting, stronger admin controls, priority onboarding, higher usage limits, 300 exports/year, 900 predictions/year, 300 coach-mediated interest requests/year'
    },
    {
      name:'Enterprise',
      seat:'Custom seats',
      annual:'From £10,000/year',
      monthly:'Custom',
      copy:'Custom limits, organisation-level onboarding, custom reporting, procurement support, bespoke account management, custom exports, custom predictions and custom coach-mediated interest request limits'
    }
  ];
  var state = {
    step:1,
    values:{ preferredScoutPlan:'Plus', preferredContactMethod:'Email' },
    checks:{},
    submitted:false,
    result:null
  };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char];
    });
  }

  function load() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && saved.values) {
        state.step = Math.max(1,Math.min(3,Number(saved.step)||1));
        state.values = Object.assign(state.values,saved.values);
        state.checks = saved.checks || {};
      }
    } catch (_) {}
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY,JSON.stringify({
        step:state.step, values:state.values, checks:state.checks, savedAt:new Date().toISOString()
      }));
    } catch (_) {}
  }

  function clear() { try { localStorage.removeItem(STORAGE_KEY); } catch (_) {} }

  function shell(content) {
    return '<div class="site registration-page">' +
      '<header class="roomband"><a class="sl-mark" href="/login">ScoutLink<small style="opacity:.5">by Stratex Analytics</small></a>' +
      '<span class="tag">' + (role === 'coach' ? 'Coach registration · Free' : 'Scout access application') + '</span>' +
      '<a class="sl-btn ghostw sm" href="/login">Sign in</a></header>' +
      content +
      '<footer class="sl-foot"><a class="sl-mark" href="/login">ScoutLink</a><div class="links">' +
      '<a href="/demo">Demo</a><a href="https://www.stratexanalytics.co.uk/trust">Safeguarding</a>' +
      '<a href="https://www.stratexanalytics.co.uk/privacy-policy">Privacy</a></div>' +
      '<span>A Stratex Analytics product</span></footer></div>';
  }

  function stepRail() {
    var labels = role === 'coach'
      ? ['Your details','Your team','Declarations']
      : ['Who you are','Team & plan','Declarations'];
    return '<div class="steprail">' + labels.map(function (label,index) {
      var number=index+1, cls=number===state.step?'cur':number<state.step?'done':'';
      return '<div class="'+cls+'">' + (number<state.step?'✓':number) +
        '<span class="step-label"> · '+esc(label)+'</span></div>';
    }).join('') + '</div>';
  }

  function field(label,name,type,options,required,help) {
    var value=state.values[name]||'';
    var req=required===false?'':' required';
    var control='';
    if (type==='select') {
      control='<select class="sl-in" name="'+esc(name)+'"'+req+'><option value="">Select one</option>' +
        (options||[]).map(function (option) {
          return '<option value="'+esc(option)+'"'+(String(option)===String(value)?' selected':'')+'>'+esc(option)+'</option>';
        }).join('')+'</select>';
    } else {
      control='<input class="sl-in" name="'+esc(name)+'" type="'+esc(type||'text')+'" value="'+esc(value)+'"'+req+'>';
    }
    return '<div class="sl-field"><label class="sl-lab">'+esc(label)+(required===false?'':' <em>Required</em>')+
      '</label>'+control+(help?'<small class="sl-help">'+esc(help)+'</small>':'')+'</div>';
  }

  function collect(form) {
    if (!form) return;
    new FormData(form).forEach(function (value,key) {
      if (!(value instanceof File)) state.values[key]=String(value||'').trim();
    });
    form.querySelectorAll('input[type="checkbox"]').forEach(function (input) {
      state.checks[input.name]=input.checked;
    });
    save();
  }

  function two(a,b) { return '<div class="sl-grid2">'+a+b+'</div>'; }

  function coachStep1() {
    return two(
      field('Full name','fullName','text',null,true),
      field('Email address','emailAddr','email',null,true)
    ) + two(
      field('Phone number','phone','tel',null,true),
      field('Country','country','select',['United Kingdom','Ireland','France','Spain','Germany','Other'],true)
    ) + two(
      field('Primary coaching role','primaryRole','select',['Head coach — youth','Assistant coach — youth','Goalkeeper coach','Academy coach','Club lead','Other'],true),
      field('Preferred contact method','preferredContactMethod','select',['Email','Phone'],false)
    );
  }

  function coachStep2() {
    return two(
      field('Club or team name','teamName','text',null,true),
      field('Team type','teamType','select',['Grassroots club','School team','Non-professional academy','Community team','Other'],true)
    ) + two(
      field('League or competition','league','text',null,false),
      field('Primary age group','primaryAgeGroup','select',['U7','U8','U9','U10','U11','U12','U13','U14','U15','U16'],true)
    ) + two(
      field('Region or county','county','text',null,false),
      field('Average club size','averageClubSize','select',['Under 25 players','25–49 players','50–150 players','151–300 players','300+ players'],false)
    ) + two(
      field('Number of teams','numberOfTeams','select',['1','2–3','4–6','7–10','11+'],false),
      field('Club website or social page','teamWebsite','text',null,false)
    );
  }

  function scoutStageMap() {
    return '<section style="margin-bottom:28px"><span class="sl-eb">Before you start</span>' +
      '<h2 class="sl-h" style="font-size:28px">Four stages to player search.</h2>' +
      '<p class="sl-sub">This is youth football, so access is reviewed. The whole journey, up front:</p>' +
      '<div class="stage4" style="margin-top:18px">' +
      '<article><strong>01</strong><h4>Apply</h4><p>Personal, organisation and team information, plan preference and declarations.</p></article>' +
      '<article><strong>02</strong><h4>Documents</h4><p>A secure email link requests identity and safeguarding files.</p></article>' +
      '<article><strong>03</strong><h4>Review</h4><p>Stratex reviews the application, documents and role context.</p></article>' +
      '<article><strong>04</strong><h4>Decision</h4><p>Approved, declined or returned for more information. Payment follows verification only.</p></article>' +
      '</div></section>';
  }

  function scoutStep1() {
    return two(
      field('Full legal name','fullName','text',null,true),
      field('Professional email','emailAddr','email',null,true)
    ) + two(
      field('Phone number','phone','tel',null,true),
      field('Country','country','select',['United Kingdom','Ireland','France','Spain','Germany','Other'],true)
    ) + two(
      field('Current scouting role','currentScoutingRole','select',['Head scout','Regional scout','Academy scout','Recruitment analyst','Talent identification','Other'],true),
      field('Preferred contact method','preferredContactMethod','select',['Email','Phone'],false)
    );
  }

  function planFor(name) {
    return PLAN_DATA.find(function (plan) { return plan.name === name; }) || PLAN_DATA[1];
  }

  function planPrice(plan) {
    if (!plan) return '';
    if (plan.monthly === 'Custom') return plan.annual + ' · monthly pricing custom';
    return plan.annual + ' · ' + plan.monthly;
  }

  function planRows() {
    return '<label class="sl-lab" style="margin:14px 0 8px">Preferred ScoutLink plan <em>Preference only</em></label>' +
      PLAN_DATA.map(function (plan) {
        var on=state.values.preferredScoutPlan===plan.name;
        return '<button class="planrow'+(on?' on':'')+'" type="button" data-plan="'+esc(plan.name)+'">' +
          '<span class="radio"></span><div><h4>'+esc(plan.name)+'</h4>' +
          '<p class="who">'+esc(planPrice(plan))+'</p>' +
          '<p class="fts">'+esc(plan.copy)+'</p></div>' +
          '<span class="seat">'+esc(plan.seat)+'</span></button>';
      }).join('') +
      '<div class="sl-aside"><b>No payment now</b><p>The advertised plan price, seats and benefits are shown before you apply. Stratex reviews access first; a subscription only begins after approval.</p></div>';
  }

  function scoutStep2() {
    return two(
      field('Organisation or club','scoutClub','text',null,true),
      field('Organisation type','organisationType','select',['Professional club','Semi-professional club','Independent scouting organisation','Academy','Other'],true)
    ) + two(
      field('Scouting team name','scoutingTeamName','text',null,false),
      field('Primary scouting region','primaryScoutingRegion','text',null,true)
    ) + two(
      field('Organisation website','organisationWebsite','text',null,false),
      field('Expected scout users','expectedScoutUsers','select',['1','2–3','4–5','6–8','9+'],true)
    ) +
      field('Expected player-search activity','expectedSearchActivity','select',['Daily','Several times a week','Weekly','Monthly','Occasional'],false) +
      planRows();
  }

  function check(name,title,copy) {
    return '<label class="sl-check"><input type="checkbox" name="'+esc(name)+'"'+(state.checks[name]?' checked':'')+' required>' +
      '<span><b>'+esc(title)+'</b><small>'+esc(copy)+'</small></span></label>';
  }

  function summaryRow(label,value) {
    return '<div class="sl-kv"><b>'+esc(label)+'</b><span>'+esc(value||'—')+'</span></div>';
  }

  function coachStep3() {
    return check('coachRole','I am genuinely involved in coaching this team',
      'ScoutLink workspaces are for working coaches with real squads.') +
      check('playerAuthority','I will only add players I am authorised to represent',
      'I will obtain the required under-18 and media permissions, and honour removal or dispute requests.') +
      check('terms','I accept the terms and safeguarding commitments',
      'The legal and safeguarding framework is operated by Stratex Analytics Ltd.') +
      '<div class="reg-summary">'+summaryRow('Coach',state.values.fullName)+
      summaryRow('Team',(state.values.teamName||'')+' · '+(state.values.primaryAgeGroup||'')+' · '+(state.values.county||''))+
      summaryRow('Plan','Free — grassroots coach')+'</div>';
  }

  function scoutStep3() {
    var selectedPlan=planFor(state.values.preferredScoutPlan||'Plus');
    return check('accuracy','The application is accurate',
      'The information will remain accurate through review and after access is granted.') +
      check('verification','I will complete identity and safeguarding verification',
      'The documents are requested through a separate secure email link.') +
      check('responsible','I accept the terms and responsible-access commitments',
      'Access can be reviewed or withdrawn where necessary to protect players.') +
      '<div class="reg-summary">'+summaryRow('Applicant',(state.values.fullName||'')+' · '+(state.values.currentScoutingRole||''))+
      summaryRow('Organisation',(state.values.scoutClub||'')+' · '+(state.values.primaryScoutingRegion||''))+
      summaryRow('Plan preference',selectedPlan.name+' · '+selectedPlan.seat+' · '+planPrice(selectedPlan)+' · no payment taken')+'</div>';
  }

  function titleForStep() {
    if (role==='coach') return [
      ['Your details.','The contact details connected to your coaching role. Your password is set later, when the account is completed.'],
      ['Your team.','This creates the workspace and describes the football around your players.'],
      ['Declarations.','Short commitments that protect players and keep evidence trustworthy.']
    ][state.step-1];
    return [
      ['Who you are.','Professional details that can be matched to your scouting role. Your password is created after approval.'],
      ['Team & plan.','Compare the current plan price, seats and benefits before recording your preference. Nothing is charged until after approval.'],
      ['Declarations.','Confirm the application, verification and responsible-access commitments.']
    ][state.step-1];
  }

  function formBody() {
    if (role==='coach') return state.step===1?coachStep1():state.step===2?coachStep2():coachStep3();
    return state.step===1?scoutStep1():state.step===2?scoutStep2():scoutStep3();
  }

  function sideCopy() {
    if (role==='coach') {
      return '<aside class="reg-side"><div class="sl-aside"><b>Free means free</b><p>No card details at any step and no trial period. Coach workspaces are free for grassroots football.</p></div>' +
        '<div class="sl-aside"><b>Saved as you go</b><p>Progress is stored locally between steps on this device.</p></div></aside>';
    }
    return '<aside class="reg-side"><div class="sl-aside"><b>Reviewed access</b><p>This is youth football. Identity, safeguarding information and role context are reviewed before player-search access.</p></div>' +
      '<div class="sl-aside"><b>Clear pricing before approval</b><p>Annual and monthly pricing, seat allowance and key benefits are shown when you choose a plan. No payment is taken on this application.</p></div></aside>';
  }

  function render() {
    if (state.submitted) { renderSuccess(); return; }
    var heading=titleForStep();
    var stage=role==='scout'&&state.step===1?scoutStageMap():'';
    var nextLabel=state.step===3?(role==='coach'?'Create workspace':'Submit application'):'Continue';
    root.innerHTML=shell('<main class="registration-wrap"><section class="reg-panel">'+stage+stepRail()+
      '<h1>'+esc(heading[0])+'</h1><p class="lead">'+esc(heading[1])+'</p>' +
      '<div class="sl-message err" id="regError" role="alert"></div>' +
      '<form id="registrationForm" novalidate>'+formBody()+
      '<div class="reg-actions">'+(state.step>1?'<button class="sl-btn line" type="button" data-back>Back</button>':'<a class="sl-btn line center" href="/register">Back</a>')+
      '<button class="sl-btn pitch" id="regNext" type="submit"><span>'+esc(nextLabel)+'</span><i class="sl-spinner"></i></button></div></form></section>'+
      sideCopy()+'</main>');
    bind();
  }

  function validStep(form) {
    collect(form);
    if (!form.reportValidity()) return false;
    if (role==='coach' && state.step===3) {
      return !!state.checks.coachRole && !!state.checks.playerAuthority && !!state.checks.terms;
    }
    if (role==='scout' && state.step===3) {
      return !!state.checks.accuracy && !!state.checks.verification && !!state.checks.responsible;
    }
    return true;
  }

  function setBusy(busy) {
    var btn=document.getElementById('regNext');
    if (!btn) return;
    btn.disabled=busy;
    btn.classList.toggle('busy',busy);
  }

  function payload() {
    if (role==='coach') return {
      fullName:state.values.fullName,
      emailAddr:state.values.emailAddr,
      phone:state.values.phone,
      country:state.values.country,
      primaryRole:state.values.primaryRole,
      preferredContactMethod:state.values.preferredContactMethod||'Email',
      teamName:state.values.teamName,
      teamType:state.values.teamType,
      league:state.values.league,
      primaryAgeGroup:state.values.primaryAgeGroup,
      county:state.values.county,
      averageClubSize:state.values.averageClubSize,
      teamWebsite:state.values.teamWebsite,
      numberOfTeams:state.values.numberOfTeams,
      dataPolicyAgreed:true,
      declarationVersion:'coach-declarations-v2-2026-07',
      activityNoticeVersion:'platform-activity-v1-2026-07',
      declarations:{
        authorised:true,
        under18Permissions:true,
        disputeRemoval:true,
        mediaPermission:true
      }
    };
    return {
      fullName:state.values.fullName,
      emailAddr:state.values.emailAddr,
      phone:state.values.phone,
      country:state.values.country,
      currentScoutingRole:state.values.currentScoutingRole,
      preferredContactMethod:state.values.preferredContactMethod||'Email',
      scoutClub:state.values.scoutClub,
      organisationType:state.values.organisationType,
      scoutingTeamName:state.values.scoutingTeamName,
      primaryScoutingRegion:state.values.primaryScoutingRegion,
      organisationWebsite:state.values.organisationWebsite,
      expectedScoutUsers:state.values.expectedScoutUsers,
      preferredScoutPlan:state.values.preferredScoutPlan||'Plus',
      expectedSearchActivity:state.values.expectedSearchActivity,
      dataPolicyAgreed:true,
      declarationVersion:'scout-declarations-v2-2026-07',
      activityNoticeVersion:'platform-activity-v1-2026-07',
      declarations:{ legitimateCapacity:true, responsibleAccess:true }
    };
  }

  async function submit() {
    setBusy(true);
    try {
      var response=await fetch(API+'/api/registrations/'+role,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        credentials:'include',
        body:JSON.stringify(payload())
      });
      var json=await response.json().catch(function(){return {};});
      if(!response.ok) throw new Error(json.error||'The registration could not be submitted.');
      state.submitted=true;
      state.result=json;
      clear();
      renderSuccess();
    } catch(error) {
      var el=document.getElementById('regError');
      if(el){el.textContent=error.message;el.classList.add('show');el.scrollIntoView({behavior:'smooth',block:'center'});}
      setBusy(false);
    }
  }

  function renderSuccess() {
    var isCoach=role==='coach';
    var requestId=state.result&&state.result.requestId?state.result.requestId:'';
    var copy=isCoach
      ? 'Registration received. Stratex will review the Coach request and email the secure account-completion step.'
      : 'Application received. The secure verification link is being sent to '+(state.values.emailAddr||'your email')+'. No payment has started.';
    root.innerHTML=shell('<main class="registration-wrap single"><section class="reg-panel reg-success">'+
      '<span class="sl-eb">'+(isCoach?'Coach registration':'Scout access application')+'</span>'+
      '<h1>'+(isCoach?'Registration received.':'Application received.')+'</h1>'+
      '<p class="lead">'+esc(copy)+'</p>'+
      (requestId?'<div class="lmsg"><b>Reference</b> '+esc(requestId)+'</div>':'')+
      '<div class="sl-aside"><b>'+(isCoach?'What happens next':'Stage two comes next')+'</b><p>'+
      (isCoach?'Watch your email for the account-completion step. No password was created on this form.':
      'Open the secure verification link from your email and upload the requested identity and safeguarding files. Stratex reviews those before any payment step.')+
      '</p></div><div class="reg-actions"><a class="sl-btn line center" href="/demo">Open demo</a><a class="sl-btn pitch center" href="/login">Go to sign in</a></div>'+
      '</section></main>');
  }

  function bind() {
    var form=document.getElementById('registrationForm');
    if (!form) return;
    form.addEventListener('change',function(){collect(form);});
    form.addEventListener('input',function(){collect(form);});
    form.addEventListener('submit',function(event){
      event.preventDefault();
      if(!validStep(form)) return;
      if(state.step<3){state.step+=1;save();render();window.scrollTo(0,0);}
      else submit();
    });
    var back=document.querySelector('[data-back]');
    if(back) back.addEventListener('click',function(){collect(form);state.step=Math.max(1,state.step-1);save();render();window.scrollTo(0,0);});
    document.querySelectorAll('[data-plan]').forEach(function(button){
      button.addEventListener('click',function(){
        state.values.preferredScoutPlan=button.getAttribute('data-plan');save();render();
      });
    });
  }

  load();
  render();
}());
