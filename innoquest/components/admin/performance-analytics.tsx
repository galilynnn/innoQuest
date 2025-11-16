'use client'

import { Card } from '@/components/ui/card'
import { useGame } from '@/lib/game-context'

export default function PerformanceAnalytics() {
  const { gameState } = useGame()

  // Calculate performance metrics
  const teamMetrics = gameState.teams.map((team) => {
    const totalRevenue = team.history.reduce((sum, r) => sum + r.revenue, 0)
    const totalProfit = team.history.reduce((sum, r) => sum + r.profit, 0)
    const avgProfit = team.history.length > 0 ? totalProfit / team.history.length : 0
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

    return {
      teamId: team.id,
      name: team.name,
      totalRevenue,
      totalProfit,
      avgProfit,
      profitMargin,
      weeksActive: team.history.length,
      fundingStage: team.fundingStage,
    }
  })

  const sortedByProfit = [...teamMetrics].sort((a, b) => b.totalProfit - a.totalProfit)

  return (
    <div className="space-y-6">
      <Card className="card-base">
        <h2 className="text-xl font-serif font-bold text-gray-900 mb-6">
          Performance Analytics
        </h2>

        <div className="space-y-3">
          {sortedByProfit.map((metric, idx) => (
            <div
              key={metric.teamId}
              className="border border-border rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-white text-sm font-bold">#{idx + 1}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{metric.name}</p>
                    <p className="text-xs text-gray-600">Weeks: {metric.weeksActive} | Stage: {metric.fundingStage}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">${metric.totalProfit.toLocaleString()}</p>
                  <p className="text-xs text-gray-600">Total Profit</p>
                </div>
              </div>

              {/* Performance Bars */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Revenue</span>
                    <span className="font-semibold text-gray-900">${(metric.totalRevenue / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min(100, (metric.totalRevenue / 500000) * 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Avg Weekly</span>
                    <span className="font-semibold text-gray-900">${(metric.avgProfit / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-green-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min(100, (metric.avgProfit / 100000) * 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Margin</span>
                    <span className="font-semibold text-gray-900">{metric.profitMargin.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-purple-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min(100, metric.profitMargin)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
