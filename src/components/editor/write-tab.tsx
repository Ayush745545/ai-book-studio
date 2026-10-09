"use client";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { SerializedBook, SerializedChapter, ChapterType } from "@/types";
import { getFormatById } from "@/lib/book-formats";
import { apiFetch } from "@/lib/client";
import { useToast } from "@/components/ui/toast";
import { useUserSettings } from "@/components/user-settings-context";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Sparkles,
  Spinner,
  Trash,
  X,
  FileText,
} from "@/components/icons";
import { useDialog } from "@/components/studio/use-dialog";
import { SelectionAiPopup } from "./selection-ai-popup";

export interface WriterHandle {
  flush: () => Promise<boolean>;
}
interface Props {
  book: SerializedBook;
  onBookChange: (book: SerializedBook) => void;
  refreshBook: () => Promise<SerializedBook>;
}
type Draft = {
  id: string;
  title: string;
  content: string;
  notes: string;
  type: ChapterType;
  revision: number;
};
const empty: Draft = {
  id: "",
  title: "",
  content: "",
  notes: "",
  type: "CHAPTER",
  revision: 0,
};

export const WriteTab = forwardRef<WriterHandle, Props>(function WriteTab(
  { book, onBookChange, refreshBook },
  ref,
) {
  const toast = useToast(),
    { settings } = useUserSettings();
  const format = getFormatById(book.format) ?? getFormatById("book")!;
  const targetWords = Math.max(100, Math.min(3000, Math.round(book.targetPages * 250 / Math.max(1, book.chapters?.length ?? 1))));
  const [draft, setDraft] = useState<Draft>(empty),
    [savedRevision, setSavedRevision] = useState(0),
    [saving, setSaving] = useState(false),
    [saveError, setSaveError] = useState("");
  const [sidebar, setSidebar] = useState(true),
    [notesOpen, setNotesOpen] = useState(true),
    [focusMode, setFocusMode] = useState(false),
    [fontSize, setFontSize] = useState(18),
    [font, setFont] = useState("serif");
  const [adding, setAdding] = useState(false),
    [newTitle, setNewTitle] = useState(""),
    [mutating, setMutating] = useState(false),
    [aiBusy, setAiBusy] = useState(false),
    [aiDraft, setAiDraft] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState({
    openai: false,
    openrouter: false,
  });
  const [history, setHistory] = useState<
    { id: string; content: string; createdAt: string }[] | null
  >(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selection, setSelection] = useState<{
    text: string;
    start: number;
    end: number;
    anchor: { x: number; yTop: number; yBottom: number };
  } | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null),
    draftRef = useRef<Draft>(empty),
    savedRef = useRef(0),
    bookRef = useRef(book),
    pending = useRef<Promise<boolean> | null>(null),
    undo = useRef<string[]>([]),
    redo = useRef<string[]>([]);
  const reviewRef = useRef<HTMLDivElement>(null);
  useDialog(aiDraft !== null || history !== null, reviewRef, () => { setAiDraft(null); setHistory(null); });
  bookRef.current = book;
  useEffect(() => {
    const compact = window.matchMedia("(max-width: 760px)");
    const phone = window.matchMedia("(max-width: 520px)");
    const update = () => {
      setSidebar(!phone.matches);
      setNotesOpen(!compact.matches);
    };
    update();
    compact.addEventListener("change", update);
    phone.addEventListener("change", update);
    return () => { compact.removeEventListener("change", update); phone.removeEventListener("change", update); };
  }, []);
  const recoveryKey = (id: string) => `studio-draft:${book.id}:${id}`;
  const load = useCallback(
    (chapter: SerializedChapter) => {
      let next: Draft = {
        id: chapter.id,
        title: chapter.title,
        content: chapter.content,
        notes: chapter.notes ?? "",
        type: chapter.type,
        revision: 0,
      };
      try {
        const raw = localStorage.getItem(recoveryKey(chapter.id));
        if (raw) {
          const recovered = JSON.parse(raw);
          if (
            typeof recovered.content === "string" &&
            typeof recovered.title === "string"
          ) {
            next = { ...next, ...recovered, id: chapter.id, revision: 1 };
            toast("Recovered your unsaved draft", "success");
          }
        }
      } catch {
        /* The server copy remains available. */
      }
      draftRef.current = next;
      savedRef.current = 0;
      setSavedRevision(0);
      setDraft(next);
      setSaveError("");
      setSelection(null);
      setAiDraft(null);
      setHistory(null);
      undo.current = [];
      redo.current = [];
    },
    [book.id, toast],
  );
  useEffect(() => {
    if (!draftRef.current.id && book.chapters?.length) load(book.chapters[0]);
  }, [book.chapters, load]);
  useEffect(() => {
    apiFetch<typeof capabilities>("/api/studio/status")
      .then(setCapabilities)
      .catch(() => {});
  }, []);
  function edit(patch: Partial<Draft>, trackUndo = true) {
    const current = draftRef.current;
    if (
      patch.content !== undefined &&
      patch.content !== current.content &&
      trackUndo
    ) {
      undo.current.push(current.content);
      if (undo.current.length > 100) undo.current.shift();
      redo.current = [];
    }
    const next = { ...current, ...patch, revision: current.revision + 1 };
    draftRef.current = next;
    setDraft(next);
    setSaveError("");
    try {
      localStorage.setItem(recoveryKey(next.id), JSON.stringify(next));
    } catch {
      /* Save errors are reported separately. */
    }
  }
  const persist = useCallback(async (): Promise<boolean> => {
    if (pending.current) return pending.current;
    const snapshot = { ...draftRef.current };
    if (!snapshot.id || snapshot.revision === savedRef.current) return true;
    if (!snapshot.title.trim()) {
      setSaveError("Add a section title to save your work.");
      return false;
    }
    setSaving(true);
    const task = (async () => {
      try {
        const data = await apiFetch<{ chapter: SerializedChapter }>(
          `/api/chapters/${snapshot.id}`,
          {
            method: "PUT",
            body: JSON.stringify({
              title: snapshot.title.trim(),
              content: snapshot.content,
              notes: snapshot.notes,
              type: snapshot.type,
            }),
          },
        );
        const currentBook = bookRef.current;
        const nextBook = {
          ...currentBook,
          status: currentBook.isPublished
            ? currentBook.status
            : ("WRITING" as const),
          chapters: (currentBook.chapters ?? []).map((c) =>
            c.id === data.chapter.id ? data.chapter : c,
          ),
        };
        bookRef.current = nextBook;
        onBookChange(nextBook);
        if (draftRef.current.id === snapshot.id) {
          savedRef.current = snapshot.revision;
          setSavedRevision(snapshot.revision);
          if (draftRef.current.revision === snapshot.revision)
            try { localStorage.removeItem(recoveryKey(snapshot.id)); } catch { /* Server save succeeded. */ }
        }
        setSaveError("");
        return true;
      } catch (e) {
        setSaveError(
          e instanceof Error
            ? e.message
            : "Could not save. Your draft is kept on this device.",
        );
        return false;
      } finally {
        setSaving(false);
        pending.current = null;
      }
    })();
    pending.current = task;
    return task;
  }, [book.id, onBookChange]);
  const flush = useCallback(async () => {
    if (pending.current && !(await pending.current)) return false;
    while (
      draftRef.current.id &&
      draftRef.current.revision !== savedRef.current
    ) {
      if (!(await persist())) return false;
    }
    return true;
  }, [persist]);
  useImperativeHandle(ref, () => ({ flush }), [flush]);
  const dirty = draft.revision !== savedRevision;
  useEffect(() => {
    if (!dirty || saving || saveError) return;
    const timer = setTimeout(() => {
      void persist();
    }, 1200);
    return () => clearTimeout(timer);
  }, [dirty, draft.revision, saving, saveError, persist]);
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => {
      if (draftRef.current.revision !== savedRef.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const keyboard = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void flush();
      }
    };
    window.addEventListener("beforeunload", unload);
    window.addEventListener("keydown", keyboard);
    return () => {
      window.removeEventListener("beforeunload", unload);
      window.removeEventListener("keydown", keyboard);
    };
  }, [flush]);
  async function select(chapter: SerializedChapter) {
    if (chapter.id === draft.id || mutating) return;
    if (await flush())
      load(
        bookRef.current.chapters?.find((c) => c.id === chapter.id) ?? chapter,
      );
  }
  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (!newTitle.trim() || mutating) return;
    setMutating(true);
    try {
      if (!(await flush())) return;
      const data = await apiFetch<{ chapter: SerializedChapter }>(
        `/api/books/${book.id}/chapters`,
        { method: "POST", body: JSON.stringify({ title: newTitle.trim() }) },
      );
      await refreshBook();
      load(data.chapter);
      setNewTitle("");
      setAdding(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not add section", "error");
    } finally {
      setMutating(false);
    }
  }
  async function remove() {
    if (
      mutating ||
      !window.confirm(`Delete “${draft.title}” and its saved versions?`)
    )
      return;
    setMutating(true);
    try {
      if (!(await flush())) return;
      await apiFetch(`/api/chapters/${draft.id}`, { method: "DELETE" });
      const next = await refreshBook();
      localStorage.removeItem(recoveryKey(draft.id));
      if (next.chapters?.length) load(next.chapters[0]);
      else {
        draftRef.current = empty;
        savedRef.current = 0;
        setDraft(empty);
        setSavedRevision(0);
      }
    } catch (e) {
      toast(
        e instanceof Error ? e.message : "Could not delete section",
        "error",
      );
    } finally {
      setMutating(false);
    }
  }
  async function move(id: string, offset: number) {
    if (mutating) return;
    setMutating(true);
    try {
      if (!(await flush())) return;
      const sections = [...(bookRef.current.chapters ?? [])];
      const index = sections.findIndex((c) => c.id === id);
      const other = index + offset;
      if (other < 0 || other >= sections.length) return;
      [sections[index], sections[other]] = [sections[other], sections[index]];
      await apiFetch(`/api/books/${book.id}/reorder`, {
        method: "PUT",
        body: JSON.stringify(
          sections.map((c, order) => ({ id: c.id, order, type: c.type })),
        ),
      });
      await refreshBook();
    } catch (e) {
      toast(
        e instanceof Error ? e.message : "Could not reorder sections",
        "error",
      );
    } finally {
      setMutating(false);
    }
  }
  function insert(text: string) {
    const field = textarea.current,
      current = draftRef.current.content,
      start = field?.selectionStart ?? current.length,
      end = field?.selectionEnd ?? start;
    edit({ content: current.slice(0, start) + text + current.slice(end) });
    setSelection(null);
    requestAnimationFrame(() => {
      field?.focus();
      field?.setSelectionRange(start + text.length, start + text.length);
    });
  }
  function stepHistory(direction: "undo" | "redo") {
    const source = direction === "undo" ? undo.current : redo.current,
      destination = direction === "undo" ? redo.current : undo.current;
    const text = source.pop();
    if (text === undefined) return;
    destination.push(draftRef.current.content);
    edit({ content: text }, false);
  }
  async function generate() {
    if (aiBusy) return;
    const requestChapterId = draft.id;
    setAiBusy(true);
    setAiDraft(null);
    try {
      const data = await apiFetch<{ content: string }>("/api/ai/chapter", {
        method: "POST",
        body: JSON.stringify({
          bookTitle: book.title,
          chapterTitle: draft.title,
          outline:
            `${format.instruction}\nLanguage: ${book.language}\nAudience: ${book.audience}\nBrief: ${book.writingGoal}\nSection notes: ${draft.notes}\nExisting content: ${draft.content.slice(-2000)}`.slice(
              0,
              12000,
            ),
          tone: book.tone,
          targetWords,
          provider: settings.aiProvider,
          model:
            (settings.aiProvider === "openrouter"
              ? settings.openRouterModel
              : settings.openAIModel) || undefined,
        }),
      });
      if (draftRef.current.id === requestChapterId) setAiDraft(data.content);
      else toast("The draft belongs to the previous section. Return to it to generate a new draft.", "info");
    } catch (e) {
      toast(
        e instanceof Error ? e.message : "Could not generate a draft",
        "error",
      );
    } finally {
      setAiBusy(false);
    }
  }
  async function getHistory() {
    setHistoryLoading(true);
    const requestChapterId = draft.id;
    try {
      const data = await apiFetch<{ versions: NonNullable<typeof history> }>(
        `/api/chapters/${draft.id}/versions`,
      );
      if (draftRef.current.id === requestChapterId) setHistory(data.versions);
    } catch (e) {
      toast(
        e instanceof Error ? e.message : "Could not load versions",
        "error",
      );
    } finally {
      setHistoryLoading(false);
    }
  }
  const words = draft.content.trim().split(/\s+/).filter(Boolean).length;
  const aiAvailable =
    settings.aiProvider === "openrouter"
      ? capabilities.openrouter
      : capabilities.openai;
  return (
    <div className={`studio-writer ${focusMode ? "focus-mode" : ""}`}>
      <div className="studio-writer-toolbar">
        <div className="studio-toolbar-group">
          <button
            type="button"
            className="studio-tool"
            onClick={() => setSidebar(!sidebar)}
            aria-pressed={sidebar}
            title="Toggle table of contents"
          >
            <FileText />
            <span>Contents</span>
          </button>
          <span className="studio-toolbar-divider" />
          <select
            aria-label="Manuscript display font"
            value={font}
            onChange={(e) => setFont(e.target.value)}
          >
            <option value="serif">Literary serif</option>
            <option value="sans-serif">Clean sans</option>
            <option value="monospace">Typewriter</option>
          </select>
          <select
            aria-label="Manuscript display font size"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
          >
            {[16, 18, 20, 22].map((n) => (
              <option key={n} value={n}>
                {n} px
              </option>
            ))}
          </select>
        </div>
        <div className="studio-toolbar-group">
          <span
            className={`studio-save-status ${saveError ? "error" : ""}`}
            role="status"
          >
            {saving ? (
              <Spinner />
            ) : dirty ? (
              <span className="studio-dot amber" />
            ) : (
              <Check />
            )}
            {saving
              ? "Saving…"
              : saveError
                ? "Save failed"
                : dirty
                  ? "Unsaved changes"
                  : "All changes saved"}
          </span>
          <button
            className="studio-tool"
            disabled={!dirty || saving}
            onClick={() => void flush()}
          >
            Save
          </button>
          <button
            className="studio-tool"
            onClick={() => setFocusMode(!focusMode)}
            aria-pressed={focusMode}
          >
            {focusMode ? "Exit focus" : "Focus"}
          </button>
          <button
            className="studio-tool"
            onClick={() => setNotesOpen(!notesOpen)}
            aria-pressed={notesOpen}
          >
            Notes
          </button>
        </div>
      </div>
      <div className="studio-mobile-chapter-picker">
        <label htmlFor="mobile-section">Current section</label>
        <select id="mobile-section" value={draft.id} onChange={e => {
          const chapter = book.chapters?.find(c => c.id === e.target.value);
          if (chapter) void select(chapter);
        }}>
          {(book.chapters ?? []).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>
      {saveError && (
        <div className="studio-error" role="alert">
          {saveError} <button onClick={() => void flush()}>Retry save</button>
        </div>
      )}
      <div className="studio-writer-body">
        {sidebar && (
          <aside className="studio-contents">
            <div className="studio-contents-heading">
              <span className="studio-eyebrow">YOUR MANUSCRIPT</span>
              <h2>
                Table of contents <span>{book.chapters?.length ?? 0}</span>
              </h2>
            </div>
            <div className="studio-chapter-list" data-lenis-prevent>
              {(book.chapters ?? []).map((c, i) => (
                <div
                  className={`studio-chapter ${c.id === draft.id ? "active" : ""}`}
                  key={c.id}
                >
                  <button
                    className="studio-chapter-select"
                    onClick={() => void select(c)}
                    disabled={mutating}
                  >
                    <span className="studio-chapter-number">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>
                      <strong>
                        {c.id === draft.id
                          ? draft.title || "Untitled"
                          : c.title}
                      </strong>
                      <small>
                        {(c.id === draft.id
                          ? words
                          : c.wordCount
                        ).toLocaleString()}{" "}
                        words{" "}
                        <span>
                          ·{" "}
                          {c.type === "FRONT_MATTER"
                            ? "Front matter"
                            : c.type === "BACK_MATTER"
                              ? "Back matter"
                              : format.unit}
                        </span>
                      </small>
                    </span>
                  </button>
                  <div className="studio-chapter-move">
                    <button
                      aria-label={`Move ${c.title} up`}
                      disabled={i === 0 || mutating}
                      onClick={() => void move(c.id, -1)}
                    >
                      ↑
                    </button>
                    <button
                      aria-label={`Move ${c.title} down`}
                      disabled={
                        i === (book.chapters?.length ?? 0) - 1 || mutating
                      }
                      onClick={() => void move(c.id, 1)}
                    >
                      ↓
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {adding ? (
              <form className="studio-add-section" onSubmit={add}>
                <input
                  autoFocus
                  className="studio-input"
                  aria-label="New section title"
                  required
                  maxLength={200}
                  placeholder={`${format.unit} title`}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
                <div>
                  <button className="studio-button primary" disabled={mutating}>
                    {mutating ? <Spinner /> : <Plus />}Add
                  </button>
                  <button
                    type="button"
                    className="studio-button secondary"
                    onClick={() => setAdding(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                className="studio-add-button"
                onClick={() => setAdding(true)}
              >
                <Plus />
                Add {format.unit.toLowerCase()}
              </button>
            )}
            <div className="studio-contents-note">
              <span className="studio-dot" />
              <p>
                A first draft is a beginning.
                <br />
                Give yourself room to write.
              </p>
            </div>
          </aside>
        )}
        <div className="studio-manuscript-space">
          {!draft.id ? (
            <div className="studio-empty">
              <FileText className="h-10 w-10" />
              <h2>Your next page is waiting.</h2>
              <p>Add a section to start your manuscript.</p>
              <button
                className="studio-button primary"
                onClick={() => {
                  setSidebar(true);
                  setAdding(true);
                }}
              >
                <Plus />
                Add first section
              </button>
            </div>
          ) : (
            <>
              <div className="studio-manuscript-tools">
                <button
                  className="studio-tool"
                  title="Undo manuscript change"
                  disabled={!undo.current.length}
                  onClick={() => stepHistory("undo")}
                >
                  <ArrowLeft />
                  Undo
                </button>
                <button
                  className="studio-tool"
                  title="Redo manuscript change"
                  disabled={!redo.current.length}
                  onClick={() => stepHistory("redo")}
                >
                  <ArrowRight />
                  Redo
                </button>
                <span className="studio-toolbar-divider" />
                <button
                  className="studio-tool"
                  onClick={() => insert("\n\nSection heading\n\n")}
                >
                  Heading
                </button>
                <button
                  className="studio-tool"
                  onClick={() =>
                    insert("\n• First item\n• Second item\n• Third item\n")
                  }
                >
                  List
                </button>
                {format.id === "workbook" && (
                  <button
                    className="studio-tool"
                    onClick={() =>
                      insert(
                        "\nYour response:\n________________________________________________\n________________________________________________\n________________________________________________\n",
                      )
                    }
                  >
                    Response lines
                  </button>
                )}
                <button
                  className="studio-tool"
                  onClick={() => void getHistory()}
                >
                  {historyLoading ? <Spinner /> : null}Versions
                </button>
              </div>
              <article className="studio-manuscript-page">
                <div className="studio-page-topline">
                  <span>
                    {format.unit.toUpperCase()}{" "}
                    {String(
                      (book.chapters ?? []).findIndex(
                        (c) => c.id === draft.id,
                      ) + 1,
                    ).padStart(2, "0")}
                  </span>
                  <select
                    value={draft.type}
                    aria-label="Section type"
                    onChange={(e) =>
                      edit({ type: e.target.value as ChapterType })
                    }
                  >
                    <option value="CHAPTER">Main content</option>
                    <option value="FRONT_MATTER">Front matter</option>
                    <option value="BACK_MATTER">Back matter</option>
                  </select>
                  <button
                    className="studio-icon-button"
                    title="Delete this section"
                    aria-label="Delete this section"
                    disabled={mutating}
                    onClick={() => void remove()}
                  >
                    <Trash />
                  </button>
                </div>
                <input
                  className="studio-chapter-title"
                  aria-label="Section title"
                  value={draft.title}
                  maxLength={200}
                  placeholder="Give this chapter a title"
                  onChange={(e) => edit({ title: e.target.value })}
                />
                <div className="studio-page-rule" />
                <textarea
                  ref={textarea}
                  className="studio-manuscript-input"
                  aria-label="Manuscript content"
                  spellCheck
                  maxLength={200000}
                  value={draft.content}
                  style={{ fontSize, fontFamily: font }}
                  placeholder={
                    format.id === "workbook"
                      ? "Start with a learning objective, a short explanation, and an exercise. Leave space for your reader’s response…"
                      : format.id === "guide"
                        ? "What will your reader accomplish? Begin with a clear first step…"
                        : format.id === "audiobook"
                          ? "Write as you speak. Welcome your listener and take them into the story…"
                          : "Every good book starts with a first sentence. This is yours…"
                  }
                  onChange={(e) => {
                    edit({ content: e.target.value });
                    setSelection(null);
                  }}
                  onKeyDown={(e) => {
                    if (
                      (e.metaKey || e.ctrlKey) &&
                      e.key.toLowerCase() === "z"
                    ) {
                      e.preventDefault();
                      stepHistory(e.shiftKey ? "redo" : "undo");
                    }
                    if (e.key === "Escape") setSelection(null);
                  }}
                  onMouseUp={() => {
                    const field = textarea.current;
                    if (
                      !field ||
                      field.selectionEnd - field.selectionStart < 2 ||
                      !aiAvailable
                    ) {
                      setSelection(null);
                      return;
                    }
                    const rect = field.getBoundingClientRect();
                    setSelection({
                      text: field.value.slice(
                        field.selectionStart,
                        field.selectionEnd,
                      ),
                      start: field.selectionStart,
                      end: field.selectionEnd,
                      anchor: {
                        x: Math.min(rect.right - 100, rect.left + 140),
                        yTop: rect.top + 20,
                        yBottom: rect.top + 60,
                      },
                    });
                  }}
                />
                <div className="studio-page-footer">
                  <span>{book.title}</span>
                  <span>
                    {words.toLocaleString()} words ·{" "}
                    {Math.max(1, Math.ceil(words / 250))} est. pages
                  </span>
                </div>
              </article>
              <div className="studio-writing-tip">
                {format.id === "audiobook"
                  ? "Tip: Read your draft aloud. If a sentence is hard to say, simplify it."
                  : format.id === "workbook"
                    ? "Tip: Give every exercise a clear goal and enough room for the reader’s response."
                    : "Tip: Keep writing. A first draft doesn’t have to be a final draft."}
              </div>
            </>
          )}
        </div>
        {notesOpen && (
          <aside className="studio-writing-notes">
            <div className="studio-notes-title">
              <Sparkles />
              <h2>Your writing companion</h2>
              <button className="studio-icon-button studio-notes-close" aria-label="Close writing notes" onClick={() => setNotesOpen(false)}><X /></button>
            </div>
            <label className="studio-label">
              {format.unit} notes
              <textarea
                className="studio-input"
                rows={10}
                value={draft.notes}
                maxLength={10000}
                disabled={!draft.id}
                onChange={(e) => edit({ notes: e.target.value })}
                placeholder="Capture the purpose, key points, scenes, or examples for this section."
              />
            </label>
            <div className="studio-notes-brief">
              <span className="studio-eyebrow">KEEP YOUR READER IN MIND</span>
              <strong>{book.audience || "Who are you writing for?"}</strong>
              <p>
                {book.writingGoal ||
                  "Add an audience and writing goal in Project details to give your draft a direction."}
              </p>
              <small>
                {book.tone} voice · {book.language}
              </small>
            </div>
            <div className="studio-notes-ai">
              <span className="studio-format-icon green">
                <Sparkles />
              </span>
              <h3>A spark when you need one.</h3>
              <p>
                {aiAvailable
                  ? `Generate a ${format.unit.toLowerCase()} using your brief and notes. Review it before adding it to your manuscript.`
                  : "Write freely with every editor tool. Connect an AI provider to generate and polish drafts."}
              </p>
              <button
                className="studio-button primary"
                disabled={!draft.id || !aiAvailable || aiBusy}
                onClick={() => void generate()}
              >
                {aiBusy ? <Spinner /> : <Sparkles />}
                {aiBusy ? "Writing a draft…" : "Generate a draft"}
              </button>
              {aiAvailable && <p className="studio-footnote">Target: about {targetWords.toLocaleString()} words. Provider usage charges apply.</p>}
              <LinkToSettings />
            </div>
          </aside>
        )}
      </div>
      {selection && (
        <SelectionAiPopup
          selectedText={selection.text}
          bookId={book.id}
          chapterId={draft.id}
          chapterTitle={draft.title}
          anchor={selection.anchor}
          onClose={() => setSelection(null)}
          onApply={(text) => {
            edit({
              content:
                draft.content.slice(0, selection.start) +
                text +
                draft.content.slice(selection.end),
            });
            setSelection(null);
          }}
        />
      )}
      {(aiDraft !== null || history !== null) && (
        <div className="studio-modal-backdrop">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={aiDraft !== null ? "Review AI draft" : "Saved versions"}
            ref={reviewRef}
            tabIndex={-1}
            className="studio-shell studio-modal studio-review-modal"
          >
            <button
              className="studio-icon-button studio-modal-close"
              aria-label="Close review"
              onClick={() => {
                setAiDraft(null);
                setHistory(null);
              }}
            >
              <X />
            </button>
            <span className="studio-eyebrow">
              {aiDraft !== null
                ? "REVIEW BEFORE YOU INSERT"
                : "YOUR WRITING HISTORY"}
            </span>
            <h2 className="studio-title">
              {aiDraft !== null
                ? "A starting point, in your hands."
                : "Earlier versions"}
            </h2>
            {aiDraft !== null ? (
              <>
                <div className="studio-draft-review" data-lenis-prevent>
                  {aiDraft}
                </div>
                <div className="studio-form-actions">
                  <button
                    className="studio-button secondary"
                    onClick={() => setAiDraft(null)}
                  >
                    Discard
                  </button>
                  <button
                    className="studio-button primary"
                    onClick={() => {
                      edit({
                        content:
                          draft.content +
                          (draft.content ? "\n\n" : "") +
                          aiDraft,
                      });
                      setAiDraft(null);
                    }}
                  >
                    Append to manuscript <Plus />
                  </button>
                </div>
              </>
            ) : history?.length ? (
              history.map((version) => (
                <div className="studio-version" key={version.id}>
                  <time>{new Date(version.createdAt).toLocaleString()}</time>
                  <p>{version.content.slice(0, 240)}…</p>
                  <button
                    className="studio-button secondary"
                    onClick={() => {
                      if (
                        !window.confirm(
                          "Replace this draft with the selected version? The current saved text will be kept in version history when you save.",
                        )
                      )
                        return;
                      edit({ content: version.content });
                      setHistory(null);
                    }}
                  >
                    Restore to editor
                  </button>
                </div>
              ))
            ) : (
              <p className="studio-muted">
                Previous manuscript text is kept here whenever you save a
                changed draft.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
function LinkToSettings() {
  return (
    <a className="studio-text-link" href="/settings">
      AI preferences →
    </a>
  );
}
