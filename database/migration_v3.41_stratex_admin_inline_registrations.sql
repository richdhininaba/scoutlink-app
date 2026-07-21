-- Stratex Admin inline Coach and Scout registration workflow
-- Migration version: v3.41

BEGIN;

ALTER TABLE public.registration_requests
  ADD COLUMN IF NOT EXISTS information_request_message text,
  ADD COLUMN IF NOT EXISTS information_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS information_requested_by text,
  ADD COLUMN IF NOT EXISTS verification_link_resent_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_email_resent_at timestamptz,
  ADD COLUMN IF NOT EXISTS linked_account_id text,
  ADD COLUMN IF NOT EXISTS linked_account_type text,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;

CREATE INDEX IF NOT EXISTS
  idx_registration_requests_linked_account
ON public.registration_requests (
  linked_account_type,
  linked_account_id
);

CREATE INDEX IF NOT EXISTS
  idx_registration_requests_workflow
ON public.registration_requests (
  account_type,
  status,
  verification_status,
  created_at DESC
);

COMMIT;
