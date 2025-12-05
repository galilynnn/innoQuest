'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

interface GameSettings {
  current_week: number
  total_weeks: number
  game_status: string
  week_duration_minutes: number
  week_start_time?: string
}

export default function WeekProgression() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [teamsStatus, setTeamsStatus] = useState({ total: 0, joined: 0 })
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    current_week: 0,
    total_weeks: 0,
    game_status: 'setup',
    week_duration_minutes: 5
  })
  const gameId = '00000000-0000-0000-0000-000000000001'

  useEffect(() => {
    loadGameSettings()
    loadTeamsStatus()
  }, [])

  // Countdown timer
  useEffect(() => {
    if (!gameSettings.week_start_time || gameSettings.game_status !== 'active') return

    const interval = setInterval(() => {
      const startTime = new Date(gameSettings.week_start_time!).getTime()
      const durationMs = gameSettings.week_duration_minutes * 60 * 1000
      const endTime = startTime + durationMs
      const now = Date.now()
      const remaining = endTime - now

      if (remaining <= 0) {
        setTimeRemaining(0)
        handleAutoAdvance()
        clearInterval(interval)
      } else {
        setTimeRemaining(remaining)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [gameSettings.week_start_time, gameSettings.week_duration_minutes, gameSettings.game_status])

  const loadGameSettings = async () => {
    try {
      const { data: settings } = await supabase
        .from('game_settings')
        .select('current_week, total_weeks, game_status, week_duration_minutes, week_start_time')
        .eq('game_id', gameId)
        .single()

      if (settings) {
        setGameSettings(settings)
      }
    } catch (error) {
      console.error('Error loading game settings:', error)
    }
  }

  const handleAutoAdvance = async () => {
    if (advancing) return
    setAdvancing(true)
    
    try {
      const response = await fetch('/api/advance-week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, auto: true })
      })

      const result = await response.json()

      if (response.ok) {
        console.log('✅ Auto-advanced to week', result.currentWeek)
        window.location.reload()
      } else {
        console.error('Auto-advance failed:', result.error)
        alert(`❌ Auto-advance failed: ${result.error}`)
        setAdvancing(false)
      }
    } catch (error) {
      console.error('Auto-advance error:', error)
      alert('❌ Auto-advance failed. Please manually advance the week.')
      setAdvancing(false)
    }
  }

  const loadTeamsStatus = async () => {
    try {
      const { data: settings } = await supabase
        .from('game_settings')
        .select('max_teams')
        .eq('game_id', gameId)
        .single()

      const { data: teams } = await supabase
        .from('teams')
        .select('team_id, is_active, last_activity')
        .eq('game_id', gameId)

      const maxTeams = settings?.max_teams || 0
      
      // Count teams that have logged in (have last_activity)
      const joinedTeams = teams?.filter(t => t.last_activity !== null).length || 0

      setTeamsStatus({ total: maxTeams, joined: joinedTeams })
    } catch (error) {
      console.error('Error loading teams status:', error)
    }
  }

  const progressPercentage = gameSettings.total_weeks > 0 
    ? (gameSettings.current_week / gameSettings.total_weeks) * 100 
    : 0

  const weeksRemaining = Math.max(0, gameSettings.total_weeks - gameSettings.current_week)

  const handleAdvanceWeek = async () => {
    alert('🎮 BUTTON CLICKED! Check console now!')
    console.log('🎮 ============================================')
    console.log('🎮 NEXT WEEK BUTTON CLICKED')
    console.log('🎮 ============================================')
    console.log('🎮 Current Week:', gameSettings.current_week)
    console.log('🎮 Total Weeks:', gameSettings.total_weeks)
    console.log('🎮 Game ID:', gameId)
    console.log('🎮 Advancing state:', advancing)
    
    // Check if we're on the last week (should summarize game instead of advancing)
    const isLastWeek = gameSettings.current_week === gameSettings.total_weeks
    
    if (gameSettings.current_week > gameSettings.total_weeks) {
      console.log('❌ Game has ended!')
      alert('Game has ended!')
      return
    }

    // Check if all teams have joined
    console.log('🔍 Teams Status Check:', teamsStatus)
    if (teamsStatus.joined < teamsStatus.total) {
      const disconnected = teamsStatus.total - teamsStatus.joined
      console.log(`⚠️ Teams disconnected: ${disconnected}`)
      const proceed = confirm(
        `⚠️ WARNING: ${disconnected} player${disconnected > 1 ? 's are' : ' is'} disconnected!\n\n` +
        `Only ${teamsStatus.joined} out of ${teamsStatus.total} teams are currently active in the game.\n\n` +
        `❌ Disconnected players will NOT be processed this round\n` +
        `✅ Only active players will advance to the next week\n\n` +
        `This may cause players to fall behind. Do you want to proceed anyway?`
      )
      if (!proceed) {
        console.log('❌ User cancelled due to disconnected teams')
        return
      }
      console.log('✅ User chose to proceed despite disconnected teams')
    } else {
      console.log('✅ All teams are joined')
    }

    const confirmMessage = isLastWeek
      ? `🏁 Finish the game and show results?\n\nThis will:\n• Process final week decisions\n• Calculate final results\n• End the game and redirect students to results\n\nContinue?`
      : `🚀 Advance from Week ${gameSettings.current_week} to Week ${gameSettings.current_week + 1}?\n\nThis will:\n• Process ALL active team decisions\n• Calculate results for everyone simultaneously\n• Move everyone to the next week together\n\nContinue?`
    
    if (!confirm(confirmMessage)) {
      console.log('❌ User cancelled advancement')
      return
    }

    console.log('✅ User confirmed, starting advancement...')
    setAdvancing(true)
    try {
      // Call API to advance week and process all team results with longer timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      console.log('📡 Calling /api/advance-week with gameId:', gameId)
      const response = await fetch('/api/advance-week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
        signal: controller.signal
      })

      console.log('📡 Response status:', response.status)
      clearTimeout(timeoutId)
      const result = await response.json()
      console.log('📡 Response data:', result)

      if (response.ok) {
        console.log('✅ ============================================')
        console.log('✅ WEEK ADVANCED SUCCESSFULLY!')
        console.log('✅ ============================================')
        console.log('✅ Full result:', result)
        console.log('✅ Message:', result.message)
        console.log('✅ Current Week:', result.currentWeek)
        console.log('✅ Teams Processed:', result.teamsProcessed)
        console.log('✅ ============================================')
        
        // Check if values were actually saved by querying the database
        const { data: checkData } = await supabase
          .from('weekly_results')
          .select('rnd_success_probability, rnd_multiplier, revenue, demand')
          .eq('week_number', result.currentWeek - 1)
          .single()
        
        console.log('🔍 Verifying saved data for week', result.currentWeek - 1, ':', checkData)
        
        if (checkData && (checkData.rnd_success_probability === null || checkData.revenue === null)) {
          alert(`⚠️ WARNING: Week advanced but calculated values are NULL!\n\nThis means the calculation failed on the server.\n\nCheck the terminal where 'npm run dev' is running for error messages.\n\nWeek ${result.currentWeek} / ${result.totalWeeks}`)
        } else {
          alert(`✅ ${result.message}\n\nWeek ${result.currentWeek} / ${result.totalWeeks}`)
        }
        // Reload game settings and teams status instead of full page reload to stay on this page
        loadGameSettings()
        loadTeamsStatus()
      } else {
        console.error('❌ API returned error:', result.error)
        alert(`❌ Failed: ${result.error || 'Unknown error'}\n\nActive teams: ${result.activeCount || 0}`)
      }
    } catch (error: any) {
      console.error('❌ Exception during advance:', error)
      if (error.name === 'AbortError') {
        alert('❌ Request timed out. The week advancement is taking too long. Please try again.')
      } else {
        alert('❌ Network error while advancing week. Please check your connection and try again.')
      }
    } finally {
      console.log('🏁 Advancement process finished')
      setAdvancing(false)
    }
  }

  // Can advance if we're on a valid week (not beyond total weeks)
  const canAdvance = gameSettings.current_week > 0 && gameSettings.current_week <= gameSettings.total_weeks

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-4">
      <Card className="card-base">
        <h2 className="text-lg font-serif font-bold text-gray-900 mb-4">
          Game Week Progression
        </h2>

        <div className="space-y-4">
          {/* Timer Countdown */}
          {gameSettings.game_status === 'active' && gameSettings.week_start_time && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="text-center">
                <p className="text-sm font-medium text-orange-900 mb-2">Time Remaining</p>
                <p className={`text-4xl font-bold ${timeRemaining <= 60000 ? 'text-red-600 animate-pulse' : 'text-orange-600'}`}>
                  {formatTime(timeRemaining)}
                </p>
                <p className="text-xs text-orange-700 mt-2">
                  {timeRemaining <= 0 ? 'Advancing to next week...' : 'Week will auto-advance when timer ends'}
                </p>
              </div>
            </div>
          )}

          {/* Teams Status */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-900">Teams Status:</span>
                <span className={`text-sm font-bold ${
                  teamsStatus.joined === teamsStatus.total ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {teamsStatus.joined} / {teamsStatus.total} Joined
                </span>
              </div>
              {teamsStatus.joined === teamsStatus.total && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-semibold">
                  ✓ All Ready
                </span>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Week {gameSettings.current_week} / {gameSettings.total_weeks}</span>
              <span className="text-sm font-semibold text-gray-900">{progressPercentage.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-primary h-3 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">{weeksRemaining} weeks remaining</p>
          </div>

          {/* Week Controls */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={handleAdvanceWeek}
              disabled={!canAdvance || advancing}
              className="w-full py-3 px-6 bg-gradient-to-br from-[#E63946] to-[#C1121F] text-white rounded-xl font-semibold text-base transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {advancing ? 'Processing...' : canAdvance ? (gameSettings.current_week === gameSettings.total_weeks ? '🏁 Summarize Game' : 'Next Week') : 'Game Completed'}
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              {canAdvance ? (gameSettings.current_week === gameSettings.total_weeks ? 'This will end the game and show final results to all students' : 'Admin can manually advance before timer ends') : 'All weeks completed'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
