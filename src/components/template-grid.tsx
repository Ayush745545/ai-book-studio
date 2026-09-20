export function TemplateGrid() {
  const templates = [
    { 
      title: "Sci-Fi Thriller", 
      imageSrc: "/covers/ChatGPT Image Sep 20, 2026, 04_22_34 PM-Photoroom.png",
      prompt: "A gripping sci-fi thriller about a rogue AI..."
    },
    { 
      title: "Romance Novel", 
      imageSrc: "/covers/love.png",
      prompt: "A heartwarming enemies-to-lovers romance set in a cozy bookshop..."
    },
    { 
      title: "Fantasy Epic", 
      imageSrc: "/covers/FantasyEpic.png",
      prompt: "An epic quest across warring kingdoms with ancient magic and dragons..."
    },
    { 
      title: "Mystery Detective", 
      imageSrc: "/covers/MysteryDetective.png",
      prompt: "A gritty noir detective hunting a serial killer through rain-slicked streets..."
    },
    { 
      title: "Self-Help Guide", 
      imageSrc: "/covers/Self-Help-Guide.png",
      prompt: "Practical habits to transform your mindset and unlock your potential..."
    },
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
              className={`card-fx relative rounded-3xl p-6 bg-white shadow-xl flex items-center justify-between gap-6`}
              style={{ width: i % 2 === 0 ? '45%' : '50%', minWidth: '300px', height: '220px', marginTop: i % 2 !== 0 ? '40px' : '0' }}
            >
              <div className="relative z-10 flex items-center justify-center h-full w-full pr-12">
                <img 
                  src={t.imageSrc} 
                  alt={t.title} 
                  className="h-[200px] w-auto object-contain drop-shadow-2xl"
                />
                {/* Prompt card */}
                <div className="absolute top-4 right-0 z-20 bg-white/90 backdrop-blur-md rounded-xl border border-white/30 shadow-lg p-3 min-w-[180px] max-w-[220px]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Prompt</span>
                  <p className="text-xs text-zinc-800 mt-1 leading-tight">"{t.prompt}"</p>
                </div>
              </div>
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
          Try AI Book Studio free
        </button>
      </div>

    </section>
  );
}