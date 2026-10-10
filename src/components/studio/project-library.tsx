"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";
import { useDialog } from "./use-dialog";
import { getFormatById, BOOK_FORMATS } from "@/lib/book-formats";
import { FormatIcon } from "./format-icon";
import { ArrowRight, BookOpen, Trash, Spinner } from "@/components/icons";
import type { SerializedBook } from "@/types";
export function ProjectLibrary({
  books,
  purchased = false,
}: {
  books: (SerializedBook & { wordCount?: number })[];
  purchased?: boolean;
}) {
  const [filter, setFilter] = useState("all"),
    [search, setSearch] = useState("");
  const router = useRouter();
  const [pendingDelete, setPendingDelete] = useState<SerializedBook | null>(null);
  const [deleting, setDeleting] = useState(false), [error, setError] = useState("");
  const [removed, setRemoved] = useState<string[]>([]), [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDivElement>(null);
  useDialog(!!pendingDelete, dialog, () => { if (!deleting) setPendingDelete(null); });
  async function deleteProject() {
    if (!pendingDelete || deleting) return;
    setDeleting(true); setError("");
    try {
      await apiFetch(`/api/books/${pendingDelete.id}`, { method: "DELETE" });
      setRemoved(ids => [...ids, pendingDelete.id]);
      setNotice(`“${pendingDelete.title}” was deleted.`);
      setPendingDelete(null);
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not delete this project. Try again."); }
    finally { setDeleting(false); }
  }
  const visibleBooks = books.filter(book => !removed.includes(book.id));
  const filtered = visibleBooks.filter(
    (b) =>
      (filter === "all" || b.format === filter) &&
      b.title.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      {notice && <p className="studio-library-notice" role="status">{notice}</p>}
      <div className="studio-library-filters">
        <div>
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            All projects
          </button>
          {BOOK_FORMATS.map((f) => (
            <button
              key={f.id}
              className={filter === f.id ? "active" : ""}
              onClick={() => setFilter(f.id)}
            >
              {f.name}
            </button>
          ))}
        </div>
        <input
          className="studio-input"
          aria-label="Search projects"
          placeholder="Find a project…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {filtered.length ? (
        <div className="studio-library-grid">
          {filtered.map((book) => {
            const f = getFormatById(book.format) ?? BOOK_FORMATS[0],
              progress = Math.min(
                100,
                Math.round(
                  ((book.wordCount || 0) / (book.targetPages * 250)) * 100,
                ),
              );
            return (
              <article key={book.id} className="studio-project-card">
              <Link
                href={
                  purchased ? `/store/${book.id}/read` : `/books/${book.id}`
                }
                className="studio-project-link"
              >
                <div className={`studio-project-cover ${f.color}`}>
                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt={`${book.title} cover`} />
                  ) : (
                    <>
                      <span className="studio-eyebrow">{f.name}</span>
                      <h3>{book.title}</h3>
                      <FormatIcon id={f.id} className="h-10 w-10" />
                      <small>{book.authorName || "A WORK IN PROGRESS"}</small>
                    </>
                  )}
                </div>
                <div className="studio-project-card-info">
                  <span className="studio-format-badge">
                    <FormatIcon id={f.id} />
                    {f.name}
                  </span>
                  <h3>{book.title}</h3>
                  <p>
                    {purchased
                      ? book.authorName
                      : `${book.chapterCount || 0} sections · ${(book.wordCount || 0).toLocaleString()} words`}
                  </p>
                  {!purchased && (
                    <>
                      <div className="studio-progress-track">
                        <span style={{ width: `${progress}%` }} />
                      </div>
                      <div className="studio-project-card-bottom">
                        <span>
                          {book.isPublished ? "Published" : "Draft"} ·{" "}
                          {progress}% of target
                        </span>
                        <ArrowRight />
                      </div>
                    </>
                  )}
                </div>
              </Link>
              {!purchased && <button className="studio-project-delete" aria-label={`Delete ${book.title}`} title="Delete project" onClick={() => { setPendingDelete(book); setError(""); }}><Trash /></button>}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="studio-empty studio-panel">
          <BookOpen className="h-10 w-10" />
          <h2>
            {visibleBooks.length
              ? "No projects match your search."
              : purchased
                ? "Your bookshelf is waiting."
                : "Your first page is waiting."}
          </h2>
          <p>
            {visibleBooks.length
              ? "Try another title or format."
              : purchased
                ? "Discover books from other authors in the bookstore."
                : "Start with an idea. We’ll help you give it a shape."}
          </p>
          <Link
            className="studio-button primary"
            href={purchased ? "/store" : "/books/new"}
          >
            {purchased ? "Explore the bookstore" : "Start a project"}
            <ArrowRight />
          </Link>
        </div>
      )}
      {pendingDelete && <div className="studio-delete-backdrop" onClick={event => { if (event.target === event.currentTarget && !deleting) setPendingDelete(null); }}>
        <div ref={dialog} className="studio-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-project-title" aria-describedby="delete-project-description" tabIndex={-1}>
          <span className="studio-delete-symbol"><Trash /></span>
          <h2 id="delete-project-title">Delete this project?</h2>
          <p id="delete-project-description">“{pendingDelete.title}” and its chapters, saved versions, and cover records will be permanently deleted. This cannot be undone. Your writing activity stays in your calendar.</p>
          {error && <p className="studio-delete-error" role="alert">{error}</p>}
          <div className="studio-delete-actions">
            <button className="studio-button" disabled={deleting} onClick={() => setPendingDelete(null)}>Keep project</button>
            <button className="studio-button studio-delete-confirm" disabled={deleting} onClick={() => void deleteProject()}>{deleting ? <><Spinner />Deleting…</> : "Delete project"}</button>
          </div>
        </div>
      </div>}
    </>
  );
}
