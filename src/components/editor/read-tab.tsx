"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SerializedBook } from "@/types";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Fullscreen,
  Minimize,
  Type,
  LayoutDashboard,
} from "@/components/icons";
import { BookTTS, type TTSState } from "./book-tts";

/* ────────────────────────── Types ────────────────────────── */

interface ReadTabProps {
  book: SerializedBook;
  onBackToWrite: () => void;
  isStoreView?: boolean;
  storeUrl?: string;
}

type TurnDir = "fwd" | "bwd";

const FONTS = [
  { value: "serif", label: "Serif", css: "Georgia, 'Cambria', serif" },
  { value: "sans", label: "Sans", css: "system-ui, -apple-system, sans-serif" },
  { value: "mono", label: "Mono", css: "'SF Mono', 'Consolas', monospace" },
  { value: "georgia", label: "Georgia", css: "Georgia, serif" },
  { value: "merriweather", label: "Merriweather", css: "'Merriweather', Georgia, serif" },
];

const FLIP_THRESHOLD = 0.25;
const ANIM_MS = 550;

/* ──────────────────── Pagination helper ──────────────────── */

function paginateText(
  paragraphs: string[],
  width: number,
  height: number,
  style: React.CSSProperties,
): string[][] {
  if (!paragraphs.length || height <= 0 || width <= 0) return [[]];

  const el = document.createElement("div");
  Object.assign(el.style, {
    position: "absolute",
    visibility: "hidden",
    top: "-9999px",
    width: `${width}px`,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    lineHeight: String(style.lineHeight),
    textAlign: "justify",
    wordBreak: "break-word",
  });
  document.body.appendChild(el);

  const pages: string[][] = [];
  let cur: string[] = [];
  let h = 0;
  const gap = 20;

  for (const p of paragraphs) {
    el.textContent = p;
    const pH = el.getBoundingClientRect().height + gap;
    if (h + pH > height && cur.length > 0) {
      pages.push(cur);
      cur = [p];
      h = pH;
    } else {
      cur.push(p);
      h += pH;
    }
  }
  if (cur.length) pages.push(cur);

  document.body.removeChild(el);
  return pages.length ? pages : [[]];
}

/* ──────────────── Page-turn sound (Web Audio) ────────────── */

let audioCtxCache: AudioContext | null = null;
function getAudioCtx() {
  if (!audioCtxCache || audioCtxCache.state === "closed") {
    audioCtxCache = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtxCache;
}

function playPageFlip() {
  try {
    const ctx = getAudioCtx();
    const dur = 0.18;
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);

    // Paper-rustle noise shaped by envelope
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const env = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
      d[i] = (Math.random() * 2 - 1) * 0.18 * env;
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const bpf = ctx.createBiquadFilter();
    bpf.type = "bandpass";
    bpf.frequency.value = 2800;
    bpf.Q.value = 0.7;

    const gain = ctx.createGain();
    gain.gain.value = 0.35;

    src.connect(bpf).connect(gain).connect(ctx.destination);
    src.start();
  } catch {
    /* silent */
  }
}

/* ──────────────────── Easing helpers ─────────────────────── */

/** ease-out cubic */
function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/* ────────────────────── PAPER SVG TEXTURE ────────────────── */
const PAPER_TEX =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")";

/* ═══════════════════════ COMPONENT ═══════════════════════ */

