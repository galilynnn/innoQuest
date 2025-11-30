# Fix Revenue Showing as 0

## Problem
Revenue is showing as 0 in both student decision history and admin live monitoring because the `products` table is missing the `purchase_probability` column needed for demand calculations.

## Solution
Run the SQL migration to add the `purchase_probability` column to the existing `products` table.

## Steps to Fix

### Option 1: Run via Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Create a new query
4. Copy and paste the contents of `scripts/17_create_products_info_table.sql`
5. Click "Run" to execute the migration

### Option 2: Run via Command Line
If you have your Supabase credentials set up:
```bash
node scripts/run-migration.js scripts/17_create_products_info_table.sql
```

## How It Works

After this migration runs:

1. **purchase_probability column added** to products table with values (0.5-0.75) for each product
2. **Demand calculation** = avg(purchase_probability) × 10,000 × (population_size / 10,000)
   - With default data, avg ≈ 0.6, so demand ≈ 6,000 units
3. **Revenue** = demand × set_price
   - Example: 6,000 × ฿150 = ฿900,000

## Expected Results

After running the migration and admin advances the week:

- **Decision History** will show actual revenue values (e.g., ฿900,000)
- **Live Monitoring** will display team revenues instead of ฿0
- **Balance** will update correctly based on: Balance = Previous Balance + (Revenue - Costs)

## Customizing Purchase Probabilities

You can update the purchase probabilities later via SQL:

```sql
UPDATE products 
SET purchase_probability = 0.8 
WHERE product_id = 'P001';
```

Or you can build an admin UI to manage these values.

## Testing

1. Students submit decisions with a price (e.g., ฿150)
2. Admin advances the week
3. Check weekly_results table:
   ```sql
   SELECT team_id, week_number, demand, revenue, costs, profit 
   FROM weekly_results 
   ORDER BY week_number DESC 
   LIMIT 10;
   ```
4. Revenue should now show actual values instead of 0
