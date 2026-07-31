'use strict';

/**
 * Target path: backend/engines/scoringConfig.js
 * ScoutLink scoring engine v4 configuration.
 *
 * Coach-entered ratings use whole numbers from 1 to 10. Internal 0-100
 * values are calculation values only. Goalkeepers use goalkeeper attributes
 * only and never complete the outfield General section.
 */

const SCORING_VERSION = 'v4.0.0';
const ATTRIBUTE_RUBRIC_VERSION = '2026-07-31';

const RATING_OPTIONS = Object.freeze([
  { value: 1, label: 'Very limited', internalScore: 10 },
  { value: 2, label: 'Limited', internalScore: 20 },
  { value: 3, label: 'Early development', internalScore: 30 },
  { value: 4, label: 'Below age expectation', internalScore: 40 },
  { value: 5, label: 'Developing', internalScore: 50 },
  { value: 6, label: 'Age-appropriate', internalScore: 60 },
  { value: 7, label: 'Good', internalScore: 70 },
  { value: 8, label: 'Strong', internalScore: 80 },
  { value: 9, label: 'Excellent', internalScore: 90 },
  { value: 10, label: 'Exceptional', internalScore: 100 },
  { value: null, label: 'Not observed', internalScore: null }
]);

const TEN_POINT_RATING_GUIDANCE = Object.freeze({
  1: 'Very limited in the observed context and requires substantial support.',
  2: 'Limited and rarely effective in the observed context.',
  3: 'At an early development stage and effective only in favourable moments.',
  4: 'Below the expected standard and inconsistent under realistic pressure.',
  5: 'Developing towards the expected standard but not yet reliable.',
  6: 'Age-appropriate and generally functional in the observed role.',
  7: 'Good and regularly effective in the observed role.',
  8: 'Strong, repeatable and effective under realistic pressure.',
  9: 'Excellent and consistently influences the game at the assessed level.',
  10: 'Exceptional, repeatable and clearly differentiating across suitable contexts.'
});

const POSITION_GROUPS = Object.freeze({
  Goalkeeper: ['GK'],
  Defender: ['RB', 'CB', 'LB', 'RWB', 'LWB'],
  Midfielder: ['DM', 'CM', 'AM', 'RM', 'LM'],
  Attacker: ['RW', 'LW', 'CF', 'ST']
});

const POSITION_LABELS = Object.freeze({
  GK: 'Goalkeeper',
  RB: 'Right-back',
  CB: 'Centre-back',
  LB: 'Left-back',
  RWB: 'Right wing-back',
  LWB: 'Left wing-back',
  DM: 'Defensive midfielder',
  CM: 'Central midfielder',
  AM: 'Attacking midfielder',
  RM: 'Right midfielder',
  LM: 'Left midfielder',
  RW: 'Right winger',
  LW: 'Left winger',
  CF: 'Centre-forward',
  ST: 'Striker'
});

const POSITION_ALIASES = Object.freeze({
  CDM: 'DM', CAM: 'AM', RCM: 'CM', LCM: 'CM', RDM: 'DM', LDM: 'DM',
  RAM: 'AM', LAM: 'AM', LS: 'ST', RS: 'ST', SS: 'CF', B2B: 'CM',
  BPD: 'CB', RCB: 'CB', LCB: 'CB', SW: 'CB'
});

const GENERAL_ATTRIBUTES = Object.freeze([
  'first_touch', 'passing', 'dribbling', 'weak_foot', 'awareness',
  'decision_making', 'pace', 'agility_balance', 'strength', 'stamina',
  'composure', 'coachability', 'response_to_mistakes'
]);

const GOALKEEPER_ATTRIBUTES = Object.freeze([
  'gk_positioning', 'gk_shot_stopping', 'gk_reflexes', 'gk_handling',
  'gk_one_v_one', 'gk_aerial_command', 'gk_sweeping', 'gk_distribution',
  'gk_communication', 'gk_decision_making', 'gk_composure',
  'gk_agility_explosiveness'
]);

const DEFENDER_ATTRIBUTES = Object.freeze([
  'one_v_one_defending', 'tackling', 'defensive_positioning',
  'marking_covering', 'anticipation_interceptions', 'aerial_defending',
  'recovery_defending', 'pressing_defensive_transition',
  'communication_organisation', 'progression_from_defence',
  'crossing_attacking_support'
]);

const MIDFIELDER_ATTRIBUTES = Object.freeze([
  'receiving_under_pressure', 'ball_retention', 'progressive_passing',
  'long_passing_switching', 'tempo_control', 'chance_creation',
  'anticipation_interceptions', 'defensive_positioning_covering',
  'pressing_counter_pressing', 'off_ball_movement_box_arrivals'
]);

const ATTACKER_ATTRIBUTES = Object.freeze([
  'finishing', 'shooting', 'attacking_movement', 'one_v_one_attacking',
  'runs_in_behind', 'chance_creation', 'crossing', 'link_up_play',
  'hold_up_play', 'aerial_ability', 'pressing_from_front'
]);

const ATTRIBUTE_GROUPS = Object.freeze({
  general: GENERAL_ATTRIBUTES,
  goalkeeper: GOALKEEPER_ATTRIBUTES,
  defender: DEFENDER_ATTRIBUTES,
  midfielder: MIDFIELDER_ATTRIBUTES,
  attacker: ATTACKER_ATTRIBUTES
});

const ATTRIBUTE_DEFINITIONS = Object.freeze({
  first_touch: { label: 'First touch and ball control', category: 'technical' },
  passing: { label: 'Passing', category: 'technical' },
  dribbling: { label: 'Dribbling and ball carrying', category: 'technical' },
  weak_foot: { label: 'Weak-foot ability', category: 'technical' },
  awareness: { label: 'Scanning and awareness', category: 'tacticalCognitive' },
  decision_making: { label: 'Decision-making', category: 'tacticalCognitive' },
  pace: { label: 'Pace', category: 'physical' },
  agility_balance: { label: 'Agility and balance', category: 'physical' },
  strength: { label: 'Strength in physical contact', category: 'physical' },
  stamina: { label: 'Stamina and repeat intensity', category: 'physical' },
  composure: { label: 'Composure under pressure', category: 'mentalDevelopmental' },
  coachability: { label: 'Coachability', category: 'mentalDevelopmental' },
  response_to_mistakes: { label: 'Response to mistakes and setbacks', category: 'mentalDevelopmental' },

  gk_positioning: { label: 'Positioning and angles', category: 'tacticalCognitive' },
  gk_shot_stopping: { label: 'Shot-stopping', category: 'technical' },
  gk_reflexes: { label: 'Reflexes', category: 'physical' },
  gk_handling: { label: 'Handling', category: 'technical' },
  gk_one_v_one: { label: 'One-vers-one goalkeeping', category: 'technical' },
  gk_aerial_command: { label: 'Aerial command', category: 'technical' },
  gk_sweeping: { label: 'Sweeping behind the defence', category: 'tacticalCognitive' },
  gk_distribution: { label: 'Distribution', category: 'technical' },
  gk_communication: { label: 'Communication and organisation', category: 'mentalDevelopmental' },
  gk_decision_making: { label: 'Decision-making', category: 'tacticalCognitive' },
  gk_composure: { label: 'Composure', category: 'mentalDevelopmental' },
  gk_agility_explosiveness: { label: 'Agility and explosiveness', category: 'physical' },

  one_v_one_defending: { label: 'One-vers-one defending', category: 'technical' },
  tackling: { label: 'Tackling', category: 'technical' },
  defensive_positioning: { label: 'Defensive positioning', category: 'tacticalCognitive' },
  marking_covering: { label: 'Marking and covering', category: 'tacticalCognitive' },
  anticipation_interceptions: { label: 'Anticipation and interceptions', category: 'tacticalCognitive' },
  aerial_defending: { label: 'Aerial defending', category: 'technical' },
  recovery_defending: { label: 'Recovery defending', category: 'tacticalCognitive' },
  pressing_defensive_transition: { label: 'Pressing and defensive transitions', category: 'tacticalCognitive' },
  communication_organisation: { label: 'Communication and organisation', category: 'mentalDevelopmental' },
  progression_from_defence: { label: 'Progression from defence', category: 'technical' },
  crossing_attacking_support: { label: 'Crossing and attacking support', category: 'technical' },

  receiving_under_pressure: { label: 'Receiving under pressure', category: 'technical' },
  ball_retention: { label: 'Ball retention', category: 'technical' },
  progressive_passing: { label: 'Progressive passing', category: 'technical' },
  long_passing_switching: { label: 'Long passing and switching play', category: 'technical' },
  tempo_control: { label: 'Tempo control', category: 'tacticalCognitive' },
  chance_creation: { label: 'Chance creation and final pass', category: 'technical' },
  defensive_positioning_covering: { label: 'Defensive positioning and covering', category: 'tacticalCognitive' },
  pressing_counter_pressing: { label: 'Pressing and counter-pressing', category: 'tacticalCognitive' },
  off_ball_movement_box_arrivals: { label: 'Off-ball movement and box arrivals', category: 'tacticalCognitive' },

  finishing: { label: 'Finishing', category: 'technical' },
  shooting: { label: 'Shooting technique and range', category: 'technical' },
  attacking_movement: { label: 'Attacking movement', category: 'tacticalCognitive' },
  one_v_one_attacking: { label: 'One-vers-one attacking', category: 'technical' },
  runs_in_behind: { label: 'Runs in behind', category: 'tacticalCognitive' },
  crossing: { label: 'Crossing', category: 'technical' },
  link_up_play: { label: 'Link-up play', category: 'technical' },
  hold_up_play: { label: 'Hold-up play', category: 'technical' },
  aerial_ability: { label: 'Attacking aerial ability', category: 'technical' },
  pressing_from_front: { label: 'Pressing from the front', category: 'tacticalCognitive' }
});

