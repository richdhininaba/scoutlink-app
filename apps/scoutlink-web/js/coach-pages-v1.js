'use strict';

/*
 * ScoutLink Coach Desk / Coach Field — source-faithful everyday route renderer.
 *
 * Presentation follows:
 *   - ScoutLink Coach Desk — desktop design specification
 *   - ScoutLink Coach Field — phone design specification
 *
 * Business behaviour deliberately remains on the existing ScoutLink APIs.
 * This file does not add schema requirements and does not invent dead controls.
 */
(function () {
  var page = document.body && document.body.getAttribute('data-coach-page');
  if (!page) return;

  var desk = document.getElementById('coachDeskPage');
  var field = document.getElementById('coachFieldPage');
  var state = {
    playerSearch: '',
    playerPosition: '',
    playerAge: '',
    playerAssigned: '',
    playerNeedsWork: false,
    playerPage: 1,
    playerSort: 'name',
    notifFilter: 'all',
    settingsPane: 'team'
  };

  function esc(v) {
    return window.CoachV2 ? window.CoachV2.esc(v) : String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function clean(h) { return window.CoachV2 ? window.CoachV2.clean(h) : h; }
  function api(method, path, body) {
    if (window.CoachV2 && window.CoachV2.api) return window.CoachV2.api(method, path, body);
    return window.api(method, path, body);
  }
  function list(r, keys) {
    if (Array.isArray(r)) return r;
    for (var i = 0; i < keys.length; i++) if (r && Array.isArray(r[keys[i]])) return r[keys[i]];
    return [];
  }
  function value(o, keys) {
    for (var i = 0; i < keys.length; i++) if (o && o[keys[i]] != null && o[keys[i]] !== '') return o[keys[i]];
    return null;
  }
  function num(v, fallback) {
    var n = Number(v);
    return Number.isFinite(n) ? n : (fallback == null ? 0 : fallback);
  }
  function bool(v) {
    if (v === true || v === 1) return true;
    return /^(1|true|yes)$/i.test(String(v == null ? '' : v));
  }
  function user() { return window.Auth && window.Auth.user ? window.Auth.user : {}; }
  function fullName() { return window.CoachV2 ? window.CoachV2.fullName() : 'Coach'; }
  function firstName() { return window.CoachV2 ? window.CoachV2.firstName() : 'Coach'; }
  function initials(v) { return window.CoachV2 ? window.CoachV2.initials(v) : String(v || 'PL').slice(0,2).toUpperCase(); }
  function team() { return window.CoachV2 ? window.CoachV2.teamName() : 'Your team'; }
  function age() { return window.CoachV2 ? window.CoachV2.ageGroup() : ''; }
  function teamLine() { return [team(), age()].filter(Boolean).join(' · '); }
  function nameOf(p) { return [p && p.first_name, p && p.last_name].filter(Boolean).join(' ').trim() || value(p, ['name','player_name']) || 'Player'; }
  function position(p) { return value(p, ['specific_position','primary_position','position','position_group']) || '—'; }
  function positionGroup(p) {
    var s = String(position(p)).toUpperCase();
    if (/GK|GOAL/.test(s)) return 'GK';
    if (/CB|LB|RB|WB|DEF/.test(s)) return 'DEF';
    if (/CM|DM|AM|MID/.test(s)) return 'MID';
    return 'ATT';
  }
  function formatDate(raw, withTime) {
    if (!raw) return 'Date to be confirmed';
    var d = new Date(String(raw).length <= 10 ? String(raw) + 'T12:00:00' : raw);
    if (Number.isNaN(d.getTime())) return String(raw);
    var s = d.toLocaleDateString('en-GB', {weekday:'short', day:'numeric', month:'short'});
    if (withTime && typeof withTime === 'string') s += ' · ' + withTime.slice(0,5);
    return s;
  }
  function formatDateLong(raw) {
    var d = raw ? new Date(raw) : new Date();
    if (Number.isNaN(d.getTime())) d = new Date();
    return d.toLocaleDateString('en-GB', {weekday:'long', day:'numeric', month:'long'});
  }
  function fmtMoney(v) {
    var n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return 'Developing';
    if (n >= 1000000) return '£' + (n / 1000000).toFixed(n >= 10000000 ? 0 : 1) + 'm';
    if (n >= 1000) return '£' + Math.round(n / 1000) + 'k';
    return '£' + Math.round(n);
  }
  function routeMessage(message, error) {
    return '<div class="coach-route-message' + (error ? ' error' : '') + '">' + esc(message) + '</div>';
  }
  function completion(p) {
    var explicit = Number(value(p, ['profile_completion','profileCompletion','completion_percent','evidence_completion']));
    if (Number.isFinite(explicit)) return Math.max(0, Math.min(100, Math.round(explicit <= 1 ? explicit * 100 : explicit)));
    var checks = [
      nameOf(p) !== 'Player',
      !!value(p,['age_group','ageGroup']),
      position(p) !== '—',
      Number.isFinite(Number(value(p,['overall_rating','overall']))),
      !!value(p,['foot','preferred_foot']),
      !!value(p,['height_category','heightCategory']),
      !!value(p,['build_category','buildCategory']),
      num(value(p,['appearances','apps']),0) > 0
    ];
    return Math.round(checks.filter(Boolean).length / checks.length * 100);
  }
  function readinessLabel(pc) { return pc >= 80 ? 'Ready' : pc >= 60 ? 'Building' : 'Needs work'; }
  function readinessTag(pc) { return pc >= 80 ? 'g' : pc >= 60 ? 'a' : 'r'; }
  function evidenceClass(pc) { return pc < 50 ? 'low' : pc < 75 ? 'mid' : ''; }
  function iconBox(text, cls) { return '<span class="icn ' + (cls || '') + '">' + esc(text) + '</span>'; }
  function avatar(name, cls) { return '<span class="av ' + (cls || '') + '">' + esc(initials(name)) + '</span>'; }
  function fieldHeader(title, sub, right) {
    return '<div class="hd ptop"><div><div class="t">' + esc(title) + '</div><div class="sub">' + esc(sub || '') + '</div></div><div class="r">' +
      (right || '<span class="avm">' + esc(initials(fullName())) + '</span>') + '</div></div>';
  }
  function setShellActions(secondaryLabel, secondaryHref, primaryLabel, primaryHref) {
    var top = document.getElementById('coachDeskTopbar');
    if (!top) {
      setTimeout(function () { setShellActions(secondaryLabel, secondaryHref, primaryLabel, primaryHref); }, 0);
      return;
    }
    top.querySelectorAll('[data-coach-route-action],#coachImportFixtures,#coachAddFixture,#coachRefreshVideos,#coachExportPlayers,#coachMarkAllRead,#coachSavePreferences').forEach(function (node) { node.remove(); });
    var before = top.querySelector('.coach-search-wrap') || top.querySelector('.bell') || null;
    function add(label, href, primary, kind) {
      if (!label) return;
      var node = document.createElement(href && href !== '#' ? 'a' : 'button');
      node.className = 'btn sm' + (primary ? ' p' : '');
      node.setAttribute('data-coach-route-action', kind);
      if (href && href !== '#') node.href = clean(href);
      else node.type = 'button';
      node.textContent = label;
      top.insertBefore(node, before);
    }
    add(secondaryLabel, secondaryHref, false, 'secondary');
    add(primaryLabel, primaryHref, true, 'primary');
  }
  function safeSettled(result, keys) {
    return result && result.status === 'fulfilled' ? list(result.value, keys) : [];
  }
  function spark(values, cls) {
    values = values && values.length ? values : [0,0,0,0,0,0,0,0];
    var max = Math.max.apply(null, values.concat([1]));
    var min = Math.min.apply(null, values.concat([0]));
    var range = Math.max(1, max - min);
    var pts = values.map(function (v, i) {
      var x = values.length === 1 ? 50 : i / (values.length - 1) * 100;
      var y = 34 - ((v - min) / range * 27);
      return x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');
    return '<svg class="coach-spark ' + (cls || '') + '" viewBox="0 0 100 38" preserveAspectRatio="none" aria-hidden="true"><polyline points="' + pts + '" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>';
  }
  function barChart(values, labels) {
    values = values && values.length ? values : [0,0,0,0,0,0,0,0];
    labels = labels || values.map(function (_, i) { return String(i + 1); });
    var max = Math.max.apply(null, values.concat([1]));
    return '<div class="coach-bars">' + values.map(function (v, i) {
      var h = Math.max(3, Math.round(v / max * 100));
      return '<div class="coach-bar-col"><span class="coach-bar" style="height:' + h + '%"></span><small>' + esc(labels[i] || '') + '</small></div>';
    }).join('') + '</div>';
  }
  function weekSeries(rows, predicate) {
    var now = new Date();
    var out = [];
    for (var i = 7; i >= 0; i--) {
      var start = new Date(now);
      start.setDate(now.getDate() - (i * 7 + 6));
      start.setHours(0,0,0,0);
      var end = new Date(start);
      end.setDate(start.getDate() + 7);
      out.push(rows.filter(function (row) {
        var raw = value(row,['created_at','createdAt','fixture_date','fixtureDate','date']);
        var d = raw ? new Date(raw) : null;
        return d && !Number.isNaN(d.getTime()) && d >= start && d < end && (!predicate || predicate(row));
      }).length);
    }
    return out;
  }

  function matchPerformanceSeries(facts) {
    var grouped = {};
    (facts || []).forEach(function (fact) {
      var score = Number(value(fact,['performance_score','performanceScore']));
      if (!Number.isFinite(score)) return;
      var key = String(value(fact,['fixture_id','fixtureId']) || value(fact,['match_date','matchDate']) || value(fact,['created_at','createdAt']) || '');
      if (!key) return;
      if (!grouped[key]) grouped[key] = {scores:[], date:value(fact,['match_date','matchDate','created_at','createdAt']) || ''};
      grouped[key].scores.push(score);
    });
    var rows = Object.keys(grouped).map(function (key) {
      var g = grouped[key];
      return {date:g.date, score:g.scores.reduce(function (a,b) { return a + b; },0) / Math.max(1,g.scores.length)};
    }).sort(function (a,b) { return new Date(a.date || 0) - new Date(b.date || 0); }).slice(-8);
    return rows.length ? rows.map(function (r) { return Number(r.score.toFixed(1)); }) : [0,0,0,0,0,0,0,0];
  }

  function notificationPlayerId(n) {
    return value(n,['player_id','playerId']) || (n && n.data ? value(n.data,['player_id','playerId']) : null);
  }

  /* ================= DASHBOARD ================= */
  function fixtureDate(f) { return value(f,['fixture_date','fixtureDate','date','kickoff_at']); }
  function fixtureTime(f) { return value(f,['fixture_time','fixtureTime','time','kickoff_time']) || ''; }
  function opponent(f) { return value(f,['opponent','opponent_name','opponentName']) || 'Opponent'; }
  function venue(f) { return value(f,['venue_name','venue','location']) || ''; }
  function futureFixtures(fixtures) {
    var today = new Date(); today.setHours(0,0,0,0);
    return fixtures.filter(function (f) {
      var d = new Date(String(fixtureDate(f) || '').slice(0,10) + 'T12:00:00');
      return Number.isNaN(d.getTime()) || d >= today;
    }).sort(function (a,b) { return new Date(fixtureDate(a) || '2999-01-01') - new Date(fixtureDate(b) || '2999-01-01'); });
  }
  function pastFixtures(fixtures) {
    var today = new Date(); today.setHours(0,0,0,0);
    return fixtures.filter(function (f) {
      var status = String(value(f,['status','state']) || '').toLowerCase();
      var d = new Date(String(fixtureDate(f) || '').slice(0,10) + 'T12:00:00');
      return /completed|played|finished/.test(status) || (!Number.isNaN(d.getTime()) && d < today);
    });
  }
  function factFixtureId(f) { return value(f,['fixture_id','fixtureId']); }
  function factMap(facts) {
    var map = {};
    facts.forEach(function (x) { var id = factFixtureId(x); if (id) map[String(id)] = x; });
    return map;
  }
  function unreadThreads(threads) {
    return threads.reduce(function (sum,t) { return sum + num(value(t,['unread_count','unreadCount']),0); },0);
  }
  function scoutNotif(n) {
    var text = [value(n,['notification_type','type']), value(n,['title']), value(n,['body'])].join(' ').toLowerCase();
    return /scout|interest|recruit/.test(text);
  }
  function dashboardActions(data) {
    var rows = [];
    var fmap = factMap(data.facts);
    pastFixtures(data.fixtures).filter(function (f) { return !fmap[String(f.id)]; }).slice(0,2).forEach(function (f) {
      rows.push({tone:'r',icon:'MF',title:'Record Match Facts',sub:'vs ' + opponent(f) + ' · ' + formatDate(fixtureDate(f)),label:'Record now',href:'/coach/match-facts?fixtureId=' + encodeURIComponent(f.id || '')});
    });
    var unread = unreadThreads(data.threads);
    if (unread) rows.push({tone:'b',icon:'IN',title:'Reply to ' + unread + ' unread message' + (unread === 1 ? '' : 's'),sub:'Reviewed Scout conversations are waiting',label:'Open inbox',href:'/coach/chat'});
    data.players.slice().sort(function (a,b) { return completion(a)-completion(b); }).filter(function (p) { return completion(p) < 80; }).slice(0,1).forEach(function (p) {
      rows.push({tone:'a',icon:'PR',title:'Improve ' + nameOf(p) + '’s profile',sub:'Profile readiness is ' + completion(p) + '%',label:'Review',href:'/player/profile?id=' + encodeURIComponent(p.id || '')});
    });
    var scout = data.notifications.filter(scoutNotif)[0];
    if (scout) rows.push({tone:'g',icon:'SC',title:value(scout,['title']) || 'New scout activity',sub:value(scout,['body']) || 'Reviewed scout activity on your squad',label:value(scout,['actionLabel','action_label']) || 'View',href:value(scout,['actionUrl','action_url']) || '/coach/notifications'});
    if (rows.length < 5 && futureFixtures(data.fixtures)[0]) rows.push({tone:'b',icon:'FX',title:'Prepare for ' + opponent(futureFixtures(data.fixtures)[0]),sub:formatDate(fixtureDate(futureFixtures(data.fixtures)[0]),fixtureTime(futureFixtures(data.fixtures)[0])),label:'Open fixtures',href:'/coach/fixtures'});
    return rows.slice(0,5);
  }
  function renderDashboard(data) {
    setShellActions('Export squad', '#', 'Record Match Facts', '/coach/match-facts');
    var players = data.players, fixtures = data.fixtures, notifications = data.notifications, facts = data.facts, threads = data.threads;
    var db = data.dashboard || {};
    var avgReady = players.length ? Math.round(players.reduce(function (s,p) { return s + completion(p); },0) / players.length) : 0;
    var unread = unreadThreads(threads);
    var scoutCount = num(value(db,['scoutsInterested','scouts_interested']), notifications.filter(scoutNotif).length);
    var squadValue = num(value(db,['totalSquadValue','total_squad_value']), players.reduce(function (s,p) { return s + num(value(p,['transfer_value','estimated_value']),0); },0));
    var actions = dashboardActions(data);
    var next = futureFixtures(fixtures)[0];
    var fmap = factMap(facts);
    var completed = pastFixtures(fixtures);
    var covered = completed.filter(function (f) { return !!fmap[String(f.id)]; }).length;
    var ratingSeries = matchPerformanceSeries(facts);
    var interestSeries = weekSeries(notifications, scoutNotif);
    var shape = {GK:0,DEF:0,MID:0,ATT:0};
    players.forEach(function (p) { shape[positionGroup(p)]++; });
    var interestedIds = {};
    notifications.filter(scoutNotif).forEach(function (n) { var pid = notificationPlayerId(n); if (pid) interestedIds[String(pid)] = (interestedIds[String(pid)] || 0) + 1; });
    var interestPlayers = players.filter(function (p) { return !!interestedIds[String(p.id)] || bool(value(p,['scout_interest','has_scout_interest','scoutInterest'])) || num(value(p,['scout_interest_count','scoutInterestCount']),0) > 0; }).slice(0,5);
    if (!interestPlayers.length) interestPlayers = players.slice().sort(function (a,b) { return num(value(b,['overall_rating','overall']),0)-num(value(a,['overall_rating','overall']),0); }).slice(0,3);

    var kpis = [
      ['Players', players.length, 'active in ' + team()],
      ['Scout interest', scoutCount, num(value(db,['newInterestCount','new_interest_count']),0) ? '+' + num(value(db,['newInterestCount','new_interest_count']),0) + ' in 7 days' : 'reviewed scout activity'],
      ['Unread messages', unread, unread ? 'requires a reply' : 'inbox is clear'],
      ['Estimated squad value', fmtMoney(squadValue), squadValue ? 'current evidence-led estimate' : 'builds with evidence'],
      ['Profile readiness', avgReady + '%', readinessLabel(avgReady) + ' across the squad']
    ];

    desk.innerHTML =
      '<div class="g coach-kpi-five" style="grid-template-columns:repeat(5,minmax(0,1fr));margin-bottom:14px">' +
        kpis.map(function (k) { return '<div class="kpi"><div class="k">' + esc(k[0]) + '</div><div class="v">' + esc(k[1]) + '</div><div class="d">' + esc(k[2]) + '</div></div>'; }).join('') +
      '</div>' +
      '<div class="card" style="margin-bottom:14px"><div class="card-h"><h3>Next actions</h3><span class="sp"></span><span class="hint">generated from your live workspace</span></div><div class="card-b" style="padding-top:4px;padding-bottom:4px">' +
        (actions.length ? actions.map(function (a) {
          return '<div class="row"><span class="icn ' + (a.tone === 'g' ? 'g' : a.tone === 'r' ? 'r' : a.tone === 'a' ? 'a' : 'b') + '">' + esc(a.icon) + '</span><span class="sp"><b class="rt">' + esc(a.title) + '</b><s class="rs">' + esc(a.sub) + '</s></span><a class="btn sm ' + (a.tone === 'r' ? 'p' : 'q') + '" href="' + esc(clean(a.href)) + '">' + esc(a.label) + '</a></div>';
        }).join('') : '<div class="row"><span class="sp"><b class="rt">Nothing urgent</b><s class="rs">Your current data has no outstanding action.</s></span></div>') +
      '</div></div>' +
      '<div class="g" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);margin-bottom:14px">' +
        '<div class="card"><div class="card-h"><h3>Squad activity trend</h3><span class="sp"></span><span class="hint">last 8 weeks</span></div><div class="card-b"><div class="coach-chart-big">' + spark(ratingSeries,'b') + '</div><div class="mut">Average Match Facts performance score · last 8 recorded matches</div></div></div>' +
        '<div class="card"><div class="card-h"><h3>New scout interest</h3><span class="sp"></span><span class="hint">last 8 weeks</span></div><div class="card-b"><div class="coach-chart-big">' + barChart(interestSeries,['W1','W2','W3','W4','W5','W6','W7','Now']) + '</div><div class="mut">Scout-related notifications by week</div></div></div>' +
      '</div>' +
      '<div class="g" style="grid-template-columns:1.05fr .95fr .95fr;align-items:start">' +
        '<div class="card"><div class="card-h"><h3>Scout interest by player</h3><span class="sp"></span><a class="btn q sm" href="/coach/my-players">My Players</a></div><div class="card-b" style="padding-top:4px;padding-bottom:4px">' +
          (interestPlayers.length ? interestPlayers.map(function (p) {
            return '<a class="row" href="/player/profile?id=' + encodeURIComponent(p.id || '') + '" style="text-decoration:none"><span class="av">' + esc(initials(nameOf(p))) + '</span><span class="sp"><b class="rt">' + esc(nameOf(p)) + '</b><s class="rs">' + esc(position(p) + ' · ' + (value(p,['age_group']) || age() || '')) + '</s></span><span class="tag b">' + (interestedIds[String(p.id)] ? interestedIds[String(p.id)] + ' interest' + (interestedIds[String(p.id)] === 1 ? '' : 's') : (bool(value(p,['scout_interest','has_scout_interest'])) ? 'Interest' : 'Profile')) + '</span></a>';
          }).join('') : '<div class="row"><span class="sp mut">No player-level scout interest is available yet.</span></div>') +
        '</div></div>' +
        '<div class="g" style="gap:14px">' +
          '<div class="card"><div class="card-h"><h3>Upcoming fixtures</h3><span class="sp"></span><a class="btn q sm" href="/coach/fixtures">All fixtures</a></div><div class="card-b" style="padding-top:4px;padding-bottom:4px">' +
            (futureFixtures(fixtures).slice(0,3).map(function (f) { return '<div class="row"><span class="icn b">FX</span><span class="sp"><b class="rt">vs ' + esc(opponent(f)) + '</b><s class="rs">' + esc(formatDate(fixtureDate(f),fixtureTime(f)) + (venue(f) ? ' · ' + venue(f) : '')) + '</s></span><span class="tag">' + esc(value(f,['home_or_away','homeOrAway']) || 'Home') + '</span></div>'; }).join('') || '<div class="row"><span class="sp mut">No upcoming fixtures.</span></div>') +
          '</div></div>' +
          '<div class="card"><div class="card-h"><h3>Scout activity</h3><span class="sp"></span><a class="btn q sm" href="/coach/notifications">Notifications</a></div><div class="card-b" style="padding-top:4px;padding-bottom:4px">' +
            (notifications.filter(scoutNotif).slice(0,3).map(function (n) { return '<div class="row">' + iconBox('SC','g') + '<span class="sp"><b class="rt">' + esc(value(n,['title']) || 'Scout activity') + '</b><s class="rs">' + esc(value(n,['body']) || 'Reviewed scout update') + '</s></span></div>'; }).join('') || '<div class="row"><span class="sp mut">No recent scout activity.</span></div>') +
          '</div></div>' +
        '</div>' +
        '<div class="g" style="gap:14px">' +
          '<div class="card"><div class="card-h"><h3>Squad shape</h3></div><div class="card-b"><div class="g" style="grid-template-columns:repeat(4,1fr);gap:8px">' + ['GK','DEF','MID','ATT'].map(function (g) { return '<div class="kpi" style="padding:10px"><div class="k">' + g + '</div><div class="v" style="font-size:21px">' + shape[g] + '</div></div>'; }).join('') + '</div></div></div>' +
          '<div class="card"><div class="card-h"><h3>Profile readiness</h3><span class="sp"></span><span class="hint">' + avgReady + '% average</span></div><div class="card-b">' +
            players.slice().sort(function (a,b) { return completion(a)-completion(b); }).slice(0,5).map(function (p) { var pc=completion(p); return '<div class="at"><span class="an">' + esc(nameOf(p)) + '</span><span class="track"><u style="width:' + pc + '%"></u></span><span class="atv">' + pc + '%</span></div>'; }).join('') +
            '<div class="help">' + covered + ' of ' + completed.length + ' completed fixtures have Match Facts.</div></div></div>' +
        '</div>' +
      '</div>';

    var mobileKpis = kpis.slice(0,4);
    field.innerHTML =
      fieldHeader('Today', formatDateLong() + ' · ' + teamLine(), '<button class="icb" type="button" data-coach-notifications aria-label="Notifications">◉' + (unread ? '<u>' + unread + '</u>' : '') + '</button><span class="avm">' + esc(initials(fullName())) + '</span>') +
      '<div class="pkpi">' + mobileKpis.map(function (k) { return '<div class="kpi"><div class="k">' + esc(k[0]) + '</div><div class="v">' + esc(k[1]) + '</div><div class="d">' + esc(k[2]) + '</div></div>'; }).join('') + '</div>' +
      '<div class="kpi" style="margin-top:8px"><div class="k">Estimated squad value</div><div class="v">' + esc(fmtMoney(squadValue)) + '</div><div class="d">' + (squadValue ? 'evidence-led estimate' : 'builds with evidence') + '</div></div>' +
      '<div class="pcap">Next actions <span>' + actions.length + '</span></div>' +
      '<div class="card"><div class="card-b" style="padding-top:3px;padding-bottom:3px">' +
        (actions.length ? actions.slice(0,4).map(function (a) { return '<div class="row" style="padding-left:0;padding-right:0">' + iconBox(a.icon,a.tone === 'g' ? 'g' : a.tone === 'r' ? 'r' : a.tone === 'a' ? 'a' : 'b') + '<span class="sp"><b class="rt">' + esc(a.title) + '</b><s class="rs">' + esc(a.sub) + '</s></span><a class="btn sm ' + (a.tone === 'r' ? 'p' : 'q') + '" href="' + esc(clean(a.href)) + '">' + esc(a.label.replace(' now','')) + '</a></div>'; }).join('') : '<div class="row"><span class="sp mut">Nothing urgent.</span></div>') +
      '</div></div>' +
      '<div class="pcap">Performance <span>8 weeks</span></div><div class="card"><div class="card-b"><div class="coach-chart-phone">' + spark(ratingSeries,'b') + '</div><div class="mut">Average Match Facts performance score</div></div></div>' +
      '<div class="pcap">Scout interest <span>8 weeks</span></div><div class="card"><div class="card-b"><div class="coach-chart-phone">' + barChart(interestSeries,['','','','','','','','Now']) + '</div></div></div>' +
      '<div class="pcap">Next fixture <span><a href="/coach/fixtures">Fixtures</a></span></div><div class="card"><div class="card-b">' +
        (next ? '<b style="font-size:14px">vs ' + esc(opponent(next)) + '</b><div class="mut">' + esc(formatDate(fixtureDate(next),fixtureTime(next)) + (venue(next) ? ' · ' + venue(next) : '')) + '</div><div style="margin-top:10px"><a class="btn p" href="/coach/match-facts?fixtureId=' + encodeURIComponent(next.id || '') + '">Open Matchday</a></div>' : '<div class="mut">No upcoming fixture.</div>') +
      '</div></div>' +
      '<div class="pcap">Squad shape</div><div class="pkpi">' + ['GK','DEF','MID','ATT'].map(function (g) { return '<div class="kpi"><div class="k">' + g + '</div><div class="v">' + shape[g] + '</div></div>'; }).join('') + '</div>' +
      '<div class="pcap">Profile readiness <span>' + avgReady + '%</span></div><div class="card"><div class="card-b">' +
        players.slice().sort(function (a,b) { return completion(a)-completion(b); }).slice(0,4).map(function (p) { var pc=completion(p); return '<a class="row" href="/player/profile?id=' + encodeURIComponent(p.id || '') + '" style="padding-left:0;padding-right:0;text-decoration:none"><span class="av">' + esc(initials(nameOf(p))) + '</span><span class="sp"><b class="rt">' + esc(nameOf(p)) + '</b><s class="rs">' + esc(position(p)) + '</s></span><span class="tag ' + readinessTag(pc) + '">' + pc + '%</span></a>'; }).join('') +
      '</div></div>';

    var exportLink = document.querySelector('#coachDeskTopbar [data-coach-route-action="secondary"]');
    if (exportLink) {
      exportLink.addEventListener('click', function (e) { e.preventDefault(); exportPlayers(players); });
    }
  }

  async function initDashboard() {
    try {
      var rs = await Promise.allSettled([
        api('GET','/api/coaches/dashboard'),
        api('GET','/api/coaches/my-players'),
        api('GET','/api/fixtures'),
        api('GET','/api/match-facts?limit=100'),
        api('GET','/api/notifications?limit=80'),
        api('GET','/api/chat/threads')
      ]);
      renderDashboard({
        dashboard: rs[0].status === 'fulfilled' ? (rs[0].value || {}) : {},
        players: safeSettled(rs[1],['players','data']),
        fixtures: safeSettled(rs[2],['fixtures','data']),
        facts: safeSettled(rs[3],['matchFacts','match_facts','data']),
        notifications: safeSettled(rs[4],['notifications','data']),
        threads: safeSettled(rs[5],['threads','data'])
      });
    } catch (e) {
      desk.innerHTML = routeMessage(e.message || 'Dashboard could not load.', true);
      field.innerHTML = routeMessage(e.message || 'Dashboard could not load.', true);
    }
  }

  /* ================= MY PLAYERS ================= */
  function playerAge(p) { return value(p,['age_group','ageGroup']) || '—'; }
  function currentPlayers() {
    var q = String(state.playerSearch || '').toLowerCase();
    var rows = (state.players || []).filter(function (p) {
      var assigned = String(value(p,['assigned_coach_id','assignedCoachId']) || '');
      return (!q || (nameOf(p) + ' ' + position(p) + ' ' + playerAge(p)).toLowerCase().indexOf(q) >= 0) &&
        (!state.playerPosition || positionGroup(p) === state.playerPosition) &&
        (!state.playerAge || playerAge(p) === state.playerAge) &&
        (!state.playerAssigned || assigned === state.playerAssigned) &&
        (!state.playerNeedsWork || completion(p) < 80);
    });
    rows.sort(function (a,b) {
      if (state.playerSort === 'overall') return num(value(b,['overall_rating','overall']),-1) - num(value(a,['overall_rating','overall']),-1);
      if (state.playerSort === 'readiness') return completion(a) - completion(b);
      return nameOf(a).localeCompare(nameOf(b));
    });
    return rows;
  }
  function coachName(c) { return [c && c.first_name,c && c.last_name].filter(Boolean).join(' ') || 'Coach'; }
  function coachOptions(selected) {
    return (state.coaches || []).map(function (c) {
      return '<option value="' + esc(c.id) + '"' + (String(c.id) === String(selected) ? ' selected' : '') + '>' + esc(coachName(c)) + (c.is_super_user ? ' · owner' : '') + '</option>';
    }).join('');
  }
  function playerStatus(p) {
    var pc = completion(p);
    if (bool(value(p,['scout_interest','has_scout_interest','scoutInterest']))) return ['b','Scout interest'];
    if (pc >= 80) return ['g','Match-ready'];
    return [pc < 50 ? 'r' : 'a','Evidence incomplete'];
  }
  function exportPlayers(rows) {
    rows = rows || currentPlayers();
    var csv = ['Player,Position,Age group,Apps,Goals,Assists,Overall,Profile readiness,Estimated value'];
    rows.forEach(function (p) {
      csv.push([nameOf(p),position(p),playerAge(p),num(value(p,['appearances','apps']),0),num(value(p,['goals']),0),num(value(p,['assists']),0),value(p,['overall_rating','overall']) || '',completion(p) + '%',num(value(p,['transfer_value','estimated_value']),0)].map(function (v) {
        return '"' + String(v).replace(/"/g,'""') + '"';
      }).join(','));
    });
    var blob = new Blob([csv.join('\n')], {type:'text/csv'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'scoutlink-my-players.csv'; a.click();
    URL.revokeObjectURL(url);
  }
  function filterRail() {
    var ages = Array.from(new Set((state.players || []).map(playerAge).filter(function (x) { return x !== '—'; }))).sort();
    return '<aside class="rail"><div class="rail-h">Filters<button class="btn q sm" type="button" id="clearPlayerFilters">Clear</button></div>' +
      '<div class="rsec"><div class="rh">Search</div><input class="inp" id="playerSearch" type="search" value="' + esc(state.playerSearch || '') + '" placeholder="Player name"></div>' +
      '<div class="rsec"><div class="rh">Age group</div><div class="chips">' + [''].concat(ages).map(function (x) { return '<button class="chip ' + (state.playerAge === x ? 'on' : '') + '" type="button" data-age="' + esc(x) + '">' + esc(x || 'All') + '</button>'; }).join('') + '</div></div>' +
      '<div class="rsec"><div class="rh">Position</div>' + ['','GK','DEF','MID','ATT'].map(function (x) { return '<button class="ri" type="button" data-pos="' + x + '" style="width:100%;border:0;background:transparent"><span class="' + (state.playerPosition === x ? 'rd on' : 'rd') + '"></span>' + (x || 'All positions') + '</button>'; }).join('') + '</div>' +
      (state.coaches && state.coaches.length ? '<div class="rsec"><div class="rh">Assigned coach</div><select class="inp" id="assignedFilter"><option value="">All coaches</option>' + coachOptions(state.playerAssigned) + '</select></div>' : '') +
      '<div class="rsec"><div class="rh">Evidence</div><button class="ri" type="button" id="needsWorkFilter" style="width:100%;border:0;background:transparent"><span class="' + (state.playerNeedsWork ? 'ck on' : 'ck') + '"></span>Needs work</button></div>' +
      '</aside>';
  }
  function renderPlayers() {
    setShellActions('Bulk import','/coach/bulk-add-players','Add player','/coach/add-player');
    var rows = currentPlayers();
    var pages = Math.max(1,Math.ceil(rows.length / 12));
    state.playerPage = Math.min(state.playerPage || 1,pages);
    var slice = rows.slice((state.playerPage - 1) * 12,state.playerPage * 12);

    desk.innerHTML =
      '<div style="display:flex;gap:14px;align-items:flex-start">' + filterRail() +
      '<div style="flex:1;min-width:0">' +
        '<div class="card"><div class="card-h"><h3>Squad · ' + rows.length + '</h3><span class="sp"></span><label class="sel">Sort&nbsp;<select id="playerSort" style="border:0;background:transparent"><option value="name"' + (state.playerSort === 'name' ? ' selected' : '') + '>Name</option><option value="overall"' + (state.playerSort === 'overall' ? ' selected' : '') + '>Overall ↓</option><option value="readiness"' + (state.playerSort === 'readiness' ? ' selected' : '') + '>Readiness ↑</option></select></label></div>' +
        '<div class="coach-table-scroll"><table><thead><tr><th>Player</th><th>Age</th><th>Position</th><th class="r">Apps</th><th class="r">G</th><th class="r">A</th><th class="r">Overall</th><th>Profile readiness</th><th>Value</th><th>Assigned coach</th><th>Status</th><th></th></tr></thead><tbody>' +
          slice.map(function (p) {
            var pc = completion(p), st = playerStatus(p), assigned = value(p,['assigned_coach_id','assignedCoachId']);
            return '<tr><td><a class="who" href="/player/profile?id=' + encodeURIComponent(p.id || '') + '" style="text-decoration:none">' + avatar(nameOf(p)) + '<span><b>' + esc(nameOf(p)) + '</b><s>' + esc(team()) + '</s></span></a></td>' +
              '<td>' + esc(playerAge(p)) + '</td><td>' + esc(position(p)) + '</td><td class="r">' + num(value(p,['appearances','apps']),0) + '</td><td class="r">' + num(value(p,['goals']),0) + '</td><td class="r">' + num(value(p,['assists']),0) + '</td><td class="r">' + (value(p,['overall_rating','overall']) == null ? '—' : Math.round(num(value(p,['overall_rating','overall']),0))) + '</td>' +
              '<td><div class="ebar ' + evidenceClass(pc) + '"><span class="tr"><i style="width:' + pc + '%"></i></span><b>' + pc + '%</b></div></td><td>' + esc(fmtMoney(value(p,['transfer_value','estimated_value']))) + '</td>' +
              '<td>' + (state.isSuper && state.coaches.length ? '<select class="sel" data-assign="' + esc(p.id) + '">' + coachOptions(assigned || state.profile.id) + '</select>' : esc(value(p,['assigned_coach_name']) || fullName())) + '</td><td><span class="tag ' + st[0] + '">' + esc(st[1]) + '</span></td>' +
              '<td><button class="btn q sm" type="button" data-player-menu="' + esc(p.id) + '">•••</button></td></tr>';
          }).join('') +
        '</tbody></table></div><div class="foot"><span class="mut">Showing ' + slice.length + ' of ' + rows.length + '</span><span class="sp"></span><button class="btn sm" data-page="' + Math.max(1,state.playerPage-1) + '">Previous</button><span class="tag b">Page ' + state.playerPage + ' of ' + pages + '</span><button class="btn sm" data-page="' + Math.min(pages,state.playerPage+1) + '">Next</button></div></div>' +
      '</div></div>';

    field.innerHTML =
      fieldHeader('Squad', (state.players || []).length + ' players · ' + teamLine(), '<a class="btn p sm" href="/coach/add-player">Add</a>') +
      '<div class="pbar"><label class="srch" style="width:auto;flex:1"><input id="fieldPlayerSearch" type="search" value="' + esc(state.playerSearch || '') + '" placeholder="Search players" style="width:100%;border:0;background:transparent;outline:0"></label><button class="btn sm" type="button" id="openPlayerFilters">Filters</button></div>' +
      '<div class="pbody" style="padding-left:0;padding-right:0"><div class="card">' +
        slice.map(function (p) {
          var pc=completion(p), st=playerStatus(p);
          return '<a class="row" href="/player/profile?id=' + encodeURIComponent(p.id || '') + '" style="text-decoration:none"><span class="av">' + esc(initials(nameOf(p))) + '</span><span class="sp"><b class="rt">' + esc(nameOf(p)) + '</b><s class="rs">' + esc(position(p) + ' · ' + playerAge(p) + ' · ' + num(value(p,['appearances','apps']),0) + ' apps') + '</s></span><span style="text-align:right"><span class="tag ' + st[0] + '">' + esc(st[1]) + '</span><s class="rs">' + pc + '% ready</s></span></a>';
        }).join('') +
      '</div><div class="pnote">Full table, assignment and CSV export are available on Coach Desk.</div></div>';
    bindPlayers();
  }
  function bindPlayers() {
    ['playerSearch','fieldPlayerSearch'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', function () { state.playerSearch = el.value; state.playerPage = 1; renderPlayers(); });
    });
    document.querySelectorAll('[data-pos]').forEach(function (b) { b.onclick = function () { state.playerPosition = b.dataset.pos || ''; state.playerPage = 1; renderPlayers(); }; });
    document.querySelectorAll('[data-age]').forEach(function (b) { b.onclick = function () { state.playerAge = b.dataset.age || ''; state.playerPage = 1; renderPlayers(); }; });
    var af = document.getElementById('assignedFilter'); if (af) af.onchange = function () { state.playerAssigned = af.value; state.playerPage = 1; renderPlayers(); };
    var nw = document.getElementById('needsWorkFilter'); if (nw) nw.onclick = function () { state.playerNeedsWork = !state.playerNeedsWork; state.playerPage = 1; renderPlayers(); };
    var clear = document.getElementById('clearPlayerFilters'); if (clear) clear.onclick = function () { state.playerSearch='';state.playerPosition='';state.playerAge='';state.playerAssigned='';state.playerNeedsWork=false;state.playerPage=1;renderPlayers(); };
    var sort = document.getElementById('playerSort'); if (sort) sort.onchange = function () { state.playerSort = sort.value; renderPlayers(); };
    document.querySelectorAll('[data-page]').forEach(function (b) { b.onclick = function () { state.playerPage = Number(b.dataset.page) || 1; renderPlayers(); }; });
    document.querySelectorAll('[data-assign]').forEach(function (sel) {
      sel.onchange = function () {
        api('POST','/api/coaches/assign-player/' + encodeURIComponent(sel.dataset.assign),{coachId:sel.value}).then(function () {
          if (window.CoachV2) window.CoachV2.showToast('Player assignment updated.');
        }).catch(function (e) { alert(e.message || 'Could not update assignment.'); });
      };
    });
    document.querySelectorAll('[data-player-menu]').forEach(function (b) {
      b.onclick = function () {
        var p = (state.players || []).find(function (x) { return String(x.id) === String(b.dataset.playerMenu); });
        if (!p || !window.CoachV2) return;
        window.CoachV2.openDrawer({title:nameOf(p),html:'<div class="stack"><a class="btn p" href="/player/profile?id=' + encodeURIComponent(p.id) + '">Open profile</a><a class="btn" href="/player/profile?id=' + encodeURIComponent(p.id) + '&edit=1">Edit assessment</a><button class="btn" id="generatePlayerLink" type="button">Generate video upload link</button><div id="playerLinkResult"></div></div>'});
        setTimeout(function () {
          var g=document.getElementById('generatePlayerLink');
          if (g) g.onclick=function () {
            api('POST','/api/videos/upload-link',{playerId:p.id}).then(function (r) {
              var d=r.data||r, url=d.uploadUrl||d.url||'';
              document.getElementById('playerLinkResult').innerHTML='<div class="callout"><b>Upload link</b><br>' + esc(url || 'Link created') + '</div>';
            }).catch(function (e) { document.getElementById('playerLinkResult').innerHTML=routeMessage(e.message,true); });
          };
        },0);
      };
    });
    var filters=document.getElementById('openPlayerFilters');
    if (filters && window.CoachV2) filters.onclick=function () {
      var html='<div class="stack"><div class="field"><label>Position</label><select id="sheetPos"><option value="">All</option><option>GK</option><option>DEF</option><option>MID</option><option>ATT</option></select></div><label class="chip"><input id="sheetNeeds" type="checkbox"' + (state.playerNeedsWork?' checked':'') + '> Needs work</label><button class="btn p" id="applyPlayerSheet" type="button">Apply filters</button></div>';
      window.CoachV2.openSheet({title:'Squad filters',html:html});
      setTimeout(function () {
        var sp=document.getElementById('sheetPos'); if(sp)sp.value=state.playerPosition||'';
        var apply=document.getElementById('applyPlayerSheet'); if(apply)apply.onclick=function () {
          state.playerPosition=sp?sp.value:'';
          state.playerNeedsWork=!!(document.getElementById('sheetNeeds')&&document.getElementById('sheetNeeds').checked);
          state.playerPage=1; window.CoachV2.closeAll(); renderPlayers();
        };
      },0);
    };
  }
  async function initPlayers() {
    try {
      var rs = await Promise.allSettled([api('GET','/api/coaches/my-players'),api('GET','/api/coaches/profile')]);
      state.players = safeSettled(rs[0],['players','data']);
      state.profile = rs[1].status === 'fulfilled' ? (rs[1].value.coach || rs[1].value.profile || rs[1].value || {}) : {};
      state.isSuper = !!state.profile.is_super_user;
      state.coaches = [];
      if (state.isSuper) {
        var cr = await api('GET','/api/coaches/team-coaches').catch(function () { return {data:[]}; });
        state.coaches = [state.profile].concat(list(cr,['coaches','data'])).filter(function (c,i,a) { return c && c.id && a.findIndex(function (x) { return x && String(x.id) === String(c.id); }) === i; });
      }
      renderPlayers();
    } catch (e) {
      desk.innerHTML=routeMessage(e.message,true); field.innerHTML=routeMessage(e.message,true);
    }
  }

  /* ================= FIXTURES ================= */
  function fixtureStatus(f, fmap) {
    var today=new Date();today.setHours(0,0,0,0);
    var d=new Date(String(fixtureDate(f)||'').slice(0,10)+'T12:00:00');
    if (Number.isNaN(d.getTime()) || d >= today) return 'upcoming';
    return fmap[String(f.id)] ? 'recorded' : 'missing';
  }
  function fixtureScore(f) {
    if (f.home_score != null || f.away_score != null) return num(f.home_score,0) + '–' + num(f.away_score,0);
    return '';
  }
  function renderFixtures() {
    setShellActions('Import CSV','#','Add fixture','#');
    var fmap=factMap(state.matchFacts||[]);
    var up=(state.fixtures||[]).filter(function(f){return fixtureStatus(f,fmap)==='upcoming';});
    var done=(state.fixtures||[]).filter(function(f){return fixtureStatus(f,fmap)!=='upcoming';});
    var missing=done.filter(function(f){return fixtureStatus(f,fmap)==='missing';});
    var coverage=done.length?Math.round((done.length-missing.length)/done.length*100):100;
    var goalsFor=done.reduce(function(s,f){return s+num(value(f,['home_score','goals_for']),0);},0);
    var goalsAgainst=done.reduce(function(s,f){return s+num(value(f,['away_score','goals_against']),0);},0);

    function deskRow(f,status) {
      var score=fixtureScore(f);
      return '<div class="row">' + iconBox(status==='missing'?'!':'FX',status==='missing'?'r':status==='recorded'?'g':'b') +
        '<span class="sp"><b class="rt">vs ' + esc(opponent(f)) + (score?' · '+esc(score):'') + '</b><s class="rs">' + esc(formatDate(fixtureDate(f),fixtureTime(f)) + (venue(f)?' · '+venue(f):'') + ' · ' + (value(f,['home_or_away','homeOrAway'])||'Home')) + '</s></span>' +
        (status==='missing'?'<a class="btn p sm" href="/coach/match-facts?fixtureId=' + encodeURIComponent(f.id||'') + '">Record Match Facts</a>':status==='recorded'?'<span class="tag g">Recorded</span>':'<button class="btn q sm" data-edit-fixture="' + esc(f.id) + '">Edit</button><button class="btn dgr sm" data-delete-fixture="' + esc(f.id) + '">Delete</button>') +
      '</div>';
    }

    desk.innerHTML =
      '<div class="g" style="grid-template-columns:repeat(4,minmax(0,1fr));margin-bottom:14px"><div class="kpi"><div class="k">This season</div><div class="v">' + done.length + '</div><div class="d">played fixtures</div></div><div class="kpi"><div class="k">Match Facts recorded</div><div class="v">' + (done.length-missing.length) + '<small>/' + done.length + '</small></div><div class="d">' + coverage + '% coverage</div></div><div class="kpi"><div class="k">Goals for</div><div class="v">' + goalsFor + '</div><div class="d">from recorded results</div></div><div class="kpi"><div class="k">Goal difference</div><div class="v">' + (goalsFor-goalsAgainst >= 0?'+':'') + (goalsFor-goalsAgainst) + '</div><div class="d">current recorded fixtures</div></div></div>' +
      (missing.length?'<div class="card" style="margin-bottom:14px;border-color:#E8C0BC"><div class="card-h"><h3 style="color:var(--red)">Match Facts missing · ' + missing.length + '</h3><span class="sp"></span><span class="hint">complete the evidence trail</span></div><div class="card-b" style="padding-top:3px;padding-bottom:3px">' + missing.map(function(f){return deskRow(f,'missing');}).join('') + '</div></div>':'') +
      '<div class="g" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start"><div class="card"><div class="card-h"><h3>Upcoming</h3><span class="sp"></span><span class="hint">' + up.length + ' scheduled</span></div><div class="card-b" style="padding-top:3px;padding-bottom:3px">' + (up.length?up.map(function(f){return deskRow(f,'upcoming');}).join(''):'<div class="row"><span class="sp mut">No upcoming fixtures.</span></div>') + '</div></div><div class="card"><div class="card-h"><h3>Played</h3><span class="sp"></span><span class="hint">' + done.length + ' fixtures</span></div><div class="card-b" style="padding-top:3px;padding-bottom:3px">' + (done.length?done.slice(0,8).map(function(f){return deskRow(f,fixtureStatus(f,fmap));}).join(''):'<div class="row"><span class="sp mut">No completed fixtures.</span></div>') + '</div></div></div><input type="file" id="fixtureCsvInput" accept=".csv" hidden>';

    field.innerHTML =
      fieldHeader('Fixtures', up.length + ' upcoming · ' + done.length + ' played', '<button class="btn p sm" type="button" id="fieldAddFixture">Add</button>') +
      '<div class="pkpi"><div class="kpi"><div class="k">Played</div><div class="v">' + done.length + '</div></div><div class="kpi"><div class="k">MF coverage</div><div class="v">' + coverage + '%</div></div></div>' +
      (missing.length?'<div class="pcap">Needs attention <span>' + missing.length + '</span></div><div class="card">' + missing.map(function(f){return '<div class="row">' + iconBox('!','r') + '<span class="sp"><b class="rt">vs ' + esc(opponent(f)) + '</b><s class="rs">' + esc(formatDate(fixtureDate(f),fixtureTime(f))) + '</s></span><a class="btn p sm" href="/coach/match-facts?fixtureId=' + encodeURIComponent(f.id||'') + '">Record</a></div>';}).join('') + '</div>':'') +
      '<div class="pcap">Upcoming</div><div class="card">' + (up.length?up.map(function(f){return '<div class="row">' + iconBox('FX','b') + '<span class="sp"><b class="rt">vs ' + esc(opponent(f)) + '</b><s class="rs">' + esc(formatDate(fixtureDate(f),fixtureTime(f)) + ' · ' + (value(f,['home_or_away'])||'Home')) + '</s></span><button class="btn q sm" data-edit-fixture="' + esc(f.id) + '">Edit</button></div>';}).join(''):'<div class="row"><span class="sp mut">No upcoming fixtures.</span></div>') + '</div>' +
      '<div class="pcap">Recently played</div><div class="card">' + (done.length?done.slice(0,6).map(function(f){var st=fixtureStatus(f,fmap);return '<div class="row">' + iconBox(st==='missing'?'!':'✓',st==='missing'?'r':'g') + '<span class="sp"><b class="rt">vs ' + esc(opponent(f)) + (fixtureScore(f)?' · '+esc(fixtureScore(f)):'') + '</b><s class="rs">' + esc(formatDate(fixtureDate(f))) + '</s></span><span class="tag ' + (st==='missing'?'r':'g') + '">' + (st==='missing'?'Missing MF':'Recorded') + '</span></div>';}).join(''):'<div class="row"><span class="sp mut">No completed fixtures.</span></div>') + '</div>';
    bindFixtureActions();
  }
  function fixtureForm(f) {
    f=f||{};
    return '<form id="fixtureForm"><div class="fld"><label class="fl">Opponent</label><input class="inp" name="opponent" value="' + esc(opponent(f)==='Opponent'?'':opponent(f)) + '" required></div><div class="g" style="grid-template-columns:1fr 1fr"><div class="fld"><label class="fl">Date</label><input class="inp" name="fixtureDate" type="date" value="' + esc(String(fixtureDate(f)||'').slice(0,10)) + '" required></div><div class="fld"><label class="fl">Kick-off</label><input class="inp" name="fixtureTime" type="time" value="' + esc(String(fixtureTime(f)||'').slice(0,5)) + '"></div></div><div class="fld"><label class="fl">Venue</label><input class="inp" name="venue" value="' + esc(venue(f)) + '"></div><div class="g" style="grid-template-columns:1fr 1fr"><div class="fld"><label class="fl">Home / away</label><select class="inp" name="homeOrAway"><option' + ((value(f,['home_or_away'])||'Home')==='Home'?' selected':'') + '>Home</option><option' + (value(f,['home_or_away'])==='Away'?' selected':'') + '>Away</option></select></div><div class="fld"><label class="fl">Format</label><select class="inp" name="format"><option>11-a-side</option><option>9-a-side</option><option>7-a-side</option><option>5-a-side</option></select></div></div><div class="fld"><label class="fl">Notes</label><textarea class="inp ta" name="notes">' + esc(value(f,['notes'])||'') + '</textarea></div><div id="fixtureFormMsg"></div><div style="display:flex;justify-content:flex-end"><button class="btn p" type="submit">Save fixture</button></div></form>';
  }
  function openFixture(f) {
    if (!window.CoachV2) return;
    window.CoachV2.openDrawer({title:f?'Edit fixture':'Add fixture',html:fixtureForm(f)});
    setTimeout(function(){
      var form=document.getElementById('fixtureForm');
      if (!form) return;
      form.onsubmit=function(e){
        e.preventDefault();
        var fd=new FormData(form), body={};
        fd.forEach(function(v,k){body[k]=v||null;});
        body.opponent=String(body.opponent||'').trim();
        if(!body.opponent||!body.fixtureDate){document.getElementById('fixtureFormMsg').innerHTML=routeMessage('Opponent and date are required.',true);return;}
        api(f?'PUT':'POST',f?'/api/fixtures/'+encodeURIComponent(f.id):'/api/fixtures',body).then(function(){window.CoachV2.closeAll();return loadFixtures();}).catch(function(err){document.getElementById('fixtureFormMsg').innerHTML=routeMessage(err.message,true);});
      };
    },0);
  }
  function bindFixtureActions() {
    document.querySelectorAll('[data-edit-fixture]').forEach(function(b){b.onclick=function(){openFixture((state.fixtures||[]).find(function(f){return String(f.id)===String(b.dataset.editFixture);})||null);};});
    document.querySelectorAll('[data-delete-fixture]').forEach(function(b){b.onclick=function(){var f=(state.fixtures||[]).find(function(x){return String(x.id)===String(b.dataset.deleteFixture);});if(f&&confirm('Delete the fixture against '+opponent(f)+'?'))api('DELETE','/api/fixtures/'+encodeURIComponent(f.id),{}).then(loadFixtures).catch(function(e){alert(e.message);});};});
    var top=document.querySelector('#coachDeskTopbar [data-coach-route-action="primary"]'); if(top)top.onclick=function(e){e.preventDefault();openFixture(null);};
    var fieldAdd=document.getElementById('fieldAddFixture'); if(fieldAdd)fieldAdd.onclick=function(){openFixture(null);};
    var importButton=document.querySelector('#coachDeskTopbar [data-coach-route-action="secondary"]'); var input=document.getElementById('fixtureCsvInput');
    if(importButton&&input){importButton.onclick=function(e){e.preventDefault();input.click();};input.onchange=function(){if(input.files[0])importFixtureCsv(input.files[0]);};}
  }
  function importFixtureCsv(file) {
    file.text().then(function(text){
      var lines=text.split(/\r?\n/).filter(Boolean);if(lines.length<2)throw new Error('CSV has no fixture rows.');
      var h=lines[0].split(',').map(function(x){return x.trim().toLowerCase().replace(/[^a-z0-9]+/g,'_');});
      var rows=lines.slice(1).map(function(line){var v=line.split(','),r={};h.forEach(function(k,i){r[k]=(v[i]||'').trim();});return{opponent:r.opponent||r.opponent_name,fixtureDate:r.fixture_date||r.date,fixtureTime:r.fixture_time||r.time||null,venue:r.venue||r.venue_name||null,homeOrAway:r.home_or_away||r.home_away||'Home',format:r.format||'11-a-side'};}).filter(function(r){return r.opponent&&r.fixtureDate;});
      return rows.reduce(function(p,r){return p.then(function(){return api('POST','/api/fixtures',r);});},Promise.resolve());
    }).then(function(){if(window.CoachV2)window.CoachV2.showToast('Fixture CSV imported.');return loadFixtures();}).catch(function(e){alert(e.message);});
  }
  async function loadFixtures() {
    try {
      var rs=await Promise.all([api('GET','/api/fixtures').catch(function(){return{data:[]};}),api('GET','/api/match-facts?limit=100').catch(function(){return{data:[]};})]);
      state.fixtures=list(rs[0],['fixtures','data']);
      state.matchFacts=list(rs[1],['matchFacts','match_facts','data']);
      renderFixtures();
    } catch(e){desk.innerHTML=routeMessage(e.message,true);field.innerHTML=routeMessage(e.message,true);}
  }

  /* ================= VIDEO REELS ================= */
  function videoUrl(v){return value(v,['signed_url','url','video_url','file_url'])||'';}
  function videoPlayerName(v){
    return value(v,['player_name','playerName']) ||
      (v.players ? [v.players.first_name,v.players.last_name].filter(Boolean).join(' ') : '') ||
      ((state.videoPlayers||[]).find(function(p){return String(p.id)===String(v.player_id);}) ? nameOf((state.videoPlayers||[]).find(function(p){return String(p.id)===String(v.player_id);})) : 'Player');
  }
  function renderVideos() {
    setShellActions('Refresh','#','Upload video','#');
    var videos=state.videos||[], players=state.videoPlayers||[];
    var byPlayer={};videos.forEach(function(v){if(v.player_id)byPlayer[String(v.player_id)]=(byPlayer[String(v.player_id)]||0)+1;});
    var withVideo=players.filter(function(p){return byPlayer[String(p.id)]>0;});
    var noVideo=players.filter(function(p){return !byPlayer[String(p.id)];});

    function videoCard(v,mobile){
      var url=videoUrl(v);
      return '<div class="card coach-video-card"><button class="coach-video-thumb" type="button" data-watch-video="' + esc(url) + '">▶</button><div class="card-b"><b>' + esc(value(v,['title'])||'Video reel') + '</b><div class="mut">' + esc(videoPlayerName(v) + ' · ' + (value(v,['category','video_type'])||'Highlight')) + '</div><div style="display:flex;gap:6px;margin-top:8px"><button class="btn q sm" type="button" data-watch-video="' + esc(url) + '">Open</button>' + (!mobile?'<button class="btn dgr sm" type="button" data-delete-video="' + esc(v.id||'') + '">Delete</button>':'') + '</div></div></div>';
    }

    desk.innerHTML =
      '<div class="g" style="grid-template-columns:repeat(4,minmax(0,1fr));margin-bottom:14px"><div class="kpi"><div class="k">Players with video</div><div class="v">' + withVideo.length + '</div><div class="d">of ' + players.length + ' players</div></div><div class="kpi"><div class="k">Awaiting review</div><div class="v">0</div><div class="d">clips waiting for coach review</div></div><div class="kpi"><div class="k">No video</div><div class="v">' + noVideo.length + '</div><div class="d">players without a reel</div></div><div class="kpi"><div class="k">Approved clips</div><div class="v">' + videos.length + '</div><div class="d">clips available to the workspace</div></div></div>' +
      '<div class="g" style="grid-template-columns:minmax(0,1fr) 330px;align-items:start"><div><div class="card" style="margin-bottom:14px"><div class="card-h"><h3>Player coverage</h3><span class="sp"></span><span class="hint">' + withVideo.length + '/' + players.length + '</span></div><div class="card-b" style="padding-top:3px;padding-bottom:3px">' + (players.length?players.map(function(p){return '<div class="row">' + avatar(nameOf(p)) + '<span class="sp"><b class="rt">' + esc(nameOf(p)) + '</b><s class="rs">' + esc(position(p)) + '</s></span><span class="tag ' + (byPlayer[String(p.id)]?'g':'a') + '">' + (byPlayer[String(p.id)]?byPlayer[String(p.id)]+' clip'+(byPlayer[String(p.id)]===1?'':'s'):'No video') + '</span>' + (!byPlayer[String(p.id)]?'<button class="btn q sm" data-generate-link="' + esc(p.id) + '">Upload link</button>':'') + '</div>';}).join(''):'<div class="row"><span class="sp mut">No players available.</span></div>') + '</div></div><div class="card"><div class="card-h"><h3>All video reels · ' + videos.length + '</h3></div><div class="card-b"><div class="g coach-video-grid" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:10px">' + (videos.length?videos.map(function(v){return videoCard(v,false);}).join(''):'<div class="mut">No videos yet.</div>') + '</div></div></div></div>' +
      '<div><div class="card" style="margin-bottom:14px"><div class="card-h"><h3>Upload Video Reel</h3></div><div class="card-b"><form id="videoUploadForm"><div class="fld"><label class="fl">Player</label><select class="inp" name="playerId" required><option value="">Select player…</option>' + players.map(function(p){return '<option value="' + esc(p.id) + '">' + esc(nameOf(p)) + '</option>';}).join('') + '</select></div><div class="fld"><label class="fl">Category</label><select class="inp" name="category"><option>Highlight</option><option>Match</option><option>Training</option><option>Skills</option><option>Goal</option></select></div><div class="fld"><label class="fl">Title</label><input class="inp" name="title" placeholder="Optional title"></div><label class="drop"><b>Choose video file</b><input name="file" type="file" accept="video/*" style="display:block;margin:8px auto 0"><span class="help">The current API upload limit is 4 MB.</span></label><div id="videoUploadMsg"></div><button class="btn p" type="submit" style="margin-top:10px">Upload Video</button></form></div></div><div class="card"><div class="card-h"><h3>Player Upload Link</h3></div><div class="card-b"><div class="fld"><label class="fl">Player</label><select class="inp" id="videoLinkPlayer"><option value="">Select player…</option>' + players.map(function(p){return '<option value="' + esc(p.id) + '">' + esc(nameOf(p)) + '</option>';}).join('') + '</select></div><button class="btn p" id="generateVideoLink">Generate Link</button><div id="videoLinkResult" style="margin-top:8px"></div><div class="help">Token-protected, single-player upload link.</div></div></div></div></div>';

    field.innerHTML =
      fieldHeader('Video Reels', videos.length + ' clips · ' + withVideo.length + ' players covered') +
      '<div class="pkpi"><div class="kpi"><div class="k">Covered</div><div class="v">' + withVideo.length + '</div><div class="d">players</div></div><div class="kpi"><div class="k">No video</div><div class="v">' + noVideo.length + '</div><div class="d">players</div></div></div>' +
      '<div class="pcap">No video <span>' + noVideo.length + '</span></div><div class="card">' + (noVideo.slice(0,5).map(function(p){return '<div class="row">' + avatar(nameOf(p)) + '<span class="sp"><b class="rt">' + esc(nameOf(p)) + '</b><s class="rs">' + esc(position(p)) + '</s></span><button class="btn q sm" data-generate-link="' + esc(p.id) + '">Link</button></div>';}).join('') || '<div class="row"><span class="sp mut">Every listed player has a video.</span></div>') + '</div>' +
      '<div class="pcap">Approved clips <span>' + videos.length + '</span></div><div class="g coach-video-grid" style="grid-template-columns:1fr 1fr;gap:8px">' + videos.slice(0,8).map(function(v){return videoCard(v,true);}).join('') + '</div>' +
      '<div style="height:12px"></div><button class="btn p" style="width:100%" id="fieldUploadVideo" type="button">Upload or generate a link</button>';
    bindVideoActions();
  }
  function generateVideoLink(pid, target) {
    if (!pid) return Promise.reject(new Error('Choose a player.'));
    return api('POST','/api/videos/upload-link',{playerId:pid}).then(function(r){
      var d=r.data||r,url=d.uploadUrl||d.url||'';
      if(target)target.innerHTML='<div class="callout"><b>Upload link</b><br><span class="coach-break">' + esc(url||'Link created') + '</span><div style="margin-top:6px"><button class="btn sm" type="button" data-copy-link="' + esc(url) + '">Copy</button></div></div>';
      return url;
    });
  }
  function bindVideoActions() {
    document.querySelectorAll('[data-watch-video]').forEach(function(b){b.onclick=function(){var url=b.dataset.watchVideo;if(!url)return alert('Video URL is unavailable.');window.open(url,'_blank','noopener');};});
    document.querySelectorAll('[data-delete-video]').forEach(function(b){b.onclick=function(){if(confirm('Delete this video?'))api('DELETE','/api/videos/'+encodeURIComponent(b.dataset.deleteVideo),{}).then(loadVideos).catch(function(e){alert(e.message);});};});
    document.querySelectorAll('[data-generate-link]').forEach(function(b){b.onclick=function(){if(!window.CoachV2)return;var pid=b.dataset.generateLink;window.CoachV2.openSheet({title:'Player upload link',html:'<div id="sheetVideoLink">Generating…</div>'});setTimeout(function(){var t=document.getElementById('sheetVideoLink');generateVideoLink(pid,t).catch(function(e){if(t)t.innerHTML=routeMessage(e.message,true);});},0);};});
    document.addEventListener('click',function copyHandler(e){var b=e.target.closest('[data-copy-link]');if(!b)return;navigator.clipboard.writeText(b.dataset.copyLink||'').then(function(){if(window.CoachV2)window.CoachV2.showToast('Link copied.');});},{once:true});
    var form=document.getElementById('videoUploadForm');if(form)form.onsubmit=uploadVideo;
    var gen=document.getElementById('generateVideoLink');if(gen)gen.onclick=function(){var pid=document.getElementById('videoLinkPlayer').value,target=document.getElementById('videoLinkResult');generateVideoLink(pid,target).catch(function(e){target.innerHTML=routeMessage(e.message,true);});};
    var refresh=document.querySelector('#coachDeskTopbar [data-coach-route-action="secondary"]');if(refresh)refresh.onclick=function(e){e.preventDefault();loadVideos();};
    var uploadTop=document.querySelector('#coachDeskTopbar [data-coach-route-action="primary"]');if(uploadTop)uploadTop.onclick=function(e){e.preventDefault();var form=document.getElementById('videoUploadForm');if(form)form.scrollIntoView({behavior:'smooth',block:'start'});};
    var fieldButton=document.getElementById('fieldUploadVideo');if(fieldButton&&window.CoachV2)fieldButton.onclick=function(){window.CoachV2.openSheet({title:'Video Reels',html:'<div class="stack"><a class="btn p" href="/coach/video-reels">Open full Video Reels tools</a><div class="mut">Use Coach Desk for direct file upload. Player upload links work on both layouts.</div></div>'});};
  }
  function uploadVideo(e) {
    e.preventDefault();
    var form=e.currentTarget,fd0=new FormData(form),file=fd0.get('file'),msg=document.getElementById('videoUploadMsg');
    if(!fd0.get('playerId')||!file||!file.size){msg.innerHTML=routeMessage('Choose a player and video file.',true);return;}
    if(file.size>4*1024*1024){msg.innerHTML=routeMessage('The current ScoutLink API accepts video files up to 4 MB.',true);return;}
    var fd=new FormData();fd.append('file',file);fd.append('title',fd0.get('title')||file.name);fd.append('category',fd0.get('category')||'Highlight');fd.append('playerId',fd0.get('playerId'));
    msg.innerHTML=routeMessage('Uploading…');
    fetch((window.API||'')+'/api/videos/upload',{method:'POST',headers:{Authorization:'Bearer '+(window.Auth&&window.Auth.token||'')},body:fd}).then(function(r){return r.json().then(function(d){if(!r.ok)throw new Error(d.error||'Upload failed');return d;});}).then(function(){if(window.CoachV2)window.CoachV2.showToast('Video uploaded.');return loadVideos();}).catch(function(e2){msg.innerHTML=routeMessage(e2.message,true);});
  }
  async function loadVideos() {
    try {
      var rs=await Promise.all([api('GET','/api/videos?type=player').catch(function(){return{data:[]};}),api('GET','/api/coaches/my-players').catch(function(){return{data:[]};})]);
      state.videos=list(rs[0],['videos','data']);
      state.videoPlayers=list(rs[1],['players','data']);
      renderVideos();
    } catch(e){desk.innerHTML=routeMessage(e.message,true);field.innerHTML=routeMessage(e.message,true);}
  }

  /* ================= CHAT ================= */
  function threadId(t){return value(t,['id','thread_id','threadId']);}
  function threadPlayer(t){return value(t,['player_name','playerName'])||nameOf(t.player||{});}
  function threadScout(t){return value(t,['scout_name','scoutName','other_user_name','otherUserName','title'])||'ScoutLink Scout';}
  async function loadThread(id){
    state.activeThread=String(id||'');
    try{var r=await api('GET','/api/chat/threads/'+encodeURIComponent(id)+'/messages');state.messages=list(r,['messages','data']);state.chatError='';renderChat();}
    catch(e){state.messages=[];state.chatError=e.message;renderChat();}
  }
  function renderThreadList(mobile) {
    var threads=state.threads||[];
    return threads.map(function(t){
      var on=String(threadId(t))===String(state.activeThread);
      return '<button class="thr ' + (on?'on':'') + '" type="button" data-thread="' + esc(threadId(t)) + '" style="width:100%;text-align:left;border:0;background:' + (on?'var(--blue-t)':'var(--paper)') + '">' + avatar(threadScout(t)) + '<span class="sp"><b>' + esc(threadScout(t)) + '</b><span class="re">Reviewed Scout · ' + esc(threadPlayer(t)) + '</span><div class="pv">' + esc(value(t,['last_message','lastMessage','preview'])||'Open conversation') + '</div></span><span class="tm">' + (num(value(t,['unread_count','unreadCount']),0)?'<span class="tag b">'+num(value(t,['unread_count','unreadCount']),0)+'</span>':'') + '</span></button>';
    }).join('');
  }
  function renderChat() {
    setShellActions(null,null,null,null);
    var threads=state.threads||[];
    var active=threads.find(function(t){return String(threadId(t))===String(state.activeThread);})||threads[0]||null;
    if(active&&!state.activeThread)state.activeThread=String(threadId(active));
    var messages=state.messages||[];

    desk.innerHTML='<div style="display:grid;grid-template-columns:300px minmax(0,1fr);min-height:660px"><div class="card" style="border-right:0"><div class="card-h"><h3>Conversations</h3><span class="sp"></span><span class="hint">'+threads.length+'</span></div><div>'+renderThreadList(false)+'</div></div><div class="card" style="display:flex;flex-direction:column;min-width:0">' +
      (active?'<div class="card-h">' + avatar(threadScout(active)) + '<div><h3>' + esc(threadScout(active)) + ' <span class="tag g">Reviewed Scout</span></h3><div class="hint">about ' + esc(threadPlayer(active)) + '</div></div><span class="sp"></span><a class="btn q sm" href="/player/profile?id=' + encodeURIComponent(value(active,['player_id','playerId'])||'') + '">Player profile</a><a class="btn dgr sm" href="/coach/report-a-concern">Report concern</a></div><div class="coach-chatlog" style="flex:1;padding:18px;overflow:auto">' +
        (state.chatError?routeMessage(state.chatError,true):messages.map(function(m){var mine=String(value(m,['sender_type','sender_role','senderRole'])||'').toLowerCase()==='coach'||String(value(m,['sender_id','senderId'])||'')===String(user().id||'');return '<div class="msg ' + (mine?'out':'in') + '" style="margin-bottom:10px">' + esc(value(m,['body','message','text'])||'') + '<div class="mt">' + esc(formatDate(value(m,['created_at','createdAt']))) + '</div></div>';}).join('')) +
        '</div><form class="foot" id="chatCompose"><textarea class="inp ta" id="chatMessage" style="height:52px;flex:1" placeholder="Write a message…"></textarea><button class="btn p" type="submit">Send</button></form>':'<div class="card-b mut">No player conversations yet.</div>') +
      '</div></div>';

    field.innerHTML=active?
      fieldHeader(threadScout(active),'Reviewed Scout · about '+threadPlayer(active),'<a class="btn q sm" href="/coach/chat">Inbox</a>') +
      '<div class="pbody"><div style="display:flex;gap:6px;margin-bottom:10px"><a class="btn q sm" href="/player/profile?id=' + encodeURIComponent(value(active,['player_id','playerId'])||'') + '">Player profile</a><a class="btn dgr sm" href="/coach/report-a-concern">Report</a></div><div class="coach-chatlog-phone">' +
      messages.map(function(m){var mine=String(value(m,['sender_type','sender_role','senderRole'])||'').toLowerCase()==='coach'||String(value(m,['sender_id','senderId'])||'')===String(user().id||'');return '<div class="msg ' + (mine?'out':'in') + '" style="margin-bottom:8px">' + esc(value(m,['body','message','text'])||'') + '<div class="mt">' + esc(formatDate(value(m,['created_at','createdAt']))) + '</div></div>';}).join('') +
      '</div><form class="pbar" id="fieldChatCompose" style="margin:14px -14px -14px"><textarea class="inp" id="fieldChatMessage" style="flex:1;height:38px" placeholder="Write a message…"></textarea><button class="btn p" type="submit">Send</button></form></div>':
      fieldHeader('Inbox','Reviewed Scout conversations')+'<div class="pbody"><div class="card">'+renderThreadList(true)+'</div></div>';
    bindChat();
  }
  function sendChat(text){var body=String(text||'').trim();if(!body||!state.activeThread)return Promise.resolve();return api('POST','/api/chat/threads/'+encodeURIComponent(state.activeThread)+'/messages',{body:body}).then(function(){return loadThread(state.activeThread);});}
  function bindChat(){
    document.querySelectorAll('[data-thread]').forEach(function(b){b.onclick=function(){loadThread(b.dataset.thread);};});
    var f=document.getElementById('chatCompose');if(f)f.onsubmit=function(e){e.preventDefault();var t=document.getElementById('chatMessage');sendChat(t.value).then(function(){t.value='';});};
    var ff=document.getElementById('fieldChatCompose');if(ff)ff.onsubmit=function(e){e.preventDefault();var t=document.getElementById('fieldChatMessage');sendChat(t.value).then(function(){t.value='';});};
  }
  async function initChat(){try{var r=await api('GET','/api/chat/threads');state.threads=list(r,['threads','data']).filter(function(t){return value(t,['player_id','playerId'])||t.player;});var requested=new URLSearchParams(location.search).get('threadId');var first=requested||threadId(state.threads[0]);if(first)await loadThread(first);else renderChat();}catch(e){desk.innerHTML=routeMessage(e.message,true);field.innerHTML=routeMessage(e.message,true);}}

  /* ================= NOTIFICATIONS ================= */
  function notifGroup(n) {
    var explicit=String(value(n,['filterGroup','filter_group','notification_type','type'])||'').toLowerCase();
    var text=(explicit+' '+String(value(n,['title'])||'')+' '+String(value(n,['body'])||'')).toLowerCase();
    if(/message|chat/.test(text))return'messages';
    if(/match|fixture/.test(text))return'match';
    if(/video/.test(text))return'video';
    if(/scout|interest|recruit/.test(text))return'scout';
    return'system';
  }
  function notificationRow(n) {
    var url=value(n,['actionUrl','action_url'])||'#',label=value(n,['actionLabel','action_label'])||'View',read=bool(value(n,['isRead','is_read']));
    var group=notifGroup(n), cls=group==='scout'?'g':group==='match'?'r':group==='messages'?'b':group==='video'?'a':'';
    return '<div class="row" style="' + (read?'opacity:.62':'') + '">' + iconBox(group==='scout'?'SC':group==='messages'?'IN':group==='match'?'MF':group==='video'?'VD':'•',cls) + '<span class="sp"><b class="rt">' + esc(value(n,['title'])||'ScoutLink notification') + '</b><s class="rs">' + esc(value(n,['body'])||'') + '</s></span><a class="btn ' + (group==='match'?'p':'q') + ' sm" data-notification-id="' + esc(n.id||'') + '" href="' + esc(clean(url)) + '">' + esc(label) + '</a></div>';
  }
  function renderNotifications() {
    setShellActions('Mark all read','#',null,null);
    var all=state.notifications||[],filter=state.notifFilter||'all',rows=filter==='all'?all:all.filter(function(n){return notifGroup(n)===filter;});
    var groups=[['all','All'],['scout','Scout activity'],['messages','Messages'],['match','Match Facts'],['video','Video'],['system','Account & system']];
    desk.innerHTML='<div class="chips" style="margin-bottom:14px">' + groups.map(function(g){var count=g[0]==='all'?all.length:all.filter(function(n){return notifGroup(n)===g[0];}).length;return '<button class="chip ' + (filter===g[0]?'on':'') + '" data-notif-filter="' + g[0] + '">' + esc(g[1]) + ' · ' + count + '</button>';}).join('') + '</div>' +
      groups.slice(1).map(function(g){var items=rows.filter(function(n){return notifGroup(n)===g[0];});if(!items.length)return'';return '<div class="card" style="margin-bottom:14px"><div class="card-h"><h3>' + esc(g[1]) + '</h3><span class="sp"></span><span class="hint">' + items.length + '</span></div><div class="card-b" style="padding-top:3px;padding-bottom:3px">' + items.map(notificationRow).join('') + '</div></div>';}).join('') +
      (!rows.length?'<div class="card"><div class="card-b mut">No notifications in this filter.</div></div>':'');

    field.innerHTML=fieldHeader('Notifications',state.unread+' unread','<button class="btn q sm" id="fieldMarkAll">Mark read</button>') +
      '<div class="pbody"><div class="pseg" style="margin-bottom:10px"><u class="' + (filter==='all'?'on':'') + '" data-notif-filter="all">All</u><u class="' + (filter==='scout'?'on':'') + '" data-notif-filter="scout">Scout</u><u class="' + (filter==='messages'?'on':'') + '" data-notif-filter="messages">Messages</u></div><div class="card">' + (rows.length?rows.map(notificationRow).join(''):'<div class="card-b mut">No notifications.</div>') + '</div></div>';
    bindNotifications();
  }
  function bindNotifications(){
    document.querySelectorAll('[data-notif-filter]').forEach(function(b){b.onclick=function(){state.notifFilter=b.dataset.notifFilter;renderNotifications();};});
    document.querySelectorAll('[data-notification-id]').forEach(function(a){a.addEventListener('click',function(){if(a.dataset.notificationId)api('PATCH','/api/notifications/'+encodeURIComponent(a.dataset.notificationId)+'/read',{}).catch(function(){});});});
    function mark(){api('PATCH','/api/notifications/mark-all-read',{}).then(loadNotifications).catch(function(e){alert(e.message);});}
    var top=document.querySelector('#coachDeskTopbar [data-coach-route-action="secondary"]');if(top)top.onclick=function(e){e.preventDefault();mark();};
    var f=document.getElementById('fieldMarkAll');if(f)f.onclick=mark;
  }
  async function loadNotifications(){try{var r=await api('GET','/api/notifications?limit=80');state.notifications=list(r,['notifications','data']);state.unread=num(r.unreadCount||r.unread_count,state.notifications.filter(function(n){return !bool(value(n,['isRead','is_read']));}).length);renderNotifications();if(window.CoachV2)window.CoachV2.refreshBadges();}catch(e){desk.innerHTML=routeMessage(e.message,true);field.innerHTML=routeMessage(e.message,true);}}

  /* ================= REPORT A CONCERN ================= */
  function concernForm(id) {
    var email=value(state.concernProfile||{},['email','email_address','emailAddr'])||value(user(),['email','email_address','emailAddr'])||localStorage.getItem('sl_user_email')||'';
    return '<form id="' + id + '"><div class="fld"><label class="fl">Category · required</label><select class="inp" name="concernType" required><option value="">Select category</option><option>Inappropriate contact</option><option>Suspected misuse</option><option>Incorrect access</option><option>Safeguarding issue</option><option>Another platform-safety concern</option></select></div><div class="fld"><label class="fl">Who or what does this concern? · optional</label><input class="inp" name="personOrAccount"></div><div class="fld"><label class="fl">What happened · required</label><textarea class="inp ta" name="description" placeholder="Describe what you saw, when, and anyone involved." required></textarea></div><div class="fld"><label class="fl">Urgency</label><select class="inp" name="urgency"><option>Standard review</option><option>Urgent review</option></select></div><input type="hidden" name="contactEmail" value="' + esc(email) + '"><input type="hidden" name="contactName" value="' + esc(fullName()) + '"><div class="concern-msg"></div><button class="btn p" type="submit">Submit concern</button></form>';
  }
  function renderConcern() {
    setShellActions(null,null,null,null);
    desk.innerHTML='<div class="g" style="grid-template-columns:minmax(0,680px) 300px;align-items:start"><div class="card"><div class="card-h"><h3>Report a Concern</h3><span class="sp"></span><span class="tag r">Private</span></div><div class="card-b"><p class="mut" style="margin-top:0">Use this form for safeguarding, inappropriate contact, suspected misuse or incorrect access. Reports go to the Stratex trust team.</p>' + concernForm('concernForm') + '</div></div><div class="card"><div class="card-h"><h3>Before you submit</h3></div><div class="card-b"><div class="callout r"><b>Immediate risk</b><br>If a child is at immediate risk, contact emergency services first.</div><div class="help" style="margin-top:12px">Include dates, the relevant player or conversation, and enough context for the trust team to review the report.</div></div></div></div>';
    field.innerHTML=fieldHeader('Report a Concern','Reviewed by the Stratex trust team')+'<div class="pbody"><div class="callout r" style="margin-bottom:12px"><b>Immediate risk</b><br>If a child is at immediate risk, contact emergency services first.</div><div class="card"><div class="card-b">' + concernForm('fieldConcernForm') + '</div></div></div>';
    ['concernForm','fieldConcernForm'].forEach(function(id){var f=document.getElementById(id);if(f)f.onsubmit=submitConcern;});
  }
  function submitConcern(e){
    e.preventDefault();
    var form=e.currentTarget,fd=new FormData(form),body={sourcePage:'/coach/report-a-concern'};fd.forEach(function(v,k){body[k]=v;});
    var msg=form.querySelector('.concern-msg'),btn=form.querySelector('button[type="submit"]');
    if(!body.concernType||!String(body.description||'').trim()||!body.contactEmail){msg.innerHTML=routeMessage('Complete category and description. Your signed-in email is also required.',true);return;}
    btn.disabled=true;
    fetch((window.API||'')+'/api/trust/safeguarding-concerns',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json().then(function(d){if(!r.ok)throw new Error(d.error||'Could not submit concern');return d;});}).then(function(d){
      msg.innerHTML='<div class="callout"><b>Concern submitted.</b>' + ((d.concernId || d.submissionId)?'<br>Reference ' + esc(d.concernId || d.submissionId):'') + '</div>';
      form.reset(); if(window.CoachV2)window.CoachV2.showToast('Concern submitted.');
    }).catch(function(err){msg.innerHTML=routeMessage(err.message,true);}).finally(function(){btn.disabled=false;});
  }

  function initConcern() {
    api('GET','/api/coaches/profile').then(function (r) {
      state.concernProfile = r.coach || r.profile || r || {};
      renderConcern();
    }).catch(function () {
      state.concernProfile = {};
      renderConcern();
    });
  }

  /* ================= SETTINGS ================= */
  function settingRail() {
    var tabs=[['team','Team'],['coaches','Coaches & permissions'],['notifications','Notifications'],['privacy','Privacy & safeguarding'],['season','Season'],['account','Account'],['appearance','Appearance']];
    return '<aside class="rail" id="settingsRail"><div class="rail-h">Settings</div>' + tabs.map(function(t){return '<button class="row ' + (state.settingsPane===t[0]?'settings-on':'') + '" type="button" data-settings-pane="' + t[0] + '" style="width:100%;border:0;border-bottom:1px solid var(--line);text-align:left;background:' + (state.settingsPane===t[0]?'var(--blue-t)':'var(--paper)') + '"><span class="sp"><b class="rt">' + esc(t[1]) + '</b></span></button>';}).join('') + '</aside>';
  }
  function settingsPanel() {
    var p=state.settingsProfile||{},coaches=state.settingsCoaches||[];
    if(state.settingsPane==='coaches') return '<div class="card"><div class="card-h"><h3>Coaches & permissions</h3><span class="sp"></span>' + (p.is_super_user?'<button class="btn p sm" id="inviteCoach">Invite coach</button>':'') + '</div><div class="card-b" style="padding-top:3px;padding-bottom:3px">' + coaches.map(function(c){return '<div class="row">' + avatar(coachName(c)) + '<span class="sp"><b class="rt">' + esc(coachName(c)) + '</b><s class="rs">' + (c.is_super_user?'Owner / super user':'Coach') + (String(c.id)===String(p.id)?' · You':'') + '</s></span><span class="tag ' + (c.is_super_user?'b':'') + '">' + (c.is_super_user?'Super user':'Coach') + '</span></div>';}).join('') + (!p.is_super_user?'<div class="help">Only the team super user can invite or reassign coaches.</div>':'') + '</div></div>';
    if(state.settingsPane==='notifications') {
      var prefs=JSON.parse(localStorage.getItem('scoutlink.coach.notificationPrefs')||'{"scout":true,"match":true,"system":true}');
      return '<div class="card"><div class="card-h"><h3>Notifications</h3></div><div class="card-b">' + [['scout','Scout interest','Reviewed scout interest and messages'],['match','Match Facts reminders','Completed fixtures missing Match Facts'],['system','Account & system','Product and account notices']].map(function(x){return '<div class="row"><span class="sp"><b class="rt">' + x[1] + '</b><s class="rs">' + x[2] + '</s></span><button class="chip ' + (prefs[x[0]]?'on':'') + '" data-pref="' + x[0] + '">' + (prefs[x[0]]?'On':'Off') + '</button></div>';}).join('') + '<div class="help">These presentation preferences are saved on this device; the current API does not expose server-side notification preference persistence.</div></div></div>';
    }
    if(state.settingsPane==='privacy') return '<div class="card"><div class="card-h"><h3>Privacy & safeguarding</h3></div><div class="card-b"><div class="row">' + iconBox('✓','g') + '<span class="sp"><b class="rt">Scout conversations are reviewed-access only</b><s class="rs">Use Report a Concern for inappropriate contact or suspected misuse.</s></span><a class="btn dgr sm" href="/coach/report-a-concern">Report concern</a></div><div class="callout"><b>Player data stays attached to the team.</b><br>Do not use Coach settings to bypass safeguarding or data-retention controls.</div></div></div>';
    if(state.settingsPane==='season') return '<div class="card"><div class="card-h"><h3>Season</h3></div><div class="card-b"><div class="row">' + iconBox('FX','b') + '<span class="sp"><b class="rt">Fixtures and Match Facts</b><s class="rs">Manage the live season from Fixtures and Match Facts.</s></span><a class="btn q sm" href="/coach/fixtures">Open fixtures</a></div><div class="row">' + iconBox('MF','g') + '<span class="sp"><b class="rt">Season evidence</b><s class="rs">Recorded Match Facts form the current evidence trail.</s></span><a class="btn q sm" href="/coach/match-facts">Match Facts</a></div></div></div>';
    if(state.settingsPane==='account') return '<div class="card"><div class="card-h"><h3>Account</h3></div><div class="card-b"><div class="g" style="grid-template-columns:1fr 1fr"><div class="fld"><label class="fl">New password</label><input class="inp" id="newPassword" type="password" placeholder="Minimum 8 characters"></div><div class="fld"><label class="fl">Confirm password</label><input class="inp" id="confirmPassword" type="password"></div></div><button class="btn p" id="changePassword">Update password</button><hr class="sep"><button class="btn dgr" data-coach-signout>Sign out</button></div></div>';
    if(state.settingsPane==='appearance') return '<div class="card"><div class="card-h"><h3>Appearance</h3></div><div class="card-b"><div class="row"><span class="sp"><b class="rt">Theme</b><s class="rs">Choose the local interface preference.</s></span><div class="chips"><button class="chip on" data-theme="light">Light</button><button class="chip" data-theme="dark">Dark</button></div></div></div></div>';
    return '<div class="card"><div class="card-h"><h3>Team</h3></div><div class="card-b"><div class="g" style="grid-template-columns:1fr 1fr"><div class="fld"><label class="fl">Team name</label><div class="inp">' + esc(p.team_name||team()) + '</div></div><div class="fld"><label class="fl">Role</label><div class="inp">' + esc(p.role_at_club||'Coach') + '</div></div><div class="fld"><label class="fl">Signed in as</label><div class="inp">' + esc(coachName(p)||fullName()) + '</div></div><div class="fld"><label class="fl">Access level</label><div class="inp">' + (p.is_super_user?'Super user':'Coach') + '</div></div></div><div class="help">The current Coach API exposes these team fields read-only. Existing functional coach-invite and assignment controls remain under Coaches & permissions.</div></div></div>';
  }
  function renderSettings() {
    setShellActions(null,null,null,null);
    desk.innerHTML='<div style="display:flex;gap:14px;align-items:flex-start">' + settingRail() + '<div style="flex:1;min-width:0">' + settingsPanel() + '</div></div>';
    var p=state.settingsProfile||{},coaches=state.settingsCoaches||[];
    field.innerHTML=fieldHeader('More',teamLine()+' · '+fullName()) + '<div class="pbody"><div class="card"><a class="row" href="/coach/video-reels" style="text-decoration:none"><span class="sp"><b class="rt">Video Reels</b><s class="rs">Clips and player upload links</s></span><span>›</span></a><a class="row" href="/coach/fixtures" style="text-decoration:none"><span class="sp"><b class="rt">Fixtures</b><s class="rs">Schedule and Match Facts status</s></span><span>›</span></a><a class="row" href="/coach/add-player" style="text-decoration:none"><span class="sp"><b class="rt">Add Player</b><s class="rs">Four-stage player flow</s></span><span>›</span></a></div><div class="pcap">Settings</div><div class="card"><div class="row"><span class="sp"><b class="rt">Team & coaches</b><s class="rs">' + coaches.length + ' active coach' + (coaches.length===1?'':'es') + '</s></span><a class="btn q sm" href="/coach/settings">Open</a></div><div class="row"><span class="sp"><b class="rt">Notifications</b><s class="rs">Scout, Match Facts and system</s></span><a class="btn q sm" href="/coach/settings">Open</a></div><div class="row"><span class="sp"><b class="rt">Account</b><s class="rs">' + esc(p.email||'Signed-in account') + '</s></span><a class="btn q sm" href="/coach/settings">Open</a></div></div><div class="pcap">Trust & safety</div><a class="card" href="/coach/report-a-concern" style="display:block;text-decoration:none"><div class="row"><span class="sp"><b class="rt" style="color:var(--red)">Report a Concern</b><s class="rs">Reviewed by the Stratex trust team</s></span><span>›</span></div></a><button class="btn" style="width:100%;margin-top:14px" data-coach-signout>Sign out</button></div>';
    bindSettings();
  }
  function bindSettings() {
    document.querySelectorAll('[data-settings-pane]').forEach(function(b){b.onclick=function(){state.settingsPane=b.dataset.settingsPane;renderSettings();};});
    var invite=document.getElementById('inviteCoach');if(invite&&window.CoachV2)invite.onclick=function(){
      window.CoachV2.openDrawer({title:'Invite coach',html:'<form id="inviteCoachForm"><div class="g" style="grid-template-columns:1fr 1fr"><div class="fld"><label class="fl">First name</label><input class="inp" name="firstName" required></div><div class="fld"><label class="fl">Last name</label><input class="inp" name="lastName" required></div></div><div class="fld"><label class="fl">Email</label><input class="inp" name="emailAddr" type="email" required></div><div class="fld"><label class="fl">Phone</label><input class="inp" name="phone"></div><label class="chip"><input name="isSuperUser" type="checkbox"> Super user</label><div id="inviteMsg"></div><button class="btn p" type="submit" style="margin-top:10px">Invite coach</button></form>'});
      setTimeout(function(){var f=document.getElementById('inviteCoachForm');if(f)f.onsubmit=function(e){e.preventDefault();var fd=new FormData(f),body={firstName:fd.get('firstName'),lastName:fd.get('lastName'),emailAddr:fd.get('emailAddr'),phone:fd.get('phone')||null,isSuperUser:fd.get('isSuperUser')==='on'};api('POST','/api/coaches/add-coach',body).then(function(){window.CoachV2.closeAll();window.CoachV2.showToast('Coach invited.');loadSettings();}).catch(function(err){document.getElementById('inviteMsg').innerHTML=routeMessage(err.message,true);});};},0);
    };
    document.querySelectorAll('[data-pref]').forEach(function(b){b.onclick=function(){var prefs=JSON.parse(localStorage.getItem('scoutlink.coach.notificationPrefs')||'{"scout":true,"match":true,"system":true}');prefs[b.dataset.pref]=!prefs[b.dataset.pref];localStorage.setItem('scoutlink.coach.notificationPrefs',JSON.stringify(prefs));renderSettings();};});
    document.querySelectorAll('[data-theme]').forEach(function(b){b.onclick=function(){if(typeof window.applyTheme==='function')window.applyTheme(b.dataset.theme);try{localStorage.setItem('sl_theme',b.dataset.theme);}catch(_){};document.querySelectorAll('[data-theme]').forEach(function(x){x.classList.toggle('on',x===b);});};});
    var cp=document.getElementById('changePassword');if(cp)cp.onclick=function(){var np=document.getElementById('newPassword').value,cf=document.getElementById('confirmPassword').value;if(np.length<8)return alert('Password must be at least 8 characters.');if(np!==cf)return alert('Passwords do not match.');api('POST','/api/auth/change-password',{password:np}).then(function(){if(window.CoachV2)window.CoachV2.showToast('Password updated.');document.getElementById('newPassword').value='';document.getElementById('confirmPassword').value='';}).catch(function(e){alert(e.message);});};
  }
  async function loadSettings(){try{var pr=await api('GET','/api/coaches/profile');state.settingsProfile=pr.coach||pr.profile||pr;var cr=await api('GET','/api/coaches/team-coaches').catch(function(){return{data:[]};});state.settingsCoaches=[state.settingsProfile].concat(list(cr,['coaches','data'])).filter(function(c,i,a){return c&&c.id&&a.findIndex(function(x){return x&&String(x.id)===String(c.id);})===i;});renderSettings();}catch(e){desk.innerHTML=routeMessage(e.message,true);field.innerHTML=routeMessage(e.message,true);}}

  function boot() {
    if (window.CoachV2 && !window.CoachV2.allowedCoach() && page !== 'report-a-concern') { location.href='/login'; return; }
    if (page==='dashboard') initDashboard();
    else if (page==='my-players') initPlayers();
    else if (page==='fixtures') loadFixtures();
    else if (page==='video-reels') loadVideos();
    else if (page==='chat') initChat();
    else if (page==='notifications') loadNotifications();
    else if (page==='report-a-concern') initConcern();
    else if (page==='settings') loadSettings();
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
}());
