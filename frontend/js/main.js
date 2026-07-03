'use strict';
// ScoutLink Frontend v2.2 - All experiences complete
const API = localStorage.getItem('sl_api_url') || 'https://scoutlink-api.vercel.app';

const CLEAN_ROUTES = {
  'index.html':'/',
  'login.html':'/login',
  'forgot-password.html':'/forgot-password',
  'experience-select.html':'/experience-select',
  'demo.html':'/demo',
  'register.html':'/register',
  'register-scout.html':'/register/scout',
  'register-coach.html':'/register/coach',
  'data-policy.html':'/data-policy',
  'privacy-policy.html':'/privacy-policy',
  'terms.html':'/terms',
  'cookie-policy.html':'/cookie-policy',
  'safeguarding.html':'/safeguarding',
  'report-concern.html':'/report-a-concern',
  'parent-guardian-notice.html':'/parent-guardian-notice',
  'applicant-privacy-notice.html':'/applicant-privacy-notice',
  'privacy-request.html':'/privacy-request',
  'contact.html':'/contact',
  'complete-registration.html':'/complete-registration',
  'stratex-dashboard.html':'/stratex/dashboard',
  'stratex-registrations.html':'/stratex/registrations',
  'stratex-users.html':'/stratex/users',
  'stratex-org.html':'/stratex/org',
  'stratex-hiring.html':'/stratex/hiring',
  'stratex-leave.html':'/stratex/leave',
  'stratex-meetings.html':'/stratex/meetings',
  'stratex-contracts-pay.html':'/stratex/contracts-pay',
  'stratex-players.html':'/stratex/players',
  'stratex-scouts.html':'/stratex/scouts',
  'stratex-coaches.html':'/stratex/coaches',
  'stratex-scout-teams.html':'/stratex/scout-teams',
  'stratex-school-teams.html':'/stratex/non-pro-academies',
  'stratex-award-nominations.html':'/stratex/award-nominations',
  'stratex-showcase-events.html':'/stratex/showcase-events',
  'stratex-notifications.html':'/stratex/notifications',
  'stratex-settings.html':'/stratex/settings',
  'coach-dashboard.html':'/coach/dashboard',
  'coach-onboarding.html':'/coach/onboarding',
  'coach-my-players.html':'/coach/my-players',
  'add-player.html':'/coach/add-player',
  'bulk-add-players.html':'/coach/bulk-add-players',
  'match-facts.html':'/coach/match-facts',
  'coach-fixtures.html':'/coach/fixtures',
  'coach-video-reels.html':'/coach/video-reels',
  'coach-chat.html':'/coach/chat',
  'coach-notifications.html':'/coach/notifications',
  'coach-settings.html':'/coach/settings',
  'scout-dashboard.html':'/scout/dashboard',
  'scout-onboarding.html':'/scout/onboarding',
  'player-search.html':'/scout/player-search',
  'scout-pipeline.html':'/scout/pipeline',
  'scout-rankings.html':'/scout/rankings',
  'scout-fixtures.html':'/scout/fixtures',
  'scout-predictions.html':'/scout/predictions',
  'scout-exports.html':'/scout/exports',
  'compare-players.html':'/scout/compare-players',
  'scout-setup.html':'/scout/setup',
  'scout-events.html':'/scout/events',
  'scout-chat.html':'/scout/chat',
  'scout-notifications.html':'/scout/notifications',
  'scout-settings.html':'/scout/settings',
  'scout-preferences.html':'/scout/preferences',
  'player-dashboard.html':'/player/dashboard',
  'player-profile.html':'/player/profile',
  'player-profile-edit.html':'/player/edit-profile',
  'player-video-reels.html':'/player/video-reels',
  'player-notifications.html':'/player/notifications',
  'player-settings.html':'/player/settings',
  'careers.html':'/careers',
  'career-detail.html':'/careers'
};

function cleanRouteFor(href) {
  if (!href || href.indexOf('#') === 0) return href;
  const url = new URL(href, window.location.href);
  const page = url.pathname.split('/').pop();
  const route = CLEAN_ROUTES[page];
  if (!route) return href;
  return route + url.search + url.hash;
}

function applyCleanUrl() {
  const page = window.location.pathname.split('/').pop();
  const route = CLEAN_ROUTES[page];
  if (route && window.history && window.location.protocol.indexOf('http') === 0) {
    window.history.replaceState(null, '', route + window.location.search + window.location.hash);
  }
}

function applyTheme(theme) {
  const next = theme === 'dark' ? 'dark' : 'light';
  document.body.classList.toggle('theme-light', next === 'light');
  document.body.classList.toggle('theme-dark', next === 'dark');
  localStorage.setItem('sl_theme', next);
}

function navigateClean(href) {
  window.location.href = cleanRouteFor(href);
}

function logoutToLogin() {
  Auth.clear();
  navigateClean('login.html?logout=1');
}

applyCleanUrl();
document.addEventListener('DOMContentLoaded', function(){ applyTheme(localStorage.getItem('sl_theme') || 'light'); });

function clearProductTourState() {
  try {
    Object.keys(sessionStorage).forEach(function(k) {
      if (/^sl_tour_|^sl_force_tour_|^sl_product_tour|product_tour/i.test(k) || k === 'sl_demo_tour') sessionStorage.removeItem(k);
    });
    Object.keys(localStorage).forEach(function(k) {
      if (/^sl_tour_|^sl_force_tour_|^sl_product_tour|product_tour/i.test(k) || k === 'sl_demo_tour' || k === 'sl_force_tour') localStorage.removeItem(k);
    });
  } catch (_) {}
}