/**
 * Transitional mapping only. A new attribute_ratings value always wins.
 * Each legacy source is normalised before the weighted blend is calculated.
 */
const LEGACY_ATTRIBUTE_MAP = Object.freeze({
  first_touch: [{ key: 'ball_control', weight: 1 }, { key: 'dribbling', weight: 0.45 }, { key: 'composure', weight: 0.25 }],
  passing: [{ key: 'passing', weight: 1 }],
  dribbling: [{ key: 'dribbling', weight: 1 }],
  weak_foot: [{ key: 'weak_foot', weight: 1 }, { key: 'weak_foot_ability', weight: 1 }],
  awareness: [{ key: 'awareness', weight: 1 }, { key: 'vision', weight: 0.65 }, { key: 'positioning', weight: 0.35 }],
  decision_making: [{ key: 'decision_making', weight: 1 }],
  pace: [{ key: 'pace', weight: 1 }],
  agility_balance: [{ key: 'agility', weight: 0.7 }, { key: 'balance', weight: 0.3 }],
  strength: [{ key: 'strength', weight: 1 }],
  stamina: [{ key: 'stamina', weight: 1 }],
  composure: [{ key: 'composure', weight: 1 }],
  coachability: [{ key: 'coachability', weight: 1 }],
  response_to_mistakes: [{ key: 'response_to_mistakes', weight: 1 }],

  gk_positioning: [{ key: 'gk_positioning', weight: 1 }],
  gk_shot_stopping: [{ key: 'gk_diving', weight: 0.55 }, { key: 'gk_reflexes', weight: 0.45 }],
  gk_reflexes: [{ key: 'gk_reflexes', weight: 1 }],
  gk_handling: [{ key: 'gk_handling', weight: 1 }],
  gk_one_v_one: [{ key: 'gk_one_v_one', weight: 1 }, { key: 'gk_reflexes', weight: 0.55 }, { key: 'gk_positioning', weight: 0.45 }],
  gk_aerial_command: [{ key: 'gk_aerial_command', weight: 1 }, { key: 'gk_handling', weight: 0.55 }, { key: 'gk_communication', weight: 0.45 }],
  gk_sweeping: [{ key: 'gk_sweeping', weight: 1 }],
  gk_distribution: [{ key: 'gk_distribution', weight: 0.65 }, { key: 'gk_kicking', weight: 0.35 }],
  gk_communication: [{ key: 'gk_communication', weight: 1 }],
  gk_decision_making: [{ key: 'gk_decision_making', weight: 1 }, { key: 'gk_positioning', weight: 0.55 }, { key: 'gk_communication', weight: 0.45 }],
  gk_composure: [{ key: 'gk_composure', weight: 1 }, { key: 'composure', weight: 1 }],
  gk_agility_explosiveness: [{ key: 'gk_agility_explosiveness', weight: 1 }, { key: 'agility', weight: 0.45 }, { key: 'gk_reflexes', weight: 0.55 }],

  one_v_one_defending: [{ key: 'one_v_one_defending', weight: 1 }, { key: 'defending', weight: 0.55 }, { key: 'tackling', weight: 0.45 }],
  tackling: [{ key: 'tackling', weight: 1 }],
  defensive_positioning: [{ key: 'defensive_positioning', weight: 1 }, { key: 'positioning', weight: 0.7 }, { key: 'defending', weight: 0.3 }],
  marking_covering: [{ key: 'marking_covering', weight: 1 }, { key: 'defending', weight: 0.55 }, { key: 'positioning', weight: 0.45 }],
  anticipation_interceptions: [{ key: 'anticipation_interceptions', weight: 1 }, { key: 'interceptions', weight: 0.6 }, { key: 'vision', weight: 0.4 }],
  aerial_defending: [{ key: 'aerial_defending', weight: 1 }, { key: 'heading', weight: 0.5 }, { key: 'jumping', weight: 0.3 }, { key: 'positioning', weight: 0.2 }],
  recovery_defending: [{ key: 'recovery_defending', weight: 1 }, { key: 'pace', weight: 0.55 }, { key: 'positioning', weight: 0.45 }],
  pressing_defensive_transition: [{ key: 'pressing_defensive_transition', weight: 1 }, { key: 'stamina', weight: 0.45 }, { key: 'defending', weight: 0.3 }, { key: 'positioning', weight: 0.25 }],
  communication_organisation: [{ key: 'communication_organisation', weight: 1 }],
  progression_from_defence: [{ key: 'progression_from_defence', weight: 1 }, { key: 'passing', weight: 0.6 }, { key: 'dribbling', weight: 0.4 }],
  crossing_attacking_support: [{ key: 'crossing_attacking_support', weight: 1 }, { key: 'crossing', weight: 0.75 }, { key: 'stamina', weight: 0.25 }],

  receiving_under_pressure: [{ key: 'receiving_under_pressure', weight: 1 }, { key: 'composure', weight: 0.4 }, { key: 'dribbling', weight: 0.35 }, { key: 'passing', weight: 0.25 }],
  ball_retention: [{ key: 'ball_retention', weight: 1 }, { key: 'composure', weight: 0.4 }, { key: 'passing', weight: 0.35 }, { key: 'dribbling', weight: 0.25 }],
  progressive_passing: [{ key: 'progressive_passing', weight: 1 }, { key: 'passing', weight: 0.65 }, { key: 'vision', weight: 0.35 }],
  long_passing_switching: [{ key: 'long_passing_switching', weight: 1 }, { key: 'passing', weight: 0.6 }, { key: 'vision', weight: 0.4 }],
  tempo_control: [{ key: 'tempo_control', weight: 1 }, { key: 'composure', weight: 0.4 }, { key: 'vision', weight: 0.35 }, { key: 'passing', weight: 0.25 }],
  chance_creation: [{ key: 'chance_creation', weight: 1 }, { key: 'vision', weight: 0.55 }, { key: 'passing', weight: 0.45 }],
  defensive_positioning_covering: [{ key: 'defensive_positioning_covering', weight: 1 }, { key: 'positioning', weight: 0.55 }, { key: 'defending', weight: 0.45 }],
  pressing_counter_pressing: [{ key: 'pressing_counter_pressing', weight: 1 }, { key: 'stamina', weight: 0.45 }, { key: 'positioning', weight: 0.3 }, { key: 'defending', weight: 0.25 }],
  off_ball_movement_box_arrivals: [{ key: 'off_ball_movement_box_arrivals', weight: 1 }, { key: 'positioning', weight: 0.6 }, { key: 'stamina', weight: 0.4 }],

  finishing: [{ key: 'finishing', weight: 1 }, { key: 'shooting', weight: 0.7 }, { key: 'composure', weight: 0.3 }],
  shooting: [{ key: 'shooting', weight: 1 }],
  attacking_movement: [{ key: 'attacking_movement', weight: 1 }, { key: 'positioning', weight: 0.7 }, { key: 'vision', weight: 0.3 }],
  one_v_one_attacking: [{ key: 'one_v_one_attacking', weight: 1 }, { key: 'dribbling', weight: 0.6 }, { key: 'agility', weight: 0.25 }, { key: 'pace', weight: 0.15 }],
  runs_in_behind: [{ key: 'runs_in_behind', weight: 1 }, { key: 'pace', weight: 0.55 }, { key: 'positioning', weight: 0.45 }],
  crossing: [{ key: 'crossing', weight: 1 }],
  link_up_play: [{ key: 'link_up_play', weight: 1 }, { key: 'passing', weight: 0.45 }, { key: 'composure', weight: 0.3 }, { key: 'vision', weight: 0.25 }],
  hold_up_play: [{ key: 'hold_up_play', weight: 1 }, { key: 'strength', weight: 0.55 }, { key: 'composure', weight: 0.45 }],
  aerial_ability: [{ key: 'aerial_ability', weight: 1 }, { key: 'heading', weight: 0.55 }, { key: 'jumping', weight: 0.3 }, { key: 'strength', weight: 0.15 }],
  pressing_from_front: [{ key: 'pressing_from_front', weight: 1 }, { key: 'stamina', weight: 0.45 }, { key: 'pace', weight: 0.3 }, { key: 'positioning', weight: 0.25 }]
});

