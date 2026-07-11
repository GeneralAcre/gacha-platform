import type { ReactNode } from 'react'
import { Navbar, type NavbarLastDraw, type NavbarStats } from './Navbar'
import { Footer } from './Footer'

export function AppShell({
  children,
  stats,
  lastDraw,
  onHome,
  onDraw,
  onCollection,
  onProfile,
  onFaq,
  onPrivacy,
  onTerms,
  showNavbar = true,
  showFooter = true,
}: {
  children: ReactNode
  stats: NavbarStats | null
  lastDraw: NavbarLastDraw | null
  onHome: () => void
  onDraw: () => void
  onCollection: () => void
  onProfile: () => void
  onFaq: () => void
  onPrivacy: () => void
  onTerms: () => void
  showNavbar?: boolean
  showFooter?: boolean
}) {
  return (
    <div className="flex min-h-svh min-w-0 flex-col overflow-x-hidden bg-flare text-ink">
      {showNavbar && <Navbar stats={stats} lastDraw={lastDraw} onHome={onHome} onDraw={onDraw} onCollection={onCollection} onProfile={onProfile} />}
      <main className="flex flex-1 flex-col">{children}</main>
      {showFooter && (
        <Footer onHome={onHome} onDraw={onDraw} onCollection={onCollection} onProfile={onProfile} onFaq={onFaq} onPrivacy={onPrivacy} onTerms={onTerms} />
      )}
    </div>
  )
}
