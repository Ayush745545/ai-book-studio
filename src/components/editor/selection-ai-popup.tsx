"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/client";
import { useToast } from "@/components/ui/toast";
import { useSafeUserSettings } from "@/components/user-settings-context";
import {
  Sparkles,
  Check,
  X,
  Spinner,
  Copy,
  Wand,
  FileText,
  List,
  Table as TableIcon,
  PencilLine,
  MessageSquare,
  Briefcase,
  Zap,
  Smile,
  Settings,
} from "@/components/icons";

export type AiEditAction =
  | "PROOFREAD"
  | "REWRITE"
  | "TONE_FRIENDLY"
  | "TONE_PROFESSIONAL"
  | "TONE_CONCISE"
  | "SUMMARY"
  | "KEY_POINTS"
  | "LIST"
  | "TABLE"
  | "COMPOSE"
  | "CUSTOM";

export interface SelectionAiPopupProps {
  selectedText: string;
  bookId: string;
  chapterId: string | null;
  chapterTitle: string;
  onClose: () => void;
  onApply: (next: string) => void;
  anchor: { x: number; y: number } | null;
}

const PRIMARY_ACTIONS: { id: AiEditAction; label: string; icon: React.ReactNode; color: string }[] = [
  {
    id: "PROOFREAD",
    label: "Proofread",
    icon: <FileText className="h-4.5 w-4.5" />,
    color:
      "bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300",
  },
  {
    id: "REWRITE",
    label: "Rewrite",
    icon: <Wand className="h-4.5 w-4.5" />,
    color:
      "bg-violet-50 text-violet-600 border-violet-200 hover:bg-violet-100 hover:border-violet-300",
  },
];

const TONES: { id: AiEditAction; label: string; icon: React.ReactNode }[] = [
  { id: "TONE_FRIENDLY", label: "Friendly", icon: <Smile className="h-4 w-4" /> },
  { id: "TONE_PROFESSIONAL", label: "Professional", icon: <Briefcase className="h-4 w-4" /> },
  { id: "TONE_CONCISE", label: "Concise", icon: <Zap className="h-4 w-4" /> },
];

const FORMATS: { id: AiEditAction; label: string; icon: React.ReactNode }[] = [
  { id: "SUMMARY", label: "Summary", icon: <FileText className="h-4 w-4" /> },
  { id: "KEY_POINTS", label: "Key Points", icon: <List className="h-4 w-4" /> },
  { id: "LIST", label: "List", icon: <List className="h-4 w-4" /> },
  { id: "TABLE", label: "Table", icon: <TableIcon className="h-4 w-4" /> },
];