function profile(weights, critical) {
  return Object.freeze({ weights: Object.freeze(weights), critical: Object.freeze(critical) });
}

const POSITION_PROFILES = Object.freeze({
  GK: profile({ gk_positioning: 5, gk_shot_stopping: 6, gk_reflexes: 5, gk_handling: 5, gk_one_v_one: 4, gk_aerial_command: 4, gk_sweeping: 3, gk_distribution: 4, gk_communication: 3, gk_decision_making: 4, gk_composure: 3, gk_agility_explosiveness: 3 }, ['gk_positioning', 'gk_shot_stopping', 'gk_handling', 'gk_decision_making']),
  CB: profile({ first_touch: 2, passing: 2, awareness: 4, decision_making: 4, pace: 2, agility_balance: 2, strength: 4, stamina: 2, composure: 3, coachability: 1, response_to_mistakes: 2, one_v_one_defending: 5, tackling: 4, defensive_positioning: 5, marking_covering: 4, anticipation_interceptions: 4, aerial_defending: 4, recovery_defending: 3, pressing_defensive_transition: 2, communication_organisation: 3, progression_from_defence: 3 }, ['one_v_one_defending', 'defensive_positioning', 'marking_covering', 'anticipation_interceptions']),
  RB: profile({ first_touch: 2, passing: 3, dribbling: 2, awareness: 3, decision_making: 3, pace: 5, agility_balance: 4, strength: 2, stamina: 5, composure: 2, one_v_one_defending: 5, tackling: 4, defensive_positioning: 4, marking_covering: 3, anticipation_interceptions: 3, recovery_defending: 5, pressing_defensive_transition: 4, progression_from_defence: 4, crossing_attacking_support: 4 }, ['one_v_one_defending', 'recovery_defending', 'defensive_positioning', 'stamina']),
  LB: profile({ first_touch: 2, passing: 3, dribbling: 2, awareness: 3, decision_making: 3, pace: 5, agility_balance: 4, strength: 2, stamina: 5, composure: 2, one_v_one_defending: 5, tackling: 4, defensive_positioning: 4, marking_covering: 3, anticipation_interceptions: 3, recovery_defending: 5, pressing_defensive_transition: 4, progression_from_defence: 4, crossing_attacking_support: 4 }, ['one_v_one_defending', 'recovery_defending', 'defensive_positioning', 'stamina']),
  RWB: profile({ first_touch: 3, passing: 3, dribbling: 4, awareness: 3, decision_making: 3, pace: 5, agility_balance: 4, strength: 2, stamina: 6, composure: 2, one_v_one_defending: 4, tackling: 3, defensive_positioning: 3, recovery_defending: 5, pressing_defensive_transition: 4, progression_from_defence: 4, crossing_attacking_support: 5 }, ['stamina', 'pace', 'recovery_defending', 'crossing_attacking_support']),
  LWB: profile({ first_touch: 3, passing: 3, dribbling: 4, awareness: 3, decision_making: 3, pace: 5, agility_balance: 4, strength: 2, stamina: 6, composure: 2, one_v_one_defending: 4, tackling: 3, defensive_positioning: 3, recovery_defending: 5, pressing_defensive_transition: 4, progression_from_defence: 4, crossing_attacking_support: 5 }, ['stamina', 'pace', 'recovery_defending', 'crossing_attacking_support']),
  DM: profile({ first_touch: 4, passing: 4, dribbling: 2, awareness: 5, decision_making: 5, pace: 2, agility_balance: 3, strength: 3, stamina: 4, composure: 4, coachability: 1, response_to_mistakes: 2, receiving_under_pressure: 5, ball_retention: 5, progressive_passing: 4, long_passing_switching: 3, tempo_control: 4, anticipation_interceptions: 5, defensive_positioning_covering: 5, pressing_counter_pressing: 4, off_ball_movement_box_arrivals: 2 }, ['awareness', 'decision_making', 'receiving_under_pressure', 'ball_retention', 'defensive_positioning_covering']),
  CM: profile({ first_touch: 5, passing: 5, dribbling: 3, weak_foot: 2, awareness: 5, decision_making: 5, pace: 2, agility_balance: 3, strength: 2, stamina: 5, composure: 4, coachability: 1, response_to_mistakes: 2, receiving_under_pressure: 5, ball_retention: 5, progressive_passing: 5, long_passing_switching: 3, tempo_control: 5, chance_creation: 3, anticipation_interceptions: 3, defensive_positioning_covering: 3, pressing_counter_pressing: 4, off_ball_movement_box_arrivals: 4 }, ['first_touch', 'awareness', 'decision_making', 'receiving_under_pressure', 'ball_retention']),
  AM: profile({ first_touch: 5, passing: 5, dribbling: 4, weak_foot: 2, awareness: 5, decision_making: 5, pace: 3, agility_balance: 4, strength: 1, stamina: 3, composure: 5, coachability: 1, response_to_mistakes: 2, receiving_under_pressure: 5, ball_retention: 4, progressive_passing: 4, long_passing_switching: 2, tempo_control: 4, chance_creation: 6, pressing_counter_pressing: 3, off_ball_movement_box_arrivals: 5 }, ['first_touch', 'awareness', 'decision_making', 'receiving_under_pressure', 'chance_creation']),
  RM: profile({ first_touch: 4, passing: 4, dribbling: 4, weak_foot: 2, awareness: 4, decision_making: 4, pace: 4, agility_balance: 4, strength: 2, stamina: 5, composure: 3, receiving_under_pressure: 4, ball_retention: 3, progressive_passing: 3, long_passing_switching: 2, chance_creation: 4, defensive_positioning_covering: 3, pressing_counter_pressing: 4, off_ball_movement_box_arrivals: 4 }, ['decision_making', 'stamina', 'receiving_under_pressure', 'chance_creation']),
  LM: profile({ first_touch: 4, passing: 4, dribbling: 4, weak_foot: 2, awareness: 4, decision_making: 4, pace: 4, agility_balance: 4, strength: 2, stamina: 5, composure: 3, receiving_under_pressure: 4, ball_retention: 3, progressive_passing: 3, long_passing_switching: 2, chance_creation: 4, defensive_positioning_covering: 3, pressing_counter_pressing: 4, off_ball_movement_box_arrivals: 4 }, ['decision_making', 'stamina', 'receiving_under_pressure', 'chance_creation']),
  RW: profile({ first_touch: 4, passing: 3, dribbling: 6, weak_foot: 3, awareness: 4, decision_making: 4, pace: 6, agility_balance: 5, strength: 1, stamina: 4, composure: 4, finishing: 4, shooting: 3, attacking_movement: 5, one_v_one_attacking: 6, runs_in_behind: 5, chance_creation: 4, crossing: 5, link_up_play: 3, pressing_from_front: 3 }, ['pace', 'dribbling', 'one_v_one_attacking', 'attacking_movement']),
  LW: profile({ first_touch: 4, passing: 3, dribbling: 6, weak_foot: 3, awareness: 4, decision_making: 4, pace: 6, agility_balance: 5, strength: 1, stamina: 4, composure: 4, finishing: 4, shooting: 3, attacking_movement: 5, one_v_one_attacking: 6, runs_in_behind: 5, chance_creation: 4, crossing: 5, link_up_play: 3, pressing_from_front: 3 }, ['pace', 'dribbling', 'one_v_one_attacking', 'attacking_movement']),
  CF: profile({ first_touch: 5, passing: 4, dribbling: 4, weak_foot: 3, awareness: 5, decision_making: 5, pace: 3, agility_balance: 4, strength: 3, stamina: 3, composure: 5, finishing: 5, shooting: 4, attacking_movement: 5, one_v_one_attacking: 3, runs_in_behind: 3, chance_creation: 4, link_up_play: 6, hold_up_play: 4, aerial_ability: 2, pressing_from_front: 3 }, ['first_touch', 'decision_making', 'attacking_movement', 'finishing', 'link_up_play']),
  ST: profile({ first_touch: 4, passing: 2, dribbling: 3, weak_foot: 4, awareness: 4, decision_making: 4, pace: 4, agility_balance: 3, strength: 4, stamina: 3, composure: 6, finishing: 7, shooting: 5, attacking_movement: 6, one_v_one_attacking: 3, runs_in_behind: 5, chance_creation: 1, link_up_play: 4, hold_up_play: 4, aerial_ability: 4, pressing_from_front: 4 }, ['finishing', 'attacking_movement', 'composure', 'decision_making'])
});

