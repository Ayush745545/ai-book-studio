import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export async function GET() {
  const user = await getSessionUser();
  const stored = user ? await prisma.user.findUnique({ where: { id: user.id }, select: { openRouterKey: true } }) : null;
  return NextResponse.json({ openai: Boolean(process.env.OPENAI_API_KEY), openrouter: Boolean(stored?.openRouterKey || process.env.OPENROUTER_API_KEY), narration: Boolean(process.env.OPENAI_API_KEY) });
}
