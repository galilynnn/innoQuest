'use client'

import { useState } from 'react'
import { generateGameReport, formatReportForPDF } from '@/lib/utils/report-generator'

interface ExportReportsProps {
  gameId: string
}

export default function ExportReports({ gameId }: ExportReportsProps) {
  const [loading, setLoading] = useState(false)

  const handleExportPDF = async () => {
    setLoading(true)
    try {
      const report = await generateGameReport(gameId)
      const content = formatReportForPDF(report)

      // Create blob and download
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `game-report-${gameId}-${Date.now()}.txt`
      link.click()
      URL.revokeObjectURL(url)

      alert('Report exported successfully!')
    } catch (error) {
      alert('Failed to export report')
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = async () => {
    setLoading(true)
    try {
      const report = await generateGameReport(gameId)

      let csv = 'Team Name,Final Balance,Funding Stage,R&D Tests Passed,Statusn'
      report.teams.forEach((team) => {
        csv += `"${team.teamName}",${team.finalBalance},"${team.fundingStage}",${team.rdTestsPassed},"${team.passFailStatus}"n`
      })

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `game-results-${gameId}-${Date.now()}.csv`
      link.click()
      URL.revokeObjectURL(url)

      alert('CSV exported successfully!')
    } catch (error) {
      alert('Failed to export CSV')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-serif font-bold mb-4">Export Reports</h3>
      <div className="flex gap-3">
        <button
          onClick={handleExportPDF}
          disabled={loading}
          className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          {loading ? 'Exporting...' : 'Export as Text Report'}
        </button>
        <button
          onClick={handleExportCSV}
          disabled={loading}
          className="px-6 py-2 bg-secondary text-foreground font-medium rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
        >
          {loading ? 'Exporting...' : 'Export as CSV'}
        </button>
      </div>
    </div>
  )
}
