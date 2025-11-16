'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AdminHeader from '@/components/admin/admin-header'
import GameConfiguration from '@/components/admin/game-configuration'
import TeamsManagement from '@/components/admin/teams-management'
import GameMonitoring from '@/components/admin/game-monitoring'
import CustomerDataManagement from '@/components/admin/customer-data-management'
import ExportReports from '@/components/admin/export-reports'

type TabType = 'config' | 'teams' | 'monitoring' | 'customers' | 'reports'

export default function AdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('config')
  // Use fixed UUID for default game session
  const gameId = '00000000-0000-0000-0000-000000000001'
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Set the game ID in session storage for consistency
    sessionStorage.setItem('current_game_id', gameId)
    setLoading(false)
  }, [])

  const handleLogout = async () => {
    sessionStorage.removeItem('current_game_id')
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader onLogout={handleLogout} />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage game configuration, teams, and monitor gameplay</p>
        </div>

        <div className="flex border-b border-border mb-8 overflow-x-auto">
          {(['config', 'teams', 'monitoring', 'customers', 'reports'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'config' && 'Game Configuration'}
              {tab === 'teams' && 'Teams & Credentials'}
              {tab === 'monitoring' && 'Live Monitoring'}
              {tab === 'customers' && 'Customer Data'}
              {tab === 'reports' && 'Export Reports'}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {activeTab === 'config' && <GameConfiguration gameId={gameId} />}
          {activeTab === 'teams' && <TeamsManagement gameId={gameId} />}
          {activeTab === 'monitoring' && <GameMonitoring gameId={gameId} />}
          {activeTab === 'customers' && <CustomerDataManagement gameId={gameId} />}
          {activeTab === 'reports' && <ExportReports gameId={gameId} />}
        </div>
      </div>
    </div>
  )
}
