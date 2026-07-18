import { lazy, Suspense, useState } from 'react'
import { WalletContextProvider } from './components/WalletContextProvider'
import { AppShell } from './components/AppShell'
import { LandingPage } from './components/LandingPage'
import { PrivacyPolicyScreen, TermsOfUseScreen } from './components/PolicyScreen'
import { PlatformHome } from './PlatformHome'

type Screen = 'landing' | 'platform' | 'worldcup' | 'profile' | 'marketplace' | 'privacy' | 'terms'

const WorldCupPullScreen = lazy(() =>
  import('./decks/worldcup/WorldCupPullScreen').then(({ WorldCupPullScreen }) => ({ default: WorldCupPullScreen }))
)
const ProfileScreen = lazy(() => import('./components/ProfileScreen').then(({ ProfileScreen }) => ({ default: ProfileScreen })))
const MarketplaceScreen = lazy(() =>
  import('./decks/marketplace/MarketplaceScreen').then(({ MarketplaceScreen }) => ({ default: MarketplaceScreen }))
)

function MomentApp() {
  const [screen, setScreen] = useState<Screen>('landing')

  const content = screen === 'landing'
    ? <LandingPage onDraw={() => setScreen('worldcup')} />
    : screen === 'platform'
      ? <PlatformHome onSelect={() => setScreen('worldcup')} />
      : screen === 'worldcup'
        ? <Suspense fallback={<LoadingScreen />}><WorldCupPullScreen /></Suspense>
        : screen === 'profile'
          ? <Suspense fallback={<LoadingScreen />}><ProfileScreen /></Suspense>
          : screen === 'marketplace'
            ? <Suspense fallback={<LoadingScreen />}><MarketplaceScreen /></Suspense>
            : screen === 'privacy'
              ? <PrivacyPolicyScreen />
              : screen === 'terms'
                ? <TermsOfUseScreen />
                : <PlatformHome onSelect={() => setScreen('worldcup')} />

  return (
    <AppShell
      lastDraw={null}
      onHome={() => setScreen('landing')}
      onDraw={() => setScreen('worldcup')}
      onCollection={() => setScreen('profile')}
      onProfile={() => setScreen('profile')}
      onMarketplace={() => setScreen('marketplace')}
      onFaq={() => setScreen('platform')}
      onPrivacy={() => setScreen('privacy')}
      onTerms={() => setScreen('terms')}
      showFooter={screen !== 'landing'}
    >
      {content}
    </AppShell>
  )
}

function LoadingScreen() {
  return <div className="flex flex-1 items-center justify-center px-6 text-center"><p className="text-xs font-black uppercase tracking-widest text-paper/60">Opening Moment...</p></div>
}

export default function App() {
  return <WalletContextProvider><MomentApp /></WalletContextProvider>
}