function role(label, positions, weights, critical, focus = 'Balanced') {
  return Object.freeze({ label, positions: Object.freeze(positions), weights: Object.freeze(weights), critical: Object.freeze(critical), focus });
}

const ROLE_PROFILES = Object.freeze({
  goalkeeper: role('Goalkeeper', ['GK'], { gk_positioning: 6, gk_shot_stopping: 6, gk_handling: 5, gk_reflexes: 4, gk_one_v_one: 3, gk_decision_making: 4, gk_composure: 3 }, ['gk_positioning', 'gk_shot_stopping', 'gk_handling']),
  sweeper_keeper: role('Sweeper keeper', ['GK'], { gk_positioning: 5, gk_sweeping: 7, gk_one_v_one: 5, gk_distribution: 4, gk_decision_making: 6, gk_agility_explosiveness: 4, gk_communication: 3 }, ['gk_sweeping', 'gk_positioning', 'gk_decision_making']),
  ball_playing_keeper: role('Ball-playing keeper', ['GK'], { gk_distribution: 7, gk_positioning: 4, gk_handling: 3, gk_decision_making: 6, gk_composure: 5, gk_communication: 3, gk_shot_stopping: 4 }, ['gk_distribution', 'gk_decision_making', 'gk_composure']),
  area_commander: role('Area commander', ['GK'], { gk_aerial_command: 7, gk_handling: 5, gk_positioning: 5, gk_communication: 6, gk_decision_making: 4, gk_composure: 4, gk_agility_explosiveness: 2 }, ['gk_aerial_command', 'gk_positioning', 'gk_communication']),

  defender: role('Defender', ['CB'], { one_v_one_defending: 6, tackling: 5, defensive_positioning: 7, marking_covering: 6, anticipation_interceptions: 5, aerial_defending: 4, strength: 3, composure: 3 }, ['one_v_one_defending', 'defensive_positioning', 'marking_covering']),
  stopper: role('Stopper', ['CB'], { one_v_one_defending: 6, tackling: 7, defensive_positioning: 5, aerial_defending: 5, strength: 6, anticipation_interceptions: 4, composure: 2 }, ['tackling', 'one_v_one_defending', 'defensive_positioning']),
  covering_defender: role('Covering defender', ['CB'], { recovery_defending: 7, pace: 5, defensive_positioning: 7, anticipation_interceptions: 6, one_v_one_defending: 5, agility_balance: 3, communication_organisation: 3 }, ['recovery_defending', 'defensive_positioning', 'anticipation_interceptions']),
  ball_playing_defender: role('Ball-playing defender', ['CB'], { progression_from_defence: 7, passing: 5, first_touch: 4, composure: 5, decision_making: 5, defensive_positioning: 5, one_v_one_defending: 4, awareness: 4 }, ['progression_from_defence', 'decision_making', 'defensive_positioning']),
  wide_centre_back: role('Wide centre-back', ['CB'], { one_v_one_defending: 5, recovery_defending: 6, pace: 4, progression_from_defence: 5, pressing_defensive_transition: 4, defensive_positioning: 5, stamina: 3 }, ['one_v_one_defending', 'recovery_defending', 'defensive_positioning']),
  full_back: role('Full-back', ['RB', 'LB'], { one_v_one_defending: 7, defensive_positioning: 6, recovery_defending: 6, tackling: 5, pace: 5, stamina: 4, progression_from_defence: 3 }, ['one_v_one_defending', 'defensive_positioning', 'recovery_defending']),
  wing_back: role('Wing-back', ['RB', 'LB', 'RWB', 'LWB'], { stamina: 7, pace: 6, crossing_attacking_support: 6, progression_from_defence: 5, recovery_defending: 5, one_v_one_defending: 4, dribbling: 4, decision_making: 3 }, ['stamina', 'pace', 'crossing_attacking_support', 'recovery_defending']),
  inverted_full_back: role('Inverted full-back', ['RB', 'LB', 'RWB', 'LWB'], { progression_from_defence: 6, passing: 5, first_touch: 4, awareness: 5, decision_making: 6, defensive_positioning: 4, pressing_defensive_transition: 4, stamina: 3 }, ['decision_making', 'progression_from_defence', 'awareness']),
  attacking_wing_back: role('Attacking wing-back', ['RWB', 'LWB', 'RB', 'LB'], { stamina: 7, pace: 6, crossing_attacking_support: 7, dribbling: 5, progression_from_defence: 5, recovery_defending: 4, decision_making: 3 }, ['stamina', 'crossing_attacking_support', 'pace']),

  holding_midfielder: role('Holding midfielder', ['DM', 'CM'], { defensive_positioning_covering: 7, anticipation_interceptions: 6, ball_retention: 5, receiving_under_pressure: 5, decision_making: 6, awareness: 5, progressive_passing: 3, strength: 3 }, ['defensive_positioning_covering', 'decision_making', 'anticipation_interceptions']),
  ball_winning_midfielder: role('Ball-winning midfielder', ['DM', 'CM'], { pressing_counter_pressing: 7, anticipation_interceptions: 6, defensive_positioning_covering: 5, stamina: 6, strength: 4, decision_making: 4, ball_retention: 3 }, ['pressing_counter_pressing', 'anticipation_interceptions', 'stamina']),
  deep_lying_playmaker: role('Deep-lying playmaker', ['DM', 'CM'], { receiving_under_pressure: 6, ball_retention: 6, progressive_passing: 7, long_passing_switching: 6, tempo_control: 6, awareness: 5, decision_making: 6, composure: 4 }, ['receiving_under_pressure', 'progressive_passing', 'decision_making', 'tempo_control']),
  centre_half: role('Centre-half', ['DM'], { defensive_positioning_covering: 7, anticipation_interceptions: 5, ball_retention: 4, progressive_passing: 4, awareness: 5, decision_making: 5, strength: 3 }, ['defensive_positioning_covering', 'awareness', 'decision_making']),
  box_crasher: role('Box crasher', ['DM', 'CM'], { off_ball_movement_box_arrivals: 7, stamina: 6, decision_making: 4, finishing: 0, pressing_counter_pressing: 4, ball_retention: 3, progressive_passing: 3, composure: 4 }, ['off_ball_movement_box_arrivals', 'stamina', 'decision_making']),
  controller: role('Controller', ['CM'], { tempo_control: 7, receiving_under_pressure: 6, ball_retention: 7, progressive_passing: 6, awareness: 5, decision_making: 6, composure: 5, stamina: 3 }, ['tempo_control', 'ball_retention', 'decision_making']),
  box_to_box: role('Box-to-box midfielder', ['CM'], { stamina: 7, pressing_counter_pressing: 5, off_ball_movement_box_arrivals: 6, progressive_passing: 4, ball_retention: 4, decision_making: 4, strength: 3 }, ['stamina', 'off_ball_movement_box_arrivals', 'decision_making']),
  playmaker: role('Playmaker', ['CM', 'AM'], { chance_creation: 7, progressive_passing: 6, receiving_under_pressure: 6, awareness: 6, decision_making: 6, first_touch: 5, composure: 4, tempo_control: 4 }, ['chance_creation', 'awareness', 'decision_making', 'receiving_under_pressure']),
  half_winger: role('Half-winger', ['CM', 'AM'], { off_ball_movement_box_arrivals: 6, chance_creation: 5, receiving_under_pressure: 5, dribbling: 4, progressive_passing: 4, stamina: 4, decision_making: 4 }, ['off_ball_movement_box_arrivals', 'receiving_under_pressure', 'decision_making']),
  classic_ten: role('Classic 10', ['AM'], { chance_creation: 7, receiving_under_pressure: 6, first_touch: 6, awareness: 6, decision_making: 6, tempo_control: 5, composure: 5, dribbling: 4 }, ['chance_creation', 'first_touch', 'awareness', 'decision_making']),
  shadow_striker: role('Shadow striker', ['AM'], { off_ball_movement_box_arrivals: 7, chance_creation: 3, dribbling: 4, pace: 4, decision_making: 5, composure: 5, awareness: 4 }, ['off_ball_movement_box_arrivals', 'decision_making', 'composure']),
  pressing_ten: role('Pressing 10', ['AM'], { pressing_counter_pressing: 7, stamina: 6, off_ball_movement_box_arrivals: 4, decision_making: 5, awareness: 4, receiving_under_pressure: 4 }, ['pressing_counter_pressing', 'stamina', 'decision_making']),
  wide_midfielder: role('Wide midfielder', ['RM', 'LM'], { stamina: 6, pressing_counter_pressing: 5, defensive_positioning_covering: 4, chance_creation: 4, receiving_under_pressure: 4, pace: 4, decision_making: 4 }, ['stamina', 'decision_making', 'pressing_counter_pressing']),
  wide_playmaker_mid: role('Wide playmaker', ['RM', 'LM'], { chance_creation: 7, receiving_under_pressure: 5, progressive_passing: 5, awareness: 5, decision_making: 5, dribbling: 4, stamina: 3 }, ['chance_creation', 'awareness', 'decision_making']),
  inside_forward_mid: role('Inside forward', ['RM', 'LM'], { off_ball_movement_box_arrivals: 6, chance_creation: 4, dribbling: 5, pace: 5, decision_making: 5, receiving_under_pressure: 4, composure: 4 }, ['off_ball_movement_box_arrivals', 'dribbling', 'decision_making']),

  winger: role('Winger', ['RW', 'LW'], { one_v_one_attacking: 7, dribbling: 6, pace: 6, crossing: 6, attacking_movement: 4, chance_creation: 4, decision_making: 4, stamina: 3 }, ['one_v_one_attacking', 'pace', 'dribbling', 'crossing']),
  inside_forward: role('Inside forward', ['RW', 'LW'], { finishing: 6, attacking_movement: 6, one_v_one_attacking: 6, runs_in_behind: 5, shooting: 4, composure: 5, decision_making: 4, pace: 4 }, ['finishing', 'attacking_movement', 'one_v_one_attacking']),
  wide_playmaker: role('Wide playmaker', ['RW', 'LW'], { chance_creation: 7, link_up_play: 5, one_v_one_attacking: 4, first_touch: 5, awareness: 5, decision_making: 6, crossing: 4, composure: 4 }, ['chance_creation', 'decision_making', 'awareness']),
  transition_runner: role('Transition runner', ['RW', 'LW'], { pace: 7, runs_in_behind: 7, one_v_one_attacking: 5, attacking_movement: 5, composure: 4, stamina: 4, decision_making: 3 }, ['pace', 'runs_in_behind', 'attacking_movement']),
  false_nine: role('False 9', ['CF', 'ST'], { first_touch: 6, link_up_play: 7, passing: 5, awareness: 5, decision_making: 6, attacking_movement: 5, chance_creation: 4, composure: 4 }, ['first_touch', 'link_up_play', 'decision_making']),
  second_striker: role('Second striker', ['CF'], { finishing: 5, attacking_movement: 6, link_up_play: 5, chance_creation: 4, one_v_one_attacking: 4, composure: 5, decision_making: 5 }, ['attacking_movement', 'finishing', 'decision_making']),
  link_forward: role('Link forward', ['CF', 'ST'], { link_up_play: 7, hold_up_play: 6, first_touch: 5, passing: 4, awareness: 4, decision_making: 5, composure: 4 }, ['link_up_play', 'hold_up_play', 'decision_making']),
  advanced_forward: role('Advanced forward', ['CF', 'ST'], { finishing: 6, attacking_movement: 6, runs_in_behind: 6, pace: 5, composure: 5, one_v_one_attacking: 3, pressing_from_front: 3 }, ['finishing', 'attacking_movement', 'runs_in_behind']),
  poacher: role('Poacher', ['ST'], { finishing: 8, attacking_movement: 7, runs_in_behind: 5, composure: 6, first_touch: 4, decision_making: 4, agility_balance: 3 }, ['finishing', 'attacking_movement', 'composure']),
  target_forward: role('Target forward', ['ST'], { hold_up_play: 7, aerial_ability: 7, strength: 6, link_up_play: 5, first_touch: 4, attacking_movement: 4, composure: 4 }, ['hold_up_play', 'aerial_ability', 'strength']),
  pressing_forward: role('Pressing forward', ['ST'], { pressing_from_front: 8, stamina: 6, pace: 5, decision_making: 5, attacking_movement: 4, strength: 3, finishing: 3 }, ['pressing_from_front', 'stamina', 'decision_making'])
});

