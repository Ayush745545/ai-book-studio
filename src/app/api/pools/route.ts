import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { apiError, unauthorized } from "@/lib/api";
import {
  closeDueContests,
  createPool,
  CONTEST_CURRENCY,
} from "@/lib/contest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().min(3, "Title needs at least 3 characters").max(80),
  fee: z.number().min(0, "Fee can't be negative").max(100000),
  days: z.number().int().min(1).max(30).default(7),
});

/**
 * GET /api/pools — public board: open pools (system week + user-created)
 * with live pot/entries, plus recently closed pools with their winners.
 */
export async function GET() {
  try {
    await closeDueContests();
    const [open, closed] = await Promise.all([
      prisma.contest.findMany({
        where: { status: "OPEN" },
        include: {
          creator: { select: { id: true, name: true, email: true } },
          _count: { select: { entries: { where: { status: "PAID" } } } },
          entries: {
            where: { status: "PAID" },
            include: {
              user: { select: { id: true, name: true, email: true } },
              book: { select: { id: true, title: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { weekEnd: "asc" },
      }),
      prisma.contest.findMany({
        where: { status: "CLOSED" },
        include: {
          creator: { select: { id: true, name: true, email: true } },
          winner: { select: { id: true, name: true, email: true } },
        },
        orderBy: { closedAt: "desc" },
        take: 12,
      }),
    ]);

    const pot = (rows: typeof open) =>
      rows.map((r) => ({
        ...r,
        potAmount: Math.round(r.entries.reduce((s, e) => s + e.fee, 0) * 100) / 100,
      }));

    return NextResponse.json({ open: pot(open), closed });
  } catch (err) {
    return apiError(err);
  }
}

/**
 * POST /api/pools — any signed-in user creates a pool:
 * { title, fee, days } → open pool; entries pay `fee`; on close one winner
 * is drawn and the whole pot is transferred to them automatically.
 */
export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const body = createSchema.parse(await req.json());
    const pool = await createPool({
      creatorId: user.id,
      title: body.title,
      fee: body.fee,
      currency: CONTEST_CURRENCY,
      days: body.days,
    });
    return NextResponse.json({ pool }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
