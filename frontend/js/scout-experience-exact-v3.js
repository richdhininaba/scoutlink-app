

const routes=[
 {id:"confirm",name:"Confirm Password & Setup",path:"/confirm-password"},
 {id:"dashboard",name:"Scout Dashboard",path:"/scout/dashboard"},
 {id:"search",name:"Player Search",path:"/scout/player-search"},
 {id:"profile",name:"Player Profile",path:"/player/profile"},
 {id:"pipeline",name:"My Pipeline",path:"/scout/pipeline"},
 {id:"rankings",name:"Rankings",path:"/scout/rankings"},
 {id:"fixtures",name:"Fixtures",path:"/scout/fixtures"},
 {id:"predictions",name:"Predictions",path:"/scout/predictions"},
 {id:"exports",name:"Exports",path:"/scout/exports"},
 {id:"compare",name:"Compare Players",path:"/scout/compare-players"},
 {id:"setup",name:"Scout Setup",path:"/scout/setup"},
 {id:"events",name:"Showcase Events",path:"/scout/events"},
 {id:"chat",name:"Chat",path:"/scout/chat"},
 {id:"notifications",name:"Notifications",path:"/scout/notifications"},
 {id:"concern",name:"Report a Concern",path:"/scout/report-a-concern"},
 {id:"settings",name:"Settings",path:"/scout/settings"}
];
const navGroups=[
 ["Core",[["dashboard","Dashboard","DB"],["search","Player search","PS"],["pipeline","My pipeline","MP"],["rankings","Rankings","RK"]]],
 ["Scouting tools",[["fixtures","Fixtures","FX"],["predictions","Predictions","PR"],["exports","Exports","EX"],["compare","Compare players","CP"],["setup","Scout setup","SS"]]],
 ["Network",[["events","Events","EV"],["chat","Chat","CH"],["notifications","Notifications","NT"],["concern","Report a Concern","RC"]]],
 ["Account",[["settings","Settings","ST"]]]
];
function side(active){return `<aside class="sidebar"><div class="side-logo"><div class="logo">Scout<span>Link</span></div></div><nav class="side-nav">${navGroups.map(g=>`<div class="nav-label">${g[0]}</div>${g[1].map(x=>`<div class="side-link ${active===x[0]?'active':''}"><span class="side-icon">${x[2]}</span>${x[1]}</div>`).join("")}`).join("")}</nav><div class="side-user"><div class="user-avatar">NP</div><div><b>Noah Patel</b><span>Regional Scout · Elite</span></div></div></aside>`}
function mobileTop(title){return `<div class="mobile-top"><div class="logo">Scout<span>Link</span></div><b style="font-size:11px">${title}</b><button class="btn sm">Menu</button></div>`}
function mobileBottom(active){const links=[["dashboard","⌂","Home"],["search","⌕","Search"],["pipeline","♡","Pipeline"],["chat","◫","Chat"],["settings","⚙","More"]];return `<nav class="mobile-bottom">${links.map(x=>`<div class="bottom-link ${active===x[0]?'active':''}"><i>${x[1]}</i>${x[2]}</div>`).join("")}</nav>`}
function shell(active,title,body,m=false){return `<div class="scout-page">${m?mobileTop(title):side(active)}<section class="workspace">${m?"":`<header class="workspace-top"><h1>${title}</h1><div class="top-actions"><button class="btn sm">Scout team</button><button class="btn sm">Notifications</button><button class="btn sm">Noah Patel</button></div></header>`}${body}</section>${m?mobileBottom(active):""}</div>`}
function hero(label,title,copy,actions=""){return `<section class="page-hero"><div><span class="pill green">${label}</span><h2>${title}</h2><p>${copy}</p></div>${actions?`<div class="page-actions">${actions}</div>`:""}</section>`}
const players=[
 ["FF","Freddie Foster","CM · U18","Eastbrook Athletic","79%","78","£296.5k","Birmingham"],
 ["MP","Micah Powell","RW · U16","Meadow Park Rovers","79%","78","£454k","Manchester"],
 ["ME","Max Evans","LW · U16","Southvale Juniors","79%","71","£404k","Bristol"],
 ["LS","Leo Stone","LW · U14","Southvale Juniors","79%","78","£386k","Bristol"],
 ["LM","Louis Murphy","RW · U17","Meadow Park Rovers","79%","68","£369k","Manchester"],
 ["YW","Yusuf White","LW · U16","Southvale Juniors","77%","74","£322k","Bristol"],
 ["LP","Luca Phillips","CM · U18","Eastbrook Athletic","77%","81","£467k","Birmingham"],
 ["CK","Callum Kelly","LW · U14","Southvale Juniors","77%","81","£391k","Bristol"],
 ["JB","Jordan Blake","CB · U18","Harbour City Academy","77%","71","£93k","Liverpool"],
 ["FS","Finley Shaw","CAM · U16","Eastbrook Athletic","76%","83","£295k","Birmingham"],
 ["NR","Noah Reed","CAM · U16","Eastbrook Athletic","76%","73","£241k","Birmingham"],
 ["EE","Ellis Edwards","LW · U14","Southvale Juniors","75%","84","£505k","Bristol"]
];
function confirmPage(m){
 const weakness=["Insufficient Game Pace and Speed","Physical Fragility and Injury Risk","Lack of Physical Presence","Weak Defensive Base","Poor Defensive Output","Low Team Chemistry and Leadership","Technical Deficiencies Under Pressure","Tactical Awareness Gaps","Poor Goal Output"];
 const roles=["Aerial Dominance","Vision and Creativity","Speed and Agility","Tactical Intelligence","Ball Retention Under Pressure","Physical Resilience Work Rate","Defensive Impact","Offensive Impact","Progression and Carrying","Leadership and Communication"];
 const goals=["Physical Growth Potential","Tactical Role Maturity","Leadership and Coachability","Injury Risk and Physical Resilience","Positional Depth Advantage","Goal Contribution Potential","Financial Viability"];
 return `<div class="confirm-page ${m?'confirm-mobile':''}"><div class="confirm-top"><div class="confirm-brand">Scout<span>Link</span></div><span class="pill green">Reviewed scout setup</span></div><div class="confirm-shell"><aside class="confirm-aside"><span class="quiet-label">First account access</span><h1>Secure the account and set the recruitment context.</h1><p>This setup runs once before the scout enters the dashboard. The same information can later be changed in Scout Setup.</p><div class="confirm-steps"><div class="confirm-step active"><i>1</i><div><b>Create password</b><span>Secure the account</span></div></div><div class="confirm-step active"><i>2</i><div><b>Team context</b><span>Organisation and style</span></div></div><div class="confirm-step active"><i>3</i><div><b>Recruitment brief</b><span>Weaknesses and role fit</span></div></div></div></aside><main class="confirm-main">
 <section class="onboard-card"><div class="onboard-head"><div><small>Step 1 of 3</small><h2>Create your ScoutLink password</h2><p>Use at least eight characters. The account email has already been verified through the secure link.</p></div><span class="pill green">Email verified</span></div><div class="onboard-body"><div class="form-grid"><div class="field"><label>New password</label><div class="control">••••••••••••</div><div class="password-strength"><span></span></div></div><div class="field"><label>Confirm password</label><div class="control">••••••••••••</div></div></div><div class="setup-summary"><div><b>12 characters</b><span>Minimum 8</span></div><div><b>Upper and lower case</b><span>Included</span></div><div><b>Number or symbol</b><span>Included</span></div></div></div></section>
 <section class="onboard-card"><div class="onboard-head"><div><small>Step 2 of 3</small><h2>Confirm the team context</h2><p>These fields shape search ranking, compatibility and recommendations.</p></div></div><div class="onboard-body"><div class="form-grid"><div class="field"><label>Team name</label><div class="control">ScoutLink Demo Recruitment Team</div></div><div class="field"><label>Club / organisation</label><div class="control">Stratex Demo FC</div></div><div class="field"><label>Scout country</label><div class="control">England ▾</div></div><div class="field"><label>Scout region</label><div class="control">London ▾</div></div><div class="field"><label>Formation</label><div class="control">4-3-3 ▾</div></div><div class="field"><label>Playing style</label><div class="control">Tiki-Taka ▾</div></div></div></div></section>
 <section class="onboard-card"><div class="onboard-head"><div><small>Step 3 of 3</small><h2>Set the recruitment brief</h2><p>Select the weaknesses, role expectations and long-term goals that should influence compatibility and role-fit analysis.</p></div></div><div class="onboard-body"><div class="field"><label>Team weaknesses looking to be solved · Select up to 3</label><div class="check-grid" style="margin-top:6px">${weakness.map((x,i)=>`<div class="check-card ${[0,5,7].includes(i)?'active':''}">${[0,5,7].includes(i)?'✓':'□'} ${x}</div>`).join("")}</div></div><div class="field" style="margin-top:12px"><label>Role expectations that influence role fit · Select up to 3</label><div class="check-grid" style="margin-top:6px">${roles.map((x,i)=>`<div class="check-card ${[1,3,9].includes(i)?'active':''}">${[1,3,9].includes(i)?'✓':'□'} ${x}</div>`).join("")}</div></div><div class="field" style="margin-top:12px"><label>Long-term goals · Select up to 3</label><div class="check-grid" style="margin-top:6px">${goals.map((x,i)=>`<div class="check-card ${[1,4,6].includes(i)?'active':''}">${[1,4,6].includes(i)?'✓':'□'} ${x}</div>`).join("")}</div></div><div class="field" style="margin-top:12px"><label>Age groups</label><div class="filter-pills" style="margin-top:5px">${["U6","U7","U8","U9","U10","U11","U12","U13","U14","U15","U16"].map((x,i)=>`<button class="filter-pill ${i===10?'active':''}">${x}</button>`).join("")}</div></div><div class="field" style="margin-top:10px"><label>Preferred positions</label><div class="filter-pills" style="margin-top:5px">${["GK","CB","RB","LB","RWB","LWB","CDM","CM","CAM","LM","RM","LW","RW","ST"].map((x,i)=>`<button class="filter-pill ${[0,1,8,13].includes(i)?'active':''}">${x}</button>`).join("")}</div></div><div class="form-grid" style="margin-top:10px"><div class="field"><label>Salary cap (GBP/week)</label><div class="control">500000</div></div><div class="field"><label>Minimum appearances</label><div class="control">3</div></div></div></div><div class="onboard-footer"><span>The setup is saved to the scout profile and can be edited later.</span><div class="page-actions"><button class="btn">Save and finish later</button><button class="btn primary">Save setup and open dashboard</button></div></div></section>
 </main></div></div>`
}
function dashboardPage(m){
 const newPlayers=[
  ["AM","Aiden Morgan","DM · U16","Northbridge Athletic","84%","Added today","Strong defensive-screening profile"],
  ["ET","Ethan Taylor","RW · U15","Riverside Juniors","82%","Added yesterday","High pace and direct-carry evidence"],
  ["JM","Jacob Mensah","CB · U17","Westfield Academy","81%","Added 2 days ago","Right-footed build-up defender"],
  ["SK","Samuel King","CM · U16","Oakwood Youth","79%","Added 3 days ago","Press-resistant central midfielder"],
  ["LC","Liam Carter","GK · U17","Harbour City Academy","78%","Added 4 days ago","Strong distribution and claim rate"]
 ];
 const body=`<main class="content">${hero("Elite scout workspace","Good evening, Noah.","Five new players match your recruitment brief. Two pipeline decisions need attention before Friday.",`<button class="btn primary">Review new players</button><button class="btn">Open decision queue</button>`)}
 <section class="value-strip"><article class="value-card signal-card"><small>New matching players</small><strong class="green">5</strong><div class="sub">Added since your last visit</div></article><article class="value-card signal-card"><small>Decisions due</small><strong>2</strong><div class="sub">Pipeline actions before Friday</div></article><article class="value-card signal-card"><small>Active pipeline</small><strong>7</strong><div class="sub">Across 5 recruitment stages</div></article><article class="value-card signal-card"><small>Plan utilisation</small><strong style="font-size:16px">Elite · 50%</strong><div class="sub">30 of 60 predictions used</div></article></section>
 <section class="panel new-player-panel"><div class="panel-head"><div><h3>New player intelligence</h3><span class="panel-subtitle">Players added since your last visit that match the current brief</span></div><button class="btn sm">View all new players</button></div><div class="new-player-grid">${newPlayers.map((x,i)=>`<article class="new-player-card"><div class="new-player-top"><div class="avatar professional">${x[0]}</div><span class="confidence ${i<2?'high':''}">${x[4]}</span></div><h4>${x[1]}</h4><p>${x[2]} · ${x[3]}</p><div class="why-match">${x[6]}</div><div class="new-player-foot"><span>${x[5]}</span><button class="btn sm">Review</button></div></article>`).join("")}</div></section>
 <section class="grid2"><div class="panel"><div class="panel-head"><div><h3>Decision queue</h3><span class="panel-subtitle">Recommended next actions based on recent activity</span></div><button class="btn sm">Open pipeline</button></div><div class="panel-body"><div class="decision-list"><div class="decision-row"><div><b>Reuben Hughes</b><span>Coach reply overdue by 2 days</span></div><div><span class="status-dot urgent"></span><button class="btn sm">Follow up</button></div></div><div class="decision-row"><div><b>Freddie Foster</b><span>New Match Facts improved evidence confidence</span></div><div><span class="status-dot"></span><button class="btn sm">Review</button></div></div><div class="decision-row"><div><b>Kai Jones</b><span>Comparison saved but no pipeline decision</span></div><div><span class="status-dot"></span><button class="btn sm">Decide</button></div></div></div></div></div>
 <div class="panel"><div class="panel-head"><div><h3>Recruitment brief coverage</h3><span class="panel-subtitle">Available supply against the current scout setup</span></div><button class="btn sm">Edit setup</button></div><div class="panel-body"><div class="brief-grid"><div class="brief-item"><span>Defensive midfielder</span><b>12 relevant</b><div class="coverage"><i style="width:78%"></i></div><small>Strong coverage</small></div><div class="brief-item"><span>Right winger</span><b>8 relevant</b><div class="coverage"><i style="width:56%"></i></div><small>Moderate coverage</small></div><div class="brief-item"><span>Leadership profile</span><b>3 relevant</b><div class="coverage low"><i style="width:26%"></i></div><small>Limited evidence</small></div></div></div></div></section>
 <section class="grid3"><div class="panel"><div class="panel-head"><h3>Top current fit</h3></div><div class="panel-body"><span class="quiet-label">Highest-confidence recommendation</span><h4 class="compact-title">Freddie Foster</h4><p class="compact-copy">79% compatibility with very high evidence confidence and a clear central-midfield role fit.</p><button class="btn primary sm" style="margin-top:9px">Open player</button></div></div><div class="panel"><div class="panel-head"><h3>Usage and limits</h3></div><div class="panel-body"><div class="progress-list"><div class="progress-row"><span>Interest requests</span><div class="progress"><span style="width:2%"></span></div><b>7/300</b></div><div class="progress-row"><span>Exports</span><div class="progress blue"><span style="width:2%"></span></div><b>4/300</b></div><div class="progress-row"><span>Predictions</span><div class="progress gold"><span style="width:50%"></span></div><b>30/60</b></div></div></div></div><div class="panel"><div class="panel-head"><h3>Fixture readiness</h3></div><div class="panel-body"><div class="professional-empty"><b>No tracked fixtures published</b><span>Fixture alerts will appear when coaches publish schedules for pipeline players.</span><button class="btn sm" style="margin-top:9px">Review pipeline</button></div></div></div></section>
 </main>`;return shell("dashboard","Scout workspace",body,m)
}
function searchPage(m){
 const body=`<main class="content">${hero("Player discovery","Find relevant players faster.","Search once, see why each result fits and move strong options directly into your recruitment workflow.",`<button class="btn primary">Run search</button><button class="btn">Save search</button>`)}
 <section class="panel"><div class="panel-body"><div class="search-grid"><div class="control">Search player name… <span>⌕</span></div><div class="control">All positions ▾</div><div class="control">Min age</div><div class="control">All locations ▾</div><div class="control">Max age</div><div class="control">Most compatible ▾</div><button class="btn primary">Search</button></div><div class="filter-pills" style="margin-top:9px"><span class="pill green">40 players found</span><span class="pill grey">Compatibility applied</span><span class="pill grey">Your scout setup</span><span class="pill grey">Evidence confidence</span></div></div></section>
 <section class="panel"><div class="panel-head"><h3>Player database</h3><div><button class="btn sm">Cards</button> <button class="btn primary sm">Table</button></div></div><div class="table-wrap"><table class="table"><thead><tr><th>Player</th><th>Position</th><th>Age</th><th>Location</th><th>Height</th><th>Build</th><th>Club</th><th>Compatibility</th><th>Overall</th><th></th></tr></thead><tbody>${players.map((x,i)=>`<tr><td><div class="player-cell"><div class="avatar ${i%3===0?'red':i%3===1?'gold':''}">${x[0]}</div><div><b>${x[1]}</b><span>${x[3]}</span></div></div></td><td>${x[2].split(" · ")[0]}</td><td>${x[2].split(" · ")[1].replace("U","")}</td><td>${x[7]}</td><td><span class="pill blue">${i%3===0?'Average':i%3===1?'Tall':'Short'}</span></td><td>${i%3===0?'Lean':i%3===1?'Athletic':'Powerful'}</td><td>${x[3]}</td><td><b>${x[4]}</b></td><td><b>${x[5]}</b></td><td><button class="btn sm">View profile</button></td></tr>`).join("")}</tbody></table></div></section>
 <section class="grid3"><div class="panel"><div class="panel-head"><h3>Saved searches</h3></div><div class="panel-body"><div class="match-list"><div class="match-row"><div><b>U16 attacking midfielders</b><span>Birmingham · compatibility first</span></div><button class="btn sm">Run</button></div><div class="match-row"><div><b>High-confidence centre backs</b><span>UK · U16–U18</span></div><button class="btn sm">Run</button></div></div></div></div><div class="panel"><div class="panel-head"><h3>Recent searches</h3></div><div class="panel-body"><div class="match-list"><div class="match-row"><div><b>Wingers</b><span>12 results</span></div><button class="btn sm">Open</button></div><div class="match-row"><div><b>London U16</b><span>8 results</span></div><button class="btn sm">Open</button></div></div></div></div><div class="panel"><div class="panel-head"><h3>Quick filters</h3></div><div class="panel-body"><div class="filter-pills"><button class="filter-pill active">Best fit</button><button class="filter-pill">High confidence</button><button class="filter-pill">Under £250k</button><button class="filter-pill">Available video</button></div></div></div></section>
 </main>`;return shell("search","Player Database",body,m)
}

function profilePage(m){
 const body=`<main class="content"><section class="panel" style="margin-top:0"><div class="panel-body"><div class="profile-head"><div class="profile-person"><div class="profile-avatar">FF</div><div><h2>Freddie Foster</h2><p>Central Midfielder · U18 · Eastbrook Athletic</p><div class="filter-pills" style="margin-top:8px"><span class="pill green">Overall 78/100</span><span class="pill grey">Right foot</span><span class="pill blue">Very high confidence</span></div><div style="display:flex;gap:7px;margin-top:10px"><button class="btn primary">Register interest</button><button class="btn">Export</button><button class="btn">Watch videos</button></div></div></div><div class="profile-score"><b>79%</b><span>Compatibility score</span><strong>£296,500</strong><span>Estimated transfer value</span></div></div></div></section>
 <section class="grid3"><article class="panel"><div class="panel-body" style="text-align:center"><small style="font-size:7px;color:var(--muted)">Overall match performance</small><strong style="display:block;font-size:25px;color:var(--gold);margin-top:8px">78<span style="font-size:10px">/100</span></strong><span class="pill gold">Strong</span></div></article><article class="panel"><div class="panel-body" style="text-align:center"><small style="font-size:7px;color:var(--muted)">Data confidence</small><strong style="display:block;font-size:18px;color:var(--orange);margin-top:8px">Very High</strong><p style="font-size:7px;color:var(--muted)">21 match records support this profile.</p></div></article><article class="panel"><div class="panel-body" style="text-align:center"><small style="font-size:7px;color:var(--muted)">Evidence base</small><strong style="display:block;font-size:25px;margin-top:8px">21</strong><p style="font-size:7px;color:var(--muted)">Recorded appearances</p></div></article></section>
 <section class="panel"><div class="panel-head"><h3>Overall rating breakdown</h3><span class="pill grey">Post-platform age band · Midfielder</span></div><div class="panel-body"><div class="grid4"><div class="value-card"><small>Final score</small><strong>84/100</strong><div class="sub">Headline ScoutLink overall</div></div><div class="value-card"><small>Current readiness</small><strong>87/100</strong><div class="sub">How ready the player is now</div></div><div class="value-card"><small>Potential rating</small><strong>82/100</strong><div class="sub">Development upside</div></div><div class="value-card"><small>Data confidence</small><strong style="font-size:17px">Very High</strong><div class="sub">Strong evidence base</div></div></div><div class="grid2" style="margin-top:12px"><div class="progress-list">${[["Technical",90,""],["Tactical IQ",90,"cyan"],["Physical profile",88,"blue"],["Mental / coachability",93,"violet"],["Match output",68,"gold"],["Discipline",95,"orange"],["Availability",88,""],["Data confidence",93,"violet"]].map(x=>`<div class="progress-row"><span>${x[0]}</span><div class="progress ${x[2]}"><span style="width:${x[1]}%"></span></div><b>${x[1]}</b></div>`).join("")}</div><div><div class="metric-grid"><div class="metric-box"><b class="role-gated">Central Midfielder</b><span>Best current role</span></div><div class="metric-box"><b class="role-gated">Central Midfielder</b><span>Best future role</span></div><div class="metric-box"><b class="role-gated">92</b><span>Role fit score</span></div></div><button class="btn primary block" style="margin-top:9px" data-scroll-position-fit>Run position fit</button></div></div></div></section>
 <section class="panel"><div class="panel-head"><h3>Compatibility intelligence</h3><strong style="color:var(--gold)">79% · Strong fit</strong></div><div class="panel-body"><div class="compat-grid">${[["Need fit",91],["Role fit",64],["Tactical style",92],["Formation fit",72],["Development pathway",65],["Match evidence",80],["Financial fit",69]].map((x,i)=>`<div class="compat-item"><span>${x[0]}</span><b>${x[1]}</b><div class="progress ${i===2?'blue':i===3?'violet':i===4?'gold':i===5?'orange':''}" style="margin-top:7px"><span style="width:${x[1]}%"></span></div></div>`).join("")}</div><div class="recommendation" style="margin-top:10px">Prioritise for live scouting and deeper coach conversation. Strong need fit, tactical fit and evidence confidence outweigh the weaker role-fit score.</div></div></section>
 <section class="panel"><div class="panel-head"><h3>Value analysis</h3><strong style="color:var(--green)">GBP 296.5K</strong></div><div class="panel-body"><div class="value-analysis"><div class="analysis-card"><small>Affordability</small><h4>Premium youth case</h4></div><div class="analysis-card"><small>Risk label</small><h4>Balanced risk</h4></div><div class="analysis-card"><small>Position group</small><h4>Midfielder</h4></div></div><div class="factor-list">${[["Age-band starting value","Starting youth valuation before player-specific adjustments."],["Position group adjustment","How the market values the position group."],["Role scarcity adjustment","Extra value for harder-to-recruit roles."],["Overall quality adjustment","How the overall score moves the estimate."],["Potential runway adjustment","How age and upside affect valuation."],["Evidence confidence adjustment","How strongly the data supports the valuation."],["Discipline and availability","Reliability and availability risk."],["Match output adjustment","Goals, assists and performance evidence."]].map(x=>`<div class="factor"><b>${x[0]}</b><span>${x[1]}</span></div>`).join("")}</div></div></section>
 <section class="attr-layout"><div class="panel"><div class="panel-head"><h3>All attributes</h3></div><div class="panel-body"><div class="attribute-list">${[["Pace",87],["Agility",88],["Strength",86],["Stamina",91],["Shooting",83],["Passing",95],["Dribbling",86],["Defending",82],["Composure",89],["Crossing",86],["Vision",96],["Positioning",90],["Heading",85],["Tackling",84],["Jumping",87]].map(x=>`<div class="attribute"><span>${x[0]}</span><div class="progress"><span style="width:${x[1]}%"></span></div><b>${x[1]}</b></div>`).join("")}</div></div></div><div class="panel"><div class="panel-head"><h3>Match statistics</h3></div><div class="panel-body"><div class="metric-grid" style="grid-template-columns:1fr 1fr">${[["21","Appearances"],["5","Goals"],["6","Assists"],["1","Clean sheet"],["3","Yellow cards"],["0","Red cards"]].map(x=>`<div class="metric-box"><b>${x[0]}</b><span>${x[1]}</span></div>`).join("")}</div></div></div><div class="panel"><div class="panel-head"><h3>Physical profile</h3></div><div class="panel-body"><div class="analysis-card" style="background:linear-gradient(135deg,#e7f6f1,#e7f0fb)"><small>Profile type</small><h4>Average height · Lean build</h4><p style="font-size:7px;color:var(--muted)">172–184 cm · 60–68 kg</p></div><div class="metric-grid" style="grid-template-columns:1fr 1fr;margin-top:8px"><div class="metric-box"><b>U18</b><span>Age group</span></div><div class="metric-box"><b>Coach</b><span>Profile owner</span></div></div></div></div></section>
 <section class="grid2"><div class="panel"><div class="panel-head"><h3>Last 5 match facts</h3></div><div class="panel-body"><div class="match-list">${[["Riverside Rangers","3–1 win · Perf 74/100"],["Southbank Athletic","2–2 draw · Perf 75/100"],["Eastfield Rovers","1–0 win · Perf 76/100"]].map(x=>`<div class="match-row"><div><b>${x[0]}</b><span>${x[1]}</span></div><span class="pill green">Details</span></div>`).join("")}</div></div></div><div class="panel"><div class="panel-head"><h3>Upcoming fixtures</h3></div><div class="panel-body"><div class="empty-state" style="min-height:145px"><div class="empty-icon">—</div><h4>No upcoming fixtures</h4><p>Check back after the coach adds a fixture.</p></div></div></div></section>
 <section class="panel position-fit-run"><div class="panel-head"><div><h3>Run position fit analysis</h3><span class="panel-subtitle">Choose the target context, then use one prediction credit to reveal the role outputs</span></div><span class="pill blue">30 credits remaining</span></div><div class="panel-body"><div class="prediction-controls"><div class="control">Balanced growth ▾</div><div class="control">Balanced value growth ▾</div><div class="control">Protecting a one-goal lead ▾</div><div class="control">Centre Back ▾</div></div><div class="page-actions" style="display:flex;gap:7px;margin-top:9px"><button class="btn sm">Run attribute development</button><button class="btn sm">Run ROI analysis</button><button class="btn sm">Run scenario prediction</button><button class="btn primary sm" data-run-position-fit>Run position fit</button></div><div class="prediction-result" style="margin-top:12px"><div class="result-card"><small>Best current role</small><b class="role-gated">Central Midfielder</b></div><div class="result-card"><small>Best future role</small><b class="role-gated">Central Midfielder</b></div><div class="result-card"><small>Target role</small><b>Centre Back</b></div><div class="result-card"><small>Role fit score</small><b class="role-gated">83/100</b></div></div><div class="position-fit-state">Select the target role and run the analysis to reveal the current role, future role and role-fit score.</div></div></section></main>`;return shell("search","Freddie Foster",body,m)
}
function pipelinePage(m){
 const body=`<main class="content">${hero("Recruitment workflow","Move the right players forward.","Keep every prospect, stage, coach conversation and next action visible without relying on scattered notes.",`<button class="btn primary">Find players</button><button class="btn">Export pipeline</button>`)}
 <section class="value-strip"><article class="value-card"><small>Requests remaining</small><strong class="green">293</strong><div class="sub">of 300</div></article><article class="value-card"><small>In pipeline</small><strong>7</strong><div class="sub">Across 5 stages</div></article><article class="value-card"><small>Awaiting coach reply</small><strong class="gold">2</strong><div class="sub">Needs follow-up</div></article><article class="value-card"><small>Plan</small><strong style="font-size:17px">Elite</strong><div class="sub">Team workflow enabled</div></article></section>
 <section class="panel"><div class="panel-head"><div><h3>My recruitment pipeline</h3><span style="font-size:7px;color:var(--muted)">Watching → Shortlisted → Approached → Negotiating</span></div><button class="btn sm">Pipeline settings</button></div><div class="panel-body"><div class="pipeline-summary"><div class="pipeline-box"><strong>2</strong><span>Watching</span></div><div class="pipeline-box"><strong>4</strong><span>Shortlisted</span></div><div class="pipeline-box"><strong>1</strong><span>Approached</span></div></div></div><div class="table-wrap"><table class="table"><thead><tr><th>Player</th><th>Position</th><th>Overall</th><th>Value</th><th>Stage</th><th>Move stage</th><th>Coach</th><th>Added</th><th></th></tr></thead><tbody>${[["Reuben Hughes","ST","85","£344k","Interested"],["Kai Jones","CM","68","£212k","Shortlisted"],["Elias Ward","CB","84","£348k","Shortlisted"],["Carter Hill","ST","78","£429k","Shortlisted"],["Jayden Wood","GK","76","£270k","Shortlisted"],["Ethan Cole","ST","72","£89k","Watching"],["Theo Brooks","DM","77","£144k","Approached"]].map((x,i)=>`<tr><td><div class="player-cell"><div class="avatar ${i%2?'red':'gold'}">${x[0].split(" ").map(n=>n[0]).join("")}</div><div><b>${x[0]}</b><span>U16–U18</span></div></div></td><td>${x[1]}</td><td><b>${x[2]}</b></td><td><b>${x[3]}</b></td><td><span class="pill ${x[4]==='Approached'?'green':x[4]==='Shortlisted'?'gold':'blue'}">${x[4]}</span></td><td><div class="control">${x[4]} ▾</div></td><td><button class="btn sm">Message coach</button></td><td>27 Jun 2026</td><td><button class="btn sm">View</button></td></tr>`).join("")}</tbody></table></div></section>
 <section class="grid3"><div class="panel"><div class="panel-head"><h3>Follow-up due</h3></div><div class="panel-body"><div class="match-list"><div class="match-row"><div><b>Reuben Hughes</b><span>Coach reply overdue by 2 days</span></div><button class="btn sm">Message</button></div><div class="match-row"><div><b>Theo Brooks</b><span>Review approached stage</span></div><button class="btn sm">Open</button></div></div></div></div><div class="panel"><div class="panel-head"><h3>Stage health</h3></div><div class="panel-body"><div class="progress-list"><div class="progress-row"><span>Watching</span><div class="progress"><span style="width:29%"></span></div><b>2</b></div><div class="progress-row"><span>Shortlisted</span><div class="progress gold"><span style="width:57%"></span></div><b>4</b></div><div class="progress-row"><span>Approached</span><div class="progress blue"><span style="width:14%"></span></div><b>1</b></div></div></div></div><div class="panel"><div class="panel-head"><h3>Next action</h3></div><div class="panel-body"><span class="pill green">Recommended</span><h4 style="font-size:13px;margin:10px 0 4px">Compare Reuben and Carter</h4><p style="font-size:8px;color:var(--muted)">Both are strikers in adjacent stages with different evidence strengths.</p><button class="btn primary sm" style="margin-top:8px">Compare players</button></div></div></section></main>`;return shell("pipeline","My Pipeline",body,m)
}
function rankingsPage(m){
 const categories=[["Top scorers",[["Louis Murphy","15"],["Leo Stone","15"],["Max Evans","13"],["Micah Powell","13"],["Callum Kelly","11"]]],["Top assisters",[["Luca Phillips","10"],["Isaac Morgan","10"],["Sonny Young","10"],["Callum Kelly","9"],["Harry Walker","9"]]],["Top clean sheets",[["Ben Green","11"],["Oscar Hayes","11"],["Dylan Scott","10"],["Jude Bennett","9"],["Toby Bailey","8"]]],["Most scouted",[["Elias Ward","2"],["Theo Brooks","1"],["Ethan Cole","1"],["Kai Jones","1"],["Jayden Wood","1"]]],["Most valuable",[["Ellis Edwards","£505k"],["Ryan Cox","£475k"],["Luca Phillips","£467k"],["Kobe Roberts","£458k"],["Micah Powell","£454k"]]]];
 const body=`<main class="content">${hero("Player leaderboards","See standout players across the platform.","Use rankings as a discovery signal, then open the profile to judge context, fit and evidence quality.",`<button class="btn primary">Explore players</button>`)}
 <section class="leaderboards" style="margin-top:12px">${categories.map((c,ci)=>`<div class="panel"><div class="panel-head"><h3>${c[0]}</h3><span class="pill ${ci===4?'green':'grey'}">${ci===4?'GBP':'Top 5'}</span></div><div class="rank-list">${c[1].map((x,i)=>`<div class="rank-row"><div class="rank-no ${i===0?'first':i===1?'second':i===2?'third':''}">${i+1}</div><div><b>${x[0]}</b><small>U16–U18 · Demo club</small></div><strong style="font-size:12px;color:${ci===4?'var(--green)':i===0?'var(--green)':'var(--text)'}">${x[1]}</strong><button class="btn sm">View</button></div>`).join("")}</div></div>`).join("")}</section>
 <section class="grid3"><div class="panel"><div class="panel-head"><h3>How to use rankings</h3></div><div class="panel-body"><p style="font-size:8px;color:var(--muted);line-height:1.5">Rankings are discovery aids, not standalone selection decisions. Use profile evidence, compatibility and scout judgement before taking action.</p></div></div><div class="panel"><div class="panel-head"><h3>Filters</h3></div><div class="panel-body"><div class="filter-pills"><button class="filter-pill active">All ages</button><button class="filter-pill">U16</button><button class="filter-pill">U17</button><button class="filter-pill">U18</button></div></div></div><div class="panel"><div class="panel-head"><h3>Share with team</h3></div><div class="panel-body"><p style="font-size:8px;color:var(--muted)">Create a team shortlist from one ranking category.</p><button class="btn sm" style="margin-top:8px">Create shortlist</button></div></div></section></main>`;return shell("rankings","Player rankings",body,m)
}
function fixturesPage(m){
 const fixtures=[
  ["24","Fri","Eastbrook Athletic vs Riverside Rangers","Freddie Foster · CM","19:00 · Eastbrook Training Ground"],
  ["26","Sun","Meadow Park Rovers vs Northbridge Athletic","Micah Powell · RW","14:30 · Meadow Park"],
  ["30","Thu","Harbour City Academy vs Westfield Academy","Jordan Blake · CB","18:45 · Harbour City Campus"],
  ["02","Sun","Southvale Juniors vs Oakwood Youth","Max Evans · LW","13:00 · Southvale Sports Centre"]
 ];
 const days=[
  ["29","muted",null],["30","muted",null],["1","",null],["2","",null],["3","",null],["4","",null],["5","",null],
  ["6","",null],["7","",null],["8","",null],["9","",null],["10","",null],["11","",null],["12","",null],
  ["13","",null],["14","",null],["15","",null],["16","",null],["17","",null],["18","",null],["19","",null],
  ["20","",null],["21","",null],["22","",null],["23","",null],["24","",["Eastbrook vs Riverside","Freddie Foster · 19:00",""]],["25","",null],["26","",["Meadow Park vs Northbridge","Micah Powell · 14:30","blue"]],
  ["27","",null],["28","",null],["29","",null],["30","",["Harbour City vs Westfield","Jordan Blake · 18:45","gold"]],["31","",null],["1","muted",null],["2","muted",["Southvale vs Oakwood","Max Evans · 13:00",""]]
 ];
 const body=`<main class="content">${hero("Pipeline fixtures","Plan live scouting from one calendar.","Coach-published fixtures for pipeline players are organised by date so the team can prioritise live visits and avoid conflicting assignments.",`<button class="btn primary">Find players</button><button class="btn">Open pipeline</button>`)}
 <section class="value-strip"><article class="value-card"><small>Upcoming fixtures</small><strong class="green">4</strong><div class="sub">Across pipeline players</div></article><article class="value-card"><small>Pipeline players involved</small><strong>4</strong><div class="sub">Across 4 teams</div></article><article class="value-card"><small>Next fixture</small><strong style="font-size:15px">24 Jul</strong><div class="sub">Freddie Foster · 19:00</div></article><article class="value-card"><small>Unassigned visits</small><strong>2</strong><div class="sub">Need a scout owner</div></article></section>
 <section class="panel"><div class="panel-head"><div><h3>July 2026</h3><span class="panel-subtitle">Upcoming fixtures for players in your pipeline</span></div><div class="page-actions"><button class="btn sm">Previous</button><button class="btn sm">Today</button><button class="btn sm">Next</button><button class="btn primary sm">Calendar settings</button></div></div><div class="panel-body"><div class="fixture-calendar">${["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(x=>`<div class="calendar-day-name">${x}</div>`).join("")}${days.map(x=>`<div class="calendar-day ${x[1]}"><div class="calendar-date">${x[0]}</div>${x[2]?`<div class="calendar-fixture ${x[2][2]}"><b>${x[2][0]}</b><span>${x[2][1]}</span></div>`:""}</div>`).join("")}</div><div class="fixture-mobile-list">${fixtures.map((x,i)=>`<article class="fixture-list-item"><div class="fixture-date-box"><b>${x[0]}</b><span>${x[1]}</span></div><div><h4>${x[2]}</h4><p>${x[3]}<br>${x[4]}</p></div><button class="btn sm">Plan visit</button></article>`).join("")}</div></div></section>
 <section class="grid3"><div class="panel"><div class="panel-head"><h3>Visit planning</h3></div><div class="panel-body"><p style="font-size:8px;color:var(--muted);line-height:1.5">Assign a scout, add private notes and record the live-observation objective before the fixture.</p><button class="btn sm" style="margin-top:8px">Open visit plan</button></div></div><div class="panel"><div class="panel-head"><h3>Fixture alerts</h3></div><div class="panel-body"><div class="setting-row"><div><b>Email me</b><span>When a tracked player has a fixture</span></div><div class="toggle on"></div></div></div></div><div class="panel"><div class="panel-head"><h3>Calendar export</h3></div><div class="panel-body"><p style="font-size:8px;color:var(--muted)">Export selected fixtures to the team calendar.</p><button class="btn sm" style="margin-top:8px">Export fixtures</button></div></div></section></main>`;return shell("fixtures","Fixtures",body,m)
}
function predictionsPage(m){
 const rows=[["Freddie Foster","Eastbrook Athletic","Position Fit Projection","19 Jul 2026","CB is a high-friction conversion at 83/100."],["Richdhin Inaba","Northgate United","Attribute Development","11 Jul 2026","Technical possession focus improves projected value."],["Richdhin Inaba","Northgate United","ROI Analysis","11 Jul 2026","Monitor and negotiate carefully."],["Richdhin Inaba","Northgate United","Match Scenario Prediction","11 Jul 2026","Flourishes against a compact low block."],["Kai Jones","Eastbrook Athletic","Position Fit Projection","9 Jul 2026","CDM is a natural fit at 93/100."],["Kai Jones","Eastbrook Athletic","Position Fit Projection","9 Jul 2026","RB is convertible with a managed plan at 87/100."]];
 const body=`<main class="content">${hero("Prediction intelligence","Turn profile evidence into structured scenarios.","Run deterministic development, value, match-scenario and position-fit analyses without confusing them for guarantees.",`<button class="btn primary">Find a player</button><button class="btn">How predictions work</button>`)}
 <section class="value-strip"><article class="value-card"><small>Predictions remaining</small><strong class="green">30</strong><div class="sub">of 60</div></article><article class="value-card"><small>Total run</small><strong>30</strong><div class="sub">This plan year</div></article><article class="value-card"><small>Current plan</small><strong style="font-size:17px">Elite</strong><div class="sub">Team credits enabled</div></article><article class="value-card"><small>Most used</small><strong style="font-size:15px">Position Fit</strong><div class="sub">14 runs</div></article></section>
 <section class="panel"><div class="panel-head"><h3>Prediction history</h3><button class="btn sm">Export history</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Player</th><th>Team</th><th>Prediction type</th><th>Date run</th><th>Result summary</th><th></th></tr></thead><tbody>${rows.concat(rows).map(x=>`<tr><td><b>${x[0]}</b></td><td>${x[1]}</td><td><span class="pill blue">${x[2]}</span></td><td>${x[3]}</td><td>${x[4]}</td><td><button class="btn sm">View player</button></td></tr>`).join("")}</tbody></table></div></section>
 <section class="grid4"><div class="panel"><div class="panel-head"><h3>Position fit</h3></div><div class="panel-body"><p style="font-size:8px;color:var(--muted)">Test current, future or target roles.</p></div></div><div class="panel"><div class="panel-head"><h3>Attribute development</h3></div><div class="panel-body"><p style="font-size:8px;color:var(--muted)">Model a chosen development focus.</p></div></div><div class="panel"><div class="panel-head"><h3>ROI analysis</h3></div><div class="panel-body"><p style="font-size:8px;color:var(--muted)">Explore value and budget scenarios.</p></div></div><div class="panel"><div class="panel-head"><h3>Match scenario</h3></div><div class="panel-body"><p style="font-size:8px;color:var(--muted)">Test role-specific tactical situations.</p></div></div></section></main>`;return shell("predictions","Predictions",body,m)
}
function exportsPage(m){
 const body=`<main class="content">${hero("Scout dossiers","Export decision-ready player reports.","Create consistent PDFs for internal review, team meetings and recruitment conversations without rebuilding the evidence manually.",`<button class="btn primary">Find players</button><button class="btn">Export settings</button>`)}
 <section class="value-strip"><article class="value-card"><small>Exports remaining</small><strong class="green">296</strong><div class="sub">of 300</div></article><article class="value-card"><small>Total exports</small><strong>4</strong><div class="sub">This plan year</div></article><article class="value-card"><small>Current plan</small><strong style="font-size:17px">Elite</strong><div class="sub">Team export access</div></article><article class="value-card"><small>Most recent</small><strong style="font-size:15px">11 Jul</strong><div class="sub">Richdhin Inaba dossier</div></article></section>
 <section class="panel"><div class="panel-head"><div><h3>Export usage</h3><span style="font-size:7px;color:var(--muted)">4 of 300 used</span></div><span class="pill green">296 remaining</span></div><div class="panel-body"><div class="progress"><span style="width:2%"></span></div></div></section>
 <section class="panel"><div class="panel-head"><h3>Export history</h3><button class="btn sm">Find players</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Player</th><th>Team</th><th>Source</th><th>Export type</th><th>Date</th><th></th></tr></thead><tbody>${[["Richdhin Inaba","Northgate United","Prediction","PDF","11 Jul 2026"],["Richdhin Inaba","Northgate United","Profile","PDF","11 Jul 2026"],["Kai Jones","Eastbrook Athletic","Profile","PDF","4 Jul 2026"],["Kai Jones","Eastbrook Athletic","Profile","PDF","2 Jul 2026"]].map(x=>`<tr><td><b>${x[0]}</b></td><td>${x[1]}</td><td>${x[2]}</td><td><span class="pill red">${x[3]}</span></td><td>${x[4]}</td><td><button class="btn sm">Re-download</button></td></tr>`).join("")}</tbody></table></div></section>
 <section class="grid3"><div class="panel"><div class="panel-head"><h3>Profile dossier</h3></div><div class="panel-body"><p style="font-size:8px;color:var(--muted)">Profile, evidence, attributes, value and compatibility.</p></div></div><div class="panel"><div class="panel-head"><h3>Prediction report</h3></div><div class="panel-body"><p style="font-size:8px;color:var(--muted)">Prediction inputs, result, caveats and role analysis.</p></div></div><div class="panel"><div class="panel-head"><h3>Team branding</h3></div><div class="panel-body"><p style="font-size:8px;color:var(--muted)">Use approved scout-team and organisation context.</p></div></div></section></main>`;return shell("exports","Exports",body,m)
}

