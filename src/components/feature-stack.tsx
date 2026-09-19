"use client";

import { Sparkles, Wand, FileText, ImageIcon, CreditCard, Printer, ArrowRight, Lightbulb, Check } from "@/components/icons";

const FEATURES = [
  {
    icon: Sparkles,
    tag: "01 · AI ideation",
    title: "AI idea engine",
    text: "Enter a genre and a few keywords — get three market-ready book concepts with hooks, synopses, audience profiles, and comparable comp titles already picked out.",
    pills: ["Market Research", "Concept Generation", "Comp Title Analysis"],
    accent: "from-orange-500 via-amber-400 to-pink-500",
    accentSoft: "bg-orange-500/10",
    iconBg: "from-orange-400 to-amber-500",
    mockup: "ideation" as const,
  },
  {
    icon: Wand,
    tag: "02 · Writing",
    title: "Chapter writing that actually reads human",
    text: "Draft full ~1,200-word chapters from an outline and tone of voice. Voice is preserved across every chapter so your book reads like one author, not a patchwork.",
    pills: ["Ollama / GPT-4o", "Interactive Editing", "Consistent Voice"],
    accent: "from-indigo-500 via-violet-500 to-purple-500",
    accentSoft: "bg-indigo-500/10",
    iconBg: "from-indigo-500 to-violet-500",
    mockup: "writing" as const,
  },
  {
    icon: FileText,
    tag: "03 · Editing",
    title: "Grammar polish with a full change log",
    text: "One-click copy-editing fixes grammar, spelling and punctuation on the entire manuscript in seconds. Every change is listed so nothing ships you didn't greenlight.",
    pills: ["Line Edits", "Punctuation", "Change Audit"],
    accent: "from-emerald-500 via-teal-400 to-cyan-500",
    accentSoft: "bg-emerald-500/10",
    iconBg: "from-emerald-500 to-teal-400",
    mockup: "editing" as const,
  },
  {
    icon: ImageIcon,
    tag: "04 · Design",
    title: "DALL-E 3 covers, print-resolution ready",
    text: "Describe your vision and get a print-quality 1024×1792 cover tuned for trade paperback printing. Regenerate until it's perfect — we save every variant.",
    pills: ["DALL-E 3", "Print Quality", "Variant Library"],
    accent: "from-pink-500 via-rose-500 to-red-500",
    accentSoft: "bg-pink-500/10",
    iconBg: "from-pink-500 to-rose-500",
    mockup: "cover" as const,
  },
  {
    icon: CreditCard,
    tag: "05 · Commerce",
    title: "Stripe checkout with zero setup",
    text: "Sell physical copies with a hosted payment flow, tax handled automatically. Webhooks keep order status, payments, and refunds in sync so you never miss a beat.",
    pills: ["Stripe Integration", "Order Webhooks", "Global Taxes"],
    accent: "from-sky-500 via-blue-500 to-indigo-500",
    accentSoft: "bg-sky-500/10",
    iconBg: "from-sky-500 to-blue-500",
    mockup: "checkout" as const,
  },
  {
    icon: Printer,
    tag: "06 · Fulfillment",
    title: "Print-on-demand, worldwide shipping",
    text: "Paid orders are submitted straight to Lulu the instant checkout clears. Printed as premium 6×9in trade paperbacks and shipped direct to your readers' doors.",
    pills: ["Lulu Direct", "Worldwide Shipping", "Tracked Parcels"],
    accent: "from-amber-500 via-orange-500 to-red-500",
    accentSoft: "bg-amber-500/10",
    iconBg: "from-amber-500 to-orange-500",
    mockup: "print" as const,
  },
];

type MockupKind = typeof FEATURES[number]["mockup"];

