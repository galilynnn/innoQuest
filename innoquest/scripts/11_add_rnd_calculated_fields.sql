-- Migration: Add calculated R&D fields to weekly_results table
-- These fields store the actual randomized values from admin-configured ranges

ALTER TABLE weekly_results 
ADD COLUMN IF NOT EXISTS rnd_success_probability DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS rnd_multiplier DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS rnd_cost DECIMAL(15,2);

COMMENT ON COLUMN weekly_results.rnd_success_probability IS 'Actual rolled success probability percentage (0-100)';
COMMENT ON COLUMN weekly_results.rnd_multiplier IS 'Actual rolled multiplier applied to demand';
COMMENT ON COLUMN weekly_results.rnd_cost IS 'Actual cost of R&D test (randomized from tier config)';
