-- Check if bonus_multiplier_pending column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'teams'
AND column_name = 'bonus_multiplier_pending';

-- Also check current teams and their bonus status
SELECT id, team_name, bonus_multiplier_pending
FROM teams
LIMIT 10;
