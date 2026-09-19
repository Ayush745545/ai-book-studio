import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { submitPrintOrder } from "@/lib/lulu";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/stripe
 *
 * checkout.session.completed → mark order PAID → submit Lulu print job.
 * checkout.session.expired   → mark order CANCELLED.
 *
 * Local testing:  stripe listen --forward-to localhost:3000/api/webhooks/stripe
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  const signature = headers().get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid signature";
    console.error("[stripe-webhook] signature verification failed:", message);
    return NextResponse.json({ error: `Webhook signature verification failed` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Writer-of-the-Week entry fee paid → activate the entry.
        const contestEntryId = session.metadata?.contestEntryId;
        if (contestEntryId) {
          await prisma.contestEntry.updateMany({
            where: { id: contestEntryId, status: "PENDING" },
            data: { status: "PAID", stripeSessionId: session.id },
          });
        }

        const orderId = session.metadata?.orderId;
        if (orderId) {
          await prisma.order.updateMany({
            where: { id: orderId, status: "PENDING" },
            data: { status: "PAID", stripeId: session.id },
          });
          // Fire the print job; failures must not block the webhook ack —
          // the order stays PAID and the job can be retried manually.
          const orderType = session.metadata?.orderType;
          if (orderType !== "DIGITAL") {
            try {
              await submitPrintOrder(orderId);
            } catch (e) {
              console.error(`[stripe-webhook] Lulu print job failed for ${orderId}:`, e);
            }
          }
        }
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;

        const contestEntryId = session.metadata?.contestEntryId;
        if (contestEntryId) {
          await prisma.contestEntry.updateMany({
            where: { id: contestEntryId, status: "PENDING" },
            data: { status: "VOID" },
          });
        }

        const orderId = session.metadata?.orderId;
        if (orderId) {
          await prisma.order.updateMany({
            where: { id: orderId, status: "PENDING" },
            data: { status: "CANCELLED" },
          });
        }
        break;
      }
      default:
        // Ignore all other event types
        break;
    }
  } catch (err) {
    console.error("[stripe-webhook] handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
