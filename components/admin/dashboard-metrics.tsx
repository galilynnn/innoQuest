'use client'

import { Card } from '@/components/ui/card'
import { useGame } from '@/lib/game-context'

export default function DashboardMetrics() {
  const { gameState } = useGame()

  const activeTeams = gameState.teams.filter(t => t.status === 'active').length
  const failedTeams = gameState.teams.filter(t => t.status === 'failed').length
  const totalRevenue = gameState.teams.reduce((sum, team) => 
    sum + team.history.reduce((s, r) => s + r.revenue, 0), 0
  )
  const avgPerformance = gameState.teams.length > 0
    ? gameState.teams.reduce((sum, team) => sum + (team.totalCash / 1000000), 0) / gameState.teams.length * 100
    : 0

  const getTopPerformer = () => {
    if (gameState.teams.length === 0) return null
    return [...gameState.teams].sort((a, b) => b.totalCash - a.totalCash)[0]
  }

  const topTeam = getTopPerformer()

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <Card className="card-base">
        <p className="text-sm text-gray-600 mb-2">Active Teams</p>
        <p className="text-3xl font-bold text-primary">{activeTeams}</p>
        <p className="text-xs text-gray-500 mt-1">{failedTeams} failed</p>
      </Card>

      <Card className="card-base">
        <p className="text-sm text-gray-600 mb-2">Total Revenue</p>
        <p className="text-3xl font-bold text-blue-600">${(totalRevenue / 1000).toFixed(0)}K</p>
        <p className="text-xs text-gray-500 mt-1">All teams combined</p>
      </Card>

      <Card className="card-base">
        <p className="text-sm text-gray-600 mb-2">Avg Performance</p>
        <p className="text-3xl font-bold text-green-600">{avgPerformance.toFixed(0)}%</p>
        <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
          <div
            className="bg-green-600 h-1 rounded-full"
            style={{ width: `${Math.min(100, avgPerformance)}%` }}
          />
        </div>
      </Card>

      <Card className="card-base">
        <p className="text-sm text-gray-600 mb-2">Top Performer</p>
        <p className="text-2xl font-bold text-primary">{topTeam?.name.split(' ')[1] || 'N/A'}</p>
        <p className="text-xs text-gray-500 mt-1">฿{topTeam?.totalCash.toLocaleString() || 0}</p>
      </Card>
    </div>
  )
}
