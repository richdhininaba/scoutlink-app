'use strict';

(function () {
  var API = (function () {
    try {
      return localStorage.getItem('sl_api_url') ||
        'https://scoutlink-api.vercel.app';
    } catch (_) {
      return 'https://scoutlink-api.vercel.app';
    }
  })();

  var ROLE_DATA = {
    coach:{
      label:'Coach registration',
      hero:'Create your free coach workspace.',
      intro:'Tell us about you and your team, then confirm the two responsibilities that keep player evidence accurate and youth visibility controlled.',
      sideTitle:'Coach accounts are free',
      sideCopy:'Build player profiles, add fixtures and Match Facts, organise approved video evidence and respond to reviewed scout interest.',
      steps:[
        ['Personal details','Contact and coaching role'],
        ['Team details','Club, league and squad'],
        ['Declarations','Confirm and create account']
      ]
    },
    scout:{
      label:'Scout access application',
      hero:'Request reviewed scout access.',
      intro:'Complete your personal and team information, choose the plan that best matches the scouting workflow and confirm the required declarations. Verification documents are requested separately after registration through a secure email link.',
      sideTitle:'No payment during registration',
      sideCopy:'Choose the plan that best matches the team. It is recorded as a preference only; access, limits and commercial terms are confirmed after review.',
      steps:[
        ['Personal details','Identity and contact'],
        ['Team details','Organisation and preferred plan'],
        ['Declarations','Confirm and submit']
      ]
    }
  };

  var PLAN_DATA = [
    {
      name:'Core',
      description:'For an individual scout beginning structured grassroots discovery.',
      features:[
        '1 scout seat',
        'Player search and profile review',
        'Shortlists and basic pipeline',
        'Compatibility overview',
        'Standard support'
      ]
    },
    {
      name:'Plus',
      description:'For a small recruitment team needing stronger comparison tools.',
      features:[
        'Up to 3 scout seats',
        'Advanced filters',
        'Player comparison',
        'Full recruitment pipeline',
        'Shared notes and exports'
      ]
    },
    {
      name:'Elite',
      description:'For an established scouting team managing regular activity.',
      features:[
        'Up to 8 scout seats',
        'Team collaboration and permissions',
        'Advanced compatibility intelligence',
        'Predictions and export allowances',
        'Priority onboarding and support'
      ],
      recommended:true
    },
    {
      name:'Enterprise / custom team plan',
      shortName:'Enterprise',
      description:'For clubs, groups and multi-team recruitment structures.',
      features:[
        'Custom seats and team structure',
        'Governance and usage controls',
        'Custom limits',
        'Dedicated onboarding',
        'Commercial review'
      ]
    }
  ];

  var COUNTRY_OPTIONS = [
    'United Kingdom',
    'Ireland',
    'France',
    'Spain',
    'Germany',
    'Other'
  ];

  var state = {
    role:'',
    step:1,
    values:{},
    declarations:[false,false],
    submitted:false
  };

  function esc(value) {
    return String(value == null ? '' : value).replace(
      /[&<>"']/g,
      function (char) {
        return {
          '&':'&amp;',
          '<':'&lt;',
          '>':'&gt;',
          '"':'&quot;',
          "'":'&#39;'
        }[char];
      }
    );
  }

  function track(name,properties) {
    try {
      if (
        window.heap &&
        typeof window.heap.track === 'function'
      ) {
        window.heap.track(name,properties || {});
      }
    } catch (_) {}
  }

  function roleFromPage() {
    var bodyRole = document.body &&
      document.body.getAttribute('data-registration-role');

    if (bodyRole === 'coach' || bodyRole === 'scout') {
      return bodyRole;
    }

    var path = window.location.pathname.toLowerCase();

    if (/\/register\/coach\/?$/.test(path)) return 'coach';
    if (/\/register\/scout\/?$/.test(path)) return 'scout';

    return '';
  }

  function isVerificationRoute() {
    var path = window.location.pathname
      .replace(/\/+$/,'')
      .toLowerCase();

    return path === '/scout-verification' ||
      path === '/company/scout-verification';
  }

  function scoutLink(path) {
    var base = 'https://www.scoutlink.app';
    path = String(path || '').replace(/^\/+/,'');
    return path ? base + '/' + path : base;
  }

  function siteHeader() {
    return '<header class="slrv-header">' +
      '<a class="slrv-logo" href="' + scoutLink('') + '">' +
        'Scout<span>Link</span>' +
      '</a>' +
      '<nav class="slrv-nav" aria-label="ScoutLink navigation">' +
        '<a href="' + scoutLink('coaches') + '">Coaches</a>' +
        '<a href="' + scoutLink('scouts') + '">Scouts</a>' +
        '<a href="' + scoutLink('parents-players') + '">Parents &amp; Players</a>' +
        '<a href="' + scoutLink('safeguarding') + '">Safeguarding</a>' +
        '<a href="' + scoutLink('demo') + '">Demo</a>' +
      '</nav>' +
      '<div class="slrv-header-actions">' +
        '<a class="slrv-btn" href="' + scoutLink('login') + '">Sign in</a>' +
        '<a class="slrv-btn primary" href="' + scoutLink('') + '">Back to ScoutLink</a>' +
      '</div>' +
      '<button class="slrv-menu" type="button" id="slrvMenu" ' +
        'aria-expanded="false" aria-controls="slrvMobileNav" ' +
        'aria-label="Open ScoutLink menu">' +
        '<span></span><span></span><span></span>' +
      '</button>' +
      '<nav class="slrv-mobile-nav" id="slrvMobileNav" ' +
        'aria-label="ScoutLink mobile navigation">' +
        '<a href="' + scoutLink('coaches') + '">Coaches</a>' +
        '<a href="' + scoutLink('scouts') + '">Scouts</a>' +
        '<a href="' + scoutLink('parents-players') + '">Parents &amp; Players</a>' +
        '<a href="' + scoutLink('safeguarding') + '">Safeguarding</a>' +
        '<a href="' + scoutLink('demo') + '">Demo</a>' +
        '<a href="' + scoutLink('login') + '">Sign in</a>' +
        '<a class="primary" href="' + scoutLink('') + '">Back to ScoutLink</a>' +
      '</nav>' +
    '</header>';
  }

  function siteFooter() {
    return '<footer class="slrv-footer">' +
      '<div class="slrv-footer-grid">' +
        '<div class="slrv-footer-brand">' +
          '<a class="slrv-logo" href="' + scoutLink('') + '">' +
            'Scout<span>Link</span>' +
          '</a>' +
          '<p>Coach-led, scout-reviewed grassroots football intelligence by Stratex Analytics.</p>' +
        '</div>' +
        '<div class="slrv-footer-col"><b>Product</b>' +
          '<a href="' + scoutLink('coaches') + '">Coaches</a>' +
          '<a href="' + scoutLink('scouts') + '">Scouts</a>' +
          '<a href="' + scoutLink('demo') + '">Demo</a>' +
          '<a href="' + scoutLink('scoutlink/compatibility-score') + '">Compatibility</a>' +
        '</div>' +
        '<div class="slrv-footer-col"><b>Trust</b>' +
          '<a href="' + scoutLink('safeguarding') + '">Safeguarding</a>' +
          '<a href="' + scoutLink('parent-guardian-notice') + '">Parent Notice</a>' +
          '<a href="' + scoutLink('report-a-concern') + '">Report a Concern</a>' +
          '<a href="https://www.stratexanalytics.co.uk/scout-verification">Scout Verification</a>' +
        '</div>' +
        '<div class="slrv-footer-col"><b>Company</b>' +
          '<a href="https://www.stratexanalytics.co.uk/about">About</a>' +
          '<a href="https://www.stratexanalytics.co.uk/contact">Contact</a>' +
          '<a href="https://www.stratexanalytics.co.uk/careers">Careers</a>' +
          '<a href="https://www.stratexanalytics.co.uk/accessibility">Accessibility</a>' +
        '</div>' +
        '<div class="slrv-footer-col"><b>Legal</b>' +
          '<a href="' + scoutLink('privacy-policy') + '">Privacy Policy</a>' +
          '<a href="' + scoutLink('terms') + '">Terms of Use</a>' +
          '<a href="' + scoutLink('cookie-policy') + '">Cookie Policy</a>' +
        '</div>' +
      '</div>' +
      '<div class="slrv-footer-bottom">' +
        '<span>&copy; 2026 ScoutLink. Powered by Stratex Analytics.</span>' +
        '<span>info@scoutlink.app</span>' +
      '</div>' +
    '</footer>';
  }

  function draftKey(role) {
    return 'scoutlink_registration_v3_' + role;
  }

  function loadDraft(role) {
    try {
      var draft = JSON.parse(localStorage.getItem(draftKey(role)) || '{}');
      if (draft && typeof draft === 'object') {
        state.values = draft.values || {};
        state.declarations = Array.isArray(draft.declarations)
          ? draft.declarations
          : [false,false];
        state.step = Math.min(3,Math.max(1,Number(draft.step || 1)));
      }
    } catch (_) {}
  }

  function saveDraft() {
    try {
      localStorage.setItem(
        draftKey(state.role),
        JSON.stringify({
          step:state.step,
          values:state.values,
          declarations:state.declarations,
          savedAt:new Date().toISOString()
        })
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  function clearDraft() {
    try {
      localStorage.removeItem(draftKey(state.role));
    } catch (_) {}
  }

  function inputValue(name) {
    return esc(state.values[name] || '');
  }

  function selected(value,current) {
    return String(value) === String(current) ? ' selected' : '';
  }

  function optionList(values,current,placeholder) {
    var html = placeholder
      ? '<option value="">' + esc(placeholder) + '</option>'
      : '';

    html += values.map(function (value) {
      return '<option value="' + esc(value) + '"' +
        selected(value,current) + '>' +
        esc(value) +
      '</option>';
    }).join('');

    return html;
  }

  function field(label,name,type,options,help,full,required) {
    var requiredMark = required === false
      ? ''
      : ' <span class="slrv-required">*</span>';

    var control = '';

    if (type === 'select') {
      control = '<select id="slrv_' + esc(name) + '" name="' +
        esc(name) + '"' + (required === false ? '' : ' required') + '>' +
        optionList(options || [],state.values[name] || '',
          'Select one') +
      '</select>';
    } else if (type === 'textarea') {
      control = '<textarea id="slrv_' + esc(name) + '" name="' +
        esc(name) + '"' + (required === false ? '' : ' required') +
        '>' + inputValue(name) + '</textarea>';
    } else {
      control = '<input id="slrv_' + esc(name) + '" name="' +
        esc(name) + '" type="' + esc(type || 'text') + '" value="' +
        inputValue(name) + '"' +
        (required === false ? '' : ' required') + '>';
    }

    return '<div class="slrv-field' + (full ? ' full' : '') + '">' +
      '<label for="slrv_' + esc(name) + '">' +
        esc(label) + requiredMark +
      '</label>' +
      control +
      (help ? '<small>' + esc(help) + '</small>' : '') +
    '</div>';
  }

  function stepsMarkup() {
    return ROLE_DATA[state.role].steps.map(function (step,index) {
      var number = index + 1;
      var className = number === state.step
        ? ' active'
        : number < state.step
          ? ' complete'
          : '';

      return '<div class="slrv-step' + className + '">' +
        '<div class="slrv-step-no">' +
          (number < state.step ? '&#10003;' : number) +
        '</div>' +
        '<div><b>' + esc(step[0]) + '</b>' +
          '<span>' + esc(step[1]) + '</span></div>' +
      '</div>';
    }).join('');
  }

  function planCard(plan) {
    var selectedPlan = state.values.preferredScoutPlan || 'Elite';
    var isSelected = selectedPlan === plan.name;

    return '<article class="slrv-plan-card' +
      (isSelected ? ' selected' : '') + '" data-plan-card="' +
      esc(plan.name) + '">' +
      (plan.recommended
        ? '<span class="slrv-recommend">Recommended</span>'
        : '') +
      '<h4>' + esc(plan.shortName || plan.name) + '</h4>' +
      '<p>' + esc(plan.description) + '</p>' +
      '<ul>' +
        plan.features.map(function (item) {
          return '<li>' + esc(item) + '</li>';
        }).join('') +
      '</ul>' +
      '<button class="slrv-btn' + (isSelected ? ' primary' : '') +
        '" type="button" data-plan="' + esc(plan.name) + '">' +
        (isSelected ? 'Selected' : 'Choose ' + (plan.shortName || plan.name)) +
      '</button>' +
    '</article>';
  }

  function planSection() {
    return '<section class="slrv-plan-section">' +
      '<h3>Compare the plans</h3>' +
      '<p>Select the closest match for the scouting team. The final plan can be confirmed or changed after review.</p>' +
      '<div class="slrv-plan-grid">' +
        PLAN_DATA.map(planCard).join('') +
      '</div>' +
      '<div class="slrv-payment-note">' +
        '<b>No payment is required now</b>' +
        '<p>Plan selection is an expression of interest only. Stratex reviews the application first and confirms the final plan, limits and commercial terms before any payment or subscription begins.</p>' +
      '</div>' +
    '</section>';
  }

  function helper(title,copy,kind) {
    return '<div class="slrv-helper ' + esc(kind || '') + '">' +
      '<b>' + esc(title) + '</b>' +
      '<p>' + esc(copy) + '</p>' +
    '</div>';
  }

  function coachStepOne() {
    return {
      stage:'Step 1 of 3',
      title:'Start with your details.',
      lead:'Use the details connected to your coaching role. Password creation happens later when the account is completed.',
      section:'Personal details',
      sectionCopy:'Your main contact and coaching information.',
      body:'<div class="slrv-fields">' +
        field('Full name','fullName','text',null,'',false,true) +
        field('Email address','emailAddr','email',null,
          'We will send account and registration updates here.',false,true) +
        field('Phone number','phone','tel',null,'',false,true) +
        field('Country','country','select',COUNTRY_OPTIONS,'',false,true) +
        field('Primary coaching role','primaryRole','select',[
          'Head Coach','Assistant Coach','Academy Coach','School Coach',
          'Club Administrator','Other'
        ],'',false,true) +
        field('Preferred contact method','preferredContactMethod','select',[
          'Email','Phone','Either'
        ],'',false,true) +
      '</div>' +
      helper(
        'Why we ask',
        'These details help Stratex support the right coach and keep team ownership clear.',
        'green'
      ),
      back:'Back to account types',
      next:'Continue to team details'
    };
  }

  function coachStepTwo() {
    return {
      stage:'Step 2 of 3',
      title:'Tell us about the team.',
      lead:'This creates the initial coach workspace and helps ScoutLink understand the football environment around the players.',
      section:'Team details',
      sectionCopy:'Use the club, academy, school or programme information connected to this account.',
      body:'<div class="slrv-fields">' +
        field('Club or team name','teamName','text',null,'',false,true) +
        field('Team type','teamType','select',[
          'Grassroots club','Academy','School team','Community programme',
          'Independent team','Other'
        ],'',false,true) +
        field('League or competition','league','text',null,
          'Optional if the team is not currently in a league.',false,false) +
        field('Primary age group','primaryAgeGroup','select',[
          'U7','U8','U9','U10','U11','U12','U13','U14','U15','U16',
          'Multiple age groups'
        ],'',false,true) +
        field('Region or county','county','text',null,'',false,true) +
        field('Average club size','averageClubSize','select',[
          '1–20 players','21–50 players','51–100 players',
          '101–250 players','251–500 players','More than 500 players'
        ],'',false,true) +
        field('Club website or social page','teamWebsite','url',null,
          'Optional.',false,false) +
        field('Number of teams','numberOfTeams','select',[
          '1 team','2–5 teams','6–10 teams','11–20 teams',
          'More than 20 teams'
        ],'',false,true) +
      '</div>' +
      helper(
        'Your workspace',
        'You can add or update teams, age groups and squad information after registration.',
        'green'
      ),
      back:'Back to personal details',
      next:'Continue to declarations'
    };
  }

  function scoutStepOne() {
    return {
      stage:'Step 1 of 3',
      title:'Tell us who you are.',
      lead:'Use professional information that can be matched to your scouting role. Password creation happens after approval.',
      section:'Personal details',
      sectionCopy:'Your identity, contact information and current scouting role.',
      body:'<div class="slrv-fields">' +
        field('Full legal name','fullName','text',null,'',false,true) +
        field('Professional email','emailAddr','email',null,
          'Use the email connected to your scouting work where possible.',false,true) +
        field('Phone number','phone','tel',null,'',false,true) +
        field('Country','country','select',COUNTRY_OPTIONS,'',false,true) +
        field('Current scouting role','currentScoutingRole','select',[
          'Club Scout','Regional Scout','Academy Scout','Head of Recruitment',
          'Recruitment Analyst','Independent Scout','Other'
        ],'',false,true) +
        field('Preferred contact method','preferredContactMethod','select',[
          'Email','Phone','Either'
        ],'',false,true) +
      '</div>' +
      helper(
        'Why we ask',
        'Scout access is controlled. Accurate professional information supports the identity and role review.',
        ''
      ),
      back:'Back to account types',
      next:'Continue to team details'
    };
  }

  function scoutStepTwo() {
    return {
      stage:'Step 2 of 3',
      title:'Tell us about the team and preferred plan.',
      lead:'Choose the ScoutLink plan that best matches the recruitment workflow. This does not start a subscription or require payment.',
      section:'Team and plan details',
      sectionCopy:'Organisation, coverage, expected usage and the plan the team is interested in.',
      body:'<div class="slrv-fields">' +
        field('Organisation or club','scoutClub','text',null,'',false,true) +
        field('Organisation type','organisationType','select',[
          'Professional club','Academy','Independent scouting organisation',
          'Agency','School or college','Other'
        ],'',false,true) +
        field('Scouting team name','scoutingTeamName','text',null,'',false,true) +
        field('Primary scouting region','primaryScoutingRegion','text',null,'',false,true) +
        field('Organisation website','organisationWebsite','url',null,
          'Optional, but useful during review.',false,false) +
        field('Expected scout users','expectedScoutUsers','select',[
          '1 user','2–5 users','6–10 users','11–20 users',
          'More than 20 users'
        ],'',false,true) +
        field('Preferred ScoutLink plan','preferredScoutPlan','select',[
          'Core','Plus','Elite','Enterprise / custom team plan',
          'Not sure – help me choose'
        ],'',false,true) +
        field('Expected player-search activity','expectedSearchActivity','select',[
          'Occasional','Monthly','Weekly','Daily'
        ],'',false,true) +
      '</div>' +
      planSection() +
      helper(
        'No payment is required now',
        'The selected plan is an expression of interest. Stratex reviews the application first, then confirms the final plan, limits and commercial terms before any payment begins.',
        'gold'
      ),
      back:'Back to personal details',
      next:'Continue to declarations'
    };
  }

  function declaration(title,copy,index) {
    var on = state.declarations[index] === true;

    return '<div class="slrv-declaration">' +
      '<button class="slrv-check' + (on ? ' on' : '') +
        '" type="button" data-declaration="' + index +
        '" aria-pressed="' + (on ? 'true' : 'false') +
        '" aria-label="' + esc(title) + '">' +
        (on ? '&#10003;' : '') +
      '</button>' +
      '<div><b>' + esc(title) + '</b><p>' + esc(copy) + '</p></div>' +
    '</div>';
  }

  function summaryRows() {
    var rows = state.role === 'coach'
      ? [
          ['Account',state.values.fullName || '—'],
          ['Role',state.values.primaryRole || '—'],
          ['Team',state.values.teamName || '—'],
          ['Age group',state.values.primaryAgeGroup || '—'],
          ['Club size',state.values.averageClubSize || '—'],
          ['Account cost','Free']
        ]
      : [
          ['Applicant',state.values.fullName || '—'],
          ['Role',state.values.currentScoutingRole || '—'],
          ['Organisation',state.values.scoutClub || '—'],
          ['Scout users',state.values.expectedScoutUsers || '—'],
          ['Preferred plan',state.values.preferredScoutPlan || '—'],
          ['Payment today','£0']
        ];

    return '<div class="slrv-summary">' +
      '<div class="slrv-summary-head">' +
        '<b>Application summary</b>' +
        '<button type="button" data-edit-details>Edit details</button>' +
      '</div>' +
      '<div class="slrv-summary-grid">' +
        rows.map(function (row) {
          return '<div class="slrv-summary-item">' +
            '<span>' + esc(row[0]) + '</span>' +
            '<b>' + esc(row[1]) + '</b>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>';
  }

  function finalStep() {
    var coach = state.role === 'coach';

    var declarations = coach
      ? [
          [
            'Team and player authority',
            'I confirm that I am authorised to manage this team and the player information added to ScoutLink, and that I will keep the information accurate and appropriate.'
          ],
          [
            'Responsible ScoutLink use',
            'I agree to ScoutLink’s Terms, Privacy Policy and safeguarding expectations, including keeping youth-player visibility and scout contact controlled and adult-led.'
          ]
        ]
      : [
          [
            'Legitimate scouting use',
            'I confirm that the information in this application is accurate and that ScoutLink access will be used only for legitimate football scouting and recruitment activity.'
          ],
          [
            'Responsible access and contact',
            'I agree to ScoutLink’s Terms, Privacy Policy and safeguarding expectations, including using player information responsibly and keeping contact coach, club or appropriate-adult mediated.'
          ]
        ];

    return {
      stage:'Step 3 of 3',
      title:coach
        ? 'Confirm how the workspace will be used.'
        : 'Review and submit the application.',
      lead:coach
        ? 'Two clear confirmations replace a long list of separate declarations.'
        : 'Confirm the two responsibilities and check the application summary. Verification documents are not uploaded during registration.',
      section:coach ? 'Declarations' : 'Declarations and review',
      sectionCopy:coach
        ? 'Read and confirm both statements before creating the coach account.'
        : 'Submit the access request first. ScoutLink then emails the secure verification link separately.',
      body:'<div class="slrv-declarations">' +
        declaration(declarations[0][0],declarations[0][1],0) +
        declaration(declarations[1][0],declarations[1][1],1) +
      '</div>' +
      summaryRows() +
      helper(
        'What happens next',
        coach
          ? 'Submit the registration, verify the email address and complete account access through the secure registration email.'
          : 'ScoutLink creates a pending access request and sends a secure verification email. The email link opens the separate Scout Verification page where the two required files can be submitted. No payment or subscription begins now.',
        coach ? 'green' : ''
      ),
      back:coach ? 'Back to team details' : 'Back to team and plan',
      next:coach ? 'Submit coach registration' : 'Submit scout application'
    };
  }

  function currentStepData() {
    if (state.step === 3) return finalStep();
    if (state.role === 'coach') {
      return state.step === 1 ? coachStepOne() : coachStepTwo();
    }
    return state.step === 1 ? scoutStepOne() : scoutStepTwo();
  }

  function registrationMarkup() {
    var data = ROLE_DATA[state.role];
    var form = currentStepData();

    return '<a class="slrv-skip" href="#slrvMain">Skip to registration form</a>' +
      '<div class="slrv-site">' +
        siteHeader() +
        '<main class="slrv-registration" id="slrvMain">' +
          '<div class="slrv-registration-shell">' +
            '<aside class="slrv-intro" aria-label="' +
              esc(data.label) + ' progress">' +
              '<span class="slrv-role-label">' + esc(data.label) + '</span>' +
              '<h1>' + esc(data.hero) + '</h1>' +
              '<p>' + esc(data.intro) + '</p>' +
              '<div class="slrv-steps">' + stepsMarkup() + '</div>' +
              '<div class="slrv-side-card">' +
                '<b>' + esc(data.sideTitle) + '</b>' +
                '<p>' + esc(data.sideCopy) + '</p>' +
              '</div>' +
            '</aside>' +
            '<section class="slrv-form-panel" aria-label="' +
              esc(data.label) + ' form">' +
              '<div class="slrv-form-head">' +
                '<div><span class="slrv-stage">' + esc(form.stage) + '</span>' +
                  '<h2>' + esc(form.title) + '</h2>' +
                  '<p>' + esc(form.lead) + '</p></div>' +
                '<button class="slrv-btn" type="button" data-save-exit>' +
                  'Save and exit</button>' +
              '</div>' +
              '<div class="slrv-progress"><span style="width:' +
                (state.step * 33.333) + '%"></span></div>' +
              '<div class="slrv-message" id="slrvMessage" role="status"></div>' +
              '<form id="slrvRegistrationForm" novalidate>' +
                '<div class="slrv-form-body">' +
                  '<div class="slrv-section-title">' +
                    '<h3>' + esc(form.section) + '</h3>' +
                    '<p>' + esc(form.sectionCopy) + '</p>' +
                  '</div>' +
                  form.body +
                '</div>' +
                '<div class="slrv-form-footer">' +
                  '<div class="slrv-form-footer-note">' +
                    (state.role === 'scout'
                      ? 'Submitting does not start a paid subscription.'
                      : 'Your progress can be saved securely in this browser before submission.') +
                  '</div>' +
                  '<div class="slrv-footer-actions">' +
                    (state.step === 1
                      ? '<a class="slrv-btn" href="' +
                        scoutLink('register') + '">' + esc(form.back) + '</a>'
                      : '<button class="slrv-btn" type="button" data-prev>' +
                        esc(form.back) + '</button>') +
                    '<button class="slrv-btn primary" type="submit">' +
                      esc(form.next) + '</button>' +
                  '</div>' +
                '</div>' +
              '</form>' +
            '</section>' +
          '</div>' +
        '</main>' +
        siteFooter() +
      '</div>';
  }

  function successMarkup(message) {
    var coach = state.role === 'coach';

    return '<div class="slrv-success">' +
      '<div class="slrv-success-mark">&#10003;</div>' +
      '<h2>' + (coach
        ? 'Coach registration submitted.'
        : 'Scout access application submitted.') +
      '</h2>' +
      '<p>' + esc(message) + '</p>' +
      helper(
        coach ? 'What happens next' : 'Secure verification comes next',
        coach
          ? 'Stratex reviews the request and emails the account-completion step. No password was created on this page.'
          : 'A separate email contains the secure Scout Verification link. Upload the two required files there. Payment is requested only after the internal review is completed.',
        coach ? 'green' : ''
      ) +
      '<div style="margin-top:20px;display:flex;gap:8px;flex-wrap:wrap">' +
        '<a class="slrv-btn primary" href="' + scoutLink('login') + '">Open sign in</a>' +
        '<a class="slrv-btn" href="' + scoutLink('') + '">Return to ScoutLink</a>' +
      '</div>' +
    '</div>';
  }

  function collectVisibleValues(form) {
    var data = new FormData(form);

    data.forEach(function (value,key) {
      state.values[key] = String(value || '').trim();
    });
  }

  function showMessage(text,type) {
    var node = document.getElementById('slrvMessage');
    if (!node) return;

    node.textContent = text || '';
    node.className = 'slrv-message';

    if (text) {
      node.classList.add('show');
      node.classList.add(type === 'success' ? 'success' : 'error');
      node.scrollIntoView({behavior:'smooth',block:'nearest'});
    }
  }

  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  }

  function validateCurrentStep(form) {
    collectVisibleValues(form);

    var required = form.querySelectorAll('[required]');

    for (var index = 0; index < required.length; index += 1) {
      if (!String(required[index].value || '').trim()) {
        required[index].focus();
        return 'Complete every required field before continuing.';
      }
    }

    if (
      state.step === 1 &&
      !validEmail(state.values.emailAddr)
    ) {
      var email = form.querySelector('[name="emailAddr"]');
      if (email) email.focus();
      return 'Enter a valid email address.';
    }

    if (
      state.step === 1 &&
      String(state.values.fullName || '').trim().split(/\s+/).length < 2
    ) {
      var fullName = form.querySelector('[name="fullName"]');
      if (fullName) fullName.focus();
      return 'Enter the applicant’s first and last name.';
    }

    if (
      state.step === 3 &&
      (!state.declarations[0] || !state.declarations[1])
    ) {
      return 'Confirm both declarations before submitting.';
    }

    return '';
  }

  async function submitRegistration(button) {
    button.disabled = true;
    var original = button.textContent;
    button.textContent = 'Submitting…';

    var endpoint = state.role === 'coach'
      ? '/api/registrations/coach'
      : '/api/registrations/scout';

    var payload = state.role === 'coach'
      ? {
          fullName:state.values.fullName,
          emailAddr:state.values.emailAddr,
          phone:state.values.phone,
          country:state.values.country,
          primaryRole:state.values.primaryRole,
          preferredContactMethod:state.values.preferredContactMethod,
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
            mediaPermission:true,
            responsibleUse:true
          }
        }
      : {
          fullName:state.values.fullName,
          emailAddr:state.values.emailAddr,
          phone:state.values.phone,
          country:state.values.country,
          currentScoutingRole:state.values.currentScoutingRole,
          preferredContactMethod:state.values.preferredContactMethod,
          scoutClub:state.values.scoutClub,
          organisationType:state.values.organisationType,
          scoutingTeamName:state.values.scoutingTeamName,
          primaryScoutingRegion:state.values.primaryScoutingRegion,
          organisationWebsite:state.values.organisationWebsite,
          expectedScoutUsers:state.values.expectedScoutUsers,
          preferredScoutPlan:state.values.preferredScoutPlan,
          expectedSearchActivity:state.values.expectedSearchActivity,
          dataPolicyAgreed:true,
          declarationVersion:'scout-declarations-v2-2026-07',
          activityNoticeVersion:'platform-activity-v1-2026-07',
          declarations:{
            legitimateCapacity:true,
            responsibleAccess:true
          }
        };

    try {
      var response = await fetch(API + endpoint,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload),
        credentials:'include'
      });

      var json = await response.json().catch(function () {
        return {};
      });

      if (!response.ok) {
        throw new Error(
          json.error || 'The registration could not be submitted.'
        );
      }

      state.submitted = true;
      clearDraft();

      var panel = document.querySelector('.slrv-form-panel');
      if (panel) {
        panel.innerHTML = successMarkup(
          json.message ||
          'The registration was received. Check the registered email address for the next step.'
        );
      }

      track('scoutlink_registration_submitted',{
        accountType:state.role === 'coach' ? 'Coach' : 'Scout',
        preferredPlan:state.values.preferredScoutPlan || ''
      });
    } catch (error) {
      button.disabled = false;
      button.textContent = original;
      showMessage(
        error.message || 'The registration could not be submitted.',
        'error'
      );
    }
  }

  function renderRegistration() {
    var app = document.getElementById('slRegistrationApp');
    if (!app) return;

    state.role = roleFromPage();
    if (!state.role) return;

    document.body.className = 'slrv-body';
    document.body.setAttribute('data-registration-role',state.role);

    app.innerHTML = registrationMarkup();
    bindSharedPage();
    bindRegistration();
  }

  function bindSharedPage() {
    var menu = document.getElementById('slrvMenu');

    if (menu) {
      menu.addEventListener('click',function () {
        var open = document.body.classList.toggle('slrv-menu-open');
        menu.setAttribute('aria-expanded',open ? 'true' : 'false');
        menu.setAttribute(
          'aria-label',
          open ? 'Close ScoutLink menu' : 'Open ScoutLink menu'
        );
      });
    }
  }

  function bindRegistration() {
    var form = document.getElementById('slrvRegistrationForm');

    if (!form) return;

    form.addEventListener('input',function (event) {
      var target = event.target;

      if (target.name) {
        state.values[target.name] = String(target.value || '').trim();
      }
    });

    form.addEventListener('change',function (event) {
      var target = event.target;

      if (target.name) {
        state.values[target.name] = String(target.value || '').trim();
      }
    });

    form.addEventListener('submit',function (event) {
      event.preventDefault();

      var error = validateCurrentStep(form);

      if (error) {
        showMessage(error,'error');
        return;
      }

      showMessage('','');

      if (state.step < 3) {
        state.step += 1;
        saveDraft();
        renderRegistration();
        document.getElementById('slrvMain').focus?.();
        window.scrollTo({top:0,behavior:'smooth'});
        return;
      }

      submitRegistration(form.querySelector('button[type="submit"]'));
    });

    var previous = form.querySelector('[data-prev]');

    if (previous) {
      previous.addEventListener('click',function () {
        collectVisibleValues(form);
        state.step = Math.max(1,state.step - 1);
        saveDraft();
        renderRegistration();
        window.scrollTo({top:0,behavior:'smooth'});
      });
    }

    var saveExit = document.querySelector('[data-save-exit]');

    if (saveExit) {
      saveExit.addEventListener('click',function () {
        collectVisibleValues(form);
        saveDraft();
        track('scoutlink_registration_draft_saved',{
          accountType:state.role
        });
        window.location.href = scoutLink('register');
      });
    }

    document.querySelectorAll('[data-declaration]').forEach(
      function (button) {
        button.addEventListener('click',function () {
          var index = Number(button.getAttribute('data-declaration'));
          state.declarations[index] = !state.declarations[index];
          button.classList.toggle('on',state.declarations[index]);
          button.setAttribute(
            'aria-pressed',
            state.declarations[index] ? 'true' : 'false'
          );
          button.innerHTML = state.declarations[index]
            ? '&#10003;'
            : '';
        });
      }
    );

    document.querySelectorAll('[data-plan]').forEach(
      function (button) {
        button.addEventListener('click',function () {
          var plan = button.getAttribute('data-plan');
          state.values.preferredScoutPlan = plan;
          renderRegistration();
        });
      }
    );

    var edit = document.querySelector('[data-edit-details]');

    if (edit) {
      edit.addEventListener('click',function () {
        state.step = 1;
        saveDraft();
        renderRegistration();
        window.scrollTo({top:0,behavior:'smooth'});
      });
    }
  }

  function verificationPublicMarkup() {
    return '<a class="slrv-skip" href="#slrvMain">Skip to Scout Verification</a>' +
      '<div class="slrv-site">' +
        siteHeader() +
        '<main class="slrv-verification-public" id="slrvMain">' +
          '<section class="slrv-verification-hero">' +
            '<div class="slrv-verification-inner slrv-verification-hero-grid">' +
              '<div><span class="slrv-verification-kicker">Scout access review</span>' +
                '<h1>Player search begins with a reviewed application.</h1>' +
                '<p>ScoutLink restricts scouting tools to applicants whose identity, role and safeguarding information have been reviewed through the platform process.</p>' +
                '<div class="slrv-verification-actions">' +
                  '<a class="slrv-btn primary" href="' +
                    scoutLink('register/scout') +
                    '">Request Scout Access</a>' +
                  '<a class="slrv-btn" href="https://www.stratexanalytics.co.uk/trust">Read the Trust Page</a>' +
                '</div>' +
                '<div class="slrv-verification-note">' +
                  '<b>Approval is controlled access, not a public endorsement.</b>' +
                  '<p>Access may later be restricted or removed where information changes or concerns arise.</p>' +
                '</div>' +
              '</div>' +
              '<aside class="slrv-verification-visual">' +
                '<small>Scout access review</small>' +
                '<h3>Registration first. Secure evidence second.</h3>' +
                '<p>The registration form collects professional and team details. The secure verification link is emailed only after the access request is submitted.</p>' +
                '<div class="slrv-verification-stat-grid">' +
                  '<div class="slrv-verification-stat"><b>Apply</b><span>Professional details</span></div>' +
                  '<div class="slrv-verification-stat"><b>Verify</b><span>Secure email link</span></div>' +
                  '<div class="slrv-verification-stat"><b>Review</b><span>Internal decision</span></div>' +
                '</div>' +
              '</aside>' +
            '</div>' +
          '</section>' +
          '<section class="slrv-verification-section">' +
            '<div class="slrv-verification-inner">' +
              '<div class="slrv-verification-head">' +
                '<div><span class="slrv-verification-kicker">The review process</span>' +
                  '<h2>Four stages before player-search access.</h2></div>' +
                '<p>The application should remain accurate throughout the review and after access is granted.</p>' +
              '</div>' +
              '<div class="slrv-verification-steps">' +
                '<article class="slrv-verification-step"><strong>01</strong><h3>Submit the application</h3><p>Provide personal, organisation and team information, choose the preferred plan and complete the declarations.</p></article>' +
                '<article class="slrv-verification-step"><strong>02</strong><h3>Provide supporting evidence</h3><p>Open the secure email link and upload the identity and safeguarding files requested by the existing verification workflow.</p></article>' +
                '<article class="slrv-verification-step"><strong>03</strong><h3>Internal review</h3><p>Stratex reviews the application, documents, role context and anything that needs clarification.</p></article>' +
                '<article class="slrv-verification-step"><strong>04</strong><h3>Access decision</h3><p>The application is approved, declined or returned for more information. Payment is handled only after verification.</p></article>' +
              '</div>' +
            '</div>' +
          '</section>' +
        '</main>' +
        siteFooter() +
      '</div>';
  }

  function secureVerificationMarkup(token) {
    return '<a class="slrv-skip" href="#slrvMain">Skip to secure verification form</a>' +
      '<div class="slrv-site">' +
        siteHeader() +
        '<main class="slrv-secure-page" id="slrvMain">' +
          '<section class="slrv-secure-hero">' +
            '<div class="slrv-verification-inner">' +
              '<span class="slrv-verification-kicker">Secure scout verification</span>' +
              '<h1>Complete the requested verification documents.</h1>' +
              '<p>Use the secure link from your ScoutLink registration email. The files are sent to the existing restricted verification workflow.</p>' +
              '<div class="slrv-secure-rule">Accepted files are PDF, JPG, PNG, DOC or DOCX. Each file must be 5MB or smaller.</div>' +
            '</div>' +
          '</section>' +
          '<section class="slrv-secure-content">' +
            '<div class="slrv-secure-layout">' +
              '<aside class="slrv-secure-status" id="slrvVerificationStatus" aria-live="polite">' +
                '<span class="slrv-secure-status-pill">Checking link</span>' +
                '<h2>Loading verification request</h2>' +
                '<p>The secure request is being checked before uploads are enabled.</p>' +
              '</aside>' +
              '<section class="slrv-secure-form-card">' +
                '<form id="slrvVerificationForm" data-token="' +
                  esc(token) + '">' +
                  '<h2>Submit documents</h2>' +
                  '<p>The current verification workflow contains only the two required fields below.</p>' +
                  '<div class="slrv-secure-fields">' +
                    '<label><span class="slrv-secure-label">Safeguarding or DBS evidence</span>' +
                      '<input class="slrv-file" type="file" name="safeguardingEvidence" ' +
                      'accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required></label>' +
                    '<label><span class="slrv-secure-label">Proof of ID</span>' +
                      '<input class="slrv-file" type="file" name="proofOfId" ' +
                      'accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required></label>' +
                  '</div>' +
                  '<p class="slrv-secure-help">Both files are required for this secure upload route.</p>' +
                  '<div class="slrv-secure-message" id="slrvVerificationMessage" role="status">No files selected yet.</div>' +
                  '<div class="slrv-secure-actions">' +
                    '<button class="slrv-btn primary" type="submit" disabled>Submit verification documents</button>' +
                  '</div>' +
                  '<div class="slrv-secure-private"><b>Private internal review</b><br>The files are not shown to coaches, scouts, players or public users. Access remains pending until review and the later payment process are complete.</div>' +
                '</form>' +
              '</section>' +
            '</div>' +
          '</section>' +
        '</main>' +
        siteFooter() +
      '</div>';
  }

  function verificationStatusMarkup(data) {
    var applicant = [
      data.firstName,
      data.lastName
    ].filter(Boolean).join(' ');

    var status = String(data.verificationStatus || 'awaiting_documents');
    var labels = {
      awaiting_documents:'Awaiting documents',
      documents_submitted:'Documents submitted',
      verified_awaiting_payment:'Verified, awaiting payment',
      activated:'Access activated'
    };

    return '<span class="slrv-secure-status-pill' +
      (status === 'documents_submitted' ? ' success' : '') + '">' +
      esc(labels[status] || status.replace(/_/g,' ')) +
    '</span>' +
    '<h2>' + esc(applicant || 'Scout verification request') + '</h2>' +
    '<p>The secure link is valid. Upload access depends on the current registration stage.</p>' +
    '<div class="slrv-secure-status-list">' +
      '<div class="slrv-secure-status-row"><b>Registration</b><span>' +
        esc((applicant || 'Applicant') + ' · ' + (data.scoutClub || 'Organisation not supplied')) +
      '</span></div>' +
      '<div class="slrv-secure-status-row"><b>Current stage</b><span>' +
        esc(labels[status] || status.replace(/_/g,' ')) +
      '</span></div>' +
      '<div class="slrv-secure-status-row"><b>Documents uploaded</b><span>' +
        esc(String(data.documentsUploaded || 0)) +
      '</span></div>' +
      '<div class="slrv-secure-status-row"><b>Access</b><span>' +
        (status === 'activated'
          ? 'ScoutLink access has been activated.'
          : 'ScoutLink player search remains unavailable.') +
      '</span></div>' +
    '</div>';
  }

  function validUpload(file) {
    if (!file) return 'Both verification files are required.';

    if (file.size > 5 * 1024 * 1024) {
      return file.name + ' is larger than 5MB.';
    }

    if (!/\.(pdf|jpe?g|png|doc|docx)$/i.test(file.name || '')) {
      return file.name + ' is not an accepted file type.';
    }

    return '';
  }

  async function loadVerificationRequest(token) {
    var status = document.getElementById('slrvVerificationStatus');
    var form = document.getElementById('slrvVerificationForm');
    var submit = form && form.querySelector('button[type="submit"]');
    var message = document.getElementById('slrvVerificationMessage');

    try {
      var response = await fetch(
        API + '/api/registrations/scout-verification/' +
        encodeURIComponent(token),
        {credentials:'include'}
      );

      var json = await response.json().catch(function () {
        return {};
      });

      if (!response.ok) {
        throw new Error(json.error || 'The verification link is invalid.');
      }

      status.innerHTML = verificationStatusMarkup(json);

      if (json.verificationStatus === 'awaiting_documents') {
        submit.disabled = false;
        message.textContent = 'Choose both files before submitting.';
      } else if (json.verificationStatus === 'documents_submitted') {
        submit.disabled = true;
        message.className = 'slrv-secure-message success';
        message.textContent =
          'Documents have already been submitted. Stratex will email the next step after review.';
        form.querySelectorAll('input[type="file"]').forEach(function (input) {
          input.disabled = true;
        });
      } else {
        submit.disabled = true;
        message.textContent =
          'Document upload is not available at the current registration stage.';
        form.querySelectorAll('input[type="file"]').forEach(function (input) {
          input.disabled = true;
        });
      }
    } catch (error) {
      status.innerHTML =
        '<span class="slrv-secure-status-pill error">Link unavailable</span>' +
        '<h2>Verification request unavailable</h2>' +
        '<p>' + esc(error.message || 'The secure link could not be checked.') + '</p>';

      submit.disabled = true;
      message.className = 'slrv-secure-message error';
      message.textContent =
        'Contact info@scoutlink.app if a replacement verification link is required.';
    }
  }

  function bindVerification(token) {
    var form = document.getElementById('slrvVerificationForm');
    if (!form) return;

    form.addEventListener('change',function () {
      var files = [
        form.querySelector('[name="safeguardingEvidence"]').files[0],
        form.querySelector('[name="proofOfId"]').files[0]
      ];

      var text = files.filter(Boolean).map(function (file) {
        return file.name;
      }).join(' · ');

      var message = document.getElementById('slrvVerificationMessage');

      if (text) message.textContent = text;
    });

    form.addEventListener('submit',async function (event) {
      event.preventDefault();

      var safeguarding = form.querySelector(
        '[name="safeguardingEvidence"]'
      ).files[0];

      var proof = form.querySelector('[name="proofOfId"]').files[0];
      var message = document.getElementById('slrvVerificationMessage');
      var submit = form.querySelector('button[type="submit"]');

      var error = validUpload(safeguarding) || validUpload(proof);

      if (error) {
        message.className = 'slrv-secure-message error';
        message.textContent = error;
        return;
      }

      submit.disabled = true;
      submit.textContent = 'Submitting…';
      message.className = 'slrv-secure-message';
      message.textContent = 'Uploading both private verification files…';

      var data = new FormData();
      data.append('safeguardingEvidence',safeguarding);
      data.append('proofOfId',proof);

      try {
        var response = await fetch(
          API + '/api/registrations/scout-verification/' +
          encodeURIComponent(token),
          {
            method:'POST',
            body:data,
            credentials:'include'
          }
        );

        var json = await response.json().catch(function () {
          return {};
        });

        if (!response.ok) {
          throw new Error(
            json.error || 'The verification files could not be submitted.'
          );
        }

        message.className = 'slrv-secure-message success';
        message.textContent = json.message ||
          'Verification documents received. Stratex will review them and email the next step.';

        form.querySelectorAll('input[type="file"]').forEach(function (input) {
          input.disabled = true;
        });

        submit.textContent = 'Documents submitted';
        submit.disabled = true;

        await loadVerificationRequest(token);

        track('scout_verification_documents_submitted',{
          documentsUploaded:json.documentsUploaded || 2
        });
      } catch (uploadError) {
        submit.disabled = false;
        submit.textContent = 'Submit verification documents';
        message.className = 'slrv-secure-message error';
        message.textContent = uploadError.message ||
          'The verification files could not be submitted.';
      }
    });
  }

  function renderVerification() {
    var params = new URLSearchParams(window.location.search);
    var token = String(params.get('token') || '').trim();

    document.body.innerHTML = token
      ? secureVerificationMarkup(token)
      : verificationPublicMarkup();

    document.body.className = 'slrv-body';

    bindSharedPage();

    if (token) {
      bindVerification(token);
      loadVerificationRequest(token);
    }

    document.title = token
      ? 'Secure Scout Verification | ScoutLink'
      : 'Scout Verification | ScoutLink';
  }

  function start() {
    if (isVerificationRoute()) {
      renderVerification();
      return;
    }

    var role = roleFromPage();

    if (role) {
      state.role = role;
      state.values = {
        country:'United Kingdom',
        preferredContactMethod:'Email',
        preferredScoutPlan:'Elite'
      };
      loadDraft(role);
      renderRegistration();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded',start);
  } else {
    start();
  }
})();
