'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface GameSettings {
  id: string
  game_id: string
  total_weeks: number
  week_duration_minutes: number
  max_teams: number
  game_status: string
  current_week: number
  population_size?: number
  initial_capital?: number
  analytics_cost?: number
  base_operating_cost?: number
  investment_config?: InvestmentConfig
  rnd_tier_config?: RndTierConfig
  product_probability_weights?: ProductProbabilityWeights
}

interface InvestmentStage {
  mean: number
  sd: number
  sd_percent: number
  main_ratio: number
  bonus_ratio: number
  bonus_multiplier: number
  // Advancement requirements (admin-configurable)
  expected_revenue?: number  // Revenue threshold to advance to this stage
  demand?: number            // Demand threshold to advance to this stage
  rd_count?: number          // R&D test count threshold to advance to this stage
}

interface InvestmentConfig {
  seed: InvestmentStage
  series_a: InvestmentStage
  series_b: InvestmentStage
  series_c: InvestmentStage
}

interface RndTier {
  min_cost: number
  max_cost: number
  success_min: number
  success_max: number
  multiplier_min: number
  multiplier_max: number
}

interface RndTierConfig {
  basic: RndTier
  standard: RndTier
  advanced: RndTier
  premium: RndTier
}

interface ProductProbabilityWeight {
  health_consciousness: number
  sustainability_preference: number
  brand_loyalty: number
  experimental_food: number
  income_sensitivity: number
  price_sensitivity: number
  total_weight_target?: number
}

interface ProductProbabilityWeights {
  [productId: string]: ProductProbabilityWeight
}

interface Product {
  id: string
  product_id: string
  name: string
}

interface GameConfigurationProps {
  gameId: string
  onSettingsUpdated?: () => void
  onSwitchToTeams?: () => void
}

