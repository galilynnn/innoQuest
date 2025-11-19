'use client'

import { Card } from '@/components/ui/card'
import PerformanceChart from './performance-chart'
import TeamHealthIndicator from './team-health-indicator'
import { useGame } from '@/lib/game-context'

interface ReportsTabProps {
  teamId?: string
}

export default function ReportsTab({ teamId }: ReportsTabProps) {
  const { gameState } = useGame()
  
  const team = teamId && gameState.teams.find(t => t.id === teamId)
  
  if (!team) {
    return (
      <Card className="card-base">
        <h2 className="text-xl font-serif font-bold text-gray-900 mb-6">
          Weekly Results
        </h2>
        <p className="text-gray-600">Select a team to view reports.</p>
      </Card>
    )
  }

  if (team.history.length === 0) {
    return (
      <Card className="card-base">
        <h2 className="text-xl font-serif font-bold text-gray-900 mb-6">
          Weekly Results
        </h2>
        <p className="text-gray-600">No weekly results yet. Submit your decisions first.</p>
      </Card>
    )
  }

  const latestResult = team.history[team.history.length - 1]
  const totalRevenue = team.history.reduce((sum, r) => sum + (r.revenue || 0), 0)

  return (
    <div className="space-y-6">
      <Card className="card-base">
        <h2 className="text-xl font-serif font-bold text-gray-900 mb-6">
          Weekly Results (Week {latestResult.week})
        </h2>
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-blue-50 p-6 rounded-lg">
            <p className="text-gray-700 text-sm mb-1">Weekly Revenue</p>
            <p className="text-3xl font-bold text-blue-600">฿{(latestResult.revenue || 0).toLocaleString()}</p>
            <p className="text-sm text-gray-600 mt-2">Units Sold: {latestResult.unitsSold || 0}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <PerformanceChart teamId={teamId} />
        <TeamHealthIndicator teamId={teamId} />
      </div>

      <Card className="card-base">
        <h2 className="text-xl font-serif font-bold text-gray-900 mb-6">
          Financial Summary
        </h2>
        <div className="space-y-4">
          <table className="w-full text-sm">
            <tbody className="space-y-2">
              <tr className="border-b border-border">
                <td className="py-2 text-gray-600">Total Revenue (All Weeks)</td>
                <td className="py-2 text-right font-semibold text-gray-900">฿{totalRevenue.toLocaleString()}</td>
              </tr>
              <tr className="font-semibold text-primary">
                <td className="py-2">Current Cash Reserve</td>
                <td className="py-2 text-right">฿{team.totalCash.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