export function ReadTab({ book, onBackToWrite, isStoreView, storeUrl }: ReadTabProps) {
  const chapters = book.chapters ?? [];
  const [chapterIdx, setChapterIdx] = useState(0);
  const [font, setFont] = useState("serif");
  const [fontSize, setFontSize] = useState(17);
  const [lineHeight, setLineHeight] = useState(1.85);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [ttsState, setTtsState] = useState<TTSState>({ activeSentenceIdx: -1, activeSentenceText: "", isPlaying: false });
  const wrapRef = useRef<HTMLDivElement>(null);

  /* ── Pagination ── */
  const [pages, setPages] = useState<string[][]>([[]]);
  const [spreadIdx, setSpreadIdx] = useState(0);
  const measRef = useRef<HTMLDivElement>(null);

  const fontStyle = useMemo<React.CSSProperties>(
    () => ({
      fontFamily: FONTS.find((f) => f.value === font)?.css || "Georgia, serif",
      fontSize: `${fontSize}px`,
      lineHeight,
    }),
    [font, fontSize, lineHeight],
  );

  const currentChapter = chapters[chapterIdx];
  const totalChapters = chapters.length;

  const paragraphs = useMemo(
    () =>
      currentChapter?.content
        ?.split(/\r?\n\r?\n/)
        .map((p) => p.trim())
        .filter(Boolean) ?? [],
    [currentChapter],
  );

  useEffect(() => {
    const recalc = () => {
      if (!measRef.current) return;
      const { clientWidth: w, clientHeight: h } = measRef.current;
      setPages(paginateText(paragraphs, w, h, fontStyle));
      setSpreadIdx(0);
    };
    // small delay so the layout is settled
    const id = setTimeout(recalc, 60);
    window.addEventListener("resize", recalc);
    return () => {
      clearTimeout(id);
      window.removeEventListener("resize", recalc);
    };
  }, [paragraphs, fontStyle]);

  const totalSpreads = Math.ceil(pages.length / 2);
  const pg = (i: number) => pages[i] ?? null;

  /* ── Turn animation state ── */
  const [turnProgress, setTurnProgress] = useState(0); // 0‒1
  const [turnDir, setTurnDir] = useState<TurnDir | null>(null);
  const turning = turnDir !== null;
  const animRef = useRef(0);
  const dragRef = useRef({ active: false, startX: 0, pointerId: -1 });
  const bookRef = useRef<HTMLDivElement>(null);

  /* ── Can navigate? ── */
  const canFwd = spreadIdx < totalSpreads - 1 || chapterIdx < totalChapters - 1;
  const canBwd = spreadIdx > 0 || chapterIdx > 0;

  /* ── Animate to target ── */
  const animateTo = useCallback(
    (from: number, to: number, dir: TurnDir, onDone: () => void) => {
      cancelAnimationFrame(animRef.current);
      setTurnDir(dir);
      const t0 = performance.now();
      playPageFlip();

      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / ANIM_MS);
        setTurnProgress(from + (to - from) * easeOut(t));
        if (t < 1) {
          animRef.current = requestAnimationFrame(tick);
        } else {
          setTurnProgress(0);
          setTurnDir(null);
          onDone();
        }
      };
      animRef.current = requestAnimationFrame(tick);
    },
    [],
  );

  /* ── Advance / retreat ── */
  const advanceSpread = useCallback(() => {
    if (spreadIdx < totalSpreads - 1) {
      setSpreadIdx((s) => s + 1);
    } else if (chapterIdx < totalChapters - 1) {
      setChapterIdx((c) => c + 1);
    }
  }, [spreadIdx, totalSpreads, chapterIdx, totalChapters]);

  const retreatSpread = useCallback(() => {
    if (spreadIdx > 0) {
      setSpreadIdx((s) => s - 1);
    } else if (chapterIdx > 0) {
      setChapterIdx((c) => c - 1);
      // jump to last spread of prev chapter — handled via ref
    }
  }, [spreadIdx, chapterIdx]);

  // When going to previous chapter, jump to its last spread
  const prevChIdx = useRef(chapterIdx);
  useEffect(() => {
    if (chapterIdx < prevChIdx.current) {
      const t = setTimeout(() => setSpreadIdx(Math.max(0, Math.ceil(pages.length / 2) - 1)), 80);
      prevChIdx.current = chapterIdx;
      return () => clearTimeout(t);
    }
    prevChIdx.current = chapterIdx;
  }, [chapterIdx, pages.length]);

  /* ── goNext / goPrev (keyboard & button) ── */
  const goNext = useCallback(() => {
    if (!canFwd || turning) return;
    animateTo(0, 1, "fwd", advanceSpread);
  }, [canFwd, turning, animateTo, advanceSpread]);

  const goPrev = useCallback(() => {
    if (!canBwd || turning) return;
    animateTo(0, 1, "bwd", retreatSpread);
  }, [canBwd, turning, animateTo, retreatSpread]);

  /* ── Pointer (mouse + touch) drag ── */
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (turning) return;
      const rect = bookRef.current?.getBoundingClientRect();
      if (!rect) return;
      const relX = (e.clientX - rect.left) / rect.width;
      let dir: TurnDir | null = null;
      if (relX > 0.5 && canFwd) dir = "fwd";
      else if (relX <= 0.5 && canBwd) dir = "bwd";
      if (!dir) return;
      dragRef.current = { active: true, startX: e.clientX, pointerId: e.pointerId };
      setTurnDir(dir);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [turning, canFwd, canBwd],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current.active || !turnDir) return;
      const rect = bookRef.current?.getBoundingClientRect();
      if (!rect) return;
      const half = rect.width / 2;
      const dx =
        turnDir === "fwd"
          ? dragRef.current.startX - e.clientX
          : e.clientX - dragRef.current.startX;
      setTurnProgress(Math.max(0, Math.min(1, dx / half)));
    },
    [turnDir],
  );

  const onPointerUp = useCallback(() => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    const p = turnProgress;
    const dir = turnDir;
    if (!dir) return;
    if (p > FLIP_THRESHOLD) {
      animateTo(p, 1, dir, dir === "fwd" ? advanceSpread : retreatSpread);
    } else {
      // snap back
      const t0 = performance.now();
      const from = p;
      cancelAnimationFrame(animRef.current);
      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / 300);
        setTurnProgress(from * (1 - easeOut(t)));
        if (t < 1) {
          animRef.current = requestAnimationFrame(tick);
        } else {
          setTurnProgress(0);
          setTurnDir(null);
        }
      };
      animRef.current = requestAnimationFrame(tick);
    }
  }, [turnProgress, turnDir, animateTo, advanceSpread, retreatSpread]);

  /* ── Keyboard ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Escape") {
        setIsFullscreen(false);
        document.exitFullscreen?.();
      } else if (e.key === "f") setShowControls((s) => !s);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  /* ── Fullscreen ── */
  const toggleFS = async () => {
    if (!isFullscreen && wrapRef.current) {
      try { await wrapRef.current.requestFullscreen(); setIsFullscreen(true); } catch { /* */ }
    } else {
      try { await document.exitFullscreen(); setIsFullscreen(false); } catch { /* */ }
    }
  };

  /* ── Cleanup ── */
  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  /* ───────────── Empty state ───────────── */
  if (!chapters.length) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center p-8">
          <BookOpen className="h-12 w-12 mx-auto text-zinc-700" />
          <h3 className="mt-4 text-lg font-medium text-white">No chapters to read</h3>
          <p className="mt-2 text-zinc-500">
            {isStoreView ? "This book has no content yet." : "Add chapters in the Write tab to start reading."}
          </p>
          {isStoreView ? (
            <a href={storeUrl} className="mt-4 btn-primary inline-flex">Back to Store</a>
          ) : (
            <button onClick={onBackToWrite} className="mt-4 btn-primary">
              <Type className="h-4 w-4 mr-2" /> Go to Write
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ───────────── Page rendering ───────────── */
  const renderPageContent = (paras: string[] | null, num: number, side: "L" | "R") => {
    if (!paras || !paras.length) {
      return (
        <div className="h-full flex items-center justify-center">
          <BookOpen className="h-14 w-14" style={{ color: "#d9d0c0", opacity: 0.25 }} />
        </div>
      );
    }
    
    // Highlight logic: if activeSentenceText is present, replace it with a highlighted span
    const highlight = (text: string) => {
      if (!ttsState.isPlaying || !ttsState.activeSentenceText) return text;
      const idx = text.indexOf(ttsState.activeSentenceText);
      if (idx === -1) return text;
      
      return (
        <>
          {text.substring(0, idx)}
          <span style={{ backgroundColor: "rgba(252, 211, 77, 0.4)", borderRadius: "2px", transition: "background-color 0.2s" }}>
            {text.substring(idx, idx + ttsState.activeSentenceText.length)}
          </span>
          {text.substring(idx + ttsState.activeSentenceText.length)}
        </>
      );
    };

    return (
      <div className="h-full flex flex-col" style={{ ...fontStyle, color: "#2a2622" }}>
        <div className="flex-1 overflow-hidden text-justify">
          {paras.map((p, i) => (
            <p key={i} className="mb-5 leading-relaxed">
              {highlight(p)}
            </p>
          ))}
        </div>
        <p
          className={`text-[9px] tracking-[0.25em] mt-auto pt-3 ${side === "L" ? "text-left" : "text-right"}`}
          style={{ color: "#b0a58e", fontFamily: "system-ui" }}
        >
          {num}
        </p>
      </div>
    );
  };

  /* ── Page data ── */
  const L = pg(spreadIdx * 2);
  const R = pg(spreadIdx * 2 + 1);
  const nextL = pg((spreadIdx + 1) * 2);
  const nextR = pg((spreadIdx + 1) * 2 + 1);
  const prevL = pg((spreadIdx - 1) * 2);
  const prevR = pg((spreadIdx - 1) * 2 + 1);
  const leftNum = spreadIdx * 2 + 1;
  const rightNum = spreadIdx * 2 + 2;

  /* ── Turn geometry ── */
  const p = turnProgress;
  // Forward: right page rotates left. Backward: left page rotates right.
  const fwd = turnDir === "fwd";
  const angle = fwd ? -p * 180 : p * 180;
  const origin = fwd ? "left center" : "right center";
  // Shadow on the "stationary" page darkens as the turning page passes over
  const shadowOpacity = p < 0.5 ? p * 0.4 : (1 - p) * 0.4;
  // Gradient on turning page's leading edge — simulates paper curl
  const curlGradient = fwd
    ? `linear-gradient(to right, rgba(0,0,0,${0.12 * p}) 0%, transparent 30%)`
    : `linear-gradient(to left, rgba(0,0,0,${0.12 * p}) 0%, transparent 30%)`;

  const pageStyle = (bg: string): React.CSSProperties => ({
    background: bg,
    backgroundImage: PAPER_TEX,
    backgroundBlendMode: "multiply",
  });

  /* ═══════════════════════ JSX ═══════════════════════ */
  return (
    <div
      ref={wrapRef}
      className="relative w-full flex flex-col select-none rounded-2xl overflow-hidden min-h-[800px]"
      style={{
        background:
          "radial-gradient(1200px 600px at 50% -10%, rgba(99, 102, 241, 0.18), transparent 60%), radial-gradient(900px 500px at 10% 100%, rgba(168, 85, 247, 0.12), transparent 60%), linear-gradient(180deg, #12121a 0%, #0f0f16 50%, #0c0c12 100%)",
      }}
    >
      {/* ── Inline keyframes ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        .page-edge-left::before,
        .page-edge-right::after {
          content: '';
          position: absolute;
          top: 4px; bottom: 4px;
          width: 6px;
          pointer-events: none;
        }
        .page-edge-left::before {
          left: -5px;
          background: linear-gradient(to right,
            rgba(180,170,150,0.0),
            rgba(180,170,150,0.12) 20%,
            rgba(180,170,150,0.22) 40%,
            rgba(180,170,150,0.28) 60%,
            rgba(180,170,150,0.35) 80%,
            rgba(190,180,165,0.4));
          border-radius: 2px 0 0 2px;
        }
        .page-edge-right::after {
          right: -5px;
          background: linear-gradient(to left,
            rgba(180,170,150,0.0),
            rgba(180,170,150,0.12) 20%,
            rgba(180,170,150,0.22) 40%,
            rgba(180,170,150,0.28) 60%,
            rgba(180,170,150,0.35) 80%,
            rgba(190,180,165,0.4));
          border-radius: 0 2px 2px 0;
        }
      `}} />

      {/* ── Top controls ── */}
      {showControls && (
        <div className="absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/90 via-black/50 to-transparent px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {isStoreView ? (
              <a href={storeUrl} className="btn-ghost text-xs"><LayoutDashboard className="h-4 w-4 mr-1" /> Back to Store</a>
            ) : (
              <button onClick={onBackToWrite} className="btn-ghost text-xs"><LayoutDashboard className="h-4 w-4 mr-1" /> Back to Write</button>
            )}
            <span className="text-sm font-medium text-zinc-300 truncate max-w-[200px]">{book.title}</span>
            <span className="text-[10px] text-zinc-500 bg-white/5 px-2 py-0.5 rounded">Ch {chapterIdx + 1}/{totalChapters}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <select value={font} onChange={(e) => setFont(e.target.value)} className="input w-auto text-xs !py-1 bg-white/5 border-white/10">
              {FONTS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <div className="flex items-center gap-1 px-1">
              <span className="text-[10px] text-zinc-600">Aa</span>
              <input type="range" min={14} max={24} value={fontSize} onChange={(e) => setFontSize(+e.target.value)} className="w-20 accent-indigo-500" />
            </div>
            <div className="flex items-center gap-1 px-1">
              <span className="text-[10px] text-zinc-600">≡</span>
              <input type="range" min={1.4} max={2.4} step={0.1} value={lineHeight} onChange={(e) => setLineHeight(+e.target.value)} className="w-20 accent-indigo-500" />
            </div>
            <button onClick={toggleFS} className="btn-ghost !p-1.5" title="Fullscreen">
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Fullscreen className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      {/* ── Book ── */}
      <div className="flex-1 flex items-center justify-center px-2 sm:px-6 py-4 overflow-hidden" style={{ perspective: "2500px" }}>
        <div
          ref={bookRef}
          className="relative flex touch-none"
          style={{ width: "min(92vw, 1060px)", height: "min(76vh, 800px)" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >

          {/* ═══ LEFT PAGE ═══ */}
          <div
            className="relative flex-1 rounded-l page-edge-left overflow-hidden"
            style={{
              ...pageStyle("#f1ece0"),
              boxShadow: "-4px 4px 20px rgba(0,0,0,0.35)",
            }}
          >
            {/* Chapter heading — first spread only */}
            {spreadIdx === 0 && (
              <div className="pt-8 sm:pt-12 px-8 sm:px-12 text-center" style={{ color: "#2a2622" }}>
                <p className="text-[9px] font-semibold uppercase tracking-[0.35em] mb-3" style={{ color: "#9b8e78" }}>
                  Chapter {chapterIdx + 1}
                </p>
                <h2 className="text-xl sm:text-2xl font-bold leading-tight" style={{ fontFamily: fontStyle.fontFamily }}>
                  {currentChapter?.title}
                </h2>
                <div className="mx-auto mt-4 mb-2 w-12 border-t" style={{ borderColor: "#d0c5b0" }} />
              </div>
            )}
            <div
              ref={measRef}
              className="px-8 sm:px-12 pb-6 overflow-hidden"
              style={{ height: spreadIdx === 0 ? "calc(100% - 120px)" : "100%", paddingTop: spreadIdx === 0 ? 0 : "2rem" }}
            >
              {renderPageContent(L, leftNum, "L")}
            </div>

            {/* Shadow overlay when forward turn covers this page */}
            {turning && fwd && (
              <div
                className="absolute inset-0 pointer-events-none transition-none"
                style={{
                  background: `linear-gradient(${p > 0.5 ? "to right" : "to left"}, rgba(0,0,0,${shadowOpacity}), transparent)`,
                }}
              />
            )}
          </div>

          {/* ═══ SPINE ═══ */}
          <div
            className="w-2 sm:w-3 flex-shrink-0 relative z-20"
            style={{
              background: "linear-gradient(90deg, #c4b9a3, #b5a890 30%, #b5a890 70%, #c4b9a3)",
              boxShadow: "inset 0 0 4px rgba(0,0,0,0.3)",
            }}
          />

          {/* ═══ RIGHT PAGE ═══ */}
          <div
            className="relative flex-1 rounded-r page-edge-right overflow-hidden"
            style={{
              ...pageStyle("#f6f2e9"),
              boxShadow: "4px 4px 20px rgba(0,0,0,0.35)",
            }}
          >
            {/* Under-page: next right page, revealed when forward turn lifts right page */}
            {turning && fwd && (
              <div className="absolute inset-0 px-8 sm:px-12 py-8 overflow-hidden" style={pageStyle("#f6f2e9")}>
                {renderPageContent(nextR, rightNum + 2, "R")}
              </div>
            )}

            {/* Actual right page (static when not turning fwd) */}
            {!(turning && fwd) && (
              <div className="px-8 sm:px-12 py-8 h-full overflow-hidden" style={{ paddingTop: spreadIdx === 0 ? "calc(120px)" : "2rem" }}>
                {renderPageContent(R, rightNum, "R")}
              </div>
            )}

            {/* Shadow overlay when backward turn covers this page */}
            {turning && !fwd && (
              <div
                className="absolute inset-0 pointer-events-none z-[5]"
                style={{
                  background: `linear-gradient(${p > 0.5 ? "to left" : "to right"}, rgba(0,0,0,${shadowOpacity}), transparent)`,
                }}
              />
            )}
          </div>

          {/* Under-page for backward: prev left revealed behind left page */}
          {turning && !fwd && (
            <div
              className="absolute top-0 bottom-0 left-0 rounded-l overflow-hidden"
              style={{ ...pageStyle("#f1ece0"), width: "calc(50% - 6px)" }}
            >
              <div className="px-8 sm:px-12 py-8 h-full overflow-hidden">
                {renderPageContent(prevL, leftNum - 2, "L")}
              </div>
            </div>
          )}

          {/* ═══ TURNING PAGE ═══ */}
          {turning && (
            <div
              className="absolute top-0 bottom-0 z-30"
              style={{
                width: "calc(50% - 6px)",
                ...(fwd
                  ? { left: "calc(50% + 6px)" }   /* starts on right half */
                  : { left: "0" }),                 /* starts on left half */
                transform: `rotateY(${angle}deg)`,
                transformOrigin: origin,
                transformStyle: "preserve-3d",
              }}
            >
              {/* ── Front face ── */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{
                  ...pageStyle(fwd ? "#f6f2e9" : "#f1ece0"),
                  backfaceVisibility: "hidden",
                  boxShadow: fwd
                    ? `${-6 * p}px 0 ${20 * p}px rgba(0,0,0,${0.2 * p})`
                    : `${6 * p}px 0 ${20 * p}px rgba(0,0,0,${0.2 * p})`,
                  borderRadius: fwd ? "0 4px 4px 0" : "4px 0 0 4px",
                }}
              >
                {/* Chapter title area for first spread */}
                {spreadIdx === 0 && !fwd && (
                  <div className="pt-8 sm:pt-12 px-8 sm:px-12 text-center" style={{ color: "#2a2622" }}>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.35em] mb-3" style={{ color: "#9b8e78" }}>
                      Chapter {chapterIdx + 1}
                    </p>
                    <h2 className="text-xl sm:text-2xl font-bold leading-tight" style={{ fontFamily: fontStyle.fontFamily }}>
                      {currentChapter?.title}
                    </h2>
                    <div className="mx-auto mt-4 mb-2 w-12 border-t" style={{ borderColor: "#d0c5b0" }} />
                  </div>
                )}
                <div
                  className="px-8 sm:px-12 overflow-hidden"
                  style={{
                    height: spreadIdx === 0 && !fwd ? "calc(100% - 120px)" : "100%",
                    paddingTop: spreadIdx === 0 && !fwd ? 0 : "2rem",
                    paddingBottom: "1.5rem",
                  }}
                >
                  {fwd
                    ? renderPageContent(R, rightNum, "R")
                    : renderPageContent(L, leftNum, "L")}
                </div>

                {/* Curl shadow gradient on front */}
                <div className="absolute inset-0 pointer-events-none" style={{ background: curlGradient }} />
              </div>

              {/* ── Back face ── */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{
                  ...pageStyle(fwd ? "#ede8dc" : "#f0eadf"),
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                  borderRadius: fwd ? "4px 0 0 4px" : "0 4px 4px 0",
                }}
              >
                <div className="px-8 sm:px-12 py-8 h-full overflow-hidden">
                  {fwd
                    ? renderPageContent(nextL, leftNum + 2, "L")
                    : renderPageContent(prevR, rightNum - 2, "R")}
                </div>
                {/* Slightly dimmer — simulates the back-of-paper feel */}
                <div className="absolute inset-0 pointer-events-none" style={{ background: "rgba(0,0,0,0.03)" }} />
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="relative z-40 flex items-center justify-between px-4 sm:px-8 py-2.5 border-t border-white/5" style={{ background: "rgba(15, 15, 22, 0.85)", backdropFilter: "blur(8px)" }}>
        <button onClick={goPrev} disabled={!canBwd || turning} className="btn-ghost !text-zinc-500 hover:!text-zinc-200 disabled:opacity-15 gap-1">
          <ChevronLeft className="h-5 w-5" />
          <span className="text-[11px] hidden sm:inline">Prev</span>
        </button>

        <div className="flex flex-col items-center gap-0.5 min-w-0">
          <span className="text-[11px] font-medium text-zinc-400 truncate max-w-[260px]">{currentChapter?.title}</span>
          <span className="text-[10px] text-zinc-600">
            Page {leftNum}–{R ? rightNum : leftNum} of {pages.length} · Ch {chapterIdx + 1}/{totalChapters}
          </span>
          <div className="w-40 h-[3px] bg-white/[0.07] rounded-full mt-1 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${((chapterIdx + (spreadIdx + 1) / totalSpreads) / totalChapters) * 100}%`,
                background: "linear-gradient(90deg, #8b7355, #a08c6e)",
              }}
            />
          </div>
        </div>

        <button onClick={goNext} disabled={!canFwd || turning} className="btn-ghost !text-zinc-500 hover:!text-zinc-200 disabled:opacity-15 gap-1">
          <span className="text-[11px] hidden sm:inline">Next</span>
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* ── TTS Panel ── */}
      {showControls && (
        <div className="relative z-40 border-t border-white/5 px-4 sm:px-8 py-2" style={{ background: "rgba(12, 12, 18, 0.9)", backdropFilter: "blur(8px)" }}>
          <BookTTS
            text={currentChapter?.content || ""}
            chapterTitle={currentChapter?.title || "Chapter"}
            onStateChange={setTtsState}
          />
        </div>
      )}

      {/* Double-click fullscreen */}
      <div onDoubleClick={toggleFS} className="absolute inset-0 z-0" aria-hidden />
    </div>
  );
}