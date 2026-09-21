
import Link from "next/link";
import { ArrowRight } from "@/components/icons";

import { BookCraftAnimation } from "@/components/landing-animations";
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
        </div>
      </section>

      <FeatureStack />
      <TemplateGrid />

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section className="section-reveal relative bg-white py-20 sm:py-28">
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-center text-4xl sm:text-6xl md:text-7xl font-medium text-zinc-900 mb-3 tracking-tight">
            <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 bg-clip-text text-transparent">From idea to printed book</span>
          </h2>
          <p className="text-center text-lg md:text-xl font-medium text-zinc-700 mb-10 max-w-xl mx-auto">
            <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 bg-clip-text text-transparent">Three steps. Zero publishers. Your book, your terms.</span>
          </p>

          <BookCraftAnimation />

          <div className="grid gap-6 sm:grid-cols-3 mt-14">
            {STEPS.map((s) => (
              <StepCard key={s.n} number={s.n} title={s.t} description={s.d} />
            ))}
          </div>
        </div>
      </section>

      <section className="section-reveal relative bg-white py-12 sm:py-20">
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 text-center">
          <h2 className="text-4xl sm:text-6xl font-medium tracking-tight text-zinc-900 mb-6 leading-[1.05]">
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">Your first chapter is one prompt away</span>
          </h2>

          <p className="text-emerald-600 text-sm font-semibold mb-6 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 border border-emerald-200">
            ✓ Available on AI Book Studio & Export to PDF
          </p>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-zinc-600 font-medium mb-12 justify-center">
            <span className="flex items-center gap-2"><span className="text-emerald-500 text-lg">✓</span> 100% free to start</span>
            <span className="flex items-center gap-2"><span className="text-emerald-500 text-lg">✓</span> Lulu print-on-demand</span>
            <span className="flex items-center gap-2"><span className="text-emerald-500 text-lg">✓</span> Stripe payments</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 justify-center">
            <Link href="/dashboard" className="inline-flex h-14 items-center justify-center rounded-full bg-indigo-600 px-9 text-base font-bold text-white transition hover:bg-indigo-700 active:scale-95 shadow-xl shadow-indigo-500/30">
              Create a book with AI
            </Link>
            <Link href="/login" className="inline-flex h-14 items-center justify-center rounded-full border border-indigo-200 bg-white px-9 text-base font-semibold text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-50 active:scale-95">
              Sign in <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}



// Clean step card
function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="group relative rounded-2xl border border-zinc-200 bg-zinc-50 p-6 transition-all hover:border-zinc-300 hover:bg-white">
      <div className="relative">
        <p className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent text-5xl font-black tracking-tight">
          {number}
        </p>
        <h3 className="mt-3 text-xl font-bold text-zinc-900 tracking-tight">{title}</h3>
        <p className="mt-2 text-sm text-zinc-600 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
