-- Add team_id column to teams table if it doesn't exist
-- This allows teams to be referenced by team_id instead of just id

-- Check if team_id column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'teams' 
        AND column_name = 'team_id'
    ) THEN
        -- Add team_id column that references the id (primary key)
        ALTER TABLE teams 
        ADD COLUMN team_id UUID DEFAULT gen_random_uuid() UNIQUE;
        
        -- Update existing rows to set team_id = id
        UPDATE teams 
        SET team_id = id 
        WHERE team_id IS NULL;
        
        -- Make it NOT NULL after updating
        ALTER TABLE teams 
        ALTER COLUMN team_id SET NOT NULL;
        
        -- Create index for better performance
        CREATE INDEX IF NOT EXISTS idx_teams_team_id ON teams(team_id);
    END IF;
END $$;

-- Alternatively, if team_id should just be an alias for id, we can use a view or update the foreign key references
-- But for now, let's ensure analytics_purchases can reference teams properly

-- Verify analytics_purchases table structure
-- If teams_id doesn't exist, we need to check what the actual foreign key column is
DO $$
BEGIN
    -- Check if teams_id column exists in analytics_purchases
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'analytics_purchases' 
        AND column_name = 'teams_id'
    ) THEN
        -- If it doesn't exist, check if team_id exists instead
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'analytics_purchases' 
            AND column_name = 'team_id'
        ) THEN
            -- Rename team_id to teams_id for consistency
            ALTER TABLE analytics_purchases 
            RENAME COLUMN team_id TO teams_id;
        ELSE
            -- Add teams_id column
            ALTER TABLE analytics_purchases 
            ADD COLUMN teams_id UUID REFERENCES teams(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;



