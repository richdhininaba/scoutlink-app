-- ScoutLink demo environment and Stratex org seed.
-- Idempotent: rebuilds only demo.*@scoutlink.app records and named (Demo) teams.

begin;

create temp table demo_seed_teams(
  team_ord int primary key,
  team_name text not null,
  city text not null,
  county text not null,
  league text not null
) on commit drop;

insert into demo_seed_teams(team_ord,team_name,city,county,league) values
(1,'Northgate United (Demo)','London','Greater London','London Youth Premier'),
(2,'Eastbrook Athletic (Demo)','Birmingham','West Midlands','Midlands Youth League'),
(3,'Harbour City Academy (Demo)','Liverpool','Merseyside','North West Development League'),
(4,'Meadow Park Rovers (Demo)','Manchester','Greater Manchester','Greater Manchester Youth League'),
(5,'Southvale Juniors (Demo)','Bristol','Bristol','South West Academy League');

-- Clean previous generated demo data without touching real or legacy test users.
delete from chat_messages m using chat_threads t
where m.thread_id = t.id
and (
  t.scout_id in (select id from scouts where email like 'demo.scout%@scoutlink.app')
  or t.coach_id in (select id from coaches where email like 'demo.coach%@scoutlink.app')
  or t.player_id in (select id from players where email like 'demo.player%@scoutlink.app')
);

delete from chat_threads
where scout_id in (select id from scouts where email like 'demo.scout%@scoutlink.app')
   or coach_id in (select id from coaches where email like 'demo.coach%@scoutlink.app')
   or player_id in (select id from players where email like 'demo.player%@scoutlink.app');

delete from fixture_attendance where scout_id in (select id from scouts where email like 'demo.scout%@scoutlink.app')
   or coach_id in (select id from coaches where email like 'demo.coach%@scoutlink.app');
delete from scout_exports where scout_id in (select id from scouts where email like 'demo.scout%@scoutlink.app')
   or player_id in (select id from players where email like 'demo.player%@scoutlink.app');
delete from predictions_log where scout_id in (select id from scouts where email like 'demo.scout%@scoutlink.app')
   or player_id in (select id from players where email like 'demo.player%@scoutlink.app');
delete from compatibility_scores where player_id in (select id from players where email like 'demo.player%@scoutlink.app')
   or scout_team_id in (select id from scout_teams where is_demo = true and team_name = 'ScoutLink Demo Recruitment Team (Demo)');
delete from recruitment_pipeline where scout_id in (select id from scouts where email like 'demo.scout%@scoutlink.app')
   or player_id in (select id from players where email like 'demo.player%@scoutlink.app');
delete from player_videos where player_id in (select id from players where email like 'demo.player%@scoutlink.app');
delete from match_facts where player_id in (select id from players where email like 'demo.player%@scoutlink.app')
   or coach_id in (select id from coaches where email like 'demo.coach%@scoutlink.app');
delete from fixtures where coach_id in (select id from coaches where email like 'demo.coach%@scoutlink.app')
   or team_id in (select id from school_academy_teams where is_demo = true and team_name in (select team_name from demo_seed_teams));
delete from players where email like 'demo.player%@scoutlink.app';
delete from coaches where email like 'demo.coach%@scoutlink.app';
delete from scouts where email like 'demo.scout%@scoutlink.app';
delete from school_academy_teams where is_demo = true and team_name in (select team_name from demo_seed_teams);
delete from scout_teams where is_demo = true and team_name = 'ScoutLink Demo Recruitment Team (Demo)';

create temp table demo_team_ids(team_ord int primary key, id uuid not null, team_name text not null) on commit drop;
with ins as (
  insert into school_academy_teams(team_name,county,league,contact_email,city,country,address_line,postcode,is_demo)
  select team_name, county, league, lower(replace(team_name,' ','') || '@demo.scoutlink.app'), city, 'England',
         'Demo Training Ground, ' || city, 'SL' || team_ord || ' 1DM', true
  from demo_seed_teams
  order by team_ord
  returning id, team_name
)
insert into demo_team_ids(team_ord,id,team_name)
select s.team_ord, i.id, i.team_name from ins i join demo_seed_teams s using(team_name);

