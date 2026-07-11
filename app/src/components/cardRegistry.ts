import type { Category } from './categories'

export type Rarity = 'minor' | 'major' | 'grand'

export interface CardInfo {
  id: number
  name: string
  reading: string
  image: string
  rarity: Rarity
}

type CardCopy = Pick<CardInfo, 'name' | 'reading'>
type Pool = Record<Rarity, CardCopy[]>

// The chain supplies rarity and seed. Category only chooses this client-side reading pool.
const POOLS: Record<Category, Pool> = {
  life: {
    minor: [
      { name: 'Open Window', reading: 'A small change of air clears a thought you have been carrying too long.' },
      { name: 'Second Bell', reading: 'The invitation returns. This time, answer it.' },
      { name: 'Loose Thread', reading: 'Pull gently. What unravels has already served its purpose.' },
    ],
    major: [
      { name: 'The Long Table', reading: 'Make room for the people who make ordinary days feel possible.' },
      { name: 'Northbound', reading: 'A decision made slowly becomes the direction you needed.' },
      { name: 'Clear Water', reading: 'The truth is simple once you stop asking it to be convenient.' },
    ],
    grand: [
      { name: 'The First Light', reading: 'A new chapter is already underway. Step into it before certainty arrives.' },
      { name: 'The Unbroken Path', reading: 'What felt scattered is arranging itself into a route only you can walk.' },
      { name: 'Golden Hour', reading: 'Say yes to the opening. It will not remain open forever.' },
    ],
  },
  crypto: {
    minor: [
      { name: 'Green Candle', reading: 'Momentum is real, but it is not a promise. Keep your size sensible.' },
      { name: 'Cold Wallet', reading: 'Patience protects more value than panic ever creates.' },
      { name: 'Sideways Moon', reading: 'Nothing moves until it does. Use the quiet to sharpen your thesis.' },
    ],
    major: [
      { name: 'Signal Over Noise', reading: 'Ignore the room. The useful information is hiding in the boring part.' },
      { name: 'The Liquidity Tide', reading: 'Timing matters, but a plan matters more when the tide turns.' },
      { name: 'Conviction Test', reading: 'Your position is asking what you actually believe, not what you posted.' },
    ],
    grand: [
      { name: 'Block Zero', reading: 'A conviction becomes a beginning. Move with purpose, not euphoria.' },
      { name: 'The Open Ledger', reading: 'The pattern reveals itself. Read it closely, then act once.' },
      { name: 'Full Send, Soft Hands', reading: 'Boldness earns its place when it is paired with a clear exit.' },
    ],
  },
  relationship: {
    minor: [
      { name: 'Shared Silence', reading: 'Not every pause is distance. Let the moment breathe.' },
      { name: 'Open Hand', reading: 'Offer the honest version before you offer the polished one.' },
      { name: 'Returned Song', reading: 'A familiar feeling is asking for a new response.' },
    ],
    major: [
      { name: 'Two Lanterns', reading: 'Connection grows when both people can be seen without performing.' },
      { name: 'The Honest Mirror', reading: 'Say the difficult thing with care. It has waited long enough.' },
      { name: 'Tide Between Us', reading: 'Distance clarifies what closeness was trying to tell you.' },
    ],
    grand: [
      { name: 'The Joining Star', reading: 'A bond shifts from possibility to practice. Meet it with courage.' },
      { name: 'Heartline', reading: 'Choose the relationship that lets you become more yourself.' },
      { name: 'The Kept Promise', reading: 'What is meant to endure now asks for your full presence.' },
    ],
  },
}

const RARITY_MAP: Rarity[] = ['minor', 'major', 'grand']

export function resolveCard(category: Category, rarityByte: number, cardSeed: number): CardInfo {
  const rarity = RARITY_MAP[rarityByte] ?? 'minor'
  const pool = POOLS[category][rarity]
  const item = pool[cardSeed % pool.length]
  return { ...item, id: rarityByte * 1000 + cardSeed, image: `/cards/${category}-${rarity}.svg`, rarity }
}

export function getCollectionCards(): { category: Category; card: CardInfo }[] {
  return (Object.keys(POOLS) as Category[]).flatMap((category) =>
    RARITY_MAP.flatMap((rarity, rarityIndex) =>
      POOLS[category][rarity].map((item, index) => ({
        category,
        card: {
          ...item,
          id: rarityIndex * 100 + index,
          image: `/cards/${category}-${rarity}.svg`,
          rarity,
        },
      }))
    )
  )
}
