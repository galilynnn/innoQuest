-- Add investment_config column to store funding stage configurations
-- Stores Mean, SD, SD%, Main Ratio, Bonus Ratio, Bonus Multiplier for each stage

ALTER TABLE game_settings 
ADD COLUMN IF NOT EXISTS investment_config JSONB DEFAULT '{
  "seed": {
    "mean": 50000,
    "sd": 10000,
    "sd_percent": 20,
    "main_ratio": 0.7,
    "bonus_ratio": 0.3,
    "bonus_multiplier": 1.5
  },
  "series_a": {
    "mean": 200000,
    "sd": 40000,
    "sd_percent": 20,
    "main_ratio": 0.7,
    "bonus_ratio": 0.3,
    "bonus_multiplier": 2.0
  },
  "series_b": {
    "mean": 500000,
    "sd": 100000,
    "sd_percent": 20,
    "main_ratio": 0.7,
    "bonus_ratio": 0.3,
    "bonus_multiplier": 2.5
  },
  "series_c": {
    "mean": 1000000,
    "sd": 200000,
    "sd_percent": 20,
    "main_ratio": 0.7,
    "bonus_ratio": 0.3,
    "bonus_multiplier": 3.0
  }
}'::jsonb;

COMMENT ON COLUMN game_settings.investment_config IS 'Investment amount configuration for each funding stage';
