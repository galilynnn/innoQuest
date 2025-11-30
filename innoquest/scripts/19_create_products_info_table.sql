-- Create customer_purchase_probabilities table to store calculated purchase probability per customer per product
-- This table stores the result of the Excel formula calculation for each customer-product combination
CREATE TABLE IF NOT EXISTS customer_purchase_probabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL,
    team_id UUID NOT NULL,
    customer_data_set_id UUID NOT NULL, -- Links to active customer dataset
    customer_row_index INTEGER NOT NULL, -- Row number from CSV (0-based index)
    product_id UUID NOT NULL,
    
    -- Customer attributes (from CSV)
    customer_health DECIMAL(10,4) NOT NULL, -- H score (0-10)
    customer_sustainability DECIMAL(10,4) NOT NULL, -- S score (0-10)
    customer_brand_loyalty DECIMAL(10,4) NOT NULL, -- B score (0-10)
    customer_experimental DECIMAL(10,4) NOT NULL, -- E score (0-10)
    customer_income DECIMAL(10,4) NOT NULL, -- Income value
    
    -- Admin-configured weights (from game_settings)
    weight_health DECIMAL(10,4) NOT NULL,
    weight_sustainability DECIMAL(10,4) NOT NULL,
    weight_brand_loyalty DECIMAL(10,4) NOT NULL,
    weight_experimental DECIMAL(10,4) NOT NULL,
    weight_income_sensitivity DECIMAL(10,4) NOT NULL,
    
    -- Team decisions
    product_price DECIMAL(10,2) NOT NULL, -- Price set by student team
    
    -- Calculated values
    income_normalized DECIMAL(10,4) NOT NULL, -- customer_income / MAX(all_incomes)
    price_adjustment DECIMAL(10,4) NOT NULL, -- Price sensitivity adjustment factor
    purchase_probability DECIMAL(10,4) NOT NULL, -- Final probability (0-100)
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Ensure one calculation per customer-product-team combination
    UNIQUE(game_id, team_id, customer_row_index, product_id, customer_data_set_id)
);

-- Add indexes for query performance
CREATE INDEX IF NOT EXISTS idx_customer_probabilities_game_team 
    ON customer_purchase_probabilities(game_id, team_id);
    
CREATE INDEX IF NOT EXISTS idx_customer_probabilities_product 
    ON customer_purchase_probabilities(product_id);
    
CREATE INDEX IF NOT EXISTS idx_customer_probabilities_dataset 
    ON customer_purchase_probabilities(customer_data_set_id);

COMMENT ON TABLE customer_purchase_probabilities IS 'Stores calculated purchase probability for each customer-product combination based on Excel formula';
COMMENT ON COLUMN customer_purchase_probabilities.purchase_probability IS 'Final probability (0-100) calculated using: MAX(0,MIN(100, weighted_sum * 100 * price_adjustment))';