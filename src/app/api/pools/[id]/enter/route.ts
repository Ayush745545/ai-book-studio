import { NextResponse } from "next/server";
import { z } from "zod";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { apiError, unauthorized, notFound } from "@/lib/api";
import { enterPool } from "@/lib/contest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ bookId: z.string().min(1) });

/**
 * POST /api/pools/[id]/enter — apply to any open pool with one of your
 * published books. Fee = pool.entryFee via Stripe Checkout (webhook → PAID).
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const pool = await prisma.contest.findUnique({ where: { id: params.id } });
    if (!pool) return notFound("Pool");

    const { bookId } = schema.parse(await req.json());
    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) return notFound("Book");

    const { entry, url } = await enterPool({
      user,
      book,
      contest: pool,
      fee: pool.entryFee,
      currency: pool.currency,
    });
    return NextResponse.json({ entryId: entry.id, url }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Stripe.errors.StripeAuthenticationError) {
      return NextResponse.json(
        { error: "Stripe is not configured. Please add a valid STRIPE_SECRET_KEY to .env.local" },
        { status: 503 }
      );
    }
    const status = (err as { status?: number })?.status;
    if (status) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status });
    }
    return apiError(err);
  }
}
