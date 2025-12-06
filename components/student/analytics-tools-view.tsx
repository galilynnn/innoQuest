'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import AnalyticsVisualization from './analytics-visualization'

interface TeamData {
  team_id: string
  team_name: string
  game_id: string
}

interface GameSettings {
  current_week: number
  total_weeks: number
}

interface AnalyticsToolsViewProps {
  team: TeamData
  gameSettings: GameSettings
}

// Analytics tools structure - must match weekly-decisions.tsx
const ANALYTICS_TOOLS = [
  { category: 'Health Consciousness', operation: 'Average', metrics: ['Monthly Food Spending', 'Monthly Income'], breakdown: 'Health Consciousness', chart: 'Stacked Bar Chart', fullName: 'Average of Monthly Food Spending and Average of Monthly Income by Health Consciousness (Stacked Bar Chart)' },
  { category: 'Health Consciousness', operation: 'Average', metrics: ['Working Hours per Week'], breakdown: 'Health Consciousness', chart: 'Bar Chart', fullName: 'Average of Working Hours per Week by Health Consciousness (Bar Chart)' },
  { category: 'Gender', operation: 'Count', metrics: ['Customer_ID'], breakdown: 'Gender', chart: 'Pie Chart', fullName: 'Count of Customer_ID by Gender (Pie Chart)' },
  { category: 'Experimental Food Interest', operation: 'Average', metrics: ['Working Hours per Week'], breakdown: 'Interest in Experimental Food', chart: 'Bar Chart', fullName: 'Average of Working Hours per Week by Interest in Experimental Food (Bar Chart)' },
  { category: 'Experimental Food Interest', operation: 'Average', metrics: ['Monthly Food Spending', 'Monthly Income'], breakdown: 'Interest in Experimental Food', chart: 'Stacked Bar Chart', fullName: 'Average of Monthly Food Spending and Average of Monthly Income by Interest in Experimental Food (Stacked Bar Chart)' },
  { category: 'Gender', operation: 'Average', metrics: ['Monthly Income', 'Monthly Food Spending'], breakdown: 'Gender', chart: 'Stacked Bar Chart', fullName: 'Average of Monthly Income and Average of Monthly Food Spending by Gender (Stacked Bar Chart)' },
  { category: 'Health Consciousness', operation: 'Count', metrics: ['Customer_ID'], breakdown: 'Health Consciousness', chart: 'Bar Chart', fullName: 'Count of Customer_ID by Health Consciousness (Bar Chart)' },
  { category: 'Experimental Food Interest', operation: 'Count', metrics: ['Customer_ID'], breakdown: 'Interest in Experimental Food', chart: 'Bar Chart', fullName: 'Count of Customer_ID by Interest in Experimental Food (Bar Chart)' },
  { category: 'Working Hours', operation: 'Average', metrics: ['Monthly Income'], breakdown: 'Working Hours per Week', chart: 'Bar Chart', fullName: 'Average of Monthly Income by Working Hours per Week (Bar Chart)' },
  { category: 'Brand Loyalty', operation: 'Average', metrics: ['Monthly Food Spending', 'Monthly Income'], breakdown: 'Brand Loyalty', chart: 'Stacked Bar Chart', fullName: 'Average of Monthly Food Spending and Average of Monthly Income by Brand Loyalty (Stacked Bar Chart)' },
  { category: 'Dietary Preference', operation: 'Average', metrics: ['Brand Loyalty'], breakdown: 'Dietary Preference', chart: 'Bar Chart', fullName: 'Average of Brand Loyalty by Dietary Preference (Bar Chart)' },
  { category: 'Brand Loyalty', operation: 'Average', metrics: ['Monthly Income', 'Monthly Food Spending'], breakdown: 'Brand Loyalty', chart: 'Combination Bar and Line Chart', fullName: 'Average of Monthly Income and Average of Monthly Food Spending by Brand Loyalty (Combination Bar and Line Chart)' },
  { category: 'Brand Loyalty', operation: 'Average', metrics: ['Monthly Food Spending'], breakdown: 'Brand Loyalty', chart: 'Bar Chart', fullName: 'Average of Monthly Food Spending by Brand Loyalty (Bar Chart)' },
  { category: 'Brand Loyalty', operation: 'Average', metrics: ['Monthly Income'], breakdown: 'Brand Loyalty and Gender', chart: 'Clustered Bar Chart', fullName: 'Average of Monthly Income by Brand Loyalty and Gender (Clustered Bar Chart)' },
  { category: 'Sustainability Preference', operation: 'Count', metrics: ['Customer_ID'], breakdown: 'Sustainability Preference', chart: 'Bar Chart', fullName: 'Count of Customer_ID by Sustainability Preference (Bar Chart)' },
  { category: 'Health Consciousness', operation: 'Count', metrics: ['Customer_ID'], breakdown: 'Health Consciousness and Sustainability Preference', chart: 'Clustered Bar Chart', fullName: 'Count of Customer_ID by Health Consciousness and Sustainability Preference (Clustered Bar Chart)' },
  { category: 'Sustainability Preference', operation: 'Average', metrics: ['Monthly Income'], breakdown: 'Sustainability Preference', chart: 'Line Chart', fullName: 'Average of Monthly Income by Sustainability Preference (Line Chart)' },
  { category: 'Sustainability Preference', operation: 'Sum', metrics: ['Monthly Food Spending'], breakdown: 'Sustainability Preference', chart: 'Bar Chart', fullName: 'Sum of Monthly Food Spending by Sustainability Preference (Bar Chart)' },
  { category: 'Sustainability Preference', operation: 'Average', metrics: ['Monthly Income', 'Monthly Food Spending'], breakdown: 'Sustainability Preference and Gender', chart: 'Combination Bar and Line Chart', fullName: 'Average of Monthly Income and Average of Monthly Food Spending by Sustainability Preference and Gender (Combination Bar and Line Chart)' },
  { category: 'Brand Loyalty', operation: 'Count', metrics: ['Customer_ID'], breakdown: 'Brand Loyalty and Gender', chart: 'Clustered Bar Chart', fullName: 'Count of Customer_ID by Brand Loyalty and Gender (Clustered Bar Chart)' },
]

