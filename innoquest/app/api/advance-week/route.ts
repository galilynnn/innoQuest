import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateWeeklyResults, processRndTest, calculateDemand, calculateRevenue, calculateCOGS, calculateOperatingCosts, determineFundingStatus } from '@/lib/game-calculations'

export async function POST(request: NextRequest) {
  console.log('🚀 ============================================')
  console.log('🚀 ADVANCE WEEK API CALLED')
  console.log('🚀 ============================================')
  
  try {
    const { gameId } = await request.json()
    
    console.log('📝 Request gameId:', gameId)

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
      .select('rnd_tier_config, investment_config, population_size')
      .eq('game_id', gameId)
      .single()

    if (settingsDataError) {
      console.warn('Failed to fetch game configs:', settingsDataError)
      console.warn('This will cause calculations to fail!')
    }

    console.log('📦 Raw game settings data:', gameSettingsData)

    const rndTierConfig = gameSettingsData?.rnd_tier_config || undefined
    const investmentConfig = gameSettingsData?.investment_config || undefined
    const populationSize = gameSettingsData?.population_size || 10000
    const costPerAnalytics = 5000 // Fixed value since column doesn't exist

    console.log('⚙️ ============================================')
    console.log('⚙️ GAME CONFIGURATION LOADED')
    console.log('⚙️ ============================================')
    console.log('⚙️ RND Tier Config exists:', !!rndTierConfig)
    console.log('⚙️ RND Tier Config keys:', rndTierConfig ? Object.keys(rndTierConfig) : 'NONE')
    console.log('⚙️ RND Tier Config data:', JSON.stringify(rndTierConfig, null, 2))
    console.log('⚙️ Investment Config exists:', !!investmentConfig)
    console.log('⚙️ Investment Config keys:', investmentConfig ? Object.keys(investmentConfig) : 'NONE')
    console.log('⚙️ Population Size:', populationSize)
    console.log('⚙️ Cost Per Analytics:', costPerAnalytics)
    console.log('⚙️ ============================================')

    // Fetch average purchase probability from products_info table
    const { data: productsInfo, error: productsInfoError } = await supabase
      .from('products_info')
      .select('purchase_probability')

    console.log('📊 Products_info query result:', { 
      count: productsInfo?.length, 
      error: productsInfoError?.message 
    })

    let avgPurchaseProbability = 0.5 // Default fallback
    if (!productsInfoError && productsInfo && productsInfo.length > 0) {
      const sum = productsInfo.reduce((acc, product) => acc + (product.purchase_probability || 0), 0)
      avgPurchaseProbability = sum / productsInfo.length
      console.log('✅ Calculated avg purchase probability:', avgPurchaseProbability)
    } else {
      console.warn('⚠️ Using default purchase probability (0.5). products_info table may not have purchase_probability column.')
    }

    // Process calculations for ALL teams that have joined the game
    const updates = []
    
    for (const team of teamsToProcess) {
      try {
        console.log(`🔍 Processing team: ${team.team_name}, team.team_id: ${team.team_id}`)
        
        // Get team's pending decisions for current week from weekly_results
        // NOTE: Database column is 'teams_id' not 'team_id'
        // Support both possible column names (teams_id or team_id) to be resilient to DB schema
        const { data: weeklyResult, error: weeklyResultError } = await supabase
          .from('weekly_results')
          .select('*')
          .or(`teams_id.eq.${team.team_id},team_id.eq.${team.team_id}`)
          .eq('week_number', settings.current_week)
          .maybeSingle()

        console.log(`📋 Weekly result query for ${team.team_name}:`, {
          found: !!weeklyResult,
          error: weeklyResultError?.message,
          teams_id: team.team_id,
          week_number: settings.current_week
        })

        if (!weeklyResult) {
          console.log(`⚠️ Team ${team.team_name} did not submit decisions for week ${settings.current_week}`)
          continue
        }
        
        console.log(`✅ Found submission for ${team.team_name}:`, {
          rnd_tier: weeklyResult.rnd_tier,
          set_price: weeklyResult.set_price,
        })

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

        console.log(`🎯 Calculation input for ${team.team_name}:`, {
          set_price: calculationInput.set_price,
          avg_purchase_probability: avgPurchaseProbability,
          population_size: populationSize,
          rnd_tier: calculationInput.rnd_tier,
          has_rnd_tier_config: !!rndTierConfig,
          has_investment_config: !!investmentConfig,
        })

        console.log(`🔧 Full calculation input for ${team.team_name}:`)
        console.log(JSON.stringify(calculationInput, null, 2))

        let results
        let firstTest: any = null
        let secondTest: any = null
        try {
          console.log(`⚡ Starting calculation for ${team.team_name}...`)
          // If the student selected a second R&D tier, evaluate both tests
          // to support 'two-always' and 'two-if-fail' strategies.
          if (weeklyResult.rnd_tier_2) {
            console.log('🔬 Processing two-test R&D strategy:', weeklyResult.rnd_strategy)

            // Run the first test explicitly
            firstTest = processRndTest(weeklyResult.rnd_tier, rndTierConfig)

            // Determine whether to run second test based on strategy
            let secondTest = null as null | ReturnType<typeof processRndTest>
            const runSecond = (weeklyResult.rnd_strategy === 'two-always') || (weeklyResult.rnd_strategy === 'two-if-fail' && !firstTest.success)

            if (runSecond) {
              secondTest = processRndTest(weeklyResult.rnd_tier_2, rndTierConfig)
            }

            // Now compute combined results: pick the highest multiplier among successful tests,
            // sum the costs, success if any test succeeded, and choose the probability from the run that succeeded first.
            const combinedSuccess = firstTest.success || (secondTest?.success || false)
            let combinedMultiplier = firstTest.multiplier
            if (secondTest && secondTest.success && secondTest.multiplier > combinedMultiplier) {
              combinedMultiplier = secondTest.multiplier
            }
            const combinedCost = firstTest.cost + (secondTest ? secondTest.cost : 0)
            const successProbability = firstTest.success ? firstTest.successProbability : (secondTest ? secondTest.successProbability : firstTest.successProbability)

            // Recreate the same calculations the main engine does, but using the combined values
            const demand = calculateDemand(calculationInput.avg_purchase_probability, calculationInput.population_size)
            const revenue = calculateRevenue(demand, calculationInput.set_price)
            const cogs = calculateCOGS(revenue, calculationInput.product_id)
            const operatingCost = calculateOperatingCosts(demand)
            const analyticsCost = (calculationInput.analytics_quantity || 0) * (calculationInput.cost_per_analytics || 5000)
            const totalCosts = cogs + operatingCost + combinedCost + analyticsCost
            let profit = revenue - totalCosts
            if (calculationInput.bonus_multiplier_pending) {
              profit = Math.round(profit * (calculationInput.bonus_multiplier_pending || 1))
            }

            // Determine funding pass/fail using total successful tests -> include combined success
            const totalSuccessfulTests = (team.successful_rnd_tests || 0) + (combinedSuccess ? 1 : 0)
            const { status: passFail, bonus, qualifiesForNextStage, nextStage } = determineFundingStatus(
              revenue,
              demand,
              totalSuccessfulTests,
              calculationInput.current_funding_stage || 'Pre-Seed',
              calculationInput.investment_config
            )

            results = {
              demand,
              revenue,
              cogs_cost: cogs,
              operating_cost: operatingCost,
              rnd_cost: combinedCost,
              analytics_cost: analyticsCost,
              total_costs: totalCosts,
              profit: Math.max(-10000, profit),
              rnd_tested: true,
              rnd_success: combinedSuccess,
              pass_fail_status: passFail,
              bonus,
              rnd_success_probability: successProbability * 100,
              rnd_multiplier: combinedMultiplier,
              next_funding_stage: nextStage,
              funding_advanced: qualifiesForNextStage,
              bonus_multiplier_applied: calculationInput.bonus_multiplier_pending || null,
            }

            // Update second rnd_tests row success if it was run
            try {
              if (secondTest) {
                const { data: rndUpdate, error: rndUpdateError } = await supabase
                  .from('rnd_tests')
                  .update({ success: secondTest.success })
                  .eq('teams_id', team.team_id)
                  .eq('week_number', settings.current_week)
                  .eq('tier', weeklyResult.rnd_tier_2)

                if (rndUpdateError) console.warn('⚠️ rnd_tests second test update error:', rndUpdateError)
                else console.log('🔁 rnd_tests second test updated:', rndUpdate)
              }
            } catch (err) {
              console.error('❌ Error updating rnd_tests (second test):', err)
            }
          } else {
            // Single R&D test path (existing behavior)
            results = calculateWeeklyResults(calculationInput)
            // Record first test output so we can update rnd_tests history to match engine
            firstTest = {
              success: results.rnd_success,
              multiplier: results.rnd_multiplier,
              cost: results.rnd_cost,
              successProbability: results.rnd_success_probability
            }
          }

          console.log(`💰 Calculation results for ${team.team_name}:`, {
            demand: results.demand,
            revenue: results.revenue,
            costs: results.total_costs,
            profit: results.profit,
            rnd_success_probability: results.rnd_success_probability,
            rnd_multiplier: results.rnd_multiplier,
          })
        } catch (calcError: any) {
          console.error(`❌ Calculation failed for ${team.team_name}:`, calcError.message)
          throw calcError
        }

        // Update weekly_results with calculated values
        const { data: updateData, error: updateError } = await supabase
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
        
        if (updateError) {
          console.error(`❌ Failed to update weekly_results for ${team.team_name}:`, updateError)
          throw new Error(`Database update failed: ${updateError.message}`)
        }
        
        console.log(`✅ Successfully updated weekly_results for ${team.team_name}`)
        console.log(`📊 Updated values:`, {
          demand: results.demand,
          revenue: results.revenue,
          rnd_success: results.rnd_success,
          rnd_cost: results.rnd_cost,
          rnd_success_probability: results.rnd_success_probability,
          rnd_multiplier: results.rnd_multiplier,
        })
        
          // Update rnd_tests table so test history reflects the calculated result
          try {
            console.log('🔁 Updating rnd_tests with roll result for', team.team_name)
            const { data: rndUpdate, error: rndUpdateError } = await supabase
              .from('rnd_tests')
              .update({ success: firstTest?.success ?? results.rnd_success })
              .eq('teams_id', team.team_id)
              .eq('week_number', settings.current_week)
              .eq('tier', weeklyResult.rnd_tier)

            if (rndUpdateError) console.warn('⚠️ rnd_tests update error:', rndUpdateError)
            else console.log('🔁 rnd_tests updated:', rndUpdate)
          } catch (err) {
            console.error('❌ Error updating rnd_tests:', err)
          }
        
        // Update team with new balance, successful tests, funding stage, and CLEAR bonus multiplier
        const newBalance = (team.total_balance || 0) + results.profit
        // Count how many R&D tests were successful this week (supports two-test strategies)
        let successIncrement = 0
        if (weeklyResult.rnd_tier_2) {
          const firstSuccess = firstTest?.success ?? results.rnd_success
          const secondSuccess = secondTest?.success ?? false
          successIncrement = (firstSuccess ? 1 : 0) + (secondSuccess ? 1 : 0)
        } else {
          successIncrement = results.rnd_success ? 1 : 0
        }

        const newSuccessfulTests = (team.successful_rnd_tests || 0) + successIncrement
        const newFundingStage = results.next_funding_stage || team.funding_stage || 'Pre-Seed'

        console.log('🔔 R&D test summary for team:', team.team_name, {
          firstTest: firstTest ? { success: firstTest.success, cost: firstTest.cost, multiplier: firstTest.multiplier } : null,
          secondTest: secondTest ? { success: secondTest.success, cost: secondTest.cost, multiplier: secondTest.multiplier } : null,
          successIncrement,
          newSuccessfulTests
        })

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
    console.error('❌ ============================================')
    console.error('❌ ADVANCE WEEK ERROR')
    console.error('❌ ============================================')
    console.error('❌ Error message:', error.message)
    console.error('❌ Error stack:', error.stack)
    console.error('❌ Full error:', error)
    console.error('❌ ============================================')
    return NextResponse.json(
      { error: 'Failed to advance week: ' + (error.message || 'Unknown error') },
      { status: 500 }
    )
  }
}
