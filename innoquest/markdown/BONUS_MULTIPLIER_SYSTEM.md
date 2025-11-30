# Admin-Controlled Bonus Multiplier System

## Overview
Implemented an admin-controlled bonus multiplier system where admins can manually grant bonus multipliers to specific teams via a checkbox in the leaderboard. When granted, the multiplier is applied to the team's profit in the next week's calculation, then automatically cleared.

## How It Works

### Admin Grants Bonus
1. Admin views **Game Leaderboard**
2. Each team has a **"Grant Bonus"** checkbox
3. Admin checks the box for a team
4. System sets `bonus_multiplier_pending = 1.5` for that team
5. Badge shows "1.5× Next Week" under the checkbox

### Week Advances (Bonus Applied)
1. Admin clicks **"Advance Week"**
2. System calculates results for all teams
3. For teams with `bonus_multiplier_pending`:
   - Calculate base profit normally
   - Apply multiplier: `profit = profit × bonus_multiplier_pending`
   - Example: Base profit ฿50,000 × 1.5 = ฿75,000
4. **System automatically clears** `bonus_multiplier_pending` back to `NULL`
5. Team receives boosted profit in their balance
6. Next week, team returns to normal calculations (no bonus)

### One-Time Use
- Bonus is **single-use** per grant
- Admin must check the box again to grant another bonus
- Prevents permanent bonuses
- Encourages strategic admin intervention

## Changes Made

### 1. Database Schema (`scripts/12_add_bonus_multiplier.sql`)
```sql
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS bonus_multiplier_pending DECIMAL(5,2) DEFAULT NULL;
```
- Stores pending bonus multiplier (e.g., 1.5 for 1.5×)
- `NULL` = no bonus pending
- Non-null = bonus will be applied next week

### 2. Leaderboard Component (`components/admin/leaderboard-view.tsx`)

#### New UI Elements
```tsx
<label className="flex items-center gap-2">
  <input
    type="checkbox"
    checked={team.bonus_multiplier_pending !== null}
    onChange={() => handleBonusToggle(team.id, team.bonus_multiplier_pending)}
  />
  <span>Grant Bonus</span>
</label>
{team.bonus_multiplier_pending !== null && (
  <span className="text-green-600">
    {team.bonus_multiplier_pending}× Next Week
  </span>
)}
```

#### New Function: `handleBonusToggle()`
- Toggles bonus on/off
- Checked: Sets `bonus_multiplier_pending = 1.5`
- Unchecked: Sets `bonus_multiplier_pending = NULL`
- Updates database immediately
- Reloads leaderboard to show badge

### 3. Game Calculations (`lib/game-calculations.ts`)

#### Updated Input Interface
```typescript
export interface WeeklyCalculationInput {
  // ... existing fields ...
  bonus_multiplier_pending?: number | null
}
```

#### Updated Result Interface
```typescript
export interface WeeklyCalculationResult {
  // ... existing fields ...
  bonus_multiplier_applied?: number | null
}
```

#### Calculation Logic
```typescript
let profit = revenue - totalCosts

// Apply admin-granted bonus multiplier if present
const bonusMultiplierApplied = input.bonus_multiplier_pending || null
if (bonusMultiplierApplied !== null && bonusMultiplierApplied > 0) {
  profit = Math.round(profit * bonusMultiplierApplied)
}
```

### 4. Advance Week Route (`app/api/advance-week/route.ts`)

#### Pass Bonus to Calculations
```typescript
const calculationInput = {
  // ... other fields ...
  bonus_multiplier_pending: team.bonus_multiplier_pending || null,
}
```

#### Clear Bonus After Use
```typescript
await supabase
  .from('teams')
  .update({
    total_balance: newBalance,
    // ... other fields ...
    bonus_multiplier_pending: null, // CLEAR bonus after applying
  })
  .eq('id', team.id)
```

#### Console Logging
```typescript
console.log(`✅ Calculated results for ${team.team_name}:`, {
  profit: results.profit,
  bonus_multiplier_applied: results.bonus_multiplier_applied,
  // ... other fields ...
})
```

## Usage Example

### Week 1
**Admin Action:**
- Sees Team Alpha struggling
- Checks "Grant Bonus" for Team Alpha
- Badge shows "1.5× Next Week"

