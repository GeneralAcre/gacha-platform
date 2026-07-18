import { PACK_PRICE_SOL } from './packPayment'

/** Shared "Ready to draw?" confirmation popup for both Event Pack and Match Pack —
 * same white card treatment as the wallet-connect modal, so every purchase confirmation
 * on the site reads the same way instead of the near-black glass panel used elsewhere. */
export function PackPurchaseModal({
  packArt,
  packLabel,
  paying,
  payingLabel,
  onCancel,
  onConfirm,
}: {
  packArt: string
  packLabel: string
  paying: boolean
  payingLabel?: string
  onCancel: () => void
  onConfirm: () => void
}) {
  const titleId = `${packLabel.toLowerCase().replace(/\s+/g, '-')}-title`
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="w-full max-w-sm rounded-3xl border border-ink/10 bg-white p-6 text-center shadow-2xl">
        <img src={packArt} alt={packLabel} className="mx-auto h-36 w-28 rounded-xl bg-black object-contain shadow-lg" />
        <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.28em] text-[#1fae63]">{packLabel}</p>
        <h2 id={titleId} className="mt-2 text-2xl font-black text-ink">
          Ready to draw?
        </h2>
        <p className="mt-3 text-sm leading-6 text-ink/60">
          Pay {PACK_PRICE_SOL.toFixed(2)} devnet SOL to open your {packLabel} and reveal a sealed match moment.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={paying}
            className="flex-1 rounded-full border border-ink/20 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-ink transition-colors hover:bg-ink/5 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={paying}
            className="flex-1 rounded-full bg-[#8fe3b0] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-ink transition-colors hover:bg-[#b1f2cb] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {paying ? (payingLabel ?? 'Confirming...') : `Pay ${PACK_PRICE_SOL.toFixed(2)} SOL`}
          </button>
        </div>
      </div>
    </div>
  )
}
