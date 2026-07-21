'use strict';

(function () {
  var LAST_KEY = 'sl_last_experience_v3';
  var busy = false;

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return {
        '&':'&amp;',
        '<':'&lt;',
        '>':'&gt;',
        '"':'&quot;',
        "'":'&#39;'
      }[char];
    });
  }

  function visibleExperiences(list) {
    return (list || []).filter(function (experience) {
      return experience && experience.accountType !== 'Player';
    });
  }

  function roleLabel(experience) {
    if (!experience) return 'Workspace';
    if (experience.admin || experience.accountType === 'Stratex') return 'Stratex Admin';
    if (experience.accountType === 'Coach') return experience.demo ? 'Coach demo' : 'Coach workspace';
    if (experience.accountType === 'Scout') return experience.demo ? 'Scout demo' : 'Scout workspace';
    return experience.label || experience.accountType || 'Workspace';
  }

  function cardTitle(experience) {
    if (experience.admin || experience.accountType === 'Stratex') return 'Stratex Admin';
    if (experience.accountType === 'Coach') return 'Coach workspace';
    if (experience.accountType === 'Scout') return 'Scout workspace';
    return experience.label || experience.accountType || 'ScoutLink workspace';
  }

  function cardDescription(experience) {
    if (experience.admin || experience.accountType === 'Stratex') {
      return 'Manage registrations, users, organisations, showcases, product access and platform operations.';
    }
    if (experience.accountType === 'Coach' && experience.demo) {
      return 'Walk through squad management, player creation, fixtures, Match Facts, evidence and scout communication.';
    }
    if (experience.accountType === 'Coach') {
      return 'Manage squad profiles, player creation, fixtures, Match Facts, evidence and scout communication.';
    }
    if (experience.accountType === 'Scout' && experience.demo) {
      return 'Explore player search, comparison, compatibility, shortlists, pipelines and coach communication.';
    }
    if (experience.accountType === 'Scout') {
      return 'Search reviewed players, compare compatibility, manage shortlists, pipelines and coach communication.';
    }
    return experience.description || 'Open this approved ScoutLink workspace.';
  }

  function badgeLabel(experience) {
    if (experience.admin || experience.accountType === 'Stratex') return 'Admin view';
    if (experience.demo && experience.accountType === 'Coach') return 'Fictional coach demo';
    if (experience.demo && experience.accountType === 'Scout') return 'Fictional scout demo';
    return experience.current ? 'Current role' : 'Linked role';
  }

  function buttonLabel(experience, prefix) {
    var start = prefix || 'Enter';
    if (experience.admin || experience.accountType === 'Stratex') return start + ' Stratex Admin';
    if (experience.demo && experience.accountType === 'Coach') return start + ' Coach Demo';
    if (experience.demo && experience.accountType === 'Scout') return start + ' Scout Demo';
    if (experience.accountType === 'Coach') return start + ' Coach Workspace';
    if (experience.accountType === 'Scout') return start + ' Scout Workspace';
    return start + ' Workspace';
  }

  function iconText(experience) {
    if (experience.admin || experience.accountType === 'Stratex') return 'ST';
    if (experience.accountType === 'Coach') return 'CO';
    if (experience.accountType === 'Scout') return 'SC';
    return 'SL';
  }

  function iconClass(experience) {
    if (experience.admin || experience.accountType === 'Stratex') return 'is-dark';
    if (experience.accountType === 'Scout') return 'is-blue';
    return '';
  }

  function pillClass(experience) {
    if (experience.admin || experience.accountType === 'Stratex') return 'is-green';
    if (experience.demo || experience.accountType === 'Scout') return 'is-blue';
    return 'is-white';
  }

  function actionClass(experience) {
    return experience.admin || experience.accountType === 'Stratex'
      ? 'is-dark'
      : 'is-primary';
  }

  function userName(user) {
    if (!user) return 'ScoutLink user';
    return user.label ||
      [user.firstName,user.lastName].filter(Boolean).join(' ') ||
      user.email ||
      'ScoutLink user';
  }

  function userSubtitle(user, fallback) {
    if (!user) return fallback || 'Approved access';
    return user.teamName || user.email || fallback || 'Approved access';
  }

  function realAccountUser(experience) {
    var user = window.Auth && window.Auth.user || {};
    return {
      id:user.id || experience.userId || experience.accountType,
      firstName:user.firstName || '',
      lastName:user.lastName || '',
      email:user.email || '',
      teamName:user.teamName || '',
      label:[user.firstName,user.lastName].filter(Boolean).join(' ') || user.email || experience.accountType
    };
  }

  function storedPreference() {
    try {
      var raw = localStorage.getItem(LAST_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function matchesPreference(experience, preference) {
    if (!experience || !preference) return false;
    return String(experience.accountType) === String(preference.accountType) &&
      !!experience.demo === !!preference.demo;
  }

  function findContinueIndex(list) {
    var preference = storedPreference();
    var storedIndex = list.findIndex(function (experience) {
      return matchesPreference(experience,preference);
    });

    if (storedIndex >= 0) {
      var storedExperience = list[storedIndex];
      if (storedExperience.demo && preference.demoUserId) {
        var hasUser = (storedExperience.demoUsers || []).some(function (user) {
          return String(user.id) === String(preference.demoUserId);
        });
        if (hasUser) selectedDemoUsers[storedIndex] = preference.demoUserId;
      }
      return storedIndex;
    }

    var currentIndex = list.findIndex(function (experience) {
      return experience.current && !experience.demo;
    });
    if (currentIndex >= 0) return currentIndex;

    if (window.Auth && Auth.type === 'Stratex') {
      var coachDemoIndex = list.findIndex(function (experience) {
        return experience.demo && experience.accountType === 'Coach';
      });
      if (coachDemoIndex >= 0) return coachDemoIndex;
    }

    return list.length ? 0 : -1;
  }

  function selectedUserFor(experience,index) {
    if (!experience) return null;

    if (experience.demo) {
      var options = experience.demoUsers || [];
      if (!selectedDemoUsers[index] && options.length) {
        selectedDemoUsers[index] = options[0].id;
      }
      return options.find(function (user) {
        return String(user.id) === String(selectedDemoUsers[index]);
      }) || options[0] || null;
    }

    if (experience.admin || experience.accountType === 'Stratex') {
      return {
        id:'stratex-operations',
        label:'Stratex operations',
        teamName:'Internal administration'
      };
    }

    return realAccountUser(experience);
  }

  function summaryMarkup(list) {
    var demoCount = list.filter(function (experience) {
      return !!experience.demo;
    }).length;
    var internalCount = list.filter(function (experience) {
      return experience.admin || experience.accountType === 'Stratex';
    }).length;

    return '<div class="es3-access-summary">' +
      '<article><b>' + list.length + ' workspace' + (list.length === 1 ? '' : 's') +
      '</b><span>Available to this account</span></article>' +
      '<article><b>' + demoCount + ' fictional demo' + (demoCount === 1 ? '' : 's') +
      '</b><span>No production changes</span></article>' +
      '<article><b>' + internalCount + ' internal workspace' +
      (internalCount === 1 ? '' : 's') +
      '</b><span>Permission controlled</span></article>' +
    '</div>';
  }

  function continueMarkup(list) {
    var index = findContinueIndex(list);
    if (index < 0) {
      return '<aside class="es3-continue"><h2>No workspace available</h2>' +
        '<p>This account does not currently have an approved workspace.</p>' +
        '<div class="es3-status" id="selectorMsg" aria-live="polite">Contact Stratex support if you expected access.</div></aside>';
    }

    var experience = list[index];
    var user = selectedUserFor(experience,index);
    var label = roleLabel(experience);
    var display = experience.demo && user
      ? label + ' · ' + userName(user)
      : label;

    return '<aside class="es3-continue">' +
      '<h2>Continue where you left off</h2>' +
      '<p>Your most recent approved workspace is ready to open.</p>' +
      '<div class="es3-continue-option">' +
        '<div class="es3-icon ' + iconClass(experience) + '" aria-hidden="true">' +
        esc(iconText(experience)) + '</div>' +
        '<div class="es3-continue-copy"><b>' + esc(display) + '</b><span>' +
        esc(userSubtitle(user,experience.description || 'Approved ScoutLink access')) +
        '</span></div>' +
      '</div>' +
      '<button class="es3-btn is-primary is-block" type="button" data-es3-enter="' +
      index + '">' + esc(buttonLabel(experience,'Continue')) + '</button>' +
      '<div class="es3-status" id="selectorMsg" aria-live="polite">' +
      'Demo sessions use isolated fictional records and do not affect live customer data.' +
      '</div>' +
    '</aside>';
  }

  function personRows(experience,index) {
    if (experience.demo) {
      var users = experience.demoUsers || [];
      if (!users.length) {
        return '<div class="es3-person-list"><div class="es3-person is-active">' +
          '<div class="es3-person-copy"><b>Default demo account</b><span>Isolated fictional data</span></div>' +
          '<span class="es3-check">✓</span></div></div>';
      }

      return '<div class="es3-person-list" aria-label="Choose demo user">' +
        users.map(function (user) {
          var active = String(selectedDemoUsers[index]) === String(user.id);
          return '<button class="es3-person' + (active ? ' is-active' : '') +
            '" type="button" aria-pressed="' + (active ? 'true' : 'false') +
            '" data-es3-demo-card="' + index + '" data-es3-demo-user="' +
            esc(user.id) + '">' +
              '<span class="es3-person-copy"><b>' + esc(userName(user)) +
              '</b><span>' + esc(userSubtitle(user,'Demo account')) + '</span></span>' +
              '<span class="es3-check" aria-hidden="true">' + (active ? '✓' : '') + '</span>' +
            '</button>';
        }).join('') +
      '</div>';
    }

    var user = selectedUserFor(experience,index);
    return '<div class="es3-person-list"><div class="es3-person is-active">' +
      '<div class="es3-person-copy"><b>' + esc(userName(user)) + '</b><span>' +
      esc(userSubtitle(user,experience.current ? 'Current signed-in role' : 'Approved linked role')) +
      '</span></div><span class="es3-check" aria-hidden="true">✓</span></div></div>';
  }

  function cardMarkup(experience,index) {
    var featured = experience.admin || experience.accountType === 'Stratex';

    return '<article class="es3-card' + (featured ? ' is-featured' : '') + '">' +
      '<div class="es3-card-top">' +
        '<div class="es3-card-icon ' + iconClass(experience) + '" aria-hidden="true">' +
        esc(iconText(experience)) + '</div>' +
        '<span class="es3-pill ' + pillClass(experience) + '">' +
        esc(badgeLabel(experience)) + '</span>' +
      '</div>' +
      '<h2>' + esc(cardTitle(experience)) + '</h2>' +
      '<p>' + esc(cardDescription(experience)) + '</p>' +
      personRows(experience,index) +
      '<button class="es3-btn ' + actionClass(experience) +
      ' is-block" type="button" data-es3-enter="' + index + '">' +
      esc(buttonLabel(experience,'Enter')) + '</button>' +
    '</article>';
  }

  function notesMarkup() {
    return '<section class="es3-notes">' +
      '<article class="es3-note"><h3>Coach workspace</h3>' +
      '<p>Player profiles, fixtures, Match Facts, video evidence and controlled scout interest.</p></article>' +
      '<article class="es3-note"><h3>Scout workspace</h3>' +
      '<p>Reviewed player search, compatibility, comparison and recruitment-pipeline workflows.</p></article>' +
      '<article class="es3-note"><h3>Safe demo separation</h3>' +
      '<p>All demo sessions use isolated fictional data and do not affect production records.</p></article>' +
    '</section>';
  }

  function buildShell() {
    document.body.classList.add('experience-selector-v3');
    document.title = 'Choose Your ScoutLink Workspace | Coach, Scout and Internal Access';

    var description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute(
        'content',
        'Choose an approved ScoutLink coach, scout or Stratex internal workspace, including isolated fictional demo experiences.'
      );
    }

    var main = document.getElementById('main');
    if (!main || main.dataset.es3Built === '1') return;
    main.dataset.es3Built = '1';
    main.className = 'es3-main';
    main.innerHTML =
      '<section class="es3-hero">' +
        '<div class="es3-copy">' +
          '<span class="es3-pill is-dark">Product access</span>' +
          '<h1>Choose the workspace you need today.</h1>' +
          '<p>Your approved workspaces are grouped by purpose so it is clear when you are entering ScoutLink operations, a live role or an isolated fictional demo. Player Demo has been removed.</p>' +
          '<div id="es3Summary">' +
            '<div class="es3-access-summary">' +
              '<article><b>Loading</b><span>Checking approved access</span></article>' +
              '<article><b>Secure</b><span>Permission controlled</span></article>' +
              '<article><b>Separated</b><span>Demo records stay isolated</span></article>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<aside class="es3-continue" id="es3Continue">' +
          '<h2>Loading workspaces</h2>' +
          '<p>Checking the approved access connected to this account.</p>' +
          '<div class="es3-continue-option">' +
            '<div class="es3-icon" aria-hidden="true">SL</div>' +
            '<div class="es3-continue-copy"><b>ScoutLink access</b><span>Please wait</span></div>' +
          '</div>' +
          '<div class="es3-status" id="selectorMsg" aria-live="polite">Loading experiences…</div>' +
        '</aside>' +
      '</section>' +
      '<section class="es3-grid" id="experienceGrid" aria-live="polite">' +
        '<div class="es3-loading-card"></div><div class="es3-loading-card"></div><div class="es3-loading-card"></div>' +
      '</section>' +
      notesMarkup();
  }

  function bindRenderedActions() {
    document.querySelectorAll('[data-es3-demo-user]').forEach(function (button) {
      button.addEventListener('click',function () {
        var index = Number(button.getAttribute('data-es3-demo-card'));
        selectedDemoUsers[index] = button.getAttribute('data-es3-demo-user');
        window.render();
      });
    });

    document.querySelectorAll('[data-es3-enter]').forEach(function (button) {
      button.addEventListener('click',function () {
        window.enterExperience(Number(button.getAttribute('data-es3-enter')));
      });
    });
  }

  function setStatus(message,isError) {
    var status = document.getElementById('selectorMsg');
    if (!status) return;
    status.textContent = message || '';
    status.classList.toggle('is-error',!!isError);
  }

  function setBusy(next) {
    busy = next;
    document.querySelectorAll('[data-es3-enter]').forEach(function (button) {
      button.disabled = next;
    });
  }

  function rememberExperience(experience,index,user) {
    try {
      localStorage.setItem(LAST_KEY,JSON.stringify({
        accountType:experience.accountType,
        demo:!!experience.demo,
        demoUserId:experience.demo && user ? user.id : null,
        label:roleLabel(experience),
        savedAt:new Date().toISOString()
      }));
    } catch (_) {}
  }

  window.render = function () {
    buildShell();

    experiences = visibleExperiences(experiences);
    var list = experiences;
    var summary = document.getElementById('es3Summary');
    var continuePanel = document.getElementById('es3Continue');
    var grid = document.getElementById('experienceGrid');

    if (!summary || !continuePanel || !grid) return;

    if (!list.length) {
      summary.innerHTML = summaryMarkup([]);
      continuePanel.outerHTML = continueMarkup([]);
      document.getElementById('experienceGrid').innerHTML =
        '<div class="es3-empty">No approved Coach, Scout or Stratex workspace is currently available for this account.</div>';
      return;
    }

    list.forEach(function (experience,index) {
      selectedUserFor(experience,index);
    });

    summary.innerHTML = summaryMarkup(list);
    continuePanel.outerHTML = continueMarkup(list);
    document.getElementById('experienceGrid').innerHTML =
      list.map(cardMarkup).join('');
    bindRenderedActions();
  };

  window.enterExperience = async function (index) {
    if (busy) return;

    var experience = experiences[index];
    if (!experience) return;

    var selectedUser = selectedUserFor(experience,index);
    setBusy(true);
    setStatus('Opening ' + roleLabel(experience) + '…',false);

    try {
      if (typeof clearExperienceRoutingState === 'function') {
        clearExperienceRoutingState();
      }

      if (typeof storeAdminIfNeeded === 'function') {
        storeAdminIfNeeded();
      }

      if (!experience.demo && experience.accountType === Auth.type) {
        rememberExperience(experience,index,selectedUser);
        navigateClean(roleHome(experience.accountType));
        return;
      }

      var response = await api('POST','/api/auth/switch-experience',{
        accountType:experience.accountType,
        demo:!!experience.demo,
        demoUserId:experience.demo && selectedUser ? selectedUser.id : null
      });

      if (experience.demo && typeof storeAdminIfNeeded === 'function') {
        storeAdminIfNeeded();
      }

      Auth.set(response.token,response.user,response.accountType);
      localStorage.setItem('sl_demo_mode',response.demoMode ? '1' : '0');
      localStorage.setItem('sl_experience_switcher','1');
      rememberExperience(experience,index,selectedUser);
      navigateClean(roleHome(response.accountType));
    } catch (error) {
      setBusy(false);
      window.render();
      setStatus(error.message || 'Could not open that experience.',true);
    }
  };

  document.addEventListener('DOMContentLoaded',function () {
    buildShell();

    var observer = new MutationObserver(function () {
      if (document.getElementById('experienceGrid') &&
          document.getElementById('experienceGrid').querySelector('.experience-card')) {
        window.render();
      }
    });

    observer.observe(document.getElementById('main'),{
      childList:true,
      subtree:true
    });

    setTimeout(function () {
      observer.disconnect();
    },8000);
  });
})();
