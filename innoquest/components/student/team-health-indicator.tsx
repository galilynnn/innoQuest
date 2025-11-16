'use client'

import { Card } from '@/components/ui/card'
import { useGame } from '@/lib/game-context'

interface TeamHealthIndicatorProps {
  teamId?: string
}

export default function TeamHealthIndicator({ teamId }: TeamHealthIndicatorProps) {
  const { gameState } = useGame()
  const team = teamId ? gameState.teams.find(t => t.id === teamId) : null

  if (!team) return null

  // Calculate health metrics
  const healthScore = team.totalCash > 0
    ? Math.min(100, (team.totalCash / 1000000) * 100)
    : 0

  const fundingScore = {
    'Seed': 25,
    'Series A': 50,
    'Series B': 75,
    'Series C': 100,
  }[team.fundingStage] || 0

  const profitTrend = team.history.length >= 2
    ? team.history[team.history.length - 1].profit >= team.history[team.history.length - 2].profit
      ? 'up'
      : 'down'
    : 'neutral'

  return (
    <Card className="card-base">
      <h2 className="text-xl font-serif font-bold text-gray-900 mb-6">
        Team Health Metrics
      </h2>

      <div className="space-y-6">
        {/* Overall Health */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <span className="font-semibold text-gray-900">Overall Health</span>
            <span className="text-lg font-bold text-primary">{healthScore.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all ${
                healthScore >= 75 ? 'bg-green-500' :
                healthScore >= 50 ? 'bg-yellow-500' :
                healthScore >= 25 ? 'bg-orange-500' :
                'bg-red-500'
              }`}
              style={{ width: `${healthScore}%` }}
            />
          </div>
        </div>

        {/* Funding Progress */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <span className="font-semibold text-gray-900">Funding Progress</span>
            <span className="text-lg font-bold text-primary">{fundingScore}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full bg-blue-500 transition-all"
              style={{ width: `${fundingScore}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-2">Current: {team.fundingStage}</p>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border">
          <div className="text-center p-3 rounded-lg bg-gray-50">
            <p className="text-xs text-gray-600 mb-1">Status</p>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
              team.status === 'active'
                ? 'bg-green-100 text-green-800'
                : team.status === 'paused'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {team.status}
            </span>
          </div>
          <div className="text-center p-3 rounded-lg bg-gray-50">
            <p className="text-xs text-gray-600 mb-1">Weeks Active</p>
            <p className="text-xl font-bold text-gray-900">{team.history.length}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-gray-50">
            <p className="text-xs text-gray-600 mb-1">Profit Trend</p>
            <span className={`text-xl ${
              profitTrend === 'up' ? 'text-green-600' :
              profitTrend === 'down' ? 'text-red-600' :
              'text-gray-600'
            }`}>
              {profitTrend === 'up' ? '↑' : profitTrend === 'down' ? '↓' : '→'}
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}
