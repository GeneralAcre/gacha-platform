export function LandingPage({ onStart }: { onStart: () => void }) {
  return (
    <section className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-ink px-4 py-10 sm:px-8 sm:py-14">
        <img
          src="/obsession-landing.png"
          alt="Fortune teller reading a crystal ball"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="relative z-10 mx-auto w-full max-w-2xl translate-y-20 text-center [text-shadow:3px_3px_0_#201839] sm:translate-y-36">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-paper">Provably fair fate</p>
          <h1 className="text-5xl font-black uppercase leading-[0.86] text-paper sm:text-8xl">
            Obsession.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base font-medium text-paper sm:text-lg">
            Ask once. Draw instantly. Follow the signal.
          </p>
          <button onClick={onStart} className="mt-7 border-4 border-paper bg-flare px-8 py-4 text-base font-black uppercase tracking-widest text-ink shadow-[4px_4px_0_#201839] active:translate-y-1">
            Start
          </button>
        </div>
    </section>
  )
}
