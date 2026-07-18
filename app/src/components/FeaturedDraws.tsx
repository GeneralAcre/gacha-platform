export function FeaturedDraws({ onDraw }: { onDraw: () => void }) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <button
        type="button"
        onClick={onDraw}
        className="group relative block w-full overflow-hidden rounded-3xl border border-paper/15 text-left shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)] transition-transform hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-flare focus-visible:outline-offset-4"
        aria-label="Open the draw page"
      >
        <img src="/Feature-draw.png" alt="Featured World Cup draw" className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-105 sm:h-72 md:h-80" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/55 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-5 sm:max-w-md sm:justify-center sm:p-8 md:p-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#8fe3b0]">Featured draw</p>
          <h2 className="mt-2 text-3xl font-black uppercase leading-none tracking-tight text-paper sm:text-4xl">World Cup Pack</h2>
          <p className="mt-3 text-sm font-bold uppercase tracking-widest text-paper/90">4-card pack - starts at 0.02 SOL</p>
          <span className="mt-5 w-fit rounded-full border border-paper/30 bg-ink/80 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-paper backdrop-blur-sm transition-colors group-hover:border-paper/60 group-hover:bg-paper/10">Draw now</span>
        </div>
      </button>
    </section>
  )
}