**Team Alpha Leaderboard:**
```
#3  Team Alpha
    Funding Stage: Pre-Seed
    Weekly Profit: $25,000
    Total Cash: $85,000
    ☑ Grant Bonus  [1.5× Next Week]
```

### Week 2 (Advance Week)
**System Calculation:**
```
Team Alpha Week 2:
- Base Revenue: $120,000
- Base Costs: $95,000
- Base Profit: $25,000
- Bonus Multiplier: 1.5×
- Final Profit: $25,000 × 1.5 = $37,500 ✨
- New Balance: $85,000 + $37,500 = $122,500
- Bonus cleared: NULL
```

**Console Log:**
```
✅ Calculated results for Team Alpha:
  revenue: 120000
  costs: 95000
  profit: 37500
  bonus_multiplier_applied: 1.5
```

**Team Alpha Leaderboard (After Week 2):**
```
#2  Team Alpha
    Funding Stage: Seed
    Weekly Profit: $37,500
    Total Cash: $122,500
    ☐ Grant Bonus  [no badge - bonus cleared]
```

### Week 3
**Team Alpha:** Returns to normal calculations (no bonus)
- If admin wants to help again, must check the box again

## Admin Controls

### Default Multiplier: 1.5×
```typescript
const newValue = currentValue === null ? 1.5 : null
```

### Customizable Multipliers (Future)
Admin could set custom multiplier values:
- 1.2× = Small boost
- 1.5× = Medium boost (default)
- 2.0× = Large boost
- 2.5× = Emergency rescue

## Strategic Use Cases

### Helping Struggling Teams
- Team falling behind → Grant bonus → Catch up

### Rewarding Good Decisions
- Team makes smart choices → Grant bonus → Incentivize strategy

### Balancing Competition
- Too much gap between leaders → Grant bonus to lower teams

### Creating Drama
- Close race at end → Strategic bonus can shift rankings

### Teaching Moments
- Team makes mistake → Grant bonus → Keep them in the game

## Benefits

1. **Admin Control**: Full discretion over who gets bonuses
2. **Transparency**: Teams see if bonus is pending
3. **One-Time**: Prevents permanent advantages
4. **Flexible**: Can be granted any week
5. **Simple**: Just check a box
6. **Automatic**: Bonus clears itself after use
7. **Logged**: Console shows when bonuses are applied
8. **Fair**: Admin decision is visible to all

## Technical Details

### Checkbox State Management
```typescript
checked={team.bonus_multiplier_pending !== null}
```
- Checked if value is non-null (e.g., 1.5)
- Unchecked if value is null

### Toggle Logic
```typescript
const newValue = currentValue === null ? 1.5 : null
```
- If currently null → Set to 1.5
- If currently 1.5 → Set to null

### Multiplier Application
```typescript
if (bonusMultiplierApplied !== null && bonusMultiplierApplied > 0) {
  profit = Math.round(profit * bonusMultiplierApplied)
}
```
- Only applies if value exists and is positive
- Rounds result to avoid decimal cents

### Auto-Clear Mechanism
```typescript
bonus_multiplier_pending: null
```
- Happens during team update after calculation
- Ensures bonus is single-use
- Admin must re-grant for another bonus

## Migration Required

Run the migration script:
```sql
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS bonus_multiplier_pending DECIMAL(5,2) DEFAULT NULL;
```

## Testing Checklist

- [x] Checkbox appears in leaderboard for each team
- [x] Checking box sets bonus_multiplier_pending to 1.5
- [x] Badge "1.5× Next Week" shows when checked
- [x] Unchecking box clears bonus_multiplier_pending to NULL
- [x] Badge disappears when unchecked
- [x] Bonus multiplier applied to profit during week advance
- [x] Bonus_multiplier_pending cleared to NULL after use
- [x] Console logs show bonus_multiplier_applied value
- [ ] Team receives correct boosted profit in balance
- [ ] Multiple teams can have bonuses simultaneously
- [ ] Bonus only applies once (must re-grant for next use)

## Future Enhancements

1. **Bonus Notifications**: Alert team when they receive bonus
2. **Bonus Display**: Show bonus in student dashboard
3. **Negative Multipliers**: Penalties (0.8×) for rule violations
