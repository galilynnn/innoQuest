import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateWeeklyResults, processRndTest, calculateDemand, calculateRevenue, determineFundingStatus, calculateBalanceAward } from '@/lib/game-calculations'

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

    
    // Count teams that have joined the game (have any last_activity)
    const teamsInGame = teams?.filter(t => t.last_activity !== null) || []
    
    
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
    
    // Process ALL teams that have joined the game (not just actively online ones)
    // This is better for turn-based gameplay where students don't need to be online
    const teamsToProcess = teamsInGame


    // Fetch game settings for R&D tier configuration, investment config, and admin-set values
    const { data: gameSettingsData, error: settingsDataError } = await supabase
      .from('game_settings')
      .select('rnd_tier_config, investment_config, population_size, analytics_cost, base_operating_cost, initial_capital')
      .eq('game_id', gameId)
      .single()

    if (settingsDataError) {
      // Settings error handled below
    }


    const rndTierConfig = gameSettingsData?.rnd_tier_config || undefined
    const investmentConfig = gameSettingsData?.investment_config || undefined
    const populationSize = gameSettingsData?.population_size || 10000
    const costPerAnalytics = gameSettingsData?.analytics_cost || 5000
    // Get initial_capital - this is the exact value admin sets in the dashboard
    // Convert to number in case it's stored as string in database
    const initialCapitalRaw = gameSettingsData?.initial_capital
    const initialCapital = initialCapitalRaw != null ? Number(initialCapitalRaw) : 0


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
    
    // Track teams that lost rounds (insufficient balance) - these should NOT get milestone awards
    const teamsThatLostRound: Set<string> = new Set()
    
    // Track final balances after reset for teams that lost (to prevent milestone processing from overwriting)
    const finalBalancesAfterLoss: Map<string, number> = new Map()
    
    for (const team of teamsToProcess) {
      try {
        
        // FIRST: Check if team lost the PREVIOUS week and needs balance reset
        // This handles the case where the week was already advanced but balance wasn't reset
        if (settings.current_week > 1) {
          const previousWeek = settings.current_week - 1
          const { data: previousWeekResult } = await supabase
            .from('weekly_results')
            .select('revenue, demand, pass_fail_status')
            .eq('team_id', team.team_id)
            .eq('week_number', previousWeek)
            .maybeSingle()
          
          if (previousWeekResult && 
              previousWeekResult.revenue === 0 && 
              previousWeekResult.demand === 0 && 
              previousWeekResult.pass_fail_status === 'fail') {
            // Team lost previous week - check if balance needs to be reset
            const currentBalance = team.total_balance || 0
            if (currentBalance !== initialCapital && initialCapital > 0) {
              
              // Reset balance immediately
              await supabase
                .from('teams')
                .update({
                  total_balance: initialCapital,
                  funding_stage: 'Pre-Seed',
                  successful_rnd_tests: 0,
                  updated_at: new Date().toISOString()
                })
                .eq('team_id', team.team_id)
              
              // Reload team data to get updated balance
              const { data: updatedTeam } = await supabase
                .from('teams')
                .select('total_balance, funding_stage, successful_rnd_tests')
                .eq('team_id', team.team_id)
                .single()
              
              if (updatedTeam) {
                team.total_balance = updatedTeam.total_balance
                team.funding_stage = updatedTeam.funding_stage
                team.successful_rnd_tests = updatedTeam.successful_rnd_tests
              }
            }
          }
        }
        
        // Get team's pending decisions for current week from weekly_results
        // Use team_id column (teams_id was removed from database)
        const { data: weeklyResult, error: weeklyResultError } = await supabase
          .from('weekly_results')
          .select('*')
          .eq('team_id', team.team_id)
          .eq('week_number', settings.current_week)
          .maybeSingle()

        console.log({
          found: !!weeklyResult,
          error: weeklyResultError?.message,
          team_id: team.team_id,
          week_number: settings.current_week
        })

        if (!weeklyResult) {
          continue
        }
        
        console.log({
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


        // Calculate average purchase probability for this team's product
        // Query customer_purchase_probabilities using UUID product_id
        // team.assigned_product_id is the UUID from products table
        console.log({
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
          
          try {
            const { error: recalcError } = await supabase.rpc('calculate_purchase_probabilities', {
              p_game_id: gameId,
              p_team_id: team.team_id,
              p_product_id: team.assigned_product_id,
              p_price: weeklyResult.set_price
            })
            
            if (recalcError) {
              console.error(`❌ Failed to calculate probabilities:`, recalcError)
            } else {
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

        console.log({
          found: probabilities?.length || 0,
          error: probError?.message,
          sample: probabilities?.[0],
          first_few_values: probabilities?.slice(0, 5).map(p => p.purchase_probability)
        })
        
        if (probabilities && probabilities.length > 0) {
          // Calculate average - this will be 0 if all probabilities are 0 (high price scenario)
          // IMPORTANT: purchase_probability is stored as percentage (0-100) in database
          const sum = probabilities.reduce((acc, p) => acc + (p.purchase_probability || 0), 0)
          avgPurchaseProbability = sum / probabilities.length
          
          // Debug: Check if all probabilities are the same (which would indicate a calculation issue)
          const uniqueProbabilities = [...new Set(probabilities.map(p => p.purchase_probability || 0))]
          const allSame = uniqueProbabilities.length === 1
          
          console.log({
            count: probabilities.length,
            avgProbability: avgPurchaseProbability,
            minProbability: Math.min(...probabilities.map(p => p.purchase_probability || 0)),
            maxProbability: Math.max(...probabilities.map(p => p.purchase_probability || 0)),
            uniqueValues: uniqueProbabilities.length,
            allSame: allSame,
            sampleValues: probabilities.slice(0, 10).map(p => p.purchase_probability),
            productUUID: team.assigned_product_id,
            price_used: weeklyResult.set_price,
            note: avgPurchaseProbability === 0 
              ? '⚠️ All probabilities are 0 (likely due to very high price). Demand will be 0.'
              : avgPurchaseProbability === 100
              ? '⚠️ All probabilities are 100% (unusual - check calculation). Demand will be 10,000.'
              : allSame
              ? '⚠️ All probabilities are identical (may indicate calculation issue)'
              : 'Probabilities calculated successfully.'
          })
        } else {
          // Only use default if probabilities don't exist at all (calculation failed)
          // If probabilities exist but are 0, we should use 0, not default
          avgPurchaseProbability = 0.5 // Default fallback only when no probabilities found
          console.log({
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
        
        const calculationInput = {
          product_id: productId,
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
          avg_purchase_probability: avgPurchaseProbability, // This is a percentage (0-100)
        }

        console.log({
          set_price: calculationInput.set_price,
          avg_purchase_probability: avgPurchaseProbability,
          population_size: populationSize,
          rnd_tier: calculationInput.rnd_tier,
          has_rnd_tier_config: !!rndTierConfig,
          has_investment_config: !!investmentConfig,
        })


        let results
        let firstTest: any = null
        let secondTest: any = null
        try {
          // If the student selected a second R&D tier, evaluate both tests
          // to support 'two-always' and 'two-if-fail' strategies.
          if (weeklyResult.rnd_tier_2) {

            // Run the first test explicitly
            firstTest = processRndTest(weeklyResult.rnd_tier, rndTierConfig)
            console.log({
              tier: weeklyResult.rnd_tier,
              success: firstTest.success,
              cost: firstTest.cost,
              multiplier: firstTest.multiplier
            })

            // Determine whether to run second test based on strategy
            // For "two-if-fail": only run second test if first test failed
            // For "two-always": always run second test
            const runSecond = (weeklyResult.rnd_strategy === 'two-always') || (weeklyResult.rnd_strategy === 'two-if-fail' && !firstTest.success)
            
            console.log({
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
              console.log({
                tier: weeklyResult.rnd_tier_2,
                success: secondTest.success,
                cost: secondTest.cost,
                multiplier: secondTest.multiplier
              })
            } else {
              // Explicitly set secondTest to null to ensure it's not used later
              secondTest = null
            }

            // Compute combined results:
            // - Success if ANY test succeeded
            // - Cost is ALWAYS the sum of all tests run (even if they fail)
            // - Multiplier: if both tests succeeded, MULTIPLY them together (stacked effect)
            //               if only one succeeded, use that multiplier
            //               if both failed, multiplier is 1.0 (no bonus)
            let combinedSuccess = firstTest.success || (secondTest?.success || false)
            let combinedMultiplier = 1.0
            
            if (firstTest.success && secondTest?.success) {
              // Both tests succeeded - stack the multipliers
              combinedMultiplier = firstTest.multiplier * secondTest.multiplier
            } else if (firstTest.success) {
              // Only first test succeeded
              combinedMultiplier = firstTest.multiplier
            } else if (secondTest?.success) {
              // Only second test succeeded
              combinedMultiplier = secondTest.multiplier
            }
            
            let combinedCost = firstTest.cost + (secondTest ? secondTest.cost : 0)
            const successProbability = firstTest.success ? firstTest.successProbability : (secondTest ? secondTest.successProbability : firstTest.successProbability)

            // Recreate the same calculations the main engine does, but using the combined values
            console.log({
              formula: '(population_size × avg_probability) / 100',
              avg_probability: calculationInput.avg_purchase_probability,
              population_size: calculationInput.population_size,
              calculation: `(${calculationInput.population_size} × ${calculationInput.avg_purchase_probability}) / 100`
            })
            const baseDemand = calculateDemand(calculationInput.avg_purchase_probability, calculationInput.population_size)
            
            // Apply R&D multiplier to demand (if any test succeeded, use the highest multiplier)
            let demand = baseDemand
            if (combinedSuccess || firstTest || secondTest) {
              const demandBeforeMultiplier = demand
              demand = Math.round(demand * combinedMultiplier)
              console.log({
                rnd_success: combinedSuccess,
                multiplier: combinedMultiplier,
                demand_before: demandBeforeMultiplier,
                demand_after: demand,
                calculation: `${demandBeforeMultiplier} × ${combinedMultiplier} = ${demand}`
              })
            }
            
            console.log({
              formula: 'demand × price',
              demand: demand,
              price: calculationInput.set_price,
              calculation: `${demand} × ${calculationInput.set_price}`
            })
            let revenue = calculateRevenue(demand, calculationInput.set_price)
            
            // Calculate costs - NO operating cost, only R&D and analytics
            const analyticsCost = (calculationInput.analytics_quantity || 0) * (calculationInput.cost_per_analytics || 5000)
            const totalCosts = combinedCost + analyticsCost
            
            // Check if team has insufficient balance - if so, set everything to 0/fail
            const currentBalance = team.total_balance || 0
            const isInsufficient = totalCosts > currentBalance
            
            let profit: number
            if (isInsufficient) {
              // Mark this team as having lost the round
              teamsThatLostRound.add(team.team_id)
              
              console.log({
                totalCosts,
                currentBalance,
                deficit: totalCosts - currentBalance
              })
              
              // Set revenue and demand to 0 (even if price is ok)
              revenue = 0
              demand = 0
              
              // Set R&D to fail automatically (don't run R&D if insufficient balance)
              combinedSuccess = false
              combinedMultiplier = 1.0
              combinedCost = 0 // No R&D cost if insufficient
              firstTest = null
              secondTest = null
              
              // Set profit to negative (loss) - balance decreases by totalCosts
              profit = -totalCosts
            } else {
              // Profit is NEGATIVE (expenses deducted from balance)
              // Revenue is NOT added to balance, only used for milestone criteria
              let profitCalc = -totalCosts
              if (calculationInput.bonus_multiplier_pending) {
                profitCalc = Math.round(profitCalc * (calculationInput.bonus_multiplier_pending || 1))
              }
              profit = profitCalc
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
              rnd_cost: combinedCost,
              analytics_cost: analyticsCost,
              total_costs: totalCosts,
              profit: profit, // Always negative or zero
              rnd_tested: !isInsufficient && weeklyResult.rnd_tier ? true : false,
              rnd_success: combinedSuccess,
              pass_fail_status: isInsufficient ? 'fail' : passFail,
              bonus: isInsufficient ? 0 : bonus,
              rnd_success_probability: isInsufficient ? undefined : (successProbability * 100),
              rnd_multiplier: isInsufficient ? undefined : combinedMultiplier,
              next_funding_stage: isInsufficient ? 'Pre-Seed' : nextStage,
              funding_advanced: qualifiesForNextStage && !isInsufficient, // Can advance if not insufficient
              bonus_multiplier_applied: isInsufficient ? null : (calculationInput.bonus_multiplier_pending || null),
            }

            // Note: rnd_tests table updates are handled later in the code (after weekly_results update)
          } else {
            // Single R&D test path
            // Check if team has insufficient balance first
            const currentBalance = team.total_balance || 0
            
            // Calculate actual attempted costs (what they tried to spend)
            let attemptedRndCost = 0
            if (calculationInput.rnd_tier) {
              // Get actual R&D cost that would be charged (not just min_cost estimate)
              const rndTest = processRndTest(calculationInput.rnd_tier, rndTierConfig)
              attemptedRndCost = rndTest.cost
            }
            const analyticsCost = (calculationInput.analytics_quantity || 0) * costPerAnalytics
            const attemptedTotalCosts = attemptedRndCost + analyticsCost
            const isInsufficient = attemptedTotalCosts > currentBalance
            
            if (isInsufficient) {
              console.log({
                attemptedTotalCosts,
                attemptedRndCost,
                analyticsCost,
                currentBalance,
                deficit: attemptedTotalCosts - currentBalance
              })
              
              // Set R&D to fail automatically (don't run R&D if insufficient balance)
              calculationInput.rnd_tier = undefined // Don't run R&D
            }
            
            results = calculateWeeklyResults(calculationInput)
            
            // Override results if insufficient
            if (isInsufficient) {
              // Mark this team as having lost the round
              teamsThatLostRound.add(team.team_id)
              
              results.demand = 0
              results.revenue = 0
              results.rnd_tested = false
              results.rnd_success = false
              results.rnd_cost = 0
              results.total_costs = attemptedTotalCosts // IMPORTANT: Set to attempted costs, not calculated costs
              results.profit = -attemptedTotalCosts // Loss equals attempted costs
              results.pass_fail_status = 'fail'
              results.bonus = 0
              results.rnd_success_probability = undefined
              results.rnd_multiplier = undefined
              results.next_funding_stage = 'Pre-Seed'
              results.funding_advanced = false
              results.bonus_multiplier_applied = null
            }
            
            // Record first test output so we can update rnd_tests history to match engine
            firstTest = {
              success: results.rnd_success || false,
              multiplier: results.rnd_multiplier || 1.0,
              cost: results.rnd_cost || 0,
              successProbability: results.rnd_success_probability
            }
          }

          console.log({
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
        const { data: weeklyUpdateData, error: weeklyUpdateError } = await supabase
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
        
        if (weeklyUpdateError) {
          console.error(`❌ Failed to update weekly_results for ${team.team_name}:`, weeklyUpdateError)
          throw new Error(`Database update failed: ${weeklyUpdateError.message}`)
        }
        
        console.log({
          demand: results.demand,
          revenue: results.revenue,
          rnd_success: results.rnd_success,
          rnd_cost: results.rnd_cost,
          rnd_success_probability: results.rnd_success_probability,
          rnd_multiplier: results.rnd_multiplier,
        })
        
        // Update rnd_tests table so test history reflects the calculated result
        try {
            
            // Update first test result
            const { data: rndUpdate, error: rndUpdateError } = await supabase
              .from('rnd_tests')
              .update({ success: firstTest?.success ?? results.rnd_success })
              .eq('team_id', team.team_id)
              .eq('week_number', settings.current_week)
              .eq('tier', weeklyResult.rnd_tier)

            
            // For "two-if-fail" strategy: only insert second test if first test failed and second test was run
            console.log({
              strategy: weeklyResult.rnd_strategy,
              isTwoIfFail: weeklyResult.rnd_strategy === 'two-if-fail',
              hasSecondTest: !!secondTest,
              firstTestSuccess: firstTest?.success,
              shouldInsert: weeklyResult.rnd_strategy === 'two-if-fail' && secondTest && !firstTest.success
            })
            
            if (weeklyResult.rnd_strategy === 'two-if-fail' && secondTest && !firstTest.success) {
              console.log({
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
              }
            } else if (weeklyResult.rnd_strategy === 'two-if-fail' && !secondTest && firstTest.success) {
            } else if (weeklyResult.rnd_strategy === 'two-if-fail' && !secondTest && !firstTest.success) {
            }
            
            // For "two-always" strategy: update second test result (it was already inserted during submission)
            if (weeklyResult.rnd_strategy === 'two-always' && secondTest && weeklyResult.rnd_tier_2) {
              const { data: secondRndUpdate, error: secondRndUpdateError } = await supabase
                .from('rnd_tests')
                .update({ success: secondTest.success })
                .eq('team_id', team.team_id)
                .eq('week_number', settings.current_week)
                .eq('tier', weeklyResult.rnd_tier_2)
              
            }
          } catch (err) {
            console.error('❌ Error updating rnd_tests:', err)
          }
        
        // Check if team lost the round (insufficient balance) - if so, reset to initial stage
        // Use the teamsThatLostRound set to directly check if this team lost
        // Also check results as a fallback
        const currentBalance = team.total_balance || 0
        const lostRoundFromSet = teamsThatLostRound.has(team.team_id)
        const lostRoundFromResults = results.revenue === 0 && results.demand === 0 && results.pass_fail_status === 'fail'
        const lostRound = lostRoundFromSet || lostRoundFromResults
        
        console.log({
          lostRoundFromSet,
          lostRoundFromResults,
          lostRound,
          revenue: results.revenue,
          demand: results.demand,
          pass_fail_status: results.pass_fail_status,
          revenueIsZero: results.revenue === 0,
          demandIsZero: results.demand === 0,
          statusIsFail: results.pass_fail_status === 'fail',
          total_costs: results.total_costs,
          currentBalance
        })
        
        
        let newBalance: number
        let newSuccessfulTests: number
        let newFundingStage: string
        
        if (lostRound) {
          // Use the exact initial_capital value that admin set in game settings
          // This is the value from admin dashboard (e.g., 200000)
          // initialCapital is already converted to number when loaded
          const resetBalance = Number(initialCapital) || 0
          
          console.log({
            initialCapitalRaw: initialCapital,
            initialCapitalType: typeof initialCapital,
            resetBalance,
            resetBalanceType: typeof resetBalance,
            currentBalance,
            gameId
          })
          
          if (resetBalance === 0 || isNaN(resetBalance)) {
            console.error(`❌ ERROR: initial_capital is 0 or invalid for game ${gameId}! Cannot reset balance.`)
            console.error(`   Please set Initial Capital in admin dashboard.`)
            console.error(`   Current initialCapital value:`, initialCapital, `Type:`, typeof initialCapital)
            // Fallback to a default value to prevent balance from being 0
            newBalance = 500000 // Default fallback
          } else {
            newBalance = resetBalance
          }
          
          console.log({
            totalCosts: results.total_costs,
            currentBalance,
            deficit: results.total_costs - currentBalance,
            revenue: results.revenue,
            demand: results.demand,
            pass_fail_status: results.pass_fail_status,
            initialCapitalFromSettings: initialCapital,
            initialCapitalType: typeof initialCapital,
            resetBalance: newBalance,
            resetBalanceType: typeof newBalance,
            gameId,
            lostRoundFromSet,
            lostRoundFromResults
          })
          
          // Reset team to initial stage - use initial_capital from admin settings
          // This is the EXACT value admin set in the dashboard (e.g., 200000)
          newSuccessfulTests = 0
          newFundingStage = 'Pre-Seed'
          
          // Set R&D tests to fail (don't run R&D if insufficient balance)
          if (firstTest) {
            firstTest.success = false
            firstTest.multiplier = 1.0
          }
          if (secondTest) {
            secondTest.success = false
            secondTest.multiplier = 1.0
          }
        } else {
          // Normal round - no loss
          // Normal calculation
          newBalance = currentBalance + results.profit
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
            
            console.log({
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
          
          newSuccessfulTests = (team.successful_rnd_tests || 0) + successIncrement
          newFundingStage = results.next_funding_stage || team.funding_stage || 'Pre-Seed'
        }
        
        // Update team with new balance, successful tests, funding stage, and CLEAR bonus multiplier
        
        // Track milestone advancements for balance calculation
        // IMPORTANT: Only add to milestones if team did NOT lose the round
        if (!lostRound && results.funding_advanced && newFundingStage && newFundingStage !== team.funding_stage) {
          milestoneAdvancements.push({
            team_id: team.team_id,
            team_name: team.team_name,
            old_stage: team.funding_stage || 'Pre-Seed',
            new_stage: newFundingStage,
            revenue: results.revenue,
            timestamp: Date.now() // Use timestamp to determine order (first to reach)
          })
        } else if (lostRound) {
        }

        console.log({
          firstTest: firstTest ? { success: firstTest.success, cost: firstTest.cost, multiplier: firstTest.multiplier } : null,
          secondTest: secondTest ? { success: secondTest.success, cost: secondTest.cost, multiplier: secondTest.multiplier } : null,
          lostRound,
          newSuccessfulTests,
          newBalance,
          newFundingStage,
          currentBalance,
          initialCapital
        })

        console.log({
          lostRound,
          lostRoundFromSet: teamsThatLostRound.has(team.team_id),
          lostRoundFromResults: results.revenue === 0 && results.demand === 0 && results.pass_fail_status === 'fail',
          oldBalance: currentBalance,
          newBalance,
          oldStage: team.funding_stage,
          newStage: newFundingStage,
          oldSuccessfulTests: team.successful_rnd_tests,
          newSuccessfulTests,
          initialCapital,
          initialCapitalType: typeof initialCapital
        })
        
        // CRITICAL: For lost rounds, ensure we're using the exact initialCapital value
        if (lostRound) {
          const expectedBalance = Number(initialCapital) || 0
          if (newBalance !== expectedBalance && expectedBalance > 0) {
            console.error(`❌❌ CRITICAL: newBalance mismatch for lost round!`)
            console.error(`   Expected: ${expectedBalance}, Got: ${newBalance}`)
            console.error(`   FORCING balance to initialCapital: ${expectedBalance}`)
            newBalance = expectedBalance
          }
          
          console.log({
            initialCapital,
            initialCapitalNumber: Number(initialCapital),
            newBalance,
            newBalanceNumber: Number(newBalance),
            currentBalance,
            teamId: team.team_id,
            match: Number(newBalance) === Number(initialCapital)
          })
        }
        
        console.log({
          lostRound,
          newBalance,
          newBalanceNumber: Number(newBalance),
          newBalanceType: typeof newBalance,
          initialCapital,
          initialCapitalNumber: Number(initialCapital),
          initialCapitalType: typeof initialCapital
        })
        
        const { data: teamUpdateData, error: teamUpdateError } = await supabase
          .from('teams')
          .update({
            total_balance: Number(newBalance), // Ensure it's a number, not string
            successful_rnd_tests: newSuccessfulTests,
            funding_stage: newFundingStage,
            bonus_multiplier_pending: null, // Clear the bonus after applying it
            updated_at: new Date().toISOString()
          })
          .eq('team_id', team.team_id)
          .select()
          
        if (teamUpdateError) {
          console.error(`❌ Failed to update team ${team.team_name}:`, teamUpdateError)
          throw new Error(`Database update failed: ${teamUpdateError.message}`)
        }
        
        // Verify the update was successful, especially for lost rounds
        if (lostRound && teamUpdateData && teamUpdateData.length > 0) {
          const updatedBalance = teamUpdateData[0].total_balance
          const balanceMatch = Number(updatedBalance) === Number(newBalance)
          
          console.log({
            expectedBalance: newBalance,
            actualBalanceInDB: updatedBalance,
            match: balanceMatch,
            initialCapitalUsed: initialCapital,
            updateData: teamUpdateData[0]
          })
          
          if (!balanceMatch) {
            console.error(`❌❌ MISMATCH: Balance was not set correctly! Expected ${newBalance}, got ${updatedBalance}`)
            console.error(`   This is a CRITICAL ERROR - balance reset failed!`)
          } else {
            // Store the final balance to prevent milestone processing from overwriting it
            finalBalancesAfterLoss.set(team.team_id, Number(newBalance))
          }
        }
        
        console.log({
          updateData: teamUpdateData,
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
          lostRound,
          balanceReset: lostRound ? `Reset to ${newBalance} (initialCapital: ${initialCapital})` : `Updated to ${newBalance}`
        })
        
        updates.push({ data: teamUpdateData, error: teamUpdateError })
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
          continue
        }
        
        const stageConfig = investmentConfig[configKey]
        const maxTeams = settings.max_teams || 10
        
        // Calculate actual SD from mean and sd_percent
        // SD = mean × (sd_percent / 100)
        const actualSD = stageConfig.mean * (stageConfig.sd_percent / 100)
        
        console.log({
          mean: stageConfig.mean,
          sd_percent: stageConfig.sd_percent,
          calculated_sd: actualSD,
          raw_sd: stageConfig.sd
        })
        
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
            continue
          }
          
          // Calculate balance award using NORMINV formula with calculated SD
          const awardAmount = calculateBalanceAward(
            rank,
            maxTeams,
            stageConfig.mean,
            actualSD
          )
          
          console.log({
            team: advancement.team_name,
            rank,
            awardAmount,
            mean: stageConfig.mean,
            sd_percent: stageConfig.sd_percent,
            calculated_sd: actualSD,
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
          
          // Skip milestone award if team lost the round this week
          if (teamsThatLostRound.has(advancement.team_id)) {
            continue
          }
          
          // Update team balance with award
          const { data: currentTeam } = await supabase
            .from('teams')
            .select('total_balance')
            .eq('team_id', advancement.team_id)
            .single()
          
          if (currentTeam) {
            // If team lost the round, use the stored final balance instead of current balance
            const baseBalance = finalBalancesAfterLoss.get(advancement.team_id) || (currentTeam.total_balance || 0)
            const newBalanceWithAward = baseBalance + awardAmount
            
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
              // Create announcement for this milestone advancement
              // Only create if table exists (gracefully handle if migration not run yet)
              try {
                const announcementTitle = `Congratulations! You've Advanced to ${milestoneStage}!`
                const announcementMessage = `📊 Rank: #${rank} (${rank === 1 ? 'First' : rank === 2 ? 'Second' : rank === 3 ? 'Third' : `${rank}th`} to reach this milestone)\n\n` +
                  `Keep up the great work and continue making strategic decisions!`
                
                const { error: announcementError } = await supabase
                  .from('team_announcements')
                  .insert({
                    game_id: gameId,
                    team_id: advancement.team_id,
                    announcement_type: 'milestone_advancement',
                    title: announcementTitle,
                    message: announcementMessage,
                    balance_award: awardAmount,
                    old_stage: advancement.old_stage,
                    new_stage: milestoneStage,
                    week_number: settings.current_week,
                    is_read: false
                  })
                
                if (announcementError) {
                  // Check if table doesn't exist - that's okay, just log
                  const errorMsg = announcementError.message || String(announcementError) || JSON.stringify(announcementError)
                  const errorCode = (announcementError as any)?.code || (announcementError as any)?.hint
                  
                  console.log({
                    message: errorMsg,
                    code: errorCode,
                    fullError: announcementError
                  })
                  
                  if (errorCode === '42P01' || errorMsg.includes('does not exist') || errorMsg.includes('relation') || errorMsg.includes('team_announcements')) {
                  } else if (errorMsg.includes('permission') || errorMsg.includes('RLS') || errorCode === '42501') {
                  } else {
                    console.error(`❌ Failed to create announcement for ${advancement.team_name}:`, errorMsg)
                  }
                } else {
                }
              } catch (announcementErr: any) {
                // Gracefully handle any errors creating announcements
                const errorMsg = announcementErr?.message || String(announcementErr) || JSON.stringify(announcementErr)
              }
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

    // Auto-mark all unread announcements from weeks before the CURRENT week as read when advancing
    // This ensures announcements show for ONE week only (the week they were created)
    // Example: Week 2 announcement shows in week 2, then gets marked as read when week 3 starts
    // The cleanup happens AFTER processing teams, so settings.current_week is still the old week
    // We want to mark announcements from weeks < current_week as read (so they disappear in the next week)
    if (shouldAdvanceWeek) {
      try {
        // Mark announcements from weeks before the CURRENT week as read
        // This way, when we advance to nextWeek, announcements from current_week will still be visible
        // But announcements from weeks before current_week will be marked as read
        const { error: markReadError } = await supabase
          .from('team_announcements')
          .update({ is_read: true })
          .eq('game_id', gameId)
          .eq('is_read', false)
          .lt('week_number', settings.current_week) // Mark announcements from weeks before current_week
        
        if (markReadError) {
          // Check if table doesn't exist - that's okay
          const errorMsg = markReadError.message || String(markReadError)
          if (!errorMsg.includes('does not exist') && !errorMsg.includes('relation')) {
          }
        } else {
        }
      } catch (announcementCleanupErr: any) {
        // Gracefully handle any errors
        const errorMsg = announcementCleanupErr?.message || String(announcementCleanupErr)
        if (!errorMsg.includes('does not exist') && !errorMsg.includes('relation')) {
        }
      }
    }

    // Update the game status and set week_start_time for countdown timer
    const { error: updateWeekError } = await supabase
      .from('game_settings')
      .update({
        current_week: nextWeek,
        game_status: newStatus,
        week_start_time: new Date().toISOString() // Set start time for countdown
      })
      .eq('game_id', gameId)

    console.log({
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
