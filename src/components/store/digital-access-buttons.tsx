"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";
import { useToast } from "@/components/ui/toast";
import { formatPrice } from "@/lib/utils";
import { BookOpen, Download, Share, Spinner } from "@/components/icons";

export function DigitalAccessButtons({
  bookId,
  hasAccess,
  digitalPrice,
}: {
  bookId: string;
  hasAccess: boolean;
  digitalPrice: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function buyDigital() {
    setLoading(true);
    try {
      const res = await apiFetch<{ url: string | null }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({ bookId, quantity: 1, type: "DIGITAL" }),
      });
      if (res.url) {
        window.location.href = res.url;
      } else {
        // Free purchase successful
        router.refresh();
        toast("Digital access unlocked!", "success");
      }
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

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, url });
      } catch (err) {
        // ignore abort
      }
    } else {
      navigator.clipboard.writeText(url);
      toast("Link copied to clipboard", "success");
    }
  }

  return (
    <div className="flex flex-col gap-3 mt-6">
      <div className="flex gap-3">
        {hasAccess ? (
          <>
            <button
              onClick={() => router.push(`/store/${bookId}/read`)}
              className="btn-primary flex-1 !py-3 text-sm"
            >
              <BookOpen className="h-4 w-4" /> Read Online
            </button>
            <a
              href={`/api/books/${bookId}/pdf`}
              className="btn-secondary flex-1 !py-3 text-sm"
              target="_blank"
              rel="noreferrer"
            >
              <Download className="h-4 w-4" /> Download PDF
            </a>
          </>
        ) : (
          <button
            onClick={buyDigital}
            disabled={loading}
            className="btn-primary flex-1 !py-3 text-sm"
          >
            {loading ? <Spinner className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
            {loading
              ? "Processing…"
              : `Unlock Digital Access — ${digitalPrice === 0 ? "Free" : formatPrice(digitalPrice)}`}
          </button>
        )}
      </div>
      <button onClick={share} className="btn-ghost text-xs">
        <Share className="h-4 w-4" /> Share Book
      </button>
    </div>
  );
}
