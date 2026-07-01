-- ScoutLink admin QA demo dataset
-- Keeps the three test users, preserves their passwords, and rebuilds the fake player/team data.

DO $$
DECLARE
  v_academy_id UUID := '10000000-0000-4000-8000-000000000101';
  v_scout_team_id UUID := '10000000-0000-4000-8000-000000000102';
  v_player_id UUID;
  v_coach_id UUID;
  v_scout_id UUID;
  v_doomed_players UUID[];
BEGIN
  SELECT id INTO v_player_id FROM players WHERE lower(email) = 'player@test.scoutlink.com' LIMIT 1;
  SELECT id INTO v_coach_id FROM coaches WHERE lower(email) = 'coach@test.scoutlink.com' LIMIT 1;
  SELECT id INTO v_scout_id FROM scouts WHERE lower(email) = 'scout@test.scoutlink.com' LIMIT 1;

  IF v_player_id IS NULL OR v_coach_id IS NULL OR v_scout_id IS NULL THEN
    RAISE EXCEPTION 'Required test users are missing. Expected player@test.scoutlink.com, coach@test.scoutlink.com and scout@test.scoutlink.com.';
  END IF;

  SELECT COALESCE(array_agg(id), ARRAY[]::UUID[]) INTO v_doomed_players
  FROM players
  WHERE lower(email) <> 'player@test.scoutlink.com';

  IF array_length(v_doomed_players, 1) IS NOT NULL THEN
    DELETE FROM award_nomination_responses
    WHERE nomination_id IN (SELECT id FROM award_nominations WHERE player_id = ANY(v_doomed_players));
    DELETE FROM award_nominations WHERE player_id = ANY(v_doomed_players);
    DELETE FROM showcase_responses WHERE player_id = ANY(v_doomed_players);
    DELETE FROM showcase_players WHERE player_id = ANY(v_doomed_players);
    DELETE FROM compatibility_scores WHERE player_id = ANY(v_doomed_players);
    DELETE FROM recruitment_pipeline WHERE player_id = ANY(v_doomed_players);
    DELETE FROM match_facts WHERE player_id = ANY(v_doomed_players);
    DELETE FROM player_videos WHERE player_id = ANY(v_doomed_players);
    DELETE FROM notifications WHERE recipient_type = 'Player' AND recipient_id = ANY(v_doomed_players);
    DELETE FROM players WHERE id = ANY(v_doomed_players);
  END IF;

  DELETE FROM fixtures;
  DELETE FROM match_facts;
  DELETE FROM player_videos;
  DELETE FROM compatibility_scores;
  DELETE FROM recruitment_pipeline;

  UPDATE coaches SET team_id = NULL, team_name = NULL WHERE team_id IS NOT NULL OR team_name IS NOT NULL;
  UPDATE scouts SET scout_team_id = NULL WHERE scout_team_id IS NOT NULL;
  DELETE FROM school_academy_teams;
  DELETE FROM scout_teams;

  INSERT INTO school_academy_teams (id, team_name, county, league, contact_email)
  VALUES (v_academy_id, 'Northgate Non Pro Academy', 'Greater Manchester', 'North West Youth Development League', 'academy@test.scoutlink.com');

  INSERT INTO scout_teams (
    id, team_name, league, tier, country, formation, playing_style, role_expectations,
    long_term_goals, salary_cap, scout_region, min_appearances, preferred_positions, age_groups, club_name
  )
  VALUES (
    v_scout_team_id,
    'Northgate Scout Collective',
    'National League North',
    5,
    'England',
    '4-2-3-1',
    'High press, fast transitions, wide overloads. Weaknesses: poor_set_pieces, weak_left_flank.',
    ARRAY['Ball progression','Defensive recovery','Final-third output'],
    ARRAY['Develop two first-team prospects','Build a regional U18 shortlist'],
    150000,
    'North West England',
    8,
    ARRAY['ST','CM','CB','GK'],
    ARRAY['U16','U17','U18'],
    'Northgate SC'
  );

  UPDATE coaches
  SET team_id = v_academy_id,
      team_name = 'Northgate Non Pro Academy',
      role_at_club = 'Head Coach',
      is_active = true,
      registration_complete = true,
      updated_at = now()
  WHERE id = v_coach_id;

  UPDATE scouts
  SET scout_team_id = v_scout_team_id,
      club_name = 'Northgate Scout Collective',
      club_league = 'National League North',
      subscription_plan = 'Plus',
      plan_start = now() - interval '30 days',
      plan_end = now() + interval '335 days',
      exports_remaining = 112,
      predictions_remaining = 580,
      interests_remaining = 96,
      preferences_set = true,
      is_active = true,
      registration_complete = true,
      updated_at = now()
  WHERE id = v_scout_id;

  UPDATE players
  SET first_name = 'Jordan',
      last_name = 'Blake',
      team_id = v_academy_id,
      team_name = 'Northgate Non Pro Academy',
      age = 17,
      age_group = 'U18',
      date_of_birth = date '2008-11-18',
      nationality = 'England',
      nationality_code = 'ENG',
      position_group = 'Midfielder',
      specific_position = 'CM',
      primary_position = 'CM',
      positions = ARRAY['CM','CDM'],
      foot = 'Right',
      height_category = 'average',
      height_range_cm = '176-181',
      height_min_cm = 176,
      height_max_cm = 181,
      build_category = 'athletic',
      weight_range_kg = '70-76',
      weight_min_kg = 70,
      weight_max_kg = 76,
      appearances = 18,
      goals = 4,
      assists = 9,
      clean_sheets = 0,
      yellow_cards = 2,
      red_cards = 0,
      pace = 7.6,
      agility = 8.1,
      strength = 6.8,
      stamina = 8.4,
      jumping = 6.5,
      composure = 8.0,
      shooting = 7.2,
      passing = 8.5,
      dribbling = 8.0,
      defending = 6.9,
      crossing = 7.4,
      vision = 8.6,
      positioning = 8.1,
      heading = 6.3,
      tackling = 7.2,
      overall_rating = 78,
      transfer_value = 128000,
      predicted_salary_weekly = 475,
      video_urls = ARRAY['https://scoutlink.app/demo-video/jordan-blake-midfield-reel.mp4','https://scoutlink.app/demo-video/jordan-blake-progressive-passing.mp4'],
      assigned_coach_id = v_coach_id,
      is_active = true,
      registration_complete = true,
      updated_at = now()
  WHERE id = v_player_id;
