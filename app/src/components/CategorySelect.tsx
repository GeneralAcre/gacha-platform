import { useEffect, useRef, useState } from 'react'
import { CATEGORIES, type Category } from './categories'

const DECK_DETAILS: Record<Category, { type: string; prompt: string; note: string }> = {
  life: {
    type: 'Everyday omens',
    prompt: 'For crossroads, routines, and the next small sign.',
    note: 'Minor signs to Grand Revelations',
  },
  crypto: {
    type: 'Market omens',
    prompt: 'For timing, conviction, and keeping your bags grounded.',
    note: 'Signal cards for volatile weeks',
  },
  relationship: {
    type: 'Heart omens',
    prompt: 'For bonds, conversations, longing, and connection.',
    note: 'Readings for you and your orbit',
  },
}

const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: 'What is Obsession?',
    answer:
      "Obsession is a gacha-style fortune card app on Solana. Connect a wallet, choose a deck — Life, Crypto, or Relationship — and draw a sealed card for an instant reading.",
  },
  {
    question: 'How do card rarities work?',
    answer:
      'Every deck has three rarity tiers: Minor Omen, Major Omen, and Grand Revelation. A pity counter guarantees at least one Grand Revelation within 50 draws, so a long dry streak always resolves.',
  },
  {
    question: 'Is a draw provably fair?',
    answer:
      'Yes. Rarity and card seed are resolved on-chain from a verifiable random source, not chosen client-side. The app only picks which local reading text to display for the rarity the chain returned.',
  },
  {
    question: 'Do I need a wallet to draw?',
    answer:
      'Yes. Connect a Solana wallet (Phantom and other wallet-adapter compatible wallets are supported) to submit a draw. Network fees apply and are paid from your wallet.',
  },
  {
    question: 'Can I pull the same card more than once?',
    answer:
      "Yes. Each deck's reading pool is reshuffled on every draw within the rarity the chain returns, so repeats are expected over time — that is normal gacha behavior, not a bug.",
  },
  {
    question: 'Are the readings real advice?',
    answer:
      'No. Every card is entertainment only. Nothing in Obsession is financial, legal, medical, or relationship advice, and no outcome is guaranteed.',
  },
  {
    question: 'Where can I see every possible card?',
    answer: 'Open Collection from the navbar to browse the full set for every deck and tap any card for its full reading.',
  },
  {
    question: 'Where is my draw history?',
    answer: 'Your past draws live in Profile, tied to the connected wallet for the current session.',
  },
]

