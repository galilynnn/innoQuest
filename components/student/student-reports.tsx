'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface TeamData {
  team_id: string
}

interface GameSettings {
  current_week: number
  // Admin-configured R&D tier ranges (optional)
  rnd_tier_config?: any
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
  const fallbackCacheRef = useRef<Record<string, { passProb: number | null; multiplier: number | null}>>({})
  const [results, setResults] = useState<WeeklyResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadResults = async () => {
      console.log('📊 Loading reports for team.team_id:', team.team_id)
      
      // Use team_id directly as the UUID for weekly_results query
      const { data: weeklyData, error: weeklyError } = await supabase
        .from('weekly_results')
        .select('*')
        .eq('team_id', team.team_id)
        .order('week_number', { ascending: true })

      console.log('📊 Weekly data:', weeklyData)
      console.log('📊 Weekly error:', weeklyError)

      const { data: rndTests, error: rndError } = await supabase
        .from('rnd_tests')
        .select('*')
        .eq('team_id', team.team_id)
        .order('week_number', { ascending: true })

      console.log('📊 RND tests:', rndTests)
      console.log('📊 RND error:', rndError)

      if (weeklyData && weeklyData.length > 0) {
        console.log('✅ Found', weeklyData.length, 'weekly results')
        
        // Log each result's calculated fields
        weeklyData.forEach((result, idx) => {
          console.log(`📊 Result ${idx + 1} (Week ${result.week_number}):`, {
            rnd_tier: result.rnd_tier,
            rnd_success: result.rnd_success,
            rnd_cost: result.rnd_cost,
            rnd_success_probability: result.rnd_success_probability,
            rnd_multiplier: result.rnd_multiplier,
            revenue: result.revenue,
            demand: result.demand,
          })
        })
        
        // Attach rnd_tests to each weekly result
        const resultsWithTests = weeklyData.map(result => {
          const weekTests = (rndTests || []).filter(test => test.week_number === result.week_number)
          console.log(`📊 Week ${result.week_number} R&D tests:`, {
            strategy: result.rnd_strategy,
            rnd_tier: result.rnd_tier,
            rnd_tier_2: result.rnd_tier_2,
            testsFound: weekTests.length,
            tests: weekTests.map(t => ({ tier: t.tier, success: t.success }))
          })
          return {
            ...result,
            rnd_tests: weekTests
          }
        })
        setResults(resultsWithTests)
      } else {
        console.log('⚠️ No weekly data found')
        setResults([])
      }
      setLoading(false)
    }

