'use client'

interface StudentHeaderProps {
  team: {
    team_name: string
    successful_rnd_tests: number
  }
  onLogout: () => void
}

export default function StudentHeader({ team, onLogout }: StudentHeaderProps) {
  return (
    <header className="bg-gradient-to-br from-[#E63946] to-[#C1121F] text-white">
      <div className="max-w-7xl mx-auto px-10 py-8">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <div className="font-['Poppins'] font-bold text-2xl tracking-tight">
            InnoQuest
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 px-4 py-2 rounded-xl font-semibold text-sm text-center">
              {team.team_name}
            </div>
            <button
              onClick={onLogout}
              className="bg-white/20 border border-white/30 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all hover:bg-white/30 hover:-translate-y-0.5 flex items-center gap-2"
            >
              <span>🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
