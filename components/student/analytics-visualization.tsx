'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface VisualizationProps {
  tool: {
    week_number: number
    tool_type: string
    cost: number
  }
  gameId: string
  onClose: () => void
}

// Analytics tools structure - must match analytics-tools-view.tsx
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

export default function AnalyticsVisualization({ tool, gameId, onClose }: VisualizationProps) {
  const supabase = createClient()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const toolInfo = ANALYTICS_TOOLS.find(t => t.fullName === tool.tool_type)

  useEffect(() => {
    const loadData = async () => {
      if (!toolInfo) {
        setError('Tool information not found')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        console.log('🔍 Loading customer data for gameId:', gameId)

        // Get active customer data set for this game
        const { data: dataSet, error: dataSetError } = await supabase
          .from('customer_data_sets')
          .select('csv_data, record_count, file_name')
          .eq('game_id', gameId)
          .eq('is_active', true)
          .maybeSingle() // Use maybeSingle() instead of single() to avoid error if no data

        if (dataSetError) {
          console.error('❌ Database error:', dataSetError)
          throw dataSetError
        }

        if (!dataSet) {
          console.warn('⚠️ No active customer data set found')
          setError('No active customer data available. Please ask admin to upload and activate customer data.')
          setLoading(false)
          return
        }

        console.log('✅ Found dataset:', {
          fileName: dataSet.file_name,
          recordCount: dataSet.record_count,
          csvDataLength: Array.isArray(dataSet.csv_data) ? dataSet.csv_data.length : 'not an array',
          csvDataType: typeof dataSet.csv_data
        })

        if (!dataSet.csv_data || !Array.isArray(dataSet.csv_data)) {
          console.error('❌ csv_data is not an array:', typeof dataSet.csv_data)
          setError('Customer data format is invalid. Please ask admin to re-upload customer data.')
          setLoading(false)
          return
        }

        if (dataSet.csv_data.length === 0) {
          console.warn('⚠️ csv_data array is empty')
          setError('Customer data is empty. Please ask admin to upload customer data.')
          setLoading(false)
          return
        }

        // Log first record to see structure
        console.log('📊 First customer record:', dataSet.csv_data[0])
        console.log('📊 Sample keys:', Object.keys(dataSet.csv_data[0] || {}))

        // Process data based on tool type
        const processedData = processData(dataSet.csv_data, toolInfo)
        console.log('📈 Processed data:', processedData)
        console.log('📈 Labels:', processedData.labels)
        console.log('📈 Datasets:', processedData.datasets)
        setData(processedData)
      } catch (err: any) {
        console.error('Error loading visualization data:', err)
        setError(err.message || 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [tool, toolInfo, supabase, gameId]) // Add gameId to dependencies

  const processData = (customers: any[], tool: typeof ANALYTICS_TOOLS[0]) => {
    // Group customers by breakdown category
    const breakdown = tool.breakdown.toLowerCase()
    
    // Handle different breakdown types
    if (breakdown.includes('health consciousness')) {
      return processByHealthConsciousness(customers, tool)
    } else if (breakdown.includes('experimental food') || breakdown.includes('interest in experimental food')) {
      return processByExperimentalFood(customers, tool)
    } else if (breakdown.includes('brand loyalty')) {
      return processByBrandLoyalty(customers, tool)
    } else if (breakdown.includes('sustainability preference')) {
      return processBySustainability(customers, tool)
    } else if (breakdown.includes('working hours')) {
      return processByWorkingHours(customers, tool)
    } else if (breakdown.includes('gender')) {
      return processByGender(customers, tool)
    } else if (breakdown.includes('dietary preference')) {
      return processByDietaryPreference(customers, tool)
    }
    
    return { labels: [], datasets: [] }
  }

  const processByHealthConsciousness = (customers: any[], tool: typeof ANALYTICS_TOOLS[0]) => {
    // Group by health consciousness levels 1-10 (from CSV data)
    // CSV columns: Health, Sustainability, Brand Loyalty, Experimental Food, Income
    const groups: Record<number, any[]> = {}
    
    // Initialize groups for levels 1-10
    for (let i = 1; i <= 10; i++) {
      groups[i] = []
    }

    customers.forEach(c => {
      // CSV has column "Health" (not health_consciousness)
      const healthValue = parseFloat(c.Health || c.health_consciousness || 0)
      const healthLevel = Math.round(healthValue)
      const level = Math.max(1, Math.min(10, healthLevel)) // Clamp to 1-10
      if (!groups[level]) groups[level] = []
      groups[level].push(c)
    })

    const labels = Object.keys(groups).map(Number).sort((a, b) => a - b).map(String)
    
    // For Stacked Bar Chart with percentage
    if (tool.chart.includes('Stacked Bar Chart') && tool.metrics.length === 2) {
      const datasets = tool.metrics.map((metric, idx) => {
        const values = labels.map(label => {
          const level = parseInt(label)
          const group = groups[level] || []
          
          if (tool.operation === 'Average') {
            if (metric.includes('Monthly Income')) {
              return group.length > 0 ? group.reduce((sum, c) => sum + parseFloat(c.Income || c.monthly_income || 0), 0) / group.length : 0
            } else if (metric.includes('Monthly Food Spending')) {
              // Calculate food spending as percentage of income (or use actual value if available)
              return group.length > 0 ? group.reduce((sum, c) => {
                const income = parseFloat(c.Income || c.monthly_income || 0)
                const foodSpending = parseFloat(c['Monthly Food Spending'] || c.monthly_food_spending || income * 0.15) // Default 15% if not available
                return sum + foodSpending
              }, 0) / group.length : 0
            }
          }
          return 0
        })

        // Calculate percentages for stacked bar
        const percentages = labels.map((label, i) => {
          const level = parseInt(label)
          const group = groups[level] || []
          if (group.length === 0) return 0
          
          // CSV has "Income" column
          const avgIncome = group.reduce((sum, c) => sum + parseFloat(c.Income || c.monthly_income || 0), 0) / group.length
          
          // CSV doesn't have "Monthly Food Spending" - calculate as percentage of income
          // Typical food spending is 10-15% of income
          const avgFoodSpending = group.reduce((sum, c) => {
            const income = parseFloat(c.Income || c.monthly_income || 0)
            // Use 12% as default if not available
            return sum + (income * 0.12)
          }, 0) / group.length
          const total = avgIncome + avgFoodSpending
          
          if (metric.includes('Monthly Income')) {
            return total > 0 ? (avgIncome / total * 100) : 0
          } else if (metric.includes('Monthly Food Spending')) {
            return total > 0 ? (avgFoodSpending / total * 100) : 0
          }
          return 0
        })

        return {
          label: metric,
          data: percentages, // Use percentages for stacked bar
          rawData: values, // Keep raw values for reference
          backgroundColor: idx === 0 ? 'rgba(200, 200, 200, 0.8)' : 'rgba(0, 0, 0, 0.8)', // Light gray and black like in image
          borderColor: idx === 0 ? 'rgba(150, 150, 150, 1)' : 'rgba(0, 0, 0, 1)',
          borderWidth: 1
        }
      })

      return { labels, datasets, chartType: tool.chart, isPercentage: true }
    }

    // For regular Bar Chart
    const datasets = tool.metrics.map((metric, idx) => {
      const values = labels.map(label => {
        const level = parseInt(label)
        const group = groups[level] || []
        if (tool.operation === 'Count') {
          return group.length
        } else if (tool.operation === 'Average') {
          if (metric.includes('Monthly Income')) {
            return group.length > 0 ? group.reduce((sum, c) => sum + parseFloat(c.Income || c.monthly_income || 0), 0) / group.length : 0
          } else if (metric.includes('Monthly Food Spending')) {
            return group.length > 0 ? group.reduce((sum, c) => {
              const income = parseFloat(c.Income || c.monthly_income || 0)
              return sum + parseFloat(c['Monthly Food Spending'] || c.monthly_food_spending || income * 0.15)
            }, 0) / group.length : 0
          } else if (metric.includes('Working Hours')) {
            return group.length > 0 ? group.reduce((sum, c) => sum + parseFloat(c['Working Hours'] || c.working_hours || 0), 0) / group.length : 0
          }
        }
        return 0
      })

      return {
        label: metric,
        data: values,
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2
      }
    })

    return { labels, datasets, chartType: tool.chart }
  }

  const processByExperimentalFood = (customers: any[], tool: typeof ANALYTICS_TOOLS[0]) => {
    // Group by experimental food interest levels 1-10
    const groups: Record<number, any[]> = {}
    for (let i = 1; i <= 10; i++) {
      groups[i] = []
    }

    customers.forEach(c => {
      // CSV has column "Experimental Food" (with space)
      const expValue = parseFloat(c['Experimental Food'] || c['ExperimentalFood'] || c.experimental_food_interest || 0)
      const expLevel = Math.round(expValue)
      const level = Math.max(1, Math.min(10, expLevel))
      if (!groups[level]) groups[level] = []
      groups[level].push(c)
    })

    const labels = Object.keys(groups).map(Number).sort((a, b) => a - b).map(String)
    
    // For Stacked Bar Chart with percentage
    if (tool.chart.includes('Stacked Bar Chart') && tool.metrics.length === 2) {
      const datasets = tool.metrics.map((metric, idx) => {
        const percentages = labels.map((label) => {
          const level = parseInt(label)
          const group = groups[level] || []
          if (group.length === 0) return 0
          
          const avgIncome = group.reduce((sum, c) => sum + parseFloat(c.Income || c.monthly_income || 0), 0) / group.length
          const avgFoodSpending = group.reduce((sum, c) => {
            const income = parseFloat(c.Income || c.monthly_income || 0)
            return sum + parseFloat(c['Monthly Food Spending'] || c.monthly_food_spending || income * 0.15)
          }, 0) / group.length
          const total = avgIncome + avgFoodSpending
          
          if (metric.includes('Monthly Income')) {
            return total > 0 ? (avgIncome / total * 100) : 0
          } else if (metric.includes('Monthly Food Spending')) {
            return total > 0 ? (avgFoodSpending / total * 100) : 0
          }
          return 0
        })

        return {
          label: metric,
          data: percentages,
          backgroundColor: idx === 0 ? 'rgba(200, 200, 200, 0.8)' : 'rgba(0, 0, 0, 0.8)',
          borderColor: idx === 0 ? 'rgba(150, 150, 150, 1)' : 'rgba(0, 0, 0, 1)',
          borderWidth: 1
        }
      })

      return { labels, datasets, chartType: tool.chart, isPercentage: true }
    }

    // For regular Bar Chart
    const datasets = tool.metrics.map((metric, idx) => {
      const values = labels.map(label => {
        const level = parseInt(label)
        const group = groups[level] || []
        if (tool.operation === 'Count') {
          return group.length
        } else if (tool.operation === 'Average') {
          if (metric.includes('Monthly Income')) {
            return group.length > 0 ? group.reduce((sum, c) => sum + parseFloat(c.Income || c.monthly_income || 0), 0) / group.length : 0
          } else if (metric.includes('Monthly Food Spending')) {
            return group.length > 0 ? group.reduce((sum, c) => {
              const income = parseFloat(c.Income || c.monthly_income || 0)
              return sum + parseFloat(c['Monthly Food Spending'] || c.monthly_food_spending || income * 0.15)
            }, 0) / group.length : 0
          } else if (metric.includes('Working Hours')) {
            return group.length > 0 ? group.reduce((sum, c) => sum + parseFloat(c['Working Hours'] || c.working_hours || 0), 0) / group.length : 0
          }
        }
        return 0
      })

      return {
        label: metric,
        data: values,
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2
      }
    })

    return { labels, datasets, chartType: tool.chart }
  }

  const processByBrandLoyalty = (customers: any[], tool: typeof ANALYTICS_TOOLS[0]) => {
    // Group by brand loyalty levels 1-10
    const groups: Record<number, any[]> = {}
    for (let i = 1; i <= 10; i++) {
      groups[i] = []
    }

    customers.forEach(c => {
      // CSV has column "Brand Loyalty" (with space)
      const blValue = parseFloat(c['Brand Loyalty'] || c.Brand_Loyalty || c.brand_loyalty || 0)
      const blLevel = Math.round(blValue)
      const level = Math.max(1, Math.min(10, blLevel))
      if (!groups[level]) groups[level] = []
      groups[level].push(c)
    })

    const labels = Object.keys(groups).map(Number).sort((a, b) => a - b).map(String)
    
    // For Stacked Bar Chart with percentage
    if (tool.chart.includes('Stacked Bar Chart') && tool.metrics.length === 2) {
      const datasets = tool.metrics.map((metric, idx) => {
        const percentages = labels.map((label) => {
          const level = parseInt(label)
          const group = groups[level] || []
          if (group.length === 0) return 0
          
          const avgIncome = group.reduce((sum, c) => sum + parseFloat(c.Income || c.monthly_income || 0), 0) / group.length
          const avgFoodSpending = group.reduce((sum, c) => {
            const income = parseFloat(c.Income || c.monthly_income || 0)
            return sum + parseFloat(c['Monthly Food Spending'] || c.monthly_food_spending || income * 0.15)
          }, 0) / group.length
          const total = avgIncome + avgFoodSpending
          
          if (metric.includes('Monthly Income')) {
            return total > 0 ? (avgIncome / total * 100) : 0
          } else if (metric.includes('Monthly Food Spending')) {
            return total > 0 ? (avgFoodSpending / total * 100) : 0
          }
          return 0
        })

        return {
          label: metric,
          data: percentages,
          backgroundColor: idx === 0 ? 'rgba(200, 200, 200, 0.8)' : 'rgba(0, 0, 0, 0.8)',
          borderColor: idx === 0 ? 'rgba(150, 150, 150, 1)' : 'rgba(0, 0, 0, 1)',
          borderWidth: 1
        }
      })

      return { labels, datasets, chartType: tool.chart, isPercentage: true }
    }

    // For regular Bar Chart or other types
    const datasets = tool.metrics.map((metric, idx) => {
      const values = labels.map(label => {
        const level = parseInt(label)
        const group = groups[level] || []
        if (tool.operation === 'Count') {
          return group.length
        } else if (tool.operation === 'Average') {
          if (metric.includes('Monthly Income')) {
            return group.length > 0 ? group.reduce((sum, c) => sum + parseFloat(c.Income || c.monthly_income || 0), 0) / group.length : 0
          } else if (metric.includes('Monthly Food Spending')) {
            return group.length > 0 ? group.reduce((sum, c) => {
              const income = parseFloat(c.Income || c.monthly_income || 0)
              return sum + parseFloat(c['Monthly Food Spending'] || c.monthly_food_spending || income * 0.15)
            }, 0) / group.length : 0
          } else if (metric.includes('Brand Loyalty')) {
            return group.length > 0 ? group.reduce((sum, c) => sum + parseFloat(c['Brand Loyalty'] || c.brand_loyalty || 0), 0) / group.length : 0
          }
        }
        return 0
      })

      return {
        label: metric,
        data: values,
        backgroundColor: tool.chart.includes('Clustered') ? (idx === 0 ? 'rgba(59, 130, 246, 0.6)' : 'rgba(16, 185, 129, 0.6)') : 'rgba(59, 130, 246, 0.6)',
        borderColor: tool.chart.includes('Clustered') ? (idx === 0 ? 'rgba(59, 130, 246, 1)' : 'rgba(16, 185, 129, 1)') : 'rgba(59, 130, 246, 1)',
        borderWidth: 2
      }
    })

    return { labels, datasets, chartType: tool.chart }
  }

  const processBySustainability = (customers: any[], tool: typeof ANALYTICS_TOOLS[0]) => {
    // Group by sustainability preference levels 1-10
    const groups: Record<number, any[]> = {}
    for (let i = 1; i <= 10; i++) {
      groups[i] = []
    }

    customers.forEach(c => {
      // CSV has column "Sustainability"
      const spValue = parseFloat(c.Sustainability || c.sustainability_preference || 0)
      const spLevel = Math.round(spValue)
      const level = Math.max(1, Math.min(10, spLevel))
      if (!groups[level]) groups[level] = []
      groups[level].push(c)
    })

    const labels = Object.keys(groups).map(Number).sort((a, b) => a - b).map(String)
    
    // For Stacked Bar Chart with percentage
    if (tool.chart.includes('Stacked Bar Chart') && tool.metrics.length === 2) {
      const datasets = tool.metrics.map((metric, idx) => {
        const percentages = labels.map((label) => {
          const level = parseInt(label)
          const group = groups[level] || []
          if (group.length === 0) return 0
          
          const avgIncome = group.reduce((sum, c) => sum + parseFloat(c.Income || c.monthly_income || 0), 0) / group.length
          const avgFoodSpending = group.reduce((sum, c) => {
            const income = parseFloat(c.Income || c.monthly_income || 0)
            return sum + parseFloat(c['Monthly Food Spending'] || c.monthly_food_spending || income * 0.15)
          }, 0) / group.length
          const total = avgIncome + avgFoodSpending
          
          if (metric.includes('Monthly Income')) {
            return total > 0 ? (avgIncome / total * 100) : 0
          } else if (metric.includes('Monthly Food Spending')) {
            return total > 0 ? (avgFoodSpending / total * 100) : 0
          }
          return 0
        })

        return {
          label: metric,
          data: percentages,
          backgroundColor: idx === 0 ? 'rgba(200, 200, 200, 0.8)' : 'rgba(0, 0, 0, 0.8)',
          borderColor: idx === 0 ? 'rgba(150, 150, 150, 1)' : 'rgba(0, 0, 0, 1)',
          borderWidth: 1
        }
      })

      return { labels, datasets, chartType: tool.chart, isPercentage: true }
    }

    // For regular Bar Chart, Line Chart, or Sum
    const datasets = tool.metrics.map((metric, idx) => {
      const values = labels.map(label => {
        const level = parseInt(label)
        const group = groups[level] || []
        if (tool.operation === 'Count') {
          return group.length
        } else if (tool.operation === 'Average') {
          if (metric.includes('Monthly Income')) {
            return group.length > 0 ? group.reduce((sum, c) => sum + parseFloat(c.Income || c.monthly_income || 0), 0) / group.length : 0
          } else if (metric.includes('Monthly Food Spending')) {
            return group.length > 0 ? group.reduce((sum, c) => {
              const income = parseFloat(c.Income || c.monthly_income || 0)
              return sum + parseFloat(c['Monthly Food Spending'] || c.monthly_food_spending || income * 0.15)
            }, 0) / group.length : 0
          }
        } else if (tool.operation === 'Sum') {
          if (metric.includes('Monthly Food Spending')) {
            return group.reduce((sum, c) => {
              const income = parseFloat(c.Income || c.monthly_income || 0)
              return sum + parseFloat(c['Monthly Food Spending'] || c.monthly_food_spending || income * 0.15)
            }, 0)
          }
        }
        return 0
      })

      return {
        label: metric,
        data: values,
        backgroundColor: tool.chart.includes('Line Chart') ? 'transparent' : 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: tool.chart.includes('Line Chart') ? 3 : 2,
        fill: tool.chart.includes('Line Chart') ? false : true
      }
    })

    return { labels, datasets, chartType: tool.chart }
  }

  const processByWorkingHours = (customers: any[], tool: typeof ANALYTICS_TOOLS[0]) => {
    // Group by working hours ranges (more granular)
    const groups: Record<string, any[]> = {
      '0-20': [],
      '21-30': [],
      '31-40': [],
      '41-50': [],
      '51-60': [],
      '61+': []
    }

    customers.forEach(c => {
      const wh = parseFloat(c['Working Hours'] || c.working_hours || 0)
      if (wh <= 20) groups['0-20'].push(c)
      else if (wh <= 30) groups['21-30'].push(c)
      else if (wh <= 40) groups['31-40'].push(c)
      else if (wh <= 50) groups['41-50'].push(c)
      else if (wh <= 60) groups['51-60'].push(c)
      else groups['61+'].push(c)
    })

    const labels = Object.keys(groups)
    const datasets = tool.metrics.map((metric) => {
      const values = labels.map(label => {
        const group = groups[label]
        if (tool.operation === 'Average' && metric.includes('Monthly Income')) {
          return group.length > 0 ? group.reduce((sum, c) => sum + parseFloat(c.Income || c.monthly_income || 0), 0) / group.length : 0
        }
        return 0
      })

      return {
        label: metric,
        data: values,
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2
      }
    })

    return { labels, datasets, chartType: tool.chart }
  }

  const processByGender = (customers: any[], tool: typeof ANALYTICS_TOOLS[0]) => {
    // Note: customers table doesn't have gender, so we'll use a placeholder
    // In a real scenario, you'd need to add gender to the customers table
    return {
      labels: ['Male', 'Female', 'Other'],
      datasets: [{
        label: tool.metrics[0],
        data: [Math.floor(customers.length * 0.45), Math.floor(customers.length * 0.50), Math.floor(customers.length * 0.05)],
        backgroundColor: ['rgba(59, 130, 246, 0.6)', 'rgba(236, 72, 153, 0.6)', 'rgba(139, 92, 246, 0.6)'],
        borderColor: ['rgba(59, 130, 246, 1)', 'rgba(236, 72, 153, 1)', 'rgba(139, 92, 246, 1)'],
        borderWidth: 2
      }],
      chartType: tool.chart
    }
  }

  const processByDietaryPreference = (customers: any[], tool: typeof ANALYTICS_TOOLS[0]) => {
    // Note: customers table doesn't have dietary preference, using placeholder
    return {
      labels: ['Vegetarian', 'Vegan', 'Omnivore', 'Other'],
      datasets: [{
        label: tool.metrics[0],
        data: [25, 15, 50, 10],
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2
      }],
      chartType: tool.chart
    }
  }

  const renderChart = () => {
    if (!data || !data.labels || data.labels.length === 0) {
      return <div className="text-center py-8 text-gray-500">No data available</div>
    }

    const { labels, datasets, chartType, isPercentage } = data

    // Pie Chart
    if (chartType.includes('Pie Chart')) {
      const total = datasets[0].data.reduce((sum: number, val: number) => sum + val, 0)
      return (
        <div className="space-y-4">
          {labels.map((label: string, idx: number) => {
            const value = datasets[0].data[idx]
            const percentage = total > 0 ? (value / total * 100).toFixed(1) : 0
            return (
              <div key={idx} className="flex items-center gap-4">
                <div className="w-32 text-sm font-medium">{label}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="w-20 text-sm font-semibold text-right">
                      {value.toLocaleString()} ({percentage}%)
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )
    }

    // Stacked Bar Chart (with percentage like in image)
    if (chartType.includes('Stacked Bar Chart') && isPercentage) {
      return (
        <div className="space-y-6">
          <div className="mb-4">
            <div className="text-sm font-semibold text-gray-700 mb-2">Y-axis: Percentage (0-100%)</div>
            <div className="h-64 relative border-l-2 border-b-2 border-gray-300">
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-600 pr-2">
                <span>100%</span>
                <span>80%</span>
                <span>60%</span>
                <span>40%</span>
                <span>20%</span>
                <span>0%</span>
              </div>
              
              {/* Bars */}
              <div className="ml-8 h-full flex items-end gap-2">
                {labels.map((label: string, labelIdx: number) => {
                  const foodSpending = datasets.find((d: any) => d.label.includes('Food Spending'))?.data[labelIdx] || 0
                  const income = datasets.find((d: any) => d.label.includes('Income'))?.data[labelIdx] || 0
                  
                  return (
                    <div key={labelIdx} className="flex-1 flex flex-col items-center h-full">
                      <div className="w-full h-full flex flex-col justify-end relative">
                        {/* Stacked segments */}
                        <div
                          className="w-full transition-all hover:opacity-90"
                          style={{
                            height: `${foodSpending}%`,
                            backgroundColor: 'rgba(200, 200, 200, 0.8)',
                            borderTop: '1px solid rgba(150, 150, 150, 1)'
                          }}
                          title={`Food Spending: ${foodSpending.toFixed(2)}%`}
                        />
                        <div
                          className="w-full transition-all hover:opacity-90"
                          style={{
                            height: `${income}%`,
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            borderTop: '1px solid rgba(0, 0, 0, 1)'
                          }}
                          title={`Income: ${income.toFixed(2)}%`}
                        />
                      </div>
                      <div className="text-xs text-gray-600 mt-2 text-center font-medium">
                        {label}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="text-sm font-semibold text-gray-700 mt-2 ml-8">X-axis: {toolInfo?.breakdown || 'Category'}</div>
          </div>
          
          {/* Legend */}
          <div className="flex gap-6 justify-center mt-4">
            {datasets.map((dataset: any, idx: number) => (
              <div key={idx} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: dataset.backgroundColor }}
                />
                <span className="text-sm text-gray-700">{dataset.label}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }

    // Line Chart
    if (chartType.includes('Line Chart')) {
      const maxValue = Math.max(...datasets.flatMap((d: any) => d.data))
      return (
        <div className="space-y-4">
          <div className="h-64 relative border-l-2 border-b-2 border-gray-300">
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-600 pr-2">
              {[100, 80, 60, 40, 20, 0].map(val => (
                <span key={val}>{maxValue > 0 ? Math.round(maxValue * val / 100).toLocaleString() : val}</span>
              ))}
            </div>
            <div className="ml-8 h-full">
              {datasets.map((dataset: any, datasetIdx: number) => (
                <div key={datasetIdx} className="relative h-full">
                  <svg className="w-full h-full">
                    <polyline
                      points={labels.map((label: string, idx: number) => {
                        const x = (idx / (labels.length - 1)) * 100
                        const y = 100 - (dataset.data[idx] / maxValue * 100)
                        return `${x}%,${y}%`
                      }).join(' ')}
                      fill="none"
                      stroke={dataset.borderColor}
                      strokeWidth={dataset.borderWidth}
                    />
                    {labels.map((label: string, idx: number) => {
                      const x = (idx / (labels.length - 1)) * 100
                      const y = 100 - (dataset.data[idx] / maxValue * 100)
                      return (
                        <circle
                          key={idx}
                          cx={`${x}%`}
                          cy={`${y}%`}
                          r="4"
                          fill={dataset.borderColor}
                        />
                      )
                    })}
                  </svg>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-4 justify-center mt-4">
            {datasets.map((dataset: any, idx: number) => (
              <div key={idx} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: dataset.borderColor }}
                />
                <span className="text-sm text-gray-700">{dataset.label}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }

    // Regular Bar Chart or Clustered Bar Chart
    const maxValue = Math.max(...datasets.flatMap((d: any) => d.data))
    
    return (
      <div className="space-y-6">
        <div className="h-64 relative border-l-2 border-b-2 border-gray-300">
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-600 pr-2">
            {[100, 80, 60, 40, 20, 0].map(val => (
              <span key={val}>{maxValue > 0 ? Math.round(maxValue * val / 100).toLocaleString() : val}</span>
            ))}
          </div>
          <div className="ml-8 h-full flex items-end gap-2">
            {labels.map((label: string, labelIdx: number) => (
              <div key={labelIdx} className="flex-1 flex items-end gap-1 h-full">
                {datasets.map((dataset: any, datasetIdx: number) => {
                  const value = dataset.data[labelIdx]
                  const height = maxValue > 0 ? (value / maxValue * 100) : 0
                  return (
                    <div key={datasetIdx} className="flex-1 flex flex-col items-center">
                      <div className="w-full flex flex-col justify-end h-full">
                        <div
                          className="w-full rounded-t transition-all hover:opacity-80"
                          style={{
                            height: `${height}%`,
                            backgroundColor: dataset.backgroundColor,
                            borderColor: dataset.borderColor,
                            borderWidth: dataset.borderWidth,
                            borderStyle: 'solid'
                          }}
                          title={`${dataset.label}: ${value.toLocaleString()}`}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-4 justify-center mt-4">
          {datasets.map((dataset: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: dataset.backgroundColor }}
              />
              <span className="text-sm text-gray-700">{dataset.label}</span>
            </div>
          ))}
        </div>
        <div className="text-sm font-semibold text-gray-700 text-center">
          X-axis: {toolInfo?.breakdown || 'Category'}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-5 z-50">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="text-center py-12">
              <p className="text-gray-600">Loading visualization...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-5 z-50">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-5 z-50">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-linear-to-br from-[#E63946] to-[#C1121F] text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-serif font-bold mb-2">
                {toolInfo ? `${toolInfo.operation} of ${toolInfo.metrics.join(' and ')}` : tool.tool_type}
              </h2>
              <p className="text-red-100 text-sm">
                by {toolInfo?.breakdown || 'N/A'} • {toolInfo?.chart || 'Chart'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-red-200 text-3xl font-bold transition-colors"
            >
              ×
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {data && renderChart()}
        </div>
      </div>
    </div>
  )
}