    loadResults()
  }, [team.team_id, supabase])

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
                <th className="text-center py-3">Week</th>
                <th className="text-center py-3">Tier</th>
                <th className="text-center py-3">Test Result</th>
                <th className="text-center py-3">Multiplier</th>
                <th className="text-center py-3">Analytics Tools</th>
              </tr>
            </thead>
            <tbody>
              {results.flatMap((result) => {
                // Only show R&D test results for weeks that have been advanced
                // A week is considered advanced if:
                // 1. week_number < current_week (week has passed), OR
                // 2. revenue and demand are calculated (not null/undefined)
                // This ensures results only show after admin advances the week
                const weekAdvanced = 
                  (gameSettings.current_week && result.week_number < gameSettings.current_week) ||
                  (result.revenue != null && result.demand != null)
                
                if (!weekAdvanced) {
                  // Week hasn't been advanced yet, don't show R&D test results
                  return []
                }
                
                // For "two-if-fail" strategy: check if we need to include second test
                let tests = result.rnd_tests && result.rnd_tests.length > 0 ? result.rnd_tests : []
                
                // If no rnd_tests found, fallback to using rnd_tier from weekly_results
                if (tests.length === 0 && result.rnd_tier) {
                  tests = [{ tier: result.rnd_tier, success: result.rnd_success }]
                }
                
                // For "two-if-fail" strategy with rnd_tier_2: ensure both tests are shown if second was run
                // If rnd_tests has both tests, they should already be included
                // If rnd_tests only has first test but rnd_tier_2 exists, check if second test should be shown
                if (result.rnd_strategy === 'two-if-fail' && result.rnd_tier_2) {
                  const hasSecondTest = tests.some(t => t.tier === result.rnd_tier_2)
                  console.log(`🔍 Week ${result.week_number} two-if-fail check:`, {
                    hasSecondTest,
                    testsCount: tests.length,
                    firstTier: result.rnd_tier,
                    secondTier: result.rnd_tier_2,
                    tests: tests.map(t => t.tier)
                  })
                  // If second test exists in rnd_tests, it means first test failed and second was run
                  // If second test doesn't exist, it means first test passed and second wasn't run (correct behavior)
                  // So we don't need to add it manually - it should already be in rnd_tests if it was run
                }
                
                return tests.filter(test => test.tier)
              }).map((test, globalIndex) => {
                // Find the result this test belongs to
                const result = results.find(r => 
                  (r.rnd_tests && r.rnd_tests.some(t => 'id' in test && t.id === test.id)) || 
                  (r.rnd_tier === test.tier && r.rnd_success === test.success)
                )
                
                if (!result) return null
                
                return (() => {
                  // Normalize tier to lowercase for consistent comparison
                  const tierLower = test.tier?.toLowerCase()
                  
                  // Use actual calculated values from database (stored during advance-week)
                  const testCost = result.rnd_cost || 0
                  
                  console.log(`🔍 Rendering test ${globalIndex + 1}:`, {
                    week: result.week_number,
                    tier: test.tier,
                    raw_rnd_success_probability: result.rnd_success_probability,
                    raw_rnd_multiplier: result.rnd_multiplier,
                    typeof_probability: typeof result.rnd_success_probability,
                    typeof_multiplier: typeof result.rnd_multiplier,
                  })
                  
                      // Display actual rolled success probability from database (already in percentage format)
                      // Use `!= null` so 0 is still shown, and otherwise choose a random value from admin-configured tier range
                      // Cache fallback values in a ref so they persist across renders for stable UX
                      const key = `${result.id}-${test.tier}`
                      if (!fallbackCacheRef.current[key]) {
                        // If we have config ranges, pick a random number from the range
                        if (gameSettings?.rnd_tier_config && tierLower && gameSettings.rnd_tier_config[tierLower]) {
                          const cfg = gameSettings.rnd_tier_config[tierLower]
                          const rand = (cfg.success_min + Math.random() * (cfg.success_max - cfg.success_min))
                          fallbackCacheRef.current[key] = {
                            passProb: Number(rand.toFixed(1)),
                            multiplier: Math.round(cfg.multiplier_min + Math.random() * (cfg.multiplier_max - cfg.multiplier_min))
                          }
                        } else {
                          fallbackCacheRef.current[key] = { passProb: null, multiplier: null }
                        }
                      }

                      const passProb = result.rnd_success_probability != null
                        ? result.rnd_success_probability.toFixed(1)
                        : (fallbackCacheRef.current[key].passProb != null
                            ? fallbackCacheRef.current[key].passProb.toFixed(1)
                            : 'N/A')
                  
                  // Display actual multiplier from database (already calculated, need to convert to percentage)
                  // Use `!= null` so 0 is still shown. Fall back to admin-configured range if actual value not available.
                  // Only show multiplier when the test has passed
                  const showMultiplier = test.success || result.rnd_success

                  const multiplier = showMultiplier
                    ? (result.rnd_multiplier != null
                        ? (result.rnd_multiplier * 100).toFixed(0)
                        : (fallbackCacheRef.current[key].multiplier != null
                            ? String(fallbackCacheRef.current[key].multiplier)
                            : 'N/A'))
                    : null
                  
                  console.log(`🔍 Calculated display values:`, {
                    passProb,
                    multiplier,
                  })
                  
                  return (
                    <tr key={`${result.id}-${globalIndex}`} className="border-b border-border hover:bg-secondary/50">
                      <td className="py-3 text-center">{globalIndex + 1}</td>
                      <td className="text-center">{result.week_number}</td>
                      <td className="py-3 text-center">{
                        test.tier || <span className="text-muted-foreground">No R&D</span>
                      }</td>
                      <td className="text-center">
                        {test.tier ? (
                          <span className={test.success ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                            {test.success ? '✓ Pass' : '✗ Fail'}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="text-center">{
                        test.tier ? (
                          multiplier == null ? '-' : `${multiplier}%`
                        ) : '-'
                      }</td>
                      <td className="text-center">
                        {result.analytics_purchased ? (
                          <span className="text-green-600">✓ Yes</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
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
