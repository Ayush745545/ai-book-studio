import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { apiError, unauthorized, notFound } from "@/lib/api";
import { getCurrentContest, enterPool } from "@/lib/contest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ bookId: z.string().min(1) });

/**
 * POST /api/contest/enter — register one of your published books into the
 * current Writer-of-the-Week. Fee via Stripe Checkout; webhook flips to PAID.
 * Returns { entryId, url }.
 */
export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { bookId } = schema.parse(await req.json());
    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) return notFound("Book");

    const contest = await getCurrentContest();
    const { entry, url } = await enterPool({
      user,
      book,
      contest,
      fee: contest.entryFee,
      currency: contest.currency,
    });
    return NextResponse.json({ entryId: entry.id, url }, { status: 201 });
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    if (status) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Error" },
        { status }
      );
    }
    return apiError(err);
  }
}
