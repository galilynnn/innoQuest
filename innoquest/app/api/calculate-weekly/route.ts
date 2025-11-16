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
      .eq('id', teamId)
      .single()

    if (teamError || !team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    // Calculate results
    const calculationInput = {
      product_id: decisions.selected_product_id || 1,
      set_price: decisions.set_price || 99,
      rnd_tier: decisions.rnd_tier,
      analytics_purchased: decisions.analytics_purchased || false,
      current_customer_count: team.total_balance,
      rnd_multiplier: 1.0,
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
      .eq('id', teamId)

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
