/* ScoutLink Scout Experience V10 — exact source renderer
   Visual source of truth:
   ScoutLink_Scout_Experience_Full_Redesign_All_Pages_Desktop_and_Mobile_V10_Aligned_Profile_Row(2).html

   This file does not reinterpret the board. It mounts the exact desktop and
   mobile route markup from that file inside a Shadow DOM so older ScoutLink
   CSS cannot change its colours, spacing, typography or layout. The existing
   Scout Intelligence page remains in the light DOM as a functional bridge. */
(function () {
  'use strict';

  var VERSION = '20260729.10.0-exact-source';
  var CSS_URL = '/frontend/css/scout-experience-v8.css?v=' + encodeURIComponent(VERSION);
  var API_FALLBACK = 'https://scoutlink-api.vercel.app';
  var SEARCH_PAGE_SIZE = 20;
  var DEMO_CHAT_KEY = 'sl_scout_v10_exact_demo_chat';
  var DEMO_NOTIFICATION_KEY = 'sl_scout_v10_exact_demo_notifications';
  var TEMPLATES = {"onboarding1":{"desktop":"<div class=\"desktop-site\"><div class=\"onboarding-app\">\n<header class=\"onboarding-header\"><div><a><span class=\"sl-logo\">Scout<span>Link</span></span></a><a>Need help?</a></div></header>\n<main class=\"onboarding-layout\">\n<aside class=\"onboarding-aside\">\n<span>Reviewed scout onboarding</span>\n<h1>Secure the account and define what the team needs.</h1>\n<p>The information entered here shapes player ordering, compatibility, comparisons and predictions.</p>\n<div class=\"onboard-steps\">\n<article class=\"onboard-step active\"><span>1</span><div><b>Create password</b><small>Current step</small></div></article><article class=\"onboard-step\"><span>2</span><div><b>Team context</b><small>Not started</small></div></article><article class=\"onboard-step\"><span>3</span><div><b>Recruitment brief</b><small>Not started</small></div></article>\n</div>\n</aside>\n<section class=\"onboarding-main\">\n<header class=\"onboarding-title\"><span>Step 1 of 3</span><h2>Create your ScoutLink password.</h2><p>The account email was verified through the secure invitation link.</p></header>\n<div class=\"form-grid cols-2\" style=\"margin-top:22px\">\n<label class=\"field\"><span>New password<em>Required</em></span><div class=\"control\">••••••••••••</div></label>\n<label class=\"field\"><span>Confirm password<em>Required</em></span><div class=\"control\">••••••••••••</div></label>\n</div>\n<div class=\"password-rules\"><article><b>12 characters</b><span>Minimum eight</span></article><article><b>Upper and lower case</b><span>Included</span></article><article><b>Number or symbol</b><span>Included</span></article></div>\n<div class=\"recommendation\" style=\"margin-top:22px\"><b>Email verified</b><br/>The verified address remains connected to this reviewed Scout account.</div>\n<footer class=\"onboarding-actions\"><span>Password strength: strong</span><div class=\"button-row\"><button class=\"btn primary\" type=\"button\">Continue to team context</button></div></footer>\n</section></main>\n</div></div>","mobile":"<div class=\"mobile-site\"><div class=\"scout-app mobile-app\">\n<header class=\"mobile-topbar\">\n<a><span class=\"sl-logo\">Scout<span>Link</span></span></a>\n<strong>Scout onboarding</strong>\n<button>Menu</button>\n</header>\n<main class=\"mobile-content\">\n<section class=\"mobile-step-summary\"><span>Reviewed scout setup</span><h2>Build the recruitment context once.</h2><p>The same brief will shape search, compatibility, comparisons and predictions.</p></section>\n<section class=\"mobile-progress-list\"><article class=\"active\"><span>1</span><div><b>Create password</b><small>Current step</small></div></article><article class=\"\"><span>2</span><div><b>Team context</b><small>Next</small></div></article><article class=\"\"><span>3</span><div><b>Recruitment brief</b><small>Next</small></div></article></section>\n<section class=\"mobile-form-card\"><header><span>Step 1 of 3</span><h3>Create your password.</h3><p>The account email has already been verified.</p></header>\n<label class=\"field\"><span>New password<em>Required</em></span><div class=\"control\">••••••••••••</div></label><label class=\"field\"><span>Confirm password<em>Required</em></span><div class=\"control\">••••••••••••</div></label>\n<div class=\"password-rules\" style=\"grid-template-columns:1fr;margin-top:17px\"><article><b>12 characters</b><span>Minimum eight</span></article><article><b>Upper and lower case</b><span>Included</span></article><article><b>Number or symbol</b><span>Included</span></article></div>\n<div class=\"button-row mobile-primary-actions\"><button class=\"btn primary\" type=\"button\">Continue to team context</button></div></section>\n</main>\n</div></div>"},"onboarding2":{"desktop":"<div class=\"desktop-site\"><div class=\"onboarding-app\">\n<header class=\"onboarding-header\"><div><a><span class=\"sl-logo\">Scout<span>Link</span></span></a><a>Need help?</a></div></header>\n<main class=\"onboarding-layout\">\n<aside class=\"onboarding-aside\">\n<span>Reviewed scout onboarding</span>\n<h1>Secure the account and define what the team needs.</h1>\n<p>The information entered here shapes player ordering, compatibility, comparisons and predictions.</p>\n<div class=\"onboard-steps\">\n<article class=\"onboard-step done\"><span>✓</span><div><b>Create password</b><small>Complete</small></div></article><article class=\"onboard-step active\"><span>2</span><div><b>Team context</b><small>Current step</small></div></article><article class=\"onboard-step\"><span>3</span><div><b>Recruitment brief</b><small>Not started</small></div></article>\n</div>\n</aside>\n<section class=\"onboarding-main\">\n<header class=\"onboarding-title\"><span>Step 2 of 3</span><h2>Confirm the team context.</h2><p>These fields define the recruitment environment used across ScoutLink.</p></header>\n<div class=\"form-grid cols-2\" style=\"margin-top:20px\">\n<label class=\"field\"><span>Team name<em>Required</em></span><div class=\"control\">ScoutLink Recruitment Team</div></label>\n<label class=\"field\"><span>Club or organisation<em>Required</em></span><div class=\"control\">Stratex Demo FC</div></label>\n<label class=\"field\"><span>Scout country<em>Required</em></span><div class=\"control select\">England<i>⌄</i></div></label>\n<label class=\"field\"><span>Scout region<em>Required</em></span><div class=\"control select\">London<i>⌄</i></div></label>\n<label class=\"field\"><span>Primary formation<em>Required</em></span><div class=\"control select\">4-3-3<i>⌄</i></div></label>\n<label class=\"field\"><span>Playing style<em>Required</em></span><div class=\"control select\">Possession and high press<i>⌄</i></div></label>\n</div>\n<div class=\"recommendation\" style=\"margin-top:22px\"><b>Why this matters</b><br/>Compatibility needs team, formation and playing-style context before it can explain player fit.</div>\n<footer class=\"onboarding-actions\"><span>Step 1 saved</span><div class=\"button-row\"><button class=\"btn secondary\" type=\"button\">Back</button><button class=\"btn primary\" type=\"button\">Continue to recruitment brief</button></div></footer>\n</section></main>\n</div></div>","mobile":"<div class=\"mobile-site\"><div class=\"scout-app mobile-app\">\n<header class=\"mobile-topbar\">\n<a><span class=\"sl-logo\">Scout<span>Link</span></span></a>\n<strong>Scout onboarding</strong>\n<button>Menu</button>\n</header>\n<main class=\"mobile-content\">\n<section class=\"mobile-step-summary\"><span>Reviewed scout setup</span><h2>Build the recruitment context once.</h2><p>The same brief will shape search, compatibility, comparisons and predictions.</p></section>\n<section class=\"mobile-progress-list\"><article class=\"done\"><span>✓</span><div><b>Create password</b><small>Complete</small></div></article><article class=\"active\"><span>2</span><div><b>Team context</b><small>Current step</small></div></article><article class=\"\"><span>3</span><div><b>Recruitment brief</b><small>Next</small></div></article></section>\n<section class=\"mobile-form-card\"><header><span>Step 2 of 3</span><h3>Confirm the team context.</h3><p>ScoutLink uses this to explain fit rather than returning a generic score.</p></header>\n<label class=\"field\"><span>Team name<em>Required</em></span><div class=\"control\">ScoutLink Recruitment Team</div></label><label class=\"field\"><span>Club or organisation<em>Required</em></span><div class=\"control\">Stratex Demo FC</div></label><label class=\"field\"><span>Scout country<em>Required</em></span><div class=\"control select\">England<i>⌄</i></div></label><label class=\"field\"><span>Scout region<em>Required</em></span><div class=\"control select\">London<i>⌄</i></div></label><label class=\"field\"><span>Primary formation<em>Required</em></span><div class=\"control select\">4-3-3<i>⌄</i></div></label><label class=\"field\"><span>Playing style<em>Required</em></span><div class=\"control select\">Possession and high press<i>⌄</i></div></label>\n<div class=\"button-row\"><button class=\"btn primary\" type=\"button\">Continue to recruitment brief</button><button class=\"btn secondary\" type=\"button\">Back</button></div></section>\n</main>\n</div></div>"},"onboarding3":{"desktop":"<div class=\"desktop-site\"><div class=\"onboarding-app\">\n<header class=\"onboarding-header\"><div><a><span class=\"sl-logo\">Scout<span>Link</span></span></a><a>Need help?</a></div></header>\n<main class=\"onboarding-layout\">\n<aside class=\"onboarding-aside\">\n<span>Reviewed scout onboarding</span>\n<h1>Secure the account and define what the team needs.</h1>\n<p>The information entered here shapes player ordering, compatibility, comparisons and predictions.</p>\n<div class=\"onboard-steps\">\n<article class=\"onboard-step done\"><span>✓</span><div><b>Create password</b><small>Complete</small></div></article><article class=\"onboard-step done\"><span>✓</span><div><b>Team context</b><small>Complete</small></div></article><article class=\"onboard-step active\"><span>3</span><div><b>Recruitment brief</b><small>Current step</small></div></article>\n</div>\n</aside>\n<section class=\"onboarding-main\">\n<header class=\"onboarding-title\"><span>Step 3 of 3</span><h2>Set the recruitment brief.</h2><p>Select only the factors that should materially change a recruitment decision.</p></header>\n<section class=\"preference-block\"><header><h3>Team weaknesses</h3><span>Select up to 3</span></header><div class=\"choice-grid\"><button class=\"choice selected\" type=\"button\"><span>✓</span><b>Insufficient game pace and speed</b></button><button class=\"choice\" type=\"button\"><span></span><b>Physical fragility and injury risk</b></button><button class=\"choice\" type=\"button\"><span></span><b>Lack of physical presence</b></button><button class=\"choice\" type=\"button\"><span></span><b>Weak defensive base</b></button><button class=\"choice\" type=\"button\"><span></span><b>Poor defensive output</b></button><button class=\"choice selected\" type=\"button\"><span>✓</span><b>Low team chemistry and leadership</b></button><button class=\"choice\" type=\"button\"><span></span><b>Technical deficiencies under pressure</b></button><button class=\"choice selected\" type=\"button\"><span>✓</span><b>Tactical awareness gaps</b></button><button class=\"choice\" type=\"button\"><span></span><b>Poor goal output</b></button></div></section>\n<section class=\"preference-block\"><header><h3>Role expectations</h3><span>Select up to 3</span></header><div class=\"choice-grid\"><button class=\"choice\" type=\"button\"><span></span><b>Aerial dominance</b></button><button class=\"choice selected\" type=\"button\"><span>✓</span><b>Vision and creativity</b></button><button class=\"choice\" type=\"button\"><span></span><b>Speed and agility</b></button><button class=\"choice selected\" type=\"button\"><span>✓</span><b>Tactical intelligence</b></button><button class=\"choice\" type=\"button\"><span></span><b>Ball retention under pressure</b></button><button class=\"choice\" type=\"button\"><span></span><b>Physical resilience and work rate</b></button><button class=\"choice\" type=\"button\"><span></span><b>Defensive impact</b></button><button class=\"choice\" type=\"button\"><span></span><b>Offensive impact</b></button><button class=\"choice\" type=\"button\"><span></span><b>Progression and carrying</b></button><button class=\"choice selected\" type=\"button\"><span>✓</span><b>Leadership and communication</b></button></div></section>\n<section class=\"preference-block\"><header><h3>Long-term goals</h3><span>Select up to 3</span></header><div class=\"choice-grid\"><button class=\"choice\" type=\"button\"><span></span><b>Physical growth potential</b></button><button class=\"choice selected\" type=\"button\"><span>✓</span><b>Tactical role maturity</b></button><button class=\"choice\" type=\"button\"><span></span><b>Leadership and coachability</b></button><button class=\"choice\" type=\"button\"><span></span><b>Injury risk and resilience</b></button><button class=\"choice selected\" type=\"button\"><span>✓</span><b>Positional depth advantage</b></button><button class=\"choice\" type=\"button\"><span></span><b>Goal contribution potential</b></button><button class=\"choice selected\" type=\"button\"><span>✓</span><b>Financial viability</b></button></div></section>\n<section class=\"preference-block\"><header><h3>Search preferences</h3></header><div class=\"chip-grid\"><button class=\"chip\">U7</button><button class=\"chip\">U8</button><button class=\"chip\">U9</button><button class=\"chip\">U10</button><button class=\"chip\">U11</button><button class=\"chip\">U12</button><button class=\"chip\">U13</button><button class=\"chip\">U14</button><button class=\"chip active\">U15</button><button class=\"chip active\">U16</button></div><div class=\"chip-grid\"><button class=\"chip active\">GK</button><button class=\"chip active\">CB</button><button class=\"chip\">RB</button><button class=\"chip\">LB</button><button class=\"chip\">CDM</button><button class=\"chip\">CM</button><button class=\"chip active\">CAM</button><button class=\"chip\">LW</button><button class=\"chip\">RW</button><button class=\"chip active\">ST</button></div></section>\n<footer class=\"onboarding-actions\"><span>The brief can be edited later in Scout setup.</span><div class=\"button-row\"><button class=\"btn secondary\" type=\"button\">Back</button><button class=\"btn primary\" type=\"button\">Save setup and open dashboard</button></div></footer>\n</section></main>\n</div></div>","mobile":"<div class=\"mobile-site\"><div class=\"scout-app mobile-app\">\n<header class=\"mobile-topbar\">\n<a><span class=\"sl-logo\">Scout<span>Link</span></span></a>\n<strong>Scout onboarding</strong>\n<button>Menu</button>\n</header>\n<main class=\"mobile-content\">\n<section class=\"mobile-step-summary\"><span>Reviewed scout setup</span><h2>Build the recruitment context once.</h2><p>The same brief will shape search, compatibility, comparisons and predictions.</p></section>\n<section class=\"mobile-progress-list\"><article class=\"done\"><span>✓</span><div><b>Create password</b><small>Complete</small></div></article><article class=\"done\"><span>✓</span><div><b>Team context</b><small>Complete</small></div></article><article class=\"active\"><span>3</span><div><b>Recruitment brief</b><small>Current step</small></div></article></section>\n<section class=\"mobile-form-card\"><header><span>Step 3 of 3</span><h3>Set the recruitment brief.</h3><p>Choose the factors that should materially affect player fit.</p></header>\n<section class=\"preference-block\"><header><h3>Team weaknesses</h3><span>3 selected</span></header><div class=\"choice-grid\"><button class=\"choice selected\" type=\"button\"><span>✓</span><b>Insufficient game pace</b></button><button class=\"choice\" type=\"button\"><span></span><b>Physical resilience</b></button><button class=\"choice selected\" type=\"button\"><span>✓</span><b>Weak defensive base</b></button><button class=\"choice\" type=\"button\"><span></span><b>Low chemistry and leadership</b></button><button class=\"choice selected\" type=\"button\"><span>✓</span><b>Tactical awareness gaps</b></button></div></section>\n<section class=\"preference-block\"><header><h3>Role expectations</h3><span>3 selected</span></header><div class=\"choice-grid\"><button class=\"choice selected\" type=\"button\"><span>✓</span><b>Vision and creativity</b></button><button class=\"choice\" type=\"button\"><span></span><b>Speed and agility</b></button><button class=\"choice selected\" type=\"button\"><span>✓</span><b>Tactical intelligence</b></button><button class=\"choice\" type=\"button\"><span></span><b>Defensive impact</b></button><button class=\"choice selected\" type=\"button\"><span>✓</span><b>Leadership and communication</b></button></div></section>\n<section class=\"preference-block\"><header><h3>Age groups</h3></header><div class=\"chip-grid\"><button class=\"chip\">U12</button><button class=\"chip\">U13</button><button class=\"chip\">U14</button><button class=\"chip active\">U15</button><button class=\"chip active\">U16</button></div></section>\n<div class=\"button-row\"><button class=\"btn primary\" type=\"button\">Save setup and open dashboard</button><button class=\"btn secondary\" type=\"button\">Back</button></div></section>\n</main>\n</div></div>"},"dashboard":{"desktop":"<div class=\"desktop-site\"><div class=\"scout-app desktop-app\">\n<div class=\"desktop-shell\">\n<aside class=\"scout-sidebar\">\n<a class=\"sidebar-logo\"><span class=\"sl-logo\">Scout<span>Link</span></span></a>\n<nav><section class=\"nav-group\"><small>Core</small><a class=\"nav-link active\"><span>DB</span><b>Dashboard</b></a><a class=\"nav-link\"><span>PS</span><b>Player search</b></a><a class=\"nav-link\"><span>MP</span><b>My pipeline</b></a><a class=\"nav-link\"><span>RK</span><b>Rankings</b></a></section><section class=\"nav-group\"><small>Scouting tools</small><a class=\"nav-link\"><span>FX</span><b>Fixtures</b></a><a class=\"nav-link\"><span>PR</span><b>Predictions</b></a><a class=\"nav-link\"><span>EX</span><b>Exports</b></a><a class=\"nav-link\"><span>CP</span><b>Compare players</b></a><a class=\"nav-link\"><span>SS</span><b>Scout setup</b></a></section><section class=\"nav-group\"><small>Network</small><a class=\"nav-link\"><span>EV</span><b>Events</b></a><a class=\"nav-link\"><span>CH</span><b>Chat</b></a><a class=\"nav-link\"><span>NT</span><b>Notifications</b></a><a class=\"nav-link\"><span>RC</span><b>Report a concern</b></a></section><section class=\"nav-group\"><small>Account</small><a class=\"nav-link\"><span>UR</span><b>Usage requests</b></a><a class=\"nav-link\"><span>ST</span><b>Settings</b></a></section></nav>\n<div class=\"sidebar-user\">\n<span class=\"initials-box\">NP</span>\n<div><b>Noah Patel</b><small>Reviewed Scout · Elite</small></div>\n</div>\n</aside>\n<section class=\"workspace\">\n<header class=\"desktop-topbar\">\n<div><span>Scout workspace</span><h1>Scout workspace</h1></div>\n<div class=\"top-actions\">\n<button class=\"icon-btn\">NT<i>3</i></button>\n<span class=\"team-chip\">ScoutLink Recruitment Team</span>\n<button class=\"user-btn\"><span class=\"initials-box small\">NP</span><b>Noah</b></button>\n</div>\n</header>\n<main class=\"workspace-content\">\n<section class=\"page-hero navy\">\n<div><span>Elite scout workspace</span><h2>Good morning, Noah.</h2><p>Review the accessible player database, active pipeline, allowances and the next live-scouting priority from one decision-focused workspace.</p></div>\n<div class=\"button-row hero-actions\"><button class=\"btn primary\" type=\"button\">Review compatible players</button><button class=\"btn ghost\" type=\"button\">Open fixtures</button></div>\n</section>\n<section class=\"metric-strip three\"><article><small>Players in system</small><strong>56</strong><p>Current accessible Supabase dataset</p></article><article><small>Active pipeline</small><strong>7</strong><p>Registered player interests</p></article><article><small>Current plan</small><strong>Elite</strong><p>Team allowances and collaboration</p></article></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Most compatible players</h3><p>Highest current compatibility against the saved recruitment brief</p></div>\n<button class=\"btn secondary\" type=\"button\">View all players</button>\n</header>\n<div class=\"panel-body\"><div class=\"compatible-head\"><span>Player</span><span>Fit</span><span>Evidence</span><span>Rating</span><span></span></div><div class=\"compatible-row\"><div class=\"player-cell\"><span class=\"initials-box\">EC</span><div><b>Ethan Cole</b><small>ST · U16 · Northgate United</small></div></div><strong>86%</strong><span class=\"status green\">Strong</span><span>84</span><button class=\"text-action\">Review</button></div><div class=\"compatible-row\"><div class=\"player-cell\"><span class=\"initials-box\">CH</span><div><b>Carter Hill</b><small>RW · U16 · Northgate United</small></div></div><strong>83%</strong><span class=\"status green\">Strong</span><span>82</span><button class=\"text-action\">Review</button></div><div class=\"compatible-row\"><div class=\"player-cell\"><span class=\"initials-box\">MJ</span><div><b>Maya Johnson</b><small>CAM · U15 · Eastbrook Athletic</small></div></div><strong>81%</strong><span class=\"status gold\">Medium</span><span>80</span><button class=\"text-action\">Review</button></div><div class=\"compatible-row\"><div class=\"player-cell\"><span class=\"initials-box\">AK</span><div><b>Amir Khan</b><small>CB · U16 · Harbour City Academy</small></div></div><strong>80%</strong><span class=\"status green\">Strong</span><span>78</span><button class=\"text-action\">Review</button></div><div class=\"compatible-row\"><div class=\"player-cell\"><span class=\"initials-box\">LM</span><div><b>Leo Martins</b><small>CM · U14 · Southvale Juniors</small></div></div><strong>78%</strong><span class=\"status gold\">Medium</span><span>76</span><button class=\"text-action\">Review</button></div></div></section>\n<div class=\"two-col\">\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Usage and limits</h3><p>One allowance source across predictions, exports and pipeline interests</p></div>\n<button class=\"btn secondary\" type=\"button\">Usage requests</button>\n</header>\n<div class=\"panel-body\"><div class=\"allowance-list\">\n<article class=\"allowance\">\n<div><small>Predictions</small><b>30 of 60 used</b><span>30 remaining</span></div>\n<i><em style=\"width:50%\"></em></i>\n</article>\n<article class=\"allowance\">\n<div><small>Exports</small><b>4 of 300 used</b><span>296 remaining</span></div>\n<i><em style=\"width:1%\"></em></i>\n</article>\n<article class=\"allowance\">\n<div><small>Pipeline interests</small><b>7 of 300 used</b><span>293 remaining</span></div>\n<i><em style=\"width:2%\"></em></i>\n</article>\n</div></div></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Upcoming live-scouting priority</h3><p>The next fixture connected to a pipeline player</p></div>\n</header>\n<div class=\"panel-body\"><article class=\"priority-fixture\"><span>Recommended visit</span><h4>Ethan Cole vs Westhaven Development XI</h4><p>Strong compatibility, current evidence and an upcoming chance to validate movement against a compact defence.</p><div class=\"priority-facts\"><div><small>Date</small><b>2 August 2026</b></div><div><small>Kick-off</small><b>10:30</b></div><div><small>Venue</small><b>Northgate Training Ground</b></div><div><small>Pipeline stage</small><b>Shortlisted</b></div></div><div class=\"button-row\"><button class=\"btn white\" type=\"button\">Plan visit</button><button class=\"btn ghost\" type=\"button\">Open player</button></div></article></div></section>\n</div>\n</main>\n</section>\n</div>\n</div></div>","mobile":"<div class=\"mobile-site\"><div class=\"scout-app mobile-app\">\n<header class=\"mobile-topbar\">\n<a><span class=\"sl-logo\">Scout<span>Link</span></span></a>\n<strong>Dashboard</strong>\n<button>Menu</button>\n</header>\n<main class=\"mobile-content\">\n<section class=\"page-hero navy\">\n<div><span>Elite scout workspace</span><h2>Good morning, Noah.</h2><p>Review players, allowances and the next live-scouting action without compressed dashboard widgets.</p></div>\n<div class=\"button-row hero-actions\"><button class=\"btn white\" type=\"button\">Review compatible players</button><button class=\"btn ghost\" type=\"button\">Open fixtures</button></div>\n</section>\n<section class=\"metric-strip\"><article><small>Players in system</small><strong>56</strong><p>Accessible player records</p></article><article><small>Active pipeline</small><strong>7</strong><p>Across the recruitment stages</p></article><article><small>Current plan</small><strong>Elite</strong><p>Team allowances enabled</p></article></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Compatible player list</h3><p>Five players currently match the saved brief</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"compatible-mobile-list\">\n<button class=\"mobile-list-row\" type=\"button\">\n<span class=\"initials-box\">EC</span>\n<div><h4>Ethan Cole</h4><p>ST · U16 · Northgate United</p><small>Strong evidence · Rating 84</small></div>\n<strong>86%</strong>\n<i>›</i>\n</button>\n<button class=\"mobile-list-row\" type=\"button\">\n<span class=\"initials-box\">CH</span>\n<div><h4>Carter Hill</h4><p>RW · U16 · Northgate United</p><small>Strong evidence · Rating 82</small></div>\n<strong>83%</strong>\n<i>›</i>\n</button>\n<button class=\"mobile-list-row\" type=\"button\">\n<span class=\"initials-box\">MJ</span>\n<div><h4>Maya Johnson</h4><p>CAM · U15 · Eastbrook Athletic</p><small>Medium evidence · Rating 80</small></div>\n<strong>81%</strong>\n<i>›</i>\n</button>\n<button class=\"mobile-list-row\" type=\"button\">\n<span class=\"initials-box\">AK</span>\n<div><h4>Amir Khan</h4><p>CB · U16 · Harbour City Academy</p><small>Strong evidence · Rating 78</small></div>\n<strong>80%</strong>\n<i>›</i>\n</button>\n<button class=\"mobile-list-row\" type=\"button\">\n<span class=\"initials-box\">LM</span>\n<div><h4>Leo Martins</h4><p>CM · U14 · Southvale Juniors</p><small>Medium evidence · Rating 76</small></div>\n<strong>78%</strong>\n<i>›</i>\n</button>\n</div></div></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Usage and limits</h3><p>Current team allowance</p></div>\n<button class=\"btn secondary\" type=\"button\">Open usage requests</button>\n</header>\n<div class=\"panel-body\"><div class=\"allowance-list\">\n<article class=\"allowance\">\n<div><small>Predictions</small><b>30 of 60 used</b><span>30 remaining</span></div>\n<i><em style=\"width:50%\"></em></i>\n</article>\n<article class=\"allowance\">\n<div><small>Exports</small><b>4 of 300 used</b><span>296 remaining</span></div>\n<i><em style=\"width:1%\"></em></i>\n</article>\n<article class=\"allowance\">\n<div><small>Pipeline interests</small><b>7 of 300 used</b><span>293 remaining</span></div>\n<i><em style=\"width:2%\"></em></i>\n</article>\n</div></div></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Next live-scouting priority</h3><p>The clearest upcoming player observation</p></div>\n</header>\n<div class=\"panel-body\"><article class=\"priority-fixture\"><span>Recommended visit</span><h4>Ethan Cole vs Westhaven Development XI</h4><p>2 August 2026 · 10:30 · Northgate Training Ground</p><div class=\"priority-facts\"><div><small>Fit</small><b>86%</b></div><div><small>Stage</small><b>Shortlisted</b></div></div><div class=\"button-row\"><button class=\"btn white\" type=\"button\">Plan visit</button><button class=\"btn ghost\" type=\"button\">Open player</button></div></article></div></section>\n</main>\n<nav class=\"mobile-nav\"><a class=\"active\"><span>HM</span><b>Home</b></a><a class=\"\"><span>PS</span><b>Search</b></a><a class=\"\"><span>MP</span><b>Pipeline</b></a><a class=\"\"><span>CH</span><b>Chat</b></a><a class=\"\"><span>MR</span><b>More</b></a></nav>\n</div></div>"},"search":{"desktop":"<div class=\"desktop-site\"><div class=\"scout-app desktop-app\">\n<div class=\"desktop-shell\">\n<aside class=\"scout-sidebar\">\n<a class=\"sidebar-logo\"><span class=\"sl-logo\">Scout<span>Link</span></span></a>\n<nav><section class=\"nav-group\"><small>Core</small><a class=\"nav-link\"><span>DB</span><b>Dashboard</b></a><a class=\"nav-link active\"><span>PS</span><b>Player search</b></a><a class=\"nav-link\"><span>MP</span><b>My pipeline</b></a><a class=\"nav-link\"><span>RK</span><b>Rankings</b></a></section><section class=\"nav-group\"><small>Scouting tools</small><a class=\"nav-link\"><span>FX</span><b>Fixtures</b></a><a class=\"nav-link\"><span>PR</span><b>Predictions</b></a><a class=\"nav-link\"><span>EX</span><b>Exports</b></a><a class=\"nav-link\"><span>CP</span><b>Compare players</b></a><a class=\"nav-link\"><span>SS</span><b>Scout setup</b></a></section><section class=\"nav-group\"><small>Network</small><a class=\"nav-link\"><span>EV</span><b>Events</b></a><a class=\"nav-link\"><span>CH</span><b>Chat</b></a><a class=\"nav-link\"><span>NT</span><b>Notifications</b></a><a class=\"nav-link\"><span>RC</span><b>Report a concern</b></a></section><section class=\"nav-group\"><small>Account</small><a class=\"nav-link\"><span>UR</span><b>Usage requests</b></a><a class=\"nav-link\"><span>ST</span><b>Settings</b></a></section></nav>\n<div class=\"sidebar-user\">\n<span class=\"initials-box\">NP</span>\n<div><b>Noah Patel</b><small>Reviewed Scout · Elite</small></div>\n</div>\n</aside>\n<section class=\"workspace\">\n<header class=\"desktop-topbar\">\n<div><span>Scout workspace</span><h1>Player search</h1></div>\n<div class=\"top-actions\">\n<button class=\"icon-btn\">NT<i>3</i></button>\n<span class=\"team-chip\">ScoutLink Recruitment Team</span>\n<button class=\"user-btn\"><span class=\"initials-box small\">NP</span><b>Noah</b></button>\n</div>\n</header>\n<main class=\"workspace-content\">\n<section class=\"page-hero navy\">\n<div><span>Player discovery</span><h2>Search the full player database.</h2><p>Every accessible player appears before a search is run. Natural-language and football filters narrow the same live dataset.</p></div>\n</section>\n<section class=\"filter-workbench\">\n<div class=\"filters\"><label class=\"field\"><span>Position</span><div class=\"control select\">All positions<i>⌄</i></div></label><label class=\"field\"><span>Age group</span><div class=\"control select\">All ages<i>⌄</i></div></label><label class=\"field\"><span>Region</span><div class=\"control select\">All regions<i>⌄</i></div></label><label class=\"field\"><span>Evidence</span><div class=\"control select\">Any evidence<i>⌄</i></div></label><label class=\"field\"><span>Sort by</span><div class=\"control select\">Best match<i>⌄</i></div></label><button class=\"btn secondary\" type=\"button\">Clear filters</button></div>\n<div class=\"active-filter-row\"><span class=\"filter-chip\">All players</span><span class=\"filter-chip\">Table view</span><span class=\"filter-chip\">20 per page</span></div>\n</section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>All players</h3><p>56 accessible players · Showing the first 20</p></div>\n</header>\n<div class=\"panel-body\" style=\"padding:0\"><div class=\"data-table\"><div class=\"data-head search-table-head\"><span>Player</span><span>Region</span><span>Fit</span><span>Evidence</span><span>Rating</span><span>Value</span><span></span></div><div class=\"search-data-row\"><div class=\"player-cell\"><span class=\"initials-box\">EC</span><div><b>Ethan Cole</b><small>ST · U16 · Northgate United</small></div></div><span>London</span><strong>86%</strong><span class=\"status green\">Strong</span><span>84</span><span>£160k</span><button class=\"text-action\">View profile</button></div><div class=\"search-data-row\"><div class=\"player-cell\"><span class=\"initials-box\">CH</span><div><b>Carter Hill</b><small>RW · U16 · Northgate United</small></div></div><span>London</span><strong>83%</strong><span class=\"status green\">Strong</span><span>82</span><span>£145k</span><button class=\"text-action\">View profile</button></div><div class=\"search-data-row\"><div class=\"player-cell\"><span class=\"initials-box\">MJ</span><div><b>Maya Johnson</b><small>CAM · U15 · Eastbrook Athletic</small></div></div><span>Manchester</span><strong>81%</strong><span class=\"status gold\">Medium</span><span>80</span><span>£128k</span><button class=\"text-action\">View profile</button></div><div class=\"search-data-row\"><div class=\"player-cell\"><span class=\"initials-box\">AK</span><div><b>Amir Khan</b><small>CB · U16 · Harbour City Academy</small></div></div><span>Liverpool</span><strong>80%</strong><span class=\"status green\">Strong</span><span>78</span><span>£110k</span><button class=\"text-action\">View profile</button></div><div class=\"search-data-row\"><div class=\"player-cell\"><span class=\"initials-box\">LM</span><div><b>Leo Martins</b><small>CM · U14 · Southvale Juniors</small></div></div><span>Bristol</span><strong>78%</strong><span class=\"status gold\">Medium</span><span>76</span><span>£92k</span><button class=\"text-action\">View profile</button></div><div class=\"search-data-row\"><div class=\"player-cell\"><span class=\"initials-box\">DO</span><div><b>Daniel Okoro</b><small>LB · U15 · Meadow Park Rovers</small></div></div><span>Manchester</span><strong>76%</strong><span class=\"status gold\">Medium</span><span>74</span><span>£84k</span><button class=\"text-action\">View profile</button></div><div class=\"search-data-row\"><div class=\"player-cell\"><span class=\"initials-box\">OP</span><div><b>Owen Price</b><small>GK · U14 · Northbridge Athletic</small></div></div><span>London</span><strong>75%</strong><span class=\"status green\">Strong</span><span>73</span><span>£80k</span><button class=\"text-action\">View profile</button></div><div class=\"search-data-row\"><div class=\"player-cell\"><span class=\"initials-box\">SW</span><div><b>Samuel Wright</b><small>CDM · U13 · Oakwood Youth</small></div></div><span>Birmingham</span><strong>73%</strong><span class=\"status gold\">Medium</span><span>71</span><span>£69k</span><button class=\"text-action\">View profile</button></div></div><footer class=\"compact-pagination\"><span>1–20 of 56</span><div><button>‹</button><b>1 / 3</b><button>›</button></div></footer></div>\n</section>\n</main>\n</section>\n</div>\n</div></div>","mobile":"<div class=\"mobile-site\"><div class=\"scout-app mobile-app\">\n<header class=\"mobile-topbar\">\n<a><span class=\"sl-logo\">Scout<span>Link</span></span></a>\n<strong>Player search</strong>\n<button>Menu</button>\n</header>\n<main class=\"mobile-content\">\n<section class=\"page-hero navy\">\n<div><span>Player discovery</span><h2>Find the right player.</h2><p>Every player appears in a compact list. Search or narrow it without turning the phone into a squeezed desktop table.</p></div>\n</section>\n<section class=\"filter-workbench\">\n<div class=\"button-row\"><button class=\"btn secondary\" type=\"button\">Open football filters</button></div>\n<div class=\"active-filter-row\"><span class=\"filter-chip\">All players</span><span class=\"filter-chip\">Best match</span></div>\n</section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>All players</h3><p>56 accessible records</p></div>\n</header>\n<div class=\"mobile-list\">\n<button class=\"mobile-list-row\" type=\"button\">\n<span class=\"initials-box\">EC</span>\n<div><h4>Ethan Cole</h4><p>ST · U16 · Northgate United</p><small>London · Strong evidence</small></div>\n<strong>86%</strong>\n<i>›</i>\n</button>\n<button class=\"mobile-list-row\" type=\"button\">\n<span class=\"initials-box\">CH</span>\n<div><h4>Carter Hill</h4><p>RW · U16 · Northgate United</p><small>London · Strong evidence</small></div>\n<strong>83%</strong>\n<i>›</i>\n</button>\n<button class=\"mobile-list-row\" type=\"button\">\n<span class=\"initials-box\">MJ</span>\n<div><h4>Maya Johnson</h4><p>CAM · U15 · Eastbrook Athletic</p><small>Manchester · Medium evidence</small></div>\n<strong>81%</strong>\n<i>›</i>\n</button>\n<button class=\"mobile-list-row\" type=\"button\">\n<span class=\"initials-box\">AK</span>\n<div><h4>Amir Khan</h4><p>CB · U16 · Harbour City Academy</p><small>Liverpool · Strong evidence</small></div>\n<strong>80%</strong>\n<i>›</i>\n</button>\n<button class=\"mobile-list-row\" type=\"button\">\n<span class=\"initials-box\">LM</span>\n<div><h4>Leo Martins</h4><p>CM · U14 · Southvale Juniors</p><small>Bristol · Medium evidence</small></div>\n<strong>78%</strong>\n<i>›</i>\n</button>\n<button class=\"mobile-list-row\" type=\"button\">\n<span class=\"initials-box\">DO</span>\n<div><h4>Daniel Okoro</h4><p>LB · U15 · Meadow Park Rovers</p><small>Manchester · Medium evidence</small></div>\n<strong>76%</strong>\n<i>›</i>\n</button>\n<button class=\"mobile-list-row\" type=\"button\">\n<span class=\"initials-box\">OP</span>\n<div><h4>Owen Price</h4><p>GK · U14 · Northbridge Athletic</p><small>London · Strong evidence</small></div>\n<strong>75%</strong>\n<i>›</i>\n</button>\n<button class=\"mobile-list-row\" type=\"button\">\n<span class=\"initials-box\">SW</span>\n<div><h4>Samuel Wright</h4><p>CDM · U13 · Oakwood Youth</p><small>Birmingham · Medium evidence</small></div>\n<strong>73%</strong>\n<i>›</i>\n</button>\n</div>\n<footer class=\"compact-pagination\"><span>1–20 of 56</span><div><button>‹</button><b>1 / 3</b><button>›</button></div></footer>\n</section>\n</main>\n<nav class=\"mobile-nav\"><a class=\"\"><span>HM</span><b>Home</b></a><a class=\"active\"><span>PS</span><b>Search</b></a><a class=\"\"><span>MP</span><b>Pipeline</b></a><a class=\"\"><span>CH</span><b>Chat</b></a><a class=\"\"><span>MR</span><b>More</b></a></nav>\n</div></div>"},"profile":{"desktop":"<div class=\"desktop-site\"><div class=\"scout-app desktop-app\">\n<div class=\"desktop-shell\">\n<aside class=\"scout-sidebar\">\n<a class=\"sidebar-logo\"><span class=\"sl-logo\">Scout<span>Link</span></span></a>\n<nav><section class=\"nav-group\"><small>Core</small><a class=\"nav-link\"><span>DB</span><b>Dashboard</b></a><a class=\"nav-link active\"><span>PS</span><b>Player search</b></a><a class=\"nav-link\"><span>MP</span><b>My pipeline</b></a><a class=\"nav-link\"><span>RK</span><b>Rankings</b></a></section><section class=\"nav-group\"><small>Scouting tools</small><a class=\"nav-link\"><span>FX</span><b>Fixtures</b></a><a class=\"nav-link\"><span>PR</span><b>Predictions</b></a><a class=\"nav-link\"><span>EX</span><b>Exports</b></a><a class=\"nav-link\"><span>CP</span><b>Compare players</b></a><a class=\"nav-link\"><span>SS</span><b>Scout setup</b></a></section><section class=\"nav-group\"><small>Network</small><a class=\"nav-link\"><span>EV</span><b>Events</b></a><a class=\"nav-link\"><span>CH</span><b>Chat</b></a><a class=\"nav-link\"><span>NT</span><b>Notifications</b></a><a class=\"nav-link\"><span>RC</span><b>Report a concern</b></a></section><section class=\"nav-group\"><small>Account</small><a class=\"nav-link\"><span>UR</span><b>Usage requests</b></a><a class=\"nav-link\"><span>ST</span><b>Settings</b></a></section></nav>\n<div class=\"sidebar-user\">\n<span class=\"initials-box\">NP</span>\n<div><b>Noah Patel</b><small>Reviewed Scout · Elite</small></div>\n</div>\n</aside>\n<section class=\"workspace\">\n<header class=\"desktop-topbar\">\n<div><span>Scout workspace</span><h1>Ethan Cole</h1></div>\n<div class=\"top-actions\">\n<button class=\"icon-btn\">NT<i>3</i></button>\n<span class=\"team-chip\">ScoutLink Recruitment Team</span>\n<button class=\"user-btn\"><span class=\"initials-box small\">NP</span><b>Noah</b></button>\n</div>\n</header>\n<main class=\"workspace-content\">\n<section class=\"profile-hero\">\n<div class=\"profile-main\">\n<span class=\"initials-box\">EC</span>\n<div><span>Player intelligence dossier</span><h2>Ethan Cole</h2><p>Centre Forward · U16 · Northgate United · Right foot</p>\n<div class=\"profile-tags\"><span>London</span><span>Strong evidence</span><span>Coach managed</span><span>18 appearances</span></div>\n</div>\n</div>\n<div class=\"profile-actions\">\n<button class=\"btn primary\" type=\"button\">Register interest</button><button class=\"btn ghost\" type=\"button\">Compare</button><button class=\"btn ghost\" type=\"button\">Export profile</button>\n<button class=\"btn ghost\" type=\"button\">Team and matches</button><button class=\"btn ghost\" type=\"button\">Watch all videos</button>\n</div>\n</section>\n<section class=\"metric-strip\"><article><small>Overall performance</small><strong>84 / 100</strong><p>Current player profile</p></article><article><small>Current readiness</small><strong>86 / 100</strong><p>Ready for deeper review</p></article><article><small>Potential rating</small><strong>89 / 100</strong><p>Development upside</p></article><article><small>Data confidence</small><strong>82 / 100</strong><p>Strong current evidence</p></article><article><small>Evidence base</small><strong>18</strong><p>Recorded appearances</p></article><article><small>Estimated value</small><strong>£160k</strong><p>Decision-support estimate</p></article></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Compatibility intelligence</h3><p>Current Scout setup and player evidence</p></div>\n</header>\n<div class=\"compatibility-headline\"><div><span>Saved recruitment brief</span><strong>86% compatible</strong><p>High-pressing 4-3-3 side seeking pace, tactical intelligence and stronger goal output.</p></div><button class=\"btn white\" type=\"button\">Edit Scout setup</button></div>\n<div class=\"compatibility-grid\"><article class=\"compat-item\"><div><span>Need fit</span><b>90</b></div><i><em style=\"width:90%\"></em></i></article><article class=\"compat-item\"><div><span>Role fit</span><b>86</b></div><i><em style=\"width:86%\"></em></i></article><article class=\"compat-item\"><div><span>Tactical style</span><b>88</b></div><i><em style=\"width:88%\"></em></i></article><article class=\"compat-item\"><div><span>Formation fit</span><b>92</b></div><i><em style=\"width:92%\"></em></i></article><article class=\"compat-item\"><div><span>Development pathway</span><b>82</b></div><i><em style=\"width:82%\"></em></i></article><article class=\"compat-item\"><div><span>Match evidence</span><b>84</b></div><i><em style=\"width:84%\"></em></i></article><article class=\"compat-item\"><div><span>Financial fit</span><b>79</b></div><i><em style=\"width:79%\"></em></i></article></div>\n<div class=\"panel-body\" style=\"padding-top:0\"><div class=\"recommendation\"><b>Football recommendation</b><br/>Prioritise a live observation against an organised defensive block before moving beyond the shortlist.</div></div>\n</section><section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Overall rating breakdown</h3><p>Current player and Match Facts evidence</p></div>\n</header>\n<div class=\"panel-body\">\n<section class=\"rating-summary\">\n<article><small>Final score</small><strong>84</strong><span>ScoutLink overall</span></article>\n<article><small>Current readiness</small><strong>86</strong><span>Ready now</span></article>\n<article><small>Potential rating</small><strong>89</strong><span>Development upside</span></article>\n<article><small>Data confidence</small><strong>82</strong><span>Evidence quality</span></article>\n</section>\n<div class=\"rating-layout\" style=\"margin-top:18px\">\n<div class=\"attribute-list\"><div class=\"bar-row\"><span>Technical</span><i><em style=\"width:92%\"></em></i><b>92</b></div><div class=\"bar-row\"><span>Tactical intelligence</span><i><em style=\"width:88%\"></em></i><b>88</b></div><div class=\"bar-row\"><span>Physical profile</span><i><em style=\"width:84%\"></em></i><b>84</b></div><div class=\"bar-row\"><span>Mental and coachability</span><i><em style=\"width:90%\"></em></i><b>90</b></div><div class=\"bar-row\"><span>Match output</span><i><em style=\"width:78%\"></em></i><b>78</b></div><div class=\"bar-row\"><span>Discipline</span><i><em style=\"width:94%\"></em></i><b>94</b></div><div class=\"bar-row\"><span>Availability</span><i><em style=\"width:86%\"></em></i><b>86</b></div><div class=\"bar-row\"><span>Data confidence</span><i><em style=\"width:82%\"></em></i><b>82</b></div></div>\n<aside class=\"role-card\"><span>Role analysis</span><h4>Centre Forward is the strongest current role.</h4><p>Movement, finishing and transitional output match the current brief. Left wing remains the strongest future alternative.</p>\n<div class=\"role-results\"><div><span>Best current role</span><b class=\"blurred-role-output\">Centre Forward</b></div><div><span>Best future role</span><b class=\"blurred-role-output\">Left Winger</b></div><div><span>Target role</span><b class=\"blurred-role-output\">Centre Forward</b></div><div><span>Role-fit score</span><b class=\"blurred-role-output\">86 / 100</b></div></div>\n<div class=\"button-row\"><button class=\"btn white\" type=\"button\">Run position fit</button></div>\n</aside>\n</div>\n</div>\n</section>\n<section class=\"decision-grid\">\n<article class=\"decision-card verdict\"><span>ScoutLink verdict</span><h4>Strong shortlist case</h4><p>The current role, team need and evidence base support deeper observation.</p></article>\n<article class=\"decision-card\"><span>Why this verdict</span><h4>What drives the recommendation</h4><ul><li>Strong current-role fit</li><li>Repeated match evidence</li><li>Within the working value range</li></ul></article>\n<article class=\"decision-card\"><span>Primary risk</span><h4>What still needs proof</h4><p>Consistency when receiving under pressure against stronger opposition.</p></article>\n</section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Recommended next action</h3><p>Move from screen to football evidence</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"recommendation\"><b>Plan the 2 August fixture.</b><br/>Use the live visit to review off-ball movement, receiving under contact and decision quality in the final third.</div><div class=\"button-row profile-next-actions\"><button class=\"btn primary\" type=\"button\">Plan fixture</button><button class=\"btn secondary\" type=\"button\">Message coach</button><button class=\"btn secondary\" type=\"button\">Record decision</button></div></div>\n</section>\n<section class=\"profile-three aligned-profile-row\">\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>All attributes</h3><p>Current coach-led ratings</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"attribute-list\"><div class=\"bar-row\"><span>Pace</span><i><em style=\"width:87%\"></em></i><b>87</b></div><div class=\"bar-row\"><span>Agility</span><i><em style=\"width:88%\"></em></i><b>88</b></div><div class=\"bar-row\"><span>Strength</span><i><em style=\"width:82%\"></em></i><b>82</b></div><div class=\"bar-row\"><span>Stamina</span><i><em style=\"width:91%\"></em></i><b>91</b></div><div class=\"bar-row\"><span>Shooting</span><i><em style=\"width:84%\"></em></i><b>84</b></div><div class=\"bar-row\"><span>Passing</span><i><em style=\"width:89%\"></em></i><b>89</b></div><div class=\"bar-row\"><span>Dribbling</span><i><em style=\"width:86%\"></em></i><b>86</b></div><div class=\"bar-row\"><span>Defending</span><i><em style=\"width:58%\"></em></i><b>58</b></div><div class=\"bar-row\"><span>Composure</span><i><em style=\"width:90%\"></em></i><b>90</b></div><div class=\"bar-row\"><span>Crossing</span><i><em style=\"width:78%\"></em></i><b>78</b></div><div class=\"bar-row\"><span>Vision</span><i><em style=\"width:91%\"></em></i><b>91</b></div><div class=\"bar-row\"><span>Positioning</span><i><em style=\"width:88%\"></em></i><b>88</b></div><div class=\"bar-row\"><span>Heading</span><i><em style=\"width:81%\"></em></i><b>81</b></div><div class=\"bar-row\"><span>Tackling</span><i><em style=\"width:56%\"></em></i><b>56</b></div><div class=\"bar-row\"><span>Jumping</span><i><em style=\"width:83%\"></em></i><b>83</b></div></div></div></section>\n<div class=\"profile-side-stack\"><section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Match statistics</h3><p>Recorded Match Facts</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"stat-block\"><div><strong>18</strong><span>Appearances</span></div><div><strong>14</strong><span>Goals</span></div><div><strong>6</strong><span>Assists</span></div><div><strong>0</strong><span>Clean sheets</span></div><div><strong>2</strong><span>Yellow cards</span></div><div><strong>0</strong><span>Red cards</span></div></div></div></section><section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Physical profile</h3><p>Current descriptors</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"physical-list\"><div><small>Profile type</small><b>Average height · Athletic build</b></div><div><small>Height range</small><b>176–183 cm</b></div><div><small>Weight range</small><b>68–76 kg</b></div><div><small>Availability</small><b>Available</b></div><div><small>Profile owner</small><b>Coach</b></div></div></div></section></div></section>\n<section class=\"evidence-grid\">\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Evidence confidence</h3><p>What supports the current assessment</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"evidence-score\"><span>Confidence score</span><strong>82 / 100</strong><p>Strong current record supported by repeated appearances, Match Facts and approved video.</p></div><div class=\"attribute-list\" style=\"margin-top:13px\"><div class=\"bar-row\"><span>Profile completeness</span><i><em style=\"width:94%\"></em></i><b>94</b></div><div class=\"bar-row\"><span>Match recency</span><i><em style=\"width:86%\"></em></i><b>86</b></div><div class=\"bar-row\"><span>Repeated evidence</span><i><em style=\"width:82%\"></em></i><b>82</b></div><div class=\"bar-row\"><span>Video evidence</span><i><em style=\"width:74%\"></em></i><b>74</b></div></div><div class=\"recommendation\" style=\"margin-top:13px\"><b>Still worth collecting</b><br/>Two more current full-match clips and one observation against higher-level opposition.</div></div></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Video evidence</h3><p>Approved player clips</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"video-list\"><article class=\"video-item\"><div class=\"video-thumb\"><span>▶</span></div><div><b>Goals and movement · 25 Jul</b><small>Coach approved · 2:18</small></div></article><article class=\"video-item\"><div class=\"video-thumb\"><span>▶</span></div><div><b>Link play · 18 Jul</b><small>Coach approved · 1:42</small></div></article></div><div class=\"button-row\"><button class=\"btn secondary\" type=\"button\">Watch all videos</button></div></div></section>\n</section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Value analysis</h3><p>Decision-support estimate, not a guaranteed market value</p></div>\n</header>\n<div class=\"panel-body\">\n<div class=\"value-head\"><div class=\"value-number\"><span>Estimated transfer value</span><strong>£160k</strong><p>Current evidence and youth-player valuation context.</p></div><div class=\"value-cards\"><div><small>Affordability</small><b>Within working range</b></div><div><small>Risk label</small><b>Balanced risk</b></div><div><small>Position group</small><b>Forward</b></div></div></div>\n<div class=\"factor-list\"><div class=\"factor-row\"><b>Age-band starting value</b><span>Youth-player baseline before adjustments.</span></div><div class=\"factor-row\"><b>Position group</b><span>Forward-market adjustment.</span></div><div class=\"factor-row\"><b>Overall quality</b><span>Current overall and readiness.</span></div><div class=\"factor-row\"><b>Potential runway</b><span>Age and development upside.</span></div><div class=\"factor-row\"><b>Evidence confidence</b><span>Strength of the supporting record.</span></div><div class=\"factor-row\"><b>Match output</b><span>Goals, assists and performance evidence.</span></div></div>\n<div class=\"button-row value-actions\"><button class=\"btn primary\" type=\"button\">Run ROI and value</button></div>\n</div>\n</section>\n<div class=\"two-col\">\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Last five Match Facts</h3><p>Recent player evidence</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"match-list\"><article class=\"match-row\"><span class=\"result-box\">W 3–1</span><div><b>Riverside Athletic</b><small>25 Jul · 2 goals · Performance 86</small></div><button class=\"text-action\">Details</button></article><article class=\"match-row\"><span class=\"result-box\">D 2–2</span><div><b>Westhaven Development XI</b><small>18 Jul · 1 assist · Performance 79</small></div><button class=\"text-action\">Details</button></article><article class=\"match-row\"><span class=\"result-box\">W 2–0</span><div><b>Brookfield Athletic</b><small>11 Jul · 1 goal · Performance 82</small></div><button class=\"text-action\">Details</button></article></div></div></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Upcoming fixtures</h3><p>Next opportunities for live evidence</p></div>\n</header>\n<div class=\"panel-body\"><div style=\"display:grid;gap:10px\"><article class=\"fixture-card\"><div class=\"fixture-date\"><b>02</b><span>AUG</span></div><div><h4>Westhaven Development XI</h4><p>10:30 · Northgate Training Ground · Home</p></div></article><article class=\"fixture-card\"><div class=\"fixture-date\"><b>09</b><span>AUG</span></div><div><h4>Brookfield Athletic</h4><p>11:00 · Brookfield Sports Park · Away</p></div></article></div><div class=\"button-row\"><button class=\"btn secondary\" type=\"button\">Plan fixture</button></div></div></section>\n</div>\n<section class=\"panel prediction-analysis-panel\">\n<header class=\"panel-head\">\n<div><h3>What prediction do you want to run?</h3><p>Choose one football question and complete only its relevant inputs</p></div>\n</header>\n<div class=\"panel-body\">\n<div class=\"prediction-types\"><button class=\"prediction-type active\"><b>Position fit</b><span>Test a current, future or target role.</span></button><button class=\"prediction-type\"><b>Match scenario</b><span>Assess a defined tactical situation.</span></button><button class=\"prediction-type\"><b>Development projection</b><span>Model rating and attribute direction.</span></button><button class=\"prediction-type\"><b>ROI and value</b><span>Review cost, upside and downside.</span></button></div>\n<div class=\"form-grid cols-3\" style=\"margin-top:15px\"><label class=\"field\"><span>Development approach</span><div class=\"control select\">Balanced growth<i>⌄</i></div></label><label class=\"field\"><span>Target scenario</span><div class=\"control select\">High press against low block<i>⌄</i></div></label><label class=\"field\"><span>Target role</span><div class=\"control select\">Centre Forward<i>⌄</i></div></label></div>\n<div class=\"button-row prediction-actions\"><button class=\"btn primary\" type=\"button\">Run prediction analysis</button></div>\n</div>\n</section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Recruitment actions</h3><p>Actions remain tied to this exact player record</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"button-row\"><button class=\"btn secondary\" type=\"button\">Watch player</button><button class=\"btn secondary\" type=\"button\">Add observation</button><button class=\"btn primary\" type=\"button\">Record decision</button></div></div></section>\n</main>\n</section>\n</div>\n</div></div>","mobile":"<div class=\"mobile-site\"><div class=\"scout-app mobile-app\">\n<header class=\"mobile-topbar\">\n<a><span class=\"sl-logo\">Scout<span>Link</span></span></a>\n<strong>Player profile</strong>\n<button>Menu</button>\n</header>\n<main class=\"mobile-content\">\n<section class=\"profile-hero\">\n<div class=\"profile-main\"><span class=\"initials-box\">EC</span><div><span>Player intelligence dossier</span><h2>Ethan Cole</h2><p>ST · U16 · Northgate United · Right foot</p><div class=\"profile-tags\"><span>London</span><span>Strong evidence</span></div></div></div>\n<div class=\"profile-actions\"><button class=\"btn primary\" type=\"button\">Register interest</button><button class=\"btn ghost\" type=\"button\">Compare</button><button class=\"btn ghost\" type=\"button\">Export profile</button><button class=\"btn ghost\" type=\"button\">Team and matches</button><button class=\"btn ghost\" type=\"button\">Watch videos</button></div>\n</section>\n<section class=\"rating-summary\">\n<article><small>Overall performance</small><strong>84</strong></article>\n<article><small>Current readiness</small><strong>86</strong></article>\n<article><small>Potential rating</small><strong>89</strong></article>\n<article><small>Data confidence</small><strong>82</strong></article>\n<article><small>Evidence base</small><strong>18 apps</strong></article>\n<article><small>Estimated value</small><strong>£160k</strong></article>\n</section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Compatibility intelligence</h3><p>Current recruitment brief</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"compatibility-headline\"><div><span>Saved brief</span><strong>86%</strong><p>Strong current compatibility.</p></div></div><div class=\"compatibility-grid\"><article class=\"compat-item\"><div><span>Need fit</span><b>90</b></div><i><em style=\"width:90%\"></em></i></article><article class=\"compat-item\"><div><span>Role fit</span><b>86</b></div><i><em style=\"width:86%\"></em></i></article><article class=\"compat-item\"><div><span>Tactical style</span><b>88</b></div><i><em style=\"width:88%\"></em></i></article><article class=\"compat-item\"><div><span>Formation fit</span><b>92</b></div><i><em style=\"width:92%\"></em></i></article><article class=\"compat-item\"><div><span>Development pathway</span><b>82</b></div><i><em style=\"width:82%\"></em></i></article><article class=\"compat-item\"><div><span>Match evidence</span><b>84</b></div><i><em style=\"width:84%\"></em></i></article><article class=\"compat-item\"><div><span>Financial fit</span><b>79</b></div><i><em style=\"width:79%\"></em></i></article></div><div class=\"panel-body\" style=\"padding-top:0\"><div class=\"recommendation\"><b>Recommendation</b><br/>Prioritise a live observation before moving beyond the shortlist.</div></div></div></section><section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Overall rating breakdown</h3><p>Current evidence</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"attribute-list\"><div class=\"bar-row\"><span>Technical</span><i><em style=\"width:92%\"></em></i><b>92</b></div><div class=\"bar-row\"><span>Tactical intelligence</span><i><em style=\"width:88%\"></em></i><b>88</b></div><div class=\"bar-row\"><span>Physical profile</span><i><em style=\"width:84%\"></em></i><b>84</b></div><div class=\"bar-row\"><span>Mental and coachability</span><i><em style=\"width:90%\"></em></i><b>90</b></div><div class=\"bar-row\"><span>Match output</span><i><em style=\"width:78%\"></em></i><b>78</b></div><div class=\"bar-row\"><span>Discipline</span><i><em style=\"width:94%\"></em></i><b>94</b></div><div class=\"bar-row\"><span>Availability</span><i><em style=\"width:86%\"></em></i><b>86</b></div><div class=\"bar-row\"><span>Data confidence</span><i><em style=\"width:82%\"></em></i><b>82</b></div></div><aside class=\"role-card\" style=\"margin-top:17px\"><span>Role analysis</span><h4>Centre Forward is the strongest current role.</h4><p>Left wing is the strongest future alternative.</p><div class=\"role-results\"><div><span>Best current role</span><b class=\"blurred-role-output blurred-role-output\">Centre Forward</b></div><div><span>Best future role</span><b class=\"blurred-role-output blurred-role-output\">Left Winger</b></div><div><span>Target role</span><b class=\"blurred-role-output blurred-role-output\">Centre Forward</b></div><div><span>Role-fit score</span><b class=\"blurred-role-output blurred-role-output\">86 / 100</b></div></div><div class=\"button-row\"><button class=\"btn white\" type=\"button\">Run position fit</button></div></aside></div></section>\n<section class=\"decision-grid\"><article class=\"decision-card verdict\"><span>ScoutLink verdict</span><h4>Strong shortlist case</h4><p>Role, need and evidence support deeper observation.</p></article><article class=\"decision-card\"><span>Primary risk</span><h4>What still needs proof</h4><p>Receiving under pressure against stronger opposition.</p></article><article class=\"decision-card\"><span>Next action</span><h4>Plan the 2 August fixture</h4><p>Review movement, contact and final-third decisions.</p><div class=\"button-row\"><button class=\"btn primary\" type=\"button\">Plan fixture</button><button class=\"btn secondary\" type=\"button\">Message coach</button></div></article></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>All attributes</h3><p>Coach-led ratings</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"attribute-list\"><div class=\"bar-row\"><span>Pace</span><i><em style=\"width:87%\"></em></i><b>87</b></div><div class=\"bar-row\"><span>Agility</span><i><em style=\"width:88%\"></em></i><b>88</b></div><div class=\"bar-row\"><span>Strength</span><i><em style=\"width:82%\"></em></i><b>82</b></div><div class=\"bar-row\"><span>Stamina</span><i><em style=\"width:91%\"></em></i><b>91</b></div><div class=\"bar-row\"><span>Shooting</span><i><em style=\"width:84%\"></em></i><b>84</b></div><div class=\"bar-row\"><span>Passing</span><i><em style=\"width:89%\"></em></i><b>89</b></div><div class=\"bar-row\"><span>Dribbling</span><i><em style=\"width:86%\"></em></i><b>86</b></div><div class=\"bar-row\"><span>Defending</span><i><em style=\"width:58%\"></em></i><b>58</b></div><div class=\"bar-row\"><span>Composure</span><i><em style=\"width:90%\"></em></i><b>90</b></div><div class=\"bar-row\"><span>Crossing</span><i><em style=\"width:78%\"></em></i><b>78</b></div><div class=\"bar-row\"><span>Vision</span><i><em style=\"width:91%\"></em></i><b>91</b></div><div class=\"bar-row\"><span>Positioning</span><i><em style=\"width:88%\"></em></i><b>88</b></div><div class=\"bar-row\"><span>Heading</span><i><em style=\"width:81%\"></em></i><b>81</b></div><div class=\"bar-row\"><span>Tackling</span><i><em style=\"width:56%\"></em></i><b>56</b></div><div class=\"bar-row\"><span>Jumping</span><i><em style=\"width:83%\"></em></i><b>83</b></div></div></div></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Match statistics</h3><p>Recorded Match Facts</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"stat-block\"><div><strong>18</strong><span>Appearances</span></div><div><strong>14</strong><span>Goals</span></div><div><strong>6</strong><span>Assists</span></div><div><strong>2</strong><span>Yellow cards</span></div></div></div></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Physical profile</h3><p>Current descriptors</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"physical-list\"><div><small>Profile</small><b>Average height · Athletic build</b></div><div><small>Height</small><b>176–183 cm</b></div><div><small>Weight</small><b>68–76 kg</b></div><div><small>Availability</small><b>Available</b></div></div></div></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Evidence confidence</h3><p>What supports the assessment</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"evidence-score\"><span>Confidence</span><strong>82 / 100</strong><p>Repeated appearances, Match Facts and approved video.</p></div><div class=\"attribute-list\" style=\"margin-top:13px\"><div class=\"bar-row\"><span>Profile completeness</span><i><em style=\"width:94%\"></em></i><b>94</b></div><div class=\"bar-row\"><span>Match recency</span><i><em style=\"width:86%\"></em></i><b>86</b></div><div class=\"bar-row\"><span>Video evidence</span><i><em style=\"width:74%\"></em></i><b>74</b></div></div></div></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Video evidence</h3><p>Approved clips</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"video-list\"><article class=\"video-item\"><div class=\"video-thumb\"><span>▶</span></div><div><b>Goals and movement</b><small>25 Jul · 2:18</small></div></article><article class=\"video-item\"><div class=\"video-thumb\"><span>▶</span></div><div><b>Link play</b><small>18 Jul · 1:42</small></div></article></div><div class=\"button-row\"><button class=\"btn secondary\" type=\"button\">Watch all videos</button></div></div></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Value analysis</h3><p>Decision-support estimate</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"value-number\"><span>Estimated value</span><strong>£160k</strong><p>Balanced risk · Forward</p></div><div class=\"factor-list\"><div class=\"factor-row\"><b>Overall quality</b><span>Positive adjustment</span></div><div class=\"factor-row\"><b>Potential runway</b><span>Positive adjustment</span></div><div class=\"factor-row\"><b>Evidence confidence</b><span>Strong support</span></div></div><div class=\"button-row\"><button class=\"btn primary\" type=\"button\">Run ROI and value</button></div></div></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Last Match Facts</h3><p>Current evidence</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"match-list\"><article class=\"match-row\"><span class=\"result-box\">W 3–1</span><div><b>Riverside Athletic</b><small>25 Jul · 2G · Perf 86</small></div><button class=\"text-action\">View</button></article><article class=\"match-row\"><span class=\"result-box\">D 2–2</span><div><b>Westhaven XI</b><small>18 Jul · 1A · Perf 79</small></div><button class=\"text-action\">View</button></article></div></div></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Upcoming fixtures</h3><p>Next live-evidence opportunities</p></div>\n</header>\n<div class=\"panel-body\"><div style=\"display:grid;gap:11px\"><article class=\"fixture-card\"><div class=\"fixture-date\"><b>02</b><span>AUG</span></div><div><h4>Westhaven Development XI</h4><p>10:30 · Northgate Training Ground</p></div></article><article class=\"fixture-card\"><div class=\"fixture-date\"><b>09</b><span>AUG</span></div><div><h4>Brookfield Athletic</h4><p>11:00 · Brookfield Sports Park</p></div></article></div><div class=\"button-row\"><button class=\"btn secondary\" type=\"button\">Plan fixture</button></div></div></section>\n<section class=\"panel prediction-analysis-panel\">\n<header class=\"panel-head\">\n<div><h3>Run a prediction</h3><p>Select one football question</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"prediction-types\"><button class=\"prediction-type active\"><b>Position fit</b><span>Test a current or target role.</span></button><button class=\"prediction-type\"><b>Match scenario</b><span>Assess a tactical situation.</span></button><button class=\"prediction-type\"><b>Development projection</b><span>Model player development.</span></button><button class=\"prediction-type\"><b>ROI and value</b><span>Review upside and downside.</span></button></div><label class=\"field\"><span>Target role</span><div class=\"control select\">Centre Forward<i>⌄</i></div></label><div class=\"button-row\"><button class=\"btn primary\" type=\"button\">Run prediction analysis</button></div></div></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Recruitment actions</h3><p>Tied to Ethan Cole</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"button-row\"><button class=\"btn primary\" type=\"button\">Record decision</button><button class=\"btn secondary\" type=\"button\">Watch player</button><button class=\"btn secondary\" type=\"button\">Add observation</button></div></div></section>\n</main>\n<nav class=\"mobile-nav\"><a class=\"\"><span>HM</span><b>Home</b></a><a class=\"active\"><span>PS</span><b>Search</b></a><a class=\"\"><span>MP</span><b>Pipeline</b></a><a class=\"\"><span>CH</span><b>Chat</b></a><a class=\"\"><span>MR</span><b>More</b></a></nav>\n</div></div>"},"pipeline":{"desktop":"<div class=\"desktop-site\"><div class=\"scout-app desktop-app\">\n<div class=\"desktop-shell\">\n<aside class=\"scout-sidebar\">\n<a class=\"sidebar-logo\"><span class=\"sl-logo\">Scout<span>Link</span></span></a>\n<nav><section class=\"nav-group\"><small>Core</small><a class=\"nav-link\"><span>DB</span><b>Dashboard</b></a><a class=\"nav-link\"><span>PS</span><b>Player search</b></a><a class=\"nav-link active\"><span>MP</span><b>My pipeline</b></a><a class=\"nav-link\"><span>RK</span><b>Rankings</b></a></section><section class=\"nav-group\"><small>Scouting tools</small><a class=\"nav-link\"><span>FX</span><b>Fixtures</b></a><a class=\"nav-link\"><span>PR</span><b>Predictions</b></a><a class=\"nav-link\"><span>EX</span><b>Exports</b></a><a class=\"nav-link\"><span>CP</span><b>Compare players</b></a><a class=\"nav-link\"><span>SS</span><b>Scout setup</b></a></section><section class=\"nav-group\"><small>Network</small><a class=\"nav-link\"><span>EV</span><b>Events</b></a><a class=\"nav-link\"><span>CH</span><b>Chat</b></a><a class=\"nav-link\"><span>NT</span><b>Notifications</b></a><a class=\"nav-link\"><span>RC</span><b>Report a concern</b></a></section><section class=\"nav-group\"><small>Account</small><a class=\"nav-link\"><span>UR</span><b>Usage requests</b></a><a class=\"nav-link\"><span>ST</span><b>Settings</b></a></section></nav>\n<div class=\"sidebar-user\">\n<span class=\"initials-box\">NP</span>\n<div><b>Noah Patel</b><small>Reviewed Scout · Elite</small></div>\n</div>\n</aside>\n<section class=\"workspace\">\n<header class=\"desktop-topbar\">\n<div><span>Scout workspace</span><h1>My pipeline</h1></div>\n<div class=\"top-actions\">\n<button class=\"icon-btn\">NT<i>3</i></button>\n<span class=\"team-chip\">ScoutLink Recruitment Team</span>\n<button class=\"user-btn\"><span class=\"initials-box small\">NP</span><b>Noah</b></button>\n</div>\n</header>\n<main class=\"workspace-content\">\n<section class=\"page-hero navy\">\n<div><span>Recruitment workflow</span><h2>Move the right players forward.</h2><p>Keep every prospect, stage, coach conversation and next action visible without relying on scattered notes.</p></div>\n<div class=\"button-row hero-actions\"><button class=\"btn primary\" type=\"button\">Find players</button><button class=\"btn ghost\" type=\"button\">Export pipeline</button></div>\n</section>\n<section class=\"metric-strip\"><article><small>Requests remaining</small><strong>293</strong><p>of 300 pipeline interests</p></article><article><small>In pipeline</small><strong>7</strong><p>Across four active stages</p></article><article><small>Awaiting coach reply</small><strong>2</strong><p>Follow-up required</p></article><article><small>Current plan</small><strong>Elite</strong><p>Team workflow enabled</p></article></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>My recruitment pipeline</h3><p>Watching → Shortlisted → Approached → Negotiating</p></div>\n<button class=\"btn secondary\" type=\"button\">Pipeline settings</button>\n</header>\n<div class=\"panel-body\"><section class=\"pipeline-summary\"><article><strong>2</strong><span>Watching</span></article><article><strong>4</strong><span>Shortlisted</span></article><article><strong>1</strong><span>Approached</span></article><article><strong>0</strong><span>Negotiating</span></article></section></div>\n<div class=\"data-table\"><div class=\"data-head pipeline-head\"><span>Player</span><span>Overall</span><span>Value</span><span>Stage</span><span>Move stage</span><span>Coach</span><span></span></div><div class=\"pipeline-row\"><div class=\"player-cell\"><span class=\"initials-box\">RH</span><div><b>Reuben Hughes</b><small>ST · U16</small></div></div><strong>85</strong><span>£344k</span><span class=\"status gold\">Interested</span><div class=\"control\">Interested<i>⌄</i></div><button class=\"text-action\">Message coach</button><button class=\"text-action\">View</button></div><div class=\"pipeline-row\"><div class=\"player-cell\"><span class=\"initials-box\">KJ</span><div><b>Kai Jones</b><small>CM · U16</small></div></div><strong>82</strong><span>£212k</span><span class=\"status gold\">Shortlisted</span><div class=\"control\">Shortlisted<i>⌄</i></div><button class=\"text-action\">Message coach</button><button class=\"text-action\">View</button></div><div class=\"pipeline-row\"><div class=\"player-cell\"><span class=\"initials-box\">EW</span><div><b>Elias Ward</b><small>CB · U16</small></div></div><strong>84</strong><span>£348k</span><span class=\"status gold\">Shortlisted</span><div class=\"control\">Shortlisted<i>⌄</i></div><button class=\"text-action\">Message coach</button><button class=\"text-action\">View</button></div><div class=\"pipeline-row\"><div class=\"player-cell\"><span class=\"initials-box\">CH</span><div><b>Carter Hill</b><small>RW · U16</small></div></div><strong>82</strong><span>£145k</span><span class=\"status gold\">Shortlisted</span><div class=\"control\">Shortlisted<i>⌄</i></div><button class=\"text-action\">Message coach</button><button class=\"text-action\">View</button></div><div class=\"pipeline-row\"><div class=\"player-cell\"><span class=\"initials-box\">JW</span><div><b>Jayden Wood</b><small>GK · U15</small></div></div><strong>76</strong><span>£270k</span><span class=\"status gold\">Shortlisted</span><div class=\"control\">Shortlisted<i>⌄</i></div><button class=\"text-action\">Message coach</button><button class=\"text-action\">View</button></div><div class=\"pipeline-row\"><div class=\"player-cell\"><span class=\"initials-box\">EC</span><div><b>Ethan Cole</b><small>ST · U16</small></div></div><strong>84</strong><span>£160k</span><span class=\"status gold\">Watching</span><div class=\"control\">Watching<i>⌄</i></div><button class=\"text-action\">Message coach</button><button class=\"text-action\">View</button></div><div class=\"pipeline-row\"><div class=\"player-cell\"><span class=\"initials-box\">TB</span><div><b>Theo Brooks</b><small>CDM · U16</small></div></div><strong>77</strong><span>£144k</span><span class=\"status green\">Approached</span><div class=\"control\">Approached<i>⌄</i></div><button class=\"text-action\">Message coach</button><button class=\"text-action\">View</button></div></div>\n</section>\n<div class=\"three-col\">\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Follow-up due</h3></div>\n</header>\n<div class=\"panel-body\"><div class=\"follow-up-list\"><article class=\"follow-up-row\"><div><b>Reuben Hughes</b><span>Coach reply overdue by two days.</span></div><button class=\"text-action\">Message</button></article><article class=\"follow-up-row\"><div><b>Theo Brooks</b><span>Review approached stage.</span></div><button class=\"text-action\">Open</button></article></div></div></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Stage health</h3></div>\n</header>\n<div class=\"panel-body\"><div class=\"attribute-list\"><div class=\"bar-row\"><span>Watching</span><i><em style=\"width:29%\"></em></i><b>29</b></div><div class=\"bar-row\"><span>Shortlisted</span><i><em style=\"width:57%\"></em></i><b>57</b></div><div class=\"bar-row\"><span>Approached</span><i><em style=\"width:14%\"></em></i><b>14</b></div></div></div></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Recommended next action</h3></div>\n</header>\n<div class=\"panel-body\"><div class=\"recommendation\"><b>Compare Reuben and Ethan.</b><br/>Both are centre forwards with different evidence strength and valuation risk.</div><div class=\"button-row\"><button class=\"btn primary\" type=\"button\">Compare players</button></div></div></section>\n</div>\n</main>\n</section>\n</div>\n</div></div>","mobile":"<div class=\"mobile-site\"><div class=\"scout-app mobile-app\">\n<header class=\"mobile-topbar\">\n<a><span class=\"sl-logo\">Scout<span>Link</span></span></a>\n<strong>My pipeline</strong>\n<button>Menu</button>\n</header>\n<main class=\"mobile-content\">\n<section class=\"page-hero navy\">\n<div><span>Recruitment workflow</span><h2>Move the right players forward.</h2><p>Keep every player, stage and next action visible in one compact list.</p></div>\n<div class=\"button-row hero-actions\"><button class=\"btn white\" type=\"button\">Find players</button><button class=\"btn ghost\" type=\"button\">Export pipeline</button></div>\n</section>\n<section class=\"metric-strip\"><article><small>Requests remaining</small><strong>293</strong><p>of 300</p></article><article><small>In pipeline</small><strong>7</strong><p>Across four stages</p></article><article><small>Coach replies due</small><strong>2</strong><p>Need follow-up</p></article><article><small>Plan</small><strong>Elite</strong><p>Team workflow</p></article></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Pipeline stage summary</h3><p>Current distribution</p></div>\n</header>\n<div class=\"panel-body\"><section class=\"pipeline-summary\"><article><strong>2</strong><span>Watching</span></article><article><strong>4</strong><span>Shortlisted</span></article><article><strong>1</strong><span>Approached</span></article><article><strong>0</strong><span>Negotiating</span></article></section></div></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>My recruitment pipeline</h3><p>Seven active prospects</p></div>\n</header>\n<div class=\"pipeline-mobile-list\">\n<button class=\"mobile-list-row\" type=\"button\">\n<span class=\"initials-box\">RH</span>\n<div><h4>Reuben Hughes</h4><p>ST · U16</p><small>£344k · Coach reply overdue</small></div>\n<strong>85</strong>\n<span class=\"row-badge\">Interested</span>\n<i>›</i>\n</button>\n<button class=\"mobile-list-row\" type=\"button\">\n<span class=\"initials-box\">KJ</span>\n<div><h4>Kai Jones</h4><p>CM · U16</p><small>£212k · Comparison saved</small></div>\n<strong>82</strong>\n<span class=\"row-badge\">Shortlisted</span>\n<i>›</i>\n</button>\n<button class=\"mobile-list-row\" type=\"button\">\n<span class=\"initials-box\">EW</span>\n<div><h4>Elias Ward</h4><p>CB · U16</p><small>£348k · New Match Facts</small></div>\n<strong>84</strong>\n<span class=\"row-badge\">Shortlisted</span>\n<i>›</i>\n</button>\n<button class=\"mobile-list-row\" type=\"button\">\n<span class=\"initials-box\">CH</span>\n<div><h4>Carter Hill</h4><p>RW · U16</p><small>£145k · Fixture in 5 days</small></div>\n<strong>82</strong>\n<span class=\"row-badge\">Shortlisted</span>\n<i>›</i>\n</button>\n<button class=\"mobile-list-row\" type=\"button\">\n<span class=\"initials-box\">JW</span>\n<div><h4>Jayden Wood</h4><p>GK · U15</p><small>£270k · Observation pending</small></div>\n<strong>76</strong>\n<span class=\"row-badge\">Shortlisted</span>\n<i>›</i>\n</button>\n<button class=\"mobile-list-row\" type=\"button\">\n<span class=\"initials-box\">EC</span>\n<div><h4>Ethan Cole</h4><p>ST · U16</p><small>£160k · Added 27 Jul</small></div>\n<strong>84</strong>\n<span class=\"row-badge\">Watching</span>\n<i>›</i>\n</button>\n<button class=\"mobile-list-row\" type=\"button\">\n<span class=\"initials-box\">TB</span>\n<div><h4>Theo Brooks</h4><p>CDM · U16</p><small>£144k · Follow-up due</small></div>\n<strong>77</strong>\n<span class=\"row-badge\">Approached</span>\n<i>›</i>\n</button>\n</div></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Follow-up due</h3><p>Two actions need attention</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"follow-up-list\"><article class=\"follow-up-row\"><div><b>Reuben Hughes</b><span>Coach reply overdue.</span></div><button class=\"text-action\">Message</button></article><article class=\"follow-up-row\"><div><b>Theo Brooks</b><span>Review approached stage.</span></div><button class=\"text-action\">Open</button></article></div></div></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Recommended next action</h3><p>Compare adjacent striker cases</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"recommendation\"><b>Compare Reuben and Ethan.</b><br/>Different evidence strength and valuation risk.</div><div class=\"button-row\"><button class=\"btn primary\" type=\"button\">Compare players</button></div></div></section>\n</main>\n<nav class=\"mobile-nav\"><a class=\"\"><span>HM</span><b>Home</b></a><a class=\"\"><span>PS</span><b>Search</b></a><a class=\"active\"><span>MP</span><b>Pipeline</b></a><a class=\"\"><span>CH</span><b>Chat</b></a><a class=\"\"><span>MR</span><b>More</b></a></nav>\n</div></div>"},"rankings":{"desktop":"<div class=\"desktop-site\"><div class=\"scout-app desktop-app\">\n<div class=\"desktop-shell\">\n<aside class=\"scout-sidebar\">\n<a class=\"sidebar-logo\"><span class=\"sl-logo\">Scout<span>Link</span></span></a>\n<nav><section class=\"nav-group\"><small>Core</small><a class=\"nav-link\"><span>DB</span><b>Dashboard</b></a><a class=\"nav-link\"><span>PS</span><b>Player search</b></a><a class=\"nav-link\"><span>MP</span><b>My pipeline</b></a><a class=\"nav-link active\"><span>RK</span><b>Rankings</b></a></section><section class=\"nav-group\"><small>Scouting tools</small><a class=\"nav-link\"><span>FX</span><b>Fixtures</b></a><a class=\"nav-link\"><span>PR</span><b>Predictions</b></a><a class=\"nav-link\"><span>EX</span><b>Exports</b></a><a class=\"nav-link\"><span>CP</span><b>Compare players</b></a><a class=\"nav-link\"><span>SS</span><b>Scout setup</b></a></section><section class=\"nav-group\"><small>Network</small><a class=\"nav-link\"><span>EV</span><b>Events</b></a><a class=\"nav-link\"><span>CH</span><b>Chat</b></a><a class=\"nav-link\"><span>NT</span><b>Notifications</b></a><a class=\"nav-link\"><span>RC</span><b>Report a concern</b></a></section><section class=\"nav-group\"><small>Account</small><a class=\"nav-link\"><span>UR</span><b>Usage requests</b></a><a class=\"nav-link\"><span>ST</span><b>Settings</b></a></section></nav>\n<div class=\"sidebar-user\">\n<span class=\"initials-box\">NP</span>\n<div><b>Noah Patel</b><small>Reviewed Scout · Elite</small></div>\n</div>\n</aside>\n<section class=\"workspace\">\n<header class=\"desktop-topbar\">\n<div><span>Scout workspace</span><h1>Rankings</h1></div>\n<div class=\"top-actions\">\n<button class=\"icon-btn\">NT<i>3</i></button>\n<span class=\"team-chip\">ScoutLink Recruitment Team</span>\n<button class=\"user-btn\"><span class=\"initials-box small\">NP</span><b>Noah</b></button>\n</div>\n</header>\n<main class=\"workspace-content\">\n<section class=\"page-hero navy\">\n<div><span>Player rankings</span><h2>Rank the accessible player database.</h2><p>Use rankings as a discovery signal, then open the profile to judge context, compatibility and evidence quality.</p></div>\n<div class=\"button-row hero-actions\"><button class=\"btn primary\" type=\"button\">Explore players</button></div>\n</section>\n<section class=\"rank-filters\"><label class=\"field\"><span>Ranking type</span><div class=\"control select\">Top goalscorers<i>⌄</i></div></label><label class=\"field\"><span>Position</span><div class=\"control select\">All positions<i>⌄</i></div></label><label class=\"field\"><span>Age group</span><div class=\"control select\">All ages<i>⌄</i></div></label><label class=\"field\"><span>Region</span><div class=\"control select\">All regions<i>⌄</i></div></label><button class=\"btn primary\" type=\"button\">Update ranking</button></section>\n<section class=\"podium\">\n<article><span class=\"initials-box\">EC</span><h4>Ethan Cole</h4><p>ST · U16 · Northgate United</p><strong>14 goals</strong></article>\n<article><span class=\"initials-box\">CH</span><h4>Carter Hill</h4><p>RW · U16 · Northgate United</p><strong>12 goals</strong></article>\n<article><span class=\"initials-box\">MJ</span><h4>Maya Johnson</h4><p>CAM · U15 · Eastbrook Athletic</p><strong>11 goals</strong></article>\n</section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Top goalscorers</h3><p>Current accessible player and Match Facts records</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"rank-list\"><div class=\"rank-row\"><span class=\"rank-no\">1</span><span class=\"initials-box\">EC</span><div><b>Ethan Cole</b><small>ST · U16 · Northgate United</small></div><strong>14 goals</strong><button class=\"text-action\">View</button></div><div class=\"rank-row\"><span class=\"rank-no\">2</span><span class=\"initials-box\">CH</span><div><b>Carter Hill</b><small>RW · U16 · Northgate United</small></div><strong>12 goals</strong><button class=\"text-action\">View</button></div><div class=\"rank-row\"><span class=\"rank-no\">3</span><span class=\"initials-box\">MJ</span><div><b>Maya Johnson</b><small>CAM · U15 · Eastbrook Athletic</small></div><strong>11 goals</strong><button class=\"text-action\">View</button></div><div class=\"rank-row\"><span class=\"rank-no\">4</span><span class=\"initials-box\">LM</span><div><b>Leo Martins</b><small>CM · U14 · Southvale Juniors</small></div><strong>9 goals</strong><button class=\"text-action\">View</button></div><div class=\"rank-row\"><span class=\"rank-no\">5</span><span class=\"initials-box\">DO</span><div><b>Daniel Okoro</b><small>LB · U15 · Meadow Park</small></div><strong>7 goals</strong><button class=\"text-action\">View</button></div></div></div></section>\n<div class=\"two-col\">\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>How to use rankings</h3><p>Discovery aid, not a final decision</p></div>\n</header>\n<div class=\"panel-body\"><p style=\"margin:0;color:var(--muted);font-size:8px;line-height:1.5\">Open the player profile, assess evidence confidence and review compatibility before taking recruitment action.</p></div></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Team shortlist</h3><p>Save a category for shared review</p></div>\n</header>\n<div class=\"panel-body\"><p style=\"margin:0;color:var(--muted);font-size:8px;line-height:1.5\">Create a shortlist from the current ranking without automatically registering interest.</p><div class=\"button-row\"><button class=\"btn secondary\" type=\"button\">Create shortlist</button></div></div></section>\n</div>\n</main>\n</section>\n</div>\n</div></div>","mobile":"<div class=\"mobile-site\"><div class=\"scout-app mobile-app\">\n<header class=\"mobile-topbar\">\n<a><span class=\"sl-logo\">Scout<span>Link</span></span></a>\n<strong>Rankings</strong>\n<button>Menu</button>\n</header>\n<main class=\"mobile-content\">\n<section class=\"page-hero navy\">\n<div><span>Player rankings</span><h2>Rank the accessible database.</h2><p>Choose a ranking type, then review a compact evidence-led list.</p></div>\n<div class=\"button-row hero-actions\"><button class=\"btn white\" type=\"button\">Explore players</button></div>\n</section>\n<section class=\"filter-workbench\"><label class=\"field\"><span>Ranking type</span><div class=\"control select\">Top goalscorers<i>⌄</i></div></label><label class=\"field\"><span>Position and age</span><div class=\"control select\">All positions · All ages<i>⌄</i></div></label><div class=\"button-row\"><button class=\"btn primary\" type=\"button\">Update ranking</button></div></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Top goalscorers</h3><p>Current Match Facts</p></div>\n</header>\n<div class=\"ranking-mobile-list\">\n<button class=\"mobile-list-row\" type=\"button\">\n<span class=\"initials-box\">EC</span>\n<div><h4>Ethan Cole</h4><p>ST · U16 · Northgate United</p><small>Open the profile for evidence context</small></div>\n<strong>14 goals</strong>\n<span class=\"row-badge\">#1</span>\n<i>›</i>\n</button>\n<button class=\"mobile-list-row\" type=\"button\">\n<span class=\"initials-box\">CH</span>\n<div><h4>Carter Hill</h4><p>RW · U16 · Northgate United</p><small>Open the profile for evidence context</small></div>\n<strong>12 goals</strong>\n<span class=\"row-badge\">#2</span>\n<i>›</i>\n</button>\n<button class=\"mobile-list-row\" type=\"button\">\n<span class=\"initials-box\">MJ</span>\n<div><h4>Maya Johnson</h4><p>CAM · U15 · Eastbrook Athletic</p><small>Open the profile for evidence context</small></div>\n<strong>11 goals</strong>\n<span class=\"row-badge\">#3</span>\n<i>›</i>\n</button>\n<button class=\"mobile-list-row\" type=\"button\">\n<span class=\"initials-box\">LM</span>\n<div><h4>Leo Martins</h4><p>CM · U14 · Southvale Juniors</p><small>Open the profile for evidence context</small></div>\n<strong>9 goals</strong>\n<span class=\"row-badge\">#4</span>\n<i>›</i>\n</button>\n<button class=\"mobile-list-row\" type=\"button\">\n<span class=\"initials-box\">DO</span>\n<div><h4>Daniel Okoro</h4><p>LB · U15 · Meadow Park</p><small>Open the profile for evidence context</small></div>\n<strong>7 goals</strong>\n<span class=\"row-badge\">#5</span>\n<i>›</i>\n</button>\n</div></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>How to use rankings</h3><p>Discovery, not automatic selection</p></div>\n</header>\n<div class=\"panel-body\"><p style=\"margin:0;color:var(--muted);font-size:8px;line-height:1.5\">Review the player profile, compatibility and evidence confidence before moving them into the pipeline.</p></div></section>\n</main>\n<nav class=\"mobile-nav\"><a class=\"\"><span>HM</span><b>Home</b></a><a class=\"\"><span>PS</span><b>Search</b></a><a class=\"\"><span>MP</span><b>Pipeline</b></a><a class=\"\"><span>CH</span><b>Chat</b></a><a class=\"active\"><span>MR</span><b>More</b></a></nav>\n</div></div>"},"fixtures":{"desktop":"<div class=\"desktop-site\"><div class=\"scout-app desktop-app\">\n<div class=\"desktop-shell\">\n<aside class=\"scout-sidebar\">\n<a class=\"sidebar-logo\"><span class=\"sl-logo\">Scout<span>Link</span></span></a>\n<nav><section class=\"nav-group\"><small>Core</small><a class=\"nav-link\"><span>DB</span><b>Dashboard</b></a><a class=\"nav-link\"><span>PS</span><b>Player search</b></a><a class=\"nav-link\"><span>MP</span><b>My pipeline</b></a><a class=\"nav-link\"><span>RK</span><b>Rankings</b></a></section><section class=\"nav-group\"><small>Scouting tools</small><a class=\"nav-link active\"><span>FX</span><b>Fixtures</b></a><a class=\"nav-link\"><span>PR</span><b>Predictions</b></a><a class=\"nav-link\"><span>EX</span><b>Exports</b></a><a class=\"nav-link\"><span>CP</span><b>Compare players</b></a><a class=\"nav-link\"><span>SS</span><b>Scout setup</b></a></section><section class=\"nav-group\"><small>Network</small><a class=\"nav-link\"><span>EV</span><b>Events</b></a><a class=\"nav-link\"><span>CH</span><b>Chat</b></a><a class=\"nav-link\"><span>NT</span><b>Notifications</b></a><a class=\"nav-link\"><span>RC</span><b>Report a concern</b></a></section><section class=\"nav-group\"><small>Account</small><a class=\"nav-link\"><span>UR</span><b>Usage requests</b></a><a class=\"nav-link\"><span>ST</span><b>Settings</b></a></section></nav>\n<div class=\"sidebar-user\">\n<span class=\"initials-box\">NP</span>\n<div><b>Noah Patel</b><small>Reviewed Scout · Elite</small></div>\n</div>\n</aside>\n<section class=\"workspace\">\n<header class=\"desktop-topbar\">\n<div><span>Scout workspace</span><h1>Fixtures</h1></div>\n<div class=\"top-actions\">\n<button class=\"icon-btn\">NT<i>3</i></button>\n<span class=\"team-chip\">ScoutLink Recruitment Team</span>\n<button class=\"user-btn\"><span class=\"initials-box small\">NP</span><b>Noah</b></button>\n</div>\n</header>\n<main class=\"workspace-content\">\n<section class=\"page-hero navy\">\n<div><span>Live-scouting planning</span><h2>Fixtures connected to pipeline players.</h2><p>Plan live visits from coach-published fixtures, assign an owner and keep the observation objective tied to the player.</p></div>\n<div class=\"button-row hero-actions\"><button class=\"btn ghost\" type=\"button\">Open pipeline</button><button class=\"btn primary\" type=\"button\">Export calendar</button></div>\n</section>\n<section class=\"metric-strip\"><article><small>Upcoming fixtures</small><strong>4</strong><p>Pipeline-player matches</p></article><article><small>Planned visits</small><strong>2</strong><p>Saved observation plans</p></article><article><small>Next fixture</small><strong>2 Aug</strong><p>Ethan Cole · 10:30</p></article><article><small>Unplanned visits</small><strong>2</strong><p>Need a scout owner</p></article></section>\n<div class=\"fixture-layout\">\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>August 2026</h3><p>Pipeline-player fixture calendar</p></div>\n<button class=\"btn secondary\" type=\"button\">Calendar settings</button>\n</header>\n<div class=\"panel-body\"><div class=\"calendar\"><div class=\"calendar-head\"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div><div class=\"calendar-grid\"><div class=\"calendar-day\"><span>1</span></div><div class=\"calendar-day\"><span>2</span><div class=\"calendar-event\"><b>Northgate United vs Westhaven XI</b><small>Ethan Cole · ST</small></div></div><div class=\"calendar-day\"><span>3</span><div class=\"calendar-event\"><b>Eastbrook Athletic vs Riverside</b><small>Maya Johnson · CAM</small></div></div><div class=\"calendar-day\"><span>4</span></div><div class=\"calendar-day\"><span>5</span></div><div class=\"calendar-day\"><span>6</span></div><div class=\"calendar-day\"><span>7</span></div><div class=\"calendar-day\"><span>8</span></div><div class=\"calendar-day\"><span>9</span><div class=\"calendar-event\"><b>Brookfield Athletic vs Northgate</b><small>Carter Hill · RW</small></div></div><div class=\"calendar-day\"><span>10</span><div class=\"calendar-event\"><b>Harbour City vs Westfield</b><small>Amir Khan · CB</small></div></div><div class=\"calendar-day\"><span>11</span></div><div class=\"calendar-day\"><span>12</span></div><div class=\"calendar-day\"><span>13</span></div><div class=\"calendar-day\"><span>14</span></div><div class=\"calendar-day\"><span>15</span></div><div class=\"calendar-day\"><span>16</span></div><div class=\"calendar-day\"><span>17</span></div><div class=\"calendar-day\"><span>18</span></div><div class=\"calendar-day\"><span>19</span></div><div class=\"calendar-day\"><span>20</span></div><div class=\"calendar-day\"><span>21</span></div><div class=\"calendar-day\"><span>22</span></div><div class=\"calendar-day\"><span>23</span></div><div class=\"calendar-day\"><span>24</span></div><div class=\"calendar-day\"><span>25</span></div><div class=\"calendar-day\"><span>26</span></div><div class=\"calendar-day\"><span>27</span></div><div class=\"calendar-day\"><span>28</span></div><div class=\"calendar-day\"><span>29</span></div><div class=\"calendar-day\"><span>30</span></div><div class=\"calendar-day\"><span>31</span></div></div></div></div></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Priority visits</h3><p>Highest-value live-scouting actions</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"priority-list\"><article class=\"priority-visit\"><span>1 · Strong priority</span><h4>Ethan Cole · 2 August</h4><p>Validate movement and receiving under contact before progressing the shortlist.</p><div class=\"button-row\"><button class=\"btn primary\" type=\"button\">Plan visit</button></div></article><article class=\"priority-visit\"><span>2 · Unassigned</span><h4>Carter Hill · 9 August</h4><p>Review wide isolation and final-third choices.</p><div class=\"button-row\"><button class=\"btn secondary\" type=\"button\">Assign scout</button></div></article></div></div></section>\n</div>\n</main>\n</section>\n</div>\n</div></div>","mobile":"<div class=\"mobile-site\"><div class=\"scout-app mobile-app\">\n<header class=\"mobile-topbar\">\n<a><span class=\"sl-logo\">Scout<span>Link</span></span></a>\n<strong>Fixtures</strong>\n<button>Menu</button>\n</header>\n<main class=\"mobile-content\">\n<section class=\"page-hero navy\">\n<div><span>Live-scouting planning</span><h2>Pipeline-player fixtures.</h2><p>Plan visits from a dedicated mobile fixture list rather than a squeezed calendar.</p></div>\n<div class=\"button-row hero-actions\"><button class=\"btn white\" type=\"button\">Export calendar</button><button class=\"btn ghost\" type=\"button\">Open pipeline</button></div>\n</section>\n<section class=\"metric-strip\"><article><small>Upcoming fixtures</small><strong>4</strong><p>Pipeline-player matches</p></article><article><small>Planned visits</small><strong>2</strong><p>Saved visits</p></article><article><small>Unplanned</small><strong>2</strong><p>Need an owner</p></article></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>August fixtures</h3><p>Four pipeline-player matches</p></div>\n</header>\n<div class=\"panel-body mobile-fixture-list\"><article class=\"fixture-card\"><div class=\"fixture-date\"><b>02</b><span>AUG</span></div><div><h4>Northgate United vs Westhaven XI</h4><p>Ethan Cole · ST<br/>10:30 · Northgate Training Ground<br/>Shortlisted</p><div class=\"button-row\"><button class=\"btn primary\" type=\"button\">Plan visit</button></div></div></article><article class=\"fixture-card\"><div class=\"fixture-date\"><b>03</b><span>AUG</span></div><div><h4>Eastbrook Athletic vs Riverside</h4><p>Maya Johnson · CAM<br/>13:00 · Eastbrook Ground<br/>Watching</p><div class=\"button-row\"><button class=\"btn primary\" type=\"button\">Plan visit</button></div></div></article><article class=\"fixture-card\"><div class=\"fixture-date\"><b>09</b><span>AUG</span></div><div><h4>Brookfield Athletic vs Northgate</h4><p>Carter Hill · RW<br/>11:00 · Brookfield Sports Park<br/>Shortlisted</p><div class=\"button-row\"><button class=\"btn primary\" type=\"button\">Plan visit</button></div></div></article><article class=\"fixture-card\"><div class=\"fixture-date\"><b>10</b><span>AUG</span></div><div><h4>Harbour City vs Westfield</h4><p>Amir Khan · CB<br/>14:30 · Harbour Campus<br/>Shortlisted</p><div class=\"button-row\"><button class=\"btn primary\" type=\"button\">Plan visit</button></div></div></article></div></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Priority visit</h3><p>Highest-value next action</p></div>\n</header>\n<div class=\"panel-body\"><article class=\"priority-fixture\"><span>Recommended</span><h4>Ethan Cole · 2 August</h4><p>Validate movement and receiving under contact.</p><div class=\"button-row\"><button class=\"btn white\" type=\"button\">Open visit plan</button></div></article></div></section>\n</main>\n<nav class=\"mobile-nav\"><a class=\"\"><span>HM</span><b>Home</b></a><a class=\"\"><span>PS</span><b>Search</b></a><a class=\"\"><span>MP</span><b>Pipeline</b></a><a class=\"\"><span>CH</span><b>Chat</b></a><a class=\"active\"><span>MR</span><b>More</b></a></nav>\n</div></div>"},"predictions":{"desktop":"<div class=\"desktop-site\"><div class=\"scout-app desktop-app\">\n<div class=\"desktop-shell\">\n<aside class=\"scout-sidebar\">\n<a class=\"sidebar-logo\"><span class=\"sl-logo\">Scout<span>Link</span></span></a>\n<nav><section class=\"nav-group\"><small>Core</small><a class=\"nav-link\"><span>DB</span><b>Dashboard</b></a><a class=\"nav-link\"><span>PS</span><b>Player search</b></a><a class=\"nav-link\"><span>MP</span><b>My pipeline</b></a><a class=\"nav-link\"><span>RK</span><b>Rankings</b></a></section><section class=\"nav-group\"><small>Scouting tools</small><a class=\"nav-link\"><span>FX</span><b>Fixtures</b></a><a class=\"nav-link active\"><span>PR</span><b>Predictions</b></a><a class=\"nav-link\"><span>EX</span><b>Exports</b></a><a class=\"nav-link\"><span>CP</span><b>Compare players</b></a><a class=\"nav-link\"><span>SS</span><b>Scout setup</b></a></section><section class=\"nav-group\"><small>Network</small><a class=\"nav-link\"><span>EV</span><b>Events</b></a><a class=\"nav-link\"><span>CH</span><b>Chat</b></a><a class=\"nav-link\"><span>NT</span><b>Notifications</b></a><a class=\"nav-link\"><span>RC</span><b>Report a concern</b></a></section><section class=\"nav-group\"><small>Account</small><a class=\"nav-link\"><span>UR</span><b>Usage requests</b></a><a class=\"nav-link\"><span>ST</span><b>Settings</b></a></section></nav>\n<div class=\"sidebar-user\">\n<span class=\"initials-box\">NP</span>\n<div><b>Noah Patel</b><small>Reviewed Scout · Elite</small></div>\n</div>\n</aside>\n<section class=\"workspace\">\n<header class=\"desktop-topbar\">\n<div><span>Scout workspace</span><h1>Predictions</h1></div>\n<div class=\"top-actions\">\n<button class=\"icon-btn\">NT<i>3</i></button>\n<span class=\"team-chip\">ScoutLink Recruitment Team</span>\n<button class=\"user-btn\"><span class=\"initials-box small\">NP</span><b>Noah</b></button>\n</div>\n</header>\n<main class=\"workspace-content\">\n<section class=\"page-hero navy\">\n<div><span>Decision-support history</span><h2>Predictions.</h2><p>Review predictions previously run from player profiles. New predictions begin from the relevant player so the evidence context is never lost.</p></div>\n<div class=\"button-row hero-actions\"><button class=\"btn primary\" type=\"button\">Find a player</button><button class=\"btn ghost\" type=\"button\">How predictions work</button></div>\n</section>\n<section class=\"metric-strip\"><article><small>Predictions remaining</small><strong>30</strong><p>of 60 team credits</p></article><article><small>Saved predictions</small><strong>30</strong><p>Available to reopen</p></article><article><small>Current plan</small><strong>Elite</strong><p>Team credits enabled</p></article><article><small>Most used</small><strong>Position fit</strong><p>14 completed runs</p></article></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Prediction history</h3><p>Question, evidence, inputs and outcome</p></div>\n<button class=\"btn secondary\" type=\"button\">Export history</button>\n</header>\n<div class=\"data-table\"><div class=\"data-head history-head prediction-history-head\"><span>Player</span><span>Prediction</span><span>Outcome</span><span>Run</span><span></span></div><div class=\"history-row prediction-history-row\"><div class=\"player-cell\"><span class=\"initials-box\">EC</span><div><b>Ethan Cole</b><small>Northgate United</small></div></div><span class=\"status green\">Position fit</span><span>Centre Forward · 86/100</span><span>27 Jul 2026</span><button class=\"text-action\">Open</button></div><div class=\"history-row prediction-history-row\"><div class=\"player-cell\"><span class=\"initials-box\">MJ</span><div><b>Maya Johnson</b><small>Eastbrook Athletic</small></div></div><span class=\"status green\">Development projection</span><span>Creative output remains strongest</span><span>24 Jul 2026</span><button class=\"text-action\">Open</button></div><div class=\"history-row prediction-history-row\"><div class=\"player-cell\"><span class=\"initials-box\">CH</span><div><b>Carter Hill</b><small>Northgate United</small></div></div><span class=\"status green\">Match scenario</span><span>Strong in wide isolation</span><span>21 Jul 2026</span><button class=\"text-action\">Open</button></div><div class=\"history-row prediction-history-row\"><div class=\"player-cell\"><span class=\"initials-box\">AK</span><div><b>Amir Khan</b><small>Harbour City</small></div></div><span class=\"status green\">ROI and value</span><span>Balanced acquisition risk</span><span>18 Jul 2026</span><button class=\"text-action\">Open</button></div><div class=\"history-row prediction-history-row\"><div class=\"player-cell\"><span class=\"initials-box\">KJ</span><div><b>Kai Jones</b><small>Eastbrook Athletic</small></div></div><span class=\"status green\">Position fit</span><span>CDM · 91/100</span><span>15 Jul 2026</span><button class=\"text-action\">Open</button></div><div class=\"history-row prediction-history-row\"><div class=\"player-cell\"><span class=\"initials-box\">EC</span><div><b>Ethan Cole</b><small>Northgate United</small></div></div><span class=\"status green\">ROI and value</span><span>Monitor current value range</span><span>11 Jul 2026</span><button class=\"text-action\">Open</button></div></div>\n</section>\n<section class=\"report-type-grid\">\n<article class=\"report-type\"><h4>Position fit</h4><p>Test a current, future or target role against the player evidence.</p></article>\n<article class=\"report-type\"><h4>Development projection</h4><p>Model a selected development focus and explain the direction.</p></article>\n<article class=\"report-type\"><h4>ROI and value</h4><p>Review cost, value upside and downside assumptions.</p></article>\n<article class=\"report-type\"><h4>Match scenario</h4><p>Assess a defined role-specific tactical situation.</p></article>\n</section>\n</main>\n</section>\n</div>\n</div></div>","mobile":"<div class=\"mobile-site\"><div class=\"scout-app mobile-app\">\n<header class=\"mobile-topbar\">\n<a><span class=\"sl-logo\">Scout<span>Link</span></span></a>\n<strong>Predictions</strong>\n<button>Menu</button>\n</header>\n<main class=\"mobile-content\">\n<section class=\"page-hero navy\">\n<div><span>Decision-support history</span><h2>Saved predictions.</h2><p>Open previous results here. Start a new prediction from the exact player profile.</p></div>\n<div class=\"button-row hero-actions\"><button class=\"btn white\" type=\"button\">Find a player</button><button class=\"btn ghost\" type=\"button\">How predictions work</button></div>\n</section>\n<section class=\"metric-strip\"><article><small>Remaining</small><strong>30 / 60</strong><p>Team credits</p></article><article><small>Saved</small><strong>30</strong><p>Available to reopen</p></article><article><small>Plan</small><strong>Elite</strong><p>Team allowance</p></article><article><small>Most used</small><strong>Position fit</strong><p>14 runs</p></article></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Prediction history</h3><p>Six recent results</p></div>\n</header>\n<section class=\"mobile-prediction-history\">\n<article class=\"mobile-prediction-card\">\n<header>\n<span class=\"initials-box\">EC</span>\n<div>\n<h4>Ethan Cole</h4>\n<p>Northgate United</p>\n</div>\n<time>27 Jul 2026</time>\n</header>\n<div class=\"prediction-card-type\">Position fit</div>\n<section class=\"prediction-card-outcome\">\n<small>Outcome</small>\n<p>Centre Forward · 86/100</p>\n</section>\n<button class=\"btn secondary\" type=\"button\">Open result</button>\n</article>\n<article class=\"mobile-prediction-card\">\n<header>\n<span class=\"initials-box\">MJ</span>\n<div>\n<h4>Maya Johnson</h4>\n<p>Eastbrook Athletic</p>\n</div>\n<time>24 Jul 2026</time>\n</header>\n<div class=\"prediction-card-type\">Development projection</div>\n<section class=\"prediction-card-outcome\">\n<small>Outcome</small>\n<p>Creative output remains strongest</p>\n</section>\n<button class=\"btn secondary\" type=\"button\">Open result</button>\n</article>\n<article class=\"mobile-prediction-card\">\n<header>\n<span class=\"initials-box\">CH</span>\n<div>\n<h4>Carter Hill</h4>\n<p>Northgate United</p>\n</div>\n<time>21 Jul 2026</time>\n</header>\n<div class=\"prediction-card-type\">Match scenario</div>\n<section class=\"prediction-card-outcome\">\n<small>Outcome</small>\n<p>Strong in wide isolation</p>\n</section>\n<button class=\"btn secondary\" type=\"button\">Open result</button>\n</article>\n<article class=\"mobile-prediction-card\">\n<header>\n<span class=\"initials-box\">AK</span>\n<div>\n<h4>Amir Khan</h4>\n<p>Harbour City</p>\n</div>\n<time>18 Jul 2026</time>\n</header>\n<div class=\"prediction-card-type\">ROI and value</div>\n<section class=\"prediction-card-outcome\">\n<small>Outcome</small>\n<p>Balanced acquisition risk</p>\n</section>\n<button class=\"btn secondary\" type=\"button\">Open result</button>\n</article>\n<article class=\"mobile-prediction-card\">\n<header>\n<span class=\"initials-box\">KJ</span>\n<div>\n<h4>Kai Jones</h4>\n<p>Eastbrook Athletic</p>\n</div>\n<time>15 Jul 2026</time>\n</header>\n<div class=\"prediction-card-type\">Position fit</div>\n<section class=\"prediction-card-outcome\">\n<small>Outcome</small>\n<p>CDM · 91/100</p>\n</section>\n<button class=\"btn secondary\" type=\"button\">Open result</button>\n</article>\n<article class=\"mobile-prediction-card\">\n<header>\n<span class=\"initials-box\">EC</span>\n<div>\n<h4>Ethan Cole</h4>\n<p>Northgate United</p>\n</div>\n<time>11 Jul 2026</time>\n</header>\n<div class=\"prediction-card-type\">ROI and value</div>\n<section class=\"prediction-card-outcome\">\n<small>Outcome</small>\n<p>Monitor current value range</p>\n</section>\n<button class=\"btn secondary\" type=\"button\">Open result</button>\n</article>\n</section></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Available prediction types</h3><p>Started from player profiles</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"prediction-types\"><button class=\"prediction-type\"><b>Position fit</b><span>Current, future or target role.</span></button><button class=\"prediction-type\"><b>Development projection</b><span>Selected development focus.</span></button><button class=\"prediction-type\"><b>ROI and value</b><span>Cost, upside and downside.</span></button><button class=\"prediction-type\"><b>Match scenario</b><span>Defined tactical situation.</span></button></div></div></section>\n</main>\n<nav class=\"mobile-nav\"><a class=\"\"><span>HM</span><b>Home</b></a><a class=\"\"><span>PS</span><b>Search</b></a><a class=\"\"><span>MP</span><b>Pipeline</b></a><a class=\"\"><span>CH</span><b>Chat</b></a><a class=\"active\"><span>MR</span><b>More</b></a></nav>\n</div></div>"},"usage":{"desktop":"<div class=\"desktop-site\"><div class=\"scout-app desktop-app\">\n<div class=\"desktop-shell\">\n<aside class=\"scout-sidebar\">\n<a class=\"sidebar-logo\"><span class=\"sl-logo\">Scout<span>Link</span></span></a>\n<nav><section class=\"nav-group\"><small>Core</small><a class=\"nav-link\"><span>DB</span><b>Dashboard</b></a><a class=\"nav-link\"><span>PS</span><b>Player search</b></a><a class=\"nav-link\"><span>MP</span><b>My pipeline</b></a><a class=\"nav-link\"><span>RK</span><b>Rankings</b></a></section><section class=\"nav-group\"><small>Scouting tools</small><a class=\"nav-link\"><span>FX</span><b>Fixtures</b></a><a class=\"nav-link\"><span>PR</span><b>Predictions</b></a><a class=\"nav-link\"><span>EX</span><b>Exports</b></a><a class=\"nav-link\"><span>CP</span><b>Compare players</b></a><a class=\"nav-link\"><span>SS</span><b>Scout setup</b></a></section><section class=\"nav-group\"><small>Network</small><a class=\"nav-link\"><span>EV</span><b>Events</b></a><a class=\"nav-link\"><span>CH</span><b>Chat</b></a><a class=\"nav-link\"><span>NT</span><b>Notifications</b></a><a class=\"nav-link\"><span>RC</span><b>Report a concern</b></a></section><section class=\"nav-group\"><small>Account</small><a class=\"nav-link active\"><span>UR</span><b>Usage requests</b></a><a class=\"nav-link\"><span>ST</span><b>Settings</b></a></section></nav>\n<div class=\"sidebar-user\">\n<span class=\"initials-box\">NP</span>\n<div><b>Noah Patel</b><small>Reviewed Scout · Elite</small></div>\n</div>\n</aside>\n<section class=\"workspace\">\n<header class=\"desktop-topbar\">\n<div><span>Scout workspace</span><h1>Usage requests</h1></div>\n<div class=\"top-actions\">\n<button class=\"icon-btn\">NT<i>3</i></button>\n<span class=\"team-chip\">ScoutLink Recruitment Team</span>\n<button class=\"user-btn\"><span class=\"initials-box small\">NP</span><b>Noah</b></button>\n</div>\n</header>\n<main class=\"workspace-content\">\n<section class=\"page-hero navy\">\n<div><span>Allowance tracking</span><h2>Request extra Scout allowances.</h2><p>Review live team totals, request more predictions, exports or pipeline interests and follow the Stratex Admin decision.</p></div>\n<div class=\"button-row hero-actions\"><button class=\"btn primary\" type=\"button\">New request</button></div>\n</section>\n<section class=\"usage-current\"><span>Current plan and usage</span><h3>Elite team allowances</h3><p>The same totals appear on Dashboard, Predictions, Exports and Pipeline.</p><div class=\"allowance-list\">\n<article class=\"allowance\">\n<div><small>Prediction credits</small><b>30 of 60 used</b><span>30 remaining</span></div>\n<i><em style=\"width:50%\"></em></i>\n</article>\n<article class=\"allowance\">\n<div><small>Exports</small><b>4 of 300 used</b><span>296 remaining</span></div>\n<i><em style=\"width:1%\"></em></i>\n</article>\n<article class=\"allowance\">\n<div><small>Pipeline interests</small><b>7 of 300 used</b><span>293 remaining</span></div>\n<i><em style=\"width:2%\"></em></i>\n</article>\n</div></section>\n<section class=\"metric-strip\"><article><small>Pending review</small><strong>1</strong><p>Awaiting Stratex Admin</p></article><article><small>Approved</small><strong>2</strong><p>Allowance applied</p></article><article><small>Payment link sent</small><strong>1</strong><p>Awaiting payment</p></article><article><small>Declined</small><strong>0</strong><p>No allowance added</p></article></section>\n<div class=\"usage-layout\"><section class=\"panel\" style=\"margin-top:0\">\n<header class=\"panel-head\">\n<div><h3>Request history</h3><p>Select a request to view its audit trail</p></div>\n</header>\n<div class=\"request-list\"><button class=\"request-item active\"><div><small>Pending review</small><b>Prediction credits</b><p>20 additional credits · Submitted 27 Jul 2026</p></div><span class=\"status gold\">Pending review</span></button><button class=\"request-item\"><div><small>Payment link sent</small><b>Exports</b><p>100 additional exports · Updated 22 Jul 2026</p></div><span class=\"status gold\">Payment link sent</span></button><button class=\"request-item\"><div><small>Approved</small><b>Pipeline interests</b><p>50 additional interests · Applied 14 Jul 2026</p></div><span class=\"status green\">Approved</span></button></div></section><section class=\"request-detail\">\n<header><div><span style=\"color:var(--green);font-size:7px;font-weight:900;text-transform:uppercase\">Pending review</span><h3>20 additional prediction credits</h3></div><span class=\"status gold\">Awaiting Stratex Admin</span></header>\n<div class=\"request-facts\"><div><small>Feature</small><b>Predictions</b></div><div><small>Requested</small><b>20 credits</b></div><div><small>Current plan</small><b>Elite</b></div><div><small>Submitted</small><b>27 Jul 2026</b></div></div>\n<div class=\"timeline\">\n<article><span>1</span><div><b>Request submitted</b><p>Noah requested 20 prediction credits for the recruitment team.</p></div></article>\n<article><span>2</span><div><b>Internal review started</b><p>Stratex Admin is reviewing current usage and the reason supplied.</p></div></article>\n<article><span>3</span><div><b>Decision pending</b><p>The request may be approved, declined or returned with a payment link.</p></div></article>\n</div>\n<div class=\"payment-note\"><b>Permanent audit trail</b><p>Every decision, payment state and allowance update remains attached to this request.</p></div>\n</section></div>\n</main>\n</section>\n</div>\n</div></div>","mobile":"<div class=\"mobile-site\"><div class=\"scout-app mobile-app\">\n<header class=\"mobile-topbar\">\n<a><span class=\"sl-logo\">Scout<span>Link</span></span></a>\n<strong>Usage requests</strong>\n<button>Menu</button>\n</header>\n<main class=\"mobile-content\">\n<section class=\"page-hero navy\">\n<div><span>Allowance tracking</span><h2>Request extra allowances.</h2><p>See current usage and follow each request without compressed tables.</p></div>\n<div class=\"button-row hero-actions\"><button class=\"btn white\" type=\"button\">New request</button></div>\n</section>\n<section class=\"usage-current\"><span>Elite team allowances</span><h3>Current usage</h3><div class=\"allowance-list\">\n<article class=\"allowance\">\n<div><small>Prediction credits</small><b>30 of 60 used</b><span>30 remaining</span></div>\n<i><em style=\"width:50%\"></em></i>\n</article>\n<article class=\"allowance\">\n<div><small>Exports</small><b>4 of 300 used</b><span>296 remaining</span></div>\n<i><em style=\"width:1%\"></em></i>\n</article>\n<article class=\"allowance\">\n<div><small>Pipeline interests</small><b>7 of 300 used</b><span>293 remaining</span></div>\n<i><em style=\"width:2%\"></em></i>\n</article>\n</div></section>\n<section class=\"metric-strip\"><article><small>Pending</small><strong>1</strong><p>Admin review</p></article><article><small>Approved</small><strong>2</strong><p>Applied</p></article><article><small>Payment</small><strong>1</strong><p>Awaiting payment</p></article><article><small>Declined</small><strong>0</strong><p>No allowance</p></article></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Request history</h3><p>Three requests</p></div>\n</header>\n<div class=\"request-list\"><button class=\"request-item active\"><div><small>Pending review</small><b>Prediction credits</b><p>20 additional credits · Submitted 27 Jul 2026</p></div><span class=\"status gold\">Pending review</span></button><button class=\"request-item\"><div><small>Payment link sent</small><b>Exports</b><p>100 additional exports · Updated 22 Jul 2026</p></div><span class=\"status gold\">Payment link sent</span></button><button class=\"request-item\"><div><small>Approved</small><b>Pipeline interests</b><p>50 additional interests · Applied 14 Jul 2026</p></div><span class=\"status green\">Approved</span></button></div></section>\n<section class=\"request-detail\">\n<header><div><span style=\"color:var(--green);font-size:7px;font-weight:900;text-transform:uppercase\">Pending review</span><h3>20 additional prediction credits</h3></div><span class=\"status gold\">Awaiting Stratex Admin</span></header>\n<div class=\"request-facts\"><div><small>Feature</small><b>Predictions</b></div><div><small>Requested</small><b>20 credits</b></div><div><small>Current plan</small><b>Elite</b></div><div><small>Submitted</small><b>27 Jul 2026</b></div></div>\n<div class=\"timeline\">\n<article><span>1</span><div><b>Request submitted</b><p>Noah requested 20 prediction credits for the recruitment team.</p></div></article>\n<article><span>2</span><div><b>Internal review started</b><p>Stratex Admin is reviewing current usage and the reason supplied.</p></div></article>\n<article><span>3</span><div><b>Decision pending</b><p>The request may be approved, declined or returned with a payment link.</p></div></article>\n</div>\n<div class=\"payment-note\"><b>Permanent audit trail</b><p>Every decision, payment state and allowance update remains attached to this request.</p></div>\n</section>\n</main>\n<nav class=\"mobile-nav\"><a class=\"\"><span>HM</span><b>Home</b></a><a class=\"\"><span>PS</span><b>Search</b></a><a class=\"\"><span>MP</span><b>Pipeline</b></a><a class=\"\"><span>CH</span><b>Chat</b></a><a class=\"active\"><span>MR</span><b>More</b></a></nav>\n</div></div>"},"exports":{"desktop":"<div class=\"desktop-site\"><div class=\"scout-app desktop-app\">\n<div class=\"desktop-shell\">\n<aside class=\"scout-sidebar\">\n<a class=\"sidebar-logo\"><span class=\"sl-logo\">Scout<span>Link</span></span></a>\n<nav><section class=\"nav-group\"><small>Core</small><a class=\"nav-link\"><span>DB</span><b>Dashboard</b></a><a class=\"nav-link\"><span>PS</span><b>Player search</b></a><a class=\"nav-link\"><span>MP</span><b>My pipeline</b></a><a class=\"nav-link\"><span>RK</span><b>Rankings</b></a></section><section class=\"nav-group\"><small>Scouting tools</small><a class=\"nav-link\"><span>FX</span><b>Fixtures</b></a><a class=\"nav-link\"><span>PR</span><b>Predictions</b></a><a class=\"nav-link active\"><span>EX</span><b>Exports</b></a><a class=\"nav-link\"><span>CP</span><b>Compare players</b></a><a class=\"nav-link\"><span>SS</span><b>Scout setup</b></a></section><section class=\"nav-group\"><small>Network</small><a class=\"nav-link\"><span>EV</span><b>Events</b></a><a class=\"nav-link\"><span>CH</span><b>Chat</b></a><a class=\"nav-link\"><span>NT</span><b>Notifications</b></a><a class=\"nav-link\"><span>RC</span><b>Report a concern</b></a></section><section class=\"nav-group\"><small>Account</small><a class=\"nav-link\"><span>UR</span><b>Usage requests</b></a><a class=\"nav-link\"><span>ST</span><b>Settings</b></a></section></nav>\n<div class=\"sidebar-user\">\n<span class=\"initials-box\">NP</span>\n<div><b>Noah Patel</b><small>Reviewed Scout · Elite</small></div>\n</div>\n</aside>\n<section class=\"workspace\">\n<header class=\"desktop-topbar\">\n<div><span>Scout workspace</span><h1>Exports</h1></div>\n<div class=\"top-actions\">\n<button class=\"icon-btn\">NT<i>3</i></button>\n<span class=\"team-chip\">ScoutLink Recruitment Team</span>\n<button class=\"user-btn\"><span class=\"initials-box small\">NP</span><b>Noah</b></button>\n</div>\n</header>\n<main class=\"workspace-content\">\n<section class=\"page-hero navy\">\n<div><span>Report library</span><h2>Exports.</h2><p>Review and download reports created from player profiles, predictions, the pipeline and player comparisons.</p></div>\n<div class=\"button-row hero-actions\"><button class=\"btn primary\" type=\"button\">Find players</button><button class=\"btn ghost\" type=\"button\">Export settings</button></div>\n</section>\n<section class=\"metric-strip\"><article><small>Exports remaining</small><strong>296</strong><p>of 300</p></article><article><small>Reports stored</small><strong>5</strong><p>Available in history</p></article><article><small>Profile reports</small><strong>3</strong><p>Player and prediction dossiers</p></article><article><small>Other exports</small><strong>2</strong><p>Pipeline and comparisons</p></article></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Export usage</h3><p>Historical downloads do not consume another export</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"allowance-list\">\n<article class=\"allowance\">\n<div><small>Team exports</small><b>4 of 300 used</b><span>296 remaining</span></div>\n<i><em style=\"width:1%\"></em></i>\n</article>\n</div></div></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Report history</h3><p>Files remain available to re-download</p></div>\n</header>\n<div class=\"data-table\"><div class=\"data-head history-head export-history-head\"><span>Report</span><span>Type</span><span>Created</span><span>Status</span><span></span></div><div class=\"history-row export-history-row\"><div class=\"player-cell\"><span class=\"initials-box\">EC</span><div><b>Ethan Cole</b><small>Profile dossier</small></div></div><span>PDF</span><span>27 Jul 2026</span><span class=\"status green\">Ready</span><button class=\"text-action\">Download</button></div><div class=\"history-row export-history-row\"><div class=\"player-cell\"><span class=\"initials-box\">EC</span><div><b>Ethan Cole</b><small>Position-fit prediction</small></div></div><span>PDF</span><span>27 Jul 2026</span><span class=\"status green\">Ready</span><button class=\"text-action\">Download</button></div><div class=\"history-row export-history-row\"><div class=\"player-cell\"><span class=\"initials-box\">MJ</span><div><b>Maya Johnson</b><small>Player profile</small></div></div><span>PDF</span><span>24 Jul 2026</span><span class=\"status green\">Ready</span><button class=\"text-action\">Download</button></div><div class=\"history-row export-history-row\"><div class=\"player-cell\"><span class=\"initials-box\">TP</span><div><b>Team pipeline</b><small>Pipeline export</small></div></div><span>CSV</span><span>21 Jul 2026</span><span class=\"status green\">Ready</span><button class=\"text-action\">Download</button></div><div class=\"history-row export-history-row\"><div class=\"player-cell\"><span class=\"initials-box\">ER</span><div><b>Ethan vs Reuben</b><small>Player comparison</small></div></div><span>PDF</span><span>19 Jul 2026</span><span class=\"status green\">Ready</span><button class=\"text-action\">Download</button></div></div></section>\n<section class=\"report-type-grid\"><article class=\"report-type\"><h4>Profile dossier</h4><p>Player evidence, attributes, value and compatibility.</p></article><article class=\"report-type\"><h4>Prediction report</h4><p>Question, inputs, result and caveats.</p></article><article class=\"report-type\"><h4>Pipeline or comparison</h4><p>Recruitment workflow and decision trade-offs.</p></article></section>\n</main>\n</section>\n</div>\n</div></div>","mobile":"<div class=\"mobile-site\"><div class=\"scout-app mobile-app\">\n<header class=\"mobile-topbar\">\n<a><span class=\"sl-logo\">Scout<span>Link</span></span></a>\n<strong>Exports</strong>\n<button>Menu</button>\n</header>\n<main class=\"mobile-content\">\n<section class=\"page-hero navy\">\n<div><span>Report library</span><h2>Exports.</h2><p>Download existing reports. New reports are created from the relevant player, prediction, pipeline or comparison.</p></div>\n<div class=\"button-row hero-actions\"><button class=\"btn white\" type=\"button\">Find players</button></div>\n</section>\n<section class=\"metric-strip\"><article><small>Remaining</small><strong>296 / 300</strong><p>Team exports</p></article><article><small>Reports</small><strong>5</strong><p>Stored</p></article><article><small>Profiles</small><strong>3</strong><p>Dossiers</p></article><article><small>Other</small><strong>2</strong><p>Pipeline and comparisons</p></article></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Export usage</h3><p>Current allowance</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"allowance-list\">\n<article class=\"allowance\">\n<div><small>Team exports</small><b>4 of 300 used</b><span>296 remaining</span></div>\n<i><em style=\"width:1%\"></em></i>\n</article>\n</div></div></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Report history</h3><p>Five stored reports</p></div>\n</header>\n<div class=\"history-mobile-list\">\n<button class=\"mobile-list-row\" type=\"button\">\n<span class=\"initials-box\">EC</span>\n<div><h4>Ethan Cole</h4><p>Profile dossier</p><small>PDF · 27 Jul 2026</small></div>\n<strong>Ready</strong>\n<i>›</i>\n</button>\n<button class=\"mobile-list-row\" type=\"button\">\n<span class=\"initials-box\">EC</span>\n<div><h4>Ethan Cole</h4><p>Position-fit prediction</p><small>PDF · 27 Jul 2026</small></div>\n<strong>Ready</strong>\n<i>›</i>\n</button>\n<button class=\"mobile-list-row\" type=\"button\">\n<span class=\"initials-box\">MJ</span>\n<div><h4>Maya Johnson</h4><p>Player profile</p><small>PDF · 24 Jul 2026</small></div>\n<strong>Ready</strong>\n<i>›</i>\n</button>\n<button class=\"mobile-list-row\" type=\"button\">\n<span class=\"initials-box\">TP</span>\n<div><h4>Team pipeline</h4><p>Pipeline export</p><small>CSV · 21 Jul 2026</small></div>\n<strong>Ready</strong>\n<i>›</i>\n</button>\n<button class=\"mobile-list-row\" type=\"button\">\n<span class=\"initials-box\">ER</span>\n<div><h4>Ethan vs Reuben</h4><p>Player comparison</p><small>PDF · 19 Jul 2026</small></div>\n<strong>Ready</strong>\n<i>›</i>\n</button>\n</div></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Report types</h3><p>Created from the relevant workflow</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"report-type-grid\"><article class=\"report-type\"><h4>Profile dossier</h4><p>Evidence, attributes, value and fit.</p></article><article class=\"report-type\"><h4>Prediction report</h4><p>Inputs, outcome and caveats.</p></article><article class=\"report-type\"><h4>Pipeline or comparison</h4><p>Workflow and decision trade-offs.</p></article></div></div></section>\n</main>\n<nav class=\"mobile-nav\"><a class=\"\"><span>HM</span><b>Home</b></a><a class=\"\"><span>PS</span><b>Search</b></a><a class=\"\"><span>MP</span><b>Pipeline</b></a><a class=\"\"><span>CH</span><b>Chat</b></a><a class=\"active\"><span>MR</span><b>More</b></a></nav>\n</div></div>"},"compare":{"desktop":"<div class=\"desktop-site\"><div class=\"scout-app desktop-app\">\n<div class=\"desktop-shell\">\n<aside class=\"scout-sidebar\">\n<a class=\"sidebar-logo\"><span class=\"sl-logo\">Scout<span>Link</span></span></a>\n<nav><section class=\"nav-group\"><small>Core</small><a class=\"nav-link\"><span>DB</span><b>Dashboard</b></a><a class=\"nav-link\"><span>PS</span><b>Player search</b></a><a class=\"nav-link\"><span>MP</span><b>My pipeline</b></a><a class=\"nav-link\"><span>RK</span><b>Rankings</b></a></section><section class=\"nav-group\"><small>Scouting tools</small><a class=\"nav-link\"><span>FX</span><b>Fixtures</b></a><a class=\"nav-link\"><span>PR</span><b>Predictions</b></a><a class=\"nav-link\"><span>EX</span><b>Exports</b></a><a class=\"nav-link active\"><span>CP</span><b>Compare players</b></a><a class=\"nav-link\"><span>SS</span><b>Scout setup</b></a></section><section class=\"nav-group\"><small>Network</small><a class=\"nav-link\"><span>EV</span><b>Events</b></a><a class=\"nav-link\"><span>CH</span><b>Chat</b></a><a class=\"nav-link\"><span>NT</span><b>Notifications</b></a><a class=\"nav-link\"><span>RC</span><b>Report a concern</b></a></section><section class=\"nav-group\"><small>Account</small><a class=\"nav-link\"><span>UR</span><b>Usage requests</b></a><a class=\"nav-link\"><span>ST</span><b>Settings</b></a></section></nav>\n<div class=\"sidebar-user\">\n<span class=\"initials-box\">NP</span>\n<div><b>Noah Patel</b><small>Reviewed Scout · Elite</small></div>\n</div>\n</aside>\n<section class=\"workspace\">\n<header class=\"desktop-topbar\">\n<div><span>Scout workspace</span><h1>Compare players</h1></div>\n<div class=\"top-actions\">\n<button class=\"icon-btn\">NT<i>3</i></button>\n<span class=\"team-chip\">ScoutLink Recruitment Team</span>\n<button class=\"user-btn\"><span class=\"initials-box small\">NP</span><b>Noah</b></button>\n</div>\n</header>\n<main class=\"workspace-content\">\n<section class=\"page-hero navy\">\n<div><span>Comparison decision engine</span><h2>Compare two players in the real recruitment context.</h2><p>Select two accessible player records. The decision context changes the category weights and the recommendation.</p></div>\n<div class=\"button-row hero-actions\"><button class=\"btn primary\" type=\"button\">New comparison</button></div>\n</section>\n<section class=\"metric-strip\"><article><small>Accessible players</small><strong>56</strong><p>Current database</p></article><article><small>Selected players</small><strong>2 / 2</strong><p>Two different records</p></article><article><small>Decision context</small><strong>Immediate starter</strong><p>Changes category weights</p></article><article><small>Current plan</small><strong>Elite</strong><p>Comparison uses no prediction credit</p></article></section>\n<section class=\"compare-selection\">\n<div><label class=\"field\"><span>Player A</span><div class=\"control\">Ethan Cole</div></label><article class=\"selected-player\"><span class=\"initials-box\">EC</span><div><b>Ethan Cole</b><small>ST · U16 · Northgate United</small></div><strong>84</strong></article></div>\n<div><label class=\"field\"><span>Player B</span><div class=\"control\">Reuben Hughes</div></label><article class=\"selected-player\"><span class=\"initials-box\">RH</span><div><b>Reuben Hughes</b><small>ST · U16 · Eastbrook Athletic</small></div><strong>85</strong></article></div>\n</section>\n<section class=\"compare-context\"><label class=\"field\"><span>Decision context</span><div class=\"control select\">Immediate starter<i>⌄</i></div></label><label class=\"field\"><span>Target position</span><div class=\"control select\">Centre Forward<i>⌄</i></div></label><label class=\"field\"><span>Budget</span><div class=\"control\">£350,000</div></label><button class=\"btn primary\" type=\"button\">Compare and explain</button></section>\n<section class=\"compare-recommendation\"><div><span>Recommendation</span><h3>Ethan Cole is the stronger immediate fit.</h3><p>Formation, team-need and value context outweigh Reuben’s narrow physical and evidence advantage.</p></div><strong>+3.8</strong></section>\n<section class=\"compare-head\"><article class=\"compare-player-card\"><span class=\"initials-box\">EC</span><div><h4>Ethan Cole</h4><p>ST · U16 · £160k · Fit 86%</p></div><strong>84</strong></article><article class=\"compare-player-card\"><span class=\"initials-box\">RH</span><div><h4>Reuben Hughes</h4><p>ST · U16 · £344k · Fit 82%</p></div><strong>85</strong></article></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Category-by-category explanation</h3><p>Each row uses the immediate-starter context weight</p></div>\n</header>\n<div class=\"data-table\"><div class=\"data-head compare-category-head\"><span>Category</span><span>Ethan</span><span>Reuben</span><span>Leader</span></div><div class=\"compare-category-row\"><span>Technical quality</span><b>92</b><b>88</b><span>Ethan</span></div><div class=\"compare-category-row\"><span>Tactical intelligence</span><b>88</b><b>90</b><span>Reuben</span></div><div class=\"compare-category-row\"><span>Physical profile</span><b>84</b><b>89</b><span>Reuben</span></div><div class=\"compare-category-row\"><span>Match output</span><b>78</b><b>82</b><span>Reuben</span></div><div class=\"compare-category-row\"><span>Need fit</span><b>90</b><b>87</b><span>Ethan</span></div><div class=\"compare-category-row\"><span>Role fit</span><b>86</b><b>83</b><span>Ethan</span></div><div class=\"compare-category-row\"><span>Formation fit</span><b>92</b><b>86</b><span>Ethan</span></div><div class=\"compare-category-row\"><span>Evidence fit</span><b>82</b><b>88</b><span>Reuben</span></div></div></section>\n<div class=\"two-col\"><section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>What could change the recommendation</h3></div>\n</header>\n<div class=\"panel-body\"><ul style=\"margin:0;padding-left:16px;font-size:8px;line-height:1.6\"><li>A lower evidence threshold.</li><li>A more physical target-role brief.</li><li>A larger working budget.</li></ul></div></section><section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Most important trade-off</h3></div>\n</header>\n<div class=\"panel-body\"><div class=\"recommendation\"><b>Immediate fit versus proven physical output.</b><br/>Ethan fits the current team context more cleanly; Reuben carries stronger physical and repeated evidence.</div></div></section></div>\n<div class=\"button-row comparison-actions\"><button class=\"btn primary\" type=\"button\">Open recommended profile</button><button class=\"btn secondary\" type=\"button\">Export comparison</button></div>\n</main>\n</section>\n</div>\n</div></div>","mobile":"<div class=\"mobile-site\"><div class=\"scout-app mobile-app\">\n<header class=\"mobile-topbar\">\n<a><span class=\"sl-logo\">Scout<span>Link</span></span></a>\n<strong>Compare</strong>\n<button>Menu</button>\n</header>\n<main class=\"mobile-content\">\n<section class=\"page-hero navy\">\n<div><span>Comparison decision engine</span><h2>Compare two players.</h2><p>Keep the selection, context and trade-offs readable on a phone.</p></div>\n<div class=\"button-row hero-actions\"><button class=\"btn white\" type=\"button\">New comparison</button></div>\n</section>\n<section class=\"compare-selection\"><div><label class=\"field\"><span>Player A</span><div class=\"control\">Ethan Cole</div></label><article class=\"selected-player\"><span class=\"initials-box\">EC</span><div><b>Ethan Cole</b><small>ST · U16 · £160k</small></div><strong>84</strong></article></div><div><label class=\"field\"><span>Player B</span><div class=\"control\">Reuben Hughes</div></label><article class=\"selected-player\"><span class=\"initials-box\">RH</span><div><b>Reuben Hughes</b><small>ST · U16 · £344k</small></div><strong>85</strong></article></div></section>\n<section class=\"compare-context\"><label class=\"field\"><span>Decision context</span><div class=\"control select\">Immediate starter<i>⌄</i></div></label><label class=\"field\"><span>Target position</span><div class=\"control select\">Centre Forward<i>⌄</i></div></label><label class=\"field\"><span>Budget</span><div class=\"control\">£350,000</div></label><button class=\"btn primary\" type=\"button\">Compare and explain</button></section>\n<section class=\"compare-recommendation\"><div><span>Recommendation</span><h3>Ethan Cole is the stronger immediate fit.</h3><p>Formation, need and value outweigh Reuben’s physical advantage.</p></div><strong>+3.8</strong></section>\n<section class=\"compare-head\"><article class=\"compare-player-card\"><span class=\"initials-box\">EC</span><div><h4>Ethan Cole</h4><p>Fit 86% · £160k</p></div><strong>84</strong></article><article class=\"compare-player-card\"><span class=\"initials-box\">RH</span><div><h4>Reuben Hughes</h4><p>Fit 82% · £344k</p></div><strong>85</strong></article></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Category explanation</h3><p>Immediate-starter weights</p></div>\n</header>\n<div><div class=\"compare-category-row\"><span>Technical quality</span><b>92</b><b>88</b><span>Ethan</span></div><div class=\"compare-category-row\"><span>Tactical intelligence</span><b>88</b><b>90</b><span>Reuben</span></div><div class=\"compare-category-row\"><span>Physical profile</span><b>84</b><b>89</b><span>Reuben</span></div><div class=\"compare-category-row\"><span>Match output</span><b>78</b><b>82</b><span>Reuben</span></div><div class=\"compare-category-row\"><span>Need fit</span><b>90</b><b>87</b><span>Ethan</span></div><div class=\"compare-category-row\"><span>Role fit</span><b>86</b><b>83</b><span>Ethan</span></div><div class=\"compare-category-row\"><span>Formation fit</span><b>92</b><b>86</b><span>Ethan</span></div><div class=\"compare-category-row\"><span>Evidence fit</span><b>82</b><b>88</b><span>Reuben</span></div></div></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Most important trade-off</h3><p>Immediate fit versus physical output</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"recommendation\"><b>Ethan fits the current brief more cleanly.</b><br/>Reuben carries stronger physical and repeated evidence.</div></div></section>\n<div class=\"button-row\"><button class=\"btn primary\" type=\"button\">Open recommended profile</button><button class=\"btn secondary\" type=\"button\">Export comparison</button></div>\n</main>\n<nav class=\"mobile-nav\"><a class=\"\"><span>HM</span><b>Home</b></a><a class=\"\"><span>PS</span><b>Search</b></a><a class=\"\"><span>MP</span><b>Pipeline</b></a><a class=\"\"><span>CH</span><b>Chat</b></a><a class=\"active\"><span>MR</span><b>More</b></a></nav>\n</div></div>"},"setup":{"desktop":"<div class=\"desktop-site\"><div class=\"scout-app desktop-app\">\n<div class=\"desktop-shell\">\n<aside class=\"scout-sidebar\">\n<a class=\"sidebar-logo\"><span class=\"sl-logo\">Scout<span>Link</span></span></a>\n<nav><section class=\"nav-group\"><small>Core</small><a class=\"nav-link\"><span>DB</span><b>Dashboard</b></a><a class=\"nav-link\"><span>PS</span><b>Player search</b></a><a class=\"nav-link\"><span>MP</span><b>My pipeline</b></a><a class=\"nav-link\"><span>RK</span><b>Rankings</b></a></section><section class=\"nav-group\"><small>Scouting tools</small><a class=\"nav-link\"><span>FX</span><b>Fixtures</b></a><a class=\"nav-link\"><span>PR</span><b>Predictions</b></a><a class=\"nav-link\"><span>EX</span><b>Exports</b></a><a class=\"nav-link\"><span>CP</span><b>Compare players</b></a><a class=\"nav-link active\"><span>SS</span><b>Scout setup</b></a></section><section class=\"nav-group\"><small>Network</small><a class=\"nav-link\"><span>EV</span><b>Events</b></a><a class=\"nav-link\"><span>CH</span><b>Chat</b></a><a class=\"nav-link\"><span>NT</span><b>Notifications</b></a><a class=\"nav-link\"><span>RC</span><b>Report a concern</b></a></section><section class=\"nav-group\"><small>Account</small><a class=\"nav-link\"><span>UR</span><b>Usage requests</b></a><a class=\"nav-link\"><span>ST</span><b>Settings</b></a></section></nav>\n<div class=\"sidebar-user\">\n<span class=\"initials-box\">NP</span>\n<div><b>Noah Patel</b><small>Reviewed Scout · Elite</small></div>\n</div>\n</aside>\n<section class=\"workspace\">\n<header class=\"desktop-topbar\">\n<div><span>Scout workspace</span><h1>Scout setup</h1></div>\n<div class=\"top-actions\">\n<button class=\"icon-btn\">NT<i>3</i></button>\n<span class=\"team-chip\">ScoutLink Recruitment Team</span>\n<button class=\"user-btn\"><span class=\"initials-box small\">NP</span><b>Noah</b></button>\n</div>\n</header>\n<main class=\"workspace-content\">\n<section class=\"page-hero navy\">\n<div><span>Recruitment brief</span><h2>Keep the Scout setup concise and material.</h2><p>The saved brief changes search ordering, compatibility, comparisons and predictions. Select only factors that should genuinely change a decision.</p></div>\n<div class=\"button-row hero-actions\"><button class=\"btn ghost\" type=\"button\">Review impact</button><button class=\"btn primary\" type=\"button\">Save changes</button></div>\n</section>\n<nav class=\"setup-nav\"><a class=\"active\">Team context</a><a>Team weaknesses</a><a>Role expectations</a><a>Long-term goals</a><a>Search preferences</a></nav>\n<section class=\"impact-grid\"><article><b>Search impact</b><span>Explains why players match selected needs.</span></article><article><b>Comparison impact</b><span>Changes the recommendation when context changes.</span></article><article><b>Prediction impact</b><span>Keeps the brief visible in outputs.</span></article></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Scout profile</h3><p>Saved to Noah Patel</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"form-grid cols-2\"><label class=\"field\"><span>Team name</span><div class=\"control\">ScoutLink Recruitment Team</div></label><label class=\"field\"><span>Club or organisation</span><div class=\"control\">Stratex Demo FC</div></label><label class=\"field\"><span>Scout country</span><div class=\"control select\">England<i>⌄</i></div></label><label class=\"field\"><span>Scout region</span><div class=\"control select\">London<i>⌄</i></div></label><label class=\"field\"><span>Formation</span><div class=\"control select\">4-3-3<i>⌄</i></div></label><label class=\"field\"><span>Playing style</span><div class=\"control select\">Possession and high press<i>⌄</i></div></label></div></div></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Team weaknesses looking to be solved</h3><p>Select up to three</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"choice-grid\"><button class=\"choice selected\" type=\"button\"><span>✓</span><b>Insufficient game pace and speed</b></button><button class=\"choice\" type=\"button\"><span></span><b>Physical fragility and injury risk</b></button><button class=\"choice\" type=\"button\"><span></span><b>Lack of physical presence</b></button><button class=\"choice\" type=\"button\"><span></span><b>Weak defensive base</b></button><button class=\"choice\" type=\"button\"><span></span><b>Poor defensive output</b></button><button class=\"choice selected\" type=\"button\"><span>✓</span><b>Low team chemistry and leadership</b></button><button class=\"choice\" type=\"button\"><span></span><b>Technical deficiencies under pressure</b></button><button class=\"choice selected\" type=\"button\"><span>✓</span><b>Tactical awareness gaps</b></button><button class=\"choice\" type=\"button\"><span></span><b>Poor goal output</b></button></div></div></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Role expectations</h3><p>Select up to three</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"choice-grid\"><button class=\"choice\" type=\"button\"><span></span><b>Aerial dominance</b></button><button class=\"choice selected\" type=\"button\"><span>✓</span><b>Vision and creativity</b></button><button class=\"choice\" type=\"button\"><span></span><b>Speed and agility</b></button><button class=\"choice selected\" type=\"button\"><span>✓</span><b>Tactical intelligence</b></button><button class=\"choice\" type=\"button\"><span></span><b>Ball retention under pressure</b></button><button class=\"choice\" type=\"button\"><span></span><b>Physical resilience and work rate</b></button><button class=\"choice\" type=\"button\"><span></span><b>Defensive impact</b></button><button class=\"choice\" type=\"button\"><span></span><b>Offensive impact</b></button><button class=\"choice\" type=\"button\"><span></span><b>Progression and carrying</b></button><button class=\"choice selected\" type=\"button\"><span>✓</span><b>Leadership and communication</b></button></div></div></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Long-term goals</h3><p>Select up to three</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"choice-grid\"><button class=\"choice\" type=\"button\"><span></span><b>Physical growth potential</b></button><button class=\"choice selected\" type=\"button\"><span>✓</span><b>Tactical role maturity</b></button><button class=\"choice\" type=\"button\"><span></span><b>Leadership and coachability</b></button><button class=\"choice\" type=\"button\"><span></span><b>Injury risk and physical resilience</b></button><button class=\"choice selected\" type=\"button\"><span>✓</span><b>Positional depth advantage</b></button><button class=\"choice\" type=\"button\"><span></span><b>Goal contribution potential</b></button><button class=\"choice selected\" type=\"button\"><span>✓</span><b>Financial viability</b></button></div></div></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Search preferences</h3><p>Default player-discovery context</p></div>\n</header>\n<div class=\"panel-body\"><section class=\"preference-block\" style=\"margin-top:0;padding-top:0;border-top:0\"><header><h3>Age groups</h3></header><div class=\"chip-grid\"><button class=\"chip\">U7</button><button class=\"chip\">U8</button><button class=\"chip\">U9</button><button class=\"chip\">U10</button><button class=\"chip\">U11</button><button class=\"chip\">U12</button><button class=\"chip\">U13</button><button class=\"chip\">U14</button><button class=\"chip active\">U15</button><button class=\"chip active\">U16</button></div></section><section class=\"preference-block\"><header><h3>Preferred positions</h3></header><div class=\"chip-grid\"><button class=\"chip active\">GK</button><button class=\"chip active\">CB</button><button class=\"chip\">RB</button><button class=\"chip\">LB</button><button class=\"chip\">RWB</button><button class=\"chip\">LWB</button><button class=\"chip\">CDM</button><button class=\"chip\">CM</button><button class=\"chip active\">CAM</button><button class=\"chip\">LW</button><button class=\"chip\">RW</button><button class=\"chip active\">ST</button></div></section><div class=\"form-grid cols-2\"><label class=\"field\"><span>Salary cap</span><div class=\"control\">£500,000 per week</div></label><label class=\"field\"><span>Minimum appearances</span><div class=\"control\">3</div></label></div></div></section>\n<footer class=\"sticky-save\"><span>Last saved 27 July 2026 · 09:15</span><div class=\"button-row\"><button class=\"btn secondary\" type=\"button\">Cancel</button><button class=\"btn primary\" type=\"button\">Save and apply</button></div></footer>\n</main>\n</section>\n</div>\n</div></div>","mobile":"<div class=\"mobile-site\"><div class=\"scout-app mobile-app\">\n<header class=\"mobile-topbar\">\n<a><span class=\"sl-logo\">Scout<span>Link</span></span></a>\n<strong>Scout setup</strong>\n<button>Menu</button>\n</header>\n<main class=\"mobile-content\">\n<section class=\"page-hero navy\">\n<div><span>Recruitment brief</span><h2>Tell ScoutLink what the team needs.</h2><p>Every section remains available, but the phone presents one choice at a time.</p></div>\n<div class=\"button-row hero-actions\"><button class=\"btn white\" type=\"button\">Save changes</button></div>\n</section>\n<nav class=\"setup-nav\"><a class=\"active\">Team</a><a>Weaknesses</a><a>Roles</a><a>Goals</a><a>Search</a></nav>\n<section class=\"impact-grid\"><article><b>Search impact</b><span>Changes ordering.</span></article><article><b>Comparison impact</b><span>Changes recommendation.</span></article><article><b>Prediction impact</b><span>Keeps context visible.</span></article></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Team context</h3><p>Saved to Noah Patel</p></div>\n</header>\n<div class=\"panel-body\"><label class=\"field\"><span>Team name</span><div class=\"control\">ScoutLink Recruitment Team</div></label><label class=\"field\"><span>Club or organisation</span><div class=\"control\">Stratex Demo FC</div></label><label class=\"field\"><span>Scout country</span><div class=\"control select\">England<i>⌄</i></div></label><label class=\"field\"><span>Scout region</span><div class=\"control select\">London<i>⌄</i></div></label><label class=\"field\"><span>Formation</span><div class=\"control select\">4-3-3<i>⌄</i></div></label><label class=\"field\"><span>Playing style</span><div class=\"control select\">Possession and high press<i>⌄</i></div></label></div></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Team weaknesses</h3><p>Select up to three</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"choice-grid\"><button class=\"choice selected\" type=\"button\"><span>✓</span><b>Insufficient game pace and speed</b></button><button class=\"choice\" type=\"button\"><span></span><b>Physical fragility and injury risk</b></button><button class=\"choice\" type=\"button\"><span></span><b>Lack of physical presence</b></button><button class=\"choice\" type=\"button\"><span></span><b>Weak defensive base</b></button><button class=\"choice\" type=\"button\"><span></span><b>Poor defensive output</b></button><button class=\"choice selected\" type=\"button\"><span>✓</span><b>Low team chemistry and leadership</b></button><button class=\"choice\" type=\"button\"><span></span><b>Technical deficiencies under pressure</b></button><button class=\"choice selected\" type=\"button\"><span>✓</span><b>Tactical awareness gaps</b></button><button class=\"choice\" type=\"button\"><span></span><b>Poor goal output</b></button></div></div></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Role expectations</h3><p>Select up to three</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"choice-grid\"><button class=\"choice\" type=\"button\"><span></span><b>Aerial dominance</b></button><button class=\"choice selected\" type=\"button\"><span>✓</span><b>Vision and creativity</b></button><button class=\"choice\" type=\"button\"><span></span><b>Speed and agility</b></button><button class=\"choice selected\" type=\"button\"><span>✓</span><b>Tactical intelligence</b></button><button class=\"choice\" type=\"button\"><span></span><b>Ball retention under pressure</b></button><button class=\"choice\" type=\"button\"><span></span><b>Physical resilience and work rate</b></button><button class=\"choice\" type=\"button\"><span></span><b>Defensive impact</b></button><button class=\"choice\" type=\"button\"><span></span><b>Offensive impact</b></button><button class=\"choice\" type=\"button\"><span></span><b>Progression and carrying</b></button><button class=\"choice selected\" type=\"button\"><span>✓</span><b>Leadership and communication</b></button></div></div></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Long-term goals</h3><p>Select up to three</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"choice-grid\"><button class=\"choice\" type=\"button\"><span></span><b>Physical growth potential</b></button><button class=\"choice selected\" type=\"button\"><span>✓</span><b>Tactical role maturity</b></button><button class=\"choice\" type=\"button\"><span></span><b>Leadership and coachability</b></button><button class=\"choice\" type=\"button\"><span></span><b>Injury risk and physical resilience</b></button><button class=\"choice selected\" type=\"button\"><span>✓</span><b>Positional depth advantage</b></button><button class=\"choice\" type=\"button\"><span></span><b>Goal contribution potential</b></button><button class=\"choice selected\" type=\"button\"><span>✓</span><b>Financial viability</b></button></div></div></section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Search preferences</h3><p>Default discovery context</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"chip-grid\"><button class=\"chip\">U12</button><button class=\"chip\">U13</button><button class=\"chip\">U14</button><button class=\"chip active\">U15</button><button class=\"chip active\">U16</button></div><div class=\"chip-grid\"><button class=\"chip active\">GK</button><button class=\"chip active\">CB</button><button class=\"chip\">CM</button><button class=\"chip active\">CAM</button><button class=\"chip\">LW</button><button class=\"chip\">RW</button><button class=\"chip active\">ST</button></div><label class=\"field\"><span>Salary cap</span><div class=\"control\">£500,000 per week</div></label><label class=\"field\"><span>Minimum appearances</span><div class=\"control\">3</div></label></div></section>\n<footer class=\"sticky-save\"><span>Last saved 27 July 2026</span><div class=\"button-row\"><button class=\"btn primary\" type=\"button\">Save and apply</button><button class=\"btn secondary\" type=\"button\">Cancel</button></div></footer>\n</main>\n<nav class=\"mobile-nav\"><a class=\"\"><span>HM</span><b>Home</b></a><a class=\"\"><span>PS</span><b>Search</b></a><a class=\"\"><span>MP</span><b>Pipeline</b></a><a class=\"\"><span>CH</span><b>Chat</b></a><a class=\"active\"><span>MR</span><b>More</b></a></nav>\n</div></div>"},"events":{"desktop":"<div class=\"desktop-site\"><div class=\"scout-app desktop-app\">\n<div class=\"desktop-shell\">\n<aside class=\"scout-sidebar\">\n<a class=\"sidebar-logo\"><span class=\"sl-logo\">Scout<span>Link</span></span></a>\n<nav><section class=\"nav-group\"><small>Core</small><a class=\"nav-link\"><span>DB</span><b>Dashboard</b></a><a class=\"nav-link\"><span>PS</span><b>Player search</b></a><a class=\"nav-link\"><span>MP</span><b>My pipeline</b></a><a class=\"nav-link\"><span>RK</span><b>Rankings</b></a></section><section class=\"nav-group\"><small>Scouting tools</small><a class=\"nav-link\"><span>FX</span><b>Fixtures</b></a><a class=\"nav-link\"><span>PR</span><b>Predictions</b></a><a class=\"nav-link\"><span>EX</span><b>Exports</b></a><a class=\"nav-link\"><span>CP</span><b>Compare players</b></a><a class=\"nav-link\"><span>SS</span><b>Scout setup</b></a></section><section class=\"nav-group\"><small>Network</small><a class=\"nav-link active\"><span>EV</span><b>Events</b></a><a class=\"nav-link\"><span>CH</span><b>Chat</b></a><a class=\"nav-link\"><span>NT</span><b>Notifications</b></a><a class=\"nav-link\"><span>RC</span><b>Report a concern</b></a></section><section class=\"nav-group\"><small>Account</small><a class=\"nav-link\"><span>UR</span><b>Usage requests</b></a><a class=\"nav-link\"><span>ST</span><b>Settings</b></a></section></nav>\n<div class=\"sidebar-user\">\n<span class=\"initials-box\">NP</span>\n<div><b>Noah Patel</b><small>Reviewed Scout · Elite</small></div>\n</div>\n</aside>\n<section class=\"workspace\">\n<header class=\"desktop-topbar\">\n<div><span>Scout workspace</span><h1>Events</h1></div>\n<div class=\"top-actions\">\n<button class=\"icon-btn\">NT<i>3</i></button>\n<span class=\"team-chip\">ScoutLink Recruitment Team</span>\n<button class=\"user-btn\"><span class=\"initials-box small\">NP</span><b>Noah</b></button>\n</div>\n</header>\n<main class=\"workspace-content\">\n<section class=\"page-hero navy\">\n<div><span>ScoutLink showcases</span><h2>Discover players in a live football setting.</h2><p>Prepare for controlled Stratex showcase events, understand who is attending and move relevant players into the recruitment workflow.</p></div>\n<div class=\"button-row hero-actions\"><button class=\"btn primary\" type=\"button\">View all events</button><button class=\"btn ghost\" type=\"button\">Event notifications</button></div>\n</section>\n<section class=\"panel events-main\">\n<header class=\"panel-head\">\n<div><h3>Upcoming showcase events</h3><p>Events available to your reviewed Scout account</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"empty-state\"><span class=\"empty-icon\">EV</span><h4>No events available yet</h4><p>Check back when the next ScoutLink Showcase Day is released, or enable event notifications.</p><button class=\"btn primary\" type=\"button\">Turn on alerts</button></div></div></section>\n<section class=\"event-explain\"><article><span>01</span><h4>Prepare before arrival</h4><p>Review event format, venue, age groups, attending teams and available profiles.</p></article><article><span>02</span><h4>Build an event shortlist</h4><p>Save relevant players before the event and maintain structured observation notes.</p></article><article><span>03</span><h4>Continue after the event</h4><p>Move players into the pipeline, compare evidence and contact the appropriate coach.</p></article></section>\n</main>\n</section>\n</div>\n</div></div>","mobile":"<div class=\"mobile-site\"><div class=\"scout-app mobile-app\">\n<header class=\"mobile-topbar\">\n<a><span class=\"sl-logo\">Scout<span>Link</span></span></a>\n<strong>Events</strong>\n<button>Menu</button>\n</header>\n<main class=\"mobile-content\">\n<section class=\"page-hero navy\">\n<div><span>ScoutLink showcases</span><h2>Live player discovery.</h2><p>Prepare for controlled showcase events and continue the recruitment workflow afterwards.</p></div>\n<div class=\"button-row hero-actions\"><button class=\"btn white\" type=\"button\">Event notifications</button></div>\n</section>\n<section class=\"panel\">\n<header class=\"panel-head\">\n<div><h3>Upcoming events</h3><p>Available to your account</p></div>\n</header>\n<div class=\"panel-body\"><div class=\"empty-state\"><span class=\"empty-icon\">EV</span><h4>No events available yet</h4><p>Turn on alerts for the next Showcase Day.</p><button class=\"btn primary\" type=\"button\">Turn on alerts</button></div></div></section>\n<section class=\"event-explain\"><article><span>01</span><h4>Prepare</h4><p>Review format, venue and player profiles.</p></article><article><span>02</span><h4>Shortlist</h4><p>Save players and take structured notes.</p></article><article><span>03</span><h4>Follow up</h4><p>Move prospects into the recruitment workflow.</p></article></section>\n</main>\n<nav class=\"mobile-nav\"><a class=\"\"><span>HM</span><b>Home</b></a><a class=\"\"><span>PS</span><b>Search</b></a><a class=\"\"><span>MP</span><b>Pipeline</b></a><a class=\"\"><span>CH</span><b>Chat</b></a><a class=\"active\"><span>MR</span><b>More</b></a></nav>\n</div></div>"},"chat":{"desktop":"<div class=\"desktop-site\"><div class=\"scout-app desktop-app\">\n<div class=\"desktop-shell\">\n<aside class=\"scout-sidebar\">\n<a class=\"sidebar-logo\"><span class=\"sl-logo\">Scout<span>Link</span></span></a>\n<nav><section class=\"nav-group\"><small>Core</small><a class=\"nav-link\"><span>DB</span><b>Dashboard</b></a><a class=\"nav-link\"><span>PS</span><b>Player search</b></a><a class=\"nav-link\"><span>MP</span><b>My pipeline</b></a><a class=\"nav-link\"><span>RK</span><b>Rankings</b></a></section><section class=\"nav-group\"><small>Scouting tools</small><a class=\"nav-link\"><span>FX</span><b>Fixtures</b></a><a class=\"nav-link\"><span>PR</span><b>Predictions</b></a><a class=\"nav-link\"><span>EX</span><b>Exports</b></a><a class=\"nav-link\"><span>CP</span><b>Compare players</b></a><a class=\"nav-link\"><span>SS</span><b>Scout setup</b></a></section><section class=\"nav-group\"><small>Network</small><a class=\"nav-link\"><span>EV</span><b>Events</b></a><a class=\"nav-link active\"><span>CH</span><b>Chat</b></a><a class=\"nav-link\"><span>NT</span><b>Notifications</b></a><a class=\"nav-link\"><span>RC</span><b>Report a concern</b></a></section><section class=\"nav-group\"><small>Account</small><a class=\"nav-link\"><span>UR</span><b>Usage requests</b></a><a class=\"nav-link\"><span>ST</span><b>Settings</b></a></section></nav>\n<div class=\"sidebar-user\">\n<span class=\"initials-box\">NP</span>\n<div><b>Noah Patel</b><small>Reviewed Scout · Elite</small></div>\n</div>\n</aside>\n<section class=\"workspace\">\n<header class=\"desktop-topbar\">\n<div><span>Scout workspace</span><h1>Chat</h1></div>\n<div class=\"top-actions\">\n<button class=\"icon-btn\">NT<i>3</i></button>\n<span class=\"team-chip\">ScoutLink Recruitment Team</span>\n<button class=\"user-btn\"><span class=\"initials-box small\">NP</span><b>Noah</b></button>\n</div>\n</header>\n<main class=\"workspace-content\">\n<section class=\"chat-shell\">\n<aside class=\"thread-list\">\n<header><h3>Player conversations</h3><p>One thread for each registered player interest.</p></header>\n<div class=\"chat-search\">Search by player or coach</div>\n<button class=\"thread-item active\"><span class=\"initials-box\">EC</span><div><b>Ethan Cole</b><span>Marcus Reed · Northgate United</span><small>Thanks, I can confirm the fixture.</small></div><time>09:18</time></button>\n<button class=\"thread-item\"><span class=\"initials-box\">RH</span><div><b>Reuben Hughes</b><span>Amir Khan · Eastbrook Athletic</span><small>New reply about availability.</small></div><time>Yesterday</time></button>\n<button class=\"thread-item\"><span class=\"initials-box\">CH</span><div><b>Carter Hill</b><span>Marcus Reed · Northgate United</span><small>Observation notes shared.</small></div><time>27 Jul</time></button>\n</aside>\n<section class=\"chat-thread\">\n<header><div><b>Ethan Cole</b><span>Conversation with Marcus Reed · Coach</span></div></header>\n<div class=\"messages\"><article class=\"message\"><small>Marcus Reed</small><p>Ethan is available for the fixture on 2 August.</p><time>09:02</time></article><article class=\"message mine\"><small>You</small><p>Thank you. I would like to attend and focus on his movement against a compact defence.</p><time>09:08</time></article><article class=\"message\"><small>Marcus Reed</small><p>That is fine. I will confirm the arrival point.</p><time>09:18</time></article></div>\n<footer class=\"composer\"><div class=\"compose-box\">Write a message about Ethan Cole…</div><button class=\"btn primary\">Send</button></footer>\n</section>\n<aside class=\"chat-context\"><span>Player context</span><h3>Ethan Cole</h3><p>ST · U16 · Northgate United</p><div class=\"context-facts\"><div><span>Overall</span><b>84</b></div><div><span>Compatibility</span><b>86%</b></div><div><span>Evidence</span><b>Strong</b></div><div><span>Pipeline</span><b>Shortlisted</b></div><div><span>Next fixture</span><b>2 Aug</b></div></div><button class=\"btn secondary\">View player profile</button></aside>\n</section>\n</main>\n</section>\n</div>\n</div></div>","mobile":"<div class=\"mobile-site\"><div class=\"scout-app mobile-app\">\n<header class=\"mobile-topbar\">\n<a><span class=\"sl-logo\">Scout<span>Link</span></span></a>\n<strong>Chat</strong>\n<button>Menu</button>\n</header>\n<main class=\"mobile-content\">\n<section class=\"chat-mobile\">\n<div class=\"mobile-chat-top\">\n<header class=\"mobile-chat-title\"><button>‹</button><div><h3>Ethan Cole</h3><p>Player conversation</p></div></header>\n<section class=\"mobile-chat-person\"><div><small>Coach</small><b>Marcus Reed</b></div><span class=\"status green\">Shortlisted</span></section>\n<section class=\"mobile-chat-context\"><small>Player context</small><b>ST · U16 · 84 overall</b><span>86% compatibility · Strong evidence</span><button class=\"btn secondary\">View player profile</button></section>\n</div>\n<div class=\"mobile-chat-messages\"><article class=\"message\"><small>Marcus Reed</small><p>Ethan is available for the fixture on 2 August.</p><time>09:02</time></article><article class=\"message mine\"><small>You</small><p>Thank you. I would like to attend and focus on his movement against a compact defence.</p><time>09:08</time></article><article class=\"message\"><small>Marcus Reed</small><p>That is fine. I will confirm the arrival point.</p><time>09:18</time></article></div>\n<footer class=\"mobile-chat-composer\"><div class=\"compose-box\">Write a message about Ethan Cole…</div><button class=\"btn primary\">Send</button></footer>\n</section>\n</main>\n<nav class=\"mobile-nav\"><a class=\"\"><span>HM</span><b>Home</b></a><a class=\"\"><span>PS</span><b>Search</b></a><a class=\"\"><span>MP</span><b>Pipeline</b></a><a class=\"active\"><span>CH</span><b>Chat</b></a><a class=\"\"><span>MR</span><b>More</b></a></nav>\n</div></div>"},"notifications":{"desktop":"<div class=\"desktop-site\"><div class=\"scout-app desktop-app\">\n<div class=\"desktop-shell\">\n<aside class=\"scout-sidebar\">\n<a class=\"sidebar-logo\"><span class=\"sl-logo\">Scout<span>Link</span></span></a>\n<nav><section class=\"nav-group\"><small>Core</small><a class=\"nav-link\"><span>DB</span><b>Dashboard</b></a><a class=\"nav-link\"><span>PS</span><b>Player search</b></a><a class=\"nav-link\"><span>MP</span><b>My pipeline</b></a><a class=\"nav-link\"><span>RK</span><b>Rankings</b></a></section><section class=\"nav-group\"><small>Scouting tools</small><a class=\"nav-link\"><span>FX</span><b>Fixtures</b></a><a class=\"nav-link\"><span>PR</span><b>Predictions</b></a><a class=\"nav-link\"><span>EX</span><b>Exports</b></a><a class=\"nav-link\"><span>CP</span><b>Compare players</b></a><a class=\"nav-link\"><span>SS</span><b>Scout setup</b></a></section><section class=\"nav-group\"><small>Network</small><a class=\"nav-link\"><span>EV</span><b>Events</b></a><a class=\"nav-link\"><span>CH</span><b>Chat</b></a><a class=\"nav-link active\"><span>NT</span><b>Notifications</b></a><a class=\"nav-link\"><span>RC</span><b>Report a concern</b></a></section><section class=\"nav-group\"><small>Account</small><a class=\"nav-link\"><span>UR</span><b>Usage requests</b></a><a class=\"nav-link\"><span>ST</span><b>Settings</b></a></section></nav>\n<div class=\"sidebar-user\">\n<span class=\"initials-box\">NP</span>\n<div><b>Noah Patel</b><small>Reviewed Scout · Elite</small></div>\n</div>\n</aside>\n<section class=\"workspace\">\n<header class=\"desktop-topbar\">\n<div><span>Scout workspace</span><h1>Notifications</h1></div>\n<div class=\"top-actions\">\n<button class=\"icon-btn\">NT<i>3</i></button>\n<span class=\"team-chip\">ScoutLink Recruitment Team</span>\n<button class=\"user-btn\"><span class=\"initials-box small\">NP</span><b>Noah</b></button>\n</div>\n</header>\n<main class=\"workspace-content\">\n<section class=\"page-hero navy\">\n<div><span>Scout activity</span><h2>Only the updates that need your attention.</h2><p>Player, coach, pipeline, fixture and system activity stays grouped around meaningful actions.</p></div>\n<div class=\"button-row hero-actions\"><button class=\"btn ghost\" type=\"button\">Mark all read</button></div>\n</section>\n<section class=\"notification-controls\"><div class=\"segment-row\"><button class=\"segment active\">All</button><button class=\"segment\">Messages</button><button class=\"segment\">Scout interest</button><button class=\"segment\">Match Facts</button><button class=\"segment\">Recruitment</button><button class=\"segment\">Fixtures</button><button class=\"segment\">System</button></div><button class=\"btn secondary\" type=\"button\">Refresh</button></section>\n<section class=\"notification-list\"><article class=\"notification-row unread\"><span class=\"notification-icon\">CH</span><div><b>New message from Marcus Reed</b><p>Conversation about Ethan Cole.</p><small>Today · 09:18</small></div><button class=\"text-action\">Open conversation</button></article><article class=\"notification-row unread\"><span class=\"notification-icon\">MF</span><div><b>New Match Facts for Reuben Hughes</b><p>Evidence confidence increased after the latest match.</p><small>Today · 08:42</small></div><button class=\"text-action\">Review player</button></article><article class=\"notification-row unread\"><span class=\"notification-icon\">FX</span><div><b>Pipeline fixture updated</b><p>Carter Hill has a new fixture on 9 August.</p><small>Yesterday</small></div><button class=\"text-action\">Plan visit</button></article><article class=\"notification-row\"><span class=\"notification-icon\">PR</span><div><b>Position-fit prediction saved</b><p>Ethan Cole · Centre Forward · 86/100.</p><small>27 Jul</small></div><button class=\"text-action\">Open result</button></article><article class=\"notification-row\"><span class=\"notification-icon\">EX</span><div><b>Profile dossier ready</b><p>The Ethan Cole PDF is available to download.</p><small>27 Jul</small></div><button class=\"text-action\">Download</button></article></section>\n</main>\n</section>\n</div>\n</div></div>","mobile":"<div class=\"mobile-site\"><div class=\"scout-app mobile-app\">\n<header class=\"mobile-topbar\">\n<a><span class=\"sl-logo\">Scout<span>Link</span></span></a>\n<strong>Notifications</strong>\n<button>Menu</button>\n</header>\n<main class=\"mobile-content\">\n<section class=\"page-hero navy\">\n<div><span>Scout activity</span><h2>Notifications.</h2><p>One unread summary, simple filters and a clear action beneath each update.</p></div>\n</section>\n<section class=\"panel\"><div class=\"panel-body\"><small style=\"color:var(--green);font-size:7px;font-weight:900;text-transform:uppercase\">Unread notifications</small><strong style=\"display:block;margin-top:6px;font-size:30px\">3</strong><p style=\"margin:7px 0 0;color:var(--muted);font-size:8px\">A message, Match Facts update and fixture change need attention.</p><div class=\"button-row\"><button class=\"btn secondary\" type=\"button\">Mark all read</button></div></div></section>\n<section class=\"notification-controls\"><label class=\"field\"><span>Show</span><div class=\"control select\">All notifications<i>⌄</i></div></label><label class=\"field\"><span>Order</span><div class=\"control select\">Newest first<i>⌄</i></div></label></section>\n<section class=\"notification-list\"><article class=\"notification-row unread\"><span class=\"notification-icon\">CH</span><div><b>New message from Marcus Reed</b><p>Conversation about Ethan Cole.</p><small>Today · 09:18</small></div><button class=\"text-action\">Open conversation</button></article><article class=\"notification-row unread\"><span class=\"notification-icon\">MF</span><div><b>New Match Facts for Reuben Hughes</b><p>Evidence confidence increased after the latest match.</p><small>Today · 08:42</small></div><button class=\"text-action\">Review player</button></article><article class=\"notification-row unread\"><span class=\"notification-icon\">FX</span><div><b>Pipeline fixture updated</b><p>Carter Hill has a new fixture on 9 August.</p><small>Yesterday</small></div><button class=\"text-action\">Plan visit</button></article><article class=\"notification-row\"><span class=\"notification-icon\">PR</span><div><b>Position-fit prediction saved</b><p>Ethan Cole · Centre Forward · 86/100.</p><small>27 Jul</small></div><button class=\"text-action\">Open result</button></article><article class=\"notification-row\"><span class=\"notification-icon\">EX</span><div><b>Profile dossier ready</b><p>The Ethan Cole PDF is available to download.</p><small>27 Jul</small></div><button class=\"text-action\">Download</button></article></section>\n</main>\n<nav class=\"mobile-nav\"><a class=\"\"><span>HM</span><b>Home</b></a><a class=\"\"><span>PS</span><b>Search</b></a><a class=\"\"><span>MP</span><b>Pipeline</b></a><a class=\"\"><span>CH</span><b>Chat</b></a><a class=\"active\"><span>MR</span><b>More</b></a></nav>\n</div></div>"},"concern":{"desktop":"<div class=\"desktop-site\"><div class=\"scout-app desktop-app\">\n<div class=\"desktop-shell\">\n<aside class=\"scout-sidebar\">\n<a class=\"sidebar-logo\"><span class=\"sl-logo\">Scout<span>Link</span></span></a>\n<nav><section class=\"nav-group\"><small>Core</small><a class=\"nav-link\"><span>DB</span><b>Dashboard</b></a><a class=\"nav-link\"><span>PS</span><b>Player search</b></a><a class=\"nav-link\"><span>MP</span><b>My pipeline</b></a><a class=\"nav-link\"><span>RK</span><b>Rankings</b></a></section><section class=\"nav-group\"><small>Scouting tools</small><a class=\"nav-link\"><span>FX</span><b>Fixtures</b></a><a class=\"nav-link\"><span>PR</span><b>Predictions</b></a><a class=\"nav-link\"><span>EX</span><b>Exports</b></a><a class=\"nav-link\"><span>CP</span><b>Compare players</b></a><a class=\"nav-link\"><span>SS</span><b>Scout setup</b></a></section><section class=\"nav-group\"><small>Network</small><a class=\"nav-link\"><span>EV</span><b>Events</b></a><a class=\"nav-link\"><span>CH</span><b>Chat</b></a><a class=\"nav-link\"><span>NT</span><b>Notifications</b></a><a class=\"nav-link active\"><span>RC</span><b>Report a concern</b></a></section><section class=\"nav-group\"><small>Account</small><a class=\"nav-link\"><span>UR</span><b>Usage requests</b></a><a class=\"nav-link\"><span>ST</span><b>Settings</b></a></section></nav>\n<div class=\"sidebar-user\">\n<span class=\"initials-box\">NP</span>\n<div><b>Noah Patel</b><small>Reviewed Scout · Elite</small></div>\n</div>\n</aside>\n<section class=\"workspace\">\n<header class=\"desktop-topbar\">\n<div><span>Scout workspace</span><h1>Report a concern</h1></div>\n<div class=\"top-actions\">\n<button class=\"icon-btn\">NT<i>3</i></button>\n<span class=\"team-chip\">ScoutLink Recruitment Team</span>\n<button class=\"user-btn\"><span class=\"initials-box small\">NP</span><b>Noah</b></button>\n</div>\n</header>\n<main class=\"workspace-content\">\n<section class=\"page-hero navy\">\n<div><span>Scout trust route</span><h2>Report a concern.</h2><p>Raise inappropriate contact, suspected misuse, inaccurate player access or another platform-safety issue through a restricted route.</p></div>\n</section>\n<div class=\"concern-layout\">\n<section class=\"concern-form\">\n<div class=\"danger-note\"><b>Immediate danger or urgent safeguarding risk</b><p>Contact emergency services or the relevant safeguarding authority before submitting a platform concern.</p></div>\n<div class=\"form-grid cols-2\"><label class=\"field\"><span>Concern type<em>Required</em></span><div class=\"control select\">Select category<i>⌄</i></div></label><label class=\"field\"><span>Urgency<em>Required</em></span><div class=\"control select\">Select urgency<i>⌄</i></div></label><label class=\"field\"><span>Related player</span><div class=\"control select\">Optional player<i>⌄</i></div></label><label class=\"field\"><span>Related coach or account</span><div class=\"control select\">Optional account<i>⌄</i></div></label></div>\n<label class=\"field\"><span>What happened?<em>Required</em></span><div class=\"control textarea\">Provide dates, people involved and the clearest useful context.</div></label>\n<label class=\"field\"><span>Supporting file</span><div class=\"control upload\"><b>Choose file</b><span>Screenshot, image or document</span></div></label>\n<div class=\"button-row concern-actions\"><button class=\"btn secondary\" type=\"button\">Save draft</button><button class=\"btn danger\" type=\"button\">Submit concern</button></div>\n</section>\n<aside class=\"concern-side\"><h3 style=\"margin:0;font-size:15px\">What happens next</h3><div class=\"timeline\"><article><span>1</span><div><b>Submitted</b><p>Stored securely for authorised review.</p></div></article><article><span>2</span><div><b>Triaged</b><p>Risk and urgency are assessed.</p></div></article><article><span>3</span><div><b>Actioned</b><p>Access may be restricted or escalated.</p></div></article><article><span>4</span><div><b>Follow-up</b><p>More information may be requested.</p></div></article></div></aside>\n</div>\n</main>\n</section>\n</div>\n</div></div>","mobile":"<div class=\"mobile-site\"><div class=\"scout-app mobile-app\">\n<header class=\"mobile-topbar\">\n<a><span class=\"sl-logo\">Scout<span>Link</span></span></a>\n<strong>Report concern</strong>\n<button>Menu</button>\n</header>\n<main class=\"mobile-content\">\n<section class=\"page-hero navy\">\n<div><span>Scout trust route</span><h2>Report a concern.</h2><p>Use the restricted route for safeguarding, conduct, access or platform misuse.</p></div>\n</section>\n<div class=\"concern-layout\"><section class=\"concern-form\"><div class=\"danger-note\"><b>Immediate danger?</b><p>Contact emergency services or the relevant safeguarding authority first.</p></div><label class=\"field\"><span>Concern type<em>Required</em></span><div class=\"control select\">Select category<i>⌄</i></div></label><label class=\"field\"><span>Urgency<em>Required</em></span><div class=\"control select\">Select urgency<i>⌄</i></div></label><label class=\"field\"><span>Related player</span><div class=\"control select\">Optional player<i>⌄</i></div></label><label class=\"field\"><span>Related coach or account</span><div class=\"control select\">Optional account<i>⌄</i></div></label><label class=\"field\"><span>What happened?<em>Required</em></span><div class=\"control textarea\">Provide dates, people and useful context.</div></label><label class=\"field\"><span>Supporting file</span><div class=\"control upload\"><b>Choose file</b><span>Optional screenshot or document</span></div></label><div class=\"button-row\"><button class=\"btn danger\" type=\"button\">Submit concern</button><button class=\"btn secondary\" type=\"button\">Save draft</button></div></section><aside class=\"concern-side\"><h3 style=\"margin:0;font-size:15px\">What happens next</h3><div class=\"timeline\"><article><span>1</span><div><b>Submitted</b><p>Stored securely.</p></div></article><article><span>2</span><div><b>Triaged</b><p>Risk assessed.</p></div></article><article><span>3</span><div><b>Actioned</b><p>Access may be restricted.</p></div></article><article><span>4</span><div><b>Follow-up</b><p>More context may be requested.</p></div></article></div></aside></div>\n</main>\n<nav class=\"mobile-nav\"><a class=\"\"><span>HM</span><b>Home</b></a><a class=\"\"><span>PS</span><b>Search</b></a><a class=\"\"><span>MP</span><b>Pipeline</b></a><a class=\"\"><span>CH</span><b>Chat</b></a><a class=\"active\"><span>MR</span><b>More</b></a></nav>\n</div></div>"},"settings":{"desktop":"<div class=\"desktop-site\"><div class=\"scout-app desktop-app\">\n<div class=\"desktop-shell\">\n<aside class=\"scout-sidebar\">\n<a class=\"sidebar-logo\"><span class=\"sl-logo\">Scout<span>Link</span></span></a>\n<nav><section class=\"nav-group\"><small>Core</small><a class=\"nav-link\"><span>DB</span><b>Dashboard</b></a><a class=\"nav-link\"><span>PS</span><b>Player search</b></a><a class=\"nav-link\"><span>MP</span><b>My pipeline</b></a><a class=\"nav-link\"><span>RK</span><b>Rankings</b></a></section><section class=\"nav-group\"><small>Scouting tools</small><a class=\"nav-link\"><span>FX</span><b>Fixtures</b></a><a class=\"nav-link\"><span>PR</span><b>Predictions</b></a><a class=\"nav-link\"><span>EX</span><b>Exports</b></a><a class=\"nav-link\"><span>CP</span><b>Compare players</b></a><a class=\"nav-link\"><span>SS</span><b>Scout setup</b></a></section><section class=\"nav-group\"><small>Network</small><a class=\"nav-link\"><span>EV</span><b>Events</b></a><a class=\"nav-link\"><span>CH</span><b>Chat</b></a><a class=\"nav-link\"><span>NT</span><b>Notifications</b></a><a class=\"nav-link\"><span>RC</span><b>Report a concern</b></a></section><section class=\"nav-group\"><small>Account</small><a class=\"nav-link\"><span>UR</span><b>Usage requests</b></a><a class=\"nav-link active\"><span>ST</span><b>Settings</b></a></section></nav>\n<div class=\"sidebar-user\">\n<span class=\"initials-box\">NP</span>\n<div><b>Noah Patel</b><small>Reviewed Scout · Elite</small></div>\n</div>\n</aside>\n<section class=\"workspace\">\n<header class=\"desktop-topbar\">\n<div><span>Scout workspace</span><h1>Settings</h1></div>\n<div class=\"top-actions\">\n<button class=\"icon-btn\">NT<i>3</i></button>\n<span class=\"team-chip\">ScoutLink Recruitment Team</span>\n<button class=\"user-btn\"><span class=\"initials-box small\">NP</span><b>Noah</b></button>\n</div>\n</header>\n<main class=\"workspace-content\">\n<section class=\"page-hero navy\">\n<div><span>Scout account</span><h2>Settings.</h2><p>Manage account details, appearance, notifications, team access, security, plan and the recruitment setup.</p></div>\n<div class=\"button-row hero-actions\"><button class=\"btn primary\" type=\"button\">Save changes</button></div>\n</section>\n<section class=\"metric-strip\"><article><small>Prediction usage</small><strong>30 / 60</strong><p>Current team allowance</p></article><article><small>Export usage</small><strong>4 / 300</strong><p>Current team allowance</p></article><article><small>Pipeline usage</small><strong>7 / 300</strong><p>Current team allowance</p></article><article><small>Reset date</small><strong>1 Jan 2027</strong><p>Managed by the Scout plan</p></article></section>\n<nav class=\"settings-tabs\"><button class=\"active\">Account</button><button>Appearance</button><button>Notifications</button><button>Team</button><button>Security</button><button>Plan</button></nav>\n<section class=\"settings-stack\">\n<section class=\"setting-section\"><h3>Account details</h3><p>Information connected to the reviewed Scout account.</p><div class=\"setting-row\"><div><b>Name</b><span>Noah Patel</span></div><button class=\"text-action\">Edit</button></div><div class=\"setting-row\"><div><b>Email</b><span>noah.patel@example.com</span></div><button class=\"text-action\">Change</button></div><div class=\"setting-row\"><div><b>Scout ID</b><span>ESC001</span></div><button class=\"text-action\">Copy</button></div><div class=\"setting-row\"><div><b>Status</b><span>Reviewed Scout</span></div><span class=\"status green\">Active</span></div></section>\n<section class=\"setting-section\"><h3>Appearance</h3><p>Choose the interface theme.</p><div class=\"setting-row\"><div><b>Theme</b><span>Light selected</span></div><div class=\"button-row\"><button class=\"btn primary\" type=\"button\">Light</button><button class=\"btn secondary\" type=\"button\">Dark</button></div></div></section>\n<section class=\"setting-section\"><h3>Notification preferences</h3><p>Control how ScoutLink activity reaches you.</p><div class=\"setting-row\"><div><b>Email notifications</b><span>Player, coach and pipeline updates</span></div><span class=\"toggle\"><i></i></span></div><div class=\"setting-row\"><div><b>In-app notifications</b><span>Alerts inside ScoutLink</span></div><span class=\"toggle\"><i></i></span></div><div class=\"setting-row\"><div><b>Event notifications</b><span>Showcase and fixture alerts</span></div><span class=\"toggle\"><i></i></span></div><div class=\"setting-row\"><div><b>Platform updates</b><span>Feature announcements</span></div><span class=\"toggle\"><i></i></span></div></section>\n<section class=\"setting-section\"><h3>Team and plan</h3><p>Organisation, permissions and current subscription.</p><div class=\"setting-row\"><div><b>Scout team</b><span>ScoutLink Recruitment Team</span></div><button class=\"text-action\">Manage</button></div><div class=\"setting-row\"><div><b>Club or organisation</b><span>Stratex Demo FC</span></div><button class=\"text-action\">Edit</button></div><div class=\"setting-row\"><div><b>Plan</b><span>Elite</span></div><button class=\"text-action\">View limits</button></div></section>\n<section class=\"setting-section\"><h3>Security</h3><p>Protect the Scout account.</p><div class=\"setting-row\"><div><b>Change password</b><span>Minimum eight characters</span></div><button class=\"text-action\">Change</button></div><div class=\"setting-row\"><div><b>Active sessions</b><span>Two devices</span></div><button class=\"text-action\">Review</button></div></section>\n<section class=\"setting-section\"><h3>Scout setup</h3><p>Configure team weaknesses, role expectations, long-term goals and search preferences.</p><div class=\"button-row\"><button class=\"btn primary\" type=\"button\">Open Scout setup</button></div></section>\n</section>\n</main>\n</section>\n</div>\n</div></div>","mobile":"<div class=\"mobile-site\"><div class=\"scout-app mobile-app\">\n<header class=\"mobile-topbar\">\n<a><span class=\"sl-logo\">Scout<span>Link</span></span></a>\n<strong>Settings</strong>\n<button>Menu</button>\n</header>\n<main class=\"mobile-content\">\n<section class=\"page-hero navy\">\n<div><span>Scout account</span><h2>Settings.</h2><p>Account, notification, team, security and plan controls remain available without compressing them.</p></div>\n</section>\n<nav class=\"settings-tabs\"><button class=\"active\">Account</button><button>Appearance</button><button>Notifications</button><button>Team</button><button>Security</button><button>Plan</button></nav>\n<section class=\"settings-stack\">\n<section class=\"setting-section\"><h3>Account details</h3><p>Reviewed Scout account.</p><div class=\"setting-row\"><div><b>Name</b><span>Noah Patel</span></div><button class=\"text-action\">Edit</button></div><div class=\"setting-row\"><div><b>Email</b><span>noah.patel@example.com</span></div><button class=\"text-action\">Change</button></div><div class=\"setting-row\"><div><b>Scout ID</b><span>ESC001</span></div><button class=\"text-action\">Copy</button></div></section>\n<section class=\"setting-section\"><h3>Appearance</h3><div class=\"setting-row\"><div><b>Theme</b><span>Light selected</span></div><div class=\"button-row\"><button class=\"btn primary\" type=\"button\">Light</button><button class=\"btn secondary\" type=\"button\">Dark</button></div></div></section>\n<section class=\"setting-section\"><h3>Notifications</h3><div class=\"setting-row\"><div><b>Email</b><span>Player and pipeline updates</span></div><span class=\"toggle\"><i></i></span></div><div class=\"setting-row\"><div><b>In-app</b><span>ScoutLink alerts</span></div><span class=\"toggle\"><i></i></span></div><div class=\"setting-row\"><div><b>Events</b><span>Showcase and fixtures</span></div><span class=\"toggle\"><i></i></span></div></section>\n<section class=\"setting-section\"><h3>Team and plan</h3><div class=\"setting-row\"><div><b>Scout team</b><span>ScoutLink Recruitment Team</span></div><button class=\"text-action\">Manage</button></div><div class=\"setting-row\"><div><b>Plan</b><span>Elite</span></div><button class=\"text-action\">View limits</button></div></section>\n<section class=\"setting-section\"><h3>Security</h3><div class=\"setting-row\"><div><b>Password</b><span>Change account password</span></div><button class=\"text-action\">Change</button></div><div class=\"setting-row\"><div><b>Sessions</b><span>Two devices</span></div><button class=\"text-action\">Review</button></div></section>\n<section class=\"setting-section\"><h3>Scout setup</h3><p>Recruitment context and search preferences.</p><div class=\"button-row\"><button class=\"btn primary\" type=\"button\">Open Scout setup</button></div></section>\n</section>\n</main>\n<nav class=\"mobile-nav\"><a class=\"\"><span>HM</span><b>Home</b></a><a class=\"\"><span>PS</span><b>Search</b></a><a class=\"\"><span>MP</span><b>Pipeline</b></a><a class=\"\"><span>CH</span><b>Chat</b></a><a class=\"active\"><span>MR</span><b>More</b></a></nav>\n</div></div>"}};

  var ROUTE_BY_PATH = {
    '/scout/onboarding': 'onboarding',
    '/confirm-password': 'onboarding',
    '/scout/dashboard': 'dashboard',
    '/scout/player-search': 'search',
    '/player/profile': 'profile',
    '/scout/pipeline': 'pipeline',
    '/scout/rankings': 'rankings',
    '/scout/fixtures': 'fixtures',
    '/scout/predictions': 'predictions',
    '/scout/usage-requests': 'usage',
    '/scout/exports': 'exports',
    '/scout/compare-players': 'compare',
    '/scout/setup': 'setup',
    '/scout/events': 'events',
    '/scout/chat': 'chat',
    '/scout/notifications': 'notifications',
    '/scout/report-a-concern': 'concern',
    '/scout/settings': 'settings'
  };

  var NAV_ROUTES = {
    'dashboard': '/scout/dashboard',
    'player search': '/scout/player-search',
    'my pipeline': '/scout/pipeline',
    'rankings': '/scout/rankings',
    'fixtures': '/scout/fixtures',
    'predictions': '/scout/predictions',
    'exports': '/scout/exports',
    'compare players': '/scout/compare-players',
    'scout setup': '/scout/setup',
    'events': '/scout/events',
    'chat': '/scout/chat',
    'notifications': '/scout/notifications',
    'report a concern': '/scout/report-a-concern',
    'usage requests': '/scout/usage-requests',
    'settings': '/scout/settings',
    'home': '/scout/dashboard',
    'search': '/scout/player-search',
    'pipeline': '/scout/pipeline',
    'more': '/scout/settings'
  };

  var ACTION_ROUTES = {
    'review compatible players': '/scout/player-search',
    'view all players': '/scout/player-search',
    'explore players': '/scout/player-search',
    'find players': '/scout/player-search',
    'find a player': '/scout/player-search',
    'open fixtures': '/scout/fixtures',
    'open pipeline': '/scout/pipeline',
    'usage requests': '/scout/usage-requests',
    'open usage requests': '/scout/usage-requests',
    'compare players': '/scout/compare-players',
    'edit scout setup': '/scout/setup',
    'open scout setup': '/scout/setup',
    'message coach': '/scout/chat',
    'open conversation': '/scout/chat',
    'turn on alerts': '/scout/notifications',
    'return to dashboard': '/scout/dashboard'
  };

  var state = {
    host: null,
    shadow: null,
    exactRoot: null,
    route: '',
    players: [],
    playersById: Object.create(null),
    playersPromise: null,
    usagePromise: null,
    dashboardPromise: null,
    search: {
      page: 1,
      position: '',
      age: '',
      region: '',
      evidence: '',
      sort: 'Best match'
    },
    compare: {
      playerAId: '',
      playerBId: '',
      context: 'Immediate starter',
      position: 'Centre Forward',
      budget: 350000,
      result: null
    },
    chat: {
      threads: [],
      activeId: ''
    },
    notifications: {
      rows: [],
      filter: 'all'
    }
  };

  function q(root, selector) {
    return (root || state.shadow || document).querySelector(selector);
  }

  function qa(root, selector) {
    return Array.prototype.slice.call((root || state.shadow || document).querySelectorAll(selector));
  }

  function text(value) {
    return String(value == null ? '' : value).trim();
  }

  function normalise(value) {
    return text(value).toLowerCase().replace(/\s+/g, ' ');
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[character];
    });
  }

  function number(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : (fallback == null ? 0 : fallback);
  }

  function clamp(value) {
    return Math.max(0, Math.min(100, Math.round(number(value, 0))));
  }

  function cleanPath() {
    return String(window.location.pathname || '/').replace(/\/+$/, '') || '/';
  }

  function routeId() {
    var declared = document.body && document.body.getAttribute('data-scout-route');
    if (declared) {
      var aliases = {
        confirm: 'onboarding',
        dashboard: 'dashboard',
        search: 'search',
        profile: 'profile',
        pipeline: 'pipeline',
        rankings: 'rankings',
        fixtures: 'fixtures',
        predictions: 'predictions',
        usage: 'usage',
        exports: 'exports',
        compare: 'compare',
        setup: 'setup',
        events: 'events',
        chat: 'chat',
        notifications: 'notifications',
        concern: 'concern',
        settings: 'settings'
      };
      return aliases[declared] || declared;
    }
    return ROUTE_BY_PATH[cleanPath()] || '';
  }

  function onboardingTemplateKey() {
    var query = new URLSearchParams(window.location.search);
    var explicit = number(query.get('step'), 0);
    if (explicit >= 1 && explicit <= 3) return 'onboarding' + explicit;

    var legacy = normalise(state.host ? state.host.textContent : '');
    if (legacy.indexOf('step 3') >= 0 || legacy.indexOf('set the recruitment brief') >= 0) {
      return 'onboarding3';
    }
    if (legacy.indexOf('step 2') >= 0 || legacy.indexOf('confirm the team context') >= 0) {
      return 'onboarding2';
    }
    try {
      var stored = number(sessionStorage.getItem('sl_scout_onboarding_step'), 1);
      if (stored >= 1 && stored <= 3) return 'onboarding' + stored;
    } catch (_) {}
    return 'onboarding1';
  }

  function templateKey() {
    return state.route === 'onboarding' ? onboardingTemplateKey() : state.route;
  }

  function token() {
    try {
      return localStorage.getItem('sl_token') || '';
    } catch (_) {
      return '';
    }
  }

  function isPublicDemo() {
    try {
      return sessionStorage.getItem('sl_public_demo') === '1' ||
        token() === 'public-demo-session';
    } catch (_) {
      return token() === 'public-demo-session';
    }
  }

  function currentUser() {
    try {
      return JSON.parse(localStorage.getItem('sl_user') || '{}') || {};
    } catch (_) {
      return {};
    }
  }

  function currentUserName() {
    var user = currentUser();
    return user.name ||
      [user.first_name || user.firstName, user.last_name || user.lastName]
        .filter(Boolean)
        .join(' ') ||
      'Noah Patel';
  }

  function firstName() {
    return currentUserName().split(/\s+/)[0] || 'Noah';
  }

  function initialsFromName(name) {
    return text(name || 'ScoutLink Scout')
      .split(/\s+/)
      .slice(0, 2)
      .map(function (part) { return part.charAt(0); })
      .join('')
      .toUpperCase() || 'SL';
  }

  function apiBase() {
    var configured = '';
    try {
      configured = window.API || localStorage.getItem('sl_api_url') || '';
    } catch (_) {}
    return String(configured || API_FALLBACK).replace(/\/+$/, '');
  }

  async function request(method, path, body, includeAuth) {
    var headers = { Accept: 'application/json' };
    var auth = token();
    if (includeAuth !== false && auth) headers.Authorization = 'Bearer ' + auth;
    if (body !== undefined && body !== null) headers['Content-Type'] = 'application/json';

    var response = await fetch(apiBase() + path, {
      method: method,
      headers: headers,
      credentials: 'include',
      body: body === undefined || body === null ? undefined : JSON.stringify(body)
    });
    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      throw new Error(payload.error || payload.message || 'The request could not be completed.');
    }
    return payload;
  }

  function playerName(player) {
    return [player && player.first_name, player && player.last_name]
      .filter(Boolean)
      .join(' ') ||
      (player && player.name) ||
      'Player';
  }

  function playerInitials(player) {
    return initialsFromName(playerName(player));
  }

  function playerPosition(player) {
    return player && (
      player.specific_position ||
      player.primary_position ||
      player.position_group ||
      (Array.isArray(player.positions) ? player.positions[0] : '')
    ) || 'Position TBC';
  }

  function playerTeam(player) {
    return player && (
      player.team_name ||
      (player.team && player.team.team_name) ||
      player.club_name ||
      player.academy_name
    ) || 'Team not set';
  }

  function playerRegion(player) {
    return player && (
      player.region ||
      player.team_city ||
      (player.team && (player.team.city || player.team.county)) ||
      player.city ||
      player.county
    ) || 'Not set';
  }

  function playerCompatibility(player) {
    return clamp(player && (
      player.compatibilityScore ||
      player.compatibility_score ||
      (player.compatibility && player.compatibility.score) ||
      player.fit_score
    ));
  }

  function playerRating(player) {
    return clamp(player && (
      player.overall_rating ||
      player.overallRating ||
      player.rating ||
      player.performance_score
    ));
  }

  function evidenceScore(player) {
    return clamp(player && (
      player.evidence_score ||
      player.dataConfidence ||
      player.data_confidence ||
      (player.compatibilityBreakdown && player.compatibilityBreakdown.dataConfidence)
    ));
  }

  function evidenceLabel(player) {
    var score = evidenceScore(player);
    if (score >= 80) return 'Strong';
    if (score >= 60) return 'Medium';
    if (score > 0) return 'Low';
    return 'Very low';
  }

  function money(value) {
    var amount = number(value, 0);
    if (!amount) return 'Not assessed';
    if (amount >= 1000000) {
      return '£' + (amount / 1000000).toFixed(amount % 1000000 ? 1 : 0) + 'm';
    }
    if (amount >= 1000) return '£' + Math.round(amount / 1000) + 'k';
    return '£' + Math.round(amount).toLocaleString('en-GB');
  }

  function dateText(value) {
    if (!value) return 'Not set';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  function playerLine(player) {
    return [
      playerPosition(player),
      player && player.age_group,
      playerTeam(player)
    ].filter(Boolean).join(' · ');
  }

  function normalisePlayer(player) {
    var value = Object.assign({}, player || {});
    value.id = value.id || value.player_id || value.uuid || '';
    value.compatibilityScore = playerCompatibility(value);
    value.overall_rating = playerRating(value);
    value.evidence_score = evidenceScore(value);
    value.transfer_value = number(
      value.transfer_value || value.estimated_value || value.value,
      0
    );
    return value;
  }

  async function loadPlayers(force) {
    if (state.playersPromise && !force) return state.playersPromise;

    state.playersPromise = (async function () {
      var rows = [];
      var response;
      if (isPublicDemo()) {
        try {
          response = await request('GET', '/api/players/public-demo', null, false);
          rows = response.data || response.players || [];
        } catch (_) {
          response = await request(
            'GET',
            '/api/scout-intelligence-v64/players',
            null,
            true
          );
          rows = response.data || response.players || [];
        }
      } else {
        response = await request(
          'GET',
          '/api/scout-intelligence-v64/players',
          null,
          true
        );
        rows = response.data || response.players || [];
      }

      state.players = rows.map(normalisePlayer).filter(function (player) {
        return player.id;
      });
      state.playersById = Object.create(null);
      state.players.forEach(function (player) {
        state.playersById[String(player.id)] = player;
      });
      return state.players;
    })().catch(function () {
      state.players = [];
      state.playersById = Object.create(null);
      return state.players;
    });

    return state.playersPromise;
  }

  async function loadUsage(force) {
    if (state.usagePromise && !force) return state.usagePromise;
    state.usagePromise = (async function () {
      var path = isPublicDemo()
        ? '/api/scout-intelligence-v64/public-demo/usage'
        : '/api/scout-intelligence-v64/usage';
      var response = await request('GET', path);
      return response.usage || response.data || response;
    })().catch(function () {
      return {
        plan: isPublicDemo() ? 'Elite demo' : 'Elite',
        predictions: { used: 30, limit: 60, remaining: 30 },
        exports: { used: 4, limit: 300, remaining: 296 },
        interests: { used: 7, limit: 300, remaining: 293 }
      };
    });
    return state.usagePromise;
  }

  async function loadDashboard(force) {
    if (state.dashboardPromise && !force) return state.dashboardPromise;
    state.dashboardPromise = (async function () {
      var path = isPublicDemo()
        ? '/api/scout-intelligence-v64/public-demo/dashboard'
        : '/api/scout-intelligence-v64/dashboard';
      return await request('GET', path);
    })().catch(function () {
      return {};
    });
    return state.dashboardPromise;
  }

  function activeCopies() {
    return {
      desktop: q(state.shadow, '.slv10-desktop-copy'),
      mobile: q(state.shadow, '.slv10-mobile-copy')
    };
  }

  function visibleCopy() {
    return window.matchMedia('(max-width: 767px)').matches
      ? q(state.shadow, '.slv10-mobile-copy')
      : q(state.shadow, '.slv10-desktop-copy');
  }

  function setAll(selector, callback) {
    qa(state.shadow, selector).forEach(callback);
  }

  function addNavigation() {
    setAll('.sidebar-logo,.sl-logo', function (logo) {
      var anchor = logo.closest('a') || logo;
      if (anchor.tagName && anchor.tagName.toLowerCase() === 'a') {
        anchor.href = '/scout/dashboard';
      }
    });

    setAll('.nav-link', function (link) {
      var label = normalise(q(link, 'b') ? q(link, 'b').textContent : link.textContent);
      if (NAV_ROUTES[label]) link.href = NAV_ROUTES[label];
    });

    setAll('.mobile-nav a', function (link) {
      var labelNode = q(link, 'b');
      var label = normalise(labelNode ? labelNode.textContent : link.textContent);
      if (NAV_ROUTES[label]) link.href = NAV_ROUTES[label];
    });

    setAll('.icon-btn', function (button) {
      button.type = 'button';
      button.addEventListener('click', function () {
        window.location.assign('/scout/notifications');
      });
    });

    setAll('.user-btn', function (button) {
      button.type = 'button';
      button.addEventListener('click', function () {
        window.location.assign('/scout/settings');
      });
    });

    setAll('.mobile-topbar button', function (button) {
      button.type = 'button';
      button.addEventListener('click', openMobileMenu);
    });

    setAll('.sidebar-user', function (node) {
      node.setAttribute('role', 'link');
      node.tabIndex = 0;
      node.addEventListener('click', function () {
        window.location.assign('/scout/settings');
      });
      node.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          window.location.assign('/scout/settings');
        }
      });
    });
  }

  function openMobileMenu() {
    var existing = q(state.shadow, '.slv10-mobile-drawer');
    if (existing) {
      existing.remove();
      return;
    }

    var desktopSidebar = q(state.shadow, '.slv10-desktop-copy .scout-sidebar');
    if (!desktopSidebar) return;

    var overlay = document.createElement('div');
    overlay.className = 'slv10-mobile-drawer';
    overlay.innerHTML =
      '<button class="slv10-mobile-drawer-backdrop" type="button" aria-label="Close menu"></button>' +
      '<aside>' +
        '<header><span class="sl-logo">Scout<span>Link</span></span>' +
        '<button type="button" aria-label="Close menu">×</button></header>' +
        desktopSidebar.innerHTML +
      '</aside>';

    state.exactRoot.appendChild(overlay);
    qa(overlay, '.sidebar-logo,.sidebar-user').forEach(function (node) {
      if (node.classList.contains('sidebar-user')) node.remove();
    });
    qa(overlay, '.nav-link').forEach(function (link) {
      var label = normalise(q(link, 'b') ? q(link, 'b').textContent : link.textContent);
      if (NAV_ROUTES[label]) link.href = NAV_ROUTES[label];
    });
    qa(overlay, 'header button,.slv10-mobile-drawer-backdrop').forEach(function (button) {
      button.addEventListener('click', function () { overlay.remove(); });
    });
    overlay.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') overlay.remove();
    });
    var close = q(overlay, 'header button');
    if (close) close.focus();
  }

  function syncUserIdentity() {
    var name = currentUserName();
    var first = firstName();
    var initials = initialsFromName(name);

    setAll('.sidebar-user b', function (node) { node.textContent = name; });
    setAll('.sidebar-user .initials-box', function (node) { node.textContent = initials; });
    setAll('.user-btn b', function (node) { node.textContent = first; });
    setAll('.user-btn .initials-box', function (node) { node.textContent = initials; });

    if (state.route === 'dashboard') {
      setAll('.page-hero h2', function (node) {
        node.textContent = 'Good morning, ' + first + '.';
      });
    }
  }

  function legacyButtons() {
    return qa(state.host, 'button,a');
  }

  function legacyControlByLabel(label) {
    var wanted = normalise(label);
    return legacyButtons().find(function (node) {
      return normalise(node.textContent) === wanted;
    }) || null;
  }

  function proxyToLegacy(label) {
    var legacy = legacyControlByLabel(label);
    if (!legacy) return false;
    if (legacy.tagName.toLowerCase() === 'a' && legacy.href) {
      window.location.assign(legacy.href);
    } else {
      legacy.click();
    }
    return true;
  }

  function addGenericActionBridge() {
    setAll('button', function (button) {
      if (button.dataset.slv10Bound === '1') return;
      var label = normalise(button.textContent);
      if (ACTION_ROUTES[label]) {
        button.dataset.slv10Bound = '1';
        button.addEventListener('click', function () {
          window.location.assign(ACTION_ROUTES[label]);
        });
        return;
      }

      button.dataset.slv10Bound = '1';
      button.addEventListener('click', function () {
        proxyToLegacy(text(button.textContent));
      });
    });
  }

  function replaceControlWithSelect(control, options, value, onChange) {
    if (!control) return;
    if (control.dataset.slv10Interactive === '1') {
      var existing = q(control, 'select');
      if (existing) existing.value = String(value);
      return;
    }
    control.dataset.slv10Interactive = '1';
    control.classList.add('slv10-select-control');
    control.innerHTML =
      '<select aria-label="' + esc(control.closest('.field') && q(control.closest('.field'), 'span') ?
        q(control.closest('.field'), 'span').textContent : 'Select') + '">' +
      options.map(function (option) {
        var optionValue = typeof option === 'string' ? option : option.value;
        var optionLabel = typeof option === 'string' ? option : option.label;
        return '<option value="' + esc(optionValue) + '"' +
          (String(optionValue) === String(value) ? ' selected' : '') +
          '>' + esc(optionLabel) + '</option>';
      }).join('') +
      '</select><i aria-hidden="true">⌄</i>';

    var select = q(control, 'select');
    select.addEventListener('change', function () {
      if (onChange) onChange(select.value);
    });
  }

  function replaceControlWithInput(control, value, options, onInput) {
    if (!control) return;
    if (control.dataset.slv10Interactive === '1') {
      var existing = q(control, 'input');
      if (existing) existing.value = value == null ? '' : value;
      return;
    }
    options = options || {};
    control.dataset.slv10Interactive = '1';
    control.classList.add('slv10-input-control');
    control.innerHTML =
      '<input type="' + esc(options.type || 'text') + '" value="' + esc(value == null ? '' : value) + '"' +
      (options.placeholder ? ' placeholder="' + esc(options.placeholder) + '"' : '') +
      (options.min != null ? ' min="' + esc(options.min) + '"' : '') +
      (options.step != null ? ' step="' + esc(options.step) + '"' : '') +
      '>';
    var input = q(control, 'input');
    input.addEventListener('input', function () {
      if (onInput) onInput(input.value);
    });
  }

  function sortedPlayersForSearch() {
    var rows = state.players.slice();
    var search = state.search;

    if (search.position) {
      rows = rows.filter(function (player) {
        var positions = [playerPosition(player)]
          .concat(Array.isArray(player.positions) ? player.positions : [])
          .map(function (item) { return String(item || '').toUpperCase(); });
        return positions.indexOf(search.position.toUpperCase()) >= 0;
      });
    }
    if (search.age) {
      rows = rows.filter(function (player) {
        return String(player.age_group || '').toUpperCase() === search.age.toUpperCase();
      });
    }
    if (search.region) {
      rows = rows.filter(function (player) {
        return playerRegion(player).toLowerCase() === search.region.toLowerCase();
      });
    }
    if (search.evidence) {
      rows = rows.filter(function (player) {
        return evidenceLabel(player) === search.evidence;
      });
    }

    var sorters = {
      'Best match': function (a, b) {
        return playerCompatibility(b) - playerCompatibility(a);
      },
      'Newest players': function (a, b) {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      },
      'Highest evidence': function (a, b) {
        return evidenceScore(b) - evidenceScore(a);
      },
      'Highest rating': function (a, b) {
        return playerRating(b) - playerRating(a);
      },
      'Lowest value': function (a, b) {
        return number(a.transfer_value) - number(b.transfer_value);
      }
    };
    rows.sort(sorters[search.sort] || sorters['Best match']);
    return rows;
  }

  function searchDesktopRow(player) {
    var evidence = evidenceLabel(player);
    return '<div class="search-data-row" data-player-id="' + esc(player.id) + '">' +
      '<div class="player-cell"><span class="initials-box">' + esc(playerInitials(player)) +
      '</span><div><b>' + esc(playerName(player)) + '</b><small>' +
      esc(playerLine(player)) + '</small></div></div>' +
      '<span>' + esc(playerRegion(player)) + '</span>' +
      '<strong>' + playerCompatibility(player) + '%</strong>' +
      '<span class="status ' + (evidence === 'Strong' ? 'green' : 'gold') + '">' +
      esc(evidence) + '</span>' +
      '<span>' + playerRating(player) + '</span>' +
      '<span>' + esc(money(player.transfer_value)) + '</span>' +
      '<button class="text-action" type="button" data-open-player="' + esc(player.id) +
      '">View profile</button></div>';
  }

  function searchMobileRow(player) {
    return '<button class="mobile-list-row" type="button" data-open-player="' +
      esc(player.id) + '">' +
      '<span class="initials-box">' + esc(playerInitials(player)) + '</span>' +
      '<div><h4>' + esc(playerName(player)) + '</h4><p>' + esc(playerLine(player)) +
      '</p><small>' + esc(playerRegion(player)) + ' · ' +
      esc(evidenceLabel(player)) + ' evidence</small></div>' +
      '<strong>' + playerCompatibility(player) + '%</strong><i>›</i></button>';
  }

  function renderSearch() {
    var rows = sortedPlayersForSearch();
    var pages = Math.max(1, Math.ceil(rows.length / SEARCH_PAGE_SIZE));
    state.search.page = Math.max(1, Math.min(state.search.page, pages));
    var start = (state.search.page - 1) * SEARCH_PAGE_SIZE;
    var pageRows = rows.slice(start, start + SEARCH_PAGE_SIZE);
    var first = rows.length ? start + 1 : 0;
    var last = Math.min(start + SEARCH_PAGE_SIZE, rows.length);

    var desktop = q(state.shadow, '.slv10-desktop-copy');
    if (desktop) {
      var table = q(desktop, '.data-table');
      var header = table && q(table, '.data-head');
      if (table && header) {
        qa(table, '.search-data-row').forEach(function (node) { node.remove(); });
        header.insertAdjacentHTML('afterend', pageRows.map(searchDesktopRow).join(''));
      }
      var summary = q(desktop, '.panel-head p');
      if (summary) {
        summary.textContent = rows.length + ' accessible players · Showing ' +
          first + '–' + last;
      }
      renderExactPagination(desktop, rows.length, pages, first, last);
    }

    var mobile = q(state.shadow, '.slv10-mobile-copy');
    if (mobile) {
      var list = q(mobile, '.mobile-list');
      if (list) list.innerHTML = pageRows.map(searchMobileRow).join('');
      var mobileSummary = q(mobile, '.panel-head p');
      if (mobileSummary) mobileSummary.textContent = rows.length + ' accessible records';
      renderExactPagination(mobile, rows.length, pages, first, last);
    }

    bindPlayerOpenButtons();
  }

  function renderExactPagination(copy, total, pages, first, last) {
    var footer = q(copy, '.compact-pagination');
    if (!footer) return;
    footer.innerHTML =
      '<span>' + first + '–' + last + ' of ' + total + '</span>' +
      '<div><button type="button" data-search-page="previous" aria-label="Previous page"' +
      (state.search.page <= 1 ? ' disabled' : '') + '>‹</button>' +
      '<b>' + state.search.page + ' / ' + pages + '</b>' +
      '<button type="button" data-search-page="next" aria-label="Next page"' +
      (state.search.page >= pages ? ' disabled' : '') + '>›</button></div>';

    qa(footer, '[data-search-page]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (button.dataset.searchPage === 'previous') state.search.page -= 1;
        else state.search.page += 1;
        renderSearch();
        var workbench = q(visibleCopy(), '.filter-workbench');
        if (workbench) workbench.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function setupSearchControls() {
    var positions = [
      'All positions','GK','CB','BPD','RB','LB','RWB','LWB','CDM','CM',
      'B2B','CAM','LW','RW','CF','ST','SS'
    ];
    var ages = ['All ages','U7','U8','U9','U10','U11','U12','U13','U14','U15','U16'];
    var regions = ['All regions'].concat(
      Array.from(new Set(state.players.map(playerRegion).filter(function (value) {
        return value && value !== 'Not set';
      }))).sort()
    );
    var evidence = ['Any evidence','Strong','Medium','Low','Very low'];
    var sorts = ['Best match','Newest players','Highest evidence','Highest rating','Lowest value'];

    qa(state.shadow, '.filter-workbench').forEach(function (workbench) {
      var fields = qa(workbench, '.filters .field');
      if (fields[0]) replaceControlWithSelect(
        q(fields[0], '.control'), positions,
        state.search.position || 'All positions',
        function (value) {
          state.search.position = value === 'All positions' ? '' : value;
          state.search.page = 1;
          setupSearchControls();
          renderSearch();
        }
      );
      if (fields[1]) replaceControlWithSelect(
        q(fields[1], '.control'), ages,
        state.search.age || 'All ages',
        function (value) {
          state.search.age = value === 'All ages' ? '' : value;
          state.search.page = 1;
          setupSearchControls();
          renderSearch();
        }
      );
      if (fields[2]) replaceControlWithSelect(
        q(fields[2], '.control'), regions,
        state.search.region || 'All regions',
        function (value) {
          state.search.region = value === 'All regions' ? '' : value;
          state.search.page = 1;
          setupSearchControls();
          renderSearch();
        }
      );
      if (fields[3]) replaceControlWithSelect(
        q(fields[3], '.control'), evidence,
        state.search.evidence || 'Any evidence',
        function (value) {
          state.search.evidence = value === 'Any evidence' ? '' : value;
          state.search.page = 1;
          setupSearchControls();
          renderSearch();
        }
      );
      if (fields[4]) replaceControlWithSelect(
        q(fields[4], '.control'), sorts, state.search.sort,
        function (value) {
          state.search.sort = value;
          state.search.page = 1;
          setupSearchControls();
          renderSearch();
        }
      );

      var clear = qa(workbench, 'button').find(function (button) {
        return normalise(button.textContent) === 'clear filters';
      });
      if (clear && clear.dataset.slv10SearchClear !== '1') {
        clear.dataset.slv10SearchClear = '1';
        clear.dataset.slv10Bound = '1';
        clear.addEventListener('click', function () {
          state.search = {
            page: 1,
            position: '',
            age: '',
            region: '',
            evidence: '',
            sort: 'Best match'
          };
          qa(workbench, '.control').forEach(function (control) {
            delete control.dataset.slv10Interactive;
          });
          setupSearchControls();
          renderSearch();
        });
      }
    });

    qa(state.shadow, '.slv10-mobile-copy .filter-workbench .btn').forEach(function (button) {
      if (normalise(button.textContent) !== 'open football filters') return;
      button.dataset.slv10Bound = '1';
      button.addEventListener('click', openMobileSearchFilters);
    });
  }

  function openMobileSearchFilters() {
    var existing = q(state.shadow, '.slv10-mobile-filter-sheet');
    if (existing) {
      existing.remove();
      return;
    }
    var sheet = document.createElement('section');
    sheet.className = 'slv10-mobile-filter-sheet';
    sheet.innerHTML =
      '<header><h3>Football filters</h3><button type="button" aria-label="Close filters">×</button></header>' +
      '<div class="slv10-mobile-filter-fields"></div>' +
      '<button class="btn primary" type="button" data-apply-mobile-filters>Apply filters</button>';
    state.exactRoot.appendChild(sheet);

    var fields = q(sheet, '.slv10-mobile-filter-fields');
    [
      ['Position', ['All positions','GK','CB','RB','LB','CDM','CM','CAM','LW','RW','ST'], state.search.position || 'All positions'],
      ['Age group', ['All ages','U7','U8','U9','U10','U11','U12','U13','U14','U15','U16'], state.search.age || 'All ages'],
      ['Evidence', ['Any evidence','Strong','Medium','Low','Very low'], state.search.evidence || 'Any evidence'],
      ['Sort by', ['Best match','Newest players','Highest evidence','Highest rating','Lowest value'], state.search.sort]
    ].forEach(function (definition) {
      var field = document.createElement('label');
      field.className = 'field';
      field.innerHTML = '<span>' + esc(definition[0]) + '</span><div class="control select"></div>';
      fields.appendChild(field);
      replaceControlWithSelect(q(field, '.control'), definition[1], definition[2], function (value) {
        if (definition[0] === 'Position') state.search.position = value === 'All positions' ? '' : value;
        if (definition[0] === 'Age group') state.search.age = value === 'All ages' ? '' : value;
        if (definition[0] === 'Evidence') state.search.evidence = value === 'Any evidence' ? '' : value;
        if (definition[0] === 'Sort by') state.search.sort = value;
      });
    });

    q(sheet, 'header button').addEventListener('click', function () { sheet.remove(); });
    q(sheet, '[data-apply-mobile-filters]').addEventListener('click', function () {
      state.search.page = 1;
      renderSearch();
      sheet.remove();
    });
  }

  function bindPlayerOpenButtons() {
    qa(state.shadow, '[data-open-player]').forEach(function (button) {
      if (button.dataset.slv10PlayerBound === '1') return;
      button.dataset.slv10PlayerBound = '1';
      button.dataset.slv10Bound = '1';
      button.addEventListener('click', function () {
        window.location.assign('/player/profile?id=' + encodeURIComponent(button.dataset.openPlayer));
      });
    });
  }

  function usageRow(usage, key, fallbackLimit) {
    var row = usage && usage[key] || {};
    var used = number(row.used, 0);
    var limit = number(row.limit, fallbackLimit || 0);
    var remaining = row.remaining != null ? number(row.remaining) : Math.max(0, limit - used);
    return {
      used: used,
      limit: limit,
      remaining: remaining,
      percent: limit ? Math.min(100, Math.round(used / limit * 100)) : 0
    };
  }

  function renderAllowances(copy, usage) {
    var list = q(copy, '.allowance-list');
    if (!list) return;
    var rows = [
      ['Predictions', usageRow(usage, 'predictions', 60)],
      ['Exports', usageRow(usage, 'exports', 300)],
      ['Pipeline interests', usageRow(usage, 'interests', 300)]
    ];
    list.innerHTML = rows.map(function (entry) {
      var row = entry[1];
      return '<article class="allowance"><div><small>' + esc(entry[0]) +
        '</small><b>' + row.used + ' of ' + row.limit + ' used</b><span>' +
        row.remaining + ' remaining</span></div><i><em style="width:' +
        row.percent + '%"></em></i></article>';
    }).join('');
  }

  function compatibleDesktopRow(player, actionLabel) {
    var evidence = evidenceLabel(player);
    return '<div class="compatible-row" data-player-id="' + esc(player.id) + '">' +
      '<div class="player-cell"><span class="initials-box">' + esc(playerInitials(player)) +
      '</span><div><b>' + esc(playerName(player)) + '</b><small>' +
      esc(playerLine(player)) + '</small></div></div>' +
      '<strong>' + playerCompatibility(player) + '%</strong>' +
      '<span class="status ' + (evidence === 'Strong' ? 'green' : 'gold') + '">' +
      esc(evidence) + '</span><span>' + playerRating(player) + '</span>' +
      '<button class="text-action" type="button" data-open-player="' +
      esc(player.id) + '">' + esc(actionLabel || 'Review') + '</button></div>';
  }

  function compatibleMobileRow(player) {
    return '<button class="mobile-list-row" type="button" data-open-player="' +
      esc(player.id) + '"><span class="initials-box">' +
      esc(playerInitials(player)) + '</span><div><h4>' +
      esc(playerName(player)) + '</h4><p>' + esc(playerLine(player)) +
      '</p><small>' + esc(evidenceLabel(player)) + ' evidence · Rating ' +
      playerRating(player) + '</small></div><strong>' +
      playerCompatibility(player) + '%</strong><i>›</i></button>';
  }

  async function hydrateDashboard() {
    var values = await Promise.all([loadPlayers(), loadUsage(), loadDashboard()]);
    var players = values[0].slice().sort(function (a, b) {
      return playerCompatibility(b) - playerCompatibility(a);
    });
    var usage = values[1] || {};
    var dashboard = values[2] || {};
    var top = players.slice(0, 5);
    var pipelineCount = number(
      dashboard.pipelineCount ||
      dashboard.pipeline_count ||
      (dashboard.pipeline && dashboard.pipeline.length) ||
      players.filter(function (player) {
        return player.pipeline_stage && player.pipeline_stage !== 'new';
      }).length,
      0
    );
    var plan = usage.plan || dashboard.plan || (isPublicDemo() ? 'Elite demo' : 'Elite');

    qa(state.shadow, '.slv10-desktop-copy .metric-strip,.slv10-mobile-copy .metric-strip').forEach(function (strip) {
      var metrics = qa(strip, 'article');
      if (metrics[0]) q(metrics[0], 'strong').textContent = players.length || 56;
      if (metrics[1]) q(metrics[1], 'strong').textContent = pipelineCount || 7;
      if (metrics[2]) q(metrics[2], 'strong').textContent = plan;
    });

    var desktop = q(state.shadow, '.slv10-desktop-copy');
    if (desktop) {
      var panel = qa(desktop, '.panel').find(function (node) {
        return q(node, '.panel-head h3') &&
          /compatible/i.test(q(node, '.panel-head h3').textContent);
      });
      if (panel) {
        var body = q(panel, '.panel-body');
        if (body) {
          var head = q(body, '.compatible-head');
          body.innerHTML = (head ? head.outerHTML : '') +
            top.map(function (player) {
              return compatibleDesktopRow(player, 'Review');
            }).join('');
        }
      }
      renderAllowances(desktop, usage);
    }

    var mobile = q(state.shadow, '.slv10-mobile-copy');
    if (mobile) {
      var mobileList = q(mobile, '.compatible-mobile-list');
      if (mobileList) mobileList.innerHTML = top.map(compatibleMobileRow).join('');
      renderAllowances(mobile, usage);
    }

    bindPlayerOpenButtons();
  }

  function hydrateProfile() {
    return loadPlayers().then(function (players) {
      var id = new URLSearchParams(window.location.search).get('id');
      var player = state.playersById[String(id)] || players[0];
      if (!player) return;

      var name = playerName(player);
      var line = [
        playerPosition(player),
        player.age_group,
        playerTeam(player),
        player.foot ? player.foot + ' foot' : ''
      ].filter(Boolean).join(' · ');
      var compatibility = playerCompatibility(player);
      var rating = playerRating(player);
      var evidence = evidenceScore(player);
      var value = money(player.transfer_value);
      var potential = clamp(
        player.potential_rating ||
        player.potentialRating ||
        Math.min(100, rating + 5)
      );
      var readiness = clamp(
        player.current_readiness ||
        player.currentReadiness ||
        Math.min(100, rating + 2)
      );

      setAll('.profile-main h2', function (node) { node.textContent = name; });
      setAll('.profile-main .initials-box', function (node) {
        node.textContent = playerInitials(player);
      });
      setAll('.profile-main p', function (node) { node.textContent = line; });
      setAll('.desktop-topbar h1', function (node) { node.textContent = name; });

      qa(state.shadow, '.profile-hero').forEach(function (hero) {
        var tags = q(hero, '.profile-tags');
        if (tags) {
          tags.innerHTML = [
            playerRegion(player),
            evidenceLabel(player) + ' evidence',
            'Coach managed',
            number(player.appearances, 0) + ' appearances'
          ].map(function (tag) {
            return '<span>' + esc(tag) + '</span>';
          }).join('');
        }
      });

      qa(state.shadow, '.metric-strip,.rating-summary').forEach(function (strip) {
        var metrics = qa(strip, 'article');
        var values = [rating, readiness, potential, evidence, number(player.appearances, 0), value];
        metrics.forEach(function (metric, index) {
          if (index >= values.length) return;
          var strong = q(metric, 'strong');
          if (!strong) return;
          if (index < 4) strong.textContent = values[index] + (strip.classList.contains('metric-strip') ? ' / 100' : '');
          else strong.textContent = values[index];
        });
      });

      setAll('.compatibility-headline strong', function (node) {
        node.textContent = compatibility + (node.textContent.indexOf('compatible') >= 0 ? '% compatible' : '%');
      });
      setAll('.value-number strong', function (node) { node.textContent = value; });

      var attributes = {
        pace: player.pace,
        agility: player.agility,
        strength: player.strength,
        stamina: player.stamina,
        shooting: player.shooting,
        passing: player.passing,
        dribbling: player.dribbling,
        defending: player.defending,
        composure: player.composure,
        crossing: player.crossing,
        vision: player.vision,
        positioning: player.positioning,
        heading: player.heading,
        tackling: player.tackling,
        jumping: player.jumping,
        technical: player.technical || player.technical_score,
        'tactical intelligence': player.tactical || player.tactical_score,
        'physical profile': player.physical || player.physical_score,
        'mental and coachability': player.mental || player.mental_score,
        'match output': player.match_output || rating,
        discipline: player.discipline || Math.max(0, 100 - number(player.yellow_cards) * 4 - number(player.red_cards) * 15),
        availability: player.availability_score || 86,
        'data confidence': evidence
      };

      qa(state.shadow, '.bar-row').forEach(function (row) {
        var label = normalise(q(row, 'span') ? q(row, 'span').textContent : '');
        if (attributes[label] == null) return;
        var valueNumber = clamp(attributes[label]);
        var bar = q(row, 'em');
        var output = q(row, 'b');
        if (bar) bar.style.width = valueNumber + '%';
        if (output) output.textContent = valueNumber;
      });

      qa(state.shadow, '.stat-block').forEach(function (block) {
        var valuesByLabel = {
          appearances: number(player.appearances, 0),
          goals: number(player.goals, 0),
          assists: number(player.assists, 0),
          'clean sheets': number(player.clean_sheets, 0),
          'yellow cards': number(player.yellow_cards, 0),
          'red cards': number(player.red_cards, 0)
        };
        qa(block, 'div').forEach(function (item) {
          var label = normalise(q(item, 'span') ? q(item, 'span').textContent : '');
          if (valuesByLabel[label] == null) return;
          q(item, 'strong').textContent = valuesByLabel[label];
        });
      });

      bindProfileActions(player);
    });
  }

  function bindProfileActions(player) {
    qa(state.shadow, '.profile-actions button,.profile-next-actions button,.value-actions button').forEach(function (button) {
      var label = normalise(button.textContent);
      button.dataset.slv10Bound = '1';
      if (label === 'compare') {
        button.addEventListener('click', function () {
          window.location.assign('/scout/compare-players?player=' + encodeURIComponent(player.id));
        });
      } else if (label === 'message coach') {
        button.addEventListener('click', function () {
          window.location.assign('/scout/chat?player=' + encodeURIComponent(player.id));
        });
      } else if (label === 'plan fixture') {
        button.addEventListener('click', function () {
          window.location.assign('/scout/fixtures?player=' + encodeURIComponent(player.id));
        });
      } else {
        button.addEventListener('click', function () {
          proxyToLegacy(text(button.textContent));
        });
      }
    });
  }

  function renderPipelineFromPlayers() {
    var rows = state.players.filter(function (player) {
      return player.pipeline_stage && player.pipeline_stage !== 'new';
    });
    if (!rows.length) return;
    rows = rows.slice(0, 12);

    var desktop = q(state.shadow, '.slv10-desktop-copy');
    if (desktop) {
      var table = qa(desktop, '.data-table').find(function (node) {
        return q(node, '.pipeline-head');
      });
      if (table) {
        qa(table, '.pipeline-row').forEach(function (node) { node.remove(); });
        table.insertAdjacentHTML('beforeend', rows.map(function (player) {
          var stage = player.pipeline_stage || 'Watching';
          return '<div class="pipeline-row" data-player-id="' + esc(player.id) + '">' +
            '<div class="player-cell"><span class="initials-box">' +
            esc(playerInitials(player)) + '</span><div><b>' + esc(playerName(player)) +
            '</b><small>' + esc(playerPosition(player) + ' · ' + (player.age_group || '')) +
            '</small></div></div><strong>' + playerRating(player) + '</strong><span>' +
            esc(money(player.transfer_value)) + '</span><span class="status gold">' +
            esc(stage) + '</span><div class="control">' + esc(stage) +
            '<i>⌄</i></div><button class="text-action" type="button" data-message-player="' +
            esc(player.id) + '">Message coach</button><button class="text-action" type="button" data-open-player="' +
            esc(player.id) + '">View</button></div>';
        }).join(''));
      }
    }

    var mobile = q(state.shadow, '.slv10-mobile-copy');
    if (mobile) {
      var list = q(mobile, '.pipeline-mobile-list');
      if (list) {
        list.innerHTML = rows.map(function (player) {
          return '<button class="mobile-list-row" type="button" data-open-player="' +
            esc(player.id) + '"><span class="initials-box">' +
            esc(playerInitials(player)) + '</span><div><h4>' +
            esc(playerName(player)) + '</h4><p>' +
            esc(playerPosition(player) + ' · ' + (player.age_group || '')) +
            '</p><small>' + esc(money(player.transfer_value)) +
            ' · Current pipeline prospect</small></div><strong>' +
            playerRating(player) + '</strong><span class="row-badge">' +
            esc(player.pipeline_stage || 'Watching') + '</span><i>›</i></button>';
        }).join('');
      }
    }

    bindPlayerOpenButtons();
    qa(state.shadow, '[data-message-player]').forEach(function (button) {
      button.dataset.slv10Bound = '1';
      button.addEventListener('click', function () {
        window.location.assign('/scout/chat?player=' + encodeURIComponent(button.dataset.messagePlayer));
      });
    });
  }

  function hydratePipeline() {
    return loadPlayers().then(renderPipelineFromPlayers);
  }

  function hydrateRankings() {
    return loadPlayers().then(function (players) {
      var rows = players.slice().sort(function (a, b) {
        return number(b.goals, 0) - number(a.goals, 0);
      }).slice(0, 20);
      if (!rows.length) return;

      var desktop = q(state.shadow, '.slv10-desktop-copy');
      if (desktop) {
        var podium = q(desktop, '.podium');
        if (podium) {
          podium.innerHTML = rows.slice(0, 3).map(function (player) {
            return '<article><span class="initials-box">' +
              esc(playerInitials(player)) + '</span><h4>' +
              esc(playerName(player)) + '</h4><p>' + esc(playerLine(player)) +
              '</p><strong>' + number(player.goals, 0) + ' goals</strong></article>';
          }).join('');
        }
        var rankList = q(desktop, '.rank-list');
        if (rankList) {
          rankList.innerHTML = rows.map(function (player, index) {
            return '<div class="rank-row"><span class="rank-no">' + (index + 1) +
              '</span><span class="initials-box">' + esc(playerInitials(player)) +
              '</span><div><b>' + esc(playerName(player)) + '</b><small>' +
              esc(playerLine(player)) + '</small></div><strong>' +
              number(player.goals, 0) + ' goals</strong><button class="text-action" type="button" data-open-player="' +
              esc(player.id) + '">View</button></div>';
          }).join('');
        }
      }

      var mobile = q(state.shadow, '.slv10-mobile-copy');
      if (mobile) {
        var list = q(mobile, '.ranking-mobile-list');
        if (list) {
          list.innerHTML = rows.slice(0, 10).map(function (player, index) {
            return '<button class="mobile-list-row" type="button" data-open-player="' +
              esc(player.id) + '"><span class="initials-box">' +
              esc(playerInitials(player)) + '</span><div><h4>' +
              esc(playerName(player)) + '</h4><p>' + esc(playerLine(player)) +
              '</p><small>Open the profile for evidence context</small></div><strong>' +
              number(player.goals, 0) + ' goals</strong><span class="row-badge">#' +
              (index + 1) + '</span><i>›</i></button>';
          }).join('');
        }
      }
      bindPlayerOpenButtons();
    });
  }

  function compareCategories(playerA, playerB, context) {
    var values = [
      ['Technical quality', 'technical', ['shooting','passing','dribbling','vision','composure']],
      ['Tactical intelligence', 'tactical', ['positioning','vision','composure']],
      ['Physical profile', 'physical', ['pace','agility','strength','stamina','jumping']],
      ['Match output', 'output', ['overall_rating','goals','assists']],
      ['Evidence confidence', 'evidence', ['evidence_score']],
      ['Financial fit', 'financial', []]
    ];

    function average(player, keys) {
      var scores = keys.map(function (key) {
        var raw = number(player[key], NaN);
        if (!Number.isFinite(raw)) return NaN;
        if ((key === 'goals' || key === 'assists') && raw <= 30) return Math.min(100, raw * 6);
        return raw > 0 && raw <= 10 ? raw * 10 : raw;
      }).filter(Number.isFinite);
      return scores.length
        ? scores.reduce(function (sum, value) { return sum + value; }, 0) / scores.length
        : playerRating(player);
    }

    return values.map(function (definition) {
      var a;
      var b;
      if (definition[1] === 'financial') {
        var budget = Math.max(1, number(state.compare.budget, 350000));
        a = clamp(100 - Math.max(0, number(playerA.transfer_value) - budget) / budget * 100);
        b = clamp(100 - Math.max(0, number(playerB.transfer_value) - budget) / budget * 100);
      } else if (definition[1] === 'evidence') {
        a = evidenceScore(playerA);
        b = evidenceScore(playerB);
      } else {
        a = clamp(average(playerA, definition[2]));
        b = clamp(average(playerB, definition[2]));
      }
      return {
        category: definition[0],
        playerA: a,
        playerB: b,
        winner: a === b ? 'Tie' : (a > b ? playerName(playerA) : playerName(playerB))
      };
    });
  }

  function localComparison(playerA, playerB) {
    var categories = compareCategories(playerA, playerB, state.compare.context);
    var weights = {
      'Immediate starter': [0.22,0.22,0.18,0.18,0.12,0.08],
      'Development prospect': [0.18,0.18,0.18,0.14,0.16,0.16],
      'Specific tactical role': [0.18,0.30,0.16,0.14,0.12,0.10],
      'Low financial risk': [0.14,0.14,0.14,0.12,0.16,0.30],
      'Resale upside': [0.16,0.16,0.18,0.12,0.14,0.24],
      'Squad depth': [0.16,0.18,0.18,0.14,0.14,0.20]
    }[state.compare.context] || [0.22,0.22,0.18,0.18,0.12,0.08];

    var totalA = 0;
    var totalB = 0;
    categories.forEach(function (row, index) {
      totalA += row.playerA * weights[index];
      totalB += row.playerB * weights[index];
    });
    var winner = totalA >= totalB ? playerA : playerB;
    var loser = winner === playerA ? playerB : playerA;
    return {
      context: { label: state.compare.context },
      playerA: { totalScore: totalA },
      playerB: { totalScore: totalB },
      winnerPlayerId: winner.id,
      decisionScoreMargin: Math.abs(totalA - totalB),
      recommendation: playerName(winner) + ' is the stronger ' +
        state.compare.context.toLowerCase() + ' fit. The weighted football context gives ' +
        playerName(winner) + ' the clearer current case over ' + playerName(loser) + '.',
      categories: categories,
      tradeOff: 'Review the largest weighted category differences and validate the recommendation through live football evidence.'
    };
  }

  function setupCompareControls() {
    var players = state.players;
    if (!players.length) return;

    var params = new URLSearchParams(window.location.search);
    if (!state.compare.playerAId) {
      state.compare.playerAId = params.get('player') || players[0].id;
    }
    if (!state.compare.playerBId) {
      var requested = params.get('playerB');
      state.compare.playerBId = requested && requested !== state.compare.playerAId
        ? requested
        : (players.find(function (player) {
            return String(player.id) !== String(state.compare.playerAId);
          }) || players[0]).id;
    }

    qa(state.shadow, '.compare-selection').forEach(function (selection) {
      var controls = qa(selection, '.field .control');
      if (controls[0]) replaceControlWithSelect(
        controls[0],
        players.map(function (player) {
          return { value: String(player.id), label: playerName(player) };
        }),
        String(state.compare.playerAId),
        function (value) {
          state.compare.playerAId = value;
          if (String(state.compare.playerBId) === String(value)) {
            var alternative = players.find(function (player) {
              return String(player.id) !== String(value);
            });
            state.compare.playerBId = alternative ? alternative.id : '';
          }
          setupCompareControls();
          renderCompareSelections();
        }
      );
      if (controls[1]) replaceControlWithSelect(
        controls[1],
        players.map(function (player) {
          return { value: String(player.id), label: playerName(player) };
        }),
        String(state.compare.playerBId),
        function (value) {
          state.compare.playerBId = value;
          if (String(state.compare.playerAId) === String(value)) {
            var alternative = players.find(function (player) {
              return String(player.id) !== String(value);
            });
            state.compare.playerAId = alternative ? alternative.id : '';
          }
          setupCompareControls();
          renderCompareSelections();
        }
      );
    });

    qa(state.shadow, '.compare-context').forEach(function (context) {
      var fields = qa(context, '.field');
      if (fields[0]) replaceControlWithSelect(
        q(fields[0], '.control'),
        ['Immediate starter','Development prospect','Specific tactical role','Low financial risk','Resale upside','Squad depth'],
        state.compare.context,
        function (value) {
          state.compare.context = value;
          renderCompareSelections();
        }
      );
      if (fields[1]) replaceControlWithSelect(
        q(fields[1], '.control'),
        ['Centre Forward','Current roles','GK','CB','RB','LB','CDM','CM','CAM','LW','RW','ST'],
        state.compare.position,
        function (value) {
          state.compare.position = value;
        }
      );
      if (fields[2]) replaceControlWithInput(
        q(fields[2], '.control'),
        state.compare.budget,
        { type: 'number', min: 0, step: 1000 },
        function (value) {
          state.compare.budget = number(value, 0);
        }
      );
      var run = qa(context, 'button').find(function (button) {
        return normalise(button.textContent) === 'compare and explain';
      });
      if (run && run.dataset.slv10CompareRun !== '1') {
        run.dataset.slv10CompareRun = '1';
        run.dataset.slv10Bound = '1';
        run.addEventListener('click', runComparison);
      }
    });

    qa(state.shadow, 'button').forEach(function (button) {
      if (normalise(button.textContent) !== 'new comparison') return;
      if (button.dataset.slv10CompareNew === '1') return;
      button.dataset.slv10CompareNew = '1';
      button.dataset.slv10Bound = '1';
      button.addEventListener('click', function () {
        state.compare.playerAId = players[0] ? players[0].id : '';
        state.compare.playerBId = players[1] ? players[1].id : '';
        state.compare.context = 'Immediate starter';
        state.compare.position = 'Centre Forward';
        state.compare.budget = 350000;
        state.compare.result = null;
        qa(state.shadow, '.slv10-select-control,.slv10-input-control').forEach(function (control) {
          delete control.dataset.slv10Interactive;
        });
        setupCompareControls();
        renderCompareSelections();
      });
    });

    renderCompareSelections();
  }

  function selectedPlayerCard(player) {
    if (!player) return '<span>Choose a player</span>';
    return '<span class="initials-box">' + esc(playerInitials(player)) +
      '</span><div><b>' + esc(playerName(player)) + '</b><small>' +
      esc(playerLine(player)) + '</small></div><strong>' +
      playerRating(player) + '</strong>';
  }

  function renderCompareSelections() {
    var playerA = state.playersById[String(state.compare.playerAId)];
    var playerB = state.playersById[String(state.compare.playerBId)];

    qa(state.shadow, '.compare-selection').forEach(function (selection) {
      var cards = qa(selection, '.selected-player');
      if (cards[0]) cards[0].innerHTML = selectedPlayerCard(playerA);
      if (cards[1]) cards[1].innerHTML = selectedPlayerCard(playerB);
    });

    qa(state.shadow, '.metric-strip').forEach(function (strip) {
      if (!q(strip, 'small') || normalise(q(strip, 'small').textContent) !== 'accessible players') return;
      var metrics = qa(strip, 'article');
      if (metrics[0]) q(metrics[0], 'strong').textContent = state.players.length;
      if (metrics[1]) q(metrics[1], 'strong').textContent =
        (playerA ? 1 : 0) + (playerB ? 1 : 0) + ' / 2';
      if (metrics[2]) q(metrics[2], 'strong').textContent = state.compare.context;
    });
  }

  async function runComparison() {
    var playerA = state.playersById[String(state.compare.playerAId)];
    var playerB = state.playersById[String(state.compare.playerBId)];
    if (!playerA || !playerB || String(playerA.id) === String(playerB.id)) {
      showToast('Choose two different players.', true);
      return;
    }

    var result;
    try {
      var contextMap = {
        'Immediate starter': 'immediate_starter',
        'Development prospect': 'development_prospect',
        'Specific tactical role': 'specific_tactical_role',
        'Low financial risk': 'low_financial_risk',
        'Resale upside': 'resale_upside',
        'Squad depth': 'squad_depth'
      };
      var endpoint = isPublicDemo()
        ? '/api/scout-intelligence-v64/public-demo/compare'
        : '/api/scout-intelligence-v64/compare';
      var response = await request('POST', endpoint, {
        playerAId: playerA.id,
        playerBId: playerB.id,
        contextKey: contextMap[state.compare.context] || 'immediate_starter',
        targetPosition: state.compare.position === 'Current roles'
          ? null
          : state.compare.position,
        budget: state.compare.budget || null
      });
      result = response.result || response.data || null;
    } catch (_) {
      result = null;
    }

    if (!result) result = localComparison(playerA, playerB);
    state.compare.result = result;
    renderComparisonResult(playerA, playerB, result);
    showToast('Comparison updated.');
  }

  function renderComparisonResult(playerA, playerB, result) {
    var totalA = number(result.playerA && result.playerA.totalScore, playerRating(playerA));
    var totalB = number(result.playerB && result.playerB.totalScore, playerRating(playerB));
    var winner = result.winnerPlayerId
      ? (String(result.winnerPlayerId) === String(playerA.id) ? playerA : playerB)
      : (totalA >= totalB ? playerA : playerB);
    var margin = number(result.decisionScoreMargin, Math.abs(totalA - totalB));
    var categories = Array.isArray(result.categories) && result.categories.length
      ? result.categories
      : compareCategories(playerA, playerB, state.compare.context);

    setAll('.compare-recommendation h3', function (node) {
      node.textContent = playerName(winner) + ' is the stronger ' +
        state.compare.context.toLowerCase() + ' fit.';
    });
    setAll('.compare-recommendation p', function (node) {
      node.textContent = result.recommendation ||
        'The weighted recruitment context gives ' + playerName(winner) +
        ' the clearer current case.';
    });
    setAll('.compare-recommendation>strong', function (node) {
      node.textContent = '+' + margin.toFixed(1);
    });

    qa(state.shadow, '.compare-head').forEach(function (head) {
      var cards = qa(head, '.compare-player-card');
      [playerA, playerB].forEach(function (player, index) {
        if (!cards[index]) return;
        cards[index].innerHTML =
          '<span class="initials-box">' + esc(playerInitials(player)) +
          '</span><div><h4>' + esc(playerName(player)) + '</h4><p>' +
          esc(playerPosition(player) + ' · ' + (player.age_group || '') + ' · ' +
            money(player.transfer_value) + ' · Fit ' + playerCompatibility(player) + '%') +
          '</p></div><strong>' + (index === 0 ? totalA : totalB).toFixed(1) +
          '</strong>';
      });
    });

    qa(state.shadow, '.data-table').forEach(function (table) {
      if (!q(table, '.compare-category-head')) return;
      qa(table, '.compare-category-row').forEach(function (node) { node.remove(); });
      var head = q(table, '.compare-category-head');
      head.innerHTML = '<span>Category</span><span>' +
        esc(playerName(playerA).split(' ')[0]) + '</span><span>' +
        esc(playerName(playerB).split(' ')[0]) + '</span><span>Leader</span>';
      table.insertAdjacentHTML('beforeend', categories.map(function (row) {
        var a = clamp(row.playerA != null ? row.playerA : row.a);
        var b = clamp(row.playerB != null ? row.playerB : row.b);
        var categoryWinner = row.winner ||
          (a === b ? 'Tie' : (a > b ? playerName(playerA) : playerName(playerB)));
        return '<div class="compare-category-row"><span>' +
          esc(row.category || row.name || 'Category') + '</span><b>' + a +
          '</b><b>' + b + '</b><span>' + esc(categoryWinner) + '</span></div>';
      }).join(''));
    });

    qa(state.shadow, 'button').forEach(function (button) {
      var label = normalise(button.textContent);
      if (label === 'open recommended profile') {
        button.dataset.slv10Bound = '1';
        button.onclick = function () {
          window.location.assign('/player/profile?id=' + encodeURIComponent(winner.id));
        };
      }
      if (label === 'export comparison') {
        button.dataset.slv10Bound = '1';
        button.onclick = function () {
          exportComparisonCsv(playerA, playerB, categories, winner, margin);
        };
      }
    });
  }

  function exportComparisonCsv(playerA, playerB, categories, winner, margin) {
    var lines = [
      ['ScoutLink comparison', playerName(playerA), playerName(playerB)],
      ['Decision context', state.compare.context, ''],
      ['Recommendation', playerName(winner), 'Margin ' + margin.toFixed(1)],
      [],
      ['Category', playerName(playerA), playerName(playerB), 'Leader']
    ].concat(categories.map(function (row) {
      return [
        row.category || row.name,
        row.playerA != null ? row.playerA : row.a,
        row.playerB != null ? row.playerB : row.b,
        row.winner || ''
      ];
    }));
    var csv = lines.map(function (row) {
      return row.map(function (cell) {
        return '"' + String(cell == null ? '' : cell).replace(/"/g, '""') + '"';
      }).join(',');
    }).join('\n');
    downloadBlob(
      'scoutlink-comparison-' + Date.now() + '.csv',
      'text/csv;charset=utf-8',
      csv
    );
  }

  function demoThreads() {
    var defaults = [
      {
        id: 'demo-ethan',
        playerId: '',
        playerName: 'Ethan Cole',
        initials: 'EC',
        playerLine: 'ST · U16 · Northgate United',
        coachName: 'Marcus Reed',
        team: 'Northgate United',
        overall: 84,
        compatibility: 86,
        evidence: 'Strong',
        pipeline: 'Shortlisted',
        nextFixture: '2 Aug',
        messages: [
          { sender: 'Marcus Reed', mine: false, body: 'Ethan is available for the fixture on 2 August.', time: '09:02' },
          { sender: 'You', mine: true, body: 'Thank you. I would like to attend and focus on his movement against a compact defence.', time: '09:08' },
          { sender: 'Marcus Reed', mine: false, body: 'That is fine. I will confirm the arrival point.', time: '09:18' }
        ]
      },
      {
        id: 'demo-reuben',
        playerId: '',
        playerName: 'Reuben Hughes',
        initials: 'RH',
        playerLine: 'ST · U16 · Eastbrook Athletic',
        coachName: 'Amir Khan',
        team: 'Eastbrook Athletic',
        overall: 85,
        compatibility: 82,
        evidence: 'Strong',
        pipeline: 'Interested',
        nextFixture: '5 Aug',
        messages: [
          { sender: 'Amir Khan', mine: false, body: 'Reuben is available for a follow-up observation next week.', time: 'Yesterday' }
        ]
      },
      {
        id: 'demo-carter',
        playerId: '',
        playerName: 'Carter Hill',
        initials: 'CH',
        playerLine: 'RW · U16 · Northgate United',
        coachName: 'Marcus Reed',
        team: 'Northgate United',
        overall: 82,
        compatibility: 83,
        evidence: 'Strong',
        pipeline: 'Shortlisted',
        nextFixture: '9 Aug',
        messages: [
          { sender: 'Marcus Reed', mine: false, body: 'I have shared the latest observation notes for Carter.', time: '27 Jul' }
        ]
      }
    ];

    try {
      var stored = JSON.parse(sessionStorage.getItem(DEMO_CHAT_KEY) || 'null');
      if (Array.isArray(stored) && stored.length) return stored;
    } catch (_) {}
    return defaults;
  }

  function saveDemoThreads() {
    try {
      sessionStorage.setItem(DEMO_CHAT_KEY, JSON.stringify(state.chat.threads));
    } catch (_) {}
  }

  async function authenticatedThreads() {
    var response = await request('GET', '/api/scout-intelligence-v64/chat/threads');
    var rows = response.data || [];
    return rows.map(function (thread) {
      var player = thread.players || state.playersById[String(thread.player_id)] || {};
      var coach = thread.coaches || {};
      return {
        id: String(thread.id),
        playerId: player.id || thread.player_id,
        playerName: playerName(player),
        initials: playerInitials(player),
        playerLine: playerLine(player),
        coachName: [coach.first_name, coach.last_name].filter(Boolean).join(' ') || 'Authorised coach',
        team: playerTeam(player),
        overall: playerRating(player),
        compatibility: playerCompatibility(player),
        evidence: evidenceLabel(player),
        pipeline: player.pipeline_stage || 'Watching',
        nextFixture: 'Not set',
        messages: [],
        updatedAt: thread.updated_at || thread.created_at
      };
    });
  }

  async function loadThreadMessages(thread) {
    if (isPublicDemo()) return thread.messages || [];
    var response = await request(
      'GET',
      '/api/scout-intelligence-v64/chat/threads/' + encodeURIComponent(thread.id) + '/messages'
    );
    return (response.data || []).map(function (row) {
      return {
        sender: String(row.sender_id) === String(currentUser().id) ? 'You' : (row.sender_type || 'Coach'),
        mine: String(row.sender_id) === String(currentUser().id),
        body: row.body || '',
        time: row.created_at
          ? new Date(row.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
          : ''
      };
    });
  }

  async function setupChat() {
    await loadPlayers();
    if (isPublicDemo()) {
      state.chat.threads = demoThreads();
    } else {
      try {
        state.chat.threads = await authenticatedThreads();
      } catch (_) {
        state.chat.threads = [];
      }
    }
    if (!state.chat.activeId && state.chat.threads[0]) {
      state.chat.activeId = state.chat.threads[0].id;
    }
    var requested = new URLSearchParams(window.location.search).get('thread');
    if (requested && state.chat.threads.some(function (thread) {
      return String(thread.id) === String(requested);
    })) {
      state.chat.activeId = requested;
    }
    await renderChat();
  }

  function activeThread() {
    return state.chat.threads.find(function (thread) {
      return String(thread.id) === String(state.chat.activeId);
    }) || state.chat.threads[0] || null;
  }

  async function selectThread(id) {
    state.chat.activeId = id;
    var thread = activeThread();
    if (thread && (!thread.messagesLoaded || isPublicDemo())) {
      try {
        thread.messages = await loadThreadMessages(thread);
        thread.messagesLoaded = true;
      } catch (_) {}
    }
    renderChat();
  }

  function messageMarkup(message) {
    return '<article class="message' + (message.mine ? ' mine' : '') +
      '"><small>' + esc(message.sender || (message.mine ? 'You' : 'Coach')) +
      '</small><p>' + esc(message.body || '') + '</p><time>' +
      esc(message.time || '') + '</time></article>';
  }

  async function renderChat() {
    var thread = activeThread();
    if (thread && (!thread.messagesLoaded || isPublicDemo())) {
      try {
        thread.messages = await loadThreadMessages(thread);
        thread.messagesLoaded = true;
      } catch (_) {}
    }

    var desktop = q(state.shadow, '.slv10-desktop-copy');
    if (desktop) {
      var list = q(desktop, '.thread-list');
      if (list) {
        var header = q(list, 'header');
        list.innerHTML = (header ? header.outerHTML : '<header><h3>Player conversations</h3><p>One thread for each registered player interest.</p></header>') +
          '<input class="chat-search" type="search" placeholder="Search by player or coach" aria-label="Search conversations">' +
          state.chat.threads.map(function (item) {
            var last = item.messages && item.messages.length
              ? item.messages[item.messages.length - 1].body
              : 'Open the player conversation.';
            return '<button class="thread-item ' +
              (String(item.id) === String(state.chat.activeId) ? 'active' : '') +
              '" type="button" data-thread-id="' + esc(item.id) + '">' +
              '<span class="initials-box">' + esc(item.initials || initialsFromName(item.playerName)) +
              '</span><div><b>' + esc(item.playerName) + '</b><span>' +
              esc(item.coachName + ' · ' + item.team) + '</span><small>' +
              esc(last) + '</small></div><time>' +
              esc(item.updatedAt ? dateText(item.updatedAt) : '') + '</time></button>';
          }).join('');
      }

      var chatThread = q(desktop, '.chat-thread');
      if (chatThread && thread) {
        chatThread.innerHTML =
          '<header><div><b>' + esc(thread.playerName) + '</b><span>Conversation with ' +
          esc(thread.coachName) + ' · Coach</span></div></header>' +
          '<div class="messages">' + (thread.messages || []).map(messageMarkup).join('') + '</div>' +
          '<footer class="composer"><textarea class="compose-box" placeholder="Write a message about ' +
          esc(thread.playerName) + '…" aria-label="Message"></textarea><button class="btn primary" type="button" data-send-chat>Send</button></footer>';
      }

      var context = q(desktop, '.chat-context');
      if (context && thread) {
        context.innerHTML =
          '<span>Player context</span><h3>' + esc(thread.playerName) + '</h3><p>' +
          esc(thread.playerLine) + '</p><div class="context-facts">' +
          '<div><span>Overall</span><b>' + esc(thread.overall) + '</b></div>' +
          '<div><span>Compatibility</span><b>' + esc(thread.compatibility) + '%</b></div>' +
          '<div><span>Evidence</span><b>' + esc(thread.evidence) + '</b></div>' +
          '<div><span>Pipeline</span><b>' + esc(thread.pipeline) + '</b></div>' +
          '<div><span>Next fixture</span><b>' + esc(thread.nextFixture) + '</b></div></div>' +
          '<button class="btn secondary" type="button" data-chat-profile>View player profile</button>';
      }
    }

    var mobile = q(state.shadow, '.slv10-mobile-copy');
    if (mobile && thread) {
      var mobileChat = q(mobile, '.chat-mobile');
      if (mobileChat) {
        mobileChat.innerHTML =
          '<section class="mobile-chat-top"><div class="mobile-chat-title">' +
          '<button type="button" data-mobile-thread-list aria-label="Choose conversation">‹</button>' +
          '<div><h3>' + esc(thread.playerName) + '</h3><p>' +
          esc(thread.coachName + ' · ' + thread.team) + '</p></div></div>' +
          '<div class="mobile-chat-person"><div><small>Coach</small><b>' +
          esc(thread.coachName) + '</b></div></div>' +
          '<div class="mobile-chat-context"><small>Player context</small><b>' +
          esc(thread.playerName) + '</b><span>' + esc(thread.playerLine) +
          ' · ' + esc(thread.compatibility) + '% fit</span>' +
          '<button class="btn secondary" type="button" data-chat-profile>View player profile</button></div></section>' +
          '<div class="mobile-chat-messages">' +
          (thread.messages || []).map(messageMarkup).join('') + '</div>' +
          '<footer class="mobile-chat-composer"><textarea class="compose-box" placeholder="Write a message about ' +
          esc(thread.playerName) + '…"></textarea><button class="btn primary" type="button" data-send-chat>Send</button></footer>';
      }
    }

    bindChatEvents();
  }

  function bindChatEvents() {
    qa(state.shadow, '[data-thread-id]').forEach(function (button) {
      button.dataset.slv10Bound = '1';
      button.addEventListener('click', function () {
        selectThread(button.dataset.threadId);
      });
    });

    qa(state.shadow, '.chat-search').forEach(function (input) {
      input.addEventListener('input', function () {
        var term = normalise(input.value);
        qa(input.closest('.thread-list'), '[data-thread-id]').forEach(function (button) {
          button.hidden = term && normalise(button.textContent).indexOf(term) < 0;
        });
      });
    });

    qa(state.shadow, '[data-send-chat]').forEach(function (button) {
      button.dataset.slv10Bound = '1';
      button.addEventListener('click', function () {
        sendChatMessage(button);
      });
    });

    qa(state.shadow, '.compose-box').forEach(function (input) {
      input.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          var button = q(input.parentElement, '[data-send-chat]');
          if (button) sendChatMessage(button);
        }
      });
    });

    qa(state.shadow, '[data-chat-profile]').forEach(function (button) {
      button.dataset.slv10Bound = '1';
      button.addEventListener('click', function () {
        var thread = activeThread();
        if (thread && thread.playerId) {
          window.location.assign('/player/profile?id=' + encodeURIComponent(thread.playerId));
        } else {
          window.location.assign('/scout/player-search');
        }
      });
    });

    qa(state.shadow, '[data-mobile-thread-list]').forEach(function (button) {
      button.dataset.slv10Bound = '1';
      button.addEventListener('click', openMobileThreadList);
    });
  }

  async function sendChatMessage(button) {
    var thread = activeThread();
    var composer = button.closest('footer');
    var input = composer && q(composer, '.compose-box');
    var body = text(input && input.value);
    if (!thread || !body) return;

    if (isPublicDemo()) {
      thread.messages = thread.messages || [];
      thread.messages.push({
        sender: 'You',
        mine: true,
        body: body,
        time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      });
      saveDemoThreads();
    } else {
      try {
        await request(
          'POST',
          '/api/scout-intelligence-v64/chat/threads/' + encodeURIComponent(thread.id) + '/messages',
          { body: body }
        );
        thread.messages = await loadThreadMessages(thread);
      } catch (error) {
        showToast(error.message, true);
        return;
      }
    }
    if (input) input.value = '';
    renderChat();
  }

  function openMobileThreadList() {
    var existing = q(state.shadow, '.slv10-mobile-thread-sheet');
    if (existing) {
      existing.remove();
      return;
    }
    var sheet = document.createElement('section');
    sheet.className = 'slv10-mobile-thread-sheet';
    sheet.innerHTML =
      '<header><h3>Player conversations</h3><button type="button" aria-label="Close">×</button></header>' +
      '<div>' + state.chat.threads.map(function (thread) {
        return '<button class="thread-item ' +
          (String(thread.id) === String(state.chat.activeId) ? 'active' : '') +
          '" type="button" data-mobile-thread="' + esc(thread.id) + '">' +
          '<span class="initials-box">' + esc(thread.initials) +
          '</span><div><b>' + esc(thread.playerName) + '</b><span>' +
          esc(thread.coachName + ' · ' + thread.team) +
          '</span></div></button>';
      }).join('') + '</div>';
    state.exactRoot.appendChild(sheet);
    q(sheet, 'header button').addEventListener('click', function () { sheet.remove(); });
    qa(sheet, '[data-mobile-thread]').forEach(function (button) {
      button.addEventListener('click', function () {
        selectThread(button.dataset.mobileThread);
        sheet.remove();
      });
    });
  }

  function demoNotifications() {
    var defaults = [
      {
        id: 'demo-notification-1',
        type: 'messages',
        code: 'CH',
        title: 'New message from Marcus Reed',
        body: 'Conversation about Ethan Cole.',
        date: 'Today · 09:18',
        action: 'Open conversation',
        url: '/scout/chat',
        unread: true
      },
      {
        id: 'demo-notification-2',
        type: 'match facts',
        code: 'MF',
        title: 'New Match Facts for Reuben Hughes',
        body: 'Evidence confidence increased after the latest match.',
        date: 'Today · 08:42',
        action: 'Review player',
        url: '/scout/player-search',
        unread: true
      },
      {
        id: 'demo-notification-3',
        type: 'fixtures',
        code: 'FX',
        title: 'Pipeline fixture updated',
        body: 'Carter Hill has a new fixture on 9 August.',
        date: 'Yesterday',
        action: 'Plan visit',
        url: '/scout/fixtures',
        unread: true
      },
      {
        id: 'demo-notification-4',
        type: 'recruitment',
        code: 'PR',
        title: 'Position-fit prediction saved',
        body: 'Ethan Cole · Centre Forward · 86/100.',
        date: '27 Jul',
        action: 'Open result',
        url: '/scout/predictions',
        unread: false
      },
      {
        id: 'demo-notification-5',
        type: 'system',
        code: 'EX',
        title: 'Profile dossier ready',
        body: 'The Ethan Cole PDF is available to download.',
        date: '27 Jul',
        action: 'Download',
        url: '',
        unread: false
      }
    ];
    try {
      var stored = JSON.parse(sessionStorage.getItem(DEMO_NOTIFICATION_KEY) || 'null');
      if (Array.isArray(stored) && stored.length) return stored;
    } catch (_) {}
    return defaults;
  }

  function saveDemoNotifications() {
    try {
      sessionStorage.setItem(DEMO_NOTIFICATION_KEY, JSON.stringify(state.notifications.rows));
    } catch (_) {}
  }

  async function setupNotifications() {
    if (isPublicDemo()) {
      state.notifications.rows = demoNotifications();
    } else {
      try {
        var response = await request('GET', '/api/notifications?limit=100');
        state.notifications.rows = (response.data || []).map(function (row) {
          var metadata = row.metadata || {};
          var url = row.action_url || row.actionUrl || metadata.action_url || metadata.actionUrl || '';
          return {
            id: row.id,
            type: normalise(row.filter_group || row.filterGroup || row.type || 'system'),
            code: String(row.type || row.filter_group || 'NT').slice(0, 2).toUpperCase(),
            title: row.title || row.body || row.message || 'ScoutLink update',
            body: row.title ? (row.body || row.message || '') : '',
            date: dateText(row.created_at),
            action: row.action_label || row.actionLabel || (url ? 'Open' : 'Mark read'),
            url: url,
            unread: !row.is_read
          };
        });
      } catch (_) {
        state.notifications.rows = [];
      }
    }
    renderNotifications();
  }

  function notificationMatches(row) {
    var filter = state.notifications.filter;
    if (filter === 'all') return true;
    var type = normalise(row.type);
    if (filter === 'messages') return type.indexOf('message') >= 0 || type.indexOf('chat') >= 0;
    if (filter === 'scout interest') return type.indexOf('interest') >= 0;
    if (filter === 'match facts') return type.indexOf('match') >= 0;
    if (filter === 'recruitment') return type.indexOf('recruit') >= 0 || type.indexOf('prediction') >= 0;
    if (filter === 'fixtures') return type.indexOf('fixture') >= 0 || type.indexOf('event') >= 0;
    if (filter === 'system') return type.indexOf('system') >= 0 || type.indexOf('export') >= 0;
    return true;
  }

  function notificationMarkup(row) {
    return '<article class="notification-row' + (row.unread ? ' unread' : '') +
      '" data-notification-id="' + esc(row.id) + '">' +
      '<span class="notification-icon">' + esc(row.code || 'NT') +
      '</span><div><b>' + esc(row.title) + '</b><p>' + esc(row.body) +
      '</p><small>' + esc(row.date) + '</small></div><button class="text-action" type="button" data-notification-action="' +
      esc(row.id) + '">' + esc(row.action || 'Open') + '</button></article>';
  }

  function renderNotifications() {
    var filtered = state.notifications.rows.filter(notificationMatches);
    qa(state.shadow, '.notification-list').forEach(function (list) {
      list.innerHTML = filtered.length
        ? filtered.map(notificationMarkup).join('')
        : '<div class="empty-state"><div class="empty-icon">NT</div><h4>No notifications in this category</h4><p>Meaningful ScoutLink updates will appear here.</p></div>';
    });

    qa(state.shadow, '.segment-row .segment').forEach(function (button) {
      var label = normalise(button.textContent);
      button.classList.toggle('active', label === state.notifications.filter);
      button.dataset.slv10Bound = '1';
      button.onclick = function () {
        state.notifications.filter = label;
        renderNotifications();
      };
    });

    qa(state.shadow, '[data-notification-action]').forEach(function (button) {
      button.dataset.slv10Bound = '1';
      button.onclick = function () {
        openNotification(button.dataset.notificationAction);
      };
    });

    qa(state.shadow, 'button').forEach(function (button) {
      var label = normalise(button.textContent);
      if (label === 'mark all read') {
        button.dataset.slv10Bound = '1';
        button.onclick = markAllNotificationsRead;
      }
      if (label === 'refresh') {
        button.dataset.slv10Bound = '1';
        button.onclick = function () { setupNotifications(); };
      }
    });
    updateNotificationBadges();
  }

  async function openNotification(id) {
    var row = state.notifications.rows.find(function (item) {
      return String(item.id) === String(id);
    });
    if (!row) return;
    row.unread = false;
    if (isPublicDemo()) {
      saveDemoNotifications();
    } else {
      try {
        await request('PATCH', '/api/notifications/' + encodeURIComponent(row.id) + '/read');
      } catch (_) {}
    }
    renderNotifications();
    if (normalise(row.action) === 'download') {
      downloadBlob('scoutlink-demo-dossier.txt', 'text/plain;charset=utf-8',
        'ScoutLink demo dossier\n\nThis download demonstrates the notification action.');
      return;
    }
    if (row.url) window.location.assign(row.url);
  }

  async function markAllNotificationsRead() {
    state.notifications.rows.forEach(function (row) { row.unread = false; });
    if (isPublicDemo()) {
      saveDemoNotifications();
    } else {
      try {
        await request('PATCH', '/api/notifications/mark-all-read');
      } catch (_) {}
    }
    renderNotifications();
  }

  function updateNotificationBadges() {
    var unread = state.notifications.rows.filter(function (row) { return row.unread; }).length;
    qa(state.shadow, '.icon-btn i').forEach(function (badge) {
      badge.textContent = unread;
      badge.hidden = unread === 0;
    });
  }

  function downloadBlob(filename, mime, content) {
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function showToast(message, error) {
    var existing = q(state.shadow, '.slv10-toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.className = 'slv10-toast' + (error ? ' error' : '');
    toast.setAttribute('role', error ? 'alert' : 'status');
    toast.textContent = message;
    state.exactRoot.appendChild(toast);
    window.setTimeout(function () { toast.remove(); }, 3500);
  }

  function bindOnboarding() {
    qa(state.shadow, 'button').forEach(function (button) {
      var label = normalise(button.textContent);
      if (label === 'continue to team context') {
        button.dataset.slv10Bound = '1';
        button.onclick = function () {
          try { sessionStorage.setItem('sl_scout_onboarding_step', '2'); } catch (_) {}
          window.location.assign('/scout/onboarding?step=2');
        };
      }
      if (label === 'continue to recruitment brief') {
        button.dataset.slv10Bound = '1';
        button.onclick = function () {
          try { sessionStorage.setItem('sl_scout_onboarding_step', '3'); } catch (_) {}
          window.location.assign('/scout/onboarding?step=3');
        };
      }
      if (label === 'back') {
        button.dataset.slv10Bound = '1';
        button.onclick = function () { window.history.back(); };
      }
      if (label === 'save setup and open dashboard') {
        button.dataset.slv10Bound = '1';
        button.onclick = function () {
          proxyToLegacy(text(button.textContent));
          window.setTimeout(function () {
            window.location.assign('/scout/dashboard');
          }, 250);
        };
      }
    });
  }

  async function hydrateRoute() {
    syncUserIdentity();
    addNavigation();

    if (state.route === 'dashboard') await hydrateDashboard();
    if (state.route === 'search') {
      await loadPlayers();
      setupSearchControls();
      renderSearch();
    }
    if (state.route === 'profile') await hydrateProfile();
    if (state.route === 'pipeline') await hydratePipeline();
    if (state.route === 'rankings') await hydrateRankings();
    if (state.route === 'usage') {
      var usage = await loadUsage();
      qa(state.shadow, '.slv10-desktop-copy,.slv10-mobile-copy').forEach(function (copy) {
        renderAllowances(copy, usage);
      });
    }
    if (state.route === 'compare') {
      await loadPlayers();
      setupCompareControls();
    }
    if (state.route === 'chat') await setupChat();
    if (state.route === 'notifications') await setupNotifications();
    if (state.route === 'onboarding') bindOnboarding();

    addGenericActionBridge();
    state.host.classList.remove('is-loading');
    state.host.setAttribute('aria-busy', 'false');
  }

  function mountExactExperience() {
    state.host = document.getElementById('scoutExperienceApp');
    if (!state.host || state.host.dataset.slv10ExactMounted === '1') return;
    state.route = routeId();
    var key = templateKey();
    var template = TEMPLATES[key];
    if (!template) return;

    state.host.dataset.slv10ExactMounted = '1';
    state.host.style.display = 'block';
    state.host.style.width = '100%';
    state.host.style.minHeight = '100vh';

    var shadow = state.host.shadowRoot || state.host.attachShadow({ mode: 'open' });
    state.shadow = shadow;
    shadow.innerHTML =
      '<style>:host{display:block;width:100%;min-height:100vh}.slv10-exact-root{visibility:hidden}</style>' +
      '<link rel="stylesheet" href="' + CSS_URL + '">' +
      '<div class="slv10-exact-root slv10-stage" data-version="' + VERSION + '">' +
        '<div class="slv10-desktop-copy">' + template.desktop + '</div>' +
        '<div class="slv10-mobile-copy">' + template.mobile + '</div>' +
      '</div>';

    state.exactRoot = q(shadow, '.slv10-exact-root');
    var link = q(shadow, 'link[rel="stylesheet"]');
    var reveal = function () {
      if (state.exactRoot) state.exactRoot.style.visibility = 'visible';
    };
    if (link) {
      link.addEventListener('load', reveal, { once: true });
      link.addEventListener('error', reveal, { once: true });
    }
    window.setTimeout(reveal, 1200);

    hydrateRoute().catch(function (error) {
      reveal();
      showToast(error.message || 'ScoutLink could not load the latest data.', true);
      addGenericActionBridge();
    });
  }

  function waitForHost() {
    var attempts = 0;
    (function check() {
      attempts += 1;
      var host = document.getElementById('scoutExperienceApp');
      if (host) {
        // Give the current Scout Intelligence runtime a short head start so it
        // remains available in the light DOM as the functional bridge.
        window.setTimeout(mountExactExperience, 120);
        return;
      }
      if (attempts < 200) window.setTimeout(check, 25);
    })();
  }

  window.addEventListener('resize', function () {
    var drawer = state.shadow && q(state.shadow, '.slv10-mobile-drawer');
    if (drawer && !window.matchMedia('(max-width: 767px)').matches) drawer.remove();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForHost);
  } else {
    waitForHost();
  }
}());
