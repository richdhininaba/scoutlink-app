"use strict";

(function () {
  var LAST_KEY = "sl_last_experience_v4";
  var experiences = [];
  var selectedDemoUsers = {};
  var busy = false;

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char];
    });
  }

  function visibleExperiences(list) {
    return (list || []).filter(function (experience) {
      return experience && experience.accountType !== "Player";
    });
  }

  function isAdmin(experience) {
    return !!experience && (experience.admin || experience.accountType === "Stratex");
  }

  function roleHome(type) {
    return {
      Stratex: "stratex-dashboard.html",
      Scout: "scout-dashboard.html",
      Coach: "coach-dashboard.html"
    }[type] || "login.html";
  }

  function roleTitle(experience) {
    if (isAdmin(experience)) return "Stratex Admin";
    if (experience.accountType === "Coach") return experience.demo ? "Coach Demo" : "Coach Workspace";
    if (experience.accountType === "Scout") return experience.demo ? "Scout Demo" : "Scout Workspace";
    return experience.label || experience.accountType || "ScoutLink Workspace";
  }

  function roleEyebrow(experience) {
    if (isAdmin(experience)) return "Internal administration";
    if (experience.demo) return "Isolated fictional demo";
    return experience.current ? "Current approved role" : "Approved linked role";
  }

  function roleDescription(experience) {
    if (isAdmin(experience)) {
      return "Manage registrations, organisations, users, showcase activity, product access and platform operations.";
    }
    if (experience.accountType === "Coach") {
      return experience.demo
        ? "Explore squad management, player creation, fixtures, Match Facts, evidence and scout communication using fictional records."
        : "Manage squad profiles, fixtures, Match Facts, approved evidence and controlled scout communication.";
    }
    if (experience.accountType === "Scout") {
      return experience.demo
        ? "Explore player search, comparison, compatibility, shortlists, predictions and pipelines using fictional records."
        : "Search reviewed players, compare compatibility and manage shortlists, visits and recruitment pipelines.";
    }
    return experience.description || "Open this approved ScoutLink workspace.";
  }

  function iconText(experience) {
    if (isAdmin(experience)) return "ST";
    if (experience.accountType === "Coach") return "CO";
    if (experience.accountType === "Scout") return "SC";
    return "SL";
  }

  function cardClass(experience) {
    if (isAdmin(experience)) return "is-admin";
    if (experience.accountType === "Scout") return "is-scout";
    return "is-coach";
  }

  function userName(user) {
    if (!user) return "ScoutLink user";
    return user.label ||
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.email ||
      "ScoutLink user";
  }

  function userSubtitle(user, fallback) {
    if (!user) return fallback || "Approved access";
    return user.teamName || user.email || fallback || "Approved access";
  }

  function realAccountUser(experience) {
    var user = typeof Auth !== "undefined" && Auth.user ? Auth.user : {};
    return {
      id: user.id || experience.userId || experience.accountType,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      teamName: user.teamName || "",
      label: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || experience.accountType
    };
  }

  function selectedUserFor(experience, index) {
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

    if (isAdmin(experience)) {
      return {
        id: "stratex-operations",
        label: "Stratex operations",
        teamName: "Internal administration"
      };
    }

    return realAccountUser(experience);
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
    return !!experience && !!preference &&
      String(experience.accountType) === String(preference.accountType) &&
      !!experience.demo === !!preference.demo;
  }

  function findContinueIndex(list) {
    var preference = storedPreference();
    var preferredIndex = list.findIndex(function (experience) {
      return matchesPreference(experience, preference);
    });

    if (preferredIndex >= 0) {
      var preferredExperience = list[preferredIndex];
      if (preferredExperience.demo && preference.demoUserId) {
        var valid = (preferredExperience.demoUsers || []).some(function (user) {
          return String(user.id) === String(preference.demoUserId);
        });
        if (valid) selectedDemoUsers[preferredIndex] = preference.demoUserId;
      }
      return preferredIndex;
    }

    var currentIndex = list.findIndex(function (experience) {
      return experience.current && !experience.demo;
    });
    if (currentIndex >= 0) return currentIndex;

    if (typeof Auth !== "undefined" && Auth.type === "Stratex") {
      var coachDemoIndex = list.findIndex(function (experience) {
        return experience.demo && experience.accountType === "Coach";
      });
      if (coachDemoIndex >= 0) return coachDemoIndex;
    }

    return list.length ? 0 : -1;
  }

  function rememberExperience(experience, user) {
    try {
      localStorage.setItem(LAST_KEY, JSON.stringify({
        accountType: experience.accountType,
        demo: !!experience.demo,
        demoUserId: experience.demo && user ? user.id : null,
        savedAt: new Date().toISOString()
      }));
    } catch (_) {}
  }

  function headerMarkup() {
    return '<header class="site-header compact">' +
      '<div class="site-shell header-inner">' +
        '<a href="/" class="brand-link"><span class="sl-logo">Scout<span>Link</span></span></a>' +
        '<nav class="desktop-nav" aria-label="Workspace navigation">' +
          '<a href="/demo">Public demo</a>' +
          '<a href="/register/coach">Register Coach</a>' +
          '<a href="/register/scout">Request Scout Access</a>' +
        '</nav>' +
        '<div class="desktop-actions"><button class="header-login" id="logoutBtn" type="button">Sign out</button></div>' +
        '<button class="mobile-menu" type="button" data-public-menu-open aria-label="Open menu" aria-expanded="false"><span></span><span></span><span></span></button>' +
        '<div class="public-menu-panel" data-public-menu-backdrop aria-hidden="true">' +
          '<div class="public-menu-drawer" role="dialog" aria-modal="true" aria-label="Workspace menu">' +
            '<div class="public-menu-head"><a href="/" class="brand-link"><span class="sl-logo">Scout<span>Link</span></span></a><button class="public-menu-close" type="button" data-public-menu-close aria-label="Close menu">&times;</button></div>' +
            '<nav class="public-menu-links"><a href="/demo">Public demo</a><a href="/register/coach">Register Coach</a><a href="/register/scout">Request Scout Access</a><button class="primary" id="logoutMobile" type="button">Sign out</button></nav>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</header>';
  }

  function summaryMarkup(list) {
    var demoCount = list.filter(function (experience) { return !!experience.demo; }).length;
    var liveCount = list.filter(function (experience) { return !experience.demo; }).length;
    return '<div class="experience-summary-v4">' +
      '<article><b>' + list.length + '</b><span>Available workspaces</span></article>' +
      '<article><b>' + liveCount + '</b><span>Approved live or internal roles</span></article>' +
      '<article><b>' + demoCount + '</b><span>Isolated fictional demos</span></article>' +
    '</div>';
  }

  function continueMarkup(list) {
    var index = findContinueIndex(list);
    if (index < 0) {
      return '<section class="continue-panel-v4"><div><span>No workspace available</span><h2>This account has no approved workspace.</h2><p>Contact Stratex support if you expected access.</p></div><a class="sl-btn" href="mailto:info@scoutlink.app">Contact support</a></section>';
    }

    var experience = list[index];
    var user = selectedUserFor(experience, index);
    var display = roleTitle(experience);
    if (experience.demo && user) display += ' · ' + userName(user);

    return '<section class="continue-panel-v4">' +
      '<div><span>Continue where you left off</span><h2>' + esc(display) + '</h2><p>' + esc(userSubtitle(user, roleDescription(experience))) + '</p></div>' +
      '<button class="sl-btn" type="button" data-experience-enter="' + index + '">Continue</button>' +
    '</section>';
  }

  function demoSelectMarkup(experience, index) {
    if (!experience.demo) {
      var user = selectedUserFor(experience, index);
      return '<div class="workspace-meta-v4"><b>' + esc(userName(user)) + '</b><span>' + esc(userSubtitle(user, experience.current ? 'Current signed-in role' : 'Approved access')) + '</span></div>';
    }

    var users = experience.demoUsers || [];
    if (!users.length) {
      return '<div class="workspace-meta-v4"><b>Default demo identity</b><span>Isolated fictional data</span></div>';
    }

    selectedUserFor(experience, index);
    return '<label class="workspace-meta-v4"><b>Demo identity</b><select class="demo-user-select-v4" data-experience-demo-user="' + index + '">' +
      users.map(function (user) {
        var selected = String(selectedDemoUsers[index]) === String(user.id) ? ' selected' : '';
        return '<option value="' + esc(user.id) + '"' + selected + '>' + esc(userName(user)) + ' · ' + esc(userSubtitle(user, 'Demo account')) + '</option>';
      }).join('') +
    '</select></label>';
  }

  function workspaceMarkup(experience, index) {
    var buttonLabel = isAdmin(experience)
      ? 'Enter Stratex Admin'
      : experience.demo
        ? 'Open ' + roleTitle(experience)
        : 'Enter ' + roleTitle(experience);

    return '<article class="workspace-card-v4 ' + cardClass(experience) + '">' +
      '<div class="workspace-icon-v4" aria-hidden="true">' + esc(iconText(experience)) + '</div>' +
      '<div class="workspace-copy-v4"><small>' + esc(roleEyebrow(experience)) + '</small><h3>' + esc(roleTitle(experience)) + '</h3><p>' + esc(roleDescription(experience)) + '</p></div>' +
      demoSelectMarkup(experience, index) +
      '<button class="sl-btn ' + (isAdmin(experience) ? 'dark' : '') + '" type="button" data-experience-enter="' + index + '">' + esc(buttonLabel) + '</button>' +
    '</article>';
  }

  function shellMarkup(list) {
    return '<div class="product-page experience-page-v4-shell">' +
      headerMarkup() +
      '<main id="experienceRoot">' +
        '<section class="experience-hero-v4"><div class="site-shell experience-hero-grid-v4">' +
          '<div class="experience-hero-copy-v4"><span class="hero-kicker green">Product access</span><h1>CHOOSE THE WORKSPACE YOU NEED TODAY.</h1><p>Open the approved role or isolated fictional demo that matches the work you are doing. Player Demo has been removed.</p>' + summaryMarkup(list) + '</div>' +
          '<aside class="experience-security-v4"><span>Controlled access</span><h2>Every workspace has a clear purpose.</h2><p>Live roles use approved permissions. Demo roles use fictional records and cannot change customer data.</p><ul><li>Role-based access</li><li>Demo and production separation</li><li>One sign-out route</li></ul></aside>' +
        '</div></section>' +
        '<section class="experience-content-v4"><div class="site-shell">' +
          '<div class="experience-message-v4" id="selectorMsg" role="alert" aria-live="assertive"></div>' +
          continueMarkup(list) +
          '<div class="workspace-heading-v4"><div><span class="eyebrow">Available to this account</span><h2>Choose a workspace</h2></div><p>Select a fictional identity before opening a demo. Live and internal workspaces use the approved account identity.</p></div>' +
          '<div class="workspace-list-v4">' + (list.length ? list.map(workspaceMarkup).join('') : '<div class="experience-loader-card-v4"><h1>No workspace available</h1><p>Contact Stratex support if you expected access.</p></div>') + '</div>' +
          '<p class="workspace-note-v4">Demo sessions use isolated fictional records. They do not affect live players, teams, scouts, coaches or platform operations.</p>' +
        '</div></section>' +
      '</main>' +
    '</div>';
  }

  function showMessage(message) {
    var target = document.getElementById('selectorMsg');
    if (!target) return;
    target.textContent = message || '';
    target.classList.toggle('show', !!message);
  }

  function setBusy(next) {
    busy = next;
    document.querySelectorAll('[data-experience-enter]').forEach(function (button) {
      button.disabled = next;
    });
  }

  function closeMenu() {
    document.body.classList.remove('public-menu-open');
    var panel = document.querySelector('[data-public-menu-backdrop]');
    var opener = document.querySelector('[data-public-menu-open]');
    if (panel) panel.setAttribute('aria-hidden', 'true');
    if (opener) opener.setAttribute('aria-expanded', 'false');
  }

  function bindActions() {
    var logout = document.getElementById('logoutBtn');
    var logoutMobile = document.getElementById('logoutMobile');

    function signOut() {
      if (typeof Auth !== 'undefined') Auth.clear();
      navigateClean('login.html?logout=1');
    }

    if (logout) logout.addEventListener('click', signOut);
    if (logoutMobile) logoutMobile.addEventListener('click', signOut);

    document.querySelectorAll('[data-experience-enter]').forEach(function (button) {
      button.addEventListener('click', function () {
        enterExperience(Number(button.getAttribute('data-experience-enter')));
      });
    });

    document.querySelectorAll('[data-experience-demo-user]').forEach(function (select) {
      select.addEventListener('change', function () {
        var index = Number(select.getAttribute('data-experience-demo-user'));
        selectedDemoUsers[index] = select.value;
        render();
      });
    });

    var opener = document.querySelector('[data-public-menu-open]');
    var closer = document.querySelector('[data-public-menu-close]');
    var panel = document.querySelector('[data-public-menu-backdrop]');
    if (opener) opener.addEventListener('click', function () {
      document.body.classList.add('public-menu-open');
      opener.setAttribute('aria-expanded', 'true');
      if (panel) panel.setAttribute('aria-hidden', 'false');
    });
    if (closer) closer.addEventListener('click', closeMenu);
    if (panel) panel.addEventListener('click', function (event) {
      if (event.target === panel) closeMenu();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeMenu();
    }, { once: true });
  }

  function render() {
    var root = document.getElementById('publicCoreRoot');
    if (!root) return;
    root.innerHTML = shellMarkup(experiences);
    bindActions();
  }

  function storeAdminIfNeeded() {
    if (typeof Auth === 'undefined') return;
    if (Auth.type === 'Stratex' && !(typeof isDemoMode === 'function' && isDemoMode())) {
      localStorage.setItem('sl_admin_token', Auth.token);
      localStorage.setItem('sl_admin_user', JSON.stringify(Auth.user));
      localStorage.setItem('sl_admin_type', 'Stratex');
    }
  }

  function clearExperienceRoutingState() {
    try {
      Object.keys(sessionStorage).forEach(function (key) {
        if (/^sl_tour_|^sl_force_tour_|^sl_product_tour|product_tour|onboarding|redirect/i.test(key)) {
          sessionStorage.removeItem(key);
        }
      });
      ['sl_redirect_after_login','sl_onboarding_step','sl_pending_route','sl_last_demo_route','sl_demo_tour','sl_force_tour'].forEach(function (key) {
        localStorage.removeItem(key);
      });
    } catch (_) {}
  }

  async function enterExperience(index) {
    if (busy) return;
    var experience = experiences[index];
    if (!experience) return;

    var user = selectedUserFor(experience, index);
    setBusy(true);
    showMessage('Opening ' + roleTitle(experience) + '…');
    clearExperienceRoutingState();

    try {
      storeAdminIfNeeded();

      if (!experience.demo && experience.accountType === Auth.type) {
        rememberExperience(experience, user);
        navigateClean(roleHome(experience.accountType));
        return;
      }

      var response = await api('POST', '/api/auth/switch-experience', {
        accountType: experience.accountType,
        demo: !!experience.demo,
        demoUserId: experience.demo && user ? user.id : null
      });

      if (experience.demo) storeAdminIfNeeded();
      Auth.set(response.token, response.user, response.accountType);
      localStorage.setItem('sl_demo_mode', response.demoMode ? '1' : '0');
      localStorage.setItem('sl_experience_switcher', '1');
      rememberExperience(experience, user);
      navigateClean(roleHome(response.accountType));
    } catch (error) {
      setBusy(false);
      render();
      showMessage(error.message || 'Could not open that workspace.');
    }
  }

  async function load() {
    if (typeof isDemoMode === 'function' && isDemoMode() && typeof restoreAdminSessionForSelector === 'function') {
      restoreAdminSessionForSelector();
    }

    if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
      navigateClean('login.html');
      return;
    }

    try {
      var response = await api('GET', '/api/auth/experiences');
      experiences = visibleExperiences(response.data || []);
      experiences.forEach(function (experience, index) {
        selectedUserFor(experience, index);
      });
      render();
    } catch (error) {
      experiences = [];
      render();
      showMessage(error.message || 'Could not load the approved workspaces. Please sign in again.');
    }
  }

  document.addEventListener('DOMContentLoaded', load);
}());
