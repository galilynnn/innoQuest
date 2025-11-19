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
}

export interface WeeklyCalculationResult {
  demand: number
  revenue: number
  cogs_cost: number
  operating_cost: number
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
}

/**
 * Calculate weekly demand based on average purchase probability
 * Formula: demand = avg_purchase_probability (from products table)
 * The purchase_probability should represent the number of units demanded
 */
export function calculateDemand(
  avgPurchaseProbability: number = 0.5
): number {
  // If avgPurchaseProbability seems to be a decimal (0-1), scale it up to represent actual demand
  // Otherwise use it directly as the demand value
  const demand = avgPurchaseProbability < 10 
    ? Math.round(avgPurchaseProbability * 10000) // Scale up if it's a probability (0-1)
    : Math.round(avgPurchaseProbability) // Use directly if it's already a demand value

  return Math.max(0, demand)
}

/**
 * Calculate revenue based on demand and price
 */
export function calculateRevenue(demand: number, price: number): number {
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
 * Calculate operating costs (base + scalable)
 */
export function calculateOperatingCosts(demand: number): number {
  const baseCost = 20000
  const scalableCost = demand * 0.5 // $0.50 per unit for logistics

  return baseCost + scalableCost
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
    failureMultiplier = 0.8 // Keep failure at 0.8 (can be made configurable later)
  } else {
    // Fallback to hardcoded values if no config provided
    const tier = RND_TIERS[rndTier]
    if (!tier) throw new Error(`Invalid R&D tier: ${rndTier}`)
    
    cost = tier.cost
    successProbability = tier.success_rate
    successMultiplier = 1.25
    failureMultiplier = 0.8
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

  // Default hardcoded thresholds as fallback
  const defaultThresholds: Record<string, { revenue: number; demand: number; rdTests: number }> = {
    'Pre-Seed': { revenue: 100000, demand: 1000, rdTests: 0 },
    'Seed': { revenue: 200000, demand: 1500, rdTests: 1 },
    'Series A': { revenue: 350000, demand: 2000, rdTests: 3 },
    'Series B': { revenue: 600000, demand: 2500, rdTests: 6 },
    'Series C': { revenue: 1000000, demand: 3000, rdTests: 8 },
  }

  // Use admin-configured Mean values as revenue thresholds if available
  const thresholds = investmentConfig ? {
    'Pre-Seed': { revenue: 0, demand: 500, rdTests: 0 }, // Pre-seed has no threshold (starting stage)
    'Seed': { revenue: investmentConfig.seed.mean, demand: 1000, rdTests: 1 },
    'Series A': { revenue: investmentConfig.series_a.mean, demand: 1500, rdTests: 2 },
    'Series B': { revenue: investmentConfig.series_b.mean, demand: 2000, rdTests: 3 },
    'Series C': { revenue: investmentConfig.series_c.mean, demand: 2500, rdTests: 5 },
  } : defaultThresholds

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
  const avgPurchaseProbability = input.avg_purchase_probability || 0.5
  const demand = calculateDemand(avgPurchaseProbability)
  // Apply population size multiplier to demand if provided by admin
  const populationSizeMultiplier = input.population_size ? input.population_size / 10000 : 1 // Default population is 10000
  const adjustedDemand = Math.round(demand * populationSizeMultiplier)
  const revenue = calculateRevenue(adjustedDemand, input.set_price)
  const cogs = calculateCOGS(revenue, input.product_id)
  const operatingCost = calculateOperatingCosts(adjustedDemand)
  const costPerAnalytics = input.cost_per_analytics || 5000
  const analyticsQuantity = input.analytics_quantity || 0
  const analyticsCost = analyticsQuantity > 0 ? costPerAnalytics * analyticsQuantity : 0

  const totalCosts = cogs + operatingCost + rndCost + analyticsCost
  let profit = revenue - totalCosts

  // Apply admin-granted bonus multiplier if present
  const bonusMultiplierApplied = input.bonus_multiplier_pending || null
  if (bonusMultiplierApplied !== null && bonusMultiplierApplied > 0) {
    profit = Math.round(profit * bonusMultiplierApplied)
  }

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

  return {
    demand: adjustedDemand,
    revenue,
    cogs_cost: cogs,
    operating_cost: operatingCost,
    rnd_cost: rndCost,
    analytics_cost: analyticsCost,
    total_costs: totalCosts,
    profit: Math.max(-10000, profit), // Minimum loss capped at -10k
    rnd_tested: rndTested,
    rnd_success: rndSuccess,
    pass_fail_status: passFail,
    bonus,
    rnd_success_probability: rndSuccessProbability,
    rnd_multiplier: actualRndMultiplier,
    next_funding_stage: nextStage,
    funding_advanced: qualifiesForNextStage,
    bonus_multiplier_applied: bonusMultiplierApplied,
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
