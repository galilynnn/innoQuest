-- Add paused_time_remaining column to game_settings table
-- This stores the remaining time in milliseconds when the game is paused
-- so that when resumed, the timer can continue from the exact same point

ALTER TABLE game_settings 
ADD COLUMN IF NOT EXISTS paused_time_remaining BIGINT DEFAULT NULL;

COMMENT ON COLUMN game_settings.paused_time_remaining IS 'Remaining time in milliseconds when game was paused. Used to resume timer from correct point.';
