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

    // Check if game is in lobby/setup state (allow both for compatibility)
    if (settings.game_status !== 'lobby' && settings.game_status !== 'setup') {
      return NextResponse.json(
        { error: `Game is already ${settings.game_status}` },
        { status: 400 }
      )
    }

    // Get active teams count
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('team_id, is_active, last_activity')
      .eq('game_id', gameId)

    if (teamsError) {
      return NextResponse.json(
        { error: 'Failed to load teams' },
        { status: 500 }
      )
    }

    // Count logged in players (those with last_activity)
    const loggedInTeams = teams?.filter(t => t.last_activity !== null) || []

    if (loggedInTeams.length === 0) {
      return NextResponse.json(
        { error: 'No players have logged in. At least 1 player must be in the lobby.' },
        { status: 400 }
      )
    }

    console.log('Starting game with', loggedInTeams.length, 'players')

    // Start the game: set status to 'active' (or 'playing' for new schema) and week to 1
    const { error: updateError } = await supabase
      .from('game_settings')
      .update({
        game_status: 'active',
        current_week: 1,
        week_start_time: new Date().toISOString(), // Set initial week start time for countdown
        updated_at: new Date().toISOString()
      })
      .eq('game_id', gameId)

    if (updateError) {
      console.error('Failed to update game settings:', updateError)
      return NextResponse.json(
        { error: 'Failed to start game' },
        { status: 500 }
      )
    }

    console.log('Game started successfully, status updated to playing')

    // Log event
    await supabase.from('game_logs').insert({
      game_id: gameId,
      team_id: null,
      action: 'game_started',
      details: { 
        loggedInTeams: loggedInTeams.length,
        totalTeams: teams?.length || 0
      },
      result: { success: true },
    })

    return NextResponse.json({
      success: true,
      message: `Game started with ${loggedInTeams.length} players!`,
      activeTeams: loggedInTeams.length,
      totalTeams: teams?.length || 0
    })

  } catch (error) {
    console.error('Start game error:', error)
    return NextResponse.json(
      { error: 'Failed to start game' },
      { status: 500 }
    )
  }
}
