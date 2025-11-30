# Purchase Probability Implementation Checklist

## Phase 1: Database Setup

### Step 1: Run Migration Scripts (in order)
Execute these SQL scripts in your Supabase SQL Editor:

- [ ] **Script 18:** `18_create_customer_data_sets_table.sql`
  - Creates table to store uploaded customer CSV files
  - Check: Table `customer_data_sets` exists

- [ ] **Script 19:** `19_create_products_info_table.sql` 
  - Creates table to store calculated probabilities per customer
  - Check: Table `customer_purchase_probabilities` exists

- [ ] **Script 20:** `20_create_calculate_purchase_probability_function.sql`
  - Creates PostgreSQL function to calculate probabilities
  - Check: Function `calculate_purchase_probabilities` exists

### Step 2: Verify Existing Tables
- [ ] Confirm `game_settings` has column `product_probability_weights` (from script 13)
  - If missing, run: `13_add_product_probability_weights.sql`

## Phase 2: Admin Configuration

### Step 3: Configure Product Probability Weights
1. [ ] Go to Admin Dashboard → Game Configuration
2. [ ] Expand "Product Probability Weights" section
3. [ ] For each product, set weights:
   - [ ] Health Consciousness (e.g., 0.25)
   - [ ] Sustainability Preference (e.g., 0.25)
   - [ ] Brand Loyalty (e.g., 0.25)
   - [ ] Experimental Food (e.g., 0.25)
   - [ ] Income Sensitivity (e.g., 0.10)
4. [ ] Save configuration
5. [ ] Verify in database: `SELECT product_probability_weights FROM game_settings WHERE game_id = 'your-game-id'`

### Step 4: Upload Customer Dataset
1. [ ] Go to Admin Dashboard → Customer Data Management
2. [ ] Prepare CSV file with these columns (exact names):
   - `Health` (0-10)
   - `Sustainability` (0-10)
   - `Brand Loyalty` (0-10)
   - `Experimental Food` (0-10)
   - `Income` (numerical value)
3. [ ] Upload CSV file
4. [ ] Verify upload successful (shows record count)
5. [ ] Ensure dataset is marked as "Active"
6. [ ] Check database: `SELECT * FROM customer_data_sets WHERE game_id = 'your-game-id'`

## Phase 3: Testing

### Step 5: Test Student Price Submission
1. [ ] Login as a student
2. [ ] Go to Weekly Decisions
3. [ ] Set a price for your product (e.g., $250)
4. [ ] Submit decisions
5. [ ] Check browser console logs for:
   ```
   📊 Calculating purchase probabilities for price: 250
   ✅ Purchase probabilities calculated: {success: true, count: X}
   ```
6. [ ] Verify in database:
   ```sql
   SELECT COUNT(*) FROM customer_purchase_probabilities 
   WHERE game_id = 'your-game-id' 
   AND team_id = 'your-team-id';
   ```

### Step 6: Verify Probability Calculations
1. [ ] Query a few sample probabilities:
   ```sql
   SELECT 
       customer_row_index,
       customer_health,
       customer_sustainability,
       customer_income,
       product_price,
       purchase_probability
   FROM customer_purchase_probabilities
   WHERE game_id = 'your-game-id'
   LIMIT 10;
   ```
2. [ ] Manually verify one calculation using the formula from `PURCHASE_PROBABILITY_SYSTEM.md`
3. [ ] Check probability values are between 0 and 100

### Step 7: Test Recalculation API (Optional)
1. [ ] Use Postman or curl to test bulk recalculation:
   ```bash
   curl -X POST http://localhost:3000/api/recalculate-all-probabilities \
     -H "Content-Type: application/json" \
     -d '{"game_id": "your-game-id"}'
   ```
2. [ ] Verify response shows teams processed
3. [ ] Check that probabilities were updated for all teams

## Phase 4: Verification

### Step 8: Data Integrity Checks
- [ ] Check no duplicate probabilities:
  ```sql
  SELECT game_id, team_id, customer_row_index, product_id, COUNT(*)
  FROM customer_purchase_probabilities
  GROUP BY game_id, team_id, customer_row_index, product_id
  HAVING COUNT(*) > 1;
  ```
  (Should return 0 rows)

- [ ] Verify all probabilities are valid:
  ```sql
  SELECT MIN(purchase_probability), MAX(purchase_probability)
  FROM customer_purchase_probabilities;
  ```
  (Should be between 0 and 100)

- [ ] Check income normalization:
  ```sql
  SELECT MIN(income_normalized), MAX(income_normalized)
  FROM customer_purchase_probabilities;
  ```
  (Should be between 0 and 1)

### Step 9: Performance Test
- [ ] Upload a large customer dataset (10,000+ records)
- [ ] Submit price as student
- [ ] Measure calculation time in logs
- [ ] Verify all probabilities calculated successfully

## Troubleshooting Guide

### Issue: "No active customer dataset found"
**Solution:** 
1. Go to Customer Data Management
2. Click "Use" on a dataset to mark it active
3. Only one dataset can be active per game

### Issue: "No probability weights configured"
**Solution:**
1. Go to Game Configuration → Product Probability Weights
2. Set weights for the product
3. Save configuration

### Issue: Calculation takes too long
**Solution:**
1. Check customer dataset size
2. Ensure indexes exist on `customer_purchase_probabilities` table
3. Consider running calculations in background job for very large datasets

### Issue: Probabilities seem incorrect
**Solution:**
1. Verify CSV column names match exactly (case-sensitive)
2. Check customer attribute values are 0-10 scale
3. Verify weights sum to reasonable values (≈1.0 for non-income factors)
4. Test price adjustment formula separately

## Post-Implementation

### Step 10: Documentation
- [ ] Update team training materials with new probability system
- [ ] Document CSV format requirements for admins
- [ ] Add probability calculation explanation to student guide

### Step 11: Monitoring
- [ ] Set up alerts for calculation failures
- [ ] Monitor database size growth
- [ ] Track calculation performance over time

### Step 12: Future Enhancements (Optional)
- [ ] Add admin view to see calculated probabilities
- [ ] Create probability distribution visualization
- [ ] Add automatic recalculation when dataset changes
- [ ] Implement probability caching for better performance

## Success Criteria

✅ All migration scripts executed without errors  
✅ Admin can upload and activate customer datasets  
✅ Admin can configure probability weights per product  
✅ Students can submit prices and calculations trigger automatically  
✅ Probabilities are stored correctly in database  
✅ Manual formula verification matches database calculations  
✅ No duplicate or invalid probability records  
✅ System performs well with production-size datasets

## Questions or Issues?

Refer to:
- `PURCHASE_PROBABILITY_SYSTEM.md` - Complete technical documentation
- Console logs - Check browser and server logs for detailed messages
- Database query examples above
