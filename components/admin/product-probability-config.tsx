'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

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

interface EditingProduct {
  productId: string
  newName: string
}

interface ProductProbabilityConfigProps {
  gameId: string
  gameActive: boolean
}

export default function ProductProbabilityConfig({ gameId, gameActive }: ProductProbabilityConfigProps) {
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [probabilityWeights, setProbabilityWeights] = useState<ProductProbabilityWeights>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingProduct, setEditingProduct] = useState<EditingProduct | null>(null)
  const [savingProductName, setSavingProductName] = useState(false)

  useEffect(() => {
    loadProductsAndWeights()
  }, [gameId])

  const loadProductsAndWeights = async () => {
    try {
      setError(null)
      // Load products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, product_id, name')
        .order('name')
      
      console.log('Products query result:', { productsData, productsError })
      
      if (productsError) {
        setError(`Products error: ${productsError.message}`)
        setLoading(false)
        return
      }
      
      if (productsData) {
        setProducts(productsData)
      }

      // Load existing weights from game_settings
      const { data: settings } = await supabase
        .from('game_settings')
        .select('product_probability_weights')
        .eq('game_id', gameId)
        .single()

      if (settings?.product_probability_weights) {
        setProbabilityWeights(settings.product_probability_weights as ProductProbabilityWeights)
      } else if (productsData) {
        // Initialize default weights for all products
        const defaultWeights: ProductProbabilityWeights = {}
        productsData.forEach(product => {
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
      }

      setLoading(false)
    } catch (err) {
      console.error('Error loading products:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setLoading(false)
    }
  }

  const handleSave = async () => {
    const { error } = await supabase
      .from('game_settings')
      .update({ product_probability_weights: probabilityWeights })
      .eq('game_id', gameId)

    if (error) {
      alert('Error saving: ' + error.message)
    } else {
      alert('Product probability weights saved successfully!')
    }
  }

  const handleProductNameChange = async (productId: string, newName: string) => {
    if (!newName.trim()) {
      alert('Product name cannot be empty')
      return
    }

    setSavingProductName(true)
    try {
      const response = await fetch('/api/update-product', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, name: newName })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update product name')
      }

      // Update local state
      setProducts(products.map(p => 
        p.id === productId ? { ...p, name: newName } : p
      ))
      setEditingProduct(null)
      alert('Product name updated successfully')
    } catch (err) {
      console.error('Error updating product name:', err)
      alert(err instanceof Error ? err.message : 'Failed to update product name')
    } finally {
      setSavingProductName(false)
    }
  }

  if (loading) {
    return <div className="p-4">Loading...</div>
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-600">Error: {error}</p>
      </div>
    )
  }

  console.log('Rendering with products:', products)
  console.log('Probability weights:', probabilityWeights)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Product Probability Configuration</h3>
          <p className="text-sm text-muted-foreground">Configure how customer attributes affect purchase probability</p>
          <p className="text-xs text-gray-500 mt-1">Products loaded: {products.length}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={gameActive}
          className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save Weights
        </button>
      </div>

      <div className="overflow-x-auto border border-gray-300 rounded-lg">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Product</th>
              <th className="border border-gray-300 px-3 py-3 text-center font-semibold">Health (H)</th>
              <th className="border border-gray-300 px-3 py-3 text-center font-semibold">Sustainability (S)</th>
              <th className="border border-gray-300 px-3 py-3 text-center font-semibold">Brand Loyalty (B)</th>
              <th className="border border-gray-300 px-3 py-3 text-center font-semibold">Experimental (E)</th>
              <th className="border border-gray-300 px-3 py-3 text-center font-semibold">Total Check</th>
              <th className="border border-gray-300 px-3 py-3 text-center font-semibold">Income</th>
              <th className="border border-gray-300 px-3 py-3 text-center font-semibold">Price (λ)</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={8} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                  No products found. Check database connection.
                </td>
              </tr>
            )}
            {products.map((product) => {
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
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2 font-medium">
                    {editingProduct?.productId === product.id ? (
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={editingProduct.newName}
                          onChange={(e) => setEditingProduct({ ...editingProduct, newName: e.target.value })}
                          className="flex-1 px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
                          autoFocus
                          disabled={savingProductName}
                        />
                        <button
                          onClick={() => handleProductNameChange(product.id, editingProduct.newName)}
                          disabled={savingProductName}
                          className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 text-sm"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setEditingProduct(null)}
                          disabled={savingProductName}
                          className="px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-400 text-sm"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 items-center justify-between">
                        <span>{product.name}</span>
                        <button
                          onClick={() => setEditingProduct({ productId: product.id, newName: product.name })}
                          disabled={gameActive || savingProductName}
                          className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
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
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-center focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
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
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-center focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
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
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-center focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
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
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-center focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <div className="text-center text-sm font-semibold px-1 py-2 rounded bg-gray-100">
                      {totalWeight.toFixed(2)}
                    </div>
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
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
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-center focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
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
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-center focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
                    />
                  </td>
                </tr>
              )
            })}\n          </tbody>
        </table>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> The Total Check column shows the actual sum (top) and lets you set the target weight (bottom, default 1.0). 
          Income Sensitivity and Price Sensitivity (λ) are separate multiplier factors. These weights determine how customer attributes 
          affect their purchase probability for each product.
        </p>
      </div>
    </div>
  )
}
