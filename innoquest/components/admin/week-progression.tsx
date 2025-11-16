'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { useGame } from '@/lib/game-context'
import { createClient } from '@/lib/supabase/client'

export default function WeekProgression() {
  const { gameState } = useGame()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [advancing, setAdvancing] = useState(false)

  const progressPercentage = gameState.totalWeeks > 0 
    ? (gameState.currentWeek / gameState.totalWeeks) * 100 
    : 0

  const weeksRemaining = Math.max(0, gameState.totalWeeks - gameState.currentWeek)

  // Calculate team progression stages
  const teamsByStage = {
    seed: gameState.teams.filter(t => t.fundingStage === 'Seed').length,
    seriesA: gameState.teams.filter(t => t.fundingStage === 'Series A').length,
    seriesB: gameState.teams.filter(t => t.fundingStage === 'Series B').length,
    seriesC: gameState.teams.filter(t => t.fundingStage === 'Series C').length,
  }

  const handleAdvanceWeek = async () => {
    if (gameState.currentWeek >= gameState.totalWeeks) {
      alert('Game has ended!')
      return
    }

    if (!confirm(`Advance from Week ${gameState.currentWeek} to Week ${gameState.currentWeek + 1}?`)) {
      return
    }

    setAdvancing(true)
    try {
      // Call API to advance week and process all team results
      const response = await fetch('/api/advance-week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (response.ok) {
        alert('Week advanced successfully! All teams processed.')
        window.location.reload()
      } else {
        alert('Failed to advance week')
      }
    } catch (error) {
      alert('Error advancing week')
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
