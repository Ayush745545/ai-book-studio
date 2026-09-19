"use client";

import { useRef, useState } from "react";
import type { CoverSide, SerializedBook, SerializedCoverImage } from "@/types";
import { apiFetch } from "@/lib/client";
import { useToast } from "@/components/ui/toast";
import { BookCover } from "@/components/book-card";
import { Download, ImageIcon, Plus, Spinner, Trash } from "@/components/icons";

interface CoverTabProps {
  book: SerializedBook;
  onBookChange: (book: SerializedBook) => void;
}

const sides: { value: CoverSide; label: string }[] = [
  { value: "FRONT", label: "Front cover" },
  { value: "BACK", label: "Back cover" },
];

export function CoverTab({ book, onBookChange }: CoverTabProps) {
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [side, setSide] = useState<CoverSide>("FRONT");
  const [prompt, setPrompt] = useState(
    `A cinematic ${book.genre ?? "novel"} book cover for "${book.title}"`
  );
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const gallery = (book.coverImages ?? []).filter((cover) => cover.side === side);
  const selectedUrl = side === "FRONT" ? book.coverUrl : book.backCoverUrl;
  const selectedCover = gallery.find((cover) => cover.url === selectedUrl);
  const frontPreview = { ...book, coverUrl: book.coverUrl };
  const backPreview = { ...book, coverUrl: book.backCoverUrl };

  async function generate() {
    if (!prompt.trim()) {
      toast("Describe the cover you want first", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<{ book: SerializedBook }>("/api/ai/cover", {
        method: "POST",
        body: JSON.stringify({ bookId: book.id, prompt: prompt.trim(), side }),
      });
      onBookChange(res.book);
      toast(`${side === "FRONT" ? "Front" : "Back"} cover generated and added to your gallery`, "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Cover generation failed", "error");
    } finally {
      setLoading(false);
    }
  }

  async function upload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("side", side);
      const response = await fetch(`/api/books/${book.id}/cover/upload`, {
        method: "POST",
        body: formData,
      });
      const data = (await response.json().catch(() => ({}))) as {
        book?: SerializedBook;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Cover upload failed");
      if (!data.book) throw new Error("Cover upload did not return a book");
      onBookChange(data.book);
      toast(`${side === "FRONT" ? "Front" : "Back"} cover uploaded`, "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Cover upload failed", "error");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function selectCover(cover: SerializedCoverImage) {
    try {
      const res = await apiFetch<{ book: SerializedBook }>(`/api/books/${book.id}/cover`, {
        method: "PATCH",
        body: JSON.stringify({ coverImageId: cover.id, side }),
      });
      onBookChange(res.book);
      toast(`${side === "FRONT" ? "Front" : "Back"} cover selected`, "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not select cover", "error");
    }
  }

  async function removeCover(cover: SerializedCoverImage) {
    if (!window.confirm("Remove this cover from the gallery?")) return;
    try {
      const res = await apiFetch<{ book: SerializedBook }>(
        `/api/books/${book.id}/cover/${cover.id}`,
        { method: "DELETE" }
      );
      onBookChange(res.book);
      toast("Cover removed from gallery", "info");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not remove cover", "error");
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[390px_1fr]">
      <div className="card h-fit p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
          <ImageIcon className="h-5 w-5 text-indigo-400" /> Cover Art Studio
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Generate a front cover or upload your own front and back artwork.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
          {sides.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setSide(item.value)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                side === item.value ? "bg-indigo-500 text-white" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <label className="label mt-6">Art direction</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={5}
          placeholder='e.g. "A lone lighthouse in a storm at dusk, oil-painting style, deep blues and gold light"'
          className="input resize-y"
        />

        <div className="mt-3 flex flex-wrap gap-2">
          {[
            "Minimalist, typographic, bold colors",
            "Fantasy landscape, epic and painterly",
            "Moody noir, rain-soaked city at night",
            "Warm watercolor, cozy and inviting",
          ].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setPrompt(`${prompt.trim()} — ${s.toLowerCase()}`)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-zinc-400 transition hover:border-indigo-400/40 hover:text-indigo-300"
            >
              + {s}
            </button>
          ))}
        </div>

        <button onClick={generate} disabled={loading} className="btn-primary mt-6 w-full">
          {loading ? <Spinner /> : <ImageIcon className="h-4 w-4" />}
          {loading ? "Painting your cover…" : `Generate ${side === "FRONT" ? "front" : "back"} cover`}
        </button>

        <div className="mt-4">
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="btn-secondary w-full"
          >
            {uploading ? <Spinner /> : <Plus className="h-4 w-4" />}
            {uploading ? "Uploading…" : `Upload ${side === "FRONT" ? "front" : "back"} cover`}
          </button>
          <p className="mt-2 text-center text-[11px] text-zinc-600">
            JPG, PNG, or WebP · up to 10MB
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="card p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Book preview</h2>
              <p className="mt-1 text-sm text-zinc-500">Front and back covers for your paperback.</p>
            </div>
            {selectedUrl && (
              <a href={selectedUrl} target="_blank" rel="noreferrer" className="btn-secondary !py-2 text-xs">
                <Download className="h-3.5 w-3.5" /> Open {side === "FRONT" ? "front" : "back"}
              </a>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-end justify-center gap-8">
            <div className="w-full max-w-[230px]">
              <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500">Front</p>
              <div className="aspect-[1024/1792] overflow-hidden rounded-xl border border-white/10 shadow-2xl shadow-indigo-500/20">
                <BookCover book={frontPreview} className="rounded-xl" />
              </div>
            </div>
            <div className="w-full max-w-[230px]">
              <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500">Back</p>
              <div className="aspect-[1024/1792] overflow-hidden rounded-xl border border-white/10 shadow-2xl shadow-indigo-500/20">
                <BookCover book={backPreview} className="rounded-xl" />
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">{side === "FRONT" ? "Front" : "Back"} cover gallery</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {gallery.length} {gallery.length === 1 ? "design" : "designs"} · choose one to apply it to this book.
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-zinc-400">
              {side === "FRONT" ? "Front" : "Back"}
            </span>
          </div>

          {gallery.length > 0 ? (
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {gallery.map((cover) => {
                const isSelected = cover.id === selectedCover?.id;
                return (
                  <div
                    key={cover.id}
                    className={`group relative overflow-hidden rounded-xl border p-1 transition ${
                      isSelected ? "border-indigo-400 bg-indigo-500/10" : "border-white/10 hover:border-white/25"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => void selectCover(cover)}
                      className="block w-full"
                      aria-label={`Select ${side === "FRONT" ? "front" : "back"} cover`}
                    >
                      <div className="aspect-[1024/1792] overflow-hidden rounded-lg">
                        <BookCover book={{ title: book.title, coverUrl: cover.url, genre: book.genre }} />
                      </div>
                    </button>
                    <div className="flex items-center justify-between gap-2 px-1 py-2">
                      <span className="truncate text-[11px] text-zinc-500">
                        {cover.source === "AI" ? "AI design" : "Your upload"}
                      </span>
                      <button
                        type="button"
                        onClick={() => void removeCover(cover)}
                        className="rounded p-1 text-zinc-600 opacity-0 transition hover:bg-white/10 hover:text-red-400 group-hover:opacity-100"
                        title="Remove cover"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 text-center">
              <ImageIcon className="h-7 w-7 text-zinc-700" />
              <p className="text-sm text-zinc-500">
                No {side === "FRONT" ? "front" : "back"} covers yet. Generate or upload one to start your gallery.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
