import type { BookIdea, GrammarChange } from "@/types";

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";

function getApiKey(): string {
  return process.env.OPENROUTER_API_KEY || "";
}

function getBaseUrl(): string {
  return process.env.OPENROUTER_BASE_URL || DEFAULT_BASE_URL;
}

function headers(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getApiKey()}`,
  };
}

function resolveModel(requested?: string): string {
  if (requested?.trim()) return requested.trim();
  return "openai/gpt-4o-mini";
}

async function chatCompletions(
  model: string,
  messages: { role: string; content: string }[],
  temperature: number,
  maxTokens: number,
  stream = false
): Promise<{ text: string; tokens: number }> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`OpenRouter request failed (${res.status}): ${detail}`);
  }

  if (stream) {
    return { text: "", tokens: 0 };
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string }; usage?: { total_tokens?: number } }[];
  };
  const text = data.choices?.[0]?.message?.content ?? "";
  const tokens = data.choices?.[0]?.usage?.total_tokens ?? 0;
  return { text, tokens };
}

function parseJson(text: string, message: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        throw new Error(message);
      }
    }
    throw new Error(message);
  }
}

function parseBookIdeas(text: string): BookIdea[] {
  const parsed = parseJson(text, "The AI returned invalid JSON for book ideas. Try again.") as Record<
    string,
    unknown
  >;
  const raw = Array.isArray((parsed as { ideas?: unknown }).ideas)
    ? ((parsed as { ideas: Record<string, unknown>[] }).ideas)
    : Array.isArray(parsed)
      ? (parsed as Record<string, unknown>[])
      : [];

  const ideas: BookIdea[] = raw.slice(0, 3).map((idea) => ({
    title: String(idea.title ?? "Untitled"),
    hook: String(idea.hook ?? ""),
    synopsis: String(idea.synopsis ?? ""),
    targetAudience: String(idea.targetAudience ?? ""),
  }));

  if (ideas.length === 0) throw new Error("No ideas were generated. Try again.");
  return ideas;
}

export async function listOpenRouterModels(): Promise<string[]> {
  try {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/models`, {
      headers: headers(),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: { id?: string }[] };
    return (data.data ?? []).map((m) => m.id ?? "").filter(Boolean);
  } catch {
    return [];
  }
}

export async function generateBookIdeaWithOpenRouter(
  genre: string,
  keywords: string,
  model?: string
): Promise<{ ideas: BookIdea[] }> {
  const m = resolveModel(model);
  const { text } = await chatCompletions(
    m,
    [
      {
        role: "system",
        content:
          "You are an expert publishing strategist who brainstorms compelling, marketable book concepts. You always respond with valid JSON.",
      },
      {
        role: "user",
        content: `Brainstorm exactly 3 distinct book ideas.\n\nGenre: ${genre}\nKeywords / themes: ${keywords}\n\nRespond with JSON in this exact shape:\n{"ideas":[{"title":"...","hook":"one-sentence elevator pitch","synopsis":"120-180 word synopsis","targetAudience":"who this book is for"}]}`,
      },
    ],
    0.95,
    1600
  );
  return { ideas: parseBookIdeas(text) };
}

export async function generateChapterWithOpenRouter(
  bookTitle: string,
  chapterTitle: string,
  outline: string,
  tone: string,
  model?: string
): Promise<string> {
  const m = resolveModel(model);
  const { text } = await chatCompletions(
    m,
    [
      {
        role: "system",
        content: `You are a professional ghostwriter. You write vivid, well-paced prose of about 1200 words per chapter in a ${tone || "engaging"} tone. Output ONLY the chapter prose — no meta commentary, no markdown headers, no author notes. Separate paragraphs with a single blank line.`,
      },
      {
        role: "user",
        content: `Book title: ${bookTitle}\nChapter title: ${chapterTitle}\nOutline / notes: ${outline || "None provided — invent a fitting arc for this chapter."}\n\nWrite the full chapter now (~1200 words).`,
      },
    ],
    0.85,
    3500
  );
  if (!text) throw new Error("OpenRouter returned an empty chapter. Try again.");
  return text;
}

export async function grammarCheckWithOpenRouter(
  text: string,
  model?: string
): Promise<{ corrected: string; changes: GrammarChange[] }> {
  const m = resolveModel(model);
  const { text: result } = await chatCompletions(
    m,
    [
      {
        role: "system",
        content:
          "You are a meticulous copy editor. You fix grammar, spelling and punctuation without changing the author's voice, style or plot. You always respond with valid JSON.",
      },
      {
        role: "user",
        content: `Correct the text below and respond with JSON in this exact shape:\n{"corrected":"the full corrected text","changes":[{"original":"snippet as written","corrected":"snippet fixed","reason":"brief explanation"}]}\n\nTEXT:\n"""\n${text.slice(0, 12000)}\n"""`,
      },
    ],
    0.2,
    4000
  );

  const parsed = parseJson(result, "The AI returned invalid JSON for the grammar check. Try again.") as Record<
    string,
    unknown
  >;
  const changes: GrammarChange[] = Array.isArray(parsed.changes)
    ? (parsed.changes as Record<string, unknown>[])
        .slice(0, 100)
        .map((c) => ({
          original: String(c.original ?? ""),
          corrected: String(c.corrected ?? ""),
          reason: String(c.reason ?? ""),
        }))
    : [];
  const corrected =
    typeof parsed.corrected === "string" && parsed.corrected.trim()
      ? parsed.corrected
      : text;

  return { corrected, changes };
}
