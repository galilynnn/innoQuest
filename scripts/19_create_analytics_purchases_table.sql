-- Create analytics_purchases table
-- This table stores analytics tools purchased by teams each week

-- Drop table if exists (for clean setup - remove this line if you want to keep existing data)
-- DROP TABLE IF EXISTS analytics_purchases CASCADE;

-- Create the table
CREATE TABLE IF NOT EXISTS analytics_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teams_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  tool_type TEXT NOT NULL,
  cost DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_analytics_purchases_teams_id ON analytics_purchases(teams_id);
CREATE INDEX IF NOT EXISTS idx_analytics_purchases_week_number ON analytics_purchases(week_number);
CREATE INDEX IF NOT EXISTS idx_analytics_purchases_teams_week ON analytics_purchases(teams_id, week_number);

-- Disable RLS for prototype (enable if you need row-level security)
ALTER TABLE analytics_purchases DISABLE ROW LEVEL SECURITY;

-- Add comment for documentation
COMMENT ON TABLE analytics_purchases IS 'Stores analytics tools purchased by teams each week';
COMMENT ON COLUMN analytics_purchases.teams_id IS 'References teams(id) - the team that purchased the tool';
COMMENT ON COLUMN analytics_purchases.week_number IS 'The week number when the tool was purchased';
COMMENT ON COLUMN analytics_purchases.tool_type IS 'Full name/description of the analytics tool';
COMMENT ON COLUMN analytics_purchases.cost IS 'Cost of the tool in this purchase';