export function CategorySelect({
  onSelect,
  focusFaq = false,
  onFaqScrolled,
}: {
  onSelect: (category: Category, intention: string) => void
  focusFaq?: boolean
  onFaqScrolled?: () => void
}) {
  const [intention, setIntention] = useState('')
  const faqRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (focusFaq && faqRef.current) {
      faqRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      onFaqScrolled?.()
    }
  }, [focusFaq, onFaqScrolled])

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <section className="grid overflow-hidden border-4 border-ink bg-paper md:grid-cols-[0.82fr_1.18fr]">
        <div className="relative min-h-72 overflow-hidden border-b-4 border-ink md:min-h-[23rem] md:border-b-0 md:border-r-4">
          <img src="/obsession-landing.png" alt="Madame Obsession, keeper of the fortune decks" className="absolute inset-0 h-full w-full object-cover object-[50%_24%]" />
          <div className="absolute inset-x-0 bottom-0 bg-ink px-4 py-3 text-paper">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-flare">Your reader</p>
            <p className="mt-1 text-xl font-black uppercase">Madame Obsession</p>
          </div>
        </div>
        <div className="flex flex-col justify-between p-5 sm:p-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-flare">The fortune parlor</p>
            <h1 className="mt-3 max-w-xl text-4xl font-black uppercase leading-none text-ink sm:text-5xl">
              Choose the deck that holds your question.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-ink/75 sm:text-base">
              Madame Obsession keeps three sealed gacha decks. Choose a card type, spin once, and receive a rarity-ranked reading drawn by MagicBlock VRF.
            </p>
          </div>
          <div className="mt-7 grid border-2 border-ink sm:grid-cols-3">
            <ParlorFact number="01" label="Choose deck" />
            <ParlorFact number="02" label="Spin capsule" />
            <ParlorFact number="03" label="Reveal omen" />
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-ink/70">Select card type</p>
            <h2 className="mt-2 text-3xl font-black uppercase text-ink sm:text-4xl">What do you want to know?</h2>
          </div>
          <p className="max-w-xs text-sm text-ink/70">Every deck has Minor, Major, and Grand Revelation pulls.</p>
        </div>
        <label className="mt-5 block border-2 border-ink bg-paper p-3">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-ink/65">Set an intention for this pull</span>
          <input
            value={intention}
            onChange={(event) => setIntention(event.target.value)}
            placeholder="What do you want clarity on?"
            maxLength={120}
            className="mt-2 w-full border-b-2 border-ink bg-transparent pb-2 text-base font-bold text-ink outline-none placeholder:text-ink/45"
          />
        </label>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {CATEGORIES.map((category, index) => {
            const deck = DECK_DETAILS[category.id]
            return (
              <button
                key={category.id}
                onClick={() => onSelect(category.id, intention.trim())}
                className={`group flex min-h-72 flex-col border-4 p-5 text-left shadow-[6px_6px_0_#18171b] transition-transform hover:-translate-y-1 active:translate-y-1 active:shadow-none ${category.accentSoft}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={`inline-flex h-12 w-12 items-center justify-center border-2 text-xs font-black ${category.accent}`}>
                    {category.symbol}
                  </span>
                  <span className="text-xs font-black text-ink/55">0{index + 1}</span>
                </div>
                <p className="mt-7 text-[10px] font-black uppercase tracking-[0.18em] text-ink/65">{deck.type}</p>
                <div className="mt-2 text-3xl font-black uppercase text-ink">{category.label}</div>
                <p className="mt-3 max-w-xs text-sm font-medium leading-5 text-ink/75">{deck.prompt}</p>
                <div className="mt-auto border-t-2 border-ink/30 pt-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-ink/60">{deck.note}</p>
                  <p className="mt-2 text-xs font-black uppercase tracking-widest text-ink">Choose this deck +</p>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <section className="mt-10 grid overflow-hidden border-4 border-ink bg-ink text-paper md:grid-cols-[0.9fr_1.1fr]">
        <img src="/obsession-landing.png" alt="The fortune parlor at Obsession" className="h-64 w-full object-cover object-[50%_72%] md:h-full" />
        <div className="p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-flare">The story</p>
          <h2 className="mt-3 text-3xl font-black uppercase leading-none sm:text-4xl">Every question becomes a keepsake.</h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-paper/75">
            Madame Obsession gathers stray hopes, market hunches, and heart-shaped doubts into sealed capsule decks. Each pull reveals one original fortune card for your collection.
          </p>
          <p className="mt-4 text-xs font-black uppercase tracking-widest text-paper/60">Collect the signs. Return when the answer changes.</p>
        </div>
      </section>

      <section ref={faqRef} className="mt-10">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-ink/70">Need to know</p>
        <h2 className="mt-2 text-3xl font-black uppercase text-ink sm:text-4xl">Frequently asked questions</h2>

        <div className="mt-5 flex flex-col gap-3">
          {FAQ_ITEMS.map((item) => (
            <FaqItem key={item.question} question={item.question} answer={item.answer} />
          ))}
        </div>
      </section>
    </div>
  )
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div className="border-4 border-ink bg-paper shadow-[5px_5px_0_#18171b]">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 p-4 text-left"
      >
        <span className="text-sm font-black uppercase leading-tight text-ink sm:text-base">{question}</span>
        <span className="shrink-0 text-xl font-black text-flare">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && <p className="border-t-2 border-ink/15 p-4 pt-3 text-sm leading-6 text-ink/75">{answer}</p>}
    </div>
  )
}

function ParlorFact({ number, label }: { number: string; label: string }) {
  return (
    <div className="border-b-2 border-ink/25 p-3 last:border-b-0 sm:border-b-0 sm:border-r-2 sm:last:border-r-0">
      <span className="text-[10px] font-black text-flare">{number}</span>
      <p className="mt-1 text-xs font-black uppercase text-ink">{label}</p>
    </div>
  )
}
