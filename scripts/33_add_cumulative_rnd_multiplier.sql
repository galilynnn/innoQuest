-- Migration: Add cumulative R&D multiplier to teams table
-- This field stores the product of all successful R&D multipliers
-- Allows multipliers to stack over time

ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS cumulative_rnd_multiplier DECIMAL(10,4) DEFAULT 1.0;

COMMENT ON COLUMN teams.cumulative_rnd_multiplier IS 'Cumulative product of all successful R&D multipliers (stacks over time). Resets to 1.0 when team loses a round.';

-- Initialize existing teams to 1.0
UPDATE teams 
SET cumulative_rnd_multiplier = 1.0 
WHERE cumulative_rnd_multiplier IS NULL;
