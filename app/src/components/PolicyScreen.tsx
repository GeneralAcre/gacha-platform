interface PolicySection {
  heading: string
  body: string[]
}

function PolicyScreen({ kicker, title, updated, sections }: { kicker: string; title: string; updated: string; sections: PolicySection[] }) {
  return (
    <div className="w-full flex-1 bg-ink text-paper">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 md:px-6 md:py-14">
      <div className="border-b border-white/10 pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/45">{kicker}</p>
        <h1 className="font-koulen mt-2 text-4xl tracking-tight text-white md:text-5xl">{title}</h1>
        <p className="mt-2 text-xs font-bold uppercase tracking-widest text-white/40">Last updated {updated}</p>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {sections.map((section) => (
          <section key={section.heading} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-sm font-bold uppercase tracking-widest text-flare">{section.heading}</h2>
            <div className="mt-2 flex flex-col gap-2">
              {section.body.map((paragraph, index) => (
                <p key={index} className="text-sm leading-6 text-white/65">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
      </div>
    </div>
  )
}

const UPDATED = 'July 12, 2026'

export function PrivacyPolicyScreen() {
  return (
    <PolicyScreen
      kicker="Your data"
      title="Privacy policy"
      updated={UPDATED}
      sections={[
        {
          heading: 'What we collect',
          body: [
            'Obsession does not collect names, emails, or other personal identifying information. When you connect a wallet, we read your public wallet address to display your draws, journal, and pity progress.',
            'Draw outcomes, transaction signatures, and randomness seeds are recorded on the Solana blockchain and are public by nature — that data is not controlled by us and cannot be deleted once confirmed.',
          ],
        },
        {
          heading: 'Local data',
          body: [
            'Session details such as your current deck, intention text, and recent journal entries are kept in your browser only and are cleared when you disconnect your wallet or clear site data.',
          ],
        },
        {
          heading: 'Third parties',
          body: [
            'We rely on third-party infrastructure to operate — your wallet extension (e.g. Phantom) and Solana RPC providers that relay transactions. Those providers have their own privacy practices, which we do not control.',
          ],
        },
        {
          heading: 'Your choices',
          body: [
            'You can disconnect your wallet at any time to stop any further reads of your address. Because on-chain activity is public and permanent, past draws linked to your wallet cannot be removed from the blockchain itself.',
          ],
        },
        {
          heading: 'Changes to this policy',
          body: ['We may update this policy as the app evolves. Continued use after an update means you accept the revised terms.'],
        },
      ]}
    />
  )
}

export function TermsOfUseScreen() {
  return (
    <PolicyScreen
      kicker="The fine print"
      title="Terms of use"
      updated={UPDATED}
      sections={[
        {
          heading: 'Entertainment only',
          body: [
            'Obsession generates fortune-card readings for entertainment purposes only. Nothing shown in the app is financial, investment, legal, medical, or relationship advice, and no outcome — in-app or in life — is guaranteed.',
          ],
        },
        {
          heading: 'Eligibility',
          body: [
            'You must be able to lawfully hold and transact with a Solana wallet in your jurisdiction to use this app. If you are not of legal age to enter these terms where you live, do not use Obsession.',
          ],
        },
        {
          heading: 'Wallet and blockchain risk',
          body: [
            'Draws are on-chain transactions and are irreversible once confirmed. Network fees are paid from your own wallet. You are solely responsible for the security of your wallet, seed phrase, and private keys — we cannot recover funds lost to a compromised wallet.',
          ],
        },
        {
          heading: 'No guaranteed rarity or outcome',
          body: [
            'Card rarity is resolved by on-chain randomness. While a pity counter bounds how long a Grand Revelation can take, we make no promise about the timing, frequency, or content of any individual draw.',
          ],
        },
        {
          heading: 'Acceptable use',
          body: [
            'You agree not to interfere with the app, attempt to manipulate the randomness or pity system, or use Obsession for any unlawful purpose.',
          ],
        },
        {
          heading: 'Limitation of liability',
          body: [
            'Obsession is provided "as is" without warranties of any kind. To the fullest extent permitted by law, we are not liable for losses arising from your use of the app, including losses related to wallet activity or decisions made based on a reading.',
          ],
        },
        {
          heading: 'Changes to these terms',
          body: ['We may revise these terms from time to time. Continuing to use Obsession after a change constitutes acceptance of the updated terms.'],
        },
      ]}
    />
  )
}
