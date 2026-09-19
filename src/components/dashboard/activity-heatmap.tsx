"use client";

import { useMemo, useState } from "react";
import { type DailyActivity, ymd } from "@/lib/activity-utils";

type Range = "daily" | "weekly" | "cumulative";
const WEEKS = 53;
const DAYS = 7;
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];

function buildEmptyGrid(today: Date) {
  const end = new Date(today);
  end.setHours(0, 0, 0, 0);
  const endDow = (end.getDay() + 6) % 7;
  const lastDay = new Date(end);
  lastDay.setDate(end.getDate() + (6 - endDow));

  const grid: Date[][] = [];
  for (let w = WEEKS - 1; w >= 0; w--) {
    const col: Date[] = [];
    for (let d = 0; d < DAYS; d++) {
      const dt = new Date(lastDay);
      dt.setDate(lastDay.getDate() - w * 7 - (6 - d));
      col.push(dt);
    }
    grid.push(col);
  }
  return grid;
}

function tierFor(value: number, mode: Range, max: number): number {
  if (value <= 0) return 0;
  if (max <= 0) return 0;
  const ratio = value / max;
  if (mode === "daily") {
    if (ratio < 0.05) return 0;
    if (ratio < 0.2) return 1;
    if (ratio < 0.45) return 2;
    if (ratio < 0.75) return 3;
    return 4;
  }
  if (ratio < 0.1) return 1;
  if (ratio < 0.35) return 2;
  if (ratio < 0.7) return 3;
  return 4;
}

const TIER_BG = [
  "bg-white/5 hover:bg-white/10",
  "bg-indigo-500/25 hover:bg-indigo-500/40",
  "bg-indigo-500/50 hover:bg-indigo-500/65",
  "bg-indigo-400/80 hover:bg-indigo-400/95",
  "bg-indigo-400 hover:bg-indigo-300",
];

const TIER_RING = [
  "ring-1 ring-white/5",
  "ring-1 ring-indigo-400/20",
  "ring-1 ring-indigo-400/30",
  "ring-1 ring-indigo-300/40",
  "ring-1 ring-indigo-200/50",
];

