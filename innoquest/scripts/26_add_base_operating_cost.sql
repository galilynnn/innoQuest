-- Add base_operating_cost column to game_settings table
-- This allows admins to configure the base operating cost per week
ALTER TABLE game_settings 
ADD COLUMN IF NOT EXISTS base_operating_cost DECIMAL(10,2) DEFAULT 20000;

COMMENT ON COLUMN game_settings.base_operating_cost IS 'Base operating cost per week (fixed cost regardless of demand). Used in operating cost calculation: base_operating_cost + (demand × 0.5)';

