'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import NextImage from 'next/image'
import StudentHeader from '@/components/student/student-header'
import WeeklyDecisions from '@/components/student/weekly-decisions'
import StudentReports from '@/components/student/student-reports'

type TabType = 'decisions' | 'reports' | 'history'

interface TeamData {
  id: string
  team_name: string
  game_id: string
  selected_product_id?: string
  assigned_product_id?: string
  assigned_product_name?: string | null
  total_balance: number
  successful_rnd_tests: number
  funding_stage: string
}

interface GameSettings {
  game_id: string
  current_week: number
  total_weeks: number
  game_status: string
  cost_per_analytics?: number
  rnd_tier_config?: any
  week_duration_minutes?: number
  week_start_time?: string
}

export default function StudentGameplay() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<TabType>('decisions')
  const [team, setTeam] = useState<TeamData | null>(null)
  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)

  // Load initial data once
  useEffect(() => {
    const loadData = async () => {
      // Get team ID from session
      const teamId = sessionStorage.getItem('team_id')
      const teamName = sessionStorage.getItem('team_name')
      const gameId = sessionStorage.getItem('game_id')

      if (!teamId) {
        // Not logged in, redirect to login
        window.location.href = '/student/login'
        return
      }

      // Load team data from database
      const { data: teamData } = await supabase
        .from('teams')
        .select('team_id, team_name, game_id, assigned_product_id, total_balance, successful_rnd_tests, funding_stage')
        .eq('team_id', teamId)
        .single()

      if (!teamData) {
        console.log('Team not found, redirecting to login')
        sessionStorage.clear()
        window.location.href = '/student/login'
        return
      }

      if (teamData) {
        // If there's an assigned product, fetch its name
        let productName = null
        if (teamData.assigned_product_id) {
          const { data: productData } = await supabase
            .from('products')
            .select('name')
            .eq('id', teamData.assigned_product_id)
            .single()
          productName = productData?.name
        }

        setTeam({
          id: teamData.team_id,
          team_name: teamData.team_name,
          game_id: teamData.game_id,
          assigned_product_id: teamData.assigned_product_id,
          assigned_product_name: productName,
          total_balance: teamData.total_balance,
          successful_rnd_tests: teamData.successful_rnd_tests,
          funding_stage: teamData.funding_stage
        })

        // Load game settings
        const { data: settingsData } = await supabase
          .from('game_settings')
          .select('*')
          .eq('game_id', teamData.game_id)
          .single()

        if (settingsData) {
          // Check if game hasn't started yet
          if (settingsData.game_status !== 'active' && settingsData.game_status !== 'completed') {
            window.location.href = '/student/lobby'
            return
          }
          
          setGameSettings({
            game_id: settingsData.game_id,
            current_week: settingsData.current_week,
            total_weeks: settingsData.total_weeks,
            game_status: settingsData.game_status,
            cost_per_analytics: settingsData.cost_per_analytics || 5000,
            rnd_tier_config: settingsData.rnd_tier_config,
            week_duration_minutes: settingsData.week_duration_minutes || 5,
            week_start_time: settingsData.week_start_time
          })
        }
      }

      setLoading(false)
    }

    loadData()
  }, []) // Run only once on mount

  // Countdown timer effect
  useEffect(() => {
    if (!gameSettings?.week_start_time || gameSettings.game_status !== 'active') return

    const interval = setInterval(() => {
      const startTime = new Date(gameSettings.week_start_time!).getTime()
      const durationMs = (gameSettings.week_duration_minutes || 5) * 60 * 1000
      const endTime = startTime + durationMs
      const now = Date.now()
      const remaining = endTime - now

      if (remaining <= 0) {
        setTimeRemaining(0)
        // Week time expired, reload to get new week
        console.log('⏰ Week time expired, reloading...')
        setTimeout(() => window.location.reload(), 2000)
        clearInterval(interval)
      } else {
        setTimeRemaining(remaining)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [gameSettings?.week_start_time, gameSettings?.week_duration_minutes, gameSettings?.game_status])

  // Set up realtime subscriptions separately, only after team and gameSettings are loaded
  useEffect(() => {
    if (!team || !gameSettings) return

    console.log('Setting up realtime for team:', team.team_name)

    // Subscribe to game_settings changes
    const channel = supabase
      .channel('gameplay_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_settings',
          filter: `game_id=eq.${team.game_id}`
        },
        (payload) => {
          const newSettings = payload.new as GameSettings
          
          if (newSettings.game_status === 'completed') {
            console.log('🏁 Game completed, redirecting to results')
            window.location.href = '/student/result'
          } else if (newSettings.current_week !== gameSettings.current_week || newSettings.week_start_time !== gameSettings.week_start_time) {
            console.log(`Week changed from ${gameSettings.current_week} to ${newSettings.current_week} or timer reset`)
            window.location.reload()
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'teams',
          filter: `team_id=eq.${team.id}`
        },
        (payload) => {
          const updatedTeam = payload.new as any
          console.log('💰 Team balance updated:', updatedTeam.total_balance)
          setTeam(prev => prev ? {
            ...prev,
            total_balance: updatedTeam.total_balance,
            successful_rnd_tests: updatedTeam.successful_rnd_tests,
            funding_stage: updatedTeam.funding_stage
          } : null)
        }
      )
      .subscribe()

    return () => {
      console.log('Cleaning up realtime for team:', team.team_name)
      supabase.removeChannel(channel)
    }
  }, [team?.id, gameSettings?.current_week]) // Only re-run if team ID or current week changes

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleLogout = async () => {
    // Clear session storage
    sessionStorage.removeItem('team_id')
    sessionStorage.removeItem('team_name')
    sessionStorage.removeItem('game_id')
    
    // Redirect to home page
    window.location.href = '/'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading gameplay...</p>
        </div>
      </div>
    )
  }

  if (!team || !gameSettings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">Error loading game data.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F5F5] to-[#E8D5D0]">
      <div className="p-5">
        <div className="bg-white rounded-3xl shadow-2xl shadow-black/15 max-w-[1200px] w-full mx-auto overflow-hidden">
          <div className="bg-gradient-to-br from-[#E63946] to-[#C1121F] text-white px-10 py-8 rounded-t-3xl">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
              <div>
                <NextImage src="/logo.png" alt="InnoQuest" width={150} height={45} className="h-auto" priority />
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-white/20 px-4 py-2 rounded-xl font-semibold text-sm text-center">
                  {team.team_name}
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-white/20 border border-white/30 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all hover:bg-white/30 hover:-translate-y-0.5 flex items-center gap-2"
                >
                  <span>🚪</span>
                  <span>Logout</span>
                </button>
              </div>
            </div>
            <div>
              <h1 className="font-['Poppins'] font-bold text-[32px] mb-0">
                📊 Week {gameSettings.current_week} of {gameSettings.total_weeks}
              </h1>
            </div>
          </div>

          <div className="px-10 py-8">
            {/* Countdown Timer */}
            {gameSettings.game_status === 'active' && gameSettings.week_start_time && (
              <div className="mb-6 bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⏰</span>
                    <div>
                      <p className="text-sm font-medium text-orange-900">Time Remaining This Week</p>
                      <p className={`text-2xl font-bold ${timeRemaining <= 60000 ? 'text-red-600 animate-pulse' : 'text-orange-600'}`}>
                        {formatTime(timeRemaining)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-orange-700">
                    {timeRemaining <= 0 ? 'Advancing to next week...' : 'Week will auto-advance when timer ends'}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Current Balance</p>
                <p className="text-3xl font-bold text-[#E63946]">${team.total_balance.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 mb-1">Funding Stage</p>
                <div className="bg-gradient-to-br from-[#E63946] to-[#C1121F] text-white px-4 py-2 rounded-lg font-semibold text-sm inline-flex items-center gap-2">
                  <span>📍</span>
                  <span>{team.funding_stage}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-0 bg-white/20 rounded-xl p-1 mb-0">
              <button
                onClick={() => setActiveTab('decisions')}
                className={`flex-1 px-6 py-3 rounded-lg font-['Poppins'] font-semibold text-[15px] transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'decisions'
                    ? 'bg-white text-[#E63946] shadow-md'
                    : 'bg-transparent text-gray-600 hover:bg-white/15'
                }`}
              >
                <span>📋</span>
                <span>Weekly Decisions</span>
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`flex-1 px-6 py-3 rounded-lg font-['Poppins'] font-semibold text-[15px] transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'reports'
                    ? 'bg-white text-[#E63946] shadow-md'
                    : 'bg-transparent text-gray-600 hover:bg-white/15'
                }`}
              >
                <span>📊</span>
                <span>Reports & Analytics</span>
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 px-6 py-3 rounded-lg font-['Poppins'] font-semibold text-[15px] transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'history'
                    ? 'bg-white text-[#E63946] shadow-md'
                    : 'bg-transparent text-gray-600 hover:bg-white/15'
                }`}
              >
                <span>📜</span>
                <span>Decision History</span>
              </button>
            </div>
          </div>

          <div className="px-10 py-8">
            {activeTab === 'decisions' && (
              <WeeklyDecisions team={team} gameSettings={gameSettings} />
            )}
            {activeTab === 'reports' && (
              <StudentReports team={team} gameSettings={gameSettings} />
            )}
            {activeTab === 'history' && (
              <DecisionHistory team={team} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function DecisionHistory({ team }: { team: TeamData }) {
  const supabase = createClient()
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadResults = async () => {
      try {
        console.log('🔍 Loading decision history for team.id:', team.id, 'Type:', typeof team.id)
        // Resolve the UUID for teams and query weekly_results by teams_id
        const { data: teamPkData } = await supabase
          .from('teams')
          .select('id')
          .eq('team_id', team.id)
          .maybeSingle()

        const teamPk = teamPkData?.id

        const { data, error } = await supabase
          .from('weekly_results')
          .select('*')
          .eq('teams_id', teamPk)
          .order('week_number', { ascending: true })

        console.log('📊 Query error:', error)
        console.log('📊 Query data:', data)
        console.log('📊 Data length:', data?.length)

        if (error) {
          console.error('❌ Error loading decision history:', error)
          setResults([])
        } else if (data && data.length > 0) {
          console.log('✅ Decision history loaded:', data.length, 'records')
          setResults(data)
        } else {
          console.log('⚠️ No decision history found for teams_id:', team.id)
          setResults([])
        }
      } catch (err) {
        console.error('Exception loading decision history:', err)
        setResults([])
      }
      setLoading(false)
    }

    loadResults()
  }, [team.id, supabase])

  if (loading) {
    return <div className="p-4">Loading history...</div>
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-serif font-bold mb-4">Decision History</h3>
      {results.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No decisions submitted yet. Submit decisions to see your history here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr className="text-muted-foreground">
                <th className="text-center py-3">Week</th>
                <th className="text-center py-3">Price Set</th>
                <th className="text-center py-3">Revenue</th>
                <th className="text-center py-3">R&D Tier</th>
                <th className="text-center py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr key={result.id} className="border-b border-border hover:bg-secondary/50">
                  <td className="text-center py-3">Week {result.week_number}</td>
                  <td className="text-center">${result.set_price || 0}</td>
                  <td className="text-center">${(result.revenue || 0).toLocaleString()}</td>
                  <td className="text-center">{result.rnd_tier || '-'}</td>
                  <td className="text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        result.pass_fail_status === 'pass'
                          ? 'bg-green-100 text-green-800'
                          : result.pass_fail_status === 'fail'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {result.pass_fail_status || 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
