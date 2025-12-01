# Funding Stage Progression Implementation

## Overview
Implemented dynamic funding stage progression system where teams advance through funding stages (Pre-Seed → Seed → Series A → Series B → Series C) based on admin-configurable revenue thresholds from the Investment Amount Configuration table.

## Funding Stage Flow

### Stage Progression
1. **Pre-Seed** (Starting Stage)
   - No threshold to enter
   - Teams start here by default
   
2. **Seed**
   - Threshold: Revenue ≥ Seed Mean (from Investment Config)
   - Additional: Demand ≥ 1,000 units
   - Additional: Successful R&D tests ≥ 1

3. **Series A**
   - Threshold: Revenue ≥ Series A Mean (from Investment Config)
   - Additional: Demand ≥ 1,500 units
   - Additional: Successful R&D tests ≥ 2

4. **Series B**
   - Threshold: Revenue ≥ Series B Mean (from Investment Config)
   - Additional: Demand ≥ 2,000 units
   - Additional: Successful R&D tests ≥ 3

5. **Series C** (Final Stage)
   - Threshold: Revenue ≥ Series C Mean (from Investment Config)
   - Additional: Demand ≥ 2,500 units
   - Additional: Successful R&D tests ≥ 5

## Changes Made

### 1. Game Calculations Engine (`lib/game-calculations.ts`)

#### New Interfaces
```typescript
export interface InvestmentStage {
  mean: number          // Revenue threshold for advancing to this stage
  sd: number
  sd_percent: number
  main_ratio: number
  bonus_ratio: number
  bonus_multiplier: number  // Applied to bonus when advancing from this stage
}

export interface InvestmentConfig {
  seed: InvestmentStage
  series_a: InvestmentStage
  series_b: InvestmentStage
  series_c: InvestmentStage
}
```

#### Updated Functions

**determineFundingStatus()**
- Now accepts `InvestmentConfig` parameter
- Uses admin-configured `Mean` values as revenue thresholds
- Checks if team qualifies to advance to next funding stage
- Returns:
  - `status`: 'pass' or 'fail'
  - `qualifiesForNextStage`: Boolean indicating stage advancement
  - `bonus`: Calculated using stage's `bonus_multiplier`
  - `nextStage`: Name of the next funding stage (if advancing)

**calculateWeeklyResults()**
- Accepts `investment_config` and `current_funding_stage` parameters
- Passes team's current stage and total successful tests to `determineFundingStatus()`
- Returns:
  - `next_funding_stage`: New stage name if team advanced
  - `funding_advanced`: Boolean indicating if stage changed

**getStageConfig()** (Helper)
- Maps funding stage names to investment config keys
- Returns stage-specific configuration

### 2. API Routes

#### Advance Week Route (`app/api/advance-week/route.ts`)
- Fetches both `rnd_tier_config` and `investment_config` from `game_settings`
- Passes team's current `funding_stage` to calculations
- Updates team's `funding_stage` field if advancement occurs
- Logs funding stage progression in console

#### Calculate Weekly Route (`app/api/calculate-weekly/route.ts`)
- Fetches `investment_config` along with RND config
- Passes current funding stage and successful test count to calculations

### 3. Database Schema
Uses existing `teams.funding_stage` column:
- Type: TEXT
- Default: 'Pre-Seed'
- Stores current funding stage name

## How It Works

### Configuration (Admin)
Admin sets Investment Amount Configuration:
```
Funding Stage | Mean     | SD      | SD% | Main Ratio | Bonus Ratio | Bonus Multiplier
Seed         | ฿50,000  | ฿10,000 | 20% | 0.7        | 0.3         | 1.5×
Series A     | ฿200,000 | ฿40,000 | 20% | 0.7        | 0.3         | 2.0×
Series B     | ฿500,000 | ฿100,000| 20% | 0.7        | 0.3         | 2.5×
Series C     | ฿1,000,000| ฿200,000| 20% | 0.7        | 0.3         | 3.0×
```

### Week Execution
1. Student submits decisions (week 1, Pre-Seed stage)
2. Admin advances week
3. System calculates weekly results:
   - Revenue: ฿180,000
   - Demand: 1,200 units
   - Successful R&D tests: 2 (total)
4. System checks advancement criteria:
   ```
   Current Stage: Pre-Seed
   Next Stage Target: Seed
   
   Requirements for Seed:
   ✓ Revenue ฿180,000 ≥ ฿50,000 (Seed Mean)
   ✓ Demand 1,200 ≥ 1,000
   ✓ R&D Tests 2 ≥ 1
   
   Result: ADVANCE TO SEED! 
   Bonus: ฿180,000 × 0.05 × 1.5 = ฿13,500
   ```
