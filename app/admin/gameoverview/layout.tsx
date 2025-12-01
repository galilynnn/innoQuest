import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'admin-overview',
  description: 'Admin game overview interface',
}

export default function GameOverviewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

