import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiError, unauthorized } from "@/lib/api";
import { dateKey, groupWritingActivity, writingStreaks } from "@/lib/writing-activity";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const user = await getSessionUser(); if (!user) return unauthorized();
  const timeZone = new URL(req.url).searchParams.get("timeZone") || "Asia/Kolkata";
  try { new Intl.DateTimeFormat("en", { timeZone }); } catch { return NextResponse.json({ error: "Choose a valid time zone." }, { status: 400 }); }
  try {
    const events = await prisma.writingActivity.findMany({ where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 366 * 86400000) } }, select: { createdAt: true, wordsAdded: true, wordsRemoved: true, bookTitle: true, action: true }, orderBy: { createdAt: "asc" } });
    const today = dateKey(new Date(), timeZone), days = groupWritingActivity(events, timeZone);
    return NextResponse.json({ days, today, timeZone, streaks: writingStreaks(days, today) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) { return apiError(e); }
}
