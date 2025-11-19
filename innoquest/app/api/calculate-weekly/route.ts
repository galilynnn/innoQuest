import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateWeeklyResults } from '@/lib/game-calculations'

export async function POST(request: NextRequest) {
  try {
    const { teamId, decisions } = await request.json()

    if (!teamId || !decisions) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Fetch team data
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('team_id', teamId)
      .single()

    if (teamError || !team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    // Fetch game settings for R&D tier configuration, investment config, and admin-set values
    const { data: gameSettings, error: settingsError } = await supabase
      .from('game_settings')
      .select('rnd_tier_config, investment_config, population_size, cost_per_analytics')
      .eq('game_id', team.game_id)
      .single()

    if (settingsError) {
      console.warn('Failed to fetch game settings, using defaults:', settingsError)
    }

    // Fetch average purchase probability from products_info table
    const { data: productsInfo, error: productsInfoError } = await supabase
      .from('products_info')
      .select('purchase_probability')

    let avgPurchaseProbability = 0.5 // Default fallback
    if (!productsInfoError && productsInfo && productsInfo.length > 0) {
      const sum = productsInfo.reduce((acc, product) => acc + (product.purchase_probability || 0), 0)
      avgPurchaseProbability = sum / productsInfo.length
    }

    // Calculate results
    const calculationInput = {
      product_id: decisions.selected_product_id || 1,
      set_price: decisions.set_price || 99,
      rnd_tier: decisions.rnd_tier,
      analytics_purchased: decisions.analytics_purchased || false,
      analytics_quantity: decisions.analytics_quantity || 0,
      population_size: gameSettings?.population_size || 10000,
      cost_per_analytics: gameSettings?.cost_per_analytics || 5000,
      current_customer_count: team.total_balance,
      rnd_multiplier: 1.0,
      rnd_tier_config: gameSettings?.rnd_tier_config || undefined,
      investment_config: gameSettings?.investment_config || undefined,
      current_funding_stage: team.funding_stage || 'Pre-Seed',
      successful_rnd_tests: team.successful_rnd_tests || 0,
      avg_purchase_probability: avgPurchaseProbability,
    }

    const results = calculateWeeklyResults(calculationInput)

    // Update team data
    const newBalance = team.total_balance + results.profit
    const newSuccessfulTests = team.successful_rnd_tests + (results.rnd_success ? 1 : 0)

    const { error: updateError } = await supabase
      .from('teams')
      .update({
        total_balance: newBalance,
        successful_rnd_tests: newSuccessfulTests,
      })
      .eq('team_id', teamId)

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update team' },
        { status: 500 }
      )
    }

    // Log the action
    await supabase.from('game_logs').insert({
      game_id: team.game_id,
      team_id: teamId,
      action: 'weekly_decisions',
      details: calculationInput,
      result: results,
    })

    return NextResponse.json({
      success: true,
      results,
      newBalance,
      newSuccessfulTests,
    })
  } catch (error) {
    console.error('Calculation error:', error)
    return NextResponse.json(
      { error: 'Calculation failed' },
      { status: 500 }
    )
  }
}
