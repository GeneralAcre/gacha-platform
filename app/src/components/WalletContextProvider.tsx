import { type FC, type ReactNode, useMemo } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { clusterApiUrl } from '@solana/web3.js'
import {
  createDefaultAuthorizationCache,
  createDefaultChainSelector,
  createDefaultWalletNotFoundHandler,
  registerMwa,
} from '@solana-mobile/wallet-standard-mobile'
import '@solana/wallet-adapter-react-ui/styles.css'

// Register the current MWA web implementation before WalletProvider discovers wallets.
// This runs only in the browser and persists Seeker wallet authorization between sessions.
// Inside the Capacitor APK the WebView origin is https://localhost, which wallets would
// show as the dapp identity — use the deployed site instead so approval prompts look right.
const nativeShell = globalThis.location?.origin === 'https://localhost'
registerMwa({
  appIdentity: {
    name: 'Moment',
    uri: nativeShell ? 'https://gacha-er.vercel.app' : (globalThis.location?.origin ?? 'https://obsession.app'),
    icon: '/favicon.svg',
  },
  authorizationCache: createDefaultAuthorizationCache(),
  chains: ['solana:devnet'],
  chainSelector: createDefaultChainSelector(),
  onWalletNotFound: createDefaultWalletNotFoundHandler(),
})

export const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const endpoint = useMemo(() => clusterApiUrl('devnet'), [])
  // MWA is registered above as a Wallet Standard wallet; desktop standard wallets remain discoverable.
  const wallets = useMemo(() => [], [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
