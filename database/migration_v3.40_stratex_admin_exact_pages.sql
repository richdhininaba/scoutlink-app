-- Stratex Admin All Pages Exact V4
-- Adds Learning Centre design-board metadata and persistent award ceremonies.

BEGIN;

ALTER TABLE public.stratex_learning_posts
  ADD COLUMN IF NOT EXISTS featured_image_url text,
  ADD COLUMN IF NOT EXISTS image_alt text,
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS canonical_url text,
  ADD COLUMN IF NOT EXISTS index_when_published boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.award_ceremonies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  event_date timestamptz,
  location text,
  status text NOT NULL DEFAULT 'planning',
  categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  audience jsonb NOT NULL DEFAULT '[]'::jsonb,
  description text,
  created_by uuid REFERENCES public.stratex(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT award_ceremonies_status_check
    CHECK (status IN ('planning','published','completed','cancelled'))
);

CREATE INDEX IF NOT EXISTS award_ceremonies_event_date_idx
  ON public.award_ceremonies(event_date);

CREATE INDEX IF NOT EXISTS award_ceremonies_status_idx
  ON public.award_ceremonies(status);

ALTER TABLE public.award_ceremonies ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.award_ceremonies FROM anon;
REVOKE ALL ON public.award_ceremonies FROM authenticated;

COMMIT;
