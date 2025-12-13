'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Team {
  team_id: string
  team_name: string
  funding_stage: string
  total_balance: number
}

interface WeeklyResult {
  id: string
  week_number: number
  price: number
  avg_purchase_probability: number
  demand: number
  revenue: number
  cogs: number
  operating_cost: number
  rnd_cost: number
  analytics_cost: number
  profit: number
  balance_after: number
  rnd_multiplier: number
  milestone_award: number
}

interface RndTest {
  test_number: number
  tier: string
  cost: number
  success_probability: number
  passed: boolean
  multiplier: number
}

interface AnalyticsTool {
  tool_full_name: string
}

interface TeamWeeklyHistoryProps {
  gameId: string
}

export default function TeamWeeklyHistory({ gameId }: TeamWeeklyHistoryProps) {
  const supabase = createClient()
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [weeklyResults, setWeeklyResults] = useState<WeeklyResult[]>([])
  const [rndTests, setRndTests] = useState<Record<number, RndTest[]>>({})
  const [analyticsTools, setAnalyticsTools] = useState<Record<number, AnalyticsTool[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTeams()
  }, [gameId])

  useEffect(() => {
    if (selectedTeamId) {
      loadTeamData(selectedTeamId)
    }
  }, [selectedTeamId])

  const loadTeams = async () => {
    console.log('Loading teams for gameId:', gameId)
    const { data, error } = await supabase
      .from('teams')
      .select('team_id, team_name, funding_stage, total_balance')
      .eq('game_id', gameId)
      .order('team_name')

    if (error) {
      console.error('Error loading teams:', error.message, error.details, error.hint)
    }
    console.log('Teams query result:', { data, error, count: data?.length })
    
    if (data && data.length > 0) {
      setTeams(data)
      setSelectedTeamId(data[0].team_id)
    }
    setLoading(false)
  }

  const loadTeamData = async (teamId: string) => {
    setLoading(true)

    // Get weekly results
    const { data: results } = await supabase
      .from('weekly_results')
      .select('*')
      .eq('teams_id', teamId)
      .order('week_number')

    if (results) setWeeklyResults(results)

    // Get RND tests grouped by week
    const { data: tests } = await supabase
      .from('rnd_test_results')
      .select('*')
      .eq('team_id', teamId)
      .order('week_number, test_number')

    if (tests) {
      const grouped = tests.reduce((acc: Record<number, RndTest[]>, test) => {
        if (!acc[test.week_number]) acc[test.week_number] = []
        acc[test.week_number].push(test)
        return acc
      }, {})
      setRndTests(grouped)
    }

    // Get analytics tools grouped by week
    const { data: analytics } = await supabase
      .from('analytics_purchases')
      .select('*')
      .eq('teams_id', teamId)
      .order('week_number')

    if (analytics) {
      const grouped = analytics.reduce((acc: Record<number, AnalyticsTool[]>, tool) => {
        if (!acc[tool.week_number]) acc[tool.week_number] = []
        acc[tool.week_number].push(tool)
        return acc
      }, {})
      setAnalyticsTools(grouped)
    }

    setLoading(false)
  }

  // const handlePrint = () => window.print()

  if (loading && teams.length === 0) {
    return <div className="p-4 text-center">Loading...</div>
  }

  if (teams.length === 0) {
    return (
      <div className="p-8 text-center bg-gray-50 rounded-lg">
        <p className="text-gray-500">No teams found. Create teams in Teams & Credentials tab.</p>
      </div>
    )
  }

  const selectedTeam = teams.find(t => t.team_id === selectedTeamId)

  return (
    <div className="space-y-6">
      {/* Team Selection and Print Button */}
      <div className="flex items-center justify-between gap-4 no-print">
        <select
          value={selectedTeamId}
          onChange={(e) => setSelectedTeamId(e.target.value)}
          className="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-lg"
        >
          {teams.map(team => (
            <option key={team.team_id} value={team.team_id}>
              {team.team_name}
            </option>
          ))}
        </select>
        {/* <button
          onClick={handlePrint}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
        >
          🖨️ Print
        </button> */}
      </div>

      {/* Team Header */}
      {selectedTeam && (
        <div className="bg-green-100 border-2 border-green-300 rounded-xl p-6">
          <h2 className="text-2xl font-bold mb-2">{selectedTeam.team_name}</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600">Product</div>
              <div className="font-bold">Organic Meal Kit</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Stage</div>
              <div className="font-bold text-green-700">{selectedTeam.funding_stage}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Weeks</div>
              <div className="font-bold">{weeklyResults.length}</div>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Results */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : weeklyResults.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p>No weekly history yet. Team hasn't submitted any decisions.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {weeklyResults.map((week) => {
            const weekTests = rndTests[week.week_number] || []
            const weekAnalytics = analyticsTools[week.week_number] || []
            const totalExpenses = (week.cogs || 0) + (week.operating_cost || 0) + (week.rnd_cost || 0) + (week.analytics_cost || 0)

            return (
              <div key={week.id} className="bg-green-50 border-2 border-green-300 rounded-xl p-6 print:page-break-inside-avoid">
                {/* Week Header */}
                <h3 className="text-xl font-bold mb-4 pb-2 border-b-2 border-green-300">
                  Week {week.week_number}
                </h3>

                {/* Price & Demand */}
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-gray-600">SET PRICE</div>
                    <div className="font-bold text-lg">฿{week.price?.toLocaleString() || 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Average Prob</div>
                    <div className="font-bold text-lg">{week.avg_purchase_probability?.toFixed(2) || 0}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Multiplier</div>
                    <div className="font-bold text-lg">{week.rnd_multiplier?.toFixed(2) || '1.00'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Final Demand</div>
                    <div className="font-bold text-lg">{week.demand?.toLocaleString() || 0}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-gray-600">Expected Revenue</div>
                    <div className="font-bold text-lg text-blue-700">฿{week.revenue?.toLocaleString() || 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Final Revenue</div>
                    <div className="font-bold text-lg text-green-700">฿{week.revenue?.toLocaleString() || 0}</div>
                  </div>
                </div>

                {/* RND Tests */}
                {weekTests.length > 0 && (
                  <div className="mb-4 bg-white border border-gray-300 rounded-lg p-3">
                    <div className="text-sm font-bold mb-2">Test Records</div>
                    <table className="w-full text-xs">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-2 text-left">Test No.</th>
                          <th className="p-2 text-left">Tier</th>
                          <th className="p-2 text-right">Cost</th>
                          <th className="p-2 text-right">Pass Prob</th>
                          <th className="p-2 text-center">Result</th>
                          <th className="p-2 text-right">Multiplier</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weekTests.map((test, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="p-2">{test.test_number}</td>
                            <td className="p-2 capitalize">{test.tier}</td>
                            <td className="p-2 text-right">{test.cost?.toLocaleString() || 0}</td>
                            <td className="p-2 text-right">{test.success_probability?.toFixed(2) || 0}</td>
                            <td className="p-2 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                test.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {test.passed ? 'Pass' : 'Fail'}
                              </span>
                            </td>
                            <td className="p-2 text-right">{test.multiplier?.toFixed(2) || '1.00'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Analytics Tools */}
                {weekAnalytics.length > 0 && (
                  <div className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <div className="text-sm font-bold mb-2">Analytics Tools ({weekAnalytics.length})</div>
                    <div className="grid grid-cols-2 gap-2">
                      {weekAnalytics.map((tool, idx) => (
                        <div key={idx} className="text-xs bg-white p-2 rounded">
                          • {tool.tool_full_name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Financial Summary */}
                <div className="grid grid-cols-3 gap-4 bg-white border border-gray-300 rounded-lg p-3">
                  <div>
                    <div className="text-xs text-gray-600">Total Raised</div>
                    <div className="font-bold text-green-700">฿{week.milestone_award?.toLocaleString() || 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Total Expenses</div>
                    <div className="font-bold text-red-700">฿{totalExpenses.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Remaining</div>
                    <div className={`font-bold ${week.balance_after >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      ฿{week.balance_after?.toLocaleString() || 0}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Print Styles */}
      {/* <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 20px; }
          .print\\:page-break-inside-avoid { page-break-inside: avoid; }
        }
      `}</style> */}
    </div>
  )
}
