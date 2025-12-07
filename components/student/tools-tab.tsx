'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useGame } from '@/lib/game-context'

const analyticsTools = [
  { id: 1, name: 'Basic Analytics', price: 2000, features: ['Sales Reports', 'Customer Count'] },
  { id: 2, name: 'Advanced Analytics', price: 5000, features: ['Sales Reports', 'Cohort Analysis', 'Churn Rate'] },
  { id: 3, name: 'Premium Suite', price: 10000, features: ['All Basic Features', 'Predictive Analytics', 'AI Recommendations'] },
]

interface ToolsTabProps {
  teamId?: string
  budget: number
}

export default function ToolsTab({ teamId, budget }: ToolsTabProps) {
  const { gameState, updateTeamDecisions } = useGame()
  const team = teamId ? gameState.teams.find(t => t.team_id === teamId) : null
  const [purchasedTools, setPurchasedTools] = useState<number[]>(team?.purchasedTools || [])

  useEffect(() => {
    setPurchasedTools(team?.purchasedTools || [])
  }, [team])

  const handlePurchase = (toolId: number, price: number) => {
    if (budget >= price && !purchasedTools.includes(toolId) && team) {
      const newTools = [...purchasedTools, toolId]
      setPurchasedTools(newTools)
      updateTeamDecisions(team.team_id, { purchasedTools: newTools })
    }
  }

  if (!team) {
    return (
      <Card className="card-base">
        <p className="text-gray-600">Select a team to view available tools.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="card-base">
        <h2 className="text-xl font-serif font-bold text-gray-900 mb-6">
          Available Tools
        </h2>
        <div className="grid grid-cols-1 gap-4">
          {analyticsTools.map((tool) => {
            const isPurchased = purchasedTools.includes(tool.id)
            const canAfford = budget >= tool.price

            return (
              <div
                key={tool.id}
                className={`border-2 rounded-lg p-4 ${
                  isPurchased
                    ? 'border-primary bg-red-50'
                    : !canAfford
                    ? 'border-gray-200 bg-gray-50 opacity-60'
                    : 'border-border hover:border-primary'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-2">{tool.name}</p>
                    <ul className="space-y-1 mb-3">
                      {tool.features.map((feature, idx) => (
                        <li key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                          <span className="text-primary">✓</span> {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="text-right ml-6">
                    <p className="text-2xl font-bold text-primary mb-3">฿{tool.price.toLocaleString()}</p>
                    <Button
                      onClick={() => handlePurchase(tool.id, tool.price)}
                      disabled={!canAfford || isPurchased}
                      className={`${isPurchased ? 'btn-secondary' : 'btn-primary'}`}
                    >
                      {isPurchased ? 'Purchased' : canAfford ? 'Purchase' : 'Not Affordable'}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card className="card-base">
        <h2 className="text-xl font-serif font-bold text-gray-900 mb-6">
          Purchased Tools
        </h2>
        {purchasedTools.length === 0 ? (
          <p className="text-gray-600">No tools purchased yet. Choose from the options above.</p>
        ) : (
          <ul className="space-y-2">
            {purchasedTools.map((toolId) => {
              const tool = analyticsTools.find((t) => t.id === toolId)
              return (
                <li key={toolId} className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                  <span className="text-green-600">✓</span>
                  <span className="font-medium text-gray-900">{tool?.name}</span>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
