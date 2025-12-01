# Balance Calculation Flow - Testing Guide

## How Balance Updates Work

### 1. Student Submits Decisions (Week N)
**File**: `components/student/weekly-decisions.tsx`

Student submits:
- `set_price`: Price per unit
- `rnd_tier`: R&D tier (basic/standard/advanced/premium) or null
- `analytics_quantity`: Number of analytics tools (0+)

Data saved to `weekly_results` table:
```sql
INSERT INTO weekly_results (
  team_id,
  game_id,
  week_number,
  set_price,
  costs,  -- estimated, will be recalculated
  rnd_tier,
  analytics_purchased,
  analytics_quantity,  -- ✅ NOW INCLUDED (was missing before)
  pass_fail_status,
  bonus_earned
)
```

**Balance at this point**: NO CHANGE (still shows initial balance)

---

### 2. Admin Advances Week
**File**: `app/api/advance-week/route.ts`

For each team that submitted decisions:

#### Step A: Fetch avg_purchase_probability
```typescript
SELECT AVG(purchase_probability) FROM products_info
```

#### Step B: Calculate Results
**File**: `lib/game-calculations.ts` → `calculateWeeklyResults()`

1. **Demand** = avg_purchase_probability * (population_size / 10000)
   - If avg_purchase_probability < 10, scale by 10000
   - Otherwise use directly

2. **Revenue** = demand * set_price

3. **COGS** (Cost of Goods Sold) = revenue * (1 - product_margin_percentage)
   - Product margins are 45-75% depending on product

4. **Operating Cost** = 20000 + (demand * 0.5)
   - Fixed base: ฿20,000
   - Variable: ฿0.50 per unit

5. **R&D Cost** = calculated based on tier (if selected)
   - Randomized within admin-configured ranges
   - Success/failure affects profit multiplier

6. **Analytics Cost** = cost_per_analytics * analytics_quantity
   - Default: ฿5,000 per tool

7. **Total Costs** = COGS + Operating + R&D + Analytics

8. **Profit** = revenue - total_costs
   - Capped at minimum -฿10,000 loss

9. **New Balance** = current_balance + profit

#### Step C: Update Database
```sql
UPDATE teams 
SET total_balance = new_balance,
    successful_rnd_tests = new_successful_tests,
    funding_stage = new_funding_stage
WHERE team_id = ?
```

**Balance at this point**: UPDATED IN DATABASE

---

### 3. Student Sees Updated Balance
**File**: `app/student/gameplay/page.tsx`

Realtime subscription listens for updates:
```typescript
supabase
  .channel('gameplay_updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    table: 'teams',
    filter: `team_id=eq.${team.id}`
  }, (payload) => {
    // Update local state with new balance
    setTeam(prev => ({
      ...prev,
      total_balance: payload.new.total_balance
    }))
  })
```

**Balance at this point**: DISPLAYED ON SCREEN (if realtime is enabled)

---

## Testing Checklist

### Prerequisites
1. ✅ Realtime is enabled for `teams` table:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE teams;
```

2. ✅ `products_info` table has data with `purchase_probability` values

3. ✅ `game_settings` has configured:
   - `population_size` (default: 10000)
   - `cost_per_analytics` (default: 5000)

### Test Scenario 1: Simple Revenue Calculation
**Initial Balance**: ฿100,000

**Student Decisions**:
- Price: ฿150
- R&D: None
- Analytics: 0 tools

**Expected Calculation** (assuming avg_purchase_probability = 0.5):
```
Demand = 0.5 * 10000 = 5000 units
Revenue = 5000 * 150 = ฿750,000
COGS = 750,000 * 0.35 = ฿262,500 (assuming 65% margin)
Operating = 20,000 + (5000 * 0.5) = ฿22,500
R&D = ฿0
Analytics = ฿0
Total Costs = ฿285,000
Profit = 750,000 - 285,000 = ฿465,000
New Balance = 100,000 + 465,000 = ฿565,000
```

### Test Scenario 2: With Analytics Tools
**Initial Balance**: ฿100,000

**Student Decisions**:
- Price: ฿150
- R&D: None
- Analytics: 2 tools

**Expected Calculation**:
```
(Same as above, but:)
Analytics = 5,000 * 2 = ฿10,000
Total Costs = 285,000 + 10,000 = ฿295,000
Profit = 750,000 - 295,000 = ฿455,000
New Balance = 100,000 + 455,000 = ฿555,000
```

### Test Scenario 3: With R&D Investment
**Initial Balance**: ฿100,000

**Student Decisions**:
- Price: ฿150
- R&D: Basic tier (~฿30,000-50,000 cost)
- Analytics: 0 tools

**Expected Calculation**:
```
(Same as scenario 1, but:)
R&D = ~฿40,000 (random within range)
Total Costs = 285,000 + 40,000 = ฿325,000
Profit = 750,000 - 325,000 = ฿425,000
New Balance = 100,000 + 425,000 = ฿525,000
```

---

## Debugging

### If balance doesn't update:

1. **Check console logs** in student gameplay page:
   - Should see: "💰 Team balance updated: [new_amount]"

2. **Check database directly**:
```sql
SELECT team_name, total_balance, updated_at 
FROM teams 
WHERE game_id = '[your_game_id]';
```

3. **Check weekly_results table**:
```sql
SELECT team_id, week_number, revenue, costs, profit, demand
FROM weekly_results
WHERE game_id = '[your_game_id]'
ORDER BY week_number DESC;
```

4. **Verify realtime is enabled**:
```sql
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

5. **Check browser console** for realtime connection:
   - Should NOT see "realtime connection failed"
   - Should see subscription established

---

## Recent Fixes Applied

1. ✅ **Added `analytics_quantity` to weekly_results insert**
   - Previously only saved `analytics_purchased` (boolean)
   - Now saves actual quantity for cost calculation

2. ✅ **Fixed analytics cost display**
   - Was hardcoded as ฿2,000
   - Now uses actual `costPerAnalytics` from game_settings

3. ✅ **Reset analytics quantity after submission**
   - Prevents carrying over values to next week

4. ✅ **Fixed login session storage key**
   - Was using `teams_id` but lobby expected `team_id`
   - Now consistent across all pages
