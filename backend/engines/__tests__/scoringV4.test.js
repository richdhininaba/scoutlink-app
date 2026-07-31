'use strict';

/** Target path: backend/engines/__tests__/scoringV4.test.js */

const test = require('node:test');
const assert = require('node:assert/strict');
const engines = require('../index');

const NOW = new Date('2026-07-31T12:00:00Z');

function playerFor(position, ageGroup = 'U13', alternatives = []) {
  const group = engines.utils.getPositionGroup(position);
  const keys = engines.utils.attributesForGroup(group);
  return {
    id: `fixture-${position}`,
    age_group: ageGroup,
    primary_position: position,
    positions: [position, ...alternatives],
    alternative_positions: alternatives,
    attribute_rating_scale: 'ten',
    attribute_assessed_at: '2026-07-20T12:00:00Z',
    attribute_ratings: Object.fromEntries(keys.map((key, index) => [key, index % 7 === 0 ? 10 : 8]))
  };
}

function matchesFor(position, count = 6) {
  return Array.from({ length: count }, (_, index) => ({
    match_date: `2026-0${Math.min(index + 2, 7)}-15T12:00:00Z`,
    minutes_played: 70,
    performance_score: index < 2 ? 8 : 9,
    confirmed: true,
    position_played: position,
    match_format: '9v9'
  }));
}

function requirementFor(position) {
  const requirements = {
    GK: { required_role: 'sweeper_keeper', playing_style: 'build_up_from_back', team_needs: ['goalkeeper_distribution'] },
    CB: { required_role: 'ball_playing_defender', playing_style: 'build_up_from_back', team_needs: ['aerial_security'] },
    CM: { required_role: 'controller', playing_style: 'possession', team_needs: ['pressure_resistance'] },
    ST: { required_role: 'advanced_forward', playing_style: 'high_press', team_needs: ['goal_output'] }
  };
  return {
    match_format: '9v9',
    formation: '3-3-2',
    target_position: position,
    ...requirements[position]
  };
}

test('configuration exposes 15 positions and goalkeepers do not receive general attributes', () => {
  const allPositions = Object.values(engines.config.POSITION_GROUPS).flat();
  assert.equal(allPositions.length, 15);
  assert.deepEqual(engines.utils.attributesForGroup('Goalkeeper'), engines.config.GOALKEEPER_ATTRIBUTES);
  assert.equal(engines.utils.attributesForGroup('Goalkeeper').includes('passing'), false);
  assert.equal(engines.utils.attributesForGroup('Attacker').includes('first_touch'), true);
  assert.equal(engines.utils.attributesForGroup('Attacker').includes('finishing'), true);
});

test('assessment schema is age-aware and sends no general section to a goalkeeper', () => {
  const goalkeeper = engines.buildAssessmentSchema('U13', 'GK');
  const underSevenGoalkeeper = engines.buildAssessmentSchema('U7', 'GK');
  const striker = engines.buildAssessmentSchema('U13', 'ST');
  assert.equal(goalkeeper.valid, true);
  assert.deepEqual(goalkeeper.sections.map(section => section.key), ['goalkeeper']);
  assert.equal(underSevenGoalkeeper.valid, true);
  assert.deepEqual(underSevenGoalkeeper.sections.map(section => section.key), ['goalkeeper']);
  assert.deepEqual(striker.sections.map(section => section.key), ['general', 'attacker']);
  assert.equal(striker.ratingOptions.length, 11);
  assert.match(striker.observationContext, /position and role/i);
});


test('new assessments accept whole numbers 1-10 and reject decimals or out-of-range values', () => {
  assert.equal(engines.utils.normaliseRating(1, 'ten'), 10);
  assert.equal(engines.utils.normaliseRating(10, 'ten'), 100);
  assert.equal(engines.utils.normaliseRating(7, 'ten'), 70);
  assert.equal(engines.utils.normaliseRating(7.5, 'ten'), null);
  assert.equal(engines.utils.normaliseRating(0, 'ten'), null);
  assert.equal(engines.utils.normaliseRating(11, 'ten'), null);
  assert.equal(engines.utils.normaliseRating(null, 'ten'), null);
});

for (const position of ['GK', 'CB', 'CM', 'ST']) {
  test(`${position} produces bounded overall, prediction, compatibility and value-index outputs`, () => {
    const player = playerFor(position);
    const result = engines.analysePlayer(
      player,
      requirementFor(position),
      matchesFor(position),
      {},
      { now: NOW }
    );
    assert.ok(result.overallRating >= 0 && result.overallRating <= 100);
    assert.ok(result.predictionScore >= 0 && result.predictionScore <= 100);
    assert.ok(result.compatibilityScore >= 0 && result.compatibilityScore <= 100);
    assert.ok(result.footballValueIndex >= 0 && result.footballValueIndex <= 100);
    assert.ok(result.compatibilityScore <= result.compatibility.estimatedScore);
    assert.equal(result.compatibilityScore, result.compatibility.likelyRange.minimum);
    assert.equal(result.compatibility.financialFit, null);
    assert.equal(result.compatibility.matchEvidenceFit, null);
    assert.equal(result.transferValue, null);
    assert.equal(result.predictedSalaryWeekly, null);
  });
}

test('currency remains null without verified market anchors', () => {
  const player = playerFor('ST');
  const analysis = engines.calculateValueAnalysis(player, matchesFor('ST'), { now: NOW });
  assert.ok(analysis.footballValueIndex > 0);
  assert.equal(analysis.value, null);
  assert.equal(analysis.currencyEstimateStatus, 'Not estimated');
});

