# Game Calculation Logic

Complete reference for all game calculations.

## 1. Purchase Probability Calculation

**When:** Calculated when student submits decisions with a price

**Formula:**
```
For each customer:
  income_normalized = customer_income / max_income
  
  weighted_sum = (Health/10) × weight_health +
                 (Sustainability/10) × weight_sustainability +
                 (BrandLoyalty/10) × weight_brand_loyalty +
                 (Experimental/10) × weight_experimental +
                 income_normalized × weight_income
  
  price_adjustment = 1.0 + (1.0 - (LN(price) / LN(500))) × 2.0
  
  purchase_probability = MAX(0, MIN(100, weighted_sum × 100 × price_adjustment))
```

**Price Adjustment Examples:**
- Price = 20: adjustment ≈ 2.04 (boosts probability)
- Price = 50: adjustment ≈ 1.74 (moderate boost)
- Price = 500: adjustment = 1.0 (neutral)
- Price = 10,000,000: adjustment ≈ -2.19 (probabilities become 0)

**Result:** Stored in `customer_purchase_probabilities` table (0-100 percentage)

---

## 2. Demand Calculation

**Formula:**
```
demand = (avg_purchase_probability × population_size) / 100
```

**Where:**
- `avg_purchase_probability` = average of all customer probabilities (0-100%)
- `population_size` = admin-configured market size (default: 10,000)

**Example:**
- avg_probability = 60%, population = 10,000
- demand = (60 × 10,000) / 100 = 6,000 units

---

## 3. Revenue Calculation

**Formula:**
```
revenue = demand × price
```

**Example:**
- demand = 6,000 units, price = 50
- revenue = 6,000 × 50 = 300,000

---

## 4. R&D Cost & Multiplier

**R&D Cost Formula:**
```
R&D cost = tier_cost (random between min_cost and max_cost)
```

**Where:**
- Tier costs are admin-configured per tier (basic, standard, advanced, premium)
- Cost is randomly selected from configured range

**Success Probability:**
```
success_probability = random between success_min and success_max (admin-configured)
```

**Multiplier Logic:**
```
If R&D succeeds:
  multiplier = random between multiplier_min and multiplier_max (admin-configured)
  Apply multiplier to demand: demand = base_demand × multiplier

If R&D fails:
  multiplier = 1.0 (no effect on demand)
```

**Example:**
- Base demand = 6,000 units
- R&D succeeds with multiplier = 1.5
- Final demand = 6,000 × 1.5 = 9,000 units
- Revenue = 9,000 × price (higher than without R&D)

---

## 5. Analytics Cost

**Formula:**
```
analytics_cost = analytics_quantity × cost_per_analytics
```

**Where:**
- `analytics_quantity` = number of analytics tools purchased (0 or more)
- `cost_per_analytics` = admin-configured cost per tool (default: 5,000)

**Example:**
- quantity = 2, cost_per = 5,000
- analytics_cost = 2 × 5,000 = 10,000

---

## 6. Total Costs

**Formula:**
```
total_costs = COGS + operating_cost + rnd_cost + analytics_cost
```

---

## 7. Balance Update

**Formula:**
```
new_balance = current_balance + profit + milestone_awards
```

**Where:**
- `milestone_awards` = calculated when team advances funding stage (see Milestone Awards)

---

## 8. Funding Stage Advancement

**Requirements (all must be met):**
```
For each stage (Seed, Series A, Series B, Series C):
  revenue >= expected_revenue (admin-configured)
  demand >= demand_threshold (admin-configured)
  successful_rnd_tests >= rd_count (admin-configured)
```

**Fallbacks:**
- If `expected_revenue` not set: uses `mean` from investment config
- If `demand` or `rd_count` not set: defaults to 0

**Stages:**
- Pre-Seed → Seed
- Seed → Series A
- Series A → Series B
- Series B → Series C

---

## 9. Milestone Awards (Balance Awards)

**When:** Team reaches a new funding stage

**Ranking:**
- Teams ranked by timestamp of achievement (first to reach = rank 1)

**Award Formula:**
```
probability = (maxTeams - (rank - 1)) / (maxTeams + 1)
probability = MAX(0.01, MIN(0.99, probability))

award = NORMINV(probability, mean, SD)
award = MAX(0, award)
```

**Where:**
- `maxTeams` = admin-configured maximum teams
- `mean` = investment config mean for that stage
- `SD` = investment config standard deviation for that stage

**Distribution:**
- Rank 1 (first): Highest award
- Rank 3 (middle): Award ≈ mean
- Rank 5+ (last): Lower awards

---

## Complete Weekly Calculation Flow

```
1. Student sets price → Calculate purchase probabilities
2. Calculate avg_purchase_probability
3. Calculate base_demand = (avg_prob × population) / 100
4. Process R&D test (if done):
   - Random success/fail based on admin config
   - If success: multiplier = random between multiplier_min and multiplier_max
   - If fail: multiplier = 1.0
5. Apply R&D multiplier: demand = base_demand × multiplier
6. Calculate revenue = demand × price
7. Calculate COGS = revenue × (1 - margin)
8. Calculate operating_cost = base + (demand × 0.5)
9. Calculate rnd_cost (if R&D done)
10. Calculate analytics_cost (if purchased)
11. Calculate total_costs = COGS + operating + rnd + analytics
12. Calculate profit = revenue - total_costs
13. Apply bonus_multiplier (if admin-granted)
14. Update balance = balance + profit
15. Check funding stage advancement requirements
16. If advanced: Calculate and award milestone bonus
17. Update balance = balance + milestone_award
```

---

## Key Admin-Configurable Values

- `population_size`: Market size for demand calculation
- `base_operating_cost`: Fixed weekly operating cost
- `cost_per_analytics`: Cost per analytics tool
- `expected_revenue`: Revenue threshold per funding stage
- `demand`: Demand threshold per funding stage
- `rd_count`: R&D test count threshold per funding stage
- `rnd_tier_config`: R&D tier costs, success rates, multipliers
- `product_probability_weights`: Customer attribute weights per product
- `investment_config`: Mean, SD, and ratios for each funding stage

---

## Notes

- All probabilities are percentages (0-100), not decimals (0-1)
- Demand is dynamic and changes based on price
- Operating cost scales with demand (base + variable)
- Profit has minimum cap of -10,000
- Milestone awards use bell curve distribution (NORMINV)
- Funding advancement requires ALL three criteria (revenue, demand, R&D count)

