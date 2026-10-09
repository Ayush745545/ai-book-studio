"use client";
import { useState } from "react";
import type { SerializedBook } from "@/types";
import { getFormatById } from "@/lib/book-formats";
import { ArrowLeft, ArrowRight, BookOpen } from "@/components/icons";
export function PreviewTab({ book }: { book: SerializedBook }) {
  const chapters = book.chapters ?? [],
    [index, setIndex] = useState(-1),
    [size, setSize] = useState(18);
  const chapter = chapters[index],
    format = getFormatById(book.format)!;
  return (
    <div className="studio-preview">
      <div className="studio-preview-toolbar">
        <span>
          <BookOpen />
          Reader preview
        </span>
        <select
          aria-label="Preview section"
          value={index}
          onChange={(e) => setIndex(Number(e.target.value))}
        >
          <option value={-1}>Title & contents</option>
          {chapters.map((c, i) => (
            <option key={c.id} value={i}>
              {c.title}
            </option>
          ))}
        </select>
        <label>
          Text size{" "}
          <input
            aria-label="Preview text size"
            type="range"
            min={16}
            max={24}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
          />
        </label>
      </div>
      <article
        className={`studio-preview-page ${book.format === "workbook" ? "workbook" : ""}`}
        style={{ fontSize: size }}
      >
        {index < 0 ? (
          <div className="studio-title-page">
            <span className="studio-eyebrow">
              {format.name} · {book.language}
            </span>
            <h1>{book.title}</h1>
            <span className="studio-title-page-rule" />
            <p>{book.authorName || "Your manuscript"}</p>
            {book.description && (
              <p className="studio-title-synopsis">{book.description}</p>
            )}
            <h2>Contents</h2>
            <ol>
              {chapters.map((c, i) => (
                <li key={c.id}>
                  <button onClick={() => setIndex(i)}>
                    {c.title}
                    <span>{String(i + 1).padStart(2, "0")}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <>
            <span className="studio-eyebrow">
              {format.unit} {index + 1}
            </span>
            <h1>{chapter?.title}</h1>
            <div className="studio-page-rule" />
            {chapter?.content ? (
              chapter.content.split(/\n\s*\n/).map((paragraph, i) => (
                <p className="studio-preview-paragraph" key={i}>
                  {paragraph}
                </p>
              ))
            ) : (
              <div className="studio-empty">
                <p>This section is waiting for your words.</p>
              </div>
            )}
          </>
        )}
        <footer>
          {book.title}
          <span>{index < 0 ? "Contents" : `${format.unit} ${index + 1}`}</span>
        </footer>
      </article>
      <div className="studio-preview-pagination">
        <button
          className="studio-button secondary"
          disabled={index < 0}
          onClick={() => setIndex(index - 1)}
        >
          <ArrowLeft />
          Previous
        </button>
        <span>
          {index < 0
            ? "Title & contents"
            : `${index + 1} of ${chapters.length} sections`}
        </span>
        <button
          className="studio-button secondary"
          disabled={index >= chapters.length - 1}
          onClick={() => setIndex(index + 1)}
        >
          Next
          <ArrowRight />
        </button>
      </div>
    </div>
  );
}
