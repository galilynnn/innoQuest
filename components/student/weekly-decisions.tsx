'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface TeamData {
  team_id: string // team_id (UUID primary key)
  team_name: string
  game_id: string
  assigned_product_id?: string
  assigned_product_name?: string | null
  total_balance: number
  successful_rnd_tests?: number
  funding_stage?: string
}

interface GameSettings {
  current_week: number
  total_weeks: number
  cost_per_analytics?: number
  rnd_tier_config?: any
  initial_capital?: number
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

const ANALYTICS_TOOLS = [
  { category: 'Health Consciousness', operation: 'Average', metrics: ['Monthly Food Spending', 'Monthly Income'], breakdown: 'Health Consciousness', chart: 'Stacked Bar Chart', fullName: 'Average of Monthly Food Spending and Average of Monthly Income by Health Consciousness (Stacked Bar Chart)' },
  { category: 'Health Consciousness', operation: 'Average', metrics: ['Working Hours per Week'], breakdown: 'Health Consciousness', chart: 'Bar Chart', fullName: 'Average of Working Hours per Week by Health Consciousness (Bar Chart)' },
  { category: 'Gender', operation: 'Count', metrics: ['Customer_ID'], breakdown: 'Gender', chart: 'Pie Chart', fullName: 'Count of Customer_ID by Gender (Pie Chart)' },
  { category: 'Experimental Food Interest', operation: 'Average', metrics: ['Working Hours per Week'], breakdown: 'Interest in Experimental Food', chart: 'Bar Chart', fullName: 'Average of Working Hours per Week by Interest in Experimental Food (Bar Chart)' },
  { category: 'Experimental Food Interest', operation: 'Average', metrics: ['Monthly Food Spending', 'Monthly Income'], breakdown: 'Interest in Experimental Food', chart: 'Stacked Bar Chart', fullName: 'Average of Monthly Food Spending and Average of Monthly Income by Interest in Experimental Food (Stacked Bar Chart)' },
  { category: 'Gender', operation: 'Average', metrics: ['Monthly Income', 'Monthly Food Spending'], breakdown: 'Gender', chart: 'Stacked Bar Chart', fullName: 'Average of Monthly Income and Average of Monthly Food Spending by Gender (Stacked Bar Chart)' },
  { category: 'Health Consciousness', operation: 'Count', metrics: ['Customer_ID'], breakdown: 'Health Consciousness', chart: 'Bar Chart', fullName: 'Count of Customer_ID by Health Consciousness (Bar Chart)' },
  { category: 'Experimental Food Interest', operation: 'Count', metrics: ['Customer_ID'], breakdown: 'Interest in Experimental Food', chart: 'Bar Chart', fullName: 'Count of Customer_ID by Interest in Experimental Food (Bar Chart)' },
  { category: 'Working Hours', operation: 'Average', metrics: ['Monthly Income'], breakdown: 'Working Hours per Week', chart: 'Bar Chart', fullName: 'Average of Monthly Income by Working Hours per Week (Bar Chart)' },
  { category: 'Brand Loyalty', operation: 'Average', metrics: ['Monthly Food Spending', 'Monthly Income'], breakdown: 'Brand Loyalty', chart: 'Stacked Bar Chart', fullName: 'Average of Monthly Food Spending and Average of Monthly Income by Brand Loyalty (Stacked Bar Chart)' },
  { category: 'Dietary Preference', operation: 'Average', metrics: ['Brand Loyalty'], breakdown: 'Dietary Preference', chart: 'Bar Chart', fullName: 'Average of Brand Loyalty by Dietary Preference (Bar Chart)' },
  { category: 'Brand Loyalty', operation: 'Average', metrics: ['Monthly Income', 'Monthly Food Spending'], breakdown: 'Brand Loyalty', chart: 'Combination Bar and Line Chart', fullName: 'Average of Monthly Income and Average of Monthly Food Spending by Brand Loyalty (Combination Bar and Line Chart)' },
  { category: 'Brand Loyalty', operation: 'Average', metrics: ['Monthly Food Spending'], breakdown: 'Brand Loyalty', chart: 'Bar Chart', fullName: 'Average of Monthly Food Spending by Brand Loyalty (Bar Chart)' },
  { category: 'Brand Loyalty', operation: 'Average', metrics: ['Monthly Income'], breakdown: 'Brand Loyalty and Gender', chart: 'Clustered Bar Chart', fullName: 'Average of Monthly Income by Brand Loyalty and Gender (Clustered Bar Chart)' },
  { category: 'Sustainability Preference', operation: 'Count', metrics: ['Customer_ID'], breakdown: 'Sustainability Preference', chart: 'Bar Chart', fullName: 'Count of Customer_ID by Sustainability Preference (Bar Chart)' },
  { category: 'Health Consciousness', operation: 'Count', metrics: ['Customer_ID'], breakdown: 'Health Consciousness and Sustainability Preference', chart: 'Clustered Bar Chart', fullName: 'Count of Customer_ID by Health Consciousness and Sustainability Preference (Clustered Bar Chart)' },
  { category: 'Sustainability Preference', operation: 'Average', metrics: ['Monthly Income'], breakdown: 'Sustainability Preference', chart: 'Line Chart', fullName: 'Average of Monthly Income by Sustainability Preference (Line Chart)' },
  { category: 'Sustainability Preference', operation: 'Sum', metrics: ['Monthly Food Spending'], breakdown: 'Sustainability Preference', chart: 'Bar Chart', fullName: 'Sum of Monthly Food Spending by Sustainability Preference (Bar Chart)' },
  { category: 'Sustainability Preference', operation: 'Average', metrics: ['Monthly Income', 'Monthly Food Spending'], breakdown: 'Sustainability Preference and Gender', chart: 'Combination Bar and Line Chart', fullName: 'Average of Monthly Income and Average of Monthly Food Spending by Sustainability Preference and Gender (Combination Bar and Line Chart)' },
  { category: 'Brand Loyalty', operation: 'Count', metrics: ['Customer_ID'], breakdown: 'Brand Loyalty and Gender', chart: 'Clustered Bar Chart', fullName: 'Count of Customer_ID by Brand Loyalty and Gender (Clustered Bar Chart)' },
]

const ANALYTICS_CATEGORIES = [
  'All',
  'Health Consciousness',
  'Gender',
  'Experimental Food Interest',
  'Working Hours',
  'Brand Loyalty',
  'Dietary Preference',
  'Sustainability Preference',
]

export default function WeeklyDecisions({ team, gameSettings }: WeeklyDecisionsProps) {
  const supabase = createClient()
  const [assignedProduct, setAssignedProduct] = useState<{ id: string; name: string; category?: string } | null>(null)
  const [price, setPrice] = useState<string>('0')
  const [rndStrategy, setRndStrategy] = useState<string | null>(null)
  const [rndRound, setRndRound] = useState<number>(0)
  const [rndSelections, setRndSelections] = useState<Array<{ id: number; tier: string }>>([]) // Queue-based selection
  const [rndSelectionCounter, setRndSelectionCounter] = useState<number>(0) // ID counter for unique IDs
  const [firstTestFailed, setFirstTestFailed] = useState(false)
  const [selectedAnalyticsTools, setSelectedAnalyticsTools] = useState<string[]>([])
  const [analyticsCategory, setAnalyticsCategory] = useState<string>('All')
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rndTiers, setRndTiers] = useState<any[]>([])
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [draftLoaded, setDraftLoaded] = useState(false)

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
      // Use team_id directly as the UUID
      const { data, error } = await supabase
        .from('weekly_results')
        .select('id')
        .eq('team_id', team.team_id)
        .eq('week_number', gameSettings.current_week)
        .maybeSingle()

