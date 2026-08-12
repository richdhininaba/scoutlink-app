BEGIN;

-- Public-demo Coach showcase seed. Targets demo-only Northgate data.
UPDATE public.school_academy_teams SET county='Greater London', city='London', country='England', league='London Youth Premier', league_name='London Youth Premier', address_line='The Hive London, Camrose Avenue', postcode='HA8 6AG', team_website_url='https://scoutlink.app' WHERE id='c5255a4f-9052-4f66-b3fc-95f4d2afc480' AND is_demo=true;

-- Remove obsolete duplicate demo self-players from the active squad.
UPDATE public.players SET is_active=false, archived_at=now(), archived_reason='demo showcase refresh' WHERE id IN ('8e9f435e-4dc0-4443-b350-9afe35a28460','15b83bb3-c4cd-4f39-8847-dee61fb072ab') AND is_demo=true;

-- Refresh demo-only activity for this team before writing the coherent showcase dataset.
DELETE FROM public.notifications WHERE recipient_id='ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e' AND recipient_type='Coach';
DELETE FROM public.chat_threads WHERE coach_id='ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e';
DELETE FROM public.fixture_attendance WHERE fixture_id IN (SELECT id FROM public.fixtures WHERE team_id='c5255a4f-9052-4f66-b3fc-95f4d2afc480');
DELETE FROM public.recruitment_pipeline WHERE player_id IN (SELECT id FROM public.players WHERE team_id='c5255a4f-9052-4f66-b3fc-95f4d2afc480' AND is_demo=true);
DELETE FROM public.player_videos WHERE team_id='c5255a4f-9052-4f66-b3fc-95f4d2afc480';
DELETE FROM public.match_facts WHERE team_id='c5255a4f-9052-4f66-b3fc-95f4d2afc480';
DELETE FROM public.fixtures WHERE team_id='c5255a4f-9052-4f66-b3fc-95f4d2afc480';

-- Make the demo scout identities varied but explicitly fictional.
UPDATE public.scouts SET club_name = CASE id WHEN 'f456d419-9662-48f9-a03a-dc7fbc34d739' THEN 'Westbridge FC Academy' WHEN '7840ae48-4348-4583-89dd-f4a88a867679' THEN 'Riverside Town Academy' WHEN 'bd187e60-9cec-451e-b26e-8f54da1ee022' THEN 'Camden Athletic Academy' WHEN 'bfcfae48-635b-495a-8462-07f9ae86b9a0' THEN 'Brent Vale FC' WHEN 'd58354ba-8a91-407e-b7d4-bd8551568b17' THEN 'North London Pathway' ELSE club_name END, club_league='Demo academy network' WHERE id IN ('f456d419-9662-48f9-a03a-dc7fbc34d739','7840ae48-4348-4583-89dd-f4a88a867679','bd187e60-9cec-451e-b26e-8f54da1ee022','bfcfae48-635b-495a-8462-07f9ae86b9a0','d58354ba-8a91-407e-b7d4-bd8551568b17') AND is_demo=true;

-- Upsert a balanced 20-player Coach squad.
INSERT INTO public.players
(id,player_id,first_name,last_name,age,age_group,position_group,specific_position,primary_position,positions,alternative_positions,foot,
 height_category,height_range_cm,build_category,weight_range_kg,team_id,team_name,assigned_coach_id,appearances,goals,assists,clean_sheets,
 overall_rating,transfer_value,availability,attribute_ratings,attribute_rating_scale,attribute_assessment_version,attribute_assessed_at,attribute_assessed_by,
 registration_complete,is_active,is_demo,scoring_version,updated_at)
