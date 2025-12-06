-- Fix analytics_purchases table schema
-- Ensure the table exists and has correct structure

-- Check if analytics_purchases table exists, if not create it
CREATE TABLE IF NOT EXISTS analytics_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teams_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  tool_type TEXT NOT NULL,
  cost DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_analytics_purchases_teams_id ON analytics_purchases(teams_id);
CREATE INDEX IF NOT EXISTS idx_analytics_purchases_week_number ON analytics_purchases(week_number);

-- Disable RLS for prototype (if needed)
ALTER TABLE analytics_purchases DISABLE ROW LEVEL SECURITY;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL ON analytics_purchases TO authenticated;
-- GRANT ALL ON analytics_purchases TO anon;


