import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateWeeklyResults } from '@/lib/game-calculations'

export async function POST(request: NextRequest) {
  try {
    const { gameId } = await request.json()

    if (!gameId) {
      return NextResponse.json(
        { error: 'Missing gameId' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current game settings
    const { data: settings, error: settingsError } = await supabase
      .from('game_settings')
      .select('*')
      .eq('game_id', gameId)
      .single()

    if (settingsError || !settings) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }

    // Check if game is already completed
    if (settings.game_status === 'completed') {
      return NextResponse.json(
        { error: 'Game already completed' },
        { status: 400 }
      )
    }

    // Check if we're on the last week - this should just end the game, not advance further
    const isLastWeek = settings.current_week === settings.total_weeks

    console.log('Game settings:', {
      game_id: settings.game_id,
      game_status: settings.game_status,
      current_week: settings.current_week,
      total_weeks: settings.total_weeks,
      isLastWeek
    })

    // Get all teams
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .eq('game_id', gameId)

    if (teamsError) {
      console.error('Error loading teams:', teamsError)
      return NextResponse.json(
        { error: 'Failed to load teams' },
        { status: 500 }
      )
    }

    console.log('Total teams found:', teams?.length)
    
    // Count teams that have joined the game (have any last_activity)
    const teamsInGame = teams?.filter(t => t.last_activity !== null) || []
    
    console.log('Teams that have joined:', teamsInGame.length)
    
    if (teamsInGame.length === 0) {
      return NextResponse.json(
        { 
          error: 'No teams have joined the game yet. Students must log in first.',
          activeCount: 0,
          totalTeams: teams?.length || 0
        },
        { status: 400 }
      )
    }
    
    // For active game status, check for recently active teams
    const now = new Date()
    const twoMinutesAgo = new Date(now.getTime() - 120000)
    
    // Log each team's activity status with more details
    teamsInGame.forEach(t => {
      const lastActivityDate = new Date(t.last_activity)
      const diffMs = now.getTime() - lastActivityDate.getTime()
      const diffSeconds = Math.floor(diffMs / 1000)
      console.log(`Team ${t.team_name}:`, {
        last_activity: t.last_activity,
        diff_seconds: diffSeconds
      })
    })

    // Process ALL teams that have joined the game (not just actively online ones)
    // This is better for turn-based gameplay where students don't need to be online
    const teamsToProcess = teamsInGame

    console.log('Teams to process:', teamsToProcess.map(t => t.team_name).join(', '))
    console.log('Teams count:', teamsToProcess.length)

    // Fetch game settings for R&D tier configuration, investment config, and admin-set values
    const { data: gameSettingsData, error: settingsDataError } = await supabase
      .from('game_settings')
      .select('rnd_tier_config, investment_config, population_size, cost_per_analytics')
      .eq('game_id', gameId)
      .single()

    if (settingsDataError) {
      console.warn('Failed to fetch game configs, will use defaults:', settingsDataError)
    }

    const rndTierConfig = gameSettingsData?.rnd_tier_config || undefined
    const investmentConfig = gameSettingsData?.investment_config || undefined
    const populationSize = gameSettingsData?.population_size || 10000
    const costPerAnalytics = gameSettingsData?.cost_per_analytics || 5000

    // Fetch average purchase probability from products table
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('purchase_probability')

    console.log('📊 Products query result:', { 
      count: products?.length, 
      error: productsError?.message 
    })

    let avgPurchaseProbability = 0.5 // Default fallback
    if (!productsError && products && products.length > 0) {
      const sum = products.reduce((acc, product) => acc + (product.purchase_probability || 0), 0)
      avgPurchaseProbability = sum / products.length
      console.log('✅ Calculated avg purchase probability:', avgPurchaseProbability)
    } else {
      console.warn('⚠️ Using default purchase probability (0.5). products table may not have purchase_probability column.')
    }

    // Process calculations for ALL teams that have joined the game
    const updates = []
    
    for (const team of teamsToProcess) {
      try {
        // Get team's pending decisions for current week from weekly_results
        const { data: weeklyResult } = await supabase
          .from('weekly_results')
          .select('*')
          .eq('team_id', team.team_id)
          .eq('week_number', settings.current_week)
          .single()

        if (!weeklyResult) {
          console.log(`Team ${team.team_name} did not submit decisions for week ${settings.current_week}`)
          continue
        }

        // Run calculations using the game calculation engine
        const calculationInput = {
          product_id: team.assigned_product_id ? parseInt(team.assigned_product_id) : 1,
          set_price: weeklyResult.set_price || 99,
          rnd_tier: weeklyResult.rnd_tier,
          analytics_purchased: weeklyResult.analytics_purchased || false,
          analytics_quantity: weeklyResult.analytics_quantity || 0,
          population_size: populationSize,
          cost_per_analytics: costPerAnalytics,
          current_customer_count: team.total_balance || 0,
          rnd_multiplier: 1.0,
          rnd_tier_config: rndTierConfig,
          investment_config: investmentConfig,
          current_funding_stage: team.funding_stage || 'Pre-Seed',
          successful_rnd_tests: team.successful_rnd_tests || 0,
          bonus_multiplier_pending: team.bonus_multiplier_pending || null,
          avg_purchase_probability: avgPurchaseProbability,
        }

        const results = calculateWeeklyResults(calculationInput)

        // Update weekly_results with calculated values
        await supabase
          .from('weekly_results')
          .update({
            demand: results.demand,
            revenue: results.revenue,
            costs: results.total_costs,
            profit: results.profit,
            rnd_success: results.rnd_success,
            rnd_cost: results.rnd_cost,
            rnd_success_probability: results.rnd_success_probability,
            rnd_multiplier: results.rnd_multiplier,
            pass_fail_status: results.pass_fail_status,
            bonus_earned: results.bonus,
          })
          .eq('id', weeklyResult.id)
        
        // Update team with new balance, successful tests, funding stage, and CLEAR bonus multiplier
        const newBalance = (team.total_balance || 0) + results.profit
        const newSuccessfulTests = (team.successful_rnd_tests || 0) + (results.rnd_success ? 1 : 0)
        const newFundingStage = results.next_funding_stage || team.funding_stage || 'Pre-Seed'

        const updateResult = await supabase
          .from('teams')
          .update({
            total_balance: newBalance,
            successful_rnd_tests: newSuccessfulTests,
            funding_stage: newFundingStage,
            bonus_multiplier_pending: null, // Clear the bonus after applying it
            updated_at: new Date().toISOString()
          })
          .eq('team_id', team.team_id)
          
        console.log(`✅ Calculated results for ${team.team_name}:`, {
          revenue: results.revenue,
          costs: results.total_costs,
          profit: results.profit,
          rnd_success: results.rnd_success,
          rnd_success_probability: results.rnd_success_probability,
          rnd_cost: results.rnd_cost,
          current_stage: team.funding_stage,
          new_stage: newFundingStage,
          funding_advanced: results.funding_advanced,
          bonus_multiplier_applied: results.bonus_multiplier_applied,
        })

        updates.push(updateResult)
      } catch (error) {
        console.error(`Error processing team ${team.team_name}:`, error)
        updates.push({ error })
      }
    }

    // Check if any updates failed
    const failedUpdates = updates.filter((u: any) => u.error)
    if (failedUpdates.length > 0) {
      console.error('Some team updates failed:', failedUpdates)
    }

    // If we're on the last week, just mark as completed without advancing
    // Otherwise, advance to the next week
    const shouldAdvanceWeek = settings.current_week < settings.total_weeks
    const nextWeek = shouldAdvanceWeek ? settings.current_week + 1 : settings.current_week
    const newStatus = settings.current_week === settings.total_weeks ? 'completed' : 'active'

    // Update the game status and set week_start_time for countdown timer
    const { error: updateWeekError } = await supabase
      .from('game_settings')
      .update({
        current_week: nextWeek,
        game_status: newStatus,
        week_start_time: new Date().toISOString() // Set start time for countdown
      })
      .eq('game_id', gameId)

    console.log('Updating game:', {
      currentWeek: settings.current_week,
      nextWeek,
      totalWeeks: settings.total_weeks,
      shouldAdvanceWeek,
      newStatus
    })

    if (updateWeekError) {
      console.error('Failed to update week:', updateWeekError)
      return NextResponse.json(
        { error: 'Failed to advance week: ' + updateWeekError.message },
        { status: 500 }
      )
    }

    // Log event (don't fail the request if logging fails)
    try {
      await supabase.from('game_logs').insert({
        game_id: gameId,
        team_id: null,
        action: newStatus === 'completed' ? 'game_completed' : 'week_advanced',
        details: { 
          week: nextWeek,
          teamsProcessed: teamsToProcess.length,
          totalTeams: teams?.length || 0,
          gameCompleted: newStatus === 'completed'
        },
        result: { success: true },
      })
    } catch (logError) {
      console.error('Failed to log event (non-critical):', logError)
    }

    const message = newStatus === 'completed' 
      ? `🏁 Game completed! All students will be redirected to results. Processed ${teamsToProcess.length} teams.`
      : `Week ${nextWeek} started! Processed ${teamsToProcess.length} teams.`

    return NextResponse.json({
      success: true,
      currentWeek: nextWeek,
      totalWeeks: settings.total_weeks,
      teamsProcessed: teamsToProcess.length,
      message,
      gameCompleted: newStatus === 'completed'
    })
  } catch (error: any) {
    console.error('Advance week error:', error)
    return NextResponse.json(
      { error: 'Failed to advance week: ' + (error.message || 'Unknown error') },
      { status: 500 }
    )
  }
}
