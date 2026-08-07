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

  var state = {
    route:null,
    jobs:[],
    posts:[],
    jobSearch:'',
    jobDepartment:'',
    postSearch:'',
    postCategory:''
  };


  /*
   * The shared Stratex script also starts its existing dynamic loaders on
   * DOMContentLoaded. Reuse the same in-flight GET response so a public role
   * or article is not requested twice while this V3 layer takes over.
   */
  (function installGetDedupe() {
    if (
      typeof window.fetch !== 'function' ||
      window.fetch.__sclV3Dedupe
    ) {
      return;
    }

    var nativeFetch = window.fetch.bind(window);
    var inflight = Object.create(null);

    function requestUrl(input) {
      if (typeof input === 'string') return input;
      return input && input.url ? input.url : '';
    }

    function shouldDedupe(url,method) {
      if (method !== 'GET') return false;

      return url.indexOf('/api/careers') >= 0 ||
        url.indexOf('/api/stratex-website/blog') >= 0;
    }

    function wrappedFetch(input,init) {
      var method = String(
        init && init.method ||
        input && input.method ||
        'GET'
      ).toUpperCase();

      var url = requestUrl(input);

      if (!shouldDedupe(url,method)) {
        return nativeFetch(input,init);
      }

      var key = method + ' ' + url;

      if (!inflight[key]) {
        inflight[key] = nativeFetch(input,init).then(function (response) {
          setTimeout(function () {
            delete inflight[key];
          },2000);

          return response;
        }).catch(function (error) {
          delete inflight[key];
          throw error;
        });
      }

      return inflight[key].then(function (response) {
        return response.clone();
      });
    }

    wrappedFetch.__sclV3Dedupe = true;
    wrappedFetch.__sclV3Native = nativeFetch;
    window.fetch = wrappedFetch;
  })();

  var PAGE_META = {
    careers:{
      title:'Careers at Stratex Analytics | Football Technology Jobs',
      description:'Explore current roles at Stratex Analytics, the company building ScoutLink and football intelligence products for overlooked grassroots talent.',
      canonical:'/careers'
    },
    learning:{
      title:'ScoutLink Learning Centre | Stratex Analytics',
      description:'Practical guides for football coaches, scouts and families covering player evidence, compatibility, safeguarding and ScoutLink workflows.',
      canonical:'/learning-centre'
    }
  };

  var LEARNING_IMAGES = {
    coach:'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=82',
    scout:'https://images.unsplash.com/photo-1600679472829-3044539ce8ed?auto=format&fit=crop&w=1200&q=82',
    family:'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=1200&q=82',
    product:'https://images.unsplash.com/photo-1553778263-73a83bab9b0c?auto=format&fit=crop&w=1200&q=82',
    operations:'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1200&q=82',
    safeguarding:'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&w=1200&q=82',
    default:'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=1600&q=82'
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

  function decodePart(value) {
    try {
      return decodeURIComponent(value || '');
    } catch (_) {
      return value || '';
    }
  }

  function currentRoute() {
    var path = cleanPath();
    var parts = path.split('/').filter(Boolean);

    if (parts[0] === 'careers') {
      return {
        page:parts[1] ? 'career-detail' : 'careers',
        slug:parts[1] ? decodePart(parts.slice(1).join('/')) : ''
      };
    }

    if (parts[0] === 'learning-centre') {
      return {
        page:parts[1] ? 'article-detail' : 'learning',
        slug:parts[1] ? decodePart(parts.slice(1).join('/')) : ''
      };
    }

    return null;
  }

  function sitePath(slug) {
    var clean = String(slug || '').replace(/^\/+|\/+$/g,'');

    if (isStratexHost()) {
      return clean ? '/' + clean : '/';
    }

    return clean ? '/company/' + clean : '/company';
  }

  function canonicalPath(slug) {
    return STRATEX_BASE + '/' +
      String(slug || '').replace(/^\/+|\/+$/g,'');
  }

  function button(label,href,primary,attrs) {
    return '<a class="scl-button' +
      (primary ? ' is-primary' : '') +
      '" href="' + esc(href) + '" ' +
      (attrs || '') + '>' +
      esc(label) +
    '</a>';
  }

  function visualLine(title,copy) {
    return '<div class="scl-visual-line">' +
      '<b>' + esc(title) + '</b>' +
      '<span>' + esc(copy) + '</span>' +
    '</div>';
  }

  function visualStat(value,label) {
    return '<div class="scl-visual-stat">' +
      '<b>' + esc(value) + '</b>' +
      '<span>' + esc(label) + '</span>' +
    '</div>';
  }

  function visual(type) {
    var data = type === 'careers'
      ? {
          label:'Working at Stratex',
          title:'Early-stage ownership across football and product.',
          copy:'Stratex roles sit close to customers, football workflows and the decisions that shape ScoutLink.',
          rows:[
            [
              'Learn through delivery',
              'Take responsibility for real work, receive feedback and see how decisions connect.'
            ],
            [
              'Work across functions',
              'Product, customer operations, data, growth and football strategy influence one another.'
            ]
          ],
          stats:[
            ['Flexible','Where the role allows'],
            ['Football','Technology'],
            ['Ownership','From day one']
          ]
        }
      : {
          label:'ScoutLink Learning Centre',
          title:'Practical football guidance without the noise.',
          copy:'The Learning Centre explains player evidence, scouting workflows, compatibility, safeguarding and better use of ScoutLink.',
          rows:[
            [
              'For coaches',
              'Build stronger profiles, Match Facts and approved player evidence.'
            ],
            [
              'For scouts and families',
              'Understand decision support, controlled visibility and adult-led routes.'
            ]
          ],
          stats:[
            ['Coaches','Evidence'],
            ['Scouts','Context'],
            ['Families','Clarity']
          ]
        };

    return '<article class="scl-visual">' +
      '<span class="scl-visual-label">' + esc(data.label) + '</span>' +
      '<h2>' + esc(data.title) + '</h2>' +
      '<p>' + esc(data.copy) + '</p>' +
      '<div class="scl-visual-lines">' +
        data.rows.map(function (row) {
          return visualLine(row[0],row[1]);
        }).join('') +
      '</div>' +
      '<div class="scl-visual-stats">' +
        data.stats.map(function (row) {
          return visualStat(row[0],row[1]);
        }).join('') +
      '</div>' +
    '</article>';
  }

  function hero(type,kicker,title,copy,actions,note) {
    return '<section class="scl-hero">' +
      '<div class="scl-inner scl-hero-grid">' +
        '<div><span class="scl-kicker">' + esc(kicker) + '</span>' +
          '<h1>' + esc(title) + '</h1>' +
          '<p class="scl-hero-copy">' + esc(copy) + '</p>' +
          (actions
            ? '<div class="scl-actions">' + actions + '</div>'
            : '') +
          (note
            ? '<div class="scl-hero-note">' + esc(note) + '</div>'
            : '') +
        '</div>' +
        visual(type) +
      '</div>' +
    '</section>';
  }

  function sectionIntro(kicker,title,copy) {
    return '<div class="scl-section-head">' +
      '<div><span class="scl-kicker">' + esc(kicker) + '</span>' +
        '<h2>' + esc(title) + '</h2></div>' +
      '<p>' + esc(copy) + '</p>' +
    '</div>';
  }

  function principle(title,copy) {
    return '<article class="scl-principle">' +
      '<b>' + esc(title) + '</b>' +
      '<span>' + esc(copy) + '</span>' +
    '</article>';
  }

  function cta(title,copy,actions) {
    return '<section class="scl-cta">' +
      '<div class="scl-inner scl-cta-box">' +
        '<div><h2>' + esc(title) + '</h2>' +
          '<p>' + esc(copy) + '</p></div>' +
        '<div class="scl-cta-actions">' + actions + '</div>' +
      '</div>' +
    '</section>';
  }

  function loadingState(label) {
    return '<div class="scl-state">' +
      '<div class="scl-state-inner">' +
        '<div class="scl-spinner" aria-label="' + esc(label) + '"></div>' +
      '</div>' +
    '</div>';
  }

  function emptyState(title,copy,action) {
    return '<div class="scl-state">' +
      '<div class="scl-state-inner">' +
        '<span class="scl-kicker">Stratex Analytics</span>' +
        '<h3>' + esc(title) + '</h3>' +
        '<p>' + esc(copy) + '</p>' +
        (action
          ? '<div class="scl-actions">' + action + '</div>'
          : '') +
      '</div>' +
    '</div>';
  }

  function careersPage() {
    return hero(
      'careers',
      'Careers at Stratex',
      'Help build better routes for grassroots football talent.',
      'Join a growing football-technology company working across product, customer operations, growth, data and the grassroots game.',
      button('View Open Roles','#openRoles',true) +
      button('Meet the Team',sitePath('leadership'),false),
      'Live roles are loaded directly from the Stratex hiring system. Closed or unreleased roles are not shown.'
    ) +
    '<section class="scl-section is-white"><div class="scl-inner">' +
      sectionIntro(
        'Why join Stratex',
        'Early-stage work with visible ownership.',
        'Roles may sit in one department, but product, customer and football decisions remain closely connected.'
      ) +
      '<div class="scl-principles">' +
        principle(
          'Meaningful ownership',
          'Early team members see the wider problem and can improve how the business operates.'
        ) +
        principle(
          'Football and product together',
          'The work connects football needs, product decisions and customer experience.'
        ) +
        principle(
          'Flexible working',
          'Remote and flexible arrangements are used where they fit the role and business needs.'
        ) +
        principle(
          'Learning through delivery',
          'Real responsibility, feedback and funded learning support development.'
        ) +
      '</div>' +
    '</div></section>' +

    '<section class="scl-section is-soft" id="openRoles">' +
      '<div class="scl-inner">' +
        sectionIntro(
          'Current opportunities',
          'Open roles at Stratex Analytics.',
          'Search the live opportunities by title, department, location or working pattern.'
        ) +
        '<div class="scl-toolbar">' +
          '<input class="scl-input" id="sclJobSearch" type="search" ' +
            'placeholder="Search roles" aria-label="Search roles">' +
          '<select class="scl-select" id="sclJobDepartment" ' +
            'aria-label="Filter roles by department">' +
            '<option value="">All departments</option>' +
          '</select>' +
          '<div class="scl-result-summary" id="sclJobSummary">' +
            'Loading roles…' +
          '</div>' +
        '</div>' +
        '<div class="scl-job-list" id="sclJobList" aria-live="polite">' +
          loadingState('Loading open roles') +
        '</div>' +
      '</div>' +
    '</section>' +

    '<section class="scl-section is-dark"><div class="scl-inner">' +
      sectionIntro(
        'Where the team is growing',
        'Several disciplines shape the Stratex roadmap.',
        'These are capability areas rather than promises of currently open roles.'
      ) +
      '<div class="scl-principles">' +
        principle('Customer Operations','Coach onboarding, scout support and service delivery.') +
        principle('Product and Data','Product operations, analytics and football intelligence.') +
        principle('Football Strategy','Football workflows, events and evidence standards.') +
        principle('Growth and Partnerships','Acquisition, partnerships and market visibility.') +
      '</div>' +
    '</div></section>' +

    cta(
      'Build the next part of Stratex with us.',
      'Review the current roles or learn more about the company and leadership team.',
      button('View Open Roles','#openRoles',true) +
      button('About Stratex',sitePath('about'),false)
    );
  }

  function careerDetailShell() {
    return '<section class="scl-detail">' +
      '<div class="scl-inner">' +
        '<a class="scl-back" href="' + esc(sitePath('careers')) + '">' +
          '← Back to Careers</a>' +
        '<div id="sclCareerDetail" aria-live="polite">' +
          loadingState('Loading role details') +
        '</div>' +
      '</div>' +
    '</section>';
  }

  function learningPage() {
    return hero(
      'learning',
      'ScoutLink Learning Centre',
      'Practical guidance for coaches, scouts and football families.',
      'Clear guides on player evidence, scouting workflows, compatibility, safeguarding and getting more value from ScoutLink.',
      button('Browse All Guides','#learningGuides',true) +
      button('Explore ScoutLink',sitePath('scoutlink'),false),
      'Published guides and engagement totals are loaded from the Stratex Learning Centre.'
    ) +
    '<section class="scl-section is-white" id="learningGuides">' +
      '<div class="scl-inner">' +
        sectionIntro(
          'Latest guidance',
          'Football intelligence explained clearly.',
          'Search the published guides by topic, audience or title.'
        ) +
        '<div class="scl-toolbar">' +
          '<input class="scl-input" id="sclPostSearch" type="search" ' +
            'placeholder="Search guides" aria-label="Search Learning Centre guides">' +
          '<select class="scl-select" id="sclPostCategory" ' +
            'aria-label="Filter guides by category">' +
            '<option value="">All categories</option>' +
          '</select>' +
          '<div class="scl-result-summary" id="sclPostSummary">' +
            'Loading guides…' +
          '</div>' +
        '</div>' +
        '<div id="sclLearningResults" aria-live="polite">' +
          loadingState('Loading Learning Centre guides') +
        '</div>' +
      '</div>' +
    '</section>' +

    '<section class="scl-section is-soft"><div class="scl-inner">' +
      sectionIntro(
        'What the Learning Centre covers',
        'Useful guidance for each part of the ScoutLink community.',
        'The goal is practical education, not promotional claims or automatic football answers.'
      ) +
      '<div class="scl-principles">' +
        principle('For coaches','Player profiles, Match Facts, fixtures and approved evidence.') +
        principle('For scouts','Compatibility, search, comparison and human judgement.') +
        principle('For families','Controlled visibility, adult-led interest and concern routes.') +
        principle('Product guides','Clear explanations of how ScoutLink workflows fit together.') +
      '</div>' +
    '</div></section>' +

    cta(
      'Put the guidance into context.',
      'Explore ScoutLink, understand Compatibility or read the Trust and Safeguarding pages.',
      button('Explore ScoutLink',sitePath('scoutlink'),true) +
      button('Compatibility Score',sitePath('scoutlink/compatibility-score'),false) +
      button('Trust and Safeguarding',sitePath('trust'),false)
    );
  }

  function articleDetailShell() {
    return '<section class="scl-article-detail">' +
      '<div class="scl-inner">' +
        '<a class="scl-back" href="' +
          esc(sitePath('learning-centre')) +
          '">← Back to Learning Centre</a>' +
        '<div id="sclArticleDetail" aria-live="polite">' +
          loadingState('Loading Learning Centre article') +
        '</div>' +
      '</div>' +
    '</section>';
  }

  function pageMarkup(route) {
    if (route.page === 'careers') return careersPage();
    if (route.page === 'career-detail') return careerDetailShell();
    if (route.page === 'learning') return learningPage();
    if (route.page === 'article-detail') return articleDetailShell();
    return '';
  }

  function cleanValue(value) {
    return String(value == null ? '' : value).trim();
  }

  function firstValue(object,names) {
    for (var index = 0; index < names.length; index += 1) {
      var value = object && object[names[index]];
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }
    return '';
  }

  function formatDate(value,includeYear) {
    if (!value) return '';

    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleDateString('en-GB',{
      day:'numeric',
      month:'short',
      year:includeYear === false ? undefined : 'numeric'
    });
  }

  function jobTitle(job) {
    return cleanValue(firstValue(job,['jobTitle','job_title'])) ||
      'Open role';
  }

  function jobDepartment(job) {
    return cleanValue(job.department) || 'Stratex Analytics';
  }

  function jobLocation(job) {
    return cleanValue(job.location) || 'Location confirmed in role';
  }

  function jobWorkingType(job) {
    return cleanValue(firstValue(job,['workingType','working_type'])) ||
      'Working pattern confirmed in role';
  }

  function jobEmployment(job) {
    return cleanValue(firstValue(job,[
      'employmentType',
      'employment_type',
      'contractType',
      'contract_type'
    ])) || 'Role details';
  }

  function money(number,currency) {
    if (number === '' || number === null || number === undefined) {
      return '';
    }

    var value = Number(number);
    if (!Number.isFinite(value)) return '';

    return new Intl.NumberFormat(
      'en-GB',
      {
        style:'currency',
        currency:cleanValue(currency) || 'GBP',
        maximumFractionDigits:0
      }
    ).format(value);
  }

  function salaryText(job) {
    var compensationType = cleanValue(firstValue(job,[
      'compensationType',
      'compensation_type'
    ])).toLowerCase();

    var unit = cleanValue(firstValue(job,[
      'salaryUnit',
      'salary_unit'
    ])).toLowerCase();

    if (
      compensationType === 'unpaid_internship' ||
      compensationType === 'unpaid internship'
    ) {
      return 'Unpaid internship';
    }

    if (
      compensationType === 'commission_based' ||
      compensationType === 'commission based' ||
      unit === 'commission'
    ) {
      return 'Commission';
    }

    var minimum = firstValue(job,['salaryMin','salary_min']);
    var maximum = firstValue(job,['salaryMax','salary_max']);
    var currency = firstValue(job,['currency']) || 'GBP';

    var minimumText = money(minimum,currency);
    var maximumText = money(maximum,currency);
    var range = '';

    if (minimumText && maximumText) {
      range = minimumText + '–' + maximumText;
    } else {
      range = minimumText || maximumText;
    }

    if (range && unit) {
      range += ' ' + unit.replace(/_/g,' ');
    }

    return range ||
      cleanValue(firstValue(job,[
        'compensationNotes',
        'compensation_notes'
      ])) ||
      'Compensation confirmed in role';
  }

  function roleOverview(job) {
    return cleanValue(firstValue(job,[
      'roleOverview',
      'role_overview'
    ])) ||
      'Review the full role description and application requirements.';
  }

  function roleHref(job) {
    return sitePath('careers') + '/' +
      encodeURIComponent(cleanValue(job.slug || job.id));
  }

  function jobCard(job) {
    var closing = firstValue(job,['closingAt','closing_at']);
    var closeText = closing
      ? 'Closes ' + formatDate(closing)
      : 'Applications reviewed while live';

    return '<article class="scl-job">' +
      '<div>' +
        '<div class="scl-job-head">' +
          '<span class="scl-pill">' + esc(jobDepartment(job)) + '</span>' +
          '<span class="scl-pill is-blue">' +
            esc(jobEmployment(job)) +
          '</span>' +
        '</div>' +
        '<h3>' + esc(jobTitle(job)) + '</h3>' +
        '<p>' + esc(roleOverview(job)) + '</p>' +
        '<div class="scl-job-meta">' +
          '<span>' + esc(jobLocation(job)) + '</span>' +
          '<span>' + esc(jobWorkingType(job)) + '</span>' +
          '<span>' + esc(salaryText(job)) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="scl-job-side">' +
        '<small>' + esc(closeText) + '</small>' +
        button('View Role',roleHref(job),true) +
      '</div>' +
    '</article>';
  }

  function filteredJobs() {
    var query = state.jobSearch.trim().toLowerCase();
    var department = state.jobDepartment.trim().toLowerCase();

    return state.jobs.filter(function (job) {
      var matchDepartment = !department ||
        jobDepartment(job).toLowerCase() === department;

      if (!matchDepartment) return false;
      if (!query) return true;

      var haystack = [
        jobTitle(job),
        jobDepartment(job),
        jobLocation(job),
        jobWorkingType(job),
        jobEmployment(job),
        roleOverview(job)
      ].join(' ').toLowerCase();

      return haystack.indexOf(query) >= 0;
    });
  }

  function renderJobDepartmentOptions() {
    var select = document.getElementById('sclJobDepartment');
    if (!select) return;

    var departments = Array.from(
      new Set(
        state.jobs.map(jobDepartment).filter(Boolean)
      )
    ).sort(function (a,b) {
      return a.localeCompare(b);
    });

    select.innerHTML =
      '<option value="">All departments</option>' +
      departments.map(function (department) {
        return '<option value="' + esc(department.toLowerCase()) + '">' +
          esc(department) +
        '</option>';
      }).join('');

    select.value = state.jobDepartment;
  }

  function renderJobs() {
    var root = document.getElementById('sclJobList');
    var summary = document.getElementById('sclJobSummary');
    if (!root) return;

    var jobs = filteredJobs();

    if (summary) {
      summary.textContent = jobs.length + ' role' +
        (jobs.length === 1 ? '' : 's') +
        (state.jobs.length !== jobs.length
          ? ' shown from ' + state.jobs.length
          : '');
    }

    if (!state.jobs.length) {
      root.innerHTML = emptyState(
        'No open roles right now',
        'Released opportunities will appear here when they are live in the Stratex hiring system.',
        button('Meet the Team',sitePath('leadership'),true)
      );
      return;
    }

    if (!jobs.length) {
      root.innerHTML = emptyState(
        'No matching roles',
        'Try a different title, department, location or working pattern.',
        '<button class="scl-button is-primary" type="button" ' +
          'id="sclClearJobFilters">Clear Filters</button>'
      );

      var clear = document.getElementById('sclClearJobFilters');
      if (clear) {
        clear.addEventListener('click',function () {
          state.jobSearch = '';
          state.jobDepartment = '';

          var search = document.getElementById('sclJobSearch');
          var department = document.getElementById('sclJobDepartment');

          if (search) search.value = '';
          if (department) department.value = '';

          renderJobs();
        });
      }

      return;
    }

    root.innerHTML = jobs.map(jobCard).join('');
  }

  async function loadJobs() {
    var root = document.getElementById('sclJobList');
    if (!root) return;

    try {
      var response = await fetch(
        API + '/api/careers',
        {credentials:'include'}
      );

      var json = await response.json().catch(function () {
        return {};
      });

      if (!response.ok) {
        throw new Error(json.error || 'Open roles could not load.');
      }

      state.jobs = Array.isArray(json.data)
        ? json.data
        : (Array.isArray(json.jobs) ? json.jobs : []);

      renderJobDepartmentOptions();
      renderJobs();
    } catch (error) {
      root.innerHTML = emptyState(
        'Roles could not load',
        error.message || 'Try refreshing the page.',
        '<button class="scl-button is-primary" type="button" ' +
          'id="sclRetryJobs">Retry</button>'
      );

      var retry = document.getElementById('sclRetryJobs');
      if (retry) retry.addEventListener('click',loadJobs);
    }
  }

  function bindCareerFilters() {
    var search = document.getElementById('sclJobSearch');
    var department = document.getElementById('sclJobDepartment');

    if (search) {
      search.addEventListener('input',function () {
        state.jobSearch = search.value;
        renderJobs();
      });
    }

    if (department) {
      department.addEventListener('change',function () {
        state.jobDepartment = department.value;
        renderJobs();
      });
    }
  }

  function splitListLines(value) {
    var text = cleanValue(value);
    if (!text) return [];

    var lines = text
      .split(/\r?\n/)
      .map(function (line) {
        return line.trim();
      })
      .filter(Boolean);

    if (lines.length === 1 && /;\s+/.test(lines[0])) {
      lines = lines[0].split(/;\s+/);
    }

    return lines.map(function (line) {
      return line.replace(/^[-*•]\s*/,'').trim();
    }).filter(Boolean);
  }

  function paragraphs(value) {
    var text = cleanValue(value);
    if (!text) return '';

    return text
      .split(/\n{2,}/)
      .map(function (paragraph) {
        return '<p>' +
          esc(paragraph.trim()).replace(/\n/g,'<br>') +
        '</p>';
      })
      .join('');
  }

  function richBlock(title,value,listPreferred) {
    var text = cleanValue(value);
    if (!text) return '';

    var body = '';

    if (listPreferred) {
      var items = splitListLines(text);

      if (items.length > 1) {
        body = '<ul>' +
          items.map(function (item) {
            return '<li>' + esc(item) + '</li>';
          }).join('') +
        '</ul>';
      } else {
        body = paragraphs(text);
      }
    } else {
      body = paragraphs(text);
    }

    return '<section class="scl-content-block">' +
      '<h2>' + esc(title) + '</h2>' +
      body +
    '</section>';
  }

  function infoItem(label,value) {
    return '<div class="scl-info">' +
      '<span>' + esc(label) + '</span>' +
      '<b>' + esc(value || 'TBC') + '</b>' +
    '</div>';
  }

  function populateUtmFields(form) {
    if (!form) return;

    var params = new URLSearchParams(window.location.search);

    [
      'source',
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_content',
      'utm_term'
    ].forEach(function (name) {
      var field = form.querySelector('[name="' + name + '"]');
      if (field) field.value = params.get(name) || '';
    });
  }

  function applicationForm(job) {
    var slug = cleanValue(job.slug || job.id);

    return '<aside class="scl-application" id="apply">' +
      '<span class="scl-kicker">Application</span>' +
      '<h2>Apply for this role</h2>' +
      '<p>Send your details and CV. Applications are stored in the existing restricted Stratex hiring workflow.</p>' +
      '<form id="sclCareerApplyForm" data-slug="' + esc(slug) + '">' +
        '<div class="scl-fields">' +
          '<label class="scl-field">' +
            '<span class="scl-label">First name</span>' +
            '<input class="scl-input" name="firstName" autocomplete="given-name" required>' +
          '</label>' +
          '<label class="scl-field">' +
            '<span class="scl-label">Last name</span>' +
            '<input class="scl-input" name="lastName" autocomplete="family-name" required>' +
          '</label>' +
          '<label class="scl-field is-full">' +
            '<span class="scl-label">Email</span>' +
            '<input class="scl-input" type="email" name="email" autocomplete="email" required>' +
          '</label>' +
          '<label class="scl-field is-full">' +
            '<span class="scl-label">Phone</span>' +
            '<input class="scl-input" type="tel" name="phone" autocomplete="tel" required>' +
          '</label>' +
          '<label class="scl-field is-full">' +
            '<span class="scl-label">CV upload</span>' +
            '<input class="scl-input" type="file" name="cv" ' +
              'accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required>' +
          '</label>' +
        '</div>' +
        '<p class="scl-help">PDF, DOC or DOCX only. Maximum 5MB.</p>' +
        '<input type="hidden" name="source" value="public_careers">' +
        '<input type="hidden" name="utm_source">' +
        '<input type="hidden" name="utm_medium">' +
        '<input type="hidden" name="utm_campaign">' +
        '<input type="hidden" name="utm_content">' +
        '<input type="hidden" name="utm_term">' +
        '<div class="scl-message" id="sclCareerApplyMessage" role="status"></div>' +
        '<div class="scl-form-actions">' +
          '<button class="scl-button is-primary" type="submit">Submit Application</button>' +
        '</div>' +
      '</form>' +
    '</aside>';
  }

  function renderCareerDetail(job) {
    var root = document.getElementById('sclCareerDetail');
    if (!root) return;

    var releaseAt = firstValue(job,['releaseAt','release_at']);
    var closingAt = firstValue(job,['closingAt','closing_at']);
    var positions = firstValue(job,[
      'positionsAvailable',
      'positions_available'
    ]);

    var heroMeta = [
      jobDepartment(job),
      jobLocation(job),
      jobWorkingType(job)
    ].filter(Boolean);

    root.innerHTML =
      '<div class="scl-detail-grid">' +
        '<article class="scl-detail-main">' +
          '<header class="scl-role-hero">' +
            '<span class="scl-visual-label">' +
              esc(jobDepartment(job)) +
            '</span>' +
            '<h1>' + esc(jobTitle(job)) + '</h1>' +
            '<p>' + esc(roleOverview(job)) + '</p>' +
            '<div class="scl-role-meta">' +
              heroMeta.map(function (item) {
                return '<span>' + esc(item) + '</span>';
              }).join('') +
            '</div>' +
            '<div class="scl-actions">' +
              '<a class="scl-button is-primary" href="#apply">' +
                'Apply for this Role</a>' +
              button('Back to Careers',sitePath('careers'),false) +
            '</div>' +
          '</header>' +
          '<div class="scl-info-grid">' +
            infoItem('Department',jobDepartment(job)) +
            infoItem('Location',jobLocation(job)) +
            infoItem('Working pattern',jobWorkingType(job)) +
            infoItem('Employment',jobEmployment(job)) +
            infoItem('Compensation',salaryText(job)) +
            infoItem(
              'Positions',
              positions
                ? String(positions)
                : 'Confirmed in role'
            ) +
            (releaseAt
              ? infoItem('Published',formatDate(releaseAt))
              : '') +
            (closingAt
              ? infoItem('Closing date',formatDate(closingAt))
              : '') +
          '</div>' +
          '<div class="scl-role-content">' +
            richBlock(
              'About Stratex Analytics',
              firstValue(job,['aboutCompany','about_company']),
              false
            ) +
            richBlock(
              'Role overview',
              firstValue(job,['roleOverview','role_overview']),
              false
            ) +
            richBlock(
              'What you will be doing',
              firstValue(job,[
                'responsibilities',
                'whatYouWillBeDoing',
                'what_you_will_be_doing'
              ]),
              true
            ) +
            richBlock(
              'What we are looking for',
              firstValue(job,['mustHaves','must_haves']),
              true
            ) +
            richBlock(
              'Nice to have',
              firstValue(job,['niceToHaves','nice_to_haves']),
              true
            ) +
            richBlock(
              'Benefits and development',
              firstValue(job,['benefits']),
              true
            ) +
            richBlock(
              'How the process works',
              firstValue(job,[
                'interviewProcess',
                'interview_process'
              ]),
              false
            ) +
            richBlock(
              'Application instructions',
              firstValue(job,[
                'applicationInstructions',
                'application_instructions'
              ]),
              false
            ) +
          '</div>' +
        '</article>' +
        applicationForm(job) +
      '</div>';

    populateUtmFields(document.getElementById('sclCareerApplyForm'));
    bindCareerApplication(job);
    bindImageErrors();
  }

  function setMessage(node,message,type) {
    if (!node) return;

    node.textContent = message || '';
    node.className = 'scl-message';

    if (!message) return;

    node.classList.add('is-visible');
    node.classList.add(
      type === 'success' ? 'is-success' : 'is-error'
    );
  }

  function validCv(file) {
    if (!file) {
      throw new Error('Please attach your CV.');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('CV file must be 5MB or smaller.');
    }

    if (!/\.(pdf|doc|docx)$/i.test(file.name || '')) {
      throw new Error('Please upload a PDF, DOC or DOCX CV.');
    }
  }

  function bindCareerApplication(job) {
    var form = document.getElementById('sclCareerApplyForm');
    if (!form) return;

    var started = false;

    form.addEventListener('focusin',function () {
      if (started) return;
      started = true;
      track('career_application_started',{
        jobSlug:cleanValue(job.slug || job.id),
        jobTitle:jobTitle(job)
      });
    });

    form.addEventListener('submit',async function (event) {
      event.preventDefault();

      var message = document.getElementById('sclCareerApplyMessage');
      var buttonNode = form.querySelector('button[type="submit"]');
      var fileInput = form.querySelector('[name="cv"]');
      var file = fileInput && fileInput.files
        ? fileInput.files[0]
        : null;

      setMessage(message,'','');

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      try {
        validCv(file);

        buttonNode.disabled = true;
        buttonNode.textContent = 'Submitting…';

        var response = await fetch(
          API + '/api/careers/' +
          encodeURIComponent(cleanValue(job.slug || job.id)) +
          '/apply',
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
            json.error || 'Application could not be submitted.'
          );
        }

        form.reset();
        populateUtmFields(form);

        var success = json.message ||
          'Application submitted successfully.';

        if (json.applicationId) {
          success += ' Your application reference is ' +
            json.applicationId + '.';
        }

        setMessage(message,success,'success');

        track('career_application_submitted',{
          jobSlug:cleanValue(job.slug || job.id),
          jobTitle:jobTitle(job)
        });
      } catch (error) {
        setMessage(
          message,
          error.message || 'Application could not be submitted.',
          'error'
        );
      } finally {
        buttonNode.disabled = false;
        buttonNode.textContent = 'Submit Application';
      }
    });
  }

  async function loadCareerDetail(slug) {
    var root = document.getElementById('sclCareerDetail');
    if (!root) return;

    try {
      var response = await fetch(
        API + '/api/careers/' + encodeURIComponent(slug),
        {credentials:'include'}
      );

      var json = await response.json().catch(function () {
        return {};
      });

      if (!response.ok) {
        throw new Error(json.error || 'Role not found.');
      }

      var job = json.data || json.job || {};
      renderCareerDetail(job);
      setCareerMeta(job,slug);
    } catch (error) {
      root.innerHTML = emptyState(
        'Role unavailable',
        error.message ||
          'This role may have closed, moved or not yet been released.',
        button('View Open Roles',sitePath('careers'),true)
      );
    }
  }

  function learningImage(post) {
    var text = [
      post && post.category,
      post && post.title,
      post && post.excerpt
    ].filter(Boolean).join(' ').toLowerCase();

    if (/coach/.test(text)) return LEARNING_IMAGES.coach;
    if (/scout|compatib/.test(text)) return LEARNING_IMAGES.scout;
    if (/family|parent|guardian/.test(text)) return LEARNING_IMAGES.family;
    if (/safeguard|trust|visibility|contact/.test(text)) {
      return LEARNING_IMAGES.safeguarding;
    }
    if (/fixture|match fact|video|product|platform/.test(text)) {
      return LEARNING_IMAGES.product;
    }
    if (/operation|evidence|decision/.test(text)) {
      return LEARNING_IMAGES.operations;
    }

    return LEARNING_IMAGES.default;
  }

  function learningImageAlt(post) {
    var category = cleanValue(post && post.category) ||
      'football intelligence';

    return category + ' Learning Centre guide image';
  }

  function postTitle(post) {
    return cleanValue(post && post.title) || 'Learning Centre guide';
  }

  function postExcerpt(post) {
    return cleanValue(post && post.excerpt) ||
      'Read this Stratex Analytics Learning Centre guide.';
  }

  function postCategory(post) {
    return cleanValue(post && post.category) || 'Learning';
  }

  function postHref(post) {
    return sitePath('learning-centre') + '/' +
      encodeURIComponent(cleanValue(post && (post.slug || post.id)));
  }

  function numberText(value) {
    return Number(value || 0).toLocaleString('en-GB');
  }

  function postDate(post) {
    return firstValue(post,[
      'published_at',
      'publishedAt',
      'updated_at',
      'updatedAt',
      'created_at',
      'createdAt'
    ]);
  }

  function postMeta(post) {
    var items = [
      formatDate(postDate(post)),
      numberText(post && post.view_count) + ' views',
      numberText(post && post.like_count) + ' likes'
    ].filter(Boolean);

    return '<div class="scl-post-meta">' +
      items.map(function (item) {
        return '<span>' + esc(item) + '</span>';
      }).join('') +
    '</div>';
  }

  function featuredPost(post) {
    return '<article class="scl-featured">' +
      '<div class="scl-featured-image">' +
        '<img data-scl-image src="' +
          esc(learningImage(post)) +
          '" alt="' + esc(learningImageAlt(post)) +
          '" loading="eager">' +
      '</div>' +
      '<div class="scl-featured-copy">' +
        '<span class="scl-pill">' + esc(postCategory(post)) + '</span>' +
        '<h3>' + esc(postTitle(post)) + '</h3>' +
        '<p>' + esc(postExcerpt(post)) + '</p>' +
        postMeta(post) +
        '<div class="scl-actions">' +
          button('Read Guide',postHref(post),true) +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function articleCard(post) {
    return '<article class="scl-article-card">' +
      '<div class="scl-article-image">' +
        '<img data-scl-image src="' +
          esc(learningImage(post)) +
          '" alt="' + esc(learningImageAlt(post)) +
          '" loading="lazy">' +
      '</div>' +
      '<div class="scl-article-copy">' +
        '<span class="scl-pill">' + esc(postCategory(post)) + '</span>' +
        '<h3>' + esc(postTitle(post)) + '</h3>' +
        '<p>' + esc(postExcerpt(post)) + '</p>' +
        postMeta(post) +
        '<div class="scl-actions">' +
          button('Read Guide',postHref(post),true) +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function filteredPosts() {
    var query = state.postSearch.trim().toLowerCase();
    var category = state.postCategory.trim().toLowerCase();

    return state.posts.filter(function (post) {
      var matchCategory = !category ||
        postCategory(post).toLowerCase() === category;

      if (!matchCategory) return false;
      if (!query) return true;

      var haystack = [
        postTitle(post),
        postExcerpt(post),
        postCategory(post)
      ].join(' ').toLowerCase();

      return haystack.indexOf(query) >= 0;
    });
  }

  function renderPostCategoryOptions() {
    var select = document.getElementById('sclPostCategory');
    if (!select) return;

    var categories = Array.from(
      new Set(
        state.posts.map(postCategory).filter(Boolean)
      )
    ).sort(function (a,b) {
      return a.localeCompare(b);
    });

    select.innerHTML =
      '<option value="">All categories</option>' +
      categories.map(function (category) {
        return '<option value="' + esc(category.toLowerCase()) + '">' +
          esc(category) +
        '</option>';
      }).join('');

    select.value = state.postCategory;
  }

  function renderPosts() {
    var root = document.getElementById('sclLearningResults');
    var summary = document.getElementById('sclPostSummary');
    if (!root) return;

    var posts = filteredPosts();

    if (summary) {
      summary.textContent = posts.length + ' guide' +
        (posts.length === 1 ? '' : 's') +
        (state.posts.length !== posts.length
          ? ' shown from ' + state.posts.length
          : '');
    }

    if (!state.posts.length) {
      root.innerHTML = emptyState(
        'Learning Centre guides are coming soon',
        'Published posts from the Stratex content system will appear here.',
        button('Explore ScoutLink',sitePath('scoutlink'),true)
      );
      return;
    }

    if (!posts.length) {
      root.innerHTML = emptyState(
        'No matching guides',
        'Try a different title, audience or category.',
        '<button class="scl-button is-primary" type="button" ' +
          'id="sclClearPostFilters">Clear Filters</button>'
      );

      var clear = document.getElementById('sclClearPostFilters');
      if (clear) {
        clear.addEventListener('click',function () {
          state.postSearch = '';
          state.postCategory = '';

          var search = document.getElementById('sclPostSearch');
          var category = document.getElementById('sclPostCategory');

          if (search) search.value = '';
          if (category) category.value = '';

          renderPosts();
        });
      }

      return;
    }

    root.innerHTML =
      featuredPost(posts[0]) +
      (posts.length > 1
        ? '<div class="scl-article-grid">' +
          posts.slice(1).map(articleCard).join('') +
          '</div>'
        : '');

    bindImageErrors();
  }

  async function fetchPosts() {
    var response = await fetch(
      API + '/api/stratex-website/blog?published=true',
      {credentials:'include'}
    );

    var json = await response.json().catch(function () {
      return {};
    });

    if (!response.ok) {
      throw new Error(json.error || 'Guides could not load.');
    }

    return Array.isArray(json.data) ? json.data : [];
  }

  async function loadPosts() {
    var root = document.getElementById('sclLearningResults');
    if (!root) return;

    try {
      state.posts = await fetchPosts();
      renderPostCategoryOptions();
      renderPosts();
    } catch (error) {
      root.innerHTML = emptyState(
        'Guides could not load',
        error.message || 'Try refreshing the page.',
        '<button class="scl-button is-primary" type="button" ' +
          'id="sclRetryPosts">Retry</button>'
      );

      var retry = document.getElementById('sclRetryPosts');
      if (retry) retry.addEventListener('click',loadPosts);
    }
  }

  function bindLearningFilters() {
    var search = document.getElementById('sclPostSearch');
    var category = document.getElementById('sclPostCategory');

    if (search) {
      search.addEventListener('input',function () {
        state.postSearch = search.value;
        renderPosts();
      });
    }

    if (category) {
      category.addEventListener('change',function () {
        state.postCategory = category.value;
        renderPosts();
      });
    }
  }

  function readingTime(value) {
    var count = cleanValue(value)
      .replace(/[#>*_\-\[\]\(\)]/g,' ')
      .split(/\s+/)
      .filter(Boolean)
      .length;

    return Math.max(1,Math.ceil(count / 220));
  }

  function flushParagraph(buffer,output) {
    if (!buffer.length) return;

    output.push(
      '<p>' +
      esc(buffer.join(' ').trim()) +
      '</p>'
    );

    buffer.length = 0;
  }

  function flushList(listType,listItems,output) {
    if (!listItems.length) return;

    output.push(
      '<' + listType + '>' +
      listItems.map(function (item) {
        return '<li>' + esc(item) + '</li>';
      }).join('') +
      '</' + listType + '>'
    );

    listItems.length = 0;
  }

  function formatArticleBody(value) {
    var text = cleanValue(value);
    if (!text) {
      return '<p>This guide does not contain published body content yet.</p>';
    }

    var lines = text.replace(/\r/g,'').split('\n');
    var output = [];
    var paragraphBuffer = [];
    var listItems = [];
    var listType = 'ul';

    function closeLists() {
      flushList(listType,listItems,output);
    }

    lines.forEach(function (rawLine) {
      var line = rawLine.trim();

      if (!line) {
        flushParagraph(paragraphBuffer,output);
        closeLists();
        return;
      }

      var heading = line.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        flushParagraph(paragraphBuffer,output);
        closeLists();

        var level = heading[1].length === 1 ? 2 : 3;
        output.push(
          '<h' + level + '>' + esc(heading[2]) +
          '</h' + level + '>'
        );
        return;
      }

      var bullet = line.match(/^[-*•]\s+(.+)$/);
      if (bullet) {
        flushParagraph(paragraphBuffer,output);

        if (listItems.length && listType !== 'ul') {
          closeLists();
        }

        listType = 'ul';
        listItems.push(bullet[1]);
        return;
      }

      var numbered = line.match(/^\d+[.)]\s+(.+)$/);
      if (numbered) {
        flushParagraph(paragraphBuffer,output);

        if (listItems.length && listType !== 'ol') {
          closeLists();
        }

        listType = 'ol';
        listItems.push(numbered[1]);
        return;
      }

      var quote = line.match(/^>\s*(.+)$/);
      if (quote) {
        flushParagraph(paragraphBuffer,output);
        closeLists();
        output.push('<blockquote>' + esc(quote[1]) + '</blockquote>');
        return;
      }

      closeLists();
      paragraphBuffer.push(line);
    });

    flushParagraph(paragraphBuffer,output);
    closeLists();

    return output.join('');
  }

  function articleHead(post,slug) {
    var published = formatDate(postDate(post));
    var minutes = readingTime(post.body);
    var meta = [
      published,
      minutes + ' minute read',
      numberText(post.view_count) + ' views',
      numberText(post.like_count) + ' likes'
    ].filter(Boolean);

    return '<div class="scl-article-hero-image">' +
        '<img data-scl-image src="' +
          esc(learningImage(post)) +
          '" alt="' + esc(learningImageAlt(post)) + '">' +
      '</div>' +
      '<header class="scl-article-head">' +
        '<span class="scl-pill">' + esc(postCategory(post)) + '</span>' +
        '<h1>' + esc(postTitle(post)) + '</h1>' +
        '<p>' + esc(postExcerpt(post)) + '</p>' +
        '<div class="scl-post-meta">' +
          meta.map(function (item) {
            return '<span>' + esc(item) + '</span>';
          }).join('') +
        '</div>' +
        '<div class="scl-article-actions">' +
          '<button class="scl-button is-primary is-small" type="button" ' +
            'id="sclLikeArticle" data-slug="' + esc(slug) + '">' +
            'Like · <span id="sclLikeCount">' +
              esc(numberText(post.like_count)) +
            '</span></button>' +
          '<button class="scl-button is-small" type="button" ' +
            'id="sclShareArticle">Share</button>' +
          button('Explore ScoutLink',sitePath('scoutlink'),false) +
          '<span class="scl-share-status" id="sclShareStatus" ' +
            'role="status"></span>' +
        '</div>' +
      '</header>';
  }

  function relatedPosts(posts,current) {
    var related = posts
      .filter(function (post) {
        return String(post.slug || post.id) !==
          String(current.slug || current.id);
      })
      .sort(function (a,b) {
        var aSame = postCategory(a) === postCategory(current) ? 1 : 0;
        var bSame = postCategory(b) === postCategory(current) ? 1 : 0;
        return bSame - aSame;
      })
      .slice(0,3);

    if (!related.length) return '';

    return '<section class="scl-section is-soft scl-related">' +
      '<div class="scl-inner">' +
        sectionIntro(
          'More Learning Centre guides',
          'Continue reading.',
          'Explore another guide from the published Stratex Learning Centre.'
        ) +
        '<div class="scl-article-grid">' +
          related.map(articleCard).join('') +
        '</div>' +
      '</div>' +
    '</section>';
  }

  function renderArticle(post,slug,allPosts) {
    var root = document.getElementById('sclArticleDetail');
    if (!root) return;

    root.innerHTML =
      '<article class="scl-article-shell">' +
        articleHead(post,slug) +
        '<div class="scl-article-body">' +
          formatArticleBody(post.body) +
        '</div>' +
      '</article>' +
      relatedPosts(allPosts || [],post);

    bindArticleActions(post,slug);
    bindImageErrors();
  }

  async function loadArticle(slug) {
    var root = document.getElementById('sclArticleDetail');
    if (!root) return;

    try {
      var requests = await Promise.all([
        fetch(
          API + '/api/stratex-website/blog/' +
          encodeURIComponent(slug),
          {credentials:'include'}
        ),
        fetchPosts().catch(function () {
          return [];
        })
      ]);

      var response = requests[0];
      var allPosts = requests[1];
      var json = await response.json().catch(function () {
        return {};
      });

      if (!response.ok) {
        throw new Error(json.error || 'Article not found.');
      }

      var post = json.data || {};
      renderArticle(post,slug,allPosts);
      setArticleMeta(post,slug);
    } catch (error) {
      root.innerHTML = emptyState(
        'Article unavailable',
        error.message ||
          'This guide may have moved or is no longer published.',
        button(
          'View Learning Centre',
          sitePath('learning-centre'),
          true
        )
      );
    }
  }

  function bindArticleActions(post,slug) {
    var like = document.getElementById('sclLikeArticle');
    var share = document.getElementById('sclShareArticle');
    var status = document.getElementById('sclShareStatus');

    if (like) {
      like.addEventListener('click',async function () {
        if (like.disabled) return;

        like.disabled = true;
        var original = like.innerHTML;
        like.textContent = 'Saving…';

        try {
          var response = await fetch(
            API + '/api/stratex-website/blog/' +
            encodeURIComponent(slug) +
            '/like',
            {
              method:'POST',
              credentials:'include'
            }
          );

          var json = await response.json().catch(function () {
            return {};
          });

          if (!response.ok) {
            throw new Error(json.error || 'Like could not be saved.');
          }

          like.innerHTML =
            'Liked · <span id="sclLikeCount">' +
            esc(numberText(json.likeCount)) +
            '</span>';

          track('stratex_learning_post_liked',{
            slug:slug,
            category:postCategory(post)
          });
        } catch (error) {
          like.disabled = false;
          like.innerHTML = original;

          if (status) {
            status.textContent =
              error.message || 'Like could not be saved.';
          }
        }
      });
    }

    if (share) {
      share.addEventListener('click',async function () {
        var url = canonicalPath('learning-centre/' + slug);

        try {
          if (navigator.share) {
            await navigator.share({
              title:postTitle(post),
              text:postExcerpt(post),
              url:url
            });

            if (status) status.textContent = 'Share options opened.';
          } else if (navigator.clipboard) {
            await navigator.clipboard.writeText(url);
            if (status) status.textContent = 'Article link copied.';
          } else {
            throw new Error('Copying is not available in this browser.');
          }

          track('stratex_learning_post_shared',{
            slug:slug,
            category:postCategory(post)
          });
        } catch (error) {
          if (
            error &&
            error.name === 'AbortError'
          ) {
            return;
          }

          if (status) {
            status.textContent =
              error.message || 'The article could not be shared.';
          }
        }
      });
    }
  }

  function bindImageErrors() {
    document.querySelectorAll('[data-scl-image]').forEach(
      function (image) {
        if (image.dataset.sclBound === '1') return;
        image.dataset.sclBound = '1';

        image.addEventListener('error',function () {
          if (image.src !== LEARNING_IMAGES.default) {
            image.src = LEARNING_IMAGES.default;
          } else {
            image.hidden = true;
          }
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
    if (!nav) return;

    var existing = nav.querySelector(
      '[data-site-link="learning-centre"]'
    );

    if (existing) {
      existing.setAttribute(
        'href',
        sitePath('learning-centre')
      );
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

  function markNavigation(route) {
    document.querySelectorAll(
      '#stxNav [aria-current="page"]'
    ).forEach(function (link) {
      link.removeAttribute('aria-current');
    });

    var slug = route.page.indexOf('career') === 0
      ? 'careers'
      : 'learning-centre';

    var active = document.querySelector(
      '#stxNav [data-site-link="' + slug + '"]'
    );

    if (active) active.setAttribute('aria-current','page');
  }

  function addFooterBottom() {
    var footer = document.getElementById('stratexFooter');
    if (!footer) return;

    var old = footer.querySelector('.scl-footer-bottom');
    if (old) old.remove();

    footer.insertAdjacentHTML(
      'beforeend',
      '<div class="scl-footer-bottom">' +
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

  function setJsonLd(graph) {
    var node = document.getElementById('stratexJsonLd');
    if (!node) return;

    node.textContent = JSON.stringify({
      '@context':'https://schema.org',
      '@graph':graph
    });
  }

  function organisationSchema() {
    return {
      '@type':'Organization',
      '@id':STRATEX_BASE + '/#organization',
      name:'Stratex Analytics',
      url:STRATEX_BASE + '/',
      image:STRATEX_BASE + '/images/og/stratex-og.png',
      sameAs:['https://www.scoutlink.app'],
      description:'Stratex Analytics builds football intelligence products for overlooked grassroots talent.'
    };
  }

  function webPageSchema(meta) {
    var canonical = STRATEX_BASE + meta.canonical;

    return {
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
    };
  }

  function setListPageMeta(key) {
    var meta = PAGE_META[key];
    setMeta(meta);

    setJsonLd([
      organisationSchema(),
      webPageSchema(meta),
      {
        '@type':'CollectionPage',
        '@id':STRATEX_BASE + meta.canonical + '#collection',
        name:meta.title,
        description:meta.description,
        url:STRATEX_BASE + meta.canonical
      }
    ]);
  }

  function employmentTypeSchema(job) {
    var value = jobEmployment(job).toLowerCase();

    if (/intern/.test(value)) return 'INTERN';
    if (/part/.test(value)) return 'PART_TIME';
    if (/contract|fixed/.test(value)) return 'CONTRACTOR';
    if (/temporary/.test(value)) return 'TEMPORARY';
    if (/volunteer/.test(value)) return 'VOLUNTEER';

    return 'FULL_TIME';
  }

  function baseSalarySchema(job) {
    var minimumRaw = firstValue(job,['salaryMin','salary_min']);
    var maximumRaw = firstValue(job,['salaryMax','salary_max']);
    var minimum = minimumRaw === '' ? NaN : Number(minimumRaw);
    var maximum = maximumRaw === '' ? NaN : Number(maximumRaw);

    if (!Number.isFinite(minimum) && !Number.isFinite(maximum)) {
      return undefined;
    }

    var unitRaw = cleanValue(firstValue(job,[
      'salaryUnit',
      'salary_unit'
    ])).toLowerCase();

    var unit = /hour/.test(unitRaw)
      ? 'HOUR'
      : /week/.test(unitRaw)
        ? 'WEEK'
        : /month/.test(unitRaw)
          ? 'MONTH'
          : 'YEAR';

    return {
      '@type':'MonetaryAmount',
      currency:cleanValue(job.currency) || 'GBP',
      value:{
        '@type':'QuantitativeValue',
        minValue:Number.isFinite(minimum) ? minimum : undefined,
        maxValue:Number.isFinite(maximum) ? maximum : undefined,
        unitText:unit
      }
    };
  }

  function setCareerMeta(job,slug) {
    var title = jobTitle(job) + ' | Careers at Stratex Analytics';
    var description = roleOverview(job);
    var canonical = '/careers/' + encodeURIComponent(slug);

    var meta = {
      title:title,
      description:description,
      canonical:canonical
    };

    setMeta(meta);

    var locationText = [
      jobLocation(job),
      jobWorkingType(job)
    ].join(' ').toLowerCase();

    var jobSchema = {
      '@type':'JobPosting',
      title:jobTitle(job),
      description:description,
      datePosted:firstValue(job,['releaseAt','release_at']) || undefined,
      validThrough:firstValue(job,['closingAt','closing_at']) || undefined,
      employmentType:employmentTypeSchema(job),
      directApply:true,
      url:STRATEX_BASE + canonical,
      hiringOrganization:{
        '@type':'Organization',
        '@id':STRATEX_BASE + '/#organization',
        name:'Stratex Analytics',
        sameAs:STRATEX_BASE
      },
      baseSalary:baseSalarySchema(job)
    };

    if (/remote/.test(locationText)) {
      jobSchema.jobLocationType = 'TELECOMMUTE';
      jobSchema.applicantLocationRequirements = {
        '@type':'Country',
        name:/united kingdom|uk/.test(locationText)
          ? 'United Kingdom'
          : jobLocation(job)
      };
    } else {
      jobSchema.jobLocation = {
        '@type':'Place',
        address:{
          '@type':'PostalAddress',
          addressLocality:jobLocation(job),
          addressCountry:'GB'
        }
      };
    }

    setJsonLd([
      organisationSchema(),
      webPageSchema(meta),
      jobSchema
    ]);
  }

  function setArticleMeta(post,slug) {
    var title = postTitle(post) + ' | ScoutLink Learning Centre';
    var description = postExcerpt(post);
    var canonical = '/learning-centre/' + encodeURIComponent(slug);
    var meta = {
      title:title,
      description:description,
      canonical:canonical
    };

    setMeta(meta);

    setJsonLd([
      organisationSchema(),
      webPageSchema(meta),
      {
        '@type':'Article',
        headline:postTitle(post),
        description:postExcerpt(post),
        image:[learningImage(post)],
        datePublished:firstValue(post,[
          'published_at',
          'publishedAt',
          'created_at',
          'createdAt'
        ]) || undefined,
        dateModified:firstValue(post,[
          'updated_at',
          'updatedAt',
          'published_at',
          'publishedAt'
        ]) || undefined,
        mainEntityOfPage:{
          '@id':STRATEX_BASE + canonical + '#webpage'
        },
        author:{
          '@type':'Organization',
          '@id':STRATEX_BASE + '/#organization',
          name:'Stratex Analytics'
        },
        publisher:{
          '@id':STRATEX_BASE + '/#organization'
        }
      }
    ]);
  }

  function bindOutboundTracking() {
    document.querySelectorAll('[data-scl-outbound]').forEach(
      function (link) {
        link.addEventListener('click',function () {
          track('stratex_public_outbound_clicked',{
            action:link.getAttribute('data-scl-outbound') || '',
            page:state.route ? state.route.page : ''
          });
        });
      }
    );
  }

  function render() {
    var route = currentRoute();
    if (!route) return;

    var app = document.getElementById('stratexSiteApp');
    if (!app) return;

    state.route = route;

    document.body.classList.add('stratex-careers-learning-v3');
    document.body.setAttribute('data-stx-page',route.page);

    app.innerHTML =
      '<div class="scl-main">' + pageMarkup(route) + '</div>';

    rewriteSharedLinks();
    addLearningNavigation();
    rewriteSharedLinks();
    markNavigation(route);
    addFooterBottom();
    bindOutboundTracking();
    bindImageErrors();

    if (route.page === 'careers') {
      setListPageMeta('careers');
      bindCareerFilters();
      loadJobs();
    }

    if (route.page === 'career-detail') {
      loadCareerDetail(route.slug);
    }

    if (route.page === 'learning') {
      setListPageMeta('learning');
      bindLearningFilters();
      loadPosts();
    }

    if (route.page === 'article-detail') {
      loadArticle(route.slug);
    }
  }

  document.addEventListener('DOMContentLoaded',render);
})();