END $$;

WITH seed(idx, first_name, last_name, email, age, age_group, pos_group, specific_position, foot, overall, pace, agility, strength, stamina, jumping, composure, shooting, passing, dribbling, defending, crossing, vision, positioning, heading, tackling, appearances, goals, assists, clean_sheets) AS (
  VALUES
  (1,'Ethan','Cole','northgate.player01@test.scoutlink.com',17,'U18','Forward','ST','Right',84,8.6,8.2,7.4,8.1,7.2,7.9,8.5,7.4,8.1,4.8,7.0,7.5,8.2,7.4,5.2,19,15,5,0),
  (2,'Noah','Reed','northgate.player02@test.scoutlink.com',16,'U17','Midfielder','CAM','Left',81,8.1,8.5,6.6,8.0,6.4,8.4,7.8,8.6,8.7,5.8,7.6,8.8,8.2,5.9,6.1,18,9,12,0),
  (3,'Mason','Clarke','northgate.player03@test.scoutlink.com',18,'U18','Defender','CB','Right',79,7.1,6.8,8.6,7.7,8.2,7.8,5.4,7.2,6.3,8.7,5.8,7.1,8.4,8.8,8.9,20,3,2,8),
  (4,'Leo','Bennett','northgate.player04@test.scoutlink.com',17,'U18','Goalkeeper','GK','Right',77,6.8,7.2,7.6,7.4,8.4,7.6,4.0,6.5,4.8,6.0,4.0,6.9,7.5,4.0,5.8,16,0,1,7),
  (5,'Oliver','Hayes','northgate.player05@test.scoutlink.com',16,'U17','Midfielder','CDM','Right',76,7.4,7.5,7.9,8.3,7.0,7.8,6.1,8.1,7.2,8.0,6.5,7.8,8.0,7.0,8.2,17,2,8,0),
  (6,'Isaac','Morgan','northgate.player06@test.scoutlink.com',17,'U18','Defender','RB','Right',75,8.2,8.0,7.3,8.1,7.1,7.2,5.9,7.2,7.5,7.8,7.8,7.0,7.6,6.8,7.7,18,1,6,5),
  (7,'Samuel','Price','northgate.player07@test.scoutlink.com',15,'U16','Forward','RW','Left',74,8.8,8.7,6.2,7.6,6.5,7.4,7.7,7.0,8.5,4.9,7.9,7.2,7.8,5.7,5.1,14,8,7,0),
  (8,'Henry','Foster','northgate.player08@test.scoutlink.com',18,'U18','Midfielder','CM','Right',73,7.2,7.6,7.3,8.0,6.8,7.7,6.8,8.0,7.4,7.1,6.9,8.2,7.9,6.5,7.3,21,5,9,0),
  (9,'Archie','Ward','northgate.player09@test.scoutlink.com',16,'U17','Defender','LB','Left',72,8.0,7.8,7.0,8.2,6.9,7.1,5.4,7.1,7.2,7.6,7.5,7.0,7.7,6.8,7.9,18,1,5,6),
  (10,'Lucas','Ellis','northgate.player10@test.scoutlink.com',17,'U18','Forward','LW','Right',71,8.5,8.4,6.3,7.5,6.6,7.0,7.6,6.8,8.1,4.8,7.4,7.1,7.5,5.6,5.0,16,7,6,0),
  (11,'Theo','Hughes','northgate.player11@test.scoutlink.com',15,'U16','Goalkeeper','GK','Left',70,6.7,7.1,7.4,7.2,8.0,7.0,3.9,6.2,4.5,5.8,3.9,6.4,7.2,3.8,5.5,13,0,0,5),
  (12,'Finley','Brooks','northgate.player12@test.scoutlink.com',16,'U17','Midfielder','CM','Right',69,7.1,7.3,6.9,7.8,6.7,7.3,6.5,7.7,7.1,6.8,6.6,7.6,7.4,6.4,6.9,15,3,6,0),
  (13,'Oscar','Bell','northgate.player13@test.scoutlink.com',18,'U18','Defender','CB','Right',68,6.8,6.5,8.0,7.2,7.7,6.9,4.8,6.7,5.9,7.8,5.4,6.6,7.4,8.0,8.1,19,2,1,7),
  (14,'Jude','Kelly','northgate.player14@test.scoutlink.com',17,'U18','Forward','ST','Right',67,7.8,7.5,7.4,7.1,7.0,6.9,7.4,6.4,7.2,4.7,6.2,6.6,7.2,7.1,4.9,15,9,2,0),
  (15,'Max','Turner','northgate.player15@test.scoutlink.com',16,'U17','Midfielder','RM','Right',66,7.9,8.0,6.4,7.4,6.2,6.8,6.7,7.0,7.6,5.5,7.3,7.1,6.9,5.9,5.8,14,4,5,0),
  (16,'Alfie','Carter','northgate.player16@test.scoutlink.com',15,'U16','Defender','RB','Right',65,7.7,7.5,6.8,7.6,6.9,6.7,4.9,6.5,6.8,7.2,7.0,6.5,7.0,6.5,7.4,12,1,3,4),
  (17,'Riley','Cooper','northgate.player17@test.scoutlink.com',18,'U18','Midfielder','CDM','Left',64,6.9,7.0,7.6,7.7,6.8,6.8,5.6,7.3,6.7,7.3,5.8,7.0,7.2,6.7,7.5,20,2,5,0),
  (18,'Harvey','James','northgate.player18@test.scoutlink.com',16,'U17','Forward','CF','Right',63,7.4,7.2,6.9,7.0,6.5,6.6,7.0,6.2,6.8,4.5,5.7,6.4,6.9,6.5,4.8,13,5,3,0),
  (19,'Toby','Green','northgate.player19@test.scoutlink.com',17,'U18','Defender','CB','Left',62,6.4,6.2,7.8,6.9,7.4,6.5,4.5,6.4,5.6,7.2,5.1,6.2,6.9,7.6,7.5,16,1,1,5),
  (20,'Caleb','Wood','northgate.player20@test.scoutlink.com',15,'U16','Midfielder','LM','Left',60,7.1,7.4,6.1,6.8,6.0,6.4,6.2,6.7,7.0,5.0,6.8,6.7,6.5,5.5,5.2,11,3,4,0)
),
refs AS (
  SELECT
    '10000000-0000-4000-8000-000000000101'::UUID AS academy_id,
    (SELECT id FROM coaches WHERE lower(email)='coach@test.scoutlink.com' LIMIT 1) AS coach_id
)
INSERT INTO players (
  id, player_id, first_name, last_name, email, parent_email, date_of_birth, age, age_group,
  nationality, nationality_code, position_group, specific_position, positions, primary_position, foot,
  height_category, height_range_cm, height_min_cm, height_max_cm, build_category, weight_range_kg, weight_min_kg, weight_max_kg,
  team_id, team_name, appearances, goals, assists, clean_sheets, yellow_cards, red_cards,
  pace, agility, strength, stamina, jumping, composure, shooting, passing, dribbling, defending,
  crossing, vision, positioning, heading, tackling, overall_rating, transfer_value, predicted_salary_weekly,
  video_urls, assigned_coach_id, is_active, registration_complete
)
SELECT
  gen_random_uuid(), 'PLY-NPA-' || lpad(idx::text, 3, '0'), first_name, last_name, email,
  replace(email, '@test.scoutlink.com', '.parent@test.scoutlink.com'),
  (current_date - ((age || ' years')::interval) - ((idx * 19 || ' days')::interval))::date,
  age, age_group, 'England', 'ENG', pos_group::position_group, specific_position, ARRAY[specific_position], specific_position, foot,
  CASE WHEN idx IN (4,11) THEN 'tall' ELSE 'average' END::height_category,
  CASE WHEN idx IN (4,11) THEN '184-191' ELSE '172-184' END,
  CASE WHEN idx IN (4,11) THEN 184 ELSE 172 END,
  CASE WHEN idx IN (4,11) THEN 191 ELSE 184 END,
  CASE WHEN strength >= 7.8 THEN 'powerful' ELSE 'athletic' END::build_category,
  CASE WHEN strength >= 7.8 THEN '74-84' ELSE '64-76' END,
  CASE WHEN strength >= 7.8 THEN 74 ELSE 64 END,
  CASE WHEN strength >= 7.8 THEN 84 ELSE 76 END,
  refs.academy_id, 'Northgate Non Pro Academy', appearances, goals, assists, clean_sheets, 1, 0,
  pace, agility, strength, stamina, jumping, composure, shooting, passing, dribbling, defending,
  crossing, vision, positioning, heading, tackling, overall, overall * 1500, 250 + (overall * 4),
  ARRAY['https://scoutlink.app/demo-video/' || lower(first_name) || '-' || lower(last_name) || '-reel.mp4'],
  refs.coach_id, true, true
