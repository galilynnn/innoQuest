'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useGame } from '@/lib/game-context'

export default function TeamsMonitoring() {
  const { gameState } = useGame()
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)

  if (gameState.teams.length === 0) {
    return (
      <Card className="card-base">
        <h2 className="text-xl font-serif font-bold text-gray-900 mb-6">
          Real-time Team Metrics
        </h2>
        <p className="text-gray-600">No teams created yet. Teams will appear here once the game starts.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="card-base">
        <h2 className="text-xl font-serif font-bold text-gray-900 mb-6">
          Real-time Team Metrics
        </h2>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b-2 border-border">
                <TableHead>Team Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Week</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Cash Flow</TableHead>
                <TableHead>Funding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gameState.teams.map((team) => {
                const performanceScore = team.totalCash > 0
                  ? Math.min(100, (team.totalCash / 1000000) * 100)
                  : 0

                return (
                  <TableRow
                    key={team.team_id}
                    className={`border-b border-border hover:bg-gray-50 cursor-pointer ${
                      selectedTeam === team.team_id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedTeam(team.team_id)}
                  >
                    <TableCell className="font-semibold text-gray-900">{team.name}</TableCell>
                    <TableCell>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        team.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : team.status === 'paused'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {team.status}
                      </span>
                    </TableCell>
                    <TableCell>{team.currentWeek - 1}</TableCell>
                    <TableCell>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${performanceScore}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">{performanceScore.toFixed(0)}%</span>
                    </TableCell>
                    <TableCell className="font-semibold text-gray-900">
                      ${team.totalCash.toLocaleString()}
                    </TableCell>
                    <TableCell>{team.fundingStage}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
