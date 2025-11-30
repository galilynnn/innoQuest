-- Fix price adjustment formula to exactly match Excel formula
-- Excel: (1 + (1 - LOG(price, 10) / LOG(500, 10)) * 2)
-- This simplifies to: 1 + (1 - LN(price)/LN(500)) * 2

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
    -- Get active customer dataset
    SELECT id, csv_data 
    INTO v_customer_data_set_id, v_customer_data
    FROM customer_data_sets
    WHERE game_id = p_game_id AND is_active = true
    LIMIT 1;
    
    IF v_customer_data_set_id IS NULL THEN
        RAISE EXCEPTION 'No active customer dataset found for game_id: %', p_game_id;
    END IF;
    
    -- Get probability weights for this product
    SELECT product_probability_weights -> p_product_id::text
    INTO v_weights
    FROM game_settings
    WHERE game_id = p_game_id;
    
    IF v_weights IS NULL THEN
        RAISE EXCEPTION 'No probability weights configured for product_id: %', p_product_id;
    END IF;
    
    -- Extract weights
    v_weight_health := COALESCE((v_weights->>'health_consciousness')::DECIMAL(10,4), 0.25);
    v_weight_sustainability := COALESCE((v_weights->>'sustainability_preference')::DECIMAL(10,4), 0.25);
    v_weight_brand_loyalty := COALESCE((v_weights->>'brand_loyalty')::DECIMAL(10,4), 0.25);
    v_weight_experimental := COALESCE((v_weights->>'experimental_food')::DECIMAL(10,4), 0.25);
    v_weight_income := COALESCE((v_weights->>'income_sensitivity')::DECIMAL(10,4), 0.10);
    
    -- Calculate max income from all customers
    SELECT MAX(
        CASE 
            WHEN jsonb_typeof(customer->'Monthly Income') = 'string' 
            THEN TRIM(BOTH '"' FROM TRIM(customer->>'Monthly Income'))::DECIMAL(10,4)
            WHEN jsonb_typeof(customer->'Monthly Income') = 'number'
            THEN (customer->'Monthly Income')::DECIMAL(10,4)
            ELSE NULL
        END
    )
    INTO v_max_income
    FROM jsonb_array_elements(v_customer_data) AS customer;

    IF v_max_income IS NULL OR v_max_income = 0 THEN
        v_max_income := 100000;
    END IF;
    
    -- Calculate price adjustment factor
    -- Excel formula: (1 + (1 - LOG(price, 10) / LOG(500, 10)) * 2)
    -- Simplified: 1 + (1 - LN(price)/LN(500)) * 2
    IF p_price <= 0 THEN
        v_price_adjustment := 1.0;
    ELSE
        -- LOG(price, 10) / LOG(500, 10) = LN(price) / LN(500)
        v_price_adjustment := 1.0 + (1.0 - (LN(p_price) / LN(500.0))) * 2.0;
    END IF;
    
    RAISE NOTICE 'Price adjustment factor for price %: %', p_price, v_price_adjustment;
    
    -- Delete existing probabilities for this team-product combination
    DELETE FROM customer_purchase_probabilities
    WHERE game_id = p_game_id 
        AND team_id = p_team_id 
        AND product_id = p_product_id;
    
    -- Iterate through each customer and calculate probability
    v_row_index := 0;
    FOR v_customer IN SELECT * FROM jsonb_array_elements(v_customer_data)
    LOOP
        -- Extract customer attributes (handle quoted strings)
        v_health := COALESCE(
            CASE 
                WHEN jsonb_typeof(v_customer->'Health Consciousness') = 'string' 
                THEN TRIM(BOTH '"' FROM TRIM(v_customer->>'Health Consciousness'))::DECIMAL(10,4)
                WHEN jsonb_typeof(v_customer->'Health Consciousness') = 'number'
                THEN (v_customer->'Health Consciousness')::DECIMAL(10,4)
                ELSE NULL
            END, 5.0);
        v_sustainability := COALESCE(
            CASE 
                WHEN jsonb_typeof(v_customer->'Sustainability Preference') = 'string' 
                THEN TRIM(BOTH '"' FROM TRIM(v_customer->>'Sustainability Preference'))::DECIMAL(10,4)
                WHEN jsonb_typeof(v_customer->'Sustainability Preference') = 'number'
                THEN (v_customer->'Sustainability Preference')::DECIMAL(10,4)
                ELSE NULL
            END, 5.0);
        v_brand_loyalty := COALESCE(
            CASE 
                WHEN jsonb_typeof(v_customer->'Brand Loyalty') = 'string' 
                THEN TRIM(BOTH '"' FROM TRIM(v_customer->>'Brand Loyalty'))::DECIMAL(10,4)
                WHEN jsonb_typeof(v_customer->'Brand Loyalty') = 'number'
                THEN (v_customer->'Brand Loyalty')::DECIMAL(10,4)
                ELSE NULL
            END, 5.0);
        v_experimental := COALESCE(
            CASE 
                WHEN jsonb_typeof(v_customer->'Interest in Experimental Food') = 'string' 
                THEN TRIM(BOTH '"' FROM TRIM(v_customer->>'Interest in Experimental Food'))::DECIMAL(10,4)
                WHEN jsonb_typeof(v_customer->'Interest in Experimental Food') = 'number'
                THEN (v_customer->'Interest in Experimental Food')::DECIMAL(10,4)
                ELSE NULL
            END, 5.0);
        v_income := COALESCE(
            CASE 
                WHEN jsonb_typeof(v_customer->'Monthly Income') = 'string' 
                THEN TRIM(BOTH '"' FROM TRIM(v_customer->>'Monthly Income'))::DECIMAL(10,4)
                WHEN jsonb_typeof(v_customer->'Monthly Income') = 'number'
                THEN (v_customer->'Monthly Income')::DECIMAL(10,4)
                ELSE NULL
            END, 50000.0);
        
        -- Normalize income
        v_income_normalized := v_income / v_max_income;
        
        -- Calculate weighted sum
        -- Formula: (Health/10)*weight_H + (Sustainability/10)*weight_S + (BrandLoyalty/10)*weight_B + (Experimental/10)*weight_E + (Income_normalized)*weight_Income
        v_weighted_sum := 
            (v_health / 10.0) * v_weight_health +
            (v_sustainability / 10.0) * v_weight_sustainability +
            (v_brand_loyalty / 10.0) * v_weight_brand_loyalty +
            (v_experimental / 10.0) * v_weight_experimental +
            v_income_normalized * v_weight_income;
        
        -- Calculate final probability with price adjustment
        -- Formula: MAX(0, MIN(100, weighted_sum * 100 * price_adjustment))
        v_probability := GREATEST(0.0, LEAST(100.0, v_weighted_sum * 100.0 * v_price_adjustment));
        
        -- Insert calculated probability with all required columns
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
    
    RAISE NOTICE 'Successfully calculated purchase probabilities for % customers with price % (adjustment: %)', 
        v_row_index, p_price, v_price_adjustment;
END;
$$;

COMMENT ON FUNCTION calculate_purchase_probabilities IS 
'Calculates purchase probability for all customers based on:
- Customer attributes from active dataset (Health, Sustainability, Brand Loyalty, Experimental Food, Monthly Income)
- Product-specific weights from game configuration
- Price adjustment factor using logarithmic formula: (1 + (1 - LOG(price, 10) / LOG(500, 10)) * 2)
Formula: MAX(0, MIN(100, weighted_sum * 100 * price_adjustment))';

