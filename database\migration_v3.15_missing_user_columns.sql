-- ScoutLink v3.15: Add missing is_super_user and registration_complete columns
-- These columns are referenced throughout the codebase but were never added via migration.
-- Required for the approve registration flow (registrations.js /:id/approve) to succeed.

-- coaches: add is_super_user (used by coach add-player, super user flows)
ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS is_super_user BOOLEAN NOT NULL DEFAULT FALSE;
-- coaches: add registration_complete (set false on creation, true after password set)
ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS registration_complete BOOLEAN NOT NULL DEFAULT FALSE;

-- scouts: add is_super_user (used by scouts add-scout, super user flows)
ALTER TABLE public.scouts ADD COLUMN IF NOT EXISTS is_super_user BOOLEAN NOT NULL DEFAULT FALSE;
-- scouts: add registration_complete
ALTER TABLE public.scouts ADD COLUMN IF NOT EXISTS registration_complete BOOLEAN NOT NULL DEFAULT FALSE;

-- players: add assigned_coach_id (used throughout players.js for coach scoping)
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS assigned_coach_id UUID REFERENCES public.coaches(id) ON DELETE SET NULL;
-- players: add registration_complete
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS registration_complete BOOLEAN NOT NULL DEFAULT FALSE;

-- Back-fill: mark accounts with a password_hash as already registration_complete
UPDATE public.coaches SET registration_complete = TRUE WHERE password_hash IS NOT NULL AND registration_complete = FALSE;
UPDATE public.scouts SET registration_complete = TRUE WHERE password_hash IS NOT NULL AND registration_complete = FALSE;
UPDATE public.players SET registration_complete = TRUE WHERE password_hash IS NOT NULL AND registration_complete = FALSE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coaches_is_super_user ON public.coaches(is_super_user);
CREATE INDEX IF NOT EXISTS idx_players_assigned_coach_id ON public.players(assigned_coach_id);

NOTIFY pgrst, 'reload schema';