export function ActivityHeatmap({
  activity = [],
  totalWords,
  totalSessions,
  booksCount,
}: {
  activity: DailyActivity[];
  totalWords: number;
  totalSessions: number;
  booksCount: number;
}) {
  const [range, setRange] = useState<Range>("daily");
  const [hover, setHover] = useState<{
    date: string;
    words: number;
    sessions: number;
    books: number;
    x: number;
    y: number;
  } | null>(null);

  const today = useMemo(() => new Date(), []);
  const grid = useMemo(() => buildEmptyGrid(today), [today]);

  const lookup = useMemo(() => {
    const m = new Map<string, DailyActivity>();
    activity.forEach((a) => m.set(a.date, a));
    return m;
  }, [activity]);

  const dailyValues = useMemo(() => {
    const m = new Map<string, number>();
    grid.flat().forEach((d) => {
      const key = ymd(d);
      const a = lookup.get(key);
      const words = a?.words ?? 0;
      const sessions = a?.sessions ?? 0;
      const books = a?.books ?? 0;
      let v = 0;
      if (range === "daily") v = words + sessions * 200 + books * 500;
      else if (range === "weekly") v = words + sessions * 150 + books * 400;
      else v = words + sessions * 100 + books * 300;
      m.set(key, v);
    });
    return m;
  }, [grid, lookup, range]);

  const weeklyAgg = useMemo(() => {
    const m = new Map<number, number>();
    grid.forEach((col, wi) => {
      let s = 0;
      col.forEach((d) => {
        s += dailyValues.get(ymd(d)) ?? 0;
      });
      m.set(wi, s);
    });
    return m;
  }, [grid, dailyValues]);

  const cumSums = useMemo(() => {
    const result = new Map<string, number>();
    let running = 0;
    grid.flat().forEach((d) => {
      running += dailyValues.get(ymd(d)) ?? 0;
      result.set(ymd(d), running);
    });
    return result;
  }, [grid, dailyValues]);

  const maxVal = useMemo(() => {
    if (range === "daily") return Math.max(1, ...Array.from(dailyValues.values()));
    if (range === "weekly") return Math.max(1, ...Array.from(weeklyAgg.values()));
    return Math.max(1, ...Array.from(cumSums.values()));
  }, [range, dailyValues, weeklyAgg, cumSums]);

  const displayValue = (d: Date) => {
    const key = ymd(d);
    if (range === "daily") return dailyValues.get(key) ?? 0;
    if (range === "weekly") {
      const wi = Math.floor(grid.flat().findIndex((x) => ymd(x) === key) / 7);
      const colIdx = Math.max(0, Math.min(WEEKS - 1, wi));
      return weeklyAgg.get(colIdx) ?? 0;
    }
    return cumSums.get(key) ?? 0;
  };

  const totalActivity = useMemo(() => {
    if (range === "daily")
      return Array.from(dailyValues.values()).reduce((a, b) => a + b, 0);
    if (range === "weekly")
      return Array.from(weeklyAgg.values()).reduce((a, b) => a + b, 0);
    return Array.from(cumSums.values()).reduce((a, b) => Math.max(a, b), 0);
  }, [range, dailyValues, weeklyAgg, cumSums]);

  const activeDays = useMemo(() => {
    return grid.flat().filter((d) => (dailyValues.get(ymd(d)) ?? 0) > 0).length;
  }, [grid, dailyValues]);

  const monthTicks = useMemo(() => {
    const ticks: { label: string; col: number }[] = [];
    let lastMonth = -1;
    for (let c = 0; c < grid.length; c++) {
      const firstOfCol = grid[c][0];
      if (firstOfCol.getDate() <= 7 && firstOfCol.getMonth() !== lastMonth) {
        lastMonth = firstOfCol.getMonth();
        ticks.push({ label: MONTH_LABELS[lastMonth], col: c });
      }
    }
    return ticks;
  }, [grid]);

  const earliestDate = grid[0][0];
  const latestDate = grid[grid.length - 1][grid[0].length - 1];

  return (
    <div className="card p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">Writing activity</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            {activeDays.toLocaleString()} active days · {ymd(earliestDate)} → {ymd(latestDate)}
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-white/10 bg-white/5 p-0.5 text-xs font-medium">
          {(["daily", "weekly", "cumulative"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1.5 capitalize transition ${
                range === r
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total activity", value: totalActivity.toLocaleString(), accent: "text-indigo-300" },
          { label: "Words written", value: totalWords.toLocaleString(), accent: "text-violet-300" },
          { label: "Writing sessions", value: totalSessions.toLocaleString(), accent: "text-fuchsia-300" },
          { label: "Books touched", value: booksCount.toLocaleString(), accent: "text-emerald-300" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-white/5 bg-white/[0.02] px-3.5 py-3"
          >
            <p className={`text-xl font-bold tracking-tight ${s.accent}`}>{s.value}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-500">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <div className="relative">
        {hover && (
          <div
            className="pointer-events-none absolute z-20 rounded-lg border border-white/10 bg-zinc-900/95 px-3 py-2 text-xs text-white shadow-2xl backdrop-blur"
            style={{
              left: Math.min(hover.x, grid.length * 16 - 10),
              top: Math.max(-64, hover.y - 64),
              transform: "translateX(-50%)",
            }}
          >
            <p className="font-semibold text-zinc-200">{hover.date}</p>
            <p className="mt-0.5 text-zinc-400">
              <span className="text-indigo-300">{hover.words.toLocaleString()}</span> words ·{" "}
              <span className="text-fuchsia-300">{hover.sessions}</span> sessions ·{" "}
              <span className="text-emerald-300">{hover.books}</span> books
            </p>
          </div>
        )}

        <div className="overflow-x-auto pb-2">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `20px repeat(${WEEKS}, 12px)`,
              columnGap: "3px",
              minWidth: "100%",
              width: "max-content",
            }}
          >
            <div
              className="col-span-full grid"
              style={{ gridTemplateColumns: `20px repeat(${WEEKS}, 12px)`, columnGap: "3px" }}
            >
              <div />
              {monthTicks.map((t, i) => (
                <div
                  key={`${t.label}-${i}`}
                  className="h-5 text-[10px] font-medium text-zinc-500"
                  style={{ gridColumnStart: t.col + 2 }}
                >
                  {t.label}
                </div>
              ))}
            </div>

            {Array.from({ length: DAYS }).map((_, di) => (
              <div key={di} className="contents">
                <div className="flex h-3 items-center justify-end pr-1 text-[9px] font-medium uppercase tracking-wider text-zinc-600">
                  {DAY_LABELS[di]}
                </div>
                {grid.map((col, ci) => {
                  const d = col[di];
                  const key = ymd(d);
                  const raw = dailyValues.get(key) ?? 0;
                  const a = lookup.get(key);
                  const cellValue = displayValue(d);
                  const tier = tierFor(cellValue, range, maxVal);
                  const isInRange = d >= earliestDate && d <= latestDate;
                  return (
                    <button
                      key={`${ci}-${di}`}
                      disabled={!isInRange}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const parentRect = (
                          e.currentTarget.closest(".relative") as HTMLElement | null
                        )?.getBoundingClientRect();
                        setHover({
                          date: key,
                          words: a?.words ?? 0,
                          sessions: a?.sessions ?? 0,
                          books: a?.books ?? 0,
                          x: rect.left - (parentRect?.left ?? 0) + rect.width / 2,
                          y: rect.top - (parentRect?.top ?? 0),
                        });
                      }}
                      onMouseLeave={() => setHover(null)}
                      aria-label={`${key}: ${cellValue.toLocaleString()} activity, ${raw.toLocaleString()} raw`}
                      className={`relative h-3 w-3 rounded-[3px] ${TIER_BG[tier]} ${TIER_RING[tier]} ${
                        raw === 0 && range === "daily" ? "opacity-70" : ""
                      } transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-400/60`}
                      style={{ marginTop: di === 0 ? 0 : 3 }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((t) => (
            <span
              key={t}
              className={`inline-block h-3 w-3 rounded-[3px] ${TIER_BG[t]} ${TIER_RING[t]}`}
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