function comparePage(m){
 const attrs=[["Technical",92,91],["Tactical IQ",88,90],["Physical",93,87],["Match output",75,70],["Need fit",90,88],["Role fit",64,64],["Formation fit",80,68],["Evidence fit",85,82]];
 const body=`<main class="content">${hero("Side-by-side decision support","Compare players without losing context.","Select two players, see the trade-offs clearly and finish with a recommendation tied to your scout setup.",`<button class="btn primary">Start new comparison</button>`)}
 <section class="panel"><div class="panel-head"><h3>Select two players to compare</h3><span class="pill grey">All players or pipeline only</span></div><div class="panel-body"><div class="compare-select"><div><div class="control">Search Louis Murphy…</div><div class="control" style="margin-top:7px">Louis Murphy · U17 RW · Meadow Park Rovers ▾</div></div><div><div class="control">Search Jordan Blake…</div><div class="control" style="margin-top:7px">Jordan Blake · U18 CB · Harbour City Academy ▾</div></div></div></div></section>
 <section class="panel"><div class="panel-head"><h3>Player comparison</h3><span style="font-size:7px;color:var(--muted)">Evidence and fit shown side by side</span></div><div class="panel-body"><div class="compare-columns"><div class="compare-card"><div class="compare-player"><div class="avatar">LM</div><strong>68.0</strong><h4>Louis Murphy</h4><p>U17 · RW · Meadow Park Rovers</p><button class="btn sm" style="margin-top:8px">View profile</button></div>${[["Transfer value","£369k"],["Compatibility","79"],["Appearances","14"],["Goals per game","1.07"],["Assists per game","0.36"],["Clean sheets","0.00"],["Yellow cards","2"],["Red cards","0"]].map(x=>`<div class="compare-fact"><span>${x[0]}</span><b>${x[1]}</b></div>`).join("")}<div class="progress-list" style="margin-top:12px">${attrs.map(x=>`<div class="progress-row"><span>${x[0]}</span><div class="progress"><span style="width:${x[1]}%"></span></div><b>${x[1]}</b></div>`).join("")}</div></div>
 <div class="compare-card"><div class="compare-player"><div class="avatar">JB</div><strong>71.0</strong><h4>Jordan Blake</h4><p>U18 · CB · Harbour City Academy</p><button class="btn sm" style="margin-top:8px">View profile</button></div>${[["Transfer value","£93k"],["Compatibility","77"],["Appearances","11"],["Goals per game","0.00"],["Assists per game","0.27"],["Clean sheets","0.55"],["Yellow cards","3"],["Red cards","0"]].map(x=>`<div class="compare-fact"><span>${x[0]}</span><b>${x[1]}</b></div>`).join("")}<div class="progress-list" style="margin-top:12px">${attrs.map(x=>`<div class="progress-row"><span>${x[0]}</span><div class="progress orange"><span style="width:${x[2]}%"></span></div><b>${x[2]}</b></div>`).join("")}</div></div></div></div></section>
 <section class="panel"><div class="panel-head"><h3>Scout recommendation</h3><span class="pill green">Based on team weaknesses</span></div><div class="panel-body"><div class="recommendation"><b>Jordan Blake is the stronger immediate fit.</b> Louis Murphy leads on need fit, formation fit and evidence strength, while Jordan offers the cleaner cost-to-fit case for the current weaknesses.</div><div class="grid4" style="margin-top:10px"><div class="result-card"><small>Need fit</small><b>Louis 90 vs 88</b></div><div class="result-card"><small>Role fit</small><b>64 vs 64</b></div><div class="result-card"><small>Formation fit</small><b>Louis 80 vs 68</b></div><div class="result-card"><small>Evidence fit</small><b>Louis 85 vs 82</b></div></div><div style="display:flex;gap:7px;margin-top:10px"><button class="btn primary">Add recommended player</button><button class="btn">Export comparison</button></div></div></section></main>`;return shell("compare","Compare Players",body,m)
}
function setupPage(m){
 const body=`<main class="content">${hero("Compatibility configuration","Tell ScoutLink what your team needs.","Your setup shapes search ranking, compatibility and recommendations, so each choice should be clear and easy to review.")}
 <section class="panel"><div class="panel-head"><h3>Scout profile</h3><span class="pill green">Saved to your user</span></div><div class="panel-body"><div class="form-grid"><div class="field"><label>Team name</label><div class="control">ScoutLink Demo Recruitment Team</div></div><div class="field"><label>Club / organisation</label><div class="control">Stratex Demo FC</div></div><div class="field"><label>Scout country</label><div class="control">England ▾</div></div><div class="field"><label>Scout region</label><div class="control">London ▾</div></div><div class="field"><label>Formation</label><div class="control">4-3-3 ▾</div></div><div class="field"><label>Playing style</label><div class="control">Tiki-Taka ▾</div></div></div></div></section>
 <section class="panel"><div class="panel-head"><h3>Team weaknesses looking to be solved</h3><span class="pill grey">Select up to 3</span></div><div class="panel-body"><div class="check-grid">${["Insufficient Game Pace and Speed","Physical Fragility and Injury Risk","Lack of Physical Presence","Weak Defensive Base","Poor Defensive Output","Low Team Chemistry and Leadership","Technical Deficiencies Under Pressure","Tactical Awareness Gaps","Poor Goal Output"].map((x,i)=>`<div class="check-card ${[0,5,7].includes(i)?'active':''}">${[0,5,7].includes(i)?'✓':'□'} ${x}</div>`).join("")}</div></div></section>
 <section class="panel"><div class="panel-head"><h3>Role expectations</h3><span class="pill grey">Select up to 3</span></div><div class="panel-body"><div class="check-grid">${["Aerial Dominance","Vision and Creativity","Speed and Agility","Tactical Intelligence","Ball Retention Under Pressure","Physical Resilience Work Rate","Defensive Impact","Offensive Impact","Progression and Carrying","Leadership and Communication"].map((x,i)=>`<div class="check-card ${[1,3,9].includes(i)?'active':''}">${[1,3,9].includes(i)?'✓':'□'} ${x}</div>`).join("")}</div></div></section>
 <section class="panel"><div class="panel-head"><h3>Long-term goals</h3><span class="pill grey">Select up to 3</span></div><div class="panel-body"><div class="check-grid">${["Physical Growth Potential","Tactical Role Maturity","Leadership and Coachability","Injury Risk and Physical Resilience","Positional Depth Advantage","Goal Contribution Potential","Financial Viability"].map((x,i)=>`<div class="check-card ${[1,4,6].includes(i)?'active':''}">${[1,4,6].includes(i)?'✓':'□'} ${x}</div>`).join("")}</div></div></section>
 <section class="panel"><div class="panel-head"><h3>Search preferences</h3></div><div class="panel-body"><div class="field"><label>Age groups</label><div class="filter-pills" style="margin-top:5px">${["U6","U7","U8","U9","U10","U11","U12","U13","U14","U15","U16"].map((x,i)=>`<button class="filter-pill ${i===10?'active':''}">${x}</button>`).join("")}</div></div><div class="field" style="margin-top:10px"><label>Preferred positions</label><div class="filter-pills" style="margin-top:5px">${["GK","CB","RB","LB","RWB","LWB","CDM","CM","CAM","LM","RM","LW","RW","ST"].map((x,i)=>`<button class="filter-pill ${[0,1,8,13].includes(i)?'active':''}">${x}</button>`).join("")}</div></div><div class="form-grid" style="margin-top:10px"><div class="field"><label>Salary cap (GBP/week)</label><div class="control">500000</div></div><div class="field"><label>Minimum appearances</label><div class="control">3</div></div></div></div></section>
 <div class="setup-footer"><button class="btn ghost" style="color:#cbd5e1;border-color:rgba(255,255,255,.15)">Cancel</button><button class="btn primary">Save and apply</button></div></main>`;return shell("setup","Scout setup",body,m)
}
function eventsPage(m){
 const body=`<main class="content">${hero("ScoutLink showcases","Discover players in a live football setting.","Events should help scouts prepare quickly, understand who is attending and move relevant players into the recruitment workflow.",`<button class="btn primary">View all events</button><button class="btn">Event notifications</button>`)}
 <section class="panel"><div class="panel-head"><div><h3>Upcoming showcase events</h3><span style="font-size:7px;color:var(--muted)">Events where you can scout elite youth players</span></div><span class="pill grey">0 upcoming</span></div><div class="panel-body"><div class="empty-state"><div class="empty-icon">🏟</div><h4>No events available yet</h4><p>Check back soon or enable event notifications.</p><button class="btn primary sm">Turn on alerts</button></div></div></section>
 <section class="grid3"><div class="panel"><div class="panel-head"><h3>What you will see</h3></div><div class="panel-body"><p style="font-size:8px;color:var(--muted)">Event format, venue, age groups, attending teams and available player profiles.</p></div></div><div class="panel"><div class="panel-head"><h3>Build an event shortlist</h3></div><div class="panel-body"><p style="font-size:8px;color:var(--muted)">Save players before the event and take structured notes afterwards.</p></div></div><div class="panel"><div class="panel-head"><h3>After the event</h3></div><div class="panel-body"><p style="font-size:8px;color:var(--muted)">Move players into your pipeline, compare them and contact coaches.</p></div></div></section></main>`;return shell("events","Showcase Events",body,m)
}
function chatPage(m){
 const body=`<main class="content" style="padding-bottom:${m?'78px':'20px'}"><section class="panel" style="margin-top:0"><div class="chat-layout"><aside class="conversation-list"><div class="conversation-head"><h3>Conversations</h3><button class="btn sm">Refresh</button></div><div class="conversation active"><div class="user-avatar">MR</div><div><b>Marcus Reed</b><span>Reuben Hughes · Northgate United</span></div></div><div class="conversation"><div class="user-avatar">OK</div><div><b>Owen Kelly</b><span>Jayden Wood · Southvale Juniors</span></div></div></aside><section class="thread"><div class="thread-head"><div><b>Marcus Reed</b><div style="font-size:7px;color:var(--muted)">Reuben Hughes · Northgate United</div></div><button class="btn sm">View player</button></div><div style="padding:10px;background:#fff;border-bottom:1px solid var(--line);display:grid;grid-template-columns:.7fr 1fr auto;gap:7px"><div class="control">Player ▾</div><div class="control">Select player ▾</div><button class="btn sm">Share</button></div><div class="messages"><div class="bubble mine">Shared fixture: Brookfield Athletic<div class="shared-card"><b>Brookfield Athletic</b><div style="font-size:7px;color:var(--muted)">11 Jul · Away · Northgate training ground</div></div></div><div class="bubble">Thanks</div><div class="bubble mine">Shared player: Reuben Hughes<div class="shared-card"><b>Reuben Hughes · ST</b><div style="font-size:7px;color:var(--muted)">U18 · Stage: Interested · Overall 85</div><button class="btn sm" style="margin-top:6px">Open profile</button></div></div><div class="bubble mine">Shared player: Carter Hill<div class="shared-card"><b>Carter Hill · ST</b><div style="font-size:7px;color:var(--muted)">U16 · Stage: Shortlisted · Overall 78</div></div></div><div class="bubble">Great thanks for sharing</div><div class="bubble mine">What?</div></div><div class="composer"><div class="control">Write a message…</div><button class="btn primary">Send</button></div></section></div></section></main>`;return shell("chat","Chat",body,m)
}
function notificationsPage(m){
 const body=`<main class="content">${hero("Scout activity","Only the updates that need your attention.","Player, coach, pipeline, fixture and system activity grouped so important actions are easy to spot.",`<button class="btn">Mark all read</button>`)}
 <div class="filter-pills" style="margin:12px 0">${["All","Messages","Scout interest","Match facts","Recruitment","Fixtures / Events","System"].map((x,i)=>`<button class="filter-pill ${i===0?'active':''}">${x}</button>`).join("")}</div>
 <section class="notification-list"><article class="notification unread"><div class="notification-icon">CH</div><div><b>New message from Marcus Reed.</b><p>Conversation about Carter Hill.</p></div><time>17 days ago</time></article><article class="notification unread"><div class="notification-icon">CH</div><div><b>New message from Marcus Reed.</b><p>Conversation about Reuben Hughes.</p></div><time>19 days ago</time></article><article class="notification"><div class="notification-icon">PL</div><div><b>Freddie Foster added to prediction history.</b><p>Position fit projection completed.</p></div><time>Today</time></article><article class="notification"><div class="notification-icon">FX</div><div><b>Pipeline fixture updated.</b><p>One tracked player has a new fixture.</p></div><time>Yesterday</time></article><article class="notification"><div class="notification-icon">EX</div><div><b>Profile dossier ready.</b><p>Your export for Kai Jones is available.</p></div><time>2 days ago</time></article></section></main>`;return shell("notifications","Notifications",body,m)
}
function concernPage(m){
 const body=`<main class="content">${hero("Scout trust route","Report a concern.","Raise inappropriate contact, suspected misuse, inaccurate player access or another platform-safety issue through a dedicated route.")}
 <section class="panel"><div class="panel-body"><div class="recommendation" style="background:#fff0f1;border-color:#f0c8cd;color:#8d2431"><b>Immediate danger or urgent safeguarding risk:</b> contact emergency services or the relevant safeguarding authority before submitting a platform concern.</div><div class="form-grid" style="margin-top:10px"><div class="field"><label>Concern type</label><div class="control">Select category ▾</div></div><div class="field"><label>Urgency</label><div class="control">Select urgency ▾</div></div><div class="field"><label>Related player</label><div class="control">Optional player ▾</div></div><div class="field"><label>Related coach or account</label><div class="control">Optional account ▾</div></div><div class="field" style="grid-column:1/-1"><label>What happened?</label><div class="control" style="height:90px;align-items:flex-start;padding-top:10px">Provide dates, people involved and the clearest useful context.</div></div><div class="field" style="grid-column:1/-1"><label>Supporting file</label><div class="control" style="height:95px;justify-content:center">Upload optional screenshot, image or document</div></div></div><div style="display:flex;justify-content:flex-end;gap:7px;margin-top:10px"><button class="btn">Save draft</button><button class="btn dark">Submit concern</button></div></div></section>
 <section class="grid4"><div class="value-card"><small>1. Submitted</small><strong style="font-size:15px">Recorded</strong><div class="sub">Stored securely</div></div><div class="value-card"><small>2. Reviewed</small><strong style="font-size:15px">Triaged</strong><div class="sub">Risk assessed</div></div><div class="value-card"><small>3. Actioned</small><strong style="font-size:15px">Escalated</strong><div class="sub">Access may be restricted</div></div><div class="value-card"><small>4. Follow-up</small><strong style="font-size:15px">Contacted</strong><div class="sub">More context requested</div></div></section></main>`;return shell("concern","Report a Concern",body,m)
}
function settingsPage(m){
 const body=`<main class="content">${hero("Scout account","Settings.","Manage your account, appearance, notifications, security, team access and ScoutLink plan preferences.")}
 <section class="settings-layout" style="margin-top:12px"><nav class="settings-nav"><div class="settings-link active">Account</div><div class="settings-link">Appearance</div><div class="settings-link">Notifications</div><div class="settings-link">Team</div><div class="settings-link">Security</div><div class="settings-link">Plan</div></nav><div>
 <section class="setting-section"><h3>Account details</h3><p>Information connected to your ScoutLink scout account.</p><div class="setting-row"><div><b>Name</b><span>Noah Patel</span></div><button class="btn sm">Edit</button></div><div class="setting-row"><div><b>Email</b><span>noah.patel@example.com</span></div><button class="btn sm">Change</button></div><div class="setting-row"><div><b>Role</b><span>Reviewed Scout</span></div><span class="pill green">Active</span></div></section>
 <section class="setting-section"><h3>Appearance</h3><p>Choose how ScoutLink appears for your account.</p><div class="setting-row"><div><b>Theme</b><span>System preference</span></div><div><button class="btn sm">Dark</button> <button class="btn primary sm">Light</button></div></div></section>
 <section class="setting-section"><h3>Notification preferences</h3><p>Control how ScoutLink activity reaches you.</p><div class="setting-row"><div><b>Email notifications</b><span>Player, coach and pipeline updates</span></div><div class="toggle on"></div></div><div class="setting-row"><div><b>In-app notifications</b><span>See alerts inside ScoutLink</span></div><div class="toggle on"></div></div><div class="setting-row"><div><b>Event notifications</b><span>New showcase and fixture alerts</span></div><div class="toggle on"></div></div><div class="setting-row"><div><b>Platform updates</b><span>Feature announcements</span></div><div class="toggle"></div></div></section>
 <section class="setting-section"><h3>Team and plan</h3><p>Current organisation, plan and usage controls.</p><div class="setting-row"><div><b>Scout team</b><span>ScoutLink Demo Recruitment Team</span></div><button class="btn sm">Manage</button></div><div class="setting-row"><div><b>Club / organisation</b><span>Stratex Demo FC</span></div><button class="btn sm">Edit</button></div><div class="setting-row"><div><b>Plan</b><span>Elite</span></div><button class="btn sm">View limits</button></div></section>
 <section class="setting-section"><h3>Security</h3><p>Protect your ScoutLink account.</p><div class="setting-row"><div><b>Change password</b><span>Minimum 8 characters</span></div><button class="btn sm">Change</button></div><div class="setting-row"><div><b>Active sessions</b><span>2 devices</span></div><button class="btn sm">Review</button></div></section>
 <section class="setting-section"><h3>Scout setup</h3><p>Configure team weaknesses, role expectations, long-term goals and search preferences.</p><button class="btn primary">Go to Scout Setup</button></section></div></section></main>`;return shell("settings","Settings",body,m)
}
const renderers={confirm:confirmPage,dashboard:dashboardPage,search:searchPage,profile:profilePage,pipeline:pipelinePage,rankings:rankingsPage,fixtures:fixturesPage,predictions:predictionsPage,exports:exportsPage,compare:comparePage,setup:setupPage,events:eventsPage,chat:chatPage,notifications:notificationsPage,concern:concernPage,settings:settingsPage};

'use strict';

