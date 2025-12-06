-- Ensure analytics_purchases table works correctly
-- This script handles both cases: teams_id and team_id

-- First, ensure analytics_purchases table exists with correct structure
CREATE TABLE IF NOT EXISTS analytics_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teams_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  tool_type TEXT NOT NULL,
  cost DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_analytics_purchases_teams_id ON analytics_purchases(teams_id);
CREATE INDEX IF NOT EXISTS idx_analytics_purchases_week_number ON analytics_purchases(week_number);
CREATE INDEX IF NOT EXISTS idx_analytics_purchases_teams_week ON analytics_purchases(teams_id, week_number);

-- Disable RLS for prototype
ALTER TABLE analytics_purchases DISABLE ROW LEVEL SECURITY;

-- If teams table has team_id column, we can also add a team_id column to analytics_purchases for easier querying
-- But for now, we'll use teams_id which references teams(id)

-- Verify the foreign key relationship
DO $$
BEGIN
    -- Check if foreign key constraint exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'analytics_purchases_teams_id_fkey'
        AND table_name = 'analytics_purchases'
    ) THEN
        -- Add foreign key constraint if it doesn't exist
        ALTER TABLE analytics_purchases
        ADD CONSTRAINT analytics_purchases_teams_id_fkey 
        FOREIGN KEY (teams_id) REFERENCES teams(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Grant necessary permissions (adjust based on your RLS setup)
-- GRANT SELECT, INSERT ON analytics_purchases TO authenticated;
-- GRANT SELECT, INSERT ON analytics_purchases TO anon;


