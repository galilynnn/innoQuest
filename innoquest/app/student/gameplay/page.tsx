'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import StudentHeader from '@/components/student/student-header'
import WeeklyDecisions from '@/components/student/weekly-decisions'
import StudentReports from '@/components/student/student-reports'

type TabType = 'decisions' | 'reports' | 'history'

interface TeamData {
  id: string
  team_name: string
  game_id: string
  selected_product_id?: string
  total_balance: number
  successful_rnd_tests: number
  funding_stage: string
}

interface GameSettings {
  game_id: string
  current_week: number
  total_weeks: number
  game_status: string
}

export default function StudentGameplay() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<TabType>('decisions')
  const [team, setTeam] = useState<TeamData | null>(null)
  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null)
  const [loading, setLoading] = useState(true)

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
        .select('*')
        .eq('id', teamId)
        .single()

      if (teamData) {
        setTeam(teamData)

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
          
          setGameSettings(settingsData)
        }
      }

      setLoading(false)
    }

    loadData()

    // Heartbeat: Update last_activity every 10 seconds to show player is active
    const heartbeat = setInterval(async () => {
      const teamId = sessionStorage.getItem('team_id')
      if (teamId) {
        await supabase
          .from('teams')
          .update({ 
            last_activity: new Date().toISOString(),
            is_active: true 
          })
          .eq('id', teamId)
      }
    }, 10000) // Every 10 seconds

    return () => clearInterval(heartbeat)
  }, [supabase])

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
              <div className="font-['Poppins'] font-bold text-2xl tracking-tight">
                InnoQuest
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
      const { data } = await supabase
        .from('weekly_results')
        .select('*')
        .eq('team_id', team.id)
        .order('week_number', { ascending: true })

      if (data && data.length > 0) {
        setResults(data)
      } else {
        // Mock data for prototype
        setResults([
          {
            id: '1',
            week_number: 1,
            set_price: 99,
            revenue: 297000,
            profit: 277000,
            rnd_tier: 'Basic',
            pass_fail_status: 'pass'
          }
        ])
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
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr className="text-muted-foreground">
              <th className="text-left py-3">Week</th>
              <th className="text-right py-3">Price Set</th>
              <th className="text-right py-3">Revenue</th>
              <th className="text-right py-3">Profit</th>
              <th className="text-left py-3">R&D Tier</th>
              <th className="text-left py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr key={result.id} className="border-b border-border hover:bg-secondary/50">
                <td className="py-3">Week {result.week_number}</td>
                <td className="text-right">${result.set_price}</td>
                <td className="text-right">${result.revenue.toLocaleString()}</td>
                <td className={`text-right font-semibold ${result.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${result.profit.toLocaleString()}
                </td>
                <td className="py-3">{result.rnd_tier || '-'}</td>
                <td>
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
    </div>
  )
}
