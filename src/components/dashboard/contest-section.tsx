"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/client";
import { useToast } from "@/components/ui/toast";
import { Star, Plus, Spinner, CreditCard, Users } from "@/components/icons";

interface EntryView {
  id: string;
  userId: string;
  bookId: string;
  fee: number;
  status: string;
  user: { id: string; name: string | null; email: string };
  book: { id: string; title: string; coverUrl: string | null };
}

interface PastContest {
  id: string;
  weekStart: string;
  potAmount: number;
  currency: string;
  payoutStatus: string | null;
  winner: { id: string; name: string | null; email: string } | null;
}

interface ContestState {
  contest: {
    id: string;
    weekStart: string;
    weekEnd: string;
    status: string;
    potAmount: number;
    currency: string;
  };
  entries: EntryView[];
  myEntryBookIds: string[];
  past: PastContest[];
  fee: number;
  currency: string;
  symbol: string;
  serverNow: string;
}

interface BookOption {
  id: string;
  title: string;
  isPublished: boolean;
}

export function ContestSection({ books }: { books: BookOption[] }) {
  const toast = useToast();
  const [state, setState] = useState<ContestState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bookId, setBookId] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const s = await apiFetch<ContestState>("/api/contest");
      setState(s);
      setError(null);
      setNow(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load contest");
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [load]);

  const enter = async () => {
    if (!bookId) return;
    setBusy(true);
    try {
      const res = await apiFetch<{ entryId: string; url: string | null }>(
        "/api/contest/enter",
        { method: "POST", body: JSON.stringify({ bookId }) }
      );
      if (res.url) {
        window.location.href = res.url; // → Stripe Checkout
        return;
      }
      toast("Entered! Good luck 🍀", "success");
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Entry failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const countdown = useMemo(() => {
    if (!state) return "";
    const ms = new Date(state.contest.weekEnd).getTime() - now;
    if (ms <= 0) return "closing…";
    const d = Math.floor(ms / 86_400_000);
    const h = Math.floor((ms % 86_400_000) / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return d > 0 ? `${d}d ${h}h left` : `${h}h ${m}m left`;
  }, [state, now]);

  const paidCount = state?.entries.filter((e) => e.status === "PAID").length ?? 0;
  const publishable = books.filter(
    (b) => b.isPublished && !state?.myEntryBookIds.includes(b.id)
  );
  const lastWinner = state?.past.find((p) => p.winner);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] shadow-sm mt-10 px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 text-amber-500 ring-1 ring-amber-500/30">
            <Star className="h-5 w-5" />
          </span>
          <div>
          <h2 className="text-lg font-semibold text-zinc-100">Writer of the Week</h2>
          <p className="mt-0.5 max-w-xl text-sm text-zinc-400">
            Enter a published book for{" "}
            <span className="font-semibold text-zinc-300">
              {state ? `${state.symbol}${state.fee}` : "…"}
            </span>
            . At the end of the week one writer is announced automatically and
            the whole pot is transferred to them.
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-zinc-100">
            {state ? `${state.symbol}${state.contest.potAmount.toLocaleString()}` : "…"}
          </p>
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            pot · {paidCount} {paidCount === 1 ? "entry" : "entries"}
          </p>
          {state?.contest.status === "OPEN" && (
            <p className="mt-1 text-[11px] font-semibold text-amber-500">{countdown}</p>
          )}
        </div>
      </div>

      {lastWinner && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300">
          <Star className="h-4 w-4" />
          <span>
            Last winner:{" "}
            <b>{lastWinner.winner?.name ?? lastWinner.winner?.email}</b> won{" "}
            <b>
              {currencySymbolFor(lastWinner.currency)}
              {lastWinner.potAmount.toLocaleString()}
            </b>{" "}
            · payout transferred ✓
          </span>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <select
          value={bookId}
          onChange={(e) => setBookId(e.target.value)}
          className="h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-zinc-200 outline-none focus:border-indigo-400/60 sm:max-w-xs"
        >
          <option value="">
            {publishable.length ? "Pick a book to enter…" : "No publishable books left"}
          </option>
          {publishable.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
            </option>
          ))}
        </select>
        <button
          onClick={enter}
          disabled={!bookId || busy}
          className="btn-primary h-9 disabled:opacity-50"
        >
          {busy ? (
            <Spinner className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Enter contest
        </button>
        {state && state.myEntryBookIds.length > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
            <Users className="h-3.5 w-3.5" />
            {state.myEntryBookIds.length} of your{" "}
            {state.myEntryBookIds.length === 1 ? "book is" : "books are"} in this week
          </span>
        )}
      </div>

      {state && state.entries.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {state.entries.map((e) => (
            <span
              key={e.id}
              title={`entered by ${e.user.name ?? e.user.email}`}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                e.status === "PAID"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-white/10 bg-white/5 text-zinc-400"
              }`}
            >
              <CreditCard className="h-3 w-3" />
              {e.book.title}
              <span className="text-zinc-500">· {e.user.name ?? e.user.email}</span>
            </span>
          ))}
        </div>
      )}

      {state && state.past.length > 1 && (
        <details className="mt-4 text-sm text-zinc-400">
          <summary className="cursor-pointer select-none hover:text-zinc-200">
            Past winners
          </summary>
          <ul className="mt-2 space-y-1">
            {state.past.slice(1).map((p) => (
              <li key={p.id}>
                {new Date(p.weekStart).toLocaleDateString()} —{" "}
                {p.winner ? (
                  <>
                    <b className="text-zinc-200">{p.winner.name ?? p.winner.email}</b>{" "}
                    won {currencySymbolFor(p.currency)}
                    {p.potAmount.toLocaleString()} ({p.payoutStatus ?? "—"})
                  </>
                ) : (
                  "no paid entries"
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </section>
  );
}

function currencySymbolFor(code: string): string {
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