const POSITION_ROLES = Object.freeze({
  GK: ['goalkeeper', 'sweeper_keeper', 'ball_playing_keeper', 'area_commander'],
  CB: ['defender', 'stopper', 'covering_defender', 'ball_playing_defender', 'wide_centre_back'],
  RB: ['full_back', 'wing_back', 'inverted_full_back', 'attacking_wing_back'],
  LB: ['full_back', 'wing_back', 'inverted_full_back', 'attacking_wing_back'],
  RWB: ['wing_back', 'attacking_wing_back', 'inverted_full_back', 'full_back'],
  LWB: ['wing_back', 'attacking_wing_back', 'inverted_full_back', 'full_back'],
  DM: ['holding_midfielder', 'ball_winning_midfielder', 'deep_lying_playmaker', 'centre_half', 'box_crasher'],
  CM: ['controller', 'box_to_box', 'deep_lying_playmaker', 'playmaker', 'half_winger'],
  AM: ['playmaker', 'classic_ten', 'shadow_striker', 'pressing_ten', 'half_winger'],
  RM: ['wide_midfielder', 'wide_playmaker_mid', 'inside_forward_mid'],
  LM: ['wide_midfielder', 'wide_playmaker_mid', 'inside_forward_mid'],
  RW: ['winger', 'inside_forward', 'wide_playmaker', 'transition_runner'],
  LW: ['winger', 'inside_forward', 'wide_playmaker', 'transition_runner'],
  CF: ['false_nine', 'second_striker', 'link_forward', 'advanced_forward'],
  ST: ['poacher', 'advanced_forward', 'target_forward', 'false_nine', 'pressing_forward', 'link_forward']
});

const DEFAULT_ROLE_BY_POSITION = Object.freeze({
  GK: 'goalkeeper', CB: 'defender', RB: 'full_back', LB: 'full_back',
  RWB: 'wing_back', LWB: 'wing_back', DM: 'holding_midfielder',
  CM: 'controller', AM: 'playmaker', RM: 'wide_midfielder',
  LM: 'wide_midfielder', RW: 'winger', LW: 'winger',
  CF: 'link_forward', ST: 'advanced_forward'
});

const STYLE_PROFILES = Object.freeze({
  possession: { label: 'Possession-Based Play', weights: { first_touch: 5, passing: 6, awareness: 5, decision_making: 6, composure: 5, receiving_under_pressure: 5, ball_retention: 6, progressive_passing: 4, gk_distribution: 5, progression_from_defence: 4 } },
  build_up_from_back: { label: 'Build-Up from the Back', weights: { first_touch: 5, passing: 6, awareness: 5, decision_making: 6, composure: 5, receiving_under_pressure: 5, progression_from_defence: 6, gk_distribution: 6 } },
  counter_attack: { label: 'Counter-Attacking', weights: { pace: 6, decision_making: 5, awareness: 4, runs_in_behind: 6, progressive_passing: 4, progression_from_defence: 4, gk_distribution: 3, composure: 4 } },
  high_press: { label: 'High Press', weights: { stamina: 6, decision_making: 5, awareness: 4, pressing_from_front: 7, pressing_counter_pressing: 7, pressing_defensive_transition: 7, recovery_defending: 4, gk_sweeping: 4 } },
  low_block: { label: 'Low Block', weights: { defensive_positioning: 7, marking_covering: 6, anticipation_interceptions: 5, defensive_positioning_covering: 7, one_v_one_defending: 5, gk_positioning: 5, gk_aerial_command: 4, composure: 4 } },
  direct_play: { label: 'Direct Play', weights: { long_passing_switching: 5, progression_from_defence: 4, gk_distribution: 5, runs_in_behind: 5, hold_up_play: 6, aerial_ability: 5, strength: 4, decision_making: 4 } },
  wing_play: { label: 'Wing Play', weights: { pace: 5, dribbling: 5, one_v_one_attacking: 6, crossing: 7, crossing_attacking_support: 7, chance_creation: 4, stamina: 4 } },
  vertical_play: { label: 'Vertical Play', weights: { progressive_passing: 6, progression_from_defence: 5, runs_in_behind: 6, pace: 5, decision_making: 5, receiving_under_pressure: 4, link_up_play: 4 } },
  compact_defence: { label: 'Compact Defence', weights: { defensive_positioning: 7, marking_covering: 6, defensive_positioning_covering: 7, communication_organisation: 5, gk_communication: 5, anticipation_interceptions: 5, decision_making: 4 } }
});

