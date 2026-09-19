import OpenAI from "openai";
import {
  generateBookIdeaWithOllama,
  generateChapterWithOllama,
  grammarCheckWithOllama,
} from "@/lib/ollama";
import type { BookIdea, GrammarChange } from "@/types";

export type AiProvider = "openai" | "ollama";

export interface AiGenerationOptions {
  provider?: AiProvider;
  model?: string;
}

// Lazy singleton — only instantiated when an AI feature is actually used,
// so builds/dev don't crash when OPENAI_API_KEY is missing.
let cached: OpenAI | null = null;

function client(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured. Add it to .env.local");
  }
  cached ??= new OpenAI({ apiKey });
  return cached;
}

const TEXT_MODEL = "gpt-4o-mini";
const IMAGE_MODEL = "dall-e-3";

function resolveProvider(requested?: AiProvider): AiProvider {
  const configured = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (requested) return requested;
  if (configured === "ollama") return "ollama";
  if (configured && configured !== "openai") {
    throw new Error(`Unsupported AI_PROVIDER "${configured}". Use "openai" or "ollama".`);
  }
  return "openai";
}

function resolveModel(provider: AiProvider, requested?: string): string {
  if (requested?.trim()) return requested.trim();
  if (provider === "ollama") {
    const model = process.env.OLLAMA_MODEL?.trim();
    if (!model) throw new Error("OLLAMA_MODEL is not configured. Add it to .env.local");
    return model;
  }
  return TEXT_MODEL;
}

/**
 * Generate 3 marketable book ideas from a genre + keywords.
 */
export async function generateBookIdea(
  genre: string,
  keywords: string,
  options: AiGenerationOptions = {}
): Promise<{ ideas: BookIdea[] }> {
  const provider = resolveProvider(options.provider);
  if (provider === "ollama") {
    return generateBookIdeaWithOllama(genre, keywords, options.model);
  }

  const res = await client().chat.completions.create({
    model: resolveModel(provider, options.model),
    temperature: 0.95,
    max_tokens: 1600,
    response_format: { type: "json_object" },
    messages: [
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
  });

  const text = res.choices[0]?.message?.content ?? "{}";
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("The AI returned invalid JSON for book ideas. Try again.");
  }

  const raw = Array.isArray((parsed as { ideas?: unknown }).ideas)
    ? ((parsed as { ideas: Record<string, unknown>[] }).ideas)
    : Array.isArray(parsed)
      ? (parsed as Record<string, unknown>[])
      : [];

  const ideas: BookIdea[] = raw.slice(0, 3).map((i) => ({
    title: String(i.title ?? "Untitled"),
    hook: String(i.hook ?? ""),
    synopsis: String(i.synopsis ?? ""),
    targetAudience: String(i.targetAudience ?? ""),
  }));

  if (ideas.length === 0) throw new Error("No ideas were generated. Try again.");
  return { ideas };
}

/**
 * Write a full chapter (~1200 words) of prose.
 */
export async function generateChapter(
  bookTitle: string,
  chapterTitle: string,
  outline: string,
  tone: string,
  options: AiGenerationOptions = {}
): Promise<string> {
  const provider = resolveProvider(options.provider);
  if (provider === "ollama") {
    return generateChapterWithOllama(
      bookTitle,
      chapterTitle,
      outline,
      tone,
      options.model
    );
  }

  const res = await client().chat.completions.create({
    model: resolveModel(provider, options.model),
    temperature: 0.85,
    max_tokens: 3500,
    messages: [
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
  });

  const content = res.choices[0]?.message?.content?.trim() ?? "";
  if (!content) throw new Error("The AI returned an empty chapter. Try again.");
  return content;
}

/**
 * Fix grammar / spelling / punctuation. Returns the corrected text plus a
 * list of individual changes with reasons.
 */
export async function grammarCheck(
  text: string,
  options: AiGenerationOptions = {}
): Promise<{ corrected: string; changes: GrammarChange[] }> {
  const provider = resolveProvider(options.provider);
  if (provider === "ollama") {
    return grammarCheckWithOllama(text, options.model);
  }

  const res = await client().chat.completions.create({
    model: resolveModel(provider, options.model),
    temperature: 0.2,
    max_tokens: 4000,
    response_format: { type: "json_object" },
    messages: [
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
  });

  const raw = res.choices[0]?.message?.content ?? "{}";
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("The AI returned invalid JSON for the grammar check. Try again.");
  }

  const changes: GrammarChange[] = Array.isArray(parsed.changes)
    ? (parsed.changes as Record<string, unknown>[]).slice(0, 100).map((c) => ({
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

/**
 * Generate a DALL-E 3 book cover (portrait 1024x1792) and return its URL.
 *
 * NOTE: OpenAI image URLs expire after ~1 hour. For production, download the
 * image and re-host it (e.g. S3 / upload to /public) before persisting.
 */
export async function generateCover(prompt: string): Promise<string> {
  const res = await client().images.generate({
    model: IMAGE_MODEL,
    prompt: `Professional book cover artwork, portrait orientation, print quality. ${prompt}. Rich colors, dramatic composition, high detail. Do not include author names; any text should be minimal.`,
    n: 1,
    size: "1024x1792",
    quality: "standard",
    style: "vivid",
  });

  const url = res.data?.[0]?.url;
  if (!url) throw new Error("DALL-E did not return an image. Try again.");
  return url;
}
