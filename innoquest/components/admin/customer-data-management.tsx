'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Customer {
  id: string
  customer_id: string
  monthly_income: number
  monthly_food_spending: number
  working_hours: number
  health_consciousness: number
  experimental_food_interest: number
  sustainability_preference: number
  brand_loyalty: number
  probability: number
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
    const { data } = await supabase.from('customers').select('*').limit(50)

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
              placeholder="Customer ID"
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
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr className="text-muted-foreground">
              <th className="text-left py-2">ID</th>
              <th className="text-right py-2">Income</th>
              <th className="text-right py-2">Food Spending</th>
              <th className="text-right py-2">Health</th>
              <th className="text-right py-2">R&D Interest</th>
              <th className="text-right py-2">Probability</th>
              <th className="text-center py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="border-b border-border hover:bg-secondary/50">
                <td className="py-3">{customer.customer_id}</td>
                <td className="text-right">${customer.monthly_income}</td>
                <td className="text-right">${customer.monthly_food_spending}</td>
                <td className="text-right">{customer.health_consciousness}/10</td>
                <td className="text-right">{customer.experimental_food_interest}/10</td>
                <td className="text-right">{(customer.probability * 100).toFixed(0)}%</td>
                <td className="text-center">
                  <button
                    onClick={() => handleDeleteCustomer(customer.id)}
                    className="text-destructive hover:bg-destructive/10 px-2 py-1 rounded transition-colors"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
