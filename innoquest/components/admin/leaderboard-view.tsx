'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

interface TeamWithStats {
  id: string
  team_name: string
  funding_stage: string
  total_balance: number
  bonus_multiplier_pending: number | null
}

export default function LeaderboardView() {
  const [teams, setTeams] = useState<TeamWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const gameId = '00000000-0000-0000-0000-000000000001'

  useEffect(() => {
    loadLeaderboard()
    // Removed auto-polling to prevent API overload
  }, [])

  const loadLeaderboard = async () => {
    try {
      // Get all teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, team_name, funding_stage, total_balance, bonus_multiplier_pending')
        .eq('game_id', gameId)
        .order('total_balance', { ascending: false })

      if (teamsError) throw teamsError

      if (!teamsData || teamsData.length === 0) {
        setTeams([])
        setLoading(false)
        return
      }

      // Map teams directly without fetching weekly results
      const teamsWithStats: TeamWithStats[] = teamsData.map(team => ({
        id: team.id,
        team_name: team.team_name,
        funding_stage: team.funding_stage,
        total_balance: team.total_balance,
        bonus_multiplier_pending: team.bonus_multiplier_pending,
      }))

      setTeams(teamsWithStats)
      setLoading(false)
    } catch (error) {
      console.error('Error loading leaderboard:', error)
      setLoading(false)
    }
  }

  const handleBonusToggle = async (teamId: string, currentValue: number | null) => {
    try {
      // If bonus is currently null, set to 1.5x, otherwise clear it
      const newValue = currentValue === null ? 1.5 : null
      
      const { error } = await supabase
        .from('teams')
        .update({ bonus_multiplier_pending: newValue })
        .eq('team_id', teamId)
      
      if (error) throw error
      
      // Reload leaderboard to show updated state
      await loadLeaderboard()
    } catch (error) {
      console.error('Error updating bonus:', error)
      alert('Failed to update bonus multiplier')
    }
  }

  // Memoize sorted teams to prevent unnecessary re-renders
  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => b.total_balance - a.total_balance)
  }, [teams])

  if (loading) {
    return (
      <Card className="card-base">
        <h2 className="text-xl font-serif font-bold text-gray-900 mb-6">
          Game Leaderboard
        </h2>
        <p className="text-gray-600">Loading leaderboard...</p>
      </Card>
    )
  }

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
                <p className="font-semibold text-lg text-gray-900">{team.team_name}</p>
                <p className="text-sm text-gray-600 mb-2">Funding Stage: {team.funding_stage}</p>
                <label className="flex items-center gap-2 cursor-pointer w-fit">
                  <input
                    type="checkbox"
                    checked={team.bonus_multiplier_pending !== null}
                    onChange={() => handleBonusToggle(team.id, team.bonus_multiplier_pending)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Grant 1.5× Bonus
                  </span>
                  {team.bonus_multiplier_pending !== null && (
                    <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded ml-1">
                      Active Next Week
                    </span>
                  )}
                </label>
              </div>
              <div className="text-right min-w-48">
                <p className="text-2xl font-bold text-primary">${(team.total_balance || 0).toLocaleString()}</p>
                <p className="text-sm text-gray-600">Total Cash</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
