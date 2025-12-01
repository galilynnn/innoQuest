-- Add purchase_probability column to existing products table for demand calculation
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS purchase_probability DECIMAL(10,4) NOT NULL DEFAULT 0.6;

-- Update purchase probabilities for existing products
-- Using reasonable probabilities that represent demand (0-1 scale will be multiplied by 10000)
UPDATE products SET purchase_probability = 0.6 WHERE product_id = 'P001';
UPDATE products SET purchase_probability = 0.7 WHERE product_id = 'P002';
UPDATE products SET purchase_probability = 0.5 WHERE product_id = 'P003';
UPDATE products SET purchase_probability = 0.55 WHERE product_id = 'P004';
UPDATE products SET purchase_probability = 0.65 WHERE product_id = 'P005';
UPDATE products SET purchase_probability = 0.6 WHERE product_id = 'P006';
UPDATE products SET purchase_probability = 0.5 WHERE product_id = 'P007';
UPDATE products SET purchase_probability = 0.75 WHERE product_id = 'P008';
UPDATE products SET purchase_probability = 0.55 WHERE product_id = 'P009';
UPDATE products SET purchase_probability = 0.6 WHERE product_id = 'P010';

-- Add comment
COMMENT ON COLUMN products.purchase_probability IS 'Purchase probability for demand calculations. Avg purchase probability is used to calculate weekly demand.';

