import { FeaturedDraws } from './FeaturedDraws'

const FEATURES = [
  {
    title: 'Sealed on-chain draw',
    description: 'Every pull is a real Solana transaction — resolved on MagicBlock’s Ephemeral Rollup, not a client-side random roll.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="10.5" width="14" height="9" rx="1.5" />
        <path d="M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5" />
      </svg>
    ),
  },
  {
    title: 'Verifiable randomness',
    description: 'Rarity and card seed come from an oracle VRF you can check on-chain — no house thumb on the scale.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2.5 20.5 8v8L12 21.5 3.5 16V8L12 2.5Z" />
        <path d="M12 2.5V12M20.5 8 12 12 3.5 8M12 21.5V12" />
      </svg>
    ),
  },
  {
    title: 'Mint as a real NFT',
    description: 'Claim any pull as an SPL token on the base layer — durable, transferable, visible in any Solana wallet.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <circle cx="9.5" cy="9.5" r="1.8" />
        <path d="m5 17 4.5-4.5c.7-.7 1.8-.7 2.5 0L19 19" />
      </svg>
    ),
  },
]

export function LandingPage({ onDraw }: { onDraw: () => void }) {
  return (
    <div className="bg-ink">
      <section className="relative flex min-h-[62svh] w-full items-center justify-center overflow-hidden px-5 py-10 md:px-8 md:py-14">
        <div className="absolute inset-0" aria-hidden="true">
          <img src="/page-cover.png" alt="" className="h-full w-full object-cover object-center" />
          <div className="absolute inset-0 bg-ink/55" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-ink/25" />
        </div>
        <div className="relative z-10 mx-auto w-full max-w-2xl text-center text-paper">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#8fe3b0] sm:text-xs">Every moment matters</p>
          <h1 className="mt-4 text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-5xl md:text-6xl">Capture the moments that move the match.</h1>
          <p className="mx-auto mt-5 max-w-lg text-sm font-medium leading-relaxed text-paper/85 sm:text-base lg:text-lg">Draw collectible match moments, then keep the plays you will never forget.</p>
        </div>
      </section>

      <FeaturedDraws onDraw={onDraw} />

      <section className="mx-auto w-full max-w-6xl px-4 pb-14 pt-2 md:px-6 md:pb-20">
        <div className="grid gap-6 rounded-3xl border border-paper/10 bg-void p-6 sm:grid-cols-3 md:p-8">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="flex flex-col items-start gap-3">
              <span className="text-flare">{feature.icon}</span>
              <p className="text-xs font-bold uppercase tracking-widest text-paper">{feature.title}</p>
              <p className="text-sm leading-6 text-paper/55">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
