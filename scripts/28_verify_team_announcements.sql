-- Verify team_announcements table structure
-- Run this to check if the table exists and has the correct columns

-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'team_announcements'
) AS table_exists;

-- Check table columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'team_announcements'
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'team_announcements';

-- Check RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'team_announcements';

-- Test insert (will fail if there are issues)
-- Uncomment to test:
-- INSERT INTO team_announcements (game_id, team_id, announcement_type, title, message, week_number)
-- VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'test', 'Test', 'Test message', 1)
-- ON CONFLICT DO NOTHING;


