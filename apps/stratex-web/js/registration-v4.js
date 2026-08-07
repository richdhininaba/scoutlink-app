'use strict';
(function () {
  function publicPath(path) {
    return 'https://www.scoutlink.app/' + String(path || '').replace(/^\/+/, '');
  }

  function replaceNavigation() {
    var nav = document.querySelector('.slrv-nav');
    if (nav) {
      nav.innerHTML =
        '<a href="' + publicPath('coaches') + '">Coaches</a>' +
        '<a href="' + publicPath('scouts') + '">Scouts</a>' +
        '<a href="' + publicPath('demo') + '">Demo</a>' +
        '<a href="' + publicPath('scoutlink/pricing') + '">Pricing</a>' +
        '<a href="' + publicPath('safeguarding') + '">Safeguarding</a>';
    }

    var actions = document.querySelector('.slrv-header-actions');
    if (actions) {
      actions.innerHTML =
        '<a class="slrv-btn" href="' + publicPath('login') + '">Sign in</a>' +
        '<a class="slrv-btn primary" href="' + publicPath('') + '">Back to ScoutLink</a>';
    }

    var mobile = document.querySelector('.slrv-mobile-nav');
    if (mobile) {
      mobile.innerHTML =
        '<a href="' + publicPath('coaches') + '">Coaches</a>' +
        '<a href="' + publicPath('scouts') + '">Scouts</a>' +
        '<a href="' + publicPath('demo') + '">Demo</a>' +
        '<a href="' + publicPath('scoutlink/pricing') + '">Pricing</a>' +
        '<a href="' + publicPath('safeguarding') + '">Safeguarding</a>' +
        '<a href="' + publicPath('login') + '">Sign in</a>';
    }
  }

  function replaceFooter() {
    var footer = document.querySelector('.slrv-footer');
    if (!footer) return;

    footer.innerHTML =
      '<div class="slrv-footer-grid">' +
        '<div class="slrv-footer-brand">' +
          '<a class="slrv-logo" href="' + publicPath('') + '">Scout<span>Link</span></a>' +
          '<p>Coach-led player evidence. Reviewed scout access. Responsible football visibility.</p>' +
        '</div>' +
        '<div class="slrv-footer-col"><b>Product</b>' +
          '<a href="' + publicPath('coaches') + '">Coaches</a>' +
          '<a href="' + publicPath('scouts') + '">Scouts</a>' +
          '<a href="' + publicPath('demo') + '">Demo</a>' +
          '<a href="' + publicPath('scoutlink/pricing') + '">Pricing</a>' +
        '</div>' +
        '<div class="slrv-footer-col"><b>Trust</b>' +
          '<a href="' + publicPath('safeguarding') + '">Safeguarding</a>' +
          '<a href="' + publicPath('report-a-concern') + '">Report a concern</a>' +
          '<a href="' + publicPath('data-policy') + '">Data policy</a>' +
        '</div>' +
        '<div class="slrv-footer-col"><b>Legal</b>' +
          '<a href="' + publicPath('privacy-policy') + '">Privacy</a>' +
          '<a href="' + publicPath('terms') + '">Terms</a>' +
          '<a href="' + publicPath('cookie-policy') + '">Cookies</a>' +
        '</div>' +
      '</div>' +
      '<div class="slrv-footer-bottom">' +
        '<span>&copy; 2026 ScoutLink. Powered by Stratex Analytics.</span>' +
        '<span>info@scoutlink.app</span>' +
      '</div>';
  }

  function equalisePlanButtons() {
    var buttons = Array.prototype.slice.call(
      document.querySelectorAll('.slrv-plan-card .slrv-btn')
    );
    buttons.forEach(function (button) {
      button.style.minHeight = '';
    });
    if (window.innerWidth < 768 || buttons.length < 2) return;
    var height = buttons.reduce(function (max, button) {
      return Math.max(max, button.getBoundingClientRect().height);
    }, 0);
    buttons.forEach(function (button) {
      button.style.minHeight = Math.ceil(height) + 'px';
    });
  }

  function apply() {
    if (!document.querySelector('.slrv-site')) return;
    replaceNavigation();
    replaceFooter();
    equalisePlanButtons();
  }

  var app = document.getElementById('slRegistrationApp');
  if (app && 'MutationObserver' in window) {
    new MutationObserver(function () {
      window.requestAnimationFrame(apply);
    }).observe(app, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }

  window.addEventListener('resize', function () {
    window.requestAnimationFrame(equalisePlanButtons);
  });
}());
