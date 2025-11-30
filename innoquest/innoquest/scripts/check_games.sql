-- Check existing games and teams
SELECT 
  gs.id as game_id,
  gs.game_status,
  gs.current_week,
  COUNT(t.id) as team_count
FROM game_settings gs
LEFT JOIN teams t ON t.game_id = gs.id
GROUP BY gs.id, gs.game_status, gs.current_week
ORDER BY gs.created_at DESC;

-- If no games exist, create one with the expected ID
-- Only run this if the query above returns no results:
/*
INSERT INTO game_settings (id, game_id, game_status, current_week, total_weeks, week_duration_minutes, max_teams)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'lobby',
  1,
  10,
  5,
  10
)
ON CONFLICT (id) DO NOTHING;
*/
