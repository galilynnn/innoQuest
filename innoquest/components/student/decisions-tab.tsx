'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useGame } from '@/lib/game-context'

const products = [
  { id: 1, name: 'SaaS Platform', margin: 0.65, demand: 0.8 },
  { id: 2, name: 'Mobile App', margin: 0.55, demand: 0.9 },
  { id: 3, name: 'B2B Solution', margin: 0.70, demand: 0.6 },
  { id: 4, name: 'API Service', margin: 0.75, demand: 0.7 },
  { id: 5, name: 'Marketplace', margin: 0.50, demand: 0.85 },
  { id: 6, name: 'Subscription Model', margin: 0.60, demand: 0.75 },
  { id: 7, name: 'Enterprise Software', margin: 0.72, demand: 0.65 },
  { id: 8, name: 'Freemium Product', margin: 0.45, demand: 0.95 },
  { id: 9, name: 'Consulting Platform', margin: 0.68, demand: 0.70 },
  { id: 10, name: 'Data Analytics Tool', margin: 0.70, demand: 0.75 },
]

const rdTiers = [
  { tier: 'Basic', cost: 5000, bonus: 0.05 },
  { tier: 'Standard', cost: 15000, bonus: 0.12 },
  { tier: 'Advanced', cost: 35000, bonus: 0.20 },
  { tier: 'Premium', cost: 60000, bonus: 0.30 },
]

interface DecisionsTabProps {
  teamId?: string
}

export default function DecisionsTab({ teamId }: DecisionsTabProps) {
  const { gameState, updateTeamDecisions, submitWeeklyDecisions } = useGame()
  
  const team = teamId && gameState.teams.find(t => t.team_id === teamId)
  const [selectedProduct, setSelectedProduct] = useState(team?.selectedProduct || 1)
  const [price, setPrice] = useState(team?.weeklyPrice || 99)
  const [selectedRdTier, setSelectedRdTier] = useState<number | null>(team?.rdTier ?? null)

  if (!team) {
    return (
      <Card className="card-base">
        <p className="text-gray-600">Select a team to view decisions.</p>
      </Card>
    )
  }

  const handleProductChange = (productId: number) => {
    setSelectedProduct(productId)
    updateTeamDecisions(team.team_id, { selectedProduct: productId })
  }

  const handlePriceUpdate = () => {
    updateTeamDecisions(team.team_id, { weeklyPrice: price })
  }

  const handleRdTierSelect = (tierIdx: number) => {
    setSelectedRdTier(tierIdx)
    updateTeamDecisions(team.team_id, { rdTier: tierIdx })
  }

  const handleSubmit = () => {
    submitWeeklyDecisions(team.team_id)
  }

  const selectedRdCost = selectedRdTier !== null ? rdTiers[selectedRdTier].cost : 0

  return (
    <div className="space-y-6">
      {/* Product Selection */}
      <Card className="card-base">
        <h2 className="text-xl font-serif font-bold text-gray-900 mb-6">
          Step 1: Select Your Product
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {products.map((product) => (
            <button
              key={product.id}
              onClick={() => handleProductChange(product.id)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedProduct === product.id
                  ? 'border-primary bg-red-50'
                  : 'border-border bg-white hover:border-gray-400'
              }`}
            >
              <p className="font-semibold text-gray-900">{product.name}</p>
              <div className="flex justify-between mt-2 text-sm">
                <span className="text-gray-600">Margin: {(product.margin * 100).toFixed(0)}%</span>
                <span className="text-gray-600">Demand: {(product.demand * 100).toFixed(0)}%</span>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Price Setting */}
      <Card className="card-base">
        <h2 className="text-xl font-serif font-bold text-gray-900 mb-6">
          Step 2: Set Your Price
        </h2>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="price" className="text-gray-700 font-medium">
                Weekly Price ($)
              </Label>
              <Input
                id="price"
                type="number"
                min="10"
                max="500"
                value={price}
                onChange={(e) => setPrice(parseInt(e.target.value))}
                className="border-border text-lg"
              />
            </div>
            <Button onClick={handlePriceUpdate} className="btn-primary w-full">
              Update Price
            </Button>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg space-y-3">
            <h3 className="font-semibold text-gray-900">Price Impact</h3>
            <div className="space-y-2 text-sm">
              <p className="text-gray-700">Current Price: <span className="font-bold">${price}</span></p>
              <p className="text-gray-700">Revenue: <span className="font-bold text-green-600">${(price * 2450).toLocaleString()}</span></p>
            </div>
          </div>
        </div>
      </Card>

      {/* R&D Investment */}
      <Card className="card-base">
        <h2 className="text-xl font-serif font-bold text-gray-900 mb-6">
          Step 3: R&D Investment
        </h2>
        <p className="text-gray-600 mb-6">Choose your R&D tier to improve product performance and test results.</p>
        <div className="grid grid-cols-4 gap-4 mb-6">
          {rdTiers.map((tier, idx) => (
            <button
              key={idx}
              onClick={() => handleRdTierSelect(idx)}
              disabled={tier.cost > team.budget}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedRdTier === idx
                  ? 'border-primary bg-red-50'
                  : tier.cost > team.budget
                  ? 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                  : 'border-border bg-white hover:border-gray-400'
              }`}
            >
              <p className="font-semibold text-gray-900">{tier.tier}</p>
              <p className="text-sm text-gray-600 mt-2">${tier.cost.toLocaleString()}</p>
              <p className="text-sm font-semibold text-primary mt-1">+{(tier.bonus * 100).toFixed(0)}% boost</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Investment Progression */}
      <Card className="card-base">
        <h2 className="text-xl font-serif font-bold text-gray-900 mb-6">
          Investment Progression
        </h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{team.fundingStage} Progress</span>
                <span className="text-sm font-semibold text-gray-900">${team.totalCash.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{ width: `${Math.min(100, (team.totalCash / 250000) * 100)}%` }}
                />
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-600">Current Funding Stage: <span className="font-semibold">{team.fundingStage}</span></p>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button onClick={handleSubmit} className="btn-primary flex-1">
          Submit Decisions for Week {team.currentWeek}
        </Button>
        <Button variant="outline" className="flex-1">
          Save Draft
        </Button>
      </div>
    </div>
  )
}