clearProductTourState();

// Auth
const Auth = {
  get token() { return localStorage.getItem('sl_token'); },
  get user() { try { return JSON.parse(localStorage.getItem('sl_user')); } catch { return null; } },
  get type() { return localStorage.getItem('sl_type'); },
  set(token, user, type) {
    localStorage.setItem('sl_token', token);
    localStorage.setItem('sl_user', JSON.stringify(user));
    localStorage.setItem('sl_type', type);
    clearProductTourState();
  },
  clear() {
    ['sl_token','sl_user','sl_type','sl_session','sl_user_id','sl_user_email','sl_user_role','sl_user_data','sl_demo_mode','sl_admin_token','sl_admin_user','sl_admin_type','sl_experience_switcher'].forEach(k => localStorage.removeItem(k));
    ['sl_public_demo','sl_public_demo_role','sl_public_demo_state','sl_public_demo_started_at','sl_heap_demo_sid'].forEach(k => sessionStorage.removeItem(k));
    clearProductTourState();
  },
  isLoggedIn() { return !!this.token && !!this.user; },
  redirectToDashboard() {
    const map = { Player:'player-dashboard.html', Coach:'coach-dashboard.html',
      Scout:'scout-dashboard.html', Stratex:'experience-select.html' };
    const dest = map[this.type] || 'login.html';
    window.location.href = cleanRouteFor(dest);
  }
};

function isDemoMode() {
  return localStorage.getItem('sl_demo_mode') === '1' || sessionStorage.getItem('sl_public_demo') === '1';
}

function isPublicDemoMode() {
  return sessionStorage.getItem('sl_public_demo') === '1';
}

function demoBannerText() {
  return 'This is a demo experience using fake coach, scout and player data. These are not real records.';
}

function restoreAdminSessionForSelector() {
  var token = localStorage.getItem('sl_admin_token');
  var rawUser = localStorage.getItem('sl_admin_user');
  if (!token || !rawUser) return false;
  try {
    var user = JSON.parse(rawUser);
    Auth.set(token, user, localStorage.getItem('sl_admin_type') || 'Stratex');
    localStorage.removeItem('sl_demo_mode');
    clearProductTourState();
    return true;
  } catch(e) {
    return false;
  }
}

function openExperienceSelector() {
  if (isPublicDemoMode()) {
    exitPublicDemo();
    return;
  }
  if (isDemoMode()) restoreAdminSessionForSelector();
  navigateClean('experience-select.html');
}

function demoPlayer(seed) {
  const positions = [
    ['Forward','ST','London'], ['Forward','RW','Manchester'], ['Midfielder','CAM','Birmingham'], ['Defender','CB','Liverpool'],
    ['Midfielder','CM','Bristol'], ['Defender','RB','London'], ['Forward','LW','Leeds'], ['Defender','LB','Manchester']
  ];
  const names = [
    ['Ethan','Cole'], ['Carter','Hill'], ['Micah','Powell'], ['Logan','Ali'],
    ['Jordan','Blake'], ['Alfie','Carter'], ['Noah','Reed'], ['Theo','Brooks']
  ];
  const p = positions[seed % positions.length];
  const n = names[seed % names.length];
  const rating = 70 + (seed * 3 % 15);
  const isEastbrook = seed % 2 === 1;
  const team = {
    id: isEastbrook ? 'demo-team-eastbrook' : 'demo-team-northgate',
    team_name: isEastbrook ? 'Eastbrook Athletic (Demo)' : 'Northgate United (Demo)',
    league_name: isEastbrook ? 'Camden Youth League' : 'Camden & Islington Youth Football League',
    league_fulltime_url: isEastbrook ? 'https://fulltime.thefa.com/index.html?league=163194129' : 'https://fulltime.thefa.com/index.html?league=331847893',
    team_website_url: isEastbrook ? 'https://example.com/eastbrook-demo' : 'https://example.com/northgate-demo',
    city: p[2],
    country: 'England'
  };
  return {
    id: 'demo-player-' + (seed + 1),
    first_name: n[0],
    last_name: n[1],
    team_id: team.id,
    team_name: team.team_name,
    team: team,
    team_city: p[2],
    position_group: p[0],
    specific_position: p[1],
    primary_position: p[1],
    age: 15 + (seed % 3),
    age_group: ['U15','U16','U17'][seed % 3],
    foot: seed % 2 ? 'Left' : 'Right',
    nationality: 'England',
    height_category: seed % 2 ? 'average' : 'tall',
    height_range_cm: seed % 2 ? '172-184' : '185-194',
    build_category: seed % 3 ? 'athletic' : 'lean',
    weight_range_kg: seed % 2 ? '64-76' : '70-82',
    overall_rating: rating,
    compatibilityScore: 88 - (seed * 4 % 18),
    transfer_value: 90000 + seed * 52000,
    appearances: 4 + (seed % 5),
    goals: p[0] === 'Forward' ? 3 + seed % 4 : seed % 2,
    assists: p[0] === 'Midfielder' ? 4 + seed % 3 : seed % 4,
    clean_sheets: p[0] === 'Defender' ? 2 + seed % 2 : 0,
    yellow_cards: seed % 3,
    red_cards: seed === 4 ? 1 : 0,
    pace: 7.4 + (seed % 3) * .6,
    agility: 7.1 + (seed % 4) * .5,
    strength: 7.0 + (seed % 5) * .4,
    stamina: 7.3 + (seed % 4) * .4,
    shooting: 6.8 + (seed % 5) * .5,
    passing: 7.2 + (seed % 5) * .4,
    dribbling: 7.0 + (seed % 4) * .5,
    defending: 6.9 + (seed % 4) * .5,
    composure: 7.4 + (seed % 4) * .4,
    crossing: 7.0 + (seed % 5) * .4,
    vision: 7.1 + (seed % 5) * .4,
    positioning: 7.3 + (seed % 4) * .4,
    heading: 6.9 + (seed % 4) * .4,
    tackling: 7.0 + (seed % 5) * .4,
    jumping: 7.2 + (seed % 4) * .4,
    created_at: new Date(Date.now() - seed * 86400000).toISOString(),
    updated_at: new Date(Date.now() - seed * 3600000).toISOString()
  };
}

