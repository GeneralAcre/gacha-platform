import { lazy, Suspense, useState } from 'react'
import { WalletContextProvider } from './components/WalletContextProvider'
import { AppShell } from './components/AppShell'
import { LandingPage } from './components/LandingPage'
import { CategorySelect } from './components/CategorySelect'
import { DrawScreen } from './components/DrawScreen'
import { CollectionScreen } from './components/CollectionScreen'
import { PrivacyPolicyScreen, TermsOfUseScreen } from './components/PolicyScreen'
import type { CardInfo, Rarity } from './components/cardRegistry'
import type { Category } from './components/categories'

type Screen = 'landing' | 'categories' | 'draw' | 'pull' | 'collection' | 'profile' | 'privacy' | 'terms'

// This-session-only "just drew" indicator for the navbar — the real, persistent
// record lives on-chain and is what ProfileScreen reads independently.
interface LastDraw {
  name: string
  rarity: Rarity
}

// Anchor and web3 are only needed once a connected player begins a reading or
// checks their on-chain profile.
const PullScreen = lazy(() => import('./components/PullScreen').then(({ PullScreen }) => ({ default: PullScreen })))
const ProfileScreen = lazy(() => import('./components/ProfileScreen').then(({ ProfileScreen }) => ({ default: ProfileScreen })))

function ObsessionApp() {
  const [screen, setScreen] = useState<Screen>('landing')
  const [category, setCategory] = useState<Category | null>(null)
  const [intention, setIntention] = useState('')
  const [lastDraw, setLastDraw] = useState<LastDraw | null>(null)
  const [focusFaq, setFocusFaq] = useState(false)

  const handleReveal = (card: CardInfo, _drawnCategory: Category) => {
    setLastDraw({ name: card.name, rarity: card.rarity })
  }

  const content = screen === 'landing'
    ? <LandingPage onStart={() => setScreen('categories')} />
    : screen === 'categories'
      ? (
        <CategorySelect
          onSelect={(next, nextIntention) => { setCategory(next); setIntention(nextIntention); setScreen('draw') }}
          onBrowse={() => setScreen('draw')}
          focusFaq={focusFaq}
          onFaqScrolled={() => setFocusFaq(false)}
        />
      )
      : screen === 'draw'
        ? <DrawScreen onSelect={(next) => { setCategory(next); setIntention(''); setScreen('pull') }} />
        : screen === 'collection'
        ? <CollectionScreen />
        : screen === 'profile'
          ? (
            <Suspense fallback={<LoadingReading />}>
              <ProfileScreen />
            </Suspense>
          )
        : screen === 'privacy'
          ? <PrivacyPolicyScreen />
        : screen === 'terms'
          ? <TermsOfUseScreen />
        : category
          ? (
            <Suspense fallback={<LoadingReading />}>
              <PullScreen category={category} intention={intention} onChangeCategory={() => setScreen('draw')} onReveal={handleReveal} />
            </Suspense>
          )
          : <DrawScreen onSelect={(next) => { setCategory(next); setIntention(''); setScreen('pull') }} />

  return (
    <AppShell
      lastDraw={lastDraw}
      onHome={() => setScreen('categories')}
      onDraw={() => setScreen('draw')}
      onCollection={() => setScreen('collection')}
      onProfile={() => setScreen('profile')}
      onFaq={() => { setScreen('categories'); setFocusFaq(true) }}
      onPrivacy={() => setScreen('privacy')}
      onTerms={() => setScreen('terms')}
      showNavbar={screen !== 'landing'}
      showFooter={screen !== 'landing'}
    >
      {content}
    </AppShell>
  )
}

function LoadingReading() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 text-center">
      <p className="text-xs font-black uppercase tracking-widest text-paper/60">Opening Obsession...</p>
    </div>
  )
}

function App() {
  return <WalletContextProvider><ObsessionApp /></WalletContextProvider>
}

export default App
