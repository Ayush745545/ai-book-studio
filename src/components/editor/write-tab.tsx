"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import type { SerializedBook, SerializedChapter, ChapterType } from "@/types";
import { apiFetch } from "@/lib/client";
import { useToast } from "@/components/ui/toast";
import { Plus, Save, Spinner, Trash, Wand, X, Check, GripVertical, FileText, ArrowLeft, ArrowRight } from "@/components/icons";
import { OnboardingTutorial } from "./onboarding-tutorial";
import { AIAssistantPopup } from "./ai-assistant-popup";
import { SelectionAiPopup } from "./selection-ai-popup";

interface WriteTabProps {
  book: SerializedBook;
  onBookChange: (b: SerializedBook) => void;
  refreshBook: () => Promise<SerializedBook>;
}

export function WriteTab({ book, onBookChange, refreshBook }: WriteTabProps) {
  const toast = useToast();
  const rawChapters = useMemo(() => book.chapters ?? [], [book.chapters]);
  const [chapters, setChapters] = useState(rawChapters);

  useEffect(() => {
    setChapters(book.chapters ?? []);
  }, [book.chapters]);

  const [activeId, setActiveId] = useState<string | null>(chapters[0]?.id ?? null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("aibookstudio-tutorial-seen");
    if (!seen) setShowTutorial(true);
  }, []);

  const active = useMemo(() => chapters.find((c) => c.id === activeId) ?? null, [chapters, activeId]);

  useEffect(() => {
    if (active) {
      setTitle(active.title);
      setContent(active.content);
      setDirty(false);
    }
  }, [active]);

  async function saveChapter() {
    if (!active) return;
    setSaving(true);
    try {
      await apiFetch(`/api/chapters/${active.id}`, {
        method: "PUT",
        body: JSON.stringify({ title, content }),
      });
      setDirty(false);
      await refreshBook();
      toast("Saved", "success");
    } catch (e) {
      toast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  }

  async function addChapter() {
    setAdding(true);
    try {
      const highest = chapters.reduce((max, c) => (c.order > max ? c.order : max), 0);
      await apiFetch(`/api/books/${book.id}/chapters`, {
        method: "POST",
        body: JSON.stringify({
          title: `Chapter ${chapters.length + 1}`,
          content: "",
          type: "CHAPTER" as ChapterType,
          order: highest + 1,
        }),
      });
      const updated = await refreshBook();
      const newChap = updated.chapters?.[updated.chapters.length - 1];
      if (newChap) setActiveId(newChap.id);
    } catch (e) {
      toast("Failed to create chapter", "error");
    } finally {
      setAdding(false);
    }
  }

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const linesRef = useRef<HTMLDivElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const highlightLayerRef = useRef<HTMLDivElement>(null);
  const [lineCount, setLineCount] = useState(1);
  const [showLines, setShowLines] = useState(true);

  useEffect(() => {
    const lines = content.split('\n').length;
    setLineCount(Math.max(lines, 50));
  }, [content]);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (linesRef.current) {
      linesRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  const [selPopup, setSelPopup] = useState<{
    text: string;
    start: number;
    end: number;
    anchor: { x: number; y: number };
  } | null>(null);

  const updateSelFromTextarea = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (end <= start || end - start < 2) {
      setSelPopup(null);
      return;
    }
    const text = ta.value.slice(start, end);
    if (!text.trim()) {
      setSelPopup(null);
      return;
    }
    const pos = caretCoords(ta, end);
    const anchor = {
      x: pos.x,
      y: pos.y - 14,
    };
    setSelPopup({ text, start, end, anchor });
  }, []);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const onUp = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ta !== target && !ta.contains(target)) return;
      window.setTimeout(updateSelFromTextarea, 0);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey || ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) {
        window.setTimeout(updateSelFromTextarea, 0);
      }
      if (e.key === "Escape") setSelPopup(null);
    };
    document.addEventListener("mouseup", onUp);
    ta.addEventListener("keyup", onKey);
    return () => {
      document.removeEventListener("mouseup", onUp);
      ta.removeEventListener("keyup", onKey);
    };
  }, [updateSelFromTextarea]);

  const applyEdit = (nextText: string) => {
    if (!selPopup || !textareaRef.current) return;
    const ta = textareaRef.current;
    const { start, end } = selPopup;
    const before = content.slice(0, start);
    const after = content.slice(end);
    const newContent = before + nextText + after;
    setContent(newContent);
    setDirty(true);
    requestAnimationFrame(() => {
      ta.focus();
      const newEnd = start + nextText.length;
      ta.setSelectionRange(newEnd, newEnd);
    });
    setSelPopup(null);
  };

  const updateHighlight = useCallback(() => {
    const layer = highlightLayerRef.current;
    const mirror = mirrorRef.current;
    const ta = textareaRef.current;
    if (!layer || !mirror || !ta) return;

    if (!selPopup) {
      layer.innerHTML = "";
      return;
    }

    const style = window.getComputedStyle(ta);
    const props = [
      "boxSizing", "width", "height", "overflowX", "overflowY",
      "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
      "borderStyle", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
      "fontStyle", "fontVariant", "fontWeight", "fontStretch", "fontSize",
      "fontSizeAdjust", "lineHeight", "fontFamily", "textAlign", "textTransform",
      "textIndent", "textDecoration", "letterSpacing", "wordSpacing", "tabSize",
      "whiteSpace", "wordWrap", "overflowWrap",
    ] as const;
    for (const p of props) (mirror.style as any)[p] = (style as any)[p];
    mirror.style.position = "absolute";
    mirror.style.visibility = "hidden";
    mirror.style.pointerEvents = "none";
    mirror.style.left = "0";
    mirror.style.top = "0";
    mirror.style.width = `${ta.clientWidth}px`;
    mirror.style.height = "auto";
    mirror.style.whiteSpace = "pre-wrap";
    mirror.style.wordWrap = "break-word";
    mirror.style.overflowWrap = "break-word";

    const { start, end } = selPopup;
    const beforeText = ta.value.substring(0, start);
    const selectedText = ta.value.substring(start, end);

    mirror.innerHTML = "";
    const beforeNode = document.createTextNode(beforeText.replace(/\n$/g, "\n\u200b"));
    const marker = document.createElement("span");
    marker.textContent = selectedText || ".";
    mirror.appendChild(beforeNode);
    mirror.appendChild(marker);
    const afterNode = document.createTextNode("\u200b");
    mirror.appendChild(afterNode);

    const range = document.createRange();
    range.setStart(marker, 0);
    range.setEnd(marker, marker.childNodes.length);
    const rects = range.getClientRects();

    const layerStyle = window.getComputedStyle(layer);
    layer.innerHTML = "";
    const taRect = ta.getBoundingClientRect();
    const layerLeft =
      taRect.left +
      parseFloat(style.paddingLeft!) +
      parseFloat(style.borderLeftWidth!) -
      parseFloat(layerStyle.left || "0");
    const layerTop =
      ta.clientTop +
      parseFloat(style.paddingTop!) -
      ta.scrollTop;

    Array.from(rects).forEach((r) => {
      if (r.width <= 0 || r.height <= 0) return;
      const mark = document.createElement("div");
      mark.style.position = "absolute";
      mark.style.left = `${r.left - taRect.left - parseFloat(style.borderLeftWidth!) - parseFloat(style.paddingLeft!) + ta.scrollLeft}px`;
      mark.style.top = `${r.top - taRect.top - parseFloat(style.borderTopWidth!) - parseFloat(style.paddingTop!) + ta.scrollTop}px`;
      mark.style.width = `${r.width}px`;
      mark.style.height = `${r.height}px`;
      mark.style.borderRadius = "3px";
      mark.style.background = "rgba(99, 102, 241, 0.22)";
      mark.style.boxShadow = "inset 0 0 0 1px rgba(99, 102, 241, 0.35)";
      mark.style.pointerEvents = "none";
      layer.appendChild(mark);
    });
  }, [selPopup]);

  useEffect(() => {
    updateHighlight();
  }, [updateHighlight, content]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const onScroll = () => updateHighlight();
    ta.addEventListener("scroll", onScroll, { passive: true });
    const onResize = () => updateHighlight();
    window.addEventListener("resize", onResize);
    return () => {
      ta.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [updateHighlight]);

  return (
    <div className="relative flex bg-[#fdfbf7] rounded-2xl overflow-hidden border border-[#eedec9] shadow-[0_10px_40px_-15px_rgba(200,180,150,0.5)] min-h-[800px] text-zinc-800 font-sans">

      {/* Sidebar */}
      <div className="w-72 bg-[#fdfbf7] border-r border-[#eedec9] flex flex-col shrink-0">
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-zinc-800">Chapters</h2>
            <div className="flex items-center justify-center w-4 h-4 rounded-full border border-zinc-300 text-[10px] text-zinc-500">?</div>
          </div>
          <button className="text-xs text-zinc-500 hover:text-zinc-800 font-medium transition">Hide</button>
        </div>

        <div className="px-4 mb-4">
          <button
            onClick={addChapter}
            disabled={adding}
            className="w-full py-2.5 px-4 bg-white border border-[#eedec9] rounded-xl text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 hover:border-zinc-300 transition flex justify-center items-center gap-2"
          >
            {adding ? <Spinner className="h-4 w-4" /> : "Add chapter"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
          {chapters.map((c, idx) => {
            const isActive = c.id === activeId;
            return (
              <div
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition ${
                  isActive
                    ? "bg-[#f4ebe1] shadow-sm border border-[#e8dac5]"
                    : "bg-transparent border border-transparent hover:bg-zinc-50"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-semibold mb-0.5 ${isActive ? "text-zinc-800" : "text-zinc-500"}`}>
                    Chapter {idx + 1}
                  </div>
                  <div className={`text-sm truncate ${isActive ? "text-zinc-900" : "text-zinc-700"}`}>
                    {c.title || "Untitled"}
                  </div>
                </div>
                <button className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-zinc-800 transition">
                  <GripVertical className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col relative bg-[#fdfbf7]">

        {/* Editor Header */}
        <div className="h-16 border-b border-[#eedec9] flex items-center justify-between px-6 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-[#f4ebe1] rounded-md text-zinc-700">
              <FileText className="h-4.5 w-4.5" />
            </div>
            <input
              value={title}
              onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
              className="text-lg font-bold text-zinc-800 bg-transparent border-none outline-none w-[400px] placeholder-zinc-400"
              placeholder="Chapter Title..."
            />
          </div>

          <div className="flex items-center gap-6">
            <span className="text-xs font-medium text-zinc-500">{wordCount} words</span>
            <div className="flex items-center gap-3 text-zinc-400">
              <button className="hover:text-zinc-800 transition" title="Zoom Out"><ArrowLeft className="h-4 w-4" /></button>
              <button className="hover:text-zinc-800 transition" title="Split Screen"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg></button>
              <button
                onClick={() => setShowLines(!showLines)}
                className={`transition ${showLines ? "text-orange-500" : "hover:text-zinc-800"}`}
                title="Toggle line numbers"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12h20"/><path d="M2 6h20"/><path d="M2 18h20"/></svg>
              </button>
            </div>

            <button
              onClick={() => setShowAI(!showAI)}
              className="px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 bg-indigo-50 text-indigo-500 hover:bg-indigo-100 border border-indigo-100"
              title="AI Assistant"
            >
              <Wand className="h-3.5 w-3.5" /> AI Assistant
            </button>

            <button
              onClick={saveChapter}
              disabled={!dirty || saving}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${dirty ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-md' : 'bg-zinc-200 text-zinc-400'}`}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Floating Toolbar */}
        <div className="absolute right-6 top-20 bg-white border border-[#eedec9] rounded-lg shadow-sm flex p-1 z-20">
          <button className="p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 rounded transition"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
          <button className="p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 rounded transition"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
          <div className="w-px bg-[#eedec9] mx-1 my-1" />
          <button className="p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 rounded transition"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg></button>
          <button className="p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 rounded transition"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg></button>
          <div className="w-px bg-[#eedec9] mx-1 my-1" />
          <button onClick={saveChapter} disabled={!dirty || saving} className={`p-1.5 rounded transition ${dirty ? 'text-orange-500 hover:bg-orange-50' : 'text-zinc-500 hover:bg-zinc-100'}`} title="Save chapter">
            <Save className="h-4 w-4" />
          </button>
        </div>

        {/* Text Area with Line Numbers */}
        <div className="flex-1 flex overflow-hidden relative">

          {showLines && (
            <div
              ref={linesRef}
              className="w-12 bg-transparent text-right pr-3 pt-8 pb-8 text-xs text-[#d3cabc] font-mono select-none overflow-hidden shrink-0 border-r border-[#eedec9]/50"
            >
              {Array.from({ length: lineCount }).map((_, i) => (
                <div key={i} className="leading-8 h-8">{i + 1}</div>
              ))}
            </div>
          )}

          <div className="flex-1 relative">
            <div
              ref={highlightLayerRef}
              aria-hidden
              className="pointer-events-none absolute inset-0 p-8 overflow-hidden"
              style={{ whiteSpace: "pre-wrap" }}
            />
            <div ref={mirrorRef} aria-hidden />
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setDirty(true);
                if (selPopup) setSelPopup(null);
              }}
              onScroll={handleScroll}
              onBlur={() => {
                setTimeout(() => {
                  const ta = textareaRef.current;
                  if (!ta) { setSelPopup(null); return; }
                  if (document.activeElement !== ta && !selPopup) {
                    setSelPopup(null);
                  }
                }, 120);
              }}
              placeholder="Start writing your chapter here…  Tip: highlight any text to open the AI editor (Proofread, Rewrite, Change tone, etc.)"
              className="absolute inset-0 resize-none outline-none border-none bg-transparent p-8 text-[15px] leading-8 text-zinc-800 placeholder-zinc-300 font-serif"
              spellCheck={false}
            />
          </div>
        </div>

        {/* AI Assistant Popup */}
        {showAI && (
          <AIAssistantPopup
            bookId={book.id}
            chapterId={active?.id ?? null}
            chapterTitle={title}
            onInsert={(text) => {
              const ta = textareaRef.current;
              if (ta && ta.selectionEnd > ta.selectionStart) {
                const start = ta.selectionStart;
                const end = ta.selectionEnd;
                const next = content.slice(0, start) + text + content.slice(end);
                setContent(next);
                requestAnimationFrame(() => {
                  ta.focus();
                  const p = start + text.length;
                  ta.setSelectionRange(p, p);
                });
              } else {
                setContent((prev) => prev + (prev.endsWith("\n") ? "" : "\n") + text);
              }
              setDirty(true);
            }}
            onClose={() => setShowAI(false)}
          />
        )}
      </div>

      {selPopup && (
        <SelectionAiPopup
          selectedText={selPopup.text}
          bookId={book.id}
          chapterId={active?.id ?? null}
          chapterTitle={title}
          anchor={selPopup.anchor}
          onClose={() => setSelPopup(null)}
          onApply={applyEdit}
        />
      )}

      {/* Tutorial Overlay */}
      {showTutorial && (
        <OnboardingTutorial
          onFinish={() => {
            setShowTutorial(false);
            localStorage.setItem("aibookstudio-tutorial-seen", "true");
          }}
        />
      )}
    </div>
  );
}

function caretCoords(ta: HTMLTextAreaElement, pos: number): { x: number; y: number } {
  const doc = document;
  const div = doc.createElement("div");
  const style = window.getComputedStyle(ta);
  const props = [
    "boxSizing", "width", "height", "overflowX", "overflowY",
    "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
    "borderStyle", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "fontStyle", "fontVariant", "fontWeight", "fontStretch", "fontSize",
    "fontSizeAdjust", "lineHeight", "fontFamily", "textAlign", "textTransform",
    "textIndent", "textDecoration", "letterSpacing", "wordSpacing", "tabSize",
  ] as const;
  div.style.position = "absolute";
  div.style.visibility = "hidden";
  div.style.whiteSpace = "pre-wrap";
  div.style.wordWrap = "break-word";
  div.style.overflowWrap = "break-word";
  for (const p of props) (div.style as any)[p] = (style as any)[p];
  div.style.width = `${ta.clientWidth}px`;
  div.style.height = "auto";

  const rect = ta.getBoundingClientRect();
  const mirrorOffset = rect.top - ta.scrollTop;
  const mirrorOffsetX = rect.left - ta.scrollLeft;

  const before = ta.value.substring(0, Math.max(0, pos));
  const spanText = doc.createElement("span");
  const beforeText = before.replace(/\n$/g, "\n\u200b");
  spanText.textContent = ".";
  div.textContent = beforeText;
  div.appendChild(spanText);
  doc.body.appendChild(div);
  const spanRect = spanText.getBoundingClientRect();
  let x = spanRect.left + spanRect.width / 2;
  let y = spanRect.top + spanRect.height + window.scrollY;
  doc.body.removeChild(div);

  if (x === 0 && y === 0) {
    x = rect.left + ta.clientWidth / 2;
    y = rect.top + 48;
  }
  return { x: x, y: y - (mirrorOffset !== 0 ? 0 : 0) };
}
