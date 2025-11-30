'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import DecisionsTab from './decisions-tab'
import ReportsTab from './reports-tab'
import ToolsTab from './tools-tab'
import { useGame } from '@/lib/game-context'

interface StudentGameplayProps {
  onBack: () => void
  teamId?: string | null
}

export default function StudentGameplay({ onBack, teamId: initialTeamId }: StudentGameplayProps) {
  const { gameState, createTeam } = useGame()
  const [activeTab, setActiveTab] = useState('decisions')
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(initialTeamId || null)

  // Auto-create team on first load if not in game state
  useEffect(() => {
    if (gameState.teams.length === 0 && !selectedTeamId) {
      createTeam('Your Team')
    } else if (gameState.teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(gameState.teams[0].team_id)
    }
  }, [gameState.teams, selectedTeamId, createTeam])

  const currentTeam = selectedTeamId ? gameState.teams.find(t => t.team_id === selectedTeamId) : null
  const budget = currentTeam?.budget || 0
  const week = currentTeam?.currentWeek || 1

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-border shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-serif font-bold text-gray-900">
                Team Decisions
              </h1>
              <p className="text-gray-600 text-sm">Week {week} of {gameState.totalWeeks}</p>
            </div>
            <button
              onClick={onBack}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Back
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">Available Budget</p>
              <p className="text-lg font-bold text-blue-600">${budget.toLocaleString()}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">Funding Stage</p>
              <p className="text-lg font-bold text-green-600">{currentTeam?.fundingStage || 'Seed'}</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">Team Status</p>
              <p className="text-lg font-bold text-purple-600">{currentTeam?.status || 'Active'}</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">Total Cash</p>
              <p className="text-lg font-bold text-orange-600">${currentTeam?.totalCash.toLocaleString() || '0'}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="decisions">Decisions</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
          </TabsList>

          <TabsContent value="decisions" className="space-y-6">
            <DecisionsTab teamId={selectedTeamId || undefined} />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <ReportsTab teamId={selectedTeamId || undefined} />
          </TabsContent>

          <TabsContent value="tools" className="space-y-6">
            <ToolsTab teamId={selectedTeamId || undefined} budget={budget} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
