"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SerializedBook } from "@/types";
import { apiFetch } from "@/lib/client";
import { useToast } from "@/components/ui/toast";
import { formatPrice, unitPriceFor } from "@/lib/utils";
import { BookCover } from "@/components/book-card";
import { CreditCard, Printer, Spinner, Truck } from "@/components/icons";

interface Addr {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export function PrintTab({ book }: { book: SerializedBook }) {
  const router = useRouter();
  const toast = useToast();
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [addr, setAddr] = useState<Addr>({
    name: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
  });

  const unit = unitPriceFor(book.price);
  const total = unit * quantity;

  const set = (k: keyof Addr) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAddr((a) => ({ ...a, [k]: e.target.value }));

  async function placeOrder() {
    if (!addr.name || !addr.street || !addr.city || !addr.zip) {
      toast("Please fill in your full shipping address", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<{ url: string }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          bookId: book.id,
          quantity,
          shippingAddr: JSON.stringify(addr),
        }),
      });
      window.location.href = res.url; // → Stripe Checkout
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Order failed";
      if (msg.toLowerCase().includes("signed in")) router.push(`/login?callbackUrl=/books/${book.id}`);
      else toast(msg, "error");
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Shipping form */}
      <div className="card h-fit p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
          <Truck className="h-5 w-5 text-indigo-400" /> Shipping address
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Your printed copies are produced and shipped via Lulu print-on-demand
          after payment.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Full name</label>
            <input value={addr.name} onChange={set("name")} className="input" placeholder="Jane Author" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Street address</label>
            <input value={addr.street} onChange={set("street")} className="input" placeholder="123 Paperback Ln" />
          </div>
          <div>
            <label className="label">City</label>
            <input value={addr.city} onChange={set("city")} className="input" placeholder="Brooklyn" />
          </div>
          <div>
            <label className="label">State / Province</label>
            <input value={addr.state} onChange={set("state")} className="input" placeholder="NY" />
          </div>
          <div>
            <label className="label">ZIP / Postcode</label>
            <input value={addr.zip} onChange={set("zip")} className="input" placeholder="11201" />
          </div>
          <div>
            <label className="label">Country code</label>
            <input value={addr.country} onChange={set("country")} className="input" placeholder="US" maxLength={2} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Quantity</label>
            <input
              type="number"
              min={1}
              max={50}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              className="input w-28"
            />
          </div>
        </div>
      </div>

      {/* Order summary */}
      <div className="card h-fit p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          <Printer className="h-4 w-4" /> Order summary
        </h2>

        <div className="mt-4 flex gap-4">
          <div className="h-28 w-20 shrink-0 overflow-hidden rounded-lg border border-white/10">
            <BookCover book={book} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{book.title}</p>
            <p className="mt-0.5 text-xs text-zinc-500">6×9in trade paperback</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {book.chapters?.length ?? 0} chapters ·{" "}
              {(book.chapters ?? []).reduce((s, c) => s + c.wordCount, 0).toLocaleString()} words
            </p>
          </div>
        </div>

        <dl className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm">
          <div className="flex justify-between text-zinc-400">
            <dt>Unit price</dt>
            <dd>{formatPrice(unit)}</dd>
          </div>
          <div className="flex justify-between text-zinc-400">
            <dt>Quantity</dt>
            <dd>×{quantity}</dd>
          </div>
          <div className="flex justify-between border-t border-white/10 pt-2 text-base font-bold text-white">
            <dt>Total</dt>
            <dd>{formatPrice(total)}</dd>
          </div>
        </dl>

        <button onClick={placeOrder} disabled={loading} className="btn-primary mt-5 w-full">
          {loading ? <Spinner /> : <CreditCard className="h-4 w-4" />}
          {loading ? "Preparing checkout…" : "Continue to payment"}
        </button>

        <p className="mt-3 text-center text-[11px] text-zinc-600">
          Secure checkout by Stripe. Printing starts automatically after payment.
        </p>
      </div>
    </div>
  );
}
