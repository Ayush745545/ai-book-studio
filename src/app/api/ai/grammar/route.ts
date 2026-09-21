import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import { grammarCheck } from "@/lib/openai";
import { apiError, unauthorized } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const schema = z.object({
  text: z.string().min(1, "Nothing to check").max(50000),
  provider: z.enum(["openai", "openrouter"]).optional(),
  model: z.string().min(1).max(100).optional(),
});

/** POST /api/ai/grammar — fix grammar/punctuation → { corrected, changes[] }. */
export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const body = schema.parse(await req.json());
    const result = await grammarCheck(body.text, {
      provider: body.provider,
      model: body.model,
    });
    return NextResponse.json(result);
  } catch (err) {
    return apiError(err);
  }
}
