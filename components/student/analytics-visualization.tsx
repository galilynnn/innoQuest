'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
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
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null)
  const hasLoadedRef = useRef(false) // Use ref to track if data has been loaded (persists across renders)
  const loadedToolTypeRef = useRef<string | null>(null) // Track which tool type was loaded

  // Match tool by fullName, handling both • and ( ) formats
  const normalizeToolName = (name: string) => {
    return name
      .replace(/•/g, '(')  // Replace bullet with opening paren
      .replace(/\s*\(/g, ' (')  // Normalize spacing
      .trim()
  }
  
  // Memoize toolInfo to prevent recalculation on every render
  const toolInfo = useMemo(() => {
    return ANALYTICS_TOOLS.find(t => {
      const toolName = normalizeToolName(tool.tool_type)
      const fullName = normalizeToolName(t.fullName)
      return toolName === fullName || tool.tool_type === t.fullName
    })
  }, [tool.tool_type])

  // Helper function to clean CSV values (remove quotes, parse numbers)
  // Handles text values from customers_data table (e.g., "168,986.06" -> 168986.06)
  const cleanCSVValue = (value: any): number => {
    if (value === null || value === undefined) return 0
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      // Remove quotes, commas, and any whitespace, then parse
      // Handles formats like: "168,986.06", "168986.06", '"168"', etc.
      const cleaned = value.replace(/["',\s]/g, '').trim()
      const parsed = parseFloat(cleaned)
      return isNaN(parsed) ? 0 : parsed
    }
    return 0
  }

  // Map CSV column names to customers_data table column names
  const columnMap: Record<string, string> = {
    'Monthly Income': 'monthly_income',
    'Monthly Food Spending': 'monthly_food_spending',
    'Working Hours/Week': 'working_hours_per_week',
    'Health Consciousness': 'health_consciousness',
    'Interest in Experimental Food': 'interest_in_experimental_food',
    'Sustainability Preference': 'sustainability_preference',
    'Brand Loyalty': 'brand_loyalty',
    'Gender': 'gender',
    'Dietary Preference': 'dietary_preference',
  }

  // Helper function to get value from customers_data table (with column mapping)
  const getCSVValue = (record: any, columnName: string, fallbackColumn?: string): number => {
    const dbColumn = columnMap[columnName] || fallbackColumn || columnName.toLowerCase()
    const value = record[dbColumn] || record[columnName] || 0
    return cleanCSVValue(value)
  }

  // Helper function to get text value from customers_data table (with column mapping)
  const getCSVTextValue = (record: any, columnName: string, fallbackColumn?: string): string => {
    const dbColumn = columnMap[columnName] || fallbackColumn || columnName.toLowerCase()
    const value = record[dbColumn] || record[columnName] || ''
    if (typeof value === 'string') {
      return value.replace(/["']/g, '').trim()
    }
    return String(value).trim()
  }

  useEffect(() => {
    // Only load data once per tool - no need for real-time updates since data doesn't change during game
    const loadData = async () => {
      if (!toolInfo) {
        setError('Tool information not found')
        setLoading(false)
        return
      }

      // CRITICAL: Skip if data already loaded for this specific tool type using ref (persists across renders)
      if (hasLoadedRef.current && loadedToolTypeRef.current === tool.tool_type && data) {
        console.log('⏭️ Skipping data fetch - already loaded for tool:', tool.tool_type)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        console.log('🔍 Loading customer data from customers_data table (one-time fetch)')
        console.log('🔍 Tool info:', { tool_type: tool.tool_type, toolInfo })

        if (!toolInfo) {
          console.error('❌ Tool not found:', tool.tool_type)
          setError(`Tool configuration not found: ${tool.tool_type}`)
          setLoading(false)
          return
        }

        // Get customer data from customers_data table (one-time fetch, no real-time subscription)
        const { data: customers, error: customersError } = await supabase
          .from('customers_data')
          .select('*')

        if (customersError) {
          console.error('❌ Database error:', customersError)
          throw customersError
        }

        if (!customers || customers.length === 0) {
          console.warn('⚠️ No customer data found in customers_data table')
          setError('No customer data available. Please ask admin to upload and activate customer data.')
          setLoading(false)
          return
        }

        console.log('✅ Found customer data:', {
          recordCount: customers.length,
          firstRecord: customers[0],
          sampleKeys: Object.keys(customers[0] || {})
        })

        // Process data based on tool type
        const processedData = processData(customers, toolInfo)
        console.log('📈 Processed data:', processedData)
        console.log('📈 Labels:', processedData.labels)
        console.log('📈 Datasets:', processedData.datasets)
        console.log('📈 Labels length:', processedData.labels?.length)
        console.log('📈 Datasets length:', processedData.datasets?.length)
        
        if (!processedData.labels || processedData.labels.length === 0) {
          console.warn('⚠️ No labels generated from data')
        }
        if (!processedData.datasets || processedData.datasets.length === 0) {
          console.warn('⚠️ No datasets generated from data')
        }
        
        setData(processedData)
        hasLoadedRef.current = true // Mark as loaded using ref
        loadedToolTypeRef.current = tool.tool_type // Track which tool was loaded
      } catch (err: any) {
        console.error('Error loading visualization data:', err)
        setError(err.message || 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
    // Only depend on tool.tool_type to prevent unnecessary re-fetches
    // Using refs instead of state to track loaded status prevents re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool.tool_type]) // Only re-fetch if tool type actually changes

  // Generic function to calculate metric value from a group of customers
  const calculateMetric = (group: any[], operation: string, metric: string): number => {
    if (group.length === 0) {
      console.log(`⚠️ Empty group for ${operation} of ${metric}`)
      return 0
    }

    if (operation === 'Count') {
      return group.length
    } else if (operation === 'Average') {
      let sum = 0
      let count = 0
      if (metric.includes('Monthly Income')) {
        group.forEach(c => {
          const val = getCSVValue(c, 'Monthly Income', 'monthly_income')
          if (!isNaN(val) && isFinite(val)) {
            sum += val
            count++
          }
        })
      } else if (metric.includes('Monthly Food Spending')) {
        group.forEach(c => {
          const val = getCSVValue(c, 'Monthly Food Spending', 'monthly_food_spending')
          if (!isNaN(val) && isFinite(val)) {
            sum += val
            count++
          }
        })
      } else if (metric.includes('Working Hours')) {
        group.forEach(c => {
          const val = getCSVValue(c, 'Working Hours/Week', 'working_hours_per_week')
          if (!isNaN(val) && isFinite(val)) {
            sum += val
            count++
          }
        })
      } else if (metric.includes('Brand Loyalty')) {
        group.forEach(c => {
          const val = getCSVValue(c, 'Brand Loyalty', 'brand_loyalty')
          if (!isNaN(val) && isFinite(val)) {
            sum += val
            count++
          }
        })
      }
      const avg = count > 0 ? sum / count : 0
      console.log(`📊 ${operation} of ${metric}: sum=${sum}, count=${count}, avg=${avg}`)
      return avg
    } else if (operation === 'Sum') {
      if (metric.includes('Monthly Food Spending')) {
        return group.reduce((acc, c) => acc + getCSVValue(c, 'Monthly Food Spending', 'monthly_food_spending'), 0)
      }
    }
    return 0
  }

  // Generic function to group customers by breakdown category
  const groupCustomers = (customers: any[], breakdown: string): Record<string, any[]> => {
    const breakdownLower = breakdown.toLowerCase()
    const groups: Record<string, any[]> = {}

    if (breakdownLower.includes('health consciousness') && breakdownLower.includes('sustainability preference')) {
      // Clustered: Health Consciousness and Sustainability Preference
      customers.forEach(c => {
        const health = Math.round(getCSVValue(c, 'Health Consciousness', 'health_consciousness'))
        const sustainability = Math.round(getCSVValue(c, 'Sustainability Preference', 'sustainability_preference'))
        const key = `H${health}_S${sustainability}`
        if (!groups[key]) groups[key] = []
        groups[key].push(c)
      })
    } else if (breakdownLower.includes('brand loyalty') && breakdownLower.includes('gender')) {
      // Clustered: Brand Loyalty and Gender
      for (let i = 1; i <= 10; i++) {
        groups[`BL${i}_Male`] = []
        groups[`BL${i}_Female`] = []
        groups[`BL${i}_Other`] = []
      }
      customers.forEach(c => {
        const bl = Math.round(getCSVValue(c, 'Brand Loyalty', 'brand_loyalty'))
        const level = Math.max(1, Math.min(10, bl))
        const gender = getCSVTextValue(c, 'Gender', 'gender')
        const normalizedGender = gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase()
        const genderKey = (normalizedGender === 'Male' || normalizedGender === 'Female') ? normalizedGender : 'Other'
        groups[`BL${level}_${genderKey}`].push(c)
      })
    } else if (breakdownLower.includes('sustainability preference') && breakdownLower.includes('gender')) {
      // Clustered: Sustainability Preference and Gender
      for (let i = 1; i <= 10; i++) {
        groups[`SP${i}_Male`] = []
        groups[`SP${i}_Female`] = []
        groups[`SP${i}_Other`] = []
      }
      customers.forEach(c => {
        const sp = Math.round(getCSVValue(c, 'Sustainability Preference', 'sustainability_preference'))
        const level = Math.max(1, Math.min(10, sp))
        const gender = getCSVTextValue(c, 'Gender', 'gender')
        const normalizedGender = gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase()
        const genderKey = (normalizedGender === 'Male' || normalizedGender === 'Female') ? normalizedGender : 'Other'
        groups[`SP${level}_${genderKey}`].push(c)
      })
    } else if (breakdownLower.includes('health consciousness')) {
      // Group by Health Consciousness (1-10)
      for (let i = 1; i <= 10; i++) groups[i] = []
      customers.forEach(c => {
        const value = Math.round(getCSVValue(c, 'Health Consciousness', 'health_consciousness'))
        const level = Math.max(1, Math.min(10, value))
        groups[level].push(c)
      })
    } else if (breakdownLower.includes('experimental food') || breakdownLower.includes('interest in experimental food')) {
      // Group by Experimental Food Interest (1-10)
      for (let i = 1; i <= 10; i++) groups[i] = []
      customers.forEach(c => {
        const value = Math.round(getCSVValue(c, 'Interest in Experimental Food', 'interest_in_experimental_food'))
        const level = Math.max(1, Math.min(10, value))
        groups[level].push(c)
      })
    } else if (breakdownLower.includes('brand loyalty')) {
      // Group by Brand Loyalty (1-10)
      for (let i = 1; i <= 10; i++) groups[i] = []
      customers.forEach(c => {
        const value = Math.round(getCSVValue(c, 'Brand Loyalty', 'brand_loyalty'))
        const level = Math.max(1, Math.min(10, value))
        groups[level].push(c)
      })
    } else if (breakdownLower.includes('sustainability preference')) {
      // Group by Sustainability Preference (1-10)
      for (let i = 1; i <= 10; i++) groups[i] = []
      customers.forEach(c => {
        const value = Math.round(getCSVValue(c, 'Sustainability Preference', 'sustainability_preference'))
        const level = Math.max(1, Math.min(10, value))
        groups[level].push(c)
      })
    } else if (breakdownLower.includes('working hours')) {
      // Group by Working Hours ranges
      groups['0-20'] = []
      groups['21-30'] = []
      groups['31-40'] = []
      groups['41-50'] = []
      groups['51-60'] = []
      groups['61+'] = []
      customers.forEach(c => {
        const wh = getCSVValue(c, 'Working Hours/Week', 'working_hours_per_week')
        if (wh <= 20) groups['0-20'].push(c)
        else if (wh <= 30) groups['21-30'].push(c)
        else if (wh <= 40) groups['31-40'].push(c)
        else if (wh <= 50) groups['41-50'].push(c)
        else if (wh <= 60) groups['51-60'].push(c)
        else groups['61+'].push(c)
      })
    } else if (breakdownLower.includes('gender')) {
      // Group by Gender
      groups['Male'] = []
      groups['Female'] = []
      groups['Other'] = []
      customers.forEach(c => {
        const gender = getCSVTextValue(c, 'Gender', 'gender')
        const normalizedGender = gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase()
        if (normalizedGender === 'Male' || normalizedGender === 'Female') {
          groups[normalizedGender].push(c)
        } else {
          groups['Other'].push(c)
        }
      })
    } else if (breakdownLower.includes('dietary preference')) {
      // Group by Dietary Preference
      customers.forEach(c => {
        const dietary = getCSVTextValue(c, 'Dietary Preference', 'dietary_preference')
        const normalized = dietary.trim()
        if (!groups[normalized]) groups[normalized] = []
        groups[normalized].push(c)
      })
    }

    return groups
  }

  const processData = (customers: any[], tool: typeof ANALYTICS_TOOLS[0]) => {
    console.log('🔧 Processing data for tool:', tool)
    console.log('🔧 Customers count:', customers.length)
    
    // Group customers by breakdown category
    const groups = groupCustomers(customers, tool.breakdown)
    console.log('🔧 Groups created:', Object.keys(groups).length, 'groups')
    console.log('🔧 Group sizes:', Object.entries(groups).map(([k, v]) => `${k}: ${v.length}`))
    
    // Get sorted labels
    const labels = Object.keys(groups).sort((a, b) => {
      // Sort numeric keys
      const aNum = parseInt(a)
      const bNum = parseInt(b)
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum
      return a.localeCompare(b)
    })

    // Filter out empty groups for display
    // CRITICAL FIX: Convert label to number if numeric, since groups uses number keys (1, 2, 3, ...)
    // but Object.keys() returns string keys ('1', '2', '3', ...)
    const nonEmptyLabels = labels.filter(label => {
      const groupKey = !isNaN(Number(label)) ? Number(label) : label
      const group = groups[groupKey] || groups[label] || []
      return group.length > 0
    })
    console.log('🔧 Non-empty labels:', nonEmptyLabels.length, nonEmptyLabels)
    console.log('🔧 All labels (including empty):', labels)
    
    // For Stacked Bar Chart with percentage (2 metrics)
    if (tool.chart.includes('Stacked Bar Chart') && tool.metrics.length === 2) {
      const datasets = tool.metrics.map((metric, idx) => {
        const percentages = nonEmptyLabels.map(label => {
          // Convert label to number if it's numeric (for Brand Loyalty, Health Consciousness, etc.)
          const groupKey = !isNaN(Number(label)) ? Number(label) : label
          const group = groups[groupKey] || groups[label] || []
          if (group.length === 0) return 0
          
          const avgIncome = calculateMetric(group, 'Average', 'Monthly Income')
          const avgFoodSpending = calculateMetric(group, 'Average', 'Monthly Food Spending')
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

      return { labels: nonEmptyLabels, datasets, chartType: tool.chart, isPercentage: true }
    }

    // For Combination Bar and Line Chart (2 metrics: 1 bar, 1 line)
    if (tool.chart.includes('Combination Bar and Line Chart')) {
      // Check if breakdown includes "and Gender" (e.g., "Sustainability Preference and Gender")
      const hasGenderBreakdown = tool.breakdown.toLowerCase().includes('gender')
      
      if (hasGenderBreakdown) {
        // Extract unique primary category values (e.g., SP levels: 2, 4, 6, 8, 10)
        const primaryCategoryValues = new Set<string>()
        const genderGroups: Record<string, Record<string, any[]>> = {} // e.g., { "2": { "Female": [...], "Male": [...] } }
        
        Object.keys(groups).forEach(key => {
          // Parse keys like "SP2_Female", "SP4_Male", etc.
          const match = key.match(/^SP(\d+)_(Female|Male|Other)$/)
          if (match) {
            const [, level, gender] = match
            primaryCategoryValues.add(level)
            if (!genderGroups[level]) genderGroups[level] = {}
            genderGroups[level][gender] = groups[key] || []
          }
        })
        
        const sortedLevels = Array.from(primaryCategoryValues).sort((a, b) => Number(a) - Number(b))
        
        // For bars (first metric - Monthly Income): Create datasets for each gender
        const barMetric = tool.metrics[0] // Monthly Income
        const barDatasets = ['Female', 'Male'].map(gender => {
          const values = sortedLevels.map(level => {
            const group = genderGroups[level]?.[gender] || []
            return calculateMetric(group, tool.operation, barMetric)
          })
          return {
            label: gender,
            data: values,
            backgroundColor: gender === 'Female' ? 'rgba(100, 100, 100, 0.8)' : 'rgba(200, 200, 200, 0.8)',
            borderColor: gender === 'Female' ? 'rgba(50, 50, 50, 1)' : 'rgba(150, 150, 150, 1)',
            borderWidth: 2,
            type: 'bar'
          }
        })
        
        // For line (second metric - Monthly Food Spending): Aggregate across all genders by SP level
        const lineMetric = tool.metrics[1] // Monthly Food Spending
        const lineValues = sortedLevels.map(level => {
          // Combine all genders for this SP level
          const allCustomers = Object.values(genderGroups[level] || {}).flat()
          return calculateMetric(allCustomers, tool.operation, lineMetric)
        })
        
        const lineDataset = {
          label: lineMetric,
          data: lineValues,
          backgroundColor: 'transparent',
          borderColor: 'rgba(0, 0, 0, 1)',
          borderWidth: 3,
          type: 'line',
          fill: false
        }
        
        return { 
          labels: sortedLevels, 
          datasets: [...barDatasets, lineDataset], 
          chartType: tool.chart,
          hasDualAxis: true // Flag for dual Y-axis rendering
        }
      } else {
        // Simple combination chart (e.g., "Brand Loyalty" without gender)
        const datasets = tool.metrics.map((metric, idx) => {
          const values = nonEmptyLabels.map(label => {
            // Convert label to number if it's numeric
            const groupKey = !isNaN(Number(label)) ? Number(label) : label
            const group = groups[groupKey] || groups[label] || []
            return calculateMetric(group, tool.operation, metric)
          })

          return {
            label: metric,
            data: values,
            backgroundColor: idx === 0 ? 'rgba(59, 130, 246, 0.6)' : 'transparent',
            borderColor: idx === 0 ? 'rgba(59, 130, 246, 1)' : 'rgba(236, 72, 153, 1)',
            borderWidth: idx === 0 ? 2 : 3,
            type: idx === 0 ? 'bar' : 'line',
            fill: false
          }
        })

        return { labels: nonEmptyLabels, datasets, chartType: tool.chart }
      }
    }

    // For regular Bar Chart, Line Chart, Pie Chart, or Clustered Bar Chart
    const datasets = tool.metrics.map((metric, idx) => {
      // IMPORTANT: Map values in the SAME ORDER as nonEmptyLabels
      // CRITICAL: groups uses number keys (1, 2, 3, ...) but labels are strings ('1', '2', '3', ...)
      // So we need to access groups[label] where label is a string
      const values = nonEmptyLabels.map((label, labelIndex) => {
        // Convert label to number if it's numeric (for Brand Loyalty, Health Consciousness, etc.)
        const groupKey = !isNaN(Number(label)) ? Number(label) : label
        const group = groups[groupKey] || groups[label] || []
        const calculated = calculateMetric(group, tool.operation, metric)
        console.log(`🔢 [${labelIndex}] Label "${label}" (key: ${groupKey}): calculated=${calculated}, group size=${group.length}`)
        return calculated
      })

      console.log(`📊 Dataset for metric ${metric}:`, { 
        label: metric, 
        values, 
        valuesLength: values.length,
        labels: nonEmptyLabels,
        labelsLength: nonEmptyLabels.length,
        match: values.length === nonEmptyLabels.length
      })
      
      // Verify mapping: create a map to ensure correct pairing
      const labelValueMap = nonEmptyLabels.reduce((acc, label, idx) => {
        acc[label] = { index: idx, value: values[idx] }
        return acc
      }, {} as Record<string, { index: number, value: number }>)
      console.log(`📊 Label-Value Mapping:`, labelValueMap)

      return {
        label: metric,
        data: values, // This array MUST match nonEmptyLabels in order and length
        backgroundColor: tool.chart.includes('Pie Chart') 
          ? ['rgba(59, 130, 246, 0.6)', 'rgba(236, 72, 153, 0.6)', 'rgba(139, 92, 246, 0.6)']
          : tool.chart.includes('Clustered') 
            ? (idx === 0 ? 'rgba(59, 130, 246, 0.6)' : 'rgba(16, 185, 129, 0.6)')
            : tool.chart.includes('Line Chart')
              ? 'transparent'
              : 'rgba(59, 130, 246, 0.6)',
        borderColor: tool.chart.includes('Pie Chart')
          ? ['rgba(59, 130, 246, 1)', 'rgba(236, 72, 153, 1)', 'rgba(139, 92, 246, 1)']
          : tool.chart.includes('Clustered')
            ? (idx === 0 ? 'rgba(59, 130, 246, 1)' : 'rgba(16, 185, 129, 1)')
            : tool.chart.includes('Line Chart')
              ? 'rgba(236, 72, 153, 1)'
              : 'rgba(59, 130, 246, 1)',
        borderWidth: tool.chart.includes('Line Chart') ? 3 : 2,
        fill: tool.chart.includes('Line Chart') ? false : true
      }
    })

    return { labels: nonEmptyLabels, datasets, chartType: tool.chart }
  }

  const renderChart = () => {
    if (!data || !data.labels || data.labels.length === 0) {
      return <div className="text-center py-8 text-gray-500">No data available</div>
    }

    const { labels, datasets, chartType, isPercentage } = data

    // Pie Chart
    if (chartType.includes('Pie Chart')) {
      const total = datasets[0].data.reduce((sum: number, val: number) => sum + val, 0)
      const colors = ['rgba(59, 130, 246, 0.8)', 'rgba(236, 72, 153, 0.8)', 'rgba(139, 92, 246, 0.8)', 'rgba(16, 185, 129, 0.8)', 'rgba(245, 158, 11, 0.8)', 'rgba(239, 68, 68, 0.8)']
      const borderColors = ['rgba(59, 130, 246, 1)', 'rgba(236, 72, 153, 1)', 'rgba(139, 92, 246, 1)', 'rgba(16, 185, 129, 1)', 'rgba(245, 158, 11, 1)', 'rgba(239, 68, 68, 1)']
      
      // Calculate angles for pie slices
      let currentAngle = -90 // Start from top
      const radius = 120
      const centerX = 150
      const centerY = 150
      
      const slices = labels.map((label: string, idx: number) => {
        const value = datasets[0].data[idx]
        const percentage = total > 0 ? (value / total) : 0
        const angle = percentage * 360
        
        // Calculate slice path
        const startAngle = currentAngle
        const endAngle = currentAngle + angle
        
        const startAngleRad = (startAngle * Math.PI) / 180
        const endAngleRad = (endAngle * Math.PI) / 180
        
        // Calculate midpoint angle for tooltip positioning
        const midAngle = (startAngle + endAngle) / 2
        const midAngleRad = (midAngle * Math.PI) / 180
        const tooltipX = centerX + (radius * 0.7) * Math.cos(midAngleRad)
        const tooltipY = centerY + (radius * 0.7) * Math.sin(midAngleRad)
        
        const x1 = centerX + radius * Math.cos(startAngleRad)
        const y1 = centerY + radius * Math.sin(startAngleRad)
        const x2 = centerX + radius * Math.cos(endAngleRad)
        const y2 = centerY + radius * Math.sin(endAngleRad)
        
        const largeArcFlag = angle > 180 ? 1 : 0
        
        const pathData = [
          `M ${centerX} ${centerY}`,
          `L ${x1} ${y1}`,
          `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
          'Z'
        ].join(' ')
        
        currentAngle += angle
        
        return {
          label,
          value,
          percentage: (percentage * 100).toFixed(1),
          pathData,
          color: colors[idx % colors.length],
          borderColor: borderColors[idx % borderColors.length],
          tooltipX,
          tooltipY
        }
      })
      
      return (
        <div className="space-y-6 relative">
          <div className="flex justify-center relative">
            <svg 
              width="300" 
              height="300" 
              viewBox="0 0 300 300" 
              className="drop-shadow-lg"
              onMouseLeave={() => {
                setHoveredSlice(null)
              }}
            >
              {slices.map((slice: { 
                pathData: string; 
                color: string; 
                borderColor: string; 
                tooltipX: number; 
                tooltipY: number;
                percentage: string;
                label: string;
              }, idx: number) => (
                <g key={idx}>
                  <path
                    d={slice.pathData}
                    fill={slice.color}
                    stroke={slice.borderColor}
                    strokeWidth="2"
                    className="transition-opacity hover:opacity-80 cursor-pointer"
                    onMouseEnter={() => {
                      setHoveredSlice(idx)
                    }}
                  />
                  {/* Tooltip text */}
                  {hoveredSlice === idx && (
                    <text
                      x={slice.tooltipX}
                      y={slice.tooltipY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-sm font-bold fill-white pointer-events-none"
                      style={{ 
                        textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                        fontSize: '14px'
                      }}
                    >
                      {slice.percentage}%
                    </text>
                  )}
                </g>
              ))}
            </svg>
          </div>
          
          {/* Legend */}
          <div className="space-y-3">
            {slices.map((slice: { label: string; value: number; percentage: string; color: string; borderColor: string }, idx: number) => (
              <div key={idx} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: slice.color, border: `2px solid ${slice.borderColor}` }}
                  />
                  <div className="text-sm font-medium text-gray-800">{slice.label}</div>
                </div>
                <div className="text-sm font-semibold text-gray-700">
                  {slice.value.toLocaleString()} ({slice.percentage}%)
                </div>
              </div>
            ))}
          </div>
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
      const roundedMaxValue = Math.round(maxValue)
      return (
        <div className="space-y-4">
          <div className="h-64 relative border-l-2 border-b-2 border-gray-300">
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-600 pr-2">
              {[100, 80, 60, 40, 20, 0].map(val => (
                <span key={val}>{roundedMaxValue > 0 ? Math.round(roundedMaxValue * val / 100).toLocaleString() : val}</span>
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
    const allValues = datasets.flatMap((d: any) => d.data).filter((v: number) => !isNaN(v) && isFinite(v))
    const maxValue = allValues.length > 0 ? Math.max(...allValues) : 0
    const roundedMaxValue = Math.round(maxValue)
    
    console.log('📊 Rendering Bar Chart:', { 
      labels, 
      labelsLength: labels.length,
      datasets: datasets.map((d: any) => ({ 
        label: d.label, 
        data: d.data, 
        dataLength: d.data?.length,
        backgroundColor: d.backgroundColor 
      })),
      maxValue, 
      roundedMaxValue,
      allValues,
      allValuesLength: allValues.length,
      firstDatasetData: datasets[0]?.data,
      firstDatasetDataLength: datasets[0]?.data?.length,
      labelsMatchData: labels.length === datasets[0]?.data?.length
    })
    
    if (maxValue === 0 || allValues.length === 0 || isNaN(maxValue) || !isFinite(maxValue)) {
      console.warn('⚠️ Cannot render chart - invalid maxValue:', maxValue)
      return (
        <div className="text-center py-8 text-gray-500">
          <p>No data to display</p>
          <p className="text-xs mt-2">All values are zero or invalid</p>
          <p className="text-xs mt-1">Max value: {maxValue}, Values: {JSON.stringify(allValues.slice(0, 5))}</p>
        </div>
      )
    }
    
    return (
      <div className="space-y-6">
        <div className="h-64 relative border-l-2 border-b-2 border-gray-300">
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-600 pr-2">
            {[100, 80, 60, 40, 20, 0].map(val => (
              <span key={val}>{roundedMaxValue > 0 ? Math.round(roundedMaxValue * val / 100).toLocaleString() : val}</span>
            ))}
          </div>
          <div className="ml-8 h-full flex items-end gap-2">
            {labels.map((label: string, labelIdx: number) => {
              const dataset = datasets[0]
              if (!dataset || !Array.isArray(dataset.data)) {
                console.error(`❌ Invalid dataset at labelIdx ${labelIdx}:`, dataset)
                return null
              }
              
              // CRITICAL: Verify labelIdx is within bounds
              if (labelIdx >= dataset.data.length) {
                console.error(`❌ Label index ${labelIdx} (label: "${label}") out of bounds! Dataset.data.length: ${dataset.data.length}, Labels.length: ${labels.length}`)
                return null
              }
              
              const value = typeof dataset.data[labelIdx] === 'number' ? dataset.data[labelIdx] : 0
              const height = maxValue > 0 && value > 0 ? (value / maxValue * 100) : 0
              
              // Debug ALL bars to verify mapping
              console.log(`📊 Bar ${labelIdx} (label: "${label}"):`, {
                datasetDataLength: dataset.data.length,
                labelsLength: labels.length,
                value,
                maxValue,
                height,
                heightPercent: `${height}%`,
                isValid: !isNaN(height) && isFinite(height) && height > 0,
                dataAtIndex: dataset.data[labelIdx],
                allData: dataset.data
              })
              
              return (
                <div key={labelIdx} className="flex-1 flex items-end gap-1 h-full">
                  {datasets.map((dataset: any, datasetIdx: number) => {
                    // Ensure we have valid data array
                    if (!Array.isArray(dataset.data)) {
                      console.error(`❌ Dataset ${datasetIdx} data is not an array:`, dataset.data)
                      return null
                    }
                    
                    // CRITICAL: Use the same labelIdx to access dataset.data
                    const barValue = typeof dataset.data[labelIdx] === 'number' ? dataset.data[labelIdx] : 0
                    const barHeight = maxValue > 0 && barValue > 0 ? (barValue / maxValue * 100) : 0
                    
                    // Validate calculations
                    if (isNaN(barHeight) || !isFinite(barHeight)) {
                      console.error(`❌ Invalid barHeight for label ${label}:`, { barValue, maxValue, barHeight })
                      return null
                    }
                    
                    return (
                      <div key={datasetIdx} className="flex-1 flex flex-col items-center">
                        <div className="w-full flex flex-col justify-end h-full relative">
                          <div
                            className="w-full rounded-t transition-all hover:opacity-80"
                            style={{
                              height: `${barHeight}%`,
                              minHeight: barHeight > 0 ? '4px' : '0px',
                              backgroundColor: dataset.backgroundColor || 'rgba(59, 130, 246, 0.6)',
                              borderColor: dataset.borderColor || 'rgba(59, 130, 246, 1)',
                              borderWidth: dataset.borderWidth || 2,
                              borderStyle: 'solid',
                              borderBottom: 'none',
                              boxSizing: 'border-box'
                            }}
                            title={`${dataset.label}: ${barValue.toLocaleString()}`}
                          />
                        </div>
                        <div className="text-xs text-gray-600 mt-2 text-center font-medium">
                          {label}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
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

