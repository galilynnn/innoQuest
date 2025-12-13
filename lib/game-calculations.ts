import { createClient } from '@/lib/supabase/server'

export interface Product {
  id: number
  demand_multiplier: number
  margin_percentage: number
}

export interface RndTier {
  tier: string
  success_rate: number
  cost: number
}

// Admin-configurable R&D tier config interface
export interface RndTierConfig {
  basic: {
    min_cost: number
    max_cost: number
    success_min: number
    success_max: number
    multiplier_min: number
    multiplier_max: number
  }
  standard: {
    min_cost: number
    max_cost: number
    success_min: number
    success_max: number
    multiplier_min: number
    multiplier_max: number
  }
  advanced: {
    min_cost: number
    max_cost: number
    success_min: number
    success_max: number
    multiplier_min: number
    multiplier_max: number
  }
  premium: {
    min_cost: number
    max_cost: number
    success_min: number
    success_max: number
    multiplier_min: number
    multiplier_max: number
  }
}

// Admin-configurable investment/funding stage config interface
export interface InvestmentStage {
  mean: number
  sd: number
  sd_percent: number
  main_ratio: number
  bonus_ratio: number
  bonus_multiplier: number
  // Advancement requirements (admin-configurable)
  expected_revenue: number  // Revenue threshold to advance to this stage
  demand: number            // Demand threshold to advance to this stage
  rd_count: number          // R&D test count threshold to advance to this stage
}

export interface InvestmentConfig {
  seed: InvestmentStage
  series_a: InvestmentStage
  series_b: InvestmentStage
  series_c: InvestmentStage
}

// Base product data - exact replicas of Excel game parameters
const PRODUCTS: Record<number, Product> = {
  1: { id: 1, demand_multiplier: 0.8, margin_percentage: 0.65 },
  2: { id: 2, demand_multiplier: 0.9, margin_percentage: 0.55 },
  3: { id: 3, demand_multiplier: 0.6, margin_percentage: 0.70 },
  4: { id: 4, demand_multiplier: 0.7, margin_percentage: 0.75 },
  5: { id: 5, demand_multiplier: 0.85, margin_percentage: 0.50 },
  6: { id: 6, demand_multiplier: 0.75, margin_percentage: 0.60 },
  7: { id: 7, demand_multiplier: 0.65, margin_percentage: 0.72 },
  8: { id: 8, demand_multiplier: 0.95, margin_percentage: 0.45 },
  9: { id: 9, demand_multiplier: 0.70, margin_percentage: 0.68 },
  10: { id: 10, demand_multiplier: 0.75, margin_percentage: 0.70 },
}

const RND_TIERS: Record<string, RndTier> = {
  basic: { tier: 'basic', success_rate: 0.7, cost: 5000 },
  standard: { tier: 'standard', success_rate: 0.8, cost: 15000 },
  advanced: { tier: 'advanced', success_rate: 0.9, cost: 35000 },
  premium: { tier: 'premium', success_rate: 0.95, cost: 60000 },
}

export interface WeeklyCalculationInput {
  product_id: number
  set_price: number
  rnd_tier?: string
  analytics_purchased: boolean
  analytics_quantity?: number // Number of analytics tools purchased
  population_size?: number // Admin-configured market population size
  cost_per_analytics?: number // Admin-configured cost per analytics tool
  current_customer_count: number
  rnd_multiplier: number
  rnd_tier_config?: RndTierConfig // Admin-configured R&D tier settings
  investment_config?: InvestmentConfig // Admin-configured investment/funding settings
  avg_purchase_probability?: number // Average purchase probability from products table
  current_funding_stage?: string // Team's current funding stage
  successful_rnd_tests?: number // Team's total successful R&D tests
  bonus_multiplier_pending?: number | null // Admin-granted bonus multiplier for this week
  cumulative_rnd_multiplier?: number // Cumulative product of all past successful R&D multipliers (stacks over time)
}

export interface WeeklyCalculationResult {
  demand: number
  revenue: number
  rnd_cost: number
  analytics_cost: number
  total_costs: number
  profit: number
  rnd_tested: boolean
  rnd_success: boolean
  pass_fail_status: string
  bonus: number
  rnd_success_probability?: number // Actual rolled success probability
  rnd_multiplier?: number // Actual rolled multiplier
  next_funding_stage?: string // New funding stage if advanced
  funding_advanced?: boolean // Whether funding stage advanced this week
  bonus_multiplier_applied?: number | null // Bonus multiplier that was applied this week
  new_cumulative_rnd_multiplier: number // Updated cumulative multiplier to store in teams table
}

