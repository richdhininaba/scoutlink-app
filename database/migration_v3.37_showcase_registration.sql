BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.showcase_registration_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  event_name text NOT NULL,
  event_date date NOT NULL,
  player_arrival_time time NOT NULL,
  professional_arrival_time time NOT NULL,
  venue_name text NOT NULL,
  venue_address text NOT NULL,
  player_min_age integer NOT NULL DEFAULT 12 CHECK (player_min_age >= 0),
  player_max_age integer NOT NULL DEFAULT 16 CHECK (player_max_age >= player_min_age),
  professional_capacity integer NOT NULL DEFAULT 30 CHECK (professional_capacity > 0),
  player_registration_open boolean NOT NULL DEFAULT true,
  professional_registration_open boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.showcase_registration_events (
  event_key,
  event_name,
  event_date,
  player_arrival_time,
  professional_arrival_time,
  venue_name,
  venue_address,
  player_min_age,
  player_max_age,
  professional_capacity,
  player_registration_open,
  professional_registration_open
)
SELECT
  'bluewater-2026-09-12',
  'ScoutLink Showcase Event',
  DATE '2026-09-12',
  TIME '12:00:00',
  TIME '12:30:00',
  'Ballerz Air Dome, Bluewater',
  'Ballerz Air Dome, Bluewater Event Space, Upper Blue Car Park, Upper Plaza, Bluewater, Greenhithe, Kent, DA9 9RL',
  12,
  16,
  30,
  true,
  true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.showcase_registration_events
  WHERE event_key = 'bluewater-2026-09-12'
);

CREATE TABLE IF NOT EXISTS public.showcase_professional_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.showcase_registration_events(id) ON DELETE CASCADE,
  registration_reference text NOT NULL UNIQUE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  team_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('coach', 'scout', 'both')),
  attendance_confirmed boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'contacted', 'confirmed', 'cancelled', 'declined')),
  internal_notes text,
  contacted_at timestamptz,
  confirmed_at timestamptz,
  confirmation_email_sent boolean NOT NULL DEFAULT false,
  internal_alert_sent boolean NOT NULL DEFAULT false,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, email)
);

CREATE TABLE IF NOT EXISTS public.showcase_professional_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.showcase_registration_events(id) ON DELETE CASCADE,
  registration_reference text NOT NULL UNIQUE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  team_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('coach', 'scout', 'both')),
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'contacted', 'promoted', 'closed')),
  internal_notes text,
  contacted_at timestamptz,
  confirmation_email_sent boolean NOT NULL DEFAULT false,
  internal_alert_sent boolean NOT NULL DEFAULT false,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, email)
);

