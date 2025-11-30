# Revenue Calculation Fix - Complete Guide

## Current Problem
Website shows revenue of $2,500 and $2,950 instead of expected $5,712,785 and $550,865.

## Root Cause Analysis

### Why Revenue is Wrong
1. **Demand calculation is using default probability (0.5)**
   - Formula: `(0.5 × 10,000) / 100 = 50 units`
   - Player 1: 50 units × $50 = $2,500 ❌
   - Player 2: 59 units × $50 = $2,950 ❌

2. **Expected demand should come from customer probabilities**
   - Player 1: 9,454.82 units × $50 = $472,741.24 (before multiplier) ✅
   - Player 2: 9,336.70 units × $59 = $550,865.53 ✅

### Why Probabilities Are Not Being Used
The `customer_purchase_probabilities` table is either:
- Empty (no probabilities calculated)
- Has wrong product_id format (TEXT vs UUID mismatch) ✅ FIXED

## Fixes Applied

### 1. Fixed Product ID Type Mismatch ✅
**File:** `scripts/21_update_probability_calculation_dynamic.sql`
- Changed function parameter from TEXT to UUID
- Fixed JSONB lookup: `product_probability_weights -> p_product_id::text`

**File:** `app/api/advance-week/route.ts`
- Changed query to use UUID: `.eq('product_id', team.assigned_product_id)`
- Added detailed logging to debug probability queries

### 2. Enhanced Logging ✅
Added console logs to track:
- Query parameters (game_id, team_id, product_id)
- Query results (count, sample data)
- Probability calculation (sum, average)

## Required Actions

### Step 1: Update Database Function
Run in Supabase SQL Editor:
```sql
-- File: scripts/21_update_probability_calculation_dynamic.sql
```

This recreates the function to accept UUID instead of TEXT.

### Step 2: Calculate Probabilities for All Teams
After students submit their decisions with prices, run:
```sql
-- For each team, after they set their price:
SELECT * FROM calculate_purchase_probabilities(
  'game-uuid-here'::UUID,
  'team-uuid-here'::UUID,
  'product-uuid-here'::UUID,
  50.00  -- price set by team
);
```

Or use the API (automatically called when students submit):
```
POST /api/calculate-probabilities
{
  "game_id": "uuid",
  "team_id": "uuid", 
  "product_id": "uuid",
  "price": 50
}
```

### Step 3: Verify Probability Data
Check that probabilities exist:
```sql
SELECT 
  team_id,
  product_id,
  COUNT(*) as customer_count,
  AVG(probability) as avg_probability
FROM customer_purchase_probabilities
WHERE game_id = 'your-game-id'
GROUP BY team_id, product_id;
```

Expected result:
- Each team should have ~100-1000 rows (one per customer)
- avg_probability should be 80-100 (percentage)

### Step 4: Test Advance Week
1. Students submit decisions with prices
2. Check browser console for: "✅ Purchase probabilities calculated"
3. Admin advances week
4. Check server logs for: "✅ Calculated avg purchase probability"
5. Verify demand and revenue are correct

## Expected Flow

### Student Submission
1. Student sets price: $50
2. Submits decision
3. API calls `/api/calculate-probabilities`
4. Function calculates probability for all 1000 customers
5. Stores results in `customer_purchase_probabilities`

### Admin Advance Week
1. Admin clicks "Advance Week"
2. API queries `customer_purchase_probabilities`
3. Calculates average: e.g., 94.548%
4. Calculates demand: `(94.548 × 10,000) / 100 = 9,454.8 units`
5. Calculates revenue: `9,454.8 × $50 = $472,741`
6. Applies multiplier if R&D passed

## Debugging Checklist

### If Revenue Still Wrong
1. **Check console logs when student submits:**
   ```
   ✅ Purchase probabilities calculated: { count: 1000 }
   ```
   If not shown → probability calculation failed

2. **Check server logs when admin advances:**
   ```
   ✅ Calculated avg purchase probability: { 
     count: 1000, 
     avgProbability: 94.548 
   }
   ```
   If count is 0 → probabilities not stored or wrong query

3. **Check database directly:**
   ```sql
   SELECT COUNT(*) FROM customer_purchase_probabilities
   WHERE game_id = 'your-game-id';
   ```
   Should show 1000+ rows per team

4. **Check product_id matches:**
   ```sql
   SELECT DISTINCT product_id 
   FROM customer_purchase_probabilities
   WHERE game_id = 'your-game-id';
   
   SELECT assigned_product_id 
   FROM teams 
   WHERE game_id = 'your-game-id';
   ```
   UUIDs should match!

## Formula Reference

### Correct Formula Chain
1. **Weighted Sum** (per customer):
   ```
   weighted_sum = (H/10 × wH) + (S/10 × wS) + (B/10 × wB) + (E/10 × wE) + (Income_norm × wI)
   ```

2. **Price Adjustment**:
   ```
   price_adj = 1 + (1 - LOG(price, 10) / LOG(500, 10)) × 2
   ```

3. **Probability** (per customer):
   ```
   probability = MAX(0, MIN(100, weighted_sum × 100 × price_adj))
   ```

4. **Average Probability** (all customers):
   ```
   avg_prob = SUM(all probabilities) / customer_count
   ```

5. **Demand**:
   ```
   demand = (avg_prob × population) / 100
   ```

6. **Revenue**:
   ```
   revenue = demand × price
   ```

7. **Final Revenue** (with multiplier):
   ```
   final_revenue = revenue × multiplier
   ```

## Test Data Validation

### Player 1 (Luxury Gourmet Meal, $50)
- Expected avg_probability: ~94.548%
- Expected demand: 9,454.82 units
- Expected revenue: $472,741.24
- With 12.0844x multiplier: $5,712,785.41 ✅

### Player 2 (Budget Convenience Meal, $59)
- Expected avg_probability: ~93.367%
- Expected demand: 9,336.70 units  
- Expected revenue: $550,865.53
- With 1x multiplier: $550,865.53 ✅
