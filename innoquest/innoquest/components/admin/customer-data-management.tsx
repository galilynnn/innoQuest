'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Customer {
  id: string
  job: string
  gender: string
  monthly_income: number
  income_segment: string
  monthly_food_spending: number
  spending_segment: string
  working_hours_per_week: number
  dietary_preference: string
  health_consciousness: number
  health_segment: string
  interest_in_experimental_food: number
  experimental_segment: string
  sustainability_preference: number
  sustainability_segment: string
  brand_loyalty: number
  loyalty_segment: number
}

interface CustomerDataManagementProps {
  gameId: string
}

export default function CustomerDataManagement({ gameId }: CustomerDataManagementProps) {
  const supabase = createClient()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    customer_id: '',
    monthly_income: 50000,
    monthly_food_spending: 700,
    working_hours: 40,
    health_consciousness: 5,
    experimental_food_interest: 5,
    sustainability_preference: 5,
    brand_loyalty: 5,
    probability: 0.75,
  })

  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    const { data } = await supabase.from('customers_data').select('*').limit(50)

    if (data) {
      setCustomers(data)
    }
    setLoading(false)
  }

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const { error } = await supabase.from('customers').insert({
      ...formData,
    })

    if (!error) {
      setFormData({
        customer_id: '',
        monthly_income: 50000,
        monthly_food_spending: 700,
        working_hours: 40,
        health_consciousness: 5,
        experimental_food_interest: 5,
        sustainability_preference: 5,
        brand_loyalty: 5,
        probability: 0.75,
      })
      setShowAddForm(false)
      loadCustomers()
    }
  }

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm('Delete this customer?')) return

    await supabase.from('customers').delete().eq('id', id)
    loadCustomers()
  }

  if (loading) {
    return <div className="p-4">Loading customers...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-serif font-bold">Customer Database ({customers.length})</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary"
        >
          {showAddForm ? 'Cancel' : 'Add Customer'}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-card border border-border rounded-lg p-6">
          <form onSubmit={handleAddCustomer} className="grid grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Customer id"
              value={formData.customer_id}
              onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
              className="px-4 py-2 border border-border rounded-lg bg-input"
              required
            />
            <input
              type="number"
              placeholder="Monthly Income"
              value={formData.monthly_income}
              onChange={(e) => setFormData({ ...formData, monthly_income: Number(e.target.value) })}
              className="px-4 py-2 border border-border rounded-lg bg-input"
            />
            <input
              type="number"
              placeholder="Food Spending"
              value={formData.monthly_food_spending}
              onChange={(e) => setFormData({ ...formData, monthly_food_spending: Number(e.target.value) })}
              className="px-4 py-2 border border-border rounded-lg bg-input"
            />
            <input
              type="number"
              placeholder="Working Hours"
              value={formData.working_hours}
              onChange={(e) => setFormData({ ...formData, working_hours: Number(e.target.value) })}
              className="px-4 py-2 border border-border rounded-lg bg-input"
            />
            <input
              type="number"
              min="0"
              max="10"
              placeholder="Health Consciousness"
              value={formData.health_consciousness}
              onChange={(e) => setFormData({ ...formData, health_consciousness: Number(e.target.value) })}
              className="px-4 py-2 border border-border rounded-lg bg-input"
            />
            <button type="submit" className="btn-primary">
              Add Customer
            </button>
          </form>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg p-6 overflow-x-auto">
        <table className="w-full text-sm table-auto">
          <thead className="border-b border-border">
            <tr className="text-muted-foreground">
              <th className="text-center py-2">ID</th>
              <th className="text-center py-2">Name</th>
              <th className="text-center py-2">Gender</th>
              <th className="text-center py-2">Job</th>
              <th className="text-center py-2">Monthly Income</th>
              <th className="text-center py-2">Income Segment</th>
              <th className="text-center py-2">Monthly Food Spending</th>
              <th className="text-center py-2">Spending Segment</th>
              <th className="text-center py-2">Working Hours/Week</th>
              <th className="text-center py-2">Dietary Preference</th>
              <th className="text-center py-2">Health Consciousness</th>
              <th className="text-center py-2">Health Segment</th>
              <th className="text-center py-2">Interest in Experimental Food</th>
              <th className="text-center py-2">Experimental Segment</th>
              <th className="text-center py-2">Sustainability Preference</th>
              <th className="text-center py-2">Sustainability Segment</th>
              <th className="text-center py-2">Brand Loyalty</th>
              <th className="text-center py-2">Loyalty Segment</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="border-b border-border hover:bg-secondary/50">
                <td className="text-center py-3">{customer.customer_id}</td>
                <td className="text-center py-3">{customer.name}</td>
                <td className="text-center py-3">{customer.gender}</td>
                <td className="text-center py-3">{customer.job}</td>
                <td className="text-center py-3">${customer.monthly_income}</td>
                <td className="text-center py-3">{customer.income_segment}</td>
                <td className="text-center py-3">${customer.monthly_food_spending}</td>
                <td className="text-center py-3">{customer.spending_segment}</td>
                <td className="text-center py-3">{customer.working_hours_per_week}</td>
                <td className="text-center py-3">{customer.dietary_preference}</td>
                <td className="text-center py-3">{customer.health_consciousness}/10</td>
                <td className="text-center py-3">{customer.health_segment}</td>
                <td className="text-center py-3">{customer.interest_in_experimental_food}/10</td>
                <td className="text-center py-3">{customer.experimental_segment}</td>
                <td className="text-center py-3">{customer.sustainability_preference}/10</td>
                <td className="text-center py-3">{customer.sustainability_segment}</td>
                <td className="text-center py-3">{customer.brand_loyalty}/10</td>
                <td className="text-center py-3">{customer.loyalty_segment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
