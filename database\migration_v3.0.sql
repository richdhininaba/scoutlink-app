-- ============================================================
-- ScoutLink Migration v3.0
-- Changes: New tables for awards, showcase events, plus age group expansion U6-U16
-- Run in Supabase SQL Editor: Project scoutlink (fwxnggklfsgrydcoeiuh)
-- ============================================================

-- Award Nominations
CREATE TABLE IF NOT EXISTS award_nominations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  award_name TEXT NOT NULL,
  nominated_by TEXT NOT NULL,
  nominated_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending',
  notification_sent BOOLEAN DEFAULT FALSE
);

-- Award Nomination Responses (scout accept/decline)
CREATE TABLE IF NOT EXISTS award_nomination_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomination_id UUID REFERENCES award_nominations(id) ON DELETE CASCADE,
  scout_id UUID REFERENCES scouts(id) ON DELETE CASCADE,
  response TEXT CHECK (response IN ('accepted','declined')),
  responded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(nomination_id, scout_id)
);

-- Showcase Events
CREATE TABLE IF NOT EXISTS showcase_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  event_date TIMESTAMPTZ,
  venue_name TEXT,
  venue_address TEXT,
  description TEXT,
  max_scouts INTEGER DEFAULT 20,
  status TEXT DEFAULT 'draft',
  confirmed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Showcase Players (players added to an event)
CREATE TABLE IF NOT EXISTS showcase_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES showcase_events(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  coach_notified BOOLEAN DEFAULT FALSE,
  parent_notified BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'invited',
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, player_id)
);

-- Showcase Responses (scout accept/decline for player notification)
CREATE TABLE IF NOT EXISTS showcase_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES showcase_events(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  scout_id UUID REFERENCES scouts(id) ON DELETE CASCADE,
  response TEXT CHECK (response IN ('accepted','declined')),
  responded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, player_id, scout_id)
);

-- Showcase Attendance (scout attendance at event)
CREATE TABLE IF NOT EXISTS showcase_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES showcase_events(id) ON DELETE CASCADE,
  scout_id UUID REFERENCES scouts(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled','waitlisted')),
  confirmed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, scout_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_award_nominations_player ON award_nominations(player_id);
CREATE INDEX IF NOT EXISTS idx_showcase_players_event ON showcase_players(event_id);
CREATE INDEX IF NOT EXISTS idx_showcase_attendance_event ON showcase_attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_showcase_attendance_scout ON showcase_attendance(scout_id);

-- Enable RLS on all new tables (policies managed per role in Supabase dashboard)
ALTER TABLE award_nominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE award_nomination_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE showcase_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE showcase_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE showcase_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE showcase_attendance ENABLE ROW LEVEL SECURITY;

-- Update fake player to Northgate
UPDATE players SET team_name = 'Northgate', team_id = 'aaaaaaaa-0000-0000-0000-000000000001' 
WHERE id = '877a7d1f-305a-48d3-aace-1fa0dab68bd0';

-- NOTE: Age groups U6-U16 are now the platform standard.
-- Players use age_group field values: U6, U7, U8, U9, U10, U11, U12, U13, U14, U15, U16