function demoInitialState() {
  const players = Array.from({ length: 8 }, (_, i) => demoPlayer(i));
  return {
    players,
    fixtures: [
      { id:'demo-fixture-1', opponent:'Riverside Rangers U18', opponent_name:'Riverside Rangers U18', fixture_date:'2026-07-04T10:30:00Z', home_or_away:'Home', format:'11-a-side', venue:'Northgate United (Demo) Training Ground', venue_name:'Northgate United (Demo) Training Ground', city:'London', notes:'Demo fixture with scout-visible venue data.' },
      { id:'demo-fixture-2', opponent:'Brookfield Athletic', opponent_name:'Brookfield Athletic', fixture_date:'2026-07-11T10:30:00Z', home_or_away:'Away', format:'11-a-side', venue:'Brookfield Sports Park', venue_name:'Brookfield Sports Park', city:'London', notes:'Demo fixture with scout-visible venue data.' }
    ],
    pipeline: players.slice(0, 5).map((p, idx) => ({
      id:'demo-pipeline-' + (idx + 1),
      player_id:p.id,
      stage: idx ? 'shortlisted' : 'interested',
      interest_level: 7 + (idx % 3),
      notes: 'Watching for fit against ScoutLink Demo FC needs.',
      created_at: new Date(Date.now() - idx * 86400000).toISOString(),
      player:p,
      coach:{ first_name:'Marcus', last_name:'Reed', email:'marcus.reed@example.test' }
    })),
    setup: {
      teamName:'ScoutLink Demo FC',
      clubName:'ScoutLink Demo FC',
      country:'England',
      scoutRegion:'London',
      formation:'4-3-3',
      playingStyle:'High Press',
      teamWeaknesses:['Tactical Awareness Gaps','Low Team Chemistry and Leadership','Insufficient Game Pace and Speed'],
      roleExpectations:['Speed and Agility','Tactical Intelligence','Offensive Impact'],
      longTermGoals:['Financial Viability','Goal Contribution Potential','Leadership and Coachability'],
      ageGroups:['U15','U16','U17'],
      preferredPositions:['ST','RW','CAM'],
      salaryCap:500,
      minAppearances:3
    },
    chats: [
      { id:'demo-thread-1', name:'Marcus Reed', title:'Marcus Reed', last_message:'Happy to share match context on Ethan.', updated_at:new Date().toISOString(), unread_count:1, player_id:'demo-player-1' }
    ],
    messages: {
      'demo-thread-1': [
        { id:'m1', sender_role:'Scout', body:'Hi Marcus, I have added Ethan to my demo pipeline.', created_at:new Date(Date.now()-7200000).toISOString() },
        { id:'m2', sender_role:'Coach', body:'Great. His latest match facts and fixtures are ready to review.', created_at:new Date(Date.now()-3600000).toISOString() }
      ]
    },
    predictions: [],
    videos: [
      { id:'demo-video-1', player_id:'demo-player-1', title:'Ethan Cole finishing reel', category:'Highlights', description:'Demo evidence clip showing finishing and movement.', video_url:'' }
    ]
  };
}