/**
 * Calculate weekly demand based on average purchase probability
 * Formula: demand = (population_size × avg_probability) / 100
 * The avg_probability comes from customer_purchase_probabilities table (percentage 0-100)
 * 
 * Example:
 * - If avg_probability = 0.5 (0.5%), population = 10000
 * - demand = (0.5 × 10000) / 100 = 50 units
 * 
 * - If avg_probability = 50 (50%), population = 10000  
 * - demand = (50 × 10000) / 100 = 5,000 units
 */
export function calculateDemand(
  avgPurchaseProbability: number = 0.5,  // Percentage (0-100), default 0.5%
  populationSize: number = 10000
): number {
  // avgPurchaseProbability is a percentage (0-100), so multiply by population and divide by 100
  const demand = Math.round((avgPurchaseProbability * populationSize) / 100)

  return Math.max(0, demand)
}

/**
 * Calculate revenue based on demand and price
 * Returns 0 if price is 0 or negative
 */
export function calculateRevenue(demand: number, price: number): number {
  if (price <= 0) {
    return 0
  }
  return demand * price
}

/**
 * Calculate COGS (Cost of Goods Sold) based on revenue and product margin
 */
export function calculateCOGS(revenue: number, productId: number): number {
  const product = PRODUCTS[productId]
  if (!product) throw new Error(`Invalid product ID: ${productId}`)

  return revenue * (1 - product.margin_percentage)
}

/**
 * Process R&D test with success probability using admin-configured ranges
 */
export function processRndTest(
  rndTier: string,
  tierConfig?: RndTierConfig
): { 
  success: boolean
  multiplier: number
  cost: number
  successProbability: number
} {
  let cost: number
  let successProbability: number
  let successMultiplier: number
  let failureMultiplier: number

  if (tierConfig && tierConfig[rndTier as keyof RndTierConfig]) {
    // Use admin-configured ranges
    const config = tierConfig[rndTier as keyof RndTierConfig]
    
    // Randomize cost within range
    cost = Math.round(config.min_cost + Math.random() * (config.max_cost - config.min_cost))
    
    // Randomize success probability within range (convert percentage to decimal)
    successProbability = (config.success_min + Math.random() * (config.success_max - config.success_min)) / 100
    
    // Randomize multipliers within range (convert percentage to decimal)
    successMultiplier = (config.multiplier_min + Math.random() * (config.multiplier_max - config.multiplier_min)) / 100
    failureMultiplier = 1.0 // If R&D fails, no multiplier effect (1.0 = no change)
  } else {
    // No R&D tier config provided - admin must configure in game settings
    throw new Error(`R&D tier configuration not found. Admin must set R&D Tier Configuration in game settings.`)
  }

  const success = Math.random() < successProbability
  const multiplier = success ? successMultiplier : failureMultiplier

  return { success, multiplier, cost, successProbability }
}

/**
 * Determine pass/fail status and funding stage progression based on admin-configured thresholds
 */
