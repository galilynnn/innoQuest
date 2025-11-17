'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { useGame } from '@/lib/game-context'
import { createClient } from '@/lib/supabase/client'

export default function WeekProgression() {
  const { gameState } = useGame()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [teamsStatus, setTeamsStatus] = useState({ total: 0, joined: 0 })
  const gameId = '00000000-0000-0000-0000-000000000001'

  useEffect(() => {
    loadTeamsStatus()
    
    // Auto-refresh every 3 seconds
    const interval = setInterval(loadTeamsStatus, 3000)
    return () => clearInterval(interval)
  }, [])

  const loadTeamsStatus = async () => {
    const { data: settings } = await supabase
      .from('game_settings')
      .select('max_teams')
      .eq('game_id', gameId)
      .single()

    const { data: teams } = await supabase
      .from('teams')
      .select('id, is_active, last_activity')
      .eq('game_id', gameId)

    const maxTeams = settings?.max_teams || 0
    
    // Count teams that have logged in (have last_activity)
    const joinedTeams = teams?.filter(t => t.last_activity !== null).length || 0

    setTeamsStatus({ total: maxTeams, joined: joinedTeams })
  }

  const progressPercentage = gameState.totalWeeks > 0 
    ? (gameState.currentWeek / gameState.totalWeeks) * 100 
    : 0

  const weeksRemaining = Math.max(0, gameState.totalWeeks - gameState.currentWeek)

  // Calculate team progression stages
  const teamsByStage = {
    seed: gameState.teams.filter(t => t.funding_stage === 'Seed').length,
    seriesA: gameState.teams.filter(t => t.funding_stage === 'Series A').length,
    seriesB: gameState.teams.filter(t => t.funding_stage === 'Series B').length,
    seriesC: gameState.teams.filter(t => t.funding_stage === 'Series C').length,
  }

  const handleAdvanceWeek = async () => {
    if (gameState.currentWeek >= gameState.totalWeeks) {
      alert('Game has ended!')
      return
    }

    // Check if all teams have joined
    if (teamsStatus.joined < teamsStatus.total) {
      const disconnected = teamsStatus.total - teamsStatus.joined
      const proceed = confirm(
        `⚠️ WARNING: ${disconnected} player${disconnected > 1 ? 's are' : ' is'} disconnected!\n\n` +
        `Only ${teamsStatus.joined} out of ${teamsStatus.total} teams are currently active in the game.\n\n` +
        `❌ Disconnected players will NOT be processed this round\n` +
        `✅ Only active players will advance to the next week\n\n` +
        `This may cause players to fall behind. Do you want to proceed anyway?`
      )
      if (!proceed) return
    }

    if (!confirm(`🚀 Advance from Week ${gameState.currentWeek} to Week ${gameState.currentWeek + 1}?\n\nThis will:\n• Process ALL active team decisions\n• Calculate results for everyone simultaneously\n• Move everyone to the next week together\n\nContinue?`)) {
      return
    }

    setAdvancing(true)
    try {
      // Call API to advance week and process all team results
      const response = await fetch('/api/advance-week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId })
      })

      const result = await response.json()

      if (response.ok) {
        alert(`✅ ${result.message}\n\nWeek ${result.currentWeek} / ${result.totalWeeks}`)
        window.location.reload()
      } else {
        alert(`❌ Failed: ${result.error || 'Unknown error'}\n\nActive teams: ${result.activeCount || 0}`)
      }
    } catch (error) {
      console.error('Error advancing week:', error)
      alert('❌ Network error while advancing week')
    } finally {
      setAdvancing(false)
    }
  }

  const canAdvance = gameState.currentWeek < gameState.totalWeeks

  return (
    <div className="space-y-4">
      <Card className="card-base">
        <h2 className="text-lg font-serif font-bold text-gray-900 mb-4">
          Game Week Progression
        </h2>

        <div className="space-y-4">
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
              <span className="text-sm font-medium text-gray-700">Week {gameState.currentWeek} / {gameState.totalWeeks}</span>
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
              {advancing ? 'Processing...' : canAdvance ? `Advance to Week ${gameState.currentWeek + 1}` : 'Game Completed'}
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              {canAdvance ? 'This will process all team decisions and advance the game week' : 'All weeks completed'}
            </p>
          </div>
        </div>
      </Card>

      <Card className="card-base">
        <h2 className="text-lg font-serif font-bold text-gray-900 mb-4">
          Funding Stage Distribution
        </h2>

        <div className="grid grid-cols-4 gap-2">
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <p className="text-2xl font-bold text-blue-600">{teamsByStage.seed}</p>
            <p className="text-xs text-gray-600 mt-1">Seed</p>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg text-center">
            <p className="text-2xl font-bold text-purple-600">{teamsByStage.seriesA}</p>
            <p className="text-xs text-gray-600 mt-1">Series A</p>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg text-center">
            <p className="text-2xl font-bold text-orange-600">{teamsByStage.seriesB}</p>
            <p className="text-xs text-gray-600 mt-1">Series B</p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <p className="text-2xl font-bold text-green-600">{teamsByStage.seriesC}</p>
            <p className="text-xs text-gray-600 mt-1">Series C</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
