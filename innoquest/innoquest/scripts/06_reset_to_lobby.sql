-- Update game status to lobby and reset to week 0
UPDATE game_settings 
SET 
  game_status = 'lobby',
  current_week = 0
WHERE game_id = '00000000-0000-0000-0000-000000000001';

-- Verify the update
SELECT game_id, game_status, current_week, max_teams, total_weeks 
FROM game_settings 
WHERE game_id = '00000000-0000-0000-0000-000000000001';
