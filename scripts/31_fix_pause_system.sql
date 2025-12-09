-- Update pause system to use timestamp-based approach
-- Drop the problematic column and add a simpler pause_timestamp

ALTER TABLE game_settings 
DROP COLUMN IF EXISTS paused_time_remaining;

ALTER TABLE game_settings 
ADD COLUMN IF NOT EXISTS pause_timestamp TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN game_settings.pause_timestamp IS 'Timestamp when game was paused. Used to calculate elapsed time during pause.';
