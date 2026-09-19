
import Link from "next/link";
import { ArrowRight } from "@/components/icons";

import { BookCraftAnimation, BookDeliverAnimation } from "@/components/landing-animations";
import { FeatureStack } from "@/components/feature-stack";
import { TemplateGrid } from "@/components/template-grid";

const STEPS = [
  { n: "01", t: "Dream it", d: "Generate concepts from a genre + keywords and pick your favorite." },
  { n: "02", t: "Write it", d: "AI-draft chapters, polish the prose, design a cover." },
  { n: "03", t: "Sell it", d: "Publish to the store, take payments, print & ship on demand." },
];

export default async function LandingPage() {
  return (
    <div className="overflow-hidden">
      {/* ── SaaS Hero ─────────────────────────────────────────────── */}
      <section className="section-reveal relative bg-white pt-24 pb-28 text-center rounded-b-[4rem] shadow-xl z-10 overflow-hidden">
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
      <section className="section-reveal relative border-y border-white/5 overflow-hidden">
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


      <section className="section-reveal relative mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-20">
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
      <section className="section-reveal relative border-t border-white/5 overflow-hidden">
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
