'use client'

import { Card } from '@/components/ui/card'
import { useGame } from '@/lib/game-context'

interface PerformanceChartProps {
  teamId?: string
}

export default function PerformanceChart({ teamId }: PerformanceChartProps) {
  const { gameState } = useGame()
  const team = teamId ? gameState.teams.find(t => t.id === teamId) : null

  if (!team || team.history.length === 0) {
    return (
      <Card className="card-base">
        <p className="text-gray-600">No historical data yet.</p>
      </Card>
    )
  }

  // Calculate metrics for chart
  const chartData = team.history.map((result, idx) => ({
    week: `W${result.week}`,
    revenue: result.revenue,
    profit: result.profit,
    units: result.unitsSold,
  }))

  const maxRevenue = Math.max(...chartData.map(d => d.revenue), 100000)
  const maxProfit = Math.max(...chartData.map(d => d.profit), 50000)

  return (
    <Card className="card-base">
      <h2 className="text-xl font-serif font-bold text-gray-900 mb-6">
        Performance Trend
      </h2>

      <div className="space-y-8">
        {/* Revenue Chart */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">Weekly Revenue</p>
          <div className="flex items-end gap-2 h-32">
            {chartData.map((data, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-blue-500 rounded-t relative group"
                  style={{
                    height: `${(data.revenue / maxRevenue) * 100}%`,
                    minHeight: '4px'
                  }}>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    ${(data.revenue / 1000).toFixed(0)}K
                  </div>
                </div>
                <span className="text-xs text-gray-600">{data.week}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          <div className="text-center">
            <p className="text-xs text-gray-600 mb-1">Avg Revenue</p>
            <p className="text-lg font-bold text-blue-600">
              ${(chartData.reduce((sum: number, d: any) => sum + d.revenue, 0) / chartData.length / 1000).toFixed(0)}K
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-600 mb-1">Total Units</p>
            <p className="text-lg font-bold text-primary">
              {chartData.reduce((sum: number, d: any) => sum + d.units, 0)}
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}