function getDemoState() {
  try {
    const raw = sessionStorage.getItem('sl_public_demo_state');
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  const state = demoInitialState();
  setDemoState(state);
  return state;
}

function setDemoState(state) {
  sessionStorage.setItem('sl_public_demo_state', JSON.stringify(state));
}

function demoRoleUser(role) {
  if (role === 'Scout') return { id:'demo-scout-noah', firstName:'Noah', lastName:'Patel', email:'noah.patel@example.test', teamName:'ScoutLink Demo FC' };
  return { id:'demo-coach-marcus', firstName:'Marcus', lastName:'Reed', email:'marcus.reed@example.test', teamName:'Northgate United (Demo)' };
}

function startPublicDemo(role) {
  const nextRole = role === 'Scout' ? 'Scout' : 'Coach';
  const user = demoRoleUser(nextRole);
  sessionStorage.setItem('sl_public_demo', '1');
  sessionStorage.setItem('sl_public_demo_role', nextRole);
  sessionStorage.setItem('sl_public_demo_started_at', new Date().toISOString());
  if (!sessionStorage.getItem('sl_public_demo_state')) setDemoState(demoInitialState());
  localStorage.setItem('sl_demo_mode', '1');
  Auth.set('public-demo-session', user, nextRole);
  clearProductTourState();
  navigateClean(nextRole === 'Scout' ? 'scout-dashboard.html' : 'coach-dashboard.html');
}

function exitPublicDemo() {
  ['sl_public_demo','sl_public_demo_role','sl_public_demo_state','sl_public_demo_started_at','sl_heap_demo_sid'].forEach(k => sessionStorage.removeItem(k));
  ['sl_token','sl_user','sl_type','sl_demo_mode'].forEach(k => localStorage.removeItem(k));
  clearProductTourState();
  navigateClean('demo.html');
}

function demoValue(v) { return Number(v) || 0; }
function demoOverall(p) { return Math.round(demoValue(p.overall_rating)); }
function demoCompatibility(p) { return Math.round(demoValue(p.compatibilityScore)); }
function demoMatchesFor(playerId, state) {
  const player = (state.players || []).find(p => p.id === playerId);
  if (!player) return [];
  return [
    { id:'demo-match-1-' + playerId, player_id:playerId, opponent_name:'Riverside Juniors', competition:'11v11', match_date:'2026-06-25', home_score:3, away_score:1, result:'win', position_played:player.specific_position, performance_score:demoOverall(player), goals:player.goals ? 1 : 0, assists:player.assists ? 1 : 0, yellow_cards:player.yellow_cards ? 1 : 0, red_cards:0 },
    { id:'demo-match-2-' + playerId, player_id:playerId, opponent_name:'Southbank Athletic', competition:'11v11', match_date:'2026-06-18', home_score:2, away_score:2, result:'draw', position_played:player.specific_position, performance_score:Math.max(60, demoOverall(player) - 4), goals:0, assists:1, yellow_cards:0, red_cards:0 }
  ];
}
function demoAnalysis(player, state) {
  const comp = demoCompatibility(player);
  const overall = demoOverall(player);
  const value = demoValue(player.transfer_value);
  return {
    compatibilityScore: comp,
    matchPerformanceRating: overall,
    dataConfidence: { label: player.appearances >= 5 ? 'High confidence' : 'Medium confidence', note: 'Demo evidence blends match facts and coach ratings.' },
    compatibilityBreakdown: { technical: overall, tacticalFit: comp - 3, physicalProfile: overall + 2, matchImpact: overall - 2, dataConfidence: player.appearances >= 5 ? 'High confidence' : 'Medium confidence' },
    overallBreakdown: {
      finalScore: overall,
      currentReadiness: overall + 1,
      potentialRating: Math.min(99, overall + 7),
      dataConfidenceLabel: player.appearances >= 5 ? 'High' : 'Medium',
      dataConfidenceNote: 'Demo match facts are available for this player.',
      technicalScore: overall + 3,
      tacticalIQScore: comp - 4,
      physicalProfileScore: overall + 2,
      mentalCoachabilityScore: 82,
      matchOutputScore: overall - 3,
      disciplineScore: player.red_cards ? 68 : 88,
      availabilityScore: 86,
      dataConfidenceScore: 78,
      explanation: 'ScoutLink blends coach ratings, match output, physical profile and evidence confidence into a position-aware score.',
      ageBandLabel: player.age_group,
      positionGroup: player.position_group,
      warnings: []
    },
    positionRatings: {
      bestCurrentPosition: player.specific_position,
      bestCurrentScore: overall,
      bestFuturePosition: player.position_group === 'Forward' ? 'LW' : player.specific_position,
      bestFutureScore: Math.min(99, overall + 5),
      sorted: [
        { role: player.specific_position, score: overall, group: player.position_group },
        { role: player.position_group === 'Forward' ? 'LW' : 'CM', score: Math.max(60, overall - 2), group: player.position_group },
        { role: player.position_group === 'Defender' ? 'RB' : 'CAM', score: Math.max(60, overall - 5), group: player.position_group },
        { role: player.position_group === 'Forward' ? 'SS' : 'CDM', score: Math.max(60, overall - 7), group: player.position_group }
      ]
    },
    valueAnalysis: {
      valueFormatted: 'GBP ' + value.toLocaleString('en-GB'),
      label: 'Demo transfer value estimate',
      ageBandLabel: player.age_group,
      primaryPosition: player.specific_position,
      affordabilityFlag: 'Accessible youth case',
      riskLabel: 'Balanced risk',
      positionGroup: player.position_group,
      explanation: 'This demo valuation is deterministic and uses position, age band, current rating, potential and match output.',
      multipliers: { base: 85000, groupPremium: 1.08, rolePremium: 1.1, ratingMultiplier: 1.2, potentialMultiplier: 1.16, confidenceMultiplier: 1.04, disciplineMultiplier: .98, matchOutputMultiplier: 1.06 }
    },
    compatibility: {
      finalScore: comp,
      label: comp >= 80 ? 'Strong fit' : 'Promising fit',
      explanation: 'Compatibility is prioritised against Noah Patel’s demo scout setup.',
      needFit: comp,
      roleFit: comp - 6,
      tacticalStyleFit: comp - 3,
      formationPositionFit: comp - 2,
      developmentPathwayFit: comp - 4,
      matchEvidenceFit: Math.min(95, comp + 2),
      financialFit: comp - 5,
      confidenceFit: player.appearances >= 5 ? 82 : 70,
      recommendedUse: 'Use this as a shortlist signal, then validate live match behaviour and coach context.',
      risks: []
    }
  };
}
function publicDemoApi(method, path, body) {
  const state = getDemoState();
  const role = sessionStorage.getItem('sl_public_demo_role') || Auth.type || 'Coach';
  const url = new URL(path, 'https://scoutlink.local');
  const pathname = url.pathname;
  const players = state.players || [];
  function ok(data) { return Promise.resolve(data); }
  if (method === 'GET' && pathname === '/api/coaches/profile') return ok({ coach:{ id:'demo-coach-marcus', first_name:'Marcus', last_name:'Reed', is_super_user:true, team_id:'demo-team-northgate', team_name:'Northgate United (Demo)' } });
  if (method === 'GET' && pathname === '/api/coaches/dashboard') return ok({ playerCount:players.length, scoutsInterested:state.pipeline.length, totalSquadValue:players.reduce((s,p)=>s+demoValue(p.transfer_value),0), recentActivity:[] });
  if (method === 'GET' && pathname === '/api/coaches/my-players') return ok({ players:players, data:players });
  if (method === 'GET' && pathname === '/api/coaches/team-coaches') return ok({ data:[{ id:'demo-coach-marcus', first_name:'Marcus', last_name:'Reed', is_super_user:true }] });
  if (method === 'POST' && pathname === '/api/players') {
    const p = Object.assign(demoPlayer(players.length + 1), {
      id:'demo-player-' + Date.now(),
      first_name:body.firstName || body.first_name || 'Demo',
      last_name:body.lastName || body.last_name || 'Player',
      email:body.email || '',
      specific_position:body.specificPosition || body.specific_position || body.position || 'ST',
      position_group:body.positionGroup || body.position_group || 'Forward',
      age_group:body.ageGroup || body.age_group || 'U16'
    });
    state.players.unshift(p); setDemoState(state); return ok({ success:true, player:p, message:'Demo player added for this session.' });
  }
  if (method === 'POST' && pathname.startsWith('/api/coaches/assign-player/')) return ok({ success:true, message:'Demo assignment updated.' });
  if (method === 'GET' && pathname === '/api/fixtures') {
    const past = url.searchParams.get('past') === 'true';
    return ok({ data: past ? [] : state.fixtures });
  }
  if (method === 'POST' && pathname === '/api/fixtures') {
    const fx = Object.assign({ id:'demo-fixture-' + Date.now(), fixture_date:body.fixtureDate || body.fixture_date || body.date, opponent:body.opponent, opponent_name:body.opponent, home_or_away:body.homeOrAway || body.home_or_away || 'Home' }, body);
    state.fixtures.unshift(fx); setDemoState(state); return ok({ success:true, data:fx, message:'Demo fixture saved for this session.' });
  }
  if (method === 'DELETE' && pathname.startsWith('/api/fixtures/')) {
    state.fixtures = state.fixtures.filter(f => f.id !== pathname.split('/').pop()); setDemoState(state); return ok({ success:true });
  }
  if (method === 'POST' && pathname === '/api/match-facts') return ok({ success:true, message:'Demo match facts saved for this session.' });
  if (method === 'GET' && pathname === '/api/season/current') return ok({ currentSeason:'2025/26', nextSeason:'2026/27' });
  if (method === 'GET' && pathname === '/api/season/archives') return ok({ data:[] });
  if (method === 'GET' && pathname === '/api/scouts/profile') return ok({ scout:{ id:'demo-scout-noah', first_name:'Noah', last_name:'Patel', scout_team_id:'demo-scout-team', team_name:'ScoutLink Demo FC', subscription_plan:'Elite', interests_remaining:999, exports_remaining:999, predictions_remaining:999 } });
  if (method === 'GET' && pathname === '/api/scouts/players-count') return ok({ total:players.length });
  if (method === 'GET' && pathname === '/api/scouts/setup') return ok({ preferences:state.setup, scoutTeam:{ team_name:state.setup.teamName, club_name:state.setup.clubName, team_weaknesses:state.setup.teamWeaknesses, role_expectations:state.setup.roleExpectations, long_term_goals:state.setup.longTermGoals, formation:state.setup.formation, playing_style:state.setup.playingStyle } });
  if (method === 'POST' && pathname === '/api/scouts/setup') { state.setup = Object.assign({}, state.setup, body || {}); setDemoState(state); return ok({ success:true, message:'Demo scout setup saved for this session.' }); }
  if (method === 'GET' && pathname === '/api/scouts/recommended-players') {
    const limit = Number(url.searchParams.get('limit') || 5);
    return ok({ data:players.slice().sort((a,b)=>demoCompatibility(b)-demoCompatibility(a)).slice(0,limit).map(p=>Object.assign({}, p, { analysis: demoAnalysis(p,state) })) });
  }
  if (method === 'GET' && pathname === '/api/scouts/pipeline') return ok({ data:state.pipeline, total:state.pipeline.length, planLimit:1200, interestsRemaining:1193, planName:'ELITE' });
  if (method === 'PATCH' && pathname.startsWith('/api/scouts/pipeline/')) {
    const id = pathname.split('/').pop();
    const item = state.pipeline.find(x => x.id === id);
    if (item) item.stage = body.stage || item.stage;
    setDemoState(state); return ok({ success:true, data:item });
  }
  if (method === 'GET' && pathname === '/api/players/locations') return ok({ data:Array.from(new Set(players.map(p=>p.team_city).filter(Boolean))).sort() });
  if (method === 'GET' && pathname === '/api/players') {
    let list = players.slice();
    const search = (url.searchParams.get('search') || '').toLowerCase();
    const posGroup = url.searchParams.get('posGroup');
    const city = url.searchParams.get('city');
    const sort = url.searchParams.get('sort') || 'compatibility';
    if (search) list = list.filter(p => (p.first_name + ' ' + p.last_name).toLowerCase().includes(search));
    if (posGroup) list = list.filter(p => p.position_group === posGroup);
    if (city) list = list.filter(p => p.team_city === city);
    list.sort((a,b) => {
      const map = { compatibility:'compatibilityScore', overall:'overall_rating', goals:'goals', assists:'assists', appearances:'appearances', clean_sheets:'clean_sheets', value:'transfer_value' };
      const key = map[sort] || 'compatibilityScore';
      return demoValue(b[key]) - demoValue(a[key]);
    });
    return ok({ data:list, total:list.length, page:Number(url.searchParams.get('page')||1), limit:Number(url.searchParams.get('limit')||18) });
  }
  const playerMatch = pathname.match(/^\/api\/players\/([^/]+)$/);
  if (method === 'GET' && playerMatch) {
    const player = players.find(p => p.id === playerMatch[1]) || players[0];
    return ok({ player, team:player.team||null, matchFacts:demoMatchesFor(player.id,state), matches:demoMatchesFor(player.id,state), recentMatches:demoMatchesFor(player.id,state), fixtures:state.fixtures, upcomingFixtures:state.fixtures, videos:(state.videos||[]).filter(v => v.player_id === player.id), analysis:demoAnalysis(player,state) });
  }
  const analyseMatch = pathname.match(/^\/api\/players\/([^/]+)\/analyse$/);
  if (method === 'POST' && analyseMatch) {
    const player = players.find(p => p.id === analyseMatch[1]) || players[0];
    return ok(demoAnalysis(player,state));
  }
  const interestMatch = pathname.match(/^\/api\/players\/([^/]+)\/scout-interest$/);
  if (method === 'POST' && interestMatch) {
    const player = players.find(p => p.id === interestMatch[1]);
    if (player && !state.pipeline.some(x => x.player_id === player.id)) state.pipeline.unshift({ id:'demo-pipeline-' + Date.now(), player_id:player.id, player, stage:'interested', interest_level:body.interestLevel || 7, created_at:new Date().toISOString() });
    setDemoState(state); return ok({ success:true, interestsRemaining:999, message:'Added to your demo pipeline.' });
  }
  if (method === 'GET' && pathname === '/api/predictions') return ok({ data:state.predictions, planLimit:1200, remaining:1192, currentPlan:'ELITE' });
  if (method === 'POST' && pathname === '/api/predictions/run') {
    const player = players.find(p => p.id === body.playerId) || players[0];
    const type = body.predictionType || 'position_fit';
    const result = {
      type: type === 'roi_analysis' ? 'ROI Analysis' : type === 'match_scenario' ? 'Match Scenario Prediction' : type === 'attribute_development' ? 'Attribute Development' : 'Position Fit Projection',
      summary: 'Demo prediction for ' + player.first_name + ' ' + player.last_name + ' based on compatibility, match facts and coach ratings.',
      paragraphs: ['This demo prediction uses the same visible product flow but stores no real platform data. It shows how ScoutLink turns player evidence into a scouting decision.'],
      bestCurrentPosition: player.specific_position,
      bestCurrentScore: demoOverall(player),
      bestFuturePosition: player.position_group === 'Forward' ? 'Left Winger' : player.specific_position,
      bestFutureScore: Math.min(99, demoOverall(player) + 5),
      targetScore: demoOverall(player),
      targetVerdict: 'Strong demo fit',
      targetGapVsBest: 0,
      topRoles: demoAnalysis(player,state).positionRatings.sorted,
      disclaimer: 'Demo prediction only. No Supabase writes were made.'
    };
    const log = { id:'demo-prediction-' + Date.now(), player_id:player.id, player, prediction_type:result.type, result, created_at:new Date().toISOString() };
    state.predictions.unshift(log); setDemoState(state);
    return ok({ result, logId:log.id, creditsRemaining:1192 });
  }
  if (method === 'POST' && pathname === '/api/exports/player') {
    const player = players.find(p => p.id === body.playerId) || players[0];
    const text = 'ScoutLink demo export\n\n' + player.first_name + ' ' + player.last_name + '\nCompatibility: ' + demoCompatibility(player) + '%\nOverall: ' + demoOverall(player) + '/100\nNo real export record was written.';
    return ok({ filename:(player.first_name+'-'+player.last_name+'-demo-profile.txt').toLowerCase(), mime:'text/plain', contentBase64:btoa(unescape(encodeURIComponent(text))), exportsRemaining:999, planLimit:999 });
  }
  if (method === 'GET' && pathname === '/api/chat/threads') return ok({ data:state.chats });
  const threadMessages = pathname.match(/^\/api\/chat\/threads\/([^/]+)\/messages$/);
  if (method === 'GET' && threadMessages) return ok({ data:state.messages[threadMessages[1]] || [] });
  if (method === 'POST' && threadMessages) {
    const list = state.messages[threadMessages[1]] || [];
    list.push({ id:'demo-msg-' + Date.now(), sender_role:role, body:body.body || '', created_at:new Date().toISOString() });
    state.messages[threadMessages[1]] = list; setDemoState(state); return ok({ success:true });
  }
  if (method === 'POST' && pathname === '/api/chat/threads') return ok({ success:true, thread:state.chats[0] });
  if (method === 'POST' && pathname.includes('/share')) return ok({ success:true });
  if (method === 'GET' && pathname === '/api/notifications') return ok({ data:[], unreadCount:0 });
  if (method === 'GET') return ok({ data:[], total:0 });
  return ok({ success:true, message:'Demo change saved for this session.' });
}

function insertPublicDemoBanner() {
  if (!isPublicDemoMode()) return;
  if (document.getElementById('publicDemoBanner')) return;
  const host = document.querySelector('.dashboard-main') || document.querySelector('.page-content') || document.body;
  const banner = document.createElement('div');
  banner.id = 'publicDemoBanner';
  banner.className = 'public-demo-banner';
  banner.innerHTML = '<div class="public-demo-main"><span class="public-demo-badge">Demo</span><span>' + demoBannerText() + '</span></div><div class="public-demo-cta"><span>Ready to use this with your real team?</span><a href="' + cleanRouteFor('register.html') + '">Register as Scout</a><a href="' + cleanRouteFor('register.html?type=coach') + '">Register as Coach</a></div>';
  const topbar = host.querySelector ? host.querySelector('.topbar') : null;
  if (topbar && topbar.parentNode === host) host.insertBefore(banner, topbar.nextSibling);
  else host.insertBefore(banner, host.firstChild);
}

function applyPublicDemoChrome() {
  if (!isPublicDemoMode()) return;
  document.body.classList.add('public-demo-mode');
  document.querySelectorAll('a[href*="settings"], a[href*="scout-settings"], a[href*="coach-settings"]').forEach(el => { el.style.display = 'none'; });
  document.querySelectorAll('#logoutBtn,[onclick*="logout"],.logout-btn').forEach(btn => {
    if (btn.tagName === 'A') btn.setAttribute('href', cleanRouteFor('demo.html'));
    btn.textContent = 'Exit demo';
    btn.onclick = function(e){ e.preventDefault(); exitPublicDemo(); };
  });
  insertPublicDemoBanner();
}

async function maybeShowExperienceSwitcher() {
  if (!Auth.isLoggedIn()) return;
  if (isPublicDemoMode()) {
    applyPublicDemoChrome();
    return;
  }
  var shouldShow = isDemoMode() || Auth.type === 'Stratex' || localStorage.getItem('sl_experience_switcher') === '1';
  if (!shouldShow) {
    try {
      var d = await api('GET', '/api/auth/experiences');
      shouldShow = !!d.showSwitcher;
      localStorage.setItem('sl_experience_switcher', shouldShow ? '1' : '0');
    } catch(e) {}
  }
  if (!shouldShow || document.getElementById('experienceSwitchBtn')) return;
  var right = document.querySelector('.topbar-right');
  if (!right) return;
  var btn = document.createElement('button');
  btn.id = 'experienceSwitchBtn';
  btn.type = 'button';
  btn.className = 'btn btn-sm btn-outline experience-switch-btn';
  btn.textContent = isDemoMode() ? 'Switch demo' : 'Switch experience';
  btn.addEventListener('click', openExperienceSelector);
  right.insertBefore(btn, right.firstChild);
}

// API helper - handles 401 by clearing auth and redirecting to login
async function api(method, path, body) {
  if (isPublicDemoMode()) return publicDemoApi(method, path, body || {});
  const opts = { method, headers: { 'Content-Type':'application/json' } };
  if (Auth.token) opts.headers['Authorization'] = 'Bearer ' + Auth.token;
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(API + path, opts);
  if (r.status === 401) {
    // Token expired or invalid - clear and redirect to login
    Auth.clear();
    window.location.href = '/login?expired=1';
    throw new Error('Session expired. Please log in again.');
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Navbar scroll
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY > 20));
}