const STYLE_ALIASES = Object.freeze({
  'Possession-Based Play': 'possession', 'Tiki-Taka': 'possession',
  'Build-Up from the Back': 'build_up_from_back',
  'Counter-Attacking': 'counter_attack', 'Counter Attack': 'counter_attack',
  'High Press': 'high_press', Gegenpressing: 'high_press',
  'Low Block': 'low_block', 'Direct Play': 'direct_play', 'Long Ball': 'direct_play',
  'Wing Play': 'wing_play', 'Vertical Play': 'vertical_play',
  'Compact Defence': 'compact_defence'
});

const TEAM_NEED_PROFILES = Object.freeze({
  goal_output: { label: 'Increase goal output', weights: { finishing: 7, shooting: 5, attacking_movement: 6, runs_in_behind: 4, composure: 5, off_ball_movement_box_arrivals: 5 } },
  chance_creation: { label: 'Improve chance creation', weights: { chance_creation: 7, awareness: 5, decision_making: 6, passing: 4, crossing: 4, link_up_play: 4 } },
  ball_progression: { label: 'Improve ball progression', weights: { progressive_passing: 6, progression_from_defence: 6, dribbling: 4, passing: 4, receiving_under_pressure: 5, decision_making: 5 } },
  pressure_resistance: { label: 'Improve ball retention under pressure', weights: { first_touch: 5, receiving_under_pressure: 7, ball_retention: 7, composure: 6, decision_making: 5, strength: 3 } },
  defensive_one_v_one: { label: 'Improve one-vers-one defending', weights: { one_v_one_defending: 8, tackling: 5, defensive_positioning: 5, recovery_defending: 4, decision_making: 4 } },
  defensive_transition: { label: 'Improve defensive transitions', weights: { recovery_defending: 7, pressing_defensive_transition: 7, pressing_counter_pressing: 6, pace: 4, stamina: 5, decision_making: 5 } },
  aerial_security: { label: 'Improve aerial security', weights: { aerial_defending: 7, gk_aerial_command: 6, defensive_positioning: 4, marking_covering: 4, strength: 3 } },
  press_effectiveness: { label: 'Improve press effectiveness', weights: { pressing_from_front: 7, pressing_counter_pressing: 7, pressing_defensive_transition: 7, stamina: 5, decision_making: 5 } },
  goalkeeper_distribution: { label: 'Improve goalkeeper distribution', weights: { gk_distribution: 8, gk_decision_making: 6, gk_composure: 5, gk_communication: 3 } },
  goalkeeper_command: { label: 'Improve goalkeeper command', weights: { gk_aerial_command: 7, gk_positioning: 6, gk_communication: 7, gk_decision_making: 5, gk_handling: 4 } },
  wide_threat: { label: 'Improve wide threat', weights: { one_v_one_attacking: 6, pace: 5, crossing: 7, crossing_attacking_support: 6, dribbling: 5, chance_creation: 4 } }
});

const TEAM_NEED_ALIASES = Object.freeze({
  'Poor Goal Output': 'goal_output', poor_goal_output: 'goal_output',
  'Low Team Chemistry and Leadership': 'chance_creation', lack_creativity: 'chance_creation',
  'Technical Deficiencies Under Pressure': 'pressure_resistance',
  technical_deficiencies_under_pressure: 'pressure_resistance',
  'Tactical Awareness Gaps': 'ball_progression', slow_build_up: 'ball_progression', slow_buildup: 'ball_progression',
  'Weak Defensive Base': 'defensive_one_v_one', 'Poor Defensive Output': 'defensive_one_v_one',
  weak_defensive_base: 'defensive_one_v_one', poor_defensive_output: 'defensive_one_v_one',
  weak_transitions: 'defensive_transition', 'Lack of Physical Presence': 'aerial_security', poor_aerial: 'aerial_security',
  poor_gk_distribution: 'goalkeeper_distribution', weak_left_flank: 'wide_threat', weak_right_flank: 'wide_threat'
});

const AGE_PHASES = Object.freeze({
  U7_U9: { min: 7, max: 9, label: 'Foundation Function Match', componentWeights: { formation: 0.10, role: 0.50, style: 0.10, need: 0.05, development: 0.25 }, maxMatchWeight: 0.10, predictionLabel: 'Development outlook', predictionConfidenceCeiling: 64, uncertaintyExtra: 7 },
  U10_U11: { min: 10, max: 11, label: 'Emerging Role Match', componentWeights: { formation: 0.15, role: 0.45, style: 0.15, need: 0.10, development: 0.15 }, maxMatchWeight: 0.12, predictionLabel: 'Development outlook', predictionConfidenceCeiling: 70, uncertaintyExtra: 5 },
  U12_U13: { min: 12, max: 13, label: 'Tactical Role Compatibility', componentWeights: { formation: 0.20, role: 0.42, style: 0.18, need: 0.10, development: 0.10 }, maxMatchWeight: 0.15, predictionLabel: 'Emerging potential', predictionConfidenceCeiling: 82, uncertaintyExtra: 3 },
  U14_U16: { min: 14, max: 16, label: 'Recruitment Compatibility', componentWeights: { formation: 0.20, role: 0.40, style: 0.20, need: 0.15, development: 0.05 }, maxMatchWeight: 0.18, predictionLabel: 'Recruitment potential', predictionConfidenceCeiling: 100, uncertaintyExtra: 2 }
});

const MATCH_FORMAT_BY_AGE = Object.freeze({
  U7: '3v3', U8: '5v5', U9: '5v5', U10: '7v7', U11: '7v7',
  U12: '9v9', U13: '9v9', U14: '11v11', U15: '11v11', U16: '11v11'
});

const DEFAULT_MATCH_MINUTES = Object.freeze({
  U7: 30, U8: 40, U9: 40, U10: 50, U11: 50,
  U12: 70, U13: 70, U14: 70, U15: 80, U16: 80
});

const FORMATION_POSITIONS = Object.freeze({
  '3v3': {
    '1-1-1': ['CB', 'CM', 'ST']
  },
  '5v5': {
    '1-2-1': ['GK', 'CB', 'RM', 'LM', 'ST'],
    '2-1-1': ['GK', 'RB', 'LB', 'CM', 'ST'],
    '1-1-2': ['GK', 'CB', 'CM', 'RW', 'LW']
  },
  '7v7': {
    '2-3-1': ['GK', 'RB', 'LB', 'RM', 'CM', 'LM', 'ST'],
    '3-2-1': ['GK', 'RB', 'CB', 'LB', 'CM', 'AM', 'ST'],
    '2-2-2': ['GK', 'RB', 'LB', 'CM', 'AM', 'CF', 'ST'],
    '3-1-2': ['GK', 'RB', 'CB', 'LB', 'CM', 'RW', 'LW']
  },
  '9v9': {
    '3-3-2': ['GK', 'RB', 'CB', 'LB', 'RM', 'CM', 'LM', 'CF', 'ST'],
    '3-4-1': ['GK', 'RB', 'CB', 'LB', 'RM', 'CM', 'AM', 'LM', 'ST'],
    '2-4-2': ['GK', 'RB', 'LB', 'RM', 'CM', 'AM', 'LM', 'CF', 'ST'],
    '4-3-1': ['GK', 'RB', 'CB', 'CB', 'LB', 'DM', 'CM', 'AM', 'ST']
  },
  '11v11': {
    '4-3-3': ['GK', 'RB', 'CB', 'CB', 'LB', 'DM', 'CM', 'AM', 'RW', 'ST', 'LW'],
    '4-2-3-1': ['GK', 'RB', 'CB', 'CB', 'LB', 'DM', 'CM', 'RW', 'AM', 'LW', 'ST'],
    '4-4-2': ['GK', 'RB', 'CB', 'CB', 'LB', 'RM', 'CM', 'CM', 'LM', 'CF', 'ST'],
    '3-5-2': ['GK', 'CB', 'CB', 'CB', 'RWB', 'DM', 'CM', 'AM', 'LWB', 'CF', 'ST'],
    '3-4-3': ['GK', 'CB', 'CB', 'CB', 'RWB', 'CM', 'CM', 'LWB', 'RW', 'ST', 'LW'],
    '4-1-4-1': ['GK', 'RB', 'CB', 'CB', 'LB', 'DM', 'RM', 'CM', 'CM', 'LM', 'ST'],
    '5-3-2': ['GK', 'RWB', 'CB', 'CB', 'CB', 'LWB', 'DM', 'CM', 'AM', 'CF', 'ST'],
    '5-4-1': ['GK', 'RWB', 'CB', 'CB', 'CB', 'LWB', 'RM', 'CM', 'CM', 'LM', 'ST']
  }
});