create temp table demo_coach_ids(team_ord int primary key, id uuid not null, email text not null) on commit drop;
with coach_seed(team_ord, first_name, last_name, email_addr, is_super) as (
  values
  (1,'Marcus','Reed','demo.coach01@scoutlink.app',true),
  (2,'Aisha','Clarke','demo.coach02@scoutlink.app',true),
  (3,'Daniel','Brooks','demo.coach03@scoutlink.app',false),
  (4,'Priya','Shah','demo.coach04@scoutlink.app',false),
  (5,'Owen','Kelly','demo.coach05@scoutlink.app',true)
), ins as (
  insert into coaches(coach_id,first_name,last_name,email,phone,team_id,team_name,role_at_club,data_policy_agreed,is_active,registration_complete,is_super_user,team_county,team_league,is_demo)
  select 'DCH' || lpad(c.team_ord::text,2,'0'), c.first_name, c.last_name, c.email_addr,
         '+44770090' || lpad(c.team_ord::text,4,'0'), t.id, t.team_name,
         case when c.is_super then 'Head Coach' else 'Assistant Coach' end,
         true, true, true, c.is_super, st.county, st.league, true
  from coach_seed c
  join demo_team_ids t on t.team_ord = c.team_ord
  join demo_seed_teams st on st.team_ord = c.team_ord
  returning id,email,coach_id
)
insert into demo_coach_ids(team_ord,id,email)
select right(coach_id,2)::int, id, email from ins;

create temp table demo_scout_team_ids(id uuid primary key) on commit drop;
with ins as (
  insert into scout_teams(team_name,league,tier,country,formation,playing_style,role_expectations,long_term_goals,salary_cap,scout_region,min_appearances,preferred_positions,age_groups,club_name,is_demo)
  values ('ScoutLink Demo Recruitment Team (Demo)','National League Development',5,'England','4-3-3','High pressing with quick wide transitions',
    array['Ball-winning midfield','Creative wide forward','Commanding goalkeeper'],
    array['Build a U18 pathway','Increase resale upside','Lower recruitment risk'],
    500000,'London and South East',3,array['ST','CAM','CB','GK'],array['U16','U17','U18'],'Stratex Demo FC',true)
  returning id
)
insert into demo_scout_team_ids select id from ins;

create temp table demo_scout_ids(scout_ord int primary key, id uuid not null, email text not null) on commit drop;
with scout_seed(scout_ord, first_name, last_name, email_addr, plan_name, region_name) as (
  values
  (1,'Noah','Patel','demo.scout01@scoutlink.app','Elite','London'),
  (2,'Ella','Morgan','demo.scout02@scoutlink.app','Plus','Midlands'),
  (3,'Theo','Wilson','demo.scout03@scoutlink.app','Plus','North West'),
  (4,'Maya','Hughes','demo.scout04@scoutlink.app','Core','South West'),
  (5,'Leo','Bennett','demo.scout05@scoutlink.app','Core','National')
), ins as (
  insert into scouts(scout_id,first_name,last_name,email,phone,club_name,club_league,scout_team_id,scout_preferences,preferences_set,is_active,subscription_plan,exports_remaining,predictions_remaining,interests_remaining,is_super_user,registration_complete,is_demo)
  select 'DSC' || lpad(s.scout_ord::text,2,'0'), s.first_name, s.last_name, s.email_addr,
         '+44770190' || lpad(s.scout_ord::text,4,'0'), 'Stratex Demo FC', 'National League Development', (select id from demo_scout_team_ids limit 1),
         jsonb_build_object(
           'teamWeaknesses', array['Tactical awareness gaps','Low team chemistry and leadership','Insufficient game pace and speed'],
           'preferredPositions', array['ST','CAM','CB','GK'],
           'ageGroups', array['U16','U17','U18'],
           'scoutCountry','England',
           'scoutRegion',s.region_name,
           'roleExpectations',array['High decision speed','Coachable under pressure','Evidence from match facts'],
           'longTermGoals',array['Pathway resale value','First-team readiness','Lower recruitment risk']
         ),
         true, true, s.plan_name,
         case s.plan_name when 'Elite' then 500 when 'Plus' then 120 else 30 end,
         case s.plan_name when 'Elite' then 1200 when 'Plus' then 600 else 120 end,
         case s.plan_name when 'Elite' then 99999 when 'Plus' then 1000 else 200 end,
         s.scout_ord = 1, true, true
  from scout_seed s
  returning id,email,scout_id
)
insert into demo_scout_ids(scout_ord,id,email)
select right(scout_id,2)::int, id, email from ins;

