-- Scout Experience Exact V3
-- Private optional evidence for Scout report-a-concern
-- Migration v3.43

BEGIN;

ALTER TABLE public.safeguarding_concerns
  ADD COLUMN IF NOT EXISTS evidence_storage_path text,
  ADD COLUMN IF NOT EXISTS evidence_file_name text,
  ADD COLUMN IF NOT EXISTS evidence_mime_type text,
  ADD COLUMN IF NOT EXISTS evidence_size_bytes bigint;

ALTER TABLE public.trust_submissions
  ADD COLUMN IF NOT EXISTS evidence_storage_path text,
  ADD COLUMN IF NOT EXISTS evidence_file_name text,
  ADD COLUMN IF NOT EXISTS evidence_mime_type text,
  ADD COLUMN IF NOT EXISTS evidence_size_bytes bigint;

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'trust-concern-evidence',
  'trust-concern-evidence',
  false,
  5242880,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE INDEX IF NOT EXISTS
  idx_safeguarding_concerns_evidence
ON public.safeguarding_concerns (
  evidence_storage_path
)
WHERE evidence_storage_path IS NOT NULL;

COMMIT;
