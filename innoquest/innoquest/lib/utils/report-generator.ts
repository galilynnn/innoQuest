import { createClient } from '@/lib/supabase/client'

export interface GameReport {
  gameId: string
  totalWeeks: number
  currentWeek: number
  teams: Array<{
    teamName: string
    finalBalance: number
    fundingStage: string
    rdTestsPassed: number
    passFailStatus: string
  }>
  totalRevenue: number
  averageProfitPerTeam: number
  generatedAt: string
}

export async function generateGameReport(gameId: string): Promise<GameReport> {
  const supabase = createClient()

  // Get game settings
  const { data: settings } = await supabase
    .from('game_settings')
    .select('*')
    .eq('game_id', gameId)
    .single()

  // Get all teams
  const { data: teams } = await supabase
    .from('teams')
    .select('*')
    .eq('game_id', gameId)

  if (!settings || !teams) {
    throw new Error('Game data not found')
  }

  // Calculate summary statistics
  let totalRevenue = 0
  const teamReports = teams.map((team) => {
    totalRevenue += team.total_balance
    return {
      teamName: team.team_name,
      finalBalance: team.total_balance,
      fundingStage: team.funding_stage,
      rdTestsPassed: team.successful_rnd_tests,
      passFailStatus: team.total_balance > 0 ? 'pass' : 'fail',
    }
  })

  return {
    gameId,
    totalWeeks: settings.total_weeks,
    currentWeek: settings.current_week,
    teams: teamReports.sort((a, b) => b.finalBalance - a.finalBalance),
    totalRevenue,
    averageProfitPerTeam: teams.length > 0 ? totalRevenue / teams.length : 0,
    generatedAt: new Date().toISOString(),
  }
}

export function formatReportForPDF(report: GameReport): string {
  let content = `
INNOQUEST - GAME REPORT
===================================

Game Information
-----------------
Weeks Completed: ${report.currentWeek} / ${report.totalWeeks}
Report Generated: ${new Date(report.generatedAt).toLocaleString()}

Final Standings
-----------------
`

  report.teams.forEach((team, index) => {
    content += `
${index + 1}. ${team.teamName}
   Final Balance: $${team.finalBalance.toLocaleString()}
   Funding Stage: ${team.fundingStage}
   R&D Tests Passed: ${team.rdTestsPassed}
   Status: ${team.passFailStatus.toUpperCase()}
`
  })

  content += `
Summary Statistics
--------------------
Total Revenue (All Teams): $${report.totalRevenue.toLocaleString()}
Average Profit per Team: $${Math.round(report.averageProfitPerTeam).toLocaleString()}

`

  return content
}
