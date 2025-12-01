-- Calculate purchase probabilities for ALL products and ALL customers
-- This populates customer_purchase_probabilities table with probability calculations
-- Formula: MAX(0, MIN(100, weighted_sum * 100 * (1 + (1 - LOG(price, 10) / LOG(500, 10)) * 2)))

-- Create or replace function to calculate probabilities for all products
CREATE OR REPLACE FUNCTION calculate_all_product_probabilities(
    p_game_id UUID,
    p_team_id UUID DEFAULT NULL -- Optional: if NULL, calculates for all teams
)
RETURNS TABLE(
    products_calculated INTEGER,
    customers_processed INTEGER,
    total_probabilities INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_customer_data_set_id UUID;
    v_customer_data JSONB;
    v_customer JSONB;
    v_row_index INTEGER := 0;
    v_product RECORD;
    v_weights JSONB;
    v_weight_health DECIMAL(10,4);
    v_weight_sustainability DECIMAL(10,4);
    v_weight_brand_loyalty DECIMAL(10,4);
    v_weight_experimental DECIMAL(10,4);
    v_weight_income DECIMAL(10,4);
    v_max_income DECIMAL(10,4);
    v_health DECIMAL(10,4);
    v_sustainability DECIMAL(10,4);
    v_brand_loyalty DECIMAL(10,4);
    v_experimental DECIMAL(10,4);
    v_income DECIMAL(10,4);
    v_income_normalized DECIMAL(10,4);
    v_weighted_sum DECIMAL(10,4);
    v_price_adjustment DECIMAL(10,4);
    v_probability DECIMAL(10,4);
    v_price DECIMAL(10,2);
    v_product_count INTEGER := 0;
    v_customer_count INTEGER := 0;
    v_total_count INTEGER := 0;
    v_teams_to_process UUID[];
    v_current_team_id UUID;
BEGIN
    RAISE NOTICE 'Starting probability calculation for game: %', p_game_id;
    
    -- Get active customer dataset for this game
    SELECT id, csv_data 
    INTO v_customer_data_set_id, v_customer_data
    FROM customer_data_sets
    WHERE game_id = p_game_id AND is_active = true
    LIMIT 1;
    
    IF v_customer_data_set_id IS NULL THEN
        RAISE EXCEPTION 'No active customer dataset found for game_id: %', p_game_id;
    END IF;
    
    v_customer_count := jsonb_array_length(v_customer_data);
    RAISE NOTICE 'Found active dataset: % with % customers', v_customer_data_set_id, v_customer_count;
    
    -- Calculate max income for normalization (from column "Monthly Income")
    SELECT MAX((customer->>'Monthly Income')::DECIMAL(10,4))
    INTO v_max_income
    FROM jsonb_array_elements(v_customer_data) AS customer;
    
    IF v_max_income IS NULL OR v_max_income = 0 THEN
        v_max_income := 100000;
    END IF;
    
    RAISE NOTICE 'Max income in dataset: %', v_max_income;
    
    -- Determine which teams to process
    IF p_team_id IS NOT NULL THEN
        v_teams_to_process := ARRAY[p_team_id];
    ELSE
        -- Get all teams in this game
        SELECT ARRAY_AGG(team_id)
        INTO v_teams_to_process
        FROM teams
        WHERE game_id = p_game_id;
    END IF;
    
    RAISE NOTICE 'Processing % teams', array_length(v_teams_to_process, 1);
    
    -- Loop through each team
    FOREACH v_current_team_id IN ARRAY v_teams_to_process
    LOOP
        RAISE NOTICE 'Processing team: %', v_current_team_id;
        
        -- Get the product assigned to this team
        SELECT p.id, p.product_id, p.name, COALESCE(t.selected_product_price, 0) as price
        INTO v_product
        FROM teams t
        JOIN products p ON p.id = t.selected_product_id
        WHERE t.team_id = v_current_team_id;
        
        IF NOT FOUND THEN
            RAISE NOTICE 'No product assigned to team: %, skipping', v_current_team_id;
            CONTINUE;
        END IF;
        
        v_price := v_product.price;
        RAISE NOTICE 'Team % - Product: % (%), Price: %', v_current_team_id, v_product.name, v_product.product_id, v_price;
        
        -- Get probability weights for this product from game settings
        SELECT product_probability_weights -> v_product.id::text
        INTO v_weights
        FROM game_settings
        WHERE game_id = p_game_id;
        
        IF v_weights IS NULL THEN
            RAISE NOTICE 'No weights found for product: %, using defaults', v_product.product_id;
            v_weight_health := 0.25;
            v_weight_sustainability := 0.25;
            v_weight_brand_loyalty := 0.25;
            v_weight_experimental := 0.25;
            v_weight_income := 0.10;
        ELSE
            v_weight_health := COALESCE((v_weights->>'health_consciousness')::DECIMAL(10,4), 0.25);
            v_weight_sustainability := COALESCE((v_weights->>'sustainability_preference')::DECIMAL(10,4), 0.25);
            v_weight_brand_loyalty := COALESCE((v_weights->>'brand_loyalty')::DECIMAL(10,4), 0.25);
            v_weight_experimental := COALESCE((v_weights->>'experimental_food')::DECIMAL(10,4), 0.25);
            v_weight_income := COALESCE((v_weights->>'income_sensitivity')::DECIMAL(10,4), 0.10);
        END IF;
        
        RAISE NOTICE 'Weights - H: %, S: %, B: %, E: %, Income: %',
            v_weight_health, v_weight_sustainability, v_weight_brand_loyalty, 
            v_weight_experimental, v_weight_income;
        
        -- Delete existing probabilities for this team-product combination
        DELETE FROM customer_purchase_probabilities
        WHERE game_id = p_game_id 
            AND team_id = v_current_team_id
            AND product_id = v_product.id;
        
        v_row_index := 0;
        
        -- Loop through each customer in the dataset
        FOR v_customer IN SELECT * FROM jsonb_array_elements(v_customer_data)
        LOOP
            -- Extract customer attributes (column names from CSV)
            v_health := COALESCE((v_customer->>'Health Consciousness')::DECIMAL(10,4), 5);
            v_sustainability := COALESCE((v_customer->>'Sustainability Preference')::DECIMAL(10,4), 5);
            v_brand_loyalty := COALESCE((v_customer->>'Brand Loyalty')::DECIMAL(10,4), 5);
            v_experimental := COALESCE((v_customer->>'Interest in Experimental Food')::DECIMAL(10,4), 5);
            v_income := COALESCE((v_customer->>'Monthly Income')::DECIMAL(10,4), 50000);
            
            -- Normalize customer scores to 0-1 scale (assuming 0-10 scale)
            v_health := v_health / 10.0;
            v_sustainability := v_sustainability / 10.0;
            v_brand_loyalty := v_brand_loyalty / 10.0;
            v_experimental := v_experimental / 10.0;
            
            -- Normalize income
            v_income_normalized := v_income / v_max_income;
            
            -- Calculate weighted sum of customer attributes
            v_weighted_sum := (v_health * v_weight_health) +
                             (v_sustainability * v_weight_sustainability) +
                             (v_brand_loyalty * v_weight_brand_loyalty) +
                             (v_experimental * v_weight_experimental) +
                             (v_income_normalized * v_weight_income);
            
            -- Calculate price adjustment factor
            -- Formula: (1 + (1 - LOG(price, 10) / LOG(500, 10)) * 2)
            -- Handle edge cases: if price <= 0, use neutral adjustment
            IF v_price <= 0 THEN
                v_price_adjustment := 1.0;
            ELSE
                v_price_adjustment := 1.0 + (1.0 - (LOG(10, v_price) / LOG(10, 500))) * 2.0;
            END IF;
            
            -- Calculate final probability
            -- Formula: MAX(0, MIN(100, weighted_sum * 100 * price_adjustment))
            v_probability := v_weighted_sum * 100 * v_price_adjustment;
            v_probability := GREATEST(0, LEAST(100, v_probability));
            
            -- Insert into customer_purchase_probabilities table
            INSERT INTO customer_purchase_probabilities (
                game_id,
                team_id,
                customer_data_set_id,
                customer_row_index,
                product_id,
                customer_health,
                customer_sustainability,
                customer_brand_loyalty,
                customer_experimental,
                customer_income,
                weight_health,
                weight_sustainability,
                weight_brand_loyalty,
                weight_experimental,
                weight_income_sensitivity,
                product_price,
                income_normalized,
                price_adjustment,
                purchase_probability
            ) VALUES (
                p_game_id,
                v_current_team_id,
                v_customer_data_set_id,
                v_row_index,
                v_product.id,
                v_health * 10, -- Store original scale
                v_sustainability * 10,
                v_brand_loyalty * 10,
                v_experimental * 10,
                v_income,
                v_weight_health,
                v_weight_sustainability,
                v_weight_brand_loyalty,
                v_weight_experimental,
                v_weight_income,
                v_price,
                v_income_normalized,
                v_price_adjustment,
                v_probability
            );
            
            v_row_index := v_row_index + 1;
            v_total_count := v_total_count + 1;
        END LOOP;
        
        v_product_count := v_product_count + 1;
        RAISE NOTICE 'Completed product % - calculated % customer probabilities', v_product.name, v_row_index;
    END LOOP;
    
    RAISE NOTICE 'Calculation complete: % products, % customers per product, % total records', 
        v_product_count, v_customer_count, v_total_count;
    
    RETURN QUERY SELECT v_product_count, v_customer_count, v_total_count;
END;
$$;

-- Example usage:
-- Calculate for all teams in a game:
-- SELECT * FROM calculate_all_product_probabilities('your-game-id-here');

-- Calculate for specific team:
-- SELECT * FROM calculate_all_product_probabilities('your-game-id-here', 'your-team-id-here');

COMMENT ON FUNCTION calculate_all_product_probabilities IS 
'Calculates purchase probabilities for all products assigned to teams using customer data. 
Uses formula: MAX(0, MIN(100, weighted_sum * 100 * (1 + (1 - LOG(price, 10) / LOG(500, 10)) * 2)))
Customer attributes: Health Consciousness, Sustainability Preference, Brand Loyalty, Interest in Experimental Food, Monthly Income';
