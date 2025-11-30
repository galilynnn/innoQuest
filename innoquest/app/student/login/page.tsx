'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function StudentLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    console.log('🔐 Login attempt started')
    console.log('📝 Username:', username)

    try {
      const supabase = createClient()

      // Query teams table to find matching username AND password
      console.log('🔍 Querying teams table...')
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('team_id, team_name, game_id, username, password_hash')
        .eq('username', username)
        .eq('password_hash', password)
        .single()

      console.log('📊 Query result:', { team, teamError })

      if (teamError || !team) {
        console.log('❌ Login failed: Invalid credentials')
        setError('Invalid username or password. Please check your credentials.')
        setLoading(false)
        return
      }

      console.log('✅ Team found:', team.team_name, 'Game ID:', team.game_id)

      // Update last_activity to track login
      console.log('📝 Updating last_activity...')
      await supabase
        .from('teams')
        .update({ 
          last_activity: new Date().toISOString(),
          is_active: true 
        })
        .eq('team_id', team.team_id)

      // Login successful - show welcome message
      alert(`Hello ${team.team_name}! Welcome to InnoQuest.`)

      // Create session by storing team info
      console.log('💾 Storing session data...')
      sessionStorage.setItem('team_id', team.team_id)
      sessionStorage.setItem('team_name', team.team_name)
      sessionStorage.setItem('game_id', team.game_id)

      console.log('✅ Session stored:', {
        team_id: team.team_id,
        team_name: team.team_name,
        game_id: team.game_id
      })

      // Check game status to determine where to redirect
      console.log('🔍 Checking game status...')
      const { data: gameSettings, error: gameError } = await supabase
        .from('game_settings')
        .select('game_status')
        .eq('game_id', team.game_id)
        .single()

      console.log('📊 Game settings:', { gameSettings, gameError })

      if (gameError) {
        console.error('❌ Error fetching game settings:', gameError)
      }

      // Redirect based on game status
      if (gameSettings?.game_status === 'active') {
        console.log('🎮 Game is active, redirecting to gameplay')
        alert(`DEBUG: Login successful! Game status is '${gameSettings.game_status}'. Will redirect to gameplay.`)
        window.location.href = '/student/gameplay'
      } else {
        // Game in lobby or not started yet
        console.log('📋 Game not active (status: ' + gameSettings?.game_status + '), redirecting to lobby')
        alert(`DEBUG: Login successful! Game status is '${gameSettings?.game_status}'. Will redirect to lobby.`)
        window.location.href = '/student/lobby'
      }
    } catch (err) {
      console.error('❌ Login exception:', err)
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-serif font-bold text-gray-900 mb-2">
            Student Login
          </h1>
          <p className="text-gray-600">Enter your team credentials</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="username" className="block text-sm font-medium mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your team username"
              className="w-full px-4 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="text-center mt-6">
          <a href="/" className="text-sm text-primary hover:underline">
            Back to Home
          </a>
        </div>
      </div>
    </div>
  )
}
