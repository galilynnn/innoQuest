-- Add advancement requirements (expected_revenue, demand, rd_count) to investment_config
-- These are the requirements teams must meet to advance to each funding stage
-- Admin must configure these values through the admin UI - this script only adds the fields

-- Update existing investment_config to include advancement requirements fields
-- Uses existing 'mean' as fallback for expected_revenue (backward compatibility)
-- Leaves demand and rd_count as NULL - admin must configure these

DO $$
DECLARE
  v_record RECORD;
  v_config JSONB;
  v_updated_config JSONB;
BEGIN
  -- For each game, update the investment_config to include advancement requirements fields
  FOR v_record IN 
    SELECT id, investment_config
    FROM game_settings 
    WHERE investment_config IS NOT NULL
  LOOP
    v_config := v_record.investment_config;
    v_updated_config := v_config;
    
    -- Update seed stage - only add fields if they don't exist
    IF v_config->'seed' IS NOT NULL THEN
      -- Use existing 'mean' as fallback for expected_revenue (backward compatibility)
      IF v_config->'seed'->'expected_revenue' IS NULL THEN
        v_updated_config := jsonb_set(
          v_updated_config,
          '{seed,expected_revenue}',
          v_config->'seed'->'mean'
        );
      END IF;
      -- Leave demand and rd_count as NULL - admin must configure
      IF v_config->'seed'->'demand' IS NULL THEN
        v_updated_config := jsonb_set(
          v_updated_config,
          '{seed,demand}',
          'null'::jsonb
        );
      END IF;
      IF v_config->'seed'->'rd_count' IS NULL THEN
        v_updated_config := jsonb_set(
          v_updated_config,
          '{seed,rd_count}',
          'null'::jsonb
        );
      END IF;
    END IF;

    -- Update series_a stage
    IF v_config->'series_a' IS NOT NULL THEN
      IF v_config->'series_a'->'expected_revenue' IS NULL THEN
        v_updated_config := jsonb_set(
          v_updated_config,
          '{series_a,expected_revenue}',
          v_config->'series_a'->'mean'
        );
      END IF;
      IF v_config->'series_a'->'demand' IS NULL THEN
        v_updated_config := jsonb_set(
          v_updated_config,
          '{series_a,demand}',
          'null'::jsonb
        );
      END IF;
      IF v_config->'series_a'->'rd_count' IS NULL THEN
        v_updated_config := jsonb_set(
          v_updated_config,
          '{series_a,rd_count}',
          'null'::jsonb
        );
      END IF;
    END IF;

    -- Update series_b stage
    IF v_config->'series_b' IS NOT NULL THEN
      IF v_config->'series_b'->'expected_revenue' IS NULL THEN
        v_updated_config := jsonb_set(
          v_updated_config,
          '{series_b,expected_revenue}',
          v_config->'series_b'->'mean'
        );
      END IF;
      IF v_config->'series_b'->'demand' IS NULL THEN
        v_updated_config := jsonb_set(
          v_updated_config,
          '{series_b,demand}',
          'null'::jsonb
        );
      END IF;
      IF v_config->'series_b'->'rd_count' IS NULL THEN
        v_updated_config := jsonb_set(
          v_updated_config,
          '{series_b,rd_count}',
          'null'::jsonb
        );
      END IF;
    END IF;

    -- Update series_c stage
    IF v_config->'series_c' IS NOT NULL THEN
      IF v_config->'series_c'->'expected_revenue' IS NULL THEN
        v_updated_config := jsonb_set(
          v_updated_config,
          '{series_c,expected_revenue}',
          v_config->'series_c'->'mean'
        );
      END IF;
      IF v_config->'series_c'->'demand' IS NULL THEN
        v_updated_config := jsonb_set(
          v_updated_config,
          '{series_c,demand}',
          'null'::jsonb
        );
      END IF;
      IF v_config->'series_c'->'rd_count' IS NULL THEN
        v_updated_config := jsonb_set(
          v_updated_config,
          '{series_c,rd_count}',
          'null'::jsonb
        );
      END IF;
    END IF;

    -- Update the record
    UPDATE game_settings 
    SET investment_config = v_updated_config
    WHERE id = v_record.id;
  END LOOP;
END $$;

COMMENT ON COLUMN game_settings.investment_config IS 'Investment amount configuration for each funding stage. Includes: mean, sd, sd_percent, main_ratio, bonus_ratio, bonus_multiplier (for balance awards), and expected_revenue, demand, rd_count (for advancement requirements)';

