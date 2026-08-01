-- Adds the canonical Attacker group without removing the legacy Forward value.
-- Keeping Forward temporarily makes the rollout safe while old deployments drain.
ALTER TYPE position_group ADD VALUE IF NOT EXISTS 'Attacker';