with names as (
  select
    array['Ethan','Noah','Jordan','Samuel','Mason','Alfie','Isaac','Oscar','Theo','Leo','Archie','Finley','Logan','Harry','Jude','Rayan','Kai','Adam','Eli','Max','Riley','Zion','Toby','Kian','Jayden','Lucas','Freddie','Omar','Harvey','Callum','Reuben','Nico','Elias','Louis','Ben','Tyler','Aiden','Roman','Sonny','Yusuf','Carter','Blake','Dylan','Micah','Jenson','Kobe','Luca','Ryan','Caleb','Ellis'] firsts,
    array['Cole','Reed','Blake','Price','Clarke','Carter','Morgan','Hayes','Brooks','Stone','King','Shaw','Ali','Walker','Bennett','Patel','Jones','Morris','Turner','Evans','Cooper','Hall','Bailey','Khan','Wood','James','Foster','Ahmed','Gray','Kelly','Hughes','Bell','Ward','Murphy','Green','Cook','Parker','Ross','Young','White','Hill','Wright','Scott','Powell','Mitchell','Roberts','Phillips','Cox','Richardson','Edwards'] lasts,
    array['ST','CAM','CB','RW','GK','RB','CM','LB','DM','LW'] poss
), seed as (
  select g n,
         ((g - 1) % 5) + 1 team_ord,
         names.firsts[g] first_name,
         names.lasts[g] last_name,
         names.poss[((g - 1) % 10) + 1] pos
  from generate_series(1,50) g, names
), player_seed as (
  select s.*,
    case when pos='GK' then 'Goalkeeper' when pos in ('CB','RB','LB') then 'Defender' when pos in ('CM','CAM','DM') then 'Midfielder' else 'Forward' end position_group,
    14 + (s.n % 5) age,
    ('U' || (15 + (s.n % 4))) age_group,
    round((6.4 + ((s.n * 7) % 24) / 10.0)::numeric,1) base_rating
  from seed s
)
insert into players(player_id,first_name,last_name,email,date_of_birth,age,age_group,nationality,nationality_code,position_group,specific_position,positions,primary_position,foot,height_category,height_range_cm,height_min_cm,height_max_cm,build_category,weight_range_kg,weight_min_kg,weight_max_kg,team_id,team_name,appearances,goals,assists,clean_sheets,yellow_cards,red_cards,pace,agility,strength,stamina,jumping,composure,shooting,passing,dribbling,defending,crossing,vision,positioning,heading,tackling,work_rate,gk_diving,gk_handling,gk_kicking,gk_reflexes,gk_positioning,gk_distribution,gk_communication,gk_sweeping,overall_rating,transfer_value,predicted_salary_weekly,video_urls,assigned_coach_id,registration_complete,overall_breakdown,position_ratings,value_analysis,scoring_version,is_active,is_demo)
select 'DPL' || lpad(p.n::text,3,'0'), p.first_name, p.last_name, 'demo.player' || lpad(p.n::text,2,'0') || '@scoutlink.app',
       (date '2006-01-01' + (p.n * interval '37 days'))::date, p.age, p.age_group, 'England', 'gb-eng',
       p.position_group::position_group, p.pos, array[p.pos], p.pos, case when p.n % 4 = 0 then 'Left' else 'Right' end,
       case when p.n % 5 = 0 then 'tall' when p.n % 4 = 0 then 'short' else 'average' end::height_category,
       case when p.n % 5 = 0 then '184-191' when p.n % 4 = 0 then '165-172' else '172-184' end,
       case when p.n % 5 = 0 then 184 when p.n % 4 = 0 then 165 else 172 end,
       case when p.n % 5 = 0 then 191 when p.n % 4 = 0 then 172 else 184 end,
       case when p.n % 6 = 0 then 'powerful' when p.n % 3 = 0 then 'lean' else 'athletic' end::build_category,
       case when p.n % 6 = 0 then '72-82' when p.n % 3 = 0 then '60-68' else '64-76' end,
       case when p.n % 6 = 0 then 72 when p.n % 3 = 0 then 60 else 64 end,
       case when p.n % 6 = 0 then 82 when p.n % 3 = 0 then 68 else 76 end,
       t.id, t.team_name,
       8 + (p.n % 14),
       case when p.position_group='Forward' then 5 + (p.n % 12) when p.position_group='Midfielder' then 2 + (p.n % 6) else p.n % 3 end,
       case when p.position_group in ('Forward','Midfielder') then 3 + (p.n % 8) else p.n % 4 end,
       case when p.position_group in ('Goalkeeper','Defender') then 3 + (p.n % 9) else p.n % 2 end,
       p.n % 4, case when p.n % 19 = 0 then 1 else 0 end,
       least(10,p.base_rating + case when p.pos in ('LW','RW','ST') then 1.0 else .2 end),
       least(10,p.base_rating + .3),
       least(10,p.base_rating + case when p.pos in ('CB','ST') then .8 else .1 end),
       least(10,p.base_rating + .6),
       least(10,p.base_rating + .2),
       least(10,p.base_rating + .4),
       least(10,p.base_rating + case when p.pos in ('ST','RW','LW','CAM') then 1.0 else -.2 end),
       least(10,p.base_rating + case when p.pos in ('CM','CAM','DM') then 1.0 else .1 end),
       least(10,p.base_rating + case when p.pos in ('LW','RW','CAM') then 1.0 else .1 end),
       least(10,p.base_rating + case when p.pos in ('CB','RB','LB','DM') then 1.1 else -.3 end),
       least(10,p.base_rating + case when p.pos in ('LW','RW','RB','LB') then .8 else .1 end),
       least(10,p.base_rating + case when p.pos in ('CAM','CM') then 1.1 else .2 end),
       least(10,p.base_rating + .5),
       least(10,p.base_rating + case when p.pos in ('CB','ST') then .7 else 0 end),
       least(10,p.base_rating + case when p.pos in ('CB','RB','LB','DM') then .9 else -.1 end),
       case when p.n % 2 = 0 then 'High/Medium' else 'Medium/High' end,
       case when p.pos='GK' then least(10,p.base_rating+1.0) end,
       case when p.pos='GK' then least(10,p.base_rating+.8) end,
       case when p.pos='GK' then least(10,p.base_rating+.5) end,
       case when p.pos='GK' then least(10,p.base_rating+1.1) end,
       case when p.pos='GK' then least(10,p.base_rating+.7) end,
       case when p.pos='GK' then least(10,p.base_rating+.6) end,
       case when p.pos='GK' then least(10,p.base_rating+.5) end,
       case when p.pos='GK' then least(10,p.base_rating+.4) end,
       round((68 + (p.n % 17) + case when p.pos in ('ST','CAM') then 3 else 0 end)::numeric,0),
       (45000 + (p.n * 8500) + case when p.pos in ('ST','LW','RW') then 35000 when p.pos='GK' then 12000 else 22000 end),
       (90 + (p.n * 8)),
       array['/demo/videos/player-' || lpad(p.n::text,2,'0') || '-highlights.mp4'],
       c.id, true,
       jsonb_build_object('finalScore',68+(p.n%17),'currentReadiness',66+(p.n%16),'potentialRating',72+(p.n%18),'dataConfidence','High','technical',70+(p.n%16),'tactical',65+(p.n%18),'physical',72+(p.n%15),'mental',68+(p.n%17),'matchOutput',64+(p.n%19)),
       jsonb_build_object(p.pos, jsonb_build_object('score',70+(p.n%20),'label',p.position_group)),
       jsonb_build_object('displayValue',45000 + (p.n * 8500),'riskLabel','Balanced risk','affordabilityLabel','Demo shortlist case','positionGroup',p.position_group),
       'v3-demo', true, true
