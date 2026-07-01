-- ScoutLink scoring engine v3 persisted analysis fields.
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS overall_breakdown jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS position_ratings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS value_analysis jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS scoring_version text DEFAULT 'v3';

ALTER TABLE public.compatibility_scores
  ADD COLUMN IF NOT EXISTS compatibility jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS overall_breakdown jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS position_ratings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS value_analysis jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS scoring_version text DEFAULT 'v3';
