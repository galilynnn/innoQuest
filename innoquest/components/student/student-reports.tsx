'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface TeamData {
  id: string
}

interface GameSettings {
  current_week: number
}

interface StudentReportsProps {
  team: TeamData
  gameSettings: GameSettings
}

export default function StudentReports({ team, gameSettings }: StudentReportsProps) {
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
            revenue: 297000,
            profit: 272000,
            rnd_tier: 'Basic',
            rnd_success: true
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
  const totalRevenue = results.reduce((sum, r) => sum + r.revenue, 0)
  const totalProfit = results.reduce((sum, r) => sum + r.profit, 0)
  const avgProfit = results.length > 0 ? totalProfit / results.length : 0
  const successfulTests = results.filter((r) => r.rnd_success).length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-primary">฿{totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Profit</p>
          <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ฿{totalProfit.toLocaleString()}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Average Profit/Week</p>
          <p className={`text-2xl font-bold ${avgProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ฿{avgProfit.toLocaleString()}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">R&D Tests Passed</p>
          <p className="text-2xl font-bold">{successfulTests}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-serif font-bold mb-4">R&D Test Results & Analytics</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr className="text-muted-foreground">
                <th className="text-center py-3">Test No.</th>
                <th className="text-left py-3">Tier</th>
                <th className="text-right py-3">Test Cost</th>
                <th className="text-right py-3">Pass Prob (%)</th>
                <th className="text-center py-3">Result</th>
                <th className="text-right py-3">Multiplier %</th>
                <th className="text-right py-3">Total Cost</th>
                <th className="text-center py-3">Week</th>
                <th className="text-right py-3">Price</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, index) => {
                // Mock data for R&D details if not available
                const testCost = result.rnd_cost || (result.rnd_tier === 'Basic' ? 40000 : result.rnd_tier === 'Standard' ? 80000 : result.rnd_tier === 'Advanced' ? 135000 : 185000)
                const passProb = result.rnd_tier === 'Basic' ? '15-35' : result.rnd_tier === 'Standard' ? '45-60' : result.rnd_tier === 'Advanced' ? '65-85' : result.rnd_tier === 'Premium' ? '75-95' : 'N/A'
                const multiplier = result.rnd_multiplier || (result.rnd_success ? (result.rnd_tier === 'Basic' ? '110' : result.rnd_tier === 'Standard' ? '125' : result.rnd_tier === 'Advanced' ? '145' : '165') : '100')
                
                return (
                  <tr key={result.id} className="border-b border-border hover:bg-secondary/50">
                    <td className="py-3 text-center">{index + 1}</td>
                    <td className="py-3">
                      {result.rnd_tier || <span className="text-muted-foreground">No R&D</span>}
                    </td>
                    <td className="text-right">฿{result.rnd_tier ? testCost.toLocaleString() : '-'}</td>
                    <td className="text-right">{result.rnd_tier ? passProb : '-'}</td>
                    <td className="text-center">
                      {result.rnd_tier ? (
                        <span className={result.rnd_success ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {result.rnd_success ? '✓ Pass' : '✗ Fail'}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="text-right">{result.rnd_tier ? `${multiplier}%` : '-'}</td>
                    <td className="text-right font-semibold">฿{(result.costs || 0).toLocaleString()}</td>
                    <td className="text-center">{result.week_number}</td>
                    <td className="text-right">฿{(result.set_price || 0).toLocaleString()}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
