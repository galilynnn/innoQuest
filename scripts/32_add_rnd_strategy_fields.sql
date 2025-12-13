-- Add rnd_strategy and rnd_tier_2 columns to weekly_results table
-- These fields support the R&D testing strategies:
-- - 'skip': No R&D this week
-- - 'one': Do R&D 1 time only
-- - 'two-if-fail': Do 2 R&Ds if the 1st one fails
-- - 'two-always': Do 2 R&Ds regardless

ALTER TABLE weekly_results
ADD COLUMN IF NOT EXISTS rnd_strategy TEXT,
ADD COLUMN IF NOT EXISTS rnd_tier_2 TEXT;

COMMENT ON COLUMN weekly_results.rnd_strategy IS 'R&D strategy chosen by student: skip, one, two-if-fail, or two-always';
COMMENT ON COLUMN weekly_results.rnd_tier_2 IS 'Second R&D tier for two-tier strategies';
