"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { BookIdea } from "@/types";
import { apiFetch } from "@/lib/client";
import { useToast } from "@/components/ui/toast";
import { useUserSettings } from "@/components/user-settings-context";
import { getFormatById, BOOK_FORMATS } from "@/lib/book-formats";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  Spinner,
  BookOpen,
  Tablet,
  Compass,
  ClipboardList,
  Headphones,
} from "@/components/icons";

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

const FORMAT_ICONS: Record<string, React.ReactNode> = {
  book: <BookOpen className="h-5 w-5 text-indigo-400" />,
  ebook: <Tablet className="h-5 w-5 text-indigo-400" />,
  guide: <Compass className="h-5 w-5 text-indigo-400" />,
  workbook: <ClipboardList className="h-5 w-5 text-indigo-400" />,
  audiobook: <Headphones className="h-5 w-5 text-indigo-400" />,
};

export default function NewBookPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { settings, setSettings, availableModels, setAvailableModels } = useUserSettings();

  const formatId = searchParams.get("format") || "book";
  const selectedFormat = getFormatById(formatId) ?? BOOK_FORMATS[0];

  const [genre, setGenre] = useState("");
  const [keywords, setKeywords] = useState("");
  const [generating, setGenerating] = useState(false);
  const [ideas, setIdeas] = useState<BookIdea[] | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<BookIdea | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("English");
  const [price, setPrice] = useState("24.99");
  const [creating, setCreating] = useState(false);

  const [guideTopic, setGuideTopic] = useState("");
  const [guideAudience, setGuideAudience] = useState("");
  const [guideLearningObjective, setGuideLearningObjective] = useState("");
  const [guideDifficulty, setGuideDifficulty] = useState("Beginner");
  const [guideSections, setGuideSections] = useState("");

  const [workbookTopic, setWorkbookTopic] = useState("");
  const [workbookLearningObjective, setWorkbookLearningObjective] = useState("");
  const [workbookExercises, setWorkbookExercises] = useState("5");
  const [workbookDifficulty, setWorkbookDifficulty] = useState("Beginner");
  const [workbookAnswerKey, setWorkbookAnswerKey] = useState("");
  const [workbookActivityStyle, setWorkbookActivityStyle] = useState("Written");

  const [audioExistingBookId, setAudioExistingBookId] = useState("");
  const [audioVoice, setAudioVoice] = useState("Male - Professional");
  const [audioNarrationStyle, setAudioNarrationStyle] = useState("Narrative");
  const [audioChapters, setAudioChapters] = useState("");

  const [userBooks, setUserBooks] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    if (formatId === "audiobook") {
      (async () => {
        try {
          const res = await apiFetch<{ books: { id: string; title: string }[] }>("/api/books");
          setUserBooks(res.books ?? []);
        } catch {
          setUserBooks([]);
        }
      })();
    }
  }, [formatId]);

  async function fetchModels() {
    if (settings.aiProvider !== "openrouter") return;
    try {
      const base = (settings.openRouterBaseUrl || "https://openrouter.ai/api/v1").replace(/\/+$/, "");
      const res = await fetch(`${base}/models`, {
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || ""}` },
      });
      if (!res.ok) throw new Error(`Failed to fetch models (${res.status})`);
      const data = (await res.json()) as { data?: { id?: string }[] };
      const models = (data.data ?? []).map((m) => m.id ?? "").filter(Boolean);
      if (models.length === 0) {
        toast("No models found. Check your API key and connection.", "error");
      } else {
        setAvailableModels(models);
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to fetch models", "error");
    }
  }

  async function generateIdeas(e: React.FormEvent) {
    e.preventDefault();
    if (!genre.trim() || !keywords.trim()) {
      toast("Enter both a genre and some keywords", "error");
      return;
    }
    setGenerating(true);
    try {
      const res = await apiFetch<{ ideas: BookIdea[] }>("/api/ai/idea", {
        method: "POST",
        body: JSON.stringify({
          genre: genre.trim(),
          keywords: keywords.trim(),
          provider: settings.aiProvider,
          model: settings.aiProvider === "openrouter" ? settings.openRouterModel : settings.openAIModel,
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
    setSelectedIdea(idea);
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
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        genre: genre.trim() || null,
        format: formatId,
        language,
        price: Number(price) || 0,
      };

      if (formatId === "guide") {
        body.guideTopic = guideTopic;
        body.learningObjective = guideLearningObjective;
        body.difficulty = guideDifficulty;
        body.sections = guideSections;
      } else if (formatId === "workbook") {
        body.workbookTopic = workbookTopic;
        body.learningObjective = workbookLearningObjective;
        body.numberOfExercises = Number(workbookExercises) || 5;
        body.difficulty = workbookDifficulty;
        body.answerKey = workbookAnswerKey || null;
        body.activityStyle = workbookActivityStyle;
      } else if (formatId === "audiobook") {
        body.audioBookId = audioExistingBookId || null;
        body.audioVoice = audioVoice;
        body.audioNarrationStyle = audioNarrationStyle;
        body.audioChapters = audioChapters || null;
      }

      const res = await apiFetch<{ book: { id: string } }>("/api/books", {
        method: "POST",
        body: JSON.stringify(body),
      });
      toast("Book created — happy writing! ✍️", "success");
      router.push(`/books/${res.book.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not create book", "error");
      setCreating(false);
    }
  }

  const hasIdeaStep = !["audiobook", "guide", "workbook"].includes(formatId);
  const hasChosenIdea = selectedIdea !== null;
  const showDetails = hasChosenIdea || !hasIdeaStep;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/dashboard" className="btn-ghost -ml-3 mb-4 !px-2 !py-1 text-xs">
        <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
      </Link>

      <div className="mb-6 flex items-center gap-3">
        {FORMAT_ICONS[selectedFormat.id] ?? <BookOpen className="h-5 w-5 text-indigo-400" />}
        <span className="text-sm font-semibold text-white">{selectedFormat.name}</span>
        <span className="text-xs text-zinc-500">· {selectedFormat.credits} credit · {selectedFormat.pages}</span>
      </div>

      <div className="mb-8 flex items-center gap-3 text-sm">
        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${hasChosenIdea || !hasIdeaStep ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40" : "bg-gradient-to-r from-indigo-500 to-violet-500 text-white"}`}>
          {hasChosenIdea || !hasIdeaStep ? <Check className="h-3.5 w-3.5" /> : "1"}
        </span>
        <span className={hasChosenIdea || !hasIdeaStep ? "text-zinc-500" : "font-semibold text-white"}>
          {hasIdeaStep ? "Generate ideas" : "Configure"}
        </span>
        <span className="h-px w-10 bg-white/15" />
        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${hasChosenIdea || !hasIdeaStep ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white" : "bg-white/5 text-zinc-500 ring-1 ring-white/10"}`}>
          2
        </span>
        <span className={hasChosenIdea || !hasIdeaStep ? "font-semibold text-white" : "text-zinc-500"}>
          Set up your book
        </span>
      </div>

      {/* ── IDEA STEP ── */}
      {hasIdeaStep && !showDetails && (
        <div className="space-y-8">
          <div className="card p-6 sm:p-8">
            <h1 className="flex items-center gap-2 text-xl font-bold text-white">
              <Sparkles className="h-5 w-5 text-indigo-400" /> What should we write?
            </h1>
            <p className="mt-1 text-sm text-zinc-500">Pick a genre, drop a few keywords or themes, and AI will pitch you three complete book concepts.</p>
            <form onSubmit={generateIdeas} className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Genre</label>
                <input list="genres" value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="e.g. Science Fiction" className="input" required />
                <datalist id="genres">
                  {GENRES.map((g) => <option key={g} value={g} />)}
                </datalist>
              </div>
              <div>
                <label className="label">Keywords / themes</label>
                <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="e.g. time travel, lost colony, AI companion" className="input" required />
              </div>
              <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">AI provider</label>
                  <select value={settings.aiProvider} onChange={(e) => { setSettings({ aiProvider: e.target.value as "openai" | "openrouter" }); setAvailableModels([]); }} className="input">
                    <option value="openai" className="bg-zinc-900">OpenAI</option>
                    <option value="openrouter" className="bg-zinc-900">OpenRouter (cloud)</option>
                  </select>
                </div>
                {settings.aiProvider === "openrouter" ? (
                  <div>
                    <label className="label">OpenRouter model</label>
                    <div className="flex gap-2">
                      <select value={settings.openRouterModel} onChange={(e) => setSettings({ openRouterModel: e.target.value })} className="input">
                        <option value="">Select a model…</option>
                        {availableModels.map((m) => <option key={m} value={m} className="bg-zinc-900">{m}</option>)}
                      </select>
                      <button type="button" onClick={fetchModels} disabled={generating} className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white hover:bg-white/10 disabled:opacity-50" title="Fetch available models">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 12"/><path d="M21 3v6h-6"/></svg>
                        Fetch
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-500">Or type a model name manually (e.g. openai/gpt-4o-mini).</p>
                    {availableModels.length === 0 && (
                      <input value={settings.openRouterModel} onChange={(e) => setSettings({ openRouterModel: e.target.value })} placeholder="openai/gpt-4o-mini" className="input mt-2" />
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="label">OpenAI model</label>
                    <input value={settings.openAIModel} onChange={(e) => setSettings({ openAIModel: e.target.value })} placeholder="gpt-4o-mini" className="input" />
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
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Pick an idea to start from</h2>
              {ideas.map((idea, i) => (
                <div key={i} className="card p-6 transition hover:border-indigo-400/40">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">{idea.title}</h3>
                      <p className="mt-1 text-sm italic text-indigo-300">{idea.hook}</p>
                    </div>
                    <button onClick={() => chooseIdea(idea)} className="btn-primary shrink-0 !py-2 text-xs">Choose <ArrowRight className="h-3.5 w-3.5" /></button>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-zinc-400">{idea.synopsis}</p>
                  {idea.targetAudience && (
                    <p className="mt-3 text-xs text-zinc-500"><span className="font-semibold text-zinc-400">For:</span> {idea.targetAudience}</p>
                  )}
                </div>
              ))}
              <button onClick={() => setIdeas(null)} className="btn-ghost text-xs">↺ Regenerate ideas</button>
            </div>
          )}
        </div>
      )}

      {/* ── CONFIG / DETAILS STEP ── */}
      {showDetails && (
        <div className="card animate-fade-in-up p-6 sm:p-8">
          <h1 className="text-xl font-bold text-white">Set up your {selectedFormat.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">Everything here is editable later — this just seeds your new book.</p>

          <form onSubmit={createBook} className="mt-6 space-y-5">
            <div>
              <label className="label">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="input text-base font-semibold" required />
            </div>
            <div>
              <label className="label">Description / synopsis</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="input resize-y" />
            </div>

            {formatId === "guide" && (
              <>
                <div>
                  <label className="label">Topic</label>
                  <input value={guideTopic} onChange={(e) => setGuideTopic(e.target.value)} className="input" placeholder="e.g. Watercolor Painting" required />
                </div>
                <div>
                  <label className="label">Target audience</label>
                  <input value={guideAudience} onChange={(e) => setGuideAudience(e.target.value)} className="input" placeholder="e.g. Art beginners" />
                </div>
                <div>
                  <label className="label">Learning objective</label>
                  <input value={guideLearningObjective} onChange={(e) => setGuideLearningObjective(e.target.value)} className="input" placeholder="e.g. Master basic watercolor techniques" required />
                </div>
                <div>
                  <label className="label">Difficulty</label>
                  <select value={guideDifficulty} onChange={(e) => setGuideDifficulty(e.target.value)} className="input">
                    <option value="Beginner" className="bg-zinc-900">Beginner</option>
                    <option value="Intermediate" className="bg-zinc-900">Intermediate</option>
                    <option value="Advanced" className="bg-zinc-900">Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="label">Sections</label>
                  <textarea value={guideSections} onChange={(e) => setGuideSections(e.target.value)} rows={3} className="input resize-y" placeholder="e.g. Materials, Basic Strokes, Landscape, Portrait" />
                </div>
              </>
            )}

            {formatId === "workbook" && (
              <>
                <div>
                  <label className="label">Topic</label>
                  <input value={workbookTopic} onChange={(e) => setWorkbookTopic(e.target.value)} className="input" placeholder="e.g. Math Practice" required />
                </div>
                <div>
                  <label className="label">Learning objective</label>
                  <input value={workbookLearningObjective} onChange={(e) => setWorkbookLearningObjective(e.target.value)} className="input" placeholder="e.g. Practice multiplication facts" required />
                </div>
                <div>
                  <label className="label">Number of exercises</label>
                  <input type="number" min="1" value={workbookExercises} onChange={(e) => setWorkbookExercises(e.target.value)} className="input" required />
                </div>
                <div>
                  <label className="label">Difficulty</label>
                  <select value={workbookDifficulty} onChange={(e) => setWorkbookDifficulty(e.target.value)} className="input">
                    <option value="Beginner" className="bg-zinc-900">Beginner</option>
                    <option value="Intermediate" className="bg-zinc-900">Intermediate</option>
                    <option value="Advanced" className="bg-zinc-900">Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="label">Activity style</label>
                  <select value={workbookActivityStyle} onChange={(e) => setWorkbookActivityStyle(e.target.value)} className="input">
                    <option value="Written" className="bg-zinc-900">Written</option>
                    <option value="Interactive" className="bg-zinc-900">Interactive</option>
                    <option value="Matching" className="bg-zinc-900">Matching</option>
                    <option value="Fill-in-the-blank" className="bg-zinc-900">Fill-in-the-blank</option>
                  </select>
                </div>
                <div>
                  <label className="label">Answer key</label>
                  <textarea value={workbookAnswerKey} onChange={(e) => setWorkbookAnswerKey(e.target.value)} rows={3} className="input resize-y" placeholder="e.g. 1) A 2) B 3) C" />
                </div>
              </>
            )}

            {formatId === "audiobook" && (
              <>
                <div>
                  <label className="label">Select existing book</label>
                  {userBooks.length > 0 ? (
                    <select value={audioExistingBookId} onChange={(e) => setAudioExistingBookId(e.target.value)} className="input" required>
                      <option value="" className="bg-zinc-900">Choose a book…</option>
                      {userBooks.map((b) => <option key={b.id} value={b.id} className="bg-zinc-900">{b.title}</option>)}
                    </select>
                  ) : (
                    <input value={audioExistingBookId} onChange={(e) => setAudioExistingBookId(e.target.value)} className="input" placeholder="Enter book ID or title" />
                  )}
                </div>
                <div>
                  <label className="label">Voice</label>
                  <select value={audioVoice} onChange={(e) => setAudioVoice(e.target.value)} className="input">
                    <option value="Male - Professional" className="bg-zinc-900">Male - Professional</option>
                    <option value="Male - Warm" className="bg-zinc-900">Male - Warm</option>
                    <option value="Female - Professional" className="bg-zinc-900">Female - Professional</option>
                    <option value="Female - Warm" className="bg-zinc-900">Female - Warm</option>
                    <option value="Narrator - Dramatic" className="bg-zinc-900">Narrator - Dramatic</option>
                  </select>
                </div>
                <div>
                  <label className="label">Narration style</label>
                  <select value={audioNarrationStyle} onChange={(e) => setAudioNarrationStyle(e.target.value)} className="input">
                    <option value="Narrative" className="bg-zinc-900">Narrative</option>
                    <option value="Conversational" className="bg-zinc-900">Conversational</option>
                    <option value="Dramatic" className="bg-zinc-900">Dramatic</option>
                    <option value="Educational" className="bg-zinc-900">Educational</option>
                  </select>
                </div>
                <div>
                  <label className="label">Chapter selection</label>
                  <input value={audioChapters} onChange={(e) => setAudioChapters(e.target.value)} className="input" placeholder="e.g. All chapters, or Chapters 1-5" />
                </div>
              </>
            )}

            {formatId === "ebook" && (
              <div className="rounded-xl border border-indigo-400/20 bg-indigo-500/5 p-4 text-xs leading-relaxed text-zinc-400">
                <span className="font-semibold text-indigo-300">E-Book format:</span> Digital-optimized content designed for e-readers and tablets.
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label">Language</label>
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className="input">
                  {LANGUAGES.map((l) => <option key={l} value={l} className="bg-zinc-900">{l}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">{formatId === "ebook" || formatId === "audiobook" ? "Digital price (USD)" : "Print price (USD)"}</label>
                <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="input" />
              </div>
            </div>

            {selectedIdea && (
              <div className="rounded-xl border border-indigo-400/20 bg-indigo-500/5 p-4 text-xs leading-relaxed text-zinc-400">
                <span className="font-semibold text-indigo-300">Based on:</span>{" "}
                &ldquo;{selectedIdea.title}&rdquo; — {selectedIdea.hook}
              </div>
            )}

            <div className="flex gap-3">
              {hasIdeaStep && (
                <button type="button" onClick={() => { setSelectedIdea(null); setIdeas(null); }} className="btn-secondary">
                  <ArrowLeft className="h-4 w-4" /> Back to ideas
                </button>
              )}
              <button type="submit" disabled={creating} className="btn-primary flex-1">
                {creating ? <Spinner className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                {creating ? "Creating…" : formatId === "audiobook" ? "Generate Audiobook" : "Create book & open editor"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
