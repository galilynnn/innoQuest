# R&D Calculation Logic Implementation

## Overview
Implemented dynamic R&D (Research & Development) calculation system that uses admin-configurable ranges instead of hardcoded values. When students select an R&D tier, the system now randomizes cost, success probability, and multiplier within the ranges set by the admin.

## Changes Made

### 1. Database Schema (`scripts/11_add_rnd_calculated_fields.sql`)
Added new columns to `weekly_results` table to store calculated R&D values:
- `rnd_success_probability` (DECIMAL 5,2): Actual rolled success probability percentage (0-100)
- `rnd_multiplier` (DECIMAL 5,2): Actual multiplier applied to demand
- `rnd_cost` (DECIMAL 15,2): Actual cost of R&D test (randomized from tier config)

### 2. Game Calculations Engine (`lib/game-calculations.ts`)

#### New Interface
```typescript
export interface RndTierConfig {
  basic: { min_cost, max_cost, success_min, success_max, multiplier_min, multiplier_max }
  standard: { ... }
  advanced: { ... }
  premium: { ... }
}
```

#### Updated Functions

**processRndTest()**
- Now accepts optional `RndTierConfig` parameter
- Randomizes cost between `min_cost` and `max_cost`
- Randomizes success probability between `success_min` and `success_max` (percentages)
- Randomizes multiplier between `multiplier_min` and `multiplier_max` (percentages)
- Returns: `{ success, multiplier, cost, successProbability }`
- Falls back to hardcoded values if no config provided

**calculateWeeklyResults()**
- Accepts `rnd_tier_config` in input parameter
- Passes config to `processRndTest()`
- Returns calculated values including `rnd_success_probability` and `rnd_multiplier`
- Uses randomized cost instead of hardcoded tier cost

### 3. API Routes

#### Calculate Weekly Route (`app/api/calculate-weekly/route.ts`)
- Fetches `rnd_tier_config` from `game_settings` table
- Passes config to `calculateWeeklyResults()`
- Handles JSONB to TypeScript conversion

#### Advance Week Route (`app/api/advance-week/route.ts`)
- Imports `calculateWeeklyResults` from game calculations
- Fetches `rnd_tier_config` for the game
- For each team with submitted decisions:
  - Loads their `weekly_results` record
  - Runs calculations using admin-configured ranges
  - Updates `weekly_results` with calculated values:
    - `demand`, `revenue`, `costs`, `profit`
    - `rnd_success`, `rnd_cost`
    - `rnd_success_probability`, `rnd_multiplier`
    - `pass_fail_status`, `bonus_earned`
  - Updates team balance and successful test count
- Logs detailed calculation results

### 4. Student Reports (`components/student/student-reports.tsx`)

#### New Interface
```typescript
interface WeeklyResult {
  // ... existing fields ...
  rnd_cost?: number
  rnd_success_probability?: number
  rnd_multiplier?: number
}
```

#### Display Logic
- **Pass Prob**: Shows actual rolled percentage if available, otherwise shows range
  - Example: `27.3%` (if calculated) or `15-35%` (if not calculated)
- **Test Cost**: Uses actual `rnd_cost` from database
- **Multiplier**: Shows actual rolled multiplier percentage
  - Example: `112%` for a successful basic test

## How It Works

### Configuration (Admin)
1. Admin sets R&D tier ranges in Game Configuration:
   - **Basic**: Cost ฿30k-50k, Success 15-35%, Multiplier 100-120%
   - **Standard**: Cost ฿60k-100k, Success 45-60%, Multiplier 115-135%
   - **Advanced**: Cost ฿110k-160k, Success 65-85%, Multiplier 130-160%
   - **Premium**: Cost ฿170k-200k, Success 75-95%, Multiplier 150-180%

### Student Submission
1. Student selects R&D tier (e.g., "Standard")
2. Submits decisions without knowing exact values
3. Record stored in `weekly_results` with tier name only

### Week Advancement (Calculation)
1. Admin clicks "Advance Week"
2. System loads `rnd_tier_config` from database
3. For each team's decision:
   - Randomizes cost: e.g., ฿60,000 + random(40,000) = ฿87,342
   - Randomizes success prob: e.g., 45% + random(15%) = 52.7%
   - Rolls dice: random() < 0.527 → determines pass/fail
   - Randomizes multiplier: e.g., 115% + random(20%) = 128.3%
   - Applies multiplier to demand calculation
   - Calculates revenue, costs, profit
4. Stores all calculated values in `weekly_results`
5. Updates team balance

### Student Views Results
1. Student sees actual rolled values in reports:
   - Test Cost: ฿87,342 (the exact cost paid)
   - Pass Prob: 52.7% (the exact probability rolled)
   - Test Result: ✓ Pass (the outcome)
   - Multiplier: 128% (the exact multiplier applied)

## Example Calculation Flow

```
Admin Config (Standard Tier):
- Cost Range: ฿60,000 - ฿100,000
- Success Range: 45% - 60%
- Multiplier Range: 115% - 135%

Student Selects: Standard Tier

System Calculates:
- Roll cost: ฿60,000 + (0.687 × ฿40,000) = ฿87,480
- Roll success: 45% + (0.512 × 15%) = 52.68%
- Roll dice: 0.342 < 0.5268 → PASS ✓
- Roll multiplier: 115% + (0.734 × 20%) = 129.68%
- Apply to demand: base_demand × 1.2968 = increased demand
- Calculate revenue: demand × price
- Calculate costs: COGS + operating + ฿87,480 + analytics
- Calculate profit: revenue - costs

Student Sees:
- Test Cost: ฿87,480
- Pass Prob: 52.7%
- Test Result: ✓ Pass
- Multiplier: 130%
```

## Migration Required

Run the migration script to add new columns:
```sql
-- Run this in Supabase SQL Editor or via migration
ALTER TABLE weekly_results 
ADD COLUMN IF NOT EXISTS rnd_success_probability DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS rnd_multiplier DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS rnd_cost DECIMAL(15,2);
```

## Benefits

1. **Configurability**: Admin can adjust game difficulty by changing ranges
2. **Randomness**: Each test has unique values, preventing predictability
3. **Transparency**: Students see exact values that were used
4. **Fairness**: All teams use same ranges, ensuring equal opportunity
5. **Realism**: Simulates real-world R&D uncertainty
6. **No Cheating**: All calculations happen server-side during week advancement

## Testing Checklist

- [ ] Run migration script to add database columns
- [ ] Admin can configure R&D tier ranges in Game Configuration
- [ ] Student can select R&D tier and submit decisions
- [ ] Admin can advance week and calculations run
- [ ] Weekly results show calculated values (cost, probability, multiplier)
- [ ] Student reports display actual rolled values instead of ranges
- [ ] Team balance updates correctly based on calculated profit
- [ ] Successful test count increments only on pass
- [ ] Values fall within admin-configured min/max ranges
