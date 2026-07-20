'use strict';

(function () {
  var state = {
    renderedPlayerId: '',
    ownerName: '',
    ownerResolvedFor: '',
    observer: null,
    pollCount: 0
  };

  var POSITION_GROUPS = {
    Goalkeeper: ['GK'],
    Defender: ['CB','BPD','RB','LB','RWB','LWB'],
    Midfielder: ['CDM','CM','B2B','CAM'],
    Forward: ['LW','RW','CF','ST','SS']
  };

  var POSITION_LABELS = {
    GK: 'Goalkeeper',
    CB: 'Centre Back',
    BPD: 'Ball-playing Defender',
    RB: 'Right Back',
    LB: 'Left Back',
    RWB: 'Right Wing Back',
    LWB: 'Left Wing Back',
    CDM: 'Defensive Midfielder',
    CM: 'Central Midfielder',
    B2B: 'Box-to-box Midfielder',
    CAM: 'Attacking Midfielder',
    LW: 'Left Winger',
    RW: 'Right Winger',
    CF: 'Centre Forward',
    ST: 'Striker',
    SS: 'Second Striker'
  };

  var HEIGHTS = {
    very_short: { label: 'Very short', range: '155-163 cm', min: 155, max: 163 },
    short: { label: 'Short', range: '163-170 cm', min: 163, max: 170 },
    average: { label: 'Average', range: '170-178 cm', min: 170, max: 178 },
    tall: { label: 'Tall', range: '178-185 cm', min: 178, max: 185 },
    very_tall: { label: 'Very tall', range: '185-200 cm', min: 185, max: 200 }
  };

  var BUILDS = {
    very_slight: { label: 'Very slight', range: '50-58 kg', min: 50, max: 58 },
    slight: { label: 'Slight', range: '58-65 kg', min: 58, max: 65 },
    lean: { label: 'Lean', range: '65-72 kg', min: 65, max: 72 },
    athletic: { label: 'Athletic', range: '72-80 kg', min: 72, max: 80 },
    stocky: { label: 'Stocky', range: '80-88 kg', min: 80, max: 88 },
    powerful: { label: 'Powerful', range: '88-96 kg', min: 88, max: 96 },
    very_powerful: { label: 'Very powerful', range: '96+ kg', min: 96, max: 120 }
  };

  var OUTFIELD_ATTRIBUTES = [
    'pace','agility','strength','stamina','shooting','passing','dribbling',
    'defending','composure','crossing','vision','positioning','heading','tackling','jumping'
  ];

  var GOALKEEPER_ATTRIBUTES = [
    'pace','agility','strength','stamina','jumping','composure',
    'gk_diving','gk_reflexes','gk_handling','gk_positioning',
    'gk_kicking','gk_distribution','gk_communication','gk_sweeping'
  ];

  function isCoach() {
    return !!(window.Auth && window.Auth.isLoggedIn && window.Auth.isLoggedIn() && window.Auth.type === 'Coach');
  }

  function isPublicDemo() {
    return typeof window.isPublicDemoMode === 'function' && window.isPublicDemoMode();
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char];
    });
  }

  function route(href) {
    return typeof window.cleanRouteFor === 'function' ? window.cleanRouteFor(href) : href;
  }

  function player() {
    return window._profilePlayer || null;
  }

  function matches() {
    return Array.isArray(window._profileMatches) ? window._profileMatches : [];
  }

  function fixtures() {
    return Array.isArray(window._profileFixtures) ? window._profileFixtures : [];
  }

  function videos() {
    return Array.isArray(window._profileVideos) ? window._profileVideos : [];
  }

  function analysis() {
    return window._profileAnalysis || {};
  }

  function nameOf(record) {
    return (((record && record.first_name) || '') + ' ' + ((record && record.last_name) || '')).trim() || 'Player';
  }

  function coachName() {
    var user = (window.Auth && window.Auth.user) || {};
    return ((user.firstName || user.first_name || '') + ' ' + (user.lastName || user.last_name || '')).trim() || 'Coach';
  }

  function initialsOf(record) {
    var name = typeof record === 'string' ? record : nameOf(record);
    var parts = String(name || 'Player').trim().split(/\s+/).filter(Boolean);
    return ((parts[0] || 'P').charAt(0) + (parts[1] || parts[0] || 'L').charAt(0)).toUpperCase();
  }

  function positionLabel(value) {
    var key = String(value || '').trim().toUpperCase();
    return POSITION_LABELS[key] || String(value || 'Position TBC');
  }

  function overall100(value) {
    var number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.min(100, Math.round(number > 10 ? number : number * 10)));
  }

  function attribute10(value) {
    var number = Number(value);
    if (!Number.isFinite(number)) return '--';
    return (number > 10 ? number / 10 : number).toFixed(1);
  }

  function attributePct(value) {
    var number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.min(100, Math.round(number > 10 ? number : number * 10)));
  }

  function money(value) {
    var number = Number(value) || 0;
    if (!number) return 'Calculating…';
    return '£' + number.toLocaleString('en-GB', { maximumFractionDigits: 0 });
  }

  function dateLabel(value, short) {
    if (!value) return 'Not recorded';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
    return date.toLocaleDateString('en-GB', short
      ? { day: '2-digit', month: 'short' }
      : { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function sentence(value) {
    return String(value || 'Not recorded')
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, function (char) { return char.toUpperCase(); });
  }

  function scoreBand(score) {
    if (score >= 90) return { label: 'Elite grassroots', className: 'is-green' };
    if (score >= 80) return { label: 'Excellent', className: 'is-green' };
    if (score >= 70) return { label: 'Strong', className: 'is-gold' };
    if (score >= 55) return { label: 'Promising', className: 'is-orange' };
    return { label: 'Developing', className: 'is-red' };
  }

  function confidenceInfo(count) {
    count = Number(count) || 0;
    if (count < 1) return { label: 'No evidence', className: 'is-red', note: 'No Match Facts recorded yet.' };
    if (count < 5) return { label: 'Low confidence', className: 'is-orange', note: 'Based on fewer than five recorded games.' };
    if (count < 10) return { label: 'Medium confidence', className: 'is-gold', note: 'Useful early signal; more games will strengthen it.' };
    return { label: 'High confidence', className: 'is-green', note: 'Supported by a stronger evidence base.' };
  }

  function profileCompletion(record) {
    var core = [
      'first_name','last_name','age_group','position_group','specific_position',
      'foot','height_category','build_category','overall_rating','transfer_value'
    ];
    var done = core.filter(function (key) {
      return record[key] !== null && record[key] !== undefined && String(record[key]).trim() !== '';
    }).length;

    var attrs = String(record.position_group || '').toLowerCase() === 'goalkeeper'
      ? GOALKEEPER_ATTRIBUTES
      : OUTFIELD_ATTRIBUTES;

    var attributeDone = attrs.filter(function (key) {
      return record[key] !== null && record[key] !== undefined && String(record[key]).trim() !== '';
    }).length;

    var score = Math.round((done / core.length) * 58);
    score += Math.round((attributeDone / Math.max(1, attrs.length)) * 24);
    if (matches().length) score += 10;
    if (videos().length) score += 8;
    return Math.max(0, Math.min(100, score));
  }

  function completionNote(percent) {
    var missing = [];
    if (matches().length < 5) missing.push('recent Match Facts');
    if (!videos().length) missing.push('one approved video');
    if (percent < 75) missing.push('more profile details');

    if (!missing.length) return 'This profile has a strong evidence base and is ready for regular review.';
    if (missing.length === 1) return 'Add ' + missing[0] + ' to strengthen scout confidence.';
    return 'Add ' + missing.slice(0, -1).join(', ') + ' and ' + missing[missing.length - 1] + ' to strengthen scout confidence.';
  }

  function resultInfo(match) {
    var result = String(match.result || '').toLowerCase();
    if (!result && match.home_score !== null && match.home_score !== undefined &&
        match.away_score !== null && match.away_score !== undefined) {
      var home = Number(match.home_score);
      var away = Number(match.away_score);
      if (Number.isFinite(home) && Number.isFinite(away)) {
        result = home > away ? 'win' : home < away ? 'loss' : 'draw';
      }
    }
    return result === 'win' ? 'win' : result === 'loss' ? 'loss' : result === 'draw' ? 'draw' : '';
  }

  function matchScore(match) {
    if (match.home_score === null || match.home_score === undefined ||
        match.away_score === null || match.away_score === undefined) {
      return 'Score not entered';
    }
    return match.home_score + '–' + match.away_score;
  }

  function performanceScore(match) {
    var raw = match.performance_score;
    var number = Number(raw);
    if (!Number.isFinite(number)) return 0;
    return Math.round(number > 10 ? number : number * 10);
  }

  function profileOwnerName(record) {
    return state.ownerName || coachName();
  }

  async function resolveOwner(record) {
    if (!record || !record.id || state.ownerResolvedFor === record.id) return;
    state.ownerResolvedFor = record.id;
    state.ownerName = coachName();

    try {
      var response = await window.api('GET', '/api/coaches/team-coaches');
      var coaches = response.data || response.coaches || [];
      var owner = coaches.find(function (coach) {
        return String(coach.id || '') === String(record.assigned_coach_id || '');
      });
      if (owner) {
        state.ownerName = ((owner.first_name || '') + ' ' + (owner.last_name || '')).trim() || state.ownerName;
      }
    } catch (_) {}

    state.renderedPlayerId = '';
    renderCoachProfile();
  }

  function externalLink(url, label) {
    if (!url) return '';
    return '<a class="cp3-btn" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(label) + '</a>';
  }

  function avatarMarkup(record) {
    if (typeof window.playerAvatarMarkup === 'function') {
      return '<div class="cp3-player-avatar">' + window.playerAvatarMarkup(record, 65) + '</div>';
    }
    return '<div class="cp3-player-avatar" aria-hidden="true">' + esc(initialsOf(record)) + '</div>';
  }

  function nextAction(record, completion) {
    if (matches().length < 5) {
      return {
        title: 'Add recent match evidence',
        body: nameOf(record) + ' has only ' + matches().length + ' recorded Match Fact' + (matches().length === 1 ? '' : 's') + '. Add the latest fixture before scouts rely heavily on the rating.',
        primary: '<a class="cp3-btn is-primary" href="' + esc(route('match-facts.html?playerId=' + encodeURIComponent(record.id))) + '">Add match facts</a>',
        secondary: '<a class="cp3-btn" href="' + esc(route('coach-fixtures.html')) + '">Add fixture</a>'
      };
    }

    if (!fixtures().length) {
      return {
        title: 'Add the next fixture',
        body: 'There are no upcoming fixtures connected to this player. Add the next match so reviewed scouts can see the next evidence opportunity.',
        primary: '<a class="cp3-btn is-primary" href="' + esc(route('coach-fixtures.html')) + '">Add fixture</a>',
        secondary: '<a class="cp3-btn" href="' + esc(route('match-facts.html?playerId=' + encodeURIComponent(record.id))) + '">Review Match Facts</a>'
      };
    }

    if (!videos().length) {
      return {
        title: 'Add approved video evidence',
        body: 'The profile has match evidence but no approved video. Create a private upload link for the player, parent or guardian.',
        primary: '<button class="cp3-btn is-primary" type="button" data-scroll-video>Create upload link</button>',
        secondary: '<a class="cp3-btn" href="' + esc(route('coach-video-reels.html')) + '">Open video reels</a>'
      };
    }

    if (completion < 90) {
      return {
        title: 'Complete the remaining profile details',
        body: 'The evidence is growing. Complete the remaining football and physical details so every important section is ready for reviewed scouts.',
        primary: '<button class="cp3-btn is-primary" type="button" data-edit-profile>Complete profile</button>',
        secondary: '<a class="cp3-btn" href="' + esc(route('coach-my-players.html')) + '">Back to squad</a>'
      };
    }

    return {
      title: 'Review the latest evidence',
      body: 'This profile is well supported. Review recent Match Facts, approved video and the next fixture before the next scout-facing update.',
      primary: '<a class="cp3-btn is-primary" href="#cp3MatchHistory">Review evidence</a>',
      secondary: '<button class="cp3-btn" type="button" data-edit-profile>Update profile</button>'
    };
  }

  function ratingBar(label, value, colour) {
    var score = Number(value);
    if (!Number.isFinite(score)) score = 0;
    score = Math.max(0, Math.min(100, Math.round(score)));
    return '<div class="cp3-bar-row">' +
      '<span>' + esc(label) + '</span>' +
      '<div class="cp3-progress"><span style="width:' + score + '%;background:' + colour + '"></span></div>' +
      '<b style="color:' + colour + '">' + score + '</b>' +
    '</div>';
  }

  function ratingSection(record, profileAnalysis) {
    var breakdown = profileAnalysis.overallBreakdown || record.overallBreakdown || {};
    var positionRatings = profileAnalysis.positionRatings || record.positionRatings || {};
    var overall = overall100(record.overall_rating);
    var finalScore = Number.isFinite(Number(breakdown.finalScore)) ? Math.round(breakdown.finalScore) : overall;
    var readiness = Number.isFinite(Number(breakdown.currentReadiness)) ? Math.round(breakdown.currentReadiness) : overall;
    var potential = Number.isFinite(Number(breakdown.potentialRating)) ? Math.round(breakdown.potentialRating) : Math.min(100, overall + 7);
    var confidence = confidenceInfo(matches().length);

    var bars = [
      ['Technical', breakdown.technicalScore, '#0fa37f'],
      ['Tactical IQ', breakdown.tacticalIQScore, '#28b7d6'],
      ['Physical profile', breakdown.physicalProfileScore, '#4f8df7'],
      ['Mental / coachability', breakdown.mentalCoachabilityScore, '#8b5cf6'],
      ['Match output', breakdown.matchOutputScore, '#f4b400'],
      ['Discipline', breakdown.disciplineScore, '#f97316'],
      ['Availability', breakdown.availabilityScore, '#24b865'],
      ['Data confidence', breakdown.dataConfidenceScore, '#dd6ce9']
    ].map(function (item) {
      var fallback = item[0] === 'Data confidence'
        ? Math.min(100, matches().length * 12 + 34)
        : overall;
      return ratingBar(item[0], Number.isFinite(Number(item[1])) ? item[1] : fallback, item[2]);
    }).join('');

    var bestCurrent = positionRatings.bestCurrentPosition || record.specific_position || record.primary_position || 'LW';
    var bestFuture = positionRatings.bestFuturePosition || bestCurrent;
    var currentScore = Number.isFinite(Number(positionRatings.bestCurrentScore)) ? Math.round(positionRatings.bestCurrentScore) : overall;
    var futureScore = Number.isFinite(Number(positionRatings.bestFutureScore)) ? Math.round(positionRatings.bestFutureScore) : Math.min(100, overall + 4);

    var positionOptions = '<option value="">Auto-detect best fit</option>' +
      Object.keys(POSITION_LABELS).map(function (key) {
        return '<option value="' + esc(key) + '">' + esc(POSITION_LABELS[key]) + '</option>';
      }).join('');

    return '<section class="cp3-panel" id="cp3Ratings">' +
      '<header class="cp3-panel-head">' +
        '<div class="cp3-panel-title"><h2>Overall rating breakdown</h2>' +
        '<p>Coach ratings, match output, physical profile, discipline, availability and evidence confidence.</p></div>' +
        '<span class="cp3-pill">' + esc(record.age_group || 'Age TBC') + ' · ' + esc(record.position_group || 'Position TBC') + '</span>' +
      '</header>' +
      '<div class="cp3-panel-body">' +
        '<div class="cp3-rating-layout">' +
          '<div>' +
            '<div class="cp3-score-grid">' +
              '<article class="cp3-score-card"><small>Final score</small><strong>' + finalScore + '/100</strong><p>Headline ScoutLink overall</p></article>' +
              '<article class="cp3-score-card"><small>Current readiness</small><strong>' + readiness + '/100</strong><p>How ready the player is now</p></article>' +
              '<article class="cp3-score-card"><small>Potential rating</small><strong>' + potential + '/100</strong><p>Development upside</p></article>' +
              '<article class="cp3-score-card"><small>Data confidence</small><strong style="font-size:14px">' + esc(confidence.label.replace(' confidence','')) + '</strong><p>' + esc(confidence.note) + '</p></article>' +
            '</div>' +
            '<div class="cp3-bar-list">' + bars + '</div>' +
          '</div>' +
          '<aside class="cp3-position-box">' +
            '<h3>Position fit</h3>' +
            '<div class="cp3-position-grid">' +
              '<div class="cp3-position-card"><small>Best current role</small><b><span class="cp3-blurred">' + esc(positionLabel(bestCurrent)) + '</span></b></div>' +
              '<div class="cp3-position-card"><small>Best future role</small><b><span class="cp3-blurred">' + esc(positionLabel(bestFuture)) + '</span></b></div>' +
              '<div class="cp3-position-card"><small>Current role score</small><b><span class="cp3-blurred">' + currentScore + '/100</span></b></div>' +
              '<div class="cp3-position-card"><small>Future role score</small><b><span class="cp3-blurred">' + futureScore + '/100</span></b></div>' +
            '</div>' +
            '<div class="cp3-position-help">Position Fit uses the current profile, attributes and match evidence. It supports decisions but does not replace coach or scout judgement.</div>' +
            '<div class="cp3-position-controls">' +
              '<select id="targetPosition" aria-label="Target position">' + positionOptions + '</select>' +
              '<button class="cp3-btn is-primary pred-btn" type="button" data-pred-type="position_fit" id="cp3PositionFitBtn">Run position fit</button>' +
            '</div>' +
            '<div id="predResultArea" aria-live="polite"></div>' +
          '</aside>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  function attributesMarkup(record) {
    var isGoalkeeper = String(record.position_group || '').toLowerCase() === 'goalkeeper';
    var keys = isGoalkeeper ? GOALKEEPER_ATTRIBUTES : OUTFIELD_ATTRIBUTES;
    return keys.map(function (key) {
      var percentage = attributePct(record[key]);
      var colour = percentage >= 70 ? '#0fa37f' : percentage >= 50 ? '#f4b400' : '#d94a5b';
      var label = typeof window.attrLabel === 'function' ? window.attrLabel(key) : sentence(key);
      return '<div class="cp3-attribute">' +
        '<span>' + esc(label) + '</span>' +
        '<div class="cp3-progress"><span style="width:' + percentage + '%;background:' + colour + '"></span></div>' +
        '<b>' + esc(attribute10(record[key])) + '</b>' +
      '</div>';
    }).join('');
  }

  function physicalSection(record) {
    var heightCategory = sentence(record.height_category);
    var buildCategory = sentence(record.build_category);
    var heightRange = record.height_range_cm || (HEIGHTS[record.height_category] && HEIGHTS[record.height_category].range) || 'Not recorded';
    var weightRange = record.weight_range_kg || (BUILDS[record.build_category] && BUILDS[record.build_category].range) || 'Not recorded';
    var feet = typeof window.cmRangeToFeet === 'function' ? window.cmRangeToFeet(heightRange) : 'Not recorded';

    return '<article class="cp3-panel" id="cp3Physical">' +
      '<header class="cp3-panel-head"><div class="cp3-panel-title"><h3>Physical profile</h3><p>Current coach-managed context</p></div>' +
      '<button class="cp3-btn is-small" type="button" data-edit-profile data-edit-focus="height">Edit</button></header>' +
      '<div class="cp3-panel-body">' +
        '<div class="cp3-physical-hero"><small>Profile type</small><h4>' + esc(heightCategory) + ' height · ' + esc(buildCategory) + ' build</h4>' +
        '<p>Height range: ' + esc(heightRange) + ' · Weight range: ' + esc(weightRange) + '</p></div>' +
        '<div class="cp3-physical-grid">' +
          '<div class="cp3-physical-card"><small>Height</small><b>' + esc(heightRange) + '</b></div>' +
          '<div class="cp3-physical-card"><small>Feet / inches</small><b>' + esc(feet) + '</b></div>' +
          '<div class="cp3-physical-card"><small>Build</small><b>' + esc(buildCategory) + '</b></div>' +
          '<div class="cp3-physical-card"><small>Weight range</small><b>' + esc(weightRange) + '</b></div>' +
          '<div class="cp3-physical-card"><small>Age group</small><b>' + esc(record.age_group || 'Not recorded') + '</b></div>' +
          '<div class="cp3-physical-card"><small>Profile owner</small><b>' + esc(profileOwnerName(record)) + '</b></div>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function statisticsSection(record) {
    var stats = [
      ['Appearances', record.appearances || 0, ''],
      ['Goals', record.goals || 0, ''],
      ['Assists', record.assists || 0, ''],
      ['Clean sheets', record.clean_sheets || 0, ''],
      ['Yellow cards', record.yellow_cards || 0, 'color:#f4b400'],
      ['Red cards', record.red_cards || 0, 'color:#d94a5b']
    ];

    return '<article class="cp3-panel">' +
      '<header class="cp3-panel-head"><div class="cp3-panel-title"><h3>Match statistics</h3><p>Recorded Match Facts</p></div></header>' +
      '<div class="cp3-panel-body"><div class="cp3-metric-grid">' +
        stats.map(function (item) {
          return '<div class="cp3-metric"><div><b style="' + item[2] + '">' + esc(item[1]) + '</b><span>' + esc(item[0]) + '</span></div></div>';
        }).join('') +
      '</div></div>' +
    '</article>';
  }

  function matchHistoryMarkup(record) {
    var records = matches().slice(0, 5);
    if (!records.length) {
      return '<div class="cp3-empty"><div class="cp3-empty-icon">MF</div><h4>No Match Facts yet</h4>' +
        '<p>Add the latest match evidence to strengthen the rating and scout confidence.</p>' +
        '<a class="cp3-btn is-primary" style="margin-top:10px" href="' + esc(route('match-facts.html?playerId=' + encodeURIComponent(record.id))) + '">Add Match Facts</a></div>';
    }

    return '<div class="cp3-history-list">' + records.map(function (match, index) {
      var result = resultInfo(match);
      var score = matchScore(match);
      var detail = [
        dateLabel(match.match_date),
        score + (result ? ' ' + result : ''),
        (match.goals_scored || match.goals || 0) + 'G',
        (match.assists || 0) + 'A'
      ].join(' · ');
      var performance = performanceScore(match);
      return '<article class="cp3-history-item">' +
        '<div><b>' + esc(match.opponent_name || match.opponent || 'Opponent') + '</b><span>' + esc(detail) + '</span></div>' +
        '<div class="cp3-history-result"><strong>' + (performance ? performance + '/100' : 'No score') + '</strong>' +
        '<button class="cp3-btn is-small" type="button" data-match-detail="' + index + '">Details</button></div>' +
      '</article>';
    }).join('') + '</div>';
  }

  function fixturesMarkup(record) {
    var rows = fixtures().slice(0, 5);
    if (!rows.length) {
      return '<div class="cp3-empty"><div class="cp3-empty-icon">FX</div><h4>No upcoming fixtures</h4>' +
        '<p>Add the next fixture so reviewed scouts can see the next evidence opportunity.</p>' +
        '<a class="cp3-btn is-primary" style="margin-top:10px" href="' + esc(route('coach-fixtures.html')) + '">Add fixture</a></div>';
    }

    return '<div class="cp3-fixture-list">' + rows.map(function (fixture, index) {
      var home = String(fixture.home_or_away || 'Home').toLowerCase() === 'home';
      var venue = fixture.venue || fixture.venue_name || fixture.city || 'Venue TBC';
      var opponent = (home ? 'vs ' : '@ ') + (fixture.opponent_name || fixture.opponent || 'Opponent');
      return '<article class="cp3-fixture">' +
        '<time>' + esc(dateLabel(fixture.fixture_date, true)) + '</time>' +
        '<div><b>' + esc(opponent) + '</b><span>' + esc(venue) + ' · ' + (home ? 'Home' : 'Away') + '</span></div>' +
        '<button class="cp3-btn is-small" type="button" data-fixture-detail="' + index + '">Details</button>' +
      '</article>';
    }).join('') + '</div>';
  }

  function videoMarkup(record) {
    var rows = videos();
    var cards = rows.length
      ? '<div class="cp3-video-grid">' + rows.map(function (video, index) {
          return '<article class="cp3-video-card">' +
            '<button class="cp3-video-thumb" type="button" data-video-index="' + index + '" aria-label="Play ' + esc(video.title || 'video') + '">▶</button>' +
            '<h4>' + esc(video.title || 'Video reel') + '</h4>' +
            '<p>' + esc(video.category || 'Highlight') + (video.description ? ' · ' + esc(video.description) : '') + '</p>' +
            '<button class="cp3-btn is-small is-block" type="button" data-video-index="' + index + '">Watch</button>' +
          '</article>';
        }).join('') + '</div>'
      : '<div class="cp3-empty"><div class="cp3-empty-icon">▶</div><h4>No video reels uploaded yet</h4>' +
        '<p>Add an approved clip or create a private upload link to strengthen the visual evidence available to reviewed scouts.</p></div>';

    return '<section class="cp3-panel" id="cp3Video">' +
      '<header class="cp3-panel-head"><div class="cp3-panel-title"><h3>Video evidence</h3><p>Approved clips for scouts and player-development review</p></div>' +
      '<a class="cp3-btn is-small" href="' + esc(route('coach-video-reels.html')) + '">Upload reel</a></header>' +
      '<div class="cp3-panel-body">' +
        '<div class="cp3-video-upload">' +
          '<div><b>Private player upload link</b><p>Generate a secure link and share it through an approved team communication channel. The player, parent or guardian does not need a ScoutLink account.</p></div>' +
          '<button class="cp3-btn is-primary" id="btnGenerateVideoUploadLink" type="button">Generate upload link</button>' +
        '</div>' +
        '<div id="videoUploadLinkResult" style="display:none"></div>' +
        cards +
      '</div>' +
    '</section>';
  }

  function editModal(record) {
    var ageOptions = Array.from({ length: 10 }, function (_, index) { return 'U' + (index + 7); })
      .map(function (age) { return '<option' + (age === record.age_group ? ' selected' : '') + '>' + age + '</option>'; }).join('');

    var groupOptions = ['Goalkeeper','Defender','Midfielder','Forward'].map(function (group) {
      return '<option value="' + group + '"' + (group === record.position_group ? ' selected' : '') + '>' + group + '</option>';
    }).join('');

    var footOptions = ['Right','Left','Both'].map(function (foot) {
      return '<option' + (String(record.foot || '').toLowerCase() === foot.toLowerCase() ? ' selected' : '') + '>' + foot + '</option>';
    }).join('');

    var heightOptions = Object.keys(HEIGHTS).map(function (key) {
      return '<option value="' + key + '"' + (key === record.height_category ? ' selected' : '') + '>' + HEIGHTS[key].label + ' · ' + HEIGHTS[key].range + '</option>';
    }).join('');

    var buildOptions = Object.keys(BUILDS).map(function (key) {
      return '<option value="' + key + '"' + (key === record.build_category ? ' selected' : '') + '>' + BUILDS[key].label + ' · ' + BUILDS[key].range + '</option>';
    }).join('');

    var attrs = String(record.position_group || '').toLowerCase() === 'goalkeeper'
      ? GOALKEEPER_ATTRIBUTES
      : OUTFIELD_ATTRIBUTES;

    var attributeFields = attrs.map(function (key) {
      var label = typeof window.attrLabel === 'function' ? window.attrLabel(key) : sentence(key);
      var current = Number(record[key]);
      var value = Number.isFinite(current) ? (current > 10 ? current / 10 : current) : '';
      return '<div class="cp3-form-field"><label for="cp3-' + key + '">' + esc(label) + ' / 10</label>' +
        '<input id="cp3-' + key + '" name="' + key + '" type="number" min="1" max="10" step="0.1" value="' + esc(value) + '"></div>';
    }).join('');

    return '<div class="cp3-modal" id="cp3EditModal" aria-hidden="true">' +
      '<section class="cp3-modal-card" role="dialog" aria-modal="true" aria-labelledby="cp3EditTitle">' +
        '<header class="cp3-modal-head"><h2 id="cp3EditTitle">Edit player profile</h2>' +
        '<button class="cp3-btn is-small" type="button" data-close-edit>Close</button></header>' +
        '<form id="cp3EditForm">' +
          '<div class="cp3-modal-body">' +
            '<section class="cp3-edit-section"><h3>Player and football details</h3><div class="cp3-form-grid">' +
              '<div class="cp3-form-field"><label for="cp3FirstName">First name</label><input id="cp3FirstName" required value="' + esc(record.first_name || '') + '"></div>' +
              '<div class="cp3-form-field"><label for="cp3LastName">Last name</label><input id="cp3LastName" required value="' + esc(record.last_name || '') + '"></div>' +
              '<div class="cp3-form-field"><label for="cp3AgeGroup">Age group</label><select id="cp3AgeGroup">' + ageOptions + '</select></div>' +
              '<div class="cp3-form-field"><label for="cp3PositionGroup">Position group</label><select id="cp3PositionGroup">' + groupOptions + '</select></div>' +
              '<div class="cp3-form-field"><label for="cp3SpecificPosition">Specific position</label><select id="cp3SpecificPosition"></select></div>' +
              '<div class="cp3-form-field"><label for="cp3Foot">Preferred foot</label><select id="cp3Foot">' + footOptions + '</select></div>' +
            '</div></section>' +
            '<section class="cp3-edit-section"><h3>Physical profile</h3><div class="cp3-form-grid">' +
              '<div class="cp3-form-field is-wide"><label for="cp3HeightCategory">Height profile</label><select id="cp3HeightCategory">' + heightOptions + '</select></div>' +
              '<div class="cp3-form-field"><label for="cp3BuildCategory">Build profile</label><select id="cp3BuildCategory">' + buildOptions + '</select></div>' +
            '</div></section>' +
            '<section class="cp3-edit-section"><h3>Coach-rated attributes</h3><div class="cp3-form-grid" id="cp3AttributeFields">' + attributeFields + '</div></section>' +
          '</div>' +
          '<footer class="cp3-modal-actions"><span class="cp3-form-status" id="cp3EditStatus" aria-live="polite"></span>' +
            '<button class="cp3-btn" type="button" data-close-edit>Cancel</button>' +
            '<button class="cp3-btn is-primary" type="submit" id="cp3SaveProfile">Save profile</button>' +
          '</footer>' +
        '</form>' +
      '</section>' +
    '</div>';
  }

  function renderCoachProfile() {
    if (!isCoach()) return;

    var record = player();
    var host = document.getElementById('profileContent');
    if (!record || !host) return;

    if (state.renderedPlayerId === String(record.id || '') && host.querySelector('.cp3-shell')) return;
    state.renderedPlayerId = String(record.id || '');

    document.body.classList.add('coach-player-profile-v3');

    var team = record.team || {};
    var overall = overall100(record.overall_rating);
    var band = scoreBand(overall);
    var confidence = confidenceInfo(matches().length);
    var completion = profileCompletion(record);
    var owner = profileOwnerName(record);
    var profileAnalysis = analysis();
    var next = nextAction(record, completion);
    var apps = Number(record.appearances) || 0;
    var goals = Number(record.goals) || 0;
    var assists = Number(record.assists) || 0;
    var cleanSheets = Number(record.clean_sheets) || 0;
    var gpg = apps ? (goals / apps).toFixed(2) : '—';
    var apg = apps ? (assists / apps).toFixed(2) : '—';
    var cspg = apps ? (cleanSheets / apps).toFixed(2) : '—';
    var visibilityActive = record.is_active !== false;
    var concernCount = Number(record.open_concerns_count);
    var concernText = Number.isFinite(concernCount)
      ? (concernCount ? concernCount + ' open' : 'None')
      : 'Concern centre';
    var updated = record.updated_at || record.created_at;
    var ageWarning = String(record.age_group || '').toUpperCase() === 'U16'
      ? '<div class="cp3-warning"><strong>Final supported age group.</strong> U16 players are archived from active ScoutLink visibility at the 15 May seasonal rollover.</div>'
      : '';

    var profileMeta = [
      positionLabel(record.specific_position || record.primary_position || record.position_group),
      record.age_group || 'Age group TBC',
      record.team_name || team.team_name || 'Team TBC'
    ].join(' · ');

    var heroActions =
      '<button class="cp3-btn is-primary" type="button" data-edit-profile>Edit player profile</button>' +
      externalLink(team.team_website_url, 'View team website') +
      externalLink(team.league_fulltime_url, 'View league') +
      '<button class="cp3-btn" type="button" data-scroll-video>Generate upload link</button>';

    var trustConcern = Number.isFinite(concernCount)
      ? '<b>' + esc(concernText) + '</b>'
      : '<a href="' + esc(route('coach-report-concern.html')) + '">' + esc(concernText) + '</a>';

    host.innerHTML =
      '<div class="cp3-shell">' +
        ageWarning +
        '<section class="cp3-hero">' +
          '<div class="cp3-hero-main">' +
            '<div class="cp3-identity">' +
              avatarMarkup(record) +
              '<div class="cp3-identity-copy">' +
                '<h1>' + esc(nameOf(record)) + '</h1>' +
                '<p class="cp3-identity-meta">' + esc(profileMeta) + '</p>' +
                '<div class="cp3-tags">' +
                  '<span class="cp3-pill is-green">Coach managed</span>' +
                  '<span class="cp3-pill is-blue">' + (visibilityActive ? 'Visible to reviewed scouts' : 'Visibility paused') + '</span>' +
                  '<span class="cp3-pill">' + esc(record.foot || 'Foot TBC') + ' foot</span>' +
                  '<span class="cp3-pill is-gold">Overall ' + overall + '/100</span>' +
                '</div>' +
                '<div class="cp3-hero-actions">' + heroActions + '</div>' +
              '</div>' +
            '</div>' +
            '<div class="cp3-hero-value"><strong>' + esc(money(record.transfer_value)) + '</strong><span>Estimated transfer value</span></div>' +
          '</div>' +
          '<div class="cp3-completion">' +
            '<div class="cp3-completion-copy"><b>Profile completion</b><span>' + esc(completionNote(completion)) + '</span></div>' +
            '<div class="cp3-completion-track"><div class="cp3-progress"><span style="width:' + completion + '%"></span></div><b>' + completion + '%</b></div>' +
          '</div>' +
        '</section>' +

        '<section class="cp3-quick-grid">' +
          '<article class="cp3-next-action"><div><small>Best next action</small><h3>' + esc(next.title) + '</h3><p>' + esc(next.body) + '</p></div>' +
          '<div class="cp3-next-action-actions">' + next.primary + next.secondary + '</div></article>' +
          '<article class="cp3-trust"><h3>Profile trust and visibility</h3>' +
            '<div class="cp3-trust-row"><span>Scout visibility</span><b>' + (visibilityActive ? 'Reviewed scouts only' : 'Paused') + '</b></div>' +
            '<div class="cp3-trust-row"><span>Profile owner</span><b>' + esc(owner) + '</b></div>' +
            '<div class="cp3-trust-row"><span>Last updated</span><b>' + esc(dateLabel(updated)) + '</b></div>' +
            '<div class="cp3-trust-row"><span>Open concerns</span>' + trustConcern + '</div>' +
          '</article>' +
        '</section>' +

        '<section class="cp3-stat-grid">' +
          '<article class="cp3-stat"><small>Overall match performance</small><strong class="' + band.className + '">' + overall + '/100</strong><p>' + esc(band.label) + ' current performance signal.</p></article>' +
          '<article class="cp3-stat"><small>Data confidence</small><strong class="' + confidence.className + '">' + esc(confidence.label) + '</strong><p>' + esc(confidence.note) + '</p></article>' +
          '<article class="cp3-stat"><small>Evidence base</small><strong>' + matches().length + '</strong><p>Match Facts currently support this profile.</p></article>' +
          '<article class="cp3-stat"><small>Scout visibility</small><strong class="' + (visibilityActive ? 'is-green' : 'is-orange') + '">' + (visibilityActive ? 'Active' : 'Paused') + '</strong><p>' + (visibilityActive ? 'Available to reviewed ScoutLink scouts.' : 'Not currently scout visible.') + '</p></article>' +
        '</section>' +

        '<nav class="cp3-tabs" aria-label="Player profile sections">' +
          '<button class="cp3-tab is-active" type="button" data-profile-tab="cp3Overview">Overview</button>' +
          '<button class="cp3-tab" type="button" data-profile-tab="cp3Ratings">Ratings and attributes</button>' +
          '<button class="cp3-tab" type="button" data-profile-tab="cp3MatchHistory">Match history</button>' +
          '<button class="cp3-tab" type="button" data-profile-tab="cp3Physical">Physical profile</button>' +
          '<button class="cp3-tab" type="button" data-profile-tab="cp3Video">Video evidence</button>' +
        '</nav>' +

        '<div id="cp3Overview"></div>' +
        ratingSection(record, profileAnalysis) +

        '<section class="cp3-output-grid">' +
          '<article class="cp3-output"><div><strong class="is-green">' + gpg + '</strong><span>Goals per game</span></div></article>' +
          '<article class="cp3-output"><div><strong class="is-blue">' + apg + '</strong><span>Assists per game</span></div></article>' +
          '<article class="cp3-output"><div><strong class="is-gold">' + cspg + '</strong><span>Clean sheets per game</span></div></article>' +
          '<article class="cp3-output"><div><strong>' + apps + '</strong><span>Appearances</span></div></article>' +
        '</section>' +

        '<section class="cp3-profile-grid">' +
          '<article class="cp3-panel"><header class="cp3-panel-head"><div class="cp3-panel-title"><h3>All attributes</h3><p>Coach-rated profile attributes</p></div>' +
          '<button class="cp3-btn is-small" type="button" data-edit-profile data-edit-focus="attributes">Edit attributes</button></header>' +
          '<div class="cp3-panel-body"><div class="cp3-attribute-list">' + attributesMarkup(record) + '</div></div></article>' +
          statisticsSection(record) +
          physicalSection(record) +
        '</section>' +

        '<section class="cp3-history-grid" id="cp3MatchHistory">' +
          '<article class="cp3-panel"><header class="cp3-panel-head"><div class="cp3-panel-title"><h3>Recent Match Facts</h3><p>The latest evidence supporting this profile</p></div>' +
          '<a class="cp3-btn is-small" href="' + esc(route('match-facts.html?playerId=' + encodeURIComponent(record.id))) + '">View all</a></header>' +
          '<div class="cp3-panel-body">' + matchHistoryMarkup(record) + '</div></article>' +
          '<article class="cp3-panel"><header class="cp3-panel-head"><div class="cp3-panel-title"><h3>Upcoming fixtures</h3><p>Next opportunities to add evidence</p></div>' +
          '<a class="cp3-btn is-small" href="' + esc(route('coach-fixtures.html')) + '">Add fixture</a></header>' +
          '<div class="cp3-panel-body">' + fixturesMarkup(record) + '</div></article>' +
        '</section>' +

        videoMarkup(record) +

        '<section class="cp3-panel">' +
          '<header class="cp3-panel-head"><div class="cp3-panel-title"><h3>Profile record</h3><p>Ownership, visibility and evidence information</p></div></header>' +
          '<div class="cp3-panel-body"><div class="cp3-audit-grid">' +
            '<div class="cp3-audit-card"><small>Profile created by</small><b>' + esc(owner) + '</b><p>Authorised team coach</p></div>' +
            '<div class="cp3-audit-card"><small>Last updated</small><b>' + esc(dateLabel(updated)) + '</b><p>Profile and evidence summary</p></div>' +
            '<div class="cp3-audit-card"><small>Visibility</small><b>' + (visibilityActive ? 'Reviewed scouts' : 'Paused') + '</b><p>Not an open public profile</p></div>' +
            '<div class="cp3-audit-card"><small>Evidence quality</small><b>' + esc(confidence.label) + '</b><p>' + matches().length + ' recorded Match Fact' + (matches().length === 1 ? '' : 's') + '</p></div>' +
          '</div></div>' +
        '</section>' +

        editModal(record) +
      '</div>';

    installProfileEvents(record);
    refreshCoachChrome();
    resolveOwner(record);
  }

  function updateSpecificPositions(record) {
    var group = document.getElementById('cp3PositionGroup');
    var select = document.getElementById('cp3SpecificPosition');
    if (!group || !select) return;

    var options = POSITION_GROUPS[group.value] || [];
    var current = record.specific_position || record.primary_position || '';
    select.innerHTML = options.map(function (key) {
      return '<option value="' + key + '"' + (String(current).toUpperCase() === key ? ' selected' : '') + '>' + POSITION_LABELS[key] + '</option>';
    }).join('');
  }

  function openEditModal(record, focus) {
    var modal = document.getElementById('cp3EditModal');
    if (!modal) return;
    updateSpecificPositions(record);
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    var target = focus === 'attributes'
      ? document.querySelector('#cp3AttributeFields input')
      : focus === 'height'
        ? document.getElementById('cp3HeightCategory')
        : document.getElementById('cp3FirstName');

    if (target) setTimeout(function () { target.focus(); }, 30);
  }

  function closeEditModal() {
    var modal = document.getElementById('cp3EditModal');
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function valueOf(id) {
    var element = document.getElementById(id);
    return element ? element.value : '';
  }

  function numberValue(id) {
    var raw = valueOf(id);
    return raw === '' ? null : Number(raw);
  }

  function buildUpdatePayload(record) {
    var group = valueOf('cp3PositionGroup');
    var specific = valueOf('cp3SpecificPosition');
    var heightKey = valueOf('cp3HeightCategory');
    var buildKey = valueOf('cp3BuildCategory');
    var height = HEIGHTS[heightKey] || {};
    var build = BUILDS[buildKey] || {};

    var payload = {
      first_name: valueOf('cp3FirstName').trim(),
      last_name: valueOf('cp3LastName').trim(),
      ageGroup: valueOf('cp3AgeGroup'),
      position_group: group,
      specific_position: specific || null,
      primary_position: specific || null,
      positions: specific ? [specific] : [],
      foot: valueOf('cp3Foot'),
      height_category: heightKey,
      height_range_cm: height.range || null,
      height_min_cm: height.min || null,
      height_max_cm: height.max || null,
      build_category: buildKey,
      weight_range_kg: build.range || null,
      weight_min_kg: build.min || null,
      weight_max_kg: build.max || null
    };

    var attrs = String(group || '').toLowerCase() === 'goalkeeper'
      ? GOALKEEPER_ATTRIBUTES
      : OUTFIELD_ATTRIBUTES;

    attrs.forEach(function (key) {
      payload[key] = numberValue('cp3-' + key);
    });

    return payload;
  }

  function savePublicDemo(record, payload) {
    if (typeof window.getDemoState !== 'function' || typeof window.setDemoState !== 'function') {
      return Promise.reject(new Error('Demo state is unavailable.'));
    }

    var demoState = window.getDemoState();
    var index = (demoState.players || []).findIndex(function (row) {
      return String(row.id) === String(record.id);
    });

    if (index < 0) return Promise.reject(new Error('Demo player could not be found.'));

    var demoPayload = Object.assign({}, payload, {
      age_group: payload.ageGroup,
      updated_at: new Date().toISOString()
    });
    delete demoPayload.ageGroup;

    Object.assign(demoState.players[index], demoPayload);
    window.setDemoState(demoState);
    return Promise.resolve({ player: demoState.players[index] });
  }

  async function saveProfile(record, event) {
    event.preventDefault();

    var status = document.getElementById('cp3EditStatus');
    var button = document.getElementById('cp3SaveProfile');
    var payload = buildUpdatePayload(record);

    if (!payload.first_name || !payload.last_name) {
      if (status) status.textContent = 'First name and last name are required.';
      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent = 'Saving…';
    }
    if (status) status.textContent = 'Saving player profile…';

    try {
      var response = isPublicDemo()
        ? await savePublicDemo(record, payload)
        : await window.api('PUT', '/api/players/' + encodeURIComponent(record.id), payload);

      if (response && response.player) window._profilePlayer = response.player;
      if (status) status.textContent = 'Profile saved. Refreshing…';
      setTimeout(function () { window.location.reload(); }, 450);
    } catch (error) {
      if (status) status.textContent = error.message || 'The profile could not be saved.';
      if (button) {
        button.disabled = false;
        button.textContent = 'Save profile';
      }
    }
  }

  function installProfileEvents(record) {
    document.querySelectorAll('[data-edit-profile]').forEach(function (button) {
      button.addEventListener('click', function () {
        openEditModal(record, button.getAttribute('data-edit-focus') || '');
      });
    });

    document.querySelectorAll('[data-close-edit]').forEach(function (button) {
      button.addEventListener('click', closeEditModal);
    });

    var modal = document.getElementById('cp3EditModal');
    if (modal) {
      modal.addEventListener('click', function (event) {
        if (event.target === modal) closeEditModal();
      });
    }

    var positionGroup = document.getElementById('cp3PositionGroup');
    if (positionGroup) {
      positionGroup.addEventListener('change', function () {
        record.specific_position = '';
        updateSpecificPositions(record);
      });
    }
    updateSpecificPositions(record);

    var editForm = document.getElementById('cp3EditForm');
    if (editForm) editForm.addEventListener('submit', function (event) {
      saveProfile(record, event);
    });

    document.querySelectorAll('[data-scroll-video]').forEach(function (button) {
      button.addEventListener('click', function () {
        var section = document.getElementById('cp3Video');
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        var upload = document.getElementById('btnGenerateVideoUploadLink');
        if (upload) setTimeout(function () { upload.focus(); }, 350);
      });
    });

    var uploadButton = document.getElementById('btnGenerateVideoUploadLink');
    if (uploadButton) {
      uploadButton.addEventListener('click', function () {
        if (typeof window.generateVideoUploadLink === 'function') {
          window.generateVideoUploadLink(record.id);
        }
      });
    }

    document.querySelectorAll('[data-match-detail]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (typeof window.openMatchDetail === 'function') {
          window.openMatchDetail(Number(button.getAttribute('data-match-detail')) || 0);
        }
      });
    });

    document.querySelectorAll('[data-fixture-detail]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (typeof window.openFixtureDetail === 'function') {
          window.openFixtureDetail(Number(button.getAttribute('data-fixture-detail')) || 0);
        }
      });
    });

    document.querySelectorAll('[data-video-index]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (typeof window.openProfileVideo === 'function') {
          window.openProfileVideo(Number(button.getAttribute('data-video-index')) || 0);
        }
      });
    });

    var positionButton = document.getElementById('cp3PositionFitBtn');
    if (positionButton) {
      positionButton.addEventListener('click', function () {
        if (typeof window.runPrediction === 'function') {
          window.runPrediction(record.id, 'position_fit');
        }
      });
    }

    document.querySelectorAll('[data-profile-tab]').forEach(function (button) {
      button.addEventListener('click', function () {
        document.querySelectorAll('[data-profile-tab]').forEach(function (item) {
          item.classList.toggle('is-active', item === button);
        });
        var target = document.getElementById(button.getAttribute('data-profile-tab'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    if (!document.body.dataset.cp3EscapeBound) {
      document.body.dataset.cp3EscapeBound = '1';
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') closeEditModal();
      });
    }
  }

  function mobileNavMarkup() {
    return [
      '<a href="' + esc(route('coach-dashboard.html')) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10.5V20h14v-9.5"/><path d="M9 20v-6h6v6"/></svg><span>Home</span></a>',
      '<a class="active" href="' + esc(route('coach-my-players.html')) + '" aria-current="page"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg><span>Players</span></a>',
      '<a href="' + esc(route('match-facts.html')) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m12 7 3 2.2-1.1 3.5h-3.8L9 9.2 12 7Z"/><path d="m5.5 10.5 3.5-1.3M15 9.2l3.5 1.3M10.1 12.7 8 16m5.9-3.3L16 16"/></svg><span>Match</span></a>',
      '<a href="' + esc(route('coach-chat.html')) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19l2.5-2H17a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3"/><path d="M8 9h8M8 13h5"/></svg><span>Chat</span></a>',
      '<a href="' + esc(route('coach-settings.html')) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.3 4.3a1.7 1.7 0 0 1 3.4 0 1.7 1.7 0 0 0 2.6 1.1 1.7 1.7 0 0 1 2.4 2.4 1.7 1.7 0 0 0 1 2.5 1.7 1.7 0 0 1 0 3.4 1.7 1.7 0 0 0-1 2.6 1.7 1.7 0 0 1-2.4 2.4 1.7 1.7 0 0 0-2.6 1 1.7 1.7 0 0 1-3.4 0 1.7 1.7 0 0 0-2.6-1 1.7 1.7 0 0 1-2.4-2.4 1.7 1.7 0 0 0-1-2.6 1.7 1.7 0 0 1 0-3.4 1.7 1.7 0 0 0 1-2.5 1.7 1.7 0 0 1 2.4-2.4 1.7 1.7 0 0 0 2.6-1.1Z"/><circle cx="12" cy="12" r="3"/></svg><span>More</span></a>'
    ].join('');
  }

  function refreshCoachChrome() {
    if (!isCoach()) return;

    document.body.classList.add('coach-player-profile-v3');

    var title = document.querySelector('.topbar-title');
    if (title) title.textContent = 'Player profile';

    var back = document.querySelector('.topbar a[href*="history.back"], .topbar a.action-btn');
    if (back) {
      back.setAttribute('href', route('coach-my-players.html'));
      back.textContent = '← Back';
    }

    var mobileTitle = document.querySelector('.coach-v2-mobile-title');
    if (mobileTitle) mobileTitle.textContent = 'Player profile';

    var bottom = document.querySelector('.coach-v2-bottom-nav');
    if (bottom && !bottom.dataset.cp3Nav) {
      bottom.dataset.cp3Nav = '1';
      bottom.setAttribute('aria-label', 'Coach mobile navigation');
      bottom.innerHTML = mobileNavMarkup();
      if (isPublicDemo()) {
        var settings = bottom.querySelector('a[href*="settings"]');
        if (settings) settings.remove();
      }
    }
  }

  function observeProfileContent() {
    var host = document.getElementById('profileContent');
    if (!host || state.observer) return;

    state.observer = new MutationObserver(function () {
      refreshCoachChrome();
      renderCoachProfile();
    });

    state.observer.observe(host, { childList: true, subtree: true });
  }

  function pollForProfile() {
    state.pollCount++;
    refreshCoachChrome();
    renderCoachProfile();
    if (!player() && state.pollCount < 60) {
      setTimeout(pollForProfile, 200);
    }
  }

  function init() {
    if (!isCoach()) return;
    document.body.classList.add('coach-player-profile-v3');
    observeProfileContent();
    refreshCoachChrome();
    pollForProfile();

    if (typeof window.maybeShowExperienceSwitcher === 'function') {
      window.maybeShowExperienceSwitcher();
    }
  }

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('resize', refreshCoachChrome);
})();