(function () {

/* The functions above this block are copied directly from the supplied
   Scout Experience design board. The live layer below preserves those
   structures and connects them to the existing ScoutLink APIs. */

const LIVE_PATHS = {
  confirm:'/confirm-password',
  dashboard:'/scout/dashboard',
  search:'/scout/player-search',
  profile:'/player/profile',
  pipeline:'/scout/pipeline',
  rankings:'/scout/rankings',
  fixtures:'/scout/fixtures',
  predictions:'/scout/predictions',
  exports:'/scout/exports',
  compare:'/scout/compare-players',
  setup:'/scout/setup',
  events:'/scout/events',
  chat:'/scout/chat',
  notifications:'/scout/notifications',
  concern:'/scout/report-a-concern',
  settings:'/scout/settings'
};

const LIVE_TITLES = {
  confirm:'Confirm Password & Setup',
  dashboard:'Scout workspace',
  search:'Player Database',
  profile:'Player profile',
  pipeline:'My Pipeline',
  rankings:'Player rankings',
  fixtures:'Fixtures',
  predictions:'Predictions',
  exports:'Exports',
  compare:'Compare Players',
  setup:'Scout setup',
  events:'Showcase Events',
  chat:'Chat',
  notifications:'Notifications',
  concern:'Report a Concern',
  settings:'Settings'
};

const LIVE_WEAKNESSES = [
  'Insufficient Game Pace and Speed',
  'Physical Fragility and Injury Risk',
  'Lack of Physical Presence',
  'Weak Defensive Base',
  'Poor Defensive Output',
  'Low Team Chemistry and Leadership',
  'Technical Deficiencies Under Pressure',
  'Tactical Awareness Gaps',
  'Poor Goal Output'
];

const LIVE_ROLES = [
  'Aerial Dominance',
  'Vision and Creativity',
  'Speed and Agility',
  'Tactical Intelligence',
  'Ball Retention Under Pressure',
  'Physical Resilience Work Rate',
  'Defensive Impact',
  'Offensive Impact',
  'Progression and Carrying',
  'Leadership and Communication'
];

const LIVE_GOALS = [
  'Physical Growth Potential',
  'Tactical Role Maturity',
  'Leadership and Coachability',
  'Injury Risk and Physical Resilience',
  'Positional Depth Advantage',
  'Goal Contribution Potential',
  'Financial Viability'
];

const LIVE_AGES = [
  'U7','U8','U9','U10','U11','U12','U13','U14','U15','U16'
];

const LIVE_POSITIONS = [
  'GK','CB','RB','LB','RWB','LWB','CDM','CM','CAM','LM','RM','LW','RW','ST'
];

const LIVE_FORMATIONS = [
  '4-4-2','4-3-3','3-5-2','5-3-2','4-2-3-1','4-1-4-1',
  '4-5-1','3-4-3','3-4-2-1','4-1-2-1-2','4-4-1-1',
  '3-6-1','4-2-2-2','5-4-1'
];

const LIVE_STYLES = [
  'Possession-Based Play','Counter-Attacking','High Press','Low Block',
  'Direct Play','Wing Play','Tiki-Taka','Gegenpressing',
  'Build-Up from the Back','Long Ball','Total Football',
  'Compact Defence','Vertical Play'
];

const LIVE_REGIONS = {
  England:[
    'London','Greater Manchester','Liverpool','West Yorkshire',
    'West Midlands','Nottingham','Bristol','Southampton',
    'Newcastle','Sheffield','Leeds','Other'
  ],
  Scotland:['Glasgow','Edinburgh','Aberdeen','Dundee','Inverness','Other'],
  Wales:['Cardiff','Swansea','Newport','Wrexham','Other'],
  'Northern Ireland':['Belfast','Derry/Londonderry','Lisburn','Newry','Other'],
  Ireland:['Dublin','Cork','Galway','Limerick','Other'],
  'United States':['New York','Los Angeles','Chicago','Dallas','Miami','Atlanta','Other'],
  France:['Paris','Lyon','Marseille','Lille','Nice','Other'],
  Spain:['Madrid','Barcelona','Valencia','Seville','Bilbao','Other'],
  Germany:['Berlin','Munich','Hamburg','Dortmund','Frankfurt','Other'],
  Netherlands:['Amsterdam','Rotterdam','Eindhoven','Utrecht','Other'],
  Portugal:['Lisbon','Porto','Braga','Faro','Other']
};

const liveState = {
  route:'',
  mobile:false,
  profile:null,
  setup:null,
  pipeline:[],
  players:[],
  selectedPlayer:null,
  comparePlayers:[],
  comparePipelineIds:[],
  chats:[],
  activeChat:null,
  chatShare:{ player:[], fixture:[], prediction:[] },
  notifications:[],
  settingsSection:'account',
  searchMode:'table',
  searchResults:[],
  searchTotal:0,
  searchLocations:[],
  fixtureMonth:new Date(),
  confirm:{
    authenticated:false,
    token:'',
    values:{},
    weaknesses:[],
    roles:[],
    goals:[],
    ages:[],
    positions:[]
  }
};

function liveEsc(value) {
  return String(value == null ? '' : value).replace(
    /[&<>"']/g,
    function (char) {
      return {
        '&':'&amp;',
        '<':'&lt;',
        '>':'&gt;',
        '"':'&quot;',
        "'":'&#39;'
      }[char];
    }
  );
}

function liveNum(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function liveScore(value) {
  const number = liveNum(value);
  const scaled = number > 0 && number <= 10 ? number * 10 : number;
  return Math.max(0,Math.min(100,Math.round(scaled)));
}

function liveMoney(value) {
  const number = liveNum(value);
  if (!number) return '—';
  if (number >= 1000000) return '£' + (number / 1000000).toFixed(2) + 'm';
  if (number >= 1000) return '£' + Math.round(number / 1000) + 'k';
  return '£' + Math.round(number).toLocaleString('en-GB');
}

function liveDate(value,options) {
  if (!value) return '—';
  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) return '—';

  return dateValue.toLocaleDateString(
    'en-GB',
    options || {day:'2-digit',month:'short',year:'numeric'}
  );
}

function liveDateTime(value) {
  if (!value) return '—';
  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) return '—';

  return dateValue.toLocaleString(
    'en-GB',
    {
      day:'2-digit',
      month:'short',
      year:'numeric',
      hour:'2-digit',
      minute:'2-digit'
    }
  );
}

function liveRelative(value) {
  if (!value) return '';
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return '';

  const seconds = Math.max(0,Math.floor((Date.now() - time) / 1000));

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
  if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';

  return liveDate(value);
}

function liveInitials(firstName,lastName) {
  return (
    String(firstName || '').trim().charAt(0) +
    String(lastName || '').trim().charAt(0)
  ).toUpperCase() || 'SL';
}

function livePlayerName(player) {
  return [
    player && player.first_name,
    player && player.last_name
  ].filter(Boolean).join(' ') || 'Player';
}

function livePlayerPosition(player) {
  return (
    player &&
    (
      player.specific_position ||
      player.primary_position ||
      player.position_group
    )
  ) || 'Position TBC';
}

function liveAgeGroup(player) {
  return (
    player &&
    (
      player.age_group ||
      (player.age ? 'U' + player.age : '')
    )
  ) || 'Age group TBC';
}

function liveStage(value) {
  return String(value || 'watching')
    .replace(/_/g,' ')
    .replace(/\b\w/g,function (char) {
      return char.toUpperCase();
    });
}

function liveStagePill(value) {
  const stage = String(value || 'watching').toLowerCase();
  const color = /approach|trial|negotiat/.test(stage)
    ? 'green'
    : /shortlist|interest/.test(stage)
      ? 'gold'
      : 'blue';

  return '<span class="pill ' + color + '">' +
    liveEsc(liveStage(stage)) +
  '</span>';
}

function liveAuthUser() {
  try {
    return window.Auth && Auth.user ? Auth.user : {};
  } catch (_) {
    return {};
  }
}

function liveToken() {
  try {
    return window.Auth && Auth.token
      ? Auth.token
      : localStorage.getItem('sl_token') || '';
  } catch (_) {
    return '';
  }
}

async function liveApi(method,path,body) {
  if (typeof window.api === 'function') {
    return window.api(method,path,body);
  }

  const headers = {};
  const token = liveToken();

  if (token) headers.Authorization = 'Bearer ' + token;
  if (body !== undefined && body !== null) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(
    (localStorage.getItem('sl_api_url') ||
      'https://scoutlink-api.vercel.app') + path,
    {
      method,
      headers,
      body:
        body === undefined || body === null
          ? undefined
          : JSON.stringify(body),
      credentials:'include'
    }
  );

  const data = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.message ||
      'The request could not be completed.'
    );
  }

  return data;
}

function liveTrack(name,properties) {
  try {
    if (
      window.heap &&
      typeof window.heap.track === 'function'
    ) {
      window.heap.track(name,properties || {});
    }
  } catch (_) {}
}

function liveGo(path) {
  window.location.assign(path);
}