// Mobile menu
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => navLinks.classList.toggle('nav-open'));
}

// Range picker
function initRangePicker(containerClass, hiddenInputName) {
  const containers = document.querySelectorAll('.' + containerClass);
  containers.forEach(c => {
    const opts = c.querySelectorAll('.range-option');
    const hidden = document.querySelector('[name="' + hiddenInputName + '"]');
    opts.forEach(opt => {
      opt.addEventListener('click', () => {
        opts.forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        if (hidden) hidden.value = opt.dataset.value;
      });
    });
    if (opts.length) { opts[0].classList.add('active'); if (hidden) hidden.value = opts[0].dataset.value; }
  });
}

// Notification badge updater
async function updateNotifBadge() {
  if (!Auth.isLoggedIn()) return;
  try {
    const d = await api('GET', '/api/notifications?unreadOnly=true&limit=1');
    const badge = document.getElementById('notifBadge');
    if (badge) { badge.textContent = d.unreadCount||''; badge.style.display = d.unreadCount ? 'flex' : 'none'; }
  } catch {}
}

// Format helpers
function formatValue(v) { return v >= 1000000 ? '\u00a3'+(v/1000000).toFixed(2)+'M' : v >= 1000 ? '\u00a3'+(v/1000).toFixed(0)+'K' : '\u00a3'+v; }
function formatSalary(v) { return v >= 1000 ? '\u00a3'+(v/1000).toFixed(1)+'K/wk' : '\u00a3'+v+'/wk'; }
function relTime(dateStr) {
  const d = (Date.now()-new Date(dateStr).getTime())/1000;
  if (d<60) return 'just now'; if (d<3600) return Math.floor(d/60)+'m ago';
  if (d<86400) return Math.floor(d/3600)+'h ago'; return Math.floor(d/86400)+'d ago';
}
function initials(first,last) { return ((first||'')[0]||'').toUpperCase()+''+((last||'')[0]||'').toUpperCase(); }
function posGroupColor(g) { return {Goalkeeper:'#FFC107',Defender:'#2979FF',Midfielder:'#00BCD4',Forward:'#FF5722'}[g]||'#00E676'; }
// Rating color - works for both 0-10 and 0-100 scale
function ratingColor(r) {
  // Normalise to 0-100 if value looks like 0-10 scale
  const v = r <= 10 ? r * 10 : r;
  return v>=80?'#00E676':v>=65?'#FFC107':v>=50?'#FF9800':'#f44336';
}
// Display a rating value on the public 0-100 scale.
function ratingDisplay(r) {
  if (r === null || r === undefined) return '--';
  const n = Number(r);
  if (Number.isNaN(n)) return '--';
  const v = n <= 10 ? n * 10 : n;
  return String(Math.round(v));
}

