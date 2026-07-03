-- ScoutLink v3.27 - private youth player video storage

update storage.buckets
set public = false
where id = 'player-videos';

drop policy if exists player_videos_bucket_select on storage.objects;
drop policy if exists player_videos_bucket_insert on storage.objects;
drop policy if exists player_videos_bucket_delete on storage.objects;

drop policy if exists service_role_all_player_videos_storage on storage.objects;
create policy service_role_all_player_videos_storage
on storage.objects
to service_role
using (bucket_id = 'player-videos')
with check (bucket_id = 'player-videos');

notify pgrst, 'reload schema';
