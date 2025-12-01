'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Team {
  team_id: string
  team_name: string
  username: string
  game_id: string
  selected_product_id?: string
  funding_stage: 'Pre-Seed' | 'Seed' | 'Series A' | 'Series B' | 'Series C'
  total_balance: number
  successful_rnd_tests: number
  is_active: boolean
}

export interface WeeklyResult {
  id?: string
  week_number: number
  set_price: number
  demand: number
  revenue: number
  costs: number
  profit: number
  rnd_tier?: string
  rnd_success?: boolean
  analytics_purchased: boolean
  investment_tier?: string
  pass_fail_status: string
  bonus_earned: number
}

export interface GameState {
  gameActive: boolean
  currentWeek: number
  totalWeeks: number
  weekDurationMinutes: number
  teams: Team[]
  weekResults: Record<string, WeeklyResult[]>
}

interface GameContextType {
  gameState: GameState
  startGame: (gameId: string, weeks: number, duration: number) => Promise<void>
  stopGame: (gameId: string) => Promise<void>
  createTeam: (gameId: string, teamName: string) => Promise<Team>
  updateTeam: (teamId: string, updates: Partial<Team>) => Promise<void>
  submitWeeklyDecisions: (teamId: string, decisions: Partial<WeeklyResult>) => Promise<WeeklyResult>
  fetchGameData: (gameId: string) => Promise<void>
  loadTeams: (gameId: string) => Promise<void>
}

const GameContext = createContext<GameContextType | undefined>(undefined)

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameState, setGameState] = useState<GameState>({
    gameActive: false,
    currentWeek: 0,
    totalWeeks: 10,
    weekDurationMinutes: 5,
    teams: [],
    weekResults: {},
  })

  const supabase = createClient()

  const startGame = useCallback(async (gameId: string, weeks: number, duration: number) => {
    try {
      const { data, error } = await supabase
        .from('game_settings')
        .update({
          total_weeks: weeks,
          week_duration_minutes: duration,
          current_week: 1,
          game_status: 'active',
        })
        .eq('game_id', gameId)
        .select()
        .single()

      if (error) throw error

      setGameState((prev) => ({
        ...prev,
        gameActive: true,
        totalWeeks: weeks,
        weekDurationMinutes: duration,
        currentWeek: 1,
      }))
    } catch (err) {
      console.error('Error starting game:', err)
    }
  }, [supabase])

  const stopGame = useCallback(async (gameId: string) => {
    try {
      await supabase
        .from('game_settings')
        .update({ game_status: 'completed' })
        .eq('game_id', gameId)

      setGameState((prev) => ({
        ...prev,
        gameActive: false,
      }))
    } catch (err) {
      console.error('Error stopping game:', err)
    }
  }, [supabase])

  const createTeam = useCallback(
    async (gameId: string, teamName: string): Promise<Team> => {
      try {
        const username = `team_${Date.now()}`
        const password = Math.random().toString(36).substring(2, 10)

        const { data, error } = await supabase
          .from('teams')
          .insert({
            game_id: gameId,
            team_name: teamName,
            username,
            password_hash: password,
            total_balance: 0,
            successful_rnd_tests: 0,
            funding_stage: 'Pre-Seed',
          })
          .select()
          .single()

        if (error) throw error

        setGameState((prev) => ({
          ...prev,
          teams: [...prev.teams, data],
        }))

        return data
      } catch (err) {
        console.error('Error creating team:', err)
        throw err
      }
    },
    [supabase]
  )

  const updateTeam = useCallback(
    async (teamId: string, updates: Partial<Team>) => {
      try {
        const { error } = await supabase
          .from('teams')
          .update(updates)
          .eq('team_id', teamId)

        if (error) throw error

        setGameState((prev) => ({
          ...prev,
          teams: prev.teams.map((t) =>
            t.team_id === teamId ? { ...t, ...updates } : t
          ),
        }))
      } catch (err) {
        console.error('Error updating team:', err)
        throw err
      }
    },
    [supabase]
  )

  const submitWeeklyDecisions = useCallback(
    async (teamId: string, decisions: Partial<WeeklyResult>): Promise<WeeklyResult> => {
      try {
        const { data, error } = await supabase
          .from('weekly_results')
          .insert({
            team_id: teamId,
            game_id: gameState.teams.find((t) => t.team_id === teamId)?.game_id,
            week_number: gameState.currentWeek,
            ...decisions,
          })
          .select()
          .single()

        if (error) throw error

        setGameState((prev) => ({
          ...prev,
          weekResults: {
            ...prev.weekResults,
            [teamId]: [...(prev.weekResults[teamId] || []), data],
          },
        }))

        return data
      } catch (err) {
        console.error('Error submitting decisions:', err)
        throw err
      }
    },
    [supabase, gameState.currentWeek, gameState.teams]
  )

  const fetchGameData = useCallback(async (gameId: string) => {
    try {
      const { data: settingsData } = await supabase
        .from('game_settings')
        .select('*')
        .eq('game_id', gameId)
        .single()

      if (settingsData) {
        setGameState((prev) => ({
          ...prev,
          gameActive: settingsData.game_status === 'active',
          currentWeek: settingsData.current_week,
          totalWeeks: settingsData.total_weeks,
          weekDurationMinutes: settingsData.week_duration_minutes,
        }))
      }
    } catch (err) {
      console.error('Error fetching game data:', err)
    }
  }, [supabase])

  const loadTeams = useCallback(async (gameId: string) => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('game_id', gameId)

      if (error) throw error

      setGameState((prev) => ({
        ...prev,
        teams: data || [],
      }))

      // Load week results for all teams
      if (data) {
        const results: Record<string, WeeklyResult[]> = {}
        for (const team of data) {
          const { data: weekData } = await supabase
            .from('weekly_results')
            .select('*')
            .eq('team_id', team.team_id)

          results[team.team_id] = weekData || []
        }
        setGameState((prev) => ({
          ...prev,
          weekResults: results,
        }))
      }
    } catch (err) {
      console.error('Error loading teams:', err)
    }
  }, [supabase])

  const value: GameContextType = {
    gameState,
    startGame,
    stopGame,
    createTeam,
    updateTeam,
    submitWeeklyDecisions,
    fetchGameData,
    loadTeams,
  }

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error('useGame must be used within GameProvider')
  }
  return context
}