function isValidEmailAddress(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function validateEmailInput(input) {
  if (!input) return true;
  const value = input.value.trim();
  const ok = !value || isValidEmailAddress(value);
  input.classList.toggle('field-invalid', !ok);
  input.setAttribute('aria-invalid', ok ? 'false' : 'true');
  if (!ok) input.setCustomValidity('Please enter a valid email address.');
  else input.setCustomValidity('');
  return ok;
}

const SL_COUNTRY_CITIES = {
  England:['London','Manchester','Liverpool','Birmingham','Leeds','Bristol','Sheffield','Nottingham','Southampton','Newcastle','Leicester','Coventry','Derby','Reading','Oxford','Cambridge','Brighton','Portsmouth','Plymouth','Norwich','York'],
  Scotland:['Glasgow','Edinburgh','Aberdeen','Dundee','Inverness','Stirling'],
  Wales:['Cardiff','Swansea','Newport','Wrexham'],
  'Northern Ireland':['Belfast','Derry/Londonderry','Lisburn','Newry'],
  Ireland:['Dublin','Cork','Galway','Limerick'],
  'United States':['New York','Los Angeles','Chicago','Dallas','Miami','Atlanta'],
  France:['Paris','Lyon','Marseille','Lille','Nice'],
  Spain:['Madrid','Barcelona','Valencia','Seville','Bilbao'],
  Germany:['Berlin','Munich','Hamburg','Dortmund','Frankfurt'],
  Netherlands:['Amsterdam','Rotterdam','Eindhoven','Utrecht'],
  Portugal:['Lisbon','Porto','Braga','Faro']
};
function canonicalChoice(value, choices) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const hit = (choices || []).find(x => x.toLowerCase() === raw.toLowerCase());
  if (hit) return hit;
  return raw.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}
