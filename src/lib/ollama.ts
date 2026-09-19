import type { BookIdea, GrammarChange } from "@/types";

export type OllamaRole = "system" | "user" | "assistant";

export interface OllamaMessage {
  role: OllamaRole;
  content: string;
}

export interface OllamaChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
}

interface OllamaChatResponse {
  message?: {
    content?: string;
  };
  error?: string;
}

export async function ollamaChat(
  messages: OllamaMessage[],
  options: OllamaChatOptions = {}
): Promise<string> {
  const baseUrl = (process.env.OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/+$/, "");
  const model = options.model?.trim() || process.env.OLLAMA_MODEL?.trim();

  if (!model) {
    throw new Error("OLLAMA_MODEL is not configured. Add it to .env.local");
  }

  const body: Record<string, unknown> = {
    model,
    messages,
    stream: false,
  };

  if (options.json) {
    body.format = "json";
  }

  const requestOptions: Record<string, unknown> = {};
  if (options.temperature !== undefined) {
    requestOptions.temperature = options.temperature;
  }
  if (options.maxTokens !== undefined) {
    requestOptions.num_predict = options.maxTokens;
  }
  if (Object.keys(requestOptions).length > 0) {
    body.options = requestOptions;
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new Error(
      `Unable to reach Ollama at ${baseUrl}. ${error instanceof Error ? error.message : "Try again."}`
    );
  }

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const payload = (await response.json()) as { error?: unknown };
      detail = typeof payload.error === "string" ? payload.error : detail;
    } catch {
      detail = (await response.text()).trim() || detail;
    }
    // Model not installed locally → say exactly how to fix it.
    if (response.status === 404 && /not found/i.test(detail)) {
      const available = await listOllamaModels(baseUrl);
      const have = available.length
        ? ` Models already installed: ${available.join(", ")}.`
        : " Ollama has no models yet — pull one first.";
      throw new Error(
        `Ollama model "${model}" is not installed. Fix: run \`ollama pull ${model}\` in a terminal, ` +
          `or pick an installed model (Settings → AI, or OLLAMA_MODEL in .env.local).${have}`
      );
    }
    throw new Error(`Ollama request failed (${response.status}): ${detail}`);
  }

  const payload = (await response.json()) as OllamaChatResponse;
  if (payload.error) {
    throw new Error(`Ollama error: ${payload.error}`);
  }

  const content = payload.message?.content?.trim();
  if (!content) {
    throw new Error("Ollama returned an empty response. Try again.");
  }
  return content;
}

async function listOllamaModels(baseUrl: string): Promise<string[]> {
  try {
    const r = await fetch(`${baseUrl}/api/tags`, { cache: "no-store" });
    if (!r.ok) return [];
    const j = (await r.json()) as { models?: { name?: string }[] };
    return (j.models ?? []).map((m) => m.name ?? "").filter(Boolean);
  } catch {
    return [];
  }
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
  const parsed = parseJson(text, "The AI returned invalid JSON for book ideas. Try again.");
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

  if (ideas.length === 0) {
    throw new Error("No ideas were generated. Try again.");
  }
  return ideas;
}

export async function generateBookIdeaWithOllama(
  genre: string,
  keywords: string,
  model?: string
): Promise<{ ideas: BookIdea[] }> {
  const content = await ollamaChat(
    [
      {
        role: "system",
        content:
          "You are an expert publishing strategist who brainstorms compelling, marketable book concepts. You always respond with valid JSON.",
      },
      {
        role: "user",
        content: `Brainstorm exactly 3 distinct book ideas.

Genre: ${genre}
Keywords / themes: ${keywords}

Respond with JSON in this exact shape:
{"ideas":[{"title":"...","hook":"one-sentence elevator pitch","synopsis":"120-180 word synopsis","targetAudience":"who this book is for"}]}`,
      },
    ],
    { model, temperature: 0.95, maxTokens: 1600, json: true }
  );

  return { ideas: parseBookIdeas(content) };
}

export async function generateChapterWithOllama(
  bookTitle: string,
  chapterTitle: string,
  outline: string,
  tone: string,
  model?: string
): Promise<string> {
  const content = await ollamaChat(
    [
      {
        role: "system",
        content: `You are a professional ghostwriter. You write vivid, well-paced prose of about 1200 words per chapter in a ${
          tone || "engaging"
        } tone. Output ONLY the chapter prose — no meta commentary, no markdown headers, no author notes. Separate paragraphs with a single blank line.`,
      },
      {
        role: "user",
        content: `Book title: ${bookTitle}
Chapter title: ${chapterTitle}
Outline / notes: ${outline || "None provided — invent a fitting arc for this chapter."}

Write the full chapter now (~1200 words).`,
      },
    ],
    { model, temperature: 0.85, maxTokens: 3500 }
  );

  if (!content) {
    throw new Error("Ollama returned an empty chapter. Try again.");
  }
  return content;
}

export async function grammarCheckWithOllama(
  text: string,
  model?: string
): Promise<{ corrected: string; changes: GrammarChange[] }> {
  const content = await ollamaChat(
    [
      {
        role: "system",
        content:
          "You are a meticulous copy editor. You fix grammar, spelling and punctuation without changing the author's voice, style or plot. You always respond with valid JSON.",
      },
      {
        role: "user",
        content: `Correct the text below and respond with JSON in this exact shape:
{"corrected":"the full corrected text","changes":[{"original":"snippet as written","corrected":"snippet fixed","reason":"brief explanation"}]}

TEXT:
"""
${text.slice(0, 12000)}
"""`,
      },
    ],
    { model, temperature: 0.2, maxTokens: 4000, json: true }
  );

  const parsed = parseJson(content, "The AI returned invalid JSON for the grammar check. Try again.") as Record<
    string,
    unknown
  >;
  const changes: GrammarChange[] = Array.isArray(parsed.changes)
    ? (parsed.changes as Record<string, unknown>[]).slice(0, 100).map((change) => ({
        original: String(change.original ?? ""),
        corrected: String(change.corrected ?? ""),
        reason: String(change.reason ?? ""),
      }))
    : [];
  const corrected =
    typeof parsed.corrected === "string" && parsed.corrected.trim() ? parsed.corrected : text;

  return { corrected, changes };
}
