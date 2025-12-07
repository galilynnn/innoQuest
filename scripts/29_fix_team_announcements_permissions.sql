-- Fix permissions for team_announcements table
-- Run this if you're getting permission errors

-- Ensure RLS is disabled (for prototype)
ALTER TABLE team_announcements DISABLE ROW LEVEL SECURITY;

-- Grant permissions (adjust based on your Supabase setup)
-- For Supabase, these are usually handled automatically, but if you need to grant explicitly:
-- GRANT ALL ON team_announcements TO authenticated;
-- GRANT ALL ON team_announcements TO anon;
-- GRANT ALL ON team_announcements TO service_role;

-- Verify the table structure is correct
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'team_announcements'
ORDER BY ordinal_position;

-- Check if you can query the table
SELECT COUNT(*) as announcement_count FROM team_announcements;


