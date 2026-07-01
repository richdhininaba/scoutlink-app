-- ============================================================
-- ScoutLink Migration: Add missing columns
-- Run in Supabase SQL Editor
-- ============================================================

-- Add subscription columns to scouts table
ALTER TABLE scouts ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'Core';
ALTER TABLE scouts ADD COLUMN IF NOT EXISTS plan_start TIMESTAMPTZ;
ALTER TABLE scouts ADD COLUMN IF NOT EXISTS plan_end TIMESTAMPTZ;
ALTER TABLE scouts ADD COLUMN IF NOT EXISTS exports_remaining INTEGER DEFAULT 30;
ALTER TABLE scouts ADD COLUMN IF NOT EXISTS predictions_remaining INTEGER DEFAULT 120;
ALTER TABLE scouts ADD COLUMN IF NOT EXISTS interests_remaining INTEGER DEFAULT 200;

-- Add team_county and team_league to coaches if missing
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS team_county TEXT;
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS team_league TEXT;

-- Ensure registration_requests has all needed columns
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS login_code TEXT;

-- Add video_url column to player_videos if only url exists
ALTER TABLE player_videos ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE player_videos ADD COLUMN IF NOT EXISTS description TEXT;

-- Update existing player_videos to copy url to video_url
UPDATE player_videos SET video_url = url WHERE video_url IS NULL AND url IS NOT NULL;

-- Enable RLS on all tables (service role bypasses these)
ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE stratex ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruitment_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_import_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to recreate clean)
DROP POLICY IF EXISTS "service_role_all" ON registration_requests;
DROP POLICY IF EXISTS "service_role_all" ON scouts;
DROP POLICY IF EXISTS "service_role_all" ON coaches;
DROP POLICY IF EXISTS "service_role_all" ON players;
DROP POLICY IF EXISTS "service_role_all" ON stratex;
DROP POLICY IF EXISTS "service_role_all" ON notifications;
DROP POLICY IF EXISTS "service_role_all" ON match_facts;
DROP POLICY IF EXISTS "service_role_all" ON recruitment_pipeline;
DROP POLICY IF EXISTS "service_role_all" ON player_videos;
DROP POLICY IF EXISTS "service_role_all" ON bulk_import_sessions;

-- Allow service role (backend API) full access to all tables
CREATE POLICY "service_role_all" ON registration_requests TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON scouts TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON coaches TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON players TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON stratex TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON notifications TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON match_facts TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON recruitment_pipeline TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON player_videos TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON bulk_import_sessions TO service_role USING (true) WITH CHECK (true);

-- Allow anon/authenticated to read stratex table (needed for user lookup during auth)
DROP POLICY IF EXISTS "anon_read_stratex" ON stratex;
CREATE POLICY "anon_read_stratex" ON stratex FOR SELECT TO anon, authenticated USING (true);

-- Allow anon/authenticated to read scouts, coaches, players for auth lookup
DROP POLICY IF EXISTS "anon_read_scouts" ON scouts;
CREATE POLICY "anon_read_scouts" ON scouts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_read_coaches" ON coaches;
CREATE POLICY "anon_read_coaches" ON coaches FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_read_players" ON players;
CREATE POLICY "anon_read_players" ON players FOR SELECT TO anon, authenticated USING (true);
