/* ScoutLink Scout Intelligence V6.7
   Approved desktop/mobile design with live workflows, consistent usage,
   U7-U16 data rules and refined overlays. */
(function () {
    'use strict';
    var API_FALLBACK = 'https://scoutlink-api.vercel.app';
    var PAGE_SIZE = 20;
    var DEMO_USAGE_KEY = 'sl_scout_intelligence_demo_usage_v6_4';
    var templates = {
        "dashboard": `<section class="hero dashboard-hero-old"><div><small>Elite scout workspace</small><h2>Good morning.</h2><p>Your highest-fit players, real recruitment actions, team needs and plan usage are updated from the current ScoutLink records.</p></div><div class="hero-actions"><button class="btn primary" type="button">Review top matches</button><button class="btn" type="button">View next actions</button></div></section>
<section class="metric-grid"><article class="metric accent"><small>Players in system</small><strong data-dashboard-player-count>0</strong><span data-dashboard-player-scope>Current accessible dataset</span></article><article class="metric"><small>Next actions</small><strong data-dashboard-action-count>0</strong><span>Evidence-led recruitment work</span></article><article class="metric"><small>Your active pipeline</small><strong data-dashboard-pipeline-count>0</strong><span>Your registered player interests</span></article><article class="metric"><small>Current plan</small><strong data-dashboard-plan>Core</strong><span data-dashboard-plan-copy>One source of truth for every allowance</span></article></section>
<section class="panel dashboard-compatible-panel"><header class="panel-head"><div><h3>Top 5 most compatible players</h3><p>Highest current compatibility against the saved team brief</p></div><button class="btn small" type="button" data-view-all-compatible>View all players</button></header><div class="panel-body"><div class="table-wrap"><table><thead><tr><th>Player</th><th>Compatibility</th><th>Evidence</th><th>Current rating</th><th></th></tr></thead><tbody data-dashboard-compatible></tbody></table></div></div></section>
<section class="split"><section class="panel"><header class="panel-head"><div><h3>Next actions</h3><p>Only real actions that move a recruitment decision forward</p></div></header><div class="panel-body" data-dashboard-actions></div></section><section class="panel"><header class="panel-head"><div><h3>What the team needs</h3><p>Every saved need and the players currently matching it</p></div><button class="btn small" type="button">Edit setup</button></header><div class="panel-body" data-dashboard-needs></div></section></section>
<section class="split thirds"><section class="panel"><header class="panel-head"><div><h3>Usage and limits</h3><p>The same allowance totals are used everywhere</p></div><button class="btn small" type="button" data-open-usage-requests>Usage requests</button></header><div class="panel-body" data-dashboard-usage></div></section><section class="panel dashboard-fit-panel"><header class="panel-head"><div><h3>Top current fit</h3><p>Strongest recommendation for the current brief</p></div></header><div class="panel-body" data-dashboard-top-fit></div></section><section class="panel upcoming-priority-panel"><header class="panel-head"><div><h3>Upcoming live-scouting priority</h3><p>The next fixture action connected to a pipeline player</p></div></header><div class="panel-body" data-dashboard-priority></div></section></section>`,
        "search": `<section class="hero">
  <div>
    <small>Player discovery</small>
    <h2>Search the full player database.</h2>
    <p>Every accessible Supabase player appears first. Use football filters to narrow the table.</p>
  </div>
</section>
<section class="search-workbench">
  <div class="filters">
    <label class="field"><span>Position</span><select data-search-position><option>All positions</option><option>GK</option><option>CB</option><option>BPD</option><option>RB</option><option>LB</option><option>RWB</option><option>LWB</option><option>CDM</option><option>CM</option><option>B2B</option><option>CAM</option><option>LW</option><option>RW</option><option>CF</option><option>ST</option><option>SS</option></select></label>
    <label class="field"><span>Age group</span><select data-search-age><option>All ages</option><option>U7</option><option>U8</option><option>U9</option><option>U10</option><option>U11</option><option>U12</option><option>U13</option><option>U14</option><option>U15</option><option>U16</option></select></label>
    <label class="field"><span>Region</span><select data-search-region><option>All regions</option><option>London</option><option>Manchester</option></select></label>
    <label class="field"><span>Evidence</span><select data-search-evidence><option>Any evidence</option><option>High</option><option>Medium</option><option>Low</option><option>Very low</option></select></label>
    <label class="field"><span>Sort by</span><select data-search-sort><option>Best match</option><option>Newest players</option><option>Highest evidence</option><option>Highest rating</option><option>Lowest value</option></select></label>
    <button class="btn dark" type="button" data-clear-search>Clear filters</button>
  </div>
  <div class="active-filters"><span class="pill active">All players</span><span class="pill">Table view</span><span class="pill">20 per page</span></div>
</section>
<section class="panel">
  <header class="panel-head"><div><h3>All players</h3><p data-search-summary>Loading Supabase players…</p></div></header>
  <div class="panel-body">
    <div class="table-wrap search-table">
      <table>
        <thead><tr><th>Player</th><th>Position</th><th class="optional">Region</th><th>Fit</th><th>Evidence</th><th class="optional">Value</th><th class="optional">Added</th><th></th></tr></thead>
        <tbody data-search-results></tbody>
      </table>
    </div>
    <nav class="pagination" aria-label="Player database pages" data-search-pagination></nav>
  </div>
</section>`,
        "profile": `<section class="profile-head full-profile-head">
  <div class="profile-main">
    <span class="initials">PL</span>
    <div>
      <small>Player intelligence dossier</small>
      <h2>Player</h2>
      <p>Loading player details</p>
      <div class="profile-tags"></div>
    </div>
  </div>
  <div class="profile-actions profile-action-grid">
    <button class="btn primary" type="button">Register interest</button>
    <button class="btn" type="button">Compare</button>
    <button class="btn" type="button">Export profile</button>
    <button class="btn" type="button">Team and matches</button>
    <button class="btn" type="button">Watch all videos</button>
  </div>
</section>

<section class="metric-grid profile-metrics six">
  <article class="metric"><small>Overall match performance</small><strong>—</strong><span>Current player profile</span></article>
  <article class="metric"><small>Current readiness</small><strong>—</strong><span>How ready the player is now</span></article>
  <article class="metric"><small>Potential rating</small><strong>—</strong><span>Development upside</span></article>
  <article class="metric"><small>Data confidence</small><strong>—</strong><span>Evidence quality</span></article>
  <article class="metric"><small>Evidence base</small><strong>—</strong><span>Recorded Match Facts</span></article>
  <article class="metric"><small>Estimated value</small><strong>—</strong><span>Decision-support estimate</span></article>
</section>

<section class="panel" id="ratingBreakdown">
  <header class="panel-head"><div><h3>Overall rating breakdown</h3><p>Current Supabase player and Match Facts data</p></div></header>
  <div class="panel-body">
    <section class="rating-summary-grid">
      <article><small>Final score</small><strong data-rating-final>—</strong><span>Headline ScoutLink overall</span></article>
      <article><small>Current readiness</small><strong data-rating-readiness>—</strong><span>How ready the player is now</span></article>
      <article><small>Potential rating</small><strong data-rating-potential>—</strong><span>Development upside</span></article>
      <article><small>Data confidence</small><strong data-rating-confidence>—</strong><span>Evidence quality</span></article>
    </section>
    <div class="rating-detail-layout">
      <div class="attribute-list" data-rating-breakdown>
        <div class="attribute" data-rating-key="technical"><span>Technical</span><div class="bar"><i></i></div><b>—</b></div>
        <div class="attribute" data-rating-key="tactical"><span>Tactical intelligence</span><div class="bar blue"><i></i></div><b>—</b></div>
        <div class="attribute" data-rating-key="physical"><span>Physical profile</span><div class="bar"><i></i></div><b>—</b></div>
        <div class="attribute" data-rating-key="mental"><span>Mental and coachability</span><div class="bar"><i></i></div><b>—</b></div>
        <div class="attribute" data-rating-key="matchOutput"><span>Match output</span><div class="bar gold"><i></i></div><b>—</b></div>
        <div class="attribute" data-rating-key="discipline"><span>Discipline</span><div class="bar"><i></i></div><b>—</b></div>
        <div class="attribute" data-rating-key="availability"><span>Availability</span><div class="bar"><i></i></div><b>—</b></div>
        <div class="attribute" data-rating-key="confidence"><span>Data confidence</span><div class="bar blue"><i></i></div><b>—</b></div>
      </div>
      <aside class="role-analysis-card">
        <small>Role analysis</small>
        <h4 data-role-heading>Run position fit to reveal role outputs</h4>
        <p data-role-copy>The result will show the best current role, best future role, target-role fit, friction and recommended football action.</p>
        <div class="role-result-grid">
          <article><span>Best current role</span><b data-current-role>Not run</b></article>
          <article><span>Best future role</span><b data-future-role>Not run</b></article>
          <article><span>Role-fit score</span><b data-role-score>Not run</b></article>
        </div>
        <button class="btn primary jump-prediction" type="button">Run position fit</button>
      </aside>
    </div>
  </div>
</section>

<section class="panel" id="compatibility">
  <header class="panel-head"><div><h3>Compatibility intelligence</h3><p>Current saved recruitment brief</p></div></header>
  <div class="panel-body">
    <div class="compatibility-headline"><div><small>Current recruitment brief</small><h4>—</h4><p data-compatibility-copy>Compatibility will be calculated from the saved Scout setup and current player evidence.</p></div><button class="btn small" type="button">Edit Scout Setup</button></div>
    <div class="compatibility-grid">
      <article class="compat-card"><div><span>Need fit</span><b>—</b></div><div class="bar"><i></i></div></article>
      <article class="compat-card"><div><span>Role fit</span><b>—</b></div><div class="bar"><i></i></div></article>
      <article class="compat-card"><div><span>Tactical style</span><b>—</b></div><div class="bar"><i></i></div></article>
      <article class="compat-card"><div><span>Formation fit</span><b>—</b></div><div class="bar"><i></i></div></article>
      <article class="compat-card"><div><span>Development pathway</span><b>—</b></div><div class="bar"><i></i></div></article>
      <article class="compat-card"><div><span>Match evidence</span><b>—</b></div><div class="bar"><i></i></div></article>
      <article class="compat-card"><div><span>Financial fit</span><b>—</b></div><div class="bar"><i></i></div></article>
    </div>
    <div class="football-recommendation"><b>Football recommendation</b><span data-football-recommendation>Use the complete player evidence and live football judgement before making a recruitment decision.</span></div>
  </div>
</section>

<section class="decision-command" id="decisionSummary">
  <article class="decision-verdict-card"><small>ScoutLink verdict</small><div class="verdict-title-row"><h3>Assessment pending</h3><span class="pill green">— compatibility</span></div><p>Loading the current recruitment assessment.</p><div class="decision-badges" data-decision-badges></div></article>
  <article class="decision-reason-card"><header><span>01</span><div><small>Why this verdict</small><h4>What is driving the recommendation</h4></div></header><ul data-decision-reasons></ul></article>
  <article class="decision-risk-card"><header><span>02</span><div><small>Primary risk</small><h4>What still needs proof</h4></div></header><p data-decision-risk>Loading current evidence gaps.</p><button class="btn primary jump-prediction" type="button">Run position fit</button></article>
  <article class="decision-action-card"><header><span>03</span><div><small>Recommended next action</small><h4>Move from screen to football evidence</h4></div></header><p data-decision-action>Loading the recommended next step.</p><div><button class="btn primary" type="button">Plan fixture</button><button class="btn" type="button">Message coach</button></div></article>
</section>

<section class="profile-three-column" id="attributes">
  <section class="panel"><header class="panel-head"><div><h3>All attributes</h3></div></header><div class="panel-body"><div class="attribute-list dense" data-player-attributes>
    <div class="attribute" data-attribute="pace"><span>Pace</span><div class="bar"><i></i></div><b>—</b></div>
    <div class="attribute" data-attribute="agility"><span>Agility</span><div class="bar"><i></i></div><b>—</b></div>
    <div class="attribute" data-attribute="strength"><span>Strength</span><div class="bar"><i></i></div><b>—</b></div>
    <div class="attribute" data-attribute="stamina"><span>Stamina</span><div class="bar"><i></i></div><b>—</b></div>
    <div class="attribute" data-attribute="jumping"><span>Jumping</span><div class="bar"><i></i></div><b>—</b></div>
    <div class="attribute" data-attribute="composure"><span>Composure</span><div class="bar"><i></i></div><b>—</b></div>
    <div class="attribute" data-attribute="shooting"><span>Shooting</span><div class="bar"><i></i></div><b>—</b></div>
    <div class="attribute" data-attribute="passing"><span>Passing</span><div class="bar"><i></i></div><b>—</b></div>
    <div class="attribute" data-attribute="dribbling"><span>Dribbling</span><div class="bar"><i></i></div><b>—</b></div>
    <div class="attribute" data-attribute="defending"><span>Defending</span><div class="bar"><i></i></div><b>—</b></div>
    <div class="attribute" data-attribute="crossing"><span>Crossing</span><div class="bar"><i></i></div><b>—</b></div>
    <div class="attribute" data-attribute="vision"><span>Vision</span><div class="bar"><i></i></div><b>—</b></div>
    <div class="attribute" data-attribute="positioning"><span>Positioning</span><div class="bar"><i></i></div><b>—</b></div>
    <div class="attribute" data-attribute="heading"><span>Heading</span><div class="bar"><i></i></div><b>—</b></div>
    <div class="attribute" data-attribute="tackling"><span>Tackling</span><div class="bar"><i></i></div><b>—</b></div>
  </div></div></section>
  <section class="panel"><header class="panel-head"><div><h3>Match statistics</h3></div></header><div class="panel-body"><div class="stat-grid"><div><b>—</b><span>Appearances</span></div><div><b>—</b><span>Goals</span></div><div><b>—</b><span>Assists</span></div><div><b>—</b><span>Clean sheets</span></div><div><b>—</b><span>Yellow cards</span></div><div><b>—</b><span>Red cards</span></div></div><div class="output-note"><b>Output context</b><span data-output-context>Current recorded output will appear here.</span></div></div></section>
  <section class="panel"><header class="panel-head"><div><h3>Physical profile</h3></div></header><div class="panel-body"><div class="physical"><small>Profile type</small><b data-physical-profile>Not recorded</b><span data-physical-range>Current physical descriptors</span></div><div class="physical-detail-grid"><article><small>Age group</small><b data-physical-age>—</b></article><article><small>Preferred foot</small><b data-physical-foot>—</b></article><article><small>Position group</small><b data-physical-position>—</b></article><article><small>Availability</small><b data-physical-availability>—</b></article></div></div></section>
</section>

<section class="profile-two-column">
  <section class="panel" id="evidenceDetail"><header class="panel-head"><div><h3>Evidence confidence</h3></div></header><div class="panel-body"><div class="evidence-score"><div><small>Confidence score</small><strong data-evidence-score>—</strong><span data-evidence-label>—</span></div><p data-evidence-copy>Loading the player evidence base.</p></div><div class="evidence-bars" data-evidence-bars></div><div class="missing-evidence"><b>Evidence still worth collecting</b><span data-missing-evidence>Live evidence gaps will appear here.</span></div></div></section>
  <section class="panel"><header class="panel-head"><div><h3>Video evidence</h3></div></header><div class="panel-body"><div class="empty structured"><b>Loading video evidence</b><span>Reading approved player videos from Supabase.</span></div></div></section>
</section>

<section class="panel" id="valueAnalysis"><header class="panel-head"><div><h3>Value analysis</h3></div></header><div class="panel-body"><div class="value-analysis-head"><div><small>Estimated transfer value</small><strong>—</strong><span>Decision-support estimate, not a guaranteed market value</span></div><div class="value-summary-cards"><article><small>Affordability</small><b data-affordability>Review against budget</b></article><article><small>Risk label</small><b data-value-risk>Current evidence</b></article><article><small>Position group</small><b data-value-position>—</b></article></div></div><div class="factor-list" data-value-factors></div><div class="value-action"><span>Use the ROI prediction to test acquisition cost, development cost and downside assumptions.</span><button class="btn primary jump-prediction" type="button">Run ROI and value</button></div></div></section>

<section class="profile-two-column">
  <section class="panel"><header class="panel-head"><div><h3>Last 5 match facts</h3></div></header><div class="panel-body"><div class="empty structured"><b>Loading Match Facts</b><span>Reading the latest recorded match evidence.</span></div></div></section>
  <section class="panel"><header class="panel-head"><div><h3>Upcoming fixtures</h3></div></header><div class="panel-body"><div class="empty structured"><b>Loading fixtures</b><span>Reading the player team fixture schedule.</span></div></div></section>
</section>

<section class="panel" id="predictionControls">
  <header class="panel-head"><div><h3>What prediction do you want to run on this player?</h3><p>Choose one football question, then complete only the relevant inputs.</p></div></header>
  <div class="panel-body">
    <div class="prediction-type-grid">
      <button class="prediction-type" type="button" data-prediction="Position fit"><b>Position fit</b><span>Test a current, future or target role.</span></button>
      <button class="prediction-type" type="button" data-prediction="Match scenario"><b>Match scenario</b><span>Assess a defined tactical situation.</span></button>
      <button class="prediction-type" type="button" data-prediction="Development projection"><b>Development projection</b><span>Model rating and attribute direction.</span></button>
      <button class="prediction-type" type="button" data-prediction="ROI and value"><b>ROI and value</b><span>Review cost, upside and downside.</span></button>
    </div>
    <div class="selected-prediction-banner"><small>Selected prediction</small><b class="selected-prediction-label">Choose a prediction above</b></div>
    <div data-profile-prediction-stage></div>
    <div data-profile-prediction-result hidden></div>
  </div>
</section>

<section class="panel"><header class="panel-head"><div><h3>Recruitment actions</h3><p>Actions remain tied to this exact player record.</p></div></header><div class="panel-body profile-action-grid"><button class="btn" type="button">Watch player</button><button class="btn" type="button">Add observation</button><button class="btn primary" type="button">Record decision</button></div></section>`,
        "rankings": `<section class="hero">
  <div><small>Player rankings</small><h2>Rank the accessible player database.</h2><p>Every ranking uses the current Supabase player and Match Facts records.</p></div>
</section>
<section class="panel rankings-filter-panel">
  <div class="panel-body rankings-filters">
    <label class="field"><span>Ranking type</span><select data-ranking-type><option>Top goalscorers</option><option>Goals per game</option><option>Top assists</option><option>Assists per game</option><option>Most clean sheets</option><option>Clean sheets per game</option><option>Most sought after</option><option>Overall rating</option><option>Current readiness</option><option>Development potential</option><option>Evidence confidence</option><option>Financial value</option><option>Team fit</option></select></label>
    <label class="field"><span>Position</span><select data-ranking-position><option>All positions</option><option>GK</option><option>CB</option><option>RB</option><option>LB</option><option>CDM</option><option>CM</option><option>CAM</option><option>LW</option><option>RW</option><option>ST</option></select></label>
    <label class="field"><span>Age group</span><select data-ranking-age><option>All ages</option><option>U7</option><option>U8</option><option>U9</option><option>U10</option><option>U11</option><option>U12</option><option>U13</option><option>U14</option><option>U15</option><option>U16</option></select></label>
    <label class="field"><span>Region</span><select data-ranking-region><option>All regions</option><option>London</option><option>Manchester</option></select></label>
    <button class="btn primary" type="button" data-update-ranking>Update ranking</button>
  </div>
</section>
<section class="rank-widget-grid" data-ranking-podium></section>
<section class="panel">
  <header class="panel-head"><div><h3 data-ranking-heading>Top goalscorers</h3><p data-ranking-summary>Loading Supabase players…</p></div></header>
  <div class="panel-body"><div class="table-wrap"><table><thead><tr><th>Rank</th><th>Player</th><th data-ranking-metric>Goals</th><th>Why they rank here</th><th></th></tr></thead><tbody data-ranking-results></tbody></table></div></div>
</section>`,
        "fixtures": `<section class="hero">
  <div>
    <small>Live-scouting planning</small>
    <h2>Fixtures connected to pipeline players.</h2>
    <p>The calendar is built from Supabase fixtures and saved observation plans.</p>
  </div>
</section>
<section class="metric-grid compact">
  <article class="metric accent"><small>Upcoming fixtures</small><strong>0</strong><span>Pipeline-player matches</span></article>
  <article class="metric"><small>Planned visits</small><strong>0</strong><span>Saved observation plans</span></article>
  <article class="metric"><small>Next fixture</small><strong>—</strong><span>Next available date</span></article>
  <article class="metric"><small>Unplanned</small><strong>0</strong><span>Fixtures needing an owner</span></article>
</section>
<section class="calendar-layout">
  <section class="panel calendar-panel">
    <header class="panel-head"><div><h3 data-fixture-month>Fixture calendar</h3><p>Pipeline-player fixtures</p></div><div><button class="btn small" type="button">Previous</button><button class="btn small" type="button">Today</button><button class="btn small" type="button">Next</button></div></header>
    <div class="panel-body">
      <div class="desktop-calendar"><div class="calendar-head"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div><div class="calendar-grid"><div class="empty structured"><b>Loading fixtures</b><span>Reading Supabase fixtures and saved plans.</span></div></div></div>
      <div class="mobile-fixture-list"><div class="empty structured"><b>Loading fixtures</b><span>Reading Supabase fixtures and saved plans.</span></div></div>
    </div>
  </section>
  <section class="panel"><header class="panel-head"><div><h3>Priority visits</h3><p>Highest-value live-scouting actions</p></div></header><div class="panel-body"><div class="empty structured"><b>Loading priorities</b><span>Preparing fixture priorities from current pipeline records.</span></div></div></section>
</section>`,
        "predictions": `<section class="hero"><div><small>Decision-support history</small><h2>Predictions.</h2><p>Review predictions previously run from player profiles. New predictions are started only from the relevant player profile so the player context is never lost.</p></div><div class="hero-actions"><a class="btn primary" href="/scout/player-search">Find a player</a></div></section>
<section class="metric-grid compact"><article class="metric accent"><small>Prediction usage</small><strong>0 / 0</strong><span>Current team allowance</span></article><article class="metric"><small>Saved predictions</small><strong data-prediction-count>0</strong><span>Available to reopen</span></article><article class="metric"><small>Current plan</small><strong>Core</strong><span>Team subscription</span></article><article class="metric"><small>Where to run one</small><strong>Player profile</strong><span>Open a player and use the prediction section</span></article></section>
<section class="panel"><header class="panel-head"><div><h3>Prediction history</h3><p>Open a saved prediction to review its question, inputs, evidence and outcome</p></div></header><div class="panel-body"><div class="table-wrap"><table><thead><tr><th>Player</th><th>Prediction</th><th>Outcome</th><th>Run</th><th></th></tr></thead><tbody></tbody></table></div></div></section>`,
        "exports": `<section class="hero"><div><small>Report library</small><h2>Exports.</h2><p>Review and download reports already created from player profiles, predictions, pipeline exports and player comparisons.</p></div></section>
<section class="metric-grid compact"><article class="metric accent"><small>Export usage</small><strong>0 / 0</strong><span>Current team allowance</span></article><article class="metric"><small>Reports stored</small><strong data-report-count>0</strong><span>Available in report history</span></article><article class="metric"><small>Profile exports</small><strong data-profile-report-count>0</strong><span>Created from player profiles</span></article><article class="metric"><small>Other exports</small><strong data-other-report-count>0</strong><span>Predictions, pipeline and comparisons</span></article></section>
<section class="panel"><header class="panel-head"><div><h3>Report history</h3><p>Historical re-downloads do not create a new report or consume another export</p></div></header><div class="panel-body"><div class="table-wrap"><table><thead><tr><th>Report</th><th>Subject</th><th>Format</th><th>Created</th><th>Status</th><th></th></tr></thead><tbody></tbody></table></div></div></section>`,
        "compare": `<section class="hero">
  <div><small>Comparison decision engine</small><h2>Compare two players in the real recruitment context.</h2><p>Select two valid Supabase player records. The decision context changes the category weights and the final margin.</p></div>
  <div class="hero-actions"><button class="btn primary" type="button" data-new-comparison>New comparison</button></div>
</section>
<section class="metric-grid compact">
  <article class="metric accent"><small>Accessible players</small><strong data-compare-player-count>0</strong><span>Available from Supabase</span></article>
  <article class="metric"><small>Selected players</small><strong data-compare-selected-count>0 / 2</strong><span>Two different players required</span></article>
  <article class="metric"><small>Decision context</small><strong data-compare-context-label>Immediate starter</strong><span>Changes the category weights</span></article>
  <article class="metric"><small>Current plan</small><strong data-compare-plan>Core</strong><span>Comparison does not use a prediction credit</span></article>
</section>
<section class="compare-setup">
  <div class="compare-player-select"><label><span>Player A</span><input autocomplete="off" data-compare-side="a" list="comparePlayerOptionsA" placeholder="Type a player name"></label><div class="selected-player empty-selection" data-selected-a><span>Choose a player</span></div></div>
  <div class="compare-player-select"><label><span>Player B</span><input autocomplete="off" data-compare-side="b" list="comparePlayerOptionsB" placeholder="Type a player name"></label><div class="selected-player empty-selection" data-selected-b><span>Choose a player</span></div></div>
  <div class="compare-context">
    <label class="field"><span>Decision context</span><select data-compare-context><option>Immediate starter</option><option>Development prospect</option><option>Specific tactical role</option><option>Low financial risk</option><option>Resale upside</option><option>Squad depth</option></select></label>
    <label class="field"><span>Target position</span><select data-compare-position><option>Current roles</option><option>GK</option><option>CB</option><option>BPD</option><option>RB</option><option>LB</option><option>CDM</option><option>CM</option><option>CAM</option><option>LW</option><option>RW</option><option>ST</option></select></label>
    <label class="field"><span>Budget</span><input data-compare-budget type="number" min="0" step="1000" placeholder="Optional"></label>
    <button class="btn primary" type="button" data-run-comparison>Compare and explain</button>
  </div>
  <datalist id="comparePlayerOptionsA"></datalist>
  <datalist id="comparePlayerOptionsB"></datalist>
</section>
<div class="comparison-inline-status empty structured" data-comparison-status hidden></div>
<section class="comparison-results is-hidden" data-comparison-results>
  <section class="recommendation"><div><small data-comparison-context-copy>Recommendation</small><h3 data-comparison-winner>—</h3><p data-comparison-copy></p></div><div class="decision-margin"><b data-comparison-margin>0.0</b><span>decision-score margin</span></div></section>
  <section class="compare-head"><article data-compare-head-a></article><article data-compare-head-b></article></section>
  <section class="panel"><header class="panel-head"><div><h3>Category-by-category explanation</h3><p>Each row uses the selected context weight.</p></div></header><div class="panel-body"><div class="table-wrap"><table><thead><tr data-comparison-headings></tr></thead><tbody data-comparison-categories></tbody></table></div></div></section>
  <section class="split"><section class="panel"><header class="panel-head"><div><h3>What could change the recommendation</h3></div></header><div class="panel-body"><ul class="clean-list warn" data-comparison-change></ul></div></section><section class="panel"><header class="panel-head"><div><h3>Most important trade-offs</h3></div></header><div class="panel-body"><p class="trade-off" data-comparison-tradeoff></p></div></section></section>
  <section class="comparison-actions"><button class="btn" type="button" data-open-comparison-profile>Open profile</button><button class="btn primary" type="button" data-export-comparison>Export comparison</button></section>
</section>`,
        "setup": `<section class="hero"><div><small>Recruitment brief</small><h2>Keep the setup concise and material.</h2><p>The saved brief changes search ordering, compatibility, comparisons and predictions. Select only factors that should genuinely change a recruitment decision.</p></div><div class="hero-actions"><button class="btn">Review impact</button><button class="btn primary">Save changes</button></div></section><section class="setup-nav"><a class="active">Team context</a><a>Team weaknesses</a><a>Role expectations</a><a>Long-term goals</a></section>
<section class="impact-grid"><article><b>Search impact</b><span>Explains why players match the selected needs.</span></article><article><b>Comparison impact</b><span>Changes the winner when context changes.</span></article><article><b>Prediction impact</b><span>Keeps the recruitment brief visible in results.</span></article></section>
<section class="panel"><header class="panel-head"><div><h3>Team context</h3></div></header><div class="panel-body"><div class="form-grid"><label class="field"><span>Team name</span><input placeholder="" value="ScoutLink Demo Recruitment Team"/></label><label class="field"><span>Club / organisation</span><input placeholder="" value="Stratex Demo FC"/></label><label class="field"><span>Scout country</span><select><option selected="">England</option><option>Scotland</option><option>Wales</option><option>Northern Ireland</option></select></label><label class="field"><span>Scout region</span><select><option selected="">London</option><option>North West</option><option>West Midlands</option><option>South West</option></select></label><label class="field"><span>Formation</span><select><option selected="">4-3-3</option><option>4-2-3-1</option><option>3-4-3</option><option>4-4-2</option></select></label><label class="field"><span>Playing style</span><select><option selected="">Tiki-Taka</option><option>High press</option><option>Direct transition</option><option>Possession</option><option>Low block</option></select></label></div></div></section>
<section class="panel"><header class="panel-head"><div><h3>Team weaknesses looking to be solved</h3></div><span class="pill">Select up to 3</span></header><div class="panel-body"><div class="choice-grid"><label class="choice selected"><input checked="checked" name="setup_choice" type="checkbox"/><span>Insufficient game pace and speed</span></label><label class="choice"><input name="setup_choice" type="checkbox"/><span>Physical fragility and injury risk</span></label><label class="choice"><input name="setup_choice" type="checkbox"/><span>Lack of physical presence</span></label><label class="choice"><input name="setup_choice" type="checkbox"/><span>Weak defensive base</span></label><label class="choice"><input name="setup_choice" type="checkbox"/><span>Poor defensive output</span></label><label class="choice selected"><input checked="checked" name="setup_choice" type="checkbox"/><span>Low team chemistry and leadership</span></label><label class="choice"><input name="setup_choice" type="checkbox"/><span>Technical deficiencies under pressure</span></label><label class="choice selected"><input checked="checked" name="setup_choice" type="checkbox"/><span>Tactical awareness gaps</span></label><label class="choice"><input name="setup_choice" type="checkbox"/><span>Poor goal output</span></label></div></div></section>
<section class="panel"><header class="panel-head"><div><h3>Role expectations</h3></div><span class="pill">Select up to 3</span></header><div class="panel-body"><div class="choice-grid"><label class="choice"><input name="setup_choice" type="checkbox"/><span>Aerial dominance</span></label><label class="choice selected"><input checked="checked" name="setup_choice" type="checkbox"/><span>Vision and creativity</span></label><label class="choice"><input name="setup_choice" type="checkbox"/><span>Speed and agility</span></label><label class="choice selected"><input checked="checked" name="setup_choice" type="checkbox"/><span>Tactical intelligence</span></label><label class="choice"><input name="setup_choice" type="checkbox"/><span>Ball retention under pressure</span></label><label class="choice"><input name="setup_choice" type="checkbox"/><span>Physical resilience / work rate</span></label><label class="choice"><input name="setup_choice" type="checkbox"/><span>Defensive impact</span></label><label class="choice"><input name="setup_choice" type="checkbox"/><span>Offensive impact</span></label><label class="choice"><input name="setup_choice" type="checkbox"/><span>Progression and carrying</span></label><label class="choice selected"><input checked="checked" name="setup_choice" type="checkbox"/><span>Leadership and communication</span></label></div></div></section>
<section class="panel"><header class="panel-head"><div><h3>Long-term goals</h3></div><span class="pill">Select up to 3</span></header><div class="panel-body"><div class="choice-grid"><label class="choice"><input name="setup_choice" type="checkbox"/><span>Physical growth potential</span></label><label class="choice selected"><input checked="checked" name="setup_choice" type="checkbox"/><span>Tactical role maturity</span></label><label class="choice"><input name="setup_choice" type="checkbox"/><span>Leadership and coachability</span></label><label class="choice"><input name="setup_choice" type="checkbox"/><span>Injury risk and physical resilience</span></label><label class="choice selected"><input checked="checked" name="setup_choice" type="checkbox"/><span>Positional depth advantage</span></label><label class="choice"><input name="setup_choice" type="checkbox"/><span>Goal contribution potential</span></label><label class="choice selected"><input checked="checked" name="setup_choice" type="checkbox"/><span>Financial viability</span></label></div></div></section>
<section class="panel"><header class="panel-head"></header><div class="panel-body"><div class="preference-block"><b>Age groups</b><div class="chip-row"><span class="pill">U6</span><span class="pill">U7</span><span class="pill">U8</span><span class="pill">U9</span><span class="pill">U10</span><span class="pill">U11</span><span class="pill">U12</span><span class="pill">U13</span><span class="pill">U14</span><span class="pill">U15</span><span class="pill active">U16</span></div></div><div class="preference-block"><b>Preferred positions</b><div class="chip-row"><span class="pill active">GK</span><span class="pill active">CB</span><span class="pill">RB</span><span class="pill">LB</span><span class="pill">RWB</span><span class="pill">LWB</span><span class="pill">CDM</span><span class="pill">CM</span><span class="pill active">CAM</span><span class="pill">LM</span><span class="pill">RM</span><span class="pill">LW</span><span class="pill">RW</span><span class="pill active">ST</span></div></div><div class="form-grid"><label class="field"><span>Salary cap (GBP/week)</span><input placeholder="" value="500000"/></label><label class="field"><span>Minimum appearances</span><input placeholder="" value="3"/></label></div></div></section>
<div class="sticky-save"><span>Last saved 23 Jul 2026 · 07:15</span><div><button class="btn">Cancel</button><button class="btn primary">Save and apply</button></div></div>`,
        "chat": `<section class="panel player-context-chat-panel">
  <div class="chat-layout player-context-chat">
    <aside class="conversation-list">
      <div class="conversation-head"><div><h3>Player conversations</h3><p>One separate thread for each player</p></div><button class="btn small" type="button" data-refresh-chat>Refresh</button></div>
      <label class="chat-search"><span>Search by player</span><input type="search" data-chat-search placeholder="Type a player name"></label>
      <div class="conversation-scroll" data-chat-thread-list><div class="empty structured"><b>Loading conversations</b><span>Reading player-linked threads from Supabase.</span></div></div>
    </aside>
    <section class="thread">
      <header class="thread-head"><div><small>Player recruitment conversation</small><b data-chat-title>Select a player conversation</b><span data-chat-meta>Open a player profile and register interest before messaging the coach.</span></div><a class="btn small" data-chat-profile hidden>Open profile</a></header>
      <div class="chat-player-context" data-chat-context><div class="empty structured"><b>No conversation selected</b><span>Select a player from the conversation list.</span></div></div>
      <div class="messages" data-chat-messages><div class="empty structured"><b>Select a conversation</b><span>Messages are always tied to one player.</span></div></div>
      <div class="composer"><textarea data-chat-message placeholder="Write a message about this player" disabled></textarea><button class="btn primary send-btn" type="button" data-chat-send disabled>Send</button></div>
    </section>
  </div>
</section>`,
        "notifications": `<section class="hero">
  <div><small>Scout activity</small><h2>Only the updates that need your attention.</h2><p>Meaningful player, fixture, message and decision changes are loaded from Supabase.</p></div>
  <div class="hero-actions"><button class="btn" type="button">Mark all read</button></div>
</section>
<section class="notification-toolbar">
  <div class="segments"><button class="active" type="button" data-notification-filter="all">All</button><button type="button" data-notification-filter="messages">Messages</button><button type="button" data-notification-filter="scout_interest">Scout interest</button><button type="button" data-notification-filter="match_fact">Match Facts</button><button type="button" data-notification-filter="recruitment">Recruitment</button><button type="button" data-notification-filter="fixtures_events">Fixtures</button></div>
  <div><button class="btn primary small" type="button" data-refresh-notifications>Refresh</button></div>
</section>
<section class="notification-list" data-notification-list><div class="empty structured"><b>Loading notifications</b><span>Reading your Scout notifications from Supabase.</span></div></section>`,
        "settings": `<section class="hero"><div><small>Scout account</small><h2>Settings and usage controls.</h2><p>Manage the account, team permissions, notifications, security, plan and recruitment setup without a cluttered side menu.</p></div><div class="hero-actions"><button class="btn primary">Save changes</button></div></section><section class="metric-grid compact"><article class="metric accent"><small>Prediction usage</small><strong>Loading</strong><span>Reading live allowance</span></article><article class="metric"><small>Export usage</small><strong>Loading</strong><span>Reading live allowance</span></article><article class="metric"><small>Pipeline usage</small><strong>Loading</strong><span>Reading live allowance</span></article><article class="metric"><small>Reset date</small><strong>—</strong><span>Managed by the Scout plan</span></article></section>
<nav class="settings-tabs"><button class="active">Account</button><button>Appearance</button><button>Notifications</button><button>Team</button><button>Security</button><button>Plan</button></nav>
<section class="settings-layout">
<div>
<section class="panel"><header class="panel-head"><div><h3>Account details</h3></div></header><div class="panel-body"><div class="settings-row"><div><b>Name</b><span>Noah Patel</span></div><button class="btn small">Edit</button></div><div class="settings-row"><div><b>Scout ID</b><span>ESC001</span></div><button class="btn small">Copy</button></div><div class="settings-row"><div><b>Status</b><span>Reviewed scout</span></div><span class="pill green">Verified</span></div></div></section>
<section class="panel"><header class="panel-head"><div><h3>Scout setup</h3></div></header><div class="panel-body"><p class="body-copy">Configure team weaknesses, role expectations, long-term goals and search preferences.</p><button class="btn primary small">Open Scout Setup</button></div></section>
</div>
<div>
<section class="panel"><header class="panel-head"><div><h3>Team permissions</h3></div></header><div class="panel-body"><ul class="clean-list"><li>View remaining limits by feature</li><li>Track usage by scout and team</li><li>Request a limit increase</li><li>Keep an audit record of reports, predictions and decisions</li></ul></div></section>
<section class="panel"><header class="panel-head"><div><h3>Usage controls</h3></div></header><div class="panel-body"><div class="callout"><b>Current plan: Elite</b><span>High usage triggers a warning before a limit is reached. Existing reports and decisions remain available after a cap.</span></div><button class="btn small">Request limit review</button></div></section>
</div>
</section>`
    };
    var state = {
        route: '', players: [], byId: {}, overview: null, dashboardData: null, usage: null, usageBase: null, profile: null, profileDetail: null, fixtures: [], reports: [], activeComparison: null, teamMembers: [],
        search: { position: '', age: '', region: '', evidence: '', sort: 'Best match', page: 1 },
        ranking: { type: 'Top goalscorers', position: '', age: '', region: '' },
        prediction: { type: '', playerId: '', step: 1 },
        pipelineBridgeBound: false
    };
    function q(root, selector) { return (root || document).querySelector(selector); }
    function qa(root, selector) { return Array.from((root || document).querySelectorAll(selector)); }
    function esc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function num(value, fallback) { var n = Number(value); return Number.isFinite(n) ? n : (fallback == null ? 0 : fallback); }
    function score(value, fallback) { var n = num(value, fallback == null ? 50 : fallback); if (n > 0 && n <= 10)
        n *= 10; return Math.round(Math.max(0, Math.min(100, n))); }
    function money(value) { var n = num(value); if (!n)
        return 'Not assessed'; if (n >= 1000000)
        return '£' + (n / 1000000).toFixed(n % 1000000 ? 1 : 0) + 'm'; if (n >= 1000)
        return '£' + Math.round(n / 1000) + 'k'; return '£' + Math.round(n).toLocaleString('en-GB'); }
    function dateText(value) { if (!value)
        return 'Not set'; var d = new Date(value); return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
    function token() { return localStorage.getItem('sl_token') || ''; }
    function currentUser() { try {
        return JSON.parse(localStorage.getItem('sl_user') || '{}');
    }
    catch (_) {
        return {};
    } }
    function userName() { var u = currentUser(); return u.name || [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Noah Patel'; }
    function isPublicDemo() {
        return sessionStorage.getItem('sl_public_demo') === '1' ||
            token() === 'public-demo-session';
    }
    function isDemo() { var u = currentUser(); return isPublicDemo() || localStorage.getItem('sl_demo_mode') === '1' || !!(u.demoMode || u.demo_mode); }
    function apiBase() { return String(window.API || localStorage.getItem('sl_api_url') || API_FALLBACK).replace(/\/+$/, ''); }
    async function request(method, path, body) {
        var headers = { Accept: 'application/json' }, auth = token();
        if (auth)
            headers.Authorization = 'Bearer ' + auth;
        if (body !== undefined && body !== null)
            headers['Content-Type'] = 'application/json';
        var response = await fetch(apiBase() + path, { method: method, headers: headers, credentials: 'include', body: body == null ? undefined : JSON.stringify(body) });
        var payload = await response.json().catch(function () { return {}; });
        if (!response.ok)
            throw new Error(payload.error || payload.message || 'The request could not be completed.');
        return payload;
    }
    function routeId() {
        var declared = document.body.getAttribute('data-scout-route');
        if (declared)
            return declared;
        var map = { '/scout/dashboard': 'dashboard', '/scout/player-search': 'search', '/player/profile': 'profile', '/scout/pipeline': 'pipeline', '/scout/rankings': 'rankings', '/scout/fixtures': 'fixtures', '/scout/predictions': 'predictions', '/scout/exports': 'exports', '/scout/compare-players': 'compare', '/scout/setup': 'setup', '/scout/chat': 'chat', '/scout/notifications': 'notifications', '/scout/settings': 'settings' };
        return map[location.pathname.replace(/\/+$/, '').toLowerCase()] || '';
    }
    function waitForWorkspace(callback) { var attempts = 0; (function check() { attempts++; var app = document.getElementById('scoutExperienceApp'), content = app && q(app, '.content'); if (content) {
        callback(app, content);
        return;
    } if (attempts < 180)
        setTimeout(check, 50); })(); }
    function toast(message, error) {
        qa(document, '.slv6-toast').forEach(function (n) { n.remove(); });
        var node = document.createElement('div');
        node.className = 'slv6-toast' + (error ? ' error' : '');
        node.setAttribute('role', error ? 'alert' : 'status');
        node.textContent = message;
        document.body.appendChild(node);
        setTimeout(function () { node.remove(); }, 4200);
    }
    function modal(title, body, onReady, options) {
        options = options || {};
        var back = document.createElement('div');
        back.className = 'slv6-modal-backdrop';
        back.innerHTML = '<section class="slv6-modal workflow-modal ' + esc(options.className || '') + '" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><header><div><small>ScoutLink workflow</small><h2>' + esc(title) + '</h2></div><button class="btn" type="button" data-close-modal>Close</button></header><div class="slv6-modal-body">' + body + '</div></section>';
        document.body.appendChild(back);
        function close() { back.remove(); }
        back.addEventListener('click', function (e) { if (e.target === back || e.target.closest('[data-close-modal]'))
            close(); });
        function key(e) { if (e.key === 'Escape') {
            close();
            document.removeEventListener('keydown', key);
        } }
        document.addEventListener('keydown', key);
        if (onReady)
            onReady(back, close);
        return back;
    }
    function emptyUsage(plan) {
        return {
            plan: plan || 'Core',
            resetAt: null,
            predictions: { used: 0, limit: 0, remaining: 0, percent: 0 },
            exports: { used: 0, limit: 0, remaining: 0, percent: 0 },
            interests: { used: 0, limit: 0, remaining: 0, percent: 0 }
        };
    }
    function publicDemoBaseUsage() {
        return {
            plan: 'Elite demo',
            resetAt: null,
            predictions: { used: 0, limit: 900, remaining: 900, percent: 0 },
            exports: { used: 0, limit: 300, remaining: 300, percent: 0 },
            interests: { used: 0, limit: 300, remaining: 300, percent: 0 }
        };
    }
    function readDemoUsageDeltas() {
        try {
            return JSON.parse(sessionStorage.getItem(DEMO_USAGE_KEY) || '{}');
        }
        catch (_) {
            return {};
        }
    }
    function applyDemoUsageDeltas(baseUsage) {
        var base = baseUsage || publicDemoBaseUsage();
        var deltas = readDemoUsageDeltas();
        var result = {
            plan: base.plan || 'Elite demo',
            resetAt: base.resetAt || null,
            generatedAt: base.generatedAt || null
        };
        ['predictions', 'exports', 'interests'].forEach(function (key) {
            var row = base[key] || {};
            var limit = num(row.limit, 0);
            var baseUsed = num(row.used, 0);
            var delta = Math.max(0, num(deltas[key], 0));
            var used = Math.min(limit || Number.MAX_SAFE_INTEGER, baseUsed + delta);
            result[key] = {
                used: used,
                limit: limit,
                remaining: Math.max(0, limit - used),
                percent: limit ? Math.min(100, Math.round(used / limit * 100)) : 0
            };
        });
        return result;
    }
    function demoUsage(baseUsage) {
        return applyDemoUsageDeltas(baseUsage || publicDemoBaseUsage());
    }
    function incrementUsage(key) {
        if (!isPublicDemo()) {
            return;
        }
        var deltas = readDemoUsageDeltas();
        deltas[key] = Math.max(0, num(deltas[key], 0)) + 1;
        sessionStorage.setItem(DEMO_USAGE_KEY, JSON.stringify(deltas));
        state.usage = applyDemoUsageDeltas(state.usageBase || publicDemoBaseUsage());
        if (state.overview) {
            state.overview.usage = state.usage;
        }
    }
    async function loadUsage(force) {
        if (state.usage && !force) {
            return state.usage;
        }
        var path = isPublicDemo()
            ? '/api/scout-intelligence-v64/public-demo/usage'
            : '/api/scout-intelligence-v64/usage';
        try {
            var response = await request('GET', path);
            var base = response.usage || response.data || response;
            state.usageBase = base;
            state.usage = isPublicDemo() ? applyDemoUsageDeltas(base) : base;
        }
        catch (error) {
            if (!isPublicDemo()) {
                throw error;
            }
            state.usageBase = publicDemoBaseUsage();
            state.usage = applyDemoUsageDeltas(state.usageBase);
        }
        if (state.overview) {
            state.overview.usage = state.usage;
        }
        return state.usage;
    }
    async function refreshUsage(root) {
        state.usage = null;
        var usage = await loadUsage(true);
        if (state.overview) {
            state.overview.usage = usage;
        }
        if (root) {
            hydrateUsage(root, { usage: usage });
        }
        return usage;
    }
    function normalizePlayer(player, index) {
        const row = Object.assign({}, player || {});
        row.id = row.id || row.player_id || '';
        if (!row.first_name && !row.last_name && row.name) {
            const parts = String(row.name).trim().split(/\s+/);
            row.first_name = parts.shift() || '';
            row.last_name = parts.join(' ');
        }
        row.first_name = row.first_name || '';
        row.last_name = row.last_name || '';
        row.specific_position = String(row.specific_position ||
            row.primary_position ||
            (Array.isArray(row.positions) ? row.positions[0] : '') ||
            row.position_group ||
            '').toUpperCase();
        row.age_group = row.age_group || row.ageGroup || row.age_band || '';
        row.team = row.team || null;
        row.team_name = row.team_name || row.team?.team_name || row.club_name || row.club || '';
        row.region = row.region || row.team_city || row.city || row.location || row.team?.city || row.team?.county || '';
        row.team_website_url = row.team_website_url || row.team?.team_website_url || '';
        row.league_fulltime_url = row.league_fulltime_url || row.team?.league_fulltime_url || '';
        row.league_name = row.league_name || row.team?.league_name || '';
        row.overall_rating = score(row.overall_rating ?? row.overall ?? row.rating, 0);
        row.compatibilityScore = score(row.compatibilityScore ?? row.compatibility_score ?? row.compatibility ?? row.fit_score, 0);
        row.evidence_score = score(row.evidence_score ?? row.evidenceScore ?? row.dataConfidence?.score ?? row.confidence_score, 0);
        row.transfer_value = num(row.transfer_value ?? row.estimated_value ?? row.market_value ?? row.value, 0);
        row.appearances = num(row.appearances, 0);
        row.goals = num(row.goals, 0);
        row.assists = num(row.assists, 0);
        row.clean_sheets = num(row.clean_sheets ?? row.cleanSheets, 0);
        row.scout_interest_count = num(row.scout_interest_count ?? row.interest_count, 0);
        row.pipeline_stage = row.pipeline_stage || '';
        row.created_at = row.created_at || null;
        row.updated_at = row.updated_at || null;
        return row;
    }
    function playerName(p) { return [p && p.first_name, p && p.last_name].filter(Boolean).join(' ') || p && p.name || 'Player'; }
    function initials(p) { return [p && p.first_name, p && p.last_name].filter(Boolean).map(function (x) { return String(x).charAt(0); }).join('').slice(0, 2).toUpperCase() || 'PL'; }
    function position(p) { return p && p.specific_position || '—'; }
    function evidenceLabel(p) { var v = score(p && p.evidence_score); return v >= 80 ? 'High' : v >= 60 ? 'Medium' : v >= 40 ? 'Low' : 'Very low'; }
    function playerLine(p) { return [position(p), p && p.age_group, p && p.team_name].filter(Boolean).join(' · '); }
    function playerCell(player) {
        return '<div class="player-cell">' +
            '<span class="initials">' + esc(initials(player)) + '</span>' +
            '<div><b>' + esc(playerName(player)) + '</b>' +
            '<span>' + esc(player.team_name || 'Team not set') + '</span></div>' +
            '</div>';
    }
    async function loadPlayers(force) {
        if (state.players.length && !force)
            return state.players;
        let rows = [];
        let response = null;
        try {
            response = await request('GET', '/api/scout-intelligence-v64/players');
            rows = response.data || response.players || [];
        }
        catch (primaryError) {
            if (isDemo()) {
                const publicResponse = await request('GET', '/api/players/public-demo');
                rows = publicResponse.data || publicResponse.players || [];
            }
            else {
                throw primaryError;
            }
        }
        if (!rows.length) {
            throw new Error('No accessible players were returned from Supabase.');
        }
        state.players = rows.map(normalizePlayer).filter(function (player) {
            return Boolean(player.id);
        });
        state.byId = {};
        state.players.forEach(function (player) {
            state.byId[String(player.id)] = player;
        });
        return state.players;
    }
    async function loadOverview() {
        if (state.overview) {
            return state.overview;
        }
        var dashboard = null;
        var usage = null;
        var dashboardPath = isPublicDemo()
            ? '/api/scout-intelligence-v64/public-demo/dashboard'
            : '/api/scout-intelligence-v64/dashboard';
        try {
            dashboard = await request('GET', dashboardPath);
            state.dashboardData = dashboard;
            if (dashboard.usage) {
                state.usageBase = dashboard.usage;
                state.usage = isPublicDemo()
                    ? applyDemoUsageDeltas(dashboard.usage)
                    : dashboard.usage;
                dashboard.usage = state.usage;
                usage = state.usage;
            }
        }
        catch (error) {
            state.dashboardData = null;
        }
        if (!usage) {
            try {
                usage = await loadUsage();
            }
            catch (_) {
                usage = isPublicDemo() ? demoUsage() : emptyUsage('Unavailable');
                state.usage = usage;
            }
        }
        state.overview = {
            brief: dashboard && dashboard.brief || {},
            usage: usage,
            tasks: dashboard && (dashboard.nextActions || dashboard.tasks) || [],
            activity: dashboard && dashboard.activity || []
        };
        return state.overview;
    }
    function usageValue(usage, key, limit) { var row = usage && usage[key] || {}, max = num(row.limit, limit == null ? 0 : limit), used = num(row.used, Math.max(0, max - num(row.remaining, max))); return { used: used, limit: max, remaining: row.remaining == null ? Math.max(0, max - used) : num(row.remaining), percent: max ? Math.round(used / max * 100) : 0 }; }
    function mount(content) {
        content.innerHTML = '<div class="slv6-approved" data-slv6-route="' + esc(state.route) + '">' + templates[state.route] + '</div>';
        var root = q(content, '.slv6-approved'), title = (state.route === 'search' ? 'Player Search' : state.route.charAt(0).toUpperCase() + state.route.slice(1));
        var top = q(document, '#scoutExperienceApp .workspace-top h1'), mobile = q(document, '#scoutExperienceApp .mobile-top b'), app = document.getElementById('scoutExperienceApp');
        if (top)
            top.textContent = title;
        if (mobile)
            mobile.textContent = title;
        if (app) {
            app.classList.remove('scout-v6-booting', 'is-loading');
            app.classList.add('scout-v6-ready');
            app.removeAttribute('aria-busy');
        }
        return root;
    }
    function findButton(root, text) { return qa(root, 'button').find(function (b) { return b.textContent.trim().toLowerCase() === text.toLowerCase(); }); }
    function bindOpenButtons(root) { qa(root, 'button').forEach(function (btn) { if (['Open', 'Review', 'View player', 'Open profile'].includes(btn.textContent.trim()))
        btn.addEventListener('click', function () { var row = btn.closest('tr,.rank-widget,.top-fit-player,.selected-player,.shared-card'), id = row && row.dataset.playerId; if (id)
            location.href = '/player/profile?id=' + encodeURIComponent(id); }); }); }
    var LOCAL_KEYS = { pipeline: 'sl_scout_pipeline_v63', watches: 'sl_scout_watches_v63', comments: 'sl_scout_evidence_requests_v63', observations: 'sl_scout_observations_v63', decisions: 'sl_scout_decisions_v63', reports: 'sl_scout_reports_v63', shortlists: 'sl_scout_shortlists_v63', fixtures: 'sl_scout_fixture_plans_v63', comparisons: 'sl_scout_comparisons_v63', predictions: 'sl_scout_predictions_v63', searches: 'sl_scout_saved_searches_v63' };
    function localRows(key) { try {
        return JSON.parse(localStorage.getItem(LOCAL_KEYS[key]) || '[]');
    }
    catch (_) {
        return [];
    } }
    function saveLocalRows(key, rows) { localStorage.setItem(LOCAL_KEYS[key], JSON.stringify(rows)); }
    function addLocalRow(key, row) { var rows = localRows(key); rows.unshift(row); saveLocalRows(key, rows.slice(0, 100)); return row; }
    function pending(button, copy) { if (!button)
        return function () { }; var old = button.textContent; button.disabled = true; button.textContent = copy || 'Working…'; return function () { button.disabled = false; button.textContent = old; }; }
    function downloadBase64(filename, mime, content) { var binary = atob(content), bytes = new Uint8Array(binary.length); for (var i = 0; i < binary.length; i++)
        bytes[i] = binary.charCodeAt(i); var blob = new Blob([bytes], { type: mime || 'application/octet-stream' }), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = filename || 'scoutlink-report'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000); }
    function downloadCsv(filename, rows) { var text = rows.map(function (row) { return row.map(function (cell) { return '"' + String(cell == null ? '' : cell).replace(/"/g, '""') + '"'; }).join(','); }).join('\n'), blob = new Blob([text], { type: 'text/csv;charset=utf-8' }), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000); }
    function downloadBlob(filename, blob) { var url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000); }
    function pdfEscape(value) { return String(value == null ? '' : value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[^\x20-\x7E]/g, ' '); }
    function simplePdfBlob(lines) { var content = 'BT\n/F1 12 Tf\n50 790 Td\n'; (lines || []).slice(0, 34).forEach(function (line, index) { if (index)
        content += '0 -20 Td\n'; content += '(' + pdfEscape(line) + ') Tj\n'; }); content += 'ET'; var objects = []; objects[1] = '<< /Type /Catalog /Pages 2 0 R >>'; objects[2] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>'; objects[3] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>'; objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'; objects[5] = '<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream'; var pdf = '%PDF-1.4\n', offsets = [0]; for (var i = 1; i <= 5; i++) {
        offsets[i] = pdf.length;
        pdf += i + ' 0 obj\n' + objects[i] + '\nendobj\n';
    } var xref = pdf.length; pdf += 'xref\n0 6\n0000000000 65535 f \n'; for (var j = 1; j <= 5; j++)
        pdf += String(offsets[j]).padStart(10, '0') + ' 00000 n \n'; pdf += 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF'; return new Blob([pdf], { type: 'application/pdf' }); }
    function storedReportLines(p, source) { return ['ScoutLink ' + (source === 'comparison' ? 'Comparison' : 'Player Intelligence') + ' Report', '', 'Player: ' + playerName(p), 'Position: ' + position(p), 'Team: ' + p.team_name, 'Overall: ' + p.overall_rating + '/100', 'Compatibility: ' + p.compatibilityScore + '%', 'Evidence confidence: ' + evidenceLabel(p), 'Estimated value: ' + money(p.transfer_value), '', 'Decision-support output. Validate through football evidence.', 'Created: ' + new Date().toLocaleString('en-GB')]; }
    function downloadStoredReport(report, p) { var format = String(report.format || report.config && report.config.format || 'PDF').toUpperCase(), filename = report.file_name || playerName(p).replace(/\s+/g, '-').toLowerCase() + '-report.' + (format === 'EXCEL' ? 'csv' : 'pdf'); if (format === 'EXCEL') {
        downloadCsv(filename, [['Player', 'Position', 'Team', 'Overall', 'Compatibility'], [playerName(p), position(p), p.team_name, p.overall_rating, p.compatibilityScore]]);
    }
    else
        downloadBlob(filename, simplePdfBlob(report.contentLines || storedReportLines(p, report.source || 'profile'))); toast('Report downloaded.'); }
    function panelByTitle(root, title) { return qa(root, '.panel').find(function (panel) { var h = q(panel, '.panel-head h3'); return h && h.textContent.trim().toLowerCase() === title.toLowerCase(); }); }
    function playerOptionList(selected) { return state.players.map(function (p) { return '<option value="' + esc(p.id) + '"' + (String(p.id) === String(selected) ? ' selected' : '') + '>' + esc(playerName(p) + ' · ' + playerLine(p)) + '</option>'; }).join(''); }
    function playerDatalist(id) { return '<datalist id="' + esc(id) + '">' + state.players.map(function (p) { return '<option value="' + esc(playerName(p)) + '" data-id="' + esc(p.id) + '">' + esc(playerLine(p)) + '</option>'; }).join('') + '</datalist>'; }
    function playerByTypedName(value) { var text = String(value || '').trim().toLowerCase(); return state.players.find(function (p) { return playerName(p).toLowerCase() === text; }) || state.players.find(function (p) { return playerName(p).toLowerCase().indexOf(text) >= 0; }) || null; }
    function formField(label, control, full) { return '<label class="field ' + (full ? 'full' : '') + '"><span>' + esc(label) + '</span>' + control + '</label>'; }
    function actionFooter(label, attr) { return '<div class="workflow-footer"><button class="btn primary" type="button" ' + attr + '>' + esc(label) + '</button></div>'; }
    function workflowIntro(number, title, copy) { return '<article class="workflow-intro"><span>' + esc(number) + '</span><div><b>' + esc(title) + '</b><small>' + esc(copy) + '</small></div></article>'; }
    function demoPipeline() { return localRows('pipeline'); }
    function demoPipelineItem(playerId) { return demoPipeline().find(function (row) { return String(row.playerId) === String(playerId); }) || null; }
    function profileInPipeline(bundle) { return !!(bundle.pipelineStatus || bundle.pipeline || isPublicDemo() && demoPipelineItem(bundle.player.id)); }
    function setProfileInterestState(root, bundle) { var active = profileInPipeline(bundle); qa(root, 'button').forEach(function (btn) { var label = btn.textContent.trim().toLowerCase(); if (label === 'register interest' || label === 'interest registered') {
        btn.textContent = active ? 'Interest registered' : 'Register interest';
        btn.disabled = active;
        btn.classList.toggle('complete', active);
    } if (label === 'message coach') {
        btn.disabled = false;
        btn.title = active ? 'Message the authorised coach' : 'Register interest before messaging this player’s coach';
        btn.setAttribute('aria-describedby', 'messageCoachRequirement');
    } }); }
    async function registerInterest(root, bundle, button) { var p = bundle.player, done = pending(button, 'Registering…'), success = false; try {
        if (isPublicDemo()) {
            addLocalRow('pipeline', { id: 'demo-pipeline-' + Date.now(), playerId: p.id, playerName: playerName(p), stage: 'interested', createdAt: new Date().toISOString() });
            incrementUsage('interests');
            bundle.pipelineStatus = 'interested';
        }
        else {
            var response = await request('POST', '/api/players/' + encodeURIComponent(p.id) + '/scout-interest', { notes: 'Interest registered from the Scout Intelligence profile.', interestLevel: 7 });
            bundle.pipelineStatus = response.stage || 'interested';
        }
        success = true;
        await refreshUsage(root).catch(function () { });
        toast(playerName(p) + ' was added to the recruitment pipeline.');
    }
    catch (error) {
        toast(error.message, true);
    }
    finally {
        done();
        if (success)
            setProfileInterestState(root, bundle);
    } }
    function teamLinks(root, bundle) {
        var p = bundle.player, team = bundle.team || p.team || {}, website = team.team_website_url || p.team_website_url || '', league = team.league_fulltime_url || p.league_fulltime_url || '', leagueName = team.league_name || p.league_name || 'League page', fixtures = bundle.fixtures || bundle.upcomingFixtures || [];
        var body = '<div class="workflow-link-grid"><article><small>Team</small><h3>' + esc(team.team_name || p.team_name) + '</h3><p>External football information attached to this player record.</p></article>' +
            '<a class="workflow-link ' + (website ? '' : 'disabled') + '" ' + (website ? 'href="' + esc(website) + '" target="_blank" rel="noopener"' : 'aria-disabled="true"') + '><b>Team website</b><span>' + (website ? 'Open the official team website' : 'No team website has been added') + '</span></a>' +
            '<a class="workflow-link ' + (league ? '' : 'disabled') + '" ' + (league ? 'href="' + esc(league) + '" target="_blank" rel="noopener"' : 'aria-disabled="true"') + '><b>' + esc(leagueName) + '</b><span>' + (league ? 'Open league tables, fixtures and results' : 'No external league link has been added') + '</span></a>' +
            '<div class="workflow-link"><b>ScoutLink fixtures</b><span>' + fixtures.length + ' upcoming fixture' + (fixtures.length === 1 ? '' : 's') + ' attached to the profile</span><button class="btn small" type="button" data-view-profile-fixtures>View fixtures</button></div></div>';
        modal('Team and match links', body, function (m, close) { var b = q(m, '[data-view-profile-fixtures]'); if (b)
            b.onclick = function () { close(); var section = q(root, '#attributes') && q(root, '#attributes').nextElementSibling; if (section)
                section.scrollIntoView({ behavior: 'smooth' }); }; }, { className: 'wide' });
    }
    function showVideos(bundle) {
        var videos = bundle.videos || [];
        var body = videos.length ? '<div class="workflow-video-list">' + videos.map(function (v, i) { var url = v.video_url || v.url || v.file_url || ''; return '<article><div class="video-preview"><span>▶</span></div><div><small>' + esc(v.status || v.category || 'Video evidence') + '</small><b>' + esc(v.title || 'Player video ' + (i + 1)) + '</b><span>' + esc(v.description || dateText(v.created_at)) + '</span></div><button class="btn small" type="button" data-video-index="' + i + '" ' + (url ? '' : 'disabled title="No video file is attached"') + '>' + (url ? 'Open video' : 'Unavailable') + '</button></article>'; }).join('') + '</div>' : '<div class="empty structured"><b>No video evidence is available</b><span>Request approved video evidence from the coach.</span></div>';
        modal('Player video evidence', body, function (m) { qa(m, '[data-video-index]').forEach(function (btn) { btn.onclick = function () { var v = videos[num(btn.dataset.videoIndex)], url = v && (v.video_url || v.url || v.file_url); if (url)
            window.open(url, '_blank', 'noopener'); }; }); }, { className: 'wide' });
    }
    function showMatchFacts(bundle) { var facts = bundle.facts || bundle.recentMatches || []; var body = facts.length ? '<div class="table-wrap workflow-table"><table><thead><tr><th>Date</th><th>Opponent</th><th>Result</th><th>Position</th><th>Performance</th><th>Output</th></tr></thead><tbody>' + facts.map(function (f) { return '<tr><td>' + esc(dateText(f.match_date || f.created_at)) + '</td><td><b>' + esc(f.opponent_name || f.opponent || 'Opponent') + '</b></td><td>' + esc(f.result || f.match_result || 'Recorded') + '</td><td>' + esc(f.position_played || f.specific_position || position(bundle.player)) + '</td><td>' + esc(f.performance_score ? f.performance_score + '/100' : 'Not rated') + '</td><td>G ' + num(f.goals) + ' · A ' + num(f.assists) + (position(bundle.player) === 'GK' ? ' · CS ' + num(f.clean_sheets) : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="empty structured"><b>No Match Facts are available</b><span>Request recent football evidence from the coach.</span></div>'; modal('Match Facts for ' + playerName(bundle.player), body, null, { className: 'wide' }); }
    function requestEvidence(bundle) { var p = bundle.player; modal('Request more evidence', '<div class="workflow-step-grid">' + workflowIntro('1', 'Choose the evidence', 'Select what the next decision requires.') + workflowIntro('2', 'Explain the football reason', 'Make the request specific and actionable.') + workflowIntro('3', 'Send to the coach', 'The request is recorded against the player.') + '</div><div class="form-grid two">' + formField('Evidence type', '<select id="evidenceType"><option>Recent Match Facts</option><option>Approved match video</option><option>Position-specific clips</option><option>Coach observation</option><option>Physical profile update</option></select>') + formField('Priority', '<select id="evidencePriority"><option>Normal</option><option>High</option><option>Urgent</option></select>') + formField('Reason', '<textarea id="evidenceReason" placeholder="Explain what the evidence must confirm before the next recruitment decision."></textarea>', true) + formField('Needed by', '<input id="evidenceDue" type="date">') + '</div>' + actionFooter('Send evidence request', 'data-send-evidence'), function (m, close) { q(m, '[data-send-evidence]').onclick = async function () { var reason = q(m, '#evidenceReason').value.trim(); if (!reason)
        return toast('Add a reason for the evidence request.', true); var payload = { subjectType: 'player', subjectId: p.id, body: 'Evidence request — ' + q(m, '#evidenceType').value + ': ' + reason, visibility: 'team', mentions: [] }; try {
        if (isDemo())
            addLocalRow('comments', Object.assign({ id: 'demo-comment-' + Date.now(), playerId: p.id, priority: q(m, '#evidencePriority').value, dueAt: q(m, '#evidenceDue').value, createdAt: new Date().toISOString() }, payload));
        else
            await request('POST', '/api/scout-intelligence/comments', payload);
        close();
        toast('Evidence request sent for ' + playerName(p) + '.');
    }
    catch (error) {
        toast(error.message, true);
    } }; }, { className: 'wide' }); }
    function watchPlayer(bundle) { var p = bundle.player; modal('Watch meaningful player changes', '<p class="workflow-copy">Set the changes that should create a Scout Intelligence alert.</p><div class="form-grid two">' + formField('Reason', '<textarea id="watchReason" placeholder="What change would affect the recruitment decision?"></textarea>', true) + formField('Minimum overall rating', '<input id="watchOverall" type="number" min="0" max="100" value="80">') + formField('Minimum evidence score', '<input id="watchEvidence" type="number" min="0" max="100" value="70">') + '<label class="choice selected"><input id="watchProfile" type="checkbox" checked><span>Any major profile change</span></label><label class="choice selected"><input id="watchFacts" type="checkbox" checked><span>New Match Facts</span></label></div>' + actionFooter('Save player watch', 'data-save-watch'), function (m, close) { q(m, '[data-save-watch]').onclick = async function () { var payload = { playerId: p.id, reason: q(m, '#watchReason').value.trim() || 'Monitor meaningful player changes.', thresholds: { minOverall: num(q(m, '#watchOverall').value), minEvidence: num(q(m, '#watchEvidence').value), anyProfileUpdate: q(m, '#watchProfile').checked, newMatchFacts: q(m, '#watchFacts').checked } }; try {
        if (isDemo())
            addLocalRow('watches', Object.assign({ id: 'demo-watch-' + Date.now(), createdAt: new Date().toISOString() }, payload));
        else
            await request('POST', '/api/scout-intelligence/watches', payload);
        close();
        toast('Player watch saved.');
    }
    catch (error) {
        toast(error.message, true);
    } }; }); }
    function fixtureOptions(bundle) { return (bundle.fixtures || bundle.upcomingFixtures || []).map(function (f) { return '<option value="' + esc(f.id) + '">' + esc(dateText(f.fixture_date) + ' · ' + (f.opponent_name || f.opponent || 'Opponent') + ' · ' + (f.venue || f.venue_name || f.city || 'Venue TBC')) + '</option>'; }).join(''); }
    async function planFixture(bundle, fixture) { var p = bundle.player, fixtures = bundle.fixtures || bundle.upcomingFixtures || [], chosen = fixture || fixtures[0] || null; if (!chosen && !isDemo())
        return toast('No upcoming fixture is attached to this player.', true); if (!state.teamMembers.length && !isDemo()) {
        try {
            state.teamMembers = ((await request('GET', '/api/scout-intelligence-v64/team-members')).data || []);
        }
        catch (_) {
            state.teamMembers = [];
        }
    } var members = state.teamMembers.length ? state.teamMembers : [{ id: 'current', first_name: userName(), last_name: '' }], memberOptions = members.map(function (member) { return '<option value="' + esc(member.id) + '">' + esc([member.first_name, member.last_name].filter(Boolean).join(' ') || 'Current scout') + '</option>'; }).join(''); modal('Plan live-scouting visit', '<div class="visit-layout-v64"><aside class="workflow-step-grid vertical">' + workflowIntro('1', 'Choose the fixture', 'Select the game that can change the decision.') + workflowIntro('2', 'Define the objective', 'State the exact football question.') + workflowIntro('3', 'Assign and review', 'Choose a scout from this team and set priority.') + '</aside><section><div class="selected-fixture-v64"><small>Player</small><h3>' + esc(playerName(p)) + '</h3><p>' + esc(playerLine(p)) + '</p></div><div class="form-grid two">' + formField('Fixture', '<select id="fixtureChoice">' + fixtureOptions(bundle) + '</select>', true) + formField('What should the scout test?', '<textarea id="fixtureObjective" placeholder="Test recovery pace, scanning and decisions under pressure."></textarea>', true) + formField('Assigned scout', '<select id="fixtureScout">' + memberOptions + '</select>') + formField('Priority', '<select id="fixturePriority"><option value="90">High</option><option value="60" selected>Medium</option><option value="30">Low</option></select>') + formField('Preparation notes', '<textarea id="fixtureNotes" placeholder="Evidence to review before the match."></textarea>', true) + '</div></section></div>' + actionFooter('Save observation plan', 'data-save-fixture'), function (m, close) { if (chosen && q(m, '#fixtureChoice'))
        q(m, '#fixtureChoice').value = chosen.id; q(m, '[data-save-fixture]').onclick = async function () { var fixtureId = q(m, '#fixtureChoice') && q(m, '#fixtureChoice').value || chosen && chosen.id, objective = q(m, '#fixtureObjective').value.trim(); if (!fixtureId)
        return toast('Choose a fixture.', true); if (!objective)
        return toast('Add an observation objective.', true); var selectedScout = q(m, '#fixtureScout').value, payload = { fixtureId: fixtureId, playerId: p.id, assignedScoutId: selectedScout === 'current' ? null : selectedScout, priority: num(q(m, '#fixturePriority').value, 60), objective: objective, travelNotes: q(m, '#fixtureNotes').value, status: 'planned' }; try {
        if (isDemo())
            addLocalRow('fixtures', Object.assign({ id: 'demo-plan-' + Date.now(), createdAt: new Date().toISOString() }, payload));
        else
            await request('POST', '/api/scout-intelligence/fixture-plans', payload);
        var row = (state.fixtures || []).find(function (item) { return String(item.fixture.id) === String(fixtureId) && String(item.player && item.player.id) === String(p.id); });
        if (row)
            row.plan = Object.assign({ id: 'saved-plan-' + Date.now() }, payload);
        close();
        toast('Live-scouting plan saved and added to Fixtures.');
        var pageRoot = q(document, '#scoutExperienceApp .slv6-approved');
        if (pageRoot && state.route === 'fixtures') {
            renderFixtureCalendar(pageRoot, state.fixtures || [], new Date());
            renderFixtureLists(pageRoot, state.fixtures || []);
        }
    }
    catch (error) {
        toast(error.message, true);
    } }; }, { className: 'wide' }); }
    function addObservation(bundle, fixture) { var p = bundle.player; modal('Add live observation', '<div class="form-grid two">' + formField('Observation date', '<input id="observationDate" type="datetime-local">') + formField('Fixture', '<select id="observationFixture"><option value="">No linked fixture</option>' + fixtureOptions(bundle) + '</select>') + formField('Objective', '<textarea id="observationObjective" placeholder="What was the observation testing?"></textarea>', true) + formField('Technical notes', '<textarea id="technicalNotes"></textarea>', true) + formField('Tactical notes', '<textarea id="tacticalNotes"></textarea>', true) + formField('Physical notes', '<textarea id="physicalNotes"></textarea>', true) + formField('Mental notes', '<textarea id="mentalNotes"></textarea>', true) + formField('Recommendation', '<select id="observationRecommendation"><option>Prioritise</option><option>Shortlist</option><option>Monitor</option><option>Do not progress</option></select>') + formField('Follow-up action', '<input id="observationFollowUp" placeholder="Example: request another full match">') + '</div>' + actionFooter('Save observation', 'data-save-observation'), function (m, close) { if (fixture && q(m, '#observationFixture'))
        q(m, '#observationFixture').value = fixture.id; q(m, '[data-save-observation]').onclick = async function () { var payload = { playerId: p.id, fixtureId: q(m, '#observationFixture').value || null, observationDate: q(m, '#observationDate').value || new Date().toISOString(), objective: q(m, '#observationObjective').value, technicalNotes: q(m, '#technicalNotes').value, tacticalNotes: q(m, '#tacticalNotes').value, physicalNotes: q(m, '#physicalNotes').value, mentalNotes: q(m, '#mentalNotes').value, recommendation: q(m, '#observationRecommendation').value, followUpAction: q(m, '#observationFollowUp').value, structuredRatings: {} }; try {
        if (isDemo())
            addLocalRow('observations', Object.assign({ id: 'demo-observation-' + Date.now(), createdAt: new Date().toISOString() }, payload));
        else
            await request('POST', '/api/scout-intelligence/observations', payload);
        close();
        toast('Live observation saved.');
    }
    catch (error) {
        toast(error.message, true);
    } }; }, { className: 'wide' }); }
    function openDecisionWorkflow(p, context) { context = context || {}; modal('Record recruitment decision', '<div class="decision-modal-layout"><aside><small>Human decision</small><h3>' + esc(playerName(p)) + '</h3><p>Save the recommendation, football rationale and next action together.</p><ol><li>Choose the decision</li><li>Explain the evidence and trade-offs</li><li>Set the next action and review date</li></ol></aside><div class="form-grid two">' + formField('Decision', '<select id="decisionValue"><option>Prioritise</option><option>Shortlist</option><option>Trial before deciding</option><option>Monitor</option><option>Do not progress</option></select>') + formField('Primary reason', '<select id="decisionReason"><option value="team_fit">Team fit</option><option value="position_fit">Position fit</option><option value="evidence">Evidence confidence</option><option value="financial">Financial fit</option><option value="risk">Recruitment risk</option></select>') + formField('Decision rationale', '<textarea id="decisionRationale" placeholder="Explain the evidence, trade-offs and football judgement."></textarea>', true) + formField('Next action', '<input id="decisionNext" placeholder="Example: observe the next fixture">') + formField('Due date', '<input id="decisionDue" type="date">') + formField('Recruitment risk', '<select id="decisionRisk"><option>Low</option><option selected>Medium</option><option>High</option></select>') + '</div></div>' + actionFooter('Save decision', 'data-save-decision'), function (m, close) { q(m, '[data-save-decision]').onclick = async function () { var rationale = q(m, '#decisionRationale').value.trim(); if (!rationale)
        return toast('Add a decision rationale.', true); var payload = { playerId: p.id, comparisonId: context.comparisonId || null, pipelineId: context.pipelineId || null, decision: q(m, '#decisionValue').value, reasonCode: q(m, '#decisionReason').value, rationale: rationale, nextAction: q(m, '#decisionNext').value, dueAt: q(m, '#decisionDue').value || null, context: { source: context.source || 'profile', recruitmentRisk: q(m, '#decisionRisk').value } }; try {
        if (isDemo())
            addLocalRow('decisions', Object.assign({ id: 'demo-decision-' + Date.now(), createdAt: new Date().toISOString() }, payload));
        else
            await request('POST', '/api/scout-intelligence/decisions', payload);
        close();
        toast('Recruitment decision saved.');
    }
    catch (error) {
        toast(error.message, true);
    } }; }, { className: 'wide' }); }
    async function createReport(bundle, format, source) { var p = bundle.player, upper = String(format || 'PDF').toUpperCase(), predictionId = source === 'prediction' && (bundle.predictionLogId || bundle.logId) || null; if (isDemo() && token() === 'public-demo-session') {
        incrementUsage('exports');
        var row = addLocalRow('reports', { id: 'demo-report-' + Date.now(), report_type: source === 'prediction' ? 'prediction_export' : 'player_profile_export', subject_type: 'player', subject_id: p.id, title: 'ScoutLink export · ' + playerName(p), player: p, format: upper, source: source, file_name: playerName(p).replace(/\s+/g, '-').toLowerCase() + '-' + source + '.' + (upper === 'EXCEL' ? 'csv' : 'pdf'), contentLines: storedReportLines(p, source), created_at: new Date().toISOString() });
        downloadStoredReport(row, p);
        await refreshUsage().catch(function () { });
        toast('Export created and stored in Report history.');
        return row;
    } var exportResponse = await request('POST', '/api/exports/player', { playerId: p.id, format: upper, source: source, predictionLogId: predictionId }); if (exportResponse.contentBase64)
        downloadBase64(exportResponse.filename, exportResponse.mime, exportResponse.contentBase64); await refreshUsage().catch(function () { }); toast('Export created, stored in history and downloaded.'); return exportResponse; }
    function reportWorkflow(bundle, source, onDone) { var p = bundle.player, title = source === 'prediction' ? 'Export prediction' : 'Export player profile'; modal(title, '<div class="report-layout-v64"><section><div class="workflow-step-grid">' + workflowIntro('1', 'Choose format', 'PDF is a designed dossier. Excel is plain data.') + workflowIntro('2', 'Create export', 'One export is recorded against the team allowance.') + workflowIntro('3', 'Download', 'The file is available immediately and stored in history.') + '</div><section class="report-includes-v64"><h3>Complete export contents</h3><p>The player PDF includes identity, age group, every attribute, overall breakdown, compatibility intelligence, detailed verdict, evidence confidence, every recorded match, upcoming fixtures, video index, team links, export date and decision-support notice. Coach personal contact details are excluded.</p><ul><li>Full player and football profile</li><li>All ratings and attributes</li><li>Compatibility categories and detailed verdict</li><li>All Match Facts and upcoming fixtures</li><li>Prediction inputs, evidence and outcome when exporting a prediction</li></ul></section><div class="form-grid two">' + formField('Format', '<select id="reportFormat"><option>PDF</option><option>EXCEL</option></select>') + formField('Export type', '<input value="' + esc(source === 'prediction' ? 'Prediction export' : 'Player profile export') + '" readonly>') + '</div></section><aside class="report-summary-v64"><small>Player</small><h3>' + esc(playerName(p)) + '</h3><dl><div><dt>Overall</dt><dd>' + score(p.overall_rating) + '/100</dd></div><div><dt>Compatibility</dt><dd>' + score(p.compatibilityScore) + '/100</dd></div><div><dt>Evidence</dt><dd>' + esc(evidenceLabel(p)) + '</dd></div><div><dt>Usage</dt><dd>1 export</dd></div></dl></aside></div>' + actionFooter('Generate and download', 'data-generate-report'), function (m, close) { q(m, '[data-generate-report]').onclick = async function (e) { var done = pending(e.currentTarget, 'Generating…'); try {
        await createReport(bundle, q(m, '#reportFormat').value, source || 'profile');
        close();
        if (onDone)
            onDone();
    }
    catch (error) {
        toast(error.message, true);
    }
    finally {
        done();
    } }; }, { className: 'wide' }); }
    function addToShortlist(bundle) {
        var p = bundle.player;
        async function show(lists) { var options = (lists || []).map(function (list) { return '<option value="' + esc(list.id) + '">' + esc(list.name) + '</option>'; }).join(''); modal('Add to shared shortlist', '<div class="form-grid two">' + formField('Existing shortlist', '<select id="shortlistChoice"><option value="new">Create a new shortlist</option>' + options + '</select>') + formField('New shortlist name', '<input id="shortlistName" placeholder="Example: August live-scouting review">') + formField('Note', '<textarea id="shortlistNote" placeholder="Why is the player being added?"></textarea>', true) + '</div>' + actionFooter('Add player', 'data-add-shortlist'), function (m, close) { q(m, '[data-add-shortlist]').onclick = async function () { try {
            var id = q(m, '#shortlistChoice').value;
            if (isDemo()) {
                var rows = localRows('shortlists'), list = id === 'new' ? { id: 'demo-shortlist-' + Date.now(), name: q(m, '#shortlistName').value || 'Shared shortlist', players: [] } : rows.find(function (x) { return x.id === id; });
                if (!list)
                    return toast('Choose or name a shortlist.', true);
                list.players = list.players || [];
                list.players.push({ playerId: p.id, note: q(m, '#shortlistNote').value });
                if (id === 'new')
                    rows.unshift(list);
                saveLocalRows('shortlists', rows);
            }
            else {
                if (id === 'new') {
                    var created = await request('POST', '/api/scout-intelligence/shortlists', { name: q(m, '#shortlistName').value || 'Shared shortlist', description: 'Created from player intelligence', context: { source: 'profile' }, isShared: true });
                    id = created.shortlist.id;
                }
                await request('POST', '/api/scout-intelligence/shortlists/' + encodeURIComponent(id) + '/players', { playerId: p.id, note: q(m, '#shortlistNote').value });
            }
            close();
            toast(playerName(p) + ' was added to the shortlist.');
        }
        catch (error) {
            toast(error.message, true);
        } }; }); }
        if (isDemo())
            show(localRows('shortlists'));
        else
            request('GET', '/api/scout-intelligence/shortlists').then(function (r) { show(r.data || []); }).catch(function (error) { toast(error.message, true); });
    }
    function messageCoach(root, bundle) { if (!profileInPipeline(bundle)) {
        modal('Register interest before messaging', '<div class="permission-gate"><small>Pipeline permission required</small><h3>Add the player to the recruitment pipeline first</h3><p>Coach messaging only opens after a scout has registered a traceable recruitment interest.</p><button class="btn primary" type="button" data-register-before-message>Register interest</button></div>', function (m, close) { q(m, '[data-register-before-message]').onclick = async function (e) { await registerInterest(root, bundle, e.currentTarget); if (profileInPipeline(bundle)) {
            close();
            location.href = '/scout/chat?player=' + encodeURIComponent(bundle.player.id);
        } }; });
        return;
    } location.href = '/scout/chat?player=' + encodeURIComponent(bundle.player.id); }
    function predictionApiType(type) { return { 'Position fit': 'Position Fit Projection', 'Match scenario': 'Match Scenario Prediction', 'Development projection': 'Attribute Development', 'ROI and value': 'ROI Analysis' }[type] || type; }
    function predictionControls(type, p, prefix) { prefix = prefix || 'prediction'; var specific = ''; if (type === 'Position fit')
        specific = formField('Target position', '<select id="' + prefix + 'Specific"><option>GK</option><option>CB</option><option>RB</option><option>LB</option><option>CDM</option><option ' + (position(p) === 'CM' ? 'selected' : '') + '>CM</option><option>CAM</option><option>LW</option><option>RW</option><option>ST</option></select>');
    else if (type === 'Match scenario')
        specific = formField('Match scenario', '<select id="' + prefix + 'Specific"><option value="protect_lead">Protecting a one-goal lead</option><option value="chasing_game">Chasing the game</option><option value="high_press">High press</option><option value="low_block">Breaking a low block</option><option value="counter_attack">Counter-attacking</option></select>');
    else if (type === 'Development projection')
        specific = formField('Development focus', '<select id="' + prefix + 'Specific"><option>Balanced growth</option><option>Technical possession</option><option>Athletic transition</option><option>Defensive intelligence</option><option>Final-third output</option></select>');
    else
        specific = formField('Financial goal', '<select id="' + prefix + 'Specific"><option>Balanced value growth</option><option>Low-cost high ceiling</option><option>First-team contribution</option></select>'); return '<div class="selected-prediction-summary"><i>' + esc(type.split(' ').map(function (x) { return x[0]; }).join('').slice(0, 3).toUpperCase()) + '</i><div><b>' + esc(type) + '</b><span>' + esc(type === 'Position fit' ? 'Test a current, future or target role.' : type === 'Match scenario' ? 'Assess a defined tactical situation.' : type === 'Development projection' ? 'Model ratings and value over time.' : 'Review cost, growth and downside risk.') + '</span></div></div><div class="prediction-control-grid staged">' + specific + formField('Evidence rule', '<select id="' + prefix + 'Evidence"><option>Use current evidence</option><option>Require high evidence</option><option>Live observation required</option></select>') + formField('Decision purpose', '<select id="' + prefix + 'Purpose"><option>Recruitment review</option><option>Shortlist decision</option><option>Live-scouting preparation</option><option>Budget review</option></select>') + '<button class="btn primary" type="button" data-run-staged-prediction>Run ' + esc(type.toLowerCase()) + '</button></div>'; }
    function predictionInput(type, root, prefix) { var value = q(root, '#' + prefix + 'Specific').value, input = { evidenceRule: q(root, '#' + prefix + 'Evidence').value, decisionPurpose: q(root, '#' + prefix + 'Purpose').value }; if (type === 'Position fit')
        input.targetPosition = value;
    else if (type === 'Match scenario')
        input.scenarioKey = value;
    else if (type === 'Development projection')
        input.focus = value;
    else
        input.financialGoal = value; return input; }
    function demoPrediction(p, type, input) { var base = score(p.overall_rating), fit = type === 'Position fit' ? (input.targetPosition === position(p) ? base : Math.max(45, base - 12)) : type === 'Match scenario' ? Math.round((score(p.pace, base) + score(p.stamina, base) + score(p.composure, base)) / 3) : type === 'Development projection' ? Math.min(96, base + 7) : Math.round(p.compatibilityScore); return { type: predictionApiType(type), recommendation: fit >= 78 ? 'Strong decision-support signal' : fit >= 64 ? 'Proceed with defined safeguards' : 'More evidence required', summary: type + ' completed using the current player evidence and selected football context.', score: fit, targetScore: fit, scenarioScore: fit, confidence: { label: evidenceLabel(p) } }; }
    async function runPredictionFor(player, type, input) {
        if (isPublicDemo()) {
            incrementUsage('predictions');
            var demoResult = demoPrediction(player, type, input);
            await refreshUsage().catch(function () { });
            return demoResult;
        }
        const response = await request('POST', '/api/predictions/run', {
            playerId: player.id,
            predictionType: predictionApiType(type),
            inputParams: input
        });
        await refreshUsage().catch(function () { });
        return response.result || response;
    }
    function predictionResultMarkup(result, p, type) { var value = result.targetScore || result.scenarioScore || result.score || result.projectedOverall || p.overall_rating; return '<section class="prediction-result-card"><div><small>' + esc(type) + '</small><h3>' + esc(result.recommendation || result.verdict || 'Prediction complete') + '</h3><p>' + esc(result.summary || 'The selected prediction has completed.') + '</p><span class="pill green">Confidence ' + esc(result.confidence && result.confidence.label || evidenceLabel(p)) + '</span></div><div class="prediction-result-metrics"><article><small>Player</small><b>' + esc(playerName(p)) + '</b></article><article><small>Prediction score</small><b>' + esc(value) + '/100</b></article><article><small>Current role</small><b>' + esc(position(p)) + '</b></article><article><small>Next action</small><b>Validate with football evidence</b></article></div></section>'; }
    function hydrateUsage(root, overview) {
        var usage = state.usage || overview && overview.usage || emptyUsage('Unavailable');
        var predictions = usageValue(usage, 'predictions', 0);
        var exports = usageValue(usage, 'exports', 0);
        var interests = usageValue(usage, 'interests', 0);
        var rows = qa(root, '.usage-row'), values = [predictions, exports, interests];
        rows.slice(0, 3).forEach(function (row, index) {
            var value = values[index], spans = qa(row, 'span'), bar = q(row, '.bar i'), strong = q(row, 'strong');
            if (spans[0])
                spans[0].textContent = value.used + ' of ' + value.limit + ' used';
            if (bar)
                bar.style.width = value.percent + '%';
            if (strong)
                strong.textContent = value.remaining + ' left';
        });
        qa(root, '.metric-grid .metric').forEach(function (metric) {
            var label = (q(metric, 'small') || {}).textContent || '', strong = q(metric, 'strong'), copy = q(metric, 'span');
            if (/prediction/i.test(label)) {
                if (strong)
                    strong.textContent = predictions.used + ' / ' + predictions.limit;
                if (copy)
                    copy.textContent = predictions.remaining + ' remaining';
            }
            else if (/export/i.test(label)) {
                if (strong)
                    strong.textContent = exports.used + ' / ' + exports.limit;
                if (copy)
                    copy.textContent = exports.remaining + ' remaining';
            }
            else if (/pipeline/i.test(label)) {
                if (strong)
                    strong.textContent = interests.used + ' / ' + interests.limit;
                if (copy)
                    copy.textContent = interests.remaining + ' places remaining';
            }
            else if (/current plan/i.test(label)) {
                if (strong)
                    strong.textContent = usage.plan || 'Core';
                if (copy)
                    copy.textContent = predictions.percent + '% of prediction allowance used';
            }
            else if (/reset date/i.test(label) && usage.resetAt) {
                if (strong)
                    strong.textContent = dateText(usage.resetAt);
            }
        });
        var badge = q(root, '.usage-badge');
        if (badge)
            badge.textContent = predictions.remaining + ' of ' + predictions.limit + ' prediction credits remaining';
    }
    async function hydrateDashboard(root, overview) {
        var data = state.dashboardData || null;
        if (!data) {
            try {
                data = await request('GET', isPublicDemo()
                    ? '/api/scout-intelligence-v64/public-demo/dashboard'
                    : '/api/scout-intelligence-v64/dashboard');
            }
            catch (_) {
                data = null;
            }
        }
        if (!data) {
            var fallbackTop = state.players.slice().sort(function (a, b) { return b.compatibilityScore - a.compatibilityScore; })[0];
            data = {
                dashboardUnavailable: true,
                playerCount: state.players.length,
                activePipelineCount: 0,
                usage: state.usage || overview && overview.usage || (isPublicDemo() ? demoUsage() : emptyUsage('Unavailable')),
                teamNeeds: [],
                nextActions: [{
                    kind: 'load_error',
                    priority: 100,
                    title: 'Live dashboard actions could not load',
                    body: 'ScoutLink could not verify the current pipeline actions. Reload the page rather than relying on a default recommendation.',
                    actionLabel: 'Reload dashboard',
                    actionUrl: '/scout/dashboard'
                }],
                topFit: fallbackTop ? {
                    player: fallbackTop,
                    score: fallbackTop.compatibilityScore,
                    reason: 'Highest current compatibility in the loaded player dataset.'
                } : null
            };
        }
        state.dashboardData = data;
        state.usageBase = data.usage || state.usageBase || emptyUsage('Unavailable');
        state.usage = isPublicDemo() ? applyDemoUsageDeltas(state.usageBase) : state.usageBase;
        data.usage = state.usage;
        state.overview = Object.assign({}, overview || {}, { usage: state.usage });
        var count = q(root, '[data-dashboard-player-count]');
        if (count)
            count.textContent = data.playerCount;
        var scope = q(root, '[data-dashboard-player-scope]');
        if (scope)
            scope.textContent = isDemo() ? 'Fictional demo players only' : 'Real players only';
        var actions = data.nextActions || [];
        if ((!actions.length || actions.every(function (action) { return action.kind === 'explore'; })) && num(data.activePipelineCount) > 0) {
            actions = [{ kind: 'pipeline_review', priority: 20, title: 'Review the active recruitment pipeline', body: num(data.activePipelineCount) + ' active player interests need a confirmed next decision step.', actionLabel: 'Open pipeline', actionUrl: '/scout/pipeline' }];
        }
        var meaningful = actions.filter(function (action) { return action.kind !== 'explore'; });
        var actionCount = q(root, '[data-dashboard-action-count]');
        if (actionCount)
            actionCount.textContent = meaningful.length;
        var pipelineUsed = data.activePipelineCount != null
            ? num(data.activePipelineCount)
            : data.usage && data.usage.interests && data.usage.interests.used || 0,
            pipelineCount = q(root, '[data-dashboard-pipeline-count]');
        if (pipelineCount)
            pipelineCount.textContent = pipelineUsed;
        var plan = q(root, '[data-dashboard-plan]');
        if (plan)
            plan.textContent = data.usage && data.usage.plan || 'Core';
        var planCopy = q(root, '[data-dashboard-plan-copy]'), predictionUsage = data.usage && data.usage.predictions;
        if (planCopy && predictionUsage)
            planCopy.textContent = predictionUsage.used + ' of ' + predictionUsage.limit + ' predictions used';
        var topFive = state.players.slice().sort(function (a, b) { return b.compatibilityScore - a.compatibilityScore; }).slice(0, 5), tbody = q(root, '[data-dashboard-compatible]');
        if (tbody)
            tbody.innerHTML = topFive.length ? topFive.map(function (p) { return '<tr data-player-id="' + esc(p.id) + '"><td>' + playerCell(p) + '</td><td><b>' + score(p.compatibilityScore) + '%</b></td><td><span class="pill ' + (evidenceLabel(p) === 'High' ? 'blue' : '') + '">' + esc(evidenceLabel(p)) + '</span></td><td><b>' + score(p.overall_rating) + '</b></td><td><button class="btn small primary" type="button" data-open-compatible>Open</button></td></tr>'; }).join('') : '<tr><td colspan="5">No players are currently available.</td></tr>';
        qa(root, '[data-open-compatible]').forEach(function (button) { button.onclick = function () { var row = button.closest('[data-player-id]'); location.href = '/player/profile?id=' + encodeURIComponent(row.dataset.playerId); }; });
        var all = q(root, '[data-view-all-compatible]'), review = findButton(root, 'Review top matches');
        if (all)
            all.onclick = function () { location.href = '/scout/player-search'; };
        if (review)
            review.onclick = function () { location.href = '/scout/player-search?sort=compatibility'; };
        var actionBody = q(root, '[data-dashboard-actions]');
        if (actionBody)
            actionBody.innerHTML = actions.map(function (action) { return '<article class="decision"><div><b>' + esc(action.title) + '</b><span>' + esc(action.body) + '</span></div><a class="btn small ' + (action.priority >= 80 ? 'primary' : '') + '" href="' + esc(action.actionUrl || '/scout/player-search') + '">' + esc(action.actionLabel || 'Open') + '</a></article>'; }).join('');
        var needs = q(root, '[data-dashboard-needs]'), needRows = data.teamNeeds || [];
        if (needs) {
            if (needRows.length) {
                needs.innerHTML = ['weaknesses', 'roles', 'goals', 'positions', 'ages'].map(function (type) {
                    var rows = needRows.filter(function (row) { return row.type === type; });
                    if (!rows.length)
                        return '';
                    var label = { weaknesses: 'Team weaknesses', roles: 'Role expectations', goals: 'Long-term goals', positions: 'Preferred positions', ages: 'Age groups' }[type];
                    return '<section class="need-group-v64"><h4>' + label + '</h4>' + rows.map(function (row) {
                        var width = Math.min(100, Math.max(5, num(row.relevantPlayers) * 10));
                        return '<div class="coverage"><b>' + esc(row.need) + '</b><span>' + num(row.relevantPlayers) + ' matching player' + (num(row.relevantPlayers) === 1 ? '' : 's') + '</span><div class="bar"><i style="width:' + width + '%"></i></div></div>';
                    }).join('') + '</section>';
                }).join('');
            }
            else if (data.dashboardUnavailable) {
                needs.innerHTML = '<div class="empty structured"><b>Live team needs could not load</b><span>Reload the dashboard to read the saved Scout Setup and matching-player counts.</span></div>';
            }
            else {
                needs.innerHTML = '<div class="empty structured"><b>No team needs saved</b><span>Complete Scout Setup to show each saved need and matching-player count.</span></div>';
            }
        }
        var usage = q(root, '[data-dashboard-usage]');
        if (usage) {
            var keys = [['predictions', 'Predictions'], ['exports', 'Exports'], ['interests', 'Pipeline interests']];
            usage.innerHTML = keys.map(function (item) { var row = data.usage && data.usage[item[0]] || { used: 0, limit: 0, remaining: 0 }, pct = row.limit ? Math.round(row.used / row.limit * 100) : 0; return '<div class="usage-row"><div><b>' + item[1] + '</b><span>' + row.used + ' of ' + row.limit + ' used</span></div><div class="bar"><i style="width:' + pct + '%"></i></div><strong>' + row.remaining + ' left</strong></div>'; }).join('') + '<div class="usage-explainer"><b>One ' + esc(data.usage && data.usage.scope === 'team' ? 'team' : 'Scout') + ' allowance source</b><span>The Dashboard, Predictions, Exports and Usage Requests pages read these exact totals.</span></div>';
        }
        var fit = q(root, '[data-dashboard-top-fit]');
        if (fit) {
            if (data.topFit && data.topFit.player) {
                var p = normalizePlayer(data.topFit.player, 0);
                fit.innerHTML = '<div class="top-fit-player" data-player-id="' + esc(p.id) + '"><span class="initials">' + initials(p) + '</span><div><small>Highest current recommendation</small><b>' + esc(playerName(p)) + '</b><span>' + esc(playerLine(p)) + '</span></div><strong>' + score(data.topFit.score) + '%</strong></div><div class="fit-reason"><b>Why this player leads</b><span>' + esc(data.topFit.reason) + '</span></div><div class="top-fit-actions"><button class="btn small primary" type="button" data-open-top-fit>Open profile</button><button class="btn small" type="button" data-compare-top-fit>Compare</button></div>';
                q(fit, '[data-open-top-fit]').onclick = function () { location.href = '/player/profile?id=' + encodeURIComponent(p.id); };
                q(fit, '[data-compare-top-fit]').onclick = function () { location.href = '/scout/compare-players?player=' + encodeURIComponent(p.id); };
            }
            else
                fit.innerHTML = '<div class="empty structured"><b>No player fit is available</b><span>Add a real player or open a demo experience.</span></div>';
        }
        var priority = q(root, '[data-dashboard-priority]'), priorityAction = actions.find(function (action) { return action.kind === 'upcoming_fixture'; });
        if (priority)
            priority.innerHTML = priorityAction ? '<div class="fixture-summary"><b>' + esc(priorityAction.title) + '</b><span>' + esc(priorityAction.body) + '</span><p>Open the fixture plan to define the live evidence objective.</p><a class="btn small primary" href="' + esc(priorityAction.actionUrl) + '">' + esc(priorityAction.actionLabel || 'Plan visit') + '</a></div>' : '<div class="empty structured"><b>No live-scouting priority</b><span>Upcoming fixtures for pipeline players will appear here.</span></div>';
        var next = findButton(root, 'View next actions');
        if (next)
            next.onclick = function () { q(root, '[data-dashboard-actions]').scrollIntoView({ behavior: 'smooth' }); };
        var setup = findButton(root, 'Edit setup');
        if (setup)
            setup.onclick = function () { location.href = '/scout/setup'; };
        var requests = q(root, '[data-open-usage-requests]');
        if (requests)
            requests.onclick = function () { location.href = '/scout/usage-requests'; };
    }
    function hydrateProfile(root, bundle) {
        const player = bundle.player;
        const analysis = bundle.analysis || localAnalysis(player);
        const facts = bundle.facts || [];
        const videos = bundle.videos || [];
        const fixtures = bundle.fixtures || [];
        const overall = analysis.overallBreakdown || {};
        const compatibilityParts = analysis.compatibility || {};
        const evidence = bundle.evidence || {
            score: player.evidence_score,
            label: evidenceLabel(player)
        };
        const compatibility = score(player.compatibilityScore || analysis.compatibilityScore, 0);
        const readiness = score(overall.currentReadiness || overall.finalScore || player.overall_rating, 0);
        const potential = score(overall.potentialRating || player.potential_rating || player.overall_rating, 0);
        const evidenceScore = score(evidence.score || player.evidence_score, facts.length >= 10 ? 90 : facts.length >= 5 ? 72 : facts.length ? 48 : 32);
        const evidenceName = evidence.label || evidenceLabel(player);
        root.dataset.playerId = player.id;
        const avatar = q(root, '.profile-main > .initials');
        const name = q(root, '.profile-main h2');
        const line = q(root, '.profile-main p');
        if (avatar)
            avatar.textContent = initials(player);
        if (name)
            name.textContent = playerName(player);
        if (line)
            line.textContent = [playerLine(player), player.region].filter(Boolean).join(' · ');
        const tags = q(root, '.profile-tags');
        if (tags) {
            tags.innerHTML = [
                '<span class="pill green">Overall ' + score(player.overall_rating) + '/100</span>',
                '<span class="pill">' + esc(player.foot || 'Foot not set') + ' foot</span>',
                '<span class="pill blue">Evidence ' + esc(evidenceName) + '</span>',
                '<span class="pill">Compatibility ' + compatibility + '/100</span>',
                '<span class="pill">Estimated value ' + esc(money(player.transfer_value)) + '</span>'
            ].join('');
        }
        const metricValues = [
            score(player.overall_rating) + '/100',
            readiness + '/100',
            potential + '/100',
            evidenceName,
            facts.length + ' matches',
            money(player.transfer_value)
        ];
        qa(root, '.profile-metrics .metric strong').forEach(function (node, index) {
            node.textContent = metricValues[index] || '—';
        });
        const ratingMap = {
            final: score(overall.finalScore || player.overall_rating),
            readiness: readiness,
            potential: potential,
            confidence: evidenceName
        };
        const finalNode = q(root, '[data-rating-final]');
        const readinessNode = q(root, '[data-rating-readiness]');
        const potentialNode = q(root, '[data-rating-potential]');
        const confidenceNode = q(root, '[data-rating-confidence]');
        if (finalNode)
            finalNode.textContent = ratingMap.final + '/100';
        if (readinessNode)
            readinessNode.textContent = ratingMap.readiness + '/100';
        if (potentialNode)
            potentialNode.textContent = ratingMap.potential + '/100';
        if (confidenceNode)
            confidenceNode.textContent = ratingMap.confidence;
        const averages = {
            technical: Math.round((score(player.passing) + score(player.dribbling) + score(player.shooting) + score(player.crossing)) / 4),
            tactical: Math.round((score(player.vision) + score(player.positioning) + score(player.composure) + score(player.defending)) / 4),
            physical: Math.round((score(player.pace) + score(player.agility) + score(player.strength) + score(player.stamina) + score(player.jumping)) / 5),
            mental: Math.round((score(player.composure) + score(player.positioning) + score(player.vision)) / 3),
            matchOutput: score(overall.matchOutputScore || overall.matchOutput || player.overall_rating),
            discipline: Math.max(0, 100 - num(player.yellow_cards) * 5 - num(player.red_cards) * 20),
            availability: score(overall.availabilityScore || overall.availability || 80),
            confidence: evidenceScore
        };
        qa(root, '[data-rating-key]').forEach(function (row) {
            const value = score(averages[row.dataset.ratingKey], 0);
            const bar = q(row, '.bar i');
            const numberNode = q(row, 'b');
            if (bar)
                bar.style.width = value + '%';
            if (numberNode)
                numberNode.textContent = value;
        });
        const positionRatings = analysis.positionRatings || {};
        const sortedRoles = positionRatings.sorted || [];
        const currentRole = sortedRoles[0] || null;
        const futureRole = sortedRoles[1] || null;
        const currentRoleNode = q(root, '[data-current-role]');
        const futureRoleNode = q(root, '[data-future-role]');
        const roleScoreNode = q(root, '[data-role-score]');
        if (currentRoleNode)
            currentRoleNode.textContent = currentRole?.position || currentRole?.role || position(player) || 'Not run';
        if (futureRoleNode)
            futureRoleNode.textContent = futureRole?.position || futureRole?.role || 'Run position fit';
        if (roleScoreNode)
            roleScoreNode.textContent = currentRole?.score ? score(currentRole.score) + '/100' : 'Run position fit';
        const compatibilityValues = [
            compatibilityParts.needFit,
            compatibilityParts.roleFit,
            compatibilityParts.tacticalStyleFit,
            compatibilityParts.formationPositionFit,
            compatibilityParts.developmentPathwayFit,
            evidenceScore,
            compatibilityParts.financialFit
        ];
        qa(root, '.compat-card').forEach(function (card, index) {
            const value = score(compatibilityValues[index], compatibility);
            const numberNode = q(card, 'b');
            const bar = q(card, '.bar i');
            if (numberNode)
                numberNode.textContent = value;
            if (bar)
                bar.style.width = value + '%';
        });
        const compatibilityHeading = q(root, '.compatibility-headline h4');
        const compatibilityCopy = q(root, '[data-compatibility-copy]');
        if (compatibilityHeading) {
            compatibilityHeading.textContent = compatibility + '% · ' + (compatibility >= 82 ? 'Strong fit' :
                compatibility >= 70 ? 'Developing fit' :
                    'Limited current fit');
        }
        if (compatibilityCopy) {
            compatibilityCopy.textContent = 'The score combines the saved team need, role, tactical style, formation, development pathway, evidence and financial context.';
        }
        const attributeKeys = [
            'pace', 'agility', 'strength', 'stamina', 'jumping',
            'composure', 'shooting', 'passing', 'dribbling', 'defending',
            'crossing', 'vision', 'positioning', 'heading', 'tackling'
        ];
        const ranked = attributeKeys.map(function (key) {
            return { key: key, value: score(player[key], 0) };
        }).sort(function (a, b) { return b.value - a.value; });
        const strengths = ranked.slice(0, 3);
        const gaps = ranked.slice(-2).reverse();
        let verdictLabel = 'Do not progress yet';
        if (compatibility >= 82 && readiness >= 72)
            verdictLabel = 'Prioritise';
        else if (compatibility >= 70 || potential >= 78)
            verdictLabel = 'Monitor closely';
        const verdictParagraph = playerName(player) + ' is assessed as ' + verdictLabel.toLowerCase() +
            ' for the current recruitment brief. Compatibility is ' + compatibility + '/100, current readiness is ' +
            readiness + '/100 and potential is ' + potential + '/100. The assessment uses ' + facts.length +
            ' recorded Match Facts with ' + String(evidenceName).toLowerCase() + ' evidence confidence. The strongest current signals are ' +
            strengths.map(function (item) { return item.key.replace(/_/g, ' ') + ' ' + item.value + '/100'; }).join(', ') +
            '. The live review should test ' + gaps.map(function (item) { return item.key.replace(/_/g, ' '); }).join(' and ') +
            ' because new football evidence in those areas could change the recommendation.';
        const verdictTitle = q(root, '.decision-verdict-card h3');
        const verdictScore = q(root, '.decision-verdict-card .verdict-title-row .pill');
        const verdictCopy = q(root, '.decision-verdict-card > p');
        if (verdictTitle)
            verdictTitle.textContent = verdictLabel;
        if (verdictScore)
            verdictScore.textContent = compatibility + '% compatibility';
        if (verdictCopy)
            verdictCopy.textContent = verdictParagraph;
        const badges = q(root, '[data-decision-badges]');
        if (badges) {
            badges.innerHTML = '<span class="pill green">' + esc(strengths[0]?.key.replace(/_/g, ' ') || 'Current strength') + '</span>' +
                '<span class="pill blue">Evidence ' + esc(evidenceName) + '</span>' +
                '<span class="pill">' + esc(gaps[0]?.key.replace(/_/g, ' ') || 'Live validation') + ' needs proof</span>';
        }
        const reasons = q(root, '[data-decision-reasons]');
        if (reasons) {
            reasons.innerHTML = [
                'Compatibility is ' + compatibility + '/100 against the current saved recruitment brief.',
                'Current readiness is ' + readiness + '/100 and potential is ' + potential + '/100.',
                facts.length + ' Match Facts and ' + videos.length + ' approved video record' + (videos.length === 1 ? '' : 's') + ' are available.'
            ].map(function (reason) { return '<li>' + esc(reason) + '</li>'; }).join('');
        }
        const risk = q(root, '[data-decision-risk]');
        const action = q(root, '[data-decision-action]');
        if (risk)
            risk.textContent = 'The clearest remaining evidence gaps are ' + gaps.map(function (item) { return item.key.replace(/_/g, ' '); }).join(' and ') + '. Validate them under live pressure before progressing.';
        if (action)
            action.textContent = fixtures.length ? 'Plan the next recorded fixture with a focused observation objective, then update the pipeline decision.' : 'Request the next fixture or additional evidence, then update the pipeline decision.';
        qa(root, '[data-attribute]').forEach(function (row) {
            const value = score(player[row.dataset.attribute], 0);
            const numberNode = q(row, 'b');
            const bar = q(row, '.bar i');
            if (numberNode)
                numberNode.textContent = value;
            if (bar)
                bar.style.width = value + '%';
        });
        const statValues = [
            num(player.appearances), num(player.goals), num(player.assists),
            num(player.clean_sheets), num(player.yellow_cards), num(player.red_cards)
        ];
        qa(root, '#attributes .stat-grid > div b').forEach(function (node, index) {
            node.textContent = String(statValues[index] || 0);
        });
        const outputContext = q(root, '[data-output-context]');
        if (outputContext) {
            outputContext.textContent = num(player.goals) + ' goals and ' + num(player.assists) + ' assists across ' + num(player.appearances) + ' recorded appearances.';
        }
        const physicalProfile = q(root, '[data-physical-profile]');
        const physicalRange = q(root, '[data-physical-range]');
        const physicalAge = q(root, '[data-physical-age]');
        const physicalFoot = q(root, '[data-physical-foot]');
        const physicalPosition = q(root, '[data-physical-position]');
        const physicalAvailability = q(root, '[data-physical-availability]');
        if (physicalProfile)
            physicalProfile.textContent = [player.height_category, player.build_category].filter(Boolean).map(function (item) { return String(item).replace(/_/g, ' '); }).join(' · ') || 'Not recorded';
        if (physicalRange)
            physicalRange.textContent = [player.height_range_cm, player.weight_range_kg].filter(Boolean).join(' · ') || 'No exact range recorded';
        if (physicalAge)
            physicalAge.textContent = player.age_group || '—';
        if (physicalFoot)
            physicalFoot.textContent = player.foot || '—';
        if (physicalPosition)
            physicalPosition.textContent = player.position_group || position(player) || '—';
        if (physicalAvailability)
            physicalAvailability.textContent = averages.availability + '/100';
        const evidenceScoreNode = q(root, '[data-evidence-score]');
        const evidenceLabelNode = q(root, '[data-evidence-label]');
        const evidenceCopy = q(root, '[data-evidence-copy]');
        const evidenceBars = q(root, '[data-evidence-bars]');
        const missingEvidence = q(root, '[data-missing-evidence]');
        if (evidenceScoreNode)
            evidenceScoreNode.textContent = evidenceScore + '/100';
        if (evidenceLabelNode)
            evidenceLabelNode.textContent = evidenceName;
        if (evidenceCopy)
            evidenceCopy.textContent = 'The confidence score uses recorded Match Facts, approved videos, evidence recency and the completeness of the current player profile.';
        if (evidenceBars) {
            const evidenceRows = [
                { label: 'Recorded matches', value: Math.min(100, facts.length * 10), copy: facts.length + ' available' },
                { label: 'Approved video', value: Math.min(100, videos.length * 34), copy: videos.length + ' available' },
                { label: 'Profile completeness', value: Math.round(attributeKeys.filter(function (key) { return player[key] !== null && player[key] !== undefined; }).length / attributeKeys.length * 100), copy: 'Current attributes' },
                { label: 'Evidence confidence', value: evidenceScore, copy: evidenceName }
            ];
            evidenceBars.innerHTML = evidenceRows.map(function (row) {
                return '<div class="evidence-row"><div><b>' + esc(row.label) + '</b><span>' + esc(row.copy) + '</span></div><div class="bar"><i style="width:' + row.value + '%"></i></div><strong>' + row.value + '%</strong></div>';
            }).join('');
        }
        if (missingEvidence)
            missingEvidence.textContent = gaps.map(function (item) { return item.key.replace(/_/g, ' '); }).join(', ') + ' under live pressure, plus any missing recent Match Facts or approved video.';
        const videoPanel = panelByTitle(root, 'Video evidence');
        if (videoPanel) {
            const body = q(videoPanel, '.panel-body');
            body.innerHTML = (videos.length
                ? videos.slice(0, 6).map(function (video, index) {
                    const url = video.video_url || video.url || video.file_url;
                    return '<article class="video-evidence-card" data-video-index="' + index + '"><div class="video-preview"><span>▶</span></div><div><small>' + esc(video.status || video.category || 'Video evidence') + '</small><b>' + esc(video.title || 'Player video') + '</b><span>' + esc(video.description || dateText(video.created_at)) + '</span></div><button class="btn small" type="button" ' + (url ? '' : 'disabled title="No video file is attached"') + '>' + (url ? 'Watch' : 'Unavailable') + '</button></article>';
                }).join('')
                : '<div class="empty structured"><b>No approved video evidence</b><span>Request additional football evidence from the coach.</span></div>') +
                '<div class="video-actions"><button class="btn primary" type="button">Watch all videos</button><button class="btn" type="button">Request more evidence</button></div>';
        }
        const valueNode = q(root, '.value-analysis-head strong');
        const affordability = q(root, '[data-affordability]');
        const valueRisk = q(root, '[data-value-risk]');
        const valuePosition = q(root, '[data-value-position]');
        const valueFactors = q(root, '[data-value-factors]');
        if (valueNode)
            valueNode.textContent = money(player.transfer_value);
        if (affordability)
            affordability.textContent = player.transfer_value ? 'Review ' + money(player.transfer_value) + ' against the Scout team budget' : 'No value recorded';
        if (valueRisk)
            valueRisk.textContent = evidenceScore >= 75 ? 'Evidence-supported estimate' : 'Evidence-sensitive estimate';
        if (valuePosition)
            valuePosition.textContent = player.position_group || position(player) || '—';
        if (valueFactors) {
            valueFactors.innerHTML = [
                ['Current quality', 'Overall rating ' + score(player.overall_rating) + '/100'],
                ['Potential runway', 'Potential rating ' + potential + '/100'],
                ['Compatibility', compatibility + '/100 against the saved brief'],
                ['Evidence confidence', evidenceScore + '/100 from current records'],
                ['Match output', num(player.goals) + ' goals and ' + num(player.assists) + ' assists']
            ].map(function (factor) { return '<div class="factor-row"><b>' + esc(factor[0]) + '</b><span>' + esc(factor[1]) + '</span></div>'; }).join('');
        }
        const factsPanel = panelByTitle(root, 'Last 5 match facts');
        if (factsPanel) {
            const body = q(factsPanel, '.panel-body');
            body.innerHTML = facts.length
                ? facts.slice(0, 5).map(function (fact) {
                    return '<article class="match-evidence-row"><div><b>' + esc(fact.opponent_name || fact.opponent || 'Opponent') + '</b><span>' + esc(dateText(fact.match_date || fact.created_at)) + ' · G ' + num(fact.goals) + ' · A ' + num(fact.assists) + '</span></div><button class="btn small" type="button">Open Match Facts</button></article>';
                }).join('')
                : '<div class="empty structured"><b>No recent Match Facts</b><span>Request evidence before making a recruitment decision.</span></div>';
        }
        const fixturesPanel = panelByTitle(root, 'Upcoming fixtures');
        if (fixturesPanel) {
            const body = q(fixturesPanel, '.panel-body');
            body.innerHTML = fixtures.length
                ? fixtures.slice(0, 5).map(function (fixture, index) {
                    const date = new Date(fixture.fixture_date);
                    return '<article class="profile-fixture-card" data-fixture-id="' + esc(fixture.id) + '"><div class="fixture-date"><b>' + (Number.isNaN(date.getTime()) ? '—' : date.getDate()) + '</b><span>' + (Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-GB', { month: 'short' })) + '</span></div><div><small>' + (index === 0 ? 'Next live-scouting opportunity' : 'Upcoming fixture') + '</small><b>' + esc((player.team_name || 'Player team') + ' vs ' + (fixture.opponent_name || fixture.opponent || 'Opponent')) + '</b><span>' + esc([fixture.fixture_time, fixture.venue || fixture.venue_name || fixture.city].filter(Boolean).join(' · ') || 'Venue TBC') + '</span></div><button class="btn ' + (index === 0 ? 'primary ' : '') + 'small" type="button">' + (index === 0 ? 'Plan visit' : 'Open fixture') + '</button></article>';
                }).join('')
                : '<div class="empty structured"><b>No upcoming fixtures</b><span>The coach has not added an upcoming team fixture.</span></div>';
        }
        const metrics = q(root, '.profile-metrics');
        const rating = q(root, '#ratingBreakdown');
        const compatibilityPanel = q(root, '#compatibility');
        const decision = q(root, '#decisionSummary');
        const attributes = q(root, '#attributes');
        let anchor = metrics;
        [rating, compatibilityPanel, decision, attributes].forEach(function (node) {
            if (node && anchor) {
                anchor.insertAdjacentElement('afterend', node);
                anchor = node;
            }
        });
        const predictionHeading = q(root, '#predictionControls .panel-head h3');
        if (predictionHeading)
            predictionHeading.textContent = 'What prediction do you want to run on ' + playerName(player) + '?';
        setProfileInterestState(root, bundle);
        bindProfile(root, bundle);
    }
    function localAnalysis(p) { var overall = p.overall_rating, comp = p.compatibilityScore; return { overallBreakdown: { currentReadiness: Math.max(45, overall - 1), potentialRating: Math.min(96, overall + 7) }, compatibility: { needFit: Math.min(100, comp + 10), roleFit: Math.max(45, comp - 8), tacticalStyleFit: Math.min(100, comp + 9), formationPositionFit: Math.max(45, comp - 4), developmentPathwayFit: Math.max(45, comp - 6), financialFit: Math.max(40, comp - 28) } }; }
    async function loadProfile() {
        const id = new URLSearchParams(location.search).get('id');
        if (!id)
            throw new Error('A player ID is required to open a profile.');
        const responses = await Promise.all([
            request('GET', '/api/scout-intelligence/players/' + encodeURIComponent(id)).catch(function () { return null; }),
            request('GET', '/api/players/' + encodeURIComponent(id)).catch(function () { return null; })
        ]);
        const intelligence = responses[0];
        const detail = responses[1];
        if (!intelligence && !detail) {
            throw new Error('The selected player could not be loaded from Supabase.');
        }
        const base = intelligence || { player: detail.player };
        if (detail) {
            base.player = detail.player || base.player;
            base.team = detail.team || base.player?.team || null;
            base.facts = detail.recentMatches || base.facts || [];
            base.videos = detail.videos || base.videos || [];
            base.fixtures = detail.upcomingFixtures || base.fixtures || [];
            base.pipelineStatus = detail.pipelineStatus || base.pipelineStatus || null;
        }
        base.player = normalizePlayer(base.player, 0);
        return base;
    }
    function predictionTypeApi(label) { return { 'Position fit': 'Position Fit Projection', 'Match scenario': 'Match Scenario Prediction', 'Development projection': 'Attribute Development', 'ROI and value': 'ROI Analysis' }[label] || label; }
    async function runPrediction(root, p, type) {
        var apiType = predictionTypeApi(type), selects = qa(root, '#predictionControls select'), input = {};
        if (apiType === 'Position Fit Projection')
            input.targetPosition = selects[1] && selects[1].value || position(p);
        if (apiType === 'Match Scenario Prediction')
            input.scenarioKey = selects[2] && selects[2].value || 'protect_lead';
        if (apiType === 'Attribute Development')
            input.focus = selects[3] && selects[3].value || 'Balanced growth';
        var result;
        if (isPublicDemo()) {
            incrementUsage('predictions');
            result = { type: apiType, summary: apiType === 'Position Fit Projection' ? (input.targetPosition + ' fit scores ' + Math.max(45, p.overall_rating - 8) + '/100.') : 'Prediction completed from the current demo evidence.', recommendation: 'Validate the result through live observation.', confidence: { label: evidenceLabel(p) } };
        }
        else {
            var response = await request('POST', '/api/predictions/run', { playerId: p.id, predictionType: apiType, inputParams: input });
            result = response.result || response;
        }
        var preview = q(root, '.prediction-result-preview');
        if (preview)
            preview.innerHTML = '<article><small>Player</small><b>' + esc(playerName(p)) + '</b></article><article><small>Prediction</small><b>' + esc(type) + '</b></article><article><small>Result</small><b>' + esc(result.recommendation || 'Completed') + '</b></article><article><small>Confidence</small><b>' + esc(result.confidence && result.confidence.label || evidenceLabel(p)) + '</b></article>';
        toast('Prediction completed.');
    }
    function bindProfile(root, bundle) { var p = bundle.player, selectedType = ''; function choose(type, scroll) { selectedType = type; state.prediction.type = type; qa(root, '.prediction-type').forEach(function (x) { x.classList.toggle('selected', x.dataset.prediction === type); }); var label = q(root, '.selected-prediction-label'); if (label)
        label.textContent = type; var stage = q(root, '[data-profile-prediction-stage]'); if (stage) {
        stage.innerHTML = predictionControls(type, p, 'profilePrediction');
        var run = q(stage, '[data-run-staged-prediction]');
        if (run)
            run.onclick = async function () { var done = pending(run, 'Running…'); try {
                var result = await runPredictionFor(p, type, predictionInput(type, stage, 'profilePrediction')), box = q(root, '[data-profile-prediction-result]');
                box.hidden = false;
                box.innerHTML = predictionResultMarkup(result, p, type) + '<div class="runner-actions"><button class="btn" type="button" data-export-prediction>Export prediction</button><button class="btn primary" type="button" data-decide-prediction>Record decision</button></div>';
                var exportButton = q(box, '[data-export-prediction]');
                if (exportButton)
                    exportButton.onclick = function () { reportWorkflow(Object.assign({}, bundle, { predictionLogId: result.logId || result.id }), 'prediction'); };
                var decisionButton = q(box, '[data-decide-prediction]');
                if (decisionButton)
                    decisionButton.onclick = function () { openDecision(p, { source: 'prediction' }); };
                toast(type + ' completed.');
            }
            catch (error) {
                toast(error.message, true);
            }
            finally {
                done();
            } };
    } if (scroll)
        q(root, '#predictionControls').scrollIntoView({ behavior: 'smooth', block: 'start' }); } qa(root, '.prediction-type').forEach(function (btn) { btn.onclick = function () { choose(btn.dataset.prediction, true); }; }); qa(root, 'button').forEach(function (btn) { var label = btn.textContent.trim(); if (label === 'Register interest')
        btn.onclick = function () { registerInterest(root, bundle, btn); };
    else if (label === 'Compare')
        btn.onclick = function () { location.href = '/scout/compare-players?player=' + encodeURIComponent(p.id); };
    else if (label === 'Export profile')
        btn.onclick = function () { reportWorkflow(bundle, 'profile'); };
    else if (label === 'Team and matches')
        btn.onclick = function () { teamLinks(root, bundle); };
    else if (label === 'Watch all videos' || label === 'Watch videos')
        btn.onclick = function () { showVideos(bundle); };
    else if (label === 'Request more evidence')
        btn.onclick = function () { requestEvidence(bundle); };
    else if (label === 'Open Match Facts')
        btn.onclick = function () { showMatchFacts(bundle); };
    else if (label === 'Watch player')
        btn.onclick = function () { watchPlayer(bundle); };
    else if (label === 'Add observation')
        btn.onclick = function () { addObservation(bundle); };
    else if (label === 'Record decision')
        btn.onclick = function () { openDecision(p, { source: 'profile' }); };
    else if (label === 'Add to shortlist')
        btn.onclick = function () { addToShortlist(bundle); };
    else if (label === 'Message coach')
        btn.onclick = function () { messageCoach(root, bundle); };
    else if (label === 'Plan visit' || label === 'Plan fixture' || label === 'Open fixture') {
        btn.onclick = function () { var card = btn.closest('[data-fixture-id]'), fixture = (bundle.fixtures || []).find(function (f) { return card && String(f.id) === String(card.dataset.fixtureId); }); planFixture(bundle, fixture); };
    }
    else if (label === 'Run position fit')
        btn.onclick = function () { choose('Position fit', true); };
    else if (label === 'Run ROI and value')
        btn.onclick = function () { choose('ROI and value', true); };
    else if (label === 'Edit Scout Setup')
        btn.onclick = function () { location.href = '/scout/setup'; }; }); qa(root, '.video-evidence-card').forEach(function (card) { card.onclick = function () { var v = (bundle.videos || [])[num(card.dataset.videoIndex)], url = v && (v.video_url || v.url || v.file_url); if (url)
        window.open(url, '_blank', 'noopener');
    else
        showVideos(bundle); }; }); }
    function openDecision(p, context) { return openDecisionWorkflow(p, context); }
    function bindSearch(root) {
        const positionSelect = q(root, '[data-search-position]');
        const ageSelect = q(root, '[data-search-age]');
        const regionSelect = q(root, '[data-search-region]');
        const evidenceSelect = q(root, '[data-search-evidence]');
        const sortSelect = q(root, '[data-search-sort]');
        const clearButton = q(root, '[data-clear-search]');
        const tbody = q(root, '[data-search-results]');
        const summary = q(root, '[data-search-summary]');
        const pagination = q(root, '[data-search-pagination]');
        const query = new URLSearchParams(location.search);
        state.search.position = query.get('position') || '';
        state.search.age = query.get('age') || '';
        state.search.region = query.get('region') || '';
        state.search.evidence = query.get('evidence') || '';
        state.search.sort = query.get('sort') || 'Best match';
        state.search.page = Math.max(1, num(query.get('page'), 1));
        function setSelect(select, value, emptyLabel) {
            if (!select)
                return;
            const match = Array.from(select.options).find(function (option) {
                return option.value === value || option.textContent === value;
            });
            select.value = match ? match.value : emptyLabel;
        }
        setSelect(positionSelect, state.search.position, 'All positions');
        setSelect(ageSelect, state.search.age, 'All ages');
        setSelect(regionSelect, state.search.region, 'All regions');
        setSelect(evidenceSelect, state.search.evidence, 'Any evidence');
        setSelect(sortSelect, state.search.sort, 'Best match');
        function filteredPlayers() {
            let rows = state.players.slice();
            if (state.search.position) {
                rows = rows.filter(function (player) {
                    const positions = [position(player)].concat(player.positions || []).map(function (item) {
                        return String(item || '').toUpperCase();
                    });
                    return positions.includes(state.search.position.toUpperCase());
                });
            }
            if (state.search.age) {
                rows = rows.filter(function (player) {
                    return String(player.age_group || '').toUpperCase() === state.search.age.toUpperCase();
                });
            }
            if (state.search.region) {
                rows = rows.filter(function (player) {
                    return String(player.region || '').toLowerCase() === state.search.region.toLowerCase();
                });
            }
            if (state.search.evidence) {
                rows = rows.filter(function (player) {
                    return evidenceLabel(player) === state.search.evidence;
                });
            }
            const sorters = {
                'Best match': function (a, b) { return num(b.compatibilityScore) - num(a.compatibilityScore); },
                'Newest players': function (a, b) { return new Date(b.created_at || 0) - new Date(a.created_at || 0); },
                'Highest evidence': function (a, b) { return num(b.evidence_score) - num(a.evidence_score); },
                'Highest rating': function (a, b) { return num(b.overall_rating) - num(a.overall_rating); },
                'Lowest value': function (a, b) { return num(a.transfer_value) - num(b.transfer_value); }
            };
            rows.sort(sorters[state.search.sort] || sorters['Best match']);
            return rows;
        }
        function updateUrl() {
            const params = new URLSearchParams();
            if (state.search.position)
                params.set('position', state.search.position);
            if (state.search.age)
                params.set('age', state.search.age);
            if (state.search.region)
                params.set('region', state.search.region);
            if (state.search.evidence)
                params.set('evidence', state.search.evidence);
            if (state.search.sort !== 'Best match')
                params.set('sort', state.search.sort);
            if (state.search.page > 1)
                params.set('page', state.search.page);
            const next = location.pathname + (params.toString() ? '?' + params.toString() : '');
            history.replaceState(null, '', next);
        }
        function renderPagination(total, pageCount) {
            if (!pagination)
                return;
            if (pageCount <= 1) {
                pagination.innerHTML = '';
                return;
            }
            const buttons = [];
            buttons.push('<button class="btn small" type="button" data-page="' + (state.search.page - 1) + '"' + (state.search.page === 1 ? ' disabled' : '') + '>Previous</button>');
            for (let page = 1; page <= pageCount; page += 1) {
                if (page === 1 || page === pageCount || Math.abs(page - state.search.page) <= 2) {
                    buttons.push('<button class="btn small ' + (page === state.search.page ? 'primary' : '') + '" type="button" data-page="' + page + '" aria-current="' + (page === state.search.page ? 'page' : 'false') + '">' + page + '</button>');
                }
                else if (buttons[buttons.length - 1] !== '<span class="pagination-gap">…</span>') {
                    buttons.push('<span class="pagination-gap">…</span>');
                }
            }
            buttons.push('<button class="btn small" type="button" data-page="' + (state.search.page + 1) + '"' + (state.search.page === pageCount ? ' disabled' : '') + '>Next</button>');
            pagination.innerHTML = buttons.join('');
            qa(pagination, '[data-page]').forEach(function (button) {
                button.onclick = function () {
                    state.search.page = num(button.dataset.page, 1);
                    render();
                    q(root, '.search-workbench').scrollIntoView({ behavior: 'smooth', block: 'start' });
                };
            });
        }
        function render() {
            const rows = filteredPlayers();
            const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
            state.search.page = Math.min(state.search.page, pageCount);
            const start = (state.search.page - 1) * PAGE_SIZE;
            const pageRows = rows.slice(start, start + PAGE_SIZE);
            if (summary) {
                const first = rows.length ? start + 1 : 0;
                const last = Math.min(start + PAGE_SIZE, rows.length);
                summary.textContent = 'Showing ' + first + '–' + last + ' of ' + rows.length + ' accessible players.';
            }
            if (tbody) {
                tbody.innerHTML = pageRows.length
                    ? pageRows.map(function (player) {
                        return '<tr data-player-id="' + esc(player.id) + '">' +
                            '<td>' + playerCell(player) + '</td>' +
                            '<td>' + esc(position(player) || '—') + ' · ' + esc(player.age_group || '—') + '</td>' +
                            '<td class="optional">' + esc(player.region || 'Not set') + '</td>' +
                            '<td><b>' + (player.compatibilityScore ? score(player.compatibilityScore) + '%' : '—') + '</b></td>' +
                            '<td><span class="pill ' + (evidenceLabel(player) === 'High' ? 'blue' : '') + '">' + esc(evidenceLabel(player)) + '</span></td>' +
                            '<td class="optional">' + esc(money(player.transfer_value)) + '</td>' +
                            '<td class="optional">' + esc(dateText(player.created_at)) + '</td>' +
                            '<td><button class="btn small primary" type="button" data-open-player>Open</button></td>' +
                            '</tr>';
                    }).join('')
                    : '<tr><td colspan="8"><div class="empty structured"><b>No players match these filters</b><span>Clear one or more filters to return to the full Supabase dataset.</span></div></td></tr>';
            }
            qa(tbody, '[data-open-player]').forEach(function (button) {
                button.onclick = function () {
                    const row = button.closest('[data-player-id]');
                    location.href = '/player/profile?id=' + encodeURIComponent(row.dataset.playerId);
                };
            });
            renderPagination(rows.length, pageCount);
            updateUrl();
        }
        function syncState() {
            state.search.position = positionSelect.value === 'All positions' ? '' : positionSelect.value;
            state.search.age = ageSelect.value === 'All ages' ? '' : ageSelect.value;
            state.search.region = regionSelect.value === 'All regions' ? '' : regionSelect.value;
            state.search.evidence = evidenceSelect.value === 'Any evidence' ? '' : evidenceSelect.value;
            state.search.sort = sortSelect.value;
            state.search.page = 1;
            render();
        }
        [positionSelect, ageSelect, regionSelect, evidenceSelect, sortSelect].forEach(function (select) {
            if (select)
                select.onchange = syncState;
        });
        if (clearButton) {
            clearButton.onclick = function () {
                positionSelect.value = 'All positions';
                ageSelect.value = 'All ages';
                regionSelect.value = 'All regions';
                evidenceSelect.value = 'Any evidence';
                sortSelect.value = 'Best match';
                syncState();
            };
        }
        render();
    }
    function rankingValue(p, type) { var apps = Math.max(1, num(p.appearances)); if (type === 'Top goalscorers')
        return num(p.goals); if (type === 'Goals per game')
        return num(p.goals) / apps; if (type === 'Top assists')
        return num(p.assists); if (type === 'Assists per game')
        return num(p.assists) / apps; if (type === 'Most clean sheets')
        return num(p.clean_sheets); if (type === 'Clean sheets per game')
        return num(p.clean_sheets) / apps; if (type === 'Most sought after')
        return num(p.scout_interest_count); if (type === 'Current readiness')
        return Math.max(0, p.overall_rating - 1); if (type === 'Development potential')
        return Math.min(100, p.overall_rating + 7); if (type === 'Evidence confidence')
        return p.evidence_score; if (type === 'Financial value')
        return p.transfer_value; return p.compatibilityScore; }
    function rankingReasonText(p, type) { var apps = Math.max(1, num(p.appearances)); if (type === 'Goals per game')
        return (num(p.goals) / apps).toFixed(2) + ' goals per appearance from ' + apps + ' appearances.'; if (type === 'Assists per game')
        return (num(p.assists) / apps).toFixed(2) + ' assists per appearance from ' + apps + ' appearances.'; if (type === 'Clean sheets per game')
        return (num(p.clean_sheets) / apps).toFixed(2) + ' clean sheets per appearance from ' + apps + ' appearances.'; if (type === 'Top goalscorers')
        return p.goals + ' recorded goals.'; if (type === 'Top assists')
        return p.assists + ' recorded assists.'; if (type === 'Most clean sheets')
        return p.clean_sheets + ' recorded clean sheets.'; if (type === 'Most sought after')
        return p.scout_interest_count + ' active scout-interest signals.'; if (type === 'Financial value')
        return 'Estimated current value ' + money(p.transfer_value) + '.'; return 'Strong current ' + type.toLowerCase() + ' signal supported by ' + evidenceLabel(p).toLowerCase() + ' evidence.'; }
    function renderRankings(root) {
        const type = state.ranking.type;
        const perGame = /per game/i.test(type);
        const rows = state.players
            .filter(function (player) {
            return (!state.ranking.position || position(player) === state.ranking.position) &&
                (!state.ranking.age || player.age_group === state.ranking.age) &&
                (!state.ranking.region || player.region === state.ranking.region) &&
                (!/clean sheet/i.test(type) || position(player) === 'GK' || player.position_group === 'Defender');
        })
            .sort(function (a, b) {
            return rankingValue(b, type) - rankingValue(a, type);
        })
            .slice(0, 50);
        const label = {
            'Top goalscorers': 'Goals',
            'Goals per game': 'Goals per game',
            'Top assists': 'Assists',
            'Assists per game': 'Assists per game',
            'Most clean sheets': 'Clean sheets',
            'Clean sheets per game': 'Clean sheets per game',
            'Most sought after': 'Scout interest',
            'Overall rating': 'Overall rating',
            'Current readiness': 'Readiness',
            'Development potential': 'Potential',
            'Evidence confidence': 'Evidence score',
            'Financial value': 'Estimated value',
            'Team fit': 'Team-fit score'
        }[type] || 'Ranking score';
        const heading = q(root, '[data-ranking-heading]');
        const metric = q(root, '[data-ranking-metric]');
        const summary = q(root, '[data-ranking-summary]');
        const podium = q(root, '[data-ranking-podium]');
        const tbody = q(root, '[data-ranking-results]');
        heading.textContent = type;
        metric.textContent = label;
        summary.textContent = rows.length + ' players ranked from the accessible Supabase dataset.';
        podium.innerHTML = rows.slice(0, 3).map(function (player, index) {
            const raw = rankingValue(player, type);
            const shown = type === 'Financial value' ? money(raw) : perGame ? raw.toFixed(2) : Math.round(raw * 10) / 10;
            return '<article class="rank-widget" data-player-id="' + esc(player.id) + '">' +
                '<span>#' + (index + 1) + '</span><span class="initials">' + esc(initials(player)) + '</span>' +
                '<div><b>' + esc(playerName(player)) + '</b><small>' + esc(playerLine(player)) + '</small></div>' +
                '<strong>' + esc(shown) + '</strong></article>';
        }).join('');
        tbody.innerHTML = rows.length
            ? rows.map(function (player, index) {
                const raw = rankingValue(player, type);
                const value = type === 'Financial value' ? money(raw) : perGame ? raw.toFixed(2) : Math.round(raw * 10) / 10;
                return '<tr data-player-id="' + esc(player.id) + '"><td><b>#' + (index + 1) + '</b></td><td>' + playerCell(player) + '</td><td><b>' + esc(value) + '</b></td><td>' + esc(rankingReasonText(player, type)) + '</td><td><button class="btn small primary" type="button" data-open-ranked-player>Open</button></td></tr>';
            }).join('')
            : '<tr><td colspan="5"><div class="empty structured"><b>No players match this ranking</b><span>Change the filters to rank another part of the Supabase dataset.</span></div></td></tr>';
        qa(root, '[data-open-ranked-player]').forEach(function (button) {
            button.onclick = function () {
                const row = button.closest('[data-player-id]');
                location.href = '/player/profile?id=' + encodeURIComponent(row.dataset.playerId);
            };
        });
        qa(podium, '[data-player-id]').forEach(function (card) {
            card.onclick = function () {
                location.href = '/player/profile?id=' + encodeURIComponent(card.dataset.playerId);
            };
        });
    }
    function bindRankings(root) {
        const typeSelect = q(root, '[data-ranking-type]');
        const positionSelect = q(root, '[data-ranking-position]');
        const ageSelect = q(root, '[data-ranking-age]');
        const regionSelect = q(root, '[data-ranking-region]');
        const updateButton = q(root, '[data-update-ranking]');
        typeSelect.value = state.ranking.type;
        function update() {
            state.ranking.type = typeSelect.value;
            state.ranking.position = positionSelect.value === 'All positions' ? '' : positionSelect.value;
            state.ranking.age = ageSelect.value === 'All ages' ? '' : ageSelect.value;
            state.ranking.region = regionSelect.value === 'All regions' ? '' : regionSelect.value;
            renderRankings(root);
        }
        [typeSelect, positionSelect, ageSelect, regionSelect].forEach(function (select) {
            select.onchange = update;
        });
        updateButton.onclick = update;
        renderRankings(root);
    }
    async function loadPredictionHistory(root) {
        let rows = [];
        try {
            const response = await request('GET', '/api/scouts/predictions');
            rows = response.data || [];
        }
        catch (error) {
            toast(error.message || 'Prediction history could not be loaded.', true);
        }
        state.predictionHistory = rows;
        const panel = panelByTitle(root, 'Prediction history');
        const tbody = panel && q(panel, 'tbody');
        if (!tbody)
            return;
        tbody.innerHTML = rows.length
            ? rows.slice(0, 50).map(function (row, index) {
                const player = row.players || state.byId[String(row.player_id)] || {};
                const result = row.result || {};
                const summary = result.recommendation || result.summary || row.prediction_type || 'Prediction';
                return '<tr data-prediction-index="' + index + '" data-player-id="' + esc(row.player_id || player.id || '') + '">' +
                    '<td>' + esc(playerName(player)) + '</td><td>' + esc(row.prediction_type || 'Prediction') + '</td>' +
                    '<td>' + esc(summary) + '</td><td>' + esc(dateText(row.run_at || row.created_at)) + '</td>' +
                    '<td><button class="btn small" type="button" data-open-prediction>Open</button></td></tr>';
            }).join('')
            : '<tr><td colspan="5"><div class="empty structured"><b>No prediction history yet</b><span>Predictions run from player profiles will appear here.</span></div></td></tr>';
        qa(tbody, '[data-open-prediction]').forEach(function (button) {
            button.onclick = function () {
                const row = rows[num(button.closest('tr').dataset.predictionIndex)];
                const player = row.players || state.byId[String(row.player_id)] || {};
                openPredictionResultOverlay(row.result || {}, player, row.prediction_type || 'Prediction', row);
            };
        });
    }
    function bindPredictions(root, overview) {
        var usage = state.usage || overview && overview.usage || emptyUsage('Unavailable'), predictionUsage = usageValue(usage, 'predictions', 0), metrics = qa(root, '.metric-grid .metric');
        if (metrics[0]) {
            q(metrics[0], 'strong').textContent = predictionUsage.used + ' / ' + predictionUsage.limit;
            q(metrics[0], 'span').textContent = predictionUsage.remaining + ' remaining';
        }
        if (metrics[2])
            q(metrics[2], 'strong').textContent = usage.plan || 'Core';
        loadPredictionHistory(root).then(function () { var count = q(root, '[data-prediction-count]'); if (count)
            count.textContent = (state.predictionHistory || []).length; });
    }
    async function loadReportHistory(root) {
        let rows = [];
        try {
            const response = await request('GET', '/api/scout-intelligence/reports');
            rows = response.data || [];
        }
        catch (error) {
            toast(error.message || 'Report history could not be loaded.', true);
        }
        state.reports = rows;
        const panel = panelByTitle(root, 'Report history');
        const tbody = panel && q(panel, 'tbody');
        if (!tbody)
            return;
        tbody.innerHTML = rows.length
            ? rows.slice(0, 50).map(function (row) {
                const player = row.player || state.byId[String(row.subject_id)] || {};
                const format = row.config?.format || row.format || 'PDF';
                return '<tr data-report-id="' + esc(row.id) + '" data-player-id="' + esc(row.subject_id || player.id || '') + '">' +
                    '<td><b>' + esc(row.title || row.report_type || 'ScoutLink report') + '</b></td>' +
                    '<td>' + esc(playerName(player)) + '</td><td>' + esc(format) + '</td>' +
                    '<td>' + esc(dateText(row.created_at)) + '</td><td><span class="pill green">Ready</span></td>' +
                    '<td><button class="btn small" type="button" data-download-report>Download</button></td></tr>';
            }).join('')
            : '<tr><td colspan="6"><div class="empty structured"><b>No generated reports yet</b><span>Reports created from profiles, predictions, the pipeline or comparisons will appear here.</span></div></td></tr>';
        qa(tbody, '[data-download-report]').forEach(function (button) {
            button.onclick = async function () {
                const tableRow = button.closest('tr');
                const report = rows.find(function (item) { return String(item.id) === String(tableRow.dataset.reportId); });
                const player = state.byId[String(tableRow.dataset.playerId)] || report?.player;
                if (!player)
                    return toast('The report player is unavailable.', true);
                const done = pending(button, 'Preparing…');
                try {
                    const response = await request('POST', '/api/exports/player', {
                        playerId: player.id,
                        format: report?.config?.format || report?.format || 'PDF',
                        source: 'report_history',
                        existingReportId: report?.id || null
                    });
                    if (response.contentBase64)
                        downloadBase64(response.filename, response.mime, response.contentBase64);
                    await refreshUsage(root).catch(function () { });
                    toast('Report downloaded.');
                }
                catch (error) {
                    toast(error.message, true);
                }
                finally {
                    done();
                }
            };
        });
    }
    function bindExports(root, overview) {
        hydrateUsage(root, overview);
        loadReportHistory(root).then(function () { var rows = state.reports || [], all = q(root, '[data-report-count]'), profiles = q(root, '[data-profile-report-count]'), other = q(root, '[data-other-report-count]'); if (all)
            all.textContent = rows.length; if (profiles)
            profiles.textContent = rows.filter(function (row) { return /profile/i.test(row.report_type || row.source || row.title || ''); }).length; if (other)
            other.textContent = rows.filter(function (row) { return !/profile/i.test(row.report_type || row.source || row.title || ''); }).length; });
    }
    function compareScore(p, context) { var value = p.compatibilityScore; if (context === 'Development prospect')
        value = Math.round(value * .55 + Math.min(100, p.overall_rating + 7) * .45); if (context === 'Low financial risk')
        value = Math.round(value * .55 + (100 - Math.min(100, p.transfer_value / 7000)) * .45); return value; }
    function renderComparisonResult(root, comparison) {
        const result = comparison.result || {};
        const playerA = comparison.a;
        const playerB = comparison.b;
        const totalA = num(result.playerA?.totalScore, 0);
        const totalB = num(result.playerB?.totalScore, 0);
        const winner = result.winnerPlayerId
            ? (String(result.winnerPlayerId) === String(playerA.id) ? playerA : playerB)
            : null;
        q(root, '[data-comparison-context-copy]').textContent = result.context?.label || 'Recommendation';
        q(root, '[data-comparison-winner]').textContent = winner ? playerName(winner) : 'No clear winner';
        q(root, '[data-comparison-copy]').textContent = result.recommendation || 'The players are level in this context.';
        q(root, '[data-comparison-margin]').textContent = num(result.decisionScoreMargin, Math.abs(totalA - totalB)).toFixed(1);
        q(root, '[data-compare-head-a]').innerHTML = playerCell(playerA) + '<span class="pill">' + totalA.toFixed(1) + ' decision score</span>';
        q(root, '[data-compare-head-b]').innerHTML = playerCell(playerB) + '<span class="pill">' + totalB.toFixed(1) + ' decision score</span>';
        q(root, '[data-comparison-headings]').innerHTML = '<th>Category</th><th>' + esc(playerName(playerA)) + '</th><th>' + esc(playerName(playerB)) + '</th><th>Weight</th><th>Winner</th><th>Margin</th>';
        q(root, '[data-comparison-categories]').innerHTML = (result.categories || []).map(function (row) {
            return '<tr><td><b>' + esc(row.category || row.name) + '</b></td><td>' + esc(row.playerA) + '</td><td>' + esc(row.playerB) + '</td><td>' + Math.round(num(row.weight) * 100) + '%</td><td>' + esc(row.winner || 'Tie') + '</td><td>' + esc(row.margin || 0) + '</td></tr>';
        }).join('');
        const changeRows = result.changeFactors || [
            'Additional recent Match Facts can change evidence confidence and readiness.',
            'Changing the decision context changes the category weights and can change the recommendation.',
            'A different target position or budget changes position-fit and financial-fit scores.'
        ];
        q(root, '[data-comparison-change]').innerHTML = changeRows.map(function (row) { return '<li>' + esc(row) + '</li>'; }).join('');
        q(root, '[data-comparison-tradeoff]').textContent = result.tradeOff || 'Review the largest weighted category margins before making the human decision.';
        root.dataset.comparisonWinner = winner?.id || '';
    }
    function bindCompare(root, overview) {
        hydrateUsage(root, overview);

        const inputs = qa(root, '.compare-player-select input');
        const selectedBoxes = qa(root, '.compare-player-select .selected-player');
        const contextSelect = q(root, '[data-compare-context]');
        const positionSelect = q(root, '[data-compare-position]');
        const budgetInput = q(root, '[data-compare-budget]');
        const resultWrap = q(root, '[data-comparison-results]');
        const status = q(root, '[data-comparison-status]');
        const listA = q(root, '#comparePlayerOptionsA');
        const listB = q(root, '#comparePlayerOptionsB');
        const runButton = q(root, '[data-run-comparison]');
        const newButton = q(root, '[data-new-comparison]');
        const playerCount = q(root, '[data-compare-player-count]');
        const selectedCount = q(root, '[data-compare-selected-count]');
        const contextLabel = q(root, '[data-compare-context-label]');
        const plan = q(root, '[data-compare-plan]');

        let playerA = null;
        let playerB = null;

        playerCount.textContent = state.players.length;
        plan.textContent = overview?.usage?.plan || 'Core';

        function setStatus(message, error) {
            if (!status) {
                return;
            }

            status.hidden = !message;
            status.classList.toggle('error', Boolean(error));
            status.innerHTML = message
                ? '<b>' +
                    esc(error ? 'Comparison could not run' : 'Comparing players') +
                    '</b><span>' +
                    esc(message) +
                    '</span>'
                : '';
        }

        function optionLabel(player) {
            return [
                playerName(player),
                player.age_group || '',
                player.specific_position || player.primary_position || '',
                player.team_name || player.team?.team_name || ''
            ]
                .filter(Boolean)
                .join(' · ');
        }

        function availableOptions(excludedPlayer) {
            return state.players
                .filter(player => {
                    return !excludedPlayer ||
                        String(player.id) !== String(excludedPlayer.id);
                })
                .map(player => {
                    return '<option value="' +
                        esc(optionLabel(player)) +
                        '"></option>';
                })
                .join('');
        }

        function refreshLists() {
            listA.innerHTML = availableOptions(playerB);
            listB.innerHTML = availableOptions(playerA);
        }

        function draw(side, player) {
            const index = side === 'a' ? 0 : 1;
            const box = selectedBoxes[index];

            box.classList.toggle('empty-selection', !player);
            box.innerHTML = player
                ? playerCell(player)
                : '<span>Choose a player</span>';

            if (player) {
                box.dataset.playerId = player.id;
            }
            else {
                delete box.dataset.playerId;
            }

            selectedCount.textContent =
                (playerA ? 1 : 0) +
                (playerB ? 1 : 0) +
                ' / 2';
        }

        function resolveTypedPlayer(input, excludedPlayer) {
            const typed = String(input.value || '').trim().toLowerCase();

            if (!typed) {
                return null;
            }

            const available = state.players.filter(player => {
                return !excludedPlayer ||
                    String(player.id) !== String(excludedPlayer.id);
            });

            return available.find(player => {
                return optionLabel(player).toLowerCase() === typed;
            }) || available.find(player => {
                return playerName(player).toLowerCase() === typed;
            }) || null;
        }

        function choose(side) {
            const index = side === 'a' ? 0 : 1;
            const other = side === 'a' ? playerB : playerA;
            const player = resolveTypedPlayer(inputs[index], other);

            if (side === 'a') {
                playerA = player;
            }
            else {
                playerB = player;
            }

            draw(side, player);
            refreshLists();
            resultWrap.classList.add('is-hidden');
            resultWrap.hidden = true;
            setStatus('', false);
        }

        inputs.forEach(function (input, index) {
            input.value = '';
            input.oninput = function () {
                choose(index === 0 ? 'a' : 'b');
            };
            input.onchange = function () {
                choose(index === 0 ? 'a' : 'b');
            };
        });

        draw('a', null);
        draw('b', null);
        refreshLists();
        resultWrap.classList.add('is-hidden');
        resultWrap.hidden = true;

        const params = new URLSearchParams(location.search);
        const playerAId = params.get('player');
        const playerBId = params.get('playerB');

        if (playerAId && state.byId[String(playerAId)]) {
            playerA = state.byId[String(playerAId)];
            inputs[0].value = optionLabel(playerA);
            draw('a', playerA);
        }

        if (
            playerBId &&
            state.byId[String(playerBId)] &&
            String(playerBId) !== String(playerAId)
        ) {
            playerB = state.byId[String(playerBId)];
            inputs[1].value = optionLabel(playerB);
            draw('b', playerB);
        }

        refreshLists();

        const contextMap = {
            'Immediate starter': 'immediate_starter',
            'Development prospect': 'development_prospect',
            'Specific tactical role': 'specific_tactical_role',
            'Low financial risk': 'low_financial_risk',
            'Resale upside': 'resale_upside',
            'Squad depth': 'squad_depth'
        };

        contextSelect.onchange = function () {
            contextLabel.textContent = contextSelect.value;
            resultWrap.classList.add('is-hidden');
            resultWrap.hidden = true;
            setStatus('', false);
        };

        runButton.onclick = async function () {
            choose('a');
            choose('b');

            if (!playerA || !playerB) {
                setStatus('Choose two valid players from the Supabase player list.', true);
                return;
            }

            if (String(playerA.id) === String(playerB.id)) {
                setStatus('Choose two different players.', true);
                return;
            }

            const done = pending(runButton, 'Comparing…');
            setStatus('Calculating the decision-context comparison…', false);

            try {
                const endpoint = isPublicDemo()
                    ? '/api/scout-intelligence-v64/public-demo/compare'
                    : '/api/scout-intelligence-v64/compare';

                const response = await request('POST', endpoint, {
                    playerAId: playerA.id,
                    playerBId: playerB.id,
                    contextKey: contextMap[contextSelect.value] || 'immediate_starter',
                    targetPosition: positionSelect.value === 'Current roles'
                        ? null
                        : positionSelect.value,
                    budget: budgetInput.value
                        ? num(budgetInput.value)
                        : null
                });

                if (!response?.result) {
                    throw new Error('The comparison returned no result.');
                }

                state.activeComparison = {
                    a: playerA,
                    b: playerB,
                    result: response.result
                };

                renderComparisonResult(root, state.activeComparison);
                resultWrap.hidden = false;
                resultWrap.classList.remove('is-hidden');
                setStatus('', false);
                resultWrap.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
            catch (error) {
                setStatus(error.message, true);
                toast(error.message, true);
            }
            finally {
                done();
            }
        };

        newButton.onclick = function () {
            inputs.forEach(function (input) {
                input.value = '';
            });

            playerA = null;
            playerB = null;
            draw('a', null);
            draw('b', null);
            refreshLists();
            resultWrap.classList.add('is-hidden');
            resultWrap.hidden = true;
            state.activeComparison = null;
            setStatus('', false);
            history.replaceState(null, '', location.pathname);
        };

        bindComparisonActions(root);
    }

    function bindComparisonActions(root) {
        const openButton = q(root, '[data-open-comparison-profile]');
        const exportButton = q(root, '[data-export-comparison]');
        openButton.onclick = function () {
            const playerId = root.dataset.comparisonWinner;
            if (!playerId)
                return toast('Run the comparison before opening a profile.', true);
            location.href = '/player/profile?id=' + encodeURIComponent(playerId);
        };
        exportButton.onclick = async function () {
            if (!state.activeComparison)
                return toast('Run the comparison before exporting it.', true);
            const done = pending(exportButton, 'Exporting…');
            try {
                const response = await request('POST', '/api/exports/comparison', {
                    comparison: state.activeComparison.result,
                    playerAId: state.activeComparison.a.id,
                    playerBId: state.activeComparison.b.id,
                    contextLabel: state.activeComparison.result?.context?.label || ''
                });
                if (response.contentBase64)
                    downloadBase64(response.filename, response.mime, response.contentBase64);
                toast('Comparison Excel downloaded.');
            }
            catch (error) {
                toast(error.message, true);
            }
            finally {
                done();
            }
        };
    }
    function bindSetup(root) { qa(root, 'section,.panel').forEach(function (section) { var h = q(section, 'h2,h3,h4'); if (h && h.textContent.trim().toLowerCase() === 'search preferences')
        section.remove(); }); qa(root, '.choice input').forEach(function (input) { input.onchange = function () { var label = input.closest('.choice'), group = label.closest('.choice-grid'), checked = qa(group, 'input:checked'); if (checked.length > 3) {
        input.checked = false;
        toast('Select up to three options.', true);
    } label.classList.toggle('selected', input.checked); }; }); qa(root, '.setup-nav a,.setup-tabs button').forEach(function (tab) { tab.onclick = function () { var target = q(root, tab.getAttribute('href') || '#' + tab.textContent.trim().toLowerCase().replace(/\s+/g, '-')); if (target)
        target.scrollIntoView({ behavior: 'smooth' }); return false; }; }); qa(root, 'input').forEach(function (input) { var label = input.closest('label'), copy = label && label.textContent.toLowerCase() || ''; if (copy.includes('address'))
        input.autocomplete = 'street-address'; if (copy.includes('city'))
        input.autocomplete = 'address-level2'; if (copy.includes('postcode'))
        input.autocomplete = 'postal-code'; }); function save() { var data = { fields: qa(root, '.form-grid input,.form-grid select').map(function (x) { return x.value; }), choices: qa(root, '.choice input:checked').map(function (x) { return x.nextElementSibling.textContent; }) }; localStorage.setItem('sl_scout_setup_v6_4', JSON.stringify(data)); if (!isDemo())
        request('POST', '/api/scouts/setup', data).catch(function () { }); toast('Scout setup saved and applied.'); } var saveBtn = findButton(root, 'Save and apply') || findButton(root, 'Save changes'); if (saveBtn)
        saveBtn.onclick = save; var cancel = findButton(root, 'Cancel'); if (cancel)
        cancel.onclick = function () { location.reload(); }; var review = findButton(root, 'Review impact'); if (review)
        review.onclick = function () { q(root, '.impact-grid').scrollIntoView({ behavior: 'smooth' }); }; }
    function bindChat(root) {
        const list = q(root, '[data-chat-thread-list]');
        const messages = q(root, '[data-chat-messages]');
        const contextBox = q(root, '[data-chat-context]');
        const title = q(root, '[data-chat-title]');
        const meta = q(root, '[data-chat-meta]');
        const profile = q(root, '[data-chat-profile]');
        const textarea = q(root, '[data-chat-message]');
        const sendButton = q(root, '[data-chat-send]');
        const search = q(root, '[data-chat-search]');
        const refresh = q(root, '[data-refresh-chat]');
        let threads = [];
        let activeThread = null;
        function name(row, fallback) {
            return [row?.first_name, row?.last_name].filter(Boolean).join(' ') || fallback;
        }
        function threadPlayer(thread) {
            return thread.players || state.byId[String(thread.player_id)] || null;
        }
        function threadCoach(thread) {
            return thread.coaches || null;
        }
        function renderThreadList() {
            const term = String(search.value || '').trim().toLowerCase();
            const filtered = threads.filter(function (thread) {
                const player = threadPlayer(thread);
                if (!player)
                    return false;
                return !term || playerName(player).toLowerCase().includes(term) || String(player.team_name || '').toLowerCase().includes(term);
            });
            list.innerHTML = filtered.length
                ? filtered.map(function (thread) {
                    const player = threadPlayer(thread);
                    const coach = threadCoach(thread);
                    return '<button class="conversation ' + (activeThread?.id === thread.id ? 'active' : '') + '" type="button" data-chat-thread="' + esc(thread.id) + '">' +
                        '<span class="initials">' + esc(initials(player)) + '</span><div><b>' + esc(playerName(player)) + '</b><span>' + esc(playerLine(player)) + '</span><small>Coach: ' + esc(name(coach, 'Authorised coach')) + '</small></div>' +
                        '<time>' + esc(dateText(thread.lastMessageAt || thread.last_message_at || thread.updated_at || thread.created_at)) + '</time></button>';
                }).join('')
                : '<div class="empty structured"><b>No player conversations</b><span>Register interest in a player, then use Message coach on that player profile.</span><a class="btn small primary" href="/scout/player-search">Explore players</a></div>';
            qa(list, '[data-chat-thread]').forEach(function (button) {
                button.onclick = function () { selectThread(button.dataset.chatThread); };
            });
        }
        function renderMessages(rows) {
            messages.innerHTML = rows.length
                ? rows.map(function (row) {
                    const mine = String(row.sender_id) === String(currentUser().id);
                    return '<article class="msg ' + (mine ? 'outgoing' : 'incoming') + '"><small>' + (mine ? 'You' : esc(row.sender_type || 'Coach')) + '</small><p>' + esc(row.body || '') + '</p><time>' + esc(new Date(row.created_at).toLocaleString('en-GB')) + '</time></article>';
                }).join('')
                : '<div class="empty structured"><b>No messages yet</b><span>Start the player-specific recruitment conversation.</span></div>';
            messages.scrollTop = messages.scrollHeight;
        }
        async function selectThread(threadId) {
            activeThread = threads.find(function (thread) { return String(thread.id) === String(threadId); }) || null;
            renderThreadList();
            if (!activeThread) {
                textarea.disabled = true;
                sendButton.disabled = true;
                return;
            }
            const player = threadPlayer(activeThread);
            const coach = threadCoach(activeThread);
            title.textContent = 'Conversation about ' + playerName(player);
            meta.textContent = 'Coach ' + name(coach, 'Authorised coach') + ' · ' + (player.team_name || 'Team not set');
            profile.hidden = false;
            profile.href = '/player/profile?id=' + encodeURIComponent(player.id || activeThread.player_id);
            contextBox.innerHTML = '<div class="chat-context-player"><span class="initials">' + esc(initials(player)) + '</span><div><small>Player context</small><b>' + esc(playerName(player)) + '</b><span>' + esc(playerLine(player)) + '</span></div></div><p>Every message in this thread is permanently tied to this player.</p>';
            textarea.disabled = false;
            sendButton.disabled = false;
            try {
                const response = await request('GET', '/api/scout-intelligence-v64/chat/threads/' + encodeURIComponent(activeThread.id) + '/messages');
                renderMessages(response.data || []);
            }
            catch (error) {
                messages.innerHTML = '<div class="empty structured"><b>Messages could not load</b><span>' + esc(error.message) + '</span></div>';
            }
        }
        async function loadThreads() {
            list.innerHTML = '<div class="empty structured"><b>Loading conversations</b><span>Reading player-linked threads from Supabase.</span></div>';
            try {
                const params = new URLSearchParams(location.search);
                const playerId = params.get('player');
                if (playerId) {
                    const opened = await request('POST', '/api/scout-intelligence-v64/chat/threads', { playerId: playerId });
                    if (opened.thread)
                        history.replaceState(null, '', '/scout/chat?thread=' + encodeURIComponent(opened.thread.id));
                }
                const response = await request('GET', '/api/scout-intelligence-v64/chat/threads');
                threads = response.data || [];
                renderThreadList();
                const requestedThread = new URLSearchParams(location.search).get('thread');
                if (requestedThread)
                    await selectThread(requestedThread);
                else if (threads.length)
                    await selectThread(threads[0].id);
            }
            catch (error) {
                list.innerHTML = '<div class="empty structured"><b>Conversations could not load</b><span>' + esc(error.message) + '</span><button class="btn small" type="button" data-chat-retry>Try again</button></div>';
                const retry = q(list, '[data-chat-retry]');
                if (retry)
                    retry.onclick = loadThreads;
            }
        }
        async function sendMessage() {
            if (!activeThread)
                return toast('Select a player conversation.', true);
            const body = textarea.value.trim();
            if (!body)
                return;
            const done = pending(sendButton, 'Sending…');
            try {
                await request('POST', '/api/scout-intelligence-v64/chat/threads/' + encodeURIComponent(activeThread.id) + '/messages', { body: body });
                textarea.value = '';
                await selectThread(activeThread.id);
            }
            catch (error) {
                toast(error.message, true);
            }
            finally {
                done();
            }
        }
        search.oninput = renderThreadList;
        refresh.onclick = loadThreads;
        sendButton.onclick = sendMessage;
        textarea.onkeydown = function (event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        };
        loadThreads();
    }
    function bindNotifications(root) {
        const list = q(root, '[data-notification-list]');
        const filters = qa(root, '[data-notification-filter]');
        const refreshButton = q(root, '[data-refresh-notifications]');
        const markAllButton = findButton(root, 'Mark all read');
        let activeFilter = 'all';
        let rows = [];
        function actionFor(notification) {
            const meta = notification.metadata || {};
            return notification.actionUrl || notification.action_url || meta.actionUrl || meta.action_url ||
                (notification.player_id || meta.playerId ? '/player/profile?id=' + encodeURIComponent(notification.player_id || meta.playerId) : '') ||
                (notification.thread_id || meta.threadId ? '/scout/chat?thread=' + encodeURIComponent(notification.thread_id || meta.threadId) : '') ||
                (notification.fixture_id || meta.fixtureId ? '/scout/fixtures?fixture=' + encodeURIComponent(notification.fixture_id || meta.fixtureId) : '') ||
                '';
        }
        function render() {
            const filtered = activeFilter === 'all'
                ? rows
                : rows.filter(function (row) {
                    return String(row.filterGroup || row.filter_group || row.type || '').toLowerCase() === activeFilter;
                });
            list.innerHTML = filtered.length
                ? filtered.map(function (row) {
                    const actionUrl = actionFor(row);
                    const label = row.actionLabel || row.action_label || (actionUrl ? 'Open' : 'Read');
                    return '<article class="notification ' + (row.is_read ? '' : 'unread') + '" data-notification-id="' + esc(row.id) + '">' +
                        '<span class="initials">' + esc(String(row.type || row.filterGroup || 'NT').slice(0, 2).toUpperCase()) + '</span>' +
                        '<div><small>' + esc(row.category || row.typeLabel || row.filterGroup || 'ScoutLink update') + '</small>' +
                        '<b>' + esc(row.title || row.body || row.message || 'ScoutLink update') + '</b>' +
                        (row.title && (row.body || row.message) ? '<p>' + esc(row.body || row.message) + '</p>' : '') +
                        '<span>' + esc(dateText(row.created_at)) + '</span></div>' +
                        (actionUrl ? '<a class="btn small ' + (row.is_read ? '' : 'primary') + '" href="' + esc(actionUrl) + '" data-open-notification>' + esc(label) + '</a>' : '<button class="btn small" type="button" data-read-notification>Mark read</button>') +
                        '</article>';
                }).join('')
                : '<div class="empty structured"><b>No notifications in this category</b><span>New player, fixture, message and recruitment updates will appear here.</span></div>';
            qa(list, '[data-notification-id]').forEach(function (card) {
                const row = rows.find(function (item) { return String(item.id) === String(card.dataset.notificationId); });
                const markRead = async function () {
                    if (!row || row.is_read)
                        return;
                    try {
                        await request('PATCH', '/api/notifications/' + encodeURIComponent(row.id) + '/read');
                        row.is_read = true;
                        render();
                    }
                    catch (error) {
                        toast(error.message, true);
                    }
                };
                const open = q(card, '[data-open-notification]');
                const read = q(card, '[data-read-notification]');
                if (open)
                    open.addEventListener('click', markRead);
                if (read)
                    read.onclick = markRead;
            });
        }
        async function load() {
            list.innerHTML = '<div class="empty structured"><b>Loading notifications</b><span>Reading your Scout notifications from Supabase.</span></div>';
            try {
                const response = await request('GET', '/api/notifications?limit=100');
                rows = response.data || [];
                render();
            }
            catch (error) {
                list.innerHTML = '<div class="empty structured"><b>Notifications could not load</b><span>' + esc(error.message) + '</span></div>';
            }
        }
        filters.forEach(function (button) {
            button.onclick = function () {
                activeFilter = button.dataset.notificationFilter || 'all';
                filters.forEach(function (item) { item.classList.toggle('active', item === button); });
                render();
            };
        });
        if (refreshButton)
            refreshButton.onclick = load;
        if (markAllButton) {
            markAllButton.onclick = async function () {
                const done = pending(markAllButton, 'Updating…');
                try {
                    await request('PATCH', '/api/notifications/mark-all-read');
                    rows.forEach(function (row) { row.is_read = true; });
                    render();
                    toast('All notifications marked as read.');
                }
                catch (error) {
                    toast(error.message, true);
                }
                finally {
                    done();
                }
            };
        }
        load();
    }
    function bindSettings(root, overview) {
        hydrateUsage(root, overview);
        var usage = state.usage || overview && overview.usage || emptyUsage('Unavailable');
        var settingMetrics = qa(root, '.metric-grid.compact .metric');
        var settingRows = [
            usageValue(usage, 'predictions', 0),
            usageValue(usage, 'exports', 0),
            usageValue(usage, 'interests', 0)
        ];
        settingRows.forEach(function (row, index) {
            if (!settingMetrics[index])
                return;
            var strong = q(settingMetrics[index], 'strong');
            var span = q(settingMetrics[index], 'span');
            if (strong)
                strong.textContent = row.used + ' / ' + row.limit;
            if (span)
                span.textContent = row.remaining + ' remaining';
        });
        if (settingMetrics[3]) {
            var resetStrong = q(settingMetrics[3], 'strong');
            var resetSpan = q(settingMetrics[3], 'span');
            if (resetStrong)
                resetStrong.textContent = usage.resetAt ? dateText(usage.resetAt) : 'Not scheduled';
            if (resetSpan)
                resetSpan.textContent = usage.scope === 'team' ? 'Team plan renewal' : 'Scout plan renewal';
        }
        var tabs = qa(root, '.settings-tabs button'), layout = q(root, '.settings-layout'), accountHtml = layout.innerHTML;
        function row(title, copy, control) { return '<div class="settings-row"><div><b>' + esc(title) + '</b><span>' + esc(copy) + '</span></div>' + control + '</div>'; }
        function panelMarkup(title, body) { return '<section class="panel"><header class="panel-head"><div><h3>' + esc(title) + '</h3></div></header><div class="panel-body">' + body + '</div></section>'; }
        function limitReview() { modal('Request a limit review', '<div class="form-grid">' + formField('Feature', '<select><option>Predictions</option><option>Exports</option><option>Pipeline places</option></select>') + formField('Reason', '<textarea id="limitReason" placeholder="Explain the recruitment need and expected usage."></textarea>') + '</div>' + actionFooter('Send request', 'data-send-limit'), function (m, close) { q(m, '[data-send-limit]').onclick = function () { if (!q(m, '#limitReason').value.trim())
            return toast('Add a reason for the request.', true); close(); toast('Limit review request sent to Customer Operations.'); }; }); }
        function bindAccount() { var edit = findButton(layout, 'Edit'); if (edit)
            edit.onclick = function () { modal('Edit account details', '<p class="workflow-copy">Account identity changes are managed through Customer Operations so reviewed-scout status remains protected.</p>'); }; var copy = findButton(layout, 'Copy'); if (copy)
            copy.onclick = function () { navigator.clipboard && navigator.clipboard.writeText(currentUser().scout_id || 'DSC01'); toast('Scout ID copied.'); }; var setup = findButton(layout, 'Open Scout Setup'); if (setup)
            setup.onclick = function () { location.href = '/scout/setup'; }; var limit = findButton(layout, 'Request limit review'); if (limit)
            limit.onclick = limitReview; }
        function render(name) { if (name === 'Account') {
            layout.innerHTML = accountHtml;
            bindAccount();
            return;
        } if (name === 'Appearance') {
            layout.innerHTML = panelMarkup('Appearance', row('Theme', 'Use the ScoutLink light design.', '<select id="settingsTheme"><option>Light</option><option>System</option></select>') + row('Table density', 'Choose comfortable or compact data tables.', '<select id="settingsDensity"><option>Comfortable</option><option>Compact</option></select>')) + panelMarkup('Accessibility', row('Reduced motion', 'Reduce non-essential movement.', '<label class="choice"><input id="settingsMotion" type="checkbox"><span>Reduce motion</span></label>') + row('High-visibility focus', 'Keep strong keyboard focus outlines.', '<label class="choice selected"><input id="settingsFocus" type="checkbox" checked><span>Enabled</span></label>'));
            return;
        } if (name === 'Notifications') {
            layout.innerHTML = panelMarkup('Notification preferences', row('Saved search matches', 'New players matching a saved football search.', '<label class="choice selected"><input type="checkbox" checked><span>Enabled</span></label>') + row('Watched player changes', 'Evidence and profile changes that may affect a decision.', '<label class="choice selected"><input type="checkbox" checked><span>Enabled</span></label>') + row('Coach messages', 'Replies from authorised adult contacts.', '<label class="choice selected"><input type="checkbox" checked><span>Enabled</span></label>'));
            return;
        } if (name === 'Team') {
            layout.innerHTML = panelMarkup('Team permissions', row('Head Scout', 'Manage assignments, limits and final approvals.', '<span class="pill green">Full access</span>') + row('Scout', 'Search, observe, compare and record decisions.', '<span class="pill">Standard</span>') + row('Analyst', 'Review evidence and reports.', '<span class="pill">Read and comment</span>')) + panelMarkup('Team management', '<p class="body-copy">Permission changes are recorded for audit and safeguarding.</p><button class="btn" type="button" data-review-team>Review team members</button>');
            q(layout, '[data-review-team]').onclick = function () { modal('Team members', '<div class="workflow-list"><article><div><b>Head Scout</b><span>Manages recruitment approvals and team access.</span></div></article><article><div><b>Scouts</b><span>Run player intelligence and live observations.</span></div></article></div>'); };
            return;
        } if (name === 'Security') {
            layout.innerHTML = panelMarkup('Security', row('Password', 'Change the password connected to this account.', '<button class="btn small" type="button" data-security-password>Change</button>') + row('Two-step verification', 'Protect access to sensitive player data.', '<button class="btn small primary" type="button" data-security-2fa>Enable</button>') + row('Active sessions', 'Review browsers signed into ScoutLink.', '<button class="btn small" type="button" data-security-sessions>Review</button>'));
            q(layout, '[data-security-password]').onclick = function () { toast('Password changes open through the secure account flow.'); };
            q(layout, '[data-security-2fa]').onclick = function () { toast('Two-step verification setup started.'); };
            q(layout, '[data-security-sessions]').onclick = function () { modal('Active sessions', '<div class="workflow-list"><article><div><b>Current browser</b><span>Active now</span></div></article></div>'); };
            return;
        } var usage = overview && overview.usage || demoUsage(); layout.innerHTML = panelMarkup('Plan and usage', row('Current plan', usage.plan || 'Elite demo', '<span class="pill green">Active</span>') + row('Prediction allowance', String(usage.predictions && usage.predictions.remaining || 0) + ' remaining', '<button class="btn small" type="button" data-plan-review>Review limits</button>') + row('Export allowance', String(usage.exports && usage.exports.remaining || 0) + ' remaining', '<button class="btn small" type="button" data-plan-limit>Request review</button>') + row('Pipeline places', String(usage.interests && usage.interests.remaining || 0) + ' remaining', '<span class="pill">Current year</span>')); q(layout, '[data-plan-review]').onclick = function () { location.hash = 'usage'; }; q(layout, '[data-plan-limit]').onclick = limitReview; }
        tabs.forEach(function (tab) { tab.onclick = function () { tabs.forEach(function (x) { x.classList.toggle('active', x === tab); }); render(tab.textContent.trim()); }; });
        var save = findButton(root, 'Save changes');
        if (save)
            save.onclick = async function () { try {
                var payload = { theme: q(root, '#settingsTheme') && q(root, '#settingsTheme').value.toLowerCase() === 'light' ? 'light' : 'dark', emailAlerts: true, pushAlerts: true, eventAlerts: true, platformUpdates: false, weeklySummary: true };
                if (!isDemo())
                    await request('PATCH', '/api/scouts/settings', payload);
                localStorage.setItem('sl_scout_settings_v63', JSON.stringify(payload));
                toast('Settings saved.');
            }
            catch (error) {
                toast(error.message, true);
            } };
        render('Account');
    }
    function renderFixtureCalendar(root, rows, date) {
        date = date || new Date();
        root._fixtureCalendarDate = new Date(date.getFullYear(), date.getMonth(), 1);
        var panel = q(root, '.calendar-panel'), heading = panel && q(panel, '.panel-head h3'), grid = panel && q(panel, '.calendar-grid');
        if (heading)
            heading.textContent = root._fixtureCalendarDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
        if (!grid)
            return;
        var first = new Date(root._fixtureCalendarDate), weekday = (first.getDay() + 6) % 7, start = new Date(first);
        start.setDate(first.getDate() - weekday);
        var html = '';
        for (var i = 0; i < 42; i++) {
            var day = new Date(start);
            day.setDate(start.getDate() + i);
            var inMonth = day.getMonth() === root._fixtureCalendarDate.getMonth();
            var matches = (rows || []).filter(function (row) { var d = new Date(row.fixture && row.fixture.fixture_date); return !Number.isNaN(d.getTime()) && d.toDateString() === day.toDateString(); });
            html += '<div class="cal-day ' + (inMonth ? '' : 'muted') + '"><b>' + day.getDate() + '</b>' + matches.map(function (row) { return '<button class="cal-event ' + (num(row.priority) >= 80 ? 'priority' : '') + '" type="button" data-fixture-id="' + esc(row.fixture.id) + '"><b>' + esc(row.player ? playerName(row.player) : row.fixture.opponent_name || 'Fixture') + '</b><span>' + esc((row.fixture.fixture_time || '') + ' · ' + (row.fixture.opponent_name || row.fixture.opponent || 'Opponent')) + '</span></button>'; }).join('') + '</div>';
        }
        grid.innerHTML = html;
        qa(grid, '[data-fixture-id]').forEach(function (btn) { btn.onclick = function () { var row = (rows || []).find(function (item) { return String(item.fixture.id) === String(btn.dataset.fixtureId); }); if (row)
            planFixture({ player: row.player || state.players[0], fixtures: [row.fixture] }, row.fixture); }; });
    }
    function renderFixtureLists(root, rows) {
        var mobile = q(root, '.mobile-fixture-list');
        if (mobile)
            mobile.innerHTML = (rows || []).map(function (row) { var f = row.fixture, d = new Date(f.fixture_date); return '<article class="fixture-card" data-fixture-id="' + esc(f.id) + '" data-player-id="' + esc(row.player && row.player.id || '') + '"><div class="date-box"><b>' + (Number.isNaN(d.getTime()) ? '—' : d.getDate()) + '</b><span>' + (Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { month: 'short' })) + '</span></div><div><b>' + esc((row.player ? playerName(row.player) : 'Player') + ' · ' + (f.opponent_name || f.opponent || 'Opponent')) + '</b><span>' + esc((f.fixture_time || '') + ' · ' + (f.venue || f.venue_name || f.city || 'Venue TBC')) + '</span><p>Priority ' + num(row.priority) + ' · ' + esc((row.reasons || [])[0] || 'Live-scouting review') + '</p></div><button class="btn small primary" type="button">' + (row.plan ? 'Open plan' : 'Plan visit') + '</button></article>'; }).join('');
        var priorityPanel = qa(root, '.calendar-layout>.panel')[1], body = priorityPanel && q(priorityPanel, '.panel-body');
        if (body)
            body.innerHTML = (rows || []).slice().sort(function (a, b) { return num(b.priority) - num(a.priority); }).map(function (row) { return '<article class="priority-visit" data-fixture-id="' + esc(row.fixture.id) + '" data-player-id="' + esc(row.player && row.player.id || '') + '"><b>' + esc(row.player ? playerName(row.player) : 'Player') + '</b><span>' + esc(dateText(row.fixture.fixture_date) + ' · Priority ' + num(row.priority)) + '</span><p>' + esc((row.reasons || []).join(' ') || 'Plan the evidence objective for this fixture.') + '</p><button class="btn small ' + (num(row.priority) >= 80 ? 'primary' : '') + '" type="button">' + (row.plan ? 'Open plan' : 'Assign scout') + '</button></article>'; }).join('');
        qa(root, '.fixture-card button,.priority-visit button').forEach(function (btn) { btn.onclick = function () { var card = btn.closest('[data-fixture-id]'), row = (rows || []).find(function (item) { return card && String(item.fixture.id) === String(card.dataset.fixtureId); }); if (row)
            planFixture({ player: row.player || state.players[0], fixtures: [row.fixture] }, row.fixture); }; });
    }
    async function hydrateFixtures(root) {
        let rows = [];
        try {
            const response = await request('GET', '/api/scout-intelligence/fixtures');
            rows = response.data || [];
        }
        catch (error) {
            toast(error.message || 'Fixtures could not be loaded.', true);
        }
        rows = rows.map(function (row) {
            const fixture = row.fixture || row;
            const player = row.player || state.byId[String(row.player_id || fixture.player_id)] || null;
            return {
                fixture: fixture,
                player: player,
                priority: num(row.priority || row.priorityScore || row.priority_score, 0),
                plan: row.plan || row.fixturePlan || null,
                reasons: row.reasons
                    ? [].concat(row.reasons)
                    : row.reason
                        ? [row.reason]
                        : []
            };
        });
        state.fixtures = rows;
        const metrics = qa(root, '.metric-grid .metric strong');
        if (metrics[0])
            metrics[0].textContent = rows.length;
        if (metrics[1])
            metrics[1].textContent = rows.filter(function (row) { return row.plan; }).length;
        if (metrics[2])
            metrics[2].textContent = rows[0] ? dateText(rows[0].fixture.fixture_date) : '—';
        if (metrics[3])
            metrics[3].textContent = rows.filter(function (row) { return !row.plan; }).length;
        renderFixtureCalendar(root, rows, rows[0] && rows[0].fixture && rows[0].fixture.fixture_date
            ? new Date(rows[0].fixture.fixture_date)
            : new Date());
        renderFixtureLists(root, rows);
    }
    function bindFixtures(root) {
        hydrateFixtures(root);
        function move(months) {
            const current = root._fixtureCalendarDate || new Date();
            const next = new Date(current.getFullYear(), current.getMonth() + months, 1);
            renderFixtureCalendar(root, state.fixtures || [], next);
        }
        const previous = findButton(root, 'Previous');
        const today = findButton(root, 'Today');
        const next = findButton(root, 'Next');
        const calendarSettings = findButton(root, 'Calendar settings');
        const externalFixture = findButton(root, 'Add external fixture');
        if (previous)
            previous.onclick = function () { move(-1); };
        if (today)
            today.onclick = function () { renderFixtureCalendar(root, state.fixtures || [], new Date()); };
        if (next)
            next.onclick = function () { move(1); };
        if (calendarSettings)
            calendarSettings.remove();
        if (externalFixture)
            externalFixture.remove();
    }
    function bindPipelineBridge() { if (state.pipelineBridgeBound)
        return; state.pipelineBridgeBound = true; document.addEventListener('click', function (event) { var btn = event.target.closest('button'); if (!btn || !/compare/i.test(btn.textContent.trim()))
        return; var root = document.getElementById('scoutExperienceApp'); if (!root)
        return; var ids = []; qa(root, 'input[type="checkbox"]:checked').forEach(function (input) { var row = input.closest('[data-player-id],[data-player],[data-pipeline-player-id],tr,.pipeline-card'), id = input.value || row && (row.dataset.playerId || row.dataset.player || row.dataset.pipelinePlayerId); if (id)
        ids.push(id); }); if (ids.length < 2) {
        qa(root, '[data-player-id]').slice(0, 2).forEach(function (node) { if (node.dataset.playerId)
            ids.push(node.dataset.playerId); });
    } ids = Array.from(new Set(ids)).slice(0, 2); if (ids.length < 2)
        return toast('Choose two pipeline players before comparing them.', true); event.preventDefault(); event.stopImmediatePropagation(); location.href = '/scout/compare-players?player=' + encodeURIComponent(ids[0]) + '&playerB=' + encodeURIComponent(ids[1]); }, true); }
    function addressDatalistMarkup() {
        return '<datalist id="slAddressOptions"></datalist>';
    }
    function loadingMarkup(route) { var label = { dashboard: 'dashboard', search: 'player database', profile: 'player dossier', rankings: 'rankings', fixtures: 'fixtures', predictions: 'predictions', exports: 'exports', compare: 'comparison', setup: 'Scout Setup', chat: 'chat' }[route] || 'workspace'; return '<div class="si64-loading" role="status" aria-live="polite"><div class="si64-loading-brand">Scout<span>Link</span></div><div class="si64-loading-ball" aria-hidden="true"><i></i></div><h2>Loading ' + esc(label) + '</h2><p>Preparing the latest ScoutLink records and actions.</p><div class="si64-loading-lines"><span></span><span></span><span></span></div></div>'; }
    function predictionResultBody(result, player, type) {
        const evidence = Array.isArray(result.evidence) ? result.evidence : [];
        const paragraphs = Array.isArray(result.paragraphs) ? result.paragraphs : [];
        const inputParams = result.inputParams || result.inputs || result.context || {};
        const scoreBreakdown = result.scoreBreakdown || result.metrics || result.factors || {};
        const confidence = result.confidence?.label || result.confidence || evidenceLabel(player);
        const headlineScore = result.scenarioScore || result.targetScore || result.overallRating || result.score || '—';
        const inputRows = Object.entries(inputParams).filter(function (entry) {
            return entry[1] !== null && entry[1] !== undefined && entry[1] !== '';
        });
        const metricRows = Array.isArray(scoreBreakdown)
            ? scoreBreakdown
            : Object.entries(scoreBreakdown).map(function (entry) { return { label: entry[0], value: entry[1] }; });
        const attributeRows = ['overall_rating', 'pace', 'passing', 'dribbling', 'shooting', 'defending', 'composure', 'positioning', 'stamina']
            .filter(function (key) { return player[key] !== null && player[key] !== undefined; })
            .map(function (key) { return { label: key.replace(/_/g, ' '), value: score(player[key], 0) }; });
        const explanationRows = [];
        paragraphs.forEach(function (paragraph, index) {
            explanationRows.push({
                title: index === 0 ? 'Outcome explanation' : 'Football context and safeguard',
                body: paragraph
            });
        });
        if (evidence.length) {
            explanationRows.push({
                title: 'Evidence used',
                body: evidence.map(function (item) {
                    return (item.attribute || item.label || item.name || 'Evidence') + ': ' + (item.score ?? item.value ?? item.description ?? 'used');
                }).join(' · ')
            });
        }
        if (metricRows.length) {
            explanationRows.push({
                title: 'Metrics influencing the result',
                body: metricRows.map(function (item) {
                    return String(item.label || item.name || '').replace(/_/g, ' ') + ': ' + (item.value?.score ?? item.value ?? '—');
                }).join(' · ')
            });
        }
        if (attributeRows.length) {
            explanationRows.push({
                title: 'Current player profile considered',
                body: attributeRows.map(function (item) { return item.label + ' ' + item.value + '/100'; }).join(' · ')
            });
        }
        explanationRows.push({
            title: 'Confidence and limitations',
            body: 'Confidence is ' + String(confidence).toLowerCase() + '. The output is decision support based on the stored player profile, available Match Facts and the selected prediction inputs. It must be validated through football evidence.'
        });
        return '<div class="prediction-result-scroll">' +
            '<section class="result-layout-v64"><article class="primary-verdict-v64"><small>' + esc(type) + '</small><h3>' + esc(result.recommendation || result.targetVerdict || 'Prediction completed') + '</h3><p>' + esc(result.summary || paragraphs[0] || 'Review the detailed evidence, inputs and safeguards below.') + '</p><div><span>' + esc(headlineScore) + (headlineScore === '—' ? '' : '/100') + '</span><span>Confidence ' + esc(confidence) + '</span></div></article>' +
            '<aside class="result-side-v64"><article><small>Player</small><b>' + esc(playerName(player)) + '</b><span>' + esc(playerLine(player)) + '</span></article><article><small>Prediction question</small><b>' + esc(type) + '</b></article><article><small>Primary risk</small><b>' + esc(result.risk || 'Evidence still needs football validation') + '</b></article></aside></section>' +
            (inputRows.length ? '<section class="prediction-input-summary"><h3>Inputs used</h3><div class="review-list-v64">' + inputRows.map(function (entry) { return '<div><span>' + esc(String(entry[0]).replace(/_/g, ' ')) + '</span><b>' + esc(Array.isArray(entry[1]) ? entry[1].join(', ') : entry[1]) + '</b></div>'; }).join('') + '</div></section>' : '') +
            '<section class="explanation-v64"><h3>Why the result looks this way</h3>' + explanationRows.map(function (row, index) { return '<article><span>' + String(index + 1).padStart(2, '0') + '</span><div><b>' + esc(row.title) + '</b><p>' + esc(row.body) + '</p></div></article>'; }).join('') + '</section></div>';
    }
    function openPredictionResultOverlay(result, p, type, row) { modal('Prediction result', predictionResultBody(result, p, type) + '<div class="workflow-footer split"><button class="btn" type="button" data-export-open-prediction>Export prediction</button><button class="btn primary" type="button" data-record-open-prediction>Record decision</button></div>', function (m) { var exportButton = q(m, '[data-export-open-prediction]'); if (exportButton)
        exportButton.onclick = function () { reportWorkflow({ player: p, predictionLogId: row && row.id }, 'prediction'); }; var decision = q(m, '[data-record-open-prediction]'); if (decision)
        decision.onclick = function () { openDecisionWorkflow(p, { source: 'prediction' }); }; }, { className: 'wide' }); }
    function predictionPlayerRows(pipelineOnly) { var rows = state.players || []; if (pipelineOnly)
        rows = rows.filter(function (player) { return player.pipeline_stage && player.pipeline_stage !== 'new' || demoPipelineItem(player.id); }); return rows; }
    function openPredictionWizard(initialPlayer, onComplete) { var selected = initialPlayer || null, type = '', step = 1; modal('Run a player prediction', '<div class="prediction-wizard-v64"><aside class="wizard-rail-v64"><article class="active" data-wizard-step="1"><span>1</span><div><b>Choose the player</b><small>Type to shorten the list.</small></div></article><article data-wizard-step="2"><span>2</span><div><b>Choose the prediction</b><small>Select one football question.</small></div></article><article data-wizard-step="3"><span>3</span><div><b>Set the context</b><small>Only relevant inputs appear.</small></div></article><article data-wizard-step="4"><span>4</span><div><b>Review and run</b><small>Confirm before using a credit.</small></div></article></aside><section class="wizard-main-v64"><section data-wizard-panel="1"><label class="field"><span>Search player</span><input id="wizardPlayer" list="wizardPlayerList" placeholder="Type a player name" value="' + esc(selected ? playerName(selected) : '') + '"></label><datalist id="wizardPlayerList">' + playerDatalist('wizardSource').replace(/^<datalist[^>]*>|<\/datalist>$/g, '') + '</datalist><label class="choice"><input type="checkbox" id="wizardPipelineOnly"><span>Show only players in my pipeline</span></label><div class="wizard-player-results" data-wizard-player-results></div><button class="btn primary" type="button" data-wizard-next-player>Continue</button></section><section class="is-hidden" data-wizard-panel="2"><h3>What prediction do you want to run?</h3><div class="prediction-list-v64"><button type="button" data-wizard-type="Position fit"><b>Position fit</b><span>Test a current, future or target role.</span></button><button type="button" data-wizard-type="Match scenario"><b>Match scenario</b><span>Assess a defined tactical situation.</span></button><button type="button" data-wizard-type="Development projection"><b>Development projection</b><span>Model rating and attribute direction.</span></button><button type="button" data-wizard-type="ROI and value"><b>ROI and value</b><span>Review cost, upside and downside.</span></button></div></section><section class="is-hidden" data-wizard-panel="3"><div data-wizard-controls></div><button class="btn primary" type="button" data-wizard-review>Review prediction</button></section><section class="is-hidden" data-wizard-panel="4"><div data-wizard-review-copy></div><button class="btn primary" type="button" data-wizard-run>Run prediction</button></section></section></div>', function (m, close) { function activate(n) { step = n; qa(m, '[data-wizard-step]').forEach(function (node) { node.classList.toggle('active', num(node.dataset.wizardStep) === n); node.classList.toggle('complete', num(node.dataset.wizardStep) < n); }); qa(m, '[data-wizard-panel]').forEach(function (node) { node.classList.toggle('is-hidden', num(node.dataset.wizardPanel) !== n); }); } var input = q(m, '#wizardPlayer'), only = q(m, '#wizardPipelineOnly'), results = q(m, '[data-wizard-player-results]'); function renderPlayers() { var search = String(input.value || '').toLowerCase(), rows = predictionPlayerRows(only.checked).filter(function (p) { return !search || playerName(p).toLowerCase().includes(search); }).slice(0, 8); results.innerHTML = rows.map(function (p) { return '<button type="button" data-wizard-player-id="' + esc(p.id) + '"><span class="initials">' + initials(p) + '</span><div><b>' + esc(playerName(p)) + '</b><small>' + esc(playerLine(p)) + '</small></div></button>'; }).join(''); qa(results, '[data-wizard-player-id]').forEach(function (btn) { btn.onclick = function () { selected = state.byId[String(btn.dataset.wizardPlayerId)]; input.value = playerName(selected); renderPlayers(); }; }); } input.oninput = renderPlayers; only.onchange = renderPlayers; renderPlayers(); q(m, '[data-wizard-next-player]').onclick = function () { selected = selected || playerByTypedName(input.value); if (!selected)
        return toast('Choose a player from the list.', true); activate(2); }; qa(m, '[data-wizard-type]').forEach(function (btn) { btn.onclick = function () { type = btn.dataset.wizardType; var controls = q(m, '[data-wizard-controls]'); controls.innerHTML = predictionControls(type, selected, 'wizardPrediction'); var internalRun = q(controls, '[data-run-staged-prediction]'); if (internalRun)
        internalRun.remove(); activate(3); }; }); q(m, '[data-wizard-review]').onclick = function () { if (!type)
        return toast('Choose a prediction.', true); q(m, '[data-wizard-review-copy]').innerHTML = '<div class="review-list-v64"><div><span>Player</span><b>' + esc(playerName(selected)) + '</b></div><div><span>Prediction</span><b>' + esc(type) + '</b></div><div><span>Usage</span><b>1 prediction credit</b></div></div>'; activate(4); }; q(m, '[data-wizard-run]').onclick = async function (e) { var done = pending(e.currentTarget, 'Running…'); try {
        var controls = q(m, '[data-wizard-controls]'), result = await runPredictionFor(selected, type, predictionInput(type, controls, 'wizardPrediction'));
        close();
        openPredictionResultOverlay(result, selected, type, { id: result.logId || result.id });
        if (onComplete)
            onComplete();
        toast('Prediction completed and added to history.');
    }
    catch (error) {
        toast(error.message, true);
    }
    finally {
        done();
    } }; }, { className: 'wide' }); }
    function enhancePipelinePage() { var root = document.getElementById('scoutExperienceApp'); if (!root)
        return; qa(root, 'button').forEach(function (btn) { var label = btn.textContent.trim(); if (label === 'Pipeline settings')
        btn.remove(); if (label === 'Export pipeline')
        btn.onclick = async function () { var done = pending(btn, 'Exporting…'); try {
            var response = await request('POST', '/api/exports/pipeline', { format: 'Excel' });
            downloadBase64(response.filename, response.mime, response.contentBase64);
            await refreshUsage().catch(function () { });
            toast('Pipeline exported with compatibility and counted as one export.');
        }
        catch (error) {
            toast(error.message, true);
        }
        finally {
            done();
        } }; }); }
    function hydrateRoute(root, overview) { if (state.route === 'dashboard')
        hydrateDashboard(root, overview);
    else if (state.route === 'search')
        bindSearch(root);
    else if (state.route === 'profile') {
        if (state.profile)
            hydrateProfile(root, state.profile);
        else
            loadProfile().then(function (bundle) { state.profile = bundle; hydrateProfile(root, bundle); }).catch(function (e) { toast(e.message, true); });
    }
    else if (state.route === 'rankings')
        bindRankings(root);
    else if (state.route === 'fixtures')
        bindFixtures(root);
    else if (state.route === 'predictions')
        bindPredictions(root, overview);
    else if (state.route === 'exports')
        bindExports(root, overview);
    else if (state.route === 'compare')
        bindCompare(root, overview);
    else if (state.route === 'setup')
        bindSetup(root);
    else if (state.route === 'chat')
        bindChat(root);
    else if (state.route === 'notifications')
        bindNotifications(root);
    else if (state.route === 'settings')
        bindSettings(root, overview); }
    async function init() { state.route = routeId(); if (state.route === 'pipeline') {
        bindPipelineBridge();
        setTimeout(enhancePipelinePage, 50);
        setTimeout(enhancePipelinePage, 600);
        return;
    } if (!templates[state.route])
        return; waitForWorkspace(async function (app, content) { content.innerHTML = loadingMarkup(state.route); app.classList.add('is-loading'); try {
        await loadPlayers();
        var overviewPromise = loadOverview(), profilePromise = state.route === 'profile' ? loadProfile() : Promise.resolve(null), values = await Promise.all([overviewPromise, profilePromise]);
        var overview = values[0];
        state.profile = values[1];
        var root = mount(content);
        app.classList.remove('is-loading');
        hydrateRoute(root, overview);
    }
    catch (e) {
        app.classList.remove('is-loading');
        content.innerHTML = '<div class="slv6-approved"><div class="empty structured"><b>ScoutLink could not load</b><span>' + esc(e.message) + '</span><button class="btn primary" type="button" onclick="location.reload()">Try again</button></div></div>';
    } }); }
    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', init);
    else
        init();
})();
