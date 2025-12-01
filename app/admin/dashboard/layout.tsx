import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'admin-control',
  description: 'Admin game control interface',
}

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

