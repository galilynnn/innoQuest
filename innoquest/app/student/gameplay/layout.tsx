import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Startup Odyssey',
  description: 'Student gameplay interface',
}

export default function GameplayLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

