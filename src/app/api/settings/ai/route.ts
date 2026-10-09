import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { apiError, unauthorized } from "@/lib/api";
import { encryptApiKey } from "@/lib/ai-credentials";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const user = await getSessionUser(); if (!user) return unauthorized();
  try {
    const stored = await prisma.user.findUnique({ where: { id: user.id }, select: { openRouterKey: true } });
    if (new URL(req.url).searchParams.has("models")) {
      const response = await fetch("https://openrouter.ai/api/v1/models", { signal: AbortSignal.timeout(15000), cache: "no-store" });
      if (!response.ok) return NextResponse.json({ error: "Could not load the OpenRouter model catalog. Try again shortly." }, { status: 502 });
      const data = await response.json();
      const models = (data.data ?? []).filter((m: { architecture?: { output_modalities?: string[] } }) => m.architecture?.output_modalities?.includes("text")).map((m: { id: string; name: string }) => ({ id: m.id, name: m.name }));
      return NextResponse.json({ models });
    }
    return NextResponse.json({ connected: Boolean(stored?.openRouterKey || process.env.OPENROUTER_API_KEY), personal: Boolean(stored?.openRouterKey), provider: "openrouter", openai: Boolean(process.env.OPENAI_API_KEY) });
  } catch (e) { return apiError(e); }
}
export async function POST(req: Request) {
  const user = await getSessionUser(); if (!user) return unauthorized();
  try {
    const { apiKey } = z.object({ apiKey: z.string().trim().min(20).max(300).regex(/^sk-or-[A-Za-z0-9_-]+$/, "Enter a valid OpenRouter API key.") }).parse(await req.json());
    const response = await fetch("https://openrouter.ai/api/v1/key", { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(15000), cache: "no-store" });
    if (!response.ok) return NextResponse.json({ error: response.status === 401 ? "OpenRouter did not accept this key. Check it and try again." : "Could not verify your key with OpenRouter. Try again shortly." }, { status: response.status === 401 ? 400 : 502 });
    const data = await response.json();
    if (!data.data || data.data.is_management_key) return NextResponse.json({ error: "Use a regular OpenRouter inference key, not a management key." }, { status: 400 });
    await prisma.user.update({ where: { id: user.id }, data: { openRouterKey: encryptApiKey(apiKey) } });
    return NextResponse.json({ connected: true });
  } catch (e) {
    if (e instanceof z.ZodError) return apiError(e);
    return NextResponse.json({ error: "Could not save the connection. Check your network and try again." }, { status: 502 });
  }
}
export async function DELETE() {
  const user = await getSessionUser(); if (!user) return unauthorized();
  try { await prisma.user.update({ where: { id: user.id }, data: { openRouterKey: null } }); return NextResponse.json({ connected: Boolean(process.env.OPENROUTER_API_KEY), personal: false }); } catch (e) { return apiError(e); }
}
