import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateWeeklyResults, processRndTest, calculateDemand, calculateRevenue, calculateOperatingCosts, determineFundingStatus, calculateBalanceAward } from '@/lib/game-calculations'

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
      .select('*, products:assigned_product_id(product_id)')
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
      .select('rnd_tier_config, investment_config, population_size, analytics_cost, base_operating_cost')
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
    const costPerAnalytics = gameSettingsData?.analytics_cost || 5000
    const baseOperatingCost = gameSettingsData?.base_operating_cost || 20000

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
    console.log('⚙️ Base Operating Cost:', baseOperatingCost)
    console.log('⚙️ ============================================')

    // Process calculations for ALL teams that have joined the game
    const updates = []
    const milestoneAdvancements: Array<{
      team_id: string
      team_name: string
      old_stage: string
      new_stage: string
      revenue: number
      timestamp: number
    }> = []
    
    for (const team of teamsToProcess) {
      try {
        console.log(`🔍 Processing team: ${team.team_name}, team.team_id: ${team.team_id}`)
        
        // Get team's pending decisions for current week from weekly_results
        // Use team_id column (teams_id was removed from database)
        const { data: weeklyResult, error: weeklyResultError } = await supabase
          .from('weekly_results')
          .select('*')
          .eq('team_id', team.team_id)
          .eq('week_number', settings.current_week)
          .maybeSingle()

        console.log(`📋 Weekly result query for ${team.team_name}:`, {
          found: !!weeklyResult,
          error: weeklyResultError?.message,
          team_id: team.team_id,
          week_number: settings.current_week
        })

        if (!weeklyResult) {
          console.log(`⚠️ Team ${team.team_name} did not submit decisions for week ${settings.current_week}`)
          continue
        }
        
        console.log(`✅ Found submission for ${team.team_name}:`, {
          rnd_tier: weeklyResult.rnd_tier,
          set_price: weeklyResult.set_price,
          week_number: weeklyResult.week_number
        })

        // Resolve product ID from the joined products table or fallback
        let productId = 1
        // @ts-ignore - products property comes from the join
        if (team.products && team.products.product_id) {
          // Extract number from P001 format
          // @ts-ignore
          const match = team.products.product_id.match(/P(\d+)/)
          if (match && match[1]) {
            productId = parseInt(match[1], 10)
          }
        } else if (team.assigned_product_id) {
           // Fallback: try to parse if it's a simple number (legacy)
           const parsed = parseInt(team.assigned_product_id)
           if (!isNaN(parsed) && parsed > 0 && parsed <= 10) {
             productId = parsed
           }
        }

        console.log(`📊 Team ${team.team_name} assigned product ID: ${productId}`)

        // Calculate average purchase probability for this team's product
        // Query customer_purchase_probabilities using UUID product_id
        // team.assigned_product_id is the UUID from products table
        console.log(`🔍 Querying probabilities with:`, {
          game_id: gameId,
          team_id: team.team_id,
          product_id: team.assigned_product_id,
          product_id_type: typeof team.assigned_product_id
        })
        
        // Calculate average purchase probability for this team's product
        // Probabilities should have been calculated when student submitted decisions
        // Query existing probabilities from customer_purchase_probabilities table
        // ALWAYS recalculate probabilities with the CURRENT WEEK's price
        // This ensures probabilities match the price the student set for this week
        // The function deletes old probabilities and creates new ones
        let avgPurchaseProbability: number | null = null // null means not calculated yet
        
        if (team.assigned_product_id && weeklyResult.set_price) {
          console.log(`🔄 Calculating probabilities for ${team.team_name} with current week price: ${weeklyResult.set_price}`)
          
          try {
            const { error: recalcError } = await supabase.rpc('calculate_purchase_probabilities', {
              p_game_id: gameId,
              p_team_id: team.team_id,
              p_product_id: team.assigned_product_id,
              p_price: weeklyResult.set_price
            })
            
            if (recalcError) {
              console.error(`❌ Failed to calculate probabilities:`, recalcError)
              console.warn(`⚠️ Will try to use existing probabilities or default 0.5`)
            } else {
              console.log(`✅ Probabilities calculated for ${team.team_name} with price ${weeklyResult.set_price}`)
              // Small delay to ensure database transaction is committed
              await new Promise(resolve => setTimeout(resolve, 100))
            }
          } catch (recalcErr) {
            console.error(`❌ Exception calculating probabilities:`, recalcErr)
          }
        }
        
        // Query the probabilities (either newly calculated or existing)
        let { data: probabilities, error: probError } = await supabase
          .from('customer_purchase_probabilities')
          .select('purchase_probability')
          .eq('game_id', gameId)
          .eq('team_id', team.team_id)
          .eq('product_id', team.assigned_product_id)

        console.log(`📊 Probability query result for ${team.team_name}:`, {
          found: probabilities?.length || 0,
          error: probError?.message,
          sample: probabilities?.[0],
          first_few_values: probabilities?.slice(0, 5).map(p => p.purchase_probability)
        })
        
        if (probabilities && probabilities.length > 0) {
          // Calculate average - this will be 0 if all probabilities are 0 (high price scenario)
          const sum = probabilities.reduce((acc, p) => acc + (p.purchase_probability || 0), 0)
          avgPurchaseProbability = sum / probabilities.length
          
          console.log(`✅ Calculated avg purchase probability for ${team.team_name}:`, {
            count: probabilities.length,
            avgProbability: avgPurchaseProbability,
            minProbability: Math.min(...probabilities.map(p => p.purchase_probability || 0)),
            maxProbability: Math.max(...probabilities.map(p => p.purchase_probability || 0)),
            productUUID: team.assigned_product_id,
            price_used: weeklyResult.set_price,
            note: avgPurchaseProbability === 0 
              ? '⚠️ All probabilities are 0 (likely due to very high price). Demand will be 0.'
              : 'Probabilities calculated successfully.'
          })
        } else {
          // Only use default if probabilities don't exist at all (calculation failed)
          // If probabilities exist but are 0, we should use 0, not default
          avgPurchaseProbability = 0.5 // Default fallback only when no probabilities found
          console.warn(`⚠️ No probabilities found for ${team.team_name}, using default 0.5%`, {
            error: probError?.message,
            team_id: team.team_id,
            product_uuid: team.assigned_product_id,
            note: 'Using default probability 0.5%. This will result in low demand. Check if calculate_purchase_probabilities function exists and customer dataset is active.'
          })
        }
        
        // Ensure we have a valid number (should never be null at this point, but TypeScript safety)
        if (avgPurchaseProbability === null) {
          avgPurchaseProbability = 0.5
        }

        // Run calculations using the game calculation engine
        // IMPORTANT: avgPurchaseProbability is a percentage (0-100), where 0 means 0% and 100 means 100%
        // If probabilities are 0 (high price scenario), avgPurchaseProbability should be 0
        console.log(`🎯 Final avgPurchaseProbability for ${team.team_name}: ${avgPurchaseProbability}% (will be used in demand calculation)`)
        
        const calculationInput = {
          product_id: productId,
          set_price: weeklyResult.set_price || 99,
          rnd_tier: weeklyResult.rnd_tier,
          analytics_purchased: weeklyResult.analytics_purchased || false,
          analytics_quantity: weeklyResult.analytics_quantity || 0,
          population_size: populationSize,
          cost_per_analytics: costPerAnalytics,
          base_operating_cost: baseOperatingCost,
          current_customer_count: team.total_balance || 0,
          rnd_multiplier: 1.0,
          rnd_tier_config: rndTierConfig,
          investment_config: investmentConfig,
          current_funding_stage: team.funding_stage || 'Pre-Seed',
          successful_rnd_tests: team.successful_rnd_tests || 0,
          bonus_multiplier_pending: team.bonus_multiplier_pending || null,
          avg_purchase_probability: avgPurchaseProbability, // This is a percentage (0-100)
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
            console.log(`🔬 First R&D test result:`, {
              tier: weeklyResult.rnd_tier,
              success: firstTest.success,
              cost: firstTest.cost,
              multiplier: firstTest.multiplier
            })

            // Determine whether to run second test based on strategy
            // For "two-if-fail": only run second test if first test failed
            // For "two-always": always run second test
            const runSecond = (weeklyResult.rnd_strategy === 'two-always') || (weeklyResult.rnd_strategy === 'two-if-fail' && !firstTest.success)
            
            console.log(`🔬 Second test decision:`, {
              strategy: weeklyResult.rnd_strategy,
              firstTestSuccess: firstTest.success,
              runSecond: runSecond,
              reason: weeklyResult.rnd_strategy === 'two-always' 
                ? 'two-always strategy (always run)' 
                : weeklyResult.rnd_strategy === 'two-if-fail' && !firstTest.success
                ? 'two-if-fail strategy (first failed)'
                : 'two-if-fail strategy (first passed, skip second)'
            })

            if (runSecond) {
              secondTest = processRndTest(weeklyResult.rnd_tier_2, rndTierConfig)
              console.log(`🔬 Second R&D test executed:`, {
                tier: weeklyResult.rnd_tier_2,
                success: secondTest.success,
                cost: secondTest.cost,
                multiplier: secondTest.multiplier
              })
            } else {
              // Explicitly set secondTest to null to ensure it's not used later
              secondTest = null
              console.log(`🔬 Second R&D test skipped (strategy: ${weeklyResult.rnd_strategy}, first test success: ${firstTest.success})`)
              console.log(`🔬 secondTest is now:`, secondTest)
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
            console.log(`💰 ===== REVENUE CALCULATION FOR ${team.team_name} =====`)
            console.log(`📊 Step 1 - Calculate Base Demand:`, {
              formula: '(population_size × avg_probability) / 100',
              avg_probability: calculationInput.avg_purchase_probability,
              population_size: calculationInput.population_size,
              calculation: `(${calculationInput.population_size} × ${calculationInput.avg_purchase_probability}) / 100`
            })
            const baseDemand = calculateDemand(calculationInput.avg_purchase_probability, calculationInput.population_size)
            console.log(`✅ Base Demand Result: ${baseDemand} units`)
            
            // Apply R&D multiplier to demand (if any test succeeded, use the highest multiplier)
            let demand = baseDemand
            if (combinedSuccess || firstTest || secondTest) {
              const demandBeforeMultiplier = demand
              demand = Math.round(demand * combinedMultiplier)
              console.log(`🔬 Step 1.5 - Apply R&D Multiplier:`, {
                rnd_success: combinedSuccess,
                multiplier: combinedMultiplier,
                demand_before: demandBeforeMultiplier,
                demand_after: demand,
                calculation: `${demandBeforeMultiplier} × ${combinedMultiplier} = ${demand}`
              })
            }
            
            console.log(`📊 Step 2 - Calculate Revenue:`, {
              formula: 'demand × price',
              demand: demand,
              price: calculationInput.set_price,
              calculation: `${demand} × ${calculationInput.set_price}`
            })
            const revenue = calculateRevenue(demand, calculationInput.set_price)
            console.log(`✅ Revenue Result: ฿${revenue.toLocaleString()}`)
            console.log(`💰 ==========================================`)
            const operatingCost = calculateOperatingCosts(demand, calculationInput.base_operating_cost || 20000)
            const analyticsCost = (calculationInput.analytics_quantity || 0) * (calculationInput.cost_per_analytics || 5000)
            const totalCosts = operatingCost + combinedCost + analyticsCost
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

            // Note: rnd_tests table updates are handled later in the code (after weekly_results update)
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
            
            // Update first test result
            const { data: rndUpdate, error: rndUpdateError } = await supabase
              .from('rnd_tests')
              .update({ success: firstTest?.success ?? results.rnd_success })
              .eq('team_id', team.team_id)
              .eq('week_number', settings.current_week)
              .eq('tier', weeklyResult.rnd_tier)

            if (rndUpdateError) console.warn('⚠️ rnd_tests update error:', rndUpdateError)
            else console.log('🔁 rnd_tests updated:', rndUpdate)
            
            // For "two-if-fail" strategy: only insert second test if first test failed and second test was run
            console.log('🔁 Checking if second test should be inserted:', {
              strategy: weeklyResult.rnd_strategy,
              isTwoIfFail: weeklyResult.rnd_strategy === 'two-if-fail',
              hasSecondTest: !!secondTest,
              firstTestSuccess: firstTest?.success,
              shouldInsert: weeklyResult.rnd_strategy === 'two-if-fail' && secondTest && !firstTest.success
            })
            
            if (weeklyResult.rnd_strategy === 'two-if-fail' && secondTest && !firstTest.success) {
              console.log('🔁 Inserting second R&D test for two-if-fail strategy (first test failed)')
              console.log('🔁 Second test details:', {
                team_id: team.team_id,
                week_number: settings.current_week,
                tier: weeklyResult.rnd_tier_2,
                success: secondTest.success
              })
              const { data: secondRndInsert, error: secondRndError } = await supabase
                .from('rnd_tests')
                .insert({
                  team_id: team.team_id,
                  week_number: settings.current_week,
                  tier: weeklyResult.rnd_tier_2,
                  success: secondTest.success,
                })
              
              if (secondRndError) {
                console.error('❌ Second rnd_tests insert error:', secondRndError)
              } else {
                console.log('✅ Second rnd_tests inserted successfully:', secondRndInsert)
              }
            } else if (weeklyResult.rnd_strategy === 'two-if-fail' && !secondTest && firstTest.success) {
              console.log('✅ Second test correctly skipped (first test passed)')
            } else if (weeklyResult.rnd_strategy === 'two-if-fail' && !secondTest && !firstTest.success) {
              console.warn('⚠️ WARNING: First test failed but secondTest is null! This should not happen.')
            }
            
            // For "two-always" strategy: update second test result (it was already inserted during submission)
            if (weeklyResult.rnd_strategy === 'two-always' && secondTest && weeklyResult.rnd_tier_2) {
              console.log('🔁 Updating second R&D test for two-always strategy')
              const { data: secondRndUpdate, error: secondRndUpdateError } = await supabase
                .from('rnd_tests')
                .update({ success: secondTest.success })
                .eq('team_id', team.team_id)
                .eq('week_number', settings.current_week)
                .eq('tier', weeklyResult.rnd_tier_2)
              
              if (secondRndUpdateError) console.warn('⚠️ Second rnd_tests update error:', secondRndUpdateError)
              else console.log('🔁 Second rnd_tests updated:', secondRndUpdate)
            }
          } catch (err) {
            console.error('❌ Error updating rnd_tests:', err)
          }
        
        // Update team with new balance, successful tests, funding stage, and CLEAR bonus multiplier
        const newBalance = (team.total_balance || 0) + results.profit
        // Count how many R&D tests were successful this week (supports two-test strategies)
        let successIncrement = 0
        if (weeklyResult.rnd_tier_2) {
          const firstSuccess = firstTest?.success ?? results.rnd_success
          // For "two-if-fail" strategy: only count second test if it was actually run (i.e., first test failed)
          // For "two-always" strategy: always count second test if it exists
          let secondSuccess = false
          if (weeklyResult.rnd_strategy === 'two-always' && secondTest) {
            // For "two-always", second test is always run, so count it
            secondSuccess = secondTest.success
          } else if (weeklyResult.rnd_strategy === 'two-if-fail' && secondTest && !firstTest.success) {
            // For "two-if-fail", only count second test if first failed and second was run
            secondSuccess = secondTest.success
          }
          // If strategy is "two-if-fail" and first test passed, secondSuccess remains false (correct behavior)
          successIncrement = (firstSuccess ? 1 : 0) + (secondSuccess ? 1 : 0)
          
          console.log(`📊 Success increment calculation:`, {
            strategy: weeklyResult.rnd_strategy,
            firstSuccess,
            secondSuccess,
            secondTestExists: !!secondTest,
            firstTestPassed: firstTest?.success,
            successIncrement
          })
        } else {
          successIncrement = results.rnd_success ? 1 : 0
        }

        const newSuccessfulTests = (team.successful_rnd_tests || 0) + successIncrement
        const newFundingStage = results.next_funding_stage || team.funding_stage || 'Pre-Seed'
        
        // Track milestone advancements for balance calculation
        if (results.funding_advanced && newFundingStage && newFundingStage !== team.funding_stage) {
          milestoneAdvancements.push({
            team_id: team.team_id,
            team_name: team.team_name,
            old_stage: team.funding_stage || 'Pre-Seed',
            new_stage: newFundingStage,
            revenue: results.revenue,
            timestamp: Date.now() // Use timestamp to determine order (first to reach)
          })
        }

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

    // Process milestone achievements and calculate balance awards
    if (milestoneAdvancements.length > 0 && investmentConfig) {
      console.log('🏆 Processing milestone achievements:', milestoneAdvancements.length)
      
      // Group advancements by milestone stage
      const milestonesByStage: Record<string, typeof milestoneAdvancements> = {}
      for (const advancement of milestoneAdvancements) {
        if (!milestonesByStage[advancement.new_stage]) {
          milestonesByStage[advancement.new_stage] = []
        }
        milestonesByStage[advancement.new_stage].push(advancement)
      }

      // Process each milestone stage
      for (const [milestoneStage, advancements] of Object.entries(milestonesByStage)) {
        // Sort by timestamp to determine ranking (first to reach gets rank 1)
        advancements.sort((a, b) => a.timestamp - b.timestamp)
        
        // Get stage config for this milestone
        const stageConfigMap: Record<string, keyof typeof investmentConfig> = {
          'Seed': 'seed',
          'Series A': 'series_a',
          'Series B': 'series_b',
          'Series C': 'series_c',
        }
        
        const configKey = stageConfigMap[milestoneStage]
        if (!configKey || !investmentConfig[configKey]) {
          console.warn(`⚠️ No investment config found for milestone: ${milestoneStage}`)
          continue
        }
        
        const stageConfig = investmentConfig[configKey]
        const maxTeams = settings.max_teams || 10
        
        console.log(`🎯 Processing ${milestoneStage} milestone for ${advancements.length} teams`)
        
        // Calculate balance awards for each team based on their rank
        for (let i = 0; i < advancements.length; i++) {
          const advancement = advancements[i]
          const rank = i + 1 // Rank 1 = first, rank 2 = second, etc.
          
          // Check if this milestone/rank combination already exists
          const { data: existingAchievement } = await supabase
            .from('milestone_achievements')
            .select('id')
            .eq('game_id', gameId)
            .eq('milestone_stage', milestoneStage)
            .eq('rank', rank)
            .maybeSingle()
          
          if (existingAchievement) {
            console.log(`⚠️ Milestone ${milestoneStage} rank ${rank} already awarded, skipping`)
            continue
          }
          
          // Calculate balance award using NORMINV formula
          const awardAmount = calculateBalanceAward(
            rank,
            maxTeams,
            stageConfig.mean,
            stageConfig.sd
          )
          
          console.log(`💰 Awarding ${milestoneStage} milestone:`, {
            team: advancement.team_name,
            rank,
            awardAmount,
            mean: stageConfig.mean,
            sd: stageConfig.sd,
            maxTeams
          })
          
          // Record milestone achievement
          const { error: milestoneError } = await supabase
            .from('milestone_achievements')
            .insert({
              game_id: gameId,
              team_id: advancement.team_id,
              milestone_stage: milestoneStage,
              rank,
              award_amount: awardAmount,
              week_number: settings.current_week
            })
          
          if (milestoneError) {
            console.error(`❌ Failed to record milestone achievement:`, milestoneError)
            continue
          }
          
          // Update team balance with award
          const { data: currentTeam } = await supabase
            .from('teams')
            .select('total_balance')
            .eq('team_id', advancement.team_id)
            .single()
          
          if (currentTeam) {
            const newBalanceWithAward = (currentTeam.total_balance || 0) + awardAmount
            
            const { error: balanceError } = await supabase
              .from('teams')
              .update({
                total_balance: newBalanceWithAward,
                updated_at: new Date().toISOString()
              })
              .eq('team_id', advancement.team_id)
            
            if (balanceError) {
              console.error(`❌ Failed to update balance for ${advancement.team_name}:`, balanceError)
            } else {
              console.log(`✅ Updated balance for ${advancement.team_name}: +${awardAmount} (new total: ${newBalanceWithAward})`)
            }
          }
        }
      }
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
