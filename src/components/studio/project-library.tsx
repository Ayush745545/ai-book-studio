"use client";
import { useState } from "react";
import Link from "next/link";
import { getFormatById, BOOK_FORMATS } from "@/lib/book-formats";
import { FormatIcon } from "./format-icon";
import { ArrowRight, BookOpen } from "@/components/icons";
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
  const filtered = books.filter(
    (b) =>
      (filter === "all" || b.format === filter) &&
      b.title.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
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
              <Link
                key={book.id}
                href={
                  purchased ? `/store/${book.id}/read` : `/books/${book.id}`
                }
                className="studio-project-card"
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
            );
          })}
        </div>
      ) : (
        <div className="studio-empty studio-panel">
          <BookOpen className="h-10 w-10" />
          <h2>
            {books.length
              ? "No projects match your search."
              : purchased
                ? "Your bookshelf is waiting."
                : "Your first page is waiting."}
          </h2>
          <p>
            {books.length
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
    </>
  );
}
