-- ScoutLink v3.4 player video storage policies
-- The API currently uses the configured Supabase anon client for storage calls.
-- Keep access scoped to the public player-videos bucket used by the protected API route.

DROP POLICY IF EXISTS player_videos_bucket_select ON storage.objects;
DROP POLICY IF EXISTS player_videos_bucket_insert ON storage.objects;
DROP POLICY IF EXISTS player_videos_bucket_delete ON storage.objects;

CREATE POLICY player_videos_bucket_select
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'player-videos');

CREATE POLICY player_videos_bucket_insert
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'player-videos');

CREATE POLICY player_videos_bucket_delete
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (bucket_id = 'player-videos');