export function SelectionAiPopup({
  selectedText,
  bookId,
  chapterId,
  chapterTitle,
  onClose,
  onApply,
  anchor,
}: SelectionAiPopupProps) {
  const toast = useToast();
  const userSettings = useSafeUserSettings();
  const [customPrompt, setCustomPrompt] = useState("");
  const [action, setAction] = useState<AiEditAction | null>(null);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 40);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!popRef.current) return;
      if (!popRef.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const style = useMemo(() => {
    if (!anchor) return { opacity: 0, pointerEvents: "none" as const };
    const popW = 480;
    const left = Math.max(8, Math.min(window.innerWidth - popW - 8, anchor.x - popW / 2));
    const top = Math.max(8, anchor.y);
    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${popW}px`,
    };
  }, [anchor]);

  async function run(a: AiEditAction, promptOverride?: string) {
    setAction(a);
    setOutput(null);
    setError(null);
    setLoading(true);
    try {
      const body = userSettings.applyToPayload({
        action: a,
        text: selectedText,
        customPrompt: promptOverride ?? (customPrompt || undefined),
        bookId,
        chapterId: chapterId ?? undefined,
        chapterTitle,
      });
      const res = await apiFetch<{ result: string }>("/api/ai/edit", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setOutput(res.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI request failed.");
      toast("AI failed — check Ollama or OpenAI setup", "error");
    } finally {
      setLoading(false);
    }
  }

  const accept = () => {
    if (!output) return;
    onApply(output);
    toast("Applied", "success");
    onClose();
  };

  const copyOut = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      toast("Copied to clipboard", "success");
    } catch {
      toast("Copy failed", "error");
    }
  };

  return (
    <div
      ref={popRef}
      className="fixed z-[9999] animate-popin"
      style={style}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <style>{`
        @keyframes popin {
          from { opacity: 0; transform: translateY(-6px) scale(.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-popin { animation: popin .2s cubic-bezier(.2,1.08,.36,1); transform-origin: top center; }
        .grain-pop { background-image: radial-gradient(rgba(255,255,255,.16) 1px, transparent 1px); background-size: 3px 3px; }
      `}</style>

      <div
        className="absolute left-1/2 -top-2 h-0 w-0 -translate-x-1/2"
        style={{
          borderLeft: "9px solid transparent",
          borderRight: "9px solid transparent",
          borderBottom: "9px solid rgba(255,255,255,0.98)",
          filter: "drop-shadow(0 -1px 0 rgba(228,228,231,.9)) drop-shadow(0 -2px 6px rgba(79,70,229,0.1))",
        }}
      />

      <div className="relative overflow-hidden rounded-[22px] border border-white/80 bg-white/98 shadow-[0_30px_80px_-25px_rgba(79,70,229,0.5),0_14px_40px_-16px_rgba(30,27,75,0.35),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl">
        <div className="relative overflow-hidden border-b border-zinc-100/80 bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 px-4 pb-4 pt-4">
          <div className="pointer-events-none absolute inset-0 grain-pop opacity-40 mix-blend-overlay" />
          <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-400/25 via-violet-400/18 to-fuchsia-400/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-8 h-28 w-28 rounded-full bg-gradient-to-br from-sky-300/15 to-indigo-300/15 blur-3xl" />

          <div className="relative flex items-start gap-2.5">
            <div className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-[0_8px_18px_-8px_rgba(99,102,241,0.9)] ring-1 ring-white/70">
              <Sparkles className="h-4.5 w-4.5" />
              <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/40" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="relative">
                <input
                  ref={inputRef}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      run(customPrompt.trim() ? "CUSTOM" : "REWRITE", customPrompt);
                    }
                  }}
                  placeholder="Describe your change…"
                  className="w-full rounded-2xl border border-indigo-200/70 bg-white/85 px-3.5 py-2.5 pl-9 text-[14px] text-zinc-800 placeholder-zinc-400 outline-none shadow-[0_6px_20px_-14px_rgba(79,70,229,0.4)] ring-1 ring-inset ring-white/60 backdrop-blur transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                />
                <Sparkles className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-400" />
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-white/80 hover:text-zinc-700 hover:shadow-sm"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="relative mt-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-white/80 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-indigo-600 ring-1 ring-inset ring-white/80 shadow-sm">
              <Sparkles className="h-3 w-3 text-indigo-500" />
              {userSettings.effectiveProvider} · {userSettings.effectiveModel}
            </span>
            <Link
              href="/settings"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-br from-zinc-50 to-white px-2.5 py-1 text-[11px] font-bold text-zinc-700 ring-1 ring-zinc-200 transition hover:from-indigo-50 hover:to-violet-50 hover:text-indigo-700 hover:ring-indigo-200"
            >
              <Settings className="h-3.5 w-3.5" /> Configure
            </Link>
          </div>

          <div className="relative mt-3 grid grid-cols-2 gap-2.5">
            {PRIMARY_ACTIONS.map((a) => (
              <button
                key={a.id}
                onClick={() => run(a.id)}
                disabled={loading}
                className={`group relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-[14px] font-extrabold tracking-tight transition hover:-translate-y-[1px] disabled:opacity-60 disabled:hover:translate-y-0 ${a.color} shadow-[0_6px_16px_-10px_rgba(79,70,229,0.5)]`}
              >
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/50 via-transparent to-transparent opacity-80" />
                <span className="relative transition group-hover:-translate-y-0.5 group-hover:rotate-3">{a.icon}</span>
                <span className="relative">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3.5 bg-gradient-to-b from-white to-zinc-50/60 px-4 py-4">
          <div>
            <p className="mb-2 flex items-center gap-2 text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-zinc-500">
              <span className="inline-block h-px w-4 bg-gradient-to-r from-zinc-300 to-transparent" />
              Adjust tone
              <span className="inline-block h-px w-4 bg-gradient-to-l from-zinc-300 to-transparent" />
            </p>
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => run(t.id)}
                  disabled={loading}
                  className={`inline-flex items-center gap-1.5 rounded-2xl border border-zinc-200/90 bg-white px-3.5 py-2 text-[12.5px] font-semibold text-zinc-700 transition hover:-translate-y-[1px] hover:border-zinc-300 hover:bg-gradient-to-b hover:from-white hover:to-zinc-50 hover:shadow-[0_6px_14px_-10px_rgba(30,27,75,0.45)] hover:text-zinc-900 disabled:opacity-60 disabled:hover:translate-y-0 ${
                    action === t.id ? "!ring-2 !ring-indigo-300 !border-indigo-300 !bg-gradient-to-br !from-indigo-50 !to-violet-50 !text-indigo-700" : ""
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />

          <div>
            <p className="mb-2 flex items-center gap-2 text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-zinc-500">
              <span className="inline-block h-px w-4 bg-gradient-to-r from-zinc-300 to-transparent" />
              Transform
              <span className="inline-block h-px w-4 bg-gradient-to-l from-zinc-300 to-transparent" />
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => run(f.id)}
                  disabled={loading}
                  className={`group relative overflow-hidden flex items-center justify-start gap-2 rounded-2xl border border-zinc-200/90 bg-white px-3.5 py-2.5 text-[12.5px] font-semibold text-zinc-700 transition hover:-translate-y-[1px] hover:border-zinc-300 hover:bg-gradient-to-b hover:from-white hover:to-zinc-50 hover:shadow-[0_6px_16px_-12px_rgba(30,27,75,0.45)] disabled:opacity-60 disabled:hover:translate-y-0 ${
                    action === f.id ? "!ring-2 !ring-indigo-300 !border-indigo-300 !bg-gradient-to-br !from-indigo-50 !to-violet-50 !text-indigo-700" : ""
                  }`}
                >
                  <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-fuchsia-500/5 opacity-0 transition group-hover:opacity-100" />
                  <span className="relative">{f.icon}</span>
                  <span className="relative whitespace-nowrap">{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => run("COMPOSE")}
            disabled={loading}
            className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl border border-zinc-200/90 bg-gradient-to-br from-white via-zinc-50 to-white px-3 py-3 text-[13.5px] font-extrabold text-zinc-800 transition hover:-translate-y-[1px] hover:shadow-[0_8px_20px_-12px_rgba(30,27,75,0.45)] disabled:opacity-60 disabled:hover:translate-y-0"
          >
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/8 via-transparent to-fuchsia-500/8 opacity-0 transition group-hover:opacity-100" />
            <PencilLine className="h-4.5 w-4.5 transition group-hover:rotate-12" />
            <span>Compose more — continue this passage</span>
          </button>
        </div>

        {(loading || output || error) && (
          <div className="border-t border-zinc-100/80 bg-gradient-to-b from-zinc-50/60 via-white to-white px-4 py-3.5">
            {error && (
              <div className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-white px-3.5 py-2.5 text-[12.5px] text-red-700 shadow-sm">
                {error}
              </div>
            )}

            {loading && (
              <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/50 px-3.5 py-3 shadow-[0_6px_16px_-10px_rgba(79,70,229,0.5)] ring-1 ring-inset ring-white/70">
                <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-[0_6px_14px_-8px_rgba(99,102,241,0.85)] ring-1 ring-white/60">
                  <Spinner className="h-4 w-4 animate-spin" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-extrabold tracking-tight text-zinc-800">
                    {action ? labelFor(action) : "Working"}…
                  </p>
                  <p className="mt-0.5 truncate text-[11.5px] text-zinc-500">
                    {selectedText.length.toLocaleString()} chars selected
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,.8)]" style={{ animationDelay: "0s" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,.8)]" style={{ animationDelay: ".15s" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-fuchsia-400 shadow-[0_0_6px_rgba(232,121,249,.8)]" style={{ animationDelay: ".3s" }} />
                </div>
              </div>
            )}

            {!loading && output && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-emerald-600">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-700 shadow-sm ring-1 ring-inset ring-white/80">
                      <Check className="h-3 w-3" />
                    </span>
                    {action ? labelFor(action) : "Done"}
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={copyOut}
                      className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-br from-zinc-50 to-white px-2.5 py-1.5 text-[11.5px] font-bold text-zinc-700 ring-1 ring-zinc-200 transition hover:from-indigo-50 hover:to-violet-50 hover:text-indigo-700 hover:ring-indigo-200"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </button>
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto rounded-2xl border border-zinc-200/90 bg-gradient-to-br from-white to-zinc-50/60 p-3.5 text-[13.5px] leading-relaxed text-zinc-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_6px_18px_-12px_rgba(30,27,75,0.2)]">
                  {output.split("\n").map((ln, i) => (
                    <p key={i} className={i > 0 ? "mt-2" : ""}>
                      {ln || "\u00A0"}
                    </p>
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <p className="truncate text-[11.5px] text-zinc-500">
                    <MessageSquare className="mr-1 inline h-3.5 w-3.5 -translate-y-px text-zinc-400" />
                    Before: {selectedText.length.toLocaleString()} · After: {output.length.toLocaleString()} chars
                  </p>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={onClose}
                      className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-[12.5px] font-bold text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:text-zinc-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={accept}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 px-4 py-2 text-[12.5px] font-extrabold text-white shadow-[0_10px_20px_-10px_rgba(99,102,241,0.95)] ring-1 ring-white/60 transition hover:brightness-110 active:scale-[.98]"
                    >
                      <Check className="h-4 w-4" />
                      Replace selection
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function labelFor(a: AiEditAction): string {
  switch (a) {
    case "PROOFREAD":
      return "Proofreading";
    case "REWRITE":
      return "Rewriting";
    case "TONE_FRIENDLY":
      return "Tone → Friendly";
    case "TONE_PROFESSIONAL":
      return "Tone → Professional";
    case "TONE_CONCISE":
      return "Tone → Concise";
    case "SUMMARY":
      return "Summarizing";
    case "KEY_POINTS":
      return "Extracting key points";
    case "LIST":
      return "Formatting as list";
    case "TABLE":
      return "Formatting as table";
    case "COMPOSE":
      return "Composing continuation";
    case "CUSTOM":
      return "Custom instruction";
  }
}
