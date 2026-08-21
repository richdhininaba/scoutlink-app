BEGIN;

ALTER TABLE public.usage_requests
  ALTER COLUMN reason DROP NOT NULL;

COMMIT;
