function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.333-1.754-1.333-1.754-1.089-.744.084-.729.084-.729 1.205.084 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.605-2.665-.303-5.466-1.332-5.466-5.93 0-1.31.469-2.38 1.236-3.22-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.301 1.23A11.5 11.5 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.873.118 3.176.77.84 1.235 1.91 1.235 3.22 0 4.61-2.807 5.625-5.479 5.921.43.372.823 1.102.823 2.222 0 1.604-.014 2.896-.014 3.286 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12z" />
    </svg>
  )
}

function FooterHeading({ children }: { children: string }) {
  return <p className="text-[11px] font-black uppercase tracking-[0.2em] text-paper/45">{children}</p>
}

function FooterLink({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick} className="block text-left text-sm font-bold text-paper/80 hover:text-flare">
      {children}
    </button>
  )
}

export function Footer({
  onHome,
  onDraw,
  onCollection,
  onProfile,
  onFaq,
  onPrivacy,
  onTerms,
}: {
  onHome: () => void
  onDraw: () => void
  onCollection: () => void
  onProfile: () => void
  onFaq: () => void
  onPrivacy: () => void
  onTerms: () => void
}) {
  return (
    <footer className="border-t-4 border-ink bg-ink text-paper [padding-bottom:env(safe-area-inset-bottom)]">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 px-4 py-10 sm:grid-cols-4 sm:px-6">
        <div className="col-span-2 sm:col-span-1">
          <FooterHeading>Contact &amp; support</FooterHeading>
          <form onSubmit={(event) => event.preventDefault()} className="mt-4 flex flex-col gap-4">
            <input
              type="text"
              placeholder="name"
              className="border-b-2 border-paper/20 bg-transparent pb-2 text-sm text-paper placeholder:text-paper/40 focus:border-flare focus:outline-none"
            />
            <input
              type="email"
              placeholder="email"
              className="border-b-2 border-paper/20 bg-transparent pb-2 text-sm text-paper placeholder:text-paper/40 focus:border-flare focus:outline-none"
            />
            <textarea
              placeholder="message"
              rows={2}
              className="resize-none border-b-2 border-paper/20 bg-transparent pb-2 text-sm text-paper placeholder:text-paper/40 focus:border-flare focus:outline-none"
            />
            <button type="submit" className="mt-1 border-4 border-paper bg-flare px-4 py-3 text-xs font-black uppercase tracking-widest text-ink">
              Send
            </button>
          </form>
        </div>

        <div>
          <FooterHeading>Navigation</FooterHeading>
          <div className="mt-4 flex flex-col gap-3">
            <FooterLink onClick={onHome}>Home</FooterLink>
            <FooterLink onClick={onDraw}>Draw</FooterLink>
            <FooterLink onClick={onCollection}>Collection</FooterLink>
            <FooterLink onClick={onProfile}>Profile</FooterLink>
          </div>
        </div>

        <div>
          <FooterHeading>Legal</FooterHeading>
          <div className="mt-4 flex flex-col gap-3">
            <FooterLink onClick={onFaq}>FAQ</FooterLink>
            <FooterLink onClick={onPrivacy}>Privacy Policy</FooterLink>
            <FooterLink onClick={onTerms}>Terms of Use</FooterLink>
          </div>
        </div>

        <div>
          <FooterHeading>Social</FooterHeading>
          <div className="mt-4 flex gap-3">
            <button type="button" aria-label="X" className="flex h-11 w-11 items-center justify-center border-2 border-paper/30 text-paper/70 hover:border-flare hover:text-flare">
              <XIcon />
            </button>
            <button type="button" aria-label="GitHub" className="flex h-11 w-11 items-center justify-center border-2 border-paper/30 text-paper/70 hover:border-flare hover:text-flare">
              <GitHubIcon />
            </button>
          </div>
        </div>
      </div>

      <div className="border-t-2 border-paper/10 px-4 py-8 sm:px-6">
        <p className="mx-auto max-w-xl text-center text-xs leading-6 text-paper/50 sm:text-sm">
          Obsession is a fully on-chain fortune-card gacha on Solana — draw sealed cards, follow your reading, and grow your collection.
          For entertainment only. Not financial, legal, or relationship advice.
        </p>
        <div className="mx-auto mt-5 flex w-fit items-center gap-2 border-2 border-paper/25 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-paper/60">
          <span>Powered by</span>
          <img src="/MagicBlock-Logo-White.png" alt="MagicBlock" className="h-4 w-auto" />
        </div>
      </div>
    </footer>
  )
}
