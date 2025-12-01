'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Team {
  team_id: string
  team_name: string
  total_balance: number
  successful_rnd_tests: number
  funding_stage: string
  is_active: boolean
  bonus_multiplier_pending: number | null
}

interface WeeklyResult {
  id: string
  team_id: string
  week_number: number
  revenue: number
  profit: number
  pass_fail_status: string
}

interface GameMonitoringProps {
  gameId: string
}

export default function GameMonitoring({ gameId }: GameMonitoringProps) {
  const supabase = createClient()
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [weeklyResults, setWeeklyResults] = useState<WeeklyResult[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  useEffect(() => {
    loadTeams()
    
    // Set up real-time subscription for team balance updates
    const channel = supabase
      .channel('teams_balance_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'teams',
          filter: `game_id=eq.${gameId}`
        },
        (payload) => {
          console.log('Team balance updated:', payload)
          // Reload teams to get updated balance
          loadTeams()
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId])

  const loadTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('team_id, team_name, total_balance, successful_rnd_tests, funding_stage, is_active, bonus_multiplier_pending')
        .eq('game_id', gameId)
        .order('total_balance', { ascending: false })

      if (data) {
        setTeams(data as Team[])
        setLastUpdated(new Date())
        if (data.length > 0) {
          // Update selectedTeam if it exists, otherwise select first team
          if (selectedTeam) {
            const updatedTeam = data.find(t => t.team_id === selectedTeam.team_id)
            if (updatedTeam) {
              setSelectedTeam(updatedTeam as Team)
            } else {
              // Selected team no longer exists, select first team
              setSelectedTeam(data[0] as Team)
              loadWeeklyResults((data[0] as any).team_id)
            }
          } else {
            setSelectedTeam(data[0] as Team)
            loadWeeklyResults((data[0] as any).team_id)
          }
        }
      }
      
      if (error) {
        console.error('Error loading teams:', error)
      }
    } catch (error) {
      console.error('Exception loading teams:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadWeeklyResults = async (teamId: string) => {
    try {
      const { data } = await supabase
        .from('weekly_results')
        .select('*')
        .eq('team_id', teamId)
        .order('week_number', { ascending: true })

      if (data) {
        setWeeklyResults(data)
      }
    } catch (error) {
      console.error('Error loading weekly results:', error)
    }
  }

  const handleSelectTeam = (team: Team) => {
    setSelectedTeam(team)
    loadWeeklyResults(team.team_id)
  }

  const handleBonusToggle = async (teamId: string, currentBonus: number | null, currentStage: string) => {
    try {
      let newValue = null
      
      if (currentBonus === null) {
        // Fetch the bonus multiplier from game_settings investment_config based on funding stage
        const { data: gameSettings, error: configError } = await supabase
          .from('game_settings')
          .select('investment_config')
          .eq('game_id', gameId)
          .single()
        
        if (configError || !gameSettings) {
          console.error('Error fetching game settings:', configError)
          alert('Failed to fetch bonus multiplier configuration')
          return
        }
        
        // Convert funding stage to match JSON keys (e.g., "Seed" -> "seed", "Series A" -> "series_a")
        const stageKey = currentStage.toLowerCase().replace(/\s+/g, '_')
        const investmentConfig = gameSettings.investment_config as any
        const stageConfig = investmentConfig[stageKey]
        
        if (!stageConfig || !stageConfig.bonus_multiplier) {
          console.error('No config found for stage:', stageKey)
          alert('No bonus multiplier configured for ' + currentStage)
          return
        }
        
        newValue = stageConfig.bonus_multiplier
      }
      
      const { error } = await supabase
        .from('teams')
        .update({ bonus_multiplier_pending: newValue })
        .eq('team_id', teamId)
      
      if (error) throw error
      
      await loadTeams()
    } catch (error) {
      console.error('Error updating bonus:', error)
      alert('Failed to update bonus multiplier')
    }
  }

  if (loading) {
    return <div className="p-4">Loading...</div>
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-serif font-bold">Teams Leaderboard</h3>
          <button
            onClick={loadTeams}
            className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-xs font-semibold transition-all"
            title="Refresh team data"
          >
            🔄
          </button>
        </div>
        <div className="text-xs text-gray-500 mb-3">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
        <div className="space-y-2">
          {teams.map((team, idx) => (
            <button
              key={team.team_id}
              onClick={() => handleSelectTeam(team)}
              className={`w-full p-4 text-left rounded-lg border transition-colors ${
                selectedTeam?.team_id === team.team_id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border hover:bg-secondary'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-serif font-bold">#{idx + 1}</span>
                <span className="text-sm opacity-75">{team.funding_stage}</span>
              </div>
              <p className="font-semibold text-left">{team.team_name}</p>
              <p className={`text-sm text-left ${selectedTeam?.team_id === team.team_id ? 'opacity-90' : 'text-muted-foreground'}`}>
                ${team.total_balance.toLocaleString()}
              </p>
              <div className="mt-2 pt-2 border-t border-border/50">
                <label 
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleBonusToggle(team.team_id, team.bonus_multiplier_pending, team.funding_stage)
                  }}
                >
                  <input
                    type="checkbox"
                    checked={team.bonus_multiplier_pending !== null}
                    onChange={() => {}}
                    className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                  />
                  <span className="text-xs font-medium">
                    Grant Bonus ({team.funding_stage})
                  </span>
                  {team.bonus_multiplier_pending !== null && (
                    <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded ml-auto">
                      {team.bonus_multiplier_pending}×
                    </span>
                  )}
                </label>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="col-span-2">
        {selectedTeam ? (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-serif font-bold mb-4">{selectedTeam.team_name}</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
                  <p className="text-2xl font-bold text-primary">${selectedTeam.total_balance.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Funding Stage</p>
                  <p className="text-2xl font-bold">{selectedTeam.funding_stage}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">R&D Tests Passed</p>
                  <p className="text-2xl font-bold">{selectedTeam.successful_rnd_tests}</p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-serif font-bold mb-4">Weekly Performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border">
                    <tr className="text-muted-foreground">
                      <th className="text-center py-2">Week</th>
                      <th className="text-center py-2">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="space-y-2">
                    {weeklyResults.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="text-center py-4 text-muted-foreground">
                          No results yet
                        </td>
                      </tr>
                    ) : (
                      weeklyResults.map((result) => (
                        <tr key={result.id} className="border-b border-border hover:bg-secondary/50">
                          <td className="py-3 text-center">Week {result.week_number}</td>
                          <td className="text-center">${(result.revenue || 0).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">No teams available</p>
          </div>
        )}
      </div>
    </div>
  )
}
