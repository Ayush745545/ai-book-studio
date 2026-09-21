import Link from "next/link";
import { ArrowRight } from "@/components/icons";

const GENRES = [
  { title: "Sci-Fi Thriller", prompt: "A gripping sci-fi thriller about a rogue AI...", image: "/covers/ChatGPT%20Image%20Sep%2020,%202026,%2004_22_34%20PM-Photoroom.png", tone: "blue", position: "genre-sci-fi" },
  { title: "Romance", prompt: "A heartfelt romance where two strangers find their way back to each other...", image: "/covers/love.png", tone: "coral", position: "genre-romance" },
  { title: "Fantasy Epic", prompt: "An epic quest across warring kingdoms with ancient magic and dragons...", image: "/covers/FantasyEpic.png", tone: "amber", position: "genre-fantasy" },
  { title: "Mystery Detective", prompt: "A detective hunting a serial killer through rain-slicked streets...", image: "/covers/MysteryDetective.png", tone: "slate", position: "genre-mystery" },
  { title: "Self-Help Guide", prompt: "Practical habits to transform your mindset and unlock your potential...", image: "/covers/Self-Help-Guide.png", tone: "emerald", position: "genre-self-help" },
];

export default function LandingPage() {
  return (
    <div className="genre-page min-h-[calc(100vh-3.5rem)] overflow-hidden bg-[#f7f7fa] text-zinc-950">
      <section className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-[110rem] flex-col items-center px-4 pt-8 sm:px-6 sm:pt-12">
        <div className="relative z-20 text-center">
          <h1 className="text-[clamp(2.25rem,4.3vw,4.5rem)] font-extrabold leading-[.98] tracking-[-0.065em] text-zinc-950">Pick a Genre. <span className="bg-gradient-to-r from-emerald-500 to-green-500 bg-clip-text text-transparent">Create a Book.</span></h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm font-medium leading-6 text-zinc-500 sm:text-base">Explore countless styles or quickly turn a single prompt into a fully-fledged book. No writing experience needed.</p>
          <Link href="/books/new" className="genre-explore mt-5 inline-flex items-center gap-2 rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white shadow-xl shadow-zinc-900/15 transition hover:-translate-y-0.5 hover:bg-zinc-800">Explore Now <ArrowRight className="h-4 w-4" /></Link>
        </div>

        <div className="genre-stage relative mx-auto mt-[-.75rem] w-full max-w-[76rem]" aria-label="Book genres">
          {GENRES.map((genre) => (
            <article key={genre.title} className={`genre-card ${genre.position}`}>
              <div className={`genre-panel genre-panel-${genre.tone}`} />
              <div className="genre-cover-wrap"><img src={genre.image} alt={`${genre.title} book cover`} className="genre-cover" /></div>
              <div className="genre-prompt"><span>PROMPT</span><p>&ldquo;{genre.prompt}&rdquo;</p></div>
            </article>
          ))}
        </div>

        <Link href="/books/new" className="genre-bottom-cta relative z-30 -mt-4 mb-5 inline-flex items-center gap-2 rounded-full bg-white py-2 pl-2 pr-5 text-sm font-bold text-zinc-800 shadow-lg shadow-zinc-900/10 ring-1 ring-zinc-200/80 transition hover:-translate-y-0.5"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-green-500 text-emerald-950"><ArrowRight className="h-4 w-4" /></span>Try AI Book Studio free</Link>
      </section>
    </div>
  );
}
