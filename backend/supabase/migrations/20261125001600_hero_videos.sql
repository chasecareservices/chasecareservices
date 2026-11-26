-- =============================================================================
-- Hero videos: the homepage slider can show short looping videos as well as
-- photos. Staff upload them straight from the browser to the public-media
-- bucket (storage rules still require media.create).
-- 50 MiB is the largest single upload on Supabase's free plan.
-- =============================================================================

update storage.buckets
set file_size_limit = 52428800,  -- 50 MiB
    allowed_mime_types = array(
      select distinct unnest(allowed_mime_types || array['video/mp4', 'video/webm'])
      order by 1
    )
where id = 'public-media';
