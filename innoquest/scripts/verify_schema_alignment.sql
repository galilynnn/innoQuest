-- Verify your database schema matches the code expectations
-- Run this in Supabase SQL Editor to check column names

-- 1. Check teams table primary key column name
SELECT 'teams table columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'teams' AND column_name IN ('id', 'teams_id')
ORDER BY column_name;

-- 2. Check weekly_results foreign key column name
SELECT 'weekly_results foreign key column:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'weekly_results' AND column_name IN ('team_id', 'teams_id')
ORDER BY column_name;

-- 3. Check rnd_tests foreign key column name
SELECT 'rnd_tests foreign key column:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'rnd_tests' AND column_name IN ('team_id', 'teams_id')
ORDER BY column_name;

-- 4. Check if analytics_quantity exists in weekly_results
SELECT 'analytics_quantity column:' as info;
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'weekly_results' AND column_name = 'analytics_quantity';
