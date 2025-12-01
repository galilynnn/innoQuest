'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import NextImage from 'next/image'
import StudentHeader from '@/components/student/student-header'
import WeeklyDecisions from '@/components/student/weekly-decisions'
import StudentReports from '@/components/student/student-reports'

type TabType = 'decisions' | 'reports' | 'history'

interface TeamData {
  team_id: string
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
  initial_capital?: number
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
  const [displayRevenue, setDisplayRevenue] = useState<number>(0)
  const [displayDemand, setDisplayDemand] = useState<number>(0)
  const [lastSeenWeek, setLastSeenWeek] = useState<number>(0)
  const [lostRound, setLostRound] = useState<boolean>(false)

  // Load initial data once
  useEffect(() => {
    const loadData = async () => {
      console.log('🔍 Loading gameplay data...')
      
      // Get team ID from session
      const teamId = sessionStorage.getItem('team_id')
      const teamName = sessionStorage.getItem('team_name')
      const gameId = sessionStorage.getItem('game_id')

      console.log('📝 Session data:', { teamId, teamName, gameId })

      if (!teamId) {
        console.log('❌ No team_id in session, redirecting to login')
        sessionStorage.clear()
        window.location.href = '/student/login'
        return
      }

      // Load team data from database
      console.log('🔍 Querying teams table for team_id:', teamId)
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('team_id, team_name, game_id, assigned_product_id, total_balance, successful_rnd_tests, funding_stage')
        .eq('team_id', teamId)
        .single()

      console.log('📊 Team query result:', { teamData, teamError })

      if (teamError || !teamData) {
        console.error('❌ Team query error or team not found:', teamError)
        console.log('❌ Team not found in database - likely game was reset')
        sessionStorage.clear()
        window.location.href = '/student/login'
        return
      }

      if (teamData) {
        console.log('✅ Team found:', teamData.team_name)
        
        // If there's an assigned product, fetch its name
        let productName = null
        if (teamData.assigned_product_id) {
          console.log('🔍 Fetching product name for:', teamData.assigned_product_id)
          const { data: productData } = await supabase
            .from('products')
            .select('name')
            .eq('id', teamData.assigned_product_id)
            .single()
          productName = productData?.name
          console.log('📦 Product name:', productName)
        }

        setTeam({
          team_id: teamData.team_id,
          team_name: teamData.team_name,
          game_id: teamData.game_id,
          assigned_product_id: teamData.assigned_product_id,
          assigned_product_name: productName,
          total_balance: teamData.total_balance,
          successful_rnd_tests: teamData.successful_rnd_tests,
          funding_stage: teamData.funding_stage
        })

        // Load game settings
        console.log('🔍 Querying game_settings for game_id:', teamData.game_id)
        const { data: settingsData, error: settingsError } = await supabase
          .from('game_settings')
          .select('*')
          .eq('game_id', teamData.game_id)
          .single()

        // Get revenue and demand from the previous week (current_week - 1)
        // Round 1 (week 1) shows 0, Round 2 (week 2) shows week 1 results, etc.
        let revenue = 0
        let demand = 0
        
        if (settingsData && settingsData.current_week > 1) {
          // Get results from previous week
          const previousWeek = settingsData.current_week - 1
          const { data: previousWeekResult } = await supabase
            .from('weekly_results')
            .select('revenue, demand')
            .eq('team_id', teamData.team_id)
            .eq('week_number', previousWeek)
            .single()
          
          revenue = previousWeekResult?.revenue || 0
          demand = previousWeekResult?.demand || 0
        }
        // If current_week = 1, revenue and demand remain 0
        
        setDisplayRevenue(revenue)
        setDisplayDemand(demand)

        console.log('📊 Game settings query result:', { settingsData, settingsError })

        console.log('📊 Game settings query result:', { settingsData, settingsError })

        if (settingsData) {
          console.log('📊 Game Settings loaded:', settingsData)
          console.log('📊 Game Status:', settingsData.game_status)
          console.log('📊 Current Week:', settingsData.current_week)
          
          // Check if game hasn't started yet
          if (settingsData.game_status !== 'active' && settingsData.game_status !== 'completed') {
            console.log('⚠️ Game not active/completed, redirecting to lobby. Status:', settingsData.game_status)
            window.location.href = '/student/lobby'
            return
          }
          
          console.log('✅ Game is active/completed, loading gameplay page')
          
          setGameSettings({
            game_id: settingsData.game_id,
            current_week: settingsData.current_week,
            total_weeks: settingsData.total_weeks,
            game_status: settingsData.game_status,
            cost_per_analytics: settingsData.analytics_cost || 5000,
            rnd_tier_config: settingsData.rnd_tier_config,
            initial_capital: settingsData.initial_capital || 0,
            week_duration_minutes: settingsData.week_duration_minutes || 5,
            week_start_time: settingsData.week_start_time
          })
        } else {
          console.log('❌ No game settings found for game_id:', teamData.game_id)
        }
      }

      console.log('✅ Finished loading data')
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

  // Refresh revenue and demand when current_week changes
  useEffect(() => {
    if (!team || !gameSettings) return

    const refreshRevenueAndDemand = async () => {
      // Get revenue and demand from the previous week (current_week - 1)
      // Round 1 (week 1) shows 0, Round 2 (week 2) shows week 1 results, etc.
      let revenue = 0
      let demand = 0
      
      if (gameSettings.current_week > 1) {
        const previousWeek = gameSettings.current_week - 1
        const { data: previousWeekResult } = await supabase
          .from('weekly_results')
          .select('revenue, demand')
          .eq('team_id', team.team_id)
          .eq('week_number', previousWeek)
          .single()
        
        revenue = previousWeekResult?. Doesnt work still the same || 0
        demand = previousWeekResult?.demand || 0
      }
      // If current_week = 1, revenue and demand remain 0
      
      setDisplayRevenue(revenue)
      setDisplayDemand(demand)
    }

    // Check if new round started
    if (gameSettings.current_week > lastSeenWeek && lastSeenWeek > 0) {
      alert(`🎯 NEW ROUND STARTED!\n\nWeek ${gameSettings.current_week} has begun. Make your decisions for this round!`)
    }
    
    // Check if team lost the previous round
    const checkLostRound = async () => {
      if (gameSettings.current_week > 1) {
        const previousWeek = gameSettings.current_week - 1
        const { data: previousWeekResult } = await supabase
          .from('weekly_results')
          .select('revenue, demand, pass_fail_status')
          .eq('team_id', team.team_id)
          .eq('week_number', previousWeek)
          .single()
        
        // Check if lost round: revenue = 0, demand = 0, and pass_fail_status = 'fail'
        if (previousWeekResult && previousWeekResult.revenue === 0 && previousWeekResult.demand === 0 && previousWeekResult.pass_fail_status === 'fail') {
          setLostRound(true)
        } else {
          setLostRound(false)
        }
      } else {
        setLostRound(false)
      }
    }
    
    checkLostRound()
    setLastSeenWeek(gameSettings.current_week)
    refreshRevenueAndDemand()
  }, [team, gameSettings, supabase, lastSeenWeek])

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
            
            // Show alert when new round starts
            if (newSettings.current_week > gameSettings.current_week) {
              alert(`🎯 NEW ROUND STARTED!\n\nWeek ${newSettings.current_week} has begun. Make your decisions for this round!`)
            }
            
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
          filter: `team_id=eq.${team.team_id}`
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
          
          // Update revenue and demand if weekly results changed
          const updateRevenueAndDemand = async () => {
            if (!gameSettings) return
            
            let revenue = 0
            let demand = 0
            
            if (gameSettings.current_week > 1) {
              const previousWeek = gameSettings.current_week - 1
              const { data: previousWeekResult } = await supabase
                .from('weekly_results')
                .select('revenue, demand')
                .eq('team_id', updatedTeam.team_id)
                .eq('week_number', previousWeek)
                .single()
              
              revenue = previousWeekResult?.revenue || 0
              demand = previousWeekResult?.demand || 0
            }
            
            setDisplayRevenue(revenue)
            setDisplayDemand(demand)
          }
          updateRevenueAndDemand()
        }
      )
      .subscribe()

    return () => {
      console.log('Cleaning up realtime for team:', team.team_name)
      supabase.removeChannel(channel)
    }
  }, [team?.team_id, gameSettings?.current_week]) // Only re-run if team ID or current week changes

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

            {/* Lost Round Alert */}
            {lostRound && (
              <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-xl p-6 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">❌</div>
                  <div className="flex-1">
                    <h3 className="font-['Poppins'] text-xl font-bold text-red-800 mb-2">You Lost the Previous Round!</h3>
                    <p className="text-red-700 mb-3">
                      Your team had insufficient balance to cover the costs. As a result:
                    </p>
                    <ul className="list-disc list-inside text-red-700 space-y-1 mb-3">
                      <li>Revenue and Demand were set to 0 for that round</li>
                      <li>All R&D tests were automatically failed</li>
                      <li>Your team has been reset to the initial stage (Pre-Seed)</li>
                      <li>Balance has been reset to initial capital</li>
                    </ul>
                    <p className="text-red-800 font-semibold">
                      You can now make decisions for the new round and rebuild from the beginning.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 gap-4 mb-8">
              <div>
                <p className="text-sm text-gray-600 mb-1">Demand</p>
                <p className="text-3xl font-bold text-green-600">{displayDemand.toLocaleString()} pcs</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Revenue</p>
                <p className="text-3xl font-bold text-blue-600">฿{displayRevenue.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Balance</p>
                <p className="text-3xl font-bold text-[#E63946]">${team.total_balance.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">From milestone achievements</p>
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
        console.log('🔍 Loading decision history for team.team_id:', team.team_id, 'Type:', typeof team.team_id)
        // Use team_id directly as the UUID for weekly_results query
        const { data, error } = await supabase
          .from('weekly_results')
          .select('*')
          .eq('team_id', team.team_id)
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
          console.log('⚠️ No decision history found for team_id:', team.team_id)
          setResults([])
        }
      } catch (err) {
        console.error('Exception loading decision history:', err)
        setResults([])
      }
      setLoading(false)
    }

    loadResults()
  }, [team.team_id, supabase])

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
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr key={result.id} className="border-b border-border hover:bg-secondary/50">
                  <td className="text-center py-3">Week {result.week_number}</td>
                  <td className="text-center">${result.set_price || 0}</td>
                  <td className="text-center">${(result.revenue || 0).toLocaleString()}</td>
                  <td className="text-center">{result.rnd_tier || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
