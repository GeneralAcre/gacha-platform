import { FeaturedDraws } from './FeaturedDraws'

const FEATURES = [
  {
    title: 'Sealed on-chain draw',
    description: 'Every pull is a real Solana transaction — resolved on MagicBlock’s Ephemeral Rollup, not a client-side random roll.',
  },
  {
    title: 'Verifiable randomness',
    description: 'Rarity and card seed come from an oracle VRF you can check on-chain — no house thumb on the scale.',
  },
  {
    title: 'Mint as a real NFT',
    description: 'Claim any pull as an SPL token on the base layer — durable, transferable, visible in any Solana wallet.',
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

      <section className="mx-auto w-full max-w-6xl px-4 pb-14 pt-2 md:px-6 md:pb-20">
        <div className="grid gap-8 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="flex flex-col items-start gap-3">
              <p className="text-lg font-black uppercase tracking-wide text-paper">{feature.title}</p>
              <p className="text-base leading-7 text-paper/55">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <FeaturedDraws onDraw={onDraw} />
    </div>
  )
}
