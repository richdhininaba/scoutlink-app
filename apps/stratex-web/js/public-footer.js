'use strict';

(function () {
  var footerHtml =
    '<div class="seo-container seo-footer-grid">' +
      '<div><a class="seo-brand" href="/">Scout<span>Link</span></a>' +
      '<p class="seo-note">ScoutLink by Stratex Analytics. Coach-led. Scout verified. Youth football, properly.</p></div>' +
      '<div class="seo-footer-links">' +
        '<div><strong>Product</strong><a href="/coaches">Coaches</a><a href="/scouts">Scouts</a><a href="/demo">Demo</a><a href="/register/coach">Register as Coach</a><a href="/register/scout">Request Scout Access</a></div>' +
        '<div><strong>Trust</strong><a href="/safeguarding">Safeguarding</a><a href="/report-a-concern">Report a Concern</a><a href="/parent-guardian-notice">Parent/Guardian Notice</a></div>' +
        '<div><strong>Company</strong><a href="/about">About</a><a href="/contact">Contact</a><a href="/careers">Careers</a></div>' +
        '<div><strong>Legal</strong><a href="/privacy-policy">Privacy Policy</a><a href="/terms">Terms of Use</a><a href="/cookie-policy">Cookie Policy</a><a href="/accessibility">Accessibility</a></div>' +
      '</div>' +
    '</div>';

  function injectStyles() {
    if (document.getElementById('scoutlinkPublicFooterStyles')) return;
    var style = document.createElement('style');
    style.id = 'scoutlinkPublicFooterStyles';
    style.textContent =
      '.scoutlink-public-footer{margin-top:42px;padding:34px 0;background:#fff;border-top:1px solid #e5e7eb;color:#111827}' +
      '.scoutlink-public-footer .seo-container{width:min(1120px,calc(100% - 32px));margin:0 auto}' +
      '.scoutlink-public-footer .seo-footer-grid{display:grid;grid-template-columns:1fr 2fr;gap:24px;align-items:start}' +
      '.scoutlink-public-footer .seo-brand{color:#111827;font-size:24px;font-weight:950;text-decoration:none;letter-spacing:-.04em}' +
      '.scoutlink-public-footer .seo-brand span{color:#0f9f75}' +
      '.scoutlink-public-footer .seo-note{color:#64748b;font-size:13px;line-height:1.55;margin:12px 0 0}' +
      '.scoutlink-public-footer .seo-footer-links{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}' +
      '.scoutlink-public-footer strong{display:block;margin-bottom:10px;color:#111827;font-size:13px}' +
      '.scoutlink-public-footer a{display:block;margin:7px 0;color:#475569;text-decoration:none;font-size:14px;font-weight:750}' +
      '.scoutlink-public-footer a:hover{color:#047857}' +
      '@media(max-width:800px){.scoutlink-public-footer{margin-top:28px;padding:28px 0}.scoutlink-public-footer .seo-footer-grid,.scoutlink-public-footer .seo-footer-links{grid-template-columns:1fr}.scoutlink-public-footer .seo-footer-links{gap:14px}.scoutlink-public-footer a{font-size:14px;min-height:26px}}';
    document.head.appendChild(style);
  }

  function mountFooter() {
    injectStyles();
    var footer = document.querySelector('footer');
    if (!footer) {
      footer = document.createElement('footer');
      document.body.appendChild(footer);
    }
    footer.className = 'seo-footer scoutlink-public-footer';
    footer.innerHTML = footerHtml;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountFooter);
  else mountFooter();
})();
