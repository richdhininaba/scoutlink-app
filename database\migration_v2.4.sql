-- ============================================================
-- ScoutLink Migration v2.4
-- Task 4: Set up fake scout Jamie + scout team
-- Task 5: Create fake match records for Northgate players
-- ============================================================

-- TASK 4: Set up Jamie's scout team if not exists
DO $$
DECLARE
  v_jamie_id UUID;
  v_team_id UUID;
BEGIN
  -- Find Jamie scout
  SELECT id INTO v_jamie_id FROM scouts WHERE first_name ILIKE 'Jamie' LIMIT 1;
  
  IF v_jamie_id IS NOT NULL THEN
    -- Check if Jamie already has a scout_team_id
    SELECT scout_team_id INTO v_team_id FROM scouts WHERE id = v_jamie_id;
    
    IF v_team_id IS NULL THEN
      -- Create scout team for Jamie
      INSERT INTO scout_teams (
        team_name, formation, playing_style,
        team_weaknesses, role_expectations, long_term_goals,
        preferred_positions, age_groups, country
      ) VALUES (
        'Jamie Test Team', '4-3-3', 'High Press',
        ARRAY['Insufficient Game Pace and Speed', 'Weak Defensive Base'],
        ARRAY['Speed and Agility', 'Defensive Impact'],
        ARRAY['Physical Growth Potential', 'Goal Contribution Potential'],
        ARRAY['ST', 'CM', 'CB'], ARRAY['U10','U11','U12','U13','U14'],
        'England'
      )
      RETURNING id INTO v_team_id;
      
      -- Assign team to Jamie
      UPDATE scouts SET scout_team_id = v_team_id WHERE id = v_jamie_id;
    END IF;
    
    -- Set Jamie's plan and preferences
    UPDATE scouts SET
      preferences_set = true,
      subscription_plan = 'Elite',
      exports_remaining = 500,
      predictions_remaining = 1200,
      interests_remaining = 999,
      is_active = true
    WHERE id = v_jamie_id;
  END IF;
END $$;

-- TASK 5: Create match facts for Northgate players
-- Insert 6 match records per fake player (those on 'Northgate' team)
DO $$
DECLARE
  v_player RECORD;
  v_coach_id UUID;
  v_team_id UUID;
  v_opponents TEXT[] := ARRAY['Riverside FC', 'Hillside United', 'Oakwood Athletic', 'Valley Rangers', 'Lakeside Youth', 'Forest Green Juniors'];
  v_formation TEXT := '4-3-3';
  v_match_date DATE;
  v_goals INT;
  v_assists INT;
  v_yellow INT;
  v_clean_sheet BOOLEAN;
  i INT;
  v_home_score INT;
  v_away_score INT;
