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

  var STRATEX_BASE = 'https://www.stratexanalytics.co.uk';

  var SCOUTLINK = {
    base:'https://www.scoutlink.app',
    login:'https://www.scoutlink.app/login',
    coach:'https://www.scoutlink.app/register/coach',
    scout:'https://www.scoutlink.app/register/scout',
    demo:'https://www.scoutlink.app/demo'
  };

  var FALLBACK_LEADERS = [
    {
      key:'richdhin',
      name:'Richdhin Inaba',
      title:'Founder & CEO',
      area:'Company direction, product and partnerships',
      bio:'Sets the vision, strategy and direction for Stratex Analytics and ScoutLink. Leads product priorities, partnerships and executive decision-making.',
      summary:'Sets the vision, strategy and direction for Stratex Analytics and ScoutLink.',
      email:'richdhin@stratexanalytics.co.uk',
      linkedin:'https://www.linkedin.com/in/richdhin-i-470a15109/',
      image:'/images/leadership/richdhin-inaba.jpg',
      alt:'Richdhin Inaba, Founder and CEO of Stratex Analytics',
      initials:'RI',
      focus:[
        'Company direction',
        'Product priorities',
        'Partnerships',
        'Executive decisions'
      ]
    },
    {
      key:'lucy',
      name:'Lucy Ali',
      title:'Director of Customer Operations',
      area:'Customer operations and service delivery',
      bio:'Leads coach and scout onboarding, customer relationships, operational delivery and the systems that help users get value from ScoutLink.',
      summary:'Leads customer operations, onboarding and service delivery across the Stratex ecosystem.',
      email:'lucy.ali@stratexanalytics.co.uk',
      linkedin:'https://www.linkedin.com/in/lucy-ali-654b79160/',
      image:'/images/leadership/lucy-ali.jpg',
      alt:'Lucy Ali, Director of Customer Operations at Stratex Analytics',
      initials:'LA',
      focus:[
        'Coach onboarding',
        'Scout onboarding',
        'Customer relationships',
        'Service delivery'
      ]
    },
    {
      key:'alexandro',
      name:'Alexandro Ilioaie',
      title:'Director of Football Strategy & Growth',
      area:'Football strategy, growth and market visibility',
      bio:'Leads football strategy, acquisition initiatives, events, partnerships and sporting direction across the ScoutLink growth programme.',
      summary:'Leads football strategy, growth, events, partnerships and market visibility.',
      email:'alexandro.ilioaie@stratexanalytics.co.uk',
      linkedin:'https://www.linkedin.com/in/alexandro-ilioaie-a0347025a/',
      image:'/images/leadership/alexandro-ilioaie.jpg',
      alt:'Alexandro Ilioaie, Director of Football Strategy and Growth at Stratex Analytics',
      initials:'AI',
      focus:[
        'Football strategy',
        'Growth',
        'Events',
        'Partnerships'
      ]
    }
  ];

  var leaders = FALLBACK_LEADERS.slice();
  var modalReturnFocus = null;

  var PAGE_META = {
    about:{
      title:'About Stratex Analytics | Football Intelligence Company',
      description:'Learn about Stratex Analytics, the company building football intelligence products for overlooked grassroots talent, starting with ScoutLink.',
      canonical:'/about'
    },
    leadership:{
      title:'Leadership | Stratex Analytics',
      description:'Meet the Stratex Analytics leadership team building football intelligence products for overlooked grassroots talent.',
      canonical:'/leadership'
    },
    trust:{
      title:'Trust & Safeguarding | Stratex Analytics',
      description:'Stratex Analytics builds youth-football products around controlled visibility, reviewed scout access, coach-led profiles and clear safeguarding routes.',
      canonical:'/trust'
    },
    verification:{
      title:'Scout Verification | Stratex Analytics',
      description:'Learn how ScoutLink reviews scout access before youth-player search and recruitment tools become available.',
      canonical:'/scout-verification'
    },
    parent:{
      title:'Parent/Guardian Notice | Stratex Analytics',
      description:'A plain-English notice explaining how ScoutLink player profiles, reviewed scout access, visibility and concern routes work.',
      canonical:'/parent-guardian-notice'
    },
    contact:{
      title:'Contact Stratex Analytics',
      description:'Contact Stratex Analytics about ScoutLink support, coach onboarding, scout access, partnerships, careers, media or accessibility.',
      canonical:'/contact'
    },
    concern:{
      title:'Report a Concern | Stratex Analytics',
      description:'Report a safeguarding, conduct, access, privacy or platform concern related to Stratex Analytics or ScoutLink.',
      canonical:'/report-a-concern'
    }
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

    if (path === '/about') return 'about';
    if (path === '/leadership') return 'leadership';
    if (path === '/trust') return 'trust';
    if (path === '/scout-verification') return 'verification';
    if (path === '/parent-guardian-notice') return 'parent';
    if (path === '/contact') return 'contact';
    if (path === '/report-a-concern') return 'concern';

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
    return '<a class="sct-button' +
      (primary ? ' is-primary' : '') +
      '" href="' + esc(href) + '" ' +
      (attrs || '') + '>' +
      esc(label) +
    '</a>';
  }

  function visualLine(title,copy) {
    return '<div class="sct-visual-line">' +
      '<b>' + esc(title) + '</b>' +
      '<span>' + esc(copy) + '</span>' +
    '</div>';
  }

  function visualStat(value,label) {
    return '<div class="sct-visual-stat">' +
      '<b>' + esc(value) + '</b>' +
      '<span>' + esc(label) + '</span>' +
    '</div>';
  }

  function visual(key) {
    var data = {
      about:{
        label:'The Stratex approach',
        title:'Build useful football intelligence before expanding the ecosystem.',
        copy:'Stratex starts with real coach and scout workflows, then develops products around clearer evidence, controlled visibility and better decisions.',
        rows:[
          [
            'Useful before impressive',
            'Solve the football workflow before adding unnecessary complexity.'
          ],
          [
            'Trust before expansion',
            'ScoutLink must become useful, credible and commercially strong before the wider ecosystem grows.'
          ]
        ],
        stats:[
          ['ScoutLink','First product'],
          ['UK','Initial focus'],
          ['Evidence','Foundation']
        ]
      },
      leadership:{
        label:'How leadership operates',
        title:'Direct ownership across product, operations and football growth.',
        copy:'The operating team stays close to users, product decisions, football relationships and the trust responsibilities around ScoutLink.',
        rows:[
          [
            'Cross-functional challenge',
            'Product, customer operations and football growth are expected to strengthen one another.'
          ],
          [
            'Close to the market',
            'Coach and scout feedback informs onboarding, positioning and product priorities.'
          ]
        ],
        stats:[
          ['Product','Direction'],
          ['Customers','Operations'],
          ['Football','Growth']
        ]
      },
      trust:{
        label:'Trust and safeguarding',
        title:'Visibility should never mean uncontrolled exposure.',
        copy:'ScoutLink combines reviewed access, coach-led evidence, adult-led communication and visible concern routes.',
        rows:[
          [
            'Control access',
            'Player search and recruitment tools are available only through appropriate product permissions.'
          ],
          [
            'Keep contact adult-led',
            'Interest moves through coaches, clubs, schools, academies or guardians.'
          ]
        ],
        stats:[
          ['Access','Reviewed'],
          ['Profiles','Coach-led'],
          ['Concerns','Reportable']
        ]
      },
      verification:{
        label:'Scout access review',
        title:'Access begins with information that can be reviewed.',
        copy:'Applicants provide identity, organisation, role and supporting information before player-search tools are activated.',
        rows:[
          [
            'Review the application',
            'Stratex checks the role context, declarations and requested supporting evidence.'
          ],
          [
            'Keep access accountable',
            'Access may be restricted or removed where information changes or concerns arise.'
          ]
        ],
        stats:[
          ['Apply','Accurately'],
          ['Review','Internally'],
          ['Access','Controlled']
        ]
      },
      parent:{
        label:'Information for families',
        title:'The player record stays connected to appropriate adults.',
        copy:'Profiles are coach-led, player search is permissioned and interest should move through an adult-led route.',
        rows:[
          [
            'Understand the profile',
            'Football evidence may include position, Match Facts, ratings, fixtures and approved video.'
          ],
          [
            'Ask for help',
            'Families can use contact, privacy and concern routes where something needs clarification.'
          ]
        ],
        stats:[
          ['Profiles','Authorised'],
          ['Search','Permissioned'],
          ['Interest','Adult-led']
        ]
      }
    }[key];

    if (!data) return '';

    return '<article class="sct-visual">' +
      '<span class="sct-visual-label">' + esc(data.label) + '</span>' +
      '<h2>' + esc(data.title) + '</h2>' +
      '<p>' + esc(data.copy) + '</p>' +
      '<div class="sct-visual-lines">' +
        data.rows.map(function (row) {
          return visualLine(row[0],row[1]);
        }).join('') +
      '</div>' +
      '<div class="sct-visual-stats">' +
        data.stats.map(function (row) {
          return visualStat(row[0],row[1]);
        }).join('') +
      '</div>' +
    '</article>';
  }

  function hero(key,kicker,title,copy,actions,note,simple) {
    return '<section class="sct-hero' +
      (simple ? ' is-simple' : '') +
      '"><div class="sct-inner sct-hero-grid">' +
        '<div><span class="sct-kicker">' + esc(kicker) + '</span>' +
          '<h1>' + esc(title) + '</h1>' +
          '<p class="sct-hero-copy">' + esc(copy) + '</p>' +
          (actions
            ? '<div class="sct-actions">' + actions + '</div>'
            : '') +
          (note
            ? '<div class="sct-hero-note">' + esc(note) + '</div>'
            : '') +
        '</div>' +
        (simple ? '' : visual(key)) +
      '</div>' +
    '</section>';
  }

  function sectionIntro(kicker,title,copy) {
    return '<div class="sct-section-head">' +
      '<div><span class="sct-kicker">' + esc(kicker) + '</span>' +
        '<h2>' + esc(title) + '</h2></div>' +
      '<p>' + esc(copy) + '</p>' +
    '</div>';
  }

  function card(number,title,copy,href,label) {
    return '<article class="sct-card">' +
      (number == null
        ? ''
        : '<span class="sct-card-number">' +
          String(number).padStart(2,'0') +
          '</span>') +
      '<h3>' + esc(title) + '</h3>' +
      '<p>' + esc(copy) + '</p>' +
      (href
        ? '<div class="sct-card-actions">' +
          '<a class="sct-button is-soft is-small" href="' +
          esc(href) + '">' +
          esc(label || 'Learn more') +
          '</a></div>'
        : '') +
    '</article>';
  }

  function cards(items,columns) {
    return '<div class="sct-grid' +
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

  function principle(title,copy) {
    return '<article class="sct-principle">' +
      '<b>' + esc(title) + '</b>' +
      '<span>' + esc(copy) + '</span>' +
    '</article>';
  }

  function step(number,title,copy) {
    return '<article class="sct-step">' +
      '<strong>' + String(number).padStart(2,'0') + '</strong>' +
      '<h3>' + esc(title) + '</h3>' +
      '<p>' + esc(copy) + '</p>' +
    '</article>';
  }

  function routeLink(title,copy,href) {
    return '<a class="sct-route-link" href="' + esc(href) + '">' +
      '<b>' + esc(title) + '</b>' +
      '<span>' + esc(copy) + '</span>' +
    '</a>';
  }

  function cta(title,copy,actions) {
    return '<section class="sct-cta">' +
      '<div class="sct-inner sct-cta-box">' +
        '<div><h2>' + esc(title) + '</h2>' +
          '<p>' + esc(copy) + '</p></div>' +
        '<div class="sct-cta-actions">' + actions + '</div>' +
      '</div>' +
    '</section>';
  }

  function aboutPage() {
    return hero(
      'about',
      'About Stratex Analytics',
      'We build football intelligence products for overlooked talent.',
      'Stratex Analytics exists to organise the evidence around grassroots football and create safer, clearer routes between coaches, players and decision-makers.',
      button('Explore ScoutLink',sitePath('scoutlink'),true) +
      button('Meet the Leadership Team',sitePath('leadership'),false)
    ) +
    '<section class="sct-section is-white"><div class="sct-inner">' +
      sectionIntro(
        'Why Stratex',
        'Football evidence should travel further than the loudest recommendation.',
        'Stratex is building around practical football workflows, clearer context and controlled visibility.'
      ) +
      cards([
        {
          title:'Why Stratex exists',
          copy:'Talent is not distributed according to who has the best network, the most polished clip or the loudest recommendation. We want better football evidence to travel further.'
        },
        {
          title:'What we build',
          copy:'Data-led products that make football information easier to maintain, interpret and act on. ScoutLink is the first flagship product.'
        },
        {
          title:'How we operate',
          copy:'Product, customer operations, growth and football strategy work together. User feedback and real football workflows shape the roadmap.'
        },
        {
          title:'Where we are going',
          copy:'The initial focus is the UK grassroots game. The longer-term ambition is a wider football-intelligence ecosystem that supports players, coaches, scouts, clubs and partners.'
        }
      ],2) +
    '</div></section>' +

    '<section class="sct-section is-soft"><div class="sct-inner">' +
      sectionIntro(
        'Operating principles',
        'The standard behind the product decisions.',
        'The principles keep Stratex focused on usefulness, football context, evidence quality and responsible visibility.'
      ) +
      '<div class="sct-principles">' +
        principle('Useful before impressive','Solve the real workflow first.') +
        principle('Football context matters','Numbers need role, age and match context.') +
        principle('Visibility needs control','Opportunity should not remove safeguarding.') +
        principle('Evidence should improve','Products should show what information is missing.') +
      '</div>' +
    '</div></section>' +

    cta(
      'Start with the first Stratex product.',
      'Explore ScoutLink or meet the people responsible for company direction, customer operations and football growth.',
      button('Explore ScoutLink',sitePath('scoutlink'),true) +
      button('Leadership',sitePath('leadership'),false)
    );
  }

  function leaderCard(person) {
    return '<article class="sct-leader">' +
      '<div class="sct-leader-photo">' +
        '<span class="sct-leader-fallback" aria-hidden="true">' +
          esc(person.initials || initials(person.name)) +
        '</span>' +
        '<img data-sct-leader-image src="' + esc(person.image) +
          '" alt="' + esc(person.alt || person.name) +
          '" loading="lazy" width="320" height="320">' +
      '</div>' +
      '<div class="sct-leader-body">' +
        '<span class="sct-leader-role">' + esc(person.title) + '</span>' +
        '<h3>' + esc(person.name) + '</h3>' +
        '<div class="sct-leader-area">' + esc(person.area || '') + '</div>' +
        '<p>' + esc(person.summary || person.bio || '') + '</p>' +
        '<div class="sct-leader-actions">' +
          '<button class="sct-button is-soft is-small" type="button" ' +
            'data-sct-leader="' + esc(person.key) + '">' +
            'View profile</button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function leadershipPage() {
    return hero(
      'leadership',
      'Leadership',
      'The team building Stratex Analytics.',
      'A small operating team with direct responsibility for company direction, product quality, customer operations, football strategy, growth and the community around ScoutLink.',
      button('Contact the Team',sitePath('contact'),true) +
      button('Explore Careers',sitePath('careers'),false)
    ) +
    '<section class="sct-section is-white"><div class="sct-inner">' +
      sectionIntro(
        'The operating team',
        'Visible ownership across the company.',
        'Leadership remains close to the product, users, football relationships and the trust decisions around youth-player visibility.'
      ) +
      '<div class="sct-leaders" id="sctLeadershipGrid">' +
        leaders.map(leaderCard).join('') +
      '</div>' +
    '</div></section>' +

    '<section class="sct-section is-soft"><div class="sct-inner">' +
      sectionIntro(
        'How the team operates',
        'Decisions are strengthened across functions.',
        'Product, customer operations and football growth are expected to challenge one another rather than operate as isolated departments.'
      ) +
      cards([
        {
          title:'Direct ownership',
          copy:'The leadership team stays close to product decisions, customer conversations, football relationships and operational issues.'
        },
        {
          title:'Cross-functional decisions',
          copy:'Product, marketing, customer operations and football strategy are expected to challenge and strengthen one another.'
        },
        {
          title:'Built around the market',
          copy:'Coach and scout feedback is used to shape positioning, onboarding, product priorities and the evidence standard inside ScoutLink.'
        }
      ],3) +
    '</div></section>' +

    cta(
      'Need to speak to Stratex?',
      'Contact the team about partnerships, operations, ScoutLink or trust-related questions.',
      button('Contact Stratex',sitePath('contact'),true)
    );
  }

  function trustPage() {
    return hero(
      'trust',
      'Trust and safeguarding',
      'Youth visibility should be useful, controlled and accountable.',
      'ScoutLink combines reviewed scout access, coach-led profiles, adult-led contact, clear concern routes and transparent limits around decision-support scoring.',
      button('Read Scout Verification',sitePath('scout-verification'),true) +
      button('Report a Concern',sitePath('report-a-concern'),false),
      'Stratex is not an emergency service. Contact emergency services or the appropriate safeguarding authority first where someone is at immediate risk.'
    ) +
    '<section class="sct-section is-white"><div class="sct-inner">' +
      sectionIntro(
        'Trust principles',
        'Practical controls around youth-player visibility.',
        'The product is designed to reduce open exposure, unclear access and inappropriate contact routes.'
      ) +
      cards([
        {
          title:'Reviewed access',
          copy:'Scout applications are reviewed before player-search and recruitment tools become available.'
        },
        {
          title:'Coach-led profiles',
          copy:'Player information is created and maintained by authorised adults, teams, schools or approved programmes.'
        },
        {
          title:'Controlled visibility',
          copy:'ScoutLink is not an open public directory of children. Product access and player visibility are permissioned.'
        },
        {
          title:'Adult-led communication',
          copy:'Scout interest is managed through coaches, clubs, schools, academies or guardians rather than open direct scout-to-child contact.'
        },
        {
          title:'Clear concern routes',
          copy:'Public reporting routes exist for safeguarding, misuse, privacy, access and conduct concerns.'
        },
        {
          title:'Responsible scoring',
          copy:'Compatibility and predictions support judgement but do not guarantee trials, contracts, selection or development.'
        }
      ],3) +
    '</div></section>' +

    '<section class="sct-section is-dark"><div class="sct-inner">' +
      sectionIntro(
        'Public trust routes',
        'Find the right explanation or reporting route.',
        'These pages explain who can access ScoutLink, how player information is handled and how to raise a concern.'
      ) +
      '<div class="sct-route-grid">' +
        routeLink(
          'Scout Verification',
          'How reviewed access and supporting information work.',
          sitePath('scout-verification')
        ) +
        routeLink(
          'Parent/Guardian Notice',
          'How player profiles, visibility and interest work.',
          sitePath('parent-guardian-notice')
        ) +
        routeLink(
          'Report a Concern',
          'Report safeguarding, conduct, privacy or access concerns.',
          sitePath('report-a-concern')
        ) +
        routeLink(
          'Privacy Policy',
          'How Stratex handles personal information.',
          sitePath('privacy-policy')
        ) +
        routeLink(
          'Terms of Use',
          'The rules for Stratex websites and ScoutLink.',
          sitePath('terms')
        ) +
        routeLink(
          'Security',
          'How access, permissions and reporting are approached.',
          sitePath('security')
        ) +
      '</div>' +
    '</div></section>' +

    cta(
      'Something does not feel right?',
      'Use the dedicated concern route so the issue can be assessed by the appropriate Stratex owner.',
      button('Report a Concern',sitePath('report-a-concern'),true) +
      button('Contact Stratex',sitePath('contact'),false)
    );
  }

  function verificationSteps() {
    return '<div class="sct-steps">' +
      step(
        1,
        'Submit the application',
        'Provide personal, organisation and team information, then complete the required declarations.'
      ) +
      step(
        2,
        'Provide supporting evidence',
        'Upload the identity and safeguarding documentation requested during the registration process.'
      ) +
      step(
        3,
        'Internal review',
        'Stratex reviews the application, documents, role context and any information that needs clarification.'
      ) +
      step(
        4,
        'Access decision',
        'The account is approved, declined or returned for further information. Access can later be restricted or removed where concerns arise.'
      ) +
    '</div>';
  }

  function verificationUploadPage(token) {
    return hero(
      'verification',
      'Secure scout verification',
      'Complete the requested verification documents.',
      'Use the secure link from your ScoutLink registration or approval email. The files are sent to the existing restricted verification workflow.',
      '',
      'Accepted files are PDF, JPG, PNG, DOC or DOCX. Each file must be 5MB or smaller.',
      true
    ) +
    '<section class="sct-section is-white"><div class="sct-inner">' +
      '<div class="sct-form-layout">' +
        '<div class="sct-status-card" id="sctVerificationStatus" aria-live="polite">' +
          '<span class="sct-status-pill">Checking link</span>' +
          '<h2>Loading verification request</h2>' +
          '<p>The secure request is being checked.</p>' +
        '</div>' +
        '<div class="sct-form-card">' +
          '<form id="sctVerificationForm" data-token="' + esc(token) + '">' +
            '<h2>Submit documents</h2>' +
            '<div class="sct-fields">' +
              '<label class="sct-field is-full">' +
                '<span class="sct-label">Safeguarding or DBS evidence</span>' +
                '<input class="sct-input" type="file" name="safeguardingEvidence" ' +
                  'accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required>' +
              '</label>' +
              '<label class="sct-field is-full">' +
                '<span class="sct-label">Proof of ID</span>' +
                '<input class="sct-input" type="file" name="proofOfId" ' +
                  'accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required>' +
              '</label>' +
            '</div>' +
            '<p class="sct-help">Both files are required for this secure upload route.</p>' +
            '<div class="sct-form-message" id="sctVerificationMessage" role="status"></div>' +
            '<div class="sct-form-actions">' +
              '<button class="sct-button is-primary" type="submit">Submit verification documents</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>' +
    '</div></section>';
  }

  function verificationPage() {
    var token = new URLSearchParams(window.location.search).get('token');

    if (token) return verificationUploadPage(token);

    return hero(
      'verification',
      'Scout access review',
      'Player search begins with a reviewed application.',
      'ScoutLink restricts scouting tools to applicants whose identity, role and safeguarding information have been reviewed through the platform process.',
      button(
        'Request Scout Access',
        SCOUTLINK.scout,
        true,
        'data-sct-outbound="scout"'
      ) +
      button('Read the Trust Page',sitePath('trust'),false),
      'Approval enables controlled ScoutLink access. It is not a public endorsement of an individual or organisation.'
    ) +
    '<section class="sct-section is-white"><div class="sct-inner">' +
      sectionIntro(
        'The review process',
        'Four stages before player-search access.',
        'The application should remain accurate throughout the review and after access is granted.'
      ) +
      verificationSteps() +
    '</div></section>' +

    '<section class="sct-section is-soft"><div class="sct-inner">' +
      sectionIntro(
        'Accountability after approval',
        'Reviewed access remains subject to appropriate use.',
        'ScoutLink can request clarification, review permissions and restrict access where information changes or concerns arise.'
      ) +
      cards([
        {
          title:'Verification is not an endorsement',
          copy:'Approval allows controlled use of ScoutLink. It is not a public recommendation of an individual or organisation.'
        },
        {
          title:'Access remains accountable',
          copy:'Usage, permissions and reported concerns may be reviewed after approval.'
        },
        {
          title:'Information must remain accurate',
          copy:'Scouts and scouting teams are responsible for keeping account, organisation and role information current.'
        }
      ],3) +
    '</div></section>' +

    cta(
      'Start the reviewed access process.',
      'Complete the ScoutLink Scout registration with accurate role, organisation and safeguarding information.',
      button(
        'Request Scout Access',
        SCOUTLINK.scout,
        true,
        'data-sct-outbound="scout"'
      ) +
      button('Trust and Safeguarding',sitePath('trust'),false)
    );
  }

  function parentPage() {
    return hero(
      'parent',
      'Information for families',
      'How player information and visibility work in ScoutLink.',
      'This notice explains who creates youth-player profiles, what information may be included, who can review it and how families can raise a question or concern.',
      button('Read Safeguarding',sitePath('trust'),true) +
      button('Report a Concern',sitePath('report-a-concern'),false)
    ) +
    '<section class="sct-section is-white"><div class="sct-inner">' +
      sectionIntro(
        'What families should know',
        'The player record is structured and permissioned.',
        'ScoutLink is designed around coach-led evidence and reviewed access rather than open public player profiles.'
      ) +
      cards([
        {
          title:'Who creates the profile',
          copy:'Authorised coaches, clubs, schools, academies or approved programmes create and manage the player record.'
        },
        {
          title:'What the profile may contain',
          copy:'Football position, age group, coach ratings, Match Facts, fixtures, physical context, approved video evidence and development information.'
        },
        {
          title:'Who can search',
          copy:'Player search is not public. It is available through reviewed scout access and appropriate product permissions.'
        },
        {
          title:'How interest is handled',
          copy:'Scout interest should move through the coach, club, school, academy or another appropriate adult-led route.'
        },
        {
          title:'What the scoring means',
          copy:'Compatibility and other product outputs support football decisions. They do not decide a player’s value, future or likelihood of selection.'
        },
        {
          title:'How to ask for help',
          copy:'Families can use public contact, privacy and concern routes to ask questions or report suspected misuse.'
        }
      ],3) +
    '</div></section>' +

    '<section class="sct-section is-soft"><div class="sct-inner">' +
      sectionIntro(
        'Useful routes',
        'Questions, rights and concerns should go to the right place.',
        'Use the route that most closely matches what needs to be understood or reviewed.'
      ) +
      '<div class="sct-route-grid">' +
        routeLink(
          'Trust and Safeguarding',
          'Read the principles behind controlled visibility.',
          sitePath('trust')
        ) +
        routeLink(
          'Scout Verification',
          'Understand how scout access is reviewed.',
          sitePath('scout-verification')
        ) +
        routeLink(
          'Privacy Policy',
          'Read how personal information is handled.',
          sitePath('privacy-policy')
        ) +
        routeLink(
          'Contact Stratex',
          'Ask a question about ScoutLink or a player profile.',
          sitePath('contact')
        ) +
        routeLink(
          'Report a Concern',
          'Report suspected misuse, inappropriate contact or another concern.',
          sitePath('report-a-concern')
        ) +
      '</div>' +
    '</div></section>' +

    cta(
      'Need clarification about a ScoutLink profile?',
      'Contact Stratex for a general question or use the dedicated concern route where something may be unsafe or inappropriate.',
      button('Contact Stratex',sitePath('contact'),true) +
      button('Report a Concern',sitePath('report-a-concern'),false)
    );
  }

  function contactRoute(title,copy) {
    return '<div class="sct-route">' +
      '<b>' + esc(title) + '</b>' +
      '<span>' + esc(copy) + '</span>' +
    '</div>';
  }

  function contactForm() {
    return '<form id="sctContactForm">' +
      '<h2>Send a message</h2>' +
      '<div class="sct-fields">' +
        '<label class="sct-field">' +
          '<span class="sct-label">First name</span>' +
          '<input class="sct-input" name="firstName" autocomplete="given-name" required>' +
        '</label>' +
        '<label class="sct-field">' +
          '<span class="sct-label">Last name</span>' +
          '<input class="sct-input" name="lastName" autocomplete="family-name" required>' +
        '</label>' +
        '<label class="sct-field">' +
          '<span class="sct-label">Email</span>' +
          '<input class="sct-input" type="email" name="email" autocomplete="email" required>' +
        '</label>' +
        '<label class="sct-field">' +
          '<span class="sct-label">Phone optional</span>' +
          '<input class="sct-input" type="tel" name="phone" autocomplete="tel">' +
        '</label>' +
        '<label class="sct-field">' +
          '<span class="sct-label">Organisation, club or team optional</span>' +
          '<input class="sct-input" name="organisation" autocomplete="organization">' +
        '</label>' +
        '<label class="sct-field">' +
          '<span class="sct-label">Reason</span>' +
          '<select class="sct-select" name="reason" required>' +
            '<option value="">Select a reason</option>' +
            '<option>Product support</option>' +
            '<option>Coach onboarding</option>' +
            '<option>Scout access</option>' +
            '<option>Partnerships or media</option>' +
            '<option>Careers</option>' +
            '<option>Privacy or accessibility</option>' +
            '<option>General enquiry</option>' +
          '</select>' +
        '</label>' +
        '<label class="sct-field is-full">' +
          '<span class="sct-label">Message</span>' +
          '<textarea class="sct-textarea" name="message" required ' +
            'placeholder="Tell us what you need help with."></textarea>' +
        '</label>' +
      '</div>' +
      '<label class="sct-check">' +
        '<input type="checkbox" name="consentContact" required>' +
        '<span>I agree that Stratex Analytics may use these details to respond to my enquiry.</span>' +
      '</label>' +
      '<label class="sct-check">' +
        '<input type="checkbox" name="consentMarketing">' +
        '<span>I would like to receive occasional Stratex and ScoutLink updates.</span>' +
      '</label>' +
      '<div class="sct-form-message" id="sctContactMessage" role="status"></div>' +
      '<div class="sct-form-actions">' +
        '<button class="sct-button is-primary" type="submit">Send message</button>' +
      '</div>' +
    '</form>';
  }

  function contactPage() {
    return hero(
      'contact',
      'Contact Stratex Analytics',
      'Talk to the right team.',
      'Use the contact route for ScoutLink support, coach onboarding, scout access, partnerships, media, accessibility, careers or general Stratex enquiries.',
      '',
      '',
      true
    ) +
    '<section class="sct-section is-white"><div class="sct-inner">' +
      '<div class="sct-form-layout">' +
        '<div class="sct-route-list">' +
          contactRoute(
            'Product support',
            'Problems signing in, using a feature or understanding an account.'
          ) +
          contactRoute(
            'Coach onboarding',
            'Help creating a team, importing players or understanding the coach workflow.'
          ) +
          contactRoute(
            'Scout access',
            'Registration, review, team plans, permissions or subscription questions.'
          ) +
          contactRoute(
            'Partnerships and media',
            'Football partnerships, events, sponsorship, press and commercial enquiries.'
          ) +
          contactRoute(
            'Privacy and accessibility',
            'Data-rights questions or barriers using a Stratex website or product.'
          ) +
          contactRoute(
            'Careers',
            'Open roles, internships and future-opportunity questions.'
          ) +
          '<div class="sct-callout is-danger">' +
            '<b>Safeguarding or conduct concern?</b>' +
            '<p>Use the dedicated Report a Concern page. Contact emergency services or the appropriate safeguarding authority first where someone is at immediate risk.</p>' +
            '<div class="sct-card-actions">' +
              '<a class="sct-button is-danger is-small" href="' +
                esc(sitePath('report-a-concern')) +
                '">Report a Concern</a>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="sct-form-card">' + contactForm() + '</div>' +
      '</div>' +
    '</div></section>';
  }

  function concernForm() {
    return '<form id="sctConcernForm">' +
      '<h2>Submit a concern</h2>' +
      '<div class="sct-fields">' +
        '<label class="sct-field">' +
          '<span class="sct-label">Name</span>' +
          '<input class="sct-input" name="contactName" autocomplete="name" required>' +
        '</label>' +
        '<label class="sct-field">' +
          '<span class="sct-label">Email</span>' +
          '<input class="sct-input" type="email" name="contactEmail" autocomplete="email" required>' +
        '</label>' +
        '<label class="sct-field is-full">' +
          '<span class="sct-label">Relationship to concern</span>' +
          '<input class="sct-input" name="relationshipToConcern" ' +
            'placeholder="Parent, coach, scout, player or club official" required>' +
        '</label>' +
        '<label class="sct-field is-full">' +
          '<span class="sct-label">Player, team or organisation involved optional</span>' +
          '<input class="sct-input" name="playerOrTeam">' +
        '</label>' +
        '<label class="sct-field">' +
          '<span class="sct-label">Type of concern</span>' +
          '<select class="sct-select" name="concernType" required>' +
            '<option value="">Select one</option>' +
            '<option>Safeguarding</option>' +
            '<option>Scout conduct</option>' +
            '<option>Coach conduct</option>' +
            '<option>Player information</option>' +
            '<option>Data/privacy</option>' +
            '<option>Platform misuse</option>' +
            '<option>Other</option>' +
          '</select>' +
        '</label>' +
        '<label class="sct-field">' +
          '<span class="sct-label">Is anyone at immediate risk?</span>' +
          '<select class="sct-select" name="immediateRisk" required>' +
            '<option value="">Select one</option>' +
            '<option>No</option>' +
            '<option>Yes</option>' +
          '</select>' +
        '</label>' +
        '<label class="sct-field is-full">' +
          '<span class="sct-label">What happened?</span>' +
          '<textarea class="sct-textarea" name="description" required ' +
            'placeholder="Describe the concern and include useful dates or account information."></textarea>' +
        '</label>' +
      '</div>' +
      '<label class="sct-check">' +
        '<input type="checkbox" name="consentContact" required>' +
        '<span>I give Stratex permission to contact me if follow-up is needed.</span>' +
      '</label>' +
      '<input type="hidden" name="sourcePage" value="/report-a-concern">' +
      '<input type="hidden" name="utm_source">' +
      '<input type="hidden" name="utm_medium">' +
      '<input type="hidden" name="utm_campaign">' +
      '<div class="sct-form-message" id="sctConcernMessage" role="status"></div>' +
      '<div class="sct-form-actions">' +
        '<button class="sct-button is-danger" type="submit">Submit concern</button>' +
      '</div>' +
    '</form>';
  }

  function concernPage() {
    return hero(
      'concern',
      'Report a concern',
      'Tell us about a safety, access or conduct concern.',
      'Use this route to report inappropriate contact, suspected misuse, inaccurate access, privacy concerns or another issue connected to Stratex Analytics or ScoutLink.',
      '',
      '',
      true
    ) +
    '<section class="sct-section is-white"><div class="sct-inner">' +
      '<div class="sct-callout is-danger">' +
        '<b>Someone in immediate danger?</b>' +
        '<p>Contact emergency services or the appropriate local safeguarding authority first. This form is not an emergency service.</p>' +
      '</div>' +
      '<div class="sct-form-layout">' +
        '<div class="sct-route-list">' +
          contactRoute(
            'Immediate danger',
            'Contact emergency services or the appropriate local safeguarding authority first where someone is at immediate risk.'
          ) +
          contactRoute(
            'What to include',
            'Describe what happened, the account or area involved, relevant dates and any useful supporting information.'
          ) +
          contactRoute(
            'Confidential handling',
            'Information is shared only with the people needed to assess and respond to the concern.'
          ) +
          contactRoute(
            'What happens next',
            'The issue is triaged, reviewed by the appropriate Stratex owner and escalated according to the level of risk.'
          ) +
        '</div>' +
        '<div class="sct-form-card">' + concernForm() + '</div>' +
      '</div>' +
    '</div></section>';
  }

  function pageMarkup(key) {
    if (key === 'about') return aboutPage();
    if (key === 'leadership') return leadershipPage();
    if (key === 'trust') return trustPage();
    if (key === 'verification') return verificationPage();
    if (key === 'parent') return parentPage();
    if (key === 'contact') return contactPage();
    if (key === 'concern') return concernPage();
    return '';
  }

  function initials(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    return (
      ((parts[0] || '')[0] || '') +
      ((parts[1] || '')[0] || '')
    ).toUpperCase() || 'ST';
  }

  function normalizeLeader(row,fallback) {
    row = row || {};
    fallback = fallback || {};

    var name = row.full_name || row.fullName || fallback.name || '';
    var title = row.job_title || row.jobTitle || fallback.title || 'Leadership';

    if (/lucy ali/i.test(name)) {
      title = 'Director of Customer Operations';
    }

    return {
      key:String(row.id || fallback.key || name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g,'-')
        .replace(/^-+|-+$/g,''),
      name:name,
      title:title,
      area:row.area ||
        row.focus_area ||
        row.focusArea ||
        fallback.area ||
        '',
      bio:row.bio || fallback.bio || row.summary || fallback.summary || '',
      summary:row.summary || fallback.summary || row.bio || fallback.bio || '',
      email:row.email || fallback.email || '',
      linkedin:row.linkedin_url || row.linkedinUrl || fallback.linkedin || '',
      image:row.image_url || row.imageUrl || fallback.image || '',
      alt:row.alt || fallback.alt || (name + ', Stratex Analytics leadership'),
      initials:fallback.initials || initials(name),
      focus:Array.isArray(row.focus_areas)
        ? row.focus_areas
        : (Array.isArray(fallback.focus) ? fallback.focus : [])
    };
  }

  function mergeLeaders(rows) {
    var byName = {};

    (rows || []).forEach(function (row) {
      var name = String(row.full_name || row.fullName || '')
        .trim()
        .toLowerCase();

      if (name) byName[name] = row;
    });

    var known = {};

    var merged = FALLBACK_LEADERS.map(function (fallback) {
      var key = fallback.name.toLowerCase();
      known[key] = true;
      return normalizeLeader(byName[key],fallback);
    });

    (rows || []).forEach(function (row) {
      var name = String(row.full_name || row.fullName || '').trim();
      if (!name || known[name.toLowerCase()]) return;
      merged.push(normalizeLeader(row,{}));
    });

    return merged;
  }

  async function loadLeadership() {
    var grid = document.getElementById('sctLeadershipGrid');
    if (!grid) return;

    try {
      var response = await fetch(
        API + '/api/stratex-website/leadership',
        {credentials:'include'}
      );

      var json = await response.json().catch(function () {
        return {};
      });

      if (!response.ok) {
        throw new Error(json.error || 'Leadership could not load.');
      }

      var rows = json.data || [];
      if (!rows.length) return;

      leaders = mergeLeaders(rows);
      grid.innerHTML = leaders.map(leaderCard).join('');
      bindLeaderCards();
      bindLeaderImages();
      setJsonLd('leadership',PAGE_META.leadership,leaders);
    } catch (_) {}
  }

  function leaderByKey(key) {
    return leaders.find(function (person) {
      return String(person.key) === String(key);
    }) || null;
  }

  function modalMarkup(person) {
    var actions = '';

    if (person.email) {
      actions += '<a class="sct-button is-primary" href="mailto:' +
        esc(person.email) + '">Email ' +
        esc(person.name.split(' ')[0]) + '</a>';
    }

    if (person.linkedin) {
      actions += '<a class="sct-button" href="' +
        esc(person.linkedin) +
        '" target="_blank" rel="noopener">View LinkedIn</a>';
    }

    return '<div class="sct-modal-backdrop" data-sct-modal-close></div>' +
      '<section class="sct-modal" role="dialog" aria-modal="true" ' +
        'aria-labelledby="sctLeaderTitle">' +
        '<button class="sct-button is-small sct-modal-close" type="button" ' +
          'data-sct-modal-close>Close</button>' +
        '<div class="sct-modal-head">' +
          '<img class="sct-modal-image" src="' + esc(person.image) +
            '" alt="' + esc(person.alt || person.name) + '">' +
          '<div><span class="sct-tag">' + esc(person.title) + '</span>' +
            '<h2 id="sctLeaderTitle">' + esc(person.name) + '</h2>' +
            '<p>' + esc(person.area || '') + '</p></div>' +
        '</div>' +
        '<p class="sct-modal-copy">' + esc(person.bio || person.summary) + '</p>' +
        (person.focus.length
          ? '<div class="sct-tags">' +
            person.focus.map(function (item) {
              return '<span class="sct-tag">' + esc(item) + '</span>';
            }).join('') +
            '</div>'
          : '') +
        (actions
          ? '<div class="sct-actions">' + actions + '</div>'
          : '') +
      '</section>';
  }

  function openLeaderModal(key,trigger) {
    var person = leaderByKey(key);
    if (!person) return;

    closeLeaderModal(false);
    modalReturnFocus = trigger || document.activeElement;

    var host = document.createElement('div');
    host.className = 'sct-modal-host';
    host.innerHTML = modalMarkup(person);
    document.body.appendChild(host);
    document.body.classList.add('sct-modal-open');

    var focusable = host.querySelectorAll(
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])'
    );

    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    if (first) first.focus();

    host.addEventListener('click',function (event) {
      if (event.target.hasAttribute('data-sct-modal-close')) {
        closeLeaderModal(true);
      }
    });

    host.addEventListener('keydown',function (event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeLeaderModal(true);
        return;
      }

      if (event.key !== 'Tab' || !focusable.length) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  function closeLeaderModal(restore) {
    var host = document.querySelector('.sct-modal-host');
    if (host) host.remove();
    document.body.classList.remove('sct-modal-open');

    if (
      restore &&
      modalReturnFocus &&
      typeof modalReturnFocus.focus === 'function'
    ) {
      modalReturnFocus.focus();
    }

    modalReturnFocus = null;
  }

  function bindLeaderCards() {
    document.querySelectorAll('[data-sct-leader]').forEach(
      function (buttonNode) {
        if (buttonNode.dataset.sctBound === '1') return;
        buttonNode.dataset.sctBound = '1';

        buttonNode.addEventListener('click',function () {
          openLeaderModal(
            buttonNode.getAttribute('data-sct-leader'),
            buttonNode
          );
        });
      }
    );
  }

  function bindLeaderImages() {
    document.querySelectorAll('[data-sct-leader-image]').forEach(
      function (image) {
        image.addEventListener('error',function () {
          image.hidden = true;
        },{once:true});
      }
    );
  }

  function setStatus(node,message,type) {
    if (!node) return;

    node.textContent = message || '';
    node.className = 'sct-form-message';

    if (!message) return;

    node.classList.add('is-visible');
    node.classList.add(
      type === 'success' ? 'is-success' : 'is-error'
    );
  }

  function formDataObject(form) {
    var data = {};

    new FormData(form).forEach(function (value,key) {
      data[key] = value;
    });

    return data;
  }

  function bindFormStarted(form,eventName) {
    if (!form) return;

    var started = false;

    form.addEventListener('focusin',function () {
      if (started) return;
      started = true;
      track(eventName);
    });
  }

  async function submitWebsiteForm(form,type) {
    var message = form.querySelector('.sct-form-message');
    var buttonNode = form.querySelector('button[type="submit"]');

    setStatus(message,'','');

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var data = formDataObject(form);

    data.consentContact =
      !!form.querySelector('[name="consentContact"]:checked');

    data.consentMarketing =
      !!form.querySelector('[name="consentMarketing"]:checked');

    data.sourcePage = window.location.pathname;

    data.consentText = type === 'concern'
      ? 'I give Stratex permission to contact me if follow-up is needed.'
      : 'I agree that Stratex Analytics may use these details to respond to this submission.';

    data.consentVersion = '2026-07-stratex-site-v1';

    var endpoint = type === 'concern'
      ? '/api/stratex-website/concern'
      : '/api/stratex-website/contact';

    buttonNode.disabled = true;
    buttonNode.textContent = type === 'concern'
      ? 'Submitting…'
      : 'Sending…';

    try {
      var response = await fetch(
        API + endpoint,
        {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify(data),
          credentials:'include'
        }
      );

      var json = await response.json().catch(function () {
        return {};
      });

      if (!response.ok) {
        throw new Error(json.error || 'Submission failed.');
      }

      form.reset();

      if (type === 'concern') {
        setStatus(
          message,
          'Thanks — we have received your report. Our team will review it and contact you if follow-up is needed. If someone is in immediate danger, contact emergency services or the relevant safeguarding authority first.',
          'success'
        );
        track('report_concern_submitted');
      } else {
        setStatus(
          message,
          json.message || 'Thanks. Your message has been received.',
          'success'
        );
        track('contact_form_submitted');
      }
    } catch (error) {
      setStatus(
        message,
        error.message || 'The form could not be submitted right now.',
        'error'
      );
    } finally {
      buttonNode.disabled = false;
      buttonNode.textContent = type === 'concern'
        ? 'Submit concern'
        : 'Send message';
    }
  }

  function bindContactForm() {
    var form = document.getElementById('sctContactForm');
    if (!form) return;

    bindFormStarted(form,'contact_form_started');

    form.addEventListener('submit',function (event) {
      event.preventDefault();
      submitWebsiteForm(form,'contact');
    });
  }

  function populateConcernUtm(form) {
    var params = new URLSearchParams(window.location.search);

    ['utm_source','utm_medium','utm_campaign'].forEach(
      function (name) {
        var field = form.querySelector('[name="' + name + '"]');
        if (field) field.value = params.get(name) || '';
      }
    );
  }

  function bindConcernForm() {
    var form = document.getElementById('sctConcernForm');
    if (!form) return;

    populateConcernUtm(form);
    form.addEventListener('submit',function (event) {
      event.preventDefault();
      submitWebsiteForm(form,'concern');
    });
  }

  function renderVerificationStatus(data) {
    var root = document.getElementById('sctVerificationStatus');
    if (!root) return;

    root.innerHTML =
      '<span class="sct-status-pill">' +
        esc(data.verificationStatus || 'Awaiting documents') +
      '</span>' +
      '<h2>' +
        esc((data.firstName || 'Scout') + ', complete your verification') +
      '</h2>' +
      '<p>Upload the requested files for ' +
        esc(data.scoutClub || 'your scouting organisation') +
        '. The Stratex team will review the submitted information.</p>' +
      '<p><strong>Documents uploaded:</strong> ' +
        esc(data.documentsUploaded || 0) +
      '</p>';
  }

  function disableVerificationForm() {
    var form = document.getElementById('sctVerificationForm');
    if (!form) return;

    form.querySelectorAll('input,button').forEach(function (node) {
      node.disabled = true;
    });
  }

  async function loadVerification(token) {
    var root = document.getElementById('sctVerificationStatus');
    if (!token || !root) return;

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
        throw new Error(
          json.error || 'Verification link could not be loaded.'
        );
      }

      renderVerificationStatus(json);
    } catch (error) {
      root.innerHTML =
        '<span class="sct-status-pill">Link unavailable</span>' +
        '<h2>Verification link unavailable</h2>' +
        '<p>' +
          esc(error.message || 'This link may have expired.') +
        '</p>';

      disableVerificationForm();
    }
  }

  function validateVerificationFiles(form) {
    var allowed = /\.(pdf|jpe?g|png|docx?)$/i;

    ['safeguardingEvidence','proofOfId'].forEach(function (name) {
      var input = form.querySelector('[name="' + name + '"]');
      var file = input && input.files ? input.files[0] : null;

      if (!file) {
        throw new Error('Both verification files are required.');
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error(file.name + ' must be 5MB or smaller.');
      }

      if (!allowed.test(file.name)) {
        throw new Error(
          file.name + ' must be a PDF, JPG, PNG, DOC or DOCX file.'
        );
      }
    });
  }

  function bindVerificationForm() {
    var form = document.getElementById('sctVerificationForm');
    if (!form) return;

    var token = form.getAttribute('data-token');
    loadVerification(token);

    form.addEventListener('submit',async function (event) {
      event.preventDefault();

      var message = document.getElementById('sctVerificationMessage');
      var buttonNode = form.querySelector('button[type="submit"]');

      setStatus(message,'','');

      try {
        validateVerificationFiles(form);

        buttonNode.disabled = true;
        buttonNode.textContent = 'Uploading…';

        var response = await fetch(
          API + '/api/registrations/scout-verification/' +
          encodeURIComponent(token),
          {
            method:'POST',
            body:new FormData(form),
            credentials:'include'
          }
        );

        var json = await response.json().catch(function () {
          return {};
        });

        if (!response.ok) {
          throw new Error(
            json.error || 'Verification documents could not be uploaded.'
          );
        }

        form.reset();

        setStatus(
          message,
          json.message || 'Verification documents received.',
          'success'
        );

        loadVerification(token);
      } catch (error) {
        setStatus(
          message,
          error.message || 'Verification documents could not be uploaded.',
          'error'
        );
      } finally {
        buttonNode.disabled = false;
        buttonNode.textContent = 'Submit verification documents';
      }
    });
  }

  function bindOutboundTracking() {
    document.querySelectorAll('[data-sct-outbound]').forEach(
      function (link) {
        link.addEventListener('click',function () {
          var key = link.getAttribute('data-sct-outbound');
          var events = {
            login:'outbound_scoutlink_login_clicked',
            coach:'outbound_scoutlink_register_coach_clicked',
            scout:'outbound_scoutlink_request_scout_access_clicked',
            demo:'outbound_scoutlink_demo_clicked',
            open:'outbound_scoutlink_login_clicked'
          };

          if (events[key]) track(events[key]);
        });
      }
    );
  }

  function rewriteSharedLinks() {
    document.querySelectorAll('[data-site-link]').forEach(function (link) {
      var slug = link.getAttribute('data-site-link');
      link.setAttribute('href',sitePath(slug));
    });
  }

  function addLearningNavigation() {
    var nav = document.getElementById('stxNav');

    if (
      !nav ||
      nav.querySelector('[data-site-link="learning-centre"]')
    ) {
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

  function markNavigation(key) {
    document.querySelectorAll(
      '#stxNav [aria-current="page"]'
    ).forEach(function (link) {
      link.removeAttribute('aria-current');
    });

    var slug = '';

    if (key === 'leadership') slug = 'leadership';
    if (key === 'contact') slug = 'contact';

    if (
      key === 'trust' ||
      key === 'verification' ||
      key === 'parent' ||
      key === 'concern'
    ) {
      slug = 'trust';
    }

    if (!slug) return;

    var active = document.querySelector(
      '#stxNav [data-site-link="' + slug + '"]'
    );

    if (active) active.setAttribute('aria-current','page');
  }

  function addFooterBottom() {
    var footer = document.getElementById('stratexFooter');
    if (!footer) return;

    var old = footer.querySelector('.sct-footer-bottom');
    if (old) old.remove();

    footer.insertAdjacentHTML(
      'beforeend',
      '<div class="sct-footer-bottom">' +
        '<span>© 2026 Stratex Analytics Limited. All rights reserved.</span>' +
        '<span>ScoutLink is owned and operated by Stratex Analytics.</span>' +
      '</div>'
    );
  }

  function setMeta(meta) {
    if (!meta) return;

    var canonical = STRATEX_BASE + meta.canonical;

    document.title = meta.title;

    var selectors = {
      'meta[name="description"]':meta.description,
      'meta[property="og:title"]':meta.title,
      'meta[property="og:description"]':meta.description,
      'meta[property="og:url"]':canonical,
      'meta[name="twitter:title"]':meta.title,
      'meta[name="twitter:description"]':meta.description
    };

    Object.keys(selectors).forEach(function (selector) {
      var node = document.querySelector(selector);
      if (node) node.setAttribute('content',selectors[selector]);
    });

    var canonicalNode = document.querySelector('link[rel="canonical"]');
    if (canonicalNode) canonicalNode.setAttribute('href',canonical);
  }

  function setJsonLd(key,meta,people) {
    var node = document.getElementById('stratexJsonLd');
    if (!node || !meta) return;

    var canonical = STRATEX_BASE + meta.canonical;

    var graph = [
      {
        '@type':'Organization',
        '@id':STRATEX_BASE + '/#organization',
        name:'Stratex Analytics',
        url:STRATEX_BASE + '/',
        image:STRATEX_BASE + '/images/og/stratex-og.png',
        sameAs:['https://www.scoutlink.app'],
        description:'Stratex Analytics builds football intelligence products for overlooked grassroots talent.'
      },
      {
        '@type':'WebPage',
        '@id':canonical + '#webpage',
        url:canonical,
        name:meta.title,
        description:meta.description,
        isPartOf:{
          '@type':'WebSite',
          '@id':STRATEX_BASE + '/#website',
          name:'Stratex Analytics',
          url:STRATEX_BASE + '/'
        },
        publisher:{'@id':STRATEX_BASE + '/#organization'}
      }
    ];

    if (key === 'leadership') {
      (people || leaders).forEach(function (person) {
        graph.push({
          '@type':'Person',
          name:person.name,
          jobTitle:person.title,
          image:person.image
            ? new URL(person.image,STRATEX_BASE).href
            : undefined,
          worksFor:{'@id':STRATEX_BASE + '/#organization'},
          sameAs:person.linkedin ? [person.linkedin] : undefined
        });
      });
    }

    node.textContent = JSON.stringify({
      '@context':'https://schema.org',
      '@graph':graph
    });
  }

  function bindPage() {
    bindLeaderCards();
    bindLeaderImages();
    bindContactForm();
    bindConcernForm();
    bindVerificationForm();
    bindOutboundTracking();
  }

  function render() {
    var key = routeKey();
    if (!key) return;

    var app = document.getElementById('stratexSiteApp');
    if (!app) return;

    document.body.classList.add('stratex-company-trust-pages-v3');
    document.body.setAttribute('data-stx-page',key);

    app.innerHTML =
      '<div class="sct-main">' + pageMarkup(key) + '</div>';

    rewriteSharedLinks();
    addLearningNavigation();
    rewriteSharedLinks();
    markNavigation(key);
    addFooterBottom();
    setMeta(PAGE_META[key]);
    setJsonLd(key,PAGE_META[key],leaders);
    bindPage();

    if (key === 'leadership') loadLeadership();

  }

  document.addEventListener('DOMContentLoaded',render);
})();