      if (data && !error) {
        setHasSubmitted(true)
      }
    }

    checkSubmission()
  }, [team.team_id, gameSettings.current_week])

  // Load draft decisions from sessionStorage on mount
  useEffect(() => {
    const draftKey = `draft_decisions_${team.team_id}_week_${gameSettings.current_week}`
    const savedDraft = sessionStorage.getItem(draftKey)
    
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft)
        console.log('📥 Loading draft from sessionStorage:', draft)
        
        // Set all state at once to avoid multiple re-renders
        if (draft.price !== undefined) setPrice(draft.price)
        if (draft.rndStrategy !== undefined) setRndStrategy(draft.rndStrategy)
        if (draft.rndSelections !== undefined) setRndSelections(draft.rndSelections)
        if (draft.rndSelectionCounter !== undefined) setRndSelectionCounter(draft.rndSelectionCounter)
        if (draft.selectedAnalyticsTools !== undefined) setSelectedAnalyticsTools(draft.selectedAnalyticsTools)
        if (draft.analyticsCategory !== undefined) setAnalyticsCategory(draft.analyticsCategory)
        
        console.log('✅ Loaded draft decisions from sessionStorage')
      } catch (error) {
        console.error('Failed to load draft decisions:', error)
      }
    }
    
    // Mark as loaded after a short delay to ensure all state updates have settled
    setTimeout(() => setDraftLoaded(true), 100)
    
    // Only run once on mount for this specific team/week combination
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Save draft decisions to sessionStorage whenever they change (but only after initial load)
  useEffect(() => {
    if (!draftLoaded) return // Don't save until draft is loaded
    if (hasSubmitted) return // Don't save if already submitted
    
    const draftKey = `draft_decisions_${team.team_id}_week_${gameSettings.current_week}`
    const draft = {
      price,
      rndStrategy,
      rndSelections,
      rndSelectionCounter,
      selectedAnalyticsTools,
      analyticsCategory
    }
    
    console.log('💾 Saving draft to sessionStorage:', draft)
    sessionStorage.setItem(draftKey, JSON.stringify(draft))
  }, [price, rndStrategy, rndSelections, rndSelectionCounter, selectedAnalyticsTools, analyticsCategory, draftLoaded, hasSubmitted, team.team_id, gameSettings.current_week])

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

  // Add R&D to queue
  const addRDToQueue = (tierName: string) => {
    if (!rndStrategy || rndStrategy === 'skip') return
    
    const maxSelections = RND_STRATEGIES.find(s => s.id === rndStrategy)?.maxTests || 0
    if (rndSelections.length >= maxSelections) return
    
    const newId = rndSelectionCounter + 1
    setRndSelections([...rndSelections, { id: newId, tier: tierName }])
    setRndSelectionCounter(newId)
  }

  // Remove R&D from queue by ID
  const removeRDFromQueue = (id: number) => {
    setRndSelections(rndSelections.filter(sel => sel.id !== id))
  }

  // Calculate R&D cost using average of min and max for all selections in queue
  const rdCost = rndSelections.reduce((sum, selection) => {
    const tier = rndTiers.find((t) => t.tier === selection.tier)
    return sum + (tier ? (tier.minCost + tier.maxCost) / 2 : 0)
  }, 0)
  
  const costPerAnalytics = gameSettings.cost_per_analytics || 5000
  // Parse values for calculations and display
  const priceNum = parseFloat(price) || 0
  const analyticsQuantityNum = selectedAnalyticsTools.length
  const analyticsCost = analyticsQuantityNum > 0 ? costPerAnalytics * analyticsQuantityNum : 0
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

    // Validate that price is filled and is a valid positive number
    const priceNum = parseFloat(price)
    if (!price || price.trim() === '' || isNaN(priceNum) || priceNum <= 0) {
      alert('Please enter a valid price (must be greater than 0).')
      return
    }

    // Analytics tools validation is handled by checkbox selection, no need to validate here

    // Validate R&D strategy if selected
    if (rndStrategy && rndStrategy !== 'skip') {
      if (rndSelections.length === 0) {
        alert('Please select at least one R&D tier for your chosen strategy.')
        return
      }
    }

    // Note: Insufficient balance will be handled during advance-week
    // Students can submit normally, but results will be processed when admin advances the week

    setLoading(true)
    
    const submissionData = {
      team_id: team.team_id,
      team_name: team.team_name,
      week_number: gameSettings.current_week,
      selected_product: assignedProduct.id,
      product_name: assignedProduct.name,
      set_price: priceNum,
      costs: totalCosts,
      rnd_strategy: rndStrategy,
      rnd_strategy_name: rndStrategy ? RND_STRATEGIES.find(s => s.id === rndStrategy)?.name : 'None',
      rnd_tier: rndSelections.length > 0 ? rndSelections[0].tier : null,
      rnd_tier_name: rndSelections.length > 0 ? rndTiers.find(t => t.tier === rndSelections[0].tier)?.label : null,
      rnd_tier_2: rndSelections.length > 1 ? rndSelections[1].tier : null,
      rnd_tier_2_name: rndSelections.length > 1 ? rndTiers.find(t => t.tier === rndSelections[1].tier)?.label : null,
      analytics_purchased: analyticsQuantityNum > 0,
      analytics_quantity: analyticsQuantityNum,
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
    rndSelections.forEach((sel, idx) => {
      console.log(`R&D Test ${idx + 1}:`, rndTiers.find(t => t.tier === sel.tier)?.label)
    })
    console.log('Analytics Tools:', submissionData.analytics_purchased ? 'Yes' : 'No')
    console.log('Total Costs:', `฿${submissionData.costs.toLocaleString()}`)
    console.log('Timestamp:', new Date().toISOString())
    console.log('========================================')

    try {
      console.log('📝 Team object:', team)
      console.log('📝 Attempting to insert:', {
        team_id: submissionData.team_id,
        game_id: team.game_id,
        week_number: submissionData.week_number,
        set_price: submissionData.set_price,
        costs: submissionData.costs,
        rnd_tier: submissionData.rnd_tier,
        analytics_purchased: submissionData.analytics_purchased,
      })

      // Use team_id directly as the UUID primary key
      const teamPk = team.team_id
      
      console.log('📝 Team UUID (teamPk):', teamPk)

      const insertPayload = {
        team_id: teamPk,
        game_id: team.game_id,
        week_number: submissionData.week_number,
        set_price: submissionData.set_price,
        costs: submissionData.costs,
        rnd_strategy: submissionData.rnd_strategy,
        rnd_tier: submissionData.rnd_tier,
        rnd_tier_2: submissionData.rnd_tier_2,
        analytics_purchased: submissionData.analytics_purchased,
        analytics_quantity: submissionData.analytics_quantity,
        pass_fail_status: submissionData.pass_fail_status,
        bonus_earned: submissionData.bonus_earned,
      }
      
      console.log('📝 Payload to insert:', JSON.stringify(insertPayload, null, 2))

      // Use team_id for weekly_results
      const payloadWithKeys = {
        ...insertPayload,
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
          team_id: teamPk,
          week_number: submissionData.week_number,
          tier: submissionData.rnd_tier,
          success: false, // Will be updated by advance-week
        })
      }
      
      // For "two-if-fail" strategy, don't insert second test yet - it will be inserted by advance-week only if first test fails
      // For "two-always" strategy, insert both tests immediately
      if (submissionData.rnd_tier_2 && submissionData.rnd_strategy === 'two-always') {
        await supabase.from('rnd_tests').insert({
          team_id: teamPk,
          week_number: submissionData.week_number,
          tier: submissionData.rnd_tier_2,
          success: false, // Will be updated by advance-week
        })
      }

      // Insert analytics tools purchases into analytics_purchases table
      if (selectedAnalyticsTools.length > 0) {
        const analyticsPurchases = selectedAnalyticsTools.map(tool => ({
          team_id: teamPk,
          week_number: submissionData.week_number,
          tool_type: tool,
          cost: costPerAnalytics,
        }))
        await supabase.from('analytics_purchases').insert(analyticsPurchases)
      }

      console.log('✅ Decisions submitted successfully!')
      console.log('Database response:', data)

      // Calculate purchase probabilities based on the price set
      try {
        console.log('📊 Preparing probability calculation...')
        console.log('- game_id:', team.game_id)
        console.log('- team_id (teamPk):', teamPk)
        console.log('- product_id:', assignedProduct.id)
        console.log('- price:', submissionData.set_price)
        
        // Validate all required fields before making API call
        if (!team.game_id || !teamPk || !assignedProduct.id || submissionData.set_price === undefined) {
          console.error('⚠️ Missing required fields for probability calculation')
          console.error('Missing:', {
            game_id: !team.game_id,
            team_id: !teamPk,
            product_id: !assignedProduct.id,
            price: submissionData.set_price === undefined
          })
        } else {
          console.log('📊 Calculating purchase probabilities for price:', submissionData.set_price)
          const probResponse = await fetch('/api/calculate-probabilities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              game_id: team.game_id,
              team_id: teamPk,
              product_id: assignedProduct.id,
              price: submissionData.set_price
            })
          })

          const probResult = await probResponse.json()
          
          if (probResponse.ok) {
            console.log('✅ Purchase probabilities calculated:', probResult)
          } else {
            console.error('⚠️ Warning: Failed to calculate probabilities:', probResult.error)
            // Don't fail the submission if probability calculation fails
          }
        }
      } catch (probError) {
        console.error('⚠️ Warning: Exception calculating probabilities:', probError)
        // Don't fail the submission if probability calculation fails
      }

      alert('Decisions submitted successfully!')
      setHasSubmitted(true)
      setShowConfirmation(false)
      
      // Clear draft from sessionStorage after successful submission
      const draftKey = `draft_decisions_${team.team_id}_week_${gameSettings.current_week}`
      sessionStorage.removeItem(draftKey)
      console.log('🗑️ Cleared draft decisions from sessionStorage')
      
      setPrice('0')
      setRndStrategy(null)
      setRndRound(0)
      setRndSelections([])
      setRndSelectionCounter(0)
      setFirstTestFailed(false)
      setSelectedAnalyticsTools([])
      setAnalyticsCategory('All')
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
            <div className="p-4 bg-linear-to-br from-[#F5F5F5] to-[#E8D5D0] rounded-xl border-2 border-gray-200">
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
                <span className="absolute left-4 font-semibold text-gray-600 text-base">฿</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={price}
                  onChange={(e) => {
                    const value = e.target.value
                    // Allow empty string, numbers, and single decimal point
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setPrice(value)
                    }
                  }}
                  onBlur={(e) => {
                    // Only reset to 0 if completely empty, don't force min/max here
                    // Validation will happen on submit
                    const num = parseFloat(e.target.value)
                    if (!e.target.value || e.target.value.trim() === '' || isNaN(num)) {
                      setPrice('0')
                    }
                  }}
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
                R&D Queue: {rndSelections.length > 0 ? `${rndSelections.length}/${RND_STRATEGIES.find(s => s.id === rndStrategy)?.maxTests}` : 'Empty'}
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
                    ? 'bg-linear-to-br from-[#FFF5F5] to-[#FFE5E7] border-[#E63946] shadow-lg'
                    : 'bg-white border-gray-200 hover:border-[#E63946] hover:shadow-md'
                }`}
              >
                <input
                  type="radio"
                  name="rndStrategy"
                  checked={rndStrategy === strategy.id}
                  onChange={() => {
                    setRndStrategy(strategy.id)
                    setRndSelections([])
                    setRndSelectionCounter(0)
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

      <div className="grid grid-cols-1 gap-6">
        {/* R&D Investment */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-['Poppins'] text-xl font-bold text-black mb-1 flex items-center gap-2">
            <span>🔬</span>
            <span>4. Research & Development Investment</span>
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {!rndStrategy || rndStrategy === 'skip' 
              ? 'Select your R&D strategy first' 
              : rndSelections.length === 0
              ? `Click to add R&D tiers to your queue`
              : rndSelections.length >= (RND_STRATEGIES.find(s => s.id === rndStrategy)?.maxTests || 0)
              ? 'Queue full - Click X to remove items'
              : 'Click to add more R&D tiers or use X to remove'}
          </p>

          {/* R&D Queue Display - Compact Chip Style */}
          {rndSelections.length > 0 && (
            <div className="mb-4">
              <div className="font-semibold text-sm text-gray-700 mb-2">Selected R&D Tests:</div>
              <div className="flex flex-wrap gap-2">
                {rndSelections.map((sel, idx) => {
                  const tier = rndTiers.find(t => t.tier === sel.tier)
                  return (
                    <div
                      key={sel.id}
                      className="inline-flex items-center gap-2 bg-[#E63946] text-white px-3 py-1.5 rounded-full text-sm font-semibold shadow-sm"
                    >
                      <span className="bg-white/20 text-white w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs">
                        {idx + 1}
                      </span>
                      <span>{tier?.label}</span>
                      <button
                        onClick={() => removeRDFromQueue(sel.id)}
                        className="ml-1 hover:bg-white/20 rounded-full w-5 h-5 flex items-center justify-center transition-all text-white font-bold"
                        title="Remove this R&D selection"
                      >
                        ×
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Available R&D Tiers to Add */}
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {rndTiers.map((tier) => {
              const isDisabled = hasSubmitted || !rndStrategy || rndStrategy === 'skip' || rndSelections.length >= (RND_STRATEGIES.find(s => s.id === rndStrategy)?.maxTests || 0)
              
              return (
                <button
                  key={tier.tier}
                  onClick={() => {
                    if (!isDisabled) {
                      addRDToQueue(tier.tier)
                    }
                  }}
                  disabled={isDisabled}
                  className={`shrink-0 w-[280px] text-left p-5 rounded-xl border-2 transition-all relative ${
                    isDisabled
                      ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200'
                      : 'bg-white border-gray-200 hover:border-[#E63946] hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-['Poppins'] font-bold text-lg text-black">{tier.label}</span>
                    <span className="text-[#E63946] text-lg font-bold">+</span>
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
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Analytics & Summary */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-['Poppins'] text-xl font-bold text-black mb-1 flex items-center gap-2">
            <span>📊</span>
            <span>5. Additional Options</span>
          </h3>
          <p className="text-sm text-gray-600 mb-4">Enhance your decision-making</p>
          <div className="space-y-4">
            <div className="p-4 border-2 border-gray-200 rounded-xl transition-all">
              <label className="font-semibold text-[15px] block mb-3 text-gray-800">
                Analytics Tools: <span className="text-[#E63946]">{selectedAnalyticsTools.length}</span> selected
                {selectedAnalyticsTools.length > 0 && (
                  <span className="text-sm text-gray-600 ml-2">
                    (฿{(selectedAnalyticsTools.length * costPerAnalytics).toLocaleString()})
                  </span>
                )}
              </label>
              <p className="text-xs text-gray-500 mb-4">Select analytics tools to purchase (฿{costPerAnalytics.toLocaleString()} each)</p>
              
              {/* Selected Tools Chips */}
              {selectedAnalyticsTools.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-xs font-semibold text-gray-700 mb-2">Selected Tools:</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedAnalyticsTools.map((toolName, idx) => {
                      const tool = ANALYTICS_TOOLS.find(t => t.fullName === toolName)
                      return (
                        <div
                          key={idx}
                          className="inline-flex items-center gap-2 bg-[#E63946] text-white px-3 py-1.5 rounded-full text-sm font-semibold shadow-sm"
                        >
                          <span className="text-xs bg-white/20 text-white px-1.5 py-0.5 rounded">
                            {tool?.category || 'Tool'}
                          </span>
                          <span className="max-w-[200px] truncate">
                            {tool ? `${tool.operation} of ${tool.metrics.join(' & ')}` : toolName}
                          </span>
                          {!hasSubmitted && (
                            <button
                              onClick={() => {
                                setSelectedAnalyticsTools(selectedAnalyticsTools.filter((_, i) => i !== idx))
                              }}
                              className="ml-1 hover:bg-white/20 rounded-full w-5 h-5 flex items-center justify-center transition-all text-white font-bold"
                              title="Remove this tool"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Category Filter Chips */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Category:</label>
                <div className="flex flex-wrap gap-2">
                  {ANALYTICS_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setAnalyticsCategory(cat)}
                      disabled={hasSubmitted}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                        analyticsCategory === cat
                          ? 'bg-[#E63946] text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtered Tools List */}
              <div className="max-h-[400px] overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-4">
                {ANALYTICS_TOOLS
                  .filter(tool => {
                    const matchesCategory = analyticsCategory === 'All' || tool.category === analyticsCategory
                    return matchesCategory
                  })
                  .map((tool, index) => {
                    const isSelected = selectedAnalyticsTools.includes(tool.fullName)
                    return (
                      <label
                        key={index}
                        className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-50 border-blue-400'
                            : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                        } ${hasSubmitted ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                <input
                          type="checkbox"
                          checked={isSelected}
                  onChange={(e) => {
                            if (hasSubmitted) return
                            if (e.target.checked) {
                              setSelectedAnalyticsTools([...selectedAnalyticsTools, tool.fullName])
                            } else {
                              setSelectedAnalyticsTools(selectedAnalyticsTools.filter(t => t !== tool.fullName))
                    }
                  }}
                  disabled={hasSubmitted}
                          className="mt-1 mr-3 w-4 h-4 accent-[#E63946] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                              {tool.category}
                            </span>
                            <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                              {tool.operation}
                            </span>
                            <span className="text-xs font-semibold px-2 py-0.5 bg-green-100 text-green-700 rounded">
                              {tool.chart}
                            </span>
                          </div>
                          <div className="text-sm text-gray-800 font-medium">
                            {tool.operation} of {tool.metrics.join(' and ')}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            by {tool.breakdown}
                          </div>
                        </div>
                      </label>
                    )
                  })}
                {ANALYTICS_TOOLS.filter(tool => {
                  const matchesCategory = analyticsCategory === 'All' || tool.category === analyticsCategory
                  return matchesCategory
                }).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No analytics tools found in this category.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => setShowConfirmation(true)}
          disabled={hasSubmitted}
          className="flex-1 py-4 px-6 bg-linear-to-br from-[#E63946] to-[#C1121F] text-white rounded-xl font-['Poppins'] font-semibold text-base transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#E63946]/40 shadow-lg shadow-[#E63946]/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {hasSubmitted 
            ? 'Already Submitted' 
            : 'Submit Weekly Decisions'}
        </button>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-5 z-1000 animate-[fadeIn_0.3s_ease]">
          <div className="bg-white rounded-3xl max-w-[600px] w-full max-h-[90vh] overflow-y-auto animate-[bounceIn_0.5s_ease] shadow-2xl shadow-black/30">
            <div className="bg-linear-to-br from-[#E63946] to-[#C1121F] text-white p-6 rounded-t-3xl">
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
                  <div className="text-sm text-gray-600">฿{priceNum}</div>
                </div>
                <div className="pb-5 border-b border-gray-200">
                  <div className="font-['Poppins'] font-bold text-base text-black mb-2">R&D Strategy</div>
                  <div className="text-sm text-gray-600">
                    {rndStrategy ? RND_STRATEGIES.find((s) => s.id === rndStrategy)?.name : 'None'}
                  </div>
                </div>
                {rndSelections.length > 0 && (
                  <div className="pb-5 border-b border-gray-200">
                    <div className="font-['Poppins'] font-bold text-base text-black mb-3">R&D Tests ({rndSelections.length})</div>
                    <div className="space-y-2">
                      {rndSelections.map((sel, idx) => (
                        <div key={sel.id} className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="bg-[#E63946] text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                          <span>{rndTiers.find((t) => t.tier === sel.tier)?.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="pb-5 border-b border-gray-200">
                  <div className="font-['Poppins'] font-bold text-base text-black mb-2">Analytics Tools</div>
                  <div className="text-sm text-gray-600">
                    {selectedAnalyticsTools.length > 0 ? (
                      <div>
                        <div className="mb-2">{selectedAnalyticsTools.length} tool(s) selected</div>
                        <div className="max-h-[200px] overflow-y-auto space-y-1">
                          {selectedAnalyticsTools.map((tool, idx) => (
                            <div key={idx} className="text-xs bg-gray-50 p-2 rounded border border-gray-200">
                              • {tool}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : 'No analytics tools selected'}
                  </div>
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
                  className="flex-1 px-4 py-3 bg-linear-to-br from-[#E63946] to-[#C1121F] text-white rounded-xl font-semibold transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-50"
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
