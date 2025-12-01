import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Recalculate purchase probabilities for all teams in a game
 * Useful when admin changes customer dataset or probability weights
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    const { game_id } = body
    
    // Validate inputs
    if (!game_id) {
      return NextResponse.json(
        { error: 'Missing required field: game_id' },
        { status: 400 }
      )
    }
    
    console.log('Recalculating probabilities for all teams in game:', game_id)
    
    // Get all teams in the game
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('team_id, team_name, assigned_product_id')
      .eq('game_id', game_id)
    
    if (teamsError) {
      console.error('Error fetching teams:', teamsError)
      return NextResponse.json(
        { error: 'Failed to fetch teams', details: teamsError.message },
        { status: 500 }
      )
    }
    
    if (!teams || teams.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No teams found in this game',
        teams_processed: 0,
        results: []
      })
    }
    
    // Get the current week to find latest prices
    const { data: gameSettings, error: settingsError } = await supabase
      .from('game_settings')
      .select('current_week')
      .eq('game_id', game_id)
      .single()
    
    if (settingsError) {
      console.error('Error fetching game settings:', settingsError)
      return NextResponse.json(
        { error: 'Failed to fetch game settings', details: settingsError.message },
        { status: 500 }
      )
    }
    
    const currentWeek = gameSettings?.current_week || 0
    
    const results = []
    let successCount = 0
    let failCount = 0
    
    // Process each team
    for (const team of teams) {
      if (!team.assigned_product_id) {
        console.log(`Skipping team ${team.team_name} - no assigned product`)
        results.push({
          team_id: team.team_id,
          team_name: team.team_name,
          status: 'skipped',
          reason: 'No assigned product'
        })
        continue
      }
      
      // Get the latest price submitted by this team
      const { data: latestDecision, error: decisionError } = await supabase
        .from('weekly_results')
        .select('set_price')
        .eq('team_id', team.team_id)
        .eq('week_number', currentWeek)
        .maybeSingle()
      
      if (decisionError || !latestDecision) {
        console.log(`No price found for team ${team.team_name} in week ${currentWeek}`)
        results.push({
          team_id: team.team_id,
          team_name: team.team_name,
          status: 'skipped',
          reason: 'No price set for current week'
        })
        continue
      }
      
      const price = latestDecision.set_price
      
      // Calculate probabilities for this team
      try {
        const { error: calcError } = await supabase.rpc('calculate_purchase_probabilities', {
          p_game_id: game_id,
          p_team_id: team.team_id,
          p_product_id: team.assigned_product_id,
          p_price: price
        })
        
        if (calcError) {
          console.error(`Error calculating for team ${team.team_name}:`, calcError)
          results.push({
            team_id: team.team_id,
            team_name: team.team_name,
            status: 'failed',
            error: calcError.message
          })
          failCount++
        } else {
          console.log(`✅ Calculated probabilities for team ${team.team_name} (price: ${price})`)
          results.push({
            team_id: team.team_id,
            team_name: team.team_name,
            status: 'success',
            price: price
          })
          successCount++
        }
      } catch (err: any) {
        console.error(`Exception calculating for team ${team.team_name}:`, err)
        results.push({
          team_id: team.team_id,
          team_name: team.team_name,
          status: 'failed',
          error: err.message
        })
        failCount++
      }
    }
    
    console.log(`Recalculation complete: ${successCount} success, ${failCount} failed, ${teams.length - successCount - failCount} skipped`)
    
    return NextResponse.json({
      success: true,
      message: `Recalculated probabilities for ${successCount} teams`,
      teams_processed: successCount,
      teams_failed: failCount,
      teams_skipped: teams.length - successCount - failCount,
      total_teams: teams.length,
      results: results
    })
    
  } catch (error: any) {
    console.error('Exception in recalculate-all-probabilities:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
