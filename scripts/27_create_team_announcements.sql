-- Create team_announcements table to store funding stage advancement announcements
-- This table stores announcements shown to students when they advance through funding stages

CREATE TABLE IF NOT EXISTS team_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL,
  team_id UUID NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
  announcement_type TEXT NOT NULL, -- 'milestone_advancement', 'round_lost', etc.
  title TEXT NOT NULL, -- e.g., "Congratulations! You've advanced to Seed stage"
  message TEXT NOT NULL, -- Full announcement message
  balance_award DECIMAL(15,2), -- Balance award amount (if applicable)
  old_stage TEXT, -- Previous funding stage
  new_stage TEXT, -- New funding stage
  week_number INTEGER NOT NULL, -- Week when announcement was created
  is_read BOOLEAN DEFAULT false, -- Whether student has seen this announcement
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_team_announcements_team_id ON team_announcements(team_id);
CREATE INDEX IF NOT EXISTS idx_team_announcements_game_id ON team_announcements(game_id);
CREATE INDEX IF NOT EXISTS idx_team_announcements_week ON team_announcements(team_id, week_number);
CREATE INDEX IF NOT EXISTS idx_team_announcements_unread ON team_announcements(team_id, is_read) WHERE is_read = false;

-- Disable RLS for prototype (enable if you need row-level security)
ALTER TABLE team_announcements DISABLE ROW LEVEL SECURITY;

-- Add comment for documentation
COMMENT ON TABLE team_announcements IS 'Stores announcements shown to students, including funding stage advancements and balance awards';
COMMENT ON COLUMN team_announcements.announcement_type IS 'Type of announcement: milestone_advancement, round_lost, etc.';
COMMENT ON COLUMN team_announcements.balance_award IS 'Balance award amount received when advancing to this stage';