from player_seed p
join demo_team_ids t on t.team_ord = p.team_ord
join demo_coach_ids c on c.team_ord = p.team_ord;

insert into fixtures(team_id,coach_id,opponent,fixture_date,fixture_time,venue,home_or_away,format,notes,city,country,venue_address,venue_postcode)
select t.id, c.id, opp.opponent, current_date + (opp.n * interval '7 days'), time '10:30',
       t.team_name || ' Training Ground', case when opp.n % 2 = 0 then 'Away' else 'Home' end,
       '11', 'Demo fixture with scout-visible venue data.', st.city, 'England', 'Demo Training Ground, ' || st.city, 'SL' || t.team_ord || ' 1DM'
from demo_team_ids t
join demo_seed_teams st on st.team_ord = t.team_ord
join demo_coach_ids c on c.team_ord = t.team_ord
cross join (values (1,'Riverside Rangers U18'),(2,'Brookfield Athletic'),(3,'Westhaven Development XI')) opp(n,opponent);

insert into match_facts(player_id,match_date,opponent,result,minutes_played,goals,assists,shots,shots_on_target,passes,pass_accuracy,dribbles,tackles,interceptions,fouls,yellow_cards,red_cards,saves,goals_conceded,clean_sheet,performance_score,created_by,team_id,coach_id,home_score,away_score,mode,format,formation,events,player_positions,ratings,confirmed,pace,agility,strength,stamina,composure,shooting,passing,dribbling,defending,crossing,vision,positioning,heading,tackling,coach_notes)
select p.id, current_date - (m.n * interval '9 days'), m.opponent,
       case when m.n = 1 then '3-1' when m.n = 2 then '2-2' else '1-0' end,
       65 + ((p.appearances + m.n) % 26),
       case when p.position_group='Forward' then m.n % 3 when p.position_group='Midfielder' then m.n % 2 else 0 end,
       case when p.position_group in ('Forward','Midfielder') then (m.n + p.appearances) % 2 else 0 end,
       1 + (m.n % 4), m.n % 3, 18 + (p.appearances % 28), 76 + (p.appearances % 18), 1 + (m.n % 5),
       case when p.position_group in ('Defender','Midfielder') then 2 + (m.n % 5) else m.n % 2 end,
       case when p.position_group in ('Defender','Midfielder') then 1 + (m.n % 4) else 0 end,
       m.n % 3, case when m.n = 3 then 1 else 0 end, 0,
       case when p.position_group='Goalkeeper' then 3 + m.n else 0 end,
       case when p.position_group='Goalkeeper' then m.n % 2 else 0 end,
       p.position_group in ('Goalkeeper','Defender') and m.n = 3,
       70 + ((p.appearances + m.n) % 18), p.assigned_coach_id, p.team_id, p.assigned_coach_id,
       case when m.n = 1 then 3 when m.n = 2 then 2 else 1 end,
       case when m.n = 1 then 1 when m.n = 2 then 2 else 0 end,
       'post','11v11','4-3-3',
       jsonb_build_array(jsonb_build_object('minute',18 + m.n,'type','key_action','playerId',p.id,'summary','Demo evidence event')),
       jsonb_build_object(p.id::text,jsonb_build_object('position',p.specific_position,'x',20 + (p.appearances % 55),'y',18 + (m.n * 14))),
       jsonb_build_object('coachRating', round((p.overall_rating/10.0)::numeric,1), 'confidence','demo'),
       true,
       p.pace,p.agility,p.strength,p.stamina,p.composure,p.shooting,p.passing,p.dribbling,p.defending,p.crossing,p.vision,p.positioning,p.heading,p.tackling,
       'Seeded demo match fact with realistic position, score and action context.'
