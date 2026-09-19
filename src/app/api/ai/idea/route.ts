import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import { generateBookIdea } from "@/lib/openai";
import { apiError, unauthorized } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({
  genre: z.string().min(1, "Genre is required").max(100),
  keywords: z.string().min(1, "Keywords are required").max(500),
  provider: z.enum(["openai", "ollama"]).optional(),
  model: z.string().min(1).max(100).optional(),
});

/** POST /api/ai/idea — generate 3 book ideas from genre + keywords. */
export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const body = schema.parse(await req.json());
    const result = await generateBookIdea(body.genre, body.keywords, {
      provider: body.provider,
      model: body.model,
    });
    return NextResponse.json(result);
  } catch (err) {
    return apiError(err);
  }
}
