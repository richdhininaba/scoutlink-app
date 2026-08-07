'use strict';

(function () {
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

  function pageMarkup() {
    return '<div class="page">' +
      window.header('login',window.innerWidth <= 767) +
      '<main class="login-v3-main" id="loginV3Main">' +
        '<section class="login-v3-grid">' +
          '<article class="login-v3-context">' +
            '<span class="login-v3-eyebrow">ScoutLink account access</span>' +
            '<h1>Welcome back to your football workspace.</h1>' +
            '<p>Sign in to manage player evidence, review scouting information or support ScoutLink operations through the workspace assigned to your account.</p>' +
            '<div class="login-v3-access-list">' +
              accessItem(
                'CO',
                'Coach workspace',
                'Manage squads, fixtures, Match Facts, video evidence and coach-mediated scout interest.'
              ) +
              accessItem(
                'SC',
                'Reviewed scout workspace',
                'Search, compare and shortlist players using structured evidence and controlled access.'
              ) +
              accessItem(
                'IN',
                'Internal workspace',
                'Support registrations, trust reviews, product operations and demonstration experiences.',
                true
              ) +
            '</div>' +
            '<div class="login-v3-context-foot">' +
              '<strong>Safe and controlled access</strong>' +
              '<p>ScoutLink is coach-led and scout-reviewed. Player visibility is not an open public directory.</p>' +
              '<div class="login-v3-trust">' +
                '<a href="/safeguarding">Safeguarding</a>' +
                '<a href="/scout-verification">Scout verification</a>' +
                '<a href="/report-a-concern">Report a Concern</a>' +
              '</div>' +
            '</div>' +
          '</article>' +

          '<article class="login-v3-card">' +
            '<span class="login-v3-eyebrow">Secure account access</span>' +
            '<h2>Sign in to ScoutLink</h2>' +
            '<p>Use your email and password, or use the login code from an approval or invitation email.</p>' +

            '<div class="public-message" id="loginMessage" role="alert" aria-live="assertive"></div>' +

            '<div class="login-v3-tabs" role="tablist" aria-label="Login method">' +
              '<button class="login-v3-tab active" id="loginTabPassword" type="button" role="tab" aria-selected="true" aria-controls="passwordLoginForm" data-login-tab="password">Email and password</button>' +
              '<button class="login-v3-tab" id="loginTabCode" type="button" role="tab" aria-selected="false" aria-controls="codeLoginForm" data-login-tab="code">Login with code</button>' +
            '</div>' +

            '<form class="login-v3-mode" id="passwordLoginForm" novalidate>' +
              '<div id="passwordLoginSection">' +
                '<div class="login-v3-fields">' +
                  '<div class="login-v3-field">' +
                    '<label for="email">Email address</label>' +
                    '<input class="login-v3-input public-form-control" type="email" id="email" autocomplete="email" inputmode="email" placeholder="your@email.com" required>' +
                  '</div>' +
                  '<div class="login-v3-field">' +
                    '<label for="password">Password</label>' +
                    '<div class="login-v3-input-wrap">' +
                      '<input class="login-v3-input has-action public-form-control" type="password" id="password" autocomplete="current-password" placeholder="Enter your password" required>' +
                      '<button class="login-v3-show" type="button" data-login-v3-show aria-controls="password" aria-pressed="false">Show</button>' +
                    '</div>' +
                  '</div>' +
                '</div>' +
                '<button class="btn primary block login-v3-submit" id="loginBtn" type="submit">' +
                  '<span id="btnText">Sign in</span>' +
                  '<span class="public-spinner" id="spinner" aria-hidden="true"></span>' +
                '</button>' +
                '<div class="login-v3-centre"><a href="/forgot-password">Forgot password?</a></div>' +
              '</div>' +
            '</form>' +

            '<form class="login-v3-mode public-hidden" id="codeLoginForm" novalidate>' +
              '<div id="codeLoginSection">' +
                '<div class="login-v3-fields">' +
                  '<div class="login-v3-field">' +
                    '<label for="codeEmail">Email address</label>' +
                    '<input class="login-v3-input public-form-control" type="email" id="codeEmail" autocomplete="email" inputmode="email" placeholder="your@email.com">' +
                  '</div>' +
                  '<div class="login-v3-field">' +
                    '<label for="loginCode">Login code</label>' +
                    '<input class="login-v3-input public-form-control" type="text" id="loginCode" maxlength="6" autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" placeholder="Enter the code from your email">' +
                  '</div>' +
                '</div>' +
                '<button class="btn primary block login-v3-submit" id="codeBtn" type="submit">' +
                  '<span id="codeBtnText">Continue with code</span>' +
                  '<span class="public-spinner" id="codeSpinner" aria-hidden="true"></span>' +
                '</button>' +
                '<div class="login-v3-help">Use the code from your ScoutLink approval, invitation or account-access email. Codes should remain private and may expire.</div>' +
              '</div>' +
            '</form>' +

            '<div id="roleChooser" class="public-hidden">' +
              '<h3>Choose where you want to go</h3>' +
              '<p>We found more than one available ScoutLink experience for this email.</p>' +
              '<div id="roleOptions" class="public-role-options"></div>' +
            '</div>' +

            '<div class="login-v3-divider"></div>' +
            '<div class="login-v3-new">New to ScoutLink? <a href="/register">Choose a registration route</a></div>' +
          '</article>' +
        '</section>' +

        '<section class="login-v3-support" aria-label="Account routes">' +
          supportCard(
            '/register/coach',
            'Create a coach account',
            'Build a free coach workspace and begin setting up your team and player evidence.',
            'Register as Coach'
          ) +
          supportCard(
            '/register/scout',
            'Request scout access',
            'Apply for reviewed access to player search, comparisons and recruitment pipelines.',
            'Start scout registration'
          ) +
          supportCard(
            '/contact?reason=platform-support',
            'Having trouble signing in?',
            'Get help with your invitation, approval code, password or account access.',
            'Contact support'
          ) +
        '</section>' +
      '</main>' +
      window.footer() +
    '</div>';
  }

  function accessItem(icon,title,copy,internal) {
    return '<div class="login-v3-access' +
      (internal ? ' is-internal' : '') + '">' +
      '<div class="login-v3-icon" aria-hidden="true">' +
        esc(icon) +
      '</div>' +
      '<div><b>' + esc(title) + '</b><span>' +
        esc(copy) +
      '</span></div>' +
    '</div>';
  }

  function supportCard(href,title,copy,action) {
    return '<a href="' + esc(href) + '">' +
      '<b>' + esc(title) + '</b>' +
      '<p>' + esc(copy) + '</p>' +
      '<span>' + esc(action) + ' →</span>' +
    '</a>';
  }

  function updateTabAccessibility(mode) {
    mode = mode || (
      document.getElementById('codeLoginForm') &&
      !document.getElementById('codeLoginForm').classList.contains('public-hidden')
        ? 'code'
        : 'password'
    );

    var passwordTab = document.getElementById('loginTabPassword');
    var codeTab = document.getElementById('loginTabCode');

    if (passwordTab) {
      passwordTab.setAttribute(
        'aria-selected',
        mode === 'password' ? 'true' : 'false'
      );
      passwordTab.setAttribute(
        'tabindex',
        mode === 'password' ? '0' : '-1'
      );
    }

    if (codeTab) {
      codeTab.setAttribute(
        'aria-selected',
        mode === 'code' ? 'true' : 'false'
      );
      codeTab.setAttribute(
        'tabindex',
        mode === 'code' ? '0' : '-1'
      );
    }
  }

  function syncEmailFields(mode) {
    var passwordEmail = document.getElementById('email');
    var codeEmail = document.getElementById('codeEmail');

    if (!passwordEmail || !codeEmail) return;

    if (mode === 'code' && !codeEmail.value) {
      codeEmail.value = passwordEmail.value;
    }

    if (mode === 'password' && !passwordEmail.value) {
      passwordEmail.value = codeEmail.value;
    }
  }

  function refreshMetadata() {
    document.body.classList.add('login-page-v3');
    document.title = 'Sign in to ScoutLink | Secure Coach, Scout and Internal Access';

    var description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute(
        'content',
        'Sign in securely to an approved ScoutLink coach, scout, player or Stratex workspace using a password or invitation code.'
      );
    }
  }

  /* public-core-runtime calls this function when it renders the login route. */
  window.loginPage = function () {
    return pageMarkup();
  };

  refreshMetadata();

  document.addEventListener('click',function (event) {
    var showButton = event.target.closest('[data-login-v3-show]');
    if (showButton) {
      var input = document.getElementById(
        showButton.getAttribute('aria-controls') || 'password'
      );
      if (!input) return;

      var visible = input.type === 'text';
      input.type = visible ? 'password' : 'text';
      showButton.textContent = visible ? 'Show' : 'Hide';
      showButton.setAttribute('aria-pressed',visible ? 'false' : 'true');
      return;
    }

    var tab = event.target.closest('[data-login-tab]');
    if (tab) {
      var mode = tab.getAttribute('data-login-tab');
      syncEmailFields(mode);
      updateTabAccessibility(mode);
    }
  });

  document.addEventListener('keydown',function (event) {
    var tab = event.target.closest &&
      event.target.closest('[data-login-tab]');
    if (!tab) return;

    if (
      event.key !== 'ArrowLeft' &&
      event.key !== 'ArrowRight'
    ) return;

    event.preventDefault();
    var next = tab.id === 'loginTabPassword'
      ? document.getElementById('loginTabCode')
      : document.getElementById('loginTabPassword');

    if (next) {
      next.click();
      next.focus();
    }
  });

  document.addEventListener('DOMContentLoaded',function () {
    refreshMetadata();
    updateTabAccessibility();

    var params = new URLSearchParams(window.location.search);
    if (params.get('code')) {
      var codeInput = document.getElementById('loginCode');
      if (codeInput) codeInput.focus();
    } else {
      var email = document.getElementById('email');
      if (email) email.focus();
    }
  });

  window.addEventListener('resize',function () {
    window.setTimeout(updateTabAccessibility,0);
  });
})();