from players p
cross join (values (1,'Riverside Rangers'),(2,'Southbank Athletic'),(3,'Eastfield Rovers')) m(n,opponent)
where p.email like 'demo.player%@scoutlink.app';

with numbered_players as (
  select p.*, row_number() over(order by p.player_id) rn from players p where p.email like 'demo.player%@scoutlink.app'
), numbered_scouts as (
  select s.*, row_number() over(order by s.email) sn from scouts s where s.email like 'demo.scout%@scoutlink.app'
)
insert into recruitment_pipeline(scout_id,player_id,scout_team_id,stage,notes,interest_level,is_active)
select s.id, p.id, s.scout_team_id,
       (array['watching','interested','shortlisted','contacted'])[((p.rn + s.sn) % 4) + 1],
       'Demo shortlist note: fits current scout setup and has enough match evidence for a conversation.',
       5 + ((p.rn + s.sn) % 5), true
from numbered_scouts s
join numbered_players p on ((p.rn - s.sn) % 8) = 0
where p.rn <= 45;

with first_pipeline as (
  select rp.*, row_number() over(partition by rp.scout_id order by rp.created_at, rp.id) rn
  from recruitment_pipeline rp
  join scouts s on s.id = rp.scout_id and s.email like 'demo.scout%@scoutlink.app'
), inserted_threads as (
  insert into chat_threads(scout_id,coach_id,player_id,pipeline_id,status,last_message_at,created_at,updated_at)
  select fp.scout_id, p.assigned_coach_id, fp.player_id, fp.id, 'open', now() - (fp.rn * interval '11 minutes'), now() - interval '2 hours', now() - (fp.rn * interval '11 minutes')
  from first_pipeline fp
  join players p on p.id = fp.player_id
  where fp.rn = 1
  returning id,scout_id,coach_id,player_id
)
insert into chat_messages(thread_id,sender_id,sender_type,body,is_read,created_at,message_kind,metadata)
select t.id, t.scout_id, 'Scout', 'I have added this player to our demo pipeline. Can you share any recent match context?', true, now() - interval '70 minutes', 'text', '{}'::jsonb from inserted_threads t
union all
select t.id, t.coach_id, 'Coach', 'Yes, the profile has three recent match facts and an upcoming fixture attached.', false, now() - interval '48 minutes', 'text', '{}'::jsonb from inserted_threads t
union all
select t.id, t.scout_id, 'Scout', 'Great. I will review the video evidence and position fit before the next checkpoint.', false, now() - interval '22 minutes', 'text', '{}'::jsonb from inserted_threads t;

