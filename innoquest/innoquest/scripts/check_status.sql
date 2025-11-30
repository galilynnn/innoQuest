-- Check current game status
SELECT game_id, game_status, current_week, max_teams 
FROM game_settings 
WHERE game_id = '00000000-0000-0000-0000-000000000001';

-- Also check teams
SELECT id, team_name, username, last_activity, is_active 
FROM teams 
WHERE game_id = '00000000-0000-0000-0000-000000000001'
ORDER BY team_name;
