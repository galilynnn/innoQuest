import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    if (settings.current_week >= settings.total_weeks) {
      return NextResponse.json(
        { error: 'Game already completed' },
        { status: 400 }
      )
    }

    // Get all active teams (those actively playing - last_activity within 2 minutes)
    const now = new Date().getTime()
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .eq('game_id', gameId)

    if (teamsError) {
      return NextResponse.json(
        { error: 'Failed to load teams' },
        { status: 500 }
      )
    }

    // Filter for actively playing teams (within last 2 minutes to account for heartbeat delays)
    const activeTeams = teams?.filter(t => {
      if (!t.last_activity) return false
      const lastActivity = new Date(t.last_activity).getTime()
      return (now - lastActivity) < 120000 // Active if within 2 minutes (120 seconds)
    }) || []

    if (activeTeams.length === 0) {
      return NextResponse.json(
        { 
          error: 'No active teams found. Students must be in the game.',
          activeCount: 0 
        },
        { status: 400 }
      )
    }

    // Process calculations for ALL active teams simultaneously
    const updates = await Promise.all(
      activeTeams.map(async (team) => {
        // Get team's pending decisions for current week
        const { data: decisions } = await supabase
          .from('team_decisions')
          .select('*')
          .eq('team_id', team.id)
          .eq('week_number', settings.current_week)
          .single()

        // If no decisions submitted, use defaults (team didn't make decisions this week)
        const rndInvestment = decisions?.rnd_investment || 0
        const marketingSpend = decisions?.marketing_spend || 0
        const hiringCount = decisions?.hiring_count || 0

        // Run calculations (simplified example - replace with your actual game logic)
        const weeklyExpenses = rndInvestment + marketingSpend + (hiringCount * 10000)
        const weeklyRevenue = Math.random() * 50000 // Example revenue
        const newBalance = (team.total_balance || 100000) - weeklyExpenses + weeklyRevenue
        
        // RND success based on investment
        const rndSuccess = rndInvestment >= 20000 ? (team.successful_rnd_tests || 0) + 1 : (team.successful_rnd_tests || 0)

        // Update team with new values
        return supabase
          .from('teams')
          .update({
            total_balance: newBalance,
            successful_rnd_tests: rndSuccess,
            updated_at: new Date().toISOString()
          })
          .eq('id', team.id)
      })
    )

    // Check if any updates failed
    const failedUpdates = updates.filter(u => u.error)
    if (failedUpdates.length > 0) {
      console.error('Some team updates failed:', failedUpdates)
    }

    const nextWeek = settings.current_week + 1

    // Advance the week for EVERYONE
    const { error: updateWeekError } = await supabase
      .from('game_settings')
      .update({
        current_week: nextWeek,
        game_status: nextWeek >= settings.total_weeks ? 'completed' : 'active'
      })
      .eq('game_id', gameId)

    if (updateWeekError) {
      return NextResponse.json(
        { error: 'Failed to advance week' },
        { status: 500 }
      )
    }

    // Log event
    await supabase.from('game_logs').insert({
      game_id: gameId,
      team_id: null,
      action: 'week_advanced',
      details: { 
        week: nextWeek,
        activeTeams: activeTeams.length,
        totalTeams: teams?.length || 0
      },
      result: { success: true },
    })

    return NextResponse.json({
      success: true,
      currentWeek: nextWeek,
      totalWeeks: settings.total_weeks,
      teamsProcessed: activeTeams.length,
      message: `Week ${nextWeek} started! Processed ${activeTeams.length} active teams.`,
      gameCompleted: nextWeek >= settings.total_weeks
    })
  } catch (error) {
    console.error('Advance week error:', error)
    return NextResponse.json(
      { error: 'Failed to advance week' },
      { status: 500 }
    )
  }
}
