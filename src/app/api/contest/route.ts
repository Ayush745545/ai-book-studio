import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { apiError, unauthorized } from "@/lib/api";
import {
  closeDueContests,
  currencySymbol,
  getCurrentContest,
  CONTEST_FEE,
  CONTEST_CURRENCY,
} from "@/lib/contest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/contest — current Writer-of-the-Week state.
 * { contest, entries, myEntryBookIds, past, fee, currency, symbol, serverNow }
 */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    // Auto-close finished weeks (also runs on a cron for punctuality).
    await closeDueContests();

    const contest = await getCurrentContest();
    const [entries, past] = await Promise.all([
      prisma.contestEntry.findMany({
        where: { contestId: contest.id, status: { not: "VOID" } },
        include: {
          user: { select: { id: true, name: true, email: true } },
          book: { select: { id: true, title: true, coverUrl: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.contest.findMany({
        where: { status: "CLOSED" },
        include: {
          winner: { select: { id: true, name: true, email: true } },
        },
        orderBy: { weekStart: "desc" },
        take: 8,
      }),
    ]);

    return NextResponse.json({
      contest,
      entries,
      myEntryBookIds: entries.filter((e) => e.userId === user.id).map((e) => e.bookId),
      past,
      fee: CONTEST_FEE,
      currency: CONTEST_CURRENCY,
      symbol: currencySymbol(CONTEST_CURRENCY),
      serverNow: new Date().toISOString(),
    });
  } catch (err) {
    return apiError(err);
  }
}
