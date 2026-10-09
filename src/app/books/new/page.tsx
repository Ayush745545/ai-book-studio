"use client";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BOOK_FORMATS, getFormatById } from "@/lib/book-formats";
import { apiFetch } from "@/lib/client";
import { useToast } from "@/components/ui/toast";
import { useUserSettings } from "@/components/user-settings-context";
import { FormatGrid } from "@/components/studio/format-grid";
import { FormatIcon } from "@/components/studio/format-icon";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  Spinner,
} from "@/components/icons";
import type { BookIdea } from "@/types";

function NewProject() {
  const params = useSearchParams(),
    router = useRouter(),
    toast = useToast();
  const { settings } = useUserSettings();
  const [formatId, setFormatId] = useState(
    getFormatById(params.get("format") || "book")?.id || "book",
  );
  const format = getFormatById(formatId)!;
  const [step, setStep] = useState(1),
    [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [audience, setAudience] = useState(""),
    [goal, setGoal] = useState(""),
    [genre, setGenre] = useState(""),
    [language, setLanguage] = useState("English"),
    [tone, setTone] = useState("Engaging"),
    [targetPages, setTargetPages] = useState(format.targetPages);
  const [outline, setOutline] = useState(format.structure.join("\n"));
  const [sourceBookId, setSourceBookId] = useState(""),
    [books, setBooks] = useState<{ id: string; title: string }[]>([]);
  const [creating, setCreating] = useState(false),
    [thinking, setThinking] = useState(false),
    [ideas, setIdeas] = useState<BookIdea[]>([]),
    [error, setError] = useState("");
  const [capabilities, setCapabilities] = useState({
    openai: false,
    openrouter: false,
  });
  useEffect(() => {
    apiFetch<typeof capabilities>("/api/studio/status")
      .then(setCapabilities)
      .catch(() => {});
    apiFetch<{ books: typeof books }>("/api/books")
      .then((data) => setBooks(data.books))
      .catch(() => {});
  }, []);
  useEffect(() => {
    const id = params.get("format");
    if (id && getFormatById(id)) selectFormat(id);
  }, [params]);
  function selectFormat(id: string) {
    const next = getFormatById(id)!;
    setFormatId(next.id);
    setTargetPages(next.targetPages);
    setOutline(next.structure.join("\n"));
    setSourceBookId("");
    setIdeas([]);
  }
  const aiAvailable =
    settings.aiProvider === "openrouter"
      ? capabilities.openrouter
      : capabilities.openai;
  async function brainstorm() {
    setThinking(true);
    setError("");
    try {
      const data = await apiFetch<{ ideas: BookIdea[] }>("/api/ai/idea", {
        method: "POST",
        body: JSON.stringify({
          genre: genre || format.name,
          keywords: `Format: ${format.name}. Topic: ${goal}. Reader: ${audience}. ${format.instruction}`,
          provider: settings.aiProvider,
          model:
            (settings.aiProvider === "openrouter"
              ? settings.openRouterModel
              : settings.openAIModel) || undefined,
        }),
      });
      setIdeas(data.ideas);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate ideas.");
    } finally {
      setThinking(false);
    }
  }
  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (creating) return;
    const sections = outline
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!title.trim()) {
      setStep(2);
      setError("Give your project a title before creating it.");
      return;
    }
    if (!sourceBookId && (sections.length < 1 || sections.length > 60)) {
      setError("Add between 1 and 60 section titles, one per line.");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const data = await apiFetch<{ book: { id: string } }>("/api/books", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description,
          genre: genre || null,
          format: formatId,
          language,
          audience,
          writingGoal: goal,
          tone,
          targetPages,
          outline: sourceBookId ? undefined : sections,
          sourceBookId: sourceBookId || undefined,
        }),
      });
      toast("Your writing space is ready", "success");
      router.push(`/books/${data.book.id}`);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not create the project.",
      );
      setCreating(false);
    }
  }
  return (
    <div className="studio-shell studio-create">
      <div className="studio-create-inner">
        <Link href="/dashboard" className="studio-back">
          <ArrowLeft /> My projects
        </Link>
        <div className="studio-create-heading">
          <span className="studio-eyebrow">A NEW BEGINNING</span>
          <h1 className="studio-title">Make room for your next big idea.</h1>
          <p className="studio-muted">
            A few details now. A writing space that feels like yours next.
          </p>
        </div>
        <nav className="studio-steps" aria-label="Project setup">
          {["Choose a format", "Shape your idea", "Plan your chapters"].map(
            (label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  if (i < 2 || title.trim()) {
                    setStep(i + 1);
                    setError("");
                  }
                }}
                aria-current={step === i + 1 ? "step" : undefined}
              >
                <span className={step >= i + 1 ? "active" : ""}>
                  {step > i + 1 ? <Check /> : `0${i + 1}`}
                </span>
                {label}
              </button>
            ),
          )}
        </nav>
        {error && (
          <div role="alert" className="studio-error">
            {error}
          </div>
        )}
        {step === 1 ? (
          <>
            <FormatGrid selected={formatId} onSelect={selectFormat} />
            <div className="studio-create-footer">
              <p>
                Page counts are targets. You can adjust yours before you begin.
              </p>
              <button
                className="studio-button primary"
                onClick={() => setStep(2)}
              >
                Continue with {format.name}
                <ArrowRight />
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={create} className="studio-setup-layout">
            <div className="studio-panel">
              {step === 2 ? (
                <>
                  <div className="studio-panel-heading">
                    <span className="studio-eyebrow">THE CREATIVE BRIEF</span>
                    <h2>Tell us about your {format.name.toLowerCase()}.</h2>
                    <p>
                      Start with what you know. You can refine the details
                      later.
                    </p>
                  </div>
                  <label className="studio-label">
                    Working title <span>Required</span>
                    <input
                      className="studio-input"
                      required
                      maxLength={200}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="The idea you can’t stop thinking about"
                    />
                  </label>
                  <label className="studio-label">
                    What is it about?
                    <textarea
                      className="studio-input"
                      rows={3}
                      maxLength={5000}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="A short synopsis, a story premise, or the problem you want to solve…"
                    />
                  </label>
                  <div className="studio-field-pair">
                    <label className="studio-label">
                      Who is it for?
                      <input
                        className="studio-input"
                        maxLength={1000}
                        value={audience}
                        onChange={(e) => setAudience(e.target.value)}
                        placeholder="e.g. First-time entrepreneurs"
                      />
                    </label>
                    <label className="studio-label">
                      Topic or genre
                      <input
                        className="studio-input"
                        maxLength={100}
                        value={genre}
                        onChange={(e) => setGenre(e.target.value)}
                        placeholder="e.g. Business, fantasy, wellness"
                      />
                    </label>
                  </div>
                  <label className="studio-label">
                    {formatId === "workbook"
                      ? "Learning objective"
                      : formatId === "guide"
                        ? "What will readers learn to do?"
                        : "What should readers take away?"}
                    <textarea
                      className="studio-input"
                      rows={2}
                      maxLength={4000}
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                      placeholder="The change, feeling, or skill you want to leave them with"
                    />
                  </label>
                  <div className="studio-field-pair">
                    <label className="studio-label">
                      Language
                      <select
                        className="studio-input"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                      >
                        {[
                          "English",
                          "Hindi",
                          "Spanish",
                          "French",
                          "German",
                          "Portuguese",
                          "Chinese",
                          "Japanese",
                        ].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                    <label className="studio-label">
                      Writing tone
                      <select
                        className="studio-input"
                        value={tone}
                        onChange={(e) => setTone(e.target.value)}
                      >
                        {[
                          "Engaging",
                          "Professional",
                          "Conversational",
                          "Inspirational",
                          "Academic",
                          "Playful",
                        ].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {formatId === "audiobook" && (
                    <label className="studio-label">
                      Start from an existing manuscript
                      <select
                        className="studio-input"
                        value={sourceBookId}
                        onChange={(e) => {
                          setSourceBookId(e.target.value);
                          const source = books.find(
                            (b) => b.id === e.target.value,
                          );
                          if (source && !title)
                            setTitle(`${source.title} — Audiobook`);
                        }}
                      >
                        <option value="">Write a new narration script</option>
                        {books.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.title}
                          </option>
                        ))}
                      </select>
                      <small>
                        Your original stays intact. Its saved chapters are
                        copied into a new project.
                      </small>
                    </label>
                  )}
                  <div className="studio-ai-inspiration">
                    <Sparkles />
                    <div>
                      <strong>Need a little inspiration?</strong>
                      <p>
                        {aiAvailable
                          ? "Use your brief to explore three title and synopsis ideas."
                          : "Write your own brief to get started. AI inspiration is available when a provider is connected."}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="studio-button secondary"
                      disabled={!aiAvailable || thinking || !goal.trim()}
                      onClick={brainstorm}
                    >
                      {thinking ? <Spinner /> : <Sparkles />}Explore ideas
                    </button>
                  </div>
                  {ideas.map((idea) => (
                    <button
                      type="button"
                      key={idea.title}
                      className="studio-idea"
                      onClick={() => {
                        setTitle(idea.title);
                        setDescription(idea.synopsis);
                        setAudience(idea.targetAudience);
                      }}
                    >
                      <strong>{idea.title}</strong>
                      <p>{idea.synopsis}</p>
                      <span>
                        Use this idea <ArrowRight />
                      </span>
                    </button>
                  ))}
                </>
              ) : (
                <>
                  <div className="studio-panel-heading">
                    <span className="studio-eyebrow">
                      THE TABLE OF CONTENTS
                    </span>
                    <h2>A little structure. Endless possibility.</h2>
                    <p>
                      {sourceBookId
                        ? "We’ll copy the saved chapters from your selected manuscript."
                        : `We've suggested a structure for your ${format.name.toLowerCase()}. Rename, add, or remove sections to make it yours.`}
                    </p>
                  </div>
                  {!sourceBookId && (
                    <label className="studio-label">
                      Section titles <span>One per line · up to 60</span>
                      <textarea
                        className="studio-input studio-outline-input"
                        rows={12}
                        value={outline}
                        onChange={(e) => setOutline(e.target.value)}
                        required
                      />
                    </label>
                  )}
                  <label className="studio-label">
                    {formatId === "audiobook"
                      ? "Script page target"
                      : "Page target"}
                    <input
                      className="studio-input"
                      type="number"
                      min={1}
                      max={1000}
                      required
                      value={targetPages}
                      onChange={(e) => setTargetPages(Number(e.target.value))}
                    />
                    <small>
                      Approximately {(targetPages * 250).toLocaleString()} words
                      at 250 words per page. Actual pagination varies.
                    </small>
                  </label>
                  <div className="studio-note">
                    <Check />
                    <p>
                      Your project starts with empty sections and planning
                      notes. Write yourself or generate a draft when AI is
                      connected.
                    </p>
                  </div>
                </>
              )}
              <div className="studio-form-actions">
                <button
                  type="button"
                  className="studio-button secondary"
                  onClick={() => setStep(step - 1)}
                >
                  <ArrowLeft />
                  Back
                </button>
                  {step === 2 ? (
                    <button
                      key="plan-structure"
                    type="button"
                    className="studio-button primary"
                    onClick={() => {
                      if (!title.trim()) {
                        setError("Give your project a working title.");
                        return;
                      }
                      setError("");
                      setStep(3);
                    }}
                  >
                    Plan the structure <ArrowRight />
                  </button>
                  ) : (
                    <button
                      key="create-project"
                    type="submit"
                    disabled={creating}
                    className="studio-button primary"
                  >
                    {creating ? <Spinner /> : <ArrowRight />}
                    {creating
                      ? "Creating your studio…"
                      : "Create my writing space"}
                  </button>
                )}
              </div>
            </div>
            <aside className="studio-project-summary">
              <span className={`studio-format-icon ${format.color}`}>
                <FormatIcon id={formatId} className="h-7 w-7" />
              </span>
              <span className="studio-eyebrow">YOUR NEXT PROJECT</span>
              <h2>{title || `Your ${format.name.toLowerCase()}`}</h2>
              <p>{format.outcome}</p>
              <dl>
                <div>
                  <dt>Format</dt>
                  <dd>{format.name}</dd>
                </div>
                <div>
                  <dt>Writing target</dt>
                  <dd>{targetPages} pages</dd>
                </div>
                <div>
                  <dt>Language</dt>
                  <dd>{language}</dd>
                </div>
                <div>
                  <dt>Voice</dt>
                  <dd>{tone}</dd>
                </div>
              </dl>
              <div className="studio-summary-tip">
                <Sparkles />
                <p>{format.instruction.split(".")[0]}.</p>
              </div>
            </aside>
          </form>
        )}
      </div>
    </div>
  );
}
export default function NewBookPage() {
  return (
    <Suspense
      fallback={
        <div className="studio-shell studio-loading">
          <Spinner />
          Loading your writing space…
        </div>
      }
    >
      <NewProject />
    </Suspense>
  );
}
