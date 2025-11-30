# Game Logic Review - Issues Found

## 🔴 CRITICAL ISSUE: Demand vs Funding Stage Requirements Mismatch

### Current Situation
- **Team Revenue**: ฿25,000,000
- **Team Demand**: 50 units
- **Funding Stage**: Pre-Seed (should advance to Seed)
- **Blocking Requirement**: Demand >= 1,000 units ❌

### The Problem

#### 1. Demand Calculation
```typescript
// lib/game-calculations.ts:132
export function calculateDemand(
  avgPurchaseProbability: number = 0.5,  // ⚠️ WRONG DEFAULT (should be 50 if percentage)
  populationSize: number = 10000
): number {
  // Comment says "decimal (0-1)" but actual value is 0-100 (percentage)
  const demand = Math.round((avgPurchaseProbability * populationSize) / 100)
  return Math.max(0, demand)
}
```

**Current Flow:**
1. Database stores `purchase_probability` as **0-100 (percentage)**
2. Code calculates: `avgPurchaseProbability = sum / probabilities.length` → **0-100 (percentage)**
3. If avg = 0.5 (0.5%), then: `demand = (0.5 * 10000) / 100 = 50 units` ✓
4. If avg = 50 (50%), then: `demand = (50 * 10000) / 100 = 5,000 units` ✓

**The formula is mathematically correct**, but:
- Default value `0.5` is wrong (should be `50` if it's a percentage)
- Comment is misleading (says decimal 0-1, but it's actually 0-100)

#### 2. Funding Stage Requirements
```typescript
// lib/game-calculations.ts:232
'Seed': { 
  revenue: investmentConfig.seed.mean,  // e.g., 250,000 ✓
  demand: 1000,  // ⚠️ TOO HIGH given demand calculation
  rdTests: 1  // ✓
}
```

**Problem**: With typical purchase probabilities (0.5-5%), demand will be 50-500 units, which is **impossible to reach 1,000 units** without:
- Very high purchase probabilities (10%+)
- Very large population (100,000+)
- Or both

### Root Cause Analysis

**Scenario 1: Low Purchase Probability (0.5%)**
- avgPurchaseProbability = 0.5
- demand = (0.5 * 10000) / 100 = **50 units**
- Revenue = 50 * 500,000 = **25,000,000** ✓ (meets revenue requirement)
- But demand = 50 < 1,000 ❌ (fails demand requirement)

**Scenario 2: High Purchase Probability (10%)**
- avgPurchaseProbability = 10
- demand = (10 * 10000) / 100 = **1,000 units** ✓
- Revenue = 1000 * 250,000 = **250,000,000** ✓

**The issue**: Teams can achieve high revenue through high prices, but demand stays low due to low purchase probability. The demand requirement (1,000) is **too restrictive** for the current demand calculation formula.

---

## 🔧 PROPOSED FIXES

### Option 1: Adjust Demand Requirements (RECOMMENDED)
Make demand requirements more realistic based on actual demand calculation:

```typescript
const thresholds: Record<string, { revenue: number; demand: number; rdTests: number }> = {
  'Pre-Seed': { revenue: 0, demand: 0, rdTests: 0 },
  'Seed': { 
    revenue: investmentConfig.seed.mean, 
    demand: 50,  // Changed from 1000 to 50 (more realistic)
    rdTests: 1 
  },
  'Series A': { 
    revenue: investmentConfig.series_a.mean, 
    demand: 100,  // Changed from 1500 to 100
    rdTests: 2 
  },
  'Series B': { 
    revenue: investmentConfig.series_b.mean, 
    demand: 200,  // Changed from 2000 to 200
    rdTests: 3 
  },
  'Series C': { 
    revenue: investmentConfig.series_c.mean, 
    demand: 500,  // Changed from 2500 to 500
    rdTests: 5 
  },
}
```

### Option 2: Fix Demand Calculation Formula
If demand should be higher, change the formula:

```typescript
export function calculateDemand(
  avgPurchaseProbability: number = 50,  // Fixed: default to 50 (percentage)
  populationSize: number = 10000
): number {
  // Convert percentage to decimal, then calculate
  const probabilityDecimal = avgPurchaseProbability / 100  // 50% → 0.5
  const demand = Math.round(probabilityDecimal * populationSize)  // 0.5 * 10000 = 5000
  return Math.max(0, demand)
}
```

**This would give:**
- If avg = 0.5%: demand = (0.5/100) * 10000 = **50 units** (same)
- If avg = 50%: demand = (50/100) * 10000 = **5,000 units** (much higher!)

### Option 3: Remove Demand Requirement
If demand is not a meaningful metric for advancement:

```typescript
'Seed': { 
  revenue: investmentConfig.seed.mean,
  demand: 0,  // Remove demand requirement
  rdTests: 1
}
```

---

## 📊 OTHER ISSUES FOUND

### Issue 2: Inconsistent Default Value
- `calculateDemand` default: `0.5` (implies 0.5%)
- But comment says "decimal (0-1)" which is confusing
- **Fix**: Change default to `50` and update comment

### Issue 3: Revenue Can Be High Despite Low Demand
- Team can set very high price (500,000) to get high revenue (25M)
- But demand stays low (50 units) due to price sensitivity
- This creates a disconnect: high revenue but can't advance due to low demand

**Question**: Should revenue OR demand be the primary advancement metric?

---

## ✅ RECOMMENDATION

**I recommend Option 1** (Adjust Demand Requirements) because:
1. The demand calculation formula is mathematically correct
2. The requirements are just too high for realistic scenarios
3. It's the simplest fix (just change threshold numbers)
4. It maintains the game balance (still requires some demand growth)

**Alternative**: If you want higher demand, use **Option 2** to fix the formula, but this will significantly change game balance.

---

## 🧪 TESTING CHECKLIST

After fixing, verify:
- [ ] Teams can advance from Pre-Seed to Seed with realistic demand
- [ ] Revenue requirements still make sense
- [ ] R&D test requirements are achievable
- [ ] Milestone achievements are recorded correctly
- [ ] Balance awards are calculated properly

