'use strict';

(function () {
  if (window.__scoutlinkCoachV6ExactSourceGuard) return;
  window.__scoutlinkCoachV6ExactSourceGuard = true;

  document.documentElement.classList.add('coach-v6-exact-source');

  var existing = document.getElementById('coachV6FullPageRailFix');
  if (existing) return;

  var style = document.createElement('style');
  style.id = 'coachV6FullPageRailFix';
  style.textContent = [
    '@media (min-width:761px){',
    '  body.coach-product .coach-desk{min-height:100vh;}',
    '  body.coach-product .coach-desk>.screen{min-height:100vh;overflow:visible;}',
    '  body.coach-product .coach-desk>.screen>.shell.app{min-height:100vh;align-items:stretch;}',
    '  body.coach-product .coach-desk .rail-nav{',
    '    position:relative;',
    '    top:auto;',
    '    height:auto;',
    '    min-height:100vh;',
    '    align-self:stretch;',
    '    overflow:visible;',
    '  }',
    '  body.coach-product .coach-desk .rail-scroll{min-height:0;}',
    '  body.coach-product .coach-desk .main{min-height:100vh;}',
    '}'
  ].join('\n');

  document.head.appendChild(style);
}());
