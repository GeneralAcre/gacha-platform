export type Tab = 'ask' | 'journal'

export function TabBar({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t-4 border-paper/20 bg-ink [padding-bottom:max(0.5rem,env(safe-area-inset-bottom))]">
      <TabButton label="Draw" active={active === 'ask'} onClick={() => onChange('ask')} />
      <TabButton label="Journal" active={active === 'journal'} onClick={() => onChange('journal')} />
    </nav>
  )
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-colors ${
        active ? 'text-flare' : 'text-paper/40'
      }`}
    >
      {label}
    </button>
  )
}
