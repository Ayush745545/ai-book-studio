import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiError, unauthorized, notFound, forbidden } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const ACTIONS = [
  "PROOFREAD",
  "REWRITE",
  "TONE_FRIENDLY",
  "TONE_PROFESSIONAL",
  "TONE_CONCISE",
  "SUMMARY",
  "KEY_POINTS",
  "LIST",
  "TABLE",
  "COMPOSE",
  "CUSTOM",
  "CHAT",
] as const;

const schema = z.object({
  action: z.enum(ACTIONS),
  text: z.string().min(1).max(20000),
  customPrompt: z.string().max(4000).optional(),
  bookId: z.string().max(100).optional(),
  chapterId: z.string().max(100).optional(),
  chapterTitle: z.string().max(200).optional(),
  provider: z.enum(["openai", "openrouter"]).optional().default("openai"),
  model: z.string().max(100).optional().default("gpt-4o-mini"),
  baseUrl: z.string().max(400).optional(),
  store: z.boolean().optional().default(true),
});

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const body = schema.parse(await req.json());

    let bookTitle = "";
    let bookGenre = "";
    let bookDescription = "";

    if (body.bookId) {
      const book = await prisma.book.findUnique({
        where: { id: body.bookId },
        select: {
          id: true,
          authorId: true,
          title: true,
          description: true,
          genre: true,
        },
      });
      if (!book) return notFound("Book");
      if (book.authorId !== user.id && user.role !== "ADMIN") return forbidden();
      bookTitle = book.title;
      bookGenre = book.genre ?? "";
      bookDescription = book.description ?? "";
    }

    const instructions = instructionFor(body.action, body.customPrompt ?? "");
    const system = buildSystemPrompt({
      bookTitle,
      bookGenre,
      bookDescription,
      chapterTitle: body.chapterTitle ?? "",
      action: body.action,
    });
    const userPrompt = buildUserPrompt(instructions, body.text);

    let result = "";
    let tokensUsed = 0;

    if (body.provider === "openrouter") {
      const baseUrl = (body.baseUrl || "https://openrouter.ai/api/v1").replace(/\/$/, "");
      const useModel = !body.model || body.model === "llama3" ? "openai/gpt-4o-mini" : body.model;
      const res = (await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY || ""}`,
        },
        body: JSON.stringify({
          model: useModel,
          messages: [
            { role: "system", content: system },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 2000,
          temperature: 0.6,
          stream: false,
        }),
      })) as Response & { json(): Promise<{ choices: { message: { content?: string } }; usage?: { total_tokens?: number } }> };
      if (!res.ok) throw new Error(`OpenRouter request failed (${res.status})`);
      const data = await res.json();
      result = data.choices?.[0]?.message?.content ?? "";
      tokensUsed = data.usage?.total_tokens ?? 0;
    } else {
      const fb = await fallbackOpenAI(body.model, system, userPrompt);
      result = fb.text;
      tokensUsed = fb.tokens;
    }

    if (!result) {
      result = "No output received from the AI model.";
    }

    if (body.store) {
      try {
        await prisma.aiEdit.create({
          data: {
            userId: user.id,
            bookId: body.bookId ?? undefined,
            chapterId: body.chapterId ?? undefined,
            action: body.action,
            prompt: body.customPrompt ?? null,
            beforeText: body.text,
            afterText: result,
            provider: body.provider,
            model: body.model,
            tokensUsed,
          },
        });
      } catch {
        // ignore persistence failures — they should not block the UX
      }
    }

    return NextResponse.json({
      result,
      tokensUsed,
      provider: body.provider,
      model: body.model,
      action: body.action,
    });
  } catch (err) {
    return apiError(err);
  }
}

function instructionFor(action: (typeof ACTIONS)[number], custom: string): string {
  switch (action) {
    case "PROOFREAD":
      return "Proofread the following text for grammar, spelling, punctuation, and clarity. Output ONLY the corrected version of the original text (no explanations, no lists, no markdown): preserve every sentence, but fix errors and polish awkward phrasing while keeping the original voice and style.";
    case "REWRITE":
      return "Rewrite the following text to make it more vivid, flowing, and engaging. Keep the same meaning, point of view, and structure. Output ONLY the rewritten text — no preamble, no comments, no bullet points.";
    case "TONE_FRIENDLY":
      return "Rewrite the following text in a warm, friendly, conversational tone — as if talking to a friend. Keep the original meaning. Output ONLY the rewritten text.";
    case "TONE_PROFESSIONAL":
      return "Rewrite the following text in a polished, professional, editorial tone suitable for a published book. Keep the original meaning. Output ONLY the rewritten text.";
    case "TONE_CONCISE":
      return "Tighten the following text to be more concise. Remove redundancy, cut filler words, sharpen sentences. Preserve all facts and the author's voice. Output ONLY the revised text.";
    case "SUMMARY":
      return "Write a clear, concise summary of the following text as a single, well-structured paragraph.";
    case "KEY_POINTS":
      return "Extract the key points from the following text. Format as a numbered list with one idea per line.";
    case "LIST":
      return "Convert the following text into a clean, scannable bulleted list. Keep each item short and distinct.";
    case "TABLE":
      return "Convert the following text into a Markdown table. Use sensible columns. If the text is prose, infer a useful structure (e.g., concept / meaning / example). Output ONLY the Markdown table.";
    case "COMPOSE":
      return custom?.trim()
        ? `Write the following, following this instruction: ${custom.trim()}. Write directly, no preamble.`
        : "Continue the following passage naturally in the same style and tone for 2-4 additional sentences.";
    case "CUSTOM":
      return custom?.trim()
        ? `Apply this instruction to the text below. If the instruction asks to rewrite or edit, output ONLY the resulting text with no explanation. Instruction: ${custom.trim()}`
        : "Improve the following text. Output ONLY the improved text.";
    case "CHAT":
      return custom?.trim() ?? "Respond helpfully.";
  }
}

function buildSystemPrompt(ctx: {
  bookTitle: string;
  bookGenre: string;
  bookDescription: string;
  chapterTitle: string;
  action: (typeof ACTIONS)[number];
}): string {
  const parts: string[] = [
    "You are an expert book-writing and editing assistant inside AI Book Studio.",
  ];
  if (ctx.bookTitle) parts.push(`You are helping an author editing a book titled "${ctx.bookTitle}".`);
  if (ctx.bookGenre) parts.push(`Genre: ${ctx.bookGenre}.`);
  if (ctx.bookDescription) parts.push(`Synopsis: ${ctx.bookDescription}`);
  if (ctx.chapterTitle) parts.push(`Current chapter: "${ctx.chapterTitle}".`);

  const isRewriteLike = ["PROOFREAD", "REWRITE", "TONE_FRIENDLY", "TONE_PROFESSIONAL", "TONE_CONCISE", "COMPOSE", "CUSTOM"].includes(
    ctx.action
  );
  if (isRewriteLike) {
    parts.push(
      "When asked to correct, rewrite, or transform text, output ONLY the final transformed text — no commentary, no preamble, no markdown headings, no before/after, no bullet list of changes. Preserve the author's voice. Keep paragraph breaks exactly as in the source unless the instruction explicitly asks to restructure."
    );
  } else {
    parts.push(
      "Be specific, clean, and well-formatted. Do not add apologies or disclaimers."
    );
  }
  return parts.join(" ");
}

function buildUserPrompt(instructions: string, text: string): string {
  return `${instructions}\n\n--- TEXT ---\n${text}\n--- END TEXT ---\n\nRespond now.`;
}

async function fallbackOpenAI(model: string, system: string, user: string) {
  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI();
  const completion = await openai.chat.completions.create({
    model: model || "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_tokens: 2000,
    temperature: 0.6,
  });
  const text = completion.choices[0]?.message?.content ?? "";
  const tokens = completion.usage?.total_tokens ?? approxTokens(system + user + text);
  return { text, tokens };
}

function approxTokens(s: string): number {
  if (!s) return 0;
  return Math.max(1, Math.floor(s.length / 4));
}
