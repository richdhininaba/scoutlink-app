-- ScoutLink V4 safe rollout 2/4: preserve real legacy evidence in nested integer ratings.
BEGIN;
UPDATE players
SET attribute_ratings = CASE
  WHEN position_group::text = 'Goalkeeper' THEN
    JSONB_STRIP_NULLS(JSONB_BUILD_OBJECT('goalkeeper',JSONB_STRIP_NULLS(JSONB_BUILD_OBJECT(
      'gk_positioning',scoutlink_v4_to_ten(gk_positioning),
      'gk_shot_stopping',scoutlink_v4_to_ten(CASE WHEN gk_diving IS NULL THEN gk_reflexes WHEN gk_reflexes IS NULL THEN gk_diving ELSE (gk_diving + gk_reflexes) / 2 END),
      'gk_reflexes',scoutlink_v4_to_ten(gk_reflexes),
      'gk_handling',scoutlink_v4_to_ten(gk_handling),
      'gk_one_v_one',scoutlink_v4_to_ten(CASE WHEN gk_reflexes IS NULL THEN gk_positioning WHEN gk_positioning IS NULL THEN gk_reflexes ELSE (gk_reflexes + gk_positioning) / 2 END),
      'gk_aerial_command',scoutlink_v4_to_ten(CASE WHEN gk_handling IS NULL THEN gk_communication WHEN gk_communication IS NULL THEN gk_handling ELSE (gk_handling + gk_communication) / 2 END),
      'gk_sweeping',scoutlink_v4_to_ten(gk_sweeping),
      'gk_distribution',scoutlink_v4_to_ten(CASE WHEN gk_distribution IS NULL THEN gk_kicking WHEN gk_kicking IS NULL THEN gk_distribution ELSE (gk_distribution + gk_kicking) / 2 END),
      'gk_communication',scoutlink_v4_to_ten(gk_communication),
      'gk_decision_making',scoutlink_v4_to_ten(CASE WHEN gk_positioning IS NULL THEN gk_communication WHEN gk_communication IS NULL THEN gk_positioning ELSE (gk_positioning + gk_communication) / 2 END),
      'gk_composure',scoutlink_v4_to_ten(composure),
      'gk_agility_explosiveness',scoutlink_v4_to_ten(CASE WHEN agility IS NULL THEN gk_reflexes WHEN gk_reflexes IS NULL THEN agility ELSE (agility + gk_reflexes) / 2 END)
    ))))
  ELSE JSONB_STRIP_NULLS(JSONB_BUILD_OBJECT(
    'general',JSONB_STRIP_NULLS(JSONB_BUILD_OBJECT(
      'first_touch',scoutlink_v4_to_ten(CASE WHEN dribbling IS NULL THEN composure WHEN composure IS NULL THEN dribbling ELSE dribbling * .7 + composure * .3 END),
      'passing',scoutlink_v4_to_ten(passing),
      'dribbling',scoutlink_v4_to_ten(dribbling),
      'awareness',scoutlink_v4_to_ten(CASE WHEN vision IS NULL THEN positioning WHEN positioning IS NULL THEN vision ELSE vision * .65 + positioning * .35 END),
      'decision_making',scoutlink_v4_to_ten(CASE WHEN vision IS NULL THEN composure WHEN composure IS NULL THEN vision ELSE vision * .5 + composure * .5 END),
      'pace',scoutlink_v4_to_ten(pace),
      'agility_balance',scoutlink_v4_to_ten(agility),
      'strength',scoutlink_v4_to_ten(strength),
      'stamina',scoutlink_v4_to_ten(stamina),
      'composure',scoutlink_v4_to_ten(composure)
    )),
    LOWER(position_group::text),CASE
      WHEN position_group::text = 'Defender' THEN JSONB_STRIP_NULLS(JSONB_BUILD_OBJECT(
        'one_v_one_defending',scoutlink_v4_to_ten(CASE WHEN defending IS NULL THEN tackling WHEN tackling IS NULL THEN defending ELSE defending * .55 + tackling * .45 END),
        'tackling',scoutlink_v4_to_ten(tackling),
        'defensive_positioning',scoutlink_v4_to_ten(positioning),
        'marking_covering',scoutlink_v4_to_ten(CASE WHEN defending IS NULL THEN positioning WHEN positioning IS NULL THEN defending ELSE defending * .55 + positioning * .45 END),
        'anticipation_interceptions',scoutlink_v4_to_ten(CASE WHEN vision IS NULL THEN positioning WHEN positioning IS NULL THEN vision ELSE vision * .55 + positioning * .45 END),
        'aerial_defending',scoutlink_v4_to_ten(CASE WHEN heading IS NULL THEN jumping WHEN jumping IS NULL THEN heading ELSE heading * .6 + jumping * .4 END),
        'recovery_defending',scoutlink_v4_to_ten(CASE WHEN pace IS NULL THEN positioning WHEN positioning IS NULL THEN pace ELSE pace * .55 + positioning * .45 END),
        'pressing_defensive_transition',scoutlink_v4_to_ten(CASE WHEN stamina IS NULL THEN defending WHEN defending IS NULL THEN stamina ELSE stamina * .55 + defending * .45 END),
        'communication_organisation',scoutlink_v4_to_ten(composure),
        'progression_from_defence',scoutlink_v4_to_ten(CASE WHEN passing IS NULL THEN dribbling WHEN dribbling IS NULL THEN passing ELSE passing * .6 + dribbling * .4 END),
        'crossing_attacking_support',scoutlink_v4_to_ten(crossing)
      ))
      WHEN position_group::text = 'Midfielder' THEN JSONB_STRIP_NULLS(JSONB_BUILD_OBJECT(
        'receiving_under_pressure',scoutlink_v4_to_ten((COALESCE(composure,0)+COALESCE(dribbling,0)+COALESCE(passing,0))/NULLIF((composure IS NOT NULL)::int+(dribbling IS NOT NULL)::int+(passing IS NOT NULL)::int,0)),
        'ball_retention',scoutlink_v4_to_ten((COALESCE(composure,0)+COALESCE(passing,0)+COALESCE(dribbling,0))/NULLIF((composure IS NOT NULL)::int+(passing IS NOT NULL)::int+(dribbling IS NOT NULL)::int,0)),
        'progressive_passing',scoutlink_v4_to_ten(CASE WHEN passing IS NULL THEN vision WHEN vision IS NULL THEN passing ELSE passing * .65 + vision * .35 END),
        'long_passing_switching',scoutlink_v4_to_ten(CASE WHEN passing IS NULL THEN vision WHEN vision IS NULL THEN passing ELSE passing * .6 + vision * .4 END),
        'tempo_control',scoutlink_v4_to_ten((COALESCE(composure,0)+COALESCE(vision,0)+COALESCE(passing,0))/NULLIF((composure IS NOT NULL)::int+(vision IS NOT NULL)::int+(passing IS NOT NULL)::int,0)),
        'chance_creation',scoutlink_v4_to_ten(CASE WHEN vision IS NULL THEN passing WHEN passing IS NULL THEN vision ELSE vision * .55 + passing * .45 END),
        'anticipation_interceptions',scoutlink_v4_to_ten(CASE WHEN vision IS NULL THEN positioning WHEN positioning IS NULL THEN vision ELSE vision * .6 + positioning * .4 END),
        'defensive_positioning_covering',scoutlink_v4_to_ten(CASE WHEN positioning IS NULL THEN defending WHEN defending IS NULL THEN positioning ELSE positioning * .55 + defending * .45 END),
        'pressing_counter_pressing',scoutlink_v4_to_ten(CASE WHEN stamina IS NULL THEN positioning WHEN positioning IS NULL THEN stamina ELSE stamina * .55 + positioning * .45 END),
        'off_ball_movement_box_arrivals',scoutlink_v4_to_ten(CASE WHEN positioning IS NULL THEN stamina WHEN stamina IS NULL THEN positioning ELSE positioning * .6 + stamina * .4 END)
      ))
      ELSE JSONB_STRIP_NULLS(JSONB_BUILD_OBJECT(
        'finishing',scoutlink_v4_to_ten(CASE WHEN shooting IS NULL THEN composure WHEN composure IS NULL THEN shooting ELSE shooting * .7 + composure * .3 END),
        'shooting',scoutlink_v4_to_ten(shooting),
        'attacking_movement',scoutlink_v4_to_ten(CASE WHEN positioning IS NULL THEN vision WHEN vision IS NULL THEN positioning ELSE positioning * .7 + vision * .3 END),
        'one_v_one_attacking',scoutlink_v4_to_ten((COALESCE(dribbling,0)+COALESCE(agility,0)+COALESCE(pace,0))/NULLIF((dribbling IS NOT NULL)::int+(agility IS NOT NULL)::int+(pace IS NOT NULL)::int,0)),
        'runs_in_behind',scoutlink_v4_to_ten(CASE WHEN pace IS NULL THEN positioning WHEN positioning IS NULL THEN pace ELSE pace * .55 + positioning * .45 END),
        'chance_creation',scoutlink_v4_to_ten(CASE WHEN vision IS NULL THEN passing WHEN passing IS NULL THEN vision ELSE vision * .55 + passing * .45 END),
        'crossing',scoutlink_v4_to_ten(crossing),
        'link_up_play',scoutlink_v4_to_ten((COALESCE(passing,0)+COALESCE(composure,0)+COALESCE(vision,0))/NULLIF((passing IS NOT NULL)::int+(composure IS NOT NULL)::int+(vision IS NOT NULL)::int,0)),
        'hold_up_play',scoutlink_v4_to_ten(CASE WHEN strength IS NULL THEN composure WHEN composure IS NULL THEN strength ELSE strength * .55 + composure * .45 END),
        'aerial_ability',scoutlink_v4_to_ten((COALESCE(heading,0)+COALESCE(jumping,0)+COALESCE(strength,0))/NULLIF((heading IS NOT NULL)::int+(jumping IS NOT NULL)::int+(strength IS NOT NULL)::int,0)),
        'pressing_from_front',scoutlink_v4_to_ten((COALESCE(stamina,0)+COALESCE(pace,0)+COALESCE(positioning,0))/NULLIF((stamina IS NOT NULL)::int+(pace IS NOT NULL)::int+(positioning IS NOT NULL)::int,0))
      ))
    END
  ))
END,
attribute_rating_scale='ten',
attribute_assessment_version=COALESCE(attribute_assessment_version,'legacy-v3-backfill'),
attribute_assessed_at=COALESCE(attribute_assessed_at,updated_at,created_at)
WHERE attribute_ratings IS NULL OR attribute_ratings='{}'::jsonb;
COMMIT;
