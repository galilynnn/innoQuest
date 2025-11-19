-- Migration: Add admin-controlled bonus multiplier for teams
-- Admin can grant bonus via checkbox in leaderboard, applied in next calculation

ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS bonus_multiplier_pending DECIMAL(5,2) DEFAULT NULL;

COMMENT ON COLUMN teams.bonus_multiplier_pending IS 'Bonus multiplier granted by admin, applied in next week calculation then cleared';