FROM seed CROSS JOIN refs;

WITH refs AS (
  SELECT
    '10000000-0000-4000-8000-000000000101'::UUID AS academy_id,
    (SELECT id FROM coaches WHERE lower(email)='coach@test.scoutlink.com' LIMIT 1) AS coach_id
),
roster AS (
  SELECT p.*, row_number() OVER (ORDER BY p.email) AS rn
  FROM players p, refs
  WHERE p.team_id = refs.academy_id
)
INSERT INTO match_facts (
  player_id, team_id, coach_id, match_date, opponent, result, minutes_played,
  goals, assists, shots, shots_on_target, passes, pass_accuracy, dribbles, tackles,
  interceptions, fouls, yellow_cards, red_cards, saves, goals_conceded, clean_sheet,
  performance_score, created_by, home_score, away_score, mode, format, formation,
  events, player_positions, ratings, confirmed,
  pace, agility, strength, stamina, jumping, composure, shooting, passing, dribbling,
  defending, crossing, vision, positioning, heading, tackling
)
SELECT
  r.id, refs.academy_id, refs.coach_id, current_date - ((g * 7 + r.rn)::int),
  (ARRAY['Riverside Juniors','Southbank Athletic','Eastfield Rovers'])[g],
  (ARRAY['W 3-1','D 2-2','W 2-0'])[g],
  LEAST(90, 70 + ((r.rn + g) % 21)),
  CASE WHEN r.position_group = 'Forward' THEN ((r.rn + g) % 3) WHEN r.position_group = 'Midfielder' THEN ((r.rn + g) % 2) ELSE 0 END,
  CASE WHEN r.position_group IN ('Forward','Midfielder') THEN ((r.rn + g + 1) % 3) ELSE ((r.rn + g) % 2) END,
  1 + ((r.rn + g) % 5),
  1 + ((r.rn + g) % 3),
  22 + ((r.rn * 3 + g) % 38),
  72 + ((r.rn + g) % 20),
  2 + ((r.rn + g) % 7),
  1 + ((r.rn + g) % 8),
  1 + ((r.rn + g) % 5),
  ((r.rn + g) % 3),
  CASE WHEN (r.rn + g) % 9 = 0 THEN 1 ELSE 0 END,
  0,
  CASE WHEN r.position_group = 'Goalkeeper' THEN 3 + ((r.rn + g) % 5) ELSE 0 END,
  CASE WHEN g = 2 THEN 2 ELSE 1 END,
  CASE WHEN g = 3 THEN true ELSE false END,
  LEAST(95, GREATEST(55, (CASE WHEN r.overall_rating > 10 THEN r.overall_rating ELSE r.overall_rating * 10 END) + (g - 2) * 2)),
  refs.coach_id,
  (ARRAY[3,2,2])[g],
  (ARRAY[1,2,0])[g],
  'post',
  '11v11',
  '4-2-3-1',
  jsonb_build_array(jsonb_build_object('minute', 12 + (r.rn % 60), 'type', 'key_action', 'label', 'Coach-tagged demo event')),
  jsonb_build_object(r.id::text, r.specific_position),
  jsonb_build_object('overall', r.overall_rating, 'coachNote', 'Demo QA match rating'),
  true,
  r.pace, r.agility, r.strength, r.stamina, r.jumping, r.composure, r.shooting, r.passing,
  r.dribbling, r.defending, r.crossing, r.vision, r.positioning, r.heading, r.tackling