export function determineFundingStatus(
  revenue: number,
  demand: number,
  successfulRndTests: number,
  currentFundingStage: string,
  investmentConfig?: InvestmentConfig
): { status: string; qualifiesForNextStage: boolean; bonus: number; nextStage?: string } {
  let bonus = 0
  let qualifiesForNextStage = false
  let nextStage: string | undefined

  // Investment config must be provided by admin - no fallback
  if (!investmentConfig) {
    throw new Error(`Investment configuration not found. Admin must set Investment Configuration in game settings.`)
  }

  // Use admin-configured advancement requirements (expected_revenue, demand, rd_count)
  // These are set by admin in game configuration
  // If not set by admin, expected_revenue falls back to 'mean' (backward compatibility)
  // demand and rd_count default to 0 if not configured (admin must set these)
  const thresholds: Record<string, { revenue: number; demand: number; rdTests: number }> = {
    'Pre-Seed': { revenue: 0, demand: 0, rdTests: 0 }, // Pre-seed has no threshold (starting stage)
    'Seed': { 
      revenue: investmentConfig.seed.expected_revenue ?? investmentConfig.seed.mean, 
      demand: investmentConfig.seed.demand ?? 0, 
      rdTests: investmentConfig.seed.rd_count ?? 0 
    },
    'Series A': { 
      revenue: investmentConfig.series_a.expected_revenue ?? investmentConfig.series_a.mean, 
      demand: investmentConfig.series_a.demand ?? 0, 
      rdTests: investmentConfig.series_a.rd_count ?? 0 
    },
    'Series B': { 
      revenue: investmentConfig.series_b.expected_revenue ?? investmentConfig.series_b.mean, 
      demand: investmentConfig.series_b.demand ?? 0, 
      rdTests: investmentConfig.series_b.rd_count ?? 0 
    },
    'Series C': { 
      revenue: investmentConfig.series_c.expected_revenue ?? investmentConfig.series_c.mean, 
      demand: investmentConfig.series_c.demand ?? 0, 
      rdTests: investmentConfig.series_c.rd_count ?? 0 
    },
  }

  const threshold = thresholds[currentFundingStage]
  
  if (!threshold) {
    // Unknown stage, return fail
    return { status: 'fail', qualifiesForNextStage: false, bonus: 0 }
  }

  // Check if team meets requirements to advance to next stage
  const stageOrder = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C']
  const currentIndex = stageOrder.indexOf(currentFundingStage)
  
  if (currentIndex >= 0 && currentIndex < stageOrder.length - 1) {
    const nextStageName = stageOrder[currentIndex + 1]
    const nextThreshold = thresholds[nextStageName]
    
    if (
      revenue >= nextThreshold.revenue &&
      demand >= nextThreshold.demand &&
      successfulRndTests >= nextThreshold.rdTests
    ) {
      qualifiesForNextStage = true
      nextStage = nextStageName
      
      // Calculate bonus based on current stage config
      const bonusMultiplier = investmentConfig 
        ? getStageConfig(currentFundingStage, investmentConfig)?.bonus_multiplier || 1.5
        : 1.5
      
      bonus = Math.round(revenue * 0.05 * bonusMultiplier)
      return { status: 'pass', qualifiesForNextStage, bonus, nextStage }
    }
  }

  // Check if team meets current stage requirements (pass but don't advance)
  if (
    revenue >= threshold.revenue &&
    demand >= threshold.demand &&
    successfulRndTests >= threshold.rdTests
  ) {
    return { status: 'pass', qualifiesForNextStage: false, bonus: 0 }
  }

  return { status: 'fail', qualifiesForNextStage: false, bonus: 0 }
}

/**
 * Helper function to get stage configuration from investment config
 */
function getStageConfig(stage: string, config: InvestmentConfig): InvestmentStage | null {
  const stageMap: Record<string, keyof InvestmentConfig> = {
    'Seed': 'seed',
    'Series A': 'series_a',
    'Series B': 'series_b',
    'Series C': 'series_c',
  }
  
  const configKey = stageMap[stage]
  return configKey ? config[configKey] : null
}

/**
 * Complete weekly calculation - main entry point
 */
