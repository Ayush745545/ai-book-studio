"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  Briefcase,
  Zap,
  Smile,
  Settings,
  ChevronRight,
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

export interface SelectionAnchor {
  /** Viewport x of the selection end caret. */
  x: number;
  /** Viewport y of the first selected line's top edge. */
  yTop: number;
  /** Viewport y of the last selected line's bottom edge. */
  yBottom: number;
}

export interface SelectionAiPopupProps {
  selectedText: string;
  bookId: string;
  chapterId: string | null;
  chapterTitle: string;
  onClose: () => void;
  onApply: (next: string) => void;
  anchor: SelectionAnchor | null;
}

/** Compact popover width (px). */
const POP_W = 340;
/** Gap between the selection and the popover (px). */
const GAP = 10;

const PRIMARY_ACTIONS: { id: AiEditAction; label: string; icon: React.ReactNode; color: string }[] = [
  {
    id: "PROOFREAD",
    label: "Proofread",
    icon: <FileText className="h-3.5 w-3.5" />,
    color:
      "border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:border-indigo-300",
  },
  {
    id: "REWRITE",
    label: "Rewrite",
    icon: <Wand className="h-3.5 w-3.5" />,
    color:
      "border-violet-200 bg-violet-50 text-violet-600 hover:bg-violet-100 hover:border-violet-300",
  },
  {
    id: "COMPOSE",
    label: "Compose",
    icon: <PencilLine className="h-3.5 w-3.5" />,
    color:
      "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 hover:border-zinc-300",
  },
];

const TONES: { id: AiEditAction; label: string; icon: React.ReactNode }[] = [
  { id: "TONE_FRIENDLY", label: "Friendly", icon: <Smile className="h-3.5 w-3.5" /> },
  { id: "TONE_PROFESSIONAL", label: "Professional", icon: <Briefcase className="h-3.5 w-3.5" /> },
  { id: "TONE_CONCISE", label: "Concise", icon: <Zap className="h-3.5 w-3.5" /> },
];