FROM roster r CROSS JOIN refs CROSS JOIN generate_series(1,3) g;

INSERT INTO fixtures (team_id, coach_id, opponent, fixture_date, fixture_time, venue, home_or_away, format, notes)
VALUES
('10000000-0000-4000-8000-000000000101', (SELECT id FROM coaches WHERE lower(email)='coach@test.scoutlink.com' LIMIT 1), 'Riverside Rangers U18', current_date + 6, time '10:30', 'Northgate Training Ground', 'Home', '11v11', 'League fixture'),
('10000000-0000-4000-8000-000000000101', (SELECT id FROM coaches WHERE lower(email)='coach@test.scoutlink.com' LIMIT 1), 'Brookfield Athletic', current_date + 13, time '14:00', 'Brookfield Sports Park', 'Away', '11v11', 'Away league fixture'),
('10000000-0000-4000-8000-000000000101', (SELECT id FROM coaches WHERE lower(email)='coach@test.scoutlink.com' LIMIT 1), 'Westhaven Development XI', current_date + 20, time '11:00', 'Northgate Training Ground', 'Home', '11v11', 'Showcase preparation fixture'),
('10000000-0000-4000-8000-000000000101', (SELECT id FROM coaches WHERE lower(email)='coach@test.scoutlink.com' LIMIT 1), 'Eastfield Rovers', current_date + 27, time '13:30', 'Eastfield Arena', 'Away', '11v11', 'Regional cup fixture');

