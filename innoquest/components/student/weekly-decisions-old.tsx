'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface TeamData {
  id: string
  team_name: string
  total_balance: number
}

interface GameSettings {
  current_week: number
  total_weeks: number
}

interface WeeklyDecisionsProps {
  team: TeamData
  gameSettings: GameSettings
}

const PRODUCTS = [
  { id: 1, name: 'Organic Meal Kit', category: 'Premium' },
  { id: 2, name: 'Budget Meal Prep', category: 'Budget' },
  { id: 3, name: 'Keto Food Box', category: 'Specialty' },
  { id: 4, name: 'Vegan Options', category: 'Specialty' },
  { id: 5, name: 'Quick Lunch Sets', category: 'Convenience' },
  { id: 6, name: 'Breakfast Bundles', category: 'Convenience' },
  { id: 7, name: 'Family Packages', category: 'Family' },
  { id: 8, name: 'Premium Catering', category: 'Premium' },
  { id: 9, name: 'Seasonal Specials', category: 'Specialty' },
  { id: 10, name: 'Corporate Meals', category: 'B2B' },
]

const RND_TIERS = [
  { tier: 'basic', label: 'Basic', cost: 5000, successRate: 0.7 },
  { tier: 'standard', label: 'Standard', cost: 15000, successRate: 0.8 },
  { tier: 'advanced', label: 'Advanced', cost: 35000, successRate: 0.9 },
  { tier: 'premium', label: 'Premium', cost: 60000, successRate: 0.95 },
]

export default function WeeklyDecisions({ team, gameSettings }: WeeklyDecisionsProps) {
  const supabase = createClient()
  const [selectedProduct, setSelectedProduct] = useState<number>(1)
  const [price, setPrice] = useState<number>(99)
  const [rndTier, setRndTier] = useState<string | null>(null)
  const [analyticsPurchased, setAnalyticsPurchased] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [loading, setLoading] = useState(false)

  // Calculate estimated revenue
  const estimatedDemand = Math.round(3000 * (price / 99) * 0.8)
  const estimatedRevenue = estimatedDemand * price
  const rdCost = rndTier ? RND_TIERS.find((t) => t.tier === rndTier)?.cost || 0 : 0
  const analyticsCost = analyticsPurchased ? 2000 : 0
  const totalCosts = 20000 + rdCost + analyticsCost

  const handleSubmitDecisions = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('weekly_results').insert({
        team_id: team.id,
        week_number: gameSettings.current_week,
        set_price: price,
        demand: estimatedDemand,
        revenue: estimatedRevenue,
        costs: totalCosts,
        profit: estimatedRevenue - totalCosts,
        rnd_tier: rndTier,
        analytics_purchased: analyticsPurchased,
        pass_fail_status: 'pending',
        bonus_earned: 0,
      })

      if (!error) {
        alert('Decisions submitted successfully!')
        setShowConfirmation(false)
        // Reset for next week
        setPrice(99)
        setRndTier(null)
        setAnalyticsPurchased(false)
      }
    } catch (err) {
      alert('Error submitting decisions')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        {/* Product Selection */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-serif font-bold mb-4">1. Select Product</h3>
          <div className="space-y-2">
            {PRODUCTS.map((product) => (
              <button
                key={product.id}
                onClick={() => setSelectedProduct(product.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedProduct === product.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-secondary border-border hover:bg-secondary/80'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{product.name}</span>
                  <span className="text-xs opacity-75">{product.category}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Price Setting */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-serif font-bold mb-4">2. Set Weekly Price</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Price per Unit</label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-serif">$</span>
                <input
                  type="number"
                  min="50"
                  max="200"
                  step="1"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="flex-1 px-4 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Range: $50 - $200</p>
            </div>

            <div className="bg-secondary p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Estimated Demand</p>
              <p className="text-2xl font-bold">{estimatedDemand.toLocaleString()} units</p>
              <p className="text-sm text-muted-foreground mt-2">Estimated Revenue</p>
              <p className="text-2xl font-bold text-primary">${estimatedRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* R&D Investment */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-serif font-bold mb-4">3. R&D Investment (Optional)</h3>
          <div className="space-y-2">
            <button
              onClick={() => setRndTier(null)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                rndTier === null
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary border-border hover:bg-secondary/80'
              }`}
            >
              <span className="font-medium">Skip R&D</span>
            </button>
            {RND_TIERS.map((tier) => (
              <button
                key={tier.tier}
                onClick={() => setRndTier(tier.tier)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  rndTier === tier.tier
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-secondary border-border hover:bg-secondary/80'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{tier.label}</span>
                  <span className="text-sm opacity-75">${tier.cost.toLocaleString()}</span>
                </div>
                <p className="text-xs opacity-75 mt-1">Success Rate: {(tier.successRate * 100).toFixed(0)}%</p>
              </button>
            ))}
          </div>
        </div>

        {/* Analytics & Summary */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-serif font-bold mb-4">4. Additional Options</h3>
          <div className="space-y-4">
            <label className="flex items-center p-3 border border-border rounded-lg cursor-pointer hover:bg-secondary/50">
              <input
                type="checkbox"
                checked={analyticsPurchased}
                onChange={(e) => setAnalyticsPurchased(e.target.checked)}
                className="mr-3"
              />
              <span className="font-medium">Purchase Analytics Tools ($2,000)</span>
            </label>

            <div className="bg-secondary p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Base Operating Costs:</span>
                <span>$20,000</span>
              </div>
              {rndTier && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">R&D Investment:</span>
                  <span>${RND_TIERS.find((t) => t.tier === rndTier)?.cost.toLocaleString()}</span>
                </div>
              )}
              {analyticsPurchased && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Analytics Tools:</span>
                  <span>$2,000</span>
                </div>
              )}
              <div className="border-t border-border pt-2 flex justify-between font-semibold">
                <span>Total Costs:</span>
                <span>${totalCosts.toLocaleString()}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-bold text-lg text-primary">
                <span>Est. Profit:</span>
                <span>${(estimatedRevenue - totalCosts).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setShowConfirmation(true)}
          className="btn-primary flex-1"
        >
          Submit Weekly Decisions
        </button>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-serif font-bold mb-4">Confirm Your Decisions</h3>
            <div className="space-y-3 mb-6 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Product:</span>
                <span className="font-semibold">{PRODUCTS.find((p) => p.id === selectedProduct)?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price:</span>
                <span className="font-semibold">${price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">R&D:</span>
                <span className="font-semibold">
                  {rndTier ? RND_TIERS.find((t) => t.tier === rndTier)?.label : 'None'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Analytics:</span>
                <span className="font-semibold">{analyticsPurchased ? 'Yes' : 'No'}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitDecisions}
                disabled={loading}
                className="flex-1 btn-primary"
              >
                {loading ? 'Submitting...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
