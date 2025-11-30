-- Fix last_activity to default to NULL instead of CURRENT_TIMESTAMP
-- This ensures teams only show as "Joined" AFTER they log in

-- Change the default value for new records
ALTER TABLE teams ALTER COLUMN last_activity DROP DEFAULT;

-- Set existing teams that haven't logged in to NULL
-- (This is safe if you want to reset current state)
UPDATE teams SET last_activity = NULL WHERE last_activity IS NOT NULL;

-- Verify the change
SELECT table_name, column_name, column_default
FROM information_schema.columns
WHERE table_name = 'teams' AND column_name = 'last_activity';
