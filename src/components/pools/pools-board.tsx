"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/client";
import { useToast } from "@/components/ui/toast";
import { Star, Plus, Spinner, Users, CreditCard } from "@/components/icons";

interface EntryView {
  id: string;
  userId: string;
  bookId: string;
  fee: number;
  status: string;
  user: { id: string; name: string | null; email: string };
  book: { id: string; title: string };
}
interface PoolView {
  id: string;
  title: string | null;
  weekStart: string;
  weekEnd: string;
  status: string;
  entryFee: number;
  currency: string;
  potAmount: number;
  closedAt: string | null;
  payoutStatus: string | null;
  creator: { id: string; name: string | null; email: string } | null;
  winner?: { id: string; name: string | null; email: string } | null;
  entries: EntryView[];
  _count?: { entries: number };
}
interface PoolsState {
  open: PoolView[];
  closed: PoolView[];
}

const SYMBOL: Record<string, string> = { inr: "₹", usd: "$", eur: "€", gbp: "£" };
const sym = (c: string) => SYMBOL[c] ?? c.toUpperCase();

export function PoolsBoard({
  userId,
  books,
}: {
  userId: string | null;
  books: { id: string; title: string }[];
}) {
  const toast = useToast();
  const [state, setState] = useState<PoolsState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", fee: "10", days: "7" });
  const [busyPool, setBusyPool] = useState<string | null>(null);
  const [pick, setPick] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const s = await apiFetch<PoolsState>("/api/pools");
      setState(s);
      setError(null);
      setNow(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pools");
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [load]);

  const create = async () => {
    setBusyPool("new");
    try {
      await apiFetch("/api/pools", {
        method: "POST",
        body: JSON.stringify({
          title: form.title.trim(),
          fee: Number(form.fee) || 0,
          days: Number(form.days) || 7,
        }),
      });
      toast("Pool created ", "success");
      setForm({ title: "", fee: "10", days: "7" });
      setCreating(false);
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Create failed", "error");
    } finally {
      setBusyPool(null);
    }
  };

  const enter = async (pool: PoolView) => {
    const bookId = pick[pool.id];
    if (!bookId) return;
    setBusyPool(pool.id);
    try {
      const res = await apiFetch<{ entryId: string; url: string | null }>(
        `/api/pools/${pool.id}/enter`,
        { method: "POST", body: JSON.stringify({ bookId }) }
      );
      if (res.url) {
        window.location.href = res.url;
        return;
      }
      toast("Applied! Good luck 🍀", "success");
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Entry failed", "error");
    } finally {
      setBusyPool(null);
    }
  };

  const left = (iso: string) => {
    const ms = new Date(iso).getTime() - now;
    if (ms <= 0) return "closing…";
    const d = Math.floor(ms / 86_400_000);
    const h = Math.floor((ms % 86_400_000) / 3_600_000);
    return d > 0 ? `${d}d ${h}h left` : `${h}h left`;
  };

  const open = state?.open ?? [];
  const closed = state?.closed ?? [];

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Pools
          </h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-500">
            Weekly and community writing pools. Apply with a published book —
            when a pool closes, one winner is announced automatically and the
            whole pot is transferred to them.
          </p>
        </div>
        {userId && (
          <button onClick={() => setCreating((v) => !v)} className="btn-primary">
            <Plus className="h-4 w-4" /> Create pool
          </button>
        )}
      </div>

      {userId && creating && (
        <div className="card mb-8 grid gap-3 px-5 py-4 sm:grid-cols-[1fr_120px_110px_auto]">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Pool name — e.g. Monsoon Romance Week"
            className="h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-200 outline-none focus:border-indigo-500"
          />
          <input
            type="number"
            min={0}
            value={form.fee}
            onChange={(e) => setForm({ ...form, fee: e.target.value })}
            className="h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-200 outline-none focus:border-indigo-500"
            title="Entry fee"
          />
          <select
            value={form.days}
            onChange={(e) => setForm({ ...form, days: e.target.value })}
            className="h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-sm text-zinc-200 outline-none focus:border-indigo-500"
          >
            {["1", "3", "7", "14", "30"].map((d) => (
              <option key={d} value={d}>
                {d} day{d === "1" ? "" : "s"}
              </option>
            ))}
          </select>
          <button
            onClick={create}
            disabled={!form.title.trim() || busyPool === "new"}
            className="btn-primary h-9 disabled:opacity-50"
          >
            {busyPool === "new" ? <Spinner className="h-4 w-4 animate-spin" /> : null}
            Open pool
          </button>
        </div>
      )}

      {!userId && (
        <p className="card mb-8 px-5 py-3 text-sm text-zinc-400">
          <Link className="font-semibold text-indigo-400 hover:underline" href="/login">
            Sign in
          </Link>{" "}
          to create a pool or apply with your books.
        </p>
      )}

      <h2 className="mb-3 text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">
        Open now
      </h2>
      <div className="reveal-stagger grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {open.map((p) => {
          const mine = p.entries.filter((e) => e.userId === userId);
          const enterable = books.filter(
            (b) => !p.entries.some((e) => e.bookId === b.id && e.userId === userId)
          );
          return (
            <div key={p.id} className="card card-fx flex flex-col gap-3 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-white">
                    {p.title ?? "Writer of the Week"}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {p.creator ? `by ${p.creator.name ?? p.creator.email}` : "Official weekly pool"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-amber-300">
                    {sym(p.currency)}
                    {p.potAmount.toLocaleString()}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">pot</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> {p.entries.length}{" "}
                  {p.entries.length === 1 ? "entry" : "entries"} · entry{" "}
                  {sym(p.currency)}
                  {p.entryFee}
                </span>
                <span className="font-semibold text-amber-300">{left(p.weekEnd)}</span>
              </div>

              {p.entries.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {p.entries.map((e) => (
                    <span
                      key={e.id}
                      className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800/60 px-2 py-0.5 text-[11px] text-zinc-300"
                    >
                      <CreditCard className="h-3 w-3" />
                      {e.book.title}
                    </span>
                  ))}
                </div>
              )}

              {mine.length > 0 && (
                <p className="text-[11px] font-semibold text-emerald-400">
                  ✓ You're in with {mine.map((m) => m.book.title).join(", ")}
                </p>
              )}

              {userId && enterable.length > 0 && (
                <div className="mt-auto flex gap-2 pt-1">
                  <select
                    value={pick[p.id] ?? ""}
                    onChange={(e) => setPick({ ...pick, [p.id]: e.target.value })}
                    className="h-8 min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200 outline-none focus:border-indigo-500"
                  >
                    <option value="">Apply with…</option>
                    {enterable.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => enter(p)}
                    disabled={!pick[p.id] || busyPool === p.id}
                    className="btn-primary h-8 px-3 text-xs disabled:opacity-50"
                  >
                    {busyPool === p.id ? (
                      <Spinner className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      `Enter ${sym(p.currency)}${p.entryFee}`
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {open.length === 0 && (
          <p className="card px-5 py-10 text-center text-sm text-zinc-500 md:col-span-2 xl:col-span-3">
            No open pools right now — create one above.
          </p>
        )}
      </div>

      {closed.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">
            Winners
          </h2>
          <div className="space-y-2">
            {closed.map((p) => (
              <div
                key={p.id}
                className="card card-fx flex flex-wrap items-center gap-3 px-5 py-3 text-sm"
              >
                <Star className="h-4 w-4 shrink-0 text-amber-300" />
                <span className="font-semibold text-zinc-200">
                  {p.title ?? `Writer of the Week · ${new Date(p.weekStart).toLocaleDateString()}`}
                </span>
                <span className="text-zinc-500">→</span>
                <span className="font-bold text-amber-200">
                  {p.winner ? (p.winner.name ?? p.winner.email) : "no paid entries"}
                </span>
                {p.winner && (
                  <span className="text-zinc-400">
                    won {sym(p.currency)}
                    {(p.potAmount ?? 0).toLocaleString()} · transferred ✓
                  </span>
                )}
                <span className="ml-auto text-[11px] text-zinc-600">
                  {p.closedAt ? new Date(p.closedAt).toLocaleDateString() : ""}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {error && <p className="mt-6 text-sm text-red-400">{error}</p>}
    </div>
  );
}
