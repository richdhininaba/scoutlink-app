-- ScoutLink v3.14
-- Stratex admin invite/reset support.

ALTER TABLE public.stratex ADD COLUMN IF NOT EXISTS login_code TEXT;
ALTER TABLE public.stratex ADD COLUMN IF NOT EXISTS login_code_expires TIMESTAMPTZ;
ALTER TABLE public.stratex ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE public.stratex ADD COLUMN IF NOT EXISTS registration_complete BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.stratex ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_stratex_login_code ON public.stratex(login_code);

UPDATE public.stratex
SET registration_complete = TRUE
WHERE registration_complete IS NULL;

DROP TRIGGER IF EXISTS trg_stratex ON public.stratex;
CREATE TRIGGER trg_stratex
BEFORE UPDATE ON public.stratex
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
