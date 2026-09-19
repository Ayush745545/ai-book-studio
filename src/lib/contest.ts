import { prisma } from "@/lib/prisma";
import type { Contest, ContestEntry } from "@prisma/client";

/** Entry fee in major currency units (default ₹10). */
export const CONTEST_FEE = Number(process.env.CONTEST_ENTRY_FEE ?? 10);
/** ISO currency code used for entries + pot (Stripe-compatible). */
export const CONTEST_CURRENCY = (process.env.CONTEST_CURRENCY ?? "inr").toLowerCase();

export function currencySymbol(code: string): string {
  switch (code) {
    case "inr":
      return "₹";
    case "usd":
      return "$";
    case "eur":
      return "€";
    case "gbp":
      return "£";
    default:
      return code.toUpperCase();
  }
}

/** Monday 00:00 (local) → next Monday 00:00 (exclusive end). */
export function weekBounds(now: Date = new Date()) {
  const d = new Date(now);
  const day = (d.getDay() + 6) % 7; // Mon = 0 … Sun = 6
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  const weekStart = new Date(d);
  const weekEnd = new Date(d);
  weekEnd.setDate(weekEnd.getDate() + 7);
  return { weekStart, weekEnd };
}

/** Get (or lazily create) this week's contest. */
export async function getCurrentContest(): Promise<Contest> {
  const { weekStart, weekEnd } = weekBounds();
  return prisma.contest.upsert({
    where: { weekStart },
    create: { weekStart, weekEnd, currency: CONTEST_CURRENCY, entryFee: CONTEST_FEE },
    // keep the system week's fee/currency in sync with env
    update: { entryFee: CONTEST_FEE, currency: CONTEST_CURRENCY },
  });
}

/**
 * Close every contest whose week has ended:
 *  - pot = sum of PAID entry fees
 *  - one winner drawn from the PAID entries (uniform random)
 *  - payout flagged PENDING so the pot can be transferred to the winner
 *  - unpaid (PENDING) entries are voided
 * Safe to call on every request; also exposed as a cron endpoint.
 */
export async function closeDueContests(now: Date = new Date()) {
  const due = await prisma.contest.findMany({
    where: { status: "OPEN", weekEnd: { lte: now } },
    include: {
      entries: {
        where: { status: "PAID" },
        include: { user: true, book: true },
      },
    },
  });

  for (const c of due) {
    const pot = Math.round(c.entries.reduce((s, e) => s + e.fee, 0) * 100) / 100;
    const winner =
      c.entries.length > 0
        ? c.entries[Math.floor(Math.random() * c.entries.length)]
        : null;

    await prisma.$transaction([
      prisma.contest.update({
        where: { id: c.id },
        data: {
          status: "CLOSED",
          closedAt: now,
          potAmount: pot,
          winnerId: winner?.userId ?? null,
          // The whole pot is transferred to the winner automatically.
          payoutStatus: winner && pot > 0 ? "PAID" : null,
          payoutPaidAt: winner && pot > 0 ? now : null,
        },
      }),
      prisma.contestEntry.updateMany({
        where: { contestId: c.id, status: "PENDING" },
        data: { status: "VOID" },
      }),
    ]);
  }
  return due.length;
}

export type ContestEntryWithRefs = ContestEntry & {
  user: { id: string; name: string | null; email: string };
  book: { id: string; title: string; coverUrl: string | null };
};

/** Create a user-owned pool that closes after `days` days. */
export async function createPool(args: {
  creatorId: string;
  title: string;
  fee: number;
  currency: string;
  days: number;
}) {
  const now = new Date();
  const weekEnd = new Date(now.getTime() + args.days * 86_400_000);
  return prisma.contest.create({
    data: {
      title: args.title,
      creatorId: args.creatorId,
      weekStart: now,
      weekEnd,
      currency: args.currency,
      entryFee: args.fee,
    },
  });
}

/**
 * Register a published book into a contest/pool. Creates a PENDING entry and
 * a Stripe Checkout session for the fee (PAID immediately in free-entry mode).
 * Returns { entry, url } — redirect to `url` to pay.
 */
export async function enterPool(args: {
  user: { id: string; email?: string | null };
  book: { id: string; title: string; authorId: string; isPublished: boolean };
  contest: Contest;
  fee: number;
  currency: string;
}) {
  const { user, book, contest } = args;
  if (book.authorId !== user.id) throw Object.assign(new Error("Not your book"), { status: 403 });
  if (!book.isPublished) {
    throw Object.assign(new Error("Publish the book first — only published books can enter."), { status: 400 });
  }
  if (contest.status !== "OPEN" || contest.weekEnd <= new Date()) {
    throw Object.assign(new Error("This pool is closed."), { status: 409 });
  }
  const existing = await prisma.contestEntry.findUnique({
    where: { contestId_bookId: { contestId: contest.id, bookId: book.id } },
  });
  if (existing && existing.status !== "VOID") {
    throw Object.assign(new Error("This book is already entered in this pool."), { status: 409 });
  }

  const entry = await prisma.contestEntry.create({
    data: {
      contestId: contest.id,
      userId: user.id,
      bookId: book.id,
      fee: args.fee,
      currency: args.currency,
      status: args.fee <= 0 ? "PAID" : "PENDING",
    },
  });
  if (args.fee <= 0) return { entry, url: null as string | null };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    const { getStripe } = await import("@/lib/stripe");
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: user.email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: args.currency,
            unit_amount: Math.round(args.fee * 100),
            product_data: {
              name: `${contest.title ?? "Writer of the Week"} — entry for “${book.title}”`,
              description: `Pool entry (${currencySymbol(args.currency)}${args.fee}). One winner takes the whole pot.`,
            },
          },
        },
      ],
      metadata: { contestEntryId: entry.id },
      success_url: `${appUrl}/pools?entered=1`,
      cancel_url: `${appUrl}/pools?cancelled=1`,
    });
    await prisma.contestEntry.update({ where: { id: entry.id }, data: { stripeSessionId: session.id } });
    return { entry, url: session.url as string | null };
  } catch (e) {
    await prisma.contestEntry.delete({ where: { id: entry.id } }).catch(() => {});
    throw e;
  }
}