WITH refs AS (
  SELECT
    '10000000-0000-4000-8000-000000000101'::UUID AS academy_id,
    (SELECT id FROM coaches WHERE lower(email)='coach@test.scoutlink.com' LIMIT 1) AS coach_id
)
INSERT INTO player_videos (player_id, title, url, video_type, uploaded_by, uploaded_by_type, coach_id, team_id, category, video_url)
SELECT p.id, 'Match Reel - ' || p.first_name || ' ' || p.last_name,
       'https://scoutlink.app/demo-video/' || p.player_id || '-match-reel.mp4',
       'highlight', refs.coach_id, 'Coach', refs.coach_id, refs.academy_id, 'match_reel',
       'https://scoutlink.app/demo-video/' || p.player_id || '-match-reel.mp4'
FROM players p CROSS JOIN refs
WHERE p.team_id = refs.academy_id;

WITH refs AS (
  SELECT
    '10000000-0000-4000-8000-000000000101'::UUID AS academy_id,
    (SELECT id FROM coaches WHERE lower(email)='coach@test.scoutlink.com' LIMIT 1) AS coach_id,
    (SELECT id FROM players WHERE lower(email)='player@test.scoutlink.com' LIMIT 1) AS player_id
)
INSERT INTO player_videos (player_id, title, url, video_type, uploaded_by, uploaded_by_type, coach_id, team_id, category, video_url)
VALUES
((SELECT player_id FROM refs), 'Jordan Blake - Progressive Passing Reel', 'https://scoutlink.app/demo-video/jordan-blake-progressive-passing.mp4', 'highlight', (SELECT coach_id FROM refs), 'Coach', (SELECT coach_id FROM refs), (SELECT academy_id FROM refs), 'technical_reel', 'https://scoutlink.app/demo-video/jordan-blake-progressive-passing.mp4'),
((SELECT player_id FROM refs), 'Jordan Blake - Defensive Transition Clips', 'https://scoutlink.app/demo-video/jordan-blake-defensive-transitions.mp4', 'highlight', (SELECT coach_id FROM refs), 'Coach', (SELECT coach_id FROM refs), (SELECT academy_id FROM refs), 'tactical_reel', 'https://scoutlink.app/demo-video/jordan-blake-defensive-transitions.mp4');

