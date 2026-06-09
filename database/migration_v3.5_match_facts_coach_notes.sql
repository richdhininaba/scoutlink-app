-- ScoutLink v3.5 match facts coach notes
-- Aligns the live match_facts table with the API insert payload.

ALTER TABLE match_facts
  ADD COLUMN IF NOT EXISTS coach_notes TEXT;

