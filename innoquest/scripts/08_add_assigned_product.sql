-- Add assigned_product_id column for admin to assign products to teams
-- Students will no longer be able to pick their own products

ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS assigned_product_id UUID REFERENCES products(id);

-- Update existing teams to use selected_product_id as assigned_product_id
UPDATE teams 
SET assigned_product_id = selected_product_id 
WHERE selected_product_id IS NOT NULL;

-- Comment for clarity
COMMENT ON COLUMN teams.assigned_product_id IS 'Product assigned by admin - students cannot change this';
COMMENT ON COLUMN teams.selected_product_id IS 'Legacy column - kept for backward compatibility';
