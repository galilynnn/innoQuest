# Diagnostic Checklist for N/A Values in R&D Reports

## Problem
Pass Prob and Multiplier columns showing "N/A%" in student Reports & Analytics

## Root Cause Analysis
The values `rnd_success_probability` and `rnd_multiplier` are NULL in the database because:
1. Admin hasn't configured R&D Tier Configuration in game settings, OR
2. Admin hasn't configured Investment Configuration in game settings, OR
3. The advance-week API is throwing an error during calculation

## Step 1: Check Game Settings Configuration

Run this SQL query in Supabase SQL Editor:

```sql
SELECT 
  game_id,
  rnd_tier_config,
  investment_config,
  population_size,
  cost_per_analytics
FROM game_settings
WHERE game_id = '00000000-0000-0000-0000-000000000001';
```

### Expected Results:
- `rnd_tier_config` should be a JSON object with keys: `standard`, `premium`, `advanced`
- `investment_config` should be a JSON object with keys: `seed`, `series_a`, `series_b`, `series_c`
- Both should NOT be NULL

### If NULL:
Admin MUST configure these in the Admin Dashboard → Game Configuration tab before advancing weeks.

## Step 2: Check Current Weekly Results

Run this SQL query:

```sql
SELECT 
  id,
  week_number,
  rnd_tier,
  rnd_success,
  rnd_cost,
  rnd_success_probability,
  rnd_multiplier,
  revenue,
  demand
FROM weekly_results
WHERE team_id = '6fe01742-4f7c-4230-a6f2-c9b226c5245f'
ORDER BY week_number;
```

### Expected Results:
- If values are NULL, calculations failed
- If values exist, check browser console for display issues

## Step 3: Check Browser Console Logs

When admin clicks "Next Week", check browser console (F12) for these logs:

### Success Pattern:
```
⚙️ Game Configuration Loaded: {
  has_rnd_tier_config: true,
  has_investment_config: true,
  ...
}
🎯 Calculation input for [Team Name]: { ... }
💰 Calculation results for [Team Name]: {
  rnd_success_probability: 65,
  rnd_multiplier: 1.15,
  ...
}
✅ Calculated results for [Team Name]: { ... }
```

### Failure Pattern:
```
⚙️ Game Configuration Loaded: {
  has_rnd_tier_config: false,  <-- PROBLEM!
  rnd_config_keys: 'NONE',
  ...
}
❌ Calculation failed for [Team Name]: R&D tier configuration not found. Admin must set R&D Tier Configuration in game settings.
```

## Step 4: Fix the Issue

### If configs are missing:
1. Go to Admin Dashboard
2. Click "Game Configuration" tab
3. Scroll to "R&D Tier Configuration" section
4. Fill in ALL tiers (standard, premium, advanced) with:
   - Min/Max Cost
   - Success Min/Max (percentage)
   - Multiplier Min/Max (percentage)
5. Scroll to "Investment Configuration" section
6. Fill in ALL stages (Seed, Series A, B, C) with Min/Mean/Max values
7. Click "Update Configuration"
8. Verify in Supabase that values are saved
9. Try "Next Week" again

### If configs exist but still showing N/A:
1. Check browser console for specific error message
2. Verify products_info table has purchase_probability column
3. Check if weekly_results table has the calculated columns (rnd_success_probability, rnd_multiplier)

## Step 5: Verify Fix

After admin configures and clicks "Next Week":
1. Check console logs show successful calculations
2. Run SQL query to verify database values are populated
3. Refresh student page to see values displayed

## Common Issues

### Issue: "products_info table not found"
**Solution**: Create products_info table or check table name spelling

### Issue: "team_id column not found"
**Solution**: Already fixed (changed from teams_id to team_id)

### Issue: Calculations work but display shows N/A
**Solution**: Check student-reports.tsx is using correct column names and data types
