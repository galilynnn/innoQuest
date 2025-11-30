-- Add product_probability_weights column to store probability calculation weights for each product
-- Stores Health (H), Sustainability (S), Brand Loyalty (B), Experimental Food (E), Income Sensitivity, Price Sensitivity (λ)

ALTER TABLE game_settings 
ADD COLUMN IF NOT EXISTS product_probability_weights JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN game_settings.product_probability_weights IS 'Probability calculation weights for each product';

-- Example structure (will be populated via admin UI):
-- {
--   "luxury-gourmet-box": {
--     "health_consciousness": 0.25,
--     "sustainability_preference": 0.25,
--     "brand_loyalty": 0.20,
--     "experimental_food": 0.20,
--     "income_sensitivity": 0.10,
--     "price_sensitivity": 1.0
--   },
--   "plant-based-protein-pack": {
--     ...
--   }
-- }
