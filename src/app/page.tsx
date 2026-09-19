
import Link from "next/link";
import { ArrowRight, Star, Check } from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { serializeBook } from "@/lib/serialize";
import { BookCard, BookCover } from "@/components/book-card";
import { formatPrice, unitPriceFor } from "@/lib/utils";

import { BookCraftAnimation, BookDeliverAnimation } from "@/components/landing-animations";
import { FeatureStack } from "@/components/feature-stack";
import { TemplateGrid } from "@/components/template-grid";

const STEPS = [
  { n: "01", t: "Dream it", d: "Generate concepts from a genre + keywords and pick your favorite." },
  { n: "02", t: "Write it", d: "AI-draft chapters, polish the prose, design a cover." },
  { n: "03", t: "Sell it", d: "Publish to the store, take payments, print & ship on demand." },
];

export default async function LandingPage() {
  const trendingBooks = await prisma.book.findMany({
    where: { isPublished: true },
    include: { author: { select: { name: true, email: true } } },
    orderBy: { updatedAt: "desc" },
    take: 4,
  });

  return (
    <div className="overflow-hidden">
      {/* ── SaaS Hero ─────────────────────────────────────────────── */}
      <section className="relative bg-white pt-24 pb-28 text-center rounded-b-[4rem] shadow-xl z-10 overflow-hidden">
        {/* Subtle grid background for the white section */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
          {/* Top Integrations Pill */}
          <div className="mx-auto mb-8 inline-flex items-center gap-4 rounded-md border border-zinc-200 bg-white px-4 py-2 shadow-sm text-sm font-semibold text-zinc-600">
            <div className="flex items-center gap-1">
              <div className="flex items-center justify-center w-5 h-5 bg-black text-white rounded-[4px] text-[10px] font-bold">O</div> OpenAI
            </div>
            <div className="w-px h-4 bg-zinc-200"></div>
            <div className="flex items-center gap-1">
              <div className="flex items-center justify-center w-5 h-5 bg-indigo-600 text-white rounded-[4px] text-[10px] font-bold">S</div> Stripe
            </div>
          </div>

          <h1 className="text-balance text-6xl font-medium tracking-tight text-zinc-900 sm:text-7xl md:text-[5.5rem] leading-[1.1]">
            #1 <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 bg-clip-text text-transparent font-semibold">AI book studio</span> for authors.
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-xl text-zinc-600 font-medium tracking-tight">
            AI agents that draft chapters, design covers, and publish your book – automatically.
          </p>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <Link href="/dashboard" className="inline-flex h-12 items-center justify-center rounded-full bg-blue-600 px-8 text-base font-medium text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-700 active:scale-95">
              Get started free!
            </Link>
            <Link href="/store" className="inline-flex h-12 items-center justify-center rounded-full border border-blue-200 bg-white px-8 text-base font-medium text-blue-600 transition hover:border-blue-300 hover:bg-blue-50 active:scale-95">
              Book a demo
            </Link>
          </div>

          {/* Live Community Stats */}
          <div className="mt-20 pt-10 border-t border-zinc-100">
            <p className="text-sm font-medium text-zinc-500 mb-8 uppercase tracking-widest">
              Join the studio publishing books this week
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {[
                { label: "Authors online", value: "2,847", delta: "+312 today", live: true },
                { label: "Books drafted", value: "14,902", delta: "+1,284 wk", live: false },
                { label: "Copies sold", value: "$842k", delta: "+12.4% MoM", live: false },
                { label: "Participants pool", value: "63,418", delta: "+4,971 wk", live: true },
              ].map((s, i) => (
                <div key={i} className="text-left md:text-center">
                  <div className="flex items-center gap-2 md:justify-center mb-2">
                    {s.live && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                    )}
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{s.label}</p>
                  </div>
                  <p className="text-3xl font-bold tracking-tight text-zinc-900 leading-none">
                    {s.value}
                  </p>
                  <p className="mt-1.5 text-xs font-semibold text-emerald-600">
                    {s.delta}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <FeatureStack />
      <TemplateGrid />

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section className="relative border-y border-white/5 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-[100px]" />
          <div className="absolute -bottom-32 -right-10 h-[400px] w-[400px] rounded-full bg-emerald-500/10 blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-5xl px-4 py-20 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-white sm:text-4xl mb-3 tracking-tight">
            From idea to printed book
          </h2>
          <p className="text-center text-sm text-zinc-400 mb-10 max-w-xl mx-auto">
            Three steps. Zero publishers. Your book, your terms.
          </p>

          <BookCraftAnimation />

          <div className="grid gap-6 sm:grid-cols-3 mt-14">
            {STEPS.map((s) => (
              <StepCard key={s.n} number={s.n} title={s.t} description={s.d} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Trending Books ───────────────────────────────────────────── */}
      {trendingBooks.length > 0 && (
        <section className="relative mx-auto max-w-7xl px-5 sm:px-8 py-20 md:py-24 border-b border-white/5 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-70">
            <div className="absolute top-10 right-10 h-[320px] w-[320px] rounded-full bg-fuchsia-500/8 blur-[120px]" />
            <div className="absolute bottom-0 left-10 h-[320px] w-[320px] rounded-full bg-indigo-500/8 blur-[120px]" />
          </div>

          {/* Header */}
          <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-1 mb-5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-300/90">Fresh off the press</span>
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight mb-3 leading-[1.05]">
                Trending in the Store
              </h2>
              <p className="text-base text-zinc-400 max-w-xl leading-relaxed">
                Hot off the press — fresh AI-authored releases readers are buying this week.
              </p>
            </div>
            <Link href="/store" className="group inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/[0.05] hover:bg-white/[0.08] hover:border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition-all">
              View all books
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="relative grid gap-6 lg:grid-cols-12 lg:gap-8 items-stretch">

            {/* ── FEATURED BOOK (left, hero) ── */}
            {trendingBooks[0] && (
              <Link href={`/store/${trendingBooks[0].id}`} className="group lg:col-span-7 relative overflow-hidden rounded-[2rem] border border-white/[0.07] bg-gradient-to-br from-zinc-900/70 via-black/30 to-zinc-950/60 p-6 sm:p-8 md:p-10 backdrop-blur-md shadow-[0_30px_60px_-30px_rgba(79,70,229,0.25)] hover:border-violet-500/25 transition-all">
                <div className="pointer-events-none absolute inset-0 opacity-80">
                  <div className="absolute -top-10 -right-10 h-[280px] w-[280px] rounded-full bg-gradient-to-br from-indigo-500/25 via-violet-500/20 to-fuchsia-500/20 blur-3xl" />
                  <div className="absolute -bottom-10 -left-10 h-[240px] w-[240px] rounded-full bg-emerald-500/10 blur-3xl" />
                </div>

                {/* Ribbon */}
                <div className="relative flex items-center justify-between mb-8">
                  <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500/90 to-violet-500/90 px-3.5 py-1 shadow-lg shadow-fuchsia-900/30">
                    <Star className="h-3.5 w-3.5 text-white fill-white" />
                    <span className="text-[11px] font-bold text-white uppercase tracking-wider">Editor's Pick</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1">
                    <span className="text-xs font-bold text-amber-300">🔥</span>
                    <span className="text-[11px] font-semibold text-amber-200">#1 this week</span>
                  </div>
                </div>

                <div className="relative grid gap-8 md:grid-cols-5 items-center">
                  {/* Hero cover */}
                  <div className="md:col-span-2 relative">
                    <div className="absolute -inset-2 bg-gradient-to-br from-indigo-500/30 via-violet-500/25 to-fuchsia-500/25 rounded-[1.5rem] blur-xl opacity-70 group-hover:opacity-85 transition-opacity" />
                    <div className="relative aspect-[3/4] rounded-[1.25rem] overflow-hidden border border-white/10 shadow-2xl shadow-black/40 group-hover:scale-[1.02] transition-transform duration-500">
                      <BookCover book={{ ...serializeBook(trendingBooks[0]), ...(trendingBooks[0] as any) }} />
                    </div>
                    {/* Floating price tag */}
                    <div className="absolute -bottom-3 -right-3 rounded-xl bg-gradient-to-br from-white to-zinc-200 text-zinc-900 px-4 py-2.5 shadow-2xl shadow-black/30 border border-white/50">
                      <p className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Paperback</p>
                      <p className="text-xl font-black tracking-tight leading-none mt-0.5">
                        {formatPrice(unitPriceFor(trendingBooks[0].price))}
                      </p>
                    </div>
                  </div>

                  {/* Book details */}
                  <div className="md:col-span-3 flex flex-col justify-center min-h-full">
                    <div className="flex flex-wrap items-center gap-2 mb-5">
                      <span className="rounded-md bg-white/[0.04] border border-white/[0.07] px-2.5 py-1 text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                        {trendingBooks[0].genre || "Science Fiction"}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-300">
                        <Star className="h-3 w-3 fill-amber-300" />
                        <Star className="h-3 w-3 fill-amber-300" />
                        <Star className="h-3 w-3 fill-amber-300" />
                        <Star className="h-3 w-3 fill-amber-300" />
                        <Star className="h-3 w-3 fill-amber-300" />
                        <span className="text-zinc-400 ml-1">4.9 · 1,284</span>
                      </span>
                    </div>
                    <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-[1.05] mb-3 group-hover:bg-gradient-to-r group-hover:from-white group-hover:via-fuchsia-200 group-hover:to-violet-200 group-hover:bg-clip-text group-hover:text-transparent transition-all">
                      {trendingBooks[0].title || "The Cartographer's Paradox"}
                    </h3>
                    <p className="text-sm text-zinc-400 mb-5">
                      by{' '}
                      <span className="text-zinc-200 font-medium">
                        {(trendingBooks[0].author as any)?.name?.split(' ')[0] || "Unknown Author"} · {((trendingBooks[0] as any).chapters?.length ?? (trendingBooks[0] as any).chapterCount ?? 12)} chapters
                      </span>
                    </p>
                    <p className="text-[15px] text-zinc-300/90 leading-relaxed line-clamp-3 mb-7 max-w-lg">
                      When a lonely mapmaker in a dissolving empire traces a coastline by hand, a tower that shouldn't exist rises overnight at the edge of the world — and someone inside knows his name.
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-2 rounded-full bg-white text-indigo-700 px-5 py-2.5 text-sm font-bold shadow-lg shadow-black/20 group-hover:bg-zinc-100 transition">
                        Read now
                        <ArrowRight className="h-4 w-4" />
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-300">
                        <Check className="h-4 w-4 text-emerald-400" />
                        In stock · ships in 48h
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* ── TRENDING LIST (right side) ── */}
            <div className="lg:col-span-5 grid grid-cols-1 gap-4 h-full">
              {trendingBooks.slice(1, 4).map((book, i) => {
                const s = serializeBook(book);
                const rank = i + 2;
                return (
                  <Link
                    key={book.id}
                    href={`/store/${book.id}`}
                    className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15 p-4 sm:p-5 transition-all backdrop-blur-sm flex gap-4"
                  >
                    {/* Rank */}
                    <div className="flex flex-col items-center justify-between py-1 w-9 shrink-0">
                      <p className="bg-gradient-to-br from-white/70 to-zinc-500 bg-clip-text text-2xl font-black text-transparent leading-none">
                        0{rank}
                      </p>
                      <div className="h-1.5 w-1.5 rounded-full bg-white/30 mt-auto" />
                    </div>

                    {/* Cover */}
                    <div className="shrink-0 relative w-[84px] h-[112px] rounded-lg overflow-hidden border border-white/10 shadow-lg shadow-black/30 group-hover:scale-[1.03] transition-transform duration-300">
                      <BookCover book={s} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                            {s.genre || "Fiction"}
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-300 shrink-0">
                            <Star className="h-3 w-3 fill-amber-300" />
                            4.{8 - i}
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-white leading-snug line-clamp-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-violet-200 transition-all">
                          {s.title}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-1 truncate">
                          by {(book.author as any)?.name?.split('@')[0] || "Studio Author"}
                        </p>
                      </div>
                      <div className="flex items-end justify-between mt-2 pt-2 border-t border-white/5">
                        <p className="text-sm font-black text-white">{formatPrice(unitPriceFor(s.price))}</p>
                        <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-500/15 to-violet-500/15 border border-violet-500/20 px-2.5 py-1 text-[10px] font-semibold text-violet-200 group-hover:from-indigo-500 group-hover:to-violet-500 group-hover:text-white group-hover:border-transparent transition-all">
                          View
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}

              {/* Explore more card */}
              {trendingBooks.length > 4 && (
                <Link href="/store" className="group relative overflow-hidden rounded-2xl border border-dashed border-white/10 hover:border-fuchsia-400/40 hover:bg-fuchsia-500/[0.04] p-5 sm:p-6 transition-all flex items-center justify-center text-center min-h-[120px]">
                  <div>
                    <p className="text-sm font-semibold text-zinc-300 mb-1.5 group-hover:text-white transition">
                      + {trendingBooks.length - 4} more trending
                    </p>
                    <p className="inline-flex items-center gap-1.5 text-xs text-fuchsia-300 font-semibold">
                      Browse the full store <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </p>
                  </div>
                </Link>
              )}
            </div>

          </div>
        </section>
      )}

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-20">
        <div className="relative overflow-hidden rounded-[2.5rem] px-8 py-16 sm:px-16 sm:py-24 bg-gradient-to-br from-[#2e379c] via-[#4f46e5] to-[#7c3aed] shadow-[0_40px_80px_-20px_rgba(99,102,241,0.5)]">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-fuchsia-400/20 blur-3xl" />
            <div
              className="absolute inset-0 opacity-30 mix-blend-overlay"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
                backgroundSize: '28px 28px',
              }}
            />
          </div>
          <div className="relative max-w-3xl">
            <h2 className="text-4xl sm:text-6xl font-semibold tracking-tight text-white mb-6 leading-[1.05]">
              Your first chapter is one prompt away
            </h2>

            <p className="text-emerald-200/90 text-sm font-semibold mb-6 inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-4 py-1.5 border border-emerald-300/20">
              ✓ Available on AI Book Studio &amp; Export to PDF
            </p>

            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-white/90 font-medium mb-12">
              <span className="flex items-center gap-2"><span className="text-emerald-300 text-lg">✓</span> 100% free to start</span>
              <span className="flex items-center gap-2"><span className="text-emerald-300 text-lg">✓</span> Lulu print-on-demand</span>
              <span className="flex items-center gap-2"><span className="text-emerald-300 text-lg">✓</span> Stripe payments</span>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Link href="/dashboard" className="inline-flex h-14 items-center justify-center rounded-full bg-white px-9 text-base font-bold text-indigo-700 transition hover:bg-zinc-50 active:scale-95 shadow-2xl shadow-black/20">
                Create a book with AI
              </Link>
              <Link href="/login" className="inline-flex h-14 items-center justify-center rounded-full border border-white/30 bg-white/10 backdrop-blur px-9 text-base font-semibold text-white transition hover:bg-white/20 active:scale-95">
                Sign in <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Delivery Animation (Footer) ────────────────────── */}
      <section className="relative border-t border-white/5 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute bottom-0 left-1/3 h-[350px] w-[350px] rounded-full bg-sky-500/10 blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-5xl px-4 py-20 sm:px-6 text-center">
          <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">Printed &amp; delivered to your door</h3>
          <p className="text-sm text-zinc-400 mb-8">From your imagination → to a real book on your doorstep, worldwide.</p>
          <BookDeliverAnimation />
        </div>
      </section>
    </div>
  );
}



// Clean step card
function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="group relative rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 backdrop-blur-sm transition-all hover:border-white/[0.15] hover:bg-white/[0.04]">
      <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gradient-to-br from-indigo-500/30 via-violet-500/20 to-transparent opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
      <div className="relative">
        <p className="bg-gradient-to-br from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-5xl font-black text-transparent tracking-tight">
          {number}
        </p>
        <h3 className="mt-3 text-xl font-semibold text-white tracking-tight">{title}</h3>
        <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
