'use client'

interface AdminHeaderProps {
  onLogout: () => void
}

export default function AdminHeader({ onLogout }: AdminHeaderProps) {
  return (
    <header className="border-b border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-primary">InnoQuest Admin</h2>
          <p className="text-sm text-muted-foreground">Administrator</p>
        </div>
        <button
          onClick={onLogout}
          className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  )
}
