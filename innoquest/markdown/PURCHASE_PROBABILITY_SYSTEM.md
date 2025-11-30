# Dynamic Purchase Probability Calculation System

## Overview
This system implements the Excel formula for calculating purchase probability per customer based on their attributes, admin-configured weights, and team pricing decisions.

## Excel Formula Implemented
```excel
= MAX(0, MIN(100, 
  ( (E/10)*weight_E + (G/10)*weight_S + (H/10)*weight_B + (F/10)*weight_H + (Income/MAX_Income)*weight_Income ) * 100 
  * (1 + (1 - LOG(price, 10) / LOG(500, 10)) * 2)
))
```

Where:
- **E** = Experimental Food score (0-10)
- **G** = Sustainability score (0-10)  
- **H** = Brand Loyalty score (0-10)
- **F** = Health score (0-10)
- **Income** = Customer income (normalized by MAX income)
- **price** = Product price set by student team

## Database Structure

### 1. `customer_data_sets` Table (Script 18)
Stores uploaded customer CSV files:
- `game_id` - Links to game
- `file_name` - Original CSV filename
- `csv_data` - JSONB containing all customer records
- `is_active` - Boolean flag for active dataset
- `record_count` - Number of customer records

Expected CSV columns:
- Health (H score, 0-10)
- Sustainability (S score, 0-10)
- Brand Loyalty (B score, 0-10)
- Experimental Food (E score, 0-10)
- Income (numerical value)

### 2. `game_settings.product_probability_weights` (Script 13)
Admin-configured weights stored as JSONB per product:
```json
{
  "product-uuid-123": {
    "health_consciousness": 0.25,
    "sustainability_preference": 0.25,
    "brand_loyalty": 0.25,
    "experimental_food": 0.25,
    "income_sensitivity": 0.10,
    "price_sensitivity": 1.0
  }
}
```

### 3. `customer_purchase_probabilities` Table (Script 19)
Stores calculated probabilities for each customer-product-team combination:
- `game_id`, `team_id`, `product_id` - Identifies the context
- `customer_data_set_id` - Links to active dataset
- `customer_row_index` - Row number in CSV (0-based)
- Customer attributes (health, sustainability, brand_loyalty, experimental, income)
- Admin weights (weight_health, weight_sustainability, etc.)
- `product_price` - Price set by team
- `income_normalized` - Customer income / MAX(all incomes)
- `price_adjustment` - Price sensitivity factor
- `purchase_probability` - Final calculated probability (0-100)

## Implementation Components

### 1. PostgreSQL Function (Script 20)
`calculate_purchase_probabilities(p_game_id, p_team_id, p_product_id, p_price)`

**Logic Flow:**
1. Retrieves active customer dataset for the game
2. Gets admin-configured probability weights for the product
3. Calculates MAX income from all customers for normalization
4. Calculates price adjustment factor using logarithmic formula
5. Iterates through each customer:
   - Extracts customer attributes from JSONB
   - Normalizes income (customer_income / max_income)
   - Calculates weighted sum: `(E/10)*w_E + (S/10)*w_S + (B/10)*w_B + (H/10)*w_H + Income_norm*w_Income`
   - Applies price adjustment
   - Clamps result to [0, 100] range
   - Inserts into `customer_purchase_probabilities` table

**Price Adjustment Formula:**
```
price_adjustment = 1 + (1 - LOG(price, 10) / LOG(500, 10)) * 2
```
- Lower prices → Higher adjustment factor → Higher probability
- Higher prices → Lower adjustment factor → Lower probability

### 2. API Endpoint
`POST /api/calculate-probabilities`

**Request Body:**
```json
{
  "game_id": "uuid",
  "team_id": "uuid", 
  "product_id": "uuid",
  "price": 250.50
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully calculated purchase probabilities for 10000 customers",
  "count": 10000
}
```

### 3. Integration in Student Workflow
When students submit weekly decisions:
1. Submit decisions to `weekly_results` table
2. Insert R&D tests to `rnd_tests` table
3. **Call calculate-probabilities API** with:
   - Game ID
   - Team ID (UUID from teams table)
   - Product ID (assigned product)
   - Price (set by student)
4. Display success message

**Location:** `components/student/weekly-decisions.tsx`
- Calculation happens after successful submission
- Non-blocking: If calculation fails, submission still succeeds
- Logs calculation results for debugging

## Usage Flow

### For Admins:
1. **Upload Customer Dataset:**
   - Go to Admin Dashboard → Customer Data Management
   - Upload CSV with required columns
   - System stores in `customer_data_sets` table
   - Mark as active

2. **Configure Probability Weights:**
   - Go to Admin Dashboard → Game Configuration → Product Probability Weights
   - Set weights for each product (H, S, B, E, Income sensitivity)
   - Weights are stored in `game_settings.product_probability_weights`

### For Students:
1. **Set Product Price:**
   - During weekly decisions, set price for assigned product
   - Submit decisions
   - System automatically calculates probabilities for all customers

### For Calculation Results:
- Query `customer_purchase_probabilities` table
- Filter by `game_id`, `team_id`, `product_id`
- Each row represents one customer's probability of purchasing
- Use for market simulation, revenue calculation, etc.

## Database Migration Scripts

Run in order:
1. `13_add_product_probability_weights.sql` - Adds weights column to game_settings
2. `18_create_customer_data_sets_table.sql` - Creates customer data storage
3. `19_create_products_info_table.sql` - Creates probability results table
4. `20_create_calculate_purchase_probability_function.sql` - Creates calculation function

## Example Calculation

**Customer Attributes:**
- Health: 8
- Sustainability: 7
- Brand Loyalty: 6
- Experimental: 9
- Income: 50,000

**Admin Weights:**
- Health: 0.30
- Sustainability: 0.25
- Brand Loyalty: 0.20
- Experimental: 0.15
- Income Sensitivity: 0.10

**Team Price:** $250

**Calculation:**
1. MAX Income = 100,000 → Income Normalized = 50,000 / 100,000 = 0.5
2. Weighted Sum = (9/10)*0.15 + (7/10)*0.25 + (6/10)*0.20 + (8/10)*0.30 + 0.5*0.10
   = 0.135 + 0.175 + 0.120 + 0.240 + 0.050 = 0.72
3. Price Adjustment = 1 + (1 - LOG(250, 10) / LOG(500, 10)) * 2
   = 1 + (1 - 2.398 / 2.699) * 2 = 1 + 0.223 = 1.223
4. Probability = MIN(100, MAX(0, 0.72 * 100 * 1.223)) = MIN(100, 88.06) = **88.06%**

## Notes

- **CSV Column Names:** Must match exactly: "Health", "Sustainability", "Brand Loyalty", "Experimental Food", "Income"
- **Weights Must Sum:** Admin should ensure weights sum appropriately (typically around 1.0 for non-income factors)
- **Price Validation:** Price must be positive; system uses 1.0 as default if price ≤ 0
- **Performance:** Function processes all customers in one transaction; suitable for up to 100K customers
- **Updates:** Recalculation happens when student changes price; old probabilities are deleted and recalculated

## Future Enhancements

1. Add admin interface to view calculated probabilities
2. Create analytics dashboard showing probability distributions
3. Add bulk recalculation for all teams when customer dataset changes
4. Implement caching for frequently accessed probability data
5. Add visualization of probability curves at different price points