BEGIN
  -- Get coach for Northgate
  SELECT id, team_id INTO v_coach_id, v_team_id
  FROM coaches WHERE team_name ILIKE '%Northgate%' LIMIT 1;

  FOR v_player IN 
    SELECT id, position_group, specific_position,
           pace, agility, strength, stamina, jumping, composure,
           shooting, passing, dribbling, defending, crossing,
           vision, positioning, heading, tackling
    FROM players 
    WHERE team_name ILIKE '%Northgate%' AND is_active = true
  LOOP
    FOR i IN 1..6 LOOP
      -- Spread matches over last 4 months
      v_match_date := CURRENT_DATE - (((6 - i) * 14) || ' days')::INTERVAL;
      
      -- Random stats based on position
      v_goals := CASE
        WHEN v_player.position_group = 'Forward' THEN floor(random() * 3)::INT
        WHEN v_player.position_group = 'Midfielder' THEN floor(random() * 2)::INT
        ELSE 0
      END;
      v_assists := CASE
        WHEN v_player.position_group IN ('Forward','Midfielder') THEN floor(random() * 2)::INT
        ELSE 0
      END;
      v_yellow := CASE WHEN random() > 0.8 THEN 1 ELSE 0 END;
      v_home_score := floor(random() * 4)::INT;
      v_away_score := floor(random() * 3)::INT;
      v_clean_sheet := v_player.position_group IN ('Goalkeeper','Defender') AND v_away_score = 0;
      
      -- Only insert if no duplicate for this player/date/opponent
      IF NOT EXISTS (
        SELECT 1 FROM match_facts 
        WHERE player_id = v_player.id 
        AND match_date = v_match_date 
        AND opponent = v_opponents[i]
      ) THEN
        INSERT INTO match_facts (
          player_id, team_id, coach_id,
          match_date, opponent, format, formation, mode,
          home_score, away_score,
          result, goals, assists, yellow_cards, red_cards, clean_sheet,
          -- Coach ratings (5-9 range)
          pace, agility, strength, stamina, jumping, composure,
          shooting, passing, dribbling, defending, crossing,
          vision, positioning, heading, tackling,
          confirmed, created_at
        ) VALUES (
          v_player.id, v_team_id, v_coach_id,
          v_match_date, v_opponents[i], '11', v_formation, 'post',
          v_home_score, v_away_score,
          CASE WHEN v_home_score > v_away_score THEN 'win' WHEN v_home_score = v_away_score THEN 'draw' ELSE 'loss' END,
          v_goals, v_assists, v_yellow, 0, v_clean_sheet,
          -- Use existing ratings if set, else generate 5-9
          COALESCE(NULLIF(v_player.pace, 0), 5 + floor(random()*5)::INT),
          COALESCE(NULLIF(v_player.agility, 0), 5 + floor(random()*5)::INT),
          COALESCE(NULLIF(v_player.strength, 0), 5 + floor(random()*5)::INT),
          COALESCE(NULLIF(v_player.stamina, 0), 5 + floor(random()*5)::INT),
          COALESCE(NULLIF(v_player.jumping, 0), 5 + floor(random()*5)::INT),
          COALESCE(NULLIF(v_player.composure, 0), 5 + floor(random()*5)::INT),
          COALESCE(NULLIF(v_player.shooting, 0), 5 + floor(random()*5)::INT),
          COALESCE(NULLIF(v_player.passing, 0), 5 + floor(random()*5)::INT),
          COALESCE(NULLIF(v_player.dribbling, 0), 5 + floor(random()*5)::INT),
          COALESCE(NULLIF(v_player.defending, 0), 5 + floor(random()*5)::INT),
          COALESCE(NULLIF(v_player.crossing, 0), 5 + floor(random()*5)::INT),
          COALESCE(NULLIF(v_player.vision, 0), 5 + floor(random()*5)::INT),
          COALESCE(NULLIF(v_player.positioning, 0), 5 + floor(random()*5)::INT),
          COALESCE(NULLIF(v_player.heading, 0), 5 + floor(random()*5)::INT),
          COALESCE(NULLIF(v_player.tackling, 0), 5 + floor(random()*5)::INT),
          true, NOW() - (((6 - i) * 14) || ' days')::INTERVAL
        );
      END IF;
    END LOOP;
    
    -- Update player aggregate stats from match facts
    UPDATE players SET
      appearances = (SELECT COUNT(*) FROM match_facts WHERE player_id = v_player.id),
      goals = (SELECT COALESCE(SUM(goals),0) FROM match_facts WHERE player_id = v_player.id),
      assists = (SELECT COALESCE(SUM(assists),0) FROM match_facts WHERE player_id = v_player.id),
      yellow_cards = (SELECT COALESCE(SUM(yellow_cards),0) FROM match_facts WHERE player_id = v_player.id),
      red_cards = (SELECT COALESCE(SUM(red_cards),0) FROM match_facts WHERE player_id = v_player.id),
      clean_sheets = (SELECT COALESCE(SUM(CASE WHEN clean_sheet THEN 1 ELSE 0 END),0) FROM match_facts WHERE player_id = v_player.id)
    WHERE id = v_player.id;
  END LOOP;
END $$;

-- Add interest for Jamie to all Northgate players (so pipeline is populated)
INSERT INTO recruitment_pipeline (scout_id, player_id, stage, is_active, created_at)
SELECT 
  s.id as scout_id,
  p.id as player_id,
  CASE (row_number() OVER ())::INT % 3
    WHEN 0 THEN 'watching'
    WHEN 1 THEN 'interested'
    ELSE 'trial_pending'
  END as stage,
  true as is_active,
  NOW() as created_at
FROM scouts s
CROSS JOIN players p
WHERE s.first_name ILIKE 'Jamie'
  AND p.team_name ILIKE '%Northgate%'
  AND p.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM recruitment_pipeline rp 
    WHERE rp.scout_id = s.id AND rp.player_id = p.id
  );