-- Keep the Stratex org chart seed up to date.
update stratex
set first_name='Richdhin', last_name='Inaba', job_title='Founder', admin_role='Management', role='Management',
    permissions=array['management','admin_users','delete_users','permissions','acquisition','safeguarding','registrations','operations','product_demo','read_only'],
    manager_id=null, is_active=true, registration_complete=true, updated_at=now()
where lower(email)='richdhin@stratexanalytics.co.uk';

insert into stratex(stratex_id,first_name,last_name,email,role,is_active,registration_complete,job_title,admin_role,manager_id,permissions,annual_leave_days,contract_data,is_demo)
select 'STX-LUCY','Lucy','Ali','lucy.ali@stratexanalytics.co.uk','Operations',true,true,'Head of Operations and Client Success','Operations',
       (select id from stratex where lower(email)='richdhin@stratexanalytics.co.uk' limit 1),
       array['operations','registrations','support','showcase','product_demo','read_only'],25,'{}'::jsonb,false
where not exists(select 1 from stratex where lower(email)='lucy.ali@stratexanalytics.co.uk');

update stratex
set first_name='Lucy', last_name='Ali', job_title='Head of Operations and Client Success', admin_role='Operations', role='Operations',
    manager_id=(select id from stratex where lower(email)='richdhin@stratexanalytics.co.uk' limit 1),
    permissions=array['operations','registrations','support','showcase','product_demo','read_only'], is_active=true, updated_at=now()
where lower(email)='lucy.ali@stratexanalytics.co.uk';

insert into stratex(stratex_id,first_name,last_name,email,role,is_active,registration_complete,job_title,admin_role,manager_id,permissions,annual_leave_days,contract_data,is_demo)
select 'STX-RJ','RJ','Inaba','rodhinjunior.inaba@stratexanalytics.co.uk','Acquisition',true,true,'Head of Growth','Acquisition',
       (select id from stratex where lower(email)='richdhin@stratexanalytics.co.uk' limit 1),
       array['acquisition','registrations','product_demo','read_only'],25,'{}'::jsonb,false
where not exists(select 1 from stratex where lower(email)='rodhinjunior.inaba@stratexanalytics.co.uk');

update stratex
set first_name='RJ', last_name='Inaba', job_title='Head of Growth', admin_role='Acquisition', role='Acquisition',
    manager_id=(select id from stratex where lower(email)='richdhin@stratexanalytics.co.uk' limit 1),
    permissions=array['acquisition','registrations','product_demo','read_only'], is_active=true, updated_at=now()
where lower(email)='rodhinjunior.inaba@stratexanalytics.co.uk';

commit;
