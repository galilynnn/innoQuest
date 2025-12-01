-- Add rnd_tier_config column to store R&D tier configurations
-- Stores Min Cost, Max Cost, Success Min/Max %, Multiplier Min/Max % for each tier

ALTER TABLE game_settings 
ADD COLUMN IF NOT EXISTS rnd_tier_config JSONB DEFAULT '{
  "basic": {
    "min_cost": 30000,
    "max_cost": 50000,
    "success_min": 15,
    "success_max": 35,
    "multiplier_min": 100,
    "multiplier_max": 120
  },
  "standard": {
    "min_cost": 60000,
    "max_cost": 100000,
    "success_min": 45,
    "success_max": 60,
    "multiplier_min": 115,
    "multiplier_max": 135
  },
  "advanced": {
    "min_cost": 110000,
    "max_cost": 160000,
    "success_min": 65,
    "success_max": 85,
    "multiplier_min": 130,
    "multiplier_max": 160
  },
  "premium": {
    "min_cost": 170000,
    "max_cost": 200000,
    "success_min": 75,
    "success_max": 95,
    "multiplier_min": 150,
    "multiplier_max": 180
  }
}'::jsonb;

COMMENT ON COLUMN game_settings.rnd_tier_config IS 'R&D tier configuration for test costs, success rates, and multipliers';
