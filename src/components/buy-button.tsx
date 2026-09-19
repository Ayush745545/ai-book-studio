"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";
import { useToast } from "@/components/ui/toast";
import { formatPrice } from "@/lib/utils";
import { Cart, Spinner } from "@/components/icons";

export function BuyButton({
  bookId,
  unitPrice,
}: {
  bookId: string;
  unitPrice: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function buy() {
    setLoading(true);
    try {
      const res = await apiFetch<{ url: string }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({ bookId, quantity: 1 }),
      });
      window.location.href = res.url; // → Stripe Checkout
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 401 || err.message.toLowerCase().includes("signed in")) {
        router.push(`/login?callbackUrl=/store/${bookId}`);
      } else {
        toast(err.message || "Could not start checkout", "error");
      }
      setLoading(false);
    }
  }

  return (
    <button onClick={buy} disabled={loading} className="btn-primary w-full !py-3 text-base">
      {loading ? <Spinner className="h-5 w-5" /> : <Cart className="h-5 w-5" />}
      {loading ? "Redirecting…" : `Buy printed copy — ${formatPrice(unitPrice)}`}
    </button>
  );
}
