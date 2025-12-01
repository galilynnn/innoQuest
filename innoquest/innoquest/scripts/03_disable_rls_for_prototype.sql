-- Disable Row Level Security for Prototype
-- This allows the application to freely create/read/update teams without authentication

-- Disable RLS on all tables for prototype use
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE rnd_tests DISABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_logs DISABLE ROW LEVEL SECURITY;

-- Alternative: If you want to keep RLS enabled but allow all operations
-- Uncomment the following section instead of disabling RLS above

/*
-- Enable RLS but create permissive policies for prototype
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_settings ENABLE ROW LEVEL SECURITY;

-- Create policies that allow all operations (for prototype only)
CREATE POLICY "Allow all operations on teams" ON teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on weekly_results" ON weekly_results FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on game_settings" ON game_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on customers" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on rnd_tests" ON rnd_tests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on analytics_purchases" ON analytics_purchases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on game_logs" ON game_logs FOR ALL USING (true) WITH CHECK (true);
*/