function fillCountrySelect(selectId, selected) {
  const el = document.getElementById(selectId);
  if (!el) return;
  const countries = Object.keys(SL_COUNTRY_CITIES);
  el.innerHTML = countries.map(c => '<option value="'+c+'">'+c+'</option>').join('');
  el.value = selected && countries.includes(selected) ? selected : 'England';
}
function attachCityAutocomplete(inputId, datalistId, countryId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  let list = document.getElementById(datalistId);
  if (!list) {
    list = document.createElement('datalist');
    list.id = datalistId;
    document.body.appendChild(list);
  }
  input.setAttribute('list', datalistId);
  function cities() {
    const countryEl = countryId ? document.getElementById(countryId) : null;
    return SL_COUNTRY_CITIES[(countryEl && countryEl.value) || 'England'] || [];
  }
  function render() {
    list.innerHTML = cities().map(c => '<option value="'+c+'"></option>').join('');
    input.value = canonicalChoice(input.value, cities());
  }
  input.addEventListener('blur', render);
  if (countryId) {
    const countryEl = document.getElementById(countryId);
    if (countryEl) countryEl.addEventListener('change', render);
  }
  render();
}

window.Auth = Auth; window.api = api; window.formatValue = formatValue;
window.formatSalary = formatSalary; window.relTime = relTime;
window.initials = initials; window.posGroupColor = posGroupColor; window.ratingColor = ratingColor;
window.ratingDisplay = ratingDisplay;
window.isValidEmailAddress = isValidEmailAddress; window.validateEmailInput = validateEmailInput;
window.updateNotifBadge = updateNotifBadge; window.initRangePicker = initRangePicker;
window.applyTheme = applyTheme; window.cleanRouteFor = cleanRouteFor;
window.navigateClean = navigateClean; window.logoutToLogin = logoutToLogin;
window.isDemoMode = isDemoMode; window.openExperienceSelector = openExperienceSelector;
window.isPublicDemoMode = isPublicDemoMode; window.startPublicDemo = startPublicDemo;
window.exitPublicDemo = exitPublicDemo; window.demoBannerText = demoBannerText;
window.restoreAdminSessionForSelector = restoreAdminSessionForSelector;
window.SL_COUNTRY_CITIES = SL_COUNTRY_CITIES; window.fillCountrySelect = fillCountrySelect;
window.attachCityAutocomplete = attachCityAutocomplete; window.canonicalChoice = canonicalChoice;

