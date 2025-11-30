-- Check if teams exist for leaderboard
SELECT 
  id,
  team_name,
  funding_stage,
  total_balance,
  bonus_multiplier_pending,
  game_id
FROM teams 
WHERE game_id = '00000000-0000-0000-0000-000000000001'
ORDER BY total_balance DESC;