export function calculateWeeklyResults(input: WeeklyCalculationInput): WeeklyCalculationResult {
  // Calculate demand
  let rndMultiplier = 1.0
  let rndTested = false
  let rndSuccess = false
  let rndCost = 0
  let rndSuccessProbability: number | undefined
  let actualRndMultiplier: number | undefined

  if (input.rnd_tier) {
    rndTested = true
    const { success, multiplier, cost, successProbability } = processRndTest(
      input.rnd_tier,
      input.rnd_tier_config
    )
    rndSuccess = success
    rndMultiplier = multiplier
    rndCost = cost
    rndSuccessProbability = successProbability * 100 // Convert back to percentage for display
    actualRndMultiplier = multiplier
  }

  // Calculate demand using average purchase probability from products_info table
  // IMPORTANT: Use nullish coalescing (??) not logical OR (||) because 0 is a valid probability value
  // When price is very high, probabilities are correctly 0, and we should use 0, not fallback to 0.5
  const avgPurchaseProbability = input.avg_purchase_probability ?? 0.5
  const populationSize = input.population_size || 10000
  
  console.log(`💰 ===== REVENUE CALCULATION (Single Test) =====`)
  console.log(`📊 Step 1 - Calculate Base Demand:`, {
    formula: '(population_size × avg_probability) / 100',
    avg_probability: avgPurchaseProbability,
    population_size: populationSize,
    calculation: `(${populationSize} × ${avgPurchaseProbability}) / 100`
  })
  const baseDemand = calculateDemand(avgPurchaseProbability, populationSize)
  console.log(`✅ Base Demand Result: ${baseDemand} units`)
  
  // Apply CUMULATIVE R&D multiplier first (stacks from all past successful R&D)
  let demand = baseDemand
  const cumulativeMultiplier = input.cumulative_rnd_multiplier || 1.0
  if (cumulativeMultiplier !== 1.0) {
    const demandBeforeCumulative = demand
    demand = Math.round(demand * cumulativeMultiplier)
    console.log(`📈 Step 1.5 - Apply CUMULATIVE R&D Multiplier (from past weeks):`, {
      cumulative_multiplier: cumulativeMultiplier,
      demand_before: demandBeforeCumulative,
      demand_after: demand,
      calculation: `${demandBeforeCumulative} × ${cumulativeMultiplier} = ${demand}`
    })
  }
  
  // Apply CURRENT WEEK R&D multiplier (if R&D was done this week)
  if (rndTested) {
    const demandBeforeMultiplier = demand
    demand = Math.round(demand * rndMultiplier)
    console.log(`🔬 Step 1.6 - Apply CURRENT WEEK R&D Multiplier:`, {
      rnd_success: rndSuccess,
      multiplier: rndMultiplier,
      demand_before: demandBeforeMultiplier,
      demand_after: demand,
      calculation: `${demandBeforeMultiplier} × ${rndMultiplier} = ${demand}`
    })
  }
  
  // Apply admin-granted bonus multiplier to demand (if present)
  // NOTE: This multiplier affects DEMAND only, NOT Balance Awards (one-time use)
  const bonusMultiplierApplied = input.bonus_multiplier_pending || null
  if (bonusMultiplierApplied !== null && bonusMultiplierApplied > 0) {
    const demandBeforeBonus = demand
    demand = Math.round(demand * bonusMultiplierApplied)
    console.log(`🎁 Step 1.7 - Apply Admin Bonus Multiplier (one-time):`, {
      bonus_multiplier: bonusMultiplierApplied,
      demand_before: demandBeforeBonus,
      demand_after: demand,
      calculation: `${demandBeforeBonus} × ${bonusMultiplierApplied} = ${demand}`
    })
  }
  
  console.log(`📊 Step 2 - Calculate Revenue:`, {
    formula: 'demand × price',
    demand: demand,
    price: input.set_price,
    calculation: `${demand} × ${input.set_price}`
  })
  const revenue = calculateRevenue(demand, input.set_price)
  console.log(`✅ Revenue Result: ฿${revenue.toLocaleString()}`)
  console.log(`💰 ==========================================`)
  
  // Calculate costs - NO operating cost, only R&D and analytics
  const costPerAnalytics = input.cost_per_analytics || 5000
  const analyticsQuantity = input.analytics_quantity || 0
  const analyticsCost = analyticsQuantity > 0 ? costPerAnalytics * analyticsQuantity : 0

  const totalCosts = rndCost + analyticsCost
  
  // Profit is NEGATIVE (expense deduction from balance)
  // Balance change = -totalCosts (no revenue added to balance)
  // Revenue is only used for milestone advancement criteria, NOT for balance
  let profit = -totalCosts

  // Determine pass/fail status and funding stage progression
  const currentStage = input.current_funding_stage || 'Pre-Seed'
  const totalSuccessfulTests = (input.successful_rnd_tests || 0) + (rndSuccess ? 1 : 0)
  
  const { status: passFail, bonus, qualifiesForNextStage, nextStage } = determineFundingStatus(
    revenue,
    demand,
    totalSuccessfulTests,
    currentStage,
    input.investment_config
  )

  // Calculate new cumulative multiplier for stacking
  // If R&D succeeded this week, multiply current cumulative by this week's multiplier
  let newCumulativeMultiplier = input.cumulative_rnd_multiplier || 1.0
  if (rndSuccess && rndMultiplier > 1.0) {
    newCumulativeMultiplier = newCumulativeMultiplier * rndMultiplier
    console.log(`✅ R&D Success! Stacking multiplier:`, {
      previous_cumulative: input.cumulative_rnd_multiplier || 1.0,
      current_week_multiplier: rndMultiplier,
      new_cumulative: newCumulativeMultiplier,
      calculation: `${input.cumulative_rnd_multiplier || 1.0} × ${rndMultiplier} = ${newCumulativeMultiplier}`
    })
  }

  return {
    demand: demand,
    revenue,
    rnd_cost: rndCost,
    analytics_cost: analyticsCost,
    total_costs: totalCosts,
    profit: profit, // This is always negative (or zero if no costs)
    rnd_tested: rndTested,
    rnd_success: rndSuccess,
    pass_fail_status: passFail,
    bonus,
    rnd_success_probability: rndSuccessProbability,
    rnd_multiplier: actualRndMultiplier,
    next_funding_stage: nextStage,
    funding_advanced: qualifiesForNextStage,
    bonus_multiplier_applied: bonusMultiplierApplied,
    new_cumulative_rnd_multiplier: newCumulativeMultiplier,
  }
}

