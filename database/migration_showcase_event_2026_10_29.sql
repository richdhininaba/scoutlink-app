BEGIN;

DO $$
BEGIN
  UPDATE public.showcase_registration_events
  SET
    event_date = DATE '2026-10-29',
    player_arrival_time = TIME '11:00:00',
    professional_arrival_time = TIME '11:00:00',
    updated_at = now()
  WHERE event_key = 'bluewater-2026-09-12';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expected showcase event bluewater-2026-09-12 was not found.';
  END IF;
END
$$;

COMMIT;
