'use strict';

/* Safe frontend scoring configuration. Proprietary weights and formulas are never exposed. */
const express = require('express');
const router = express.Router();
const { config } = require('../engines');
const { ensureDemoPlayersV4 } = require('../services/demoScoringMigration');

function publicOptions() {
  return {
    scoringVersion:config.SCORING_VERSION,
    rubricVersion:config.ATTRIBUTE_RUBRIC_VERSION,
    ageGroups:Array.from({ length:10 }, (_, index) => `U${index + 7}`),
    positionGroups:Object.entries(config.POSITION_GROUPS).map(([key, positions]) => ({
      key,
      label:key === 'Defender' ? 'Defenders' : key === 'Midfielder' ? 'Midfielders' : key === 'Attacker' ? 'Attackers' : 'Goalkeeper',
      positions
    })),
    positions:Object.entries(config.POSITION_GROUPS).flatMap(([group, positions]) => {
      return positions.map(code => ({ code, label:config.POSITION_LABELS[code], group }));
    }),
    attributeGroups:config.ATTRIBUTE_GROUPS,
    attributeDefinitions:config.ATTRIBUTE_DEFINITIONS,
    ratingOptions:config.RATING_OPTIONS.map(option => ({ value:option.value, label:option.label })),
    matchFormatsByAge:config.MATCH_FORMAT_BY_AGE,
    formationsByFormat:Object.entries(config.FORMATION_POSITIONS).reduce((mapped, [format, formations]) => {
      mapped[format] = Object.keys(formations);
      return mapped;
    }, {}),
    roles:Object.entries(config.ROLE_PROFILES).map(([key, role]) => ({
      key,
      label:role.label,
      positions:role.positions,
      focus:role.focus
    })),
    rolesByPosition:config.POSITION_ROLES,
    playingStyles:Object.entries(config.STYLE_PROFILES).map(([key, style]) => ({ key, label:style.label })),
    teamNeeds:Object.entries(config.TEAM_NEED_PROFILES).map(([key, need]) => ({ key, label:need.label })),
    developmentPlans:Object.entries(config.DEVELOPMENT_PLANS).map(([key, plan]) => ({ key, label:plan.label })),
    rules:{
      goalkeeperCompletesGeneralAttributes:false,
      outfieldAssessment:'General attributes plus the complete primary position-group assessment.',
      alternativePositions:'One primary position and up to two genuinely played alternative positions.',
      notObservedValue:null,
      ratingScale:'Whole numbers from 1 to 10'
    }
  };
}

router.get('/public-options', (_, res) => {
  res.set('Cache-Control','public, max-age=300, s-maxage=1800');
  res.json(publicOptions());
});

router.get('/prepare-demo', async (req, res) => {
  try {
    const report = await ensureDemoPlayersV4({ force:req.query.force === '1' });
    res.set('Cache-Control','no-store');
    res.json({ data:report });
  } catch (error) {
    console.error('[V4 demo preparation]', error);
    res.status(500).json({ error:'The V4 demo catalogue could not be prepared.' });
  }
});

router.get('/options', (_, res) => {
  res.json(publicOptions());
});

router.get('/assessment-schema', (req, res) => {
  const schema = config.buildAssessmentSchema(req.query.ageGroup, req.query.position);
  if (!schema.valid) return res.status(400).json({ error:schema.error });
  return res.json(schema);
});

module.exports = router;
module.exports.publicOptions = publicOptions;