/* ── Mockup panels per feature ────────────────────────────────────────── */
function Mockup({ kind, accent }: { kind: MockupKind; accent: string }) {
  if (kind === "ideation") {
    return (
      <div className="relative w-full h-full card-fx rounded-[1.75rem] overflow-hidden bg-zinc-950/70 border border-white/5 p-5 backdrop-blur-md">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-400" />
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Concept board</p>
          </div>
          <span className="text-[10px] text-zinc-500">Sci-Fi · Dystopia</span>
        </div>
        <div className="space-y-3">
          {[{ t: "The Cartographer's Paradox", sub: "A mapmaker discovers a city that shouldn't exist." },
            { t: "Static Horizon", sub: "A weather reporter whose forecasts start rewriting reality." },
            { t: "Last Cartographer", sub: "The final living mapmaker of a dissolving empire." }]
            .map((c, i) => (
            <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5 hover:border-white/10 transition cursor-pointer group">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:{accent}">{c.t}</p>
                  <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{c.sub}</p>
                </div>
                <span className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Pick #{i+1}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {["Hook", "Audience", "Comps"].map(t => (
                  <span key={t} className="text-[10px] rounded-md bg-white/[0.03] px-1.5 py-0.5 text-zinc-400 border border-white/5">{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (kind === "writing") {
    return (
      <div className="relative w-full h-full card-fx rounded-[1.75rem] overflow-hidden border border-white/5 backdrop-blur-md bg-[#0e0d18]">
        <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-800" />
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">chapter-03.mdx</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">Saved</span>
        </div>
        <div className="p-5 font-serif text-zinc-300 text-[13px] leading-[1.85] h-full">
          <p className="text-xl font-bold text-white mb-4">III. The City That Moved</p>
          <p className="mb-3">
            The ink was still <span className="bg-indigo-500/20 text-indigo-300 rounded px-0.5">wet</span> when Kael folded the map and slipped it into the inner pocket of his coat.
          </p>
          <p className="mb-3 opacity-90">
            He had drawn the same coastline a hundred times before — each cove, each jagged inlet committed to memory by the age of twelve. But tonight, <span className="bg-violet-500/15 text-violet-300 rounded px-0.5 underline decoration-dotted">something had shifted</span>.
          </p>
          <p className="opacity-80">
            Out beyond the breakwater, where the map showed open sea for thirty leagues, a single tower now rose in faint pencil — slender, impossible, marked with an <span className="inline-flex items-center gap-0.5 rounded bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-1">✦ AI suggestion</span>.
          </p>
        </div>
      </div>
    );
  }
  if (kind === "editing") {
    return (
      <div className="relative w-full h-full card-fx rounded-[1.75rem] overflow-hidden border border-white/5 backdrop-blur-md bg-black/40 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-white">Full-manuscript review</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">128 edits proposed · 12 accepted</p>
          </div>
          <button className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-3.5 py-1.5 text-[11px] font-bold text-white shadow-lg shadow-emerald-500/20">
            Accept all
          </button>
        </div>
        <div className="space-y-2.5">
          {[
            { before: "The map were folded neatly.", after: "The map was folded neatly.", kind: "Grammar" },
            { before: "\"Enough\", she said.", after: "\"Enough,\" she said.", kind: "Punctuation" },
            { before: "He walked towards the door.", after: "He walked toward the door.", kind: "Dialect" },
            { before: "A very unique artifact.", after: "A singular artifact.", kind: "Style" },
          ].map((e, i) => (
            <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] divide-y divide-white/5 overflow-hidden">
              <div className="px-3.5 py-2.5 flex items-center justify-between gap-3 bg-white/[0.02]">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                  <p className="text-[12px] text-zinc-400 line-through decoration-red-500/60 min-w-0 truncate">{e.before}</p>
                </div>
                <span className="shrink-0 text-[10px] rounded-md px-1.5 py-0.5 bg-red-500/10 text-red-300 border border-red-500/20">{e.kind}</span>
              </div>
              <div className="px-3.5 py-2.5 flex items-center justify-between gap-3 bg-emerald-500/[0.04]">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <p className="text-[12px] text-emerald-200 min-w-0 truncate">{e.after}</p>
                </div>
                <div className="shrink-0 flex items-center gap-1">
                  <button className="h-6 w-6 rounded-md text-[10px] text-zinc-500 hover:bg-white/5">✕</button>
                  <button className="h-6 w-6 rounded-md text-[10px] bg-emerald-500/15 text-emerald-300">✓</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (kind === "cover") {
    return (
      <div className="relative w-full h-full card-fx rounded-[1.75rem] overflow-hidden border border-white/5 backdrop-blur-md bg-black/30 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Covers · Variant 3 / 9</p>
          <button className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300">↻ Regenerate</button>
        </div>
        <div className="grid grid-cols-4 gap-2.5 h-[calc(100%-2.5rem)]">
          {[1,2,3,4].map(n => (
            <div key={n} className={`group relative rounded-xl overflow-hidden border ${n === 3 ? `ring-2 ring-offset-2 ring-offset-black ring-pink-500/70 border-pink-500/40 scale-[1.02]` : 'border-white/10 hover:border-white/20'} transition-all`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${
                n === 1 ? 'from-amber-700 via-orange-600 to-rose-700' :
                n === 2 ? 'from-emerald-700 via-teal-700 to-indigo-800' :
                n === 3 ? 'from-slate-800 via-indigo-900 to-fuchsia-900' :
                         'from-violet-700 via-purple-700 to-indigo-900'
              }`} />
              <div className="relative h-full flex flex-col items-center justify-between p-3 text-center">
                <p className="text-[8px] text-white/60 tracking-widest uppercase">AI Book Studio</p>
                <div>
                  <p className="text-[10px] font-bold text-white leading-tight drop-shadow-lg">The Cartographer's</p>
                  <p className="text-[10px] font-bold text-white/80 leading-tight mb-1.5">Paradox</p>
                </div>
                <div className="h-0.5 w-5 bg-white/60 rounded-full mb-0.5" />
              </div>
              {n === 3 && <span className="absolute top-1 right-1 rounded-md bg-pink-500 text-white text-[8px] font-bold px-1 py-0.5">● LIVE</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (kind === "checkout") {
    return (
      <div className="relative w-full h-full card-fx rounded-[1.75rem] overflow-hidden border border-white/5 backdrop-blur-md bg-gradient-to-br from-slate-900 via-zinc-900 to-black p-5 flex gap-5">
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Checkout</p>
              <div className="flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 text-[10px] text-zinc-400 border border-white/5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Stripe Secure
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-8 w-full rounded-lg bg-white/[0.04] border border-white/5" />
              <div className="grid grid-cols-2 gap-2">
                <div className="h-8 rounded-lg bg-white/[0.04] border border-white/5" />
                <div className="h-8 rounded-lg bg-white/[0.04] border border-white/5" />
              </div>
              <div className="h-8 w-1/2 rounded-lg bg-white/[0.04] border border-white/5" />
            </div>
          </div>
          <button className="mt-5 w-full h-10 rounded-xl bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 text-white text-sm font-bold shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2">
            Pay $18.99
          </button>
        </div>
        <div className="w-[40%] rounded-2xl border border-white/5 bg-white/[0.02] p-4 flex flex-col">
          <p className="text-[10px] text-zinc-500 uppercase mb-3">Order summary</p>
          <div className="flex gap-3 mb-4">
            <div className="h-16 w-12 shrink-0 rounded-md overflow-hidden bg-gradient-to-br from-slate-800 via-indigo-900 to-fuchsia-900 flex items-center justify-center p-2 text-center">
              <p className="text-[7px] font-bold text-white/90 leading-tight">Cartographer's Paradox</p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] text-white font-semibold leading-tight truncate">The Cartographer's Paradox</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">6×9 Paperback</p>
              <p className="text-[11px] text-white mt-1 font-bold">$18.99</p>
            </div>
          </div>
          <div className="mt-auto space-y-1.5 text-[11px] text-zinc-400 pt-3 border-t border-white/5">
            <div className="flex justify-between"><span>Subtotal</span><span>$18.99</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>$4.99</span></div>
            <div className="flex justify-between text-white font-bold text-sm pt-1.5 mt-1.5 border-t border-white/5"><span>Due</span><span>$23.98</span></div>
          </div>
        </div>
      </div>
    );
  }
  /* print / fulfillment */
  return (
    <div className="relative w-full h-full card-fx rounded-[1.75rem] overflow-hidden border border-white/5 backdrop-blur-md bg-black/30 p-5">
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Fulfillment pipeline</p>
        <span className="text-[10px] rounded-full bg-white/5 border border-white/5 px-2 py-0.5 text-zinc-400">Lulu API</span>
      </div>
      <div className="space-y-3">
        {[
          { label: "Order placed", sub: "Lulu #A7812 · 1 paperback", ok: true, hue: "bg-emerald-500" },
          { label: "Printed & bound", sub: "6×9 in · 248 pp · Matte cream", ok: true, hue: "bg-emerald-500" },
          { label: "Quality check", sub: "Spine, cover, bleed verified", ok: true, hue: "bg-emerald-500" },
          { label: "In transit", sub: "FedEx · Memphis → Lisbon", ok: false, hue: "bg-amber-500", bar: true },
        ].map((s, i, arr) => (
          <div key={i} className="flex gap-4 items-start">
            <div className="flex flex-col items-center shrink-0 w-6">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${s.ok ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 animate-pulse'}`}>
                {s.ok ? '✓' : '●'}
              </div>
              {i < arr.length - 1 && <div className={`w-0.5 h-10 ${s.ok ? 'bg-emerald-500/40' : 'bg-white/10'}`} />}
            </div>
            <div className="flex-1 pb-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">{s.label}</p>
                <p className="text-[10px] text-zinc-500">{i === 0 ? '14:02' : i === 1 ? '19:48' : i === 2 ? '22:17' : 'Now'}</p>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">{s.sub}</p>
              {s.bar && (
                <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Single Feature Row ─────────────────────────────────────────────────── */
function FeatureRow({ feature, index }: { feature: typeof FEATURES[number]; index: number }) {
  const Icon = feature.icon;
  const flipped = index % 2 === 1;
  return (
    <div className={`grid md:grid-cols-12 gap-8 md:gap-12 items-center ${index !== 0 ? 'pt-20 md:pt-24' : ''}`}>
      {/* Content */}
      <div className={`order-2 md:order-${flipped ? '2' : '1'} md:col-span-5`}>
        <div className="inline-flex items-center gap-2.5 mb-6">
          <div className={`h-11 w-11 rounded-2xl flex items-center justify-center bg-gradient-to-br ${feature.iconBg} shadow-lg shadow-black/20`}>
            <Icon className="h-5 w-5 text-white" strokeWidth={2} />
          </div>
          <span className={`text-[12px] font-bold uppercase tracking-[0.16em] bg-gradient-to-r ${feature.accent} bg-clip-text text-transparent`}>
            {feature.tag}
          </span>
        </div>
        <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.05] mb-5">
          <span className={`bg-gradient-to-b ${index % 2 === 0 ? 'from-white to-white/70' : 'from-white to-white/75'} bg-clip-text text-transparent`}>
            {feature.title}
          </span>
        </h3>
        <p className="text-base sm:text-lg text-zinc-400 leading-relaxed mb-7">
          {feature.text}
        </p>
        <div className="flex flex-wrap gap-2.5 mb-8">
          {feature.pills.map((p, pi) => (
            <span
              key={pi}
              className="inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.025] px-3.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/[0.05] transition"
            >
              <span className={`h-1.5 w-1.5 rounded-full bg-gradient-to-r ${feature.accent}`} />
              {p}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button className="group inline-flex items-center gap-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] px-5 py-2.5 text-sm font-semibold text-white transition-all">
            Try this feature
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
          <button className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-400 hover:text-white transition">
            Watch demo
            <span className="h-5 w-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px]">▶</span>
          </button>
        </div>
      </div>

      {/* Mockup */}
      <div className={`order-1 md:order-${flipped ? '1' : '2'} md:col-span-7 relative`}>
        <div className={`pointer-events-none absolute -inset-6 rounded-[2.5rem] opacity-40 blur-2xl bg-gradient-to-br ${feature.accent}`} />
        <div className="relative min-h-[380px] md:h-[420px]">
          <Mockup kind={feature.mockup} accent={feature.accent} />
        </div>
      </div>
    </div>
  );
}

/* ── Export ─────────────────────────────────────────────────────────────── */
export function FeatureStack() {
  return (
    <section className="relative overflow-hidden">
      {/* Subtle decorative layered over WebGL background */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute top-[10%] left-0 h-[400px] w-[400px] rounded-full bg-indigo-500/10 blur-[130px]" />
        <div className="absolute top-[45%] right-0 h-[400px] w-[400px] rounded-full bg-fuchsia-500/8 blur-[130px]" />
        <div className="absolute bottom-[10%] left-1/4 h-[380px] w-[380px] rounded-full bg-amber-500/6 blur-[130px]" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-5 sm:px-8 py-20 md:py-28">

        {/* Header */}
        <div className="text-center max-w-4xl mx-auto mb-24 md:mb-32">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 mb-7 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 animate-pulse" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-300">
              AI Book Studio · Platform
            </span>
          </span>
          <h2 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.02] mb-7">
            <span className="bg-gradient-to-br from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              All-in-One
            </span>
            <br />
            <span className="bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent">
              Everything you need to publish
            </span>
          </h2>
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Six tools, one workflow — from the first spark of an idea to a shipped paperback on your readers' doorsteps.
          </p>
        </div>

        {/* Features */}
        <div>
          {FEATURES.map((f, i) => (
            <FeatureRow key={f.title} feature={f} index={i} />
          ))}
        </div>

      </div>
    </section>
  );
}
