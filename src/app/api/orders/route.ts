import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { getSessionUser } from "@/lib/session";
import { unitPriceFor } from "@/lib/utils";
import { apiError, notFound, unauthorized } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  bookId: z.string().min(1),
  quantity: z.number().int().min(1).max(50).default(1),
  shippingAddr: z.string().max(2000).optional().nullable(), // JSON string
  type: z.enum(["PHYSICAL", "DIGITAL"]).default("PHYSICAL"),
});

/**
 * POST /api/orders — create an Order (PENDING) + a Stripe Checkout session.
 * Returns { orderId, url } — the client redirects to `url` to pay.
 */
export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const body = schema.parse(await req.json());

    const book = await prisma.book.findUnique({ where: { id: body.bookId } });
    if (!book) return notFound("Book");

    // Either it's on sale in the store, or the author is ordering a proof copy
    const isOwner = book.authorId === user.id;
    if (!book.isPublished && !isOwner) {
      return NextResponse.json({ error: "This book is not available for purchase" }, { status: 403 });
    }

    const unitPrice = body.type === "DIGITAL" ? book.digitalPrice : unitPriceFor(book.price);
    const amount = Math.round(unitPrice * body.quantity * 100) / 100;

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        bookId: book.id,
        quantity: body.quantity,
        amount,
        status: amount === 0 ? "PAID" : "PENDING",
        type: body.type,
        shippingAddr: body.shippingAddr ?? null,
      },
    });

    if (amount === 0) {
      // Free digital access or free physical (unlikely). Skip Stripe.
      return NextResponse.json({ orderId: order.id, url: null }, { status: 201 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const successUrl = book.isPublished
      ? `${appUrl}/store/${book.id}?purchased=1&orderId=${order.id}`
      : `${appUrl}/dashboard?purchased=1&orderId=${order.id}`;

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: user.email ?? undefined,
      line_items: [
        {
          quantity: body.quantity,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(unitPrice * 100),
            product_data: {
              name: `${book.title} — ${body.type === "DIGITAL" ? "Digital Access" : "printed paperback"}`,
              description: body.type === "DIGITAL" ? "Read online and download PDF" : "6×9in trade paperback, print-on-demand via Lulu",
            },
          },
        },
      ],
      success_url: successUrl,
      cancel_url: book.isPublished ? `${appUrl}/store/${book.id}` : `${appUrl}/dashboard`,
      metadata: { orderId: order.id, bookId: book.id, userId: user.id, orderType: body.type },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { stripeId: session.id },
    });

    return NextResponse.json({ orderId: order.id, url: session.url }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
