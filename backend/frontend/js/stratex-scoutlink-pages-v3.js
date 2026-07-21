'use strict';

(function () {
  var SCOUTLINK = {
    base:'https://www.scoutlink.app',
    login:'https://www.scoutlink.app/login',
    coach:'https://www.scoutlink.app/register/coach',
    scout:'https://www.scoutlink.app/register/scout',
    demo:'https://www.scoutlink.app/demo'
  };

  var PRICES = {
    annual:{
      Core:['£599','per year'],
      Plus:['£1,999','per year'],
      Elite:['£4,999','per year'],
      Enterprise:['Custom','annual agreement']
    },
    monthly:{
      Core:['£69','per month'],
      Plus:['£219','per month'],
      Elite:['£549','per month'],
      Enterprise:['Custom','commercial agreement']
    }
  };

  var pageData = {
    scoutlink:{
      title:'ScoutLink by Stratex Analytics | Grassroots Football Intelligence',
      description:'ScoutLink helps coaches create structured U7–U16 player profiles and gives reviewed scouts better evidence to search, compare and shortlist players.',
      canonical:'/scoutlink',
      kicker:'ScoutLink by Stratex Analytics',
      heading:'Coach-led. Scout-reviewed. Youth football, properly.',
      lead:'ScoutLink helps grassroots coaches build structured player evidence and gives reviewed scouts a clearer way to search, compare and shortlist talent without turning youth football into an open public directory.'
    },
    compatibility:{
      title:'ScoutLink Compatibility Score | Football Player-Team Fit Scoring',
      description:'ScoutLink uses compatibility scoring to help reviewed scouts understand how U7–U16 grassroots players may fit a team’s needs, role, style and development context.',
      canonical:'/scoutlink/compatibility-score',
      kicker:'ScoutLink compatibility score',
      heading:'Player-team fit review, supported by structured evidence.',
      lead:'ScoutLink compares coach-led player evidence with scout-entered team needs, role expectations, formation, playing style, squad gaps and longer-term context. The result supports judgement; it does not replace it.'
    },
    pricing:{
      title:'ScoutLink Pricing | Reviewed Football Scout Access',
      description:'Compare ScoutLink annual and monthly pricing for reviewed scout access, player discovery, compatibility, exports and recruitment workflow limits.',
      canonical:'/scoutlink/pricing',
      kicker:'ScoutLink plans',
      heading:'Scouting access that grows with the recruitment team.',
      lead:'Coach workspaces are free. Scout subscriptions are designed around player discovery, comparison, pipeline activity, collaboration and the size of the recruitment operation.'
    },
    'scoutlink-scouts':{
      title:'ScoutLink for Football Scouts | Grassroots Player Discovery',
      description:'Search, compare and shortlist U7–U16 grassroots players using coach-led evidence, compatibility scoring and an organised recruitment pipeline.',
      canonical:'/scoutlink/scouts',
      kicker:'For reviewed football scouts',
      heading:'Find players by fit, not noise.',
      lead:'Search, compare and shortlist grassroots players using structured coach-led evidence, explainable compatibility and an organised recruitment pipeline.'
    },
    'scoutlink-coaches':{
      title:'ScoutLink for Grassroots Football Coaches | Player Profiles',
      description:'Build structured U7–U16 player profiles, Match Facts, fixtures and approved video evidence for reviewed football scouts.',
      canonical:'/scoutlink/coaches',
      kicker:'For grassroots football coaches',
      heading:'Turn local knowledge into player evidence.',
      lead:'Build useful player profiles, keep match evidence current and manage reviewed scout interest without adding unnecessary administration.'
    },
    scouts:{
      title:'Football Scouting Software for Grassroots Player Discovery | ScoutLink',
      description:'ScoutLink gives reviewed football scouts a structured way to discover, compare and shortlist overlooked U7–U16 grassroots players.',
      canonical:'/scouts',
      kicker:'Football scouting software',
      heading:'Grassroots player discovery for reviewed football scouts.',
      lead:'ScoutLink gives recruitment teams a structured way to search, compare and shortlist overlooked grassroots players before they appear consistently in professional-market data.'
    },
    coaches:{
      title:'Football Player Profile Software for Grassroots Coaches | ScoutLink',
      description:'Create coach-led grassroots player profiles, Match Facts, ratings and approved video evidence for reviewed football scouts.',
      canonical:'/coaches',
      kicker:'Grassroots football coach tools',
      heading:'Give your players more than crossed fingers.',
      lead:'Create structured player profiles, record meaningful match evidence and make strong football context easier for reviewed scouts to find.'
    },
    tools:{
      title:'Grassroots Football Scouting Tools for U7–U16 Players | ScoutLink',
      description:'Explore ScoutLink grassroots football scouting tools for coach-led profiles, Match Facts, approved video, compatibility scoring and reviewed scout workflows.',
      canonical:'/grassroots-football-scouting-tools',
      kicker:'Grassroots football intelligence',
      heading:'The toolkit connecting evidence, discovery and safer visibility.',
      lead:'ScoutLink brings together player profiles, Match Facts, approved video evidence, scout search, compatibility, player comparison and recruitment pipelines.'
    }
  };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g,function (char) {
      return {
        '&':'&amp;',
        '<':'&lt;',
        '>':'&gt;',
        '"':'&quot;',
        "'":'&#39;'
      }[char];
    });
  }

  function isStratexHost() {
    return /(^|\.)stratexanalytics\.co\.uk$/i.test(
      window.location.hostname
    );
  }

  function cleanPath() {
    var path = window.location.pathname.replace(/\/+$/,'') || '/';

    if (!isStratexHost() && path.indexOf('/company') === 0) {
      path = path.replace(/^\/company/,'') || '/';
    }

    return path;
  }

  function routeKey() {
    var path = cleanPath();

    if (path === '/scoutlink') return 'scoutlink';
    if (
      path === '/scoutlink/compatibility-score' ||
      path === '/compatibility-score'
    ) return 'compatibility';
    if (
      path === '/scoutlink/pricing' ||
      path === '/pricing'
    ) return 'pricing';
    if (path === '/scoutlink/scouts') return 'scoutlink-scouts';
    if (path === '/scoutlink/coaches') return 'scoutlink-coaches';
    if (path === '/scouts') return 'scouts';
    if (path === '/coaches') return 'coaches';
    if (path === '/grassroots-football-scouting-tools') return 'tools';

    return '';
  }

  function sitePath(slug) {
    var clean = String(slug || '').replace(/^\/+|\/+$/g,'');

    if (isStratexHost()) {
      return clean ? '/' + clean : '/';
    }

    return clean ? '/company/' + clean : '/company';
  }

  function button(label,href,primary,attrs) {
    return '<a class="stxp-button' +
      (primary ? ' is-primary' : '') +
      '" href="' + esc(href) + '" ' +
      (attrs || '') + '>' +
      esc(label) +
    '</a>';
  }

  function visualLine(title,copy) {
    return '<div class="stxp-visual-line"><b>' +
      esc(title) + '</b><span>' +
      esc(copy) + '</span></div>';
  }

  function visualStat(value,label) {
    return '<div class="stxp-visual-stat"><b>' +
      esc(value) + '</b><span>' +
      esc(label) + '</span></div>';
  }

  function metric(label,value,width) {
    return '<div class="stxp-metric">' +
      '<div class="stxp-metric-head"><span>' +
        esc(label) + '</span><b>' +
        esc(value) + '</b></div>' +
      '<div class="stxp-track"><span style="width:' +
        Number(width) + '%"></span></div>' +
    '</div>';
  }

  function genericVisual(label,title,copy,rows,stats) {
    return '<article class="stxp-visual">' +
      '<span class="stxp-visual-label">' + esc(label) + '</span>' +
      '<h2>' + esc(title) + '</h2>' +
      '<p>' + esc(copy) + '</p>' +
      '<div class="stxp-visual-lines">' +
        rows.map(function (row) {
          return visualLine(row[0],row[1]);
        }).join('') +
      '</div>' +
      '<div class="stxp-visual-stats">' +
        stats.map(function (row) {
          return visualStat(row[0],row[1]);
        }).join('') +
      '</div>' +
    '</article>';
  }

  function compatibilityVisual() {
    return '<article class="stxp-visual">' +
      '<span class="stxp-visual-label">Fictional compatibility preview</span>' +
      '<div class="stxp-compat-head" style="margin-top:15px">' +
        '<div><span class="stxp-player-name">Carter Hill</span>' +
          '<span class="stxp-player-meta">ST · U16 · Northgate United</span></div>' +
        '<div class="stxp-compat-score">82%<small>Strong fit</small></div>' +
      '</div>' +
      metric('Need fit','86',86) +
      metric('Role fit','78',78) +
      metric('Evidence confidence','72',72) +
      '<div class="stxp-compat-note">Strong role fit for a high-pressing U16 side that needs pace, finishing and transitional attacking output.</div>' +
      '<div class="stxp-visual-stats">' +
        visualStat('Decision','Support') +
        visualStat('Scout','Context') +
        visualStat('Human','Judgement') +
      '</div>' +
    '</article>';
  }

  function visualFor(key) {
    if (key === 'compatibility') return compatibilityVisual();

    var presets = {
      scoutlink:[
        'The ScoutLink workflow',
        'One evidence standard from coach input to scout review.',
        'ScoutLink gives coaches a structured place to maintain player information and gives reviewed scouts a clearer place to assess it.',
        [
          ['Coach-led evidence','Profiles, Match Facts, fixtures and approved video stay connected.'],
          ['Reviewed scout workflows','Search, comparison, compatibility and pipeline activity remain permissioned.']
        ],
        [['U7–U16','Initial focus'],['Reviewed','Scout access'],['Controlled','Visibility']]
      ],
      pricing:[
        'ScoutLink subscriptions',
        'Clear usage for different recruitment teams.',
        'Scout subscriptions combine seats, coach-mediated interest, profile exports, predictions and team collaboration.',
        [
          ['Annual value','Annual plans provide the lowest total cost.'],
          ['Monthly flexibility','Monthly billing remains available at a higher effective rate.']
        ],
        [['Coach','Free'],['Scout','Paid'],['Access','Reviewed']]
      ],
      'scoutlink-scouts':[
        'Scout recruitment workflow',
        'From team need to organised shortlist.',
        'ScoutLink helps reviewed scouts narrow a grassroots database using football context rather than unstructured noise.',
        [
          ['Set the need','Record weaknesses, roles, age groups and tactical context.'],
          ['Review the evidence','Compare profiles, Match Facts, video and compatibility.']
        ],
        [['Search','Focused'],['Pipeline','Organised'],['Contact','Mediated']]
      ],
      'scoutlink-coaches':[
        'Coach squad workflow',
        'Turn what you know into evidence that travels.',
        'Coaches maintain the player record while ScoutLink organises the work into simple squad, fixture and Match Facts workflows.',
        [
          ['Build the squad','Create authorised U7–U16 player profiles.'],
          ['Keep it current','Add Match Facts, ratings, fixtures and approved video.']
        ],
        [['Workspace','Free'],['Evidence','Coach-led'],['Interest','Controlled']]
      ],
      scouts:[
        'Grassroots discovery',
        'A clearer first review before live scouting.',
        'ScoutLink is designed to complement professional data and video systems by improving earlier grassroots discovery.',
        [
          ['Search with context','Use age, role, location, evidence and compatibility.'],
          ['Move to decision','Compare, shortlist, export and maintain a pipeline.']
        ],
        [['Players','U7–U16'],['Access','Reviewed'],['Scouting','Human-led']]
      ],
      coaches:[
        'Coach evidence tools',
        'More context for the players you already know.',
        'ScoutLink helps coaches replace scattered files and messages with structured player evidence.',
        [
          ['Build profiles','Add position, attributes, development and physical context.'],
          ['Record performances','Turn fixtures and Match Facts into current evidence.']
        ],
        [['Account','Free'],['Profiles','Structured'],['Visibility','Safer']]
      ],
      tools:[
        'ScoutLink toolkit',
        'Evidence, discovery and trust in one workflow.',
        'The product connects the football information maintained by coaches with the search and decision tools used by reviewed scouts.',
        [
          ['Coach tools','Profiles, squads, fixtures, Match Facts and video.'],
          ['Scout tools','Search, compatibility, comparison, pipeline and exports.']
        ],
        [['Evidence','Structured'],['Search','Contextual'],['Access','Controlled']]
      ]
    };

    var p = presets[key];
    return genericVisual(p[0],p[1],p[2],p[3],p[4]);
  }

  function hero(key,actions,note) {
    var p = pageData[key];

    return '<section class="stxp-hero">' +
      '<div class="stxp-inner stxp-hero-grid">' +
        '<div><span class="stxp-kicker">' + esc(p.kicker) + '</span>' +
          '<h1>' + esc(p.heading) + '</h1>' +
          '<p class="stxp-hero-copy">' + esc(p.lead) + '</p>' +
          '<div class="stxp-actions">' + actions + '</div>' +
          (note ? '<div class="stxp-hero-note">' + esc(note) + '</div>' : '') +
        '</div>' +
        visualFor(key) +
      '</div>' +
    '</section>';
  }

  function sectionIntro(kicker,title,copy) {
    return '<div class="stxp-section-head">' +
      '<div><span class="stxp-kicker">' + esc(kicker) + '</span>' +
        '<h2>' + esc(title) + '</h2></div>' +
      '<p>' + esc(copy) + '</p>' +
    '</div>';
  }

  function card(number,title,copy,href,label) {
    return '<article class="stxp-card">' +
      (number != null
        ? '<span class="stxp-card-number">' +
          String(number).padStart(2,'0') +
          '</span>'
        : '') +
      '<h3>' + esc(title) + '</h3>' +
      '<p>' + esc(copy) + '</p>' +
      (href
        ? '<div class="stxp-card-actions">' +
          '<a class="stxp-button is-soft is-small" href="' +
          esc(href) + '">' + esc(label || 'Learn more') +
          '</a></div>'
        : '') +
    '</article>';
  }

  function cards(items,columns) {
    return '<div class="stxp-grid' +
      (columns === 3 ? ' is-three' : columns === 4 ? ' is-four' : '') +
      '">' +
      items.map(function (item,index) {
        return card(
          item.number === false ? null : index + 1,
          item.title,
          item.copy,
          item.href,
          item.label
        );
      }).join('') +
    '</div>';
  }

  function feature(title,copy) {
    return '<div class="stxp-feature"><b>' +
      esc(title) + '</b><span>' +
      esc(copy) + '</span></div>';
  }

  function featureRow(title,copy) {
    return '<div class="stxp-feature-row"><b>' +
      esc(title) + '</b><span>' +
      esc(copy) + '</span></div>';
  }

  function step(number,title,copy) {
    return '<article class="stxp-step">' +
      '<strong>' + String(number).padStart(2,'0') + '</strong>' +
      '<h3>' + esc(title) + '</h3>' +
      '<p>' + esc(copy) + '</p>' +
    '</article>';
  }

  function faqs(items) {
    return '<section class="stxp-section is-white">' +
      '<div class="stxp-inner">' +
        sectionIntro(
          'Frequently asked questions',
          'Clear answers before you start.',
          'These answers explain ScoutLink’s role and limitations without promising football outcomes.'
        ) +
        '<div class="stxp-faqs">' +
          items.map(function (item,index) {
            var id = 'stxpFaq-' + index;
            return '<article class="stxp-faq">' +
              '<button type="button" data-stxp-faq aria-expanded="false" aria-controls="' +
                id + '"><span>' + esc(item[0]) +
                '</span><span aria-hidden="true">+</span></button>' +
              '<div class="stxp-faq-answer" id="' + id + '" hidden>' +
                esc(item[1]) +
              '</div>' +
            '</article>';
          }).join('') +
        '</div>' +
      '</div>' +
    '</section>';
  }

  function cta(title,copy,actions) {
    return '<section class="stxp-cta">' +
      '<div class="stxp-inner stxp-cta-box">' +
        '<div><h2>' + esc(title) + '</h2>' +
          '<p>' + esc(copy) + '</p></div>' +
        '<div class="stxp-cta-actions">' + actions + '</div>' +
      '</div>' +
    '</section>';
  }

  function scoutlinkPage() {
    return hero(
      'scoutlink',
      button('Open ScoutLink',SCOUTLINK.base,true,'data-stxp-track="open"') +
      button('Explore the Demo',SCOUTLINK.demo,false,'data-stxp-track="demo"'),
      'Compatibility scoring is a core ScoutLink decision-support tool. It helps reviewed scouts assess player-team fit without replacing football judgement.'
    ) +
    '<section class="stxp-section is-white"><div class="stxp-inner">' +
      sectionIntro(
        'Who ScoutLink supports',
        'Built for the people around grassroots talent.',
        'Each user gets a focused workspace while player evidence remains controlled and structured.'
      ) +
      cards([
        {
          title:'For coaches',
          copy:'Create player profiles, organise squads, add fixtures, record Match Facts, maintain ratings and gather approved video evidence.',
          href:sitePath('scoutlink/coaches'),
          label:'ScoutLink for coaches'
        },
        {
          title:'For reviewed scouts',
          copy:'Search by role, age group, location, evidence strength and team need, then compare and shortlist relevant players.',
          href:sitePath('scoutlink/scouts'),
          label:'ScoutLink for scouts'
        },
        {
          title:'For clubs and academies',
          copy:'Create a consistent player-evidence standard rather than relying on different files, messages and informal recommendations.',
          href:sitePath('contact'),
          label:'Contact Stratex'
        },
        {
          title:'For parents and players',
          copy:'Understand who controls the profile, how visibility works and where safeguarding or privacy concerns can be raised.',
          href:sitePath('parent-guardian-notice'),
          label:'Read the notice'
        }
      ],4) +
    '</div></section>' +

    '<section class="stxp-section is-soft"><div class="stxp-inner">' +
      sectionIntro(
        'The product',
        'One structured record for the player.',
        'ScoutLink combines coach-led evidence with reviewed scout workflows so the same football information can support several decisions.'
      ) +
      '<div class="stxp-showcase">' +
        '<div class="stxp-feature-list">' +
          featureRow('Player profiles','Position, ratings, physical context and development information.') +
          featureRow('Match Facts','Game-by-game appearances, events and performance evidence.') +
          featureRow('Compatibility','Explainable player-team fit decision support.') +
          featureRow('Recruitment pipeline','Organised shortlists, stages and coach-mediated interest.') +
          featureRow('Fixtures','Current match context for scouts and coaches.') +
          featureRow('Video reels','Approved clips attached to the right player record.') +
        '</div>' +
        '<article class="stxp-product-panel">' +
          '<span class="stxp-visual-label">Fictional ScoutLink profile preview</span>' +
          '<h3>Ethan Cole · ST · U16</h3>' +
          '<p>A single profile brings together coach ratings, Match Facts, video, physical context and evidence confidence.</p>' +
          metric('Overall rating','78',78) +
          metric('Match evidence','84',84) +
          metric('Data confidence','72',72) +
          '<div class="stxp-actions">' +
            button('See how compatibility works',sitePath('scoutlink/compatibility-score'),true) +
          '</div>' +
        '</article>' +
      '</div>' +
    '</div></section>' +

    '<section class="stxp-section is-dark"><div class="stxp-inner">' +
      sectionIntro(
        'Trust model',
        'Controlled visibility is part of the product.',
        'ScoutLink is not an open directory for children and does not support open scout-to-child contact.'
      ) +
      cards([
        {title:'Coach-led profiles',copy:'Player information is maintained through coaches, teams or appropriate adults.'},
        {title:'Reviewed scout access',copy:'Scout requests are reviewed before player-search access is activated.'},
        {title:'Explainable scoring',copy:'Compatibility supports football judgement and does not make final decisions.'},
        {title:'Concern routes',copy:'Safeguarding, conduct, privacy and platform concerns have visible reporting routes.'}
      ],4) +
    '</div></section>' +

    cta(
      'Explore the first Stratex product.',
      'Open ScoutLink, register a team or request reviewed scout access.',
      button('Open ScoutLink',SCOUTLINK.base,true,'data-stxp-track="open"') +
      button('Register as Coach',SCOUTLINK.coach,false,'data-stxp-track="coach"') +
      button('Request Scout Access',SCOUTLINK.scout,false,'data-stxp-track="scout"')
    );
  }

  function compatibilityPage() {
    return hero(
      'compatibility',
      button('Request Scout Access',SCOUTLINK.scout,true,'data-stxp-track="scout"') +
      button('See the Coach Experience',sitePath('scoutlink/coaches'),false),
      'The exact methodology, calculation, weightings, thresholds and ranking logic behind ScoutLink’s compatibility score are proprietary to Stratex Analytics.'
    ) +
    '<section class="stxp-section is-white"><div class="stxp-inner">' +
      sectionIntro(
        'How it works',
        'Compatibility compares the player evidence with the scout setup.',
        'The signal helps a scout organise player-team fit before deciding which cases deserve deeper football review.'
      ) +
      cards([
        {
          title:'What the score is designed to do',
          copy:'Help scouts organise the relationship between a player profile and the football needs recorded in their ScoutLink setup.'
        },
        {
          title:'What shapes the signal',
          copy:'Position, age group, coach-rated attributes, match output, physical profile, evidence confidence, team weaknesses and role expectations.'
        },
        {
          title:'How scouts should use it',
          copy:'Review compatibility alongside Match Facts, video, coach notes, availability and live football judgement.'
        },
        {
          title:'Why evidence confidence matters',
          copy:'A score supported by current fixtures, repeated Match Facts and approved video is more useful than one based on a thin profile.'
        }
      ],2) +
      '<div class="stxp-callout"><b>Decision support, not an automatic football decision</b><p>A stronger score is a reason to investigate. It does not guarantee scouting, selection, trials, signings, contracts or future performance.</p></div>' +
    '</div></section>' +

    '<section class="stxp-section is-soft"><div class="stxp-inner">' +
      sectionIntro(
        'Player-team fit',
        'What compatibility scoring helps a scout understand.',
        'The breakdown makes the relationship between the scout setup and the player evidence easier to review.'
      ) +
      '<div class="stxp-feature-grid">' +
        feature('Need fit','Does the player appear to address a recorded squad gap or team weakness?') +
        feature('Role fit','Does the evidence support the position and role the scout is trying to recruit?') +
        feature('Playing context','How do formation, tactical style and age-group needs shape the review?') +
        feature('Current evidence','Are Match Facts, ratings and approved video recent enough to support the signal?') +
        feature('Development context','Does the player profile support the longer-term pathway the scout entered?') +
        feature('Evidence confidence','How complete and consistent is the underlying coach-led evidence?') +
      '</div>' +
    '</div></section>' +

    faqs([
      ['Does ScoutLink have a compatibility score?','Yes. ScoutLink includes a compatibility score that helps reviewed scouts understand how closely a player may fit their team’s needs, role, playing style and development context.'],
      ['How does the ScoutLink compatibility score work?','ScoutLink compares structured player evidence with the team needs and role requirements entered by reviewed scouts. It then creates a compatibility score to support player review, comparison and shortlisting.'],
      ['Can scouts enter team weaknesses?','Yes. Scouts can enter team weaknesses, squad gaps, priority positions, tactical needs and role requirements so players can be reviewed against real team context.'],
      ['What player data helps inform compatibility?','Coach-led player profiles can include position, age group, match data, ratings, technical attributes, tactical context, physical profile, development notes and approved video evidence.'],
      ['Does ScoutLink publish the exact compatibility formula?','No. ScoutLink explains the purpose and contributing evidence areas, but the exact methodology, calculation and weighting model are proprietary to Stratex Analytics.'],
      ['Does a high compatibility score guarantee a trial or signing?','No. The score supports scouting judgement. It does not guarantee scouting, trials, selection, signing or contact from a club.'],
      ['Does compatibility replace live scouting?','No. It is one decision-support signal inside a wider football review and should be used alongside live observation and professional judgement.']
    ]) +

    cta(
      'Use compatibility as a clearer starting point.',
      'Request reviewed scout access or understand how coaches create the evidence behind the score.',
      button('Request Scout Access',SCOUTLINK.scout,true,'data-stxp-track="scout"') +
      button('ScoutLink for Coaches',sitePath('scoutlink/coaches'),false)
    );
  }

  function planCard(name,label,copy,items,featured) {
    return '<article class="stxp-plan' +
      (featured ? ' is-featured' : '') +
      '" data-plan="' + esc(name) + '">' +
      '<span class="stxp-plan-label">' + esc(label) + '</span>' +
      '<h3>' + esc(name) + '</h3>' +
      '<p>' + esc(copy) + '</p>' +
      '<div class="stxp-price" data-plan-price>' +
        esc(PRICES.annual[name][0]) +
        '<small>' + esc(PRICES.annual[name][1]) + '</small>' +
      '</div>' +
      '<ul class="stxp-list">' +
        items.map(function (item) {
          return '<li>' + esc(item) + '</li>';
        }).join('') +
      '</ul>' +
      '<div class="stxp-card-actions">' +
        button(
          name === 'Enterprise'
            ? 'Talk to Stratex'
            : 'Request Scout Access',
          name === 'Enterprise'
            ? sitePath('contact')
            : SCOUTLINK.scout,
          true,
          name === 'Enterprise'
            ? ''
            : 'data-stxp-track="scout"'
        ) +
      '</div>' +
    '</article>';
  }

  function pricingPage() {
    return hero(
      'pricing',
      button('Request Scout Access',SCOUTLINK.scout,true,'data-stxp-track="scout"') +
      button('Talk to Stratex',sitePath('contact'),false),
      'All scout access is reviewed before activation. Coach workspaces remain free.'
    ) +
    '<section class="stxp-section is-white"><div class="stxp-inner">' +
      '<article class="stxp-price-intro">' +
        '<span class="stxp-visual-label">ScoutLink scout plans</span>' +
        '<h2>Choose annual or monthly billing.</h2>' +
        '<p>Annual plans provide the lowest total cost. Monthly access provides flexibility at a higher effective rate.</p>' +
        '<div class="stxp-price-toggle" role="group" aria-label="Pricing period">' +
          '<button type="button" class="is-active" data-stxp-billing="annual" aria-pressed="true">Annual</button>' +
          '<button type="button" data-stxp-billing="monthly" aria-pressed="false">Monthly</button>' +
        '</div>' +
      '</article>' +
      '<div class="stxp-plan-grid">' +
        planCard('Core','Starter scout access','For an individual scout beginning structured grassroots discovery.',[
          '1 scout seat',
          '30 coach-mediated interest requests',
          '20 profile exports',
          '60 prediction runs',
          'Player search and compatibility overview'
        ],false) +
        planCard('Plus','Growing scout team','For small recruitment teams that need stronger comparison and workflow tools.',[
          '5 scout seats',
          '120 coach-mediated interest requests',
          '100 profile exports',
          '300 prediction runs',
          'Advanced filters and shared pipeline'
        ],true) +
        planCard('Elite','Advanced scout team','For established teams managing regular higher-volume recruitment activity.',[
          '10 scout seats',
          '300 coach-mediated interest requests',
          '300 profile exports',
          '900 prediction runs',
          'Advanced collaboration and compatibility intelligence'
        ],false) +
        planCard('Enterprise','Custom organisation','For clubs, groups and multi-team recruitment structures.',[
          'Custom scout seats',
          'Custom team structures and limits',
          'Governance and usage controls',
          'Dedicated onboarding',
          'Commercial review'
        ],false) +
      '</div>' +
    '</div></section>' +

    '<section class="stxp-section is-soft"><div class="stxp-inner">' +
      sectionIntro(
        'How pricing works',
        'The right plan depends on the recruitment workflow.',
        'Seat count matters, but so do player volume, collaboration, reporting, export activity and the number of teams being covered.'
      ) +
      cards([
        {title:'Coach accounts remain free',copy:'Coaches can create teams, build player evidence, add fixtures and manage scout interest without a subscription fee.'},
        {title:'Annual and monthly options',copy:'Annual plans provide the strongest value. Monthly access remains available where flexibility matters.'},
        {title:'Usage is visible',copy:'Scout teams should be able to see remaining interests, predictions and exports inside the product.'},
        {title:'Access remains reviewed',copy:'Paying for a plan does not bypass ScoutLink verification or the coach-mediated interest model.'}
      ],2) +
    '</div></section>' +

    faqs([
      ['Is the Coach workspace free?','Yes. The current ScoutLink Coach workspace is free.'],
      ['Does payment create instant scout access?','No. Scout access is reviewed before activation.'],
      ['Are monthly plans available?','Yes. Monthly options are available at a higher effective rate than annual plans.'],
      ['Can larger organisations request custom limits?','Yes. Enterprise plans can use custom seats, team structures, usage limits and onboarding arrangements.']
    ]) +

    cta(
      'Choose the plan that matches the recruitment team.',
      'Request reviewed access or speak to Stratex about a larger organisation.',
      button('Request Scout Access',SCOUTLINK.scout,true,'data-stxp-track="scout"') +
      button('Contact Stratex',sitePath('contact'),false)
    );
  }

  function audiencePage(key) {
    var scout = key === 'scoutlink-scouts';

    var steps = scout
      ? [
          ['Set up the football need','Record team weaknesses, preferred roles, formation, playing style, age groups and longer-term recruitment goals.'],
          ['Search the player database','Filter by position, age, location, physical context, overall rating, evidence confidence and compatibility.'],
          ['Review the whole player record','Read Match Facts, coach ratings, approved video, physical profile, fixtures and development context together.'],
          ['Move the strongest cases forward','Compare players, save them to the pipeline and communicate through controlled coach-mediated routes.']
        ]
      : [
          ['Create the team and squad','Add the team context and build structured profiles for the players you are authorised to manage.'],
          ['Keep football information current','Update positions, attributes, fixtures, Match Facts, player ratings, physical context and approved video evidence.'],
          ['See who is building momentum','Use dashboards and player views to understand profile completeness, recent performance and scout interest.'],
          ['Handle interest properly','Reviewed scout interest comes through the Coach or appropriate team route rather than direct open contact with children.']
        ];

    var benefits = scout
      ? [
          {title:'Faster first review',copy:'Move from a broad database to relevant cases quickly.'},
          {title:'Better context',copy:'See why a player may fit the recorded football need.'},
          {title:'Cleaner collaboration',copy:'Keep notes, stages and exports in one workflow.'},
          {title:'Safer contact',copy:'Interest is managed through appropriate adults and teams.'}
        ]
      : [
          {title:'One squad workspace',copy:'Player records, fixtures and evidence together.'},
          {title:'Less admin fog',copy:'Clear next actions and visible profile gaps.'},
          {title:'Useful visibility',copy:'Evidence reviewed scouts can search and compare.'},
          {title:'Free access',copy:'The current Coach workspace remains free.'}
        ];

    var actions = scout
      ? button('Request Scout Access',SCOUTLINK.scout,true,'data-stxp-track="scout"') +
        button('View Scout Demo',SCOUTLINK.demo,false,'data-stxp-track="demo"')
      : button('Register as Coach',SCOUTLINK.coach,true,'data-stxp-track="coach"') +
        button('View Coach Demo',SCOUTLINK.demo,false,'data-stxp-track="demo"');

    return hero(
      key,
      actions,
      scout
        ? 'Compatibility scoring supports player-team fit review. It does not replace live scouting or professional judgement.'
        : 'Accurate coach-led evidence gives scouts better context. It does not guarantee that a player will be scouted.'
    ) +
    '<section class="stxp-section is-white"><div class="stxp-inner">' +
      sectionIntro(
        scout ? 'Scout workflow' : 'Coach workflow',
        scout ? 'From team need to organised shortlist.' : 'From local knowledge to structured evidence.',
        scout
          ? 'ScoutLink keeps search, comparison, compatibility and pipeline work connected.'
          : 'ScoutLink keeps squad information, fixtures, Match Facts and player evidence connected.'
      ) +
      '<div class="stxp-steps">' +
        steps.map(function (item,index) {
          return step(index + 1,item[0],item[1]);
        }).join('') +
      '</div>' +
    '</div></section>' +

    '<section class="stxp-section is-soft"><div class="stxp-inner">' +
      sectionIntro(
        scout ? 'Why scouts use it' : 'Why coaches use it',
        scout ? 'Better context before the next football decision.' : 'Useful evidence without unnecessary administration.',
        scout
          ? 'ScoutLink helps recruitment teams focus their time without presenting compatibility as an automatic answer.'
          : 'The Coach remains responsible for keeping player evidence accurate and authorised.'
      ) +
      cards(benefits,4) +
      '<div class="stxp-callout"><b>' +
        (scout
          ? 'Compatibility is a starting point for review.'
          : 'Coach data supports compatibility scoring.') +
        '</b><p>' +
        (scout
          ? 'Use team weaknesses, role expectations and football context to narrow the search, then review the full player record.'
          : 'Position, Match Facts, ratings, physical context, development notes and approved video help reviewed scouts assess player-team fit with more context.') +
        '</p></div>' +
    '</div></section>' +

    faqs(
      scout
        ? [
            ['Is scout access instant?','No. Scout requests are reviewed before player-search access is activated.'],
            ['Can scouts message children directly?','No. ScoutLink keeps interest coach-mediated and does not support direct scout-to-child contact.'],
            ['Does compatibility replace live scouting?','No. It supports prioritisation and comparison, while football judgement remains human.']
          ]
        : [
            ['Does a Coach account cost anything?','No. The current ScoutLink Coach workspace is free.'],
            ['Can ScoutLink guarantee a player will be scouted?','No. ScoutLink improves evidence and visibility but cannot guarantee outcomes.'],
            ['Can children contact scouts directly?','ScoutLink does not support open direct scout-to-child contact.']
          ]
    ) +

    cta(
      scout ? 'Build a clearer grassroots shortlist.' : 'Build stronger player evidence.',
      scout
        ? 'Request reviewed Scout access or compare the available plans.'
        : 'Register the team or read how compatibility uses coach-led player profiles.',
      scout
        ? button('Request Scout Access',SCOUTLINK.scout,true,'data-stxp-track="scout"') +
          button('View Pricing',sitePath('scoutlink/pricing'),false)
        : button('Register as Coach',SCOUTLINK.coach,true,'data-stxp-track="coach"') +
          button('Compatibility Score',sitePath('scoutlink/compatibility-score'),false)
    );
  }

  function seoAudiencePage(key) {
    var scout = key === 'scouts';

    var sections = scout
      ? [
          {title:'A clearer grassroots starting point',copy:'Search Coach-maintained player evidence rather than depending only on forwarded clips, informal recommendations or one-off observations.'},
          {title:'Useful alongside established scouting systems',copy:'ScoutLink complements club recruitment workflows and tools used later in the pathway, including professional data and video platforms.'},
          {title:'Search by football context',copy:'Use age group, position, location, player evidence, physical profile, team need and compatibility to narrow the database.'},
          {title:'Move from discovery to decision',copy:'Compare players, organise shortlists, maintain a pipeline and export useful player dossiers.'}
        ]
      : [
          {title:'Build the player profiles',copy:'Add positions, attributes, development context, physical profile and the information reviewed scouts need to begin a useful review.'},
          {title:'Turn performances into evidence',copy:'Record fixtures, Match Facts, goals, assists, clean sheets, discipline, injuries and Coach ratings.'},
          {title:'Keep everything in one place',copy:'Stop spreading the squad across spreadsheets, messages, notes and isolated video links.'},
          {title:'Protect the route to visibility',copy:'Scout access is reviewed and interest is handled through the Coach or appropriate team contact.'}
        ];

    return hero(
      key,
      scout
        ? button('Explore ScoutLink for Scouts',sitePath('scoutlink/scouts'),true) +
          button('Request Access',SCOUTLINK.scout,false,'data-stxp-track="scout"')
        : button('Register as Coach',SCOUTLINK.coach,true,'data-stxp-track="coach"') +
          button('See How ScoutLink Works',sitePath('scoutlink'),false),
      scout
        ? 'ScoutLink includes compatibility scoring and allows reviewed scouts to record team weaknesses, squad gaps and role requirements without exposing the proprietary algorithm.'
        : 'Coach-led player profiles and structured player evidence give reviewed scouts better context. They do not guarantee scouting outcomes.'
    ) +
    '<section class="stxp-section is-white"><div class="stxp-inner">' +
      sectionIntro(
        scout ? 'Grassroots discovery' : 'Football player profiles',
        scout ? 'A structured starting point before live scouting.' : 'The player record should be more useful than another isolated clip.',
        scout
          ? 'ScoutLink improves earlier player discovery while remaining complementary to live observation and established recruitment systems.'
          : 'Accurate player information helps reviewed scouts understand role, performance and player-team fit.'
      ) +
      cards(sections,2) +
    '</div></section>' +

    '<section class="stxp-section is-soft"><div class="stxp-inner">' +
      sectionIntro(
        scout ? 'ScoutLink decision tools' : 'How player evidence supports compatibility',
        scout ? 'Move from a broad search to the cases worth deeper review.' : 'Coaches are creating football evidence, not filling in forms for their own sake.',
        scout
          ? 'The platform connects search, compatibility, comparisons and pipeline activity.'
          : 'Player position, Match Facts, ratings, development context and approved video help reviewed scouts assess player-team fit.'
      ) +
      '<div class="stxp-feature-grid">' +
        (scout
          ? [
              ['Player search','Filter the grassroots database using football context.'],
              ['Compatibility score','Review fit against Scout-entered team needs.'],
              ['Player comparison','Compare evidence side by side.'],
              ['Recruitment pipeline','Maintain stages, notes and next actions.'],
              ['Profile exports','Create useful player dossiers where the plan allows.'],
              ['Coach-mediated interest','Keep the contact route controlled.']
            ]
          : [
              ['Structured player profiles','Position, age group, attributes and physical context.'],
              ['Match Facts','Current appearances, output, ratings and events.'],
              ['Approved video evidence','Clips attached to the right player record.'],
              ['Evidence confidence','Visible profile completeness and evidence depth.'],
              ['Compatibility input','Accurate data gives scouts better player-team fit context.'],
              ['Coach-mediated interest','Reviewed interest stays with appropriate adults.']
            ]
        ).map(function (item) {
          return feature(item[0],item[1]);
        }).join('') +
      '</div>' +
      '<div class="stxp-actions">' +
        button('See How Compatibility Works',sitePath('scoutlink/compatibility-score'),true) +
        button(
          scout ? 'ScoutLink for Scouts' : 'ScoutLink for Coaches',
          sitePath(scout ? 'scoutlink/scouts' : 'scoutlink/coaches'),
          false
        ) +
      '</div>' +
    '</div></section>' +

    faqs(
      scout
        ? [
            ['Is ScoutLink an open player directory?','No. Player search is available through reviewed access.'],
            ['Is ScoutLink designed to replace live scouting?','No. It helps scouts find and organise cases worth deeper review.'],
            ['Which players are covered?','The initial focus is grassroots U7–U16 players represented through authorised coach-led profiles.']
          ]
        : [
            ['Does a Coach account cost anything?','No. The current ScoutLink Coach workspace is free.'],
            ['Can a Coach guarantee a player will be scouted?','No. ScoutLink improves evidence and visibility but cannot guarantee outcomes.'],
            ['Can children contact scouts directly?','ScoutLink does not support open direct scout-to-child contact.']
          ]
    ) +

    cta(
      scout ? 'Explore a clearer grassroots scouting workflow.' : 'Give the squad a structured evidence standard.',
      scout
        ? 'Open the dedicated ScoutLink Scout page or request reviewed access.'
        : 'Register as Coach or open the full Coach product explanation.',
      scout
        ? button('ScoutLink for Scouts',sitePath('scoutlink/scouts'),true) +
          button('Request Access',SCOUTLINK.scout,false,'data-stxp-track="scout"')
        : button('Register as Coach',SCOUTLINK.coach,true,'data-stxp-track="coach"') +
          button('ScoutLink for Coaches',sitePath('scoutlink/coaches'),false)
    );
  }

  function toolsPage() {
    return hero(
      'tools',
      button('Explore the Platform',sitePath('scoutlink'),true) +
      button('View the Demo',SCOUTLINK.demo,false,'data-stxp-track="demo"'),
      'ScoutLink is a decision-support and evidence platform. It does not replace scouts, guarantee outcomes or support open contact with children.'
    ) +
    '<section class="stxp-section is-white"><div class="stxp-inner">' +
      sectionIntro(
        'The ScoutLink toolkit',
        'Tools in one football intelligence workflow.',
        'ScoutLink connects the information maintained by coaches with the search and decision tools used by reviewed scouts.'
      ) +
      cards([
        {title:'Coach tools',copy:'Squad dashboard, player creation, player ratings, fixtures, Match Facts, video reels, notifications and controlled scout communication.',href:sitePath('scoutlink/coaches'),label:'Coach tools'},
        {title:'Scout tools',copy:'Player search, compatibility, comparison, rankings, pipeline, fixtures, predictions, exports, team setup and events.',href:sitePath('scoutlink/scouts'),label:'Scout tools'},
        {title:'Football intelligence',copy:'Player evidence is interpreted through position, age group, current output, physical context, team need and data confidence.',href:sitePath('scoutlink/compatibility-score'),label:'Compatibility scoring'},
        {title:'Trust tools',copy:'Reviewed access, controlled player visibility, concern routes and clear limitations around scoring and football outcomes.',href:sitePath('trust'),label:'Trust and safeguarding'}
      ],2) +
    '</div></section>' +

    '<section class="stxp-section is-soft"><div class="stxp-inner">' +
      sectionIntro(
        'From evidence to decision',
        'A connected four-stage workflow.',
        'The product reduces the gap between local player knowledge and a structured Scout review.'
      ) +
      '<div class="stxp-steps">' +
        step(1,'Create the evidence','Coaches create authorised profiles and maintain current football information.') +
        step(2,'Search by context','Reviewed scouts use role, age, location, evidence and team needs to narrow the database.') +
        step(3,'Review player-team fit','Compatibility and comparisons support deeper review without replacing judgement.') +
        step(4,'Manage the next action','Shortlists, pipeline stages and coach-mediated contact keep the process organised.') +
      '</div>' +
    '</div></section>' +

    '<section class="stxp-section is-dark"><div class="stxp-inner">' +
      sectionIntro(
        'Why the tools belong together',
        'A generic player database is not enough.',
        'Player information becomes more useful when evidence quality, football context and access controls are part of the same workflow.'
      ) +
      cards([
        {title:'Structured rather than scattered',copy:'Profiles replace disconnected messages, notes and clips.'},
        {title:'Context rather than noise',copy:'Search and compatibility reflect the football need a scout entered.'},
        {title:'Controlled rather than public',copy:'Reviewed access and Coach-mediated interest reduce open exposure.'},
        {title:'Useful alongside other systems',copy:'ScoutLink supports earlier grassroots discovery and can complement professional tools.'}
      ],4) +
    '</div></section>' +

    faqs([
      ['How is ScoutLink different from a generic player database?','Profiles are maintained through coach-led evidence and interpreted through football context rather than existing as open self-promotion.'],
      ['Can ScoutLink sit alongside Wyscout, Tonsser or club systems?','Yes. ScoutLink is positioned around grassroots evidence and early discovery, so it can complement other recruitment and player-development workflows.'],
      ['Does ScoutLink replace scouts?','No. It helps football professionals organise evidence and decide where to spend their attention.'],
      ['What age groups does ScoutLink focus on?','The initial public focus is U7–U16 grassroots football.']
    ]) +

    cta(
      'Explore the complete ScoutLink workflow.',
      'Open the product page, view compatibility scoring or explore the demo.',
      button('Explore ScoutLink',sitePath('scoutlink'),true) +
      button('Compatibility Score',sitePath('scoutlink/compatibility-score'),false) +
      button('View Demo',SCOUTLINK.demo,false,'data-stxp-track="demo"')
    );
  }

  function addLearningNavigation() {
    var nav = document.getElementById('stxNav');
    if (!nav || nav.querySelector('[data-site-link="learning-centre"]')) {
      return;
    }

    var contact = nav.querySelector('[data-site-link="contact"]');
    var link = document.createElement('a');

    link.href = sitePath('learning-centre');
    link.setAttribute('data-site-link','learning-centre');
    link.textContent = 'Learning';

    if (contact) nav.insertBefore(link,contact);
    else nav.appendChild(link);
  }

  function markNavigation() {
    document.querySelectorAll('#stxNav [aria-current="page"]').forEach(
      function (link) {
        link.removeAttribute('aria-current');
      }
    );

    var link = document.querySelector(
      '#stxNav [data-site-link="scoutlink"]'
    );

    if (link) link.setAttribute('aria-current','page');
  }

  function addFooterBottom() {
    var footer = document.getElementById('stratexFooter');
    if (!footer) return;

    var old = footer.querySelector('.stxp-footer-bottom');
    if (old) old.remove();

    footer.insertAdjacentHTML(
      'beforeend',
      '<div class="stxp-footer-bottom">' +
        '<span>© 2026 Stratex Analytics Limited. All rights reserved.</span>' +
        '<span>ScoutLink is owned and operated by Stratex Analytics.</span>' +
      '</div>'
    );
  }

  function setMeta(page) {
    var base = 'https://www.stratexanalytics.co.uk';
    document.title = page.title;

    var description = document.querySelector('meta[name="description"]');
    var canonical = document.querySelector('link[rel="canonical"]');
    var ogTitle = document.querySelector('meta[property="og:title"]');
    var ogDescription = document.querySelector('meta[property="og:description"]');
    var ogUrl = document.querySelector('meta[property="og:url"]');

    if (description) description.setAttribute('content',page.description);
    if (canonical) canonical.setAttribute('href',base + page.canonical);
    if (ogTitle) ogTitle.setAttribute('content',page.title);
    if (ogDescription) ogDescription.setAttribute('content',page.description);
    if (ogUrl) ogUrl.setAttribute('content',base + page.canonical);
  }

  function setJsonLd(key,page) {
    var node = document.getElementById('stratexJsonLd');
    if (!node) return;

    var graph = [
      {
        '@type':'Organization',
        '@id':'https://www.stratexanalytics.co.uk/#organization',
        name:'Stratex Analytics',
        url:'https://www.stratexanalytics.co.uk/',
        sameAs:['https://www.scoutlink.app']
      },
      {
        '@type':'WebPage',
        '@id':'https://www.stratexanalytics.co.uk' +
          page.canonical + '#webpage',
        url:'https://www.stratexanalytics.co.uk' + page.canonical,
        name:page.title,
        description:page.description,
        isPartOf:{
          '@type':'WebSite',
          '@id':'https://www.stratexanalytics.co.uk/#website',
          name:'Stratex Analytics',
          url:'https://www.stratexanalytics.co.uk/'
        }
      }
    ];

    if (
      key === 'scoutlink' ||
      key === 'compatibility' ||
      key === 'pricing' ||
      key === 'tools'
    ) {
      graph.push({
        '@type':'SoftwareApplication',
        name:'ScoutLink',
        applicationCategory:'SportsApplication',
        operatingSystem:'Web',
        url:'https://www.scoutlink.app',
        description:page.description,
        offers:{
          '@type':'Offer',
          category:'Reviewed football scout access'
        }
      });
    }

    node.textContent = JSON.stringify({
      '@context':'https://schema.org',
      '@graph':graph
    });
  }

  function bindInteractions() {
    document.addEventListener('click',function (event) {
      var faqButton = event.target.closest('[data-stxp-faq]');
      if (faqButton) {
        var item = faqButton.closest('.stxp-faq');
        var answer = document.getElementById(
          faqButton.getAttribute('aria-controls')
        );
        var open = faqButton.getAttribute('aria-expanded') === 'true';

        faqButton.setAttribute('aria-expanded',open ? 'false' : 'true');
        item.classList.toggle('is-open',!open);
        if (answer) answer.hidden = open;

        var icon = faqButton.querySelector('span:last-child');
        if (icon) icon.textContent = open ? '+' : '−';
        return;
      }

      var billing = event.target.closest('[data-stxp-billing]');
      if (billing) {
        applyBilling(billing.getAttribute('data-stxp-billing'));
        return;
      }

      var tracked = event.target.closest('[data-stxp-track]');
      if (tracked) {
        var key = tracked.getAttribute('data-stxp-track');

        try {
          if (
            window.heap &&
            typeof window.heap.track === 'function'
          ) {
            window.heap.track(
              'stratex_scoutlink_public_cta_clicked',
              {
                route:cleanPath(),
                action:key
              }
            );
          }
        } catch (_) {}
      }
    });
  }

  function applyBilling(mode) {
    mode = mode === 'monthly' ? 'monthly' : 'annual';

    document.querySelectorAll('[data-stxp-billing]').forEach(
      function (button) {
        var active =
          button.getAttribute('data-stxp-billing') === mode;

        button.classList.toggle('is-active',active);
        button.setAttribute('aria-pressed',active ? 'true' : 'false');
      }
    );

    document.querySelectorAll('[data-plan]').forEach(function (plan) {
      var name = plan.getAttribute('data-plan');
      var value = PRICES[mode][name];
      var price = plan.querySelector('[data-plan-price]');

      if (price && value) {
        price.innerHTML =
          esc(value[0]) + '<small>' + esc(value[1]) + '</small>';
      }
    });
  }

  function render() {
    var key = routeKey();
    if (!key) return;

    var app = document.getElementById('stratexSiteApp');
    if (!app) return;

    var html = '';

    if (key === 'scoutlink') html = scoutlinkPage();
    if (key === 'compatibility') html = compatibilityPage();
    if (key === 'pricing') html = pricingPage();
    if (
      key === 'scoutlink-scouts' ||
      key === 'scoutlink-coaches'
    ) html = audiencePage(key);
    if (key === 'scouts' || key === 'coaches') {
      html = seoAudiencePage(key);
    }
    if (key === 'tools') html = toolsPage();

    if (!html) return;

    document.body.classList.add('stratex-scoutlink-pages-v3');
    document.body.setAttribute('data-stx-page',key);
    app.innerHTML = '<div class="stxp-main">' + html + '</div>';

    addLearningNavigation();
    markNavigation();
    addFooterBottom();
    setMeta(pageData[key]);
    setJsonLd(key,pageData[key]);

    if (key === 'pricing') applyBilling('annual');
  }

  document.addEventListener('DOMContentLoaded',function () {
    render();
    bindInteractions();
  });
})();