WITH refs AS (
  SELECT
    '10000000-0000-4000-8000-000000000102'::UUID AS scout_team_id,
    (SELECT id FROM scouts WHERE lower(email)='scout@test.scoutlink.com' LIMIT 1) AS scout_id
),
ranked_players AS (
  SELECT p.*, row_number() OVER (ORDER BY p.overall_rating DESC) rn
  FROM players p
  WHERE p.team_id = '10000000-0000-4000-8000-000000000101'
)
INSERT INTO recruitment_pipeline (scout_id, player_id, scout_team_id, stage, notes, interest_level, is_active)
SELECT refs.scout_id, p.id, refs.scout_team_id, 'watching',
       'Demo interest for admin QA: strong fit with Northgate Scout Collective profile.',
       LEAST(10, 4 + p.rn), true
FROM ranked_players p CROSS JOIN refs
WHERE p.rn <= 8;

WITH refs AS (
  SELECT '10000000-0000-4000-8000-000000000102'::UUID AS scout_team_id
)
INSERT INTO compatibility_scores (player_id, scout_team_id, compatibility_score, transfer_value, prediction_score, breakdown)
SELECT p.id, refs.scout_team_id, LEAST(97, (CASE WHEN p.overall_rating > 10 THEN p.overall_rating ELSE p.overall_rating * 10 END) + 6),
       p.transfer_value, LEAST(96, (CASE WHEN p.overall_rating > 10 THEN p.overall_rating ELSE p.overall_rating * 10 END) + 4),
       jsonb_build_object('technicalFit', 82, 'physicalFit', 76, 'ageProfile', 88, 'demoDataset', true)
FROM players p CROSS JOIN refs
WHERE p.team_id = '10000000-0000-4000-8000-000000000101';

NOTIFY pgrst, 'reload schema';
