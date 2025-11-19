'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface TeamData {
  id: string
}

interface GameSettings {
  current_week: number
}

interface RndTest {
  id: string
  tier: string
  success: boolean
  week_number: number
}

interface WeeklyResult {
  id: string
  week_number: number
  revenue?: number
  costs?: number
  profit?: number
  set_price?: number
  rnd_tier?: string
  rnd_success?: boolean
  rnd_cost?: number
  rnd_success_probability?: number
  rnd_multiplier?: number
  analytics_purchased?: boolean
  pass_fail_status?: string
  rnd_tests?: RndTest[]
}

interface StudentReportsProps {
  team: TeamData
  gameSettings: GameSettings
}

export default function StudentReports({ team, gameSettings }: StudentReportsProps) {
  const supabase = createClient()
  const [results, setResults] = useState<WeeklyResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadResults = async () => {
      const { data: weeklyData } = await supabase
        .from('weekly_results')
        .select('*')
        .eq('team_id', team.id)
        .order('week_number', { ascending: true })

      const { data: rndTests } = await supabase
        .from('rnd_tests')
        .select('*')
        .eq('team_id', team.id)
        .order('week_number', { ascending: true })

      if (weeklyData && weeklyData.length > 0) {
        // Attach rnd_tests to each weekly result
        const resultsWithTests = weeklyData.map(result => ({
          ...result,
          rnd_tests: (rndTests || []).filter(test => test.week_number === result.week_number)
        }))
        setResults(resultsWithTests)
      } else {
        // Mock data for prototype
        setResults([
          {
            id: '1',
            week_number: 1,
            revenue: 297000,
            profit: 272000,
            rnd_tier: 'Basic',
            rnd_success: true,
            rnd_tests: []
          }
        ])
      }
      setLoading(false)
    }

    loadResults()
  }, [team.id, supabase])

  if (loading) {
    return <div className="p-4">Loading reports...</div>
  }

  // Calculate totals
  const totalRevenue = results.reduce((sum, r) => sum + (r.revenue || 0), 0)
  const totalCost = results.reduce((sum, r) => sum + (r.costs || 0), 0)
  const successfulTests = results.filter((r) => r.rnd_success).length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-primary">฿{totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">R&D Tests Passed</p>
          <p className="text-2xl font-bold">{successfulTests}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-serif font-bold">R&D Test Results & Analytics</h3>
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            <p className="text-sm text-red-600 font-semibold">Total Cost: ฿{totalCost.toLocaleString()}</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr className="text-muted-foreground">
                <th className="text-center py-3">Test No.</th>
                <th className="text-center py-3">Tier</th>
                <th className="text-center py-3">Test Cost</th>
                <th className="text-center py-3">Pass Prob</th>
                <th className="text-center py-3">Test Result</th>
                <th className="text-center py-3">Multiplier</th>
                <th className="text-center py-3">Week</th>
                <th className="text-center py-3">Analytics Tools</th>
                <th className="text-center py-3">Price</th>
              </tr>
            </thead>
            <tbody>
              {results.flatMap((result) => {
                const tests = result.rnd_tests && result.rnd_tests.length > 0 ? result.rnd_tests : [{ tier: result.rnd_tier, success: result.rnd_success }]
                
                return tests.filter(test => test.tier)
              }).map((test, globalIndex) => {
                // Find the result this test belongs to
                const result = results.find(r => 
                  (r.rnd_tests && r.rnd_tests.some(t => t.id === test.id)) || 
                  (r.rnd_tier === test.tier && r.rnd_success === test.success)
                )
                
                if (!result) return null
                
                return (() => {
                  // Normalize tier to lowercase for consistent comparison
                  const tierLower = test.tier?.toLowerCase()
                  
                  // Use actual calculated values from database, with fallbacks
                  const testCost = result.rnd_cost || (tierLower === 'basic' ? 40000 : tierLower === 'standard' ? 80000 : tierLower === 'advanced' ? 135000 : 185000)
                  
                  // Display actual rolled success probability if available, otherwise show range
                  const passProb = result.rnd_success_probability 
                    ? result.rnd_success_probability.toFixed(1) 
                    : (tierLower === 'basic' ? '15-35' : tierLower === 'standard' ? '45-60' : tierLower === 'advanced' ? '65-85' : tierLower === 'premium' ? '75-95' : 'N/A')
                  
                  // Display actual multiplier if available, otherwise use mock data
                  const multiplier = result.rnd_multiplier 
                    ? (result.rnd_multiplier * 100).toFixed(0) 
                    : (test.success ? (tierLower === 'basic' ? '110' : tierLower === 'standard' ? '125' : tierLower === 'advanced' ? '145' : '165') : '100')
                  
                  return (
                    <tr key={`${result.id}-${globalIndex}`} className="border-b border-border hover:bg-secondary/50">
                      <td className="py-3 text-center">{globalIndex + 1}</td>
                      <td className="py-3 text-center">{
                        test.tier || <span className="text-muted-foreground">No R&D</span>
                      }</td>
                      <td className="text-center">฿{test.tier ? testCost.toLocaleString() : '-'}</td>
                      <td className="text-center">{test.tier ? `${passProb}%` : '-'}</td>
                      <td className="text-center">
                        {test.tier ? (
                          <span className={test.success ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                            {test.success ? '✓ Pass' : '✗ Fail'}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="text-center">{test.tier ? `${multiplier}%` : '-'}</td>
                      <td className="text-center">{result.week_number}</td>
                      <td className="text-center">
                        {result.analytics_purchased ? (
                          <span className="text-green-600">✓ Yes</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="text-center">฿{(result.set_price || 0).toLocaleString()}</td>
                    </tr>
                  )
                })()
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