const FORMATS: { id: AiEditAction; label: string; icon: React.ReactNode }[] = [
  { id: "SUMMARY", label: "Summary", icon: <FileText className="h-3.5 w-3.5" /> },
  { id: "KEY_POINTS", label: "Key Points", icon: <List className="h-3.5 w-3.5" /> },
  { id: "LIST", label: "List", icon: <List className="h-3.5 w-3.5" /> },
  { id: "TABLE", label: "Table", icon: <TableIcon className="h-3.5 w-3.5" /> },
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
  const [moreOpen, setMoreOpen] = useState(false);
  const [pos, setPos] = useState<{
    left: number;
    top: number;
    above: boolean;
    arrowX: number;
  } | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // ── Positioning: prefer below the selection, flip above when tight ──
  useLayoutEffect(() => {
    function place() {
      if (!anchor || !cardRef.current) return;
      const h = cardRef.current.offsetHeight;
      let above = false;
      let top = anchor.yBottom + GAP;
      if (top + h > window.innerHeight - 8) {
        const aboveTop = anchor.yTop - h - GAP;
        if (aboveTop >= 8) {
          top = aboveTop;
          above = true;
        } else {
          top = Math.max(8, window.innerHeight - h - 8);
        }
      }
      // Avoid overlapping the AI Assistant popup (fixed right-6 top-20, 470×640)
      const assistantLeft = window.innerWidth - 24 - 470;
      const assistantTop = 80;
      const assistantBottom = 80 + 640;
      const popupRight = Math.min(window.innerWidth - POP_W - 8, anchor.x - POP_W / 2) + POP_W;
      const popupTop = top;
      const popupBottom = top + h;
      let maxLeft = Math.max(8, Math.min(window.innerWidth - POP_W - 8, anchor.x - POP_W / 2));
      if (popupRight > assistantLeft && popupBottom > assistantTop && popupTop < assistantBottom) {
        maxLeft = Math.min(maxLeft, assistantLeft - POP_W - GAP);
        if (maxLeft < 8) {
          maxLeft = 8;
        }
      }
      const left = maxLeft;
      const arrowX = Math.max(16, Math.min(POP_W - 16, anchor.x - left));
      setPos({ left, top, above, arrowX });
    }
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [anchor, loading, output, error, moreOpen]);

  // ── Dismiss: outside click, Escape, or any scroll (like Notion) ──
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!popRef.current) return;
      if (!popRef.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onScroll = (e: Event) => {
      // Ignore scrolls inside the popup itself (e.g. the output box).
      if (
        popRef.current &&
        e.target instanceof Node &&
        popRef.current.contains(e.target)
      )
        return;
      onClose();
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [onClose]);

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
      toast("AI failed — check OpenAI or OpenRouter setup", "error");
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

  const chip =
    "inline-flex h-7 shrink-0 items-center gap-1 rounded-lg border px-2 text-[12px] font-semibold transition disabled:opacity-60";

  return (
    <div
      ref={popRef}
      className="fixed z-[9999] animate-popin"
      style={{
        left: pos ? `${pos.left}px` : 0,
        top: pos ? `${pos.top}px` : 0,
        width: `${POP_W}px`,
        opacity: pos ? 1 : 0,
        pointerEvents: pos ? "auto" : "none",
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <style>{`
        @keyframes popin {
          from { opacity: 0; transform: translateY(-4px) scale(.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-popin { animation: popin .16s cubic-bezier(.2,1.08,.36,1); transform-origin: top center; }
      `}</style>

      {/* Arrow pointing at the selection */}
      {pos && (
        <span
          className="absolute h-0 w-0"
          style={{
            left: `${pos.arrowX - 7}px`,
            ...(pos.above ? { bottom: -7 } : { top: -7 }),
            borderLeft: "7px solid transparent",
            borderRight: "7px solid transparent",
            ...(pos.above
              ? { borderTop: "7px solid rgba(255,255,255,0.98)" }
              : { borderBottom: "7px solid rgba(255,255,255,0.98)" }),
            filter: "drop-shadow(0 0 1px rgba(30,27,75,0.18))",
          }}
        />
      )}

      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-xl border border-zinc-200/90 bg-white/98 shadow-[0_16px_40px_-16px_rgba(30,27,75,0.35),0_4px_14px_-6px_rgba(30,27,75,0.18)] backdrop-blur-xl"
      >
        {/* Row 1 — prompt input */}
        <div className="flex items-center gap-1.5 border-b border-zinc-100 px-2 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-[0_4px_10px_-4px_rgba(99,102,241,0.8)]">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <div className="relative min-w-0 flex-1">
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
              className="h-7 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-[12.5px] text-zinc-800 placeholder-zinc-400 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition ${
              moreOpen
                ? "border-indigo-200 bg-indigo-50 text-indigo-600"
                : "border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700"
            }`}
            title={moreOpen ? "Fewer options" : "More options (tone, format)"}
          >
            <ChevronRight
              className={`h-3.5 w-3.5 transition-transform ${moreOpen ? "rotate-90" : ""}`}
            />
          </button>
          <button
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
            title="Close (Esc)"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Row 2 — primary actions */}
        <div className="flex items-center gap-1.5 px-2 py-2">
          {PRIMARY_ACTIONS.map((a) => (
            <button
              key={a.id}
              onClick={() => run(a.id)}
              disabled={loading}
              className={`${chip} ${a.color} ${
                action === a.id ? "ring-2 ring-indigo-200" : ""
              }`}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
          <span
            className="ml-auto truncate pl-1 text-[10.5px] tabular-nums text-zinc-400"
            title={`${selectedText.length.toLocaleString()} characters selected`}
          >
            {selectedText.length.toLocaleString()} chars
          </span>
        </div>

        {/* Expandable — tone / format / provider */}
        {moreOpen && (
          <div className="space-y-2 border-t border-zinc-100 bg-zinc-50/60 px-2 py-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {TONES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => run(t.id)}
                  disabled={loading}
                  className={`${chip} border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 ${
                    action === t.id ? "ring-2 ring-indigo-200" : ""
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => run(f.id)}
                  disabled={loading}
                  className={`${chip} border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 ${
                    action === f.id ? "ring-2 ring-indigo-200" : ""
                  }`}
                >
                  {f.icon}
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between pt-0.5">
                <span className="inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                  <Sparkles className="h-3 w-3 text-indigo-500" />
                  {userSettings.effectiveProvider === "openrouter" ? "OpenRouter" : "✨ OpenAI"} · {userSettings.effectiveModel}
                </span>
              <Link
                href="/settings"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[10.5px] font-bold text-zinc-500 transition hover:bg-white hover:text-indigo-700"
              >
                <Settings className="h-3 w-3" /> Configure
              </Link>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 border-t border-zinc-100 px-2 py-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white">
              <Spinner className="h-3 w-3 animate-spin" />
            </span>
            <p className="min-w-0 flex-1 truncate text-[12px] font-semibold text-zinc-700">
              {action ? labelFor(action) : "Working"}…
            </p>
            <span className="flex gap-1">
              <span
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400"
                style={{ animationDelay: "0s" }}
              />
              <span
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400"
                style={{ animationDelay: ".15s" }}
              />
              <span
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-fuchsia-400"
                style={{ animationDelay: ".3s" }}
              />
            </span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="border-t border-zinc-100 px-2 py-2">
            <p className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[12px] text-red-700">
              {error}
            </p>
          </div>
        )}

        {/* Output */}
        {!loading && output && (
          <div className="space-y-2 border-t border-zinc-100 px-2 py-2">
            <div data-lenis-prevent className="max-h-44 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50/70 p-2.5 text-[12.5px] leading-relaxed text-zinc-800">
              {output.split("\n").map((ln, i) => (
                <p key={i} className={i > 0 ? "mt-1.5" : ""}>
                  {ln || "\u00A0"}
                </p>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2">
              <p
                className="min-w-0 truncate text-[10.5px] tabular-nums text-zinc-400"
                title={`Before: ${selectedText.length.toLocaleString()} chars · After: ${output.length.toLocaleString()} chars`}
              >
                {selectedText.length.toLocaleString()} → {output.length.toLocaleString()} chars
              </p>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  onClick={copyOut}
                  className={`${chip} border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-800`}
                >
                  <Copy className="h-3 w-3" /> Copy
                </button>
                <button
                  onClick={accept}
                  className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 px-2.5 text-[12px] font-bold text-white shadow-[0_6px_14px_-6px_rgba(99,102,241,0.9)] transition hover:brightness-110 active:scale-[.98]"
                >
                  <Check className="h-3 w-3" /> Replace
                </button>
              </div>
            </div>
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