const NATURAL_ALTERNATIVES = Object.freeze({
  GK: [], RB: ['RWB'], LB: ['LWB'], RWB: ['RB'], LWB: ['LB'], CB: [],
  DM: ['CM'], CM: ['DM', 'AM'], AM: ['CM'], RM: ['RW'], LM: ['LW'],
  RW: ['RM'], LW: ['LM'], CF: ['ST'], ST: ['CF']
});

const ADJACENT_CONVERSIONS = Object.freeze({
  GK: [], RB: ['RM', 'CB'], LB: ['LM', 'CB'], RWB: ['RM', 'RW'], LWB: ['LM', 'LW'],
  CB: ['DM', 'RB', 'LB'], DM: ['CB', 'CM'], CM: ['DM', 'AM', 'RM', 'LM'],
  AM: ['CM', 'CF', 'RW', 'LW'], RM: ['RB', 'RWB', 'RW', 'CM'],
  LM: ['LB', 'LWB', 'LW', 'CM'], RW: ['RM', 'CF', 'ST'],
  LW: ['LM', 'CF', 'ST'], CF: ['AM', 'ST', 'RW', 'LW'], ST: ['CF', 'RW', 'LW']
});

const POSITION_TRANSFER_CEILINGS = Object.freeze({
  exact: 100,
  natural: 92,
  adjacent: 82,
  speculative: 72,
  incompatible: 0
});

const CONFIDENCE_BANDS = Object.freeze([
  { minimum: 85, label: 'Verified' },
  { minimum: 70, label: 'Strong' },
  { minimum: 50, label: 'Provisional' },
  { minimum: 0, label: 'Insufficient' }
]);

const OVERALL_BANDS = Object.freeze([
  { minimum: 90, label: 'Exceptional' },
  { minimum: 82, label: 'Outstanding' },
  { minimum: 74, label: 'Strong' },
  { minimum: 65, label: 'Above age expectation' },
  { minimum: 55, label: 'Age-appropriate' },
  { minimum: 40, label: 'Developing' },
  { minimum: 0, label: 'Early development' }
]);

const COMPATIBILITY_BANDS = Object.freeze([
  { minimum: 90, label: 'Exceptional verified fit', recommendation: 'Priority expert review or trial' },
  { minimum: 82, label: 'Strong fit', recommendation: 'Strong shortlist recommendation' },
  { minimum: 74, label: 'Credible fit', recommendation: 'Shortlist for video or live review' },
  { minimum: 65, label: 'Conditional fit', recommendation: 'Review in the specified role; clear gaps remain' },
  { minimum: 55, label: 'Developmental fit', recommendation: 'Monitor against this role' },
  { minimum: 0, label: 'Low current fit', recommendation: 'Do not prioritise for this exact requirement' }
]);

const DEVELOPMENT_PLANS = Object.freeze({
  balanced: { label: 'Balanced Growth', priority: [], intensity: 0.55 },
  technical_possession: { label: 'Technical Possession', priority: ['first_touch', 'passing', 'dribbling', 'weak_foot', 'receiving_under_pressure', 'ball_retention', 'progressive_passing', 'gk_distribution'], intensity: 0.82 },
  athletic_transition: { label: 'Athletic Transition', priority: ['pace', 'agility_balance', 'stamina', 'strength', 'runs_in_behind', 'recovery_defending', 'gk_agility_explosiveness'], intensity: 0.76 },
  defensive_intelligence: { label: 'Defensive Intelligence', priority: ['awareness', 'decision_making', 'one_v_one_defending', 'defensive_positioning', 'marking_covering', 'anticipation_interceptions', 'defensive_positioning_covering'], intensity: 0.82 },
  final_third_output: { label: 'Final Third Output', priority: ['finishing', 'shooting', 'attacking_movement', 'one_v_one_attacking', 'runs_in_behind', 'chance_creation', 'crossing'], intensity: 0.84 },
  goalkeeper_command: { label: 'Goalkeeper Command', priority: GOALKEEPER_ATTRIBUTES, intensity: 0.82 }
});

const MATCH_SCENARIOS = Object.freeze({
  protect_lead: { label: 'Protecting a one-goal lead under pressure', weights: { decision_making: 5, composure: 5, defensive_positioning: 6, marking_covering: 5, defensive_positioning_covering: 6, ball_retention: 4, gk_positioning: 5 } },
  chasing_game: { label: 'Chasing the game late', weights: { decision_making: 5, chance_creation: 6, finishing: 5, shooting: 4, attacking_movement: 5, off_ball_movement_box_arrivals: 5, stamina: 3 } },
  high_press: { label: 'High press against a possession team', weights: STYLE_PROFILES.high_press.weights },
  low_block: { label: 'Breaking down a compact low block', weights: { chance_creation: 7, one_v_one_attacking: 5, first_touch: 5, receiving_under_pressure: 5, decision_making: 6, crossing: 4, off_ball_movement_box_arrivals: 4 } },
  wide_duel: { label: 'Repeated wide one-vers-one duels', weights: { pace: 5, agility_balance: 5, one_v_one_attacking: 6, one_v_one_defending: 6, recovery_defending: 4, dribbling: 5, stamina: 4 } },
  aerial_battle: { label: 'Direct opponent with heavy aerial pressure', weights: { aerial_defending: 7, aerial_ability: 7, gk_aerial_command: 7, strength: 4, defensive_positioning: 4, attacking_movement: 3 } },
  counter_attack: { label: 'Counter-attacking from deep', weights: STYLE_PROFILES.counter_attack.weights },
  build_from_back: { label: 'Building play from the back', weights: STYLE_PROFILES.build_up_from_back.weights },
  transition_defence: { label: 'Defending fast transitions after losing possession', weights: TEAM_NEED_PROFILES.defensive_transition.weights },
  isolated_striker: { label: 'Playing as an isolated striker', weights: { hold_up_play: 7, link_up_play: 5, strength: 5, first_touch: 4, attacking_movement: 4, aerial_ability: 4, composure: 4 } },
  set_piece_attack: { label: 'Attacking set pieces late in the game', weights: { attacking_movement: 5, aerial_ability: 7, finishing: 3, strength: 4, composure: 4, off_ball_movement_box_arrivals: 4 } },
  set_piece_defence: { label: 'Defending set pieces against an aerially strong team', weights: { aerial_defending: 7, marking_covering: 6, defensive_positioning: 5, communication_organisation: 4, gk_aerial_command: 6, gk_communication: 5, strength: 3 } },
  fatigue_phase: { label: 'Managing a high-tempo final phase', weights: { stamina: 7, composure: 5, decision_making: 6, passing: 3, defensive_positioning: 3, defensive_positioning_covering: 3, pressing_counter_pressing: 3, pressing_from_front: 3 } },
  physical_midfield: { label: 'Playing through a physical midfield contest', weights: { strength: 5, stamina: 5, receiving_under_pressure: 6, ball_retention: 6, composure: 5, decision_making: 5, anticipation_interceptions: 4 } },
  creative_ten: { label: 'Operating as the main creative outlet', weights: { chance_creation: 8, receiving_under_pressure: 6, first_touch: 5, awareness: 6, decision_making: 6, dribbling: 4, composure: 4 } },
  goalkeeper_crosses: { label: 'Goalkeeper facing repeated crosses', goalkeeperOnly: true, weights: { gk_aerial_command: 8, gk_positioning: 6, gk_handling: 5, gk_communication: 6, gk_decision_making: 5 } },
  goalkeeper_sweeper: { label: 'Goalkeeper sweeping behind a high line', goalkeeperOnly: true, weights: { gk_sweeping: 8, gk_positioning: 6, gk_one_v_one: 5, gk_decision_making: 6, gk_agility_explosiveness: 4 } },
  goalkeeper_distribution: { label: 'Goalkeeper starting attacks short and long', goalkeeperOnly: true, weights: TEAM_NEED_PROFILES.goalkeeper_distribution.weights },
  gk_penalties: { label: 'Goalkeeper in a penalty shootout', goalkeeperOnly: true, weights: { gk_reflexes: 6, gk_one_v_one: 6, gk_composure: 6, gk_decision_making: 5, gk_agility_explosiveness: 4 } },
  gk_shot_volume: { label: 'Goalkeeper facing high shot volume', goalkeeperOnly: true, weights: { gk_shot_stopping: 8, gk_reflexes: 6, gk_handling: 6, gk_positioning: 5, gk_composure: 5, gk_agility_explosiveness: 3 } }
});

