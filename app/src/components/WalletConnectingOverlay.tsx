import { useWallet } from '@solana/wallet-adapter-react'

// The wallet-adapter select modal closes itself (and its dark scrim) the instant a
// wallet is clicked, before the extension's own connect popup has opened -- so the
// app flashes back to fully visible for a beat. Keep the same dim backdrop up for the
// duration of `connecting` so the transition into the wallet popup reads as continuous,
// the way other wallet-connect flows handle it.
export function WalletConnectingOverlay() {
  const { connecting } = useWallet()

  if (!connecting) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[rgba(10,10,10,0.5)]"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="rounded-full bg-void px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-paper/80 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.6)]">
        Connecting wallet…
      </div>
    </div>
  )
}
