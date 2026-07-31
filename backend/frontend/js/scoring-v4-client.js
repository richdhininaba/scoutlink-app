'use strict';

(function (global) {
  var CACHE_KEY = 'scoutlink.scoring.v4.options';
  var CACHE_VERSION = 'v4.0.0-ten';
  var cachedOptions = null;
  var pendingOptions = null;

  var FALLBACK = {
    scoringVersion: 'v4.0.0',
    rubricVersion: '2026-07-31-ten',
    ageGroups: ['U7','U8','U9','U10','U11','U12','U13','U14','U15','U16'],
    positionGroups: [
      { key: 'Goalkeeper', label: 'Goalkeeper', positions: ['GK'] },
      { key: 'Defender', label: 'Defenders', positions: ['RB','CB','LB','RWB','LWB'] },
      { key: 'Midfielder', label: 'Midfielders', positions: ['DM','CM','AM','RM','LM'] },
      { key: 'Attacker', label: 'Attackers', positions: ['RW','LW','CF','ST'] }
    ],
    positions: [
      { code:'GK',label:'Goalkeeper',group:'Goalkeeper' },
      { code:'RB',label:'Right-back',group:'Defender' },
      { code:'CB',label:'Centre-back',group:'Defender' },
      { code:'LB',label:'Left-back',group:'Defender' },
      { code:'RWB',label:'Right wing-back',group:'Defender' },
      { code:'LWB',label:'Left wing-back',group:'Defender' },
      { code:'DM',label:'Defensive midfielder',group:'Midfielder' },
      { code:'CM',label:'Central midfielder',group:'Midfielder' },
      { code:'AM',label:'Attacking midfielder',group:'Midfielder' },
      { code:'RM',label:'Right midfielder',group:'Midfielder' },
      { code:'LM',label:'Left midfielder',group:'Midfielder' },
      { code:'RW',label:'Right winger',group:'Attacker' },
      { code:'LW',label:'Left winger',group:'Attacker' },
      { code:'CF',label:'Centre-forward',group:'Attacker' },
      { code:'ST',label:'Striker',group:'Attacker' }
    ],
    attributes: {
      general: [
        ['first_touch','First touch and ball control'],
        ['passing','Passing'],
        ['dribbling','Dribbling and ball carrying'],
        ['weak_foot','Weak-foot ability'],
        ['awareness','Awareness'],
        ['decision_making','Decision-making'],
        ['pace','Pace'],
        ['agility_balance','Agility and balance'],
        ['strength','Strength'],
        ['stamina','Stamina'],
        ['composure','Composure'],
        ['coachability','Coachability'],
        ['response_to_mistakes','Response to mistakes']
      ],
      goalkeeper: [
        ['gk_positioning','Positioning'],
        ['gk_shot_stopping','Shot-stopping'],
        ['gk_reflexes','Reflexes'],
        ['gk_handling','Handling'],
        ['gk_one_v_one','One-vers-one goalkeeping'],
        ['gk_aerial_command','Aerial command'],
        ['gk_sweeping','Sweeping'],
        ['gk_distribution','Distribution'],
        ['gk_communication','Communication and organisation'],
        ['gk_decision_making','Decision-making'],
        ['gk_composure','Composure'],
        ['gk_agility_explosiveness','Agility and explosiveness']
      ],
      defender: [
        ['one_v_one_defending','One-vers-one defending'],
        ['tackling','Tackling'],
        ['defensive_positioning','Defensive positioning'],
        ['marking_covering','Marking and covering'],
        ['anticipation_interceptions','Anticipation and interceptions'],
        ['aerial_defending','Aerial defending'],
        ['recovery_defending','Recovery defending'],
        ['pressing_defensive_transition','Pressing and defensive transitions'],
        ['communication_organisation','Communication and organisation'],
        ['progression_from_defence','Progression from defence'],
        ['crossing_attacking_support','Crossing and attacking support']
      ],
      midfielder: [
        ['receiving_under_pressure','Receiving under pressure'],
        ['ball_retention','Ball retention'],
        ['progressive_passing','Progressive passing'],
        ['long_passing_switching','Long passing and switching play'],
        ['tempo_control','Tempo control'],
        ['chance_creation','Chance creation and final pass'],
        ['anticipation_interceptions','Anticipation and interceptions'],
        ['defensive_positioning_covering','Defensive positioning and covering'],
        ['pressing_counter_pressing','Pressing and counter-pressing'],
        ['off_ball_movement_box_arrivals','Off-ball movement and box arrivals']
      ],
      attacker: [
        ['finishing','Finishing'],
        ['shooting','Shooting technique and range'],
        ['attacking_movement','Attacking movement'],
        ['one_v_one_attacking','One-vers-one attacking'],
        ['runs_in_behind','Runs in behind'],
        ['chance_creation','Chance creation and final ball'],
        ['crossing','Crossing'],
        ['link_up_play','Link-up play'],
        ['hold_up_play','Hold-up play'],
        ['aerial_ability','Aerial ability'],
        ['pressing_from_front','Pressing from the front']
      ]
    },
    ratingOptions: [
      {value:null,label:'Not observed'},
      {value:1,label:'1 — Very limited'},
      {value:2,label:'2 — Limited'},
      {value:3,label:'3 — Early development'},
      {value:4,label:'4 — Below age expectation'},
      {value:5,label:'5 — Developing'},
      {value:6,label:'6 — Age-appropriate'},
      {value:7,label:'7 — Good'},
      {value:8,label:'8 — Strong'},
      {value:9,label:'9 — Excellent'},
      {value:10,label:'10 — Exceptional'}
    ],
    rules: {
      goalkeeperCompletesGeneralAttributes: false,
      notObservedValue: null
    }
  };

  var ALIASES = {
    CDM:'DM', CAM:'AM', B2B:'CM', RCM:'CM', LCM:'CM', RDM:'DM', LDM:'DM',
    RAM:'AM', LAM:'AM', LS:'ST', RS:'ST', SS:'CF', BPD:'CB', RCB:'CB',
    LCB:'CB', SW:'CB'
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character];
    });
  }

  function normaliseOptions(raw) {
    var options = clone(FALLBACK);
    if (!raw || typeof raw !== 'object') return options;

    if (Array.isArray(raw.ageGroups) && raw.ageGroups.length) options.ageGroups = raw.ageGroups;
    if (Array.isArray(raw.positions) && raw.positions.length === 15) options.positions = raw.positions;
    if (Array.isArray(raw.ratingOptions) && raw.ratingOptions.length >= 11) {
      options.ratingOptions = raw.ratingOptions.slice().sort(function (a, b) {
        if (a.value === null) return -1;
        if (b.value === null) return 1;
        return Number(a.value) - Number(b.value);
      });
    }

    var definitions = raw.attributeDefinitions || raw.attributes || null;
    var groups = raw.attributeGroups || null;
    if (definitions && groups) {
      ['general','goalkeeper','defender','midfielder','attacker'].forEach(function (group) {
        if (!Array.isArray(groups[group])) return;
        options.attributes[group] = groups[group].map(function (key) {
          var definition = definitions[key] || {};
          return [key, definition.label || key.replace(/_/g, ' ')];
        });
      });
    }

    options.scoringVersion = raw.scoringVersion || options.scoringVersion;
    options.rubricVersion = raw.rubricVersion || options.rubricVersion;
    return options;
  }

  async function loadOptions(force) {
    if (cachedOptions && !force) return cachedOptions;
    if (pendingOptions && !force) return pendingOptions;

    pendingOptions = (async function () {
      if (!force) {
        try {
          var stored = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
          if (stored && stored.cacheVersion === CACHE_VERSION && stored.options) {
            cachedOptions = normaliseOptions(stored.options);
            return cachedOptions;
          }
        } catch (_) {}
      }

      try {
        var response;
        if (typeof global.api === 'function') {
          response = await global.api('GET', '/api/scoring/options');
        } else {
          var apiRoot = global.API || localStorage.getItem('sl_api_url') || '';
          var fetched = await fetch(apiRoot + '/api/scoring/options', { headers: { Accept:'application/json' } });
          if (!fetched.ok) throw new Error('Scoring options unavailable');
          response = await fetched.json();
        }
        cachedOptions = normaliseOptions(response.data || response);
      } catch (_) {
        cachedOptions = clone(FALLBACK);
      }

      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({
          cacheVersion: CACHE_VERSION,
          options: cachedOptions
        }));
      } catch (_) {}
      return cachedOptions;
    }());

    try {
      return await pendingOptions;
    } finally {
      pendingOptions = null;
    }
  }

  function normalisePosition(value) {
    var code = String(value || '').trim().toUpperCase();
    code = ALIASES[code] || code;
    return FALLBACK.positions.some(function (position) { return position.code === code; }) ? code : null;
  }

  function groupForPosition(value) {
    var code = normalisePosition(value);
    var row = FALLBACK.positions.find(function (position) { return position.code === code; });
    return row ? row.group : null;
  }

  function groupKey(group) {
    return String(group || '').toLowerCase();
  }

  function positionsForGroup(group, options) {
    options = options || cachedOptions || FALLBACK;
    return options.positions.filter(function (position) { return position.group === group; });
  }

  function attributesForGroup(group, options) {
    options = options || cachedOptions || FALLBACK;
    if (group === 'Goalkeeper') return options.attributes.goalkeeper.slice();
    var specific = options.attributes[groupKey(group)] || [];
    return options.attributes.general.concat(specific);
  }

  function attributesForPosition(position, options) {
    return attributesForGroup(groupForPosition(position), options);
  }

  function validateRating(value) {
    if (value === null || value === undefined || value === '') return null;
    var number = Number(value);
    if (!Number.isInteger(number) || number < 1 || number > 10) {
      throw new Error('Every observed attribute rating must be a whole number from 1 to 10.');
    }
    return number;
  }

  function flattenRatings(value, target) {
    target = target || {};
    if (!value || typeof value !== 'object' || Array.isArray(value)) return target;
    Object.keys(value).forEach(function (key) {
      var child = value[key];
      if (child && typeof child === 'object' && !Array.isArray(child)) flattenRatings(child, target);
      else target[key] = child;
    });
    return target;
  }

  function ratingsForPosition(value, position, options) {
    var flat = flattenRatings(value || {});
    var allowed = attributesForPosition(position, options).map(function (row) { return row[0]; });
    return allowed.reduce(function (result, key) {
      if (!Object.prototype.hasOwnProperty.call(flat, key)) return result;
      var rating = validateRating(flat[key]);
      if (rating !== null) result[key] = rating;
      return result;
    }, {});
  }

  function nestRatings(flat, group, options) {
    options = options || cachedOptions || FALLBACK;
    var output = {};
    if (group === 'Goalkeeper') {
      output.goalkeeper = {};
      options.attributes.goalkeeper.forEach(function (row) {
        if (Object.prototype.hasOwnProperty.call(flat, row[0])) output.goalkeeper[row[0]] = flat[row[0]];
      });
      return output;
    }

    output.general = {};
    output[groupKey(group)] = {};
    options.attributes.general.forEach(function (row) {
      if (Object.prototype.hasOwnProperty.call(flat, row[0])) output.general[row[0]] = flat[row[0]];
    });
    (options.attributes[groupKey(group)] || []).forEach(function (row) {
      if (Object.prototype.hasOwnProperty.call(flat, row[0])) output[groupKey(group)][row[0]] = flat[row[0]];
    });
    return output;
  }

  function buildRatingSelect(key, label, value, options, extraClass) {
    options = options || cachedOptions || FALLBACK;
    var selected = value === null || value === undefined ? '' : String(value);
    return '<label class="sl-v4-rating-field ' + esc(extraClass || '') + '">' +
      '<span>' + esc(label) + '</span>' +
      '<select data-v4-rating="' + esc(key) + '">' +
        options.ratingOptions.map(function (option) {
          var optionValue = option.value === null ? '' : String(option.value);
          return '<option value="' + esc(optionValue) + '"' +
            (optionValue === selected ? ' selected' : '') + '>' +
            esc(option.label) + '</option>';
        }).join('') +
      '</select></label>';
  }

  function renderAssessment(container, position, currentRatings, options) {
    if (!container) return;
    options = options || cachedOptions || FALLBACK;
    var code = normalisePosition(position);
    var group = groupForPosition(code);
    if (!code || !group) {
      container.innerHTML = '<div class="sl-v4-empty">Select a player position to load the correct attributes.</div>';
      return;
    }

    var flat = flattenRatings(currentRatings || {});
    var sections = group === 'Goalkeeper'
      ? [{ key:'goalkeeper', label:'Goalkeeper attributes', attributes:options.attributes.goalkeeper }]
      : [
          { key:'general', label:'General attributes', attributes:options.attributes.general },
          { key:groupKey(group), label:group + ' attributes', attributes:options.attributes[groupKey(group)] || [] }
        ];

    container.innerHTML = sections.map(function (section) {
      return '<section class="sl-v4-assessment-section" data-v4-section="' + esc(section.key) + '">' +
        '<header><h3>' + esc(section.label) + '</h3><p>Whole numbers from 1 to 10. Leave Not observed where evidence is not reliable.</p></header>' +
        '<div class="sl-v4-rating-grid">' +
          section.attributes.map(function (row) {
            return buildRatingSelect(row[0], row[1], flat[row[0]], options);
          }).join('') +
        '</div></section>';
    }).join('');
  }

  function collectAssessment(container, position, options) {
    options = options || cachedOptions || FALLBACK;
    var group = groupForPosition(position);
    if (!container || !group) throw new Error('Select a supported position.');
    var flat = {};
    container.querySelectorAll('[data-v4-rating]').forEach(function (select) {
      var value = validateRating(select.value);
      if (value !== null) flat[select.getAttribute('data-v4-rating')] = value;
    });
    return nestRatings(flat, group, options);
  }

  function renderPositionOptions(select, group, selected, options) {
    if (!select) return;
    options = options || cachedOptions || FALLBACK;
    var positions = group ? positionsForGroup(group, options) : options.positions;
    select.innerHTML = '<option value="">Select position</option>' +
      positions.map(function (position) {
        return '<option value="' + position.code + '"' +
          (normalisePosition(selected) === position.code ? ' selected' : '') + '>' +
          esc(position.label + ' (' + position.code + ')') + '</option>';
      }).join('');
  }

  function renderGroupOptions(select, selected) {
    if (!select) return;
    select.innerHTML = '<option value="">Select group</option>' +
      FALLBACK.positionGroups.map(function (group) {
        return '<option value="' + group.key + '"' +
          (group.key === selected ? ' selected' : '') + '>' + esc(group.label) + '</option>';
      }).join('');
  }

  function positionLabel(value, options) {
    options = options || cachedOptions || FALLBACK;
    var code = normalisePosition(value);
    var position = options.positions.find(function (row) { return row.code === code; });
    return position ? position.label : String(value || 'Position not recorded');
  }

  function attributeLabel(key, options) {
    options = options || cachedOptions || FALLBACK;
    var groups = options.attributes;
    var row = Object.keys(groups).reduce(function (found, group) {
      return found || groups[group].find(function (item) { return item[0] === key; });
    }, null);
    return row ? row[1] : String(key || '').replace(/_/g, ' ');
  }

  function installBaseStyles() {
    if (document.getElementById('scoringV4ClientStyles')) return;
    var style = document.createElement('style');
    style.id = 'scoringV4ClientStyles';
    style.textContent =
      '.sl-v4-assessment-section{border:1px solid #dce5e9;background:#fff;margin:0 0 16px}' +
      '.sl-v4-assessment-section>header{padding:14px 16px;border-bottom:1px solid #dce5e9}' +
      '.sl-v4-assessment-section h3{margin:0;font-size:15px;color:#07141f}' +
      '.sl-v4-assessment-section p{margin:5px 0 0;color:#64748b;font-size:12px}' +
      '.sl-v4-rating-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding:16px}' +
      '.sl-v4-rating-field{display:grid;gap:6px}' +
      '.sl-v4-rating-field>span{font-size:11px;font-weight:800;color:#475569}' +
      '.sl-v4-rating-field select{width:100%;min-height:42px;padding:0 10px;border:1px solid #cbd5e1;background:#fff;color:#0f172a}' +
      '.sl-v4-empty{padding:18px;border:1px dashed #cbd5e1;background:#f8fafc;color:#64748b}' +
      '.sl-v4-attribute-display{display:grid;gap:8px}' +
      '.sl-v4-attribute-row{display:grid;grid-template-columns:minmax(150px,1fr) minmax(100px,2fr) 46px;gap:10px;align-items:center}' +
      '.sl-v4-attribute-row span{font-size:12px;color:#334155}' +
      '.sl-v4-attribute-row i{height:7px;background:#e2e8f0;overflow:hidden}' +
      '.sl-v4-attribute-row i em{display:block;height:100%;background:#0f9f75}' +
      '.sl-v4-attribute-row b{text-align:right;font-size:12px;color:#07141f}' +
      '@media(max-width:760px){.sl-v4-rating-grid{grid-template-columns:1fr}.sl-v4-attribute-row{grid-template-columns:minmax(120px,1fr) minmax(80px,1.4fr) 40px}}';
    (document.head || document.documentElement).appendChild(style);
  }

  installBaseStyles();

  global.ScoutLinkScoringV4 = {
    version: CACHE_VERSION,
    fallbackOptions: clone(FALLBACK),
    aliases: clone(ALIASES),
    loadOptions: loadOptions,
    normalisePosition: normalisePosition,
    groupForPosition: groupForPosition,
    positionsForGroup: positionsForGroup,
    attributesForGroup: attributesForGroup,
    attributesForPosition: attributesForPosition,
    validateRating: validateRating,
    flattenRatings: flattenRatings,
    ratingsForPosition: ratingsForPosition,
    nestRatings: nestRatings,
    renderAssessment: renderAssessment,
    collectAssessment: collectAssessment,
    renderPositionOptions: renderPositionOptions,
    renderGroupOptions: renderGroupOptions,
    positionLabel: positionLabel,
    attributeLabel: attributeLabel,
    esc: esc
  };
}(window));