function liveDownload(filename,mime,contentBase64) {
  const binary = atob(contentBase64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  const blob = new Blob([bytes],{type:mime});
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(function () {
    URL.revokeObjectURL(url);
  },1000);
}

function liveCsv(filename,rows) {
  const content = rows.map(function (row) {
    return row.map(function (cell) {
      return '"' +
        String(cell == null ? '' : cell).replace(/"/g,'""') +
      '"';
    }).join(',');
  }).join('\n');

  const blob = new Blob([content],{
    type:'text/csv;charset=utf-8'
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(function () {
    URL.revokeObjectURL(url);
  },1000);
}

function liveToast(message,type) {
  document.querySelectorAll('.scout-live-toast').forEach(function (node) {
    node.remove();
  });

  const toast = document.createElement('div');
  toast.className = 'scout-live-toast' +
    (type === 'error' ? ' error' : '');
  toast.setAttribute('role',type === 'error' ? 'alert' : 'status');
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(function () {
    toast.remove();
  },4200);
}

function liveModal(title,body) {
  const backdrop = document.createElement('div');
  backdrop.className = 'scout-live-modal-backdrop';
  backdrop.innerHTML =
    '<section class="scout-live-modal" role="dialog" ' +
      'aria-modal="true" aria-label="' + liveEsc(title) + '">' +
      '<header class="scout-live-modal-head">' +
        '<h3>' + liveEsc(title) + '</h3>' +
        '<button class="btn sm" type="button" data-close-live-modal>' +
          'Close</button>' +
      '</header>' +
      '<div class="scout-live-modal-body">' + body + '</div>' +
    '</section>';

  document.body.appendChild(backdrop);

  const close = function () {
    backdrop.remove();
  };

  backdrop.addEventListener('click',function (event) {
    if (
      event.target === backdrop ||
      event.target.closest('[data-close-live-modal]')
    ) {
      close();
    }
  });

  document.addEventListener(
    'keydown',
    function escapeHandler(event) {
      if (event.key === 'Escape') {
        close();
        document.removeEventListener('keydown',escapeHandler);
      }
    }
  );

  return backdrop;
}

function liveLoading(copy) {
  return '<div class="loading-state-live">' +
    '<div class="live-spinner" aria-hidden="true"></div>' +
    '<span>' + liveEsc(copy || 'Loading ScoutLink data…') + '</span>' +
  '</div>';
}

function liveError(copy,retryId) {
  return '<div class="error-state-live">' +
    '<b>Something went wrong</b>' +
    '<span style="margin-top:6px">' + liveEsc(copy) + '</span>' +
    (retryId
      ? '<button class="btn sm" type="button" id="' +
        liveEsc(retryId) +
        '" style="margin-top:10px">Try again</button>'
      : '') +
  '</div>';
}

function livePanelByTitle(title) {
  const wanted = String(title || '').trim().toLowerCase();

  return Array.from(
    document.querySelectorAll('.panel-head h3')
  ).find(function (heading) {
    return heading.textContent.trim().toLowerCase() === wanted;
  })?.closest('.panel') || null;
}

function liveButtons(label) {
  const wanted = String(label || '').trim().toLowerCase();

  return Array.from(
    document.querySelectorAll('button,.btn')
  ).filter(function (button) {
    return button.textContent.trim().toLowerCase() === wanted;
  });
}

function liveOn(label,handler) {
  liveButtons(label).forEach(function (button) {
    button.addEventListener('click',handler);
  });
}

function liveOptionList(values,current,placeholder) {
  let html = placeholder
    ? '<option value="">' + liveEsc(placeholder) + '</option>'
    : '';

  html += values.map(function (value) {
    return '<option value="' + liveEsc(value) + '"' +
      (String(value) === String(current || '') ? ' selected' : '') +
      '>' + liveEsc(value) + '</option>';
  }).join('');

  return html;
}

function liveRouteId() {
  const declared = document.body.getAttribute('data-scout-route');

  if (declared && renderers[declared]) return declared;
  if (declared === 'confirm') return 'confirm';

  const path = window.location.pathname
    .replace(/\/+$/,'')
    .toLowerCase();

  const map = {
    '/confirm-password':'confirm',
    '/scout/dashboard':'dashboard',
    '/scout/player-search':'search',
    '/player/profile':'profile',
    '/scout/pipeline':'pipeline',
    '/scout/rankings':'rankings',
    '/scout/fixtures':'fixtures',
    '/scout/predictions':'predictions',
    '/scout/exports':'exports',
    '/scout/compare-players':'compare',
    '/scout/setup':'setup',
    '/scout/events':'events',
    '/scout/chat':'chat',
    '/scout/notifications':'notifications',
    '/scout/report-a-concern':'concern',
    '/scout/settings':'settings'
  };

  return map[path] || '';
}

function liveNavRoute(id) {
  if (id === 'profile') return 'search';
  return id;
}

function liveUserLabel() {
  const user = liveAuthUser();

  return [
    user.firstName,
    user.lastName
  ].filter(Boolean).join(' ') || 'ScoutLink Scout';
}

function livePlanLabel() {
  const scout = liveState.profile && liveState.profile.scout;
  const team = liveState.profile && liveState.profile.scoutTeam;

  return String(
    (team && team.subscription_plan) ||
    (scout && scout.subscription_plan) ||
    'Scout'
  );
}

/* Replace the board-only navigation with real links while preserving
   the exact board classes and dimensions. */
side = function (active) {
  return '<aside class="sidebar">' +
    '<div class="side-logo">' +
      '<a class="logo" href="' + LIVE_PATHS.dashboard + '">' +
        'Scout<span>Link</span>' +
      '</a>' +
    '</div>' +
    '<nav class="side-nav" aria-label="Scout workspace">' +
      navGroups.map(function (group) {
        return '<div class="nav-label">' + liveEsc(group[0]) + '</div>' +
          group[1].map(function (item) {
            return '<a class="side-link ' +
              (active === item[0] ? 'active' : '') +
              '" href="' + liveEsc(LIVE_PATHS[item[0]]) + '">' +
              '<span class="side-icon">' + liveEsc(item[2]) + '</span>' +
              liveEsc(item[1]) +
            '</a>';
          }).join('');
      }).join('') +
    '</nav>' +
    '<button class="side-user" type="button" data-global-user ' +
      'style="width:100%;background:#fff;border-left:0;border-right:0;border-bottom:0;text-align:left;cursor:pointer">' +
      '<div class="user-avatar">' +
        liveEsc(liveInitials(
          liveAuthUser().firstName,
          liveAuthUser().lastName
        )) +
      '</div>' +
      '<div><b data-live-user-name>' + liveEsc(liveUserLabel()) + '</b>' +
        '<span data-live-user-role>Reviewed Scout · ' +
          liveEsc(livePlanLabel()) +
        '</span></div>' +
    '</button>' +
  '</aside>';
};

mobileTop = function (title) {
  return '<header class="mobile-top">' +
    '<a class="logo" href="' + LIVE_PATHS.dashboard + '">' +
      'Scout<span>Link</span>' +
    '</a>' +
    '<b style="font-size:11px">' + liveEsc(title) + '</b>' +
    '<button class="btn sm" type="button" data-global-menu ' +
      'aria-expanded="false">Menu</button>' +
  '</header>';
};

mobileBottom = function (active) {
  const links = [
    ['dashboard','⌂','Home'],
    ['search','⌕','Search'],
    ['pipeline','♡','Pipeline'],
    ['chat','◫','Chat'],
    ['settings','⚙','More']
  ];

  return '<nav class="mobile-bottom" aria-label="Scout mobile navigation">' +
    links.map(function (item) {
      return '<a class="bottom-link ' +
        (active === item[0] ? 'active' : '') +
        '" href="' + LIVE_PATHS[item[0]] + '">' +
        '<i>' + item[1] + '</i>' +
        liveEsc(item[2]) +
      '</a>';
    }).join('') +
  '</nav>';
};

shell = function (active,title,body,mobile) {
  return '<div class="scout-page">' +
    (mobile ? mobileTop(title) : side(active)) +
    '<section class="workspace">' +
      (mobile
        ? ''
        : '<header class="workspace-top">' +
            '<h1>' + liveEsc(title) + '</h1>' +
            '<div class="top-actions">' +
              '<button class="btn sm" type="button" data-global-team>' +
                'Scout team</button>' +
              '<button class="btn sm" type="button" data-global-notifications>' +
                'Notifications</button>' +
              '<button class="btn sm scout-live-user-menu-anchor" ' +
                'type="button" data-global-user>' +
                liveEsc(liveUserLabel()) +
              '</button>' +
            '</div>' +
          '</header>') +
      body +
    '</section>' +
    (mobile ? mobileBottom(active) : '') +
  '</div>';
};

function liveUpdateUserLabels() {
  document.querySelectorAll('[data-live-user-name]').forEach(function (node) {
    node.textContent = liveUserLabel();
  });

  document.querySelectorAll('[data-live-user-role]').forEach(function (node) {
    node.textContent = 'Reviewed Scout · ' + livePlanLabel();
  });

  document.querySelectorAll('[data-global-user]').forEach(function (node) {
    if (node.classList.contains('side-user')) return;
    node.textContent = liveUserLabel();
  });
}

function liveUserMenu(anchor) {
  document.querySelectorAll('.scout-live-popover').forEach(function (node) {
    node.remove();
  });

  const rect = anchor.getBoundingClientRect();
  const popover = document.createElement('div');
  popover.className = 'scout-live-popover';
  popover.style.top = Math.round(rect.bottom + 6) + 'px';
  popover.style.left = Math.max(12,Math.round(rect.right - 225)) + 'px';
  popover.innerHTML =
    '<a href="' + LIVE_PATHS.settings + '">Account settings</a>' +
    '<a href="' + LIVE_PATHS.setup + '">Scout setup</a>' +
    '<button type="button" data-live-signout>Sign out</button>';

  document.body.appendChild(popover);

  popover.querySelector('[data-live-signout]')
    .addEventListener('click',function () {
      try {
        if (window.Auth) Auth.clear();
      } catch (_) {}
      liveGo('/login?logout=1');
    });

  setTimeout(function () {
    document.addEventListener(
      'click',
      function closeMenu(event) {
        if (!popover.contains(event.target) && event.target !== anchor) {
          popover.remove();
          document.removeEventListener('click',closeMenu);
        }
      }
    );
  },0);
}

function liveMobileDrawer(button) {
  let drawer = document.querySelector('.scout-mobile-drawer');

  if (!drawer) {
    drawer = document.createElement('div');
    drawer.className = 'scout-mobile-drawer';
    drawer.innerHTML = '<nav class="side-nav" aria-label="All Scout pages">' +
      navGroups.map(function (group) {
        return '<div class="nav-label">' + liveEsc(group[0]) + '</div>' +
          group[1].map(function (item) {
            return '<a class="side-link" href="' +
              liveEsc(LIVE_PATHS[item[0]]) + '">' +
              '<span class="side-icon">' + liveEsc(item[2]) + '</span>' +
              liveEsc(item[1]) +
            '</a>';
          }).join('');
      }).join('') +
      '<div class="nav-label">Session</div>' +
      '<button class="side-link" type="button" data-live-mobile-signout ' +
        'style="width:100%;border:0;background:#fff;cursor:pointer">' +
        '<span class="side-icon">SO</span>Sign out</button>' +
    '</nav>';

    document.body.appendChild(drawer);

    drawer.querySelector('[data-live-mobile-signout]')
      .addEventListener('click',function () {
        try {
          if (window.Auth) Auth.clear();
        } catch (_) {}
        liveGo('/login?logout=1');
      });
  }

  const open = drawer.classList.toggle('open');
  button.setAttribute('aria-expanded',open ? 'true' : 'false');
  button.textContent = open ? 'Close' : 'Menu';
}

function liveBindGlobalActions() {
  document.querySelectorAll('[data-global-team]').forEach(function (button) {
    button.addEventListener('click',function () {
      liveGo(LIVE_PATHS.settings + '#team');
    });
  });

  document.querySelectorAll('[data-global-notifications]').forEach(
    function (button) {
      button.addEventListener('click',function () {
        liveGo(LIVE_PATHS.notifications);
      });
    }
  );

  document.querySelectorAll('[data-global-user]').forEach(function (button) {
    button.addEventListener('click',function () {
      liveUserMenu(button);
    });
  });

  document.querySelectorAll('[data-global-menu]').forEach(function (button) {
    button.addEventListener('click',function () {
      liveMobileDrawer(button);
    });
  });

  const navigationActions = {
    'find players':LIVE_PATHS.search,
    'explore players':LIVE_PATHS.search,
    'browse players':LIVE_PATHS.search,
    'find a player':LIVE_PATHS.search,
    'review new players':LIVE_PATHS.search,
    'view all new players':LIVE_PATHS.search,
    'open pipeline':LIVE_PATHS.pipeline,
    'open decision queue':LIVE_PATHS.pipeline,
    'review pipeline':LIVE_PATHS.pipeline,
    'compare players':LIVE_PATHS.compare,
    'start new comparison':LIVE_PATHS.compare,
    'pipeline settings':LIVE_PATHS.setup,
    'edit setup':LIVE_PATHS.setup,
    'go to scout setup':LIVE_PATHS.setup,
    'view all events':LIVE_PATHS.events,
    'event notifications':LIVE_PATHS.settings + '#notifications',
    'turn on alerts':LIVE_PATHS.settings + '#notifications',
    'export settings':LIVE_PATHS.settings + '#plan'
  };

  Array.from(document.querySelectorAll('button')).forEach(function (button) {
    const label = button.textContent.trim().toLowerCase();
    const destination = navigationActions[label];

    if (destination && !button.dataset.liveBound) {
      button.dataset.liveBound = '1';
      button.addEventListener('click',function () {
        liveGo(destination);
      });
    }
  });

  liveOn('How predictions work',function () {
    liveModal(
      'How ScoutLink predictions work',
      '<p class="compact-copy" style="font-size:10px">' +
        'ScoutLink predictions are deterministic decision-support estimates ' +
        'based on coach ratings, match facts, physical profile and the saved ' +
        'scout setup. They are not guarantees.' +
      '</p>'
    );
  });
}

async function liveLoadProfile() {
  if (liveState.profile) return liveState.profile;

  liveState.profile = await liveApi('GET','/api/scouts/profile');
  liveUpdateUserLabels();
  return liveState.profile;
}

function liveNewPlayerCard(player,index) {
  const score = liveScore(
    player.compatibilityScore ||
    player.compatibility_score
  );

  const breakdown =
    player.compatibilityBreakdown ||
    player.compatibility_breakdown ||
    {};

  const reason =
    breakdown.strongestReason ||
    breakdown.summary ||
    (
      score >= 80
        ? 'Strong compatibility with the current recruitment brief'
        : 'Relevant profile for deeper evidence review'
    );

  return '<article class="new-player-card">' +
    '<div class="new-player-top">' +
      '<div class="avatar professional">' +
        liveEsc(liveInitials(player.first_name,player.last_name)) +
      '</div>' +
      '<span class="confidence ' + (score >= 80 ? 'high' : '') + '">' +
        score + '%' +
      '</span>' +
    '</div>' +
    '<h4>' + liveEsc(livePlayerName(player)) + '</h4>' +
    '<p>' + liveEsc(livePlayerPosition(player)) + ' · ' +
      liveEsc(liveAgeGroup(player)) + ' · ' +
      liveEsc(player.team_name || 'Team not supplied') +
    '</p>' +
    '<div class="why-match">' + liveEsc(reason) + '</div>' +
    '<div class="new-player-foot">' +
      '<span>' +
        liveEsc(
          player.created_at
            ? 'Added ' + liveRelative(player.created_at)
            : 'Recommended now'
        ) +
      '</span>' +
      '<button class="btn sm" type="button" data-player-profile="' +
        liveEsc(player.id) + '">Review</button>' +
    '</div>' +
  '</article>';
}

function liveBindProfileLinks(root) {
  (root || document).querySelectorAll('[data-player-profile]')
    .forEach(function (button) {
      button.addEventListener('click',function () {
        liveGo(
          LIVE_PATHS.profile +
          '?id=' +
          encodeURIComponent(button.getAttribute('data-player-profile'))
        );
      });
    });
}

async function liveHydrateDashboard() {
  const results = await Promise.allSettled([
    liveLoadProfile(),
    liveApi('GET','/api/scouts/players-count'),
    liveApi('GET','/api/scouts/pipeline?limit=100'),
    liveApi('GET','/api/scouts/recommended-players?limit=5'),
    liveApi('GET','/api/predictions'),
    liveApi('GET','/api/scouts/exports'),
    liveApi('GET','/api/scouts/fixtures'),
    liveApi('GET','/api/scouts/setup')
  ]);

  const profile = results[0].status === 'fulfilled'
    ? results[0].value
    : {};

  const playersCount = results[1].status === 'fulfilled'
    ? liveNum(results[1].value.count)
    : 0;

  const pipeline = results[2].status === 'fulfilled'
    ? results[2].value.data || []
    : [];

  const recommendations = results[3].status === 'fulfilled'
    ? results[3].value.data || []
    : [];

  const predictions = results[4].status === 'fulfilled'
    ? results[4].value
    : {};

  const exportsData = results[5].status === 'fulfilled'
    ? results[5].value
    : {};

  const fixtures = results[6].status === 'fulfilled'
    ? results[6].value.data || []
    : [];

  const setupData = results[7].status === 'fulfilled'
    ? results[7].value
    : {};

  liveState.pipeline = pipeline;
  liveState.setup = setupData;

  const due = pipeline.filter(function (row) {
    const stage = String(row.stage || '').toLowerCase();
    const changed = new Date(
      row.updated_at ||
      row.created_at ||
      Date.now()
    ).getTime();

    return (
      /approach|interest|trial/.test(stage) &&
      Date.now() - changed > 48 * 60 * 60 * 1000
    );
  });

  const cards = document.querySelectorAll('.value-strip .value-card strong');

  if (cards[0]) cards[0].textContent = recommendations.length;
  if (cards[1]) cards[1].textContent = due.length;
  if (cards[2]) cards[2].textContent = pipeline.length;

  const scout = profile.scout || {};
  const scoutTeam = profile.scoutTeam || {};
  const plan = scoutTeam.subscription_plan ||
    scout.subscription_plan ||
    predictions.plan ||
    exportsData.plan ||
    'Core';

  const predictionLimit = liveNum(predictions.planLimit);
  const predictionUsed = liveNum(predictions.teamUsed);
  const predictionPct = predictionLimit
    ? Math.round(predictionUsed / predictionLimit * 100)
    : 0;

  if (cards[3]) {
    cards[3].textContent =
      plan + ' · ' + predictionPct + '%';
  }

  const newGrid = document.querySelector('.new-player-grid');

  if (newGrid) {
    newGrid.innerHTML = recommendations.length
      ? recommendations.map(liveNewPlayerCard).join('')
      : '<div class="professional-empty" style="grid-column:1/-1;padding:18px">' +
          '<b>No new matching players yet</b>' +
          '<span>Complete or update Scout Setup to improve recommendations.</span>' +
          '<button class="btn sm" type="button" ' +
            'onclick="location.href=\'' + LIVE_PATHS.setup + '\'" ' +
            'style="margin-top:9px">Edit setup</button>' +
        '</div>';

    liveBindProfileLinks(newGrid);
  }

  const decisionPanel = livePanelByTitle('Decision queue');
  const decisionList = decisionPanel &&
    decisionPanel.querySelector('.decision-list');

  if (decisionList) {
    const decisionRows = (due.length ? due : pipeline.slice(0,3));

    decisionList.innerHTML = decisionRows.length
      ? decisionRows.map(function (row,index) {
          const player = row.players || row.player || {};

          return '<div class="decision-row">' +
            '<div><b>' + liveEsc(livePlayerName(player)) + '</b>' +
              '<span>' +
                liveEsc(
                  due.indexOf(row) >= 0
                    ? 'Pipeline follow-up is overdue'
                    : 'Review the current ' + liveStage(row.stage) + ' stage'
                ) +
              '</span></div>' +
            '<div><span class="status-dot ' +
              (due.indexOf(row) >= 0 ? 'urgent' : '') +
              '"></span>' +
              '<button class="btn sm" type="button" data-dashboard-decision="' +
                liveEsc(row.id) + '">' +
                (index === 0 && due.indexOf(row) >= 0 ? 'Follow up' : 'Review') +
              '</button></div>' +
          '</div>';
        }).join('')
      : '<div class="professional-empty">' +
          '<b>No decisions are overdue</b>' +
          '<span>The current recruitment pipeline has no immediate follow-up.</span>' +
        '</div>';

    decisionList.querySelectorAll('[data-dashboard-decision]')
      .forEach(function (button) {
        button.addEventListener('click',function () {
          liveGo(
            LIVE_PATHS.pipeline +
            '?focus=' +
            encodeURIComponent(button.dataset.dashboardDecision)
          );
        });
      });
  }

  const briefPanel = livePanelByTitle('Recruitment brief coverage');
  const briefGrid = briefPanel && briefPanel.querySelector('.brief-grid');
  const prefs = setupData.preferences || {};
  const positions = prefs.preferredPositions || [];
  const roleExpectations = prefs.roleExpectations || [];

  if (briefGrid) {
    const signals = []
      .concat(positions.slice(0,2))
      .concat(roleExpectations.slice(0,1));

    briefGrid.innerHTML = signals.length
      ? signals.map(function (signal,index) {
          const relevant = recommendations.filter(function (player) {
            const position = String(livePlayerPosition(player)).toUpperCase();
            return position.indexOf(String(signal).toUpperCase()) >= 0;
          }).length;

          const percentage = Math.max(
            18,
            Math.min(100,Math.round(
              (relevant || Math.max(1,recommendations.length - index)) /
              Math.max(1,recommendations.length) * 100
            ))
          );

          return '<div class="brief-item">' +
            '<span>' + liveEsc(signal) + '</span>' +
            '<b>' + relevant + ' relevant</b>' +
            '<div class="coverage ' + (percentage < 40 ? 'low' : '') + '">' +
              '<i style="width:' + percentage + '%"></i>' +
            '</div>' +
            '<small>' +
              (percentage >= 70
                ? 'Strong coverage'
                : percentage >= 40
                  ? 'Moderate coverage'
                  : 'Limited evidence') +
            '</small>' +
          '</div>';
        }).join('')
      : '<div class="professional-empty">' +
          '<b>No recruitment brief saved</b>' +
          '<span>Scout Setup controls compatibility, recommendations and coverage.</span>' +
        '</div>';
  }

  const topPanel = livePanelByTitle('Top current fit');

  if (topPanel) {
    const body = topPanel.querySelector('.panel-body');
    const topPlayer = recommendations[0];

    body.innerHTML = topPlayer
      ? '<span class="quiet-label">Highest-confidence recommendation</span>' +
        '<h4 class="compact-title">' +
          liveEsc(livePlayerName(topPlayer)) +
        '</h4>' +
        '<p class="compact-copy">' +
          liveScore(topPlayer.compatibilityScore) +
          '% compatibility with ' +
          liveEsc(livePlayerPosition(topPlayer)) +
          ' evidence.</p>' +
        '<button class="btn primary sm" type="button" ' +
          'data-player-profile="' + liveEsc(topPlayer.id) +
          '" style="margin-top:9px">Open player</button>'
      : '<div class="professional-empty">' +
          '<b>No recommendation available</b>' +
          '<span>New recommendations appear after setup and player evidence are available.</span>' +
        '</div>';

    liveBindProfileLinks(body);
  }

  const usagePanel = livePanelByTitle('Usage and limits');

  if (usagePanel) {
    const interestLimit = liveNum(
      scoutTeam.interests_limit ||
      scout.interests_remaining +
        pipeline.length
    ) || 300;

    const interestUsed = Math.max(
      0,
      interestLimit - liveNum(scout.interests_remaining)
    );

    const exportLimit = liveNum(exportsData.planLimit);
    const exportUsed = liveNum(exportsData.teamUsed);

    usagePanel.querySelector('.panel-body').innerHTML =
      '<div class="progress-list">' +
        liveUsageRow('Interest requests',interestUsed,interestLimit,'') +
        liveUsageRow('Exports',exportUsed,exportLimit,'blue') +
        liveUsageRow('Predictions',predictionUsed,predictionLimit,'gold') +
      '</div>';
  }

  const fixturePanel = livePanelByTitle('Fixture readiness');

  if (fixturePanel) {
    const body = fixturePanel.querySelector('.panel-body');

    body.innerHTML = fixtures.length
      ? '<div class="match-list">' +
          fixtures.slice(0,3).map(function (fixture) {
            return '<div class="match-row">' +
              '<div><b>' +
                liveEsc(
                  (fixture.home_or_away === 'Away' ? '@ ' : 'vs ') +
                  (fixture.opponent || 'Fixture')
                ) +
              '</b><span>' +
                liveDate(fixture.fixture_date) +
                ' · ' +
                liveEsc(fixture.venue || fixture.city || 'Venue TBC') +
              '</span></div>' +
              '<a class="btn sm" href="' + LIVE_PATHS.fixtures + '">' +
                'Plan visit</a>' +
            '</div>';
          }).join('') +
        '</div>'
      : '<div class="professional-empty">' +
          '<b>No tracked fixtures published</b>' +
          '<span>Fixture alerts appear when coaches publish schedules for pipeline players.</span>' +
          '<a class="btn sm" href="' + LIVE_PATHS.pipeline +
            '" style="margin-top:9px">Review pipeline</a>' +
        '</div>';
  }

  liveTrack('scout_exact_dashboard_loaded',{
    playerCount:playersCount,
    pipelineCount:pipeline.length,
    recommendationCount:recommendations.length
  });
}

function liveUsageRow(label,used,limit,color) {
  if (!limit || limit >= 99999) {
    return '<div class="progress-row"><span>' +
      liveEsc(label) +
      '</span><div class="progress ' + liveEsc(color) +
      '"><span style="width:0%"></span></div><b>Unlimited</b></div>';
  }

  const percentage = Math.max(
    0,
    Math.min(100,Math.round(used / limit * 100))
  );

  return '<div class="progress-row"><span>' +
    liveEsc(label) +
    '</span><div class="progress ' + liveEsc(color) +
    '"><span style="width:' + percentage + '%"></span></div><b>' +
    used + '/' + limit + '</b></div>';
}

function liveSearchStorage(name,defaultValue) {
  try {
    const value = JSON.parse(localStorage.getItem(name) || 'null');
    return value || defaultValue;
  } catch (_) {
    return defaultValue;
  }
}

function liveStoreSearch(name,value) {
  try {
    localStorage.setItem(name,JSON.stringify(value));
  } catch (_) {}
}

function liveSearchFormMarkup() {
  return '<form id="livePlayerSearchForm">' +
    '<div class="search-grid">' +
      '<input class="control" id="liveSearchName" name="search" ' +
        'placeholder="Search player name…" aria-label="Search player name">' +
      '<select class="control" id="liveSearchPosition" name="position" ' +
        'aria-label="Position">' +
        liveOptionList(
          [
            'Goalkeeper','Defender','Midfielder','Forward',
            'GK','CB','RB','LB','RWB','LWB','CDM','CM','CAM',
            'LM','RM','LW','RW','ST'
          ],
          '',
          'All positions'
        ) +
      '</select>' +
      '<input class="control" id="liveSearchMinAge" name="minAge" ' +
        'type="number" min="7" max="16" placeholder="Min age" ' +
        'aria-label="Minimum age">' +
      '<select class="control" id="liveSearchLocation" name="city" ' +
        'aria-label="Location">' +
        liveOptionList(liveState.searchLocations,'','All locations') +
      '</select>' +
      '<input class="control" id="liveSearchMaxAge" name="maxAge" ' +
        'type="number" min="7" max="16" placeholder="Max age" ' +
        'aria-label="Maximum age">' +
      '<select class="control" id="liveSearchSort" name="sort" ' +
        'aria-label="Sort results">' +
        '<option value="compatibility">Most compatible</option>' +
        '<option value="overall">Highest overall</option>' +
        '<option value="newest">Newest players</option>' +
        '<option value="value_low">Lowest value</option>' +
      '</select>' +
      '<button class="btn primary" type="submit">Search</button>' +
    '</div>' +
    '<div class="filter-pills" style="margin-top:9px">' +
      '<span class="pill green" id="liveSearchCount">0 players found</span>' +
      '<button class="filter-pill" type="button" data-live-save-search>' +
        'Save this search</button>' +
      '<button class="filter-pill active" type="button" ' +
        'data-live-quick="best">Best fit</button>' +
      '<button class="filter-pill" type="button" ' +
        'data-live-quick="confidence">High confidence</button>' +
      '<button class="filter-pill" type="button" ' +
        'data-live-quick="video">Available video</button>' +
    '</div>' +
  '</form>';
}

function liveRenderSearchRows() {
  const panel = livePanelByTitle('Player database');
  if (!panel) return;

  const wrap = panel.querySelector('.table-wrap') ||
    panel.querySelector('.panel-body');

  const players = liveState.searchResults || [];

  if (!players.length) {
    wrap.innerHTML =
      '<div class="empty-state">' +
        '<div class="empty-icon">⌕</div>' +
        '<h4>No players matched this search</h4>' +
        '<p>Change one or more filters and run the search again.</p>' +
      '</div>';
    return;
  }

  if (liveState.searchMode === 'cards') {
    wrap.innerHTML =
      '<div class="grid3" style="padding:14px">' +
        players.map(function (player) {
          return '<article class="analysis-card">' +
            '<div class="player-cell">' +
              '<div class="avatar professional">' +
                liveEsc(liveInitials(
                  player.first_name,
                  player.last_name
                )) +
              '</div>' +
              '<div><b>' + liveEsc(livePlayerName(player)) + '</b>' +
                '<span>' +
                  liveEsc(livePlayerPosition(player)) + ' · ' +
                  liveEsc(liveAgeGroup(player)) +
                '</span></div>' +
            '</div>' +
            '<div class="metric-grid" style="margin-top:10px">' +
              '<div class="metric-box"><b>' +
                liveScore(player.compatibilityScore) +
                '%</b><span>Compatibility</span></div>' +
              '<div class="metric-box"><b>' +
                liveScore(player.overall_rating) +
                '</b><span>Overall</span></div>' +
              '<div class="metric-box"><b>' +
                liveMoney(player.transfer_value) +
                '</b><span>Value</span></div>' +
            '</div>' +
            '<button class="btn primary block" type="button" ' +
              'data-player-profile="' + liveEsc(player.id) +
              '" style="margin-top:10px">View profile</button>' +
          '</article>';
        }).join('') +
      '</div>';

    liveBindProfileLinks(wrap);
    return;
  }

  wrap.innerHTML =
    '<table class="table">' +
      '<thead><tr>' +
        '<th>Player</th><th>Position</th><th>Age</th>' +
        '<th>Location</th><th>Height</th><th>Build</th>' +
        '<th>Club</th><th>Compatibility</th><th>Overall</th><th></th>' +
      '</tr></thead>' +
      '<tbody>' +
        players.map(function (player) {
          const location = [
            player.team_city,
            player.team_county,
            player.city
          ].find(Boolean) || '—';

          return '<tr>' +
            '<td><div class="player-cell">' +
              '<div class="avatar professional">' +
                liveEsc(liveInitials(
                  player.first_name,
                  player.last_name
                )) +
              '</div>' +
              '<div><b>' + liveEsc(livePlayerName(player)) + '</b>' +
                '<span>' + liveEsc(player.team_name || 'Team TBC') +
                '</span></div>' +
            '</div></td>' +
            '<td>' + liveEsc(livePlayerPosition(player)) + '</td>' +
            '<td>' + liveEsc(liveAgeGroup(player).replace(/^U/,'')) + '</td>' +
            '<td>' + liveEsc(location) + '</td>' +
            '<td><span class="pill blue">' +
              liveEsc(player.height_category || 'Not set') +
            '</span></td>' +
            '<td>' + liveEsc(player.build_category || 'Not set') + '</td>' +
            '<td>' + liveEsc(player.team_name || '—') + '</td>' +
            '<td><b>' + liveScore(player.compatibilityScore) + '%</b></td>' +
            '<td><b>' + liveScore(player.overall_rating) + '</b></td>' +
            '<td><button class="btn sm" type="button" ' +
              'data-player-profile="' + liveEsc(player.id) +
              '">View profile</button></td>' +
          '</tr>';
        }).join('') +
      '</tbody>' +
    '</table>';

  liveBindProfileLinks(wrap);
}

function liveRenderSavedSearches() {
  const saved = liveSearchStorage('scout_saved_searches_v3',[]);
  const recent = liveSearchStorage('scout_recent_searches_v3',[]);

  const savedPanel = livePanelByTitle('Saved searches');
  const recentPanel = livePanelByTitle('Recent searches');

  function rows(items,kind) {
    return items.length
      ? '<div class="match-list">' +
          items.slice(0,3).map(function (item,index) {
            return '<div class="match-row">' +
              '<div><b>' +
                liveEsc(item.label || 'Player search') +
              '</b><span>' +
                liveEsc(item.summary || 'Saved ScoutLink filters') +
              '</span></div>' +
              '<button class="btn sm" type="button" data-run-' +
                kind + '-search="' + index + '">Run</button>' +
            '</div>';
          }).join('') +
        '</div>'
      : '<div class="professional-empty">' +
          '<b>No ' + kind + ' searches yet</b>' +
          '<span>Run a search to build this list.</span>' +
        '</div>';
  }

  if (savedPanel) {
    savedPanel.querySelector('.panel-body').innerHTML = rows(saved,'saved');
  }

  if (recentPanel) {
    recentPanel.querySelector('.panel-body').innerHTML = rows(recent,'recent');
  }

  document.querySelectorAll('[data-run-saved-search]')
    .forEach(function (button) {
      button.addEventListener('click',function () {
        liveApplyStoredSearch(
          saved[Number(button.dataset.runSavedSearch)]
        );
      });
    });

  document.querySelectorAll('[data-run-recent-search]')
    .forEach(function (button) {
      button.addEventListener('click',function () {
        liveApplyStoredSearch(
          recent[Number(button.dataset.runRecentSearch)]
        );
      });
    });
}

function liveApplyStoredSearch(item) {
  if (!item || !item.values) return;

  Object.keys(item.values).forEach(function (key) {
    const node = document.querySelector(
      '#livePlayerSearchForm [name="' + key + '"]'
    );

    if (node) node.value = item.values[key];
  });

  liveRunPlayerSearch();
}

async function liveRunPlayerSearch() {
  const form = document.getElementById('livePlayerSearchForm');
  const panel = livePanelByTitle('Player database');

  if (!form || !panel) return;

  const wrap = panel.querySelector('.table-wrap') ||
    panel.querySelector('.panel-body');

  wrap.innerHTML = liveLoading('Searching the ScoutLink player database…');

  const values = Object.fromEntries(new FormData(form).entries());
  const params = new URLSearchParams();

  params.set('limit','100');
  params.set('page','1');

  if (values.search) params.set('search',values.search);
  if (values.position) {
    const position = String(values.position);
    if (
      ['Goalkeeper','Defender','Midfielder','Forward']
        .indexOf(position) >= 0
    ) {
      params.set('posGroup',position);
    } else {
      params.set('specificPos',position);
    }
  }
  if (values.minAge) params.set('minAge',values.minAge);
  if (values.maxAge) params.set('maxAge',values.maxAge);
  if (values.city) params.set('city',values.city);

  try {
    const response = await liveApi(
      'GET',
      '/api/players?' + params.toString()
    );

    let data = response.data || [];

    if (values.sort === 'overall') {
      data.sort(function (a,b) {
        return liveScore(b.overall_rating) - liveScore(a.overall_rating);
      });
    } else if (values.sort === 'newest') {
      data.sort(function (a,b) {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });
    } else if (values.sort === 'value_low') {
      data.sort(function (a,b) {
        return liveNum(a.transfer_value) - liveNum(b.transfer_value);
      });
    } else {
      data.sort(function (a,b) {
        return liveScore(b.compatibilityScore) -
          liveScore(a.compatibilityScore);
      });
    }

    liveState.searchResults = data;
    liveState.searchTotal = liveNum(response.total) || data.length;

    const count = document.getElementById('liveSearchCount');
    if (count) {
      count.textContent =
        liveState.searchTotal + ' players found';
    }

    const recent = liveSearchStorage('scout_recent_searches_v3',[]);
    const item = {
      label:values.search || values.position || 'Player search',
      summary:[
        values.position,
        values.city,
        values.minAge && values.maxAge
          ? values.minAge + '–' + values.maxAge
          : ''
      ].filter(Boolean).join(' · ') || 'All active players',
      values,
      runAt:new Date().toISOString()
    };

    liveStoreSearch(
      'scout_recent_searches_v3',
      [item].concat(recent).slice(0,8)
    );

    liveRenderSearchRows();
    liveRenderSavedSearches();

    liveTrack('scout_exact_player_search',{
      resultCount:liveState.searchTotal,
      position:values.position || '',
      city:values.city || ''
    });
  } catch (error) {
    wrap.innerHTML = liveError(
      error.message || 'The player search could not be completed.',
      'liveRetryPlayerSearch'
    );

    document.getElementById('liveRetryPlayerSearch')
      ?.addEventListener('click',liveRunPlayerSearch);
  }
}

async function liveHydrateSearch() {
  try {
    const locations = await liveApi('GET','/api/players/locations');
    const raw = locations.data || locations.locations || [];

    liveState.searchLocations = raw.map(function (item) {
      return typeof item === 'string'
        ? item
        : item.city || item.county || item.location;
    }).filter(Boolean);
  } catch (_) {
    liveState.searchLocations = [];
  }

  const firstPanel = document.querySelector('.content .panel');

  if (firstPanel) {
    firstPanel.querySelector('.panel-body').innerHTML =
      liveSearchFormMarkup();
  }

  const database = livePanelByTitle('Player database');

  if (database) {
    const controls = database.querySelector('.panel-head > div:last-child');

    if (controls) {
      controls.innerHTML =
        '<button class="btn sm" type="button" data-search-mode="cards">' +
          'Cards</button> ' +
        '<button class="btn primary sm" type="button" ' +
          'data-search-mode="table">Table</button>';
    }
  }

  document.getElementById('livePlayerSearchForm')
    ?.addEventListener('submit',function (event) {
      event.preventDefault();
      liveRunPlayerSearch();
    });

  document.querySelector('[data-live-save-search]')
    ?.addEventListener('click',function () {
      const form = document.getElementById('livePlayerSearchForm');
      const values = Object.fromEntries(new FormData(form).entries());
      const saved = liveSearchStorage('scout_saved_searches_v3',[]);

      liveStoreSearch(
        'scout_saved_searches_v3',
        [{
          label:values.search || values.position || 'Saved player search',
          summary:[
            values.position,
            values.city,
            values.minAge && values.maxAge
              ? values.minAge + '–' + values.maxAge
              : ''
          ].filter(Boolean).join(' · ') || 'All active players',
          values,
          savedAt:new Date().toISOString()
        }].concat(saved).slice(0,12)
      );

      liveToast('Search saved.');
      liveRenderSavedSearches();
    });

  document.querySelectorAll('[data-search-mode]')
    .forEach(function (button) {
      button.addEventListener('click',function () {
        liveState.searchMode = button.dataset.searchMode;

        document.querySelectorAll('[data-search-mode]')
          .forEach(function (item) {
            item.classList.toggle(
              'primary',
              item === button
            );
          });

        liveRenderSearchRows();
      });
    });

  document.querySelectorAll('[data-live-quick]')
    .forEach(function (button) {
      button.addEventListener('click',function () {
        const key = button.dataset.liveQuick;
        button.classList.toggle('active');

        if (key === 'best') {
          document.getElementById('liveSearchSort').value = 'compatibility';
        }

        liveRunPlayerSearch().then(function () {
          if (key === 'confidence' && button.classList.contains('active')) {
            liveState.searchResults = liveState.searchResults.filter(
              function (player) {
                return liveNum(player.appearances) >= 10;
              }
            );
          }

          if (key === 'video' && button.classList.contains('active')) {
            liveState.searchResults = liveState.searchResults.filter(
              function (player) {
                return (
                  liveNum(player.video_count) > 0 ||
                  player.has_video === true
                );
              }
            );
          }

          liveRenderSearchRows();
        });
      });
    });

  liveRenderSavedSearches();
  await liveRunPlayerSearch();

  liveOn('Run search',function () {
    document.getElementById('livePlayerSearchForm')
      ?.requestSubmit();
  });

  liveOn('Save search',function () {
    document.querySelector('[data-live-save-search]')
      ?.click();
  });

  liveButtons('Best fit')
    .filter(function (button) {
      return !button.hasAttribute('data-live-quick');
    })
    .forEach(function (button) {
      button.addEventListener('click',function () {
        liveState.searchResults.sort(function (a,b) {
          return liveScore(b.compatibilityScore) -
            liveScore(a.compatibilityScore);
        });
        liveRenderSearchRows();
      });
    });

  liveButtons('High confidence')
    .filter(function (button) {
      return !button.hasAttribute('data-live-quick');
    })
    .forEach(function (button) {
      button.addEventListener('click',function () {
        liveState.searchResults =
          liveState.searchResults.filter(function (player) {
            return liveNum(player.appearances) >= 10;
          });
        liveRenderSearchRows();
      });
    });

  liveOn('Under £250k',function () {
    liveState.searchResults =
      liveState.searchResults.filter(function (player) {
        return liveNum(player.transfer_value) > 0 &&
          liveNum(player.transfer_value) <= 250000;
      });
    liveRenderSearchRows();
  });

  liveButtons('Available video')
    .filter(function (button) {
      return !button.hasAttribute('data-live-quick');
    })
    .forEach(function (button) {
      button.addEventListener('click',function () {
        liveState.searchResults =
          liveState.searchResults.filter(function (player) {
            return liveNum(player.video_count) > 0 ||
              player.has_video === true;
          });
        liveRenderSearchRows();
      });
    });
}


function liveMetricBox(value,label) {
  return '<div class="metric-box"><b>' +
    liveEsc(value) +
    '</b><span>' + liveEsc(label) + '</span></div>';
}

function liveProgressRow(label,value,color) {
  const score = liveScore(value);

  return '<div class="progress-row">' +
    '<span>' + liveEsc(label) + '</span>' +
    '<div class="progress ' + liveEsc(color || '') + '">' +
      '<span style="width:' + score + '%"></span>' +
    '</div>' +
    '<b>' + score + '</b>' +
  '</div>';
}

function liveCompatibilityValue(analysis,key,fallback) {
  const compatibility = analysis.compatibility || {};
  const breakdown = analysis.compatibilityBreakdown || {};

  return liveScore(
    compatibility[key] !== undefined
      ? compatibility[key]
      : breakdown[key] !== undefined
        ? breakdown[key]
        : fallback
  );
}

function liveProfileActionModal(playerId) {
  const modal = liveModal(
    'Export player dossier',
    '<p class="compact-copy" style="font-size:9px">' +
      'Choose the live ScoutLink dossier format. This uses one export ' +
      'allowance unless the plan has unlimited exports.' +
    '</p>' +
    '<div class="page-actions" style="display:flex;margin-top:12px">' +
      '<button class="btn primary" type="button" data-live-export-format="PDF">' +
        'Download PDF</button>' +
      '<button class="btn" type="button" data-live-export-format="Excel">' +
        'Download Excel</button>' +
    '</div>' +
    '<div class="scout-live-form-message" id="liveExportMessage"></div>'
  );

  modal.querySelectorAll('[data-live-export-format]')
    .forEach(function (button) {
      button.addEventListener('click',async function () {
        const original = button.textContent;
        button.disabled = true;
        button.textContent = 'Preparing…';

        try {
          const response = await liveApi(
            'POST',
            '/api/exports/player',
            {
              playerId,
              format:button.dataset.liveExportFormat,
              source:'profile'
            }
          );

          liveDownload(
            response.filename,
            response.mime,
            response.contentBase64
          );

          const message = modal.querySelector('#liveExportMessage');
          message.className = 'scout-live-form-message success';
          message.textContent =
            'Dossier downloaded. ' +
            response.exportsRemaining +
            ' exports remain.';
        } catch (error) {
          const message = modal.querySelector('#liveExportMessage');
          message.className = 'scout-live-form-message error';
          message.textContent = error.message;
        } finally {
          button.disabled = false;
          button.textContent = original;
        }
      });
    });
}

function livePredictionResultBody(result,type) {
  const confidence =
    result.confidence &&
    (
      result.confidence.label ||
      result.confidence.score
    );

  const rows = [];

  Object.keys(result || {}).forEach(function (key) {
    if (
      [
        'disclaimer','message','evidence',
        'attributeEffectsByKey','seasons'
      ].indexOf(key) >= 0
    ) {
      return;
    }

    const value = result[key];

    if (
      value === null ||
      value === undefined ||
      typeof value === 'object'
    ) {
      return;
    }

    rows.push([
      key.replace(/([A-Z])/g,' $1').replace(/_/g,' '),
      value
    ]);
  });

  return '<span class="pill blue">' + liveEsc(type) + '</span>' +
    (confidence
      ? '<span class="pill green" style="margin-left:6px">' +
        liveEsc('Confidence ' + confidence) +
        '</span>'
      : '') +
    '<div class="grid2" style="margin-top:12px">' +
      rows.slice(0,12).map(function (row) {
        return '<div class="result-card"><small>' +
          liveEsc(row[0]) +
          '</small><b>' + liveEsc(row[1]) + '</b></div>';
      }).join('') +
    '</div>' +
    (result.message
      ? '<div class="recommendation" style="margin-top:10px">' +
        liveEsc(result.message) +
        '</div>'
      : '') +
    (result.disclaimer
      ? '<p class="compact-copy" style="margin-top:10px">' +
        liveEsc(result.disclaimer) +
        '</p>'
      : '');
}

async function liveRunPrediction(playerId,type,inputParams,button,onSuccess) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = 'Running…';

  try {
    const response = await liveApi(
      'POST',
      '/api/predictions/run',
      {
        playerId,
        predictionType:type,
        inputParams:inputParams || {}
      }
    );

    if (onSuccess) {
      onSuccess(response);
    } else {
      liveModal(
        type,
        livePredictionResultBody(response.result || {},type)
      );
    }

    liveToast(
      type + ' completed. ' +
      response.creditsRemaining +
      ' prediction credits remain.'
    );

    liveTrack('scout_prediction_run',{
      predictionType:type,
      playerId
    });
  } catch (error) {
    liveToast(error.message,'error');
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

function liveProfileAttributes(player) {
  return [
    ['Pace',player.pace],
    ['Agility',player.agility],
    ['Strength',player.strength],
    ['Stamina',player.stamina],
    ['Shooting',player.shooting],
    ['Passing',player.passing],
    ['Dribbling',player.dribbling],
    ['Defending',player.defending],
    ['Composure',player.composure],
    ['Crossing',player.crossing],
    ['Vision',player.vision],
    ['Positioning',player.positioning],
    ['Heading',player.heading],
    ['Tackling',player.tackling],
    ['Jumping',player.jumping]
  ];
}

function liveMatchResult(match) {
  if (
    match.team_score !== undefined &&
    match.opponent_score !== undefined
  ) {
    return match.team_score + '–' + match.opponent_score;
  }

  return match.result || match.score || '';
}

function liveHydrateProfileSections(data) {
  const player = data.player || {};
  const analysis = data.analysis || {};
  const matches = data.recentMatches || [];
  const fixtures = data.upcomingFixtures || [];
  const videos = data.videos || [];

  liveState.selectedPlayer = player;

  const avatar = document.querySelector('.profile-avatar');
  const name = document.querySelector('.profile-person h2');
  const meta = document.querySelector('.profile-person p');
  const profileScore = document.querySelector('.profile-score');

  if (avatar) {
    avatar.textContent = liveInitials(player.first_name,player.last_name);
  }

  if (name) name.textContent = livePlayerName(player);

  if (meta) {
    meta.textContent = [
      livePlayerPosition(player),
      liveAgeGroup(player),
      player.team_name
    ].filter(Boolean).join(' · ');
  }

  const pills = document.querySelector('.profile-person .filter-pills');

  if (pills) {
    const confidence =
      analysis.dataConfidence &&
      analysis.dataConfidence.label ||
      analysis.compatibilityBreakdown &&
      analysis.compatibilityBreakdown.dataConfidence ||
      'Evidence developing';

    pills.innerHTML =
      '<span class="pill green">Overall ' +
        liveScore(player.overall_rating) + '/100</span>' +
      '<span class="pill grey">' +
        liveEsc(player.foot || 'Foot not set') +
      '</span>' +
      '<span class="pill blue">' +
        liveEsc(confidence) +
      '</span>';
  }

  if (profileScore) {
    profileScore.innerHTML =
      '<b>' +
        liveScore(
          data.player.compatibilityScore ||
          analysis.compatibilityScore
        ) +
        '%</b>' +
      '<span>Compatibility score</span>' +
      '<strong>' +
        liveMoney(
          player.transfer_value ||
          analysis.transferValue
        ) +
      '</strong>' +
      '<span>Estimated transfer value</span>';
  }

  const actionContainer = document.querySelector(
    '.profile-person > div > div[style*="display:flex"]'
  );

  if (actionContainer) {
    const inPipeline = !!data.pipelineStatus;

    actionContainer.innerHTML =
      '<button class="btn primary" type="button" id="liveRegisterInterest"' +
        (inPipeline ? ' disabled' : '') + '>' +
        (inPipeline
          ? 'In pipeline · ' + liveStage(data.pipelineStatus)
          : 'Register interest') +
      '</button>' +
      '<button class="btn" type="button" id="liveProfileExport">' +
        'Export</button>' +
      '<button class="btn" type="button" id="liveProfileVideos">' +
        'Watch videos</button>';

    document.getElementById('liveRegisterInterest')
      ?.addEventListener('click',async function () {
        const button = this;

        if (!window.confirm(
          'Add ' + livePlayerName(player) + ' to your recruitment pipeline?'
        )) {
          return;
        }

        button.disabled = true;
        button.textContent = 'Adding…';

        try {
          const response = await liveApi(
            'POST',
            '/api/players/' + encodeURIComponent(player.id) +
              '/scout-interest',
            {
              interestLevel:7,
              notes:'Added from the exact Scout player profile.'
            }
          );

          button.textContent = response.alreadyInPipeline
            ? 'Already in pipeline'
            : 'In pipeline · Watching';

          liveToast(response.message || 'Player added to pipeline.');
        } catch (error) {
          button.disabled = false;
          button.textContent = 'Register interest';
          liveToast(error.message,'error');
        }
      });

    document.getElementById('liveProfileExport')
      ?.addEventListener('click',function () {
        liveProfileActionModal(player.id);
      });

    document.getElementById('liveProfileVideos')
      ?.addEventListener('click',function () {
        const body = videos.length
          ? '<div class="match-list">' +
              videos.map(function (video) {
                const url =
                  video.video_url ||
                  video.url ||
                  video.file_url ||
                  '';

                return '<div class="match-row">' +
                  '<div><b>' +
                    liveEsc(video.title || 'Video evidence') +
                  '</b><span>' +
                    liveEsc(video.category || 'Player video') +
                    (video.created_at
                      ? ' · ' + liveDate(video.created_at)
                      : '') +
                  '</span></div>' +
                  (url
                    ? '<a class="btn sm" target="_blank" rel="noopener" href="' +
                      liveEsc(url) + '">Open</a>'
                    : '<span class="pill grey">Unavailable</span>') +
                '</div>';
              }).join('') +
            '</div>'
          : '<div class="professional-empty">' +
              '<b>No approved video evidence</b>' +
              '<span>The coach has not published a video for this player yet.</span>' +
            '</div>';

        liveModal('Player video evidence',body);
      });
  }

  const threePanels = document.querySelectorAll(
    '.content > .grid3:nth-of-type(1) .panel'
  );

  if (threePanels[0]) {
    const body = threePanels[0].querySelector('.panel-body');
    body.innerHTML =
      '<small style="font-size:7px;color:var(--muted)">' +
        'Overall match performance</small>' +
      '<strong style="display:block;font-size:25px;color:var(--gold);margin-top:8px">' +
        liveScore(
          analysis.matchPerformanceRating ||
          player.overall_rating
        ) +
        '<span style="font-size:10px">/100</span></strong>' +
      '<span class="pill gold">' +
        (liveScore(player.overall_rating) >= 80
          ? 'Excellent'
          : liveScore(player.overall_rating) >= 65
            ? 'Strong'
            : 'Developing') +
      '</span>';
  }

  if (threePanels[1]) {
    const confidence =
      analysis.dataConfidence &&
      analysis.dataConfidence.label ||
      'Developing';

    threePanels[1].querySelector('.panel-body').innerHTML =
      '<small style="font-size:7px;color:var(--muted)">Data confidence</small>' +
      '<strong style="display:block;font-size:18px;color:var(--orange);margin-top:8px">' +
        liveEsc(confidence) +
      '</strong>' +
      '<p style="font-size:7px;color:var(--muted)">' +
        matches.length + ' recent match records loaded.</p>';
  }

  if (threePanels[2]) {
    threePanels[2].querySelector('.panel-body').innerHTML =
      '<small style="font-size:7px;color:var(--muted)">Evidence base</small>' +
      '<strong style="display:block;font-size:25px;margin-top:8px">' +
        liveNum(player.appearances || matches.length) +
      '</strong>' +
      '<p style="font-size:7px;color:var(--muted)">Recorded appearances</p>';
  }

  const breakdownPanel = livePanelByTitle('Overall rating breakdown');

  if (breakdownPanel) {
    const overall = analysis.overallBreakdown || {};
    const positionRatings = analysis.positionRatings || {};

    const breakdownValues = [
      ['Technical',overall.technical || overall.technicalProfile || player.passing],
      ['Tactical IQ',overall.tactical || overall.tacticalIQ || player.positioning],
      ['Physical profile',overall.physical || overall.physicalProfile || player.strength],
      ['Mental / coachability',overall.mental || overall.mentalCoachability || player.composure],
      ['Match output',overall.matchOutput || analysis.matchPerformanceRating || player.overall_rating],
      ['Discipline',overall.discipline || 100 - liveNum(player.yellow_cards) * 5],
      ['Availability',overall.availability || 88],
      ['Data confidence',
        analysis.dataConfidence && analysis.dataConfidence.score ||
        overall.dataConfidence ||
        Math.min(100,liveNum(player.appearances) * 8)
      ]
    ];

    breakdownPanel.querySelector('.panel-body').innerHTML =
      '<div class="grid4">' +
        '<div class="value-card"><small>Final score</small><strong>' +
          liveScore(player.overall_rating) +
          '/100</strong><div class="sub">Headline ScoutLink overall</div></div>' +
        '<div class="value-card"><small>Current readiness</small><strong>' +
          liveScore(overall.currentReadiness || player.overall_rating) +
          '/100</strong><div class="sub">How ready the player is now</div></div>' +
        '<div class="value-card"><small>Potential rating</small><strong>' +
          liveScore(overall.potentialRating || player.potential_rating || player.overall_rating) +
          '/100</strong><div class="sub">Development upside</div></div>' +
        '<div class="value-card"><small>Data confidence</small><strong style="font-size:17px">' +
          liveEsc(
            analysis.dataConfidence &&
            analysis.dataConfidence.label ||
            'Developing'
          ) +
          '</strong><div class="sub">Evidence strength</div></div>' +
      '</div>' +
      '<div class="grid2" style="margin-top:12px">' +
        '<div class="progress-list">' +
          breakdownValues.map(function (row,index) {
            return liveProgressRow(
              row[0],
              row[1],
              ['', 'cyan','blue','violet','gold','orange','','violet'][index]
            );
          }).join('') +
        '</div>' +
        '<div><div class="metric-grid">' +
          liveMetricBox(
            positionRatings.bestCurrentPosition || 'Run analysis',
            'Best current role'
          ).replace('<b>','<b class="role-gated">') +
          liveMetricBox(
            positionRatings.bestFuturePosition || 'Run analysis',
            'Best future role'
          ).replace('<b>','<b class="role-gated">') +
          liveMetricBox(
            positionRatings.bestCurrentScore || '—',
            'Role fit score'
          ).replace('<b>','<b class="role-gated">') +
        '</div>' +
        '<button class="btn primary block" style="margin-top:9px" ' +
          'type="button" data-scroll-position-fit>Run position fit</button>' +
      '</div></div>';
  }

  const compatibilityPanel = livePanelByTitle('Compatibility intelligence');

  if (compatibilityPanel) {
    const score = liveScore(
      player.compatibilityScore ||
      analysis.compatibilityScore
    );

    const headerScore = compatibilityPanel.querySelector(
      '.panel-head strong'
    );

    if (headerScore) {
      headerScore.textContent =
        score + '% · ' +
        (score >= 80 ? 'Excellent fit' : score >= 65 ? 'Strong fit' : 'Review fit');
    }

    const categories = [
      ['Need fit',liveCompatibilityValue(analysis,'needFit','weaknessFit')],
      ['Role fit',liveCompatibilityValue(analysis,'roleFit')],
      ['Tactical style',liveCompatibilityValue(analysis,'tacticalStyleFit','styleFit')],
      ['Formation fit',liveCompatibilityValue(analysis,'formationPositionFit','formationFit')],
      ['Development pathway',liveCompatibilityValue(analysis,'developmentPathwayFit','goalsFit')],
      ['Match evidence',liveScore(
        analysis.matchPerformanceRating ||
        player.overall_rating
      )],
      ['Financial fit',liveCompatibilityValue(analysis,'financialFit')]
    ];

    compatibilityPanel.querySelector('.panel-body').innerHTML =
      '<div class="compat-grid">' +
        categories.map(function (row,index) {
          return '<div class="compat-item">' +
            '<span>' + liveEsc(row[0]) + '</span>' +
            '<b>' + row[1] + '</b>' +
            '<div class="progress ' +
              ['', '', 'blue','violet','gold','orange',''][index] +
              '" style="margin-top:7px">' +
              '<span style="width:' + row[1] + '%"></span>' +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
      '<div class="recommendation" style="margin-top:10px">' +
        liveEsc(
          analysis.recommendation ||
          analysis.compatibility &&
          analysis.compatibility.recommendation ||
          (
            score >= 75
              ? 'Prioritise for deeper evidence review and coach conversation.'
              : 'Review the evidence against the current recruitment brief before progressing.'
          )
        ) +
      '</div>';
  }

  const valuePanel = livePanelByTitle('Value analysis');

  if (valuePanel) {
    const valueAnalysis = analysis.valueAnalysis || {};
    const valueHeading = valuePanel.querySelector('.panel-head strong');

    if (valueHeading) {
      valueHeading.textContent = liveMoney(
        player.transfer_value ||
        analysis.transferValue
      );
    }

    const factors =
      valueAnalysis.factors ||
      valueAnalysis.adjustments ||
      [];

    valuePanel.querySelector('.panel-body').innerHTML =
      '<div class="value-analysis">' +
        '<div class="analysis-card"><small>Affordability</small><h4>' +
          liveEsc(
            valueAnalysis.affordabilityLabel ||
            valueAnalysis.affordability ||
            'Review against budget'
          ) +
        '</h4></div>' +
        '<div class="analysis-card"><small>Risk label</small><h4>' +
          liveEsc(valueAnalysis.riskLabel || 'Balanced risk') +
        '</h4></div>' +
        '<div class="analysis-card"><small>Position group</small><h4>' +
          liveEsc(player.position_group || livePlayerPosition(player)) +
        '</h4></div>' +
      '</div>' +
      '<div class="factor-list">' +
        (
          Array.isArray(factors) && factors.length
            ? factors.slice(0,8).map(function (factor) {
                return '<div class="factor"><b>' +
                  liveEsc(factor.label || factor.name || 'Value factor') +
                  '</b><span>' +
                  liveEsc(factor.reason || factor.description || factor.value || '') +
                  '</span></div>';
              }).join('')
            : [
                ['Age-band starting value','Starting youth valuation before player-specific adjustments.'],
                ['Position group adjustment','How the market values this position group.'],
                ['Overall quality adjustment','How the overall score moves the estimate.'],
                ['Evidence confidence adjustment','How strongly the current evidence supports the estimate.']
              ].map(function (factor) {
                return '<div class="factor"><b>' +
                  factor[0] +
                  '</b><span>' + factor[1] + '</span></div>';
              }).join('')
        ) +
      '</div>';
  }

  const attributesPanel = livePanelByTitle('All attributes');

  if (attributesPanel) {
    attributesPanel.querySelector('.panel-body').innerHTML =
      '<div class="attribute-list">' +
        liveProfileAttributes(player).map(function (row) {
          const score = liveScore(row[1]);

          return '<div class="attribute"><span>' +
            liveEsc(row[0]) +
            '</span><div class="progress"><span style="width:' +
            score + '%"></span></div><b>' + score + '</b></div>';
        }).join('') +
      '</div>';
  }

  const matchStatsPanel = livePanelByTitle('Match statistics');

  if (matchStatsPanel) {
    matchStatsPanel.querySelector('.panel-body').innerHTML =
      '<div class="metric-grid" style="grid-template-columns:1fr 1fr">' +
        [
          [player.appearances || matches.length,'Appearances'],
          [player.goals || 0,'Goals'],
          [player.assists || 0,'Assists'],
          [player.clean_sheets || 0,'Clean sheets'],
          [player.yellow_cards || 0,'Yellow cards'],
          [player.red_cards || 0,'Red cards']
        ].map(function (row) {
          return liveMetricBox(row[0],row[1]);
        }).join('') +
      '</div>';
  }

  const physicalPanel = livePanelByTitle('Physical profile');

  if (physicalPanel) {
    physicalPanel.querySelector('.panel-body').innerHTML =
      '<div class="analysis-card" ' +
        'style="background:linear-gradient(135deg,#e7f6f1,#e7f0fb)">' +
        '<small>Profile type</small><h4>' +
          liveEsc(
            (player.height_category || 'Height not set') +
            ' · ' +
            (player.build_category || 'Build not set')
          ) +
        '</h4><p style="font-size:7px;color:var(--muted)">' +
          liveEsc(
            player.height_range_cm
              ? player.height_range_cm + ' cm'
              : 'Height range not recorded'
          ) +
          ' · ' +
          liveEsc(
            player.weight_range_kg
              ? player.weight_range_kg + ' kg'
              : 'Weight range not recorded'
          ) +
        '</p></div>' +
        '<div class="metric-grid" style="grid-template-columns:1fr 1fr;margin-top:8px">' +
          liveMetricBox(liveAgeGroup(player),'Age group') +
          liveMetricBox('Coach-managed','Profile owner') +
        '</div>';
  }

  const factsPanel = livePanelByTitle('Last 5 match facts');

  if (factsPanel) {
    factsPanel.querySelector('.panel-body').innerHTML =
      matches.length
        ? '<div class="match-list">' +
            matches.slice(0,5).map(function (match) {
              return '<div class="match-row"><div><b>' +
                liveEsc(match.opponent_name || match.opponent || 'Opponent') +
                '</b><span>' +
                liveEsc([
                  liveDate(match.match_date),
                  liveMatchResult(match),
                  'Perf ' + (match.performance_score || '—') + '/100',
                  'G ' + (match.goals || 0),
                  'A ' + (match.assists || 0)
                ].join(' · ')) +
                '</span></div><span class="pill green">Match Facts</span></div>';
            }).join('') +
          '</div>'
        : '<div class="professional-empty">' +
            '<b>No Match Facts recorded</b>' +
            '<span>The evidence base will strengthen as the coach records matches.</span>' +
          '</div>';
  }

  const fixturesPanel = livePanelByTitle('Upcoming fixtures');

  if (fixturesPanel) {
    fixturesPanel.querySelector('.panel-body').innerHTML =
      fixtures.length
        ? '<div class="match-list">' +
            fixtures.slice(0,5).map(function (fixture) {
              return '<div class="match-row"><div><b>' +
                liveEsc(
                  (fixture.home_or_away === 'Away' ? '@ ' : 'vs ') +
                  (fixture.opponent || 'Fixture')
                ) +
                '</b><span>' +
                liveEsc([
                  liveDate(fixture.fixture_date),
                  fixture.fixture_time,
                  fixture.venue || fixture.city
                ].filter(Boolean).join(' · ')) +
                '</span></div><a class="btn sm" href="' +
                LIVE_PATHS.fixtures + '">Plan visit</a></div>';
            }).join('') +
          '</div>'
        : '<div class="empty-state" style="min-height:145px">' +
            '<div class="empty-icon">—</div>' +
            '<h4>No upcoming fixtures</h4>' +
            '<p>Check back after the coach adds a fixture.</p>' +
          '</div>';
  }

  const fitPanel = livePanelByTitle('Run position fit analysis');

  if (fitPanel) {
    const positionRatings = analysis.positionRatings || {};
    const bestCurrent =
      positionRatings.bestCurrentPosition || 'Run analysis';
    const bestFuture =
      positionRatings.bestFuturePosition || 'Run analysis';
    const bestScore =
      positionRatings.bestCurrentScore || '—';

    fitPanel.querySelector('.panel-body').innerHTML =
      '<div class="prediction-controls">' +
        '<select class="control" id="liveDevelopmentPlan">' +
          liveOptionList(
            [
              'Balanced Growth','Technical Possession',
              'Athletic Transition','Defensive Intelligence',
              'Final Third Output','Goalkeeper Command'
            ],
            'Balanced Growth'
          ) +
        '</select>' +
        '<select class="control" id="liveRoiStrategy">' +
          liveOptionList(
            ['Balanced value growth','Conservative value protection','Aggressive upside'],
            'Balanced value growth'
          ) +
        '</select>' +
        '<select class="control" id="liveScenario">' +
          '<option value="protect_lead">Protecting a one-goal lead</option>' +
          '<option value="chasing_game">Chasing the game</option>' +
          '<option value="high_press">High press</option>' +
          '<option value="low_block">Breaking down a low block</option>' +
        '</select>' +
        '<select class="control" id="liveTargetPosition">' +
          liveOptionList(
            ['GK','CB','BPD','RB','LB','RWB','LWB','CDM','CM','B2B','CAM','LW','RW','CF','ST','SS'],
            livePlayerPosition(player)
          ) +
        '</select>' +
      '</div>' +
      '<div class="page-actions" style="display:flex;gap:7px;margin-top:9px">' +
        '<button class="btn sm" type="button" data-run-prediction="Attribute Development">' +
          'Run attribute development</button>' +
        '<button class="btn sm" type="button" data-run-prediction="ROI Analysis">' +
          'Run ROI analysis</button>' +
        '<button class="btn sm" type="button" data-run-prediction="Match Scenario Prediction">' +
          'Run scenario prediction</button>' +
        '<button class="btn primary sm" type="button" ' +
          'data-run-prediction="Position Fit Projection">' +
          'Run position fit</button>' +
      '</div>' +
      '<div class="prediction-result" style="margin-top:12px">' +
        '<div class="result-card"><small>Best current role</small>' +
          '<b class="role-gated" id="liveBestCurrent">' +
            liveEsc(bestCurrent) +
          '</b></div>' +
        '<div class="result-card"><small>Best future role</small>' +
          '<b class="role-gated" id="liveBestFuture">' +
            liveEsc(bestFuture) +
          '</b></div>' +
        '<div class="result-card"><small>Target role</small>' +
          '<b id="liveTargetRole">' +
            liveEsc(livePlayerPosition(player)) +
          '</b></div>' +
        '<div class="result-card"><small>Role fit score</small>' +
          '<b class="role-gated" id="liveRoleFitScore">' +
            liveEsc(bestScore === '—' ? '—' : bestScore + '/100') +
          '</b></div>' +
      '</div>' +
      '<div class="position-fit-state">' +
        'Select the target role and run the analysis to reveal the current role, ' +
        'future role and role-fit score.' +
      '</div>';

    fitPanel.querySelectorAll('[data-run-prediction]')
      .forEach(function (button) {
        button.addEventListener('click',function () {
          const type = button.dataset.runPrediction;
          let inputParams = {};

          if (type === 'Attribute Development') {
            inputParams = {
              focus:document.getElementById('liveDevelopmentPlan').value
            };
          } else if (type === 'ROI Analysis') {
            inputParams = {
              strategy:document.getElementById('liveRoiStrategy').value
            };
          } else if (type === 'Match Scenario Prediction') {
            inputParams = {
              scenario:document.getElementById('liveScenario').value
            };
          } else {
            inputParams = {
              targetPosition:
                document.getElementById('liveTargetPosition').value
            };
          }

          liveRunPrediction(
            player.id,
            type,
            inputParams,
            button,
            type === 'Position Fit Projection'
              ? function (response) {
                  const result = response.result || {};
                  const current =
                    result.bestCurrentRole ||
                    result.bestCurrentPosition ||
                    result.currentRole ||
                    bestCurrent;

                  const future =
                    result.bestFutureRole ||
                    result.bestFuturePosition ||
                    result.futureRole ||
                    bestFuture;

                  const score =
                    result.roleFitScore ||
                    result.targetRoleScore ||
                    result.positionFitScore ||
                    bestScore;

                  document.getElementById('liveBestCurrent').textContent =
                    current;

                  document.getElementById('liveBestFuture').textContent =
                    future;

                  document.getElementById('liveTargetRole').textContent =
                    inputParams.targetPosition;

                  document.getElementById('liveRoleFitScore').textContent =
                    score + '/100';

                  document.querySelectorAll('.role-gated')
                    .forEach(function (node) {
                      node.classList.add('revealed');
                    });

                  const state = fitPanel.querySelector('.position-fit-state');
                  state.innerHTML =
                    '<b>Position fit complete.</b> Current role, future role ' +
                    'and the target role-fit score are now available.';
                }
              : null
          );
        });
      });

    document.getElementById('liveTargetPosition')
      ?.addEventListener('change',function () {
        document.getElementById('liveTargetRole').textContent = this.value;
      });
  }

  document.querySelectorAll('[data-scroll-position-fit]')
    .forEach(function (button) {
      button.addEventListener('click',function () {
        document.querySelector('.position-fit-run')
          ?.scrollIntoView({behavior:'smooth',block:'start'});
      });
    });
}

async function liveHydrateProfile() {
  const playerId = new URLSearchParams(window.location.search).get('id');

  if (!playerId) {
    document.querySelector('.content').innerHTML =
      liveError(
        'No player was selected. Return to Player Search and choose a profile.'
      ) +
      '<div style="text-align:center"><a class="btn primary" href="' +
        LIVE_PATHS.search + '">Open Player Search</a></div>';
    return;
  }

  try {
    const data = await liveApi(
      'GET',
      '/api/players/' + encodeURIComponent(playerId)
    );

    liveHydrateProfileSections(data);

    document.title =
      livePlayerName(data.player) + ' | ScoutLink';
  } catch (error) {
    document.querySelector('.content').innerHTML =
      liveError(error.message || 'The player profile could not be loaded.') +
      '<div style="text-align:center"><a class="btn primary" href="' +
        LIVE_PATHS.search + '">Open Player Search</a></div>';
  }
}

function livePipelineRow(row) {
  const player = row.players || row.player || {};
  const stages = [
    'watching','interested','shortlisted',
    'approached','trial_pending','negotiating'
  ];

  return '<tr data-pipeline-row="' + liveEsc(row.id) + '">' +
    '<td><div class="player-cell">' +
      '<div class="avatar professional">' +
        liveEsc(liveInitials(player.first_name,player.last_name)) +
      '</div>' +
      '<div><b>' + liveEsc(livePlayerName(player)) + '</b>' +
        '<span>' + liveEsc(liveAgeGroup(player)) + ' · ' +
          liveEsc(player.team_name || 'Team TBC') +
        '</span></div>' +
    '</div></td>' +
    '<td>' + liveEsc(livePlayerPosition(player)) + '</td>' +
    '<td><b>' + liveScore(player.overall_rating) + '</b></td>' +
    '<td><b>' + liveMoney(player.transfer_value) + '</b></td>' +
    '<td>' + liveStagePill(row.stage) + '</td>' +
    '<td><select class="control live-stage-select" data-pipeline-stage="' +
      liveEsc(row.id) + '">' +
      stages.map(function (stage) {
        return '<option value="' + stage + '"' +
          (stage === row.stage ? ' selected' : '') +
          '>' + liveEsc(liveStage(stage)) + '</option>';
      }).join('') +
    '</select></td>' +
    '<td><button class="btn sm" type="button" data-pipeline-chat="' +
      liveEsc(row.id) + '">Message coach</button></td>' +
    '<td>' + liveDate(row.created_at) + '</td>' +
    '<td><button class="btn sm" type="button" data-player-profile="' +
      liveEsc(player.id) + '">View</button></td>' +
  '</tr>';
}

function livePipelineCounts(rows) {
  const counts = {};

  rows.forEach(function (row) {
    counts[row.stage] = (counts[row.stage] || 0) + 1;
  });

  return counts;
}

async function liveOpenCoachChat(row,button) {
  const player = row.players || row.player || {};

  button.disabled = true;
  const original = button.textContent;
  button.textContent = 'Opening…';

  try {
    const response = await liveApi(
      'POST',
      '/api/chat/threads',
      {playerId:player.id}
    );

    const thread = response.data || response.thread || response;
    liveGo(
      LIVE_PATHS.chat +
      (thread.id ? '?thread=' + encodeURIComponent(thread.id) : '')
    );
  } catch (error) {
    liveToast(error.message,'error');
    button.disabled = false;
    button.textContent = original;
  }
}

function liveRenderPipeline(rows) {
  const panel = livePanelByTitle('My recruitment pipeline');
  if (!panel) return;

  const counts = livePipelineCounts(rows);
  const body = panel.querySelector('.panel-body');
  const wrap = panel.querySelector('.table-wrap');

  body.innerHTML =
    '<div class="pipeline-summary">' +
      '<div class="pipeline-box"><strong>' +
        liveNum(counts.watching) +
        '</strong><span>Watching</span></div>' +
      '<div class="pipeline-box"><strong>' +
        (
          liveNum(counts.interested) +
          liveNum(counts.shortlisted)
        ) +
        '</strong><span>Shortlisted / interested</span></div>' +
      '<div class="pipeline-box"><strong>' +
        (
          liveNum(counts.approached) +
          liveNum(counts.trial_pending) +
          liveNum(counts.negotiating)
        ) +
        '</strong><span>Advanced stages</span></div>' +
    '</div>';

  wrap.innerHTML = rows.length
    ? '<table class="table"><thead><tr>' +
        '<th>Player</th><th>Position</th><th>Overall</th><th>Value</th>' +
        '<th>Stage</th><th>Move stage</th><th>Coach</th><th>Added</th><th></th>' +
      '</tr></thead><tbody>' +
        rows.map(livePipelineRow).join('') +
      '</tbody></table>'
    : '<div class="empty-state">' +
        '<div class="empty-icon">♡</div>' +
        '<h4>No players in the pipeline</h4>' +
        '<p>Register interest from a player profile to start the workflow.</p>' +
        '<a class="btn primary sm" href="' + LIVE_PATHS.search +
          '">Find players</a>' +
      '</div>';

  wrap.querySelectorAll('[data-pipeline-stage]')
    .forEach(function (select) {
      select.addEventListener('change',async function () {
        const previous = rows.find(function (row) {
          return String(row.id) === String(select.dataset.pipelineStage);
        })?.stage;

        select.disabled = true;

        try {
          await liveApi(
            'PATCH',
            '/api/scouts/pipeline/' +
              encodeURIComponent(select.dataset.pipelineStage),
            {stage:select.value}
          );

          liveToast('Pipeline stage updated.');
          await liveHydratePipeline();
        } catch (error) {
          select.value = previous || 'watching';
          liveToast(error.message,'error');
        } finally {
          select.disabled = false;
        }
      });
    });

  wrap.querySelectorAll('[data-pipeline-chat]')
    .forEach(function (button) {
      button.addEventListener('click',function () {
        const row = rows.find(function (item) {
          return String(item.id) === String(button.dataset.pipelineChat);
        });

        if (row) liveOpenCoachChat(row,button);
      });
    });

  liveBindProfileLinks(wrap);
}

async function liveHydratePipeline() {
  try {
    const results = await Promise.all([
      liveApi('GET','/api/scouts/pipeline?limit=100'),
      liveLoadProfile()
    ]);

    const rows = results[0].data || [];
    liveState.pipeline = rows;

    const cards = document.querySelectorAll('.value-strip .value-card strong');
    const profile = results[1] || {};
    const scout = profile.scout || {};
    const team = profile.scoutTeam || {};

    if (cards[0]) cards[0].textContent = liveNum(scout.interests_remaining);
    if (cards[1]) cards[1].textContent = rows.length;
    if (cards[2]) {
      cards[2].textContent = rows.filter(function (row) {
        return /approach|trial|negotiat/.test(row.stage);
      }).length;
    }
    if (cards[3]) {
      cards[3].textContent =
        team.subscription_plan ||
        scout.subscription_plan ||
        'Core';
    }

    liveRenderPipeline(rows);

    const focus = new URLSearchParams(window.location.search).get('focus');
    if (focus) {
      document.querySelector('[data-pipeline-row="' + CSS.escape(focus) + '"]')
        ?.scrollIntoView({behavior:'smooth',block:'center'});
    }

    const followPanel = livePanelByTitle('Follow-up due');
    if (followPanel) {
      const due = rows.filter(function (row) {
        return (
          /approach|interest/.test(row.stage) &&
          Date.now() - new Date(
            row.updated_at || row.created_at
          ).getTime() > 48 * 60 * 60 * 1000
        );
      });

      followPanel.querySelector('.panel-body').innerHTML =
        due.length
          ? '<div class="match-list">' +
              due.slice(0,3).map(function (row) {
                const player = row.players || {};
                return '<div class="match-row"><div><b>' +
                  liveEsc(livePlayerName(player)) +
                  '</b><span>Review ' +
                  liveEsc(liveStage(row.stage)) +
                  ' follow-up</span></div>' +
                  '<button class="btn sm" type="button" data-pipeline-chat="' +
                  liveEsc(row.id) + '">Message</button></div>';
              }).join('') +
            '</div>'
          : '<div class="professional-empty">' +
              '<b>No follow-up is overdue</b>' +
              '<span>All current pipeline actions are within the expected window.</span>' +
            '</div>';

      followPanel.querySelectorAll('[data-pipeline-chat]')
        .forEach(function (button) {
          button.addEventListener('click',function () {
            const row = rows.find(function (item) {
              return String(item.id) === String(button.dataset.pipelineChat);
            });
            if (row) liveOpenCoachChat(row,button);
          });
        });
    }

    const healthPanel = livePanelByTitle('Stage health');
    if (healthPanel) {
      const counts = livePipelineCounts(rows);

      healthPanel.querySelector('.panel-body').innerHTML =
        '<div class="progress-list">' +
          liveUsageRow('Watching',liveNum(counts.watching),Math.max(1,rows.length),'') +
          liveUsageRow(
            'Shortlisted',
            liveNum(counts.shortlisted) + liveNum(counts.interested),
            Math.max(1,rows.length),
            'gold'
          ) +
          liveUsageRow(
            'Approached',
            liveNum(counts.approached) + liveNum(counts.trial_pending),
            Math.max(1,rows.length),
            'blue'
          ) +
        '</div>';
    }

    liveOn('Export pipeline',function () {
      liveCsv(
        'scoutlink-pipeline.csv',
        [
          ['Player','Position','Age group','Team','Stage','Overall','Value','Added']
        ].concat(rows.map(function (row) {
          const player = row.players || {};
          return [
            livePlayerName(player),
            livePlayerPosition(player),
            liveAgeGroup(player),
            player.team_name || '',
            liveStage(row.stage),
            liveScore(player.overall_rating),
            liveNum(player.transfer_value),
            row.created_at || ''
          ];
        }))
      );
    });
  } catch (error) {
    const panel = livePanelByTitle('My recruitment pipeline');
    if (panel) {
      panel.querySelector('.panel-body').innerHTML =
        liveError(error.message || 'The pipeline could not be loaded.');
      panel.querySelector('.table-wrap').innerHTML = '';
    }
  }
}

function liveRankingRows(items,valueKey,formatValue) {
  return (items || []).slice(0,5).map(function (item,index) {
    const player = item.players || item.player || item;
    const value = item[valueKey] !== undefined
      ? item[valueKey]
      : player[valueKey];

    return '<div class="rank-row">' +
      '<div class="rank-no ' +
        (index === 0 ? 'first' : index === 1 ? 'second' : index === 2 ? 'third' : '') +
        '">' + (index + 1) + '</div>' +
      '<div><b>' + liveEsc(livePlayerName(player)) + '</b>' +
        '<small>' +
          liveEsc(liveAgeGroup(player)) + ' · ' +
          liveEsc(player.team_name || 'Team TBC') +
        '</small></div>' +
      '<strong style="font-size:12px;color:' +
        (index === 0 ? 'var(--green)' : 'var(--text)') +
        '">' + liveEsc(formatValue ? formatValue(value) : value) + '</strong>' +
      '<button class="btn sm" type="button" data-player-profile="' +
        liveEsc(player.id) + '">View</button>' +
    '</div>';
  }).join('');
}

async function liveHydrateRankings() {
  const container = document.querySelector('.leaderboards');
  if (!container) return;

  container.innerHTML = liveLoading('Loading player leaderboards…');

  try {
    const response = await liveApi('GET','/api/scouts/rankings');
    const data = response.data || response.rankings || response;

    const categories = [
      ['Top scorers',data.topScorers || data.scorers || [],'goals',String],
      ['Top assisters',data.topAssisters || data.assisters || [],'assists',String],
      ['Top clean sheets',data.topCleanSheets || data.cleanSheets || [],'clean_sheets',String],
      ['Most scouted',data.topInterested || data.mostScouted || [],'interest_count',String],
      ['Most valuable',data.topExpensive || data.mostValuable || [],'transfer_value',liveMoney]
    ];

    container.innerHTML = categories.map(function (category,index) {
      return '<section class="panel">' +
        '<div class="panel-head"><h3>' + liveEsc(category[0]) + '</h3>' +
          '<span class="pill ' + (index === 4 ? 'green' : 'grey') + '">' +
            (index === 4 ? 'GBP' : 'Top 5') +
          '</span></div>' +
        '<div class="rank-list">' +
          (
            category[1].length
              ? liveRankingRows(category[1],category[2],category[3])
              : '<div class="professional-empty" style="padding:14px">' +
                  '<b>No ranking data yet</b>' +
                  '<span>Rankings appear when enough Match Facts are available.</span>' +
                '</div>'
          ) +
        '</div>' +
      '</section>';
    }).join('');

    liveBindProfileLinks(container);

    liveState.rankings = categories;

    ['All ages','U16','U17','U18'].forEach(function (label) {
      liveOn(label,function () {
        const age = label === 'All ages' ? '' : label;

        document.querySelectorAll('.rank-row').forEach(function (row) {
          const detail = row.querySelector('small')?.textContent || '';
          row.style.display =
            !age || detail.indexOf(age) >= 0
              ? ''
              : 'none';
        });

        ['All ages','U16','U17','U18'].forEach(function (otherLabel) {
          liveButtons(otherLabel).forEach(function (button) {
            button.classList.toggle(
              'active',
              otherLabel === label
            );
          });
        });
      });
    });

    liveOn('Create shortlist',function () {
      const shortlist = [];
      const seen = new Set();

      categories.forEach(function (category) {
        category[1].forEach(function (item) {
          const player = item.players || item.player || item;

          if (player.id && !seen.has(player.id)) {
            seen.add(player.id);
            shortlist.push({
              id:player.id,
              name:livePlayerName(player),
              position:livePlayerPosition(player),
              ageGroup:liveAgeGroup(player),
              team:player.team_name || ''
            });
          }
        });
      });

      try {
        localStorage.setItem(
          'scout_ranking_shortlist_v3',
          JSON.stringify(shortlist)
        );
      } catch (_) {}

      const modal = liveModal(
        'Ranking shortlist',
        shortlist.length
          ? '<div class="match-list">' +
              shortlist.slice(0,10).map(function (player) {
                return '<div class="match-row"><div><b>' +
                  liveEsc(player.name) +
                  '</b><span>' +
                  liveEsc(
                    player.position + ' · ' +
                    player.ageGroup + ' · ' +
                    player.team
                  ) +
                  '</span></div><button class="btn sm" type="button" ' +
                  'data-player-profile="' + liveEsc(player.id) +
                  '">Open player</button></div>';
              }).join('') +
            '</div>'
          : '<div class="professional-empty">' +
              '<b>No ranked players available</b>' +
            '</div>'
      );

      liveBindProfileLinks(modal);
    });
  } catch (error) {
    container.innerHTML = liveError(
      error.message || 'Rankings could not be loaded.'
    );
  }
}

function liveFixturePlayer(fixture) {
  if (Array.isArray(fixture.players)) {
    return fixture.players[0] || {};
  }

  return fixture.players || fixture.player || {};
}

function liveFixtureAttendanceStatus(fixture) {
  return (
    fixture.attendance &&
    fixture.attendance.status
  ) ||
  fixture.attendance_status ||
  fixture.myAttendanceStatus ||
  '';
}

function liveFixtureDateTime(fixture) {
  const raw = fixture.fixture_date || fixture.date;
  const dateValue = raw ? new Date(raw) : null;
  let time = fixture.fixture_time || '';

  if (
    !time &&
    dateValue &&
    !Number.isNaN(dateValue.getTime())
  ) {
    time = dateValue.toLocaleTimeString(
      'en-GB',
      {hour:'2-digit',minute:'2-digit'}
    );
  }

  return {
    date:dateValue,
    time
  };
}

function liveRenderFixtureCalendar(fixtures) {
  const monthDate = liveState.fixtureMonth;
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year,month,1);
  const last = new Date(year,month + 1,0);
  const startOffset = (first.getDay() + 6) % 7;
  const days = [];

  for (let index = 0; index < 42; index += 1) {
    const dayDate = new Date(year,month,1 - startOffset + index);
    const sameMonth = dayDate.getMonth() === month;
    const dayFixtures = fixtures.filter(function (fixture) {
      const value = liveFixtureDateTime(fixture).date;

      return value &&
        value.getFullYear() === dayDate.getFullYear() &&
        value.getMonth() === dayDate.getMonth() &&
        value.getDate() === dayDate.getDate();
    });

    days.push({
      date:dayDate,
      sameMonth,
      fixtures:dayFixtures
    });
  }

  return '<div class="fixture-calendar">' +
    ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(function (day) {
      return '<div class="calendar-day-name">' + day + '</div>';
    }).join('') +
    days.map(function (day,index) {
      return '<div class="calendar-day ' +
        (day.sameMonth ? '' : 'muted') + '">' +
        '<div class="calendar-date">' + day.date.getDate() + '</div>' +
        day.fixtures.slice(0,2).map(function (fixture,fixtureIndex) {
          const player = liveFixturePlayer(fixture);

          return '<button class="calendar-fixture ' +
            (fixtureIndex === 1 ? 'blue' : index % 5 === 0 ? 'gold' : '') +
            '" type="button" data-fixture-id="' + liveEsc(fixture.id) +
            '" style="width:100%;text-align:left;border-top:0;border-right:0;border-bottom:0;cursor:pointer">' +
            '<b>' +
              liveEsc(
                (fixture.home_or_away === 'Away' ? '@ ' : 'vs ') +
                (fixture.opponent || 'Fixture')
              ) +
            '</b><span>' +
              liveEsc(
                [
                  livePlayerName(player) !== 'Player'
                    ? livePlayerName(player)
                    : '',
                  liveFixtureDateTime(fixture).time
                ].filter(Boolean).join(' · ')
              ) +
            '</span></button>';
        }).join('') +
      '</div>';
    }).join('') +
  '</div>';
}

function liveRenderFixtureList(fixtures) {
  return '<div class="fixture-mobile-list">' +
    fixtures.map(function (fixture) {
      const info = liveFixtureDateTime(fixture);
      const player = liveFixturePlayer(fixture);

      return '<article class="fixture-list-item">' +
        '<div class="fixture-date-box"><b>' +
          (info.date ? info.date.getDate() : '—') +
          '</b><span>' +
          (info.date
            ? info.date.toLocaleDateString('en-GB',{weekday:'short'})
            : 'TBC') +
          '</span></div>' +
        '<div><h4>' +
          liveEsc(
            (fixture.home_or_away === 'Away' ? '@ ' : 'vs ') +
            (fixture.opponent || 'Fixture')
          ) +
        '</h4><p>' +
          liveEsc(
            [
              livePlayerName(player) !== 'Player'
                ? livePlayerName(player) + ' · ' + livePlayerPosition(player)
                : '',
              info.time,
              fixture.venue || fixture.city
            ].filter(Boolean).join(' · ')
          ) +
        '</p></div>' +
        '<button class="btn sm" type="button" data-fixture-id="' +
          liveEsc(fixture.id) + '">Plan visit</button>' +
      '</article>';
    }).join('') +
  '</div>';
}

function liveFixtureModal(fixture) {
  const player = liveFixturePlayer(fixture);
  const current = liveFixtureAttendanceStatus(fixture);

  const body =
    '<div class="grid2">' +
      '<div class="result-card"><small>Fixture</small><b>' +
        liveEsc(
          (fixture.home_or_away === 'Away' ? '@ ' : 'vs ') +
          (fixture.opponent || 'Fixture')
        ) +
      '</b></div>' +
      '<div class="result-card"><small>Date</small><b>' +
        liveEsc(
          liveDate(fixture.fixture_date) +
          ' · ' +
          liveFixtureDateTime(fixture).time
        ) +
      '</b></div>' +
      '<div class="result-card"><small>Tracked player</small><b>' +
        liveEsc(
          livePlayerName(player) !== 'Player'
            ? livePlayerName(player)
            : 'Pipeline team fixture'
        ) +
      '</b></div>' +
      '<div class="result-card"><small>Venue</small><b>' +
        liveEsc(fixture.venue || fixture.city || 'Venue TBC') +
      '</b></div>' +
    '</div>' +
    '<div class="field" style="margin-top:12px">' +
      '<label>Live scouting status</label>' +
      '<select class="control" id="liveFixtureAttendance">' +
        liveOptionList(
          ['attending','maybe','not_attending'],
          current,
          'Select status'
        ) +
      '</select>' +
    '</div>' +
    '<div class="page-actions" style="display:flex;margin-top:10px">' +
      '<button class="btn primary" type="button" id="liveSaveFixtureStatus">' +
        'Save visit status</button>' +
      (player.id
        ? '<button class="btn" type="button" data-player-profile="' +
          liveEsc(player.id) + '">Open player</button>'
        : '') +
    '</div>' +
    '<div class="scout-live-form-message" id="liveFixtureMessage"></div>';

  const modal = liveModal('Fixture visit plan',body);
  liveBindProfileLinks(modal);

  modal.querySelector('#liveSaveFixtureStatus')
    .addEventListener('click',async function () {
      const button = this;
      const status = modal.querySelector('#liveFixtureAttendance').value;
      const message = modal.querySelector('#liveFixtureMessage');

      if (!status) {
        message.className = 'scout-live-form-message error';
        message.textContent = 'Select a visit status.';
        return;
      }

      button.disabled = true;
      button.textContent = 'Saving…';

      try {
        await liveApi(
          'POST',
          '/api/scouts/fixtures/' +
            encodeURIComponent(fixture.id) +
            '/attendance',
          {status}
        );

        message.className = 'scout-live-form-message success';
        message.textContent = 'Fixture visit status saved.';
        await liveHydrateFixtures();
      } catch (error) {
        message.className = 'scout-live-form-message error';
        message.textContent = error.message;
      } finally {
        button.disabled = false;
        button.textContent = 'Save visit status';
      }
    });
}

async function liveHydrateFixtures() {
  const calendarPanel = livePanelByTitle(
    liveState.fixtureMonth.toLocaleDateString(
      'en-GB',
      {month:'long',year:'numeric'}
    )
  ) || document.querySelector('.content .panel');

  if (!calendarPanel) return;

  const body = calendarPanel.querySelector('.panel-body');
  body.innerHTML = liveLoading('Loading pipeline fixtures…');

  try {
    const response = await liveApi('GET','/api/scouts/fixtures');
    const fixtures = response.data || [];
    liveState.fixtures = fixtures;

    const upcoming = fixtures.filter(function (fixture) {
      const value = liveFixtureDateTime(fixture).date;
      return value && value.getTime() >= Date.now() - 24 * 60 * 60 * 1000;
    });

    const playerIds = new Set(
      fixtures.map(function (fixture) {
        return (
          fixture.player_id ||
          fixture.players && fixture.players.id
        );
      }).filter(Boolean)
    );

    const unassigned = fixtures.filter(function (fixture) {
      return !liveFixtureAttendanceStatus(fixture);
    });

    const cards = document.querySelectorAll('.value-strip .value-card strong');

    if (cards[0]) cards[0].textContent = upcoming.length;
    if (cards[1]) cards[1].textContent = playerIds.size;
    if (cards[2]) {
      cards[2].textContent = upcoming[0]
        ? liveDate(upcoming[0].fixture_date,{day:'2-digit',month:'short'})
        : '—';
    }
    if (cards[3]) cards[3].textContent = unassigned.length;

    const heading = calendarPanel.querySelector('.panel-head h3');
    if (heading) {
      heading.textContent = liveState.fixtureMonth.toLocaleDateString(
        'en-GB',
        {month:'long',year:'numeric'}
      );
    }

    body.innerHTML =
      (fixtures.length
        ? liveRenderFixtureCalendar(fixtures) +
          liveRenderFixtureList(fixtures)
        : '<div class="empty-state">' +
            '<div class="empty-icon">—</div>' +
            '<h4>No tracked fixtures published</h4>' +
            '<p>Fixtures appear when coaches publish schedules for pipeline players.</p>' +
            '<a class="btn primary sm" href="' + LIVE_PATHS.pipeline +
              '">Review pipeline</a>' +
          '</div>');

    body.querySelectorAll('[data-fixture-id]')
      .forEach(function (button) {
        button.addEventListener('click',function () {
          const fixture = fixtures.find(function (item) {
            return String(item.id) === String(button.dataset.fixtureId);
          });
          if (fixture) liveFixtureModal(fixture);
        });
      });

    const actions = calendarPanel.querySelector('.panel-head .page-actions');

    if (actions) {
      actions.innerHTML =
        '<button class="btn sm" type="button" data-fixture-month="-1">Previous</button>' +
        '<button class="btn sm" type="button" data-fixture-today>Today</button>' +
        '<button class="btn sm" type="button" data-fixture-month="1">Next</button>' +
        '<button class="btn primary sm" type="button" data-fixture-settings>' +
          'Calendar settings</button>';

      actions.querySelectorAll('[data-fixture-month]')
        .forEach(function (button) {
          button.addEventListener('click',function () {
            liveState.fixtureMonth = new Date(
              liveState.fixtureMonth.getFullYear(),
              liveState.fixtureMonth.getMonth() +
                Number(button.dataset.fixtureMonth),
              1
            );
            liveHydrateFixtures();
          });
        });

      actions.querySelector('[data-fixture-today]')
        ?.addEventListener('click',function () {
          liveState.fixtureMonth = new Date();
          liveHydrateFixtures();
        });

      actions.querySelector('[data-fixture-settings]')
        ?.addEventListener('click',function () {
          const modal = liveModal(
            'Fixture calendar settings',
            '<p class="compact-copy" style="font-size:9px">' +
              'Manage fixture notifications or export the currently loaded ' +
              'pipeline fixture calendar.' +
            '</p>' +
            '<div class="page-actions" style="display:flex;margin-top:12px">' +
              '<a class="btn primary" href="' +
                LIVE_PATHS.settings +
                '#notifications">Notification settings</a>' +
              '<button class="btn" type="button" data-modal-export-fixtures>' +
                'Export fixtures</button>' +
            '</div>'
          );

          modal.querySelector('[data-modal-export-fixtures]')
            .addEventListener('click',function () {
              liveCsv(
                'scoutlink-fixtures.csv',
                [['Date','Time','Opponent','Home or away','Venue','Status']]
                  .concat(fixtures.map(function (fixture) {
                    return [
                      fixture.fixture_date || '',
                      liveFixtureDateTime(fixture).time,
                      fixture.opponent || '',
                      fixture.home_or_away || '',
                      fixture.venue || fixture.city || '',
                      liveFixtureAttendanceStatus(fixture)
                    ];
                  }))
              );
            });
        });
    }

    liveOn('Open visit plan',function () {
      if (fixtures[0]) {
        liveFixtureModal(fixtures[0]);
      } else {
        liveToast('No fixture is available to plan yet.','error');
      }
    });

    liveOn('Export fixtures',function () {
      liveCsv(
        'scoutlink-fixtures.csv',
        [['Date','Time','Opponent','Home or away','Venue','Status']]
          .concat(fixtures.map(function (fixture) {
            return [
              fixture.fixture_date || '',
              liveFixtureDateTime(fixture).time,
              fixture.opponent || '',
              fixture.home_or_away || '',
              fixture.venue || fixture.city || '',
              liveFixtureAttendanceStatus(fixture)
            ];
          }))
      );
    });

    const alertsToggle = livePanelByTitle('Fixture alerts')
      ?.querySelector('.toggle');

    if (alertsToggle) {
      alertsToggle.setAttribute('role','switch');
      alertsToggle.setAttribute(
        'aria-checked',
        alertsToggle.classList.contains('on') ? 'true' : 'false'
      );
      alertsToggle.tabIndex = 0;

      const toggleAlerts = async function () {
        const next = !alertsToggle.classList.contains('on');

        try {
          const current = await liveApi('GET','/api/scouts/settings');
          await liveApi(
            'PATCH',
            '/api/scouts/settings',
            {
              ...(current.settings || {}),
              eventAlerts:next
            }
          );

          alertsToggle.classList.toggle('on',next);
          alertsToggle.setAttribute('aria-checked',next ? 'true' : 'false');
          liveToast(
            next
              ? 'Fixture and event alerts enabled.'
              : 'Fixture and event alerts disabled.'
          );
        } catch (error) {
          liveToast(error.message,'error');
        }
      };

      alertsToggle.addEventListener('click',toggleAlerts);
      alertsToggle.addEventListener('keydown',function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleAlerts();
        }
      });
    }
  } catch (error) {
    body.innerHTML = liveError(
      error.message || 'Fixtures could not be loaded.'
    );
  }
}

function livePredictionSummary(log) {
  const result = log.result || {};

  return (
    result.summary ||
    result.message ||
    result.recommendation ||
    result.bestCurrentRole && (
      'Best current role: ' + result.bestCurrentRole
    ) ||
    'Open the player to review the complete prediction.'
  );
}

async function liveHydratePredictions() {
  const historyPanel = livePanelByTitle('Prediction history');
  if (!historyPanel) return;

  const wrap = historyPanel.querySelector('.table-wrap');
  wrap.innerHTML = liveLoading('Loading prediction history…');

  try {
    const response = await liveApi('GET','/api/predictions');
    const logs = response.data || [];

    const cards = document.querySelectorAll('.value-strip .value-card strong');

    if (cards[0]) cards[0].textContent = liveNum(response.remaining);
    if (cards[1]) cards[1].textContent = liveNum(response.teamUsed) || logs.length;
    if (cards[2]) cards[2].textContent = response.plan || 'Core';

    if (cards[3]) {
      const counts = {};
      logs.forEach(function (log) {
        counts[log.prediction_type] =
          (counts[log.prediction_type] || 0) + 1;
      });

      cards[3].textContent =
        Object.keys(counts).sort(function (a,b) {
          return counts[b] - counts[a];
        })[0] || 'No runs yet';
    }

    wrap.innerHTML = logs.length
      ? '<table class="table"><thead><tr>' +
          '<th>Player</th><th>Team</th><th>Prediction type</th>' +
          '<th>Date run</th><th>Result summary</th><th></th>' +
        '</tr></thead><tbody>' +
          logs.map(function (log) {
            const player = log.players || {};

            return '<tr><td><b>' +
              liveEsc(livePlayerName(player)) +
              '</b></td><td>' +
              liveEsc(player.team_name || '—') +
              '</td><td><span class="pill blue">' +
              liveEsc(log.prediction_type) +
              '</span></td><td>' +
              liveDate(log.run_at) +
              '</td><td>' +
              liveEsc(livePredictionSummary(log)) +
              '</td><td><button class="btn sm" type="button" ' +
              'data-player-profile="' + liveEsc(log.player_id) +
              '">View player</button></td></tr>';
          }).join('') +
        '</tbody></table>'
      : '<div class="empty-state">' +
          '<div class="empty-icon">PR</div>' +
          '<h4>No predictions run yet</h4>' +
          '<p>Open a player profile and choose one of the four prediction tools.</p>' +
          '<a class="btn primary sm" href="' + LIVE_PATHS.search +
            '">Find a player</a>' +
        '</div>';

    liveBindProfileLinks(wrap);

    liveOn('Export history',function () {
      liveCsv(
        'scoutlink-predictions.csv',
        [['Player','Team','Prediction type','Run at','Summary']]
          .concat(logs.map(function (log) {
            const player = log.players || {};
            return [
              livePlayerName(player),
              player.team_name || '',
              log.prediction_type || '',
              log.run_at || '',
              livePredictionSummary(log)
            ];
          }))
      );
    });
  } catch (error) {
    wrap.innerHTML = liveError(
      error.message || 'Prediction history could not be loaded.'
    );
  }
}

async function liveRedownloadExport(record,button) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = 'Preparing…';

  try {
    const response = await liveApi(
      'POST',
      '/api/exports/' + encodeURIComponent(record.id) + '/redownload',
      {}
    );

    liveDownload(
      response.filename,
      response.mime,
      response.contentBase64
    );
  } catch (error) {
    liveToast(error.message,'error');
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

async function liveHydrateExports() {
  const historyPanel = livePanelByTitle('Export history');
  if (!historyPanel) return;

  const wrap = historyPanel.querySelector('.table-wrap');
  wrap.innerHTML = liveLoading('Loading export history…');

  try {
    const response = await liveApi('GET','/api/scouts/exports');
    const records = response.data || [];

    const cards = document.querySelectorAll('.value-strip .value-card strong');

    if (cards[0]) cards[0].textContent = liveNum(response.remaining);
    if (cards[1]) cards[1].textContent = liveNum(response.teamUsed) || records.length;
    if (cards[2]) cards[2].textContent = response.plan || 'Core';
    if (cards[3]) {
      cards[3].textContent =
        records[0] ? liveDate(records[0].created_at,{day:'2-digit',month:'short'}) : '—';
    }

    const usagePanel = livePanelByTitle('Export usage');
    if (usagePanel) {
      const limit = liveNum(response.planLimit);
      const used = liveNum(response.teamUsed) || records.length;
      const percentage = limit
        ? Math.min(100,Math.round(used / limit * 100))
        : 0;

      const text = usagePanel.querySelector('.panel-head span');
      if (text) {
        text.textContent =
          limit >= 99999
            ? used + ' used · Unlimited plan'
            : used + ' of ' + limit + ' used';
      }

      const badge = usagePanel.querySelector('.panel-head .pill');
      if (badge) {
        badge.textContent =
          limit >= 99999 ? 'Unlimited' : response.remaining + ' remaining';
      }

      usagePanel.querySelector('.progress span').style.width =
        percentage + '%';
    }

    wrap.innerHTML = records.length
      ? '<table class="table"><thead><tr>' +
          '<th>Player</th><th>Team</th><th>Source</th>' +
          '<th>Export type</th><th>Date</th><th></th>' +
        '</tr></thead><tbody>' +
          records.map(function (record) {
            const player = record.players || {};

            return '<tr><td><b>' +
              liveEsc(livePlayerName(player)) +
              '</b></td><td>' +
              liveEsc(player.team_name || '—') +
              '</td><td>' +
              liveEsc(record.source || 'Profile') +
              '</td><td><span class="pill red">' +
              liveEsc(record.export_type || 'PDF') +
              '</span></td><td>' +
              liveDate(record.created_at) +
              '</td><td><button class="btn sm" type="button" ' +
              'data-redownload-export="' + liveEsc(record.id) +
              '">Re-download</button></td></tr>';
          }).join('') +
        '</tbody></table>'
      : '<div class="empty-state">' +
          '<div class="empty-icon">EX</div>' +
          '<h4>No exports created yet</h4>' +
          '<p>Open a player profile to create a PDF or Excel dossier.</p>' +
          '<a class="btn primary sm" href="' + LIVE_PATHS.search +
            '">Find players</a>' +
        '</div>';

    wrap.querySelectorAll('[data-redownload-export]')
      .forEach(function (button) {
        button.addEventListener('click',function () {
          const record = records.find(function (item) {
            return String(item.id) === String(button.dataset.redownloadExport);
          });
          if (record) liveRedownloadExport(record,button);
        });
      });
  } catch (error) {
    wrap.innerHTML = liveError(
      error.message || 'Export history could not be loaded.'
    );
  }
}


function liveCompareOption(player) {
  return '<option value="' + liveEsc(player.id) + '">' +
    liveEsc(
      livePlayerName(player) +
      ' · ' +
      livePlayerPosition(player) +
      ' · ' +
      liveAgeGroup(player)
    ) +
  '</option>';
}

function liveCompareAttributeRows(player,analysis) {
  const compatibility = analysis.compatibility || {};
  return [
    ['Technical',analysis.overallBreakdown?.technical || player.passing],
    ['Tactical IQ',analysis.overallBreakdown?.tactical || player.positioning],
    ['Physical',analysis.overallBreakdown?.physical || player.strength],
    ['Match output',analysis.matchPerformanceRating || player.overall_rating],
    ['Need fit',compatibility.needFit],
    ['Role fit',compatibility.roleFit],
    ['Formation fit',compatibility.formationPositionFit],
    ['Evidence fit',analysis.dataConfidence?.score || liveNum(player.appearances) * 8]
  ];
}

function liveCompareCard(data,color) {
  const player = data.player || {};
  const analysis = data.analysis || {};

  const facts = [
    ['Transfer value',liveMoney(player.transfer_value || analysis.transferValue)],
    ['Compatibility',liveScore(player.compatibilityScore || analysis.compatibilityScore) + '%'],
    ['Appearances',liveNum(player.appearances)],
    ['Goals per game',
      liveNum(player.appearances)
        ? (liveNum(player.goals) / liveNum(player.appearances)).toFixed(2)
        : '0.00'
    ],
    ['Assists per game',
      liveNum(player.appearances)
        ? (liveNum(player.assists) / liveNum(player.appearances)).toFixed(2)
        : '0.00'
    ],
    ['Clean sheets',liveNum(player.clean_sheets)],
    ['Yellow cards',liveNum(player.yellow_cards)],
    ['Red cards',liveNum(player.red_cards)]
  ];

  return '<div class="compare-card">' +
    '<div class="compare-player">' +
      '<div class="avatar professional">' +
        liveEsc(liveInitials(player.first_name,player.last_name)) +
      '</div>' +
      '<strong>' + liveScore(player.overall_rating) + '</strong>' +
      '<h4>' + liveEsc(livePlayerName(player)) + '</h4>' +
      '<p>' +
        liveEsc(liveAgeGroup(player)) + ' · ' +
        liveEsc(livePlayerPosition(player)) + ' · ' +
        liveEsc(player.team_name || 'Team TBC') +
      '</p>' +
      '<button class="btn sm" type="button" data-player-profile="' +
        liveEsc(player.id) +
        '" style="margin-top:8px">View profile</button>' +
    '</div>' +
    facts.map(function (row) {
      return '<div class="compare-fact"><span>' +
        liveEsc(row[0]) +
        '</span><b>' + liveEsc(row[1]) + '</b></div>';
    }).join('') +
    '<div class="progress-list" style="margin-top:12px">' +
      liveCompareAttributeRows(player,analysis).map(function (row) {
        return liveProgressRow(row[0],row[1],color);
      }).join('') +
    '</div>' +
  '</div>';
}

function liveCompareRecommendation(first,second) {
  const a = first.data.analysis || {};
  const b = second.data.analysis || {};
  const aPlayer = first.data.player || {};
  const bPlayer = second.data.player || {};
  const aScore = liveScore(aPlayer.compatibilityScore || a.compatibilityScore);
  const bScore = liveScore(bPlayer.compatibilityScore || b.compatibilityScore);
  const winner = aScore >= bScore ? first : second;
  const loser = winner === first ? second : first;

  return {
    winner,
    loser,
    copy:
      livePlayerName(winner.data.player) +
      ' is the stronger current fit at ' +
      Math.max(aScore,bScore) +
      '% compatibility. Review the side-by-side evidence, role fit and ' +
      'financial context before taking the final recruitment decision.'
  };
}

function liveRenderComparison() {
  const resultPanel = livePanelByTitle('Player comparison');
  const recommendationPanel = livePanelByTitle('Scout recommendation');

  if (!resultPanel || !recommendationPanel) return;

  if (liveState.comparePlayers.length !== 2) {
    resultPanel.querySelector('.panel-body').innerHTML =
      '<div class="empty-state">' +
        '<div class="empty-icon">CP</div>' +
        '<h4>Select two players</h4>' +
        '<p>Choose two live ScoutLink players to build the comparison.</p>' +
      '</div>';

    recommendationPanel.querySelector('.panel-body').innerHTML =
      '<div class="professional-empty">' +
        '<b>No recommendation yet</b>' +
        '<span>The recommendation appears after both players are loaded.</span>' +
      '</div>';
    return;
  }

  resultPanel.querySelector('.panel-body').innerHTML =
    '<div class="compare-columns">' +
      liveCompareCard(liveState.comparePlayers[0].data,'') +
      liveCompareCard(liveState.comparePlayers[1].data,'orange') +
    '</div>';

  liveBindProfileLinks(resultPanel);

  const recommendation = liveCompareRecommendation(
    liveState.comparePlayers[0],
    liveState.comparePlayers[1]
  );

  const winnerPlayer = recommendation.winner.data.player;
  const firstAnalysis = liveState.comparePlayers[0].data.analysis || {};
  const secondAnalysis = liveState.comparePlayers[1].data.analysis || {};

  const measures = [
    [
      'Need fit',
      liveCompatibilityValue(firstAnalysis,'needFit'),
      liveCompatibilityValue(secondAnalysis,'needFit')
    ],
    [
      'Role fit',
      liveCompatibilityValue(firstAnalysis,'roleFit'),
      liveCompatibilityValue(secondAnalysis,'roleFit')
    ],
    [
      'Formation fit',
      liveCompatibilityValue(firstAnalysis,'formationPositionFit','formationFit'),
      liveCompatibilityValue(secondAnalysis,'formationPositionFit','formationFit')
    ],
    [
      'Evidence fit',
      liveScore(firstAnalysis.dataConfidence?.score),
      liveScore(secondAnalysis.dataConfidence?.score)
    ]
  ];

  recommendationPanel.querySelector('.panel-body').innerHTML =
    '<div class="recommendation"><b>' +
      liveEsc(livePlayerName(winnerPlayer)) +
      ' is the stronger current fit.</b> ' +
      liveEsc(recommendation.copy) +
    '</div>' +
    '<div class="grid4" style="margin-top:10px">' +
      measures.map(function (row) {
        return '<div class="result-card"><small>' +
          liveEsc(row[0]) +
          '</small><b>' +
          liveEsc(
            livePlayerName(liveState.comparePlayers[0].data.player).split(' ')[0] +
            ' ' + row[1] +
            ' vs ' +
            row[2]
          ) +
          '</b></div>';
      }).join('') +
    '</div>' +
    '<div style="display:flex;gap:7px;margin-top:10px">' +
      '<button class="btn primary" type="button" data-add-recommended="' +
        liveEsc(winnerPlayer.id) +
        '">Add recommended player</button>' +
      '<button class="btn" type="button" data-export-comparison>' +
        'Export comparison</button>' +
    '</div>';

  recommendationPanel.querySelector('[data-add-recommended]')
    .addEventListener('click',async function () {
      const button = this;
      button.disabled = true;
      button.textContent = 'Adding…';

      try {
        const response = await liveApi(
          'POST',
          '/api/players/' +
            encodeURIComponent(button.dataset.addRecommended) +
            '/scout-interest',
          {
            interestLevel:8,
            notes:'Added from ScoutLink player comparison.'
          }
        );

        button.textContent = response.alreadyInPipeline
          ? 'Already in pipeline'
          : 'Added to pipeline';

        liveToast(response.message || 'Player added to pipeline.');
      } catch (error) {
        button.disabled = false;
        button.textContent = 'Add recommended player';
        liveToast(error.message,'error');
      }
    });

  recommendationPanel.querySelector('[data-export-comparison]')
    .addEventListener('click',function () {
      const rows = [
        ['Measure'].concat(
          liveState.comparePlayers.map(function (item) {
            return livePlayerName(item.data.player);
          })
        ),
        ['Overall'].concat(
          liveState.comparePlayers.map(function (item) {
            return liveScore(item.data.player.overall_rating);
          })
        ),
        ['Compatibility'].concat(
          liveState.comparePlayers.map(function (item) {
            return liveScore(
              item.data.player.compatibilityScore ||
              item.data.analysis.compatibilityScore
            );
          })
        ),
        ['Transfer value'].concat(
          liveState.comparePlayers.map(function (item) {
            return liveNum(
              item.data.player.transfer_value ||
              item.data.analysis.transferValue
            );
          })
        )
      ];

      liveCompareAttributeRows(
        liveState.comparePlayers[0].data.player,
        liveState.comparePlayers[0].data.analysis
      ).forEach(function (row,index) {
        rows.push([
          row[0],
          liveScore(row[1]),
          liveScore(
            liveCompareAttributeRows(
              liveState.comparePlayers[1].data.player,
              liveState.comparePlayers[1].data.analysis
            )[index][1]
          )
        ]);
      });

      liveCsv('scoutlink-player-comparison.csv',rows);
    });
}

async function liveLoadComparison() {
  const first = document.getElementById('liveCompareFirst')?.value;
  const second = document.getElementById('liveCompareSecond')?.value;

  if (!first || !second) {
    liveToast('Select two players to compare.','error');
    return;
  }

  if (first === second) {
    liveToast('Choose two different players.','error');
    return;
  }

  const panel = livePanelByTitle('Player comparison');
  panel.querySelector('.panel-body').innerHTML =
    liveLoading('Building the player comparison…');

  try {
    const values = await Promise.all([
      liveApi('GET','/api/players/' + encodeURIComponent(first)),
      liveApi('GET','/api/players/' + encodeURIComponent(second))
    ]);

    liveState.comparePlayers = [
      {id:first,data:values[0]},
      {id:second,data:values[1]}
    ];

    liveRenderComparison();
  } catch (error) {
    panel.querySelector('.panel-body').innerHTML =
      liveError(error.message || 'The comparison could not be built.');
  }
}

async function liveHydrateCompare() {
  const selectPanel = livePanelByTitle('Select two players to compare');
  if (!selectPanel) return;

  selectPanel.querySelector('.panel-body').innerHTML =
    liveLoading('Loading players for comparison…');

  try {
    const results = await Promise.all([
      liveApi('GET','/api/scouts/pipeline?limit=100'),
      liveApi('GET','/api/players?limit=100&page=1')
    ]);

    const pipeline = results[0].data || [];
    const allPlayers = results[1].data || [];
    const merged = [];
    const seen = new Set();

    pipeline.forEach(function (row) {
      const player = row.players || row.player;
      if (player && player.id && !seen.has(player.id)) {
        seen.add(player.id);
        merged.push(player);
      }
    });

    allPlayers.forEach(function (player) {
      if (player.id && !seen.has(player.id)) {
        seen.add(player.id);
        merged.push(player);
      }
    });

    liveState.comparePipelineIds = pipeline.map(function (row) {
      return row.player_id || row.players?.id;
    }).filter(Boolean);

    selectPanel.querySelector('.panel-body').innerHTML =
      '<div class="compare-select">' +
        '<div><label class="quiet-label" for="liveCompareFirst">Player one</label>' +
          '<select class="control" id="liveCompareFirst">' +
            '<option value="">Select first player</option>' +
            merged.map(liveCompareOption).join('') +
          '</select></div>' +
        '<div><label class="quiet-label" for="liveCompareSecond">Player two</label>' +
          '<select class="control" id="liveCompareSecond">' +
            '<option value="">Select second player</option>' +
            merged.map(liveCompareOption).join('') +
          '</select></div>' +
      '</div>' +
      '<div class="page-actions" style="display:flex;margin-top:10px">' +
        '<button class="btn primary" type="button" id="liveBuildComparison">' +
          'Compare selected players</button>' +
        '<button class="btn" type="button" id="liveComparePipelineOnly">' +
          'Use pipeline players</button>' +
      '</div>';

    document.getElementById('liveBuildComparison')
      .addEventListener('click',liveLoadComparison);

    document.getElementById('liveComparePipelineOnly')
      .addEventListener('click',function () {
        const pipelinePlayers = merged.filter(function (player) {
          return liveState.comparePipelineIds.indexOf(player.id) >= 0;
        });

        ['liveCompareFirst','liveCompareSecond'].forEach(function (id) {
          const select = document.getElementById(id);
          const current = select.value;
          select.innerHTML =
            '<option value="">Select pipeline player</option>' +
            pipelinePlayers.map(liveCompareOption).join('');
          if (
            pipelinePlayers.some(function (player) {
              return player.id === current;
            })
          ) {
            select.value = current;
          }
        });

        liveToast('Comparison selectors now show pipeline players.');
      });

    const query = new URLSearchParams(window.location.search);
    const first = query.get('first');
    const second = query.get('second');

    if (first) document.getElementById('liveCompareFirst').value = first;
    if (second) document.getElementById('liveCompareSecond').value = second;
    if (first && second) liveLoadComparison();

    liveRenderComparison();
  } catch (error) {
    selectPanel.querySelector('.panel-body').innerHTML =
      liveError(error.message || 'Players could not be loaded.');
  }
}

function liveCheckCards(values,selected,name) {
  return values.map(function (value) {
    const active = selected.indexOf(value) >= 0;

    return '<label class="check-card ' + (active ? 'active' : '') + '">' +
      '<input type="checkbox" name="' + liveEsc(name) +
        '" value="' + liveEsc(value) + '"' +
        (active ? ' checked' : '') + '>' +
      '<span>' + (active ? '✓' : '□') + ' ' + liveEsc(value) + '</span>' +
    '</label>';
  }).join('');
}

function liveFilterChecks(values,selected,name) {
  return values.map(function (value) {
    const active = selected.indexOf(value) >= 0;

    return '<label class="filter-pill ' + (active ? 'active' : '') + '">' +
      '<input type="checkbox" name="' + liveEsc(name) +
        '" value="' + liveEsc(value) + '"' +
        (active ? ' checked' : '') +
        ' style="position:absolute;opacity:0">' +
      liveEsc(value) +
    '</label>';
  }).join('');
}

function liveSetupFormMarkup(data) {
  const prefs = data.preferences || {};
  const team = data.scoutTeam || {};

  return '<form id="liveScoutSetupForm">' +
    '<section class="panel" style="margin-top:0">' +
      '<div class="panel-head"><h3>Scout profile</h3>' +
        '<span class="pill green">Saved to your user</span></div>' +
      '<div class="panel-body"><div class="form-grid">' +
        '<div class="field"><label for="liveSetupTeamName">Team name</label>' +
          '<input class="control" id="liveSetupTeamName" name="teamName" ' +
            'value="' + liveEsc(prefs.teamName || team.team_name || '') + '">' +
        '</div>' +
        '<div class="field"><label for="liveSetupClubName">Club / organisation</label>' +
          '<input class="control" id="liveSetupClubName" name="clubName" ' +
            'value="' + liveEsc(prefs.clubName || team.club_name || '') + '">' +
        '</div>' +
        '<div class="field"><label for="liveSetupCountry">Scout country</label>' +
          '<select class="control" id="liveSetupCountry" name="country">' +
            liveOptionList(
              Object.keys(LIVE_REGIONS),
              prefs.country || prefs.scoutCountry || 'England'
            ) +
          '</select></div>' +
        '<div class="field"><label for="liveSetupRegion">Scout region</label>' +
          '<select class="control" id="liveSetupRegion" name="scoutRegion"></select>' +
        '</div>' +
        '<div class="field"><label for="liveSetupFormation">Formation</label>' +
          '<select class="control" id="liveSetupFormation" name="formation">' +
            liveOptionList(LIVE_FORMATIONS,prefs.formation || '') +
          '</select></div>' +
        '<div class="field"><label for="liveSetupStyle">Playing style</label>' +
          '<select class="control" id="liveSetupStyle" name="playingStyle">' +
            liveOptionList(LIVE_STYLES,prefs.playingStyle || '') +
          '</select></div>' +
      '</div></div>' +
    '</section>' +
    '<section class="panel">' +
      '<div class="panel-head"><h3>Team weaknesses looking to be solved</h3>' +
        '<span class="pill grey">Select up to 3</span></div>' +
      '<div class="panel-body"><div class="check-grid" data-limit-group="teamWeaknesses">' +
        liveCheckCards(
          LIVE_WEAKNESSES,
          prefs.teamWeaknesses || [],
          'teamWeaknesses'
        ) +
      '</div></div>' +
    '</section>' +
    '<section class="panel">' +
      '<div class="panel-head"><h3>Role expectations</h3>' +
        '<span class="pill grey">Select up to 3</span></div>' +
      '<div class="panel-body"><div class="check-grid" data-limit-group="roleExpectations">' +
        liveCheckCards(
          LIVE_ROLES,
          prefs.roleExpectations || [],
          'roleExpectations'
        ) +
      '</div></div>' +
    '</section>' +
    '<section class="panel">' +
      '<div class="panel-head"><h3>Long-term goals</h3>' +
        '<span class="pill grey">Select up to 3</span></div>' +
      '<div class="panel-body"><div class="check-grid" data-limit-group="longTermGoals">' +
        liveCheckCards(
          LIVE_GOALS,
          prefs.longTermGoals || [],
          'longTermGoals'
        ) +
      '</div></div>' +
    '</section>' +
    '<section class="panel">' +
      '<div class="panel-head"><h3>Search preferences</h3></div>' +
      '<div class="panel-body">' +
        '<div class="field"><label>Age groups</label>' +
          '<div class="filter-pills" style="margin-top:5px">' +
            liveFilterChecks(
              LIVE_AGES,
              prefs.ageGroups || [],
              'ageGroups'
            ) +
          '</div></div>' +
        '<div class="field" style="margin-top:10px">' +
          '<label>Preferred positions</label>' +
          '<div class="filter-pills" style="margin-top:5px">' +
            liveFilterChecks(
              LIVE_POSITIONS,
              prefs.preferredPositions || [],
              'preferredPositions'
            ) +
          '</div></div>' +
        '<div class="form-grid" style="margin-top:10px">' +
          '<div class="field"><label for="liveSetupSalary">Salary cap (GBP/week)</label>' +
            '<input class="control" id="liveSetupSalary" name="salaryCap" ' +
              'type="number" min="0" value="' +
              liveEsc(prefs.salaryCap || '') + '">' +
          '</div>' +
          '<div class="field"><label for="liveSetupApps">Minimum appearances</label>' +
            '<input class="control" id="liveSetupApps" name="minAppearances" ' +
              'type="number" min="0" max="100" value="' +
              liveEsc(prefs.minAppearances || 0) + '">' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</section>' +
    '<div class="setup-footer">' +
      '<a class="btn ghost" style="color:#cbd5e1;border-color:rgba(255,255,255,.15)" ' +
        'href="' + LIVE_PATHS.dashboard + '">Cancel</a>' +
      '<button class="btn primary" type="submit">Save and apply</button>' +
    '</div>' +
  '</form>';
}

function liveUpdateSetupRegions(selected) {
  const country = document.getElementById('liveSetupCountry')?.value || 'England';
  const select = document.getElementById('liveSetupRegion');

  if (!select) return;

  const current = selected || select.value;

  select.innerHTML = liveOptionList(
    LIVE_REGIONS[country] || ['Other'],
    current
  );
}

function liveBindCheckCardLimits(root) {
  root.querySelectorAll('[data-limit-group]').forEach(function (group) {
    group.addEventListener('change',function (event) {
      const input = event.target;
      if (!input.matches('input[type="checkbox"]')) return;

      const checked = group.querySelectorAll('input:checked');

      if (checked.length > 3) {
        input.checked = false;
        liveToast('Select up to three options in this section.','error');
      }

      group.querySelectorAll('.check-card').forEach(function (card) {
        const active = card.querySelector('input').checked;
        card.classList.toggle('active',active);
        card.querySelector('span').textContent =
          (active ? '✓ ' : '□ ') +
          card.querySelector('input').value;
      });
    });
  });

  root.querySelectorAll('.filter-pill input').forEach(function (input) {
    input.addEventListener('change',function () {
      input.closest('.filter-pill')
        .classList.toggle('active',input.checked);
    });
  });
}

async function liveHydrateSetup() {
  const content = document.querySelector('.content');
  const hero = content.querySelector('.page-hero');

  try {
    const data = await liveApi('GET','/api/scouts/setup');
    liveState.setup = data;

    Array.from(content.children).forEach(function (child) {
      if (child !== hero) child.remove();
    });

    content.insertAdjacentHTML('beforeend',liveSetupFormMarkup(data));

    liveUpdateSetupRegions(
      data.preferences?.scoutRegion ||
      data.preferences?.scout_region ||
      ''
    );

    document.getElementById('liveSetupCountry')
      .addEventListener('change',function () {
        liveUpdateSetupRegions('');
      });

    liveBindCheckCardLimits(
      document.getElementById('liveScoutSetupForm')
    );

    document.getElementById('liveScoutSetupForm')
      .addEventListener('submit',async function (event) {
        event.preventDefault();

        const form = event.currentTarget;
        const data = new FormData(form);
        const button = form.querySelector('button[type="submit"]');

        const payload = {
          teamName:data.get('teamName'),
          clubName:data.get('clubName'),
          country:data.get('country'),
          scoutRegion:data.get('scoutRegion'),
          formation:data.get('formation'),
          playingStyle:data.get('playingStyle'),
          teamWeaknesses:data.getAll('teamWeaknesses'),
          roleExpectations:data.getAll('roleExpectations'),
          longTermGoals:data.getAll('longTermGoals'),
          ageGroups:data.getAll('ageGroups'),
          preferredPositions:data.getAll('preferredPositions'),
          salaryCap:data.get('salaryCap'),
          minAppearances:data.get('minAppearances')
        };

        button.disabled = true;
        button.textContent = 'Saving…';

        try {
          await liveApi('POST','/api/scouts/setup',payload);
          liveToast('Scout setup saved and applied.');
          liveState.setup = null;
          liveTrack('scout_setup_saved',{
            weaknessCount:payload.teamWeaknesses.length,
            roleCount:payload.roleExpectations.length,
            goalCount:payload.longTermGoals.length
          });
        } catch (error) {
          liveToast(error.message,'error');
        } finally {
          button.disabled = false;
          button.textContent = 'Save and apply';
        }
      });
  } catch (error) {
    content.insertAdjacentHTML(
      'beforeend',
      liveError(error.message || 'Scout Setup could not be loaded.')
    );
  }
}

function liveEventCard(event) {
  const dateValue = event.event_date
    ? new Date(event.event_date)
    : null;

  const status = event.myAttendanceStatus;
  const full = liveNum(event.confirmedCount) >= liveNum(event.max_scouts || 20);

  return '<article class="live-event-card">' +
    '<div style="display:flex;justify-content:space-between;gap:10px">' +
      '<div><span class="quiet-label">' +
        liveEsc(
          dateValue
            ? dateValue.toLocaleDateString(
                'en-GB',
                {weekday:'short',day:'2-digit',month:'short',year:'numeric'}
              )
            : 'Date TBC'
        ) +
      '</span><h3>' + liveEsc(event.event_name || 'ScoutLink Showcase') + '</h3>' +
      '<p>' +
        liveEsc(
          [
            event.venue_name,
            event.venue_address
          ].filter(Boolean).join(' · ') || 'Venue TBC'
        ) +
      '</p></div>' +
      '<span class="pill ' +
        (status === 'confirmed' ? 'green' : status === 'waitlisted' ? 'gold' : 'grey') +
        '">' +
        liveEsc(
          status
            ? liveStage(status)
            : full ? 'Waitlist available' : 'Places available'
        ) +
      '</span>' +
    '</div>' +
    '<p>' + liveEsc(event.description || 'ScoutLink live player showcase.') + '</p>' +
    '<div class="metric-grid" style="margin-top:10px">' +
      liveMetricBox(
        liveNum(event.confirmedCount) + '/' + liveNum(event.max_scouts || 20),
        'Scout places'
      ) +
      liveMetricBox(liveNum(event.waitlistedCount),'Waitlisted') +
      liveMetricBox(
        dateValue
          ? dateValue.toLocaleTimeString(
              'en-GB',
              {hour:'2-digit',minute:'2-digit'}
            )
          : 'TBC',
        'Start time'
      ) +
    '</div>' +
    '<div class="page-actions">' +
      '<button class="btn" type="button" data-event-details="' +
        liveEsc(event.id) + '">View event</button>' +
      (
        status === 'confirmed' || status === 'waitlisted'
          ? '<button class="btn danger" type="button" data-event-cancel="' +
            liveEsc(event.id) + '">Cancel attendance</button>'
          : '<button class="btn primary" type="button" data-event-attend="' +
            liveEsc(event.id) + '">' +
            (full ? 'Join waitlist' : 'Confirm attendance') +
            '</button>'
      ) +
    '</div>' +
  '</article>';
}

async function liveEventDetails(event) {
  try {
    const response = await liveApi(
      'GET',
      '/api/showcase/' + encodeURIComponent(event.id)
    );

    const players = response.players || [];
    const body =
      '<div class="grid2">' +
        '<div class="result-card"><small>Date</small><b>' +
          liveDate(event.event_date) +
        '</b></div>' +
        '<div class="result-card"><small>Venue</small><b>' +
          liveEsc(event.venue_name || 'TBC') +
        '</b></div>' +
        '<div class="result-card"><small>Confirmed scouts</small><b>' +
          liveNum(response.confirmedCount) +
        '</b></div>' +
        '<div class="result-card"><small>Players announced</small><b>' +
          players.length +
        '</b></div>' +
      '</div>' +
      '<div class="match-list" style="margin-top:12px">' +
        (
          players.length
            ? players.map(function (row) {
                const player = row.players || {};
                return '<div class="match-row"><div><b>' +
                  liveEsc(livePlayerName(player)) +
                  '</b><span>' +
                  liveEsc(
                    liveAgeGroup(player) + ' · ' +
                    livePlayerPosition(player) + ' · ' +
                    (player.team_name || 'Team TBC')
                  ) +
                  '</span></div><button class="btn sm" type="button" ' +
                  'data-player-profile="' + liveEsc(player.id) +
                  '">Open player</button></div>';
              }).join('')
            : '<div class="professional-empty">' +
                '<b>Player list not published</b>' +
                '<span>Players appear after Stratex confirms the event selection.</span>' +
              '</div>'
        ) +
      '</div>';

    const modal = liveModal(event.event_name || 'Showcase event',body);
    liveBindProfileLinks(modal);
  } catch (error) {
    liveToast(error.message,'error');
  }
}

async function liveHydrateEvents() {
  const panel = livePanelByTitle('Upcoming showcase events');
  if (!panel) return;

  const body = panel.querySelector('.panel-body');
  body.innerHTML = liveLoading('Loading ScoutLink showcase events…');

  try {
    const response = await liveApi('GET','/api/showcase');
    const events = response.data || [];
    liveState.events = events;

    const count = panel.querySelector('.panel-head .pill');
    if (count) count.textContent = events.length + ' upcoming';

    body.innerHTML = events.length
      ? '<div class="grid3">' +
          events.map(liveEventCard).join('') +
        '</div>'
      : '<div class="empty-state">' +
          '<div class="empty-icon">EV</div>' +
          '<h4>No events available yet</h4>' +
          '<p>Check back soon or enable event notifications.</p>' +
          '<a class="btn primary sm" href="' +
            LIVE_PATHS.settings + '#notifications">Turn on alerts</a>' +
        '</div>';

    body.querySelectorAll('[data-event-details]')
      .forEach(function (button) {
        button.addEventListener('click',function () {
          const event = events.find(function (item) {
            return String(item.id) === String(button.dataset.eventDetails);
          });
          if (event) liveEventDetails(event);
        });
      });

    body.querySelectorAll('[data-event-attend]')
      .forEach(function (button) {
        button.addEventListener('click',async function () {
          button.disabled = true;
          const original = button.textContent;
          button.textContent = 'Saving…';

          try {
            const result = await liveApi(
              'POST',
              '/api/scouts/showcase-attendance',
              {eventId:button.dataset.eventAttend}
            );

            liveToast(result.message || 'Attendance saved.');
            await liveHydrateEvents();
          } catch (error) {
            liveToast(error.message,'error');
            button.disabled = false;
            button.textContent = original;
          }
        });
      });

    body.querySelectorAll('[data-event-cancel]')
      .forEach(function (button) {
        button.addEventListener('click',async function () {
          if (!window.confirm('Cancel attendance for this showcase event?')) {
            return;
          }

          button.disabled = true;

          try {
            const result = await liveApi(
              'POST',
              '/api/scouts/showcase-cancel',
              {eventId:button.dataset.eventCancel}
            );

            liveToast(result.message || 'Attendance cancelled.');
            await liveHydrateEvents();
          } catch (error) {
            liveToast(error.message,'error');
            button.disabled = false;
          }
        });
      });
  } catch (error) {
    body.innerHTML = liveError(
      error.message || 'Showcase events could not be loaded.'
    );
  }
}

function liveChatOther(thread) {
  return thread.coaches || thread.coach || {};
}

function liveChatOtherName(thread) {
  const other = liveChatOther(thread);
  return livePlayerName(other).replace(/^Player$/,'Coach');
}

function liveChatInitials(thread) {
  const other = liveChatOther(thread);
  return liveInitials(other.first_name,other.last_name);
}

function liveChatPlayer(thread) {
  return thread.players || thread.player || {};
}

function liveRenderChatThreads() {
  const list = document.querySelector('.conversation-list');
  if (!list) return;

  const head = list.querySelector('.conversation-head');
  list.innerHTML =
    (head ? head.outerHTML : '<div class="conversation-head"><h3>Conversations</h3><button class="btn sm" type="button" data-refresh-chat>Refresh</button></div>') +
    (
      liveState.chats.length
        ? liveState.chats.map(function (thread) {
            const player = liveChatPlayer(thread);
            return '<button class="conversation ' +
              (liveState.activeChat?.id === thread.id ? 'active' : '') +
              '" type="button" data-chat-thread="' + liveEsc(thread.id) +
              '" style="width:100%;text-align:left;background:' +
              (liveState.activeChat?.id === thread.id ? '#effbf7' : '#fff') +
              ';cursor:pointer">' +
              '<div class="user-avatar">' +
                liveEsc(liveChatInitials(thread)) +
              '</div><div><b>' +
                liveEsc(liveChatOtherName(thread)) +
                (thread.unreadCount
                  ? ' · ' + liveNum(thread.unreadCount) + ' unread'
                  : '') +
              '</b><span>' +
                liveEsc(
                  thread.lastMessagePreview ||
                  livePlayerName(player) + ' · ' + (player.team_name || '')
                ) +
              '</span></div>' +
            '</button>';
          }).join('')
        : '<div class="professional-empty" style="padding:16px">' +
            '<b>No chats yet</b>' +
            '<span>Add a player to the pipeline, then message their coach.</span>' +
            '<a class="btn sm" href="' + LIVE_PATHS.search +
              '" style="margin-top:8px">Find players</a>' +
          '</div>'
    );

  list.querySelectorAll('[data-chat-thread]')
    .forEach(function (button) {
      button.addEventListener('click',function () {
        liveSelectChat(button.dataset.chatThread);
      });
    });

  list.querySelector('[data-refresh-chat]')
    ?.addEventListener('click',liveHydrateChat);
}

function liveShareCard(message) {
  const meta = message.metadata || {};
  const type = String(message.reference_type || 'item');
  const title =
    meta.playerName ||
    meta.opponent ||
    meta.predictionType ||
    'Shared ScoutLink item';

  const lines = type === 'player'
    ? [
        meta.position,
        meta.ageGroup,
        meta.teamName,
        meta.stage ? 'Stage: ' + meta.stage : '',
        meta.overall ? 'Overall: ' + meta.overall : ''
      ]
    : type === 'fixture'
      ? [
          meta.fixtureDate,
          meta.fixtureTime,
          meta.homeOrAway,
          meta.venue,
          meta.city
        ]
      : [
          meta.playerName,
          meta.runAt ? liveDate(meta.runAt) : '',
          meta.summary
        ];

  return '<div class="shared-card">' +
    '<b>' + liveEsc(title) + '</b>' +
    '<div style="font-size:7px;color:var(--muted)">' +
      liveEsc(lines.filter(Boolean).join(' · ')) +
    '</div>' +
    (meta.profileUrl
      ? '<a class="btn sm" style="margin-top:6px" href="' +
        liveEsc(meta.profileUrl) + '">Open profile</a>'
      : '') +
  '</div>';
}

function liveRenderMessages(messages) {
  const box = document.querySelector('.messages');

  if (!messages.length) {
    box.innerHTML =
      '<div class="professional-empty" style="margin:auto">' +
        '<b>No messages yet</b>' +
        '<span>Send the first coach-mediated message in this thread.</span>' +
      '</div>';
    return;
  }

  const user = liveAuthUser();

  box.innerHTML = messages.map(function (message) {
    const mine = String(message.sender_id) === String(user.id);

    return '<div class="bubble ' + (mine ? 'mine' : '') + '">' +
      liveEsc(message.body || '') +
      (message.message_kind === 'share'
        ? liveShareCard(message)
        : '') +
      '<div style="font-size:6px;color:var(--muted);margin-top:5px">' +
        liveEsc(liveDateTime(message.created_at)) +
      '</div>' +
    '</div>';
  }).join('');

  box.scrollTop = box.scrollHeight;
}

function liveRenderChatShareOptions() {
  const type = document.getElementById('liveChatShareType')?.value || 'player';
  const target = document.getElementById('liveChatShareTarget');

  if (!target) return;

  const rows = liveState.chatShare[type] || [];

  target.innerHTML =
    '<option value="">Select ' + type + '</option>' +
    rows.map(function (row) {
      let id = row.id;
      let label = '';

      if (type === 'player') {
        const player = row.players || {};
        id = row.player_id || player.id;
        label =
          livePlayerName(player) +
          ' · ' +
          livePlayerPosition(player) +
          ' · ' +
          liveStage(row.stage);
      } else if (type === 'fixture') {
        label =
          liveDate(row.fixture_date) +
          ' · ' +
          (row.home_or_away === 'Away' ? '@ ' : 'vs ') +
          (row.opponent || 'Fixture');
      } else {
        const player = row.players || {};
        label =
          (row.prediction_type || 'Prediction') +
          ' · ' +
          livePlayerName(player);
      }

      return '<option value="' + liveEsc(id) + '">' +
        liveEsc(label) +
      '</option>';
    }).join('');
}

async function liveSelectChat(id) {
  const thread = liveState.chats.find(function (item) {
    return String(item.id) === String(id);
  });

  if (!thread) return;

  liveState.activeChat = thread;
  liveRenderChatThreads();

  const player = liveChatPlayer(thread);
  const threadHead = document.querySelector('.thread-head');

  threadHead.innerHTML =
    '<div><button class="btn sm live-chat-back" type="button" ' +
      'data-chat-back style="margin-right:8px">Back</button>' +
      '<b>' + liveEsc(liveChatOtherName(thread)) + '</b>' +
      '<div style="font-size:7px;color:var(--muted)">' +
        liveEsc(
          [
            livePlayerName(player) !== 'Player'
              ? livePlayerName(player)
              : '',
            player.team_name,
            liveChatOther(thread).email
          ].filter(Boolean).join(' · ')
        ) +
      '</div></div>' +
    (player.id
      ? '<button class="btn sm" type="button" data-player-profile="' +
        liveEsc(player.id) + '">View player</button>'
      : '');

  liveBindProfileLinks(threadHead);

  threadHead.querySelector('[data-chat-back]')
    ?.addEventListener('click',function () {
      document.querySelector('.chat-layout')
        .classList.remove('mobile-detail');
      document.querySelector('.chat-layout')
        .classList.add('mobile-list');
    });

  const layout = document.querySelector('.chat-layout');
  layout.classList.remove('mobile-list');
  layout.classList.add('mobile-detail');

  document.querySelector('.messages').innerHTML =
    liveLoading('Loading messages…');

  try {
    const response = await liveApi(
      'GET',
      '/api/chat/threads/' + encodeURIComponent(thread.id) + '/messages'
    );

    liveRenderMessages(response.data || []);
  } catch (error) {
    document.querySelector('.messages').innerHTML =
      liveError(error.message || 'Messages could not be loaded.');
  }
}

async function liveHydrateChat() {
  const layout = document.querySelector('.chat-layout');
  if (!layout) return;

  layout.classList.add('mobile-list');

  try {
    const responses = await Promise.allSettled([
      liveApi('GET','/api/chat/threads'),
      liveApi('GET','/api/scouts/pipeline?limit=100'),
      liveApi('GET','/api/scouts/fixtures'),
      liveApi('GET','/api/predictions')
    ]);

    liveState.chats = responses[0].status === 'fulfilled'
      ? responses[0].value.data || []
      : [];

    liveState.chatShare.player = responses[1].status === 'fulfilled'
      ? responses[1].value.data || []
      : [];

    liveState.chatShare.fixture = responses[2].status === 'fulfilled'
      ? responses[2].value.data || []
      : [];

    liveState.chatShare.prediction = responses[3].status === 'fulfilled'
      ? responses[3].value.data || []
      : [];

    const list = document.querySelector('.conversation-list');
    list.innerHTML =
      '<div class="conversation-head"><h3>Conversations</h3>' +
        '<button class="btn sm" type="button" data-refresh-chat>Refresh</button>' +
      '</div>';

    liveRenderChatThreads();

    const shareBar = document.querySelector(
      '.thread > div:nth-child(2)'
    );

    if (shareBar) {
      shareBar.innerHTML =
        '<select class="control" id="liveChatShareType">' +
          '<option value="player">Player</option>' +
          '<option value="fixture">Fixture</option>' +
          '<option value="prediction">Prediction</option>' +
        '</select>' +
        '<select class="control" id="liveChatShareTarget">' +
          '<option value="">Select player</option>' +
        '</select>' +
        '<button class="btn sm" type="button" id="liveChatShareButton">' +
          'Share</button>';
    }

    liveRenderChatShareOptions();

    document.getElementById('liveChatShareType')
      ?.addEventListener('change',liveRenderChatShareOptions);

    document.getElementById('liveChatShareButton')
      ?.addEventListener('click',async function () {
        if (!liveState.activeChat) {
          liveToast('Select a conversation first.','error');
          return;
        }

        const type = document.getElementById('liveChatShareType').value;
        const referenceId =
          document.getElementById('liveChatShareTarget').value;

        if (!referenceId) {
          liveToast('Select an item to share.','error');
          return;
        }

        const button = this;
        button.disabled = true;
        button.textContent = 'Sharing…';

        try {
          await liveApi(
            'POST',
            '/api/chat/threads/' +
              encodeURIComponent(liveState.activeChat.id) +
              '/share',
            {type,referenceId}
          );

          await liveSelectChat(liveState.activeChat.id);
          liveToast('ScoutLink item shared.');
        } catch (error) {
          liveToast(error.message,'error');
        } finally {
          button.disabled = false;
          button.textContent = 'Share';
        }
      });

    const composer = document.querySelector('.composer');

    if (composer) {
      composer.innerHTML =
        '<textarea class="control" id="liveChatMessage" ' +
          'placeholder="Write a message…" aria-label="Message"></textarea>' +
        '<button class="btn primary" type="button" id="liveChatSend">' +
          'Send</button>';

      document.getElementById('liveChatSend')
        .addEventListener('click',async function () {
          if (!liveState.activeChat) {
            liveToast('Select a conversation first.','error');
            return;
          }

          const textarea = document.getElementById('liveChatMessage');
          const body = textarea.value.trim();

          if (!body) {
            liveToast('Write a message before sending.','error');
            return;
          }

          const button = this;
          button.disabled = true;
          button.textContent = 'Sending…';

          try {
            await liveApi(
              'POST',
              '/api/chat/threads/' +
                encodeURIComponent(liveState.activeChat.id) +
                '/messages',
              {body}
            );

            textarea.value = '';
            await liveSelectChat(liveState.activeChat.id);
            liveHydrateChatThreadsOnly();
          } catch (error) {
            liveToast(error.message,'error');
          } finally {
            button.disabled = false;
            button.textContent = 'Send';
          }
        });
    }

    const selected =
      new URLSearchParams(window.location.search).get('thread') ||
      (
        window.innerWidth > 767 &&
        liveState.chats[0] &&
        liveState.chats[0].id
      );

    if (selected) {
      await liveSelectChat(selected);
    }
  } catch (error) {
    document.querySelector('.conversation-list').innerHTML =
      liveError(error.message || 'Chat could not be loaded.');
  }
}

async function liveHydrateChatThreadsOnly() {
  try {
    const response = await liveApi('GET','/api/chat/threads');
    liveState.chats = response.data || [];
    liveRenderChatThreads();
  } catch (_) {}
}

function liveNotificationIcon(notification) {
  const group = notification.filterGroup || notification.notification_type;

  if (/message/.test(group)) return 'CH';
  if (/fixture|event/.test(group)) return 'FX';
  if (/recruit/.test(group)) return 'PL';
  if (/match/.test(group)) return 'MF';
  if (/scout/.test(group)) return 'SI';
  return 'SY';
}

function liveNotificationAction(notification) {
  const data = notification.data || {};
  const url =
    data.actionUrl ||
    data.profileUrl ||
    (
      data.playerId
        ? LIVE_PATHS.profile + '?id=' + encodeURIComponent(data.playerId)
        : data.eventId
          ? LIVE_PATHS.events + '?event=' + encodeURIComponent(data.eventId)
          : /message/.test(notification.filterGroup || '')
            ? LIVE_PATHS.chat
            : ''
    );

  return url;
}

function liveRenderNotifications(filter) {
  const list = document.querySelector('.notification-list');
  if (!list) return;

  const rows = liveState.notifications.filter(function (notification) {
    return !filter || filter === 'all' ||
      String(notification.filterGroup || '').toLowerCase() === filter;
  });

  list.innerHTML = rows.length
    ? rows.map(function (notification) {
        return '<article class="notification ' +
          (!notification.is_read ? 'unread' : '') +
          '" data-notification="' + liveEsc(notification.id) + '">' +
          '<div class="notification-icon">' +
            liveEsc(liveNotificationIcon(notification)) +
          '</div>' +
          '<div><b>' + liveEsc(notification.title || 'ScoutLink update') +
          '</b><p>' + liveEsc(notification.body || '') + '</p></div>' +
          '<time>' + liveEsc(liveRelative(notification.created_at)) + '</time>' +
        '</article>';
      }).join('')
    : '<div class="empty-state">' +
        '<div class="empty-icon">NT</div>' +
        '<h4>No notifications in this category</h4>' +
        '<p>New ScoutLink activity will appear here.</p>' +
      '</div>';

  list.querySelectorAll('[data-notification]')
    .forEach(function (item) {
      item.addEventListener('click',async function () {
        const notification = rows.find(function (row) {
          return String(row.id) === String(item.dataset.notification);
        });

        if (!notification) return;

        if (!notification.is_read) {
          try {
            await liveApi(
              'PATCH',
              '/api/notifications/' +
                encodeURIComponent(notification.id) +
                '/read',
              {}
            );
            notification.is_read = true;
            item.classList.remove('unread');
          } catch (_) {}
        }

        const url = liveNotificationAction(notification);
        if (url) liveGo(url);
      });
    });
}

async function liveHydrateNotifications() {
  const list = document.querySelector('.notification-list');
  if (!list) return;

  list.innerHTML = liveLoading('Loading notifications…');

  try {
    const response = await liveApi(
      'GET',
      '/api/notifications?limit=100'
    );

    liveState.notifications = response.data || [];
    liveRenderNotifications('all');

    const filterLabels = [
      ['All','all'],
      ['Messages','messages'],
      ['Scout interest','scout_interest'],
      ['Match facts','match_fact'],
      ['Recruitment','recruitment'],
      ['Fixtures / Events','fixtures_events'],
      ['System','system']
    ];

    const filters = document.querySelector(
      '.content > .filter-pills'
    );

    if (filters) {
      filters.innerHTML = filterLabels.map(function (item,index) {
        return '<button class="filter-pill ' +
          (index === 0 ? 'active' : '') +
          '" type="button" data-notification-filter="' +
          liveEsc(item[1]) + '">' +
          liveEsc(item[0]) +
        '</button>';
      }).join('');

      filters.querySelectorAll('[data-notification-filter]')
        .forEach(function (button) {
          button.addEventListener('click',function () {
            filters.querySelectorAll('.filter-pill').forEach(function (item) {
              item.classList.toggle('active',item === button);
            });
            liveRenderNotifications(button.dataset.notificationFilter);
          });
        });
    }

    liveOn('Mark all read',async function () {
      try {
        await liveApi(
          'PATCH',
          '/api/notifications/read-all',
          {}
        );

        liveState.notifications.forEach(function (notification) {
          notification.is_read = true;
        });

        liveRenderNotifications('all');
        liveToast('All notifications marked as read.');
      } catch (error) {
        liveToast(error.message,'error');
      }
    });
  } catch (error) {
    list.innerHTML = liveError(
      error.message || 'Notifications could not be loaded.'
    );
  }
}

function liveConcernFormMarkup() {
  const user = liveAuthUser();

  return '<form id="liveConcernForm">' +
    '<div class="recommendation" ' +
      'style="background:#fff0f1;border-color:#f0c8cd;color:#8d2431">' +
      '<b>Immediate danger or urgent safeguarding risk:</b> ' +
      'contact emergency services or the relevant safeguarding authority ' +
      'before submitting a platform concern.' +
    '</div>' +
    '<div class="form-grid" style="margin-top:10px">' +
      '<div class="field"><label for="liveConcernType">Concern type</label>' +
        '<select class="control" id="liveConcernType" name="concernType" required>' +
          liveOptionList(
            [
              'Safeguarding concern','Data misuse','False identity',
              'Inappropriate contact','Platform safety','Other'
            ],
            '',
            'Select category'
          ) +
        '</select></div>' +
      '<div class="field"><label for="liveConcernUrgency">Urgency</label>' +
        '<select class="control" id="liveConcernUrgency" name="urgency">' +
          '<option value="Standard">Standard</option>' +
          '<option value="Urgent">Urgent</option>' +
        '</select></div>' +
      '<div class="field"><label for="liveConcernAccount">Person or account involved</label>' +
        '<input class="control" id="liveConcernAccount" ' +
          'name="personOrAccount" placeholder="Name, email or account if known">' +
      '</div>' +
      '<div class="field"><label for="liveConcernPlayer">Player or team</label>' +
        '<input class="control" id="liveConcernPlayer" ' +
          'name="playerOrTeam" placeholder="Player, team, club or school">' +
      '</div>' +
      '<div class="field field-full"><label for="liveConcernDescription">What happened?</label>' +
        '<textarea class="control" id="liveConcernDescription" ' +
          'name="description" required ' +
          'placeholder="Provide dates, people involved and the clearest useful context."></textarea>' +
      '</div>' +
      '<div class="field"><label for="liveConcernName">Your name</label>' +
        '<input class="control" id="liveConcernName" name="contactName" ' +
          'value="' + liveEsc(liveUserLabel()) + '">' +
      '</div>' +
      '<div class="field"><label for="liveConcernEmail">Your email</label>' +
        '<input class="control" id="liveConcernEmail" name="contactEmail" ' +
          'type="email" required value="' + liveEsc(user.email || '') + '">' +
      '</div>' +
      '<div class="field"><label for="liveConcernPhone">Phone number</label>' +
        '<input class="control" id="liveConcernPhone" name="contactPhone" type="tel">' +
      '</div>' +
      '<div class="field field-full"><label for="liveConcernFile">Supporting file</label>' +
        '<input class="control" id="liveConcernFile" name="supportingFile" ' +
          'type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx">' +
        '<span style="font-size:7px;color:var(--muted)">Optional. PDF, JPG, PNG, DOC or DOCX up to 5MB.</span>' +
      '</div>' +
    '</div>' +
    '<div class="scout-live-form-message" id="liveConcernMessage"></div>' +
    '<div style="display:flex;justify-content:flex-end;gap:7px;margin-top:10px">' +
      '<button class="btn" type="button" data-save-concern-draft>Save draft</button>' +
      '<button class="btn dark" type="submit">Submit concern</button>' +
    '</div>' +
  '</form>';
}

function liveConcernDraft() {
  try {
    return JSON.parse(
      localStorage.getItem('scout_concern_draft_v3') || '{}'
    );
  } catch (_) {
    return {};
  }
}

async function liveHydrateConcern() {
  const panel = document.querySelector('.content .panel');
  if (!panel) return;

  panel.querySelector('.panel-body').innerHTML =
    liveConcernFormMarkup();

  const form = document.getElementById('liveConcernForm');
  const draft = liveConcernDraft();

  Object.keys(draft).forEach(function (key) {
    const field = form.elements[key];
    if (field && draft[key]) field.value = draft[key];
  });

  form.querySelector('[data-save-concern-draft]')
    .addEventListener('click',function () {
      const values = Object.fromEntries(
        Array.from(new FormData(form).entries()).filter(function (entry) {
          return entry[0] !== 'supportingFile';
        })
      );
      try {
        localStorage.setItem(
          'scout_concern_draft_v3',
          JSON.stringify(values)
        );
      } catch (_) {}
      liveToast('Concern draft saved in this browser.');
    });

  form.addEventListener('submit',async function (event) {
    event.preventDefault();

    const formData = new FormData(form);
    const data = Object.fromEntries(
      Array.from(formData.entries()).filter(function (entry) {
        return entry[0] !== 'supportingFile';
      })
    );
    const evidence = form.elements.supportingFile.files[0];
    const message = document.getElementById('liveConcernMessage');
    const button = form.querySelector('button[type="submit"]');

    if (
      !data.concernType ||
      !data.description ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail || '')
    ) {
      message.className = 'scout-live-form-message error';
      message.textContent =
        'Complete the concern type, description and a valid contact email.';
      return;
    }

    if (evidence) {
      if (evidence.size > 5 * 1024 * 1024) {
        message.className = 'scout-live-form-message error';
        message.textContent = 'The supporting file must be 5MB or smaller.';
        return;
      }

      if (!/\.(pdf|jpe?g|png|doc|docx)$/i.test(evidence.name || '')) {
        message.className = 'scout-live-form-message error';
        message.textContent =
          'Use a PDF, JPG, PNG, DOC or DOCX supporting file.';
        return;
      }
    }

    formData.set('sourcePage','/scout/report-a-concern');
    formData.set('role','Scout');

    button.disabled = true;
    button.textContent = 'Submitting…';

    try {
      const responseRaw = await fetch(
        (window.API ||
          localStorage.getItem('sl_api_url') ||
          'https://scoutlink-api.vercel.app') +
          '/api/trust/safeguarding-concerns-with-evidence',
        {
          method:'POST',
          headers:{
            Authorization:'Bearer ' + liveToken()
          },
          body:formData,
          credentials:'include'
        }
      );

      const response = await responseRaw.json().catch(function () {
        return {};
      });

      if (!responseRaw.ok) {
        throw new Error(
          response.error ||
          'The concern could not be submitted.'
        );
      }

      message.className = 'scout-live-form-message success';
      message.textContent =
        response.message ||
        'Concern submitted to the restricted Stratex review queue.';

      form.reset();
      try {
        localStorage.removeItem('scout_concern_draft_v3');
      } catch (_) {}

      liveTrack('scout_concern_submitted',{
        concernType:data.concernType,
        urgency:data.urgency
      });
    } catch (error) {
      message.className = 'scout-live-form-message error';
      message.textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = 'Submit concern';
    }
  });
}

function liveSettingsMarkup(profile,settings,setup) {
  const user = liveAuthUser();
  const scout = profile.scout || {};
  const team = profile.scoutTeam || {};
  const prefs = setup.preferences || {};

  return '<section class="settings-layout" style="margin-top:12px">' +
    '<nav class="settings-nav" aria-label="Settings sections">' +
      [
        ['account','Account'],
        ['appearance','Appearance'],
        ['notifications','Notifications'],
        ['team','Team'],
        ['security','Security'],
        ['plan','Plan']
      ].map(function (item) {
        return '<button class="settings-link ' +
          (liveState.settingsSection === item[0] ? 'active' : '') +
          '" type="button" data-settings-section="' +
          item[0] + '">' + item[1] + '</button>';
      }).join('') +
    '</nav>' +
    '<div id="liveSettingsContent">' +
      '<section class="setting-section" data-settings-panel="account">' +
        '<h3>Account details</h3>' +
        '<p>Information connected to the ScoutLink scout account.</p>' +
        '<div class="setting-row"><div><b>Name</b><span>' +
          liveEsc(liveUserLabel()) +
        '</span></div><span class="pill green">Reviewed Scout</span></div>' +
        '<div class="setting-row"><div><b>Email</b><span>' +
          liveEsc(user.email || scout.email || '—') +
        '</span></div><span class="pill grey">Verified</span></div>' +
        '<div class="setting-row"><div><b>Scout ID</b><span>' +
          liveEsc(scout.scout_id || scout.id || '—') +
        '</span></div><button class="btn sm" type="button" data-copy-scout-id>' +
          'Copy</button></div>' +
      '</section>' +
      '<section class="setting-section" data-settings-panel="appearance">' +
        '<h3>Appearance</h3>' +
        '<p>Choose how ScoutLink appears for this account.</p>' +
        '<div class="setting-row"><div><b>Theme</b><span>' +
          liveEsc(settings.theme === 'light' ? 'Light' : 'Dark') +
        '</span></div><div>' +
          '<button class="btn sm ' +
            (settings.theme === 'dark' ? 'primary' : '') +
            '" type="button" data-theme="dark">Dark</button> ' +
          '<button class="btn sm ' +
            (settings.theme === 'light' ? 'primary' : '') +
            '" type="button" data-theme="light">Light</button>' +
        '</div></div>' +
      '</section>' +
      '<section class="setting-section" data-settings-panel="notifications">' +
        '<h3>Notification preferences</h3>' +
        '<p>Control how ScoutLink activity reaches you.</p>' +
        liveSettingToggle(
          'Email notifications',
          'Player, coach and pipeline updates',
          'emailAlerts',
          settings.emailAlerts !== false
        ) +
        liveSettingToggle(
          'In-app notifications',
          'See alerts inside ScoutLink',
          'pushAlerts',
          settings.pushAlerts !== false
        ) +
        liveSettingToggle(
          'Event notifications',
          'New showcase and fixture alerts',
          'eventAlerts',
          settings.eventAlerts !== false
        ) +
        liveSettingToggle(
          'Platform updates',
          'Feature announcements',
          'platformUpdates',
          settings.platformUpdates === true
        ) +
        liveSettingToggle(
          'Weekly summary',
          'Weekly recruitment digest',
          'weeklySummary',
          settings.weeklySummary !== false
        ) +
        '<button class="btn primary" type="button" id="liveSaveNotificationSettings" ' +
          'style="margin-top:10px">Save notification settings</button>' +
      '</section>' +
      '<section class="setting-section" data-settings-panel="team" id="team">' +
        '<h3>Team and organisation</h3>' +
        '<p>Current organisation and Scout Setup context.</p>' +
        '<div class="setting-row"><div><b>Scout team</b><span>' +
          liveEsc(
            prefs.teamName ||
            team.team_name ||
            team.name ||
            'Individual Scout workspace'
          ) +
        '</span></div><a class="btn sm" href="' +
          LIVE_PATHS.setup + '">Manage</a></div>' +
        '<div class="setting-row"><div><b>Club / organisation</b><span>' +
          liveEsc(
            prefs.clubName ||
            scout.club_name ||
            team.club_name ||
            'Not set'
          ) +
        '</span></div><a class="btn sm" href="' +
          LIVE_PATHS.setup + '">Edit</a></div>' +
      '</section>' +
      '<section class="setting-section" data-settings-panel="security">' +
        '<h3>Security</h3>' +
        '<p>Protect the ScoutLink account.</p>' +
        '<div class="setting-row"><div><b>Change password</b>' +
          '<span>Minimum 8 characters</span></div>' +
          '<button class="btn sm" type="button" data-change-password>' +
            'Change</button></div>' +
        '<div class="setting-row"><div><b>Current session</b>' +
          '<span>This browser is signed in</span></div>' +
          '<button class="btn sm" type="button" data-review-session>' +
            'Review</button></div>' +
      '</section>' +
      '<section class="setting-section" data-settings-panel="plan" id="plan">' +
        '<h3>Plan and limits</h3>' +
        '<p>Current ScoutLink plan and remaining allowances.</p>' +
        '<div class="setting-row"><div><b>Plan</b><span>' +
          liveEsc(
            team.subscription_plan ||
            scout.subscription_plan ||
            'Core'
          ) +
        '</span></div><span class="pill green">Active</span></div>' +
        '<div class="grid3" style="margin-top:10px">' +
          liveMetricBox(scout.interests_remaining ?? '—','Interest requests remaining') +
          liveMetricBox(scout.predictions_remaining ?? '—','Predictions remaining') +
          liveMetricBox(scout.exports_remaining ?? '—','Exports remaining') +
        '</div>' +
        '<a class="btn primary" href="mailto:info@scoutlink.app?subject=ScoutLink%20plan%20and%20limits" ' +
          'style="margin-top:10px">Contact Stratex about limits</a>' +
      '</section>' +
      '<section class="setting-section">' +
        '<h3>Scout setup</h3>' +
        '<p>Configure team weaknesses, role expectations, long-term goals and search preferences.</p>' +
        '<a class="btn primary" href="' + LIVE_PATHS.setup +
          '">Go to Scout Setup</a>' +
      '</section>' +
    '</div>' +
  '</section>';
}

function liveSettingToggle(title,copy,key,on) {
  return '<div class="setting-row">' +
    '<div><b>' + liveEsc(title) + '</b><span>' +
      liveEsc(copy) +
    '</span></div>' +
    '<button class="toggle ' + (on ? 'on' : '') +
      '" type="button" data-setting-toggle="' + liveEsc(key) +
      '" aria-pressed="' + (on ? 'true' : 'false') +
      '" aria-label="' + liveEsc(title) + '"></button>' +
  '</div>';
}

function liveShowSettingsSection(section) {
  liveState.settingsSection = section;

  document.querySelectorAll('[data-settings-section]')
    .forEach(function (button) {
      button.classList.toggle(
        'active',
        button.dataset.settingsSection === section
      );
    });

  document.querySelectorAll('[data-settings-panel]')
    .forEach(function (panel) {
      panel.style.display =
        panel.dataset.settingsPanel === section ? '' : 'none';
    });
}

async function liveSaveSettings(settings) {
  try {
    const response = await liveApi(
      'PATCH',
      '/api/scouts/settings',
      settings
    );

    liveToast(response.message || 'Settings saved.');
    return response.settings || settings;
  } catch (error) {
    liveToast(error.message,'error');
    throw error;
  }
}

function liveChangePasswordModal() {
  const modal = liveModal(
    'Change ScoutLink password',
    '<form id="liveChangePasswordForm">' +
      '<div class="form-grid">' +
        '<div class="field"><label for="liveNewPassword">New password</label>' +
          '<input class="control" id="liveNewPassword" type="password" ' +
            'minlength="8" required></div>' +
        '<div class="field"><label for="liveConfirmNewPassword">Confirm password</label>' +
          '<input class="control" id="liveConfirmNewPassword" type="password" ' +
            'minlength="8" required></div>' +
      '</div>' +
      '<div class="scout-live-form-message" id="livePasswordMessage"></div>' +
      '<button class="btn primary" type="submit" style="margin-top:10px">' +
        'Update password</button>' +
    '</form>'
  );

  modal.querySelector('#liveChangePasswordForm')
    .addEventListener('submit',async function (event) {
      event.preventDefault();

      const password = modal.querySelector('#liveNewPassword').value;
      const confirmation =
        modal.querySelector('#liveConfirmNewPassword').value;
      const message = modal.querySelector('#livePasswordMessage');
      const button = this.querySelector('button[type="submit"]');

      if (password.length < 8) {
        message.className = 'scout-live-form-message error';
        message.textContent = 'Password must contain at least eight characters.';
        return;
      }

      if (password !== confirmation) {
        message.className = 'scout-live-form-message error';
        message.textContent = 'The two passwords do not match.';
        return;
      }

      button.disabled = true;
      button.textContent = 'Updating…';

      try {
        await liveApi(
          'POST',
          '/api/auth/change-password',
          {password}
        );

        message.className = 'scout-live-form-message success';
        message.textContent = 'Password updated successfully.';
        this.reset();
      } catch (error) {
        message.className = 'scout-live-form-message error';
        message.textContent = error.message;
      } finally {
        button.disabled = false;
        button.textContent = 'Update password';
      }
    });
}

async function liveHydrateSettings() {
  const content = document.querySelector('.content');
  const hero = content.querySelector('.page-hero');

  try {
    const results = await Promise.all([
      liveLoadProfile(),
      liveApi('GET','/api/scouts/settings'),
      liveApi('GET','/api/scouts/setup')
    ]);

    const profile = results[0];
    let settings = results[1].settings || {};
    const setup = results[2];

    Array.from(content.children).forEach(function (child) {
      if (child !== hero) child.remove();
    });

    content.insertAdjacentHTML(
      'beforeend',
      liveSettingsMarkup(profile,settings,setup)
    );

    const hash = window.location.hash.replace('#','');
    if (
      ['account','appearance','notifications','team','security','plan']
        .indexOf(hash) >= 0
    ) {
      liveState.settingsSection = hash;
    }

    liveShowSettingsSection(liveState.settingsSection);

    document.querySelectorAll('[data-settings-section]')
      .forEach(function (button) {
        button.addEventListener('click',function () {
          const section = button.dataset.settingsSection;
          history.replaceState({},'',LIVE_PATHS.settings + '#' + section);
          liveShowSettingsSection(section);
        });
      });

    document.querySelectorAll('[data-setting-toggle]')
      .forEach(function (button) {
        button.addEventListener('click',function () {
          const on = !button.classList.contains('on');
          button.classList.toggle('on',on);
          button.setAttribute('aria-pressed',on ? 'true' : 'false');
        });
      });

    document.querySelectorAll('[data-theme]')
      .forEach(function (button) {
        button.addEventListener('click',async function () {
          settings = await liveSaveSettings({
            ...settings,
            theme:button.dataset.theme
          });

          document.documentElement.setAttribute(
            'data-theme',
            settings.theme
          );

          document.querySelectorAll('[data-theme]')
            .forEach(function (item) {
              item.classList.toggle('primary',item === button);
            });
        });
      });

    document.getElementById('liveSaveNotificationSettings')
      ?.addEventListener('click',async function () {
        const payload = {...settings};

        document.querySelectorAll('[data-setting-toggle]')
          .forEach(function (button) {
            payload[button.dataset.settingToggle] =
              button.classList.contains('on');
          });

        settings = await liveSaveSettings(payload);
      });

    document.querySelector('[data-copy-scout-id]')
      ?.addEventListener('click',async function () {
        try {
          await navigator.clipboard.writeText(
            String(profile.scout?.scout_id || profile.scout?.id || '')
          );
          liveToast('Scout ID copied.');
        } catch (_) {
          liveToast('The Scout ID could not be copied.','error');
        }
      });

    document.querySelector('[data-change-password]')
      ?.addEventListener('click',liveChangePasswordModal);

    document.querySelector('[data-review-session]')
      ?.addEventListener('click',function () {
        liveModal(
          'Active ScoutLink session',
          '<div class="setting-row"><div><b>Current browser</b>' +
            '<span>This is the active authenticated Scout session.</span></div>' +
            '<span class="pill green">Current</span></div>' +
          '<button class="btn danger" type="button" data-session-signout ' +
            'style="margin-top:10px">Sign out this session</button>'
        ).querySelector('[data-session-signout]')
          .addEventListener('click',function () {
            try {
              if (window.Auth) Auth.clear();
            } catch (_) {}
            liveGo('/login?logout=1');
          });
      });
  } catch (error) {
    content.insertAdjacentHTML(
      'beforeend',
      liveError(error.message || 'Settings could not be loaded.')
    );
  }
}


function liveConfirmDraftKey() {
  return 'scout_confirm_setup_exact_v3';
}

function liveLoadConfirmDraft() {
  try {
    const draft = JSON.parse(
      localStorage.getItem(liveConfirmDraftKey()) || '{}'
    );

    liveState.confirm.values = draft.values || {};
    liveState.confirm.weaknesses = draft.weaknesses || [];
    liveState.confirm.roles = draft.roles || [];
    liveState.confirm.goals = draft.goals || [];
    liveState.confirm.ages = draft.ages || [];
    liveState.confirm.positions = draft.positions || [];
  } catch (_) {}
}

function liveSaveConfirmDraft() {
  try {
    localStorage.setItem(
      liveConfirmDraftKey(),
      JSON.stringify({
        values:liveState.confirm.values,
        weaknesses:liveState.confirm.weaknesses,
        roles:liveState.confirm.roles,
        goals:liveState.confirm.goals,
        ages:liveState.confirm.ages,
        positions:liveState.confirm.positions,
        savedAt:new Date().toISOString()
      })
    );
  } catch (_) {}
}

function liveClearConfirmDraft() {
  try {
    localStorage.removeItem(liveConfirmDraftKey());
  } catch (_) {}
}

function liveConfirmSelectionCards(values,selected,name) {
  return values.map(function (value) {
    const active = selected.indexOf(value) >= 0;

    return '<label class="check-card ' + (active ? 'active' : '') + '">' +
      '<input type="checkbox" name="' + liveEsc(name) +
        '" value="' + liveEsc(value) + '"' +
        (active ? ' checked' : '') + '>' +
      '<span>' + (active ? '✓ ' : '□ ') + liveEsc(value) + '</span>' +
    '</label>';
  }).join('');
}

function liveConfirmFilterCards(values,selected,name) {
  return values.map(function (value) {
    const active = selected.indexOf(value) >= 0;

    return '<label class="filter-pill ' + (active ? 'active' : '') + '">' +
      '<input type="checkbox" name="' + liveEsc(name) +
        '" value="' + liveEsc(value) + '"' +
        (active ? ' checked' : '') +
        ' style="position:absolute;opacity:0">' +
      liveEsc(value) +
    '</label>';
  }).join('');
}

function liveConfirmMainMarkup() {
  const values = liveState.confirm.values;

  return '<form id="liveConfirmForm" class="confirm-main">' +
    '<section class="onboard-card">' +
      '<div class="onboard-head"><div>' +
        '<small>Step 1 of 3</small>' +
        '<h2>Create your ScoutLink password</h2>' +
        '<p>Use at least eight characters. The account email has already ' +
          'been verified through the secure login-code link.</p>' +
      '</div><span class="pill green">Email verified</span></div>' +
      '<div class="onboard-body">' +
        '<div class="form-grid">' +
          '<div class="field"><label for="liveConfirmPassword">New password</label>' +
            '<input id="liveConfirmPassword" name="newPassword" ' +
              'type="password" minlength="8" autocomplete="new-password" required>' +
            '<div class="password-strength"><span id="livePasswordStrength" ' +
              'style="width:0%"></span></div>' +
          '</div>' +
          '<div class="field"><label for="liveConfirmPasswordAgain">Confirm password</label>' +
            '<input id="liveConfirmPasswordAgain" name="confirmPassword" ' +
              'type="password" minlength="8" autocomplete="new-password" required>' +
          '</div>' +
        '</div>' +
        '<div class="setup-summary">' +
          '<div><b id="livePasswordLength">0 characters</b><span>Minimum 8</span></div>' +
          '<div><b id="livePasswordCase">Upper and lower case</b><span>Recommended</span></div>' +
          '<div><b id="livePasswordSymbol">Number or symbol</b><span>Recommended</span></div>' +
        '</div>' +
      '</div>' +
    '</section>' +
    '<section class="onboard-card">' +
      '<div class="onboard-head"><div>' +
        '<small>Step 2 of 3</small>' +
        '<h2>Confirm the team context</h2>' +
        '<p>These fields shape search ranking, compatibility and recommendations.</p>' +
      '</div></div>' +
      '<div class="onboard-body"><div class="form-grid">' +
        '<div class="field"><label for="liveConfirmTeam">Team name</label>' +
          '<input id="liveConfirmTeam" name="teamName" required value="' +
            liveEsc(values.teamName || '') + '"></div>' +
        '<div class="field"><label for="liveConfirmClub">Club / organisation</label>' +
          '<input id="liveConfirmClub" name="clubName" required value="' +
            liveEsc(values.clubName || '') + '"></div>' +
        '<div class="field"><label for="liveConfirmCountry">Scout country</label>' +
          '<select id="liveConfirmCountry" name="country" required>' +
            liveOptionList(
              Object.keys(LIVE_REGIONS),
              values.country || 'England'
            ) +
          '</select></div>' +
        '<div class="field"><label for="liveConfirmRegion">Scout region</label>' +
          '<select id="liveConfirmRegion" name="scoutRegion" required></select></div>' +
        '<div class="field"><label for="liveConfirmFormation">Formation</label>' +
          '<select id="liveConfirmFormation" name="formation" required>' +
            liveOptionList(LIVE_FORMATIONS,values.formation || '4-3-3') +
          '</select></div>' +
        '<div class="field"><label for="liveConfirmStyle">Playing style</label>' +
          '<select id="liveConfirmStyle" name="playingStyle" required>' +
            liveOptionList(LIVE_STYLES,values.playingStyle || 'Possession-Based Play') +
          '</select></div>' +
      '</div></div>' +
    '</section>' +
    '<section class="onboard-card">' +
      '<div class="onboard-head"><div>' +
        '<small>Step 3 of 3</small>' +
        '<h2>Set the recruitment brief</h2>' +
        '<p>Select the weaknesses, role expectations and long-term goals ' +
          'that should influence compatibility and role-fit analysis.</p>' +
      '</div></div>' +
      '<div class="onboard-body">' +
        '<div class="field"><label>Team weaknesses looking to be solved · Select up to 3</label>' +
          '<div class="check-grid" style="margin-top:6px" ' +
            'data-confirm-limit="teamWeaknesses">' +
            liveConfirmSelectionCards(
              LIVE_WEAKNESSES,
              liveState.confirm.weaknesses,
              'teamWeaknesses'
            ) +
          '</div></div>' +
        '<div class="field" style="margin-top:12px">' +
          '<label>Role expectations that influence role fit · Select up to 3</label>' +
          '<div class="check-grid" style="margin-top:6px" ' +
            'data-confirm-limit="roleExpectations">' +
            liveConfirmSelectionCards(
              LIVE_ROLES,
              liveState.confirm.roles,
              'roleExpectations'
            ) +
          '</div></div>' +
        '<div class="field" style="margin-top:12px">' +
          '<label>Long-term goals · Select up to 3</label>' +
          '<div class="check-grid" style="margin-top:6px" ' +
            'data-confirm-limit="longTermGoals">' +
            liveConfirmSelectionCards(
              LIVE_GOALS,
              liveState.confirm.goals,
              'longTermGoals'
            ) +
          '</div></div>' +
        '<div class="field" style="margin-top:12px"><label>Age groups</label>' +
          '<div class="filter-pills" style="margin-top:5px">' +
            liveConfirmFilterCards(
              LIVE_AGES,
              liveState.confirm.ages,
              'ageGroups'
            ) +
          '</div></div>' +
        '<div class="field" style="margin-top:10px"><label>Preferred positions</label>' +
          '<div class="filter-pills" style="margin-top:5px">' +
            liveConfirmFilterCards(
              LIVE_POSITIONS,
              liveState.confirm.positions,
              'preferredPositions'
            ) +
          '</div></div>' +
        '<div class="form-grid" style="margin-top:10px">' +
          '<div class="field"><label for="liveConfirmSalary">Salary cap (GBP/week)</label>' +
            '<input id="liveConfirmSalary" name="salaryCap" type="number" ' +
              'min="0" value="' + liveEsc(values.salaryCap || '') + '"></div>' +
          '<div class="field"><label for="liveConfirmApps">Minimum appearances</label>' +
            '<input id="liveConfirmApps" name="minAppearances" type="number" ' +
              'min="0" max="100" value="' + liveEsc(values.minAppearances || 3) + '">' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="onboard-footer">' +
        '<span>The setup is saved to the scout profile and can be edited later.</span>' +
        '<div class="page-actions">' +
          '<button class="btn" type="button" data-confirm-save-later>' +
            'Save and finish later</button>' +
          '<button class="btn primary" type="submit">' +
            'Save setup and open dashboard</button>' +
        '</div>' +
      '</div>' +
    '</section>' +
    '<div class="confirm-message" id="liveConfirmMessage" role="status">' +
      'Complete all three sections to enter the Scout workspace.' +
    '</div>' +
  '</form>';
}

function liveConfirmRegions(selected) {
  const country = document.getElementById('liveConfirmCountry')?.value || 'England';
  const region = document.getElementById('liveConfirmRegion');

  if (!region) return;

  region.innerHTML = liveOptionList(
    LIVE_REGIONS[country] || ['Other'],
    selected || region.value || ''
  );
}

function liveConfirmCapture(form) {
  const formData = new FormData(form);
  const values = {};

  [
    'teamName','clubName','country','scoutRegion',
    'formation','playingStyle','salaryCap','minAppearances'
  ].forEach(function (key) {
    values[key] = formData.get(key) || '';
  });

  liveState.confirm.values = {
    ...liveState.confirm.values,
    ...values
  };

  liveState.confirm.weaknesses = formData.getAll('teamWeaknesses');
  liveState.confirm.roles = formData.getAll('roleExpectations');
  liveState.confirm.goals = formData.getAll('longTermGoals');
  liveState.confirm.ages = formData.getAll('ageGroups');
  liveState.confirm.positions = formData.getAll('preferredPositions');
}

function liveConfirmLimitHandler(group) {
  const checked = group.querySelectorAll('input:checked');

  if (checked.length > 3) {
    const changed = group.querySelector('input:checked:last-of-type');
    if (changed) changed.checked = false;
    liveToast('Select up to three options in this section.','error');
  }

  group.querySelectorAll('.check-card').forEach(function (card) {
    const input = card.querySelector('input');
    const active = input.checked;
    card.classList.toggle('active',active);
    card.querySelector('span').textContent =
      (active ? '✓ ' : '□ ') + input.value;
  });
}

function livePasswordQuality(value) {
  let score = 0;
  if (value.length >= 8) score += 30;
  if (value.length >= 12) score += 20;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 25;
  if (/\d|[^A-Za-z0-9]/.test(value)) score += 25;
  return Math.min(100,score);
}

async function liveAuthenticateConfirm() {
  const params = new URLSearchParams(window.location.search);
  const type = params.get('type') || 'Scout';
  const code = String(params.get('code') || '').trim();
  const email = String(params.get('email') || '').trim().toLowerCase();

  if (type.toLowerCase() !== 'scout') {
    liveGo(
      '/complete-registration' +
      window.location.search
    );
    return false;
  }

  try {
    if (
      window.Auth &&
      Auth.isLoggedIn() &&
      Auth.type === 'Scout'
    ) {
      liveState.confirm.authenticated = true;
      return true;
    }
  } catch (_) {}

  if (!code || !email) {
    throw new Error(
      'Open the secure ScoutLink completion link from the approval email.'
    );
  }

  const response = await fetch(
    (window.API ||
      localStorage.getItem('sl_api_url') ||
      'https://scoutlink-api.vercel.app') +
      '/api/auth/login',
    {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        email,
        loginCode:code,
        accountType:'Scout'
      }),
      credentials:'include'
    }
  );

  const data = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    throw new Error(
      data.error ||
      'The ScoutLink setup code could not be verified.'
    );
  }

  if (
    !data.token ||
    !data.user ||
    data.accountType !== 'Scout'
  ) {
    throw new Error(
      'The secure link did not return a Scout account session.'
    );
  }

  Auth.set(data.token,data.user,'Scout');
  liveState.confirm.authenticated = true;
  liveTrack('scout_confirm_code_verified',{accountType:'Scout'});
  return true;
}

async function liveSubmitConfirm(form) {
  const message = document.getElementById('liveConfirmMessage');
  const button = form.querySelector('button[type="submit"]');
  const password = form.elements.newPassword.value;
  const confirmation = form.elements.confirmPassword.value;

  liveConfirmCapture(form);

  if (password.length < 8) {
    message.className = 'confirm-message error';
    message.textContent =
      'Create a password containing at least eight characters.';
    form.elements.newPassword.focus();
    return;
  }

  if (password !== confirmation) {
    message.className = 'confirm-message error';
    message.textContent = 'The two passwords do not match.';
    form.elements.confirmPassword.focus();
    return;
  }

  if (
    !liveState.confirm.values.teamName ||
    !liveState.confirm.values.clubName ||
    !liveState.confirm.values.country ||
    !liveState.confirm.values.scoutRegion ||
    !liveState.confirm.values.formation ||
    !liveState.confirm.values.playingStyle
  ) {
    message.className = 'confirm-message error';
    message.textContent = 'Complete every required team-context field.';
    return;
  }

  if (
    !liveState.confirm.weaknesses.length ||
    !liveState.confirm.roles.length ||
    !liveState.confirm.goals.length
  ) {
    message.className = 'confirm-message error';
    message.textContent =
      'Select at least one weakness, role expectation and long-term goal.';
    return;
  }

  button.disabled = true;
  button.textContent = 'Saving account and setup…';
  message.className = 'confirm-message';
  message.textContent =
    'Securing the account, saving the Scout setup and opening the dashboard…';

  const setupPayload = {
    teamName:liveState.confirm.values.teamName,
    clubName:liveState.confirm.values.clubName,
    country:liveState.confirm.values.country,
    scoutRegion:liveState.confirm.values.scoutRegion,
    formation:liveState.confirm.values.formation,
    playingStyle:liveState.confirm.values.playingStyle,
    teamWeaknesses:liveState.confirm.weaknesses,
    roleExpectations:liveState.confirm.roles,
    longTermGoals:liveState.confirm.goals,
    ageGroups:liveState.confirm.ages,
    preferredPositions:liveState.confirm.positions,
    salaryCap:liveState.confirm.values.salaryCap,
    minAppearances:liveState.confirm.values.minAppearances
  };

  try {
    await liveApi(
      'POST',
      '/api/auth/complete-registration',
      {
        newPassword:password,
        accountType:'Scout'
      }
    );

    /*
     * Onboarding is saved first because the current endpoint writes a compact
     * scout_preferences object. The complete Scout Setup is written afterwards
     * so no compatibility fields are lost.
     */
    await liveApi(
      'POST',
      '/api/onboarding/scout-wizard',
      {
        teamWeaknesses:liveState.confirm.weaknesses,
        preferredPositions:liveState.confirm.positions,
        ageGroups:liveState.confirm.ages,
        scoutCountry:liveState.confirm.values.country,
        scoutRegion:liveState.confirm.values.scoutRegion,
        alertPreference:'weekly_digest',
        setupSummary:
          'Initial Scout setup completed through /confirm-password.'
      }
    );

    await liveApi(
      'POST',
      '/api/scouts/setup',
      setupPayload
    );

    liveClearConfirmDraft();
    message.className = 'confirm-message';
    message.textContent =
      'Account secured and Scout setup saved. Opening the dashboard…';

    liveTrack('scout_confirm_setup_completed',{
      weaknessCount:liveState.confirm.weaknesses.length,
      roleCount:liveState.confirm.roles.length,
      goalCount:liveState.confirm.goals.length
    });

    setTimeout(function () {
      liveGo(LIVE_PATHS.dashboard);
    },650);
  } catch (error) {
    message.className = 'confirm-message error';
    message.textContent = error.message;
    button.disabled = false;
    button.textContent = 'Save setup and open dashboard';
  }
}

async function liveHydrateConfirm() {
  const page = document.querySelector('.confirm-page');

  if (!page) return;

  liveLoadConfirmDraft();

  const main = page.querySelector('.confirm-main');
  main.outerHTML = liveConfirmMainMarkup();

  const form = document.getElementById('liveConfirmForm');
  const message = document.getElementById('liveConfirmMessage');

  liveConfirmRegions(
    liveState.confirm.values.scoutRegion || 'London'
  );

  document.getElementById('liveConfirmCountry')
    .addEventListener('change',function () {
      liveConfirmRegions('');
    });

  document.querySelectorAll('[data-confirm-limit]')
    .forEach(function (group) {
      group.addEventListener('change',function () {
        liveConfirmLimitHandler(group);
      });
    });

  document.querySelectorAll(
    '#liveConfirmForm .filter-pill input'
  ).forEach(function (input) {
    input.addEventListener('change',function () {
      input.closest('.filter-pill')
        .classList.toggle('active',input.checked);
    });
  });

  document.getElementById('liveConfirmPassword')
    .addEventListener('input',function () {
      const value = this.value;
      const quality = livePasswordQuality(value);
      document.getElementById('livePasswordStrength').style.width =
        quality + '%';
      document.getElementById('livePasswordLength').textContent =
        value.length + ' characters';
      document.getElementById('livePasswordCase').textContent =
        /[a-z]/.test(value) && /[A-Z]/.test(value)
          ? 'Upper and lower case included'
          : 'Add upper and lower case';
      document.getElementById('livePasswordSymbol').textContent =
        /\d|[^A-Za-z0-9]/.test(value)
          ? 'Number or symbol included'
          : 'Add a number or symbol';
    });

  form.addEventListener('input',function () {
    liveConfirmCapture(form);
    liveSaveConfirmDraft();
  });

  form.addEventListener('change',function () {
    liveConfirmCapture(form);
    liveSaveConfirmDraft();
  });

  form.querySelector('[data-confirm-save-later]')
    .addEventListener('click',function () {
      liveConfirmCapture(form);
      liveSaveConfirmDraft();
      message.className = 'confirm-message';
      message.textContent =
        'Setup draft saved in this browser. Keep the secure session open to finish later.';
      liveTrack('scout_confirm_setup_draft_saved',{});
    });

  form.addEventListener('submit',function (event) {
    event.preventDefault();
    liveSubmitConfirm(form);
  });

  try {
    message.textContent = 'Checking the secure ScoutLink account link…';
    await liveAuthenticateConfirm();
    message.textContent =
      'Secure Scout account confirmed. Complete the password and recruitment setup.';
  } catch (error) {
    message.className = 'confirm-message error';
    message.textContent = error.message;
    form.querySelectorAll('input,select,button').forEach(function (control) {
      control.disabled = true;
    });
  }
}

function liveRequiredAuth(route) {
  if (route === 'confirm') return true;

  try {
    if (!window.Auth || !Auth.isLoggedIn()) {
      liveGo('/login?next=' + encodeURIComponent(window.location.pathname + window.location.search));
      return false;
    }

    if (Auth.type !== 'Scout') {
      if (route === 'profile') {
        liveGo(
          '/frontend/pages/player-profile.html' +
          window.location.search
        );
      } else {
        liveGo('/experience-select');
      }
      return false;
    }
  } catch (_) {
    liveGo('/login');
    return false;
  }

  return true;
}

async function liveHydrateRoute(route) {
  const handlers = {
    confirm:liveHydrateConfirm,
    dashboard:liveHydrateDashboard,
    search:liveHydrateSearch,
    profile:liveHydrateProfile,
    pipeline:liveHydratePipeline,
    rankings:liveHydrateRankings,
    fixtures:liveHydrateFixtures,
    predictions:liveHydratePredictions,
    exports:liveHydrateExports,
    compare:liveHydrateCompare,
    setup:liveHydrateSetup,
    events:liveHydrateEvents,
    chat:liveHydrateChat,
    notifications:liveHydrateNotifications,
    concern:liveHydrateConcern,
    settings:liveHydrateSettings
  };

  const handler = handlers[route];

  if (handler) {
    try {
      await handler();
    } catch (error) {
      console.error('[Scout Experience V3]',route,error);
      liveToast(
        error.message || 'This ScoutLink page could not be loaded.',
        'error'
      );
    }
  }
}

const LIVE_V6_ROUTES = new Set([
  'dashboard',
  'search',
  'profile',
  'rankings',
  'fixtures',
  'predictions',
  'exports',
  'compare',
  'setup',
  'chat',
  'notifications',
  'settings'
]);

function liveV6ControlsRoute(route) {
  if (!LIVE_V6_ROUTES.has(route)) return false;

  return Boolean(
    document.querySelector(
      'script[src*="scout-intelligence-v4.js"]'
    )
  );
}

function liveV6BootContent(route) {
  const title = LIVE_TITLES[route] || 'Scout workspace';

  return `
    <main class="content">
      <section
        class="scout-v6-boot"
        role="status"
        aria-live="polite"
        aria-label="Loading ${liveEsc(title)}"
      >
        <div class="scout-v6-boot-brand">
          Scout<span>Link</span>
        </div>

        <div
          class="scout-v6-boot-spinner"
          aria-hidden="true"
        ></div>

        <b>Loading ${liveEsc(title)}</b>
        <span>Preparing your scout workspace.</span>
      </section>
    </main>
  `;
}
 
function liveRenderRoute() {
  const route = liveRouteId();
  const root = document.getElementById('scoutExperienceApp');

  if (!root || !route) return;
  if (!liveRequiredAuth(route)) return;

  liveState.route = route;
  liveState.mobile =
    window.matchMedia('(max-width:767px)').matches;

  const useV6 = liveV6ControlsRoute(route);

  root.className =
    (liveState.mobile ? 'mobile' : 'desktop-live') +
    (useV6 ? ' scout-v6-booting' : ' is-loading');

  root.setAttribute('aria-busy', 'true');

  document.body.className =
    'scout-experience-body theme-light';

  document.title =
    LIVE_TITLES[route] + ' | ScoutLink';

  if (useV6) {
    /*
     * V6 owns this route.
     *
     * Render only the shared navigation shell and a neutral,
     * branded loading state. Never insert the old route template
     * and never run the old route hydration.
     */
    root.innerHTML = shell(
      route,
      LIVE_TITLES[route],
      liveV6BootContent(route),
      liveState.mobile
    );

    liveBindGlobalActions();

    window.setTimeout(function () {
      if (!root.classList.contains('scout-v6-booting')) {
        return;
      }

      const boot = root.querySelector('.scout-v6-boot');

      if (boot) {
        boot.innerHTML = `
          <div class="scout-v6-boot-brand">
            Scout<span>Link</span>
          </div>

          <b>ScoutLink is taking longer than expected</b>
          <span>
            Refresh the page. The previous Scout interface will
            not be shown.
          </span>
        `;
      }
    }, 15000);

    return;
  }

  /*
   * Routes that have not moved to V6 keep the existing
   * Scout Experience V3 behaviour.
   */
  const renderer = route === 'confirm'
    ? confirmPage
    : renderers[route];

  root.innerHTML = renderer(liveState.mobile);

  liveBindGlobalActions();

  liveHydrateRoute(route).finally(function () {
    root.classList.remove('is-loading');
    root.removeAttribute('aria-busy');
  });
}


let liveResizeTimer = null;

function liveStart() {
  const root = document.getElementById('scoutExperienceApp');
  if (!root) return;

  root.classList.add('is-loading');
  liveRenderRoute();

  window.addEventListener('resize',function () {
    clearTimeout(liveResizeTimer);
    liveResizeTimer = setTimeout(function () {
      const nextMobile =
        window.matchMedia('(max-width:767px)').matches;

      if (nextMobile !== liveState.mobile) {
        liveRenderRoute();
      }
    },180);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded',liveStart);
} else {
  liveStart();
}

})();
