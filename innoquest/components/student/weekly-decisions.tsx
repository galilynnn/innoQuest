'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface TeamData {
  id: string
  team_name: string
  game_id: string
  assigned_product_id?: string
  assigned_product_name?: string | null
  total_balance: number
}

interface GameSettings {
  current_week: number
  total_weeks: number
  cost_per_analytics?: number
  rnd_tier_config?: any
}

interface WeeklyDecisionsProps {
  team: TeamData
  gameSettings: GameSettings
}

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
  const [assignedProduct, setAssignedProduct] = useState<{ id: string; name: string; category?: string } | null>(null)
  const [price, setPrice] = useState<number>(0)
  const [rndStrategy, setRndStrategy] = useState<string | null>(null)
  const [rndRound, setRndRound] = useState<number>(0)
  const [rndTier1, setRndTier1] = useState<string | null>(null)
  const [rndTier2, setRndTier2] = useState<string | null>(null)
  const [firstTestFailed, setFirstTestFailed] = useState(false)
  const [analyticsPurchased, setAnalyticsPurchased] = useState(false)
  const [analyticsQuantity, setAnalyticsQuantity] = useState(0)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rndTiers, setRndTiers] = useState<any[]>([])
  const [hasSubmitted, setHasSubmitted] = useState(false)

  // Load R&D tier config from game settings
  useEffect(() => {
    if (gameSettings.rnd_tier_config) {
      try {
        const config = gameSettings.rnd_tier_config
        const tiers = [
          { 
            tier: 'basic', 
            label: 'Basic', 
            minCost: config.basic?.min_cost,
            maxCost: config.basic?.max_cost,
            successMin: config.basic?.success_min,
            successMax: config.basic?.success_max,
            multiplierMin: config.basic?.multiplier_min,
            multiplierMax: config.basic?.multiplier_max
          },
          { 
            tier: 'standard', 
            label: 'Standard', 
            minCost: config.standard?.min_cost,
            maxCost: config.standard?.max_cost,
            successMin: config.standard?.success_min,
            successMax: config.standard?.success_max,
            multiplierMin: config.standard?.multiplier_min,
            multiplierMax: config.standard?.multiplier_max
          },
          { 
            tier: 'advanced', 
            label: 'Advanced', 
            minCost: config.advanced?.min_cost,
            maxCost: config.advanced?.max_cost,
            successMin: config.advanced?.success_min,
            successMax: config.advanced?.success_max,
            multiplierMin: config.advanced?.multiplier_min,
            multiplierMax: config.advanced?.multiplier_max
          },
          { 
            tier: 'premium', 
            label: 'Premium', 
            minCost: config.premium?.min_cost,
            maxCost: config.premium?.max_cost,
            successMin: config.premium?.success_min,
            successMax: config.premium?.success_max,
            multiplierMin: config.premium?.multiplier_min,
            multiplierMax: config.premium?.multiplier_max
          }
        ]
        setRndTiers(tiers)
      } catch (error) {
        console.error('Error loading R&D tier config:', error)
      }
    }
  }, [gameSettings.rnd_tier_config])

  // Check if student has already submitted for current week
  useEffect(() => {
    const checkSubmission = async () => {
      // Resolve the team's UUID primary key (teams.id) from the stored team id value.
      const { data: teamPkData } = await supabase
        .from('teams')
        .select('id')
        .eq('team_id', team.id)
        .maybeSingle()

      const teamPk = teamPkData?.id

      const { data, error } = await supabase
        .from('weekly_results')
        .select('id')
        .eq('teams_id', teamPk)
        .eq('week_number', gameSettings.current_week)
        .maybeSingle()

      if (data && !error) {
        setHasSubmitted(true)
      }
    }

    checkSubmission()
  }, [team.id, gameSettings.current_week])

  // Load assigned product on mount
  useEffect(() => {
    if (team.assigned_product_name) {
      setAssignedProduct({ 
        id: team.assigned_product_id || '', 
        name: team.assigned_product_name, 
        category: 'Assigned' 
      })
    }
  }, [team.assigned_product_name, team.assigned_product_id])

  // Calculate R&D cost using average of min and max for both tiers
  const rdCost1 = rndTier1 ? (() => {
    const tier = rndTiers.find((t) => t.tier === rndTier1)
    return tier ? (tier.minCost + tier.maxCost) / 2 : 0
  })() : 0
  
  const rdCost2 = rndTier2 ? (() => {
    const tier = rndTiers.find((t) => t.tier === rndTier2)
    return tier ? (tier.minCost + tier.maxCost) / 2 : 0
  })() : 0
  
  const rdCost = rdCost1 + rdCost2
  
  const costPerAnalytics = gameSettings.cost_per_analytics || 5000
  const analyticsCost = analyticsQuantity > 0 ? costPerAnalytics * analyticsQuantity : 0
  const totalCosts = 20000 + rdCost + analyticsCost

  const handleSubmitDecisions = async () => {
    if (hasSubmitted) {
      alert('You have already submitted decisions for this week. No changes allowed.')
      return
    }

    if (!assignedProduct) {
      alert('No product assigned yet. Please contact admin.')
      return
    }

    setLoading(true)
    
    const submissionData = {
      team_id: team.id,
      team_name: team.team_name,
      week_number: gameSettings.current_week,
      selected_product: assignedProduct.id,
      product_name: assignedProduct.name,
      set_price: price,
      costs: totalCosts,
      rnd_strategy: rndStrategy,
      rnd_strategy_name: rndStrategy ? RND_STRATEGIES.find(s => s.id === rndStrategy)?.name : 'None',
      rnd_tier: rndTier1,
      rnd_tier_name: rndTier1 ? rndTiers.find(t => t.tier === rndTier1)?.label : null,
      rnd_tier_2: rndTier2,
      rnd_tier_2_name: rndTier2 ? rndTiers.find(t => t.tier === rndTier2)?.label : null,
      analytics_purchased: analyticsQuantity > 0,
      analytics_quantity: analyticsQuantity,
      pass_fail_status: 'pending',
      bonus_earned: 0,
    }

    console.log('========================================')
    console.log('WEEKLY DECISIONS SUBMISSION')
    console.log('========================================')
    console.log('Team:', submissionData.team_name)
    console.log('Week:', submissionData.week_number)
    console.log('Product:', submissionData.product_name)
    console.log('Price:', `฿${submissionData.set_price}`)
    console.log('R&D Strategy:', submissionData.rnd_strategy_name)
    if (submissionData.rnd_tier_name) {
      console.log('R&D Test 1:', submissionData.rnd_tier_name)
    }
    if (submissionData.rnd_tier_2_name) {
      console.log('R&D Test 2:', submissionData.rnd_tier_2_name)
    }
    console.log('Analytics Tools:', submissionData.analytics_purchased ? 'Yes' : 'No')
    console.log('Total Costs:', `฿${submissionData.costs.toLocaleString()}`)
    console.log('Timestamp:', new Date().toISOString())
    console.log('========================================')

    try {
      console.log('📝 Team object:', team)
      console.log('📝 Attempting to insert:', {
        teams_id: submissionData.team_id,
        game_id: team.game_id,
        week_number: submissionData.week_number,
        set_price: submissionData.set_price,
        costs: submissionData.costs,
        rnd_tier: submissionData.rnd_tier,
        analytics_purchased: submissionData.analytics_purchased,
      })

      // Ensure we insert the canonical teams_id uuid (foreign key) into weekly_results
      const { data: teamPkData } = await supabase
        .from('teams')
        .select('id')
        .eq('team_id', submissionData.team_id)
        .single()

      const teamPk = teamPkData?.id

      const insertPayload = {
        teams_id: teamPk,
        game_id: team.game_id,
        week_number: submissionData.week_number,
        set_price: submissionData.set_price,
        costs: submissionData.costs,
        rnd_tier: submissionData.rnd_tier,
        analytics_purchased: submissionData.analytics_purchased,
        analytics_quantity: submissionData.analytics_quantity,
        pass_fail_status: submissionData.pass_fail_status,
        bonus_earned: submissionData.bonus_earned,
      }
      
      console.log('📝 Payload to insert:', JSON.stringify(insertPayload, null, 2))

      // Insert both canonical uuid `teams_id` and legacy `team_id` where available.
      const payloadWithKeys = {
        ...insertPayload,
        team_id: submissionData.team_id,
      }

      console.log('📝 Final payload inserted to weekly_results:', payloadWithKeys)

      const { data, error } = await supabase.from('weekly_results').insert(payloadWithKeys)

      console.log('📊 Insert response - Data:', data)
      console.log('📊 Insert response - Error:', error)
      console.log('📊 Insert response - Error details:', JSON.stringify(error, null, 2))
      console.log('📊 Insert response - Error message:', error?.message)
      console.log('📊 Insert response - Error code:', error?.code)

      if (error) {
        console.error('❌ Submission failed:', error)
        console.error('❌ Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)))
        alert('Error submitting decisions: ' + (error.message || JSON.stringify(error)))
        setLoading(false)
        return
      }

      // Insert R&D tests into rnd_tests table for history tracking
      if (submissionData.rnd_tier) {
        await supabase.from('rnd_tests').insert({
          teams_id: teamPk,
          week_number: submissionData.week_number,
          tier: submissionData.rnd_tier,
          success: false, // Will be updated by advance-week
        })
      }
      
      if (submissionData.rnd_tier_2) {
        await supabase.from('rnd_tests').insert({
          teams_id: teamPk,
          week_number: submissionData.week_number,
          tier: submissionData.rnd_tier_2,
          success: false, // Will be updated by advance-week
        })
      }

      console.log('✅ Decisions submitted successfully!')
      console.log('Database response:', data)
      alert('Decisions submitted successfully!')
      setHasSubmitted(true)
      setShowConfirmation(false)
      setPrice(0)
      setRndStrategy(null)
      setRndRound(0)
      setRndTier1(null)
      setRndTier2(null)
      setFirstTestFailed(false)
      setAnalyticsPurchased(false)
      setAnalyticsQuantity(0)
    } catch (err) {
      console.error('❌ Exception during submission:', err)
      alert('Error submitting decisions')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-10">
      {hasSubmitted && (
        <div className="bg-green-50 border-2 border-green-500 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-3xl">✅</span>
            <div>
              <h3 className="font-bold text-lg text-green-900">Decisions Submitted!</h3>
              <p className="text-green-700">You have already submitted your decisions for Week {gameSettings.current_week}. No changes are allowed until the next week.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Product Display (Assigned by Admin) */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-['Poppins'] text-xl font-bold text-black mb-1 flex items-center gap-2">
            <span>📦</span>
            <span>1. Your Product</span>
          </h3>
          <p className="text-sm text-gray-600 mb-4">Product assigned by admin</p>
          
          {assignedProduct ? (
            <div className="p-4 bg-gradient-to-br from-[#F5F5F5] to-[#E8D5D0] rounded-xl border-2 border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Your Product</p>
                  <p className="font-semibold text-lg text-black">
                    {assignedProduct.name}
                  </p>
                </div>
                {assignedProduct.category && (
                  <span className="text-xs px-3 py-1.5 rounded-lg bg-white text-gray-700 border border-gray-300 font-semibold">
                    {assignedProduct.category}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl">
              <p className="text-yellow-800 text-sm">
                ⚠️ No product assigned yet. Please wait for admin to assign a product.
              </p>
            </div>
          )}
        </div>

        {/* Price Setting */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-['Poppins'] text-xl font-bold text-black mb-1 flex items-center gap-2">
            <span>💰</span>
            <span>2. Set Weekly Price</span>
          </h3>
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
                  disabled={hasSubmitted}
                  className="flex-1 pl-10 pr-4 py-3.5 border-2 border-gray-300 rounded-xl font-['Inter'] text-[15px] text-black bg-white transition-all focus:outline-none focus:border-[#E63946] focus:shadow-lg focus:shadow-[#E63946]/10 focus:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
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
                  disabled={hasSubmitted}
                  className="mt-1 mr-3 w-[18px] h-[18px] accent-[#E63946] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                : !rndTier2
                ? 'Select tier for 2nd R&D test (will only run if 1st fails)'
                : 'Both R&D tests selected. 2nd will only run if 1st fails.'
              : rndStrategy === 'two-always'
              ? !rndTier1
                ? 'Select tier for 1st R&D test'
                : !rndTier2
                ? 'Select tier for 2nd R&D test'
                : 'Both R&D tests selected'
              : 'Select your R&D tier'}
          </p>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {rndTiers.map((tier) => {
              // Determine if this tier button should be disabled
              let isDisabled = hasSubmitted || !rndStrategy || rndStrategy === 'skip'
              
              if (rndStrategy === 'one') {
                // For 'one' strategy: disable all other tiers once one is selected
                isDisabled = isDisabled || (rndTier1 !== null && rndTier1 !== tier.tier)
              } else if (rndStrategy === 'two-if-fail') {
                // For 'two-if-fail': Allow selecting both tiers upfront
                // Disable once both are selected (except the selected ones)
                isDisabled = isDisabled || (rndTier1 !== null && rndTier2 !== null && rndTier1 !== tier.tier && rndTier2 !== tier.tier)
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
                      } else if (!rndTier2 && rndTier1 !== tier.tier) {
                        setRndTier2(tier.tier)
                      } else if (rndTier1 === tier.tier) {
                        setRndTier1(rndTier2)
                        setRndTier2(null)
                      } else if (rndTier2 === tier.tier) {
                        setRndTier2(null)
                      }
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
            <div className="p-4 border-2 border-gray-200 rounded-xl transition-all">
              <label className="font-semibold text-[15px] block mb-3 text-gray-800">Analytics Tools: <span className="text-[#E63946]">{analyticsQuantity}</span> units</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  value={analyticsQuantity}
                  onChange={(e) => setAnalyticsQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                  disabled={hasSubmitted}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Enter quantity"
                />
                <span className="text-sm text-gray-600 font-medium whitespace-nowrap">Cost: ฿{(costPerAnalytics * analyticsQuantity).toLocaleString()}</span>
              </div>
            </div>

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
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => setShowConfirmation(true)}
          disabled={hasSubmitted}
          className="flex-1 py-4 px-6 bg-gradient-to-br from-[#E63946] to-[#C1121F] text-white rounded-xl font-['Poppins'] font-semibold text-base transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#E63946]/40 shadow-lg shadow-[#E63946]/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {hasSubmitted ? 'Already Submitted' : 'Submit Weekly Decisions'}
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
                  <div className="font-['Poppins'] font-bold text-base text-black mb-2">Product</div>
                  <div className="text-sm text-gray-600">{assignedProduct?.name || 'Not assigned'}</div>
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
                      {rndTiers.find((t) => t.tier === rndTier1)?.label}
                    </div>
                  </div>
                )}
                {rndTier2 && (
                  <div className="pb-5 border-b border-gray-200">
                    <div className="font-['Poppins'] font-bold text-base text-black mb-2">R&D Test 2</div>
                    <div className="text-sm text-gray-600">
                      {rndTiers.find((t) => t.tier === rndTier2)?.label}
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
