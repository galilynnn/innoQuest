-- Function to calculate purchase probability for all customers based on the Excel formula
-- Formula: MAX(0, MIN(100, 
--   ((E/10)*weight_E + (G/10)*weight_S + (H/10)*weight_B + (F/10)*weight_H + (Income/MAX_Income)*weight_Income) * 100
--   * (1 + (1 - LOG(price, 10) / LOG(500, 10)) * 2)
-- ))

CREATE OR REPLACE FUNCTION calculate_purchase_probabilities(
    p_game_id UUID,
    p_team_id UUID,
    p_product_id UUID,
    p_price DECIMAL(10,2)
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_customer_data_set_id UUID;
    v_customer_data JSONB;
    v_weights JSONB;
    v_weight_health DECIMAL(10,4);
    v_weight_sustainability DECIMAL(10,4);
    v_weight_brand_loyalty DECIMAL(10,4);
    v_weight_experimental DECIMAL(10,4);
    v_weight_income DECIMAL(10,4);
    v_max_income DECIMAL(10,4);
    v_customer JSONB;
    v_row_index INTEGER;
    v_health DECIMAL(10,4);
    v_sustainability DECIMAL(10,4);
    v_brand_loyalty DECIMAL(10,4);
    v_experimental DECIMAL(10,4);
    v_income DECIMAL(10,4);
    v_income_normalized DECIMAL(10,4);
    v_weighted_sum DECIMAL(10,4);
    v_price_adjustment DECIMAL(10,4);
    v_probability DECIMAL(10,4);
BEGIN
    -- Get active customer dataset for this game
    SELECT id, csv_data 
    INTO v_customer_data_set_id, v_customer_data
    FROM customer_data_sets
    WHERE game_id = p_game_id AND is_active = true
    LIMIT 1;
    
    IF v_customer_data_set_id IS NULL THEN
        RAISE EXCEPTION 'No active customer dataset found for game_id: %', p_game_id;
    END IF;
    
    -- Get probability weights for this product from game settings
    SELECT product_probability_weights -> p_product_id::text
    INTO v_weights
    FROM game_settings
    WHERE game_id = p_game_id;
    
    IF v_weights IS NULL THEN
        RAISE EXCEPTION 'No probability weights configured for product_id: %', p_product_id;
    END IF;
    
    -- Extract weights
    v_weight_health := (v_weights->>'health_consciousness')::DECIMAL(10,4);
    v_weight_sustainability := (v_weights->>'sustainability_preference')::DECIMAL(10,4);
    v_weight_brand_loyalty := (v_weights->>'brand_loyalty')::DECIMAL(10,4);
    v_weight_experimental := (v_weights->>'experimental_food')::DECIMAL(10,4);
    v_weight_income := (v_weights->>'income_sensitivity')::DECIMAL(10,4);
    
    -- Calculate max income from all customers (for normalization)
    SELECT MAX((customer->>'Income')::DECIMAL(10,4))
    INTO v_max_income
    FROM jsonb_array_elements(v_customer_data) AS customer;
    
    IF v_max_income IS NULL OR v_max_income = 0 THEN
        v_max_income := 1; -- Prevent division by zero
    END IF;
    
    -- Calculate price adjustment factor
    -- Formula: (1 + (1 - LOG(price, 10) / LOG(500, 10)) * 2)
    -- LOG(price, 10) = LN(price) / LN(10)
    IF p_price <= 0 THEN
        v_price_adjustment := 1.0; -- Default if price is invalid
    ELSE
        v_price_adjustment := 1.0 + (1.0 - (LN(p_price) / LN(10)) / (LN(500) / LN(10))) * 2.0;
    END IF;
    
    -- Delete existing probabilities for this team-product combination
    DELETE FROM customer_purchase_probabilities
    WHERE game_id = p_game_id 
        AND team_id = p_team_id 
        AND product_id = p_product_id;
    
    -- Iterate through each customer and calculate probability
    v_row_index := 0;
    FOR v_customer IN SELECT * FROM jsonb_array_elements(v_customer_data)
    LOOP
        -- Extract customer attributes
        -- Assuming CSV columns: Health (H), Sustainability (S), Brand Loyalty (B), Experimental Food (E), Income
        v_health := COALESCE((v_customer->>'Health')::DECIMAL(10,4), 0);
        v_sustainability := COALESCE((v_customer->>'Sustainability')::DECIMAL(10,4), 0);
        v_brand_loyalty := COALESCE((v_customer->>'Brand Loyalty')::DECIMAL(10,4), 0);
        v_experimental := COALESCE((v_customer->>'Experimental Food')::DECIMAL(10,4), 0);
        v_income := COALESCE((v_customer->>'Income')::DECIMAL(10,4), 0);
        
        -- Normalize income
        v_income_normalized := v_income / v_max_income;
        
        -- Calculate weighted sum
        -- Formula: (E/10)*weight_E + (S/10)*weight_S + (B/10)*weight_B + (H/10)*weight_H + (Income_normalized)*weight_Income
        v_weighted_sum := 
            (v_experimental / 10.0) * v_weight_experimental +
            (v_sustainability / 10.0) * v_weight_sustainability +
            (v_brand_loyalty / 10.0) * v_weight_brand_loyalty +
            (v_health / 10.0) * v_weight_health +
            v_income_normalized * v_weight_income;
        
        -- Calculate final probability with price adjustment
        -- Formula: MAX(0, MIN(100, weighted_sum * 100 * price_adjustment))
        v_probability := GREATEST(0, LEAST(100, v_weighted_sum * 100.0 * v_price_adjustment));
        
        -- Insert calculated probability
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
            p_team_id,
            v_customer_data_set_id,
            v_row_index,
            p_product_id,
            v_health,
            v_sustainability,
            v_brand_loyalty,
            v_experimental,
            v_income,
            v_weight_health,
            v_weight_sustainability,
            v_weight_brand_loyalty,
            v_weight_experimental,
            v_weight_income,
            p_price,
            v_income_normalized,
            v_price_adjustment,
            v_probability
        );
        
        v_row_index := v_row_index + 1;
    END LOOP;
    
    RAISE NOTICE 'Calculated purchase probabilities for % customers', v_row_index;
END;
$$;

COMMENT ON FUNCTION calculate_purchase_probabilities IS 'Calculates purchase probability for all customers based on product price and customer attributes using Excel formula';