export default function GameConfiguration({ gameId, onSettingsUpdated, onSwitchToTeams }: GameConfigurationProps) {
  const supabase = createClient()
  const [settings, setSettings] = useState<GameSettings | null>(null)
  const [weeks, setWeeks] = useState<number>(10)
  const [weekDuration, setWeekDuration] = useState<number>(5)
  const [maxTeams, setMaxTeams] = useState<number>(10)
  const [populationSize, setPopulationSize] = useState<number>(10000)
  const [initialCapital, setInitialCapital] = useState<number>(500000)
  const [analyticsCost, setAnalyticsCost] = useState<number>(5000)
  const [investmentConfig, setInvestmentConfig] = useState<InvestmentConfig>({
    seed: { mean: 0, sd: 0, sd_percent: 0, main_ratio: 0, bonus_ratio: 0, bonus_multiplier: 0, expected_revenue: 0, demand: 0, rd_count: 0 },
    series_a: { mean: 0, sd: 0, sd_percent: 0, main_ratio: 0, bonus_ratio: 0, bonus_multiplier: 0, expected_revenue: 0, demand: 0, rd_count: 0 },
    series_b: { mean: 0, sd: 0, sd_percent: 0, main_ratio: 0, bonus_ratio: 0, bonus_multiplier: 0, expected_revenue: 0, demand: 0, rd_count: 0 },
    series_c: { mean: 0, sd: 0, sd_percent: 0, main_ratio: 0, bonus_ratio: 0, bonus_multiplier: 0, expected_revenue: 0, demand: 0, rd_count: 0 },
  })
  const [rndTierConfig, setRndTierConfig] = useState<RndTierConfig>({
    basic: { min_cost: 0, max_cost: 0, success_min: 0, success_max: 0, multiplier_min: 0, multiplier_max: 0 },
    standard: { min_cost: 0, max_cost: 0, success_min: 0, success_max: 0, multiplier_min: 0, multiplier_max: 0 },
    advanced: { min_cost: 0, max_cost: 0, success_min: 0, success_max: 0, multiplier_min: 0, multiplier_max: 0 },
    premium: { min_cost: 0, max_cost: 0, success_min: 0, success_max: 0, multiplier_min: 0, multiplier_max: 0 },
  })
  const [loading, setLoading] = useState(true)
  const [gameActive, setGameActive] = useState(false)
  const [showGameBasics, setShowGameBasics] = useState(true)
  const [showGameEconomy, setShowGameEconomy] = useState(false)
  const [showInvestmentConfig, setShowInvestmentConfig] = useState(false)
  const [showInvestmentRequirements, setShowInvestmentRequirements] = useState(false)
  const [showRndTierConfig, setShowRndTierConfig] = useState(false)
  const [showProbabilityWeights, setShowProbabilityWeights] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [probabilityWeights, setProbabilityWeights] = useState<ProductProbabilityWeights>({})

  // Load products from database
  useEffect(() => {
    const loadProducts = async () => {
      console.log('Loading products from database...')
      
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, product_id, name')
        .order('name')
      
      console.log('Products query result:', { productsData, productsError })
      
      if (productsError) {
        console.error('Error loading products:', productsError)
      } else if (productsData) {
        setProducts(productsData)
        console.log('Loaded products:', productsData)
      }
    }
    
    loadProducts()
  }, [supabase])

  useEffect(() => {
    const loadSettings = async () => {
      console.log('Loading settings for gameId:', gameId)
      
      try {
        const { data, error } = await supabase
          .from('game_settings')
          .select('*')
          .eq('game_id', gameId)
          .single()

        console.log('Load settings result:', { data, error })

        if (data) {
          setSettings(data)
          setWeeks(data.total_weeks)
          setWeekDuration(data.week_duration_minutes)
          setMaxTeams(data.max_teams)
          setGameActive(data.game_status === 'active')
          
          // Load game economy config
          if (data.population_size) setPopulationSize(data.population_size)
          if (data.initial_capital) setInitialCapital(data.initial_capital)
          if (data.analytics_cost) setAnalyticsCost(data.analytics_cost)
          
          // Load investment config if exists, otherwise initialize with empty structure for admin to fill
          if (data.investment_config) {
            setInvestmentConfig(data.investment_config as InvestmentConfig)
          } else {
            // Initialize empty structure - admin must fill in values
            setInvestmentConfig({
              seed: { mean: 0, sd: 0, sd_percent: 0, main_ratio: 0, bonus_ratio: 0, bonus_multiplier: 0, expected_revenue: 0, demand: 0, rd_count: 0 },
              series_a: { mean: 0, sd: 0, sd_percent: 0, main_ratio: 0, bonus_ratio: 0, bonus_multiplier: 0, expected_revenue: 0, demand: 0, rd_count: 0 },
              series_b: { mean: 0, sd: 0, sd_percent: 0, main_ratio: 0, bonus_ratio: 0, bonus_multiplier: 0, expected_revenue: 0, demand: 0, rd_count: 0 },
              series_c: { mean: 0, sd: 0, sd_percent: 0, main_ratio: 0, bonus_ratio: 0, bonus_multiplier: 0, expected_revenue: 0, demand: 0, rd_count: 0 },
            })
          }
          
          // Load R&D tier config if exists, otherwise initialize with empty structure for admin to fill
          if (data.rnd_tier_config) {
            setRndTierConfig(data.rnd_tier_config as RndTierConfig)
          } else {
            // Initialize empty structure - admin must fill in values
            setRndTierConfig({
              basic: { min_cost: 0, max_cost: 0, success_min: 0, success_max: 0, multiplier_min: 0, multiplier_max: 0 },
              standard: { min_cost: 0, max_cost: 0, success_min: 0, success_max: 0, multiplier_min: 0, multiplier_max: 0 },
              advanced: { min_cost: 0, max_cost: 0, success_min: 0, success_max: 0, multiplier_min: 0, multiplier_max: 0 },
              premium: { min_cost: 0, max_cost: 0, success_min: 0, success_max: 0, multiplier_min: 0, multiplier_max: 0 },
            })
          }
          
          // Load product probability weights if exists
          if (data.product_probability_weights) {
            setProbabilityWeights(data.product_probability_weights as ProductProbabilityWeights)
          } else {
            // Initialize default weights for all products
            initializeDefaultWeights()
          }
        } else if (error && error.code === 'PGRST116') {
          // No record found - create one
          console.log('No settings found, creating new record...')
          const { data: newSettings, error: insertError } = await supabase
            .from('game_settings')
            .insert({
              game_id: gameId,
              total_weeks: 10,
              week_duration_minutes: 5,
              max_teams: 10,
              game_status: 'setup',
              current_week: 0,
            })
            .select()
            .single()

          console.log('Create settings result:', { newSettings, insertError })

          if (newSettings) {
            setSettings(newSettings)
            setWeeks(newSettings.total_weeks)
            setWeekDuration(newSettings.week_duration_minutes)
            setMaxTeams(newSettings.max_teams)
          } else {
            console.error('Error creating game settings:', insertError)
            alert('Error creating game settings: ' + insertError?.message)
          }
        } else if (error) {
          console.error('Error loading settings:', error)
          // Don't show alert immediately - the component will retry
          console.warn('Failed to load settings, will retry on next render')
        }
      } catch (err: any) {
        console.error('Exception loading settings:', err)
        // Check if it's a network error
        if (err.message?.includes('fetch')) {
          console.error('Network error - dev server may have restarted')
        }
      }
      
      setLoading(false)
    }

    loadSettings()
  }, [gameId, supabase])

  // Helper function to initialize default weights for products
  const initializeDefaultWeights = () => {
    if (products.length > 0) {
      const defaultWeights: ProductProbabilityWeights = {}
      products.forEach(product => {
        defaultWeights[product.id] = {
          health_consciousness: 0.25,
          sustainability_preference: 0.25,
          brand_loyalty: 0.25,
          experimental_food: 0.25,
          income_sensitivity: 0.10,
          price_sensitivity: 1.0,
          total_weight_target: 1.0
        }
      })
      setProbabilityWeights(defaultWeights)
      console.log('Initialized default weights for', products.length, 'products')
    }
  }

  // Initialize default weights when products are loaded
  useEffect(() => {
    if (products.length > 0 && Object.keys(probabilityWeights).length === 0) {
      initializeDefaultWeights()
    }
  }, [products])

  const handleUpdateSettings = async () => {
    if (!settings) {
      alert('Error: No settings loaded')
      return
    }

    // Validate max teams
    if (maxTeams < 1 || maxTeams > 10) {
      alert('Error: Number of teams must be between 1 and 10')
      return
    }

    console.log('Saving settings:', { weeks, weekDuration, maxTeams, populationSize, initialCapital, analyticsCost, gameId })

    const { data, error } = await supabase
      .from('game_settings')
      .update({
        total_weeks: weeks,
        week_duration_minutes: weekDuration,
        max_teams: maxTeams,
        population_size: populationSize,
        initial_capital: initialCapital,
        analytics_cost: analyticsCost,
        investment_config: investmentConfig,
        rnd_tier_config: rndTierConfig,
        product_probability_weights: probabilityWeights,
      })
      .eq('game_id', gameId)
      .select()

    console.log('Save result:', { data, error })

    if (!error) {
      // Update local settings state
      setSettings({
        ...settings,
        total_weeks: weeks,
        week_duration_minutes: weekDuration,
        max_teams: maxTeams,
        population_size: populationSize,
        initial_capital: initialCapital,
        analytics_cost: analyticsCost,
        investment_config: investmentConfig,
        rnd_tier_config: rndTierConfig,
        product_probability_weights: probabilityWeights,
      })

      // Trigger teams management refresh
      if (onSettingsUpdated) {
        onSettingsUpdated()
      }
      
      alert('✅ All settings saved successfully!\n\n' +
        'Saved configurations:\n' +
        `• Game Basics (Weeks: ${weeks}, Duration: ${weekDuration}min, Teams: ${maxTeams})\n` +
        `• Game Economy (Population: ${populationSize.toLocaleString()}, Capital: ฿${initialCapital.toLocaleString()}, Analytics: ฿${analyticsCost.toLocaleString()})\n` +
        '• Investment Configuration\n' +
        '• R&D Tier Configuration\n' +
        '• Product Probability Weights'
      )
    } else {
      alert('Error updating settings: ' + error.message)
    }
  }

  const handleStartGame = async () => {
    const { error } = await supabase
      .from('game_settings')
      .update({
        game_status: 'active',
        current_week: 1,
      })
      .eq('game_id', gameId)

    if (!error) {
      setGameActive(true)
      alert('Game started')
    }
  }

  const handleStopGame = async () => {
    const { error } = await supabase
      .from('game_settings')
      .update({ game_status: 'paused' })
      .eq('game_id', gameId)

    if (!error) {
      setGameActive(false)
      alert('Game paused')
    }
  }

  const handleResetGame = async () => {
    if (!confirm('Are you sure you want to reset the game? This will clear all team progress.')) {
      return
    }

    // Delete all weekly results and teams for this game
    await supabase.from('weekly_results').delete().eq('game_id', gameId)
    await supabase.from('teams').delete().eq('game_id', gameId)

    // Reset game settings
    await supabase
      .from('game_settings')
      .update({
        game_status: 'setup',
        current_week: 0,
      })
      .eq('game_id', gameId)

    setGameActive(false)
    alert('Game reset successfully')
  }

  if (loading) {
    return <div className="p-4">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-2xl font-serif font-bold mb-6">Game Settings</h2>

        {/* Game Basics Configuration - Collapsible */}
        <div className="mb-8 border-2 border-gray-300 rounded-lg overflow-hidden">
          <div 
            className="flex items-center justify-between cursor-pointer hover:bg-gray-100 bg-gray-50 p-4 border-b border-gray-300 transition-colors"
            onClick={() => setShowGameBasics(!showGameBasics)}
          >
            <h3 className="text-xl font-semibold">Game Basics Configuration</h3>
            <span className="text-2xl">{showGameBasics ? '▼' : '▶'}</span>
          </div>
          
          {showGameBasics && (
            <div className="p-4">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Number of Weeks</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={weeks}
                    onChange={(e) => {
                      const val = parseInt(e.target.value)
                      setWeeks(isNaN(val) ? 10 : val)
                    }}
                    disabled={gameActive}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Default: 10 weeks</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Week Duration (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={weekDuration}
                    onChange={(e) => {
                      const val = parseInt(e.target.value)
                      setWeekDuration(isNaN(val) ? 5 : val)
                    }}
                    disabled={gameActive}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Default: 5 minutes</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Max Teams</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={maxTeams}
                    onChange={(e) => {
                      const val = parseInt(e.target.value)
                      setMaxTeams(isNaN(val) ? 10 : val)
                    }}
                    disabled={gameActive}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Default: 10 teams</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Game Economy Configuration - Collapsible */}
        <div className="mb-8 border-2 border-gray-300 rounded-lg overflow-hidden">
          <div 
            className="flex items-center justify-between cursor-pointer hover:bg-gray-100 bg-gray-50 p-4 border-b border-gray-300 transition-colors"
            onClick={() => setShowGameEconomy(!showGameEconomy)}
          >
            <h3 className="text-xl font-semibold">Game Economy Configuration</h3>
            <span className="text-2xl">{showGameEconomy ? '▼' : '▶'}</span>
          </div>
          
          {showGameEconomy && (
            <div className="p-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Population Size</label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={populationSize}
                    onChange={(e) => {
                      const val = parseInt(e.target.value)
                      setPopulationSize(isNaN(val) ? 10000 : val)
                    }}
                    disabled={gameActive}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Total population for demand calculation</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Initial Capital</label>
                  <input
                    type="number"
                    min="10000"
                    step="1000"
                    value={initialCapital}
                    onChange={(e) => {
                      const val = parseInt(e.target.value)
                      setInitialCapital(isNaN(val) ? 500000 : val)
                    }}
                    disabled={gameActive}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Starting budget for each team</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Cost per Analytics Tool Unit</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={analyticsCost}
                    onChange={(e) => {
                      const val = parseInt(e.target.value)
                      setAnalyticsCost(isNaN(val) ? 5000 : val)
                    }}
                    disabled={gameActive}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Amount charged per analytics tool purchased by teams</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Investment Amount Configuration - Collapsible */}
        <div className="mb-8 border-2 border-gray-300 rounded-lg overflow-hidden">
          <div 
            className="flex items-center justify-between cursor-pointer hover:bg-gray-100 bg-gray-50 p-4 border-b border-gray-300 transition-colors"
            onClick={() => setShowInvestmentConfig(!showInvestmentConfig)}
          >
            <h3 className="text-xl font-semibold">Investment Amount Configuration</h3>
            <span className="text-2xl">{showInvestmentConfig ? '▼' : '▶'}</span>
          </div>
          
          {showInvestmentConfig && (
            <div className="p-4">
              <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">Funding Stage</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Mean</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">SD</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">SD%</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Main Ratio %</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Bonus Ratio %</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Bonus Multiplier %</th>
                </tr>
              </thead>
              <tbody>
                {(['seed', 'series_a', 'series_b', 'series_c'] as const).map((stage) => (
                  <tr key={stage}>
                    <td className="border border-gray-300 px-4 py-2 font-medium capitalize">
                      {stage.replace('_', ' ')}
                    </td>
                    <td className="border border-gray-300 px-2 py-2">
                      <input
                        type="number"
                        value={investmentConfig[stage].mean}
                        onChange={(e) => setInvestmentConfig({
                          ...investmentConfig,
                          [stage]: { ...investmentConfig[stage], mean: Number(e.target.value) }
                        })}
                        disabled={gameActive}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      />
                    </td>
                    <td className="border border-gray-300 px-2 py-2">
                      <input
                        type="number"
                        value={investmentConfig[stage].sd}
                        onChange={(e) => setInvestmentConfig({
                          ...investmentConfig,
                          [stage]: { ...investmentConfig[stage], sd: Number(e.target.value) }
                        })}
                        disabled={gameActive}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      />
                    </td>
                    <td className="border border-gray-300 px-2 py-2">
                      <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                        <input
                          type="number"
                          step="0.01"
                          value={investmentConfig[stage].sd_percent}
                          onChange={(e) => setInvestmentConfig({
                            ...investmentConfig,
                            [stage]: { ...investmentConfig[stage], sd_percent: Number(e.target.value) }
                          })}
                          disabled={gameActive}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                          style={{ paddingRight: '24px' }}
                        />
                        <span style={{ position: 'absolute', right: '8px', pointerEvents: 'none' }}>%</span>
                      </div>
                    </td>
                    <td className="border border-gray-300 px-2 py-2">
                      <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                        <input
                          type="number"
                          step="0.01"
                          value={investmentConfig[stage].main_ratio}
                          onChange={(e) => setInvestmentConfig({
                            ...investmentConfig,
                            [stage]: { ...investmentConfig[stage], main_ratio: Number(e.target.value) }
                          })}
                          disabled={gameActive}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                          style={{ paddingRight: '24px' }}
                        />
                        <span style={{ position: 'absolute', right: '8px', pointerEvents: 'none' }}>%</span>
                      </div>
                    </td>
                    <td className="border border-gray-300 px-2 py-2">
                      <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                        <input
                          type="number"
                          step="0.01"
                          value={investmentConfig[stage].bonus_ratio}
                          onChange={(e) => setInvestmentConfig({
                            ...investmentConfig,
                            [stage]: { ...investmentConfig[stage], bonus_ratio: Number(e.target.value) }
                          })}
                          disabled={gameActive}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                          style={{ paddingRight: '24px' }}
                        />
                        <span style={{ position: 'absolute', right: '8px', pointerEvents: 'none' }}>%</span>
                      </div>
                    </td>
                    <td className="border border-gray-300 px-2 py-2">
                      <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                        <input
                          type="number"
                          step="0.1"
                          value={investmentConfig[stage].bonus_multiplier}
                          onChange={(e) => setInvestmentConfig({
                            ...investmentConfig,
                            [stage]: { ...investmentConfig[stage], bonus_multiplier: Number(e.target.value) }
                          })}
                          disabled={gameActive}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                          style={{ paddingRight: '24px' }}
                        />
                        <span style={{ position: 'absolute', right: '8px', pointerEvents: 'none' }}>%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Configure investment amounts and ratios for each funding stage. Changes are saved with "Save Settings" button.
            </p>
            </div>
          )}
        </div>

        {/* Investment Requirements (Advancement Requirements) - Collapsible */}
        <div className="mb-8 border-2 border-gray-300 rounded-lg overflow-hidden">
          <div 
            className="flex items-center justify-between cursor-pointer hover:bg-gray-100 bg-gray-50 p-4 border-b border-gray-300 transition-colors"
            onClick={() => setShowInvestmentRequirements(!showInvestmentRequirements)}
          >
            <h3 className="text-xl font-semibold">Investment Requirements (Advancement Requirements)</h3>
            <span className="text-2xl">{showInvestmentRequirements ? '▼' : '▶'}</span>
          </div>
          
          {showInvestmentRequirements && (
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-4">
                Set the requirements teams must meet to advance to each funding stage. Teams must meet ALL three requirements (Expected Revenue, Demand, and R&D Count) to advance.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-2 text-left">Stage</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Expected Revenue (฿)</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Demand (units)</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">R&D Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(['seed', 'series_a', 'series_b', 'series_c'] as const).map((stage) => (
                      <tr key={stage}>
                        <td className="border border-gray-300 px-4 py-2 font-medium capitalize">
                          {stage === 'seed' ? 'Seed' : stage === 'series_a' ? 'Series A' : stage === 'series_b' ? 'Series B' : 'Series C'}
                        </td>
                        <td className="border border-gray-300 px-2 py-2">
                          <input
                            type="number"
                            step="1000"
                            value={investmentConfig[stage].expected_revenue || 0}
                            onChange={(e) => setInvestmentConfig({
                              ...investmentConfig,
                              [stage]: { ...investmentConfig[stage], expected_revenue: Number(e.target.value) }
                            })}
                            disabled={gameActive}
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-2">
                          <input
                            type="number"
                            step="10"
                            value={investmentConfig[stage].demand || 0}
                            onChange={(e) => setInvestmentConfig({
                              ...investmentConfig,
                              [stage]: { ...investmentConfig[stage], demand: Number(e.target.value) }
                            })}
                            disabled={gameActive}
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-2">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={investmentConfig[stage].rd_count || 0}
                            onChange={(e) => setInvestmentConfig({
                              ...investmentConfig,
                              [stage]: { ...investmentConfig[stage], rd_count: Number(e.target.value) }
                            })}
                            disabled={gameActive}
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                These requirements determine when teams advance to the next funding stage. Changes are saved with "Save Settings" button.
              </p>
            </div>
          )}
        </div>

        {/* R&D Tier Configuration - Collapsible */}
        <div className="mb-8 border-2 border-gray-300 rounded-lg overflow-hidden">
          <div 
            className="flex items-center justify-between cursor-pointer hover:bg-gray-100 bg-gray-50 p-4 border-b border-gray-300 transition-colors"
            onClick={() => setShowRndTierConfig(!showRndTierConfig)}
          >
            <h3 className="text-xl font-semibold">R&D Tier Configuration</h3>
            <span className="text-2xl">{showRndTierConfig ? '▼' : '▶'}</span>
          </div>
          
          {showRndTierConfig && (
            <div className="p-4">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-2 text-left">Tier</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Min Cost</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Max Cost</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Success Min %</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Success Max %</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Multiplier Min %</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Multiplier Max %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(['basic', 'standard', 'advanced', 'premium'] as const).map((tier) => (
                      <tr key={tier}>
                        <td className="border border-gray-300 px-4 py-2 font-medium capitalize">
                          {tier}
                        </td>
                        <td className="border border-gray-300 px-2 py-2">
                          <input
                            type="number"
                            value={rndTierConfig[tier].min_cost}
                            onChange={(e) => setRndTierConfig({
                              ...rndTierConfig,
                              [tier]: { ...rndTierConfig[tier], min_cost: Number(e.target.value) }
                            })}
                            disabled={gameActive}
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-2">
                          <input
                            type="number"
                            value={rndTierConfig[tier].max_cost}
                            onChange={(e) => setRndTierConfig({
                              ...rndTierConfig,
                              [tier]: { ...rndTierConfig[tier], max_cost: Number(e.target.value) }
                            })}
                            disabled={gameActive}
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-2">
                          <input
                            type="number"
                            value={rndTierConfig[tier].success_min}
                            onChange={(e) => setRndTierConfig({
                              ...rndTierConfig,
                              [tier]: { ...rndTierConfig[tier], success_min: Number(e.target.value) }
                            })}
                            disabled={gameActive}
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-2">
                          <input
                            type="number"
                            value={rndTierConfig[tier].success_max}
                            onChange={(e) => setRndTierConfig({
                              ...rndTierConfig,
                              [tier]: { ...rndTierConfig[tier], success_max: Number(e.target.value) }
                            })}
                            disabled={gameActive}
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-2">
                          <input
                            type="number"
                            value={rndTierConfig[tier].multiplier_min}
                            onChange={(e) => setRndTierConfig({
                              ...rndTierConfig,
                              [tier]: { ...rndTierConfig[tier], multiplier_min: Number(e.target.value) }
                            })}
                            disabled={gameActive}
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-2">
                          <input
                            type="number"
                            value={rndTierConfig[tier].multiplier_max}
                            onChange={(e) => setRndTierConfig({
                              ...rndTierConfig,
                              [tier]: { ...rndTierConfig[tier], multiplier_max: Number(e.target.value) }
                            })}
                            disabled={gameActive}
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Configure R&D test costs, success rates, and multipliers for each tier. Changes are saved with "Save Settings" button.
              </p>
            </div>
          )}
        </div>

        {/* Product Probability Configuration - Collapsible */}
        <div className="mb-8 border-2 border-gray-300 rounded-lg overflow-hidden">
          <div 
            className="flex items-center justify-between cursor-pointer hover:bg-gray-100 bg-gray-50 p-4 border-b border-gray-300 transition-colors"
            onClick={() => setShowProbabilityWeights(!showProbabilityWeights)}
          >
            <div>
              <h3 className="text-xl font-semibold">Product Probability Configuration</h3>
              <p className="text-xs text-gray-500 mt-1">Products loaded: {products.length}</p>
            </div>
            <span className="text-2xl">{showProbabilityWeights ? '▼' : '▶'}</span>
          </div>
          
          {showProbabilityWeights && (
            <div className="p-4">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-3 py-2 text-left">Product</th>
                      <th className="border border-gray-300 px-2 py-2 text-center">Health (H)</th>
                      <th className="border border-gray-300 px-2 py-2 text-center">Sustainability (S)</th>
                      <th className="border border-gray-300 px-2 py-2 text-center">Brand Loyalty (B)</th>
                      <th className="border border-gray-300 px-2 py-2 text-center">Experimental (E)</th>
                      <th className="border border-gray-300 px-2 py-2 text-center">Total Check</th>
                      <th className="border border-gray-300 px-2 py-2 text-center">Income</th>
                      <th className="border border-gray-300 px-2 py-2 text-center">Price (λ)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                          No products found in database. Please check your database connection and ensure products are seeded.
                        </td>
                      </tr>
                    ) : (
                      products.map((product) => {
                      const weights = probabilityWeights[product.id] || {
                        health_consciousness: 0.25,
                        sustainability_preference: 0.25,
                        brand_loyalty: 0.25,
                        experimental_food: 0.25,
                        income_sensitivity: 0.10,
                        price_sensitivity: 1.0,
                        total_weight_target: 1.0
                      }
                      
                      const totalWeight = weights.health_consciousness + weights.sustainability_preference + 
                                         weights.brand_loyalty + weights.experimental_food
                      const targetWeight = weights.total_weight_target || 1.0
                      const isValidTotal = Math.abs(totalWeight - targetWeight) < 0.01
                      
                      return (
                        <tr key={product.id}>
                          <td className="border border-gray-300 px-3 py-2 font-medium">
                            {product.name}
                          </td>
                          <td className="border border-gray-300 px-1 py-1">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="1"
                              value={weights.health_consciousness}
                              onChange={(e) => setProbabilityWeights({
                                ...probabilityWeights,
                                [product.id]: { ...weights, health_consciousness: Number(e.target.value) }
                              })}
                              disabled={gameActive}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-center"
                            />
                          </td>
                          <td className="border border-gray-300 px-1 py-1">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="1"
                              value={weights.sustainability_preference}
                              onChange={(e) => setProbabilityWeights({
                                ...probabilityWeights,
                                [product.id]: { ...weights, sustainability_preference: Number(e.target.value) }
                              })}
                              disabled={gameActive}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-center"
                            />
                          </td>
                          <td className="border border-gray-300 px-1 py-1">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="1"
                              value={weights.brand_loyalty}
                              onChange={(e) => setProbabilityWeights({
                                ...probabilityWeights,
                                [product.id]: { ...weights, brand_loyalty: Number(e.target.value) }
                              })}
                              disabled={gameActive}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-center"
                            />
                          </td>
                          <td className="border border-gray-300 px-1 py-1">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="1"
                              value={weights.experimental_food}
                              onChange={(e) => setProbabilityWeights({
                                ...probabilityWeights,
                                [product.id]: { ...weights, experimental_food: Number(e.target.value) }
                              })}
                              disabled={gameActive}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-center"
                            />
                          </td>
                          <td className="border border-gray-300 px-1 py-1">
                            <div className="text-center text-sm font-semibold px-1 py-2 rounded bg-gray-100">
                              {totalWeight.toFixed(2)}
                            </div>
                          </td>
                          <td className="border border-gray-300 px-1 py-1">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="1"
                              value={weights.income_sensitivity}
                              onChange={(e) => setProbabilityWeights({
                                ...probabilityWeights,
                                [product.id]: { ...weights, income_sensitivity: Number(e.target.value) }
                              })}
                              disabled={gameActive}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-center"
                            />
                          </td>
                          <td className="border border-gray-300 px-1 py-1">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={weights.price_sensitivity}
                              onChange={(e) => setProbabilityWeights({
                                ...probabilityWeights,
                                [product.id]: { ...weights, price_sensitivity: Number(e.target.value) }
                              })}
                              disabled={gameActive}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-center"
                            />
                          </td>
                        </tr>
                      )
                    }))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                <strong>Note:</strong> The Total Check column shows the actual sum (top) and lets you set the target weight (bottom, default 1.0). Income and Price (λ) are separate factors.
                Configure how customer attributes affect purchase probability for each product.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mb-6">
          <button
            onClick={handleUpdateSettings}
            disabled={gameActive}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Settings
          </button>
          <button
            onClick={handleResetGame}
            className="px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            Reset Game
          </button>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-900">
            <strong>Setup Workflow:</strong>
          </p>
          <ol className="text-sm text-yellow-900 mt-2 ml-4 list-decimal space-y-1">
            <li>Set the <strong>Max Teams</strong> number (1-10) and save settings</li>
            <li>Go to the <strong>Teams tab</strong> to set up credentials for each team</li>
            <li>Students can then log in using their assigned username/password</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
