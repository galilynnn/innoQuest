'use client'

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

    const nextWeek = settings.current_week + 1

    // Check if game is complete
    if (nextWeek > settings.total_weeks) {
      // Complete the game
      const { error: updateError } = await supabase
        .from('game_settings')
        .update({ game_status: 'completed' })
        .eq('game_id', gameId)

      return NextResponse.json({
        success: true,
        gameCompleted: true,
        message: 'Game completed',
      })
    }

    // Advance to next week
    const { error: updateError } = await supabase
      .from('game_settings')
      .update({ current_week: nextWeek })
      .eq('game_id', gameId)

    if (updateError) {
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
      details: { week: nextWeek },
      result: { success: true },
    })

    return NextResponse.json({
      success: true,
      currentWeek: nextWeek,
      totalWeeks: settings.total_weeks,
    })
  } catch (error) {
    console.error('Advance week error:', error)
    return NextResponse.json(
      { error: 'Failed to advance week' },
      { status: 500 }
    )
  }
}
