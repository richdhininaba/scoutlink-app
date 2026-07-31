-- ============================================================
-- ScoutLink Database Schema V4.0
-- Run in Supabase SQL Editor: Project scoutlink
-- Player identity uses initials; generated avatar data is not stored.
-- Coach attribute inputs use whole integers from 1 to 10 in attribute_ratings.
-- Goalkeepers use goalkeeper attributes only. Outfield players use General plus
-- the complete primary position-group assessment.
-- ============================================================

-- ENUMS
DO $$ BEGIN CREATE TYPE account_type AS ENUM ('Player','Coach','Scout','Stratex'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE reg_status AS ENUM ('pending','approved','declined'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE notif_type AS ENUM ('scout_interest','match_fact','recruitment','system','chat_started','chat_message','fixture_attendance','admin_message','showcase_event'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE position_group AS ENUM ('Goalkeeper','Defender','Midfielder','Attacker'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE build_category AS ENUM ('very_slight','slight','lean','athletic','stocky','powerful','very_powerful'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE height_category AS ENUM ('very_short','short','average','tall','very_tall'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- School/Academy Teams
CREATE TABLE IF NOT EXISTS school_academy_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name TEXT NOT NULL, county TEXT, league TEXT, contact_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scout/Professional Teams
CREATE TABLE IF NOT EXISTS scout_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name TEXT NOT NULL, league TEXT,
  tier INTEGER DEFAULT 5, country TEXT DEFAULT 'England',
  formation TEXT, playing_style TEXT,
  scoring_setup JSONB NOT NULL DEFAULT '{}'::jsonb,
  scoring_setup_version TEXT NOT NULL DEFAULT 'v4.0.0',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Registration Requests
CREATE TABLE IF NOT EXISTS registration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_type account_type NOT NULL,
  first_name TEXT NOT NULL, last_name TEXT NOT NULL,
  email TEXT NOT NULL, phone TEXT,
  team_name TEXT, team_county TEXT, team_league TEXT, role_at_club TEXT,
  scout_club TEXT, scout_league TEXT, additional_info TEXT,
  data_policy_agreed BOOLEAN DEFAULT FALSE,
  data_policy_agreed_at TIMESTAMPTZ,
  status reg_status DEFAULT 'pending',
  decline_reason TEXT, reviewed_by TEXT, reviewed_at TIMESTAMPTZ,
  login_code TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Players
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id TEXT UNIQUE,
  first_name TEXT NOT NULL, last_name TEXT NOT NULL,
  email TEXT, phone TEXT,
  parent_email TEXT,
  date_of_birth DATE, age INTEGER,
  age_group TEXT,
  nationality TEXT DEFAULT 'England',
  nationality_code TEXT DEFAULT 'gb-eng',
  -- Position
  position_group position_group,
  specific_position TEXT,
  positions TEXT[],
  alternative_positions TEXT[] NOT NULL DEFAULT '{}'::text[],
  primary_position TEXT,
  foot TEXT DEFAULT 'Right',
  -- V4 position-aware Coach assessment
  attribute_ratings JSONB NOT NULL DEFAULT '{}'::jsonb,
  attribute_rating_scale TEXT NOT NULL DEFAULT 'ten',
  attribute_assessment_version TEXT,
  attribute_assessed_at TIMESTAMPTZ,
  attribute_assessed_by UUID,
  -- Physical (ranges)
  height_category height_category DEFAULT 'average',
  height_range_cm TEXT DEFAULT '170-175',
  height_min_cm NUMERIC(5,1), height_max_cm NUMERIC(5,1),
  build_category build_category DEFAULT 'athletic',
  weight_range_kg TEXT DEFAULT '70-75',
  weight_min_kg NUMERIC(5,1), weight_max_kg NUMERIC(5,1),
  -- Team
  team_id UUID REFERENCES school_academy_teams(id), team_name TEXT,
  -- Stats aggregates
  appearances INTEGER DEFAULT 0, goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0, clean_sheets INTEGER DEFAULT 0,
  yellow_cards INTEGER DEFAULT 0, red_cards INTEGER DEFAULT 0,
  -- Universal metrics (0-100)
  pace NUMERIC(5,2), agility NUMERIC(5,2), strength NUMERIC(5,2),
  stamina NUMERIC(5,2), jumping NUMERIC(5,2), composure NUMERIC(5,2),
  -- Outfield metrics
  shooting NUMERIC(5,2), passing NUMERIC(5,2), dribbling NUMERIC(5,2),
  defending NUMERIC(5,2), crossing NUMERIC(5,2), vision NUMERIC(5,2),
  positioning NUMERIC(5,2), heading NUMERIC(5,2), tackling NUMERIC(5,2),
  work_rate TEXT DEFAULT 'Medium/Medium',
  -- GK specific metrics
  gk_diving NUMERIC(5,2), gk_handling NUMERIC(5,2), gk_kicking NUMERIC(5,2),
  gk_reflexes NUMERIC(5,2), gk_positioning NUMERIC(5,2),
  gk_distribution NUMERIC(5,2), gk_communication NUMERIC(5,2),
  gk_sweeping NUMERIC(5,2),
  -- Calculated
  overall_rating NUMERIC(5,2), transfer_value NUMERIC(12,2),
  predicted_salary_weekly NUMERIC(10,2),
  evidence_confidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  overall_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  position_ratings JSONB NOT NULL DEFAULT '{}'::jsonb,
  prediction_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  value_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  scoring_input_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  scoring_result JSONB NOT NULL DEFAULT '{}'::jsonb,
  scoring_version TEXT NOT NULL DEFAULT 'v4.0.0',
  scored_at TIMESTAMPTZ,
  -- Videos
  video_urls TEXT[],
  -- Auth
  password_hash TEXT, login_code TEXT, login_code_expires TIMESTAMPTZ,
  last_login TIMESTAMPTZ, is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coaches
CREATE TABLE IF NOT EXISTS coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id TEXT UNIQUE,
  first_name TEXT NOT NULL, last_name TEXT NOT NULL,
  email TEXT UNIQUE, phone TEXT,
  team_id UUID REFERENCES school_academy_teams(id), team_name TEXT,
  role_at_club TEXT DEFAULT 'Head Coach',
  data_policy_agreed BOOLEAN DEFAULT FALSE,
  password_hash TEXT, login_code TEXT, login_code_expires TIMESTAMPTZ,
  last_login TIMESTAMPTZ, is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scouts
CREATE TABLE IF NOT EXISTS scouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scout_id TEXT UNIQUE,
  first_name TEXT NOT NULL, last_name TEXT NOT NULL,
  email TEXT UNIQUE, phone TEXT,
  club_name TEXT, club_league TEXT,
  scout_team_id UUID REFERENCES scout_teams(id),
  -- Scout preferences (set on first login)
  scout_preferences JSONB,
  preferences_set BOOLEAN DEFAULT FALSE,
  password_hash TEXT, login_code TEXT, login_code_expires TIMESTAMPTZ,
  last_login TIMESTAMPTZ, is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stratex Admins
CREATE TABLE IF NOT EXISTS stratex (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stratex_id TEXT UNIQUE,
  first_name TEXT NOT NULL, last_name TEXT NOT NULL,
  email TEXT UNIQUE, password_hash TEXT,
  role TEXT DEFAULT 'admin', is_active BOOLEAN DEFAULT TRUE,
  login_code TEXT, login_code_expires TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  registration_complete BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Match Facts
CREATE TABLE IF NOT EXISTS match_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  match_date DATE, opponent TEXT, result TEXT,
  minutes_played INTEGER DEFAULT 0,
  goals INTEGER DEFAULT 0, assists INTEGER DEFAULT 0,
  shots INTEGER DEFAULT 0, shots_on_target INTEGER DEFAULT 0,
  passes INTEGER DEFAULT 0, pass_accuracy NUMERIC(5,2),
  dribbles INTEGER DEFAULT 0, tackles INTEGER DEFAULT 0,
  interceptions INTEGER DEFAULT 0, fouls INTEGER DEFAULT 0,
  yellow_cards INTEGER DEFAULT 0, red_cards INTEGER DEFAULT 0,
  -- GK specific
  saves INTEGER DEFAULT 0, goals_conceded INTEGER DEFAULT 0,
  clean_sheet BOOLEAN DEFAULT FALSE, high_claims INTEGER DEFAULT 0,
  punches INTEGER DEFAULT 0,
  performance_score NUMERIC(5,2),
  position_played TEXT,
  side_played TEXT,
  role_played TEXT,
  match_format TEXT,
  formation_played TEXT,
  competition_level TEXT,
  opposition_level TEXT,
  source_type TEXT,
  evidence_source TEXT,
  rubric_version TEXT,
  assessment_version TEXT,
  rating_scale TEXT NOT NULL DEFAULT 'ten',
  attribute_ratings JSONB NOT NULL DEFAULT '{}'::jsonb,
  role_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  benchmark_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  scoring_version TEXT NOT NULL DEFAULT 'v4.0.0',
  created_by UUID, created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compatibility Scores
CREATE TABLE IF NOT EXISTS compatibility_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  scout_team_id UUID REFERENCES scout_teams(id) ON DELETE CASCADE,
  compatibility_score NUMERIC(5,2), transfer_value NUMERIC(12,2),
  prediction_score NUMERIC(5,2), breakdown JSONB,
  conservative_score NUMERIC(5,2),
  estimated_score NUMERIC(5,2),
  likely_range JSONB NOT NULL DEFAULT '{}'::jsonb,
  position_status TEXT,
  score_ceiling NUMERIC(5,2),
  evidence_confidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculation_setup JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculation_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  input_fingerprint TEXT,
  scoring_version TEXT NOT NULL DEFAULT 'v4.0.0',
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, scout_team_id)
);

-- Recruitment Pipeline
CREATE TABLE IF NOT EXISTS recruitment_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scout_id UUID REFERENCES scouts(id),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  scout_team_id UUID REFERENCES scout_teams(id),
  stage TEXT DEFAULT 'watching', notes TEXT,
  interest_level INTEGER DEFAULT 5 CHECK (interest_level BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scout_id, player_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL, recipient_type account_type NOT NULL,
  notification_type notif_type DEFAULT 'system',
  title TEXT NOT NULL, body TEXT NOT NULL, data JSONB,
  is_read BOOLEAN DEFAULT FALSE, email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ, email_error_safe TEXT, sendgrid_template_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bulk Player Import Sessions
CREATE TABLE IF NOT EXISTS bulk_import_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL, created_by_type account_type NOT NULL,
  team_name TEXT, total_players INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Video Content
CREATE TABLE IF NOT EXISTS player_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  title TEXT, url TEXT, video_type TEXT DEFAULT 'highlight',
  uploaded_by UUID, uploaded_by_type account_type,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- V4 canonical position and input checks.
ALTER TABLE players
  ADD CONSTRAINT players_v4_primary_position_check
  CHECK (primary_position IS NULL OR primary_position IN (
    'GK','RB','CB','LB','RWB','LWB','DM','CM','AM','RM','LM','RW','LW','CF','ST'
  ));

ALTER TABLE players
  ADD CONSTRAINT players_v4_specific_position_check
  CHECK (specific_position IS NULL OR specific_position IN (
    'GK','RB','CB','LB','RWB','LWB','DM','CM','AM','RM','LM','RW','LW','CF','ST'
  ));

ALTER TABLE players
  ADD CONSTRAINT players_v4_rating_scale_check
  CHECK (attribute_rating_scale = 'ten');

ALTER TABLE match_facts
  ADD CONSTRAINT match_facts_v4_position_check
  CHECK (position_played IS NULL OR position_played IN (
    'GK','RB','CB','LB','RWB','LWB','DM','CM','AM','RM','LM','RW','LW','CF','ST'
  ));

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_players_position ON players(position_group);
CREATE INDEX IF NOT EXISTS idx_match_facts_player ON match_facts(player_id);
CREATE INDEX IF NOT EXISTS idx_compatibility_player ON compatibility_scores(player_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_scout ON recruitment_pipeline(scout_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_player ON recruitment_pipeline(player_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_reg_requests_status ON registration_requests(status);

-- UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_players ON players; CREATE TRIGGER trg_players BEFORE UPDATE ON players FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_coaches ON coaches; CREATE TRIGGER trg_coaches BEFORE UPDATE ON coaches FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_scouts ON scouts; CREATE TRIGGER trg_scouts BEFORE UPDATE ON scouts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_stratex ON stratex; CREATE TRIGGER trg_stratex BEFORE UPDATE ON stratex FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_pipeline ON recruitment_pipeline; CREATE TRIGGER trg_pipeline BEFORE UPDATE ON recruitment_pipeline FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- SEED: Stratex admins (update password_hash after running seed.js)
-- INSERT INTO stratex (stratex_id,first_name,last_name,email,role) VALUES
-- ('STX-001','Rich','Dhin','richdhin@stratexanalytics.co.uk','admin'),
-- ('STX-002','Lucy','Ali','lucy.ali@stratexanalytics.co.uk','admin');
