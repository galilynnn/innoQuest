-- Debug: Check current game settings
SELECT 
  game_id,
  current_week,
  total_weeks,
  game_status,
  is_paused,
  paused_time_remaining,
  week_start_time,
  week_duration_minutes
FROM game_settings
WHERE game_id = '00000000-0000-0000-0000-000000000001';
