"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BookIdea } from "@/types";
import { apiFetch } from "@/lib/client";
import { useToast } from "@/components/ui/toast";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  Spinner,
} from "@/components/icons";

type AiProvider = "openai" | "openrouter";

const GENRES = [
  "Fantasy",
  "Science Fiction",
  "Mystery / Thriller",
  "Romance",
  "Horror",
  "Literary Fiction",
  "Young Adult",
  "Children's Book",
  "Self-Help",
  "Business",
  "Biography / Memoir",
  "History",
  "Science & Technology",
  "Health & Wellness",
  "Poetry",
];

const LANGUAGES = ["English", "Spanish", "French", "German", "Portuguese", "Chinese", "Japanese"];

type Step = "idea" | "details";

export default function NewBookPage() {
  const router = useRouter();
  const toast = useToast();

  // Step 1
  const [genre, setGenre] = useState("");
  const [keywords, setKeywords] = useState("");
  const [provider, setProvider] = useState<AiProvider>("openai");
  const [model, setModel] = useState("");
  const [generating, setGenerating] = useState(false);
  const [ideas, setIdeas] = useState<BookIdea[] | null>(null);
  const [selected, setSelected] = useState<BookIdea | null>(null);

  // Step 2
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("English");
  const [price, setPrice] = useState("24.99");
  const [creating, setCreating] = useState(false);

  async function generateIdeas(e: React.FormEvent) {
    e.preventDefault();
    if (!genre.trim() || !keywords.trim()) {
      toast("Enter both a genre and some keywords", "error");
      return;
    }
    if (provider === "openrouter" && !model.trim()) {
      toast("Enter an OpenRouter model name", "error");
      return;
    }
    setGenerating(true);
    try {
      const res = await apiFetch<{ ideas: BookIdea[] }>("/api/ai/idea", {
        method: "POST",
        body: JSON.stringify({
          genre: genre.trim(),
          keywords: keywords.trim(),
          provider,
          ...(model.trim() ? { model: model.trim() } : {}),
        }),
      });
      setIdeas(res.ideas);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Idea generation failed", "error");
    } finally {
      setGenerating(false);
    }
  }

  function chooseIdea(idea: BookIdea) {
    setSelected(idea);
    setTitle(idea.title);
    setDescription(idea.synopsis);
    setGenre((g) => g || "General");
  }

  async function createBook(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast("Your book needs a title", "error");
      return;
    }
    setCreating(true);
    try {
      const res = await apiFetch<{ book: { id: string } }>("/api/books", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          genre: genre.trim() || null,
          language,
          price: Number(price) || 0,
        }),
      });
      toast("Book created — happy writing! ✍️", "success");
      router.push(`/books/${res.book.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not create book", "error");
      setCreating(false);
    }
  }

  const step: Step = selected ? "details" : "idea";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/dashboard" className="btn-ghost -ml-3 mb-4 !px-2 !py-1 text-xs">
        <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
      </Link>

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-3 text-sm">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
            step === "idea"
              ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white"
              : "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40"
          }`}
        >
          {step === "details" ? <Check className="h-3.5 w-3.5" /> : "1"}
        </span>
        <span className={step === "idea" ? "font-semibold text-white" : "text-zinc-500"}>
          Generate ideas
        </span>
        <span className="h-px w-10 bg-white/15" />
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
            step === "details"
              ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white"
              : "bg-white/5 text-zinc-500 ring-1 ring-white/10"
          }`}
        >
          2
        </span>
        <span className={step === "details" ? "font-semibold text-white" : "text-zinc-500"}>
          Set up your book
        </span>
      </div>

      {step === "idea" && (
        <div className="space-y-8">
          <div className="card p-6 sm:p-8">
            <h1 className="flex items-center gap-2 text-xl font-bold text-white">
              <Sparkles className="h-5 w-5 text-indigo-400" /> What should we write?
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Pick a genre, drop a few keywords or themes, and AI will pitch you
              three complete book concepts.
            </p>

            <form onSubmit={generateIdeas} className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Genre</label>
                <input
                  list="genres"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="e.g. Science Fiction"
                  className="input"
                  required
                />
                <datalist id="genres">
                  {GENRES.map((g) => (
                    <option key={g} value={g} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="label">Keywords / themes</label>
                <input
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="e.g. time travel, lost colony, AI companion"
                  className="input"
                  required
                />
              </div>
              <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">AI provider</label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value as AiProvider)}
                    className="input"
                  >
                    <option value="openai" className="bg-zinc-900">OpenAI</option>
                    <option value="openrouter" className="bg-zinc-900">OpenRouter (cloud)</option>
                  </select>
                </div>
                {provider === "openrouter" && (
                  <div>
                    <label className="label">OpenRouter model</label>
                    <input
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="e.g. openai/gpt-4o-mini"
                      className="input"
                    />
                  </div>
                )}
              </div>
              <div className="sm:col-span-2">
                <button type="submit" disabled={generating} className="btn-primary w-full !py-3">
                  {generating ? <Spinner className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                  {generating ? "Brainstorming…" : "Generate 3 book ideas"}
                </button>
              </div>
            </form>
          </div>

          {ideas && (
            <div className="animate-fade-in-up space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Pick an idea to start from
              </h2>
              {ideas.map((idea, i) => (
                <div
                  key={i}
                  className="card p-6 transition hover:border-indigo-400/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">{idea.title}</h3>
                      <p className="mt-1 text-sm italic text-indigo-300">{idea.hook}</p>
                    </div>
                    <button onClick={() => chooseIdea(idea)} className="btn-primary shrink-0 !py-2 text-xs">
                      Choose <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-zinc-400">{idea.synopsis}</p>
                  {idea.targetAudience && (
                    <p className="mt-3 text-xs text-zinc-500">
                      <span className="font-semibold text-zinc-400">For:</span>{" "}
                      {idea.targetAudience}
                    </p>
                  )}
                </div>
              ))}
              <button
                onClick={() => setIdeas(null)}
                className="btn-ghost text-xs"
              >
                ↺ Regenerate ideas
              </button>
            </div>
          )}
        </div>
      )}

      {step === "details" && selected && (
        <div className="card animate-fade-in-up p-6 sm:p-8">
          <h1 className="text-xl font-bold text-white">Set up your book</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Everything here is editable later — this just seeds your new book.
          </p>

          <form onSubmit={createBook} className="mt-6 space-y-5">
            <div>
              <label className="label">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input text-base font-semibold"
                required
              />
            </div>

            <div>
              <label className="label">Description / synopsis</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="input resize-y"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label">Genre</label>
                <input
                  list="genres2"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="input"
                />
                <datalist id="genres2">
                  {GENRES.map((g) => (
                    <option key={g} value={g} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="label">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="input"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l} className="bg-zinc-900">
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Print price (USD)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="input"
                />
              </div>
            </div>

            <div className="rounded-xl border border-indigo-400/20 bg-indigo-500/5 p-4 text-xs leading-relaxed text-zinc-400">
              <span className="font-semibold text-indigo-300">Based on:</span>{" "}
              “{selected.title}” — {selected.hook}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="btn-secondary"
              >
                <ArrowLeft className="h-4 w-4" /> Back to ideas
              </button>
              <button type="submit" disabled={creating} className="btn-primary flex-1">
                {creating ? <Spinner className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                {creating ? "Creating…" : "Create book & open editor"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
