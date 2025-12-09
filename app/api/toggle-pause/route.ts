import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { gameId } = await request.json()

    if (!gameId) {
      return NextResponse.json(
        { error: 'Game ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current settings
    const { data: currentSettings, error: fetchError } = await supabase
      .from('game_settings')
      .select('is_paused, pause_timestamp, week_start_time, week_duration_minutes')
      .eq('game_id', gameId)
      .single()

    if (fetchError) {
      return NextResponse.json(
        { error: 'Failed to fetch current pause state' },
        { status: 500 }
      )
    }

    const newPauseState = !currentSettings.is_paused
    const now = new Date().toISOString()

    let updateData: any = { is_paused: newPauseState }
    
    if (newPauseState) {
      // Pausing: store the current timestamp
      updateData.pause_timestamp = now
    } else {
      // Resuming: calculate how long we were paused and adjust week_start_time
      if (currentSettings.pause_timestamp && currentSettings.week_start_time) {
        const pauseTime = new Date(currentSettings.pause_timestamp).getTime()
        const resumeTime = new Date(now).getTime()
        const pauseDuration = resumeTime - pauseTime
        
        // Adjust week_start_time forward by the pause duration
        const originalStart = new Date(currentSettings.week_start_time).getTime()
        const newStart = new Date(originalStart + pauseDuration)
        
        updateData.week_start_time = newStart.toISOString()
        updateData.pause_timestamp = null
      }
    }

    const { error: updateError } = await supabase
      .from('game_settings')
      .update(updateData)
      .eq('game_id', gameId)

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to toggle pause state' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      is_paused: newPauseState,
      message: newPauseState ? 'Game paused' : 'Game resumed'
    })

  } catch (error) {
    console.error('Error toggling pause:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