VALUES
('9399e655-5416-44de-8f70-781f955bc0a1','DPL026','Lucas','James',15,'U15','Midfielder'::position_group,'CM','CM',
 ARRAY['CM','AM']::text[],ARRAY['AM']::text[],'Both',
 'average'::height_category,
 CASE 'average' WHEN 'short' THEN '160-165 cm' WHEN 'average' THEN '165-170 cm' WHEN 'tall' THEN '170-178 cm' WHEN 'very_tall' THEN '178-188 cm' ELSE '165-170 cm' END,
 'lean'::build_category,
 CASE 'lean' WHEN 'slight' THEN '52-58 kg' WHEN 'lean' THEN '56-63 kg' WHEN 'athletic' THEN '60-68 kg' WHEN 'powerful' THEN '66-75 kg' ELSE '58-66 kg' END,
 'c5255a4f-9052-4f66-b3fc-95f4d2afc480','Northgate United (Demo)','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',17,4,9,0,78,18000,'Available','{"general":{"first_touch":9,"passing":7,"dribbling":9,"weak_foot":8,"awareness":7,"decision_making":9,"pace":8,"agility_balance":9,"strength":8,"stamina":8,"composure":8,"coachability":8,"response_to_mistakes":9},"midfielder":{"receiving_under_pressure":8,"ball_retention":8,"progressive_passing":8,"long_passing_switching":9,"tempo_control":8,"chance_creation":7,"anticipation_interceptions":9,"defensive_positioning_covering":8,"pressing_counter_pressing":9,"off_ball_movement_box_arrivals":9}}'::jsonb,'ten','v4.0.0',now(),'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 false,true,true,'v4.0.0',now())
ON CONFLICT (id) DO UPDATE SET
 first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,age=EXCLUDED.age,age_group=EXCLUDED.age_group,position_group=EXCLUDED.position_group,
 specific_position=EXCLUDED.specific_position,primary_position=EXCLUDED.primary_position,positions=EXCLUDED.positions,alternative_positions=EXCLUDED.alternative_positions,
 foot=EXCLUDED.foot,height_category=EXCLUDED.height_category,height_range_cm=EXCLUDED.height_range_cm,build_category=EXCLUDED.build_category,
 weight_range_kg=EXCLUDED.weight_range_kg,team_id=EXCLUDED.team_id,team_name=EXCLUDED.team_name,assigned_coach_id=EXCLUDED.assigned_coach_id,
 appearances=EXCLUDED.appearances,goals=EXCLUDED.goals,assists=EXCLUDED.assists,clean_sheets=EXCLUDED.clean_sheets,overall_rating=EXCLUDED.overall_rating,
 transfer_value=EXCLUDED.transfer_value,availability=EXCLUDED.availability,attribute_ratings=EXCLUDED.attribute_ratings,
 attribute_rating_scale='ten',attribute_assessment_version='v4.0.0',attribute_assessed_at=now(),attribute_assessed_by='ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 is_active=true,is_demo=true,scoring_version='v4.0.0',updated_at=now();
INSERT INTO public.players
(id,player_id,first_name,last_name,age,age_group,position_group,specific_position,primary_position,positions,alternative_positions,foot,
 height_category,height_range_cm,build_category,weight_range_kg,team_id,team_name,assigned_coach_id,appearances,goals,assists,clean_sheets,
 overall_rating,transfer_value,availability,attribute_ratings,attribute_rating_scale,attribute_assessment_version,attribute_assessed_at,attribute_assessed_by,
 registration_complete,is_active,is_demo,scoring_version,updated_at)
VALUES
('52d019ab-8fa4-49de-9716-270eeb651480','DPL036','Tyler','Cook',15,'U15','Attacker'::position_group,'RW','RW',
 ARRAY['RW','LW','AM']::text[],ARRAY['LW','AM']::text[],'Left',
 'average'::height_category,
 CASE 'average' WHEN 'short' THEN '160-165 cm' WHEN 'average' THEN '165-170 cm' WHEN 'tall' THEN '170-178 cm' WHEN 'very_tall' THEN '178-188 cm' ELSE '165-170 cm' END,
 'athletic'::build_category,
 CASE 'athletic' WHEN 'slight' THEN '52-58 kg' WHEN 'lean' THEN '56-63 kg' WHEN 'athletic' THEN '60-68 kg' WHEN 'powerful' THEN '66-75 kg' ELSE '58-66 kg' END,
 'c5255a4f-9052-4f66-b3fc-95f4d2afc480','Northgate United (Demo)','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',16,7,6,0,76,16000,'Available','{"general":{"first_touch":7,"passing":8,"dribbling":7,"weak_foot":9,"awareness":8,"decision_making":9,"pace":8,"agility_balance":9,"strength":8,"stamina":7,"composure":7,"coachability":9,"response_to_mistakes":8},"attacker":{"finishing":8,"shooting":7,"attacking_movement":7,"one_v_one_attacking":9,"runs_in_behind":8,"chance_creation":7,"crossing":8,"link_up_play":9,"hold_up_play":7,"aerial_ability":9,"pressing_from_front":7}}'::jsonb,'ten','v4.0.0',now(),'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 false,true,true,'v4.0.0',now())
ON CONFLICT (id) DO UPDATE SET
 first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,age=EXCLUDED.age,age_group=EXCLUDED.age_group,position_group=EXCLUDED.position_group,
 specific_position=EXCLUDED.specific_position,primary_position=EXCLUDED.primary_position,positions=EXCLUDED.positions,alternative_positions=EXCLUDED.alternative_positions,
 foot=EXCLUDED.foot,height_category=EXCLUDED.height_category,height_range_cm=EXCLUDED.height_range_cm,build_category=EXCLUDED.build_category,
 weight_range_kg=EXCLUDED.weight_range_kg,team_id=EXCLUDED.team_id,team_name=EXCLUDED.team_name,assigned_coach_id=EXCLUDED.assigned_coach_id,
 appearances=EXCLUDED.appearances,goals=EXCLUDED.goals,assists=EXCLUDED.assists,clean_sheets=EXCLUDED.clean_sheets,overall_rating=EXCLUDED.overall_rating,
 transfer_value=EXCLUDED.transfer_value,availability=EXCLUDED.availability,attribute_ratings=EXCLUDED.attribute_ratings,
 attribute_rating_scale='ten',attribute_assessment_version='v4.0.0',attribute_assessed_at=now(),attribute_assessed_by='ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 is_active=true,is_demo=true,scoring_version='v4.0.0',updated_at=now();
INSERT INTO public.players
(id,player_id,first_name,last_name,age,age_group,position_group,specific_position,primary_position,positions,alternative_positions,foot,
 height_category,height_range_cm,build_category,weight_range_kg,team_id,team_name,assigned_coach_id,appearances,goals,assists,clean_sheets,
 overall_rating,transfer_value,availability,attribute_ratings,attribute_rating_scale,attribute_assessment_version,attribute_assessed_at,attribute_assessed_by,
 registration_complete,is_active,is_demo,scoring_version,updated_at)
VALUES
('42d334ed-2a49-4e74-b20a-4b7a7ad60d25','DPL031','Reuben','Hughes',15,'U15','Defender'::position_group,'LWB','LWB',
 ARRAY['LWB','LB','LM']::text[],ARRAY['LB','LM']::text[],'Left',
 'average'::height_category,
 CASE 'average' WHEN 'short' THEN '160-165 cm' WHEN 'average' THEN '165-170 cm' WHEN 'tall' THEN '170-178 cm' WHEN 'very_tall' THEN '178-188 cm' ELSE '165-170 cm' END,
 'athletic'::build_category,
 CASE 'athletic' WHEN 'slight' THEN '52-58 kg' WHEN 'lean' THEN '56-63 kg' WHEN 'athletic' THEN '60-68 kg' WHEN 'powerful' THEN '66-75 kg' ELSE '58-66 kg' END,
 'c5255a4f-9052-4f66-b3fc-95f4d2afc480','Northgate United (Demo)','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',17,2,7,0,72,11000,'Available','{"general":{"first_touch":8,"passing":7,"dribbling":7,"weak_foot":7,"awareness":7,"decision_making":8,"pace":7,"agility_balance":6,"strength":8,"stamina":6,"composure":7,"coachability":7,"response_to_mistakes":6},"defender":{"one_v_one_defending":8,"tackling":6,"defensive_positioning":7,"marking_covering":7,"anticipation_interceptions":7,"aerial_defending":8,"recovery_defending":7,"pressing_defensive_transition":6,"communication_organisation":8,"progression_from_defence":7,"crossing_attacking_support":6}}'::jsonb,'ten','v4.0.0',now(),'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 false,true,true,'v4.0.0',now())
ON CONFLICT (id) DO UPDATE SET
 first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,age=EXCLUDED.age,age_group=EXCLUDED.age_group,position_group=EXCLUDED.position_group,
 specific_position=EXCLUDED.specific_position,primary_position=EXCLUDED.primary_position,positions=EXCLUDED.positions,alternative_positions=EXCLUDED.alternative_positions,
 foot=EXCLUDED.foot,height_category=EXCLUDED.height_category,height_range_cm=EXCLUDED.height_range_cm,build_category=EXCLUDED.build_category,
 weight_range_kg=EXCLUDED.weight_range_kg,team_id=EXCLUDED.team_id,team_name=EXCLUDED.team_name,assigned_coach_id=EXCLUDED.assigned_coach_id,
 appearances=EXCLUDED.appearances,goals=EXCLUDED.goals,assists=EXCLUDED.assists,clean_sheets=EXCLUDED.clean_sheets,overall_rating=EXCLUDED.overall_rating,
 transfer_value=EXCLUDED.transfer_value,availability=EXCLUDED.availability,attribute_ratings=EXCLUDED.attribute_ratings,
 attribute_rating_scale='ten',attribute_assessment_version='v4.0.0',attribute_assessed_at=now(),attribute_assessed_by='ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 is_active=true,is_demo=true,scoring_version='v4.0.0',updated_at=now();
INSERT INTO public.players
(id,player_id,first_name,last_name,age,age_group,position_group,specific_position,primary_position,positions,alternative_positions,foot,
 height_category,height_range_cm,build_category,weight_range_kg,team_id,team_name,assigned_coach_id,appearances,goals,assists,clean_sheets,
 overall_rating,transfer_value,availability,attribute_ratings,attribute_rating_scale,attribute_assessment_version,attribute_assessed_at,attribute_assessed_by,
 registration_complete,is_active,is_demo,scoring_version,updated_at)
VALUES
('4bb79c82-28a5-480d-b244-6279e99f2a17','DPL016','Rayan','Patel',15,'U15','Defender'::position_group,'CB','CB',
 ARRAY['CB','RB']::text[],ARRAY['RB']::text[],'Right',
 'tall'::height_category,
 CASE 'tall' WHEN 'short' THEN '160-165 cm' WHEN 'average' THEN '165-170 cm' WHEN 'tall' THEN '170-178 cm' WHEN 'very_tall' THEN '178-188 cm' ELSE '165-170 cm' END,
 'athletic'::build_category,
 CASE 'athletic' WHEN 'slight' THEN '52-58 kg' WHEN 'lean' THEN '56-63 kg' WHEN 'athletic' THEN '60-68 kg' WHEN 'powerful' THEN '66-75 kg' ELSE '58-66 kg' END,
 'c5255a4f-9052-4f66-b3fc-95f4d2afc480','Northgate United (Demo)','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',18,1,2,4,74,13000,'Available','{"general":{"first_touch":8,"passing":7,"dribbling":7,"weak_foot":8,"awareness":8,"decision_making":8,"pace":8,"agility_balance":6,"strength":7,"stamina":6,"composure":8,"coachability":8,"response_to_mistakes":6},"defender":{"one_v_one_defending":7,"tackling":7,"defensive_positioning":6,"marking_covering":7,"anticipation_interceptions":6,"aerial_defending":7,"recovery_defending":7,"pressing_defensive_transition":6,"communication_organisation":7,"progression_from_defence":8,"crossing_attacking_support":7}}'::jsonb,'ten','v4.0.0',now(),'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 false,true,true,'v4.0.0',now())
ON CONFLICT (id) DO UPDATE SET
 first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,age=EXCLUDED.age,age_group=EXCLUDED.age_group,position_group=EXCLUDED.position_group,
 specific_position=EXCLUDED.specific_position,primary_position=EXCLUDED.primary_position,positions=EXCLUDED.positions,alternative_positions=EXCLUDED.alternative_positions,
 foot=EXCLUDED.foot,height_category=EXCLUDED.height_category,height_range_cm=EXCLUDED.height_range_cm,build_category=EXCLUDED.build_category,
 weight_range_kg=EXCLUDED.weight_range_kg,team_id=EXCLUDED.team_id,team_name=EXCLUDED.team_name,assigned_coach_id=EXCLUDED.assigned_coach_id,
 appearances=EXCLUDED.appearances,goals=EXCLUDED.goals,assists=EXCLUDED.assists,clean_sheets=EXCLUDED.clean_sheets,overall_rating=EXCLUDED.overall_rating,
 transfer_value=EXCLUDED.transfer_value,availability=EXCLUDED.availability,attribute_ratings=EXCLUDED.attribute_ratings,
 attribute_rating_scale='ten',attribute_assessment_version='v4.0.0',attribute_assessed_at=now(),attribute_assessed_by='ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 is_active=true,is_demo=true,scoring_version='v4.0.0',updated_at=now();
INSERT INTO public.players
(id,player_id,first_name,last_name,age,age_group,position_group,specific_position,primary_position,positions,alternative_positions,foot,
 height_category,height_range_cm,build_category,weight_range_kg,team_id,team_name,assigned_coach_id,appearances,goals,assists,clean_sheets,
 overall_rating,transfer_value,availability,attribute_ratings,attribute_rating_scale,attribute_assessment_version,attribute_assessed_at,attribute_assessed_by,
 registration_complete,is_active,is_demo,scoring_version,updated_at)
VALUES
('06a2ad09-466c-449a-915f-bc4cac218d2a','DPL011','Archie','King',15,'U15','Goalkeeper'::position_group,'GK','GK',
 ARRAY['GK']::text[],ARRAY[]::text[],'Right',
 'tall'::height_category,
 CASE 'tall' WHEN 'short' THEN '160-165 cm' WHEN 'average' THEN '165-170 cm' WHEN 'tall' THEN '170-178 cm' WHEN 'very_tall' THEN '178-188 cm' ELSE '165-170 cm' END,
 'lean'::build_category,
 CASE 'lean' WHEN 'slight' THEN '52-58 kg' WHEN 'lean' THEN '56-63 kg' WHEN 'athletic' THEN '60-68 kg' WHEN 'powerful' THEN '66-75 kg' ELSE '58-66 kg' END,
 'c5255a4f-9052-4f66-b3fc-95f4d2afc480','Northgate United (Demo)','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',16,0,0,6,71,9000,'Available','{"goalkeeper":{"gk_positioning":8,"gk_shot_stopping":6,"gk_reflexes":7,"gk_handling":7,"gk_one_v_one":7,"gk_aerial_command":6,"gk_distribution":7,"gk_communication":6,"gk_decision_making":7,"gk_composure":6,"gk_agility_explosiveness":7}}'::jsonb,'ten','v4.0.0',now(),'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 false,true,true,'v4.0.0',now())
ON CONFLICT (id) DO UPDATE SET
 first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,age=EXCLUDED.age,age_group=EXCLUDED.age_group,position_group=EXCLUDED.position_group,
 specific_position=EXCLUDED.specific_position,primary_position=EXCLUDED.primary_position,positions=EXCLUDED.positions,alternative_positions=EXCLUDED.alternative_positions,
 foot=EXCLUDED.foot,height_category=EXCLUDED.height_category,height_range_cm=EXCLUDED.height_range_cm,build_category=EXCLUDED.build_category,
 weight_range_kg=EXCLUDED.weight_range_kg,team_id=EXCLUDED.team_id,team_name=EXCLUDED.team_name,assigned_coach_id=EXCLUDED.assigned_coach_id,
 appearances=EXCLUDED.appearances,goals=EXCLUDED.goals,assists=EXCLUDED.assists,clean_sheets=EXCLUDED.clean_sheets,overall_rating=EXCLUDED.overall_rating,
 transfer_value=EXCLUDED.transfer_value,availability=EXCLUDED.availability,attribute_ratings=EXCLUDED.attribute_ratings,
 attribute_rating_scale='ten',attribute_assessment_version='v4.0.0',attribute_assessed_at=now(),attribute_assessed_by='ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 is_active=true,is_demo=true,scoring_version='v4.0.0',updated_at=now();
INSERT INTO public.players
(id,player_id,first_name,last_name,age,age_group,position_group,specific_position,primary_position,positions,alternative_positions,foot,
 height_category,height_range_cm,build_category,weight_range_kg,team_id,team_name,assigned_coach_id,appearances,goals,assists,clean_sheets,
 overall_rating,transfer_value,availability,attribute_ratings,attribute_rating_scale,attribute_assessment_version,attribute_assessed_at,attribute_assessed_by,
 registration_complete,is_active,is_demo,scoring_version,updated_at)
VALUES
('3f7ddd2b-4ed8-4dfe-ab5c-6a8a51de37ba','DPL006','Alfie','Carter',15,'U15','Defender'::position_group,'RB','RB',
 ARRAY['RB','RWB']::text[],ARRAY['RWB']::text[],'Right',
 'average'::height_category,
 CASE 'average' WHEN 'short' THEN '160-165 cm' WHEN 'average' THEN '165-170 cm' WHEN 'tall' THEN '170-178 cm' WHEN 'very_tall' THEN '178-188 cm' ELSE '165-170 cm' END,
 'athletic'::build_category,
 CASE 'athletic' WHEN 'slight' THEN '52-58 kg' WHEN 'lean' THEN '56-63 kg' WHEN 'athletic' THEN '60-68 kg' WHEN 'powerful' THEN '66-75 kg' ELSE '58-66 kg' END,
 'c5255a4f-9052-4f66-b3fc-95f4d2afc480','Northgate United (Demo)','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',14,0,4,2,69,7500,'Available','{"general":{"first_touch":8,"passing":8,"dribbling":8,"weak_foot":7,"awareness":7,"decision_making":7,"pace":8,"agility_balance":6,"strength":7,"stamina":7,"composure":7,"coachability":6,"response_to_mistakes":6},"defender":{"one_v_one_defending":7,"tackling":6,"defensive_positioning":7,"marking_covering":8,"anticipation_interceptions":6,"aerial_defending":7,"recovery_defending":7,"pressing_defensive_transition":6,"communication_organisation":7,"progression_from_defence":6,"crossing_attacking_support":8}}'::jsonb,'ten','v4.0.0',now(),'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 false,true,true,'v4.0.0',now())
ON CONFLICT (id) DO UPDATE SET
 first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,age=EXCLUDED.age,age_group=EXCLUDED.age_group,position_group=EXCLUDED.position_group,
 specific_position=EXCLUDED.specific_position,primary_position=EXCLUDED.primary_position,positions=EXCLUDED.positions,alternative_positions=EXCLUDED.alternative_positions,
 foot=EXCLUDED.foot,height_category=EXCLUDED.height_category,height_range_cm=EXCLUDED.height_range_cm,build_category=EXCLUDED.build_category,
 weight_range_kg=EXCLUDED.weight_range_kg,team_id=EXCLUDED.team_id,team_name=EXCLUDED.team_name,assigned_coach_id=EXCLUDED.assigned_coach_id,
 appearances=EXCLUDED.appearances,goals=EXCLUDED.goals,assists=EXCLUDED.assists,clean_sheets=EXCLUDED.clean_sheets,overall_rating=EXCLUDED.overall_rating,
 transfer_value=EXCLUDED.transfer_value,availability=EXCLUDED.availability,attribute_ratings=EXCLUDED.attribute_ratings,
 attribute_rating_scale='ten',attribute_assessment_version='v4.0.0',attribute_assessed_at=now(),attribute_assessed_by='ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 is_active=true,is_demo=true,scoring_version='v4.0.0',updated_at=now();
INSERT INTO public.players
(id,player_id,first_name,last_name,age,age_group,position_group,specific_position,primary_position,positions,alternative_positions,foot,
 height_category,height_range_cm,build_category,weight_range_kg,team_id,team_name,assigned_coach_id,appearances,goals,assists,clean_sheets,
 overall_rating,transfer_value,availability,attribute_ratings,attribute_rating_scale,attribute_assessment_version,attribute_assessed_at,attribute_assessed_by,
 registration_complete,is_active,is_demo,scoring_version,updated_at)
VALUES
('eef6acf1-21a0-4e03-97a6-143aadc5bfa0','DPL046','Kobe','Roberts',16,'U16','Attacker'::position_group,'ST','ST',
 ARRAY['ST','CF']::text[],ARRAY['CF']::text[],'Right',
 'tall'::height_category,
 CASE 'tall' WHEN 'short' THEN '160-165 cm' WHEN 'average' THEN '165-170 cm' WHEN 'tall' THEN '170-178 cm' WHEN 'very_tall' THEN '178-188 cm' ELSE '165-170 cm' END,
 'powerful'::build_category,
 CASE 'powerful' WHEN 'slight' THEN '52-58 kg' WHEN 'lean' THEN '56-63 kg' WHEN 'athletic' THEN '60-68 kg' WHEN 'powerful' THEN '66-75 kg' ELSE '58-66 kg' END,
 'c5255a4f-9052-4f66-b3fc-95f4d2afc480','Northgate United (Demo)','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',18,12,4,0,81,24000,'Available','{"general":{"first_touch":8,"passing":7,"dribbling":8,"weak_foot":9,"awareness":7,"decision_making":8,"pace":8,"agility_balance":7,"strength":8,"stamina":8,"composure":8,"coachability":7,"response_to_mistakes":9},"attacker":{"finishing":7,"shooting":8,"attacking_movement":7,"one_v_one_attacking":8,"runs_in_behind":7,"chance_creation":8,"crossing":7,"link_up_play":7,"hold_up_play":8,"aerial_ability":8,"pressing_from_front":7}}'::jsonb,'ten','v4.0.0',now(),'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 false,true,true,'v4.0.0',now())
ON CONFLICT (id) DO UPDATE SET
 first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,age=EXCLUDED.age,age_group=EXCLUDED.age_group,position_group=EXCLUDED.position_group,
 specific_position=EXCLUDED.specific_position,primary_position=EXCLUDED.primary_position,positions=EXCLUDED.positions,alternative_positions=EXCLUDED.alternative_positions,
 foot=EXCLUDED.foot,height_category=EXCLUDED.height_category,height_range_cm=EXCLUDED.height_range_cm,build_category=EXCLUDED.build_category,
 weight_range_kg=EXCLUDED.weight_range_kg,team_id=EXCLUDED.team_id,team_name=EXCLUDED.team_name,assigned_coach_id=EXCLUDED.assigned_coach_id,
 appearances=EXCLUDED.appearances,goals=EXCLUDED.goals,assists=EXCLUDED.assists,clean_sheets=EXCLUDED.clean_sheets,overall_rating=EXCLUDED.overall_rating,
 transfer_value=EXCLUDED.transfer_value,availability=EXCLUDED.availability,attribute_ratings=EXCLUDED.attribute_ratings,
 attribute_rating_scale='ten',attribute_assessment_version='v4.0.0',attribute_assessed_at=now(),attribute_assessed_by='ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 is_active=true,is_demo=true,scoring_version='v4.0.0',updated_at=now();
INSERT INTO public.players
(id,player_id,first_name,last_name,age,age_group,position_group,specific_position,primary_position,positions,alternative_positions,foot,
 height_category,height_range_cm,build_category,weight_range_kg,team_id,team_name,assigned_coach_id,appearances,goals,assists,clean_sheets,
 overall_rating,transfer_value,availability,attribute_ratings,attribute_rating_scale,attribute_assessment_version,attribute_assessed_at,attribute_assessed_by,
 registration_complete,is_active,is_demo,scoring_version,updated_at)
VALUES
('683b4427-9366-507f-b0a4-92996f41b1d2','DNG008','Dami','Adeyemi',16,'U16','Goalkeeper'::position_group,'GK','GK',
 ARRAY['GK']::text[],ARRAY[]::text[],'Right',
 'very_tall'::height_category,
 CASE 'very_tall' WHEN 'short' THEN '160-165 cm' WHEN 'average' THEN '165-170 cm' WHEN 'tall' THEN '170-178 cm' WHEN 'very_tall' THEN '178-188 cm' ELSE '165-170 cm' END,
 'athletic'::build_category,
 CASE 'athletic' WHEN 'slight' THEN '52-58 kg' WHEN 'lean' THEN '56-63 kg' WHEN 'athletic' THEN '60-68 kg' WHEN 'powerful' THEN '66-75 kg' ELSE '58-66 kg' END,
 'c5255a4f-9052-4f66-b3fc-95f4d2afc480','Northgate United (Demo)','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',15,0,0,5,73,12000,'Available','{"goalkeeper":{"gk_positioning":6,"gk_shot_stopping":7,"gk_reflexes":7,"gk_handling":7,"gk_one_v_one":7,"gk_aerial_command":6,"gk_sweeping":7,"gk_distribution":6,"gk_communication":8,"gk_decision_making":7,"gk_composure":6,"gk_agility_explosiveness":6}}'::jsonb,'ten','v4.0.0',now(),'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 false,true,true,'v4.0.0',now())
ON CONFLICT (id) DO UPDATE SET
 first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,age=EXCLUDED.age,age_group=EXCLUDED.age_group,position_group=EXCLUDED.position_group,
 specific_position=EXCLUDED.specific_position,primary_position=EXCLUDED.primary_position,positions=EXCLUDED.positions,alternative_positions=EXCLUDED.alternative_positions,
 foot=EXCLUDED.foot,height_category=EXCLUDED.height_category,height_range_cm=EXCLUDED.height_range_cm,build_category=EXCLUDED.build_category,
 weight_range_kg=EXCLUDED.weight_range_kg,team_id=EXCLUDED.team_id,team_name=EXCLUDED.team_name,assigned_coach_id=EXCLUDED.assigned_coach_id,
 appearances=EXCLUDED.appearances,goals=EXCLUDED.goals,assists=EXCLUDED.assists,clean_sheets=EXCLUDED.clean_sheets,overall_rating=EXCLUDED.overall_rating,
 transfer_value=EXCLUDED.transfer_value,availability=EXCLUDED.availability,attribute_ratings=EXCLUDED.attribute_ratings,
 attribute_rating_scale='ten',attribute_assessment_version='v4.0.0',attribute_assessed_at=now(),attribute_assessed_by='ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 is_active=true,is_demo=true,scoring_version='v4.0.0',updated_at=now();
INSERT INTO public.players
(id,player_id,first_name,last_name,age,age_group,position_group,specific_position,primary_position,positions,alternative_positions,foot,
 height_category,height_range_cm,build_category,weight_range_kg,team_id,team_name,assigned_coach_id,appearances,goals,assists,clean_sheets,
 overall_rating,transfer_value,availability,attribute_ratings,attribute_rating_scale,attribute_assessment_version,attribute_assessed_at,attribute_assessed_by,
 registration_complete,is_active,is_demo,scoring_version,updated_at)
VALUES
('808ab9f0-e897-5f5f-9b19-7b835bc1f1de','DNG009','Theo','Nwosu',16,'U16','Attacker'::position_group,'ST','ST',
 ARRAY['ST','CF']::text[],ARRAY['CF']::text[],'Right',
 'tall'::height_category,
 CASE 'tall' WHEN 'short' THEN '160-165 cm' WHEN 'average' THEN '165-170 cm' WHEN 'tall' THEN '170-178 cm' WHEN 'very_tall' THEN '178-188 cm' ELSE '165-170 cm' END,
 'athletic'::build_category,
 CASE 'athletic' WHEN 'slight' THEN '52-58 kg' WHEN 'lean' THEN '56-63 kg' WHEN 'athletic' THEN '60-68 kg' WHEN 'powerful' THEN '66-75 kg' ELSE '58-66 kg' END,
 'c5255a4f-9052-4f66-b3fc-95f4d2afc480','Northgate United (Demo)','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',17,11,5,0,80,22000,'Available','{"general":{"first_touch":9,"passing":8,"dribbling":7,"weak_foot":7,"awareness":7,"decision_making":8,"pace":7,"agility_balance":8,"strength":7,"stamina":8,"composure":8,"coachability":8,"response_to_mistakes":9},"attacker":{"finishing":8,"shooting":7,"attacking_movement":8,"one_v_one_attacking":8,"runs_in_behind":7,"chance_creation":8,"crossing":9,"link_up_play":8,"hold_up_play":7,"aerial_ability":7,"pressing_from_front":8}}'::jsonb,'ten','v4.0.0',now(),'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 false,true,true,'v4.0.0',now())
ON CONFLICT (id) DO UPDATE SET
 first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,age=EXCLUDED.age,age_group=EXCLUDED.age_group,position_group=EXCLUDED.position_group,
 specific_position=EXCLUDED.specific_position,primary_position=EXCLUDED.primary_position,positions=EXCLUDED.positions,alternative_positions=EXCLUDED.alternative_positions,
 foot=EXCLUDED.foot,height_category=EXCLUDED.height_category,height_range_cm=EXCLUDED.height_range_cm,build_category=EXCLUDED.build_category,
 weight_range_kg=EXCLUDED.weight_range_kg,team_id=EXCLUDED.team_id,team_name=EXCLUDED.team_name,assigned_coach_id=EXCLUDED.assigned_coach_id,
 appearances=EXCLUDED.appearances,goals=EXCLUDED.goals,assists=EXCLUDED.assists,clean_sheets=EXCLUDED.clean_sheets,overall_rating=EXCLUDED.overall_rating,
 transfer_value=EXCLUDED.transfer_value,availability=EXCLUDED.availability,attribute_ratings=EXCLUDED.attribute_ratings,
 attribute_rating_scale='ten',attribute_assessment_version='v4.0.0',attribute_assessed_at=now(),attribute_assessed_by='ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 is_active=true,is_demo=true,scoring_version='v4.0.0',updated_at=now();
INSERT INTO public.players
(id,player_id,first_name,last_name,age,age_group,position_group,specific_position,primary_position,positions,alternative_positions,foot,
 height_category,height_range_cm,build_category,weight_range_kg,team_id,team_name,assigned_coach_id,appearances,goals,assists,clean_sheets,
 overall_rating,transfer_value,availability,attribute_ratings,attribute_rating_scale,attribute_assessment_version,attribute_assessed_at,attribute_assessed_by,
 registration_complete,is_active,is_demo,scoring_version,updated_at)
VALUES
('fcc9b976-cf54-5c82-979b-90159d79abc3','DNG010','Aaron','James',15,'U15','Midfielder'::position_group,'CM','CM',
 ARRAY['CM','AM','DM']::text[],ARRAY['AM','DM']::text[],'Right',
 'average'::height_category,
 CASE 'average' WHEN 'short' THEN '160-165 cm' WHEN 'average' THEN '165-170 cm' WHEN 'tall' THEN '170-178 cm' WHEN 'very_tall' THEN '178-188 cm' ELSE '165-170 cm' END,
 'lean'::build_category,
 CASE 'lean' WHEN 'slight' THEN '52-58 kg' WHEN 'lean' THEN '56-63 kg' WHEN 'athletic' THEN '60-68 kg' WHEN 'powerful' THEN '66-75 kg' ELSE '58-66 kg' END,
 'c5255a4f-9052-4f66-b3fc-95f4d2afc480','Northgate United (Demo)','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',15,3,8,0,75,15000,'Available','{"general":{"first_touch":8,"passing":7,"dribbling":9,"weak_foot":7,"awareness":9,"decision_making":8,"pace":8,"agility_balance":8,"strength":8,"stamina":7,"composure":7,"coachability":8,"response_to_mistakes":8},"midfielder":{"receiving_under_pressure":7,"ball_retention":9,"progressive_passing":8,"long_passing_switching":7,"tempo_control":8,"chance_creation":9,"anticipation_interceptions":7,"defensive_positioning_covering":8,"pressing_counter_pressing":8,"off_ball_movement_box_arrivals":8}}'::jsonb,'ten','v4.0.0',now(),'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 false,true,true,'v4.0.0',now())
ON CONFLICT (id) DO UPDATE SET
 first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,age=EXCLUDED.age,age_group=EXCLUDED.age_group,position_group=EXCLUDED.position_group,
 specific_position=EXCLUDED.specific_position,primary_position=EXCLUDED.primary_position,positions=EXCLUDED.positions,alternative_positions=EXCLUDED.alternative_positions,
 foot=EXCLUDED.foot,height_category=EXCLUDED.height_category,height_range_cm=EXCLUDED.height_range_cm,build_category=EXCLUDED.build_category,
 weight_range_kg=EXCLUDED.weight_range_kg,team_id=EXCLUDED.team_id,team_name=EXCLUDED.team_name,assigned_coach_id=EXCLUDED.assigned_coach_id,
 appearances=EXCLUDED.appearances,goals=EXCLUDED.goals,assists=EXCLUDED.assists,clean_sheets=EXCLUDED.clean_sheets,overall_rating=EXCLUDED.overall_rating,
 transfer_value=EXCLUDED.transfer_value,availability=EXCLUDED.availability,attribute_ratings=EXCLUDED.attribute_ratings,
 attribute_rating_scale='ten',attribute_assessment_version='v4.0.0',attribute_assessed_at=now(),attribute_assessed_by='ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 is_active=true,is_demo=true,scoring_version='v4.0.0',updated_at=now();
INSERT INTO public.players
(id,player_id,first_name,last_name,age,age_group,position_group,specific_position,primary_position,positions,alternative_positions,foot,
 height_category,height_range_cm,build_category,weight_range_kg,team_id,team_name,assigned_coach_id,appearances,goals,assists,clean_sheets,
 overall_rating,transfer_value,availability,attribute_ratings,attribute_rating_scale,attribute_assessment_version,attribute_assessed_at,attribute_assessed_by,
 registration_complete,is_active,is_demo,scoring_version,updated_at)
VALUES
('49f78a84-1f70-5e7f-988c-0b0a74ee7e11','DNG011','Max','Cole',14,'U14','Defender'::position_group,'CB','CB',
 ARRAY['CB','LB']::text[],ARRAY['LB']::text[],'Left',
 'tall'::height_category,
 CASE 'tall' WHEN 'short' THEN '160-165 cm' WHEN 'average' THEN '165-170 cm' WHEN 'tall' THEN '170-178 cm' WHEN 'very_tall' THEN '178-188 cm' ELSE '165-170 cm' END,
 'athletic'::build_category,
 CASE 'athletic' WHEN 'slight' THEN '52-58 kg' WHEN 'lean' THEN '56-63 kg' WHEN 'athletic' THEN '60-68 kg' WHEN 'powerful' THEN '66-75 kg' ELSE '58-66 kg' END,
 'c5255a4f-9052-4f66-b3fc-95f4d2afc480','Northgate United (Demo)','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',16,1,1,5,73,10500,'Available','{"general":{"first_touch":7,"passing":6,"dribbling":8,"weak_foot":8,"awareness":8,"decision_making":7,"pace":7,"agility_balance":8,"strength":7,"stamina":6,"composure":7,"coachability":7,"response_to_mistakes":7},"defender":{"one_v_one_defending":8,"tackling":8,"defensive_positioning":7,"marking_covering":6,"anticipation_interceptions":6,"aerial_defending":7,"recovery_defending":7,"pressing_defensive_transition":7,"communication_organisation":7,"progression_from_defence":6,"crossing_attacking_support":7}}'::jsonb,'ten','v4.0.0',now(),'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 false,true,true,'v4.0.0',now())
ON CONFLICT (id) DO UPDATE SET
 first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,age=EXCLUDED.age,age_group=EXCLUDED.age_group,position_group=EXCLUDED.position_group,
 specific_position=EXCLUDED.specific_position,primary_position=EXCLUDED.primary_position,positions=EXCLUDED.positions,alternative_positions=EXCLUDED.alternative_positions,
 foot=EXCLUDED.foot,height_category=EXCLUDED.height_category,height_range_cm=EXCLUDED.height_range_cm,build_category=EXCLUDED.build_category,
 weight_range_kg=EXCLUDED.weight_range_kg,team_id=EXCLUDED.team_id,team_name=EXCLUDED.team_name,assigned_coach_id=EXCLUDED.assigned_coach_id,
 appearances=EXCLUDED.appearances,goals=EXCLUDED.goals,assists=EXCLUDED.assists,clean_sheets=EXCLUDED.clean_sheets,overall_rating=EXCLUDED.overall_rating,
 transfer_value=EXCLUDED.transfer_value,availability=EXCLUDED.availability,attribute_ratings=EXCLUDED.attribute_ratings,
 attribute_rating_scale='ten',attribute_assessment_version='v4.0.0',attribute_assessed_at=now(),attribute_assessed_by='ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 is_active=true,is_demo=true,scoring_version='v4.0.0',updated_at=now();
INSERT INTO public.players
(id,player_id,first_name,last_name,age,age_group,position_group,specific_position,primary_position,positions,alternative_positions,foot,
 height_category,height_range_cm,build_category,weight_range_kg,team_id,team_name,assigned_coach_id,appearances,goals,assists,clean_sheets,
 overall_rating,transfer_value,availability,attribute_ratings,attribute_rating_scale,attribute_assessment_version,attribute_assessed_at,attribute_assessed_by,
 registration_complete,is_active,is_demo,scoring_version,updated_at)
VALUES
('3b6d63a2-2f20-5f33-81d9-46fef9c6a1f8','DNG012','Kai','Brennan',14,'U14','Defender'::position_group,'RB','RB',
 ARRAY['RB','RWB']::text[],ARRAY['RWB']::text[],'Right',
 'average'::height_category,
 CASE 'average' WHEN 'short' THEN '160-165 cm' WHEN 'average' THEN '165-170 cm' WHEN 'tall' THEN '170-178 cm' WHEN 'very_tall' THEN '178-188 cm' ELSE '165-170 cm' END,
 'lean'::build_category,
 CASE 'lean' WHEN 'slight' THEN '52-58 kg' WHEN 'lean' THEN '56-63 kg' WHEN 'athletic' THEN '60-68 kg' WHEN 'powerful' THEN '66-75 kg' ELSE '58-66 kg' END,
 'c5255a4f-9052-4f66-b3fc-95f4d2afc480','Northgate United (Demo)','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',13,0,3,2,68,6500,'Available','{"general":{"first_touch":7,"passing":7,"dribbling":6,"weak_foot":8,"awareness":7,"decision_making":8,"pace":8,"agility_balance":8,"strength":7,"stamina":7},"defender":{"one_v_one_defending":8,"tackling":6,"defensive_positioning":7,"marking_covering":7,"anticipation_interceptions":6,"aerial_defending":8,"recovery_defending":7,"pressing_defensive_transition":8,"communication_organisation":6}}'::jsonb,'ten','v4.0.0',now(),'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 false,true,true,'v4.0.0',now())
ON CONFLICT (id) DO UPDATE SET
 first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,age=EXCLUDED.age,age_group=EXCLUDED.age_group,position_group=EXCLUDED.position_group,
 specific_position=EXCLUDED.specific_position,primary_position=EXCLUDED.primary_position,positions=EXCLUDED.positions,alternative_positions=EXCLUDED.alternative_positions,
 foot=EXCLUDED.foot,height_category=EXCLUDED.height_category,height_range_cm=EXCLUDED.height_range_cm,build_category=EXCLUDED.build_category,
 weight_range_kg=EXCLUDED.weight_range_kg,team_id=EXCLUDED.team_id,team_name=EXCLUDED.team_name,assigned_coach_id=EXCLUDED.assigned_coach_id,
 appearances=EXCLUDED.appearances,goals=EXCLUDED.goals,assists=EXCLUDED.assists,clean_sheets=EXCLUDED.clean_sheets,overall_rating=EXCLUDED.overall_rating,
 transfer_value=EXCLUDED.transfer_value,availability=EXCLUDED.availability,attribute_ratings=EXCLUDED.attribute_ratings,
 attribute_rating_scale='ten',attribute_assessment_version='v4.0.0',attribute_assessed_at=now(),attribute_assessed_by='ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 is_active=true,is_demo=true,scoring_version='v4.0.0',updated_at=now();
INSERT INTO public.players
(id,player_id,first_name,last_name,age,age_group,position_group,specific_position,primary_position,positions,alternative_positions,foot,
 height_category,height_range_cm,build_category,weight_range_kg,team_id,team_name,assigned_coach_id,appearances,goals,assists,clean_sheets,
 overall_rating,transfer_value,availability,attribute_ratings,attribute_rating_scale,attribute_assessment_version,attribute_assessed_at,attribute_assessed_by,
 registration_complete,is_active,is_demo,scoring_version,updated_at)
VALUES
('553df25b-5371-55c0-afd3-15b7adf6215c','DNG013','Owen','Hart',16,'U16','Midfielder'::position_group,'DM','DM',
 ARRAY['DM','CM']::text[],ARRAY['CM']::text[],'Left',
 'tall'::height_category,
 CASE 'tall' WHEN 'short' THEN '160-165 cm' WHEN 'average' THEN '165-170 cm' WHEN 'tall' THEN '170-178 cm' WHEN 'very_tall' THEN '178-188 cm' ELSE '165-170 cm' END,
 'athletic'::build_category,
 CASE 'athletic' WHEN 'slight' THEN '52-58 kg' WHEN 'lean' THEN '56-63 kg' WHEN 'athletic' THEN '60-68 kg' WHEN 'powerful' THEN '66-75 kg' ELSE '58-66 kg' END,
 'c5255a4f-9052-4f66-b3fc-95f4d2afc480','Northgate United (Demo)','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',16,1,5,0,72,11000,'Available','{"general":{"first_touch":7,"passing":7,"dribbling":7,"weak_foot":8,"awareness":7,"decision_making":6,"pace":7,"agility_balance":7,"strength":8,"stamina":7,"composure":7,"coachability":8,"response_to_mistakes":8},"midfielder":{"receiving_under_pressure":6,"ball_retention":8,"progressive_passing":8,"long_passing_switching":6,"tempo_control":8,"chance_creation":7,"anticipation_interceptions":8,"defensive_positioning_covering":8,"pressing_counter_pressing":7,"off_ball_movement_box_arrivals":7}}'::jsonb,'ten','v4.0.0',now(),'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 false,true,true,'v4.0.0',now())
ON CONFLICT (id) DO UPDATE SET
 first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,age=EXCLUDED.age,age_group=EXCLUDED.age_group,position_group=EXCLUDED.position_group,
 specific_position=EXCLUDED.specific_position,primary_position=EXCLUDED.primary_position,positions=EXCLUDED.positions,alternative_positions=EXCLUDED.alternative_positions,
 foot=EXCLUDED.foot,height_category=EXCLUDED.height_category,height_range_cm=EXCLUDED.height_range_cm,build_category=EXCLUDED.build_category,
 weight_range_kg=EXCLUDED.weight_range_kg,team_id=EXCLUDED.team_id,team_name=EXCLUDED.team_name,assigned_coach_id=EXCLUDED.assigned_coach_id,
 appearances=EXCLUDED.appearances,goals=EXCLUDED.goals,assists=EXCLUDED.assists,clean_sheets=EXCLUDED.clean_sheets,overall_rating=EXCLUDED.overall_rating,
 transfer_value=EXCLUDED.transfer_value,availability=EXCLUDED.availability,attribute_ratings=EXCLUDED.attribute_ratings,
 attribute_rating_scale='ten',attribute_assessment_version='v4.0.0',attribute_assessed_at=now(),attribute_assessed_by='ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 is_active=true,is_demo=true,scoring_version='v4.0.0',updated_at=now();
INSERT INTO public.players
(id,player_id,first_name,last_name,age,age_group,position_group,specific_position,primary_position,positions,alternative_positions,foot,
 height_category,height_range_cm,build_category,weight_range_kg,team_id,team_name,assigned_coach_id,appearances,goals,assists,clean_sheets,
 overall_rating,transfer_value,availability,attribute_ratings,attribute_rating_scale,attribute_assessment_version,attribute_assessed_at,attribute_assessed_by,
 registration_complete,is_active,is_demo,scoring_version,updated_at)
VALUES
('6a27ce62-99c0-5e59-8c8d-bd768dbeafc6','DNG014','Femi','Bakare',14,'U14','Midfielder'::position_group,'AM','AM',
 ARRAY['AM','CM','RW']::text[],ARRAY['CM','RW']::text[],'Right',
 'short'::height_category,
 CASE 'short' WHEN 'short' THEN '160-165 cm' WHEN 'average' THEN '165-170 cm' WHEN 'tall' THEN '170-178 cm' WHEN 'very_tall' THEN '178-188 cm' ELSE '165-170 cm' END,
 'lean'::build_category,
 CASE 'lean' WHEN 'slight' THEN '52-58 kg' WHEN 'lean' THEN '56-63 kg' WHEN 'athletic' THEN '60-68 kg' WHEN 'powerful' THEN '66-75 kg' ELSE '58-66 kg' END,
 'c5255a4f-9052-4f66-b3fc-95f4d2afc480','Northgate United (Demo)','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',14,5,6,0,70,8000,'Available','{"general":{"first_touch":8,"passing":7,"dribbling":7,"weak_foot":6,"awareness":8,"decision_making":6,"pace":8,"agility_balance":7,"strength":7,"stamina":6},"midfielder":{"receiving_under_pressure":7,"ball_retention":6,"progressive_passing":7,"long_passing_switching":7,"tempo_control":7,"chance_creation":7,"anticipation_interceptions":8,"defensive_positioning_covering":7}}'::jsonb,'ten','v4.0.0',now(),'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 false,true,true,'v4.0.0',now())
ON CONFLICT (id) DO UPDATE SET
 first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,age=EXCLUDED.age,age_group=EXCLUDED.age_group,position_group=EXCLUDED.position_group,
 specific_position=EXCLUDED.specific_position,primary_position=EXCLUDED.primary_position,positions=EXCLUDED.positions,alternative_positions=EXCLUDED.alternative_positions,
 foot=EXCLUDED.foot,height_category=EXCLUDED.height_category,height_range_cm=EXCLUDED.height_range_cm,build_category=EXCLUDED.build_category,
 weight_range_kg=EXCLUDED.weight_range_kg,team_id=EXCLUDED.team_id,team_name=EXCLUDED.team_name,assigned_coach_id=EXCLUDED.assigned_coach_id,
 appearances=EXCLUDED.appearances,goals=EXCLUDED.goals,assists=EXCLUDED.assists,clean_sheets=EXCLUDED.clean_sheets,overall_rating=EXCLUDED.overall_rating,
 transfer_value=EXCLUDED.transfer_value,availability=EXCLUDED.availability,attribute_ratings=EXCLUDED.attribute_ratings,
 attribute_rating_scale='ten',attribute_assessment_version='v4.0.0',attribute_assessed_at=now(),attribute_assessed_by='ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 is_active=true,is_demo=true,scoring_version='v4.0.0',updated_at=now();
INSERT INTO public.players
(id,player_id,first_name,last_name,age,age_group,position_group,specific_position,primary_position,positions,alternative_positions,foot,
 height_category,height_range_cm,build_category,weight_range_kg,team_id,team_name,assigned_coach_id,appearances,goals,assists,clean_sheets,
 overall_rating,transfer_value,availability,attribute_ratings,attribute_rating_scale,attribute_assessment_version,attribute_assessed_at,attribute_assessed_by,
 registration_complete,is_active,is_demo,scoring_version,updated_at)
VALUES
('8c8c4299-8bf2-5333-b017-c41be156de47','DNG015','Zane','Okafor',15,'U15','Attacker'::position_group,'RW','RW',
 ARRAY['RW','LW']::text[],ARRAY['LW']::text[],'Left',
 'average'::height_category,
 CASE 'average' WHEN 'short' THEN '160-165 cm' WHEN 'average' THEN '165-170 cm' WHEN 'tall' THEN '170-178 cm' WHEN 'very_tall' THEN '178-188 cm' ELSE '165-170 cm' END,
 'slight'::build_category,
 CASE 'slight' WHEN 'slight' THEN '52-58 kg' WHEN 'lean' THEN '56-63 kg' WHEN 'athletic' THEN '60-68 kg' WHEN 'powerful' THEN '66-75 kg' ELSE '58-66 kg' END,
 'c5255a4f-9052-4f66-b3fc-95f4d2afc480','Northgate United (Demo)','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',15,6,5,0,71,9500,'Available','{"general":{"first_touch":6,"passing":7,"dribbling":7,"weak_foot":6,"awareness":8,"decision_making":8,"pace":7,"agility_balance":8,"strength":8,"stamina":7,"composure":8,"coachability":8,"response_to_mistakes":6},"attacker":{"finishing":6,"shooting":7,"attacking_movement":7,"one_v_one_attacking":7,"runs_in_behind":7,"chance_creation":7,"crossing":7,"link_up_play":7,"hold_up_play":7,"aerial_ability":7,"pressing_from_front":6}}'::jsonb,'ten','v4.0.0',now(),'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 false,true,true,'v4.0.0',now())
ON CONFLICT (id) DO UPDATE SET
 first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,age=EXCLUDED.age,age_group=EXCLUDED.age_group,position_group=EXCLUDED.position_group,
 specific_position=EXCLUDED.specific_position,primary_position=EXCLUDED.primary_position,positions=EXCLUDED.positions,alternative_positions=EXCLUDED.alternative_positions,
 foot=EXCLUDED.foot,height_category=EXCLUDED.height_category,height_range_cm=EXCLUDED.height_range_cm,build_category=EXCLUDED.build_category,
 weight_range_kg=EXCLUDED.weight_range_kg,team_id=EXCLUDED.team_id,team_name=EXCLUDED.team_name,assigned_coach_id=EXCLUDED.assigned_coach_id,
 appearances=EXCLUDED.appearances,goals=EXCLUDED.goals,assists=EXCLUDED.assists,clean_sheets=EXCLUDED.clean_sheets,overall_rating=EXCLUDED.overall_rating,
 transfer_value=EXCLUDED.transfer_value,availability=EXCLUDED.availability,attribute_ratings=EXCLUDED.attribute_ratings,
 attribute_rating_scale='ten',attribute_assessment_version='v4.0.0',attribute_assessed_at=now(),attribute_assessed_by='ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 is_active=true,is_demo=true,scoring_version='v4.0.0',updated_at=now();
INSERT INTO public.players
(id,player_id,first_name,last_name,age,age_group,position_group,specific_position,primary_position,positions,alternative_positions,foot,
 height_category,height_range_cm,build_category,weight_range_kg,team_id,team_name,assigned_coach_id,appearances,goals,assists,clean_sheets,
 overall_rating,transfer_value,availability,attribute_ratings,attribute_rating_scale,attribute_assessment_version,attribute_assessed_at,attribute_assessed_by,
 registration_complete,is_active,is_demo,scoring_version,updated_at)
VALUES
('3e8de72f-b882-5281-904d-66ebfb035c8b','DNG016','Louis','Marek',16,'U16','Defender'::position_group,'CB','CB',
 ARRAY['CB','RB']::text[],ARRAY['RB']::text[],'Right',
 'very_tall'::height_category,
 CASE 'very_tall' WHEN 'short' THEN '160-165 cm' WHEN 'average' THEN '165-170 cm' WHEN 'tall' THEN '170-178 cm' WHEN 'very_tall' THEN '178-188 cm' ELSE '165-170 cm' END,
 'powerful'::build_category,
 CASE 'powerful' WHEN 'slight' THEN '52-58 kg' WHEN 'lean' THEN '56-63 kg' WHEN 'athletic' THEN '60-68 kg' WHEN 'powerful' THEN '66-75 kg' ELSE '58-66 kg' END,
 'c5255a4f-9052-4f66-b3fc-95f4d2afc480','Northgate United (Demo)','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',18,2,1,6,75,14000,'Available','{"general":{"first_touch":7,"passing":8,"dribbling":9,"weak_foot":9,"awareness":8,"decision_making":9,"pace":8,"agility_balance":9,"strength":7,"stamina":7,"composure":9,"coachability":9,"response_to_mistakes":9},"defender":{"one_v_one_defending":8,"tackling":8,"defensive_positioning":8,"marking_covering":8,"anticipation_interceptions":7,"aerial_defending":8,"recovery_defending":9,"pressing_defensive_transition":7,"communication_organisation":7,"progression_from_defence":8,"crossing_attacking_support":9}}'::jsonb,'ten','v4.0.0',now(),'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 false,true,true,'v4.0.0',now())
ON CONFLICT (id) DO UPDATE SET
 first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,age=EXCLUDED.age,age_group=EXCLUDED.age_group,position_group=EXCLUDED.position_group,
 specific_position=EXCLUDED.specific_position,primary_position=EXCLUDED.primary_position,positions=EXCLUDED.positions,alternative_positions=EXCLUDED.alternative_positions,
 foot=EXCLUDED.foot,height_category=EXCLUDED.height_category,height_range_cm=EXCLUDED.height_range_cm,build_category=EXCLUDED.build_category,
 weight_range_kg=EXCLUDED.weight_range_kg,team_id=EXCLUDED.team_id,team_name=EXCLUDED.team_name,assigned_coach_id=EXCLUDED.assigned_coach_id,
 appearances=EXCLUDED.appearances,goals=EXCLUDED.goals,assists=EXCLUDED.assists,clean_sheets=EXCLUDED.clean_sheets,overall_rating=EXCLUDED.overall_rating,
 transfer_value=EXCLUDED.transfer_value,availability=EXCLUDED.availability,attribute_ratings=EXCLUDED.attribute_ratings,
 attribute_rating_scale='ten',attribute_assessment_version='v4.0.0',attribute_assessed_at=now(),attribute_assessed_by='ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 is_active=true,is_demo=true,scoring_version='v4.0.0',updated_at=now();
INSERT INTO public.players
(id,player_id,first_name,last_name,age,age_group,position_group,specific_position,primary_position,positions,alternative_positions,foot,
 height_category,height_range_cm,build_category,weight_range_kg,team_id,team_name,assigned_coach_id,appearances,goals,assists,clean_sheets,
 overall_rating,transfer_value,availability,attribute_ratings,attribute_rating_scale,attribute_assessment_version,attribute_assessed_at,attribute_assessed_by,
 registration_complete,is_active,is_demo,scoring_version,updated_at)
VALUES
('43408359-d111-5b37-a3ca-391f3c67f2d8','DNG017','Elias','Mendes',14,'U14','Attacker'::position_group,'LW','LW',
 ARRAY['LW','AM']::text[],ARRAY['AM']::text[],'Right',
 'short'::height_category,
 CASE 'short' WHEN 'short' THEN '160-165 cm' WHEN 'average' THEN '165-170 cm' WHEN 'tall' THEN '170-178 cm' WHEN 'very_tall' THEN '178-188 cm' ELSE '165-170 cm' END,
 'lean'::build_category,
 CASE 'lean' WHEN 'slight' THEN '52-58 kg' WHEN 'lean' THEN '56-63 kg' WHEN 'athletic' THEN '60-68 kg' WHEN 'powerful' THEN '66-75 kg' ELSE '58-66 kg' END,
 'c5255a4f-9052-4f66-b3fc-95f4d2afc480','Northgate United (Demo)','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',12,5,4,0,69,7000,'Available','{"general":{"first_touch":7,"passing":8,"dribbling":7,"weak_foot":7,"awareness":6,"decision_making":7,"pace":8,"agility_balance":6,"strength":8,"stamina":8},"attacker":{"finishing":7,"shooting":6,"attacking_movement":7,"one_v_one_attacking":7,"runs_in_behind":7,"chance_creation":7,"crossing":7,"link_up_play":7,"hold_up_play":7}}'::jsonb,'ten','v4.0.0',now(),'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 false,true,true,'v4.0.0',now())
ON CONFLICT (id) DO UPDATE SET
 first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,age=EXCLUDED.age,age_group=EXCLUDED.age_group,position_group=EXCLUDED.position_group,
 specific_position=EXCLUDED.specific_position,primary_position=EXCLUDED.primary_position,positions=EXCLUDED.positions,alternative_positions=EXCLUDED.alternative_positions,
 foot=EXCLUDED.foot,height_category=EXCLUDED.height_category,height_range_cm=EXCLUDED.height_range_cm,build_category=EXCLUDED.build_category,
 weight_range_kg=EXCLUDED.weight_range_kg,team_id=EXCLUDED.team_id,team_name=EXCLUDED.team_name,assigned_coach_id=EXCLUDED.assigned_coach_id,
 appearances=EXCLUDED.appearances,goals=EXCLUDED.goals,assists=EXCLUDED.assists,clean_sheets=EXCLUDED.clean_sheets,overall_rating=EXCLUDED.overall_rating,
 transfer_value=EXCLUDED.transfer_value,availability=EXCLUDED.availability,attribute_ratings=EXCLUDED.attribute_ratings,
 attribute_rating_scale='ten',attribute_assessment_version='v4.0.0',attribute_assessed_at=now(),attribute_assessed_by='ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 is_active=true,is_demo=true,scoring_version='v4.0.0',updated_at=now();
INSERT INTO public.players
(id,player_id,first_name,last_name,age,age_group,position_group,specific_position,primary_position,positions,alternative_positions,foot,
 height_category,height_range_cm,build_category,weight_range_kg,team_id,team_name,assigned_coach_id,appearances,goals,assists,clean_sheets,
 overall_rating,transfer_value,availability,attribute_ratings,attribute_rating_scale,attribute_assessment_version,attribute_assessed_at,attribute_assessed_by,
 registration_complete,is_active,is_demo,scoring_version,updated_at)
VALUES
('cfa0fa09-0822-56e0-9da5-1c0a1ef5a4c7','DNG018','Noah','Shah',15,'U15','Defender'::position_group,'LB','LB',
 ARRAY['LB','LWB']::text[],ARRAY['LWB']::text[],'Left',
 'average'::height_category,
 CASE 'average' WHEN 'short' THEN '160-165 cm' WHEN 'average' THEN '165-170 cm' WHEN 'tall' THEN '170-178 cm' WHEN 'very_tall' THEN '178-188 cm' ELSE '165-170 cm' END,
 'athletic'::build_category,
 CASE 'athletic' WHEN 'slight' THEN '52-58 kg' WHEN 'lean' THEN '56-63 kg' WHEN 'athletic' THEN '60-68 kg' WHEN 'powerful' THEN '66-75 kg' ELSE '58-66 kg' END,
 'c5255a4f-9052-4f66-b3fc-95f4d2afc480','Northgate United (Demo)','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',13,0,3,3,67,6000,'Injured','{"general":{"first_touch":8,"passing":8,"dribbling":7,"weak_foot":6,"awareness":7,"decision_making":7,"pace":6,"agility_balance":7,"strength":7,"stamina":6,"composure":7,"coachability":8},"defender":{"one_v_one_defending":8,"tackling":7,"defensive_positioning":7,"marking_covering":8,"anticipation_interceptions":6,"aerial_defending":8,"recovery_defending":6,"pressing_defensive_transition":8,"communication_organisation":7,"progression_from_defence":8,"crossing_attacking_support":7}}'::jsonb,'ten','v4.0.0',now(),'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 false,true,true,'v4.0.0',now())
ON CONFLICT (id) DO UPDATE SET
 first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,age=EXCLUDED.age,age_group=EXCLUDED.age_group,position_group=EXCLUDED.position_group,
 specific_position=EXCLUDED.specific_position,primary_position=EXCLUDED.primary_position,positions=EXCLUDED.positions,alternative_positions=EXCLUDED.alternative_positions,
 foot=EXCLUDED.foot,height_category=EXCLUDED.height_category,height_range_cm=EXCLUDED.height_range_cm,build_category=EXCLUDED.build_category,
 weight_range_kg=EXCLUDED.weight_range_kg,team_id=EXCLUDED.team_id,team_name=EXCLUDED.team_name,assigned_coach_id=EXCLUDED.assigned_coach_id,
 appearances=EXCLUDED.appearances,goals=EXCLUDED.goals,assists=EXCLUDED.assists,clean_sheets=EXCLUDED.clean_sheets,overall_rating=EXCLUDED.overall_rating,
 transfer_value=EXCLUDED.transfer_value,availability=EXCLUDED.availability,attribute_ratings=EXCLUDED.attribute_ratings,
 attribute_rating_scale='ten',attribute_assessment_version='v4.0.0',attribute_assessed_at=now(),attribute_assessed_by='ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 is_active=true,is_demo=true,scoring_version='v4.0.0',updated_at=now();
INSERT INTO public.players
(id,player_id,first_name,last_name,age,age_group,position_group,specific_position,primary_position,positions,alternative_positions,foot,
 height_category,height_range_cm,build_category,weight_range_kg,team_id,team_name,assigned_coach_id,appearances,goals,assists,clean_sheets,
 overall_rating,transfer_value,availability,attribute_ratings,attribute_rating_scale,attribute_assessment_version,attribute_assessed_at,attribute_assessed_by,
 registration_complete,is_active,is_demo,scoring_version,updated_at)
VALUES
('27ecefe3-68d8-5742-8e88-f36ce7195e04','DNG019','Jayden','Clarke',14,'U14','Attacker'::position_group,'CF','CF',
 ARRAY['CF','ST','AM']::text[],ARRAY['ST','AM']::text[],'Right',
 'average'::height_category,
 CASE 'average' WHEN 'short' THEN '160-165 cm' WHEN 'average' THEN '165-170 cm' WHEN 'tall' THEN '170-178 cm' WHEN 'very_tall' THEN '178-188 cm' ELSE '165-170 cm' END,
 'athletic'::build_category,
 CASE 'athletic' WHEN 'slight' THEN '52-58 kg' WHEN 'lean' THEN '56-63 kg' WHEN 'athletic' THEN '60-68 kg' WHEN 'powerful' THEN '66-75 kg' ELSE '58-66 kg' END,
 'c5255a4f-9052-4f66-b3fc-95f4d2afc480','Northgate United (Demo)','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',14,8,4,0,74,12500,'Available','{"general":{"first_touch":8,"passing":8,"dribbling":6,"weak_foot":7,"awareness":7,"decision_making":7,"pace":7,"agility_balance":8,"strength":7,"stamina":6,"composure":8,"coachability":7,"response_to_mistakes":7},"attacker":{"finishing":8,"shooting":6,"attacking_movement":8,"one_v_one_attacking":7,"runs_in_behind":8,"chance_creation":7,"crossing":6,"link_up_play":7,"hold_up_play":6,"aerial_ability":7,"pressing_from_front":7}}'::jsonb,'ten','v4.0.0',now(),'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 false,true,true,'v4.0.0',now())
ON CONFLICT (id) DO UPDATE SET
 first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,age=EXCLUDED.age,age_group=EXCLUDED.age_group,position_group=EXCLUDED.position_group,
 specific_position=EXCLUDED.specific_position,primary_position=EXCLUDED.primary_position,positions=EXCLUDED.positions,alternative_positions=EXCLUDED.alternative_positions,
 foot=EXCLUDED.foot,height_category=EXCLUDED.height_category,height_range_cm=EXCLUDED.height_range_cm,build_category=EXCLUDED.build_category,
 weight_range_kg=EXCLUDED.weight_range_kg,team_id=EXCLUDED.team_id,team_name=EXCLUDED.team_name,assigned_coach_id=EXCLUDED.assigned_coach_id,
 appearances=EXCLUDED.appearances,goals=EXCLUDED.goals,assists=EXCLUDED.assists,clean_sheets=EXCLUDED.clean_sheets,overall_rating=EXCLUDED.overall_rating,
 transfer_value=EXCLUDED.transfer_value,availability=EXCLUDED.availability,attribute_ratings=EXCLUDED.attribute_ratings,
 attribute_rating_scale='ten',attribute_assessment_version='v4.0.0',attribute_assessed_at=now(),attribute_assessed_by='ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 is_active=true,is_demo=true,scoring_version='v4.0.0',updated_at=now();
INSERT INTO public.players
(id,player_id,first_name,last_name,age,age_group,position_group,specific_position,primary_position,positions,alternative_positions,foot,
 height_category,height_range_cm,build_category,weight_range_kg,team_id,team_name,assigned_coach_id,appearances,goals,assists,clean_sheets,
 overall_rating,transfer_value,availability,attribute_ratings,attribute_rating_scale,attribute_assessment_version,attribute_assessed_at,attribute_assessed_by,
 registration_complete,is_active,is_demo,scoring_version,updated_at)
VALUES
('203755b0-bd4a-58db-b5a5-a65ef3f31044','DNG020','Amir','Haddad',16,'U16','Defender'::position_group,'RWB','RWB',
 ARRAY['RWB','RB','RM']::text[],ARRAY['RB','RM']::text[],'Right',
 'tall'::height_category,
 CASE 'tall' WHEN 'short' THEN '160-165 cm' WHEN 'average' THEN '165-170 cm' WHEN 'tall' THEN '170-178 cm' WHEN 'very_tall' THEN '178-188 cm' ELSE '165-170 cm' END,
 'lean'::build_category,
 CASE 'lean' WHEN 'slight' THEN '52-58 kg' WHEN 'lean' THEN '56-63 kg' WHEN 'athletic' THEN '60-68 kg' WHEN 'powerful' THEN '66-75 kg' ELSE '58-66 kg' END,
 'c5255a4f-9052-4f66-b3fc-95f4d2afc480','Northgate United (Demo)','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',15,1,5,2,70,8500,'Unavailable','{"general":{"first_touch":6,"passing":7,"dribbling":7,"weak_foot":6,"awareness":7,"decision_making":8,"pace":7,"agility_balance":7,"strength":8,"stamina":8,"composure":7,"coachability":7},"defender":{"one_v_one_defending":7,"tackling":6,"defensive_positioning":7,"marking_covering":8,"anticipation_interceptions":6,"aerial_defending":7,"recovery_defending":8,"pressing_defensive_transition":7,"communication_organisation":8,"progression_from_defence":8,"crossing_attacking_support":6}}'::jsonb,'ten','v4.0.0',now(),'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 false,true,true,'v4.0.0',now())
ON CONFLICT (id) DO UPDATE SET
 first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,age=EXCLUDED.age,age_group=EXCLUDED.age_group,position_group=EXCLUDED.position_group,
 specific_position=EXCLUDED.specific_position,primary_position=EXCLUDED.primary_position,positions=EXCLUDED.positions,alternative_positions=EXCLUDED.alternative_positions,
 foot=EXCLUDED.foot,height_category=EXCLUDED.height_category,height_range_cm=EXCLUDED.height_range_cm,build_category=EXCLUDED.build_category,
 weight_range_kg=EXCLUDED.weight_range_kg,team_id=EXCLUDED.team_id,team_name=EXCLUDED.team_name,assigned_coach_id=EXCLUDED.assigned_coach_id,
 appearances=EXCLUDED.appearances,goals=EXCLUDED.goals,assists=EXCLUDED.assists,clean_sheets=EXCLUDED.clean_sheets,overall_rating=EXCLUDED.overall_rating,
 transfer_value=EXCLUDED.transfer_value,availability=EXCLUDED.availability,attribute_ratings=EXCLUDED.attribute_ratings,
 attribute_rating_scale='ten',attribute_assessment_version='v4.0.0',attribute_assessed_at=now(),attribute_assessed_by='ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 is_active=true,is_demo=true,scoring_version='v4.0.0',updated_at=now();

-- Eight completed fixtures plus three upcoming fixtures.
INSERT INTO public.fixtures (id,team_id,coach_id,opponent,fixture_date,fixture_time,venue,home_or_away,format,notes,city,country,created_at) VALUES ('e320bcfe-10a4-55c3-b1ab-f3bdeedd671d','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','Eastbrook Athletic','2026-06-14','10:00','Eastbrook Athletic Training Ground','Away','11','Demo fixture for the public ScoutLink Coach workspace','London','England',now());
INSERT INTO public.fixtures (id,team_id,coach_id,opponent,fixture_date,fixture_time,venue,home_or_away,format,notes,city,country,created_at) VALUES ('cde0e401-f794-53c3-acc0-cec064b8febf','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','Meadow Park Rovers','2026-06-21','11:00','Northgate Community Ground','Home','11','Demo fixture for the public ScoutLink Coach workspace','London','England',now());
INSERT INTO public.fixtures (id,team_id,coach_id,opponent,fixture_date,fixture_time,venue,home_or_away,format,notes,city,country,created_at) VALUES ('adf6601b-c3c5-5ff9-8868-0dfe8c2f9e1d','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','Southvale Juniors','2026-06-28','10:30','Southvale Juniors Training Ground','Away','11','Demo fixture for the public ScoutLink Coach workspace','London','England',now());
INSERT INTO public.fixtures (id,team_id,coach_id,opponent,fixture_date,fixture_time,venue,home_or_away,format,notes,city,country,created_at) VALUES ('139b4848-e2d3-5119-9a0e-77b788a89f38','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','Harbour City Academy','2026-07-05','11:00','Northgate Community Ground','Home','11','Demo fixture for the public ScoutLink Coach workspace','London','England',now());
INSERT INTO public.fixtures (id,team_id,coach_id,opponent,fixture_date,fixture_time,venue,home_or_away,format,notes,city,country,created_at) VALUES ('ddc21f93-3f1d-526f-af6c-a7f908ae7bd3','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','Camden Athletic','2026-07-12','10:00','Northgate Community Ground','Home','11','Demo fixture for the public ScoutLink Coach workspace','London','England',now());
INSERT INTO public.fixtures (id,team_id,coach_id,opponent,fixture_date,fixture_time,venue,home_or_away,format,notes,city,country,created_at) VALUES ('b74bee7f-e77d-5ac0-a9ce-21bfffbd183f','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','Finchley Juniors','2026-07-20','11:30','Finchley Juniors Training Ground','Away','11','Demo fixture for the public ScoutLink Coach workspace','London','England',now());
INSERT INTO public.fixtures (id,team_id,coach_id,opponent,fixture_date,fixture_time,venue,home_or_away,format,notes,city,country,created_at) VALUES ('6bc45a4b-3506-5882-aefe-c8d543760256','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','Westbridge Youth','2026-07-26','10:00','Northgate Community Ground','Home','11','Demo fixture for the public ScoutLink Coach workspace','London','England',now());
INSERT INTO public.fixtures (id,team_id,coach_id,opponent,fixture_date,fixture_time,venue,home_or_away,format,notes,city,country,created_at) VALUES ('5f8c34a3-d92a-544f-ba47-cdc9c4f27c69','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','Riverside Town Academy','2026-08-02','11:00','Riverside Town Academy Training Ground','Away','11','Demo fixture for the public ScoutLink Coach workspace','London','England',now());
INSERT INTO public.fixtures (id,team_id,coach_id,opponent,fixture_date,fixture_time,venue,home_or_away,format,notes,city,country,created_at) VALUES ('f7be5a8b-a027-5390-a86b-2e7cb8701c9a','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','Camden Athletic','2026-08-15','10:00','Northgate Community Ground','Home','11','Demo fixture for the public ScoutLink Coach workspace','London','England',now());
INSERT INTO public.fixtures (id,team_id,coach_id,opponent,fixture_date,fixture_time,venue,home_or_away,format,notes,city,country,created_at) VALUES ('b52ecf31-96ca-5909-9358-16276e80b5a9','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','Barnet Youth','2026-08-22','11:30','Barnet Youth Training Ground','Away','11','Demo fixture for the public ScoutLink Coach workspace','London','England',now());
INSERT INTO public.fixtures (id,team_id,coach_id,opponent,fixture_date,fixture_time,venue,home_or_away,format,notes,city,country,created_at) VALUES ('40afd65f-0e09-5b11-9f7e-779a5cd170e2','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','Enfield Rangers','2026-08-30','10:00','Northgate Community Ground','Home','11','Demo fixture for the public ScoutLink Coach workspace','London','England',now());

-- Match Facts provide a real-looking development trend and player history.
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('daf7ee2d-9a3c-50e4-b90a-718bcb033cd8','9399e655-5416-44de-8f70-781f955bc0a1','2026-06-14','Eastbrook Athletic','W 3–1',80,0,0,0,0,false,7.7,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 3,1,'post','11','4-3-3','[]'::jsonb,'{"9399e655-5416-44de-8f70-781f955bc0a1":"CM"}'::jsonb,'{}'::jsonb,true,'e320bcfe-10a4-55c3-b1ab-f3bdeedd671d',
 'Demo Match Facts entry with coach-observed evidence.','CM','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":9,"passing":7,"dribbling":9},"midfielder":{"receiving_under_pressure":8,"ball_retention":8,"progressive_passing":8}}'::jsonb,'v4.0.0',('2026-06-14'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('142e25f3-65b8-589c-8e47-2c94e7afcf75','52d019ab-8fa4-49de-9716-270eeb651480','2026-06-14','Eastbrook Athletic','W 3–1',72,0,1,0,0,false,7.7,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 3,1,'post','11','4-3-3','[]'::jsonb,'{"52d019ab-8fa4-49de-9716-270eeb651480":"RW"}'::jsonb,'{}'::jsonb,true,'e320bcfe-10a4-55c3-b1ab-f3bdeedd671d',
 'Demo Match Facts entry with coach-observed evidence.','RW','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":7,"passing":8,"dribbling":7},"attacker":{"finishing":8,"shooting":7,"attacking_movement":7}}'::jsonb,'v4.0.0',('2026-06-14'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('876a7210-a27e-524a-876e-402edb28d8fb','42d334ed-2a49-4e74-b20a-4b7a7ad60d25','2026-06-14','Eastbrook Athletic','W 3–1',72,0,0,0,0,false,7.5,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 3,1,'post','11','4-3-3','[]'::jsonb,'{"42d334ed-2a49-4e74-b20a-4b7a7ad60d25":"LWB"}'::jsonb,'{}'::jsonb,true,'e320bcfe-10a4-55c3-b1ab-f3bdeedd671d',
 'Demo Match Facts entry with coach-observed evidence.','LWB','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":7,"dribbling":7},"defender":{"one_v_one_defending":8,"tackling":6,"defensive_positioning":7}}'::jsonb,'v4.0.0',('2026-06-14'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('741ed943-9598-517c-abee-3b1b67d20241','4bb79c82-28a5-480d-b244-6279e99f2a17','2026-06-14','Eastbrook Athletic','W 3–1',68,0,0,0,0,false,6.9,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 3,1,'post','11','4-3-3','[]'::jsonb,'{"4bb79c82-28a5-480d-b244-6279e99f2a17":"CB"}'::jsonb,'{}'::jsonb,true,'e320bcfe-10a4-55c3-b1ab-f3bdeedd671d',
 'Demo Match Facts entry with coach-observed evidence.','CB','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":7,"dribbling":7},"defender":{"one_v_one_defending":7,"tackling":7,"defensive_positioning":6}}'::jsonb,'v4.0.0',('2026-06-14'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('173e457b-cdd9-5a35-bc68-5a61ef0041c9','06a2ad09-466c-449a-915f-bc4cac218d2a','2026-06-14','Eastbrook Athletic','W 3–1',68,0,0,4,3,false,7.1,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 3,1,'post','11','4-3-3','[]'::jsonb,'{"06a2ad09-466c-449a-915f-bc4cac218d2a":"GK"}'::jsonb,'{}'::jsonb,true,'e320bcfe-10a4-55c3-b1ab-f3bdeedd671d',
 'Demo Match Facts entry with coach-observed evidence.','GK','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"goalkeeper":{"gk_positioning":8,"gk_shot_stopping":6,"gk_reflexes":7}}'::jsonb,'v4.0.0',('2026-06-14'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('f45b3e94-1eeb-56fd-9076-378ec110a437','3f7ddd2b-4ed8-4dfe-ab5c-6a8a51de37ba','2026-06-14','Eastbrook Athletic','W 3–1',62,0,0,0,0,false,6.8,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 3,1,'post','11','4-3-3','[]'::jsonb,'{"3f7ddd2b-4ed8-4dfe-ab5c-6a8a51de37ba":"RB"}'::jsonb,'{}'::jsonb,true,'e320bcfe-10a4-55c3-b1ab-f3bdeedd671d',
 'Demo Match Facts entry with coach-observed evidence.','RB','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":8,"dribbling":8},"defender":{"one_v_one_defending":7,"tackling":6,"defensive_positioning":7}}'::jsonb,'v4.0.0',('2026-06-14'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('fab9519d-3bb4-5738-a0b0-5bab0d1b00be','eef6acf1-21a0-4e03-97a6-143aadc5bfa0','2026-06-14','Eastbrook Athletic','W 3–1',62,0,1,0,0,false,8.2,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 3,1,'post','11','4-3-3','[]'::jsonb,'{"eef6acf1-21a0-4e03-97a6-143aadc5bfa0":"ST"}'::jsonb,'{}'::jsonb,true,'e320bcfe-10a4-55c3-b1ab-f3bdeedd671d',
 'Demo Match Facts entry with coach-observed evidence.','ST','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":7,"dribbling":8},"attacker":{"finishing":7,"shooting":8,"attacking_movement":7}}'::jsonb,'v4.0.0',('2026-06-14'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('5b5b9860-e28c-593f-aa95-4485f042697d','683b4427-9366-507f-b0a4-92996f41b1d2','2026-06-14','Eastbrook Athletic','W 3–1',62,0,0,5,3,false,6.9,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 3,1,'post','11','4-3-3','[]'::jsonb,'{"683b4427-9366-507f-b0a4-92996f41b1d2":"GK"}'::jsonb,'{}'::jsonb,true,'e320bcfe-10a4-55c3-b1ab-f3bdeedd671d',
 'Demo Match Facts entry with coach-observed evidence.','GK','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"goalkeeper":{"gk_positioning":6,"gk_shot_stopping":7,"gk_reflexes":7}}'::jsonb,'v4.0.0',('2026-06-14'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('f6c15297-62a3-56a7-9455-fecdffe458d0','808ab9f0-e897-5f5f-9b19-7b835bc1f1de','2026-06-14','Eastbrook Athletic','W 3–1',75,1,0,0,0,false,8.5,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 3,1,'post','11','4-3-3','[]'::jsonb,'{"808ab9f0-e897-5f5f-9b19-7b835bc1f1de":"ST"}'::jsonb,'{}'::jsonb,true,'e320bcfe-10a4-55c3-b1ab-f3bdeedd671d',
 'Demo Match Facts entry with coach-observed evidence.','ST','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":9,"passing":8,"dribbling":7},"attacker":{"finishing":8,"shooting":7,"attacking_movement":8}}'::jsonb,'v4.0.0',('2026-06-14'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('9ab3e1ff-9514-5dd4-b531-e09e1c5238f0','fcc9b976-cf54-5c82-979b-90159d79abc3','2026-06-14','Eastbrook Athletic','W 3–1',65,0,0,0,0,false,7.2,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 3,1,'post','11','4-3-3','[]'::jsonb,'{"fcc9b976-cf54-5c82-979b-90159d79abc3":"CM"}'::jsonb,'{}'::jsonb,true,'e320bcfe-10a4-55c3-b1ab-f3bdeedd671d',
 'Demo Match Facts entry with coach-observed evidence.','CM','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":7,"dribbling":9},"midfielder":{"receiving_under_pressure":7,"ball_retention":9,"progressive_passing":8}}'::jsonb,'v4.0.0',('2026-06-14'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('c9212917-76b4-5955-ba2b-a5ac3667149c','9399e655-5416-44de-8f70-781f955bc0a1','2026-06-21','Meadow Park Rovers','D 2–2',68,0,0,0,0,false,7.9,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 2,2,'post','11','4-3-3','[]'::jsonb,'{"9399e655-5416-44de-8f70-781f955bc0a1":"CM"}'::jsonb,'{}'::jsonb,true,'cde0e401-f794-53c3-acc0-cec064b8febf',
 'Demo Match Facts entry with coach-observed evidence.','CM','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":9,"passing":7,"dribbling":9},"midfielder":{"receiving_under_pressure":8,"ball_retention":8,"progressive_passing":8}}'::jsonb,'v4.0.0',('2026-06-21'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('c60fa7a2-8932-5e2a-820c-fdd8a2fe4152','52d019ab-8fa4-49de-9716-270eeb651480','2026-06-21','Meadow Park Rovers','D 2–2',80,1,1,0,0,false,7.2,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 2,2,'post','11','4-3-3','[]'::jsonb,'{"52d019ab-8fa4-49de-9716-270eeb651480":"RW"}'::jsonb,'{}'::jsonb,true,'cde0e401-f794-53c3-acc0-cec064b8febf',
 'Demo Match Facts entry with coach-observed evidence.','RW','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":7,"passing":8,"dribbling":7},"attacker":{"finishing":8,"shooting":7,"attacking_movement":7}}'::jsonb,'v4.0.0',('2026-06-21'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('d3986b32-51ed-5de7-8b17-e4bb17ba1861','42d334ed-2a49-4e74-b20a-4b7a7ad60d25','2026-06-21','Meadow Park Rovers','D 2–2',72,0,0,0,0,false,7.8,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 2,2,'post','11','4-3-3','[]'::jsonb,'{"42d334ed-2a49-4e74-b20a-4b7a7ad60d25":"LWB"}'::jsonb,'{}'::jsonb,true,'cde0e401-f794-53c3-acc0-cec064b8febf',
 'Demo Match Facts entry with coach-observed evidence.','LWB','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":7,"dribbling":7},"defender":{"one_v_one_defending":8,"tackling":6,"defensive_positioning":7}}'::jsonb,'v4.0.0',('2026-06-21'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('19e73ff6-aafb-5e25-a440-eeedba6f316f','4bb79c82-28a5-480d-b244-6279e99f2a17','2026-06-21','Meadow Park Rovers','D 2–2',70,1,1,0,0,false,7.1,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 2,2,'post','11','4-3-3','[]'::jsonb,'{"4bb79c82-28a5-480d-b244-6279e99f2a17":"CB"}'::jsonb,'{}'::jsonb,true,'cde0e401-f794-53c3-acc0-cec064b8febf',
 'Demo Match Facts entry with coach-observed evidence.','CB','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":7,"dribbling":7},"defender":{"one_v_one_defending":7,"tackling":7,"defensive_positioning":6}}'::jsonb,'v4.0.0',('2026-06-21'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('b3ff846a-fb57-57d4-a34a-184af8946540','06a2ad09-466c-449a-915f-bc4cac218d2a','2026-06-21','Meadow Park Rovers','D 2–2',62,0,0,4,2,false,6.7,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 2,2,'post','11','4-3-3','[]'::jsonb,'{"06a2ad09-466c-449a-915f-bc4cac218d2a":"GK"}'::jsonb,'{}'::jsonb,true,'cde0e401-f794-53c3-acc0-cec064b8febf',
 'Demo Match Facts entry with coach-observed evidence.','GK','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"goalkeeper":{"gk_positioning":8,"gk_shot_stopping":6,"gk_reflexes":7}}'::jsonb,'v4.0.0',('2026-06-21'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('893acd36-cb84-5445-84fd-71eb8ec0f378','3f7ddd2b-4ed8-4dfe-ab5c-6a8a51de37ba','2026-06-21','Meadow Park Rovers','D 2–2',65,0,1,0,0,false,6.5,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 2,2,'post','11','4-3-3','[]'::jsonb,'{"3f7ddd2b-4ed8-4dfe-ab5c-6a8a51de37ba":"RB"}'::jsonb,'{}'::jsonb,true,'cde0e401-f794-53c3-acc0-cec064b8febf',
 'Demo Match Facts entry with coach-observed evidence.','RB','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":8,"dribbling":8},"defender":{"one_v_one_defending":7,"tackling":6,"defensive_positioning":7}}'::jsonb,'v4.0.0',('2026-06-21'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('6cc0d0b8-41d5-5c48-9af0-279a4a1d4df3','eef6acf1-21a0-4e03-97a6-143aadc5bfa0','2026-06-21','Meadow Park Rovers','D 2–2',70,0,0,0,0,false,8.6,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 2,2,'post','11','4-3-3','[]'::jsonb,'{"eef6acf1-21a0-4e03-97a6-143aadc5bfa0":"ST"}'::jsonb,'{}'::jsonb,true,'cde0e401-f794-53c3-acc0-cec064b8febf',
 'Demo Match Facts entry with coach-observed evidence.','ST','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":7,"dribbling":8},"attacker":{"finishing":7,"shooting":8,"attacking_movement":7}}'::jsonb,'v4.0.0',('2026-06-21'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('26b771f3-09e2-54d0-9fa6-cefe653f5756','683b4427-9366-507f-b0a4-92996f41b1d2','2026-06-21','Meadow Park Rovers','D 2–2',80,0,0,4,2,false,7.9,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 2,2,'post','11','4-3-3','[]'::jsonb,'{"683b4427-9366-507f-b0a4-92996f41b1d2":"GK"}'::jsonb,'{}'::jsonb,true,'cde0e401-f794-53c3-acc0-cec064b8febf',
 'Demo Match Facts entry with coach-observed evidence.','GK','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"goalkeeper":{"gk_positioning":6,"gk_shot_stopping":7,"gk_reflexes":7}}'::jsonb,'v4.0.0',('2026-06-21'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('75544ee8-6205-5442-a802-798f1e842206','808ab9f0-e897-5f5f-9b19-7b835bc1f1de','2026-06-21','Meadow Park Rovers','D 2–2',62,0,0,0,0,false,7.5,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 2,2,'post','11','4-3-3','[]'::jsonb,'{"808ab9f0-e897-5f5f-9b19-7b835bc1f1de":"ST"}'::jsonb,'{}'::jsonb,true,'cde0e401-f794-53c3-acc0-cec064b8febf',
 'Demo Match Facts entry with coach-observed evidence.','ST','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":9,"passing":8,"dribbling":7},"attacker":{"finishing":8,"shooting":7,"attacking_movement":8}}'::jsonb,'v4.0.0',('2026-06-21'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('5003b300-e741-5682-b339-13e149685cfe','fcc9b976-cf54-5c82-979b-90159d79abc3','2026-06-21','Meadow Park Rovers','D 2–2',80,0,0,0,0,false,7.4,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 2,2,'post','11','4-3-3','[]'::jsonb,'{"fcc9b976-cf54-5c82-979b-90159d79abc3":"CM"}'::jsonb,'{}'::jsonb,true,'cde0e401-f794-53c3-acc0-cec064b8febf',
 'Demo Match Facts entry with coach-observed evidence.','CM','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":7,"dribbling":9},"midfielder":{"receiving_under_pressure":7,"ball_retention":9,"progressive_passing":8}}'::jsonb,'v4.0.0',('2026-06-21'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('40391289-995c-5283-b64a-6444804d68ab','9399e655-5416-44de-8f70-781f955bc0a1','2026-06-28','Southvale Juniors','W 2–0',80,0,0,0,0,false,8.1,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 2,0,'post','11','4-3-3','[]'::jsonb,'{"9399e655-5416-44de-8f70-781f955bc0a1":"CM"}'::jsonb,'{}'::jsonb,true,'adf6601b-c3c5-5ff9-8868-0dfe8c2f9e1d',
 'Demo Match Facts entry with coach-observed evidence.','CM','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":9,"passing":7,"dribbling":9},"midfielder":{"receiving_under_pressure":8,"ball_retention":8,"progressive_passing":8}}'::jsonb,'v4.0.0',('2026-06-28'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('865729ec-5050-5257-b8fb-5e735b091cba','52d019ab-8fa4-49de-9716-270eeb651480','2026-06-28','Southvale Juniors','W 2–0',72,0,1,0,0,false,7.9,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 2,0,'post','11','4-3-3','[]'::jsonb,'{"52d019ab-8fa4-49de-9716-270eeb651480":"RW"}'::jsonb,'{}'::jsonb,true,'adf6601b-c3c5-5ff9-8868-0dfe8c2f9e1d',
 'Demo Match Facts entry with coach-observed evidence.','RW','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":7,"passing":8,"dribbling":7},"attacker":{"finishing":8,"shooting":7,"attacking_movement":7}}'::jsonb,'v4.0.0',('2026-06-28'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('336552c6-f829-5fb6-b754-c1c2ff607237','42d334ed-2a49-4e74-b20a-4b7a7ad60d25','2026-06-28','Southvale Juniors','W 2–0',62,0,0,0,0,false,6.9,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 2,0,'post','11','4-3-3','[]'::jsonb,'{"42d334ed-2a49-4e74-b20a-4b7a7ad60d25":"LWB"}'::jsonb,'{}'::jsonb,true,'adf6601b-c3c5-5ff9-8868-0dfe8c2f9e1d',
 'Demo Match Facts entry with coach-observed evidence.','LWB','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":7,"dribbling":7},"defender":{"one_v_one_defending":8,"tackling":6,"defensive_positioning":7}}'::jsonb,'v4.0.0',('2026-06-28'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('6af55d41-03b0-53ac-a142-719c35641dd5','4bb79c82-28a5-480d-b244-6279e99f2a17','2026-06-28','Southvale Juniors','W 2–0',72,1,0,0,0,false,7.8,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 2,0,'post','11','4-3-3','[]'::jsonb,'{"4bb79c82-28a5-480d-b244-6279e99f2a17":"CB"}'::jsonb,'{}'::jsonb,true,'adf6601b-c3c5-5ff9-8868-0dfe8c2f9e1d',
 'Demo Match Facts entry with coach-observed evidence.','CB','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":7,"dribbling":7},"defender":{"one_v_one_defending":7,"tackling":7,"defensive_positioning":6}}'::jsonb,'v4.0.0',('2026-06-28'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('adbd7ecf-9a78-5186-821d-e74be1b7eb70','06a2ad09-466c-449a-915f-bc4cac218d2a','2026-06-28','Southvale Juniors','W 2–0',68,0,0,5,2,false,6.7,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 2,0,'post','11','4-3-3','[]'::jsonb,'{"06a2ad09-466c-449a-915f-bc4cac218d2a":"GK"}'::jsonb,'{}'::jsonb,true,'adf6601b-c3c5-5ff9-8868-0dfe8c2f9e1d',
 'Demo Match Facts entry with coach-observed evidence.','GK','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"goalkeeper":{"gk_positioning":8,"gk_shot_stopping":6,"gk_reflexes":7}}'::jsonb,'v4.0.0',('2026-06-28'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('e72df801-914d-56e0-9623-735bfee8d176','3f7ddd2b-4ed8-4dfe-ab5c-6a8a51de37ba','2026-06-28','Southvale Juniors','W 2–0',75,0,0,0,0,false,6.4,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 2,0,'post','11','4-3-3','[]'::jsonb,'{"3f7ddd2b-4ed8-4dfe-ab5c-6a8a51de37ba":"RB"}'::jsonb,'{}'::jsonb,true,'adf6601b-c3c5-5ff9-8868-0dfe8c2f9e1d',
 'Demo Match Facts entry with coach-observed evidence.','RB','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":8,"dribbling":8},"defender":{"one_v_one_defending":7,"tackling":6,"defensive_positioning":7}}'::jsonb,'v4.0.0',('2026-06-28'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('56c401ef-084d-52f3-969d-778a3d5dc284','eef6acf1-21a0-4e03-97a6-143aadc5bfa0','2026-06-28','Southvale Juniors','W 2–0',68,1,0,0,0,false,7.9,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 2,0,'post','11','4-3-3','[]'::jsonb,'{"eef6acf1-21a0-4e03-97a6-143aadc5bfa0":"ST"}'::jsonb,'{}'::jsonb,true,'adf6601b-c3c5-5ff9-8868-0dfe8c2f9e1d',
 'Demo Match Facts entry with coach-observed evidence.','ST','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":7,"dribbling":8},"attacker":{"finishing":7,"shooting":8,"attacking_movement":7}}'::jsonb,'v4.0.0',('2026-06-28'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('063f8696-1ecd-54a2-925d-56356f9ca134','683b4427-9366-507f-b0a4-92996f41b1d2','2026-06-28','Southvale Juniors','W 2–0',68,0,0,7,2,false,7.7,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 2,0,'post','11','4-3-3','[]'::jsonb,'{"683b4427-9366-507f-b0a4-92996f41b1d2":"GK"}'::jsonb,'{}'::jsonb,true,'adf6601b-c3c5-5ff9-8868-0dfe8c2f9e1d',
 'Demo Match Facts entry with coach-observed evidence.','GK','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"goalkeeper":{"gk_positioning":6,"gk_shot_stopping":7,"gk_reflexes":7}}'::jsonb,'v4.0.0',('2026-06-28'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('9726b961-d0ca-542b-b212-1caf9b96a902','808ab9f0-e897-5f5f-9b19-7b835bc1f1de','2026-06-28','Southvale Juniors','W 2–0',70,1,1,0,0,false,8.4,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 2,0,'post','11','4-3-3','[]'::jsonb,'{"808ab9f0-e897-5f5f-9b19-7b835bc1f1de":"ST"}'::jsonb,'{}'::jsonb,true,'adf6601b-c3c5-5ff9-8868-0dfe8c2f9e1d',
 'Demo Match Facts entry with coach-observed evidence.','ST','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":9,"passing":8,"dribbling":7},"attacker":{"finishing":8,"shooting":7,"attacking_movement":8}}'::jsonb,'v4.0.0',('2026-06-28'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('849e0120-8e05-58fd-bae8-c7f94c01061b','fcc9b976-cf54-5c82-979b-90159d79abc3','2026-06-28','Southvale Juniors','W 2–0',75,0,1,0,0,false,7.4,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 2,0,'post','11','4-3-3','[]'::jsonb,'{"fcc9b976-cf54-5c82-979b-90159d79abc3":"CM"}'::jsonb,'{}'::jsonb,true,'adf6601b-c3c5-5ff9-8868-0dfe8c2f9e1d',
 'Demo Match Facts entry with coach-observed evidence.','CM','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":7,"dribbling":9},"midfielder":{"receiving_under_pressure":7,"ball_retention":9,"progressive_passing":8}}'::jsonb,'v4.0.0',('2026-06-28'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('39fe729e-6d83-54aa-b4f0-55f121158119','9399e655-5416-44de-8f70-781f955bc0a1','2026-07-05','Harbour City Academy','L 1–2',72,0,1,0,0,false,7.6,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 1,2,'post','11','4-3-3','[]'::jsonb,'{"9399e655-5416-44de-8f70-781f955bc0a1":"CM"}'::jsonb,'{}'::jsonb,true,'139b4848-e2d3-5119-9a0e-77b788a89f38',
 'Demo Match Facts entry with coach-observed evidence.','CM','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":9,"passing":7,"dribbling":9},"midfielder":{"receiving_under_pressure":8,"ball_retention":8,"progressive_passing":8}}'::jsonb,'v4.0.0',('2026-07-05'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('175c4af0-de61-5bd4-b453-99b1f6d3c5f6','52d019ab-8fa4-49de-9716-270eeb651480','2026-07-05','Harbour City Academy','L 1–2',80,0,0,0,0,false,7.7,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 1,2,'post','11','4-3-3','[]'::jsonb,'{"52d019ab-8fa4-49de-9716-270eeb651480":"RW"}'::jsonb,'{}'::jsonb,true,'139b4848-e2d3-5119-9a0e-77b788a89f38',
 'Demo Match Facts entry with coach-observed evidence.','RW','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":7,"passing":8,"dribbling":7},"attacker":{"finishing":8,"shooting":7,"attacking_movement":7}}'::jsonb,'v4.0.0',('2026-07-05'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('621f2db8-82d8-5083-9051-1349d997d1c7','42d334ed-2a49-4e74-b20a-4b7a7ad60d25','2026-07-05','Harbour City Academy','L 1–2',68,0,0,0,0,false,7.8,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 1,2,'post','11','4-3-3','[]'::jsonb,'{"42d334ed-2a49-4e74-b20a-4b7a7ad60d25":"LWB"}'::jsonb,'{}'::jsonb,true,'139b4848-e2d3-5119-9a0e-77b788a89f38',
 'Demo Match Facts entry with coach-observed evidence.','LWB','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":7,"dribbling":7},"defender":{"one_v_one_defending":8,"tackling":6,"defensive_positioning":7}}'::jsonb,'v4.0.0',('2026-07-05'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('3d33b088-2721-544f-bfad-e18e2345ee91','4bb79c82-28a5-480d-b244-6279e99f2a17','2026-07-05','Harbour City Academy','L 1–2',58,0,0,0,0,false,8.0,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 1,2,'post','11','4-3-3','[]'::jsonb,'{"4bb79c82-28a5-480d-b244-6279e99f2a17":"CB"}'::jsonb,'{}'::jsonb,true,'139b4848-e2d3-5119-9a0e-77b788a89f38',
 'Demo Match Facts entry with coach-observed evidence.','CB','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":7,"dribbling":7},"defender":{"one_v_one_defending":7,"tackling":7,"defensive_positioning":6}}'::jsonb,'v4.0.0',('2026-07-05'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('c2936508-e7ff-517b-aee9-b74c447b16a0','06a2ad09-466c-449a-915f-bc4cac218d2a','2026-07-05','Harbour City Academy','L 1–2',80,0,0,5,2,false,7.6,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 1,2,'post','11','4-3-3','[]'::jsonb,'{"06a2ad09-466c-449a-915f-bc4cac218d2a":"GK"}'::jsonb,'{}'::jsonb,true,'139b4848-e2d3-5119-9a0e-77b788a89f38',
 'Demo Match Facts entry with coach-observed evidence.','GK','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"goalkeeper":{"gk_positioning":8,"gk_shot_stopping":6,"gk_reflexes":7}}'::jsonb,'v4.0.0',('2026-07-05'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('10d74937-2ef9-51b7-9492-d943c3192e20','3f7ddd2b-4ed8-4dfe-ab5c-6a8a51de37ba','2026-07-05','Harbour City Academy','L 1–2',75,0,0,0,0,false,6.3,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 1,2,'post','11','4-3-3','[]'::jsonb,'{"3f7ddd2b-4ed8-4dfe-ab5c-6a8a51de37ba":"RB"}'::jsonb,'{}'::jsonb,true,'139b4848-e2d3-5119-9a0e-77b788a89f38',
 'Demo Match Facts entry with coach-observed evidence.','RB','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":8,"dribbling":8},"defender":{"one_v_one_defending":7,"tackling":6,"defensive_positioning":7}}'::jsonb,'v4.0.0',('2026-07-05'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('d08f9d88-b483-5065-9151-537a81e10002','eef6acf1-21a0-4e03-97a6-143aadc5bfa0','2026-07-05','Harbour City Academy','L 1–2',75,0,0,0,0,false,8.3,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 1,2,'post','11','4-3-3','[]'::jsonb,'{"eef6acf1-21a0-4e03-97a6-143aadc5bfa0":"ST"}'::jsonb,'{}'::jsonb,true,'139b4848-e2d3-5119-9a0e-77b788a89f38',
 'Demo Match Facts entry with coach-observed evidence.','ST','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":7,"dribbling":8},"attacker":{"finishing":7,"shooting":8,"attacking_movement":7}}'::jsonb,'v4.0.0',('2026-07-05'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('9bcd3e3f-46f5-524f-9e86-ecbe7a23d3df','683b4427-9366-507f-b0a4-92996f41b1d2','2026-07-05','Harbour City Academy','L 1–2',72,0,0,5,2,false,7.7,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 1,2,'post','11','4-3-3','[]'::jsonb,'{"683b4427-9366-507f-b0a4-92996f41b1d2":"GK"}'::jsonb,'{}'::jsonb,true,'139b4848-e2d3-5119-9a0e-77b788a89f38',
 'Demo Match Facts entry with coach-observed evidence.','GK','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"goalkeeper":{"gk_positioning":6,"gk_shot_stopping":7,"gk_reflexes":7}}'::jsonb,'v4.0.0',('2026-07-05'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('4e3754d5-7528-52bb-89e8-c1feb926cc9f','808ab9f0-e897-5f5f-9b19-7b835bc1f1de','2026-07-05','Harbour City Academy','L 1–2',70,0,0,0,0,false,8.1,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 1,2,'post','11','4-3-3','[]'::jsonb,'{"808ab9f0-e897-5f5f-9b19-7b835bc1f1de":"ST"}'::jsonb,'{}'::jsonb,true,'139b4848-e2d3-5119-9a0e-77b788a89f38',
 'Demo Match Facts entry with coach-observed evidence.','ST','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":9,"passing":8,"dribbling":7},"attacker":{"finishing":8,"shooting":7,"attacking_movement":8}}'::jsonb,'v4.0.0',('2026-07-05'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('a0040ff5-c7c2-5352-b695-c35c65256e2d','fcc9b976-cf54-5c82-979b-90159d79abc3','2026-07-05','Harbour City Academy','L 1–2',58,0,1,0,0,false,7.3,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 1,2,'post','11','4-3-3','[]'::jsonb,'{"fcc9b976-cf54-5c82-979b-90159d79abc3":"CM"}'::jsonb,'{}'::jsonb,true,'139b4848-e2d3-5119-9a0e-77b788a89f38',
 'Demo Match Facts entry with coach-observed evidence.','CM','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":7,"dribbling":9},"midfielder":{"receiving_under_pressure":7,"ball_retention":9,"progressive_passing":8}}'::jsonb,'v4.0.0',('2026-07-05'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('df66b88d-922e-57fa-ae20-ad10b821cfe4','9399e655-5416-44de-8f70-781f955bc0a1','2026-07-12','Camden Athletic','W 4–1',75,0,0,0,0,false,7.6,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 4,1,'post','11','4-3-3','[]'::jsonb,'{"9399e655-5416-44de-8f70-781f955bc0a1":"CM"}'::jsonb,'{}'::jsonb,true,'ddc21f93-3f1d-526f-af6c-a7f908ae7bd3',
 'Demo Match Facts entry with coach-observed evidence.','CM','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":9,"passing":7,"dribbling":9},"midfielder":{"receiving_under_pressure":8,"ball_retention":8,"progressive_passing":8}}'::jsonb,'v4.0.0',('2026-07-12'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('9a7af5a2-aa54-5fe2-8e66-838abc96d630','52d019ab-8fa4-49de-9716-270eeb651480','2026-07-12','Camden Athletic','W 4–1',75,0,1,0,0,false,7.9,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 4,1,'post','11','4-3-3','[]'::jsonb,'{"52d019ab-8fa4-49de-9716-270eeb651480":"RW"}'::jsonb,'{}'::jsonb,true,'ddc21f93-3f1d-526f-af6c-a7f908ae7bd3',
 'Demo Match Facts entry with coach-observed evidence.','RW','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":7,"passing":8,"dribbling":7},"attacker":{"finishing":8,"shooting":7,"attacking_movement":7}}'::jsonb,'v4.0.0',('2026-07-12'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('f287a06d-22c9-52a8-96c7-865a737057ff','42d334ed-2a49-4e74-b20a-4b7a7ad60d25','2026-07-12','Camden Athletic','W 4–1',62,0,0,0,0,false,6.6,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 4,1,'post','11','4-3-3','[]'::jsonb,'{"42d334ed-2a49-4e74-b20a-4b7a7ad60d25":"LWB"}'::jsonb,'{}'::jsonb,true,'ddc21f93-3f1d-526f-af6c-a7f908ae7bd3',
 'Demo Match Facts entry with coach-observed evidence.','LWB','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":7,"dribbling":7},"defender":{"one_v_one_defending":8,"tackling":6,"defensive_positioning":7}}'::jsonb,'v4.0.0',('2026-07-12'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('3a74d0a6-5942-51c8-9e28-719f5f7c47dc','4bb79c82-28a5-480d-b244-6279e99f2a17','2026-07-12','Camden Athletic','W 4–1',70,0,1,0,0,false,7.4,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 4,1,'post','11','4-3-3','[]'::jsonb,'{"4bb79c82-28a5-480d-b244-6279e99f2a17":"CB"}'::jsonb,'{}'::jsonb,true,'ddc21f93-3f1d-526f-af6c-a7f908ae7bd3',
 'Demo Match Facts entry with coach-observed evidence.','CB','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":7,"dribbling":7},"defender":{"one_v_one_defending":7,"tackling":7,"defensive_positioning":6}}'::jsonb,'v4.0.0',('2026-07-12'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('2995326c-bae1-5b5e-8b82-888f44571a25','06a2ad09-466c-449a-915f-bc4cac218d2a','2026-07-12','Camden Athletic','W 4–1',62,0,0,4,1,false,7.7,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 4,1,'post','11','4-3-3','[]'::jsonb,'{"06a2ad09-466c-449a-915f-bc4cac218d2a":"GK"}'::jsonb,'{}'::jsonb,true,'ddc21f93-3f1d-526f-af6c-a7f908ae7bd3',
 'Demo Match Facts entry with coach-observed evidence.','GK','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"goalkeeper":{"gk_positioning":8,"gk_shot_stopping":6,"gk_reflexes":7}}'::jsonb,'v4.0.0',('2026-07-12'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('23285c98-12b2-5ac7-86ac-41f5b3b2b7af','3f7ddd2b-4ed8-4dfe-ab5c-6a8a51de37ba','2026-07-12','Camden Athletic','W 4–1',62,0,1,0,0,false,7.0,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 4,1,'post','11','4-3-3','[]'::jsonb,'{"3f7ddd2b-4ed8-4dfe-ab5c-6a8a51de37ba":"RB"}'::jsonb,'{}'::jsonb,true,'ddc21f93-3f1d-526f-af6c-a7f908ae7bd3',
 'Demo Match Facts entry with coach-observed evidence.','RB','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":8,"dribbling":8},"defender":{"one_v_one_defending":7,"tackling":6,"defensive_positioning":7}}'::jsonb,'v4.0.0',('2026-07-12'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('d61291b5-9693-5cec-be74-a2240e4c6608','eef6acf1-21a0-4e03-97a6-143aadc5bfa0','2026-07-12','Camden Athletic','W 4–1',75,0,0,0,0,false,8.7,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 4,1,'post','11','4-3-3','[]'::jsonb,'{"eef6acf1-21a0-4e03-97a6-143aadc5bfa0":"ST"}'::jsonb,'{}'::jsonb,true,'ddc21f93-3f1d-526f-af6c-a7f908ae7bd3',
 'Demo Match Facts entry with coach-observed evidence.','ST','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":7,"dribbling":8},"attacker":{"finishing":7,"shooting":8,"attacking_movement":7}}'::jsonb,'v4.0.0',('2026-07-12'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('03786b27-d760-5521-9823-76388b6f50c9','683b4427-9366-507f-b0a4-92996f41b1d2','2026-07-12','Camden Athletic','W 4–1',72,0,0,6,1,false,7.6,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 4,1,'post','11','4-3-3','[]'::jsonb,'{"683b4427-9366-507f-b0a4-92996f41b1d2":"GK"}'::jsonb,'{}'::jsonb,true,'ddc21f93-3f1d-526f-af6c-a7f908ae7bd3',
 'Demo Match Facts entry with coach-observed evidence.','GK','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"goalkeeper":{"gk_positioning":6,"gk_shot_stopping":7,"gk_reflexes":7}}'::jsonb,'v4.0.0',('2026-07-12'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('8d8502fa-d15f-5a8e-9c5a-6494fd537b04','808ab9f0-e897-5f5f-9b19-7b835bc1f1de','2026-07-12','Camden Athletic','W 4–1',68,1,0,0,0,false,7.5,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 4,1,'post','11','4-3-3','[]'::jsonb,'{"808ab9f0-e897-5f5f-9b19-7b835bc1f1de":"ST"}'::jsonb,'{}'::jsonb,true,'ddc21f93-3f1d-526f-af6c-a7f908ae7bd3',
 'Demo Match Facts entry with coach-observed evidence.','ST','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":9,"passing":8,"dribbling":7},"attacker":{"finishing":8,"shooting":7,"attacking_movement":8}}'::jsonb,'v4.0.0',('2026-07-12'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('03b98f54-b7f2-5c2b-a385-f70f4b6442eb','fcc9b976-cf54-5c82-979b-90159d79abc3','2026-07-12','Camden Athletic','W 4–1',80,0,1,0,0,false,6.9,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 4,1,'post','11','4-3-3','[]'::jsonb,'{"fcc9b976-cf54-5c82-979b-90159d79abc3":"CM"}'::jsonb,'{}'::jsonb,true,'ddc21f93-3f1d-526f-af6c-a7f908ae7bd3',
 'Demo Match Facts entry with coach-observed evidence.','CM','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":7,"dribbling":9},"midfielder":{"receiving_under_pressure":7,"ball_retention":9,"progressive_passing":8}}'::jsonb,'v4.0.0',('2026-07-12'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('c0ddbe03-6653-503a-9e5b-ea8650a2b149','9399e655-5416-44de-8f70-781f955bc0a1','2026-07-20','Finchley Juniors','W 4–0',75,0,0,0,0,false,7.8,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 4,0,'post','11','4-3-3','[]'::jsonb,'{"9399e655-5416-44de-8f70-781f955bc0a1":"CM"}'::jsonb,'{}'::jsonb,true,'b74bee7f-e77d-5ac0-a9ce-21bfffbd183f',
 'Demo Match Facts entry with coach-observed evidence.','CM','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":9,"passing":7,"dribbling":9},"midfielder":{"receiving_under_pressure":8,"ball_retention":8,"progressive_passing":8}}'::jsonb,'v4.0.0',('2026-07-20'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('e68ba718-b074-50a2-a211-24e824455fe6','52d019ab-8fa4-49de-9716-270eeb651480','2026-07-20','Finchley Juniors','W 4–0',70,1,1,0,0,false,7.0,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 4,0,'post','11','4-3-3','[]'::jsonb,'{"52d019ab-8fa4-49de-9716-270eeb651480":"RW"}'::jsonb,'{}'::jsonb,true,'b74bee7f-e77d-5ac0-a9ce-21bfffbd183f',
 'Demo Match Facts entry with coach-observed evidence.','RW','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":7,"passing":8,"dribbling":7},"attacker":{"finishing":8,"shooting":7,"attacking_movement":7}}'::jsonb,'v4.0.0',('2026-07-20'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('e290bcb6-e82b-54f5-8759-c7bd05ff1963','42d334ed-2a49-4e74-b20a-4b7a7ad60d25','2026-07-20','Finchley Juniors','W 4–0',68,0,0,0,0,false,6.7,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 4,0,'post','11','4-3-3','[]'::jsonb,'{"42d334ed-2a49-4e74-b20a-4b7a7ad60d25":"LWB"}'::jsonb,'{}'::jsonb,true,'b74bee7f-e77d-5ac0-a9ce-21bfffbd183f',
 'Demo Match Facts entry with coach-observed evidence.','LWB','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":7,"dribbling":7},"defender":{"one_v_one_defending":8,"tackling":6,"defensive_positioning":7}}'::jsonb,'v4.0.0',('2026-07-20'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('ef49221e-fc17-5d24-8f1f-4d13db01c9ef','4bb79c82-28a5-480d-b244-6279e99f2a17','2026-07-20','Finchley Juniors','W 4–0',80,0,0,0,0,false,7.3,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 4,0,'post','11','4-3-3','[]'::jsonb,'{"4bb79c82-28a5-480d-b244-6279e99f2a17":"CB"}'::jsonb,'{}'::jsonb,true,'b74bee7f-e77d-5ac0-a9ce-21bfffbd183f',
 'Demo Match Facts entry with coach-observed evidence.','CB','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":7,"dribbling":7},"defender":{"one_v_one_defending":7,"tackling":7,"defensive_positioning":6}}'::jsonb,'v4.0.0',('2026-07-20'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('c067684d-4208-5b07-b940-6cbe879207b5','06a2ad09-466c-449a-915f-bc4cac218d2a','2026-07-20','Finchley Juniors','W 4–0',58,0,0,2,4,false,6.7,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 4,0,'post','11','4-3-3','[]'::jsonb,'{"06a2ad09-466c-449a-915f-bc4cac218d2a":"GK"}'::jsonb,'{}'::jsonb,true,'b74bee7f-e77d-5ac0-a9ce-21bfffbd183f',
 'Demo Match Facts entry with coach-observed evidence.','GK','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"goalkeeper":{"gk_positioning":8,"gk_shot_stopping":6,"gk_reflexes":7}}'::jsonb,'v4.0.0',('2026-07-20'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('0bdd27d4-2c44-59c4-81ea-4104f21ec9ed','3f7ddd2b-4ed8-4dfe-ab5c-6a8a51de37ba','2026-07-20','Finchley Juniors','W 4–0',58,0,0,0,0,false,7.4,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 4,0,'post','11','4-3-3','[]'::jsonb,'{"3f7ddd2b-4ed8-4dfe-ab5c-6a8a51de37ba":"RB"}'::jsonb,'{}'::jsonb,true,'b74bee7f-e77d-5ac0-a9ce-21bfffbd183f',
 'Demo Match Facts entry with coach-observed evidence.','RB','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":8,"dribbling":8},"defender":{"one_v_one_defending":7,"tackling":6,"defensive_positioning":7}}'::jsonb,'v4.0.0',('2026-07-20'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('ba4b11fc-899b-5736-ba31-1996ed52eb08','eef6acf1-21a0-4e03-97a6-143aadc5bfa0','2026-07-20','Finchley Juniors','W 4–0',62,0,0,0,0,false,8.7,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 4,0,'post','11','4-3-3','[]'::jsonb,'{"eef6acf1-21a0-4e03-97a6-143aadc5bfa0":"ST"}'::jsonb,'{}'::jsonb,true,'b74bee7f-e77d-5ac0-a9ce-21bfffbd183f',
 'Demo Match Facts entry with coach-observed evidence.','ST','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":7,"dribbling":8},"attacker":{"finishing":7,"shooting":8,"attacking_movement":7}}'::jsonb,'v4.0.0',('2026-07-20'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('31022eaa-ec76-5c8c-953b-ab77b3dbe13b','683b4427-9366-507f-b0a4-92996f41b1d2','2026-07-20','Finchley Juniors','W 4–0',68,0,0,7,4,false,6.7,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 4,0,'post','11','4-3-3','[]'::jsonb,'{"683b4427-9366-507f-b0a4-92996f41b1d2":"GK"}'::jsonb,'{}'::jsonb,true,'b74bee7f-e77d-5ac0-a9ce-21bfffbd183f',
 'Demo Match Facts entry with coach-observed evidence.','GK','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"goalkeeper":{"gk_positioning":6,"gk_shot_stopping":7,"gk_reflexes":7}}'::jsonb,'v4.0.0',('2026-07-20'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('d36517a0-7c2b-59a8-9eb7-45160001d9ac','808ab9f0-e897-5f5f-9b19-7b835bc1f1de','2026-07-20','Finchley Juniors','W 4–0',75,1,0,0,0,false,7.4,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 4,0,'post','11','4-3-3','[]'::jsonb,'{"808ab9f0-e897-5f5f-9b19-7b835bc1f1de":"ST"}'::jsonb,'{}'::jsonb,true,'b74bee7f-e77d-5ac0-a9ce-21bfffbd183f',
 'Demo Match Facts entry with coach-observed evidence.','ST','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":9,"passing":8,"dribbling":7},"attacker":{"finishing":8,"shooting":7,"attacking_movement":8}}'::jsonb,'v4.0.0',('2026-07-20'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('1ec4dcb5-690e-5b9c-ae66-f3984b5a970d','fcc9b976-cf54-5c82-979b-90159d79abc3','2026-07-20','Finchley Juniors','W 4–0',70,0,1,0,0,false,7.0,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 4,0,'post','11','4-3-3','[]'::jsonb,'{"fcc9b976-cf54-5c82-979b-90159d79abc3":"CM"}'::jsonb,'{}'::jsonb,true,'b74bee7f-e77d-5ac0-a9ce-21bfffbd183f',
 'Demo Match Facts entry with coach-observed evidence.','CM','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":7,"dribbling":9},"midfielder":{"receiving_under_pressure":7,"ball_retention":9,"progressive_passing":8}}'::jsonb,'v4.0.0',('2026-07-20'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('b11bece6-fb24-5cd8-ab9b-c5140fdd063c','9399e655-5416-44de-8f70-781f955bc0a1','2026-07-26','Westbridge Youth','L 0–2',70,0,0,0,0,false,7.8,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 0,2,'post','11','4-3-3','[]'::jsonb,'{"9399e655-5416-44de-8f70-781f955bc0a1":"CM"}'::jsonb,'{}'::jsonb,true,'6bc45a4b-3506-5882-aefe-c8d543760256',
 'Demo Match Facts entry with coach-observed evidence.','CM','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":9,"passing":7,"dribbling":9},"midfielder":{"receiving_under_pressure":8,"ball_retention":8,"progressive_passing":8}}'::jsonb,'v4.0.0',('2026-07-26'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('42de1235-91fd-5ec6-abf4-73f107601874','52d019ab-8fa4-49de-9716-270eeb651480','2026-07-26','Westbridge Youth','L 0–2',68,1,0,0,0,false,8.2,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 0,2,'post','11','4-3-3','[]'::jsonb,'{"52d019ab-8fa4-49de-9716-270eeb651480":"RW"}'::jsonb,'{}'::jsonb,true,'6bc45a4b-3506-5882-aefe-c8d543760256',
 'Demo Match Facts entry with coach-observed evidence.','RW','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":7,"passing":8,"dribbling":7},"attacker":{"finishing":8,"shooting":7,"attacking_movement":7}}'::jsonb,'v4.0.0',('2026-07-26'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('0127cb27-badd-5b92-aa8c-eb10ebafa45f','42d334ed-2a49-4e74-b20a-4b7a7ad60d25','2026-07-26','Westbridge Youth','L 0–2',58,0,0,0,0,false,7.7,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 0,2,'post','11','4-3-3','[]'::jsonb,'{"42d334ed-2a49-4e74-b20a-4b7a7ad60d25":"LWB"}'::jsonb,'{}'::jsonb,true,'6bc45a4b-3506-5882-aefe-c8d543760256',
 'Demo Match Facts entry with coach-observed evidence.','LWB','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":7,"dribbling":7},"defender":{"one_v_one_defending":8,"tackling":6,"defensive_positioning":7}}'::jsonb,'v4.0.0',('2026-07-26'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('d173f0c2-d02b-5608-ba50-9ecfc59dcd5e','4bb79c82-28a5-480d-b244-6279e99f2a17','2026-07-26','Westbridge Youth','L 0–2',70,0,0,0,0,false,6.9,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 0,2,'post','11','4-3-3','[]'::jsonb,'{"4bb79c82-28a5-480d-b244-6279e99f2a17":"CB"}'::jsonb,'{}'::jsonb,true,'6bc45a4b-3506-5882-aefe-c8d543760256',
 'Demo Match Facts entry with coach-observed evidence.','CB','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":7,"dribbling":7},"defender":{"one_v_one_defending":7,"tackling":7,"defensive_positioning":6}}'::jsonb,'v4.0.0',('2026-07-26'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('4d7ed77e-24d7-5362-9aa0-4edb2542c123','06a2ad09-466c-449a-915f-bc4cac218d2a','2026-07-26','Westbridge Youth','L 0–2',80,0,0,5,2,false,7.2,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 0,2,'post','11','4-3-3','[]'::jsonb,'{"06a2ad09-466c-449a-915f-bc4cac218d2a":"GK"}'::jsonb,'{}'::jsonb,true,'6bc45a4b-3506-5882-aefe-c8d543760256',
 'Demo Match Facts entry with coach-observed evidence.','GK','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"goalkeeper":{"gk_positioning":8,"gk_shot_stopping":6,"gk_reflexes":7}}'::jsonb,'v4.0.0',('2026-07-26'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('0bb8a297-15ca-504f-8a7b-bc44302c11e2','3f7ddd2b-4ed8-4dfe-ab5c-6a8a51de37ba','2026-07-26','Westbridge Youth','L 0–2',70,0,1,0,0,false,6.5,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 0,2,'post','11','4-3-3','[]'::jsonb,'{"3f7ddd2b-4ed8-4dfe-ab5c-6a8a51de37ba":"RB"}'::jsonb,'{}'::jsonb,true,'6bc45a4b-3506-5882-aefe-c8d543760256',
 'Demo Match Facts entry with coach-observed evidence.','RB','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":8,"dribbling":8},"defender":{"one_v_one_defending":7,"tackling":6,"defensive_positioning":7}}'::jsonb,'v4.0.0',('2026-07-26'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('5bb65dc5-0798-5414-aa7a-ac73848393cd','eef6acf1-21a0-4e03-97a6-143aadc5bfa0','2026-07-26','Westbridge Youth','L 0–2',62,1,1,0,0,false,8.1,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 0,2,'post','11','4-3-3','[]'::jsonb,'{"eef6acf1-21a0-4e03-97a6-143aadc5bfa0":"ST"}'::jsonb,'{}'::jsonb,true,'6bc45a4b-3506-5882-aefe-c8d543760256',
 'Demo Match Facts entry with coach-observed evidence.','ST','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":7,"dribbling":8},"attacker":{"finishing":7,"shooting":8,"attacking_movement":7}}'::jsonb,'v4.0.0',('2026-07-26'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('09826ef7-6aa4-5dbf-b50f-1275047182f4','683b4427-9366-507f-b0a4-92996f41b1d2','2026-07-26','Westbridge Youth','L 0–2',80,0,0,7,2,false,7.0,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 0,2,'post','11','4-3-3','[]'::jsonb,'{"683b4427-9366-507f-b0a4-92996f41b1d2":"GK"}'::jsonb,'{}'::jsonb,true,'6bc45a4b-3506-5882-aefe-c8d543760256',
 'Demo Match Facts entry with coach-observed evidence.','GK','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"goalkeeper":{"gk_positioning":6,"gk_shot_stopping":7,"gk_reflexes":7}}'::jsonb,'v4.0.0',('2026-07-26'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('996099c1-b7c7-56c2-9bae-5b0eb2123411','808ab9f0-e897-5f5f-9b19-7b835bc1f1de','2026-07-26','Westbridge Youth','L 0–2',58,1,1,0,0,false,8.6,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 0,2,'post','11','4-3-3','[]'::jsonb,'{"808ab9f0-e897-5f5f-9b19-7b835bc1f1de":"ST"}'::jsonb,'{}'::jsonb,true,'6bc45a4b-3506-5882-aefe-c8d543760256',
 'Demo Match Facts entry with coach-observed evidence.','ST','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":9,"passing":8,"dribbling":7},"attacker":{"finishing":8,"shooting":7,"attacking_movement":8}}'::jsonb,'v4.0.0',('2026-07-26'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('61d2ad5e-fb53-5f56-9059-4f061de2e7cf','fcc9b976-cf54-5c82-979b-90159d79abc3','2026-07-26','Westbridge Youth','L 0–2',70,0,0,0,0,false,7.7,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 0,2,'post','11','4-3-3','[]'::jsonb,'{"fcc9b976-cf54-5c82-979b-90159d79abc3":"CM"}'::jsonb,'{}'::jsonb,true,'6bc45a4b-3506-5882-aefe-c8d543760256',
 'Demo Match Facts entry with coach-observed evidence.','CM','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":7,"dribbling":9},"midfielder":{"receiving_under_pressure":7,"ball_retention":9,"progressive_passing":8}}'::jsonb,'v4.0.0',('2026-07-26'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('979982ec-5ce5-5d04-881f-99928ec29d32','9399e655-5416-44de-8f70-781f955bc0a1','2026-08-02','Riverside Town Academy','D 2–2',68,0,0,0,0,false,7.9,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 2,2,'post','11','4-3-3','[]'::jsonb,'{"9399e655-5416-44de-8f70-781f955bc0a1":"CM"}'::jsonb,'{}'::jsonb,true,'5f8c34a3-d92a-544f-ba47-cdc9c4f27c69',
 'Demo Match Facts entry with coach-observed evidence.','CM','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":9,"passing":7,"dribbling":9},"midfielder":{"receiving_under_pressure":8,"ball_retention":8,"progressive_passing":8}}'::jsonb,'v4.0.0',('2026-08-02'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('c46cab7d-dbc1-5a4f-9287-7a48f72de0eb','52d019ab-8fa4-49de-9716-270eeb651480','2026-08-02','Riverside Town Academy','D 2–2',80,1,1,0,0,false,7.6,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 2,2,'post','11','4-3-3','[]'::jsonb,'{"52d019ab-8fa4-49de-9716-270eeb651480":"RW"}'::jsonb,'{}'::jsonb,true,'5f8c34a3-d92a-544f-ba47-cdc9c4f27c69',
 'Demo Match Facts entry with coach-observed evidence.','RW','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":7,"passing":8,"dribbling":7},"attacker":{"finishing":8,"shooting":7,"attacking_movement":7}}'::jsonb,'v4.0.0',('2026-08-02'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('2e449f0f-43a5-5abc-906d-ed54a51290bb','42d334ed-2a49-4e74-b20a-4b7a7ad60d25','2026-08-02','Riverside Town Academy','D 2–2',70,0,1,0,0,false,7.7,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 2,2,'post','11','4-3-3','[]'::jsonb,'{"42d334ed-2a49-4e74-b20a-4b7a7ad60d25":"LWB"}'::jsonb,'{}'::jsonb,true,'5f8c34a3-d92a-544f-ba47-cdc9c4f27c69',
 'Demo Match Facts entry with coach-observed evidence.','LWB','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":7,"dribbling":7},"defender":{"one_v_one_defending":8,"tackling":6,"defensive_positioning":7}}'::jsonb,'v4.0.0',('2026-08-02'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('2cf88ad2-ada3-5b37-9969-3e1c0e742d1f','4bb79c82-28a5-480d-b244-6279e99f2a17','2026-08-02','Riverside Town Academy','D 2–2',68,1,0,0,0,false,8.0,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 2,2,'post','11','4-3-3','[]'::jsonb,'{"4bb79c82-28a5-480d-b244-6279e99f2a17":"CB"}'::jsonb,'{}'::jsonb,true,'5f8c34a3-d92a-544f-ba47-cdc9c4f27c69',
 'Demo Match Facts entry with coach-observed evidence.','CB','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":7,"dribbling":7},"defender":{"one_v_one_defending":7,"tackling":7,"defensive_positioning":6}}'::jsonb,'v4.0.0',('2026-08-02'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('78b4fc01-87f7-501c-a148-01d5c4dc374c','06a2ad09-466c-449a-915f-bc4cac218d2a','2026-08-02','Riverside Town Academy','D 2–2',72,0,0,6,2,false,7.0,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 2,2,'post','11','4-3-3','[]'::jsonb,'{"06a2ad09-466c-449a-915f-bc4cac218d2a":"GK"}'::jsonb,'{}'::jsonb,true,'5f8c34a3-d92a-544f-ba47-cdc9c4f27c69',
 'Demo Match Facts entry with coach-observed evidence.','GK','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"goalkeeper":{"gk_positioning":8,"gk_shot_stopping":6,"gk_reflexes":7}}'::jsonb,'v4.0.0',('2026-08-02'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('534bcfc6-0a70-545b-9d9d-127d44e08c5a','3f7ddd2b-4ed8-4dfe-ab5c-6a8a51de37ba','2026-08-02','Riverside Town Academy','D 2–2',58,0,0,0,0,false,6.6,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 2,2,'post','11','4-3-3','[]'::jsonb,'{"3f7ddd2b-4ed8-4dfe-ab5c-6a8a51de37ba":"RB"}'::jsonb,'{}'::jsonb,true,'5f8c34a3-d92a-544f-ba47-cdc9c4f27c69',
 'Demo Match Facts entry with coach-observed evidence.','RB','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":8,"dribbling":8},"defender":{"one_v_one_defending":7,"tackling":6,"defensive_positioning":7}}'::jsonb,'v4.0.0',('2026-08-02'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('432e790c-f7e4-56c6-8d3f-e2cf0be79ac2','eef6acf1-21a0-4e03-97a6-143aadc5bfa0','2026-08-02','Riverside Town Academy','D 2–2',75,0,1,0,0,false,8.6,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 2,2,'post','11','4-3-3','[]'::jsonb,'{"eef6acf1-21a0-4e03-97a6-143aadc5bfa0":"ST"}'::jsonb,'{}'::jsonb,true,'5f8c34a3-d92a-544f-ba47-cdc9c4f27c69',
 'Demo Match Facts entry with coach-observed evidence.','ST','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":7,"dribbling":8},"attacker":{"finishing":7,"shooting":8,"attacking_movement":7}}'::jsonb,'v4.0.0',('2026-08-02'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('9643a9e8-833c-507a-b4a5-032135cffbc2','683b4427-9366-507f-b0a4-92996f41b1d2','2026-08-02','Riverside Town Academy','D 2–2',68,0,0,3,2,false,7.7,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 2,2,'post','11','4-3-3','[]'::jsonb,'{"683b4427-9366-507f-b0a4-92996f41b1d2":"GK"}'::jsonb,'{}'::jsonb,true,'5f8c34a3-d92a-544f-ba47-cdc9c4f27c69',
 'Demo Match Facts entry with coach-observed evidence.','GK','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"goalkeeper":{"gk_positioning":6,"gk_shot_stopping":7,"gk_reflexes":7}}'::jsonb,'v4.0.0',('2026-08-02'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('7a7819a5-dcb3-5fcd-a783-4e748b019520','808ab9f0-e897-5f5f-9b19-7b835bc1f1de','2026-08-02','Riverside Town Academy','D 2–2',80,0,1,0,0,false,8.3,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 2,2,'post','11','4-3-3','[]'::jsonb,'{"808ab9f0-e897-5f5f-9b19-7b835bc1f1de":"ST"}'::jsonb,'{}'::jsonb,true,'5f8c34a3-d92a-544f-ba47-cdc9c4f27c69',
 'Demo Match Facts entry with coach-observed evidence.','ST','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":9,"passing":8,"dribbling":7},"attacker":{"finishing":8,"shooting":7,"attacking_movement":8}}'::jsonb,'v4.0.0',('2026-08-02'::date + interval '14 hours'));
INSERT INTO public.match_facts
(id,player_id,match_date,opponent,result,minutes_played,goals,assists,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,
 home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,fixture_id,coach_notes,position_played,match_format,formation_played,
 source_type,evidence_source,rubric_version,assessment_version,rating_scale,attribute_ratings,scoring_version,created_at)
VALUES ('46d6e18f-de43-5b13-90ad-19fbb20afb2b','fcc9b976-cf54-5c82-979b-90159d79abc3','2026-08-02','Riverside Town Academy','D 2–2',62,1,0,0,0,false,7.6,'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',
 2,2,'post','11','4-3-3','[]'::jsonb,'{"fcc9b976-cf54-5c82-979b-90159d79abc3":"CM"}'::jsonb,'{}'::jsonb,true,'5f8c34a3-d92a-544f-ba47-cdc9c4f27c69',
 'Demo Match Facts entry with coach-observed evidence.','CM','11v11','4-3-3','coach','coach_observation','v4.0.0','v4.0.0','ten','{"general":{"first_touch":8,"passing":7,"dribbling":9},"midfielder":{"receiving_under_pressure":7,"ball_retention":9,"progressive_passing":8}}'::jsonb,'v4.0.0',('2026-08-02'::date + interval '14 hours'));

-- Explicit scout interest only; no private scout notes are seeded into the Coach surface.
INSERT INTO public.recruitment_pipeline (id,scout_id,player_id,stage,interest_level,created_at,updated_at,is_active,interest_registered_at,interest_registered_by) VALUES ('f0e44d50-21de-5282-be68-6f160198a449','f456d419-9662-48f9-a03a-dc7fbc34d739','9399e655-5416-44de-8f70-781f955bc0a1','watching',7,'2026-08-08 11:20+00','2026-08-08 11:20+00',true,'2026-08-08 11:20+00','f456d419-9662-48f9-a03a-dc7fbc34d739') ON CONFLICT (scout_id,player_id) DO UPDATE SET is_active=true,stage='watching',interest_level=EXCLUDED.interest_level,interest_registered_at=EXCLUDED.interest_registered_at,updated_at=EXCLUDED.updated_at;
INSERT INTO public.recruitment_pipeline (id,scout_id,player_id,stage,interest_level,created_at,updated_at,is_active,interest_registered_at,interest_registered_by) VALUES ('75455030-c2a0-5816-b90f-7fe86e2ad14d','7840ae48-4348-4583-89dd-f4a88a867679','9399e655-5416-44de-8f70-781f955bc0a1','watching',8,'2026-08-03 15:10+00','2026-08-03 15:10+00',true,'2026-08-03 15:10+00','7840ae48-4348-4583-89dd-f4a88a867679') ON CONFLICT (scout_id,player_id) DO UPDATE SET is_active=true,stage='watching',interest_level=EXCLUDED.interest_level,interest_registered_at=EXCLUDED.interest_registered_at,updated_at=EXCLUDED.updated_at;
INSERT INTO public.recruitment_pipeline (id,scout_id,player_id,stage,interest_level,created_at,updated_at,is_active,interest_registered_at,interest_registered_by) VALUES ('696395f0-9ef0-5311-927b-9b09d101479c','bd187e60-9cec-451e-b26e-8f54da1ee022','52d019ab-8fa4-49de-9716-270eeb651480','watching',9,'2026-07-30 18:00+00','2026-07-30 18:00+00',true,'2026-07-30 18:00+00','bd187e60-9cec-451e-b26e-8f54da1ee022') ON CONFLICT (scout_id,player_id) DO UPDATE SET is_active=true,stage='watching',interest_level=EXCLUDED.interest_level,interest_registered_at=EXCLUDED.interest_registered_at,updated_at=EXCLUDED.updated_at;
INSERT INTO public.recruitment_pipeline (id,scout_id,player_id,stage,interest_level,created_at,updated_at,is_active,interest_registered_at,interest_registered_by) VALUES ('cd4d1783-c059-5121-b9f6-499e618e9731','bfcfae48-635b-495a-8462-07f9ae86b9a0','eef6acf1-21a0-4e03-97a6-143aadc5bfa0','watching',7,'2026-07-24 12:00+00','2026-07-24 12:00+00',true,'2026-07-24 12:00+00','bfcfae48-635b-495a-8462-07f9ae86b9a0') ON CONFLICT (scout_id,player_id) DO UPDATE SET is_active=true,stage='watching',interest_level=EXCLUDED.interest_level,interest_registered_at=EXCLUDED.interest_registered_at,updated_at=EXCLUDED.updated_at;
INSERT INTO public.recruitment_pipeline (id,scout_id,player_id,stage,interest_level,created_at,updated_at,is_active,interest_registered_at,interest_registered_by) VALUES ('3927ffe6-8366-5771-ba92-03763043d84b','d58354ba-8a91-407e-b7d4-bd8551568b17','808ab9f0-e897-5f5f-9b19-7b835bc1f1de','watching',8,'2026-07-18 09:00+00','2026-07-18 09:00+00',true,'2026-07-18 09:00+00','d58354ba-8a91-407e-b7d4-bd8551568b17') ON CONFLICT (scout_id,player_id) DO UPDATE SET is_active=true,stage='watching',interest_level=EXCLUDED.interest_level,interest_registered_at=EXCLUDED.interest_registered_at,updated_at=EXCLUDED.updated_at;
INSERT INTO public.recruitment_pipeline (id,scout_id,player_id,stage,interest_level,created_at,updated_at,is_active,interest_registered_at,interest_registered_by) VALUES ('ca5f51bc-49ca-50f0-9bf3-c8fc54fb9125','f456d419-9662-48f9-a03a-dc7fbc34d739','fcc9b976-cf54-5c82-979b-90159d79abc3','watching',9,'2026-07-08 16:30+00','2026-07-08 16:30+00',true,'2026-07-08 16:30+00','f456d419-9662-48f9-a03a-dc7fbc34d739') ON CONFLICT (scout_id,player_id) DO UPDATE SET is_active=true,stage='watching',interest_level=EXCLUDED.interest_level,interest_registered_at=EXCLUDED.interest_registered_at,updated_at=EXCLUDED.updated_at;
INSERT INTO public.recruitment_pipeline (id,scout_id,player_id,stage,interest_level,created_at,updated_at,is_active,interest_registered_at,interest_registered_by) VALUES ('6ad413dd-3f51-51d8-b8ad-6c4c65b279f9','7840ae48-4348-4583-89dd-f4a88a867679','4bb79c82-28a5-480d-b244-6279e99f2a17','watching',7,'2026-06-28 13:00+00','2026-06-28 13:00+00',true,'2026-06-28 13:00+00','7840ae48-4348-4583-89dd-f4a88a867679') ON CONFLICT (scout_id,player_id) DO UPDATE SET is_active=true,stage='watching',interest_level=EXCLUDED.interest_level,interest_registered_at=EXCLUDED.interest_registered_at,updated_at=EXCLUDED.updated_at;
INSERT INTO public.recruitment_pipeline (id,scout_id,player_id,stage,interest_level,created_at,updated_at,is_active,interest_registered_at,interest_registered_by) VALUES ('2714199f-c3f6-5a63-8e48-4fee36201d34','bd187e60-9cec-451e-b26e-8f54da1ee022','49f78a84-1f70-5e7f-988c-0b0a74ee7e11','watching',8,'2026-06-18 10:15+00','2026-06-18 10:15+00',true,'2026-06-18 10:15+00','bd187e60-9cec-451e-b26e-8f54da1ee022') ON CONFLICT (scout_id,player_id) DO UPDATE SET is_active=true,stage='watching',interest_level=EXCLUDED.interest_level,interest_registered_at=EXCLUDED.interest_registered_at,updated_at=EXCLUDED.updated_at;

-- Scout attendance makes the next fixtures useful in Coach Desk and Coach Field.
INSERT INTO public.fixture_attendance (fixture_id,scout_id,coach_id,status,created_at,updated_at) VALUES ('f7be5a8b-a027-5390-a86b-2e7cb8701c9a','f456d419-9662-48f9-a03a-dc7fbc34d739','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','attending',now(),now()) ON CONFLICT (fixture_id,scout_id) DO UPDATE SET status='attending',updated_at=now();
INSERT INTO public.fixture_attendance (fixture_id,scout_id,coach_id,status,created_at,updated_at) VALUES ('f7be5a8b-a027-5390-a86b-2e7cb8701c9a','7840ae48-4348-4583-89dd-f4a88a867679','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','attending',now(),now()) ON CONFLICT (fixture_id,scout_id) DO UPDATE SET status='attending',updated_at=now();
INSERT INTO public.fixture_attendance (fixture_id,scout_id,coach_id,status,created_at,updated_at) VALUES ('f7be5a8b-a027-5390-a86b-2e7cb8701c9a','bd187e60-9cec-451e-b26e-8f54da1ee022','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','attending',now(),now()) ON CONFLICT (fixture_id,scout_id) DO UPDATE SET status='attending',updated_at=now();
INSERT INTO public.fixture_attendance (fixture_id,scout_id,coach_id,status,created_at,updated_at) VALUES ('b52ecf31-96ca-5909-9358-16276e80b5a9','7840ae48-4348-4583-89dd-f4a88a867679','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','attending',now(),now()) ON CONFLICT (fixture_id,scout_id) DO UPDATE SET status='attending',updated_at=now();
INSERT INTO public.fixture_attendance (fixture_id,scout_id,coach_id,status,created_at,updated_at) VALUES ('b52ecf31-96ca-5909-9358-16276e80b5a9','bd187e60-9cec-451e-b26e-8f54da1ee022','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','attending',now(),now()) ON CONFLICT (fixture_id,scout_id) DO UPDATE SET status='attending',updated_at=now();

-- Approved/pending external demo links exercise the real video workflow without storing fake binary footage.
INSERT INTO public.player_videos (id,player_id,title,url,video_type,uploaded_by,uploaded_by_type,created_at,coach_id,team_id,category,video_url,description,moderation_status,moderated_at,moderated_by,fixture_id) VALUES ('c45f726a-4b17-54d7-96ea-bfc26bdc0a69','9399e655-5416-44de-8f70-781f955bc0a1','Lucas James · external demo highlight','https://www.youtube.com/watch?v=aqz-KE-bpKQ','External link','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','Coach',now()-interval '1 days','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','Highlight','https://www.youtube.com/watch?v=aqz-KE-bpKQ','Public external demo link used to demonstrate ScoutLink video workflows.','approved',now(),'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','5f8c34a3-d92a-544f-ba47-cdc9c4f27c69');
INSERT INTO public.player_videos (id,player_id,title,url,video_type,uploaded_by,uploaded_by_type,created_at,coach_id,team_id,category,video_url,description,moderation_status,moderated_at,moderated_by,fixture_id) VALUES ('586eab45-1327-51aa-8210-f78439f8d4c4','52d019ab-8fa4-49de-9716-270eeb651480','Tyler Cook · external demo highlight','https://youtu.be/aqz-KE-bpKQ','External link','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','Coach',now()-interval '2 days','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','Highlight','https://youtu.be/aqz-KE-bpKQ','Public external demo link used to demonstrate ScoutLink video workflows.','approved',now(),'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','b74bee7f-e77d-5ac0-a9ce-21bfffbd183f');
INSERT INTO public.player_videos (id,player_id,title,url,video_type,uploaded_by,uploaded_by_type,created_at,coach_id,team_id,category,video_url,description,moderation_status,moderated_at,moderated_by,fixture_id) VALUES ('e288cb05-76f0-5335-8085-185207979039','eef6acf1-21a0-4e03-97a6-143aadc5bfa0','Kobe Roberts · finishing demo link','https://www.youtube.com/watch?v=aqz-KE-bpKQ','External link','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','Coach',now()-interval '3 days','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','Skills','https://www.youtube.com/watch?v=aqz-KE-bpKQ','Public external demo link used to demonstrate ScoutLink video workflows.','approved',now(),'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',NULL);
INSERT INTO public.player_videos (id,player_id,title,url,video_type,uploaded_by,uploaded_by_type,created_at,coach_id,team_id,category,video_url,description,moderation_status,moderated_at,moderated_by,fixture_id) VALUES ('9e783112-280f-5c29-ba98-7ff4f6b7c347','808ab9f0-e897-5f5f-9b19-7b835bc1f1de','Theo Nwosu · match demo link','https://youtu.be/aqz-KE-bpKQ','External link','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','Coach',now()-interval '4 days','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','Match','https://youtu.be/aqz-KE-bpKQ','Public external demo link used to demonstrate ScoutLink video workflows.','approved',now(),'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','ddc21f93-3f1d-526f-af6c-a7f908ae7bd3');
INSERT INTO public.player_videos (id,player_id,title,url,video_type,uploaded_by,uploaded_by_type,created_at,coach_id,team_id,category,video_url,description,moderation_status,moderated_at,moderated_by,fixture_id) VALUES ('3121febe-4a77-5d78-9d19-cee3712652b7','fcc9b976-cf54-5c82-979b-90159d79abc3','Aaron James · training demo link','https://www.youtube.com/watch?v=aqz-KE-bpKQ','External link','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','Coach',now()-interval '5 days','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','Training','https://www.youtube.com/watch?v=aqz-KE-bpKQ','Public external demo link used to demonstrate ScoutLink video workflows.','approved',now(),'ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e',NULL);
INSERT INTO public.player_videos (id,player_id,title,url,video_type,uploaded_by,uploaded_by_type,created_at,coach_id,team_id,category,video_url,description,moderation_status,moderated_at,moderated_by,fixture_id) VALUES ('de31bd40-cec6-5b6a-8f2d-3ba2d9405ab3','4bb79c82-28a5-480d-b244-6279e99f2a17','Rayan Patel · review queue demo','https://youtu.be/aqz-KE-bpKQ','External link','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','Coach',now()-interval '6 days','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','Match','https://youtu.be/aqz-KE-bpKQ','Public external demo link used to demonstrate ScoutLink video workflows.','pending',NULL,NULL,'5f8c34a3-d92a-544f-ba47-cdc9c4f27c69');
INSERT INTO public.player_videos (id,player_id,title,url,video_type,uploaded_by,uploaded_by_type,created_at,coach_id,team_id,category,video_url,description,moderation_status,moderated_at,moderated_by,fixture_id) VALUES ('b6f3dedf-5773-5469-8c14-32026fec11ff','49f78a84-1f70-5e7f-988c-0b0a74ee7e11','Max Cole · review queue demo','https://www.youtube.com/watch?v=aqz-KE-bpKQ','External link','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','Coach',now()-interval '7 days','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','c5255a4f-9052-4f66-b3fc-95f4d2afc480','Highlight','https://www.youtube.com/watch?v=aqz-KE-bpKQ','Public external demo link used to demonstrate ScoutLink video workflows.','pending',NULL,NULL,'6bc45a4b-3506-5882-aefe-c8d543760256');

-- Three Coach/scout conversations with realistic but fictional content.
INSERT INTO public.chat_threads (id,scout_id,coach_id,player_id,pipeline_id,status,last_message_at,created_at,updated_at) VALUES ('65298536-1cb8-576d-9325-1bb52e634c3e','f456d419-9662-48f9-a03a-dc7fbc34d739','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','9399e655-5416-44de-8f70-781f955bc0a1','f0e44d50-21de-5282-be68-6f160198a449','open','2026-08-08T12:20:00+00:00','2026-08-08T09:20:00+00:00','2026-08-08T12:20:00+00:00');
INSERT INTO public.chat_messages (id,thread_id,sender_id,sender_type,body,is_read,created_at,message_kind,metadata) VALUES ('e4321ef3-75d3-543d-90ba-1e8471e9179e','65298536-1cb8-576d-9325-1bb52e634c3e','f456d419-9662-48f9-a03a-dc7fbc34d739','Scout','We have registered interest after reviewing the recent Match Facts. Which upcoming fixtures is Lucas likely to feature in?',true,'2026-08-08T10:20:00+00:00','text','{"demo_seed":true}'::jsonb);
INSERT INTO public.chat_messages (id,thread_id,sender_id,sender_type,body,is_read,created_at,message_kind,metadata) VALUES ('bc20ae9f-703c-56d4-86fe-9be89da9cdfc','65298536-1cb8-576d-9325-1bb52e634c3e','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','Coach','Lucas is expected to be available for the next three fixtures, starting with Camden Athletic on Saturday.',true,'2026-08-08T11:20:00+00:00','text','{"demo_seed":true}'::jsonb);
INSERT INTO public.chat_messages (id,thread_id,sender_id,sender_type,body,is_read,created_at,message_kind,metadata) VALUES ('94ddad36-126a-5251-a5dc-500d40f1798e','65298536-1cb8-576d-9325-1bb52e634c3e','f456d419-9662-48f9-a03a-dc7fbc34d739','Scout','Thanks. Two members of our team are planning to attend the Camden fixture.',false,'2026-08-08T12:20:00+00:00','text','{"demo_seed":true}'::jsonb);
INSERT INTO public.chat_threads (id,scout_id,coach_id,player_id,pipeline_id,status,last_message_at,created_at,updated_at) VALUES ('29e42557-0b90-5f8a-9f16-d43a65f62411','bd187e60-9cec-451e-b26e-8f54da1ee022','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','52d019ab-8fa4-49de-9716-270eeb651480','696395f0-9ef0-5311-927b-9b09d101479c','open','2026-08-05T11:20:00+00:00','2026-08-05T09:20:00+00:00','2026-08-05T11:20:00+00:00');
INSERT INTO public.chat_messages (id,thread_id,sender_id,sender_type,body,is_read,created_at,message_kind,metadata) VALUES ('881bd79c-9b5c-5f61-b7cd-513452c78b3c','29e42557-0b90-5f8a-9f16-d43a65f62411','bd187e60-9cec-451e-b26e-8f54da1ee022','Scout','Could you confirm whether Tyler is comfortable on either wing as well as the right side?',true,'2026-08-05T10:20:00+00:00','text','{"demo_seed":true}'::jsonb);
INSERT INTO public.chat_messages (id,thread_id,sender_id,sender_type,body,is_read,created_at,message_kind,metadata) VALUES ('14a0daf2-dd62-5898-8d48-6737cfe19ccb','29e42557-0b90-5f8a-9f16-d43a65f62411','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','Coach','Yes. Right wing is his primary role, but he has also played from the left and as an attacking midfielder.',true,'2026-08-05T11:20:00+00:00','text','{"demo_seed":true}'::jsonb);
INSERT INTO public.chat_threads (id,scout_id,coach_id,player_id,pipeline_id,status,last_message_at,created_at,updated_at) VALUES ('9e6c3976-fa18-5a60-9b61-a25f34ea7270','d58354ba-8a91-407e-b7d4-bd8551568b17','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','808ab9f0-e897-5f5f-9b19-7b835bc1f1de','3927ffe6-8366-5771-ba92-03763043d84b','open','2026-08-02T11:20:00+00:00','2026-08-02T09:20:00+00:00','2026-08-02T11:20:00+00:00');
INSERT INTO public.chat_messages (id,thread_id,sender_id,sender_type,body,is_read,created_at,message_kind,metadata) VALUES ('db79a987-0fbf-57e1-ae89-9e0ad983ab6a','9e6c3976-fa18-5a60-9b61-a25f34ea7270','d58354ba-8a91-407e-b7d4-bd8551568b17','Scout','Is Theo available for the Barnet Youth fixture later this month?',true,'2026-08-02T10:20:00+00:00','text','{"demo_seed":true}'::jsonb);
INSERT INTO public.chat_messages (id,thread_id,sender_id,sender_type,body,is_read,created_at,message_kind,metadata) VALUES ('eaf570c6-81cb-511f-b1b5-88887fbdcb84','9e6c3976-fa18-5a60-9b61-a25f34ea7270','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','Coach','Yes, he is currently available and expected to be in the matchday squad.',true,'2026-08-02T11:20:00+00:00','text','{"demo_seed":true}'::jsonb);

-- Coach notifications drive unread counts and Next Actions.
INSERT INTO public.notifications (id,recipient_id,recipient_type,notification_type,title,body,data,is_read,email_sent,created_at) VALUES ('618daa72-271b-5d4c-a8cd-d4f2d0f33964','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','Coach','scout_interest'::notif_type,'New scout interest','Westbridge FC Academy registered interest in Lucas James','{"demo_seed":true,"player_id":"9399e655-5416-44de-8f70-781f955bc0a1"}'::jsonb,false,false,'2026-08-08 11:22+00');
INSERT INTO public.notifications (id,recipient_id,recipient_type,notification_type,title,body,data,is_read,email_sent,created_at) VALUES ('8f36b07b-5ef2-5f67-b8a8-2d8b2e812195','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','Coach','chat_message'::notif_type,'New scout message','North London Pathway asked about Theo Nwosu','{"demo_seed":true,"player_id":"808ab9f0-e897-5f5f-9b19-7b835bc1f1de"}'::jsonb,false,false,'2026-08-09 10:10+00');
INSERT INTO public.notifications (id,recipient_id,recipient_type,notification_type,title,body,data,is_read,email_sent,created_at) VALUES ('232d5957-4854-5f47-850d-818edc1ffd40','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','Coach','fixture_attendance'::notif_type,'Scout attendance confirmed','Three scouts are attending the Camden Athletic fixture','{"demo_seed":true}'::jsonb,true,false,'2026-08-10 13:00+00');
INSERT INTO public.notifications (id,recipient_id,recipient_type,notification_type,title,body,data,is_read,email_sent,created_at) VALUES ('6bf87a7b-7a6a-5ab7-b2ba-806e0075b3d8','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','Coach','match_fact'::notif_type,'Match Facts reminder','Complete Match Facts after the Riverside Town Academy fixture','{"demo_seed":true}'::jsonb,false,false,'2026-08-03 18:00+00');
INSERT INTO public.notifications (id,recipient_id,recipient_type,notification_type,title,body,data,is_read,email_sent,created_at) VALUES ('b6c12974-2595-58c1-ba26-c45c5ed4ac36','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','Coach','system'::notif_type,'Profile readiness','Kai Brennan still has assessment fields marked Not observed','{"demo_seed":true,"player_id":"3b6d63a2-2f20-5f33-81d9-46fef9c6a1f8"}'::jsonb,true,false,'2026-08-07 08:30+00');
INSERT INTO public.notifications (id,recipient_id,recipient_type,notification_type,title,body,data,is_read,email_sent,created_at) VALUES ('3292e0d6-a64c-5e0a-81b2-d78429d3e8d4','ccfa7c7e-9a7e-430b-abb5-3a4fcadd1f2e','Coach','scout_interest'::notif_type,'New scout interest','Camden Athletic Academy registered interest in Tyler Cook','{"demo_seed":true,"player_id":"52d019ab-8fa4-49de-9716-270eeb651480"}'::jsonb,true,false,'2026-07-30 18:02+00');

COMMIT;