5. Team's funding_stage updated: Pre-Seed → Seed
6. Next week calculations will use Seed as current stage

### Progression Example

**Week 1-3: Pre-Seed Stage**
- Team builds revenue slowly
- Conducts R&D tests
- Current: ฿45,000 revenue → Stay in Pre-Seed

**Week 4: Advancement to Seed**
- Revenue: ฿180,000
- Demand: 1,200 units  
- Successful R&D: 2 tests
- ✅ Meets all Seed requirements → **ADVANCE TO SEED**
- Bonus earned: ฿13,500 (using bonus_multiplier 1.5×)

**Week 5-8: Seed Stage**
- Team continues growing
- Target: Series A (needs ฿200,000 revenue)
- Current: ฿195,000 → Stay in Seed

**Week 9: Advancement to Series A**
- Revenue: ฿350,000
- Demand: 1,800 units
- Successful R&D: 3 tests
- ✅ Meets all Series A requirements → **ADVANCE TO SERIES A**
- Bonus earned: ฿35,000 (using bonus_multiplier 2.0×)

...and so on through Series B and Series C.

## Threshold Logic

The system uses the **Mean** value from Investment Amount Configuration as the revenue threshold:

```typescript
// Pre-Seed → Seed
if (revenue >= investmentConfig.seed.mean) {
  // Check other requirements (demand, R&D tests)
  // If all met, advance to Seed
}

// Seed → Series A
if (revenue >= investmentConfig.series_a.mean) {
  // Advance to Series A
}

// Series A → Series B
if (revenue >= investmentConfig.series_b.mean) {
  // Advance to Series B
}

// Series B → Series C
if (revenue >= investmentConfig.series_c.mean) {
  // Advance to Series C
}
```

## Bonus Calculation

When advancing stages, bonus uses the **current stage's** bonus multiplier:

```typescript
// Advancing from Pre-Seed to Seed
bonus = revenue × 0.05 × investmentConfig.seed.bonus_multiplier
// Example: ฿180,000 × 0.05 × 1.5 = ฿13,500

// Advancing from Seed to Series A  
bonus = revenue × 0.05 × investmentConfig.series_a.bonus_multiplier
// Example: ฿350,000 × 0.05 × 2.0 = ฿35,000
```

## Admin Controls

Admin can adjust difficulty by modifying Mean values:

**Easier Game** (Lower Thresholds)
```
Seed:      ฿30,000
Series A:  ฿100,000
Series B:  ฿300,000
Series C:  ฿600,000
```

**Harder Game** (Higher Thresholds)
```
Seed:      ฿100,000
Series A:  ฿500,000
Series B:  ฿1,500,000
Series C:  ฿3,000,000
```

## Console Logging

The advance-week route logs funding progression:

```
✅ Calculated results for Team Alpha:
  revenue: 180000
  costs: 95000
  profit: 85000
  current_stage: Pre-Seed
  new_stage: Seed
  funding_advanced: true
```

## Benefits

1. **Configurability**: Admin controls progression difficulty via Mean values
2. **Transparency**: Teams can see funding requirements in Investment Config
3. **Progression Tracking**: Clear path from Pre-Seed to Series C
4. **Motivation**: Stage advancement provides sense of achievement
5. **Realism**: Mirrors real startup funding lifecycle
6. **Rewards**: Higher bonus multipliers for advanced stages

## Testing Checklist

- [x] Teams start at Pre-Seed stage by default
- [x] Revenue threshold uses admin-configured Mean values
- [x] Stage advances when all requirements met (revenue, demand, R&D tests)
- [x] Bonus calculation uses stage-specific bonus_multiplier
- [x] Team's funding_stage field updates in database
- [x] Stage progression logged in console
- [x] Teams cannot skip stages (must progress sequentially)
- [x] Series C is final stage (no advancement beyond)
- [ ] Admin can modify Mean values and see effect on progression
- [ ] Student can see their current funding stage in UI
- [ ] Leaderboard shows team funding stages

## Future Enhancements

1. **UI Display**: Show current funding stage in student dashboard
2. **Stage Indicators**: Visual badges for each funding stage
3. **Progression Timeline**: Chart showing stage advancement over weeks
4. **Stage Benefits**: Different perks at each funding level
5. **Investment Events**: Special bonuses when advancing stages
6. **Notifications**: Alert teams when they advance to new stage
