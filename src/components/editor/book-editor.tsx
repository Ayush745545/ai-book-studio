"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SerializedBook } from "@/types";
import { apiFetch } from "@/lib/client";
import { useToast } from "@/components/ui/toast";
import { StatusBadge } from "@/components/status-badge";
import {
  ArrowLeft,
  FileText,
  ImageIcon,
  PenLine,
  Sparkles,
  Spinner,
  Globe,
  Trash,
  Type,
} from "@/components/icons";
import { WriteTab } from "./write-tab";
import { CoverTab } from "./cover-tab";
import { ReadTab } from "./read-tab";
import { EditionsTab } from "./editions-tab";

type Tab = "write" | "cover" | "read" | "publish";

const TABS: { id: Tab; label: string; icon: React.ReactNode; description: string }[] = [
  { id: "write", label: "Write", icon: <PenLine className="h-4 w-4" />, description: "Write & edit chapters" },
  { id: "cover", label: "Cover", icon: <ImageIcon className="h-4 w-4" />, description: "Design cover art" },
  { id: "read", label: "Read", icon: <Type className="h-4 w-4" />, description: "Preview & TTS" },
  { id: "publish", label: "Publish", icon: <Globe className="h-4 w-4" />, description: "Print, store & editions" },
];

export function BookEditor({ initialBook }: { initialBook: SerializedBook }) {
  const router = useRouter();
  const toast = useToast();
  const [book, setBook] = useState<SerializedBook>(initialBook);
  const [tab, setTab] = useState<Tab>("write");
  const [publishing, setPublishing] = useState(false);

  async function refreshBook(): Promise<SerializedBook> {
    const data = await apiFetch<{ book: SerializedBook }>(`/api/books/${book.id}`);
    setBook(data.book);
    return data.book;
  }

  async function publish() {
    setPublishing(true);
    try {
      const data = await apiFetch<{ book: SerializedBook }>(`/api/books/${book.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isPublished: true }),
      });
      setBook(data.book);
      toast("Book published to the store! 🎉", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to publish", "error");
    } finally {
      setPublishing(false);
    }
  }

  const chapters = book.chapters ?? [];
  const totalWords = chapters.reduce((s, c) => s + c.wordCount, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="btn-ghost -ml-3 mb-1 !px-2 !py-1 text-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">{book.title}</h1>
            <StatusBadge status={book.status} />
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            {chapters.length} chapter{chapters.length === 1 ? "" : "s"} ·{" "}
            {totalWords.toLocaleString()} words
            {book.genre ? ` · ${book.genre}` : ""} · {book.language}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a href={`/api/books/${book.id}/pdf`} className="btn-secondary" title="Download a 6×9in PDF">
            <FileText className="h-4 w-4" /> Export PDF
          </a>
          {book.isPublished ? (
            <Link href={`/store/${book.id}`} className="btn-secondary !text-emerald-300">
              <Globe className="h-4 w-4" /> Live in store
            </Link>
          ) : (
            <button onClick={publish} disabled={publishing} className="btn-primary">
              {publishing ? <Spinner /> : <Sparkles className="h-4 w-4" />}
              {publishing ? "Publishing…" : "Publish"}
            </button>
          )}
          <div className="flex items-center gap-2 border-l border-white/10 pl-4 ml-2">
            <label className="text-xs text-zinc-500">Price $</label>
            <input
              type="number"
              min="0"
              max="10000"
              step="0.01"
              value={book.price}
              onChange={async (e) => {
                const price = Number(e.target.value) || 0;
                try {
                  const data = await apiFetch<{ book: SerializedBook }>(`/api/books/${book.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ price }),
                  });
                  setBook(data.book);
                } catch (err) {
                  toast(err instanceof Error ? err.message : "Failed to update price", "error");
                }
              }}
              className="input w-24 text-right"
            />
          </div>
          <button
            onClick={async () => {
              if (!window.confirm("Delete this book? This cannot be undone.")) return;
              try {
                await apiFetch(`/api/books/${book.id}`, { method: "DELETE" });
                toast("Book deleted", "success");
                router.push("/dashboard");
              } catch (err) {
                toast(err instanceof Error ? err.message : "Failed to delete", "error");
              }
            }}
            className="btn-ghost text-red-400 hover:bg-red-500/10"
            title="Delete book"
          >
            <Trash className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.02] p-2 shadow-lg shadow-black/20">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${TABS.length}, minmax(0, 1fr))` }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`group relative flex flex-col sm:flex-row items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                tab === t.id
                  ? "bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/30 scale-[1.02]"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
              }`}
              title={t.description}
            >
              <span className={`transition-transform duration-200 ${tab === t.id ? "scale-110" : "group-hover:scale-110"}`}>
                {t.icon}
              </span>
              <span className="whitespace-nowrap">{t.label}</span>
              {tab === t.id && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-white/60 blur-[1px]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content wrapper with consistent min-height to prevent jumping */}
      <div className="min-h-[800px] w-full transition-all duration-300">
        {tab === "write" && (
          <WriteTab book={book} onBookChange={setBook} refreshBook={refreshBook} />
        )}
        {tab === "cover" && (
          <div className="min-h-[800px]">
            <CoverTab
              book={book}
              onBookChange={(nextBook) => setBook(nextBook)}
            />
          </div>
        )}
        {tab === "read" && (
          <div className="min-h-[800px] rounded-2xl overflow-hidden border border-white/10">
            <ReadTab book={book} onBackToWrite={() => setTab("write")} />
          </div>
        )}
        {tab === "publish" && (
          <EditionsTab
            book={book}
            refreshBook={refreshBook}
            onPublish={publish}
            publishing={publishing}
            isPublished={book.isPublished}
          />
        )}
      </div>
    </div>
  );
}
