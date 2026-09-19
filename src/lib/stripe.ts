import Stripe from "stripe";

// Lazy singleton so the app builds/runs without STRIPE_SECRET_KEY until
// a payment feature is actually used.
let cached: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured. Add it to .env.local");
  }
  cached ??= new Stripe(key);
  return cached;
}
