import { useState } from 'react'

interface FaqItem {
  question: string
  answer: string
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'What is Moment?',
    answer:
      'Moment is a gacha-style card platform built on real World Cup 2026 match data. Instead of random loot, every card is tied to something that actually happened: a real win-probability swing detected in a live match, or a verified historical result — sealed on Solana devnet the instant it happens.',
  },
  {
    question: 'Is this real money?',
    answer:
      'No. Everything runs on Solana devnet, a free test network. Devnet SOL has no real-world value and can\'t be exchanged for anything — it exists purely so the app can demonstrate real, working on-chain transactions without any real financial risk.',
  },
  {
    question: 'How do I get devnet SOL to try it?',
    answer:
      'Connect a Solana wallet (like Phantom) and switch it to Devnet, then use a public devnet faucet to request free test SOL. It has no real value, so there\'s no cost or risk to experimenting.',
  },
  {
    question: 'What\'s the difference between Event Pack and Match Pack?',
    answer:
      'They pull from the exact same real (or freshly-sealed) Moment queue and the same claim-as-NFT flow — the only difference is the card art and theme. Event Pack uses a referee/VAR-styled card face; Match Pack uses a stadium-styled card face and additionally shows a browsable archive of the full World Cup 2026 knockout collection below the draw panel.',
  },
  {
    question: 'What does "sealed on devnet" mean?',
    answer:
      'When a real odds swing (a 20+ point move, or the market favorite flipping) is detected in a live match, the backend writes that event to Solana devnet as a memo transaction — a permanent, publicly verifiable on-chain record of exactly when and what happened. Opening a pack reveals one of these sealed Moments.',
  },
  {
    question: 'What happens if no real swing is available when I pay?',
    answer:
      'You\'re never left with nothing to open. If a real live-match swing is already queued, that\'s what you get. If none is queued at that moment, the backend seals a fresh Moment on demand through the same real on-chain pipeline — so every purchase always produces a card.',
  },
  {
    question: 'Can I actually own the card I draw?',
    answer:
      'Yes. After revealing a card, you can claim it as an NFT — a real mint transaction on Solana devnet that puts the token in your wallet. Claiming is only available for the pack you personally paid to open, not for other Moments you\'re just browsing in the live feed.',
  },
  {
    question: 'Can I sell or trade my cards?',
    answer:
      'Yes. Once claimed, you can list a card for sale at any price you choose from your Profile — it\'s escrowed on-chain until someone buys it or you cancel the listing. The Marketplace page shows every active listing from every player.',
  },
  {
    question: 'What\'s the difference between Collection and Profile?',
    answer:
      'Collection is the full public archive — every World Cup 2026 knockout match on the site, browsable by anyone, whether they\'ve drawn it or not. Profile is personal — only the cards you\'ve actually claimed as NFTs, plus anything you currently have listed for sale.',
  },
  {
    question: 'Why do Player Pack and Mixed Pack say "Coming Soon"?',
    answer:
      'Those packs aren\'t live yet. Only Event Pack and Match Pack are currently open for drawing — the others will be enabled once their odds and card pools are finalized.',
  },
  {
    question: 'Is this financial or gambling advice?',
    answer:
      'No. Moment is provided for entertainment and demonstration purposes only, running entirely on devnet with no real-money value. Nothing here is financial, investment, or gambling advice.',
  },
]

function FaqRow({ item, open, onToggle }: { item: FaqItem; open: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-sm font-bold text-white">{item.question}</span>
        <span className="shrink-0 text-white/40">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <p className="px-5 pb-4 text-sm leading-6 text-white/65">{item.answer}</p>
      )}
    </div>
  )
}

export function FaqScreen() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div className="w-full flex-1 bg-ink text-paper">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 md:px-6 md:py-14">
      <div className="border-b border-white/10 pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/45">Questions</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-white md:text-5xl">FAQ</h1>
        <p className="mt-2 text-sm text-white/55">Common questions about how Moment actually works.</p>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {FAQ_ITEMS.map((item, index) => (
          <FaqRow
            key={item.question}
            item={item}
            open={openIndex === index}
            onToggle={() => setOpenIndex((current) => (current === index ? null : index))}
          />
        ))}
      </div>
      </div>
    </div>
  )
}
