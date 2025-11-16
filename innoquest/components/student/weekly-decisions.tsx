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
  { id: 2, name: 'Budget Meal Prep', category: 'Budget' },
  { id: 1, name: 'Organic Meal Kit', category: 'Premium' },
  { id: 8, name: 'Premium Catering', category: 'Premium' },
  { id: 3, name: 'Keto Food Box', category: 'Specialty' },
  { id: 4, name: 'Vegan Options', category: 'Specialty' },
  { id: 9, name: 'Seasonal Specials', category: 'Specialty' },
  { id: 5, name: 'Quick Lunch Sets', category: 'Convenience' },
  { id: 6, name: 'Breakfast Bundles', category: 'Convenience' },
  { id: 7, name: 'Family Packages', category: 'Family' },
  { id: 10, name: 'Corporate Meals', category: 'B2B' },
]

const RND_TIERS = [
  { 
    tier: 'basic', 
    label: 'Basic', 
    minCost: 30000, 
    maxCost: 50000, 
    successMin: 15, 
    successMax: 35,
    multiplierMin: 100,
    multiplierMax: 120
  },
  { 
    tier: 'standard', 
    label: 'Standard', 
    minCost: 60000, 
    maxCost: 100000, 
    successMin: 45, 
    successMax: 60,
    multiplierMin: 115,
    multiplierMax: 135
  },
  { 
    tier: 'advanced', 
    label: 'Advanced', 
    minCost: 110000, 
    maxCost: 160000, 
    successMin: 65, 
    successMax: 85,
    multiplierMin: 130,
    multiplierMax: 160
  },
  { 
    tier: 'premium', 
    label: 'Premium', 
    minCost: 170000, 
    maxCost: 200000, 
    successMin: 75, 
    successMax: 95,
    multiplierMin: 150,
    multiplierMax: 180
  },
]

const RND_STRATEGIES = [
  { 
    id: 'skip', 
    name: 'Skip this round', 
    description: 'No R&D investment this week. Save resources for later.',
    maxTests: 0
  },
  { 
    id: 'one', 
    name: 'Do R&D 1 time only', 
    description: 'Focus resources on one innovation. Lower cost but single chance.',
    maxTests: 1
  },
  { 
    id: 'two-if-fail', 
    name: 'Do 2 R&Ds (if the 1st one fails)', 
    description: 'Try second innovation only if first fails. Smart backup strategy.',
    maxTests: 2,
    conditional: true
  },
  { 
    id: 'two-always', 
    name: 'Do 2 R&Ds', 
    description: 'Launch both innovations regardless. Maximum innovation potential.',
    maxTests: 2
  },
]

