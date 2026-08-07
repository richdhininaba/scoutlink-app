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

  function isStratexHost() {
    return /(^|\.)stratexanalytics\.co\.uk$/i.test(
      window.location.hostname
    );
  }

  function isStratexHomepage() {
    var path = window.location.pathname.replace(/\/+$/,'') || '/';

    if (isStratexHost()) {
      return path === '/';
    }

    return path === '/company';
  }

  function sitePath(slug) {
    var clean = String(slug || '').replace(/^\/+|\/+$/g,'');

    if (isStratexHost()) {
      return clean ? '/' + clean : '/';
    }

    return clean ? '/company/' + clean : '/company';
  }

  function button(label,href,primary) {
    return '<a class="stxh-button' +
      (primary ? ' is-primary' : '') +
      '" href="' + esc(href) + '">' +
      esc(label) +
    '</a>';
  }

  function visualLine(title,copy) {
    return '<div class="stxh-visual-line">' +
      '<b>' + esc(title) + '</b>' +
      '<span>' + esc(copy) + '</span>' +
    '</div>';
  }

  function visualStat(value,label) {
    return '<div class="stxh-visual-stat">' +
      '<b>' + esc(value) + '</b>' +
      '<span>' + esc(label) + '</span>' +
    '</div>';
  }

  function card(number,title,copy) {
    return '<article class="stxh-card">' +
      '<span class="stxh-card-number">' +
        String(number).padStart(2,'0') +
      '</span>' +
      '<h3>' + esc(title) + '</h3>' +
      '<p>' + esc(copy) + '</p>' +
    '</article>';
  }

  function stat(value,label) {
    return '<div class="stxh-stat">' +
      '<b>' + esc(value) + '</b>' +
      '<span>' + esc(label) + '</span>' +
    '</div>';
  }

  function feature(title,copy) {
    return '<div class="stxh-feature">' +
      '<b>' + esc(title) + '</b>' +
      '<span>' + esc(copy) + '</span>' +
    '</div>';
  }

  function metric(label,value,width) {
    return '<div class="stxh-metric">' +
      '<div class="stxh-metric-head">' +
        '<span>' + esc(label) + '</span>' +
        '<b>' + esc(value) + '</b>' +
      '</div>' +
      '<div class="stxh-track">' +
        '<span style="width:' + Number(width) + '%"></span>' +
      '</div>' +
    '</div>';
  }

  function homepageMarkup() {
    return '<div class="stxh-main">' +
      '<section class="stxh-hero">' +
        '<div class="stxh-inner stxh-hero-grid">' +
          '<div>' +
            '<span class="stxh-kicker">Football intelligence for overlooked talent</span>' +
            '<h1>Building the intelligence layer for grassroots football.</h1>' +
            '<p class="stxh-hero-copy">Stratex Analytics creates data-led football products that help coaches organise player evidence, help reviewed scouts make better decisions and give overlooked grassroots players a safer route to visibility.</p>' +
            '<div class="stxh-actions">' +
              button('Explore ScoutLink',sitePath('scoutlink'),true) +
              button('Meet Stratex',sitePath('about'),false) +
            '</div>' +
          '</div>' +

          '<article class="stxh-visual">' +
            '<span class="stxh-visual-label">The Stratex approach</span>' +
            '<h2>From local football knowledge to decisions that travel.</h2>' +
            '<p>Stratex turns hard-to-share grassroots insight into products that help coaches document players and help scouts focus their attention.</p>' +
            '<div class="stxh-visual-lines">' +
              visualLine(
                'Capture the evidence',
                'Coaches keep positions, ratings, fixtures, Match Facts and approved media current.'
              ) +
              visualLine(
                'Add football context',
                'Player information is understood through role, age group, match output and team need.'
              ) +
            '</div>' +
            '<div class="stxh-visual-stats">' +
              visualStat('ScoutLink','Flagship product') +
              visualStat('UK','Initial market') +
              visualStat('U7–U16','Player focus') +
            '</div>' +
          '</article>' +
        '</div>' +
      '</section>' +

      '<section class="stxh-section is-white">' +
        '<div class="stxh-inner">' +
          '<div class="stxh-section-head">' +
            '<div>' +
              '<span class="stxh-kicker">Why Stratex</span>' +
              '<h2>Football knowledge becomes more useful when it is structured, current and trusted.</h2>' +
            '</div>' +
            '<p>Coaches already hold valuable knowledge about their players. Stratex helps turn that knowledge into evidence that is easier to maintain, share responsibly and act on.</p>' +
          '</div>' +

          '<div class="stxh-card-grid">' +
            card(
              1,
              'The problem we are solving',
              'Grassroots football knowledge is valuable, but it is often scattered across conversations, isolated clips, spreadsheets and local memory. That makes talented players harder to understand outside the people who already know them.'
            ) +
            card(
              2,
              'Our first product',
              'ScoutLink turns coach-led player information into structured profiles, Match Facts, fixtures, video evidence and explainable scouting context for reviewed football scouts.'
            ) +
            card(
              3,
              'How Stratex works',
              'We combine product design, football operations, customer insight and responsible data use. Every product is designed around a real football workflow rather than technology for its own sake.'
            ) +
            card(
              4,
              'Why trust matters',
              'Youth-player visibility must be controlled, adult-led and accountable. Scout access is reviewed, communication routes are mediated and public concern routes remain easy to find.'
            ) +
          '</div>' +

          '<div class="stxh-stat-grid">' +
            stat('U7–U16','Initial player age focus') +
            stat('Coach-led','Evidence ownership') +
            stat('Reviewed','Scout access') +
            stat('UK first','Initial market') +
          '</div>' +
        '</div>' +
      '</section>' +

      '<section class="stxh-section is-soft">' +
        '<div class="stxh-inner">' +
          '<div class="stxh-section-head">' +
            '<div>' +
              '<span class="stxh-kicker">Flagship product</span>' +
              '<h2>ScoutLink connects evidence, discovery and safer visibility.</h2>' +
            '</div>' +
            '<p>The platform gives each user a focused workspace while keeping the same underlying player evidence standard.</p>' +
          '</div>' +

          '<div class="stxh-product-showcase">' +
            '<div class="stxh-feature-list">' +
              feature('Coaches','Build and maintain player evidence.') +
              feature('Scouts','Search and compare with context.') +
              feature('Families','Understand visibility and concern routes.') +
              feature('Clubs','Create a consistent evidence standard.') +
            '</div>' +

            '<article class="stxh-product-panel">' +
              '<span class="stxh-visual-label">ScoutLink product view</span>' +
              '<h3>One structured record for the player.</h3>' +
              '<p>Positions, attributes, Match Facts, fixtures, video, physical context and evidence confidence sit together for a clearer review.</p>' +
              metric('Player profile completeness','91%',91) +
              metric('Evidence confidence','High',82) +
              metric('Scout compatibility','78%',78) +
            '</article>' +
          '</div>' +
        '</div>' +
      '</section>' +

      '<section class="stxh-cta">' +
        '<div class="stxh-inner stxh-cta-box">' +
          '<div>' +
            '<h2>Ready to explore Stratex and ScoutLink?</h2>' +
            '<p>Open the product, view the company or contact the team about coach, scout and partnership needs.</p>' +
          '</div>' +
          '<div class="stxh-cta-actions">' +
            button('Explore ScoutLink',sitePath('scoutlink'),true) +
            button('Contact Stratex',sitePath('contact'),false) +
          '</div>' +
        '</div>' +
      '</section>' +
    '</div>';
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

  function addFooterBottom() {
    var footer = document.getElementById('stratexFooter');
    if (!footer) return;

    var old = footer.querySelector('.stxh-footer-bottom');
    if (old) old.remove();

    footer.insertAdjacentHTML(
      'beforeend',
      '<div class="stxh-footer-bottom">' +
        '<span>© 2026 Stratex Analytics Limited. All rights reserved.</span>' +
        '<span>ScoutLink is owned and operated by Stratex Analytics.</span>' +
      '</div>'
    );
  }

  function updateMetadata() {
    document.title =
      'Stratex Analytics | Football Intelligence for Grassroots Talent';

    var description = document.querySelector(
      'meta[name="description"]'
    );

    if (description) {
      description.setAttribute(
        'content',
        'Stratex Analytics builds football intelligence products that help grassroots coaches organise player evidence, reviewed scouts make better decisions and overlooked players gain safer visibility.'
      );
    }
  }

  function trackHomepageLinks() {
    document.addEventListener('click',function (event) {
      var link = event.target.closest('.stxh-main a');
      if (!link) return;

      try {
        if (
          window.heap &&
          typeof window.heap.track === 'function'
        ) {
          window.heap.track(
            'stratex_homepage_v3_link_clicked',
            {
              label:(link.textContent || '').trim(),
              href:link.getAttribute('href') || ''
            }
          );
        }
      } catch (_) {}
    });
  }

  function renderHomepage() {
    if (!isStratexHomepage()) return;

    document.body.classList.add('stratex-home-v3');
    document.body.setAttribute('data-stx-page','home');

    var app = document.getElementById('stratexSiteApp');
    if (!app) return;

    app.innerHTML = homepageMarkup();

    addLearningNavigation();
    addFooterBottom();
    updateMetadata();
  }

  document.addEventListener('DOMContentLoaded',function () {
    renderHomepage();
    trackHomepageLinks();
  });
})();
