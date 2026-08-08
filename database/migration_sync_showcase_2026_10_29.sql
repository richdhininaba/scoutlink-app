BEGIN;

DO $$
DECLARE
  linked_showcase_id public.showcase_events.id%TYPE;
BEGIN
  SELECT source_showcase_event_id
  INTO linked_showcase_id
  FROM public.showcase_registration_events
  WHERE event_key = 'bluewater-2026-09-12'
  LIMIT 1;

  UPDATE public.showcase_registration_events
  SET
    event_date = DATE '2026-10-29',
    player_arrival_time = TIME '11:00:00',
    professional_arrival_time = TIME '11:00:00',
    updated_at = now()
  WHERE event_key = 'bluewater-2026-09-12';

  IF linked_showcase_id IS NOT NULL THEN
    UPDATE public.showcase_events
    SET
      event_date = DATE '2026-10-29',
      player_arrival_time = TIME '11:00:00',
      professional_arrival_time = TIME '11:00:00',
      updated_at = now()
    WHERE id = linked_showcase_id;
  ELSE
    UPDATE public.showcase_events
    SET
      event_date = DATE '2026-10-29',
      player_arrival_time = TIME '11:00:00',
      professional_arrival_time = TIME '11:00:00',
      updated_at = now()
    WHERE featured = true
      AND public_visible = true
      AND event_date = DATE '2026-09-12';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.showcase_registration_events
    WHERE event_key = 'bluewater-2026-09-12'
      AND event_date = DATE '2026-10-29'
      AND player_arrival_time = TIME '11:00:00'
      AND professional_arrival_time = TIME '11:00:00'
  ) THEN
    RAISE EXCEPTION 'The active Showcase registration configuration was not updated.';
  END IF;

  IF linked_showcase_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.showcase_events
    WHERE id = linked_showcase_id
      AND event_date = DATE '2026-10-29'
      AND player_arrival_time = TIME '11:00:00'
      AND professional_arrival_time = TIME '11:00:00'
  ) THEN
    RAISE EXCEPTION 'The public Showcase event record was not updated.';
  END IF;
END
$$;

COMMIT;
