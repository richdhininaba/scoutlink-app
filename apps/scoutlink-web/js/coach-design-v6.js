'use strict';

(function () {
  if (window.__scoutlinkCoachV6ResponsiveShellGuard) return;
  window.__scoutlinkCoachV6ResponsiveShellGuard = true;

  document.documentElement.classList.add(
    'coach-v6-exact-source',
    'coach-v6-fluid-width'
  );

  /*
   * The V6 visual source was originally authored as a 1440px desktop design
   * board. The production Coach shell reuses the `.app` class from that source,
   * so the product inherits `.app { width: 1440px; }`.
   *
   * Keep the visual design exactly as-is, but make the production desktop shell
   * consume the real browser width. The 272px navigation rail remains fixed;
   * only the main workspace grows and shrinks with the available page width.
   *
   * Phone/Field is intentionally untouched. Its existing <=760px rule already
   * makes the phone shell 100% wide.
   */

  var style =
    document.getElementById('coachV6FullPageRailFix') ||
    document.createElement('style');

  style.id = 'coachV6FullPageRailFix';

  style.textContent = [
    '@media (min-width:761px){',

    '  html,',
    '  body{',
    '    width:100%;',
    '    max-width:none;',
    '  }',

    '  body.coach-product{',
    '    width:100%;',
    '    max-width:none;',
    '    overflow-x:hidden;',
    '  }',

    '  body.coach-product .coach-desk{',
    '    display:block!important;',
    '    width:100%;',
    '    max-width:none;',
    '    min-width:0;',
    '    min-height:100vh;',
    '  }',

    '  body.coach-product .coach-desk>.screen,',
    '  body.coach-product .coach-desk>.screen.app-shell{',
    '    width:100%!important;',
    '    max-width:none!important;',
    '    min-width:0;',
    '    min-height:100vh;',
    '    margin:0;',
    '    overflow:visible;',
    '  }',

    '  body.coach-product .coach-desk>.screen>.shell.app{',
    '    width:100%!important;',
    '    max-width:none!important;',
    '    min-width:0;',
    '    min-height:100vh;',
    '    align-items:stretch;',
    '  }',

    '  body.coach-product .coach-desk .rail-nav{',
    '    position:relative;',
    '    top:auto;',
    '    width:272px;',
    '    flex:0 0 272px;',
    '    height:auto;',
    '    min-height:100vh;',
    '    align-self:stretch;',
    '    overflow:visible;',
    '  }',

    '  body.coach-product .coach-desk .rail-scroll{',
    '    min-height:0;',
    '  }',

    '  body.coach-product .coach-desk .main{',
    '    flex:1 1 0;',
    '    width:auto!important;',
    '    max-width:none!important;',
    '    min-width:0;',
    '    min-height:100vh;',
    '  }',

    '  body.coach-product .coach-desk .main>.body,',
    '  body.coach-product .coach-desk #coachDeskPage{',
    '    width:100%;',
    '    max-width:none;',
    '    min-width:0;',
    '  }',

    /*
     * Wizard pages currently receive an inline max-width:1180px from
     * coach-v2.js. Override only that width cap; do not change wizard spacing,
     * cards, typography or behaviour.
     */
    '  body.coach-product.coach-v6-wizard .coach-desk>.screen{',
    '    width:100%!important;',
    '    max-width:none!important;',
    '  }',

    '  body.coach-product.coach-v6-wizard .coach-desk>.screen>.v6-wizard-shell{',
    '    width:100%!important;',
    '    max-width:none!important;',
    '    min-width:0;',
    '  }',

    '  body.coach-product.coach-v6-wizard .v6-wizard-content{',
    '    width:100%;',
    '    max-width:none;',
    '    min-width:0;',
    '  }',

    '  body.coach-product.coach-v6-wizard #coachDeskPage{',
    '    width:100%!important;',
    '    max-width:none!important;',
    '    min-width:0!important;',
    '  }',

    /*
     * Prevent large grids/cards from forcing the new fluid main column wider
     * than the viewport. Their existing grid definitions and visual design are
     * preserved.
     */
    '  body.coach-product .coach-desk .bento,',
    '  body.coach-product .coach-desk .quicklinks,',
    '  body.coach-product .coach-desk .card,',
    '  body.coach-product .coach-desk .body>*{',
    '    min-width:0;',
    '  }',

    '}'
  ].join('\n');

  if (!style.parentNode) {
    document.head.appendChild(style);
  }
}());
