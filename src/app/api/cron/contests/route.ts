import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { closeDueContests } from "@/lib/contest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/cron/contests — closes finished weeks (announces the winner and
 * freezes the pot). The app also self-heals lazily on GET /api/contest, so
 * this endpoint is only for punctuality (Vercel Cron / any external cron).
 *
 * vercel.json: { "crons": [{ "path": "/api/cron/contests", "schedule": "5 0 * * *" }] }
 * Security: if CRON_SECRET is set, the caller must send
 *   Authorization: Bearer <CRON_SECRET>
 */
export async function POST() {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = headers().get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  const closed = await closeDueContests();
  return NextResponse.json({ closed });
}
