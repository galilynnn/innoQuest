-- Create milestone_achievements table to track which teams reached milestones first
-- This is used to calculate balance awards based on ranking

CREATE TABLE IF NOT EXISTS milestone_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL,
  team_id UUID NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE, -- References teams.team_id (primary key)
  milestone_stage TEXT NOT NULL, -- 'Seed', 'Series A', 'Series B', 'Series C'
  rank INTEGER NOT NULL, -- 1 = first to reach, 2 = second, etc.
  award_amount DECIMAL(15,2) NOT NULL, -- Balance award calculated using NORMINV
  week_number INTEGER NOT NULL, -- Week when milestone was reached
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(game_id, milestone_stage, rank) -- Ensure only one team per rank per milestone
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_milestone_achievements_game_milestone 
  ON milestone_achievements(game_id, milestone_stage);

CREATE INDEX IF NOT EXISTS idx_milestone_achievements_team 
  ON milestone_achievements(team_id);

COMMENT ON TABLE milestone_achievements IS 'Tracks which teams reached funding milestones first and their ranking for balance awards';

