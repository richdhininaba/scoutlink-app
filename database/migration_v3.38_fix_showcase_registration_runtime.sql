BEGIN;

-- The pgcrypto extension is installed in Supabase's extensions schema.
-- The original function restricted its search path to public, so
-- gen_random_bytes() could not be resolved in production.
CREATE OR REPLACE FUNCTION public.register_showcase_professional(
  p_event_key text,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_team_name text,
  p_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_event public.showcase_registration_events%ROWTYPE;
  v_count integer;
  v_reference text;
  v_id uuid;
  v_email text := lower(trim(p_email));
BEGIN
  SELECT *
  INTO v_event
  FROM public.showcase_registration_events
  WHERE event_key = p_event_key
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Showcase event not found';
  END IF;

  IF p_role NOT IN ('coach', 'scout', 'both') THEN
    RAISE EXCEPTION 'Invalid professional role';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.showcase_professional_registrations
    WHERE event_id = v_event.id
      AND lower(email) = v_email
  ) OR EXISTS (
    SELECT 1
    FROM public.showcase_professional_waitlist
    WHERE event_id = v_event.id
      AND lower(email) = v_email
  ) THEN
    RAISE EXCEPTION 'This email is already registered for the showcase';
  END IF;

  SELECT count(*)
  INTO v_count
  FROM public.showcase_professional_registrations
  WHERE event_id = v_event.id
    AND status NOT IN ('cancelled', 'declined');

  v_reference := 'SC-' || upper(
    substr(
      encode(extensions.gen_random_bytes(8), 'hex'),
      1,
      10
    )
  );

  IF v_event.professional_registration_open = false
     OR v_count >= v_event.professional_capacity THEN
    INSERT INTO public.showcase_professional_waitlist (
      event_id,
      registration_reference,
      first_name,
      last_name,
      email,
      phone,
      team_name,
      role
    ) VALUES (
      v_event.id,
      v_reference,
      trim(p_first_name),
      trim(p_last_name),
      v_email,
      trim(p_phone),
      trim(p_team_name),
      p_role
    )
    RETURNING id INTO v_id;

    RETURN jsonb_build_object(
      'status', 'waitlisted',
      'id', v_id,
      'registrationReference', v_reference,
      'confirmedCount', v_count,
      'capacity', v_event.professional_capacity
    );
  END IF;

  INSERT INTO public.showcase_professional_registrations (
    event_id,
    registration_reference,
    first_name,
    last_name,
    email,
    phone,
    team_name,
    role,
    attendance_confirmed,
    status
  ) VALUES (
    v_event.id,
    v_reference,
    trim(p_first_name),
    trim(p_last_name),
    v_email,
    trim(p_phone),
    trim(p_team_name),
    p_role,
    true,
    'registered'
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'status', 'registered',
    'id', v_id,
    'registrationReference', v_reference,
    'confirmedCount', v_count + 1,
    'capacity', v_event.professional_capacity
  );
END;
$$;

REVOKE ALL ON FUNCTION public.register_showcase_professional(
  text,
  text,
  text,
  text,
  text,
  text,
  text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_showcase_professional(
  text,
  text,
  text,
  text,
  text,
  text,
  text
) TO service_role;

-- A private highlight video is uploaded directly from the browser after
-- the small registration payload has been accepted. This avoids sending
-- a file of up to 100 MB through the Vercel function request body.
CREATE OR REPLACE FUNCTION public.is_valid_showcase_player_upload_folder(
  p_folder text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_folder ~ '^pl-[0-9a-f]{12}$'
    AND EXISTS (
      SELECT 1
      FROM public.showcase_player_registrations
      WHERE lower(registration_reference) = p_folder
    );
$$;

REVOKE ALL ON FUNCTION public.is_valid_showcase_player_upload_folder(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_valid_showcase_player_upload_folder(text)
TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Showcase player highlight uploads" ON storage.objects;
CREATE POLICY "Showcase player highlight uploads"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'showcase-player-highlights'
  AND array_length(storage.foldername(name), 1) >= 1
  AND public.is_valid_showcase_player_upload_folder(
    (storage.foldername(name))[1]
  )
);

CREATE OR REPLACE FUNCTION public.attach_showcase_player_highlight(
  p_registration_reference text,
  p_storage_path text,
  p_file_name text,
  p_mime_type text,
  p_size_bytes bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reference text := upper(trim(p_registration_reference));
  v_expected_folder text := lower(v_reference);
  v_registration_id uuid;
  v_storage_path text := trim(p_storage_path);
  v_mime_type text := lower(trim(p_mime_type));
BEGIN
  IF v_reference !~ '^PL-[0-9A-F]{12}$' THEN
    RAISE EXCEPTION 'Invalid showcase player registration reference';
  END IF;

  IF v_storage_path IS NULL
     OR v_storage_path = ''
     OR v_storage_path LIKE '%..%'
     OR split_part(v_storage_path, '/', 1) <> v_expected_folder THEN
    RAISE EXCEPTION 'Invalid showcase highlight storage path';
  END IF;

  IF v_mime_type NOT IN (
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ) THEN
    RAISE EXCEPTION 'Unsupported showcase highlight file type';
  END IF;

  IF p_size_bytes IS NULL
     OR p_size_bytes < 1
     OR p_size_bytes > 104857600 THEN
    RAISE EXCEPTION 'Showcase highlight must be 100 MB or smaller';
  END IF;

  UPDATE public.showcase_player_registrations
  SET
    highlight_storage_path = v_storage_path,
    highlight_file_name = left(trim(p_file_name), 260),
    highlight_mime_type = left(v_mime_type, 120),
    highlight_size_bytes = p_size_bytes,
    updated_at = now()
  WHERE registration_reference = v_reference
  RETURNING id INTO v_registration_id;

  IF v_registration_id IS NULL THEN
    RAISE EXCEPTION 'Showcase player registration not found';
  END IF;

  RETURN jsonb_build_object(
    'status', 'attached',
    'registrationId', v_registration_id,
    'registrationReference', v_reference,
    'storagePath', v_storage_path
  );
END;
$$;

REVOKE ALL ON FUNCTION public.attach_showcase_player_highlight(
  text,
  text,
  text,
  text,
  bigint
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attach_showcase_player_highlight(
  text,
  text,
  text,
  text,
  bigint
) TO anon, authenticated, service_role;

COMMIT;
