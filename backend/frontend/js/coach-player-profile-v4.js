'use strict';

/*
 * ScoutLink Coach player profile V8 literal production renderer.
 *
 * The markup follows page 17 of the supplied Coach Experience V8 design.
 * One renderer is shared by the real Coach experience, public Coach demo and
 * Stratex Admin Coach preview.
 */
(function () {
  var state = {
    renderedPlayerId: '',
    escapeBound: false,
    pollCount: 0
  };

  var POSITION_GROUPS = {
    Goalkeeper: ['GK'],
    Defender: ['CB', 'BPD', 'RB', 'LB', 'RWB', 'LWB'],
    Midfielder: ['CDM', 'CM', 'B2B', 'CAM'],
    Forward: ['LW', 'RW', 'CF', 'ST', 'SS']
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
    very_short: { label: 'Very short', range: '155–163 cm', min: 155, max: 163 },
    short: { label: 'Short', range: '163–170 cm', min: 163, max: 170 },
    average: { label: 'Average', range: '170–178 cm', min: 170, max: 178 },
    tall: { label: 'Tall', range: '178–185 cm', min: 178, max: 185 },
    very_tall: { label: 'Very tall', range: '185+ cm', min: 185, max: 200 }
  };

  var BUILDS = {
    very_slight: { label: 'Very slight', range: '50–58 kg', min: 50, max: 58 },
    slight: { label: 'Slight', range: '58–65 kg', min: 58, max: 65 },
    lean: { label: 'Lean', range: '65–72 kg', min: 65, max: 72 },
    athletic: { label: 'Athletic', range: '72–80 kg', min: 72, max: 80 },
    stocky: { label: 'Stocky', range: '80–88 kg', min: 80, max: 88 },
    powerful: { label: 'Powerful', range: '88–96 kg', min: 88, max: 96 },
    very_powerful: { label: 'Very powerful', range: '96+ kg', min: 96, max: 120 }
  };

  var OUTFIELD_ATTRIBUTES = [
    'pace', 'agility', 'strength', 'stamina', 'shooting', 'passing',
    'dribbling', 'defending', 'composure', 'crossing', 'vision',
    'positioning', 'heading', 'tackling', 'jumping'
  ];

  var GOALKEEPER_ATTRIBUTES = [
    'pace', 'agility', 'strength', 'stamina', 'jumping', 'composure',
    'gk_diving', 'gk_reflexes', 'gk_handling', 'gk_positioning',
    'gk_kicking', 'gk_distribution', 'gk_communication', 'gk_sweeping'
  ];

  var ATTRIBUTE_LABELS = {
    pace: 'Pace',
    agility: 'Agility',
    strength: 'Strength',
    stamina: 'Stamina',
    shooting: 'Shooting',
    passing: 'Passing',
    dribbling: 'Dribbling',
    defending: 'Defending',
    composure: 'Composure',
    crossing: 'Crossing',
    vision: 'Vision',
    positioning: 'Positioning',
    heading: 'Heading',
    tackling: 'Tackling',
    jumping: 'Jumping',
    gk_diving: 'Diving',
    gk_reflexes: 'Reflexes',
    gk_handling: 'Handling',
    gk_positioning: 'GK positioning',
    gk_kicking: 'Kicking',
    gk_distribution: 'Distribution',
    gk_communication: 'Communication',
    gk_sweeping: 'Sweeping'
  };

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

  function storageValue(storage, key) {
    try {
      return storage.getItem(key) || '';
    } catch (_) {
      return '';
    }
  }

  function normaliseRole(value) {
    var role = String(value || '').trim().toLowerCase();
    if (role === 'coach') return 'Coach';
    if (role === 'scout') return 'Scout';
    if (role === 'player') return 'Player';
    if (role === 'stratex' || role === 'admin') return 'Stratex';
    return '';
  }

  function activeRole() {
    var context = window.__SCOUTLINK_PROFILE_CONTEXT__ || {};
    var candidates = [
      context.role,
      storageValue(sessionStorage, 'sl_public_demo_role'),
      storageValue(sessionStorage, 'demoRole'),
      storageValue(sessionStorage, 'sl_admin_demo_role'),
      storageValue(sessionStorage, 'sl_preview_role'),
      storageValue(sessionStorage, 'sl_active_experience'),
      storageValue(sessionStorage, 'selectedExperience'),
      storageValue(localStorage, 'sl_demo_role'),
      storageValue(localStorage, 'sl_active_experience'),
      storageValue(localStorage, 'selectedExperience'),
      window.Auth && window.Auth.type,
      storageValue(localStorage, 'sl_type')
    ];

    for (var index = 0; index < candidates.length; index += 1) {
      var role = normaliseRole(candidates[index]);
      if (role) return role;
    }
    return '';
  }

  function isCoachContext() {
    return activeRole() === 'Coach';
  }

  function isDemoContext() {
    var context = window.__SCOUTLINK_PROFILE_CONTEXT__ || {};
    return !!(
      context.demo ||
      storageValue(sessionStorage, 'sl_public_demo') === '1' ||
      storageValue(localStorage, 'sl_demo_mode') === '1' ||
      storageValue(sessionStorage, 'demoRole') ||
      storageValue(sessionStorage, 'sl_admin_demo_role') ||
      storageValue(sessionStorage, 'sl_preview_role')
    );
  }

  function route(href) {
    return typeof window.cleanRouteFor === 'function'
      ? window.cleanRouteFor(href)
      : href;
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

  function playerName(record) {
    return (((record && record.first_name) || '') + ' ' + ((record && record.last_name) || '')).trim() || 'Player';
  }

  function initials(record) {
    var parts = playerName(record).split(/\s+/).filter(Boolean);
    return ((parts[0] || 'P').charAt(0) + (parts[1] || parts[0] || 'L').charAt(0)).toUpperCase();
  }

  function positionLabel(value) {
    var key = String(value || '').trim().toUpperCase();
    return POSITION_LABELS[key] || String(value || 'Position TBC');
  }

  function sentence(value) {
    return String(value || 'Not recorded')
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, function (character) { return character.toUpperCase(); });
  }

  function score100(value) {
    var number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.min(100, Math.round(number > 10 ? number : number * 10)));
  }

  function score10(value) {
    var number = Number(value);
    if (!Number.isFinite(number)) return '--';
    var converted = number > 10 ? number / 10 : number;
    return converted % 1 === 0 ? converted.toFixed(1) : converted.toFixed(1);
  }

  function money(value) {
    var number = Number(value) || 0;
    return number
      ? '£' + number.toLocaleString('en-GB', { maximumFractionDigits: 0 })
      : 'Calculating…';
  }

  function dateObject(value) {
    if (!value) return null;
    var date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function dateLabel(value, options) {
    var date = dateObject(value);
    if (!date) return value ? String(value).slice(0, 10) : 'Not recorded';
    return date.toLocaleDateString('en-GB', options || {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  function ownerName(record) {
    var direct = record.profile_owner_name || record.owner_name || record.assigned_coach_name;
    if (direct) return direct;
    var user = (window.Auth && window.Auth.user) || {};
    var authName = ((user.firstName || user.first_name || '') + ' ' + (user.lastName || user.last_name || '')).trim();
    if (authName) return authName;
    return isDemoContext() ? 'Marcus Reed' : 'Coach';
  }

  function performanceBand(score) {
    if (score >= 90) return 'Elite grassroots';
    if (score >= 80) return 'Excellent';
    if (score >= 70) return 'Strong';
    if (score >= 55) return 'Promising';
    return 'Developing';
  }

  function confidenceInfo(count) {
    var total = Number(count) || 0;
    if (total < 1) return {
      label: 'No evidence',
      score: 0,
      note: 'No current Match Facts support the rating.'
    };
    if (total < 5) return {
      label: 'Low',
      score: Math.min(48, total * 12),
      note: total + ' current Match Fact' + (total === 1 ? '' : 's') + ' support the rating.'
    };
    if (total < 10) return {
      label: 'Medium',
      score: Math.min(78, 50 + total * 3),
      note: total + ' current Match Facts support the rating.'
    };
    return {
      label: 'High',
      score: Math.min(100, 78 + Math.min(22, total)),
      note: total + ' current Match Facts support the rating.'
    };
  }

  function profileCompletion(record) {
    var core = [
      'first_name', 'last_name', 'age_group', 'position_group',
      'specific_position', 'foot', 'height_category', 'build_category',
      'overall_rating', 'transfer_value'
    ];
    var completeCore = core.filter(function (key) {
      return record[key] !== null && record[key] !== undefined && String(record[key]).trim() !== '';
    }).length;
    var keys = String(record.position_group || '').toLowerCase() === 'goalkeeper'
      ? GOALKEEPER_ATTRIBUTES
      : OUTFIELD_ATTRIBUTES;
    var completeAttributes = keys.filter(function (key) {
      return record[key] !== null && record[key] !== undefined && String(record[key]).trim() !== '';
    }).length;
    var score = Math.round((completeCore / core.length) * 58);
    score += Math.round((completeAttributes / Math.max(1, keys.length)) * 24);
    if (matches().length) score += 10;
    if (playableVideos().length) score += 8;
    return Math.max(0, Math.min(100, score));
  }

  function completionNote(percent) {
    if (!playableVideos().length) return 'Add one approved video to strengthen visibility.';
    if (matches().length < 5) return 'Add recent Match Facts to strengthen confidence.';
    if (percent < 90) return 'Complete the remaining player details.';
    return 'The profile is ready for regular review.';
  }

  function profileAnalysis() {
    var source = analysis();
    return source && typeof source === 'object' ? source : {};
  }

  function breakdown(record) {
    var source = profileAnalysis();
    return source.overallBreakdown || source.overall_breakdown || record.overallBreakdown || record.overall_breakdown || {};
  }

  function positionData(record) {
    var source = profileAnalysis();
    return source.positionRatings || source.position_ratings || record.positionRatings || record.position_ratings || {};
  }

  function firstFinite(values, fallback) {
    for (var index = 0; index < values.length; index += 1) {
      var number = Number(values[index]);
      if (Number.isFinite(number)) return score100(number);
    }
    return score100(fallback);
  }

  function roleValue(source, keys, fallback) {
    for (var index = 0; index < keys.length; index += 1) {
      var value = source && source[keys[index]];
      if (value && typeof value === 'object') {
        return value.label || value.name || value.role || value.position || fallback;
      }
      if (value) return value;
    }
    return fallback;
  }

  function roleScore(source, keys, fallback) {
    for (var index = 0; index < keys.length; index += 1) {
      var value = source && source[keys[index]];
      if (value && typeof value === 'object') {
        var nested = value.score || value.rating || value.fit || value.value;
        if (Number.isFinite(Number(nested))) return score100(nested);
      }
    }
    return score100(fallback);
  }

  function currentAndFutureRoles(record) {
    var positions = positionData(record);
    var currentFallback = record.specific_position || record.primary_position || record.position_group;
    var current = roleValue(positions, [
      'bestCurrentRole', 'best_current_role', 'bestCurrentPosition',
      'best_current_position', 'currentRole', 'current_role'
    ], currentFallback);
    var future = roleValue(positions, [
      'bestFutureRole', 'best_future_role', 'bestFuturePosition',
      'best_future_position', 'futureRole', 'future_role'
    ], current);
    var overall = score100(record.overall_rating);
    return {
      current: positionLabel(current),
      future: positionLabel(future),
      currentScore: roleScore(positions, ['bestCurrentRole', 'best_current_role'], Math.min(100, overall + 4)),
      futureScore: roleScore(positions, ['bestFutureRole', 'best_future_role'], Math.min(100, overall + 7))
    };
  }

  function positionCards(record) {
    var positions = positionData(record);
    var maps = [
      positions.ratings,
      positions.scores,
      positions.positionScores,
      positions.position_scores,
      positions.byPosition,
      positions.by_position
    ];
    var rows = [];
    maps.forEach(function (map) {
      if (!map || typeof map !== 'object' || Array.isArray(map)) return;
      Object.keys(map).forEach(function (key) {
        var value = map[key];
        var score = value && typeof value === 'object'
          ? value.score || value.rating || value.fit || value.value
          : value;
        if (!Number.isFinite(Number(score))) return;
        rows.push({
          label: positionLabel(key),
          score: score100(score)
        });
      });
    });

    var roles = currentAndFutureRoles(record);
    if (!rows.length) {
      var currentKey = record.specific_position || record.primary_position || 'ST';
      var group = POSITION_GROUPS[record.position_group] || [currentKey];
      rows = [
        { label: positionLabel(currentKey), score: roles.currentScore },
        { label: roles.future, score: roles.futureScore }
      ];
      group.forEach(function (key, index) {
        if (rows.length >= 4) return;
        if (rows.some(function (row) { return row.label === positionLabel(key); })) return;
        rows.push({ label: positionLabel(key), score: Math.max(45, roles.currentScore - 4 - index * 3) });
      });
    }

    var deduped = [];
    rows.sort(function (a, b) { return b.score - a.score; }).forEach(function (row) {
      if (deduped.some(function (existing) { return existing.label === row.label; })) return;
      deduped.push(row);
    });

    return deduped.slice(0, 4);
  }

  function avatarMarkup(record) {
    if (typeof window.playerAvatarMarkup === 'function') {
      return window.playerAvatarMarkup(record, 64);
    }
    return esc(initials(record));
  }

  function playableVideos() {
    return videos().filter(function (video) {
      return !!(video && (video.video_url || video.url || video.playback_url || video.storage_url));
    });
  }

  function nextAction(record, completion) {
    var position = positionLabel(record.specific_position || record.primary_position || record.position_group).toLowerCase();
    if (matches().length < 5) {
      return {
        title: 'Add recent Match Facts before the next scout review.',
        body: playerName(record) + ' has ' + matches().length + ' current Match Fact' +
          (matches().length === 1 ? '' : 's') +
          '. Recent match evidence is the most important remaining confidence gap.',
        primaryLabel: 'Add Match Facts',
        primaryAction: 'match',
        secondaryLabel: fixtures().length ? 'Open next fixture' : 'Add next fixture',
        secondaryAction: 'fixture'
      };
    }
    if (!playableVideos().length) {
      return {
        title: 'Strong current ' + position + ' profile. Add video before the next scout review.',
        body: playerName(record) +
          ' has repeated match output, clear current-role evidence and a useful evidence base. The missing approved video is the most important remaining gap.',
        primaryLabel: 'Generate video link',
        primaryAction: 'upload',
        secondaryLabel: fixtures().length ? 'Open next fixture' : 'Add next fixture',
        secondaryAction: 'fixture'
      };
    }
    if (!fixtures().length) {
      return {
        title: 'Add the next fixture to keep the profile current.',
        body: 'The player has useful evidence and approved video, but no upcoming evidence opportunity is connected to the profile.',
        primaryLabel: 'Add next fixture',
        primaryAction: 'fixture',
        secondaryLabel: 'Review Match Facts',
        secondaryAction: 'match'
      };
    }
    if (completion < 90) {
      return {
        title: 'Complete the remaining profile detail before the next review.',
        body: 'The evidence is useful. Complete the remaining football and physical information so every important section is ready.',
        primaryLabel: 'Edit player profile',
        primaryAction: 'edit',
        secondaryLabel: 'Open next fixture',
        secondaryAction: 'fixture'
      };
    }
    return {
      title: 'Profile ready for regular review.',
      body: 'The rating, Match Facts, physical profile and approved video are all present. Keep the evidence current after each fixture.',
      primaryLabel: 'Add Match Facts',
      primaryAction: 'match',
      secondaryLabel: 'Open next fixture',
      secondaryAction: 'fixture'
    };
  }

  function actionButton(label, action, primary) {
    var tone = primary ? 'white' : 'ghost';
    return '<button class="btn ' + tone + '" type="button" data-profile-action="' +
      esc(action) + '">' + esc(label) + '</button>';
  }

  function ratingBar(label, value) {
    var score = score100(value);
    return '<div class="rating-bar"><span>' + esc(label) + '</span><i><em style="width:' +
      score + '%"></em></i><b>' + score + '</b></div>';
  }

  function attributeRows(record) {
    var keys = String(record.position_group || '').toLowerCase() === 'goalkeeper'
      ? GOALKEEPER_ATTRIBUTES
      : OUTFIELD_ATTRIBUTES;
    var available = keys.filter(function (key) {
      return Number.isFinite(Number(record[key]));
    });

    if (!available.length) {
      return '<div class="cpv8-empty"><b>No attributes recorded</b><p>Edit the profile to add Coach-rated attributes.</p></div>';
    }

    return available.map(function (key) {
      var value = Number(record[key]);
      var percentage = Math.max(0, Math.min(100, Math.round(value > 10 ? value : value * 10)));
      return '<div class="attribute-row"><span>' + esc(ATTRIBUTE_LABELS[key] || sentence(key)) +
        '</span><i><em style="width:' + percentage + '%"></em></i><b>' +
        esc(score10(value)) + '</b></div>';
    }).join('');
  }

  function statisticsMarkup(record) {
    var rows = [
      ['Appearances', record.appearances || 0],
      ['Goals', record.goals || 0],
      ['Assists', record.assists || 0],
      ['Clean sheets', record.clean_sheets || 0],
      ['Yellow cards', record.yellow_cards || 0],
      ['Red cards', record.red_cards || 0]
    ];
    return rows.map(function (row) {
      return '<div><strong>' + esc(row[1]) + '</strong><span>' + esc(row[0]) + '</span></div>';
    }).join('');
  }

  function heightInfo(record) {
    var preset = HEIGHTS[record.height_category] || {};
    return {
      label: sentence(record.height_category || preset.label || 'Not recorded'),
      range: record.height_range_cm || preset.range || 'Not recorded'
    };
  }

  function buildInfo(record) {
    var preset = BUILDS[record.build_category] || {};
    return {
      label: sentence(record.build_category || preset.label || 'Not recorded'),
      range: record.weight_range_kg || preset.range || 'Not recorded'
    };
  }

  function cmRangeToFeet(range) {
    if (typeof window.cmRangeToFeet === 'function') return window.cmRangeToFeet(range);
    var values = String(range || '').match(/\d+/g) || [];
    if (values.length < 2) return 'Not recorded';

    function convert(cm) {
      var inches = Number(cm) / 2.54;
      var feet = Math.floor(inches / 12);
      var remaining = Math.round(inches - feet * 12);
      if (remaining === 12) {
        feet += 1;
        remaining = 0;
      }
      return feet + "'" + remaining + '"';
    }

    return convert(values[0]) + '–' + convert(values[1]);
  }

  function resultType(match) {
    var raw = String(match.result || '').toLowerCase();
    if (raw === 'win' || raw === 'w') return 'WIN';
    if (raw === 'loss' || raw === 'l') return 'LOSS';
    if (raw === 'draw' || raw === 'd') return 'DRAW';
    if (match.home_score != null && match.away_score != null) {
      var home = Number(match.home_score);
      var away = Number(match.away_score);
      if (home > away) return 'WIN';
      if (home < away) return 'LOSS';
      return 'DRAW';
    }
    return 'MATCH';
  }

  function matchRows() {
    var rows = matches().slice(0, 5);
    if (!rows.length) {
      return '<div class="cpv8-empty"><b>No Match Facts yet</b><p>Add the latest match evidence to strengthen the profile.</p></div>';
    }
    return rows.map(function (match, index) {
      var result = resultType(match);
      var score = match.home_score == null || match.away_score == null
        ? 'Score not entered'
        : match.home_score + '–' + match.away_score;
      var performance = firstFinite([
        match.performance_score,
        match.performance_rating,
        match.overall_rating
      ], 0);
      var goals = Number(match.goals) || 0;
      var assists = Number(match.assists) || 0;
      var format = match.format || match.match_format || 'Match';
      return '<button class="history-row cpv8-history-button" type="button" data-match-detail="' + index + '">' +
        '<span class="result-pill' + (result === 'DRAW' ? ' draw' : '') + '">' + esc(result) + '</span>' +
        '<div><b>' + esc(match.opponent_name || match.opponent || match.opposition || 'Opponent') + '</b>' +
        '<small>' + esc(dateLabel(match.match_date || match.date, { day: '2-digit', month: 'short' })) +
        ' · ' + esc(score) + ' · ' + esc(format) + '</small></div>' +
        '<div class="history-output">Perf ' + performance + '<br>' + goals + 'G · ' + assists + 'A</div></button>';
    }).join('');
  }

  function fixtureRows() {
    var rows = fixtures().slice(0, 4);
    if (!rows.length) {
      return '<div class="cpv8-empty"><b>No upcoming fixtures</b><p>Add the next fixture to show the next evidence opportunity.</p></div>';
    }
    return rows.map(function (fixture, index) {
      var date = dateObject(fixture.fixture_date || fixture.date);
      var day = date ? date.toLocaleDateString('en-GB', { day: '2-digit' }) : '--';
      var month = date ? date.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase() : 'TBC';
      var location = fixture.venue_name || fixture.venue || fixture.venue_address || 'Venue TBC';
      var time = fixture.kickoff_time || fixture.time || 'Time TBC';
      var homeAway = fixture.home_or_away || fixture.home_away || 'Fixture';
      var countdown = '';
      if (date) {
        var days = Math.ceil((date.getTime() - Date.now()) / 86400000);
        countdown = days >= 0 ? (days === 0 ? 'Today' : 'In ' + days + ' day' + (days === 1 ? '' : 's')) : '';
      }
      return '<button class="mobile-profile-fixture-card cpv8-fixture-button" type="button" data-fixture-detail="' + index + '">' +
        '<div class="mobile-fixture-date"><b>' + esc(day) + '</b><span>' + esc(month) + '</span></div>' +
        '<div class="mobile-fixture-copy"><small>' + esc(homeAway) + '</small><h4>' +
        esc(fixture.opponent || fixture.opposition || 'Opponent') + '</h4><p>' +
        esc(time) + ' · ' + esc(location) + '</p>' +
        (countdown ? '<span class="mobile-fixture-countdown">' + esc(countdown) + '</span>' : '') +
        '</div></button>';
    }).join('');
  }

  function videoRows() {
    var rows = playableVideos();
    if (!rows.length) {
      return '<div class="cpv8-empty"><b>No approved video yet</b><p>Generate a private upload link when the player, parent or guardian is ready.</p></div>';
    }
    return '<div class="profile-video-grid">' + rows.map(function (video, index) {
      return '<button class="profile-video-card cpv8-video-button" type="button" data-video-index="' + index + '">' +
        '<div class="video-thumb"><span>▶</span></div><div><b>' +
        esc(video.title || 'Player video') + '</b><span>' +
        esc(video.category || video.type || 'Approved evidence') + '</span></div></button>';
    }).join('') + '</div>';
  }

  function editModal(record) {
    var ageOptions = Array.from({ length: 10 }, function (_, index) { return 'U' + (index + 7); })
      .map(function (age) {
        return '<option' + (age === record.age_group ? ' selected' : '') + '>' + age + '</option>';
      }).join('');
    var groupOptions = Object.keys(POSITION_GROUPS).map(function (group) {
      return '<option value="' + group + '"' + (group === record.position_group ? ' selected' : '') + '>' +
        group + '</option>';
    }).join('');
    var footOptions = ['Right', 'Left', 'Both'].map(function (foot) {
      return '<option' + (String(record.foot || '').toLowerCase() === foot.toLowerCase() ? ' selected' : '') +
        '>' + foot + '</option>';
    }).join('');
    var heightOptions = Object.keys(HEIGHTS).map(function (key) {
      return '<option value="' + key + '"' + (key === record.height_category ? ' selected' : '') + '>' +
        HEIGHTS[key].label + ' · ' + HEIGHTS[key].range + '</option>';
    }).join('');
    var buildOptions = Object.keys(BUILDS).map(function (key) {
      return '<option value="' + key + '"' + (key === record.build_category ? ' selected' : '') + '>' +
        BUILDS[key].label + ' · ' + BUILDS[key].range + '</option>';
    }).join('');
    var keys = String(record.position_group || '').toLowerCase() === 'goalkeeper'
      ? GOALKEEPER_ATTRIBUTES
      : OUTFIELD_ATTRIBUTES;
    var fields = keys.map(function (key) {
      var raw = Number(record[key]);
      var value = Number.isFinite(raw) ? (raw > 10 ? raw / 10 : raw) : '';
      return '<label><span>' + esc(ATTRIBUTE_LABELS[key] || sentence(key)) + ' / 10</span>' +
        '<input id="cpv8-' + key + '" type="number" min="0" max="10" step="0.1" value="' +
        esc(value) + '"></label>';
    }).join('');

    return '<div class="cpv8-modal" id="cpv8EditModal" aria-hidden="true"><section class="cpv8-dialog" role="dialog" aria-modal="true" aria-labelledby="cpv8EditTitle">' +
      '<header><h2 id="cpv8EditTitle">Edit player profile</h2><button class="btn secondary" type="button" data-close-edit>Close</button></header>' +
      '<form id="cpv8EditForm"><div class="cpv8-modal-body"><h3>Player and football details</h3>' +
      '<div class="cpv8-form-grid">' +
      '<label><span>First name</span><input id="cpv8FirstName" required value="' + esc(record.first_name || '') + '"></label>' +
      '<label><span>Last name</span><input id="cpv8LastName" required value="' + esc(record.last_name || '') + '"></label>' +
      '<label><span>Age group</span><select id="cpv8AgeGroup">' + ageOptions + '</select></label>' +
      '<label><span>Position group</span><select id="cpv8PositionGroup">' + groupOptions + '</select></label>' +
      '<label><span>Specific position</span><select id="cpv8SpecificPosition"></select></label>' +
      '<label><span>Preferred foot</span><select id="cpv8Foot">' + footOptions + '</select></label>' +
      '<label><span>Height profile</span><select id="cpv8Height">' + heightOptions + '</select></label>' +
      '<label><span>Build profile</span><select id="cpv8Build">' + buildOptions + '</select></label>' +
      '</div><h3>Coach-rated attributes</h3><div class="cpv8-form-grid cpv8-attributes">' + fields +
      '</div></div><footer><span id="cpv8EditStatus" aria-live="polite"></span>' +
      '<button class="btn secondary" type="button" data-close-edit>Cancel</button>' +
      '<button class="btn primary" id="cpv8SaveProfile" type="submit">Save profile</button></footer></form></section></div>';
  }

  function render() {
    if (!isCoachContext()) return;
    var record = player();
    var host = document.getElementById('profileContent');
    if (!record || !host) return;
    if (state.renderedPlayerId === String(record.id || '') && host.querySelector('.coach-profile-v8')) return;

    state.renderedPlayerId = String(record.id || '');
    document.body.classList.remove('coach-player-profile-v3', 'coach-player-profile-v4');
    document.body.classList.add('coach-player-profile-v8');
    document.body.setAttribute('data-profile-renderer', 'coach-v8-literal');

    var overall = score100(record.overall_rating);
    var performance = performanceBand(overall);
    var evidence = matches().length;
    var confidence = confidenceInfo(evidence);
    var completion = profileCompletion(record);
    var team = record.team || {};
    var teamName = record.team_name || team.team_name || team.name || 'Team TBC';
    var position = positionLabel(record.specific_position || record.primary_position || record.position_group);
    var rating = breakdown(record);
    var readiness = firstFinite([
      rating.currentReadiness,
      rating.current_readiness,
      rating.readinessScore,
      rating.readiness_score
    ], overall);
    var potential = firstFinite([
      rating.potentialRating,
      rating.potential_rating,
      rating.potentialScore,
      rating.potential_score
    ], Math.min(100, overall + 7));
    var roles = currentAndFutureRoles(record);
    var action = nextAction(record, completion);
    var height = heightInfo(record);
    var build = buildInfo(record);
    var appearances = Number(record.appearances) || 0;
    var goals = Number(record.goals) || 0;
    var assists = Number(record.assists) || 0;
    var cleanSheets = Number(record.clean_sheets) || 0;
    var denominator = Math.max(1, appearances);

    var componentRows = [
      ['Technical', firstFinite([rating.technicalScore, rating.technical_score], overall)],
      ['Tactical IQ', firstFinite([rating.tacticalIQScore, rating.tactical_iq_score], overall)],
      ['Physical profile', firstFinite([rating.physicalProfileScore, rating.physical_profile_score], overall)],
      ['Mental / coachability', firstFinite([rating.mentalCoachabilityScore, rating.mental_coachability_score], overall)],
      ['Match output', firstFinite([rating.matchOutputScore, rating.match_output_score], overall)],
      ['Discipline', firstFinite([rating.disciplineScore, rating.discipline_score], Math.max(0, 100 - (Number(record.yellow_cards) || 0) * 5 - (Number(record.red_cards) || 0) * 15))],
      ['Availability', firstFinite([rating.availabilityScore, rating.availability_score], appearances ? Math.min(100, 70 + appearances) : 50)],
      ['Data confidence', firstFinite([rating.dataConfidenceScore, rating.data_confidence_score], confidence.score)]
    ].map(function (item) { return ratingBar(item[0], item[1]); }).join('');

    var positions = positionCards(record).map(function (item, index) {
      var label = index === 0 ? 'Best current' : index === 1 ? 'Strong fit' : index === 2 ? 'Secondary' : 'Future option';
      return '<article class="position-card"><small>' + esc(item.label) + '</small><strong>' +
        item.score + '</strong><span>' + label + '</span></article>';
    }).join('');

    host.className = '';
    host.innerHTML = '<article class="coach-profile-v8">' +
      '<section class="profile-hero"><div><div class="profile-identity"><span class="avatar-square">' +
      avatarMarkup(record) + '</span><div><h2>' + esc(playerName(record)) + '</h2><p>' +
      esc(position) + ' · ' + esc(record.age_group || 'Age group TBC') + ' · ' + esc(teamName) +
      '</p><div class="profile-tags"><span>Overall ' + overall + '/100</span><span>' +
      esc(record.foot || 'Foot TBC') + ' foot</span><span>' + esc(performance) +
      '</span><span>Profile owner: ' + esc(ownerName(record)) + '</span></div></div></div>' +
      '<div class="profile-actions"><div class="button-row">' +
      '<button class="btn white" type="button" data-profile-action="edit">Edit player profile</button>' +
      '<button class="btn ghost" type="button" data-profile-action="upload">Generate upload link</button>' +
      '<a class="btn ghost" href="' + esc(route('/coach/match-facts?playerId=' + encodeURIComponent(record.id))) +
      '">Add Match Facts</a></div></div></div><div class="profile-value"><strong>' +
      esc(money(record.transfer_value)) + '</strong><span>Estimated transfer value</span></div></section>' +

      '<section class="profile-overview">' +
      '<article><small>Overall match performance</small><strong>' + overall + ' / 100</strong><p>' +
      esc(performance) + ' grassroots performance profile.</p></article>' +
      '<article><small>Data confidence</small><strong>' + esc(confidence.label) + '</strong><p>' +
      esc(confidence.note) + '</p></article>' +
      '<article><small>Evidence base</small><strong>' + evidence + '</strong><p>Recorded matches used in the profile.</p></article>' +
      '<article><small>Profile completion</small><strong>' + completion + '%</strong><p>' +
      esc(completionNote(completion)) + '</p></article></section>' +

      '<section class="next-action-band"><div><span>Verdict and next action</span><h3>' +
      esc(action.title) + '</h3><p>' + esc(action.body) + '</p></div><div class="button-row">' +
      actionButton(action.primaryLabel, action.primaryAction, true) +
      actionButton(action.secondaryLabel, action.secondaryAction, false) + '</div></section>' +

      '<section class="profile-section rating-section"><header class="card-head"><div><h3>Overall rating breakdown</h3>' +
      '<p>Position-aware analysis using coach ratings, Match Facts, physical context, discipline and evidence confidence.</p></div>' +
      '<span class="status-pill good">' + esc(record.age_group || 'Age group') + ' · ' +
      esc(record.position_group || 'Position') + '</span></header>' +
      '<div class="rating-snapshot">' +
      '<article><small>Final score</small><strong>' + overall + ' / 100</strong><p>Headline ScoutLink overall.</p></article>' +
      '<article><small>Current readiness</small><strong>' + readiness + ' / 100</strong><p>How ready the player is now.</p></article>' +
      '<article><small>Potential rating</small><strong>' + potential + ' / 100</strong><p>Development upside and age runway.</p></article>' +
      '<article><small>Data confidence</small><strong>' + esc(confidence.label) + '</strong><p>' +
      esc(confidence.note) + '</p></article></div>' +
      '<div class="role-summary"><article><small>Best current role</small><strong>' +
      esc(roles.current) + '</strong><span>' + roles.currentScore + ' / 100 role fit</span></article>' +
      '<article><small>Best future role</small><strong>' + esc(roles.future) +
      '</strong><span>' + roles.futureScore + ' / 100 projected fit</span></article></div>' +
      '<div class="rating-analysis"><section><h4>Score components</h4><div class="breakdown-list">' +
      componentRows + '</div></section><section><h4>Position ratings</h4><div class="position-grid">' +
      positions + '</div><div class="conditional-note"><b>Position fit remains coach-visible</b>' +
      '<p>The analysis supports development and profile quality. Scout team compatibility is calculated separately inside the scout workspace.</p></div></section></div></section>' +

      '<section class="per-game-row"><article><strong>' + (goals / denominator).toFixed(2) +
      '</strong><span>Goals per game</span></article><article><strong>' + (assists / denominator).toFixed(2) +
      '</strong><span>Assists per game</span></article><article><strong>' + (cleanSheets / denominator).toFixed(2) +
      '</strong><span>Clean sheets per game</span></article></section>' +

      '<div class="profile-detail-grid"><section class="profile-section" id="profileAttributes">' +
      '<header class="card-head"><div><h3>All attributes</h3><p>Coach-rated from 1–10.</p></div>' +
      '<button class="btn secondary" type="button" data-profile-action="attributes">Update</button></header>' +
      '<div class="attribute-list">' + attributeRows(record) + '</div></section><div class="form-stack">' +
      '<section class="profile-section"><header class="card-head"><div><h3>Match statistics</h3>' +
      '<p>Current recorded output.</p></div></header><div class="stat-grid">' +
      statisticsMarkup(record) + '</div></section>' +
      '<section class="profile-section"><header class="card-head"><div><h3>Physical profile</h3>' +
      '<p>Ranges rather than exact measurements.</p></div><button class="btn secondary" type="button" data-profile-action="physical">Edit</button></header>' +
      '<div class="physical-grid"><div><small>Profile type</small><b>' + esc(height.label) +
      ' height · ' + esc(build.label) + ' build</b></div><div><small>Height range</small><b>' +
      esc(height.range) + '</b></div><div><small>Feet / inches</small><b>' +
      esc(cmRangeToFeet(height.range)) + '</b></div><div><small>Build</small><b>' +
      esc(build.label) + '</b></div><div><small>Weight range</small><b>' +
      esc(build.range) + '</b></div><div><small>Age group</small><b>' +
      esc(record.age_group || 'Not recorded') + '</b></div></div></section></div></div>' +

      '<div class="history-grid"><section class="profile-section"><header class="card-head"><div><h3>Last five Match Facts</h3>' +
      '<p>Open a match to see the recorded detail.</p></div><a class="btn secondary" href="' +
      esc(route('/coach/match-facts?playerId=' + encodeURIComponent(record.id))) +
      '">Add Match Facts</a></header><div>' + matchRows() + '</div></section>' +
      '<section class="profile-section mobile-profile-fixtures-section"><header class="card-head"><div><h3>Upcoming fixtures</h3>' +
      '<p>The player’s next opportunities to add current match evidence.</p></div></header>' +
      '<div class="mobile-profile-fixture-list">' + fixtureRows() + '</div>' +
      '<footer class="mobile-profile-fixtures-action"><a class="btn secondary" href="' +
      esc(route('/coach/fixtures')) + '">Manage fixtures</a></footer></section></div>' +

      '<section class="profile-section" id="profileVideo"><header class="card-head"><div><h3>Video reels</h3>' +
      '<p>Approved clips connected to this player profile.</p></div></header>' +
      '<div class="upload-link-panel"><div><h4>Private video upload link</h4>' +
      '<p>Generate a link for the player or an authorised parent to upload through an approved team channel. No ScoutLink account is needed.</p></div>' +
      '<div class="button-row"><button class="btn primary" type="button" data-profile-action="upload">Generate upload link</button></div></div>' +
      '<div id="cpv8UploadResult" class="cpv8-upload-result" hidden></div>' +
      videoRows() + '</section>' + editModal(record) + '</article>';

    installEvents(record);
  }

  function getValue(id) {
    var element = document.getElementById(id);
    return element ? element.value : '';
  }

  function updatePositionOptions(record) {
    var group = document.getElementById('cpv8PositionGroup');
    var select = document.getElementById('cpv8SpecificPosition');
    if (!group || !select) return;
    var current = String(record.specific_position || record.primary_position || '').toUpperCase();
    select.innerHTML = (POSITION_GROUPS[group.value] || []).map(function (key) {
      return '<option value="' + key + '"' + (key === current ? ' selected' : '') + '>' +
        esc(POSITION_LABELS[key]) + '</option>';
    }).join('');
  }

  function openEdit(record, focus) {
    var modal = document.getElementById('cpv8EditModal');
    if (!modal) return;
    updatePositionOptions(record);
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    var target = focus === 'attributes'
      ? document.querySelector('.cpv8-attributes input')
      : focus === 'physical'
        ? document.getElementById('cpv8Height')
        : document.getElementById('cpv8FirstName');
    if (target) setTimeout(function () { target.focus(); }, 20);
  }

  function closeEdit() {
    var modal = document.getElementById('cpv8EditModal');
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function updateDemoRecord(record, payload) {
    if (typeof window.getDemoState !== 'function' || typeof window.setDemoState !== 'function') return null;
    try {
      var demoState = window.getDemoState();
      var index = (demoState.players || []).findIndex(function (row) {
        return String(row.id) === String(record.id);
      });
      if (index < 0) return null;
      Object.assign(demoState.players[index], payload, { updated_at: new Date().toISOString() });
      window.setDemoState(demoState);
      return demoState.players[index];
    } catch (_) {
      return null;
    }
  }

  function buildPayload(record) {
    var group = getValue('cpv8PositionGroup');
    var heightKey = getValue('cpv8Height');
    var buildKey = getValue('cpv8Build');
    var height = HEIGHTS[heightKey] || {};
    var build = BUILDS[buildKey] || {};
    var payload = {
      first_name: getValue('cpv8FirstName').trim(),
      last_name: getValue('cpv8LastName').trim(),
      ageGroup: getValue('cpv8AgeGroup'),
      age_group: getValue('cpv8AgeGroup'),
      position_group: group,
      specific_position: getValue('cpv8SpecificPosition') || null,
      primary_position: getValue('cpv8SpecificPosition') || null,
      positions: getValue('cpv8SpecificPosition') ? [getValue('cpv8SpecificPosition')] : [],
      foot: getValue('cpv8Foot'),
      height_category: heightKey,
      height_range_cm: height.range || null,
      height_min_cm: height.min || null,
      height_max_cm: height.max || null,
      build_category: buildKey,
      weight_range_kg: build.range || null,
      weight_min_kg: build.min || null,
      weight_max_kg: build.max || null
    };
    var keys = String(group || '').toLowerCase() === 'goalkeeper'
      ? GOALKEEPER_ATTRIBUTES
      : OUTFIELD_ATTRIBUTES;
    keys.forEach(function (key) {
      var raw = getValue('cpv8-' + key);
      payload[key] = raw === '' ? null : Number(raw);
    });
    return payload;
  }

  async function saveProfile(record, event) {
    event.preventDefault();
    var status = document.getElementById('cpv8EditStatus');
    var button = document.getElementById('cpv8SaveProfile');
    var payload = buildPayload(record);
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
      var updated = null;
      if (isDemoContext()) updated = updateDemoRecord(record, payload);
      if (!updated) {
        var response = await window.api('PUT', '/api/players/' + encodeURIComponent(record.id), payload);
        var body = response && response.data ? response.data : response;
        updated = body && body.player ? body.player : body;
      }
      if (updated) window._profilePlayer = Object.assign({}, record, updated);
      state.renderedPlayerId = '';
      closeEdit();
      render();
    } catch (error) {
      if (status) status.textContent = error && error.message ? error.message : 'The profile could not be saved.';
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = 'Save profile';
      }
    }
  }

  async function generateUploadLink(record) {
    var output = document.getElementById('cpv8UploadResult');
    if (!output) return;
    output.hidden = false;
    output.innerHTML = '<b>Generating private upload link…</b>';
    try {
      var url = '';
      if (isDemoContext()) {
        url = window.location.origin + '/video-upload?demo=1&player=' + encodeURIComponent(record.id);
      } else {
        var response = await window.api('POST', '/api/videos/upload-link', { playerId: record.id });
        var body = response && response.data ? response.data : response;
        url = body.uploadUrl || body.url || '';
        if (!url) throw new Error('The upload link was not returned.');
      }
      output.innerHTML = '<b>' + (isDemoContext() ? 'Demo upload link' : 'Private upload link') +
        '</b><div class="cpv8-upload-copy"><input readonly value="' + esc(url) +
        '"><button class="btn primary" type="button" data-copy-upload>Copy link</button></div>';
      var copy = output.querySelector('[data-copy-upload]');
      var input = output.querySelector('input');
      if (copy && input) {
        copy.addEventListener('click', async function () {
          try {
            await navigator.clipboard.writeText(input.value);
          } catch (_) {
            input.select();
            document.execCommand('copy');
          }
          copy.textContent = 'Copied';
        });
      }
      output.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (error) {
      output.innerHTML = '<b>Upload link unavailable</b><p>' +
        esc(error && error.message ? error.message : 'The upload link could not be generated.') + '</p>';
    }
  }

  function handleAction(record, action) {
    if (action === 'edit') {
      openEdit(record, '');
      return;
    }
    if (action === 'attributes') {
      openEdit(record, 'attributes');
      return;
    }
    if (action === 'physical') {
      openEdit(record, 'physical');
      return;
    }
    if (action === 'upload') {
      generateUploadLink(record);
      return;
    }
    if (action === 'match') {
      window.location.href = route('/coach/match-facts?playerId=' + encodeURIComponent(record.id));
      return;
    }
    if (action === 'fixture') {
      if (fixtures().length && typeof window.openFixtureDetail === 'function') {
        window.openFixtureDetail(0);
      } else {
        window.location.href = route('/coach/fixtures');
      }
    }
  }

  function installEvents(record) {
    document.querySelectorAll('[data-profile-action]').forEach(function (button) {
      button.addEventListener('click', function () {
        handleAction(record, button.getAttribute('data-profile-action') || '');
      });
    });
    document.querySelectorAll('[data-close-edit]').forEach(function (button) {
      button.addEventListener('click', closeEdit);
    });
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
    var form = document.getElementById('cpv8EditForm');
    if (form) form.addEventListener('submit', function (event) { saveProfile(record, event); });
    var group = document.getElementById('cpv8PositionGroup');
    if (group) group.addEventListener('change', function () {
      record.specific_position = '';
      updatePositionOptions(record);
    });
    updatePositionOptions(record);
    var modal = document.getElementById('cpv8EditModal');
    if (modal) modal.addEventListener('click', function (event) {
      if (event.target === modal) closeEdit();
    });
    if (!state.escapeBound) {
      state.escapeBound = true;
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') closeEdit();
      });
    }
  }

  function poll() {
    if (!isCoachContext()) return;
    state.pollCount += 1;
    render();
    if (!player() && state.pollCount < 80) setTimeout(poll, 200);
  }

  function init() {
    if (!isCoachContext()) return;
    document.body.classList.add('coach-player-profile-v8');
    poll();
  }

  document.addEventListener('scoutlink:profile-ready', function (event) {
    var detail = event.detail || {};
    if (normaliseRole(detail.role) === 'Coach') {
      state.renderedPlayerId = '';
      render();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}());
