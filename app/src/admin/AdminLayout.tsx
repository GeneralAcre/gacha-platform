import type { ReactNode } from 'react'

const NAV_ITEMS = [
  { id: 'matches', label: 'Matches' },
  { id: 'live', label: 'Live Control' },
  { id: 'settings', label: 'Settings' },
] as const

export type AdminSection = (typeof NAV_ITEMS)[number]['id']

/** Sidebar + content shell for the admin dashboard. Deliberately styled apart from the
 * consumer app's rounded/soft look (see index.css) — this is an internal, data-dense
 * tool, so it leans into hard borders and flat color instead. `--admin-neon` is scoped
 * to `.admin-scope` in index.css rather than added to the global @theme, so it can't
 * bleed into the public-facing screens. */
export function AdminLayout({
  section,
  onNavigate,
  children,
}: {
  section: AdminSection
  onNavigate: (section: AdminSection) => void
  children: ReactNode
}) {
  return (
    <div className="admin-scope flex min-h-svh bg-[#f4f2ec] font-mono text-ink">
      <aside className="flex w-56 shrink-0 flex-col border-r-[3px] border-ink bg-white">
        <div className="border-b-[3px] border-ink px-4 py-5">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-ink/50">Moment</p>
          <p className="text-lg font-black uppercase leading-tight">Match Admin</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`border-[3px] px-3 py-2 text-left text-xs font-bold uppercase tracking-widest ${
                section === item.id
                  ? 'border-ink bg-[color:var(--admin-neon)] text-ink shadow-[4px_4px_0_0_#0a0a0a]'
                  : 'border-transparent text-ink/60 hover:border-ink hover:text-ink'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="border-t-[3px] border-ink px-4 py-3 text-[10px] uppercase tracking-widest text-ink/50">
          Signed in as Admin
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  )
}