export default function WeeklyDecisions({ team, gameSettings }: WeeklyDecisionsProps) {
  const supabase = createClient()
  const [selectedProduct, setSelectedProduct] = useState<number>(1)
  const [price, setPrice] = useState<number>(99)
  const [rndStrategy, setRndStrategy] = useState<string | null>(null)
  const [rndRound, setRndRound] = useState<number>(0) // Track which R&D round we're in (0 = not started)
  const [rndTier1, setRndTier1] = useState<string | null>(null) // First R&D tier
  const [rndTier2, setRndTier2] = useState<string | null>(null) // Second R&D tier (for 2 R&D strategies)
  const [firstTestFailed, setFirstTestFailed] = useState(false) // Track if first test failed
  const [analyticsPurchased, setAnalyticsPurchased] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [loading, setLoading] = useState(false)

  // Calculate estimated revenue
  const estimatedDemand = Math.round(3000 * (price / 99) * 0.8)
  const estimatedRevenue = estimatedDemand * price
  
  // Calculate R&D cost using average of min and max for both tiers
  const rdCost1 = rndTier1 ? (() => {
    const tier = RND_TIERS.find((t) => t.tier === rndTier1)
    return tier ? (tier.minCost + tier.maxCost) / 2 : 0
  })() : 0
  
  const rdCost2 = rndTier2 ? (() => {
    const tier = RND_TIERS.find((t) => t.tier === rndTier2)
    return tier ? (tier.minCost + tier.maxCost) / 2 : 0
  })() : 0
  
  const rdCost = rdCost1 + rdCost2
  
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
        rnd_strategy: rndStrategy,
        rnd_tier: rndTier1, // Primary tier
        rnd_tier_2: rndTier2, // Secondary tier (if applicable)
        analytics_purchased: analyticsPurchased,
        pass_fail_status: 'pending',
        bonus_earned: 0,
      })

      if (!error) {
        alert('Decisions submitted successfully!')
        setShowConfirmation(false)
        setPrice(99)
        setRndStrategy(null)
        setRndRound(0)
        setRndTier1(null)
        setRndTier2(null)
        setFirstTestFailed(false)
        setAnalyticsPurchased(false)
      }
    } catch (err) {
      alert('Error submitting decisions')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-2 gap-6">
        {/* Product Selection */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-['Poppins'] text-xl font-bold text-black mb-1 flex items-center gap-2">
            <span>📦</span>
            <span>1. Select Product</span>
          </h3>
          <p className="text-sm text-gray-600 mb-4">Choose your product for this week</p>
          <div>
            <label className="block font-['Inter'] font-semibold text-sm text-black mb-2">Product</label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(Number(e.target.value))}
              className="w-full px-4 py-3.5 border-2 border-gray-300 rounded-xl font-['Inter'] text-[15px] text-black bg-white transition-all focus:outline-none focus:border-[#E63946] focus:shadow-lg focus:shadow-[#E63946]/10 focus:-translate-y-0.5 cursor-pointer"
            >
              {PRODUCTS.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.category})
                </option>
              ))}
            </select>
            
            {/* Display selected product info */}
            <div className="mt-4 p-4 bg-gradient-to-br from-[#F5F5F5] to-[#E8D5D0] rounded-xl border-2 border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Selected Product</p>
                  <p className="font-semibold text-lg text-black">
                    {PRODUCTS.find(p => p.id === selectedProduct)?.name}
                  </p>
                </div>
                <span className="text-xs px-3 py-1.5 rounded-lg bg-white text-gray-700 border border-gray-300 font-semibold">
                  {PRODUCTS.find(p => p.id === selectedProduct)?.category}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Price Setting */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-['Poppins'] text-xl font-bold text-black mb-1 flex items-center gap-2">
            <span>💰</span>
            <span>2. Set Weekly Price</span>
          </h3>
          <p className="text-sm text-gray-600 mb-4">Adjust pricing to maximize profit</p>
          <div className="space-y-4">
            <div>
              <label className="block font-['Inter'] font-semibold text-sm text-black mb-2">Price per Unit</label>
              <div className="relative flex items-center">
                <span className="absolute left-4 font-semibold text-gray-600 text-base">$</span>
                <input
                  type="number"
                  min="50"
                  max="200"
                  step="1"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="flex-1 pl-10 pr-4 py-3.5 border-2 border-gray-300 rounded-xl font-['Inter'] text-[15px] text-black bg-white transition-all focus:outline-none focus:border-[#E63946] focus:shadow-lg focus:shadow-[#E63946]/10 focus:-translate-y-0.5"
                />
              </div>
              <p className="text-xs text-gray-600 mt-1.5">Range: $50 - $200</p>
            </div>

            <div className="bg-gradient-to-br from-[#F5F5F5] to-[#E8D5D0] p-5 rounded-2xl border-2 border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Estimated Demand</p>
              <p className="text-2xl font-bold text-black">{estimatedDemand.toLocaleString()} units</p>
              <p className="text-sm text-gray-600 mt-3 mb-1">Estimated Revenue</p>
              <p className="text-2xl font-bold text-[#E63946]">${estimatedRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* R&D Strategy Selection */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-['Poppins'] text-xl font-bold text-black flex items-center gap-2">
              <span>📋</span>
              <span>3. R&D Strategy</span>
            </h3>
            {rndStrategy && rndStrategy !== 'skip' && (
              <div className="px-3 py-1 bg-blue-100 border border-blue-300 rounded-lg text-sm font-semibold text-blue-700">
                Current round: {rndTier2 ? '2' : rndTier1 ? '1' : '0'}
              </div>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-4">Choose your innovation approach</p>
          
          <div className="space-y-3">
            {RND_STRATEGIES.map((strategy) => (
              <label
                key={strategy.id}
                className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  rndStrategy === strategy.id
                    ? 'bg-gradient-to-br from-[#FFF5F5] to-[#FFE5E7] border-[#E63946] shadow-lg'
                    : 'bg-white border-gray-200 hover:border-[#E63946] hover:shadow-md'
                }`}
              >
                <input
                  type="radio"
                  name="rndStrategy"
                  checked={rndStrategy === strategy.id}
                  onChange={() => {
                    setRndStrategy(strategy.id)
                    setRndTier1(null)
                    setRndTier2(null)
                    setFirstTestFailed(false)
                  }}
                  className="mt-1 mr-3 w-[18px] h-[18px] accent-[#E63946] cursor-pointer"
                />
                <div className="flex-1">
                  <div className="font-semibold text-[15px] text-black mb-1">
                    {strategy.name}
                  </div>
                  <div className="text-sm text-gray-600 italic">
                    {strategy.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* R&D Investment */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-['Poppins'] text-xl font-bold text-black mb-1 flex items-center gap-2">
            <span>🔬</span>
            <span>4. Research & Development Investment</span>
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {!rndStrategy || rndStrategy === 'skip' 
              ? 'Select your R&D strategy first' 
              : rndStrategy === 'one' 
              ? 'Select 1 R&D tier' 
              : rndStrategy === 'two-if-fail'
              ? !rndTier1 
                ? 'Select tier for 1st R&D test'
                : firstTestFailed
                ? 'Select tier for 2nd R&D test (1st test failed)'
                : '1st R&D selected. 2nd test only if 1st fails.'
              : rndStrategy === 'two-always'
              ? !rndTier1
                ? 'Select tier for 1st R&D test'
                : !rndTier2
                ? 'Select tier for 2nd R&D test'
                : 'Both R&D tests selected'
              : 'Select your R&D tier'}
          </p>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {RND_TIERS.map((tier) => {
              // Determine if this tier button should be disabled
              let isDisabled = !rndStrategy || rndStrategy === 'skip'
              
              if (rndStrategy === 'one') {
                // For 'one' strategy: disable all other tiers once one is selected
                isDisabled = isDisabled || (rndTier1 !== null && rndTier1 !== tier.tier)
              } else if (rndStrategy === 'two-if-fail') {
                // For 'two-if-fail': if tier1 is selected, disable ALL tiers (including tier1) unless test failed
                // Once test fails, allow selecting tier2 but disable tier1
                if (rndTier1 !== null && !firstTestFailed) {
                  isDisabled = true // Disable everything until checkbox is checked
                } else if (rndTier1 !== null && firstTestFailed) {
                  // Test failed, allow selecting tier2, but disable tier1
                  isDisabled = isDisabled || (rndTier2 !== null && rndTier2 !== tier.tier) || (tier.tier === rndTier1)
                }
              } else if (rndStrategy === 'two-always') {
                // For 'two-always': disable once both are selected (except the selected ones)
                isDisabled = isDisabled || (rndTier1 !== null && rndTier2 !== null && rndTier1 !== tier.tier && rndTier2 !== tier.tier)
              }
              
              const isSelected = rndTier1 === tier.tier || rndTier2 === tier.tier
              const isFirstTest = rndTier1 === tier.tier
              
              return (
                <button
                  key={tier.tier}
                  onClick={() => {
                    if (rndStrategy === 'skip') return
                    
                    if (rndStrategy === 'one') {
                      setRndTier1(rndTier1 === tier.tier ? null : tier.tier)
                    } else if (rndStrategy === 'two-if-fail') {
                      if (!rndTier1) {
                        setRndTier1(tier.tier)
                      } else if (firstTestFailed && !rndTier2 && tier.tier !== rndTier1) {
                        setRndTier2(tier.tier)
                      } else if (rndTier2 === tier.tier) {
                        setRndTier2(null)
                      }
                      // Note: Cannot deselect tier1 once selected with this strategy
                    } else if (rndStrategy === 'two-always') {
                      if (!rndTier1) {
                        setRndTier1(tier.tier)
                      } else if (!rndTier2 && rndTier1 !== tier.tier) {
                        setRndTier2(tier.tier)
                      } else if (rndTier1 === tier.tier) {
                        setRndTier1(rndTier2)
                        setRndTier2(null)
                      } else if (rndTier2 === tier.tier) {
                        setRndTier2(null)
                      }
                    }
                  }}
                  disabled={isDisabled}
                  className={`w-full text-left p-5 rounded-xl border-2 transition-all relative ${
                    isDisabled
                      ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200'
                      : isSelected
                      ? 'bg-gradient-to-br from-[#FFF5F5] to-[#FFE5E7] border-[#E63946] shadow-lg'
                      : 'bg-white border-gray-200 hover:border-[#E63946] hover:shadow-md hover:-translate-y-0.5'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-['Poppins'] font-bold text-lg text-black">{tier.label}</span>
                    {isSelected && (
                      <span className="bg-[#E63946] text-white px-2 py-1 rounded-md text-[11px] font-semibold">
                        {isFirstTest ? 'TEST 1' : 'TEST 2'}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[13px] text-gray-600">
                      <span>Cost:</span>
                      <strong className="text-black">
                        ฿{tier.minCost.toLocaleString()} - ฿{tier.maxCost.toLocaleString()}
                      </strong>
                    </div>
                    <div className="flex justify-between text-[13px] text-gray-600">
                      <span>Success Rate:</span>
                      <strong className="text-black">{tier.successMin}% - {tier.successMax}%</strong>
                    </div>
                    <div className="flex justify-between text-[13px] text-gray-600">
                      <span>Multiplier:</span>
                      <strong className="text-black">{tier.multiplierMin}% - {tier.multiplierMax}%</strong>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Analytics & Summary */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-['Poppins'] text-xl font-bold text-black mb-1 flex items-center gap-2">
            <span>📊</span>
            <span>5. Additional Options</span>
          </h3>
          <p className="text-sm text-gray-600 mb-4">Enhance your decision-making</p>
          <div className="space-y-4">
            {/* Simulate First Test Failure (for testing "two-if-fail" strategy) */}
            {rndStrategy === 'two-if-fail' && rndTier1 && (
              <div className="p-4 border-2 border-orange-300 rounded-xl bg-orange-50">
                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={firstTestFailed}
                    onChange={(e) => {
                      setFirstTestFailed(e.target.checked)
                      if (!e.target.checked) {
                        setRndTier2(null)
                      }
                    }}
                    className="mt-1 mr-3 w-[18px] h-[18px] accent-orange-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-[15px] block text-orange-900">Simulate: 1st R&D Test Failed</span>
                    <span className="text-sm text-orange-700">Check this to unlock 2nd R&D tier selection</span>
                  </div>
                </label>
              </div>
            )}
            
            <label className="flex items-start p-4 border-2 border-gray-200 rounded-xl cursor-pointer transition-all hover:bg-[#FFF5F5] hover:border-[#E63946] hover:shadow-md">
              <input
                type="checkbox"
                checked={analyticsPurchased}
                onChange={(e) => setAnalyticsPurchased(e.target.checked)}
                className="mt-1 mr-3 w-[18px] h-[18px] accent-[#E63946] cursor-pointer"
              />
              <div>
                <span className="font-semibold text-[15px] block">Purchase Analytics Tools</span>
                <span className="text-sm text-gray-600">Cost: ฿2,000</span>
              </div>
            </label>

            <div className="bg-gradient-to-br from-[#F5F5F5] to-[#E8D5D0] p-6 rounded-2xl border-2 border-gray-200">
              <h4 className="font-['Poppins'] font-bold text-base text-black mb-4">Cost Summary</h4>
              <div className="space-y-3">
                <div className="flex justify-between text-[15px]">
                  <span className="text-gray-600 font-medium">Base Operating Costs:</span>
                  <span className="font-semibold">฿20,000</span>
                </div>
                {rndTier1 && (
                  <div className="flex justify-between text-[15px]">
                    <span className="text-gray-600 font-medium">R&D Test 1 (avg):</span>
                    <span className="font-semibold">฿{Math.round(rdCost1).toLocaleString()}</span>
                  </div>
                )}
                {rndTier2 && (
                  <div className="flex justify-between text-[15px]">
                    <span className="text-gray-600 font-medium">R&D Test 2 (avg):</span>
                    <span className="font-semibold">฿{Math.round(rdCost2).toLocaleString()}</span>
                  </div>
                )}
                {analyticsPurchased && (
                  <div className="flex justify-between text-[15px]">
                    <span className="text-gray-600 font-medium">Analytics Tools:</span>
                    <span className="font-semibold">฿2,000</span>
                  </div>
                )}
                <div className="border-t-2 border-gray-200 pt-3 flex justify-between font-bold">
                  <span>Total Costs:</span>
                  <span>฿{totalCosts.toLocaleString()}</span>
                </div>
                <div className="border-t-2 border-gray-200 pt-3 flex justify-between font-bold text-lg text-[#E63946]">
                  <span>Est. Profit:</span>
                  <span>฿{(estimatedRevenue - totalCosts).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => setShowConfirmation(true)}
          className="flex-1 py-4 px-6 bg-gradient-to-br from-[#E63946] to-[#C1121F] text-white rounded-xl font-['Poppins'] font-semibold text-base transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#E63946]/40 shadow-lg shadow-[#E63946]/30"
        >
          Submit Weekly Decisions
        </button>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-5 z-[1000] animate-[fadeIn_0.3s_ease]">
          <div className="bg-white rounded-3xl max-w-[600px] w-full max-h-[90vh] overflow-y-auto animate-[bounceIn_0.5s_ease] shadow-2xl shadow-black/30">
            <div className="bg-gradient-to-br from-[#E63946] to-[#C1121F] text-white p-6 rounded-t-3xl">
              <h2 className="font-['Poppins'] text-2xl font-bold m-0">Confirm Your Decisions</h2>
            </div>
            <div className="p-6">
              <div className="space-y-5">
                <div className="pb-5 border-b border-gray-200">
                  <div className="font-['Poppins'] font-bold text-base text-black mb-2">Product Selection</div>
                  <div className="text-sm text-gray-600">{PRODUCTS.find((p) => p.id === selectedProduct)?.name}</div>
                </div>
                <div className="pb-5 border-b border-gray-200">
                  <div className="font-['Poppins'] font-bold text-base text-black mb-2">Price</div>
                  <div className="text-sm text-gray-600">฿{price}</div>
                </div>
                <div className="pb-5 border-b border-gray-200">
                  <div className="font-['Poppins'] font-bold text-base text-black mb-2">R&D Strategy</div>
                  <div className="text-sm text-gray-600">
                    {rndStrategy ? RND_STRATEGIES.find((s) => s.id === rndStrategy)?.name : 'None'}
                  </div>
                </div>
                {rndTier1 && (
                  <div className="pb-5 border-b border-gray-200">
                    <div className="font-['Poppins'] font-bold text-base text-black mb-2">R&D Test 1</div>
                    <div className="text-sm text-gray-600">
                      {RND_TIERS.find((t) => t.tier === rndTier1)?.label}
                    </div>
                  </div>
                )}
                {rndTier2 && (
                  <div className="pb-5 border-b border-gray-200">
                    <div className="font-['Poppins'] font-bold text-base text-black mb-2">R&D Test 2</div>
                    <div className="text-sm text-gray-600">
                      {RND_TIERS.find((t) => t.tier === rndTier2)?.label}
                    </div>
                  </div>
                )}
                <div className="pb-5 border-b border-gray-200">
                  <div className="font-['Poppins'] font-bold text-base text-black mb-2">Analytics Tools</div>
                  <div className="text-sm text-gray-600">{analyticsPurchased ? 'Yes' : 'No'}</div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitDecisions}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-gradient-to-br from-[#E63946] to-[#C1121F] text-white rounded-xl font-semibold transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Confirm & Submit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
