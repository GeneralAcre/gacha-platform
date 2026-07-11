export type Category = 'life' | 'crypto' | 'relationship'

export interface CategoryInfo {
  id: Category
  label: string
  description: string
  symbol: string
  accent: string
  accentSoft: string
}

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'life',
    label: 'Life',
    description: 'Everyday guidance for the path directly ahead.',
    symbol: 'SUN',
    accent: 'border-ink bg-paper text-ink',
    accentSoft: 'border-ink bg-paper text-ink',
  },
  {
    id: 'crypto',
    label: 'Crypto',
    description: 'A reading for momentum, timing, and your bags.',
    symbol: 'SIG',
    accent: 'border-ink bg-[#e7b931] text-ink',
    accentSoft: 'border-ink bg-[#e7b931] text-ink',
  },
  {
    id: 'relationship',
    label: 'Relationship',
    description: 'Guidance for bonds, longing, and honest connection.',
    symbol: 'TWO',
    accent: 'border-ink bg-[#f6aaa8] text-ink',
    accentSoft: 'border-ink bg-[#f6aaa8] text-ink',
  },
]

export function getCategory(category: Category): CategoryInfo {
  return CATEGORIES.find((item) => item.id === category) ?? CATEGORIES[0]
}