interface PurchasedTool {
  week_number: number
  tool_type: string
  cost: number
}

export default function AnalyticsToolsView({ team, gameSettings }: AnalyticsToolsViewProps) {
  const supabase = createClient()
  const [purchasedTools, setPurchasedTools] = useState<PurchasedTool[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const [selectedTool, setSelectedTool] = useState<PurchasedTool | null>(null)
  const [visualizationData, setVisualizationData] = useState<any>(null)
  const [loadingVisualization, setLoadingVisualization] = useState(false)

  useEffect(() => {
    const loadPurchasedTools = async () => {
      try {
        console.log('Loading purchased tools for team_id:', team.team_id)
        
        // Query analytics_purchases using team_id directly (matches schema)
        const { data, error } = await supabase
          .from('analytics_purchases')
          .select('week_number, tool_type, cost')
          .eq('team_id', team.team_id)
          .order('week_number', { ascending: false })

        if (error) {
          console.error('Error loading purchased tools:', error)
          console.error('Error details:', JSON.stringify(error, null, 2))
          setPurchasedTools([])
        } else {
          console.log('Loaded purchased tools:', data)
          setPurchasedTools(data || [])
          // Set default to current week or latest week
          if (data && data.length > 0) {
            const latestWeek = Math.max(...data.map(t => t.week_number))
            setSelectedWeek(latestWeek)
          }
        }
      } catch (err) {
        console.error('Exception loading purchased tools:', err)
        setPurchasedTools([])
      } finally {
        setLoading(false)
      }
    }

    loadPurchasedTools()
  }, [team.team_id, supabase])

  // Group tools by week
  const toolsByWeek = purchasedTools.reduce((acc, tool) => {
    if (!acc[tool.week_number]) {
      acc[tool.week_number] = []
    }
    acc[tool.week_number].push(tool)
    return acc
  }, {} as Record<number, PurchasedTool[]>)

  const availableWeeks = Object.keys(toolsByWeek).map(Number).sort((a, b) => b - a)

  // Tools available for current week (purchased exactly one week before)
  // If bought in week N, only available in week N+1, then gone
  const previousWeek = gameSettings.current_week - 1
  const availableTools = purchasedTools.filter(tool => tool.week_number === previousWeek)
  
  // Tools purchased this week (will be available next week)
  const toolsPurchasedThisWeek = purchasedTools.filter(tool => tool.week_number === gameSettings.current_week)

  if (loading) {
    return (
      <section className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
          <div className="w-1 h-8 bg-linear-to-b from-green-500 to-green-700 rounded-full"></div>
          <h2 className="text-2xl font-serif font-bold text-gray-900">Tools</h2>
        </div>
        <div className="text-center py-12 text-gray-500">
          <p>Loading tools...</p>
        </div>
      </section>
    )
  }

  if (purchasedTools.length === 0) {
    return (
      <section className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
          <div className="w-1 h-8 bg-linear-to-b from-green-500 to-green-700 rounded-full"></div>
          <h2 className="text-2xl font-serif font-bold text-gray-900">Tools</h2>
        </div>
        <div className="text-center py-12 text-gray-500">
          <p>No analytics tools purchased yet. Purchase tools in Weekly Decisions to view them here.</p>
        </div>
      </section>
    )
  }

  const displayWeek = selectedWeek || availableWeeks[0]
  const toolsForWeek = toolsByWeek[displayWeek] || []

  return (
    <section className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
        <div className="w-1 h-8 bg-linear-to-b from-green-500 to-green-700 rounded-full"></div>
        <h2 className="text-2xl font-serif font-bold text-gray-900">Tools</h2>
      </div>

      <div className="space-y-6">
        {/* Available Tools for Current Week */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-serif font-bold text-gray-900">
              Available Tools (Week {gameSettings.current_week})
            </h3>
            <span className="text-sm text-gray-600 bg-green-50 px-3 py-1 rounded-full">
              {availableTools.length} tool(s) available
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Tools purchased in Week {previousWeek} that you can use in this round only. They will expire after this week.
          </p>
          
          {availableTools.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
              <p>No tools available yet. Purchase tools in Weekly Decisions to use them in the next round.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {availableTools.map((purchasedTool, idx) => {
                const toolInfo = ANALYTICS_TOOLS.find(t => t.fullName === purchasedTool.tool_type)
                
                return (
                  <div
                    key={idx}
                    className="border-2 border-green-200 rounded-lg p-4 bg-linear-to-br from-green-50 to-emerald-50 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold px-2 py-1 bg-purple-100 text-purple-700 rounded">
                            {toolInfo?.category || 'Unknown'}
                          </span>
                          <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded">
                            {toolInfo?.operation || 'Tool'}
                          </span>
                          <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded">
                            {toolInfo?.chart || 'Chart'}
                          </span>
                          <span className="text-xs font-semibold px-2 py-1 bg-green-500 text-white rounded">
                            ✓ Available
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-gray-800 mb-1">
                          {toolInfo ? `${toolInfo.operation} of ${toolInfo.metrics.join(' and ')}` : purchasedTool.tool_type}
                        </div>
                        <div className="text-xs text-gray-600">
                          by {toolInfo?.breakdown || 'N/A'}
                        </div>
                      </div>
                      <div className="text-right ml-4 flex flex-col items-end gap-2">
                        <div className="text-xs text-gray-500">
                          Purchased Week {purchasedTool.week_number}
                        </div>
                        <button
                          onClick={() => setSelectedTool(purchasedTool)}
                          className="px-4 py-2 bg-[#E63946] text-white rounded-lg text-sm font-semibold hover:bg-[#C1121F] transition-all hover:shadow-md"
                        >
                          Access Tool
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Tools Purchased This Week */}
        {toolsPurchasedThisWeek.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-serif font-bold text-gray-900">
                Tools Purchased This Week (Week {gameSettings.current_week})
              </h3>
              <span className="text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded-full">
                {toolsPurchasedThisWeek.length} tool(s)
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              These tools will be available starting Week {gameSettings.current_week + 1}
            </p>
            
            <div className="grid grid-cols-1 gap-3">
              {toolsPurchasedThisWeek.map((purchasedTool, idx) => {
                const toolInfo = ANALYTICS_TOOLS.find(t => t.fullName === purchasedTool.tool_type)
                
                return (
                  <div
                    key={idx}
                    className="border-2 border-blue-200 rounded-lg p-4 bg-linear-to-br from-blue-50 to-indigo-50 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold px-2 py-1 bg-purple-100 text-purple-700 rounded">
                            {toolInfo?.category || 'Unknown'}
                          </span>
                          <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded">
                            {toolInfo?.operation || 'Tool'}
                          </span>
                          <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded">
                            {toolInfo?.chart || 'Chart'}
                          </span>
                          <span className="text-xs font-semibold px-2 py-1 bg-orange-500 text-white rounded">
                            Available Week {gameSettings.current_week + 1}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-gray-800 mb-1">
                          {toolInfo ? `${toolInfo.operation} of ${toolInfo.metrics.join(' and ')}` : purchasedTool.tool_type}
                        </div>
                        <div className="text-xs text-gray-600">
                          by {toolInfo?.breakdown || 'N/A'}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-sm font-semibold text-[#E63946]">
                          ฿{purchasedTool.cost.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Purchased Week {purchasedTool.week_number}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Week History (Optional - for viewing past purchases) */}
        {availableWeeks.length > 1 && (
          <div className="pt-6 border-t border-gray-200">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">View Purchase History by Week:</label>
              <div className="flex flex-wrap gap-2">
                {availableWeeks.map((week) => (
                  <button
                    key={week}
                    type="button"
                    onClick={() => setSelectedWeek(week)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                      displayWeek === week
                        ? 'bg-[#E63946] text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Week {week}
                  </button>
                ))}
              </div>
            </div>
            
            {selectedWeek && selectedWeek !== gameSettings.current_week && (
              <div className="mt-4">
                <div className="text-sm text-gray-600 mb-4">
                  <span className="font-semibold">Week {displayWeek}:</span> {toolsByWeek[displayWeek]?.length || 0} tool(s) purchased
                </div>
                {toolsByWeek[displayWeek] && toolsByWeek[displayWeek].length > 0 && (
                  <div className="grid grid-cols-1 gap-3">
                    {toolsByWeek[displayWeek].map((purchasedTool, idx) => {
                      const toolInfo = ANALYTICS_TOOLS.find(t => t.fullName === purchasedTool.tool_type)
                      
                      return (
                        <div
                          key={idx}
                          className="border-2 border-gray-200 rounded-lg p-4 bg-linear-to-br from-gray-50 to-slate-50"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-semibold px-2 py-1 bg-purple-100 text-purple-700 rounded">
                                  {toolInfo?.category || 'Unknown'}
                                </span>
                                <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                  {toolInfo?.operation || 'Tool'}
                                </span>
                              </div>
                              <div className="text-sm font-semibold text-gray-800 mb-1">
                                {toolInfo ? `${toolInfo.operation} of ${toolInfo.metrics.join(' and ')}` : purchasedTool.tool_type}
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <div className="text-xs text-gray-500">
                                Week {purchasedTool.week_number}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Visualization Modal */}
      {selectedTool && (
        <AnalyticsVisualization
          tool={selectedTool}
          gameId={team.game_id}
          onClose={() => setSelectedTool(null)}
        />
      )}
    </section>
  )
}

