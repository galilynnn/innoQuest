-- Add week_start_time to track when each week begins for countdown timer
ALTER TABLE game_settings
ADD COLUMN IF NOT EXISTS week_start_time TIMESTAMP WITH TIME ZONE;

-- Set current time for active games
UPDATE game_settings
SET week_start_time = NOW()
WHERE game_status = 'active' AND week_start_time IS NULL;