test('verified market anchors enable a bounded currency estimate without changing the value index', () => {
  const player = playerFor('ST');
  const base = engines.calculateValueAnalysis(player, matchesFor('ST'), { now: NOW });
  const anchored = engines.calculateValueAnalysis(player, matchesFor('ST'), {
    now: NOW,
    marketContext: {
      verified: true,
      currency: 'GBP',
      minimum: 10000,
      median: 30000,
      maximum: 70000,
      source: 'Test-only verified comparable set'
    }
  });
  assert.equal(anchored.footballValueIndex, base.footballValueIndex);
  assert.ok(anchored.value >= 10000);
  assert.ok(anchored.value <= 87500);
  assert.equal(anchored.currency, 'GBP');
});

test('a team compatibility score requires an explicit supported role', () => {
  const player = playerFor('ST');
  const team = requirementFor('ST');
  delete team.required_role;
  const result = engines.calculateCompatibility(player, team, {}, matchesFor('ST'), { now: NOW });
  assert.equal(result.score, null);
  assert.match(result.noScoreReason, /required role/i);
});

test('U7 goalkeepers receive normal scoring and can use an explicit goalkeeper format', () => {
  const player = playerFor('GK', 'U7');
  const team = {
    match_format: '5v5',
    formation: '1-2-1',
    target_position: 'GK',
    required_role: 'goalkeeper',
    playing_style: 'possession',
    team_needs: ['goalkeeper_distribution']
  };
  const result = engines.analysePlayer(player, team, [], {}, { now: NOW });
  assert.ok(result.overallRating >= 0 && result.overallRating <= 100);
  assert.ok(result.predictionScore >= 0 && result.predictionScore <= 100);
  assert.ok(result.footballValueIndex >= 0 && result.footballValueIndex <= 100);
  assert.ok(result.compatibilityScore >= 0 && result.compatibilityScore <= 100);
  assert.match(result.compatibility.warnings.join(' '), /supplied 5v5 team format/i);
});

test('undeclared same-group position is speculative and receives no compatibility score', () => {
  const player = playerFor('ST');
  const team = {
    match_format: '9v9',
    formation: '3-3-2',
    target_position: 'CF',
    required_role: 'link_forward',
    playing_style: 'possession',
    team_needs: ['chance_creation']
  };
  const result = engines.calculateCompatibility(player, team, {}, matchesFor('ST'), { now: NOW });
  assert.equal(result.score, null);
  assert.equal(result.positionStatusKey, 'speculative');
});

test('declared cross-group position still requires the additional group assessment', () => {
  const player = playerFor('CB', 'U13', ['DM']);
  const team = {
    match_format: '9v9',
    formation: '4-3-1',
    target_position: 'DM',
    required_role: 'holding_midfielder',
    playing_style: 'possession',
    team_needs: ['pressure_resistance']
  };
  const result = engines.calculateCompatibility(player, team, {}, matchesFor('CB'), { now: NOW });
  assert.equal(result.score, null);
  assert.match(result.noScoreReason, /additional assessment|weighted attributes|critical role/i);
});

test('raw goals without a verified benchmark do not inflate current ability', () => {
  const player = playerFor('ST');
  const withoutEvents = engines.calculateOverallRating(player, [], { now: NOW });
  const rawGoalsOnly = engines.calculateOverallRating(player, [{
    match_date: '2026-07-20',
    minutes_played: 70,
    goals: 12,
    assists: 8,
    confirmed: true
  }], { now: NOW });
  assert.equal(rawGoalsOnly.overallRating, withoutEvents.overallRating);
  assert.match(rawGoalsOnly.matchPerformance.note, /not converted|No match-performance/i);
});

test('legacy scalar 0-100 attributes remain readable after nested v4 scale is added', () => {
  const legacy = {
    age_group: 'U13',
    primary_position: 'ST',
    positions: ['ST'],
    attribute_rating_scale: 'five',
    pace: 78,
    agility: 74,
    strength: 72,
    stamina: 76,
    composure: 82,
    shooting: 80,
    passing: 70,
    dribbling: 77,
    crossing: 65,
    vision: 75,
    positioning: 81,
    heading: 73,
    jumping: 70
  };
  const result = engines.calculateOverallRating(legacy, [], { now: NOW });
  assert.ok(result.overallRating > 50);
  assert.ok(result.weightedAttributeCoverage >= 60);
});

test('legacy prediction scenario keys resolve to the new scenario catalogue', () => {
  const player = playerFor('ST');
  const result = engines.calculateScenarioPrediction(player, 'striker_isolated', matchesFor('ST'), { now: NOW });
  assert.equal(result.scenario, 'isolated_striker');
  assert.ok(result.score > 0);
});

test('legacy compatibility.js exports remain callable during route migration', () => {
  const compatibilityModule = require('../compatibility');
  assert.equal(typeof compatibilityModule.analysePlayer, 'function');
  assert.equal(typeof compatibilityModule.computeOverall, 'function');
  assert.equal(typeof compatibilityModule.transferValue, 'function');
  assert.equal(typeof compatibilityModule.predictedSalary, 'function');
  assert.ok(compatibilityModule.ROLE_WEIGHTS.ST.finishing > 0);
  assert.equal(compatibilityModule.getPosGroup(['ST', 'CF']), 'Forward');
  assert.equal(compatibilityModule.ageFromPlayer({ age_group: 'U13' }), 13);
});
