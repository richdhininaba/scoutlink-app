BEGIN;

-- Increase the private showcase highlight bucket from 100 MB to 500 MB.
-- Supabase Storage Settings must also have a Global file size limit of
-- at least 500 MB, because the global limit takes precedence over this
-- bucket-level limit.
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'showcase-player-highlights',
  'showcase-player-highlights',
  false,
  524288000,
  ARRAY['video/mp4', 'video/quicktime', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Keep the existing attachment RPC, but permit an uploaded file of up
-- to 500 MB after the resumable Storage upload completes.
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
     OR p_size_bytes > 524288000 THEN
    RAISE EXCEPTION 'Showcase highlight must be 500 MB or smaller';
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

-- Direct visitors to the sold-out page are not required to know their
-- exact role yet. Keep the value explicit rather than pretending that
-- they selected Coach, Scout or Both.
ALTER TABLE public.showcase_professional_waitlist
  DROP CONSTRAINT IF EXISTS showcase_professional_waitlist_role_check;

ALTER TABLE public.showcase_professional_waitlist
  ADD CONSTRAINT showcase_professional_waitlist_role_check
  CHECK (role IN ('coach', 'scout', 'both', 'unspecified'));

-- Save the four-field sold-out contact form directly into the existing
-- professional waitlist so it appears in the current Stratex showcase
-- administration workspace.
CREATE OR REPLACE FUNCTION public.register_showcase_sold_out_interest(
  p_event_key text,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_event public.showcase_registration_events%ROWTYPE;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_first_name text := trim(coalesce(p_first_name, ''));
  v_last_name text := trim(coalesce(p_last_name, ''));
  v_phone text := trim(coalesce(p_phone, ''));
  v_reference text;
  v_id uuid;
BEGIN
  IF v_first_name = '' OR v_last_name = '' THEN
    RAISE EXCEPTION 'Enter the first name and last name';
  END IF;

  IF v_email = ''
     OR v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Enter a valid email address';
  END IF;

  IF v_phone = '' THEN
    RAISE EXCEPTION 'Enter a phone number';
  END IF;

  SELECT *
  INTO v_event
  FROM public.showcase_registration_events
  WHERE event_key = trim(p_event_key);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Showcase event not found';
  END IF;

  SELECT id, registration_reference
  INTO v_id, v_reference
  FROM public.showcase_professional_waitlist
  WHERE event_id = v_event.id
    AND lower(email) = v_email
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    UPDATE public.showcase_professional_waitlist
    SET
      first_name = left(v_first_name, 100),
      last_name = left(v_last_name, 100),
      phone = left(v_phone, 50),
      team_name = 'Not provided on sold-out page',
      role = 'unspecified',
      internal_notes = 'Submitted through the public sold-out page. Contact this person to arrange a way to see more ScoutLink showcase events.',
      updated_at = now()
    WHERE id = v_id;

    RETURN jsonb_build_object(
      'status', 'waitlisted',
      'id', v_id,
      'registrationReference', v_reference,
      'alreadySaved', true
    );
  END IF;

  v_reference :=
    'WL-' || upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 10));

  INSERT INTO public.showcase_professional_waitlist (
    event_id,
    registration_reference,
    first_name,
    last_name,
    email,
    phone,
    team_name,
    role,
    status,
    internal_notes
  )
  VALUES (
    v_event.id,
    v_reference,
    left(v_first_name, 100),
    left(v_last_name, 100),
    v_email,
    left(v_phone, 50),
    'Not provided on sold-out page',
    'unspecified',
    'waiting',
    'Submitted through the public sold-out page. Contact this person to arrange a way to see more ScoutLink showcase events.'
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'status', 'waitlisted',
    'id', v_id,
    'registrationReference', v_reference,
    'alreadySaved', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.register_showcase_sold_out_interest(
  text,
  text,
  text,
  text,
  text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.register_showcase_sold_out_interest(
  text,
  text,
  text,
  text,
  text
) TO anon, authenticated, service_role;

COMMIT;