document.addEventListener('DOMContentLoaded', () => {
  maybeShowExperienceSwitcher();
  applyPublicDemoChrome();
  document.querySelectorAll('input[type="email"]').forEach(input => {
    input.addEventListener('input', () => validateEmailInput(input));
    input.addEventListener('blur', () => validateEmailInput(input));
  });
  document.addEventListener('click', function(e) {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target || a.hasAttribute('download')) return;
    const href = a.getAttribute('href');
    if (!href || href.indexOf('http') === 0 || href.indexOf('mailto:') === 0 || href.indexOf('#') === 0) return;
    const clean = cleanRouteFor(href);
    if (clean !== href && window.location.protocol.indexOf('http') === 0) {
      e.preventDefault();
      window.location.href = clean;
    }
  });
  // Check for session expired param
  const params = new URLSearchParams(window.location.search);
  if (params.get('expired') === '1') {
    const msg = document.getElementById('loginMsg') || document.getElementById('loginError');
    if (msg) { msg.textContent = 'Your session has expired. Please log in again.'; msg.style.display = 'block'; }
  }
  // Check for logout param
  if (params.get('logout') === '1') {
    Auth.clear();
  }
  updateNotifBadge();
  // Auto-redirect if already logged in and on index
  if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
    if (Auth.isLoggedIn()) Auth.redirectToDashboard();
  }
});

