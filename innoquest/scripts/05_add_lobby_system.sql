-- Add proper game status states and constraints
-- Game status can be: 'lobby', 'playing', 'completed'

-- Update game_status to use specific values
ALTER TABLE game_settings 
  ADD CONSTRAINT game_status_check 
  CHECK (game_status IN ('lobby', 'playing', 'completed'));

-- Update existing records to use 'lobby' instead of 'setup'
UPDATE game_settings SET game_status = 'lobby' WHERE game_status = 'setup' OR game_status = 'active';

-- Set default to 'lobby'
ALTER TABLE game_settings ALTER COLUMN game_status SET DEFAULT 'lobby';

-- Add comments for documentation
COMMENT ON COLUMN game_settings.game_status IS 'Game state: lobby (waiting to start), playing (game in progress), completed (game finished)';
COMMENT ON COLUMN game_settings.current_week IS 'Current week/round number. 0 = in lobby, 1+ = game in progress';
