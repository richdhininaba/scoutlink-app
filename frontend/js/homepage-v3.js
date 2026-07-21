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

  function metric(label,value) {
    return '<div class="home-v3-metric">' +
      '<div class="home-v3-metric-head"><span>' + esc(label) +
      '</span><b>' + esc(value) + '</b></div>' +
      '<div class="home-v3-bar"><span style="width:' +
      esc(value) + '%"></span></div></div>';
  }

  function productStat(value,label) {
    return '<div class="home-v3-product-stat"><b>' +
      esc(value) + '</b><span>' + esc(label) + '</span></div>';
  }

  function trustItem(icon,title,copy) {
    return '<div class="home-v3-trust-item">' +
      '<div class="home-v3-trust-icon" aria-hidden="true">' +
      esc(icon) + '</div><div><b>' + esc(title) +
      '</b><span>' + esc(copy) + '</span></div></div>';
  }

  function step(number,title,copy,href,action) {
    return '<article class="home-v3-step">' +
      '<div class="home-v3-step-number">' + esc(number) + '</div>' +
      '<h3>' + esc(title) + '</h3><p>' + esc(copy) + '</p>' +
      '<a href="' + esc(href) + '">' + esc(action) + ' →</a>' +
    '</article>';
  }

  function mini(title,copy) {
    return '<div class="home-v3-mini"><b>' + esc(title) +
      '</b><span>' + esc(copy) + '</span></div>';
  }

  function showcaseScreen(id,label,title,copy,items,active) {
    return '<section class="home-v3-showcase-screen' +
      (active ? ' is-active' : '') + '" id="homeV3Screen-' +
      esc(id) + '" role="tabpanel" aria-labelledby="homeV3Tab-' +
      esc(id) + '" ' + (active ? '' : 'hidden') + '>' +
      '<small>' + esc(label) + '</small><h3>' + esc(title) +
      '</h3><p>' + esc(copy) + '</p><div class="home-v3-mini-grid">' +
      items.map(function (item) {
        return mini(item[0],item[1]);
      }).join('') +
      '</div></section>';
  }

  function audience(icon,title,copy,href,action) {
    return '<article class="home-v3-audience">' +
      '<div class="home-v3-audience-icon" aria-hidden="true">' +
      esc(icon) + '</div><h3>' + esc(title) + '</h3><p>' +
      esc(copy) + '</p><a href="' + esc(href) + '">' +
      esc(action) + ' →</a></article>';
  }

  function point(title,copy) {
    return '<div class="home-v3-point"><i aria-hidden="true"></i>' +
      '<div><b>' + esc(title) + '</b><span>' +
      esc(copy) + '</span></div></div>';
  }

  function trustLink(href,label) {
    return '<a class="home-v3-trust-card" href="' + esc(href) +
      '"><b>' + esc(label) + '</b><span aria-hidden="true">›</span></a>';
  }

  function faq(question,answer) {
    return '<article class="home-v3-faq">' +
      '<button type="button" data-home-v3-faq aria-expanded="false">' +
      '<span>' + esc(question) + '</span><span aria-hidden="true">+</span>' +
      '</button><div class="home-v3-faq-answer">' +
      esc(answer) + '</div></article>';
  }

  function pageMarkup() {
    return '<div class="page">' +
      window.header('home',window.innerWidth <= 767) +
      '<main class="home-v3-main" id="homeV3Main">' +

        '<section class="home-v3-section home-v3-hero">' +
          '<div class="home-v3-inner home-v3-hero-grid">' +
            '<div>' +
              '<span class="home-v3-eyebrow">Grassroots football intelligence</span>' +
              '<h1>Better player evidence. Better scouting context.</h1>' +
              '<p class="home-v3-hero-copy">ScoutLink helps grassroots coaches build structured U7–U16 player records from ratings, Match Facts, fixtures and approved video evidence, while reviewed scouts search, compare and shortlist players with clearer context.</p>' +
              '<div class="home-v3-actions">' +
                '<a class="home-v3-btn is-primary" href="/register/coach">Register as Coach</a>' +
                '<a class="home-v3-btn" href="/demo">Explore the Demo</a>' +
                '<a class="home-v3-btn is-outline" href="/register/scout">Request Scout Access</a>' +
              '</div>' +
              '<div class="home-v3-trust-strip">' +
                trustItem('CO','Coach-led profiles','Evidence starts with authorised adults and teams.') +
                trustItem('SC','Reviewed scout access','Player search is controlled rather than public.') +
                trustItem('SF','Safer visibility','Interest is handled through adult-led routes.') +
              '</div>' +
            '</div>' +

            '<article class="home-v3-product-card" aria-label="Fictional ScoutLink player-profile preview">' +
              '<div class="home-v3-preview-label">Fictional product preview</div>' +
              '<div class="home-v3-product-top">' +
                '<div class="home-v3-player-id"><div class="home-v3-avatar">EC</div>' +
                  '<div><b>Ethan Cole</b><span>ST · U16 · Northgate United</span></div></div>' +
                '<div class="home-v3-score-ring"><div class="home-v3-score-inner">' +
                  '<div><b>82</b><span>Compatibility</span></div>' +
                '</div></div>' +
              '</div>' +
              metric('Overall rating',78) +
              metric('Match evidence',84) +
              metric('Data confidence',72) +
              '<div class="home-v3-product-grid">' +
                productStat('5','Match Facts') +
                productStat('3','Video clips') +
                productStat('High','Coach evidence') +
              '</div>' +
              '<div class="home-v3-product-note">One structured record brings together coach ratings, match evidence, fixtures, physical context and visibility controls.</div>' +
            '</article>' +
          '</div>' +
        '</section>' +

        '<section class="home-v3-section is-alt">' +
          '<div class="home-v3-inner">' +
            '<div class="home-v3-section-head"><div>' +
              '<span class="home-v3-eyebrow">How ScoutLink works</span>' +
              '<h2>Three steps from football evidence to better context.</h2>' +
            '</div><p>ScoutLink gives coaches a simple evidence workflow and reviewed scouts a clearer way to assess fit.</p></div>' +
            '<div class="home-v3-steps">' +
              step('01','Coaches build evidence','Create player profiles, add Match Facts, organise fixtures and maintain approved video evidence in one structured workspace.','/coaches','Explore coach tools') +
              step('02','Reviewed scouts search by fit','Search and compare players using structured filters, player evidence and compatibility decision support.','/scouts','Explore scout tools') +
              step('03','Interest is handled safely','Player visibility and scout interest are routed through coaches, clubs, teams and appropriate adults.','/safeguarding','Read safeguarding') +
            '</div>' +
          '</div>' +
        '</section>' +

        '<section class="home-v3-section" id="product">' +
          '<div class="home-v3-inner home-v3-showcase">' +
            '<div class="home-v3-copy">' +
              '<span class="home-v3-eyebrow">Product intelligence</span>' +
              '<h2>The workflows scouts and coaches actually use.</h2>' +
              '<p>ScoutLink brings player profiles, compatibility scoring, scout search, Match Facts, fixtures, approved video evidence and recruitment pipelines into one evidence-led product.</p>' +
              '<a class="home-v3-btn is-outline" style="margin-top:18px" href="/demo">Explore the Demo</a>' +
            '</div>' +
            '<div class="home-v3-showcase-card">' +
              '<div class="home-v3-showcase-tabs" role="tablist" aria-label="ScoutLink product features">' +
                '<button class="home-v3-showcase-tab is-active" id="homeV3Tab-profile" type="button" role="tab" aria-selected="true" aria-controls="homeV3Screen-profile" data-home-v3-screen="profile">Player profile</button>' +
                '<button class="home-v3-showcase-tab" id="homeV3Tab-search" type="button" role="tab" aria-selected="false" aria-controls="homeV3Screen-search" tabindex="-1" data-home-v3-screen="search">Scout search</button>' +
                '<button class="home-v3-showcase-tab" id="homeV3Tab-match" type="button" role="tab" aria-selected="false" aria-controls="homeV3Screen-match" tabindex="-1" data-home-v3-screen="match">Match Facts</button>' +
                '<button class="home-v3-showcase-tab" id="homeV3Tab-pipeline" type="button" role="tab" aria-selected="false" aria-controls="homeV3Screen-pipeline" tabindex="-1" data-home-v3-screen="pipeline">Pipeline</button>' +
              '</div>' +
              showcaseScreen(
                'profile',
                'Player profile',
                'One structured record for the player.',
                'Ratings, Match Facts, fixtures, approved video evidence, physical context and data confidence sit together.',
                [['Ratings','Coach-led attributes'],['Match Facts','Game evidence'],['Video','Approved clips'],['Confidence','Evidence quality']],
                true
              ) +
              showcaseScreen(
                'search',
                'Scout search',
                'Find players through evidence, not noise.',
                'Filter by age group, position, location, physical context, overall rating, compatibility and evidence confidence.',
                [['Position','Role search'],['Location','Regional discovery'],['Compatibility','Fit signals'],['Confidence','Evidence depth']],
                false
              ) +
              showcaseScreen(
                'match',
                'Match Facts',
                'Record the match once. Improve every profile.',
                'One Match Fact updates appearances, goals, assists, ratings, discipline and evidence confidence.',
                [['Fixtures','Match schedule'],['Ratings','Performance context'],['Events','Goals and cards'],['Profiles','Automatic updates']],
                false
              ) +
              showcaseScreen(
                'pipeline',
                'Recruitment pipeline',
                'Shortlist and organise interest clearly.',
                'Move players through structured stages and communicate through controlled coach-mediated routes.',
                [['Watching','Initial review'],['Interested','Active interest'],['Shortlisted','Priority review'],['Approached','Coach-mediated']],
                false
              ) +
            '</div>' +
          '</div>' +
        '</section>' +

        '<section class="home-v3-section is-alt">' +
          '<div class="home-v3-inner">' +
            '<div class="home-v3-section-head"><div>' +
              '<span class="home-v3-eyebrow">Built around the player network</span>' +
              '<h2>Different roles, one shared evidence standard.</h2>' +
            '</div><p>Each user sees a workspace designed around their responsibilities while player evidence remains structured and controlled.</p></div>' +
            '<div class="home-v3-audiences">' +
              audience('CO','Coaches','Build player records, add match evidence, manage fixtures and respond to reviewed scout interest.','/coaches','For coaches') +
              audience('SC','Reviewed scouts','Search, compare and shortlist players using evidence, compatibility and recruitment workflows.','/scouts','For scouts') +
              audience('CL','Clubs and academies','Organise teams and player records around a consistent football evidence standard.','/coaches','Explore ScoutLink') +
              audience('FA','Parents and players','Understand how youth data, visibility, safeguarding and concern routes work.','/parents-players','Parent information') +
            '</div>' +
          '</div>' +
        '</section>' +

        '<section class="home-v3-section home-v3-compat">' +
          '<div class="home-v3-inner home-v3-compat-grid">' +
            '<div class="home-v3-copy">' +
              '<span class="home-v3-eyebrow">Compatibility scoring</span>' +
              '<h2>Evidence-led fit, explained clearly.</h2>' +
              '<p>ScoutLink combines team needs, role expectations, tactical style, formation, development pathway, Match Facts and evidence confidence to support scouting decisions with more context.</p>' +
              '<div class="home-v3-points">' +
                point('Decision support, not automatic selection','The score helps organise evidence and does not replace scout judgement.') +
                point('Visible contributing signals','Need fit, role fit and evidence confidence are shown separately.') +
                point('Built around the scout setup','Compatibility changes with team needs and role expectations.') +
              '</div>' +
              '<a class="home-v3-btn is-primary" style="margin-top:18px" href="/scoutlink/compatibility-score">Read the Compatibility Guide</a>' +
            '</div>' +

            '<article class="home-v3-compat-card" aria-label="Fictional compatibility-score preview">' +
              '<div class="home-v3-preview-label">Fictional compatibility preview</div>' +
              '<div class="home-v3-compat-top"><div><b>Carter Hill</b><span>ST · U16 · Northgate United</span></div>' +
                '<div class="home-v3-compat-score">82%<small>Strong fit</small></div></div>' +
              '<div class="home-v3-compat-row">' +
                '<div class="home-v3-metric-head"><span>Need fit</span><b>86</b></div>' +
                '<div class="home-v3-bar"><span style="width:86%"></span></div></div>' +
              '<div class="home-v3-compat-row">' +
                '<div class="home-v3-metric-head"><span>Role fit</span><b>78</b></div>' +
                '<div class="home-v3-bar"><span style="width:78%"></span></div></div>' +
              '<div class="home-v3-compat-row">' +
                '<div class="home-v3-metric-head"><span>Evidence confidence</span><b>72</b></div>' +
                '<div class="home-v3-bar"><span style="width:72%"></span></div></div>' +
              '<p>Strong role fit for a high-pressing U16 side that needs pace, finishing and transitional attacking output.</p>' +
            '</article>' +
          '</div>' +
        '</section>' +

        '<section class="home-v3-section home-v3-trust-section">' +
          '<div class="home-v3-inner home-v3-trust-layout">' +
            '<div><span class="home-v3-eyebrow is-dark">Trust and safeguarding</span>' +
              '<h2>Player visibility should never feel uncontrolled.</h2>' +
              '<p>Scout access is reviewed, player visibility is controlled, scout interest is coach-mediated and public concern routes remain easy to find.</p></div>' +
            '<div class="home-v3-trust-links">' +
              trustLink('/safeguarding','Safeguarding at ScoutLink') +
              trustLink('/parent-guardian-notice','Parent and Guardian Notice') +
              trustLink('/scout-verification','Scout Verification') +
              trustLink('/report-a-concern','Report a Concern') +
            '</div>' +
          '</div>' +
        '</section>' +

        '<section class="home-v3-section">' +
          '<div class="home-v3-inner">' +
            '<div class="home-v3-cta">' +
              '<div><span class="home-v3-eyebrow">Ready when your squad is</span>' +
                '<h2>Build better player evidence.</h2>' +
                '<p>Create a free coach account and begin organising structured, scout-ready player profiles.</p></div>' +
              '<div class="home-v3-cta-actions">' +
                '<a class="home-v3-btn is-primary" href="/register/coach">Register as Coach</a>' +
                '<a class="home-v3-btn" href="/demo">Explore Demo</a>' +
                '<a class="home-v3-btn is-outline" href="/register/scout">Request Scout Access</a>' +
              '</div>' +
            '</div>' +

            '<div class="home-v3-faq-heading">' +
              '<span class="home-v3-eyebrow">Common questions</span>' +
              '<h2>Before you start.</h2>' +
            '</div>' +
            '<div class="home-v3-faqs">' +
              faq(
                'Who is ScoutLink for?',
                'ScoutLink is built for grassroots coaches, reviewed football scouts, clubs, academies, parents and players who need clearer football evidence and safer visibility.'
              ) +
              faq(
                'Can anyone browse players?',
                'No. ScoutLink is not an open public directory of children. Player search is available through reviewed and controlled access.'
              ) +
              faq(
                'Does compatibility replace scout judgement?',
                'No. Compatibility organises team needs, player evidence and role context. Final decisions remain with football professionals.'
              ) +
              faq(
                'Does ScoutLink guarantee trials or signings?',
                'No. ScoutLink helps create better evidence and visibility for reviewed scouting consideration, but it does not guarantee outcomes.'
              ) +
            '</div>' +
          '</div>' +
        '</section>' +
      '</main>' +
      window.footer() +
    '</div>';
  }

  function activateScreen(id,focus) {
    var tabs = Array.prototype.slice.call(
      document.querySelectorAll('[data-home-v3-screen]')
    );
    var screens = Array.prototype.slice.call(
      document.querySelectorAll('.home-v3-showcase-screen')
    );

    tabs.forEach(function (tab) {
      var active = tab.getAttribute('data-home-v3-screen') === id;
      tab.classList.toggle('is-active',active);
      tab.setAttribute('aria-selected',active ? 'true' : 'false');
      tab.setAttribute('tabindex',active ? '0' : '-1');
      if (active && focus) tab.focus();
    });

    screens.forEach(function (screen) {
      var active = screen.id === 'homeV3Screen-' + id;
      screen.classList.toggle('is-active',active);
      screen.hidden = !active;
    });
  }

  function toggleFaq(button) {
    var faq = button.closest('.home-v3-faq');
    if (!faq) return;

    var open = !faq.classList.contains('is-open');
    faq.classList.toggle('is-open',open);
    button.setAttribute('aria-expanded',open ? 'true' : 'false');

    var indicator = button.querySelector('span:last-child');
    if (indicator) indicator.textContent = open ? '−' : '+';
  }

  function refreshMetadata() {
    document.body.classList.add('homepage-v3');
    document.title = 'ScoutLink | Grassroots Football Intelligence';

    var description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute(
        'content',
        'ScoutLink helps grassroots coaches build structured U7–U16 player evidence while reviewed football scouts search, compare and shortlist players with clearer context.'
      );
    }
  }

  window.homePage = function () {
    return pageMarkup();
  };

  refreshMetadata();

  document.addEventListener('click',function (event) {
    var tab = event.target.closest('[data-home-v3-screen]');
    if (tab) {
      activateScreen(tab.getAttribute('data-home-v3-screen'),false);
      return;
    }

    var faqButton = event.target.closest('[data-home-v3-faq]');
    if (faqButton) toggleFaq(faqButton);
  });

  document.addEventListener('keydown',function (event) {
    var tab = event.target.closest &&
      event.target.closest('[data-home-v3-screen]');

    if (tab && (
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight' ||
      event.key === 'Home' ||
      event.key === 'End'
    )) {
      event.preventDefault();

      var tabs = Array.prototype.slice.call(
        document.querySelectorAll('[data-home-v3-screen]')
      );
      var index = tabs.indexOf(tab);
      var nextIndex = index;

      if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = tabs.length - 1;

      activateScreen(
        tabs[nextIndex].getAttribute('data-home-v3-screen'),
        true
      );
    }
  });

  document.addEventListener('DOMContentLoaded',function () {
    refreshMetadata();
    activateScreen('profile',false);
  });
})();
