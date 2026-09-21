"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SerializedBook, SerializedChapter, ChapterType } from "@/types";
import { apiFetch } from "@/lib/client";
import { useToast } from "@/components/ui/toast";
import { useUserSettings } from "@/components/user-settings-context";
import { Plus, Spinner, Trash, Wand, X, Check, GripVertical, FileText, ArrowLeft, ArrowRight } from "@/components/icons";
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
  const [autoSaved, setAutoSaved] = useState(true);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const { settings } = useUserSettings();
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const seen = localStorage.getItem("aibookstudio-tutorial-seen");
    if (!seen) setShowTutorial(true);
  }, []);

  const active = useMemo(() => chapters.find((c) => c.id === activeId) ?? null, [chapters, activeId]);

  // Only reload the editor when the active chapter *id* changes — not on every
  // refreshBook() round-trip, which would clobber in-flight edits with stale
  // server data and defeat the autosave timer.
  const loadedChapterIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (active && active.id !== loadedChapterIdRef.current) {
      // Flush any pending edits to the *previous* chapter before switching,
      // otherwise the autosave timer would write old content to the new chapter.
      if (dirty && loadedChapterIdRef.current) {
        runAutoSave();
      }
      loadedChapterIdRef.current = active.id;
      setTitle(active.title);
      setContent(active.content);
      setDirty(false);
      setAutoSaved(true);
    }
  }, [active?.id]);

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
    updateHighlight();
  };

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  const saveNow = async () => {
    if (!active || saving) return;
    setSaving(true);
    try {
      await apiFetch(`/api/chapters/${active.id}`, {
        method: "PUT",
        body: JSON.stringify({ title, content }),
      });
      setDirty(false);
      setAutoSaved(true);
      toast("Saved", "success");
    } catch (e) {
      setAutoSaved(false);
      toast("Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  // Ctrl/Cmd+S → save instantly (and prevent the browser's save dialog).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveNow();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [saveNow]);

  const [selPopup, setSelPopup] = useState<{
    text: string;
    start: number;
    end: number;
    anchor: { x: number; yTop: number; yBottom: number };
  } | null>(null);

  async function runAutoSave() {
    if (!active) return;
    setSaving(true);
    try {
      await apiFetch(`/api/chapters/${active.id}`, {
        method: "PUT",
        body: JSON.stringify({ title, content }),
      });
      setDirty(false);
      setAutoSaved(true);
      // Don't call refreshBook() here — it would re-trigger the save effect
      // via the chapters state and create a save loop. The parent component
      // re-reads the chapter on navigation / next chapter switch instead.
    } catch (e) {
      setAutoSaved(false);
      toast("Auto-save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  // Debounced auto-save — fires 1500ms after the user stops typing.
  useEffect(() => {
    if (!autoSaveEnabled) {
      setAutoSaved(true);
      return;
    }
    if (!dirty) {
      setAutoSaved(true);
      return;
    }
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      runAutoSave();
    }, 1500);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, title, content, autoSaveEnabled]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

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
    const endPos = caretCoords(ta, end);
    const startPos = caretCoords(ta, start);
    const anchor = {
      x: endPos.x,
      yTop: startPos.yTop,
      yBottom: endPos.yBottom,
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

    layer.innerHTML = "";
    const taRect = ta.getBoundingClientRect();

    Array.from(rects).forEach((r) => {
      if (r.width <= 0 || r.height <= 0) return;
      const mark = document.createElement("div");
      mark.style.position = "absolute";
      // The mirror sits at the same origin as the textarea, so the range rects
      // are already container-relative (padding included). Only the textarea's
      // own scroll must be subtracted so marks track the visible text.
      mark.style.left = `${r.left - taRect.left - ta.scrollLeft}px`;
      mark.style.top = `${r.top - taRect.top - ta.scrollTop}px`;
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

        <div data-lenis-prevent className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
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
        <div className="h-16 border-b border-[#eedec9] flex items-center justify-between px-6 bg-[#faf5ec] sticky top-0 z-10 shadow-[0_1px_0_rgba(255,255,255,0.6)]">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-[#f4ebe1] rounded-md text-zinc-700">
              <FileText className="h-4 w-4" />
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
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium flex items-center gap-1.5 ${
                saving ? "text-amber-500" : autoSaved ? "text-emerald-500" : dirty ? "text-zinc-500" : "text-zinc-400"
              }`}>
                {saving ? (
                  <span className="inline-flex h-3 w-3 rounded-full border-2 border-amber-300 border-t-amber-600 animate-spin" />
                ) : autoSaved ? (
                  <Check className="h-3.5 w-3.5" />
                ) : dirty ? (
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                ) : null}
                {saving ? "Saving…" : autoSaved ? "Saved" : dirty ? "Unsaved" : "Idle"}
              </span>
              <button
                onClick={saveNow}
                disabled={saving || !dirty}
                title="Save now (Ctrl/Cmd+S)"
                className={`inline-flex items-center justify-center rounded-lg px-2 py-0.5 text-xs font-semibold transition ${
                  dirty ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                }`}
              >
                {saving ? <Spinner className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
              </button>
              <label className="flex items-center gap-1.5 text-xs text-zinc-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoSaveEnabled}
                  onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <span className="relative w-7 h-4 bg-zinc-200 rounded-full peer-checked:bg-indigo-500 transition after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-3 after:w-3 after:transition peer-checked:after:translate-x-3" />
                Auto
              </label>
            </div>

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
        </div>

        {/* Floating Toolbar */}
        <div className="absolute right-6 top-20 bg-white border border-[#eedec9] rounded-lg shadow-sm flex p-1 z-20">
          <button
            onClick={() => {
              textareaRef.current?.focus();
              document.execCommand("undo");
              setContent(textareaRef.current?.value ?? content);
              setDirty(true);
            }}
            className="p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 rounded transition"
            title="Undo"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
          </button>
          <button
            onClick={() => {
              textareaRef.current?.focus();
              document.execCommand("redo");
              setContent(textareaRef.current?.value ?? content);
              setDirty(true);
            }}
            className="p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 rounded transition"
            title="Redo"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>
          </button>
          <div className="w-px bg-[#eedec9] mx-1 my-1" />
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
              data-lenis-prevent
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

function caretCoords(
  ta: HTMLTextAreaElement,
  pos: number
): { x: number; yTop: number; yBottom: number } {
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
  // The mirror div must sit exactly on top of the textarea in *viewport*
  // coordinates (offset by the textarea's internal scroll). Otherwise the
  // measured caret span returns document-flow offsets and the selection
  // popup lands at the wrong place on screen.
  div.style.position = "fixed";
  div.style.visibility = "hidden";
  div.style.whiteSpace = "pre-wrap";
  div.style.wordWrap = "break-word";
  div.style.overflowWrap = "break-word";
  for (const p of props) (div.style as any)[p] = (style as any)[p];
  div.style.width = `${ta.clientWidth}px`;
  div.style.height = "auto";
  div.style.margin = "0";

  const rect = ta.getBoundingClientRect();
  div.style.top = `${rect.top - ta.scrollTop}px`;
  div.style.left = `${rect.left - ta.scrollLeft}px`;

  const before = ta.value.substring(0, Math.max(0, pos));
  const spanText = doc.createElement("span");
  const beforeText = before.replace(/\n$/g, "\n\u200b");
  spanText.textContent = ".";
  div.textContent = beforeText;
  div.appendChild(spanText);
  doc.body.appendChild(div);
  const spanRect = spanText.getBoundingClientRect();
  let x = spanRect.left;
  let yTop = spanRect.top;
  let yBottom = spanRect.bottom;
  doc.body.removeChild(div);

  if (x === 0 && yTop === 0 && yBottom === 0) {
    x = rect.left + ta.clientWidth / 2;
    yTop = rect.top + 8;
    yBottom = rect.top + 40;
  }
  return { x, yTop, yBottom };
}
