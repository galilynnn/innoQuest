'use client'

import { Card } from '@/components/ui/card'
import { useGame } from '@/lib/game-context'

export default function LeaderboardView() {
  const { gameState } = useGame()

  // Sort teams by cash flow
  const sortedTeams = [...gameState.teams].sort((a, b) => b.totalCash - a.totalCash)

  if (sortedTeams.length === 0) {
    return (
      <Card className="card-base">
        <h2 className="text-xl font-serif font-bold text-gray-900 mb-6">
          Game Leaderboard
        </h2>
        <p className="text-gray-600">Leaderboard will appear once teams start playing.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="card-base">
        <h2 className="text-xl font-serif font-bold text-gray-900 mb-6">
          Game Leaderboard
        </h2>

        <div className="space-y-3">
          {sortedTeams.map((team, idx) => (
            <div
              key={team.id}
              className="flex items-center gap-6 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="min-w-16">
                <div className={`text-3xl font-bold font-serif ${
                  idx === 0 ? 'text-yellow-500' :
                  idx === 1 ? 'text-gray-400' :
                  idx === 2 ? 'text-orange-600' :
                  'text-gray-600'
                }`}>
                  #{idx + 1}
                </div>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{team.name}</p>
                <p className="text-sm text-gray-600">Funding Stage: {team.fundingStage}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">
                  {team.history.length === 0 ? 0 : team.history[team.history.length - 1].profit}
                </p>
                <p className="text-sm text-gray-600">Weekly Profit</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">${team.totalCash.toLocaleString()}</p>
                <p className="text-sm text-gray-600">Total Cash</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
