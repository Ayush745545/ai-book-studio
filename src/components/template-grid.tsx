export function TemplateGrid() {
  const templates = [
    { title: "Sci-Fi Thriller", color: "bg-blue-500", img1: "🛸", img2: "🌌" },
    { title: "Romance Novel", color: "bg-rose-400", img1: "❤️", img2: "📖" },
    { title: "Fantasy Epic", color: "bg-amber-600", img1: "🐉", img2: "🏰" },
    { title: "Mystery Detective", color: "bg-zinc-700", img1: "🕵️", img2: "🔍", cover: "/covers/MysteryDetective.png" },
    { title: "Self-Help Guide", color: "bg-emerald-500", img1: "🌱", img2: "💡", cover: "/covers/Self-Help-Guide.png" },
  ];

  return (
    <section className="section-reveal relative bg-[#f5f5f7] pt-24 pb-32 text-center rounded-t-[3rem] shadow-[0_-20px_50px_rgba(0,0,0,0.3)] z-20 mt-[-4rem]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 mb-4">
          Pick a Genre. <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-400">Create a Book.</span>
        </h2>
        <p className="text-base text-zinc-600 mb-8 max-w-2xl mx-auto font-medium">
          Explore countless styles or quickly turn a single prompt into a fully-fledged book. No writing experience needed.
        </p>

        <button className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-zinc-800 mb-16">
          Explore Now &rarr;
        </button>

        {/* Floating grid of book designs */}
        <div className="reveal-stagger flex flex-wrap justify-center gap-6 max-w-5xl mx-auto">
          {templates.map((t, i) => (
            <div 
              key={i}
              className={`card-fx relative overflow-hidden rounded-3xl p-6 ${t.color} text-white shadow-xl flex items-center justify-between gap-6`}
              style={{ width: i % 2 === 0 ? '45%' : '50%', minWidth: '300px', height: '220px', marginTop: i % 2 !== 0 ? '40px' : '0' }}
            >
              <div className="relative z-10 flex flex-col items-center justify-center w-24 h-28 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 shadow-lg rotate-[-5deg]">
                <span className="text-4xl">{t.img1}</span>
                <span className="text-[10px] mt-2 font-bold uppercase tracking-wider opacity-80">Prompt</span>
              </div>
              
              <div className="relative z-10 text-white/60">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>

              {t.cover ? (
                <div className="relative z-10 flex flex-col items-center justify-center w-48 h-64 rotate-[3deg]">
                  <img 
                    src={t.cover} 
                    alt={t.title} 
                    className="w-full h-full object-cover rounded-xl shadow-2xl border border-zinc-200"
                  />
                  <span className="text-sm mt-3 font-bold text-zinc-800 text-center leading-tight px-2 bg-white/90 rounded-lg">{t.title}</span>
                </div>
              ) : (
                <div className="relative z-10 flex flex-col items-center justify-center w-32 h-40 bg-white shadow-2xl rounded-xl border border-zinc-200 rotate-[3deg]">
                  <span className="text-6xl">{t.img2}</span>
                  <span className="text-xs mt-3 font-bold text-zinc-800 text-center leading-tight px-2">{t.title}</span>
                </div>
              )}
            </div>
          ))}
        </div>

      </div>

      {/* Floating Try Button mimicking bottom sticky button */}
      <div className="sticky bottom-8 left-0 right-0 flex justify-center z-50 pointer-events-none mt-16">
        <button className="pointer-events-auto flex items-center gap-3 rounded-full bg-white/90 backdrop-blur-md px-2 py-2 pr-6 shadow-[0_10px_40px_rgba(0,0,0,0.2)] border border-zinc-200 text-sm font-bold text-zinc-900 transition hover:scale-105">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-400 text-black">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </span>
          Try free
        </button>
      </div>

    </section>
  );
}