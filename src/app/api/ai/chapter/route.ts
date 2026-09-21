import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import { generateChapter } from "@/lib/openai";
import { countWords } from "@/lib/utils";
import { apiError, unauthorized } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const schema = z.object({
  bookTitle: z.string().min(1).max(200),
  chapterTitle: z.string().min(1).max(200),
  outline: z.string().max(4000).default(""),
  tone: z.string().max(50).default("engaging"),
  provider: z.enum(["openai", "openrouter"]).optional(),
  model: z.string().min(1).max(100).optional(),
});

/** POST /api/ai/chapter — generate a full chapter (~1200 words). */
export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const body = schema.parse(await req.json());
    const content = await generateChapter(
      body.bookTitle,
      body.chapterTitle,
      body.outline,
      body.tone,
      { provider: body.provider, model: body.model }
    );
    return NextResponse.json({ content, wordCount: countWords(content) });
  } catch (err) {
    return apiError(err);
  }
}