CREATE TABLE IF NOT EXISTS public.showcase_player_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.showcase_registration_events(id) ON DELETE CASCADE,
  registration_reference text NOT NULL UNIQUE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date NOT NULL,
  age_on_event_date integer NOT NULL CHECK (age_on_event_date BETWEEN 12 AND 16),
  contact_type text NOT NULL CHECK (contact_type IN ('guardian', 'player')),
  player_email text,
  player_phone text,
  guardian_email text,
  guardian_phone text,
  currently_plays_for_team boolean NOT NULL DEFAULT false,
  team_type text CHECK (team_type IS NULL OR team_type IN ('professional', 'non_professional')),
  team_name text,
  coach_name text,
  positions text[] NOT NULL DEFAULT '{}',
  can_play_goalkeeper boolean NOT NULL DEFAULT false,
  preferred_foot text NOT NULL CHECK (preferred_foot IN ('left', 'right', 'both')),
  highlight_storage_path text,
  highlight_file_name text,
  highlight_mime_type text,
  highlight_size_bytes bigint,
  travel_confirmed boolean NOT NULL DEFAULT false,
  guardian_aware boolean,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'selected', 'not_selected', 'withdrawn')),
  selected_for_showcase boolean NOT NULL DEFAULT false,
  assigned_event_coach_id uuid REFERENCES public.showcase_professional_registrations(id) ON DELETE SET NULL,
  internal_notes text,
  contacted_at timestamptz,
  selected_at timestamptz,
  confirmation_email_sent boolean NOT NULL DEFAULT false,
  internal_alert_sent boolean NOT NULL DEFAULT false,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT showcase_player_positions_max_three CHECK (cardinality(positions) BETWEEN 1 AND 3),
  CONSTRAINT showcase_player_contact_branch CHECK (
    (
      age_on_event_date BETWEEN 12 AND 14
      AND contact_type = 'guardian'
      AND guardian_email IS NOT NULL
      AND guardian_phone IS NOT NULL
      AND guardian_aware = true
    )
    OR
    (
      age_on_event_date BETWEEN 15 AND 16
      AND contact_type = 'player'
      AND player_email IS NOT NULL
      AND player_phone IS NOT NULL
    )
  ),
  CONSTRAINT showcase_player_team_details CHECK (
    currently_plays_for_team = false
    OR (
      team_type IS NOT NULL
      AND team_name IS NOT NULL
      AND coach_name IS NOT NULL
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS showcase_player_event_identity_unique_idx
  ON public.showcase_player_registrations(
    event_id,
    lower(first_name),
    lower(last_name),
    date_of_birth
  );

CREATE INDEX IF NOT EXISTS showcase_player_event_status_idx
  ON public.showcase_player_registrations(event_id, status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS showcase_professional_event_status_idx
  ON public.showcase_professional_registrations(event_id, status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS showcase_waitlist_event_status_idx
  ON public.showcase_professional_waitlist(event_id, status, submitted_at DESC);

CREATE OR REPLACE FUNCTION public.set_showcase_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS showcase_registration_events_updated_at ON public.showcase_registration_events;
CREATE TRIGGER showcase_registration_events_updated_at
BEFORE UPDATE ON public.showcase_registration_events
FOR EACH ROW EXECUTE FUNCTION public.set_showcase_updated_at();

DROP TRIGGER IF EXISTS showcase_player_registrations_updated_at ON public.showcase_player_registrations;
CREATE TRIGGER showcase_player_registrations_updated_at
BEFORE UPDATE ON public.showcase_player_registrations
FOR EACH ROW EXECUTE FUNCTION public.set_showcase_updated_at();

DROP TRIGGER IF EXISTS showcase_professional_registrations_updated_at ON public.showcase_professional_registrations;
CREATE TRIGGER showcase_professional_registrations_updated_at
BEFORE UPDATE ON public.showcase_professional_registrations
FOR EACH ROW EXECUTE FUNCTION public.set_showcase_updated_at();

DROP TRIGGER IF EXISTS showcase_professional_waitlist_updated_at ON public.showcase_professional_waitlist;
CREATE TRIGGER showcase_professional_waitlist_updated_at
BEFORE UPDATE ON public.showcase_professional_waitlist
FOR EACH ROW EXECUTE FUNCTION public.set_showcase_updated_at();

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
SET search_path = public
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
    WHERE event_id = v_event.id AND lower(email) = v_email
  ) OR EXISTS (
    SELECT 1
    FROM public.showcase_professional_waitlist
    WHERE event_id = v_event.id AND lower(email) = v_email
  ) THEN
    RAISE EXCEPTION 'This email is already registered for the showcase';
  END IF;

  SELECT count(*)
  INTO v_count
  FROM public.showcase_professional_registrations
  WHERE event_id = v_event.id
    AND status NOT IN ('cancelled', 'declined');

  v_reference := 'SC-' || upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 10));

  IF v_event.professional_registration_open = false OR v_count >= v_event.professional_capacity THEN
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

REVOKE ALL ON FUNCTION public.register_showcase_professional(text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_showcase_professional(text, text, text, text, text, text, text) TO service_role;

ALTER TABLE public.showcase_registration_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showcase_player_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showcase_professional_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showcase_professional_waitlist ENABLE ROW LEVEL SECURITY;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'showcase-player-highlights',
  'showcase-player-highlights',
  false,
  104857600,
  ARRAY['video/mp4', 'video/quicktime', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

COMMIT;