const MATCH_SCENARIO_ALIASES = Object.freeze({
  build_back: 'build_from_back',
  striker_isolated: 'isolated_striker',
  gk_crosses: 'goalkeeper_crosses',
  gk_sweeper: 'goalkeeper_sweeper',
  gk_distribution: 'goalkeeper_distribution'
});

const ATTRIBUTE_CATEGORY_GUIDANCE = Object.freeze({
  technical: 'Observe the quality, control and repeatability of the football action.',
  tacticalCognitive: 'Observe scanning, choice, timing and positioning with and without the ball.',
  physical: 'Observe football movement and repeat intensity in context; do not reward body size by itself.',
  mentalDevelopmental: 'Observe behaviour across training and matches, including pressure, feedback and setbacks.'
});

const AGE_RUBRIC_GUIDANCE = Object.freeze({
  'Foundation Function Match': {
    observationContext: 'Judge repeatable actions in age-appropriate small-sided games. Prioritise ball interaction, perception, choice and learning behaviour; do not project adult position or body type.',
    ratingAnchors: {
      1: 'The action is at an early learning stage and usually needs time, space or support.',
      2: 'The action appears sometimes but is inconsistent for this age-group context.',
      3: 'The action is generally appropriate for this age group and game format.',
      4: 'The action is consistently effective for this age group, including under realistic pressure.',
      5: 'The action is exceptional and repeatable across several age-appropriate contexts.'
    }
  },
  'Emerging Role Match': {
    observationContext: 'Judge the action in several positions and small-sided contexts, with increasing pressure and transition demands. Avoid locking the player into an adult role.',
    ratingAnchors: {
      1: 'The action is not yet functional without substantial time, space or prompting.',
      2: 'The action is partly functional but inconsistent against age-group pressure.',
      3: 'The action meets the normal expectation for this age group and format.',
      4: 'The action is consistently strong across more than one match context.',
      5: 'The action is exceptional, repeatable and clearly influences games at this level.'
    }
  },
  'Tactical Role Compatibility': {
    observationContext: 'Judge how reliably the action supports the player position and role, both in and out of possession, across suitable opposition and match states.',
    ratingAnchors: {
      1: 'The action currently breaks down regularly in the required position context.',
      2: 'The action works in favourable moments but is unreliable under role pressure.',
      3: 'The action meets the expected standard for this age, position and format.',
      4: 'The action is a repeatable position strength under realistic pressure.',
      5: 'The action is an exceptional role strength across opponents and match states.'
    }
  },
  'Recruitment Compatibility': {
    observationContext: 'Judge repeatability at the relevant competition intensity, position and tactical role. Record evidence across opponents and match states rather than relying on one performance.',
    ratingAnchors: {
      1: 'The action is currently well below the required role standard.',
      2: 'The action is below the role standard or too inconsistent under pressure.',
      3: 'The action meets the expected age, level and role standard.',
      4: 'The action is a strong and repeatable recruitment-level quality.',
      5: 'The action is exceptional, repeatable and differentiating at the assessed level.'
    }
  }
});

function buildAssessmentSchema(ageGroupInput, positionInput) {
  const ageMatch = String(ageGroupInput || '').trim().toUpperCase().match(/^U(\d{1,2})$/);
  const age = ageMatch ? Number(ageMatch[1]) : null;
  const ageGroup = age >= 7 && age <= 16 ? `U${age}` : null;
  const rawPosition = String(positionInput || '').trim().toUpperCase();
  const position = POSITION_ALIASES[rawPosition] || rawPosition;
  const positionGroup = Object.entries(POSITION_GROUPS)
    .find(([, positions]) => positions.includes(position))?.[0] || null;
  if (!ageGroup || !positionGroup) {
    return {
      valid: false,
      error: 'A supported age group (U7-U16) and one of the 15 position codes are required.'
    };
  }
  const phase = Object.values(AGE_PHASES).find(item => age >= item.min && age <= item.max);
  const rubric = AGE_RUBRIC_GUIDANCE[phase.label];
  const sectionDefinitions = positionGroup === 'Goalkeeper'
    ? [{ key: 'goalkeeper', label: 'Goalkeeper attributes', attributes: GOALKEEPER_ATTRIBUTES }]
    : [
        { key: 'general', label: 'General outfield attributes', attributes: GENERAL_ATTRIBUTES },
        {
          key: positionGroup.toLowerCase(),
          label: `${positionGroup} attributes`,
          attributes: positionGroup === 'Defender'
            ? DEFENDER_ATTRIBUTES
            : positionGroup === 'Midfielder'
              ? MIDFIELDER_ATTRIBUTES
              : ATTACKER_ATTRIBUTES
        }
      ];
  return {
    valid: true,
    scoringVersion: SCORING_VERSION,
    rubricVersion: ATTRIBUTE_RUBRIC_VERSION,
    ageGroup,
    agePhase: phase.label,
    matchFormat: MATCH_FORMAT_BY_AGE[ageGroup],
    position: {
      code: position,
      label: POSITION_LABELS[position],
      group: positionGroup
    },
    goalkeeperCompletesGeneralAttributes: false,
    observationContext: rubric.observationContext,
    sections: sectionDefinitions.map(section => ({
      key: section.key,
      label: section.label,
      attributes: section.attributes.map(key => ({
        key,
        label: ATTRIBUTE_DEFINITIONS[key].label,
        category: ATTRIBUTE_DEFINITIONS[key].category,
        guidance: ATTRIBUTE_CATEGORY_GUIDANCE[ATTRIBUTE_DEFINITIONS[key].category]
      }))
    })),
    ratingOptions: RATING_OPTIONS.map(option => ({
      value: option.value,
      label: option.label,
      guidance: option.value === null ? 'Use when the action has not been observed reliably.' : TEN_POINT_RATING_GUIDANCE[option.value]
    }))
  };
}

module.exports = {
  SCORING_VERSION,
  ATTRIBUTE_RUBRIC_VERSION,
  RATING_OPTIONS,
  TEN_POINT_RATING_GUIDANCE,
  POSITION_GROUPS,
  POSITION_LABELS,
  POSITION_ALIASES,
  GENERAL_ATTRIBUTES,
  GOALKEEPER_ATTRIBUTES,
  DEFENDER_ATTRIBUTES,
  MIDFIELDER_ATTRIBUTES,
  ATTACKER_ATTRIBUTES,
  ATTRIBUTE_GROUPS,
  ATTRIBUTE_DEFINITIONS,
  LEGACY_ATTRIBUTE_MAP,
  POSITION_PROFILES,
  ROLE_PROFILES,
  POSITION_ROLES,
  DEFAULT_ROLE_BY_POSITION,
  STYLE_PROFILES,
  STYLE_ALIASES,
  TEAM_NEED_PROFILES,
  TEAM_NEED_ALIASES,
  AGE_PHASES,
  MATCH_FORMAT_BY_AGE,
  DEFAULT_MATCH_MINUTES,
  FORMATION_POSITIONS,
  NATURAL_ALTERNATIVES,
  ADJACENT_CONVERSIONS,
  POSITION_TRANSFER_CEILINGS,
  CONFIDENCE_BANDS,
  OVERALL_BANDS,
  COMPATIBILITY_BANDS,
  DEVELOPMENT_PLANS,
  MATCH_SCENARIOS,
  MATCH_SCENARIO_ALIASES,
  ATTRIBUTE_CATEGORY_GUIDANCE,
  AGE_RUBRIC_GUIDANCE,
  buildAssessmentSchema
};
