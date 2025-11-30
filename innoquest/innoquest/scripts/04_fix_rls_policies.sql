-- First, drop all existing policies
DROP POLICY IF EXISTS "Allow public read on customers" ON customers;
DROP POLICY IF EXISTS "Allow public read on products" ON products;
DROP POLICY IF EXISTS "Teams are readable by authenticated users" ON teams;
DROP POLICY IF EXISTS "Weekly results readable by authenticated users" ON weekly_results;
DROP POLICY IF EXISTS "Game logs readable by authenticated users" ON game_logs;

-- Drop any other policies that might exist
DROP POLICY IF EXISTS "Allow all operations on teams" ON teams;
DROP POLICY IF EXISTS "Allow all operations on weekly_results" ON weekly_results;
DROP POLICY IF EXISTS "Allow all operations on game_settings" ON game_settings;
DROP POLICY IF EXISTS "Allow all operations on customers" ON customers;
DROP POLICY IF EXISTS "Allow all operations on products" ON products;
DROP POLICY IF EXISTS "Allow all operations on rnd_tests" ON rnd_tests;
DROP POLICY IF EXISTS "Allow all operations on analytics_purchases" ON analytics_purchases;
DROP POLICY IF EXISTS "Allow all operations on game_logs" ON game_logs;

-- Disable RLS completely
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE rnd_tests DISABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_logs DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled (should show 'f' for false)
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('teams', 'weekly_results', 'game_settings', 'customers', 'products', 'rnd_tests', 'analytics_purchases', 'game_logs');
