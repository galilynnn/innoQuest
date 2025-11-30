# Fix for Probability Calculation Error

## Problem
When students submit decisions, they get error:
```
⚠️ Warning: Failed to calculate probabilities: "Failed to calculate purchase probabilities"
```

## Root Cause
The database function `calculate_purchase_probabilities` was expecting `product_id` as TEXT (like 'P001'), but the API is passing it as UUID (from products.id column).

## Solution
Updated `scripts/21_update_probability_calculation_dynamic.sql` to:
1. Accept `p_product_id` as UUID instead of TEXT
2. Convert UUID to text when looking up weights in JSONB: `p_product_id::text`
3. Drop both old function signatures to ensure clean migration

## Action Required
Run the updated script in Supabase SQL Editor:
```bash
scripts/21_update_probability_calculation_dynamic.sql
```

This will:
- Drop the old function with TEXT parameter
- Create new function with UUID parameter
- Properly handle product_id lookups in JSONB weights

## After Running
Test by:
1. Login as student
2. Submit weekly decisions with a price
3. Check browser console - should see: ✅ Purchase probabilities calculated
4. No more error messages