/**
 * Calculate next funding stage based on performance
 */
export function getNextFundingStage(
  currentStage: string,
  revenue: number,
  successfulRndTests: number
): string {
  const stages = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C']
  const currentIndex = stages.indexOf(currentStage)

  if (currentIndex === -1 || currentIndex === stages.length - 1) {
    return currentStage // Already at max or invalid
  }

  // Simple progression logic - can be made more complex
  if (currentStage === 'Pre-Seed' && revenue >= 100000 && successfulRndTests >= 1) {
    return 'Seed'
  } else if (currentStage === 'Seed' && revenue >= 200000 && successfulRndTests >= 3) {
    return 'Series A'
  } else if (currentStage === 'Series A' && revenue >= 350000 && successfulRndTests >= 6) {
    return 'Series B'
  } else if (currentStage === 'Series B' && revenue >= 600000 && successfulRndTests >= 8) {
    return 'Series C'
  }

  return currentStage
}

/**
 * Calculate balance award using NORMINV formula based on ranking
 * Formula: NORMINV(MAX(MIN((maxTeams - (rank - 1)) / (maxTeams + 1), 0.99), 0.01), mean, SD)
 * 
 * @param rank - The rank of the team (1 = first, 2 = second, etc.)
 * @param maxTeams - Maximum number of teams in the game
 * @param mean - Mean amount from investment config for the milestone stage
 * @param sd - Standard deviation from investment config for the milestone stage
 * @returns The balance award amount
 */
export function calculateBalanceAward(
  rank: number,
  maxTeams: number,
  mean: number,
  sd: number
): number {
  // Calculate the probability value for NORMINV
  // Formula: (maxTeams - (rank - 1)) / (maxTeams + 1)
  // Clamped between 0.01 and 0.99
  const probability = Math.max(
    Math.min((maxTeams - (rank - 1)) / (maxTeams + 1), 0.99),
    0.01
  )

  // Calculate NORMINV (inverse normal distribution)
  // Using approximation: mean + sd * sqrt(2) * erfinv(2*probability - 1)
  // For simplicity, we'll use a standard normal approximation
  const z = approximateNormInv(probability)
  const award = mean + sd * z

  // Ensure award is non-negative
  return Math.max(0, Math.round(award))
}

/**
 * Approximate the inverse normal distribution (NORMINV)
 * Using the Beasley-Springer-Moro algorithm approximation
 */
function approximateNormInv(p: number): number {
  // Clamp p to valid range
  if (p <= 0) return -Infinity
  if (p >= 1) return Infinity
  if (p === 0.5) return 0

  // Constants for approximation
  const a1 = -3.969683028665376e+01
  const a2 = 2.209460984245205e+02
  const a3 = -2.759285104469687e+02
  const a4 = 1.383577518672690e+02
  const a5 = -3.066479806614716e+01
  const a6 = 2.506628277459239e+00

  const b1 = -5.447609879822406e+01
  const b2 = 1.615858368580409e+02
  const b3 = -1.556989798598866e+02
  const b4 = 6.680131188771972e+01
  const b5 = -1.328068155288572e+01

  const c1 = -7.784894002430293e-03
  const c2 = -3.223964580411365e-01
  const c3 = -2.400758277161838e+00
  const c4 = -2.549732539343734e+00
  const c5 = 4.374664141464968e+00
  const c6 = 2.938163982698783e+00

  const d1 = 7.784695709041462e-03
  const d2 = 3.224671290700398e-01
  const d3 = 2.445134137142996e+00
  const d4 = 3.754408661907416e+00

  const pLow = 0.02425
  const pHigh = 1 - pLow

  let q = p - 0.5
  let r: number
  let x: number

  if (Math.abs(q) <= 0.425) {
    r = 0.180625 - q * q
    x = q * (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) /
      (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1)
  } else {
    r = q < 0 ? p : 1 - p
    r = Math.sqrt(-Math.log(r))
    if (r <= 5) {
      r = r - 1.6
      x = (((((c1 * r + c2) * r + c3) * r + c4) * r + c5) * r + c6) /
        ((((d1 * r + d2) * r + d3) * r + d4) * r + 1)
    } else {
      r = r - 5
      x = (((((c1 * r + c2) * r + c3) * r + c4) * r + c5) * r + c6) /
        ((((d1 * r + d2) * r + d3) * r + d4) * r + 1)
    }
    if (q < 0) x = -x
  }

  return x
}
