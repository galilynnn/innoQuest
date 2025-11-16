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
  current_customer_count: number
  rnd_multiplier: number
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
}

/**
 * Calculate weekly demand based on price, product characteristics, and R&D multiplier
 * Replicates Excel formula: BaseDemand * ProductMultiplier * PriceMultiplier * RnDMultiplier
 */
export function calculateDemand(
  productId: number,
  setPrice: number,
  rndMultiplier: number = 1.0
): number {
  const product = PRODUCTS[productId]
  if (!product) throw new Error(`Invalid product ID: ${productId}`)

  const baseMarketSize = 3000
  const priceMultiplier = Math.max(0.5, Math.min(1.5, setPrice / 99)) // Price elasticity
  const demand = Math.round(baseMarketSize * product.demand_multiplier * priceMultiplier * rndMultiplier)

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
 * Process R&D test with success probability
 */
export function processRndTest(rndTier: string): { success: boolean; multiplier: number } {
  const tier = RND_TIERS[rndTier]
  if (!tier) throw new Error(`Invalid R&D tier: ${rndTier}`)

  const success = Math.random() < tier.success_rate
  const multiplier = success ? 1.25 : 0.8 // Success multiplies demand by 1.25, failure reduces by 0.2

  return { success, multiplier }
}

/**
 * Determine pass/fail status based on revenue threshold and demand
 */
export function determineFundingStatus(
  revenue: number,
  demand: number,
  successfulRndTests: number,
  currentFundingStage: string
): { status: string; qualifiesForNextStage: boolean; bonus: number } {
  let bonus = 0
  let qualifiesForNextStage = false

  // Revenue thresholds per funding stage
  const thresholds: Record<string, { revenue: number; demand: number; rdTests: number }> = {
    'Pre-Seed': { revenue: 100000, demand: 1000, rdTests: 0 },
    Seed: { revenue: 200000, demand: 1500, rdTests: 1 },
    'Series A': { revenue: 350000, demand: 2000, rdTests: 3 },
    'Series B': { revenue: 600000, demand: 2500, rdTests: 6 },
    'Series C': { revenue: 1000000, demand: 3000, rdTests: 8 },
  }

  const threshold = thresholds[currentFundingStage]

  if (
    revenue >= threshold.revenue &&
    demand >= threshold.demand &&
    successfulRndTests >= threshold.rdTests
  ) {
    qualifiesForNextStage = true
    bonus = Math.round(revenue * 0.05) // 5% bonus for passing

    return { status: 'pass', qualifiesForNextStage, bonus }
  }

  return { status: 'fail', qualifiesForNextStage: false, bonus: 0 }
}

/**
 * Complete weekly calculation - main entry point
 */
export function calculateWeeklyResults(input: WeeklyCalculationInput): WeeklyCalculationResult {
  // Calculate demand
  let rndMultiplier = 1.0
  let rndTested = false
  let rndSuccess = false

  if (input.rnd_tier) {
    rndTested = true
    const { success, multiplier } = processRndTest(input.rnd_tier)
    rndSuccess = success
    rndMultiplier = multiplier
  }

  const demand = calculateDemand(input.product_id, input.set_price, rndMultiplier)
  const revenue = calculateRevenue(demand, input.set_price)
  const cogs = calculateCOGS(revenue, input.product_id)
  const operatingCost = calculateOperatingCosts(demand)
  const rndCost = input.rnd_tier ? RND_TIERS[input.rnd_tier].cost : 0
  const analyticsCost = input.analytics_purchased ? 2000 : 0

  const totalCosts = cogs + operatingCost + rndCost + analyticsCost
  const profit = revenue - totalCosts

  // Determine pass/fail status
  const { status: passFail, bonus } = determineFundingStatus(
    revenue,
    demand,
    0, // Will be updated separately
    'Seed'
  )

  return {
    demand,
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
