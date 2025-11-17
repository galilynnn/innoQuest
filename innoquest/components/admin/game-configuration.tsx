'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import LobbyControl from './lobby-control'
import WeekProgression from './week-progression'

interface GameSettings {
  id: string
  game_id: string
  total_weeks: number
  week_duration_minutes: number
  max_teams: number
  game_status: string
  current_week: number
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
  const [loading, setLoading] = useState(true)
  const [gameActive, setGameActive] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      console.log('Loading settings for gameId:', gameId)
      
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
          alert('Error creating game settings: ' + insertError?.message)
        }
      } else {
        alert('Error loading settings: ' + error?.message)
      }
      setLoading(false)
    }

    loadSettings()
  }, [gameId, supabase])

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

    console.log('Saving settings:', { weeks, weekDuration, maxTeams, gameId })

    const { data, error } = await supabase
      .from('game_settings')
      .update({
        total_weeks: weeks,
        week_duration_minutes: weekDuration,
        max_teams: maxTeams,
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
      })

      // Trigger teams management refresh
      if (onSettingsUpdated) {
        onSettingsUpdated()
      }
      
      const goToTeams = confirm('Settings updated successfully! Max teams set to ' + maxTeams + '.\n\nGo to Teams tab now to set up credentials?')
      if (goToTeams && onSwitchToTeams) {
        onSwitchToTeams()
      }
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

        <div className="grid grid-cols-3 gap-6 mb-8">
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

        <div className="flex gap-3 mb-6">
          <button
            onClick={gameActive ? handleStopGame : handleStartGame}
            className="px-6 py-3 bg-[#E63946] text-white font-medium rounded-lg hover:bg-[#C1121F] transition-colors"
          >
            {gameActive ? 'Stop Game' : 'Start Game'}
          </button>
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

      <LobbyControl />
      
      <WeekProgression />

      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-2xl font-serif font-bold mb-4">Session Status</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-secondary p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Current Week</p>
            <p className="text-3xl font-bold text-primary">{settings?.current_week || 0}</p>
          </div>
          <div className="bg-secondary p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Total Weeks</p>
            <p className="text-3xl font-bold">{weeks}</p>
          </div>
          <div className="bg-secondary p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Week Duration</p>
            <p className="text-3xl font-bold">{weekDuration}m</p>
          </div>
          <div className="bg-secondary p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Status</p>
            <p className={`text-lg font-bold ${gameActive ? 'text-green-600' : 'text-muted-foreground'}`}>
              {gameActive ? 'Running' : 'Setup'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
