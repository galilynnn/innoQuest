-- Add population_size, initial_capital, and cost_per_analytics columns to game_settings
ALTER TABLE game_settings 
ADD COLUMN population_size INTEGER DEFAULT 10000,
ADD COLUMN initial_capital DECIMAL(15,2) DEFAULT 500000,
ADD COLUMN cost_per_analytics DECIMAL(10,2) DEFAULT 5000;

-- Create indexes for performance
CREATE INDEX idx_game_settings_game_id ON game_settings(game_id);
