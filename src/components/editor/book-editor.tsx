"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SerializedBook } from "@/types";
import { getFormatById } from "@/lib/book-formats";
import { apiFetch } from "@/lib/client";
import { useToast } from "@/components/ui/toast";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  ImageIcon,
  PenLine,
  Spinner,
  Globe,
  Trash,
  BookOpen,
  Headphones,
  Settings,
  X,
} from "@/components/icons";
import { FormatIcon } from "@/components/studio/format-icon";
import { WriteTab, type WriterHandle } from "./write-tab";
import { CoverTab } from "./cover-tab";
import { PreviewTab } from "./preview-tab";
import { NarrationTab } from "./narration-tab";
import { useDialog } from "@/components/studio/use-dialog";
import { EditionsTab } from "./editions-tab";

type Tab = "write" | "preview" | "cover" | "listen" | "export" | "editions";
export function BookEditor({ initialBook }: { initialBook: SerializedBook }) {
  const router = useRouter(),
    toast = useToast(),
    writer = useRef<WriterHandle>(null);
  const [book, setBook] = useState(initialBook),
    [tab, setTab] = useState<Tab>("write"),
    [busy, setBusy] = useState(false),
    [details, setDetails] = useState(false),
    [detailsError, setDetailsError] = useState("");
  const [exporting, setExporting] = useState("");
  const detailsRef = useRef<HTMLFormElement>(null);
  useDialog(details, detailsRef, () => setDetails(false));
  const format = getFormatById(book.format) ?? getFormatById("book")!;
  const chapters = book.chapters ?? [],
    words = chapters.reduce((sum, c) => sum + c.wordCount, 0),
    progress = Math.min(
      100,
      Math.round((words / (book.targetPages * 250)) * 100),
    );
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "write", label: "Write", icon: <PenLine /> },
    { id: "preview", label: "Preview", icon: <BookOpen /> },
    { id: "cover", label: "Cover design", icon: <ImageIcon /> },
    { id: "listen", label: "Listen", icon: <Headphones /> },
    { id: "export", label: "Export & publish", icon: <Globe /> },
    { id: "editions", label: "Print & editions", icon: <BookOpen /> },
  ];
  async function refreshBook() {
    const data = await apiFetch<{ book: SerializedBook }>(
      `/api/books/${book.id}`,
    );
    setBook(data.book);
    return data.book;
  }
  async function switchTab(next: Tab) {
    if (busy || next === tab) return;
    setBusy(true);
    try {
      if (!(await writer.current?.flush())) {
        toast("Save your changes before leaving the editor.", "error");
        return;
      }
      await refreshBook();
      setTab(next);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not load project", "error");
    } finally {
      setBusy(false);
    }
  }
  async function exportFile(kind: string) {
    if (exporting) return;
    setExporting(kind);
    try {
      if (!(await writer.current?.flush())) {
        toast("Save your changes before exporting.", "error");
        return;
      }
      const res = await fetch(
        kind === "pdf"
          ? `/api/books/${book.id}/pdf`
          : `/api/books/${book.id}/export?format=${kind}`,
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Export failed");
      }
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `${book.title.replace(/[^a-z0-9-]/gi, "_") || "manuscript"}.${kind}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      toast("Your manuscript is ready to download", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not export", "error");
    } finally {
      setExporting("");
    }
  }
  async function publish() {
    setBusy(true);
    try {
      if (!(await writer.current?.flush())) return;
      const data = await apiFetch<{ book: SerializedBook }>(
        `/api/books/${book.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            isPublished: !book.isPublished,
            ...(!book.isPublished ? {} : { status: "WRITING" }),
          }),
        },
      );
      setBook(data.book);
      toast(
        data.book.isPublished
          ? "Your book is now in the store"
          : "Your book is now a private draft",
        "success",
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not publish", "error");
    } finally {
      setBusy(false);
    }
  }
  async function saveDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setDetailsError("");
    try {
      if (!(await writer.current?.flush())) {
        setDetailsError("Save your manuscript changes first.");
        return;
      }
      const data = await apiFetch<{ book: SerializedBook }>(
        `/api/books/${book.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            title: form.get("title"),
            description: form.get("description"),
            audience: form.get("audience"),
            writingGoal: form.get("writingGoal"),
            tone: form.get("tone"),
            targetPages: Number(form.get("targetPages")),
            price: Number(form.get("price")),
            digitalPrice: Number(form.get("digitalPrice")),
          }),
        },
      );
      setBook(data.book);
      setDetails(false);
      toast("Project details saved", "success");
    } catch (e) {
      setDetailsError(
        e instanceof Error ? e.message : "Could not save details",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="studio-shell studio-editor-shell">
      <div className="studio-editor-header">
        <div>
          <Link
            className="studio-back"
            href="/dashboard"
            onClick={async (e) => {
              e.preventDefault();
              if (await writer.current?.flush()) router.push("/dashboard");
            }}
          >
            <ArrowLeft />
            All projects
          </Link>
          <div className="studio-book-heading">
            <h1>{book.title}</h1>
            <span className="studio-format-badge">
              <FormatIcon id={format.id} />
              {format.name}
            </span>
            <span className="studio-draft-badge">
              {book.isPublished ? "Published" : "Draft"}
            </span>
          </div>
          <p>
            {book.genre || "Your creative workspace"} <span>·</span>{" "}
            {book.language} <span>·</span> {chapters.length} sections
          </p>
        </div>
        <div className="studio-editor-actions">
          <button
            className="studio-button secondary"
            onClick={() => setDetails(true)}
          >
            <Settings />
            Project details
          </button>
          <button
            className="studio-button primary"
            disabled={busy || !!exporting}
            onClick={() => void switchTab("export")}
          >
            Export manuscript
            <ArrowRight />
          </button>
        </div>
      </div>
      <div className="studio-project-progress">
        <div>
          <span className="studio-dot" />
          Writing progress
          <strong>
            {words.toLocaleString()}
            <small> / {(book.targetPages * 250).toLocaleString()} words</small>
          </strong>
        </div>
        <div className="studio-progress-track">
          <span style={{ width: `${progress}%` }} />
        </div>
        <span>
          {words ? Math.ceil(words / 250) : 0} / {book.targetPages} est. pages
        </span>
      </div>
      <nav className="studio-editor-tabs" aria-label="Manuscript tools">
        {tabs.map((item) => (
          <button
            key={item.id}
            aria-current={tab === item.id ? "page" : undefined}
            className={tab === item.id ? "active" : ""}
            disabled={busy}
            onClick={() => void switchTab(item.id)}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
        <span>
          <Check />
          Autosave is on
        </span>
      </nav>
      <div hidden={tab !== "write"}>
        <WriteTab
          ref={writer}
          book={book}
          onBookChange={setBook}
          refreshBook={refreshBook}
        />
      </div>
      {tab === "preview" && <PreviewTab book={book} />}
      {tab === "listen" && (
        <NarrationTab book={book} onExport={(kind) => void exportFile(kind)} />
      )}
      {tab === "editions" && <div className="studio-cover-wrapper"><EditionsTab book={book} refreshBook={refreshBook} onPublish={() => void publish()} publishing={busy} isPublished={book.isPublished} /></div>}
      {tab === "cover" && (
        <div className="studio-cover-wrapper">
          <div className="studio-panel-heading">
            <span className="studio-eyebrow">THE FIRST IMPRESSION</span>
            <h2>A cover worth opening.</h2>
            <p>
              Upload your own artwork or create a cover with your connected AI
              provider.
            </p>
          </div>
          <CoverTab book={book} onBookChange={setBook} />
        </div>
      )}
      {tab === "export" && (
        <div className="studio-export">
          <div className="studio-export-heading">
            <span className="studio-eyebrow">
              LET YOUR WORDS OUT INTO THE WORLD
            </span>
            <h2 className="studio-title">From your desk to your readers.</h2>
            <p>
              Download your current manuscript. A complete book takes writing,
              revision, and a final review.
            </p>
          </div>
          <div className="studio-export-grid">
            {[
              {
                id: "pdf",
                title:
                  format.id === "workbook"
                    ? "Printable workbook"
                    : "Print-ready PDF",
                description:
                  format.id === "workbook"
                    ? "A4 pages with room for exercises and handwritten responses."
                    : "A 6 × 9 inch manuscript with title page, contents, and chapters.",
                tag: "PDF · Fixed layout",
                icon: <FileText />,
              },
              {
                id: "epub",
                title: "Digital edition",
                description:
                  "Reflowable text, clickable contents, and accessible chapter navigation for e-readers.",
                tag: "EPUB · Reflowable",
                icon: <BookOpen />,
              },
              {
                id: "txt",
                title:
                  format.id === "audiobook"
                    ? "Narration script"
                    : "Manuscript text",
                description:
                  "All your chapters in order. Continue editing or share the manuscript with your editor.",
                tag: "TXT · Plain text",
                icon: <PenLine />,
              },
            ].map((option) => (
              <div key={option.id} className="studio-export-card">
                <span className="studio-format-icon green">{option.icon}</span>
                <span className="studio-eyebrow">{option.tag}</span>
                <h3>{option.title}</h3>
                <p>{option.description}</p>
                <button
                  className="studio-button secondary"
                  disabled={!!exporting}
                  onClick={() => void exportFile(option.id)}
                >
                  {exporting === option.id ? <Spinner /> : <ArrowRight />}
                  Download {option.id.toUpperCase()}
                </button>
              </div>
            ))}
          </div>
          <div className="studio-publish-panel">
            <div>
              <span className="studio-eyebrow">YOUR PUBLIC BOOKSHELF</span>
              <h3>
                {book.isPublished
                  ? "Your book is in the store."
                  : "Ready to share your work?"}
              </h3>
              <p>
                {book.isPublished
                  ? "Readers can discover your book. You can return it to a private draft at any time."
                  : "Publishing makes your manuscript discoverable in the store. Review the content and set your prices in Project details first."}
              </p>
              <div className="studio-publish-checks">
                <span>
                  <Check />
                  {chapters.filter((c) => c.wordCount > 0).length} sections with
                  content
                </span>
                <span>
                  {book.coverUrl ? <Check /> : <ImageIcon />}
                  {book.coverUrl ? "Cover added" : "Cover optional"}
                </span>
                <span>
                  Print ${book.price.toFixed(2)} · Digital $
                  {book.digitalPrice.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="studio-publish-actions">
              {book.isPublished && (
                <Link
                  className="studio-button secondary"
                  href={`/store/${book.id}`}
                >
                  View in store
                  <Globe />
                </Link>
              )}
              <button
                className="studio-button primary"
                disabled={busy || (!book.isPublished && !words)}
                onClick={() => void publish()}
              >
                {busy ? <Spinner /> : <Globe />}
                {book.isPublished ? "Return to draft" : "Publish to store"}
              </button>
            </div>
          </div>
          <div className="studio-note">
            <Headphones />
            <p>
              Creating an audiobook? Use the Listen tab for device playback and
              AI-generated MP3 tracks.
            </p>
            <button
              className="studio-text-link"
              onClick={() => void switchTab("listen")}
            >
              Open Listen →
            </button>
          </div>
        </div>
      )}
      {details && (
        <div className="studio-modal-backdrop">
          <form
            ref={detailsRef}
            tabIndex={-1}
            className="studio-shell studio-modal studio-details-modal"
            onSubmit={saveDetails}
            role="dialog"
            aria-modal="true"
            aria-label="Project details"
          >
            <button
              type="button"
              className="studio-icon-button studio-modal-close"
              onClick={() => setDetails(false)}
              aria-label="Close project details"
            >
              <X />
            </button>
            <span className="studio-eyebrow">MAKE IT YOURS</span>
            <h2 className="studio-title">Project details</h2>
            {detailsError && (
              <div role="alert" className="studio-error">
                {detailsError}
              </div>
            )}
            <label className="studio-label">
              Title
              <input
                className="studio-input"
                name="title"
                defaultValue={book.title}
                required
                maxLength={200}
              />
            </label>
            <label className="studio-label">
              Synopsis
              <textarea
                className="studio-input"
                rows={3}
                name="description"
                defaultValue={book.description || ""}
                maxLength={5000}
              />
            </label>
            <label className="studio-label">
              Your reader
              <input
                className="studio-input"
                name="audience"
                defaultValue={book.audience}
                maxLength={1000}
              />
            </label>
            <label className="studio-label">
              Writing goal
              <textarea
                className="studio-input"
                rows={2}
                name="writingGoal"
                defaultValue={book.writingGoal}
                maxLength={4000}
              />
            </label>
            <div className="studio-field-pair">
              <label className="studio-label">
                Voice
                <select
                  className="studio-input"
                  name="tone"
                  defaultValue={book.tone}
                >
                  {[
                    "Engaging",
                    "Professional",
                    "Conversational",
                    "Inspirational",
                    "Academic",
                    "Playful",
                  ].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="studio-label">
                Target pages
                <input
                  className="studio-input"
                  name="targetPages"
                  type="number"
                  min={1}
                  max={1000}
                  defaultValue={book.targetPages}
                  required
                />
              </label>
            </div>
            <div className="studio-field-pair">
              <label className="studio-label">
                Print price ($)
                <input
                  className="studio-input"
                  type="number"
                  name="price"
                  min={0}
                  max={10000}
                  step="0.01"
                  defaultValue={book.price}
                  required
                />
              </label>
              <label className="studio-label">
                Digital price ($)
                <input
                  className="studio-input"
                  type="number"
                  name="digitalPrice"
                  min={0}
                  max={10000}
                  step="0.01"
                  defaultValue={book.digitalPrice}
                  required
                />
              </label>
            </div>
            <div className="studio-form-actions">
              <button
                type="button"
                className="studio-icon-button danger"
                aria-label="Delete project"
                onClick={async () => {
                  if (
                    !window.confirm(
                      `Permanently delete “${book.title}” and all its chapters?`,
                    )
                  )
                    return;
                  try {
                    await apiFetch(`/api/books/${book.id}`, {
                      method: "DELETE",
                    });
                    router.push("/dashboard");
                  } catch (e) {
                    toast(
                      e instanceof Error
                        ? e.message
                        : "Could not delete project",
                      "error",
                    );
                  }
                }}
              >
                <Trash />
              </button>
              <button className="studio-button primary" disabled={busy}>
                {busy ? <Spinner /> : <Check />}Save details
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
