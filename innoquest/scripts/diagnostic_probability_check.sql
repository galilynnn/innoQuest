-- Diagnostic query to check probability calculation details
-- Run this to see what's happening with probabilities

-- 1. Check sample probabilities and their components
SELECT 
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
FROM customer_purchase_probabilities
WHERE game_id = '00000000-0000-0000-0000-000000000001'
  AND team_id = '481a29d2-2638-4dc6-ae1d-341f0826ba42'
LIMIT 5;

-- 2. Check statistics
SELECT 
    COUNT(*) as total_customers,
    AVG(purchase_probability) as avg_probability,
    MIN(purchase_probability) as min_probability,
    MAX(purchase_probability) as max_probability,
    AVG(product_price) as avg_price_used,
    AVG(price_adjustment) as avg_price_adjustment,
    AVG(income_normalized) as avg_income_normalized
FROM customer_purchase_probabilities
WHERE game_id = '00000000-0000-0000-0000-000000000001'
  AND team_id = '481a29d2-2638-4dc6-ae1d-341f0826ba42';

-- 3. Check what price was used
SELECT DISTINCT product_price
FROM customer_purchase_probabilities
WHERE game_id = '00000000-0000-0000-0000-000000000001'
  AND team_id = '481a29d2-2638-4dc6-ae1d-341f0826ba42';

-- 4. Calculate expected demand with this probability
-- Formula: demand = (population_size × avg_probability) / 100
SELECT 
    AVG(purchase_probability) as avg_probability,
    10000 as population_size,
    ROUND((10000 * AVG(purchase_probability)) / 100) as expected_demand
FROM customer_purchase_probabilities
WHERE game_id = '00000000-0000-0000-0000-000000000001'
  AND team_id = '481a29d2-2638-4dc6-ae1d-341f0826ba42';
