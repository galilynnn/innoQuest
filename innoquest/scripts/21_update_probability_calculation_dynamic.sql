-- Update the purchase probability calculation function to use dynamic customer data
-- Based on the active customer dataset with correct column mappings

-- First, ensure the customer_purchase_probabilities table has a probability column
ALTER TABLE customer_purchase_probabilities 
ADD COLUMN IF NOT EXISTS probability DECIMAL(10,4);

-- Drop existing function
DROP FUNCTION IF EXISTS calculate_purchase_probabilities(UUID, UUID, TEXT, DECIMAL);
DROP FUNCTION IF EXISTS calculate_purchase_probabilities(UUID, UUID, UUID, DECIMAL);

-- Create updated function with correct column names from customer dataset
CREATE OR REPLACE FUNCTION calculate_purchase_probabilities(
    p_game_id UUID,
    p_team_id UUID,
    p_product_id UUID,  -- Changed to UUID to match products.id
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
    -- Log the inputs
    RAISE NOTICE 'Calculating probabilities for game: %, team: %, product: %, price: %', 
        p_game_id, p_team_id, p_product_id, p_price;
    
    -- Get active customer dataset for this game
    SELECT id, csv_data 
    INTO v_customer_data_set_id, v_customer_data
    FROM customer_data_sets
    WHERE game_id = p_game_id AND is_active = true
    LIMIT 1;
    
    IF v_customer_data_set_id IS NULL THEN
        RAISE EXCEPTION 'No active customer dataset found for game_id: %', p_game_id;
    END IF;
    
    RAISE NOTICE 'Found active dataset: %, customer count: %', 
        v_customer_data_set_id, jsonb_array_length(v_customer_data);
    
    -- Get probability weights for this product from game settings
    -- The weights are stored in product_probability_weights JSONB column with UUID as text key
    SELECT product_probability_weights -> p_product_id::text
    INTO v_weights
    FROM game_settings
    WHERE game_id = p_game_id;
    
    IF v_weights IS NULL THEN
        RAISE NOTICE 'No weights found for product: %, using defaults', p_product_id;
        -- Set default weights if none configured
        v_weight_health := 0.2;
        v_weight_sustainability := 0.2;
        v_weight_brand_loyalty := 0.2;
        v_weight_experimental := 0.2;
        v_weight_income := 0.2;
    ELSE
        -- Extract weights from JSONB
        v_weight_health := COALESCE((v_weights->>'health_consciousness')::DECIMAL(10,4), 0.2);
        v_weight_sustainability := COALESCE((v_weights->>'sustainability_preference')::DECIMAL(10,4), 0.2);
        v_weight_brand_loyalty := COALESCE((v_weights->>'brand_loyalty')::DECIMAL(10,4), 0.2);
        v_weight_experimental := COALESCE((v_weights->>'experimental_food')::DECIMAL(10,4), 0.2);
        v_weight_income := COALESCE((v_weights->>'income_sensitivity')::DECIMAL(10,4), 0.2);
    END IF;
    
    RAISE NOTICE 'Weights - Health: %, Sust: %, Brand: %, Exp: %, Income: %',
        v_weight_health, v_weight_sustainability, v_weight_brand_loyalty, 
        v_weight_experimental, v_weight_income;
    
    -- Calculate max income from all customers (for normalization)
    -- Column name: "Monthly Income"
    -- Handle both numeric and string values in JSONB
    SELECT MAX(
        CASE 
            WHEN jsonb_typeof(customer->'Monthly Income') = 'string' 
            THEN (customer->>'Monthly Income')::DECIMAL(10,4)
            ELSE (customer->'Monthly Income')::DECIMAL(10,4)
        END
    )
    INTO v_max_income
    FROM jsonb_array_elements(v_customer_data) AS customer;
    
    IF v_max_income IS NULL OR v_max_income = 0 THEN
        v_max_income := 100000; -- Default max income to prevent division by zero
    END IF;
    
    RAISE NOTICE 'Max income in dataset: %', v_max_income;
    
    -- Calculate price adjustment factor
    -- Formula: (1 + (1 - LOG(price, 10) / LOG(500, 10)) * 2)
    -- LOG(x, base) = LN(x) / LN(base)
    IF p_price <= 0 THEN
        v_price_adjustment := 1.0;
    ELSE
        v_price_adjustment := 1.0 + (1.0 - (LN(p_price) / LN(10.0)) / (LN(500.0) / LN(10.0))) * 2.0;
    END IF;
    
    RAISE NOTICE 'Price adjustment factor: %', v_price_adjustment;
    
    -- Delete existing probabilities for this team-product combination
    DELETE FROM customer_purchase_probabilities
    WHERE game_id = p_game_id 
        AND team_id = p_team_id 
        AND product_id = p_product_id;
    
    -- Iterate through each customer and calculate probability
    v_row_index := 0;
    FOR v_customer IN SELECT * FROM jsonb_array_elements(v_customer_data)
    LOOP
        -- Extract customer attributes using correct column names
        -- Handle both numeric and string values in JSONB
        
        -- Health Consciousness (1-10 scale)
        v_health := COALESCE(
            CASE 
                WHEN jsonb_typeof(v_customer->'Health Consciousness') = 'string' 
                THEN (v_customer->>'Health Consciousness')::DECIMAL(10,4)
                ELSE (v_customer->'Health Consciousness')::DECIMAL(10,4)
            END, 5.0);
        
        -- Sustainability Preference (1-10 scale)
        v_sustainability := COALESCE(
            CASE 
                WHEN jsonb_typeof(v_customer->'Sustainability Preference') = 'string' 
                THEN (v_customer->>'Sustainability Preference')::DECIMAL(10,4)
                ELSE (v_customer->'Sustainability Preference')::DECIMAL(10,4)
            END, 5.0);
        
        -- Brand Loyalty (1-10 scale)
        v_brand_loyalty := COALESCE(
            CASE 
                WHEN jsonb_typeof(v_customer->'Brand Loyalty') = 'string' 
                THEN (v_customer->>'Brand Loyalty')::DECIMAL(10,4)
                ELSE (v_customer->'Brand Loyalty')::DECIMAL(10,4)
            END, 5.0);
        
        -- Interest in Experimental Food (1-10 scale)
        v_experimental := COALESCE(
            CASE 
                WHEN jsonb_typeof(v_customer->'Interest in Experimental Food') = 'string' 
                THEN (v_customer->>'Interest in Experimental Food')::DECIMAL(10,4)
                ELSE (v_customer->'Interest in Experimental Food')::DECIMAL(10,4)
            END, 5.0);
        
        -- Monthly Income (actual value)
        v_income := COALESCE(
            CASE 
                WHEN jsonb_typeof(v_customer->'Monthly Income') = 'string' 
                THEN (v_customer->>'Monthly Income')::DECIMAL(10,4)
                ELSE (v_customer->'Monthly Income')::DECIMAL(10,4)
            END, 50000.0);
        
        -- Normalize income (divide by max income)
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
        
        -- Insert calculated probability
        INSERT INTO customer_purchase_probabilities (
            game_id,
            team_id,
            customer_data_set_id,
            customer_row_index,
            product_id,
            probability
        ) VALUES (
            p_game_id,
            p_team_id,
            v_customer_data_set_id,
            v_row_index,
            p_product_id,
            v_probability
        );
        
        v_row_index := v_row_index + 1;
    END LOOP;
    
    RAISE NOTICE 'Successfully calculated purchase probabilities for % customers', v_row_index;
END;
$$;

COMMENT ON FUNCTION calculate_purchase_probabilities IS 
'Calculates purchase probability for all customers based on:
- Customer attributes from active dataset (Health, Sustainability, Brand Loyalty, Experimental Food, Monthly Income)
- Product-specific weights from game configuration
- Price adjustment factor using logarithmic formula
Formula: MAX(0, MIN(100, weighted_sum * 100 * price_adjustment))';
