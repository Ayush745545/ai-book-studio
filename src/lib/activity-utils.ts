export type DailyActivity = {
  date: string;
  words: number;
  sessions: number;
  books: number;
};

type BookLike = {
  createdAt: string | Date;
  updatedAt: string | Date;
  chapters?: { createdAt?: string | Date; updatedAt?: string | Date; wordCount: number }[];
  wordCount?: number;
  isPublished?: boolean;
  coverImages?: { createdAt?: string | Date }[];
};

export function synthesizeActivity(opts: {
  authoredBooks: unknown;
  seed?: number;
}): DailyActivity[] {
  const books = (opts.authoredBooks ?? []) as BookLike[];
  const byDate = new Map<string, DailyActivity>();
  const seed = opts.seed ?? 2024;
  const rnd = mulberry32(seed);

  const add = (dateStr: string, patch: Partial<DailyActivity>) => {
    const existing = byDate.get(dateStr) ?? { date: dateStr, words: 0, sessions: 0, books: 0 };
    byDate.set(dateStr, {
      ...existing,
      words: existing.words + (patch.words ?? 0),
      sessions: existing.sessions + (patch.sessions ?? 0),
      books: existing.books + (patch.books ?? 0),
    });
  };

  books.forEach((b) => {
    const created = new Date(b.createdAt);
    const updated = new Date(b.updatedAt);
    const totalChWords = (): number =>
      b.chapters?.reduce((s, c) => s + c.wordCount, 0) ?? b.wordCount ?? 0;
    const totalWords = totalChWords();

    add(ymd(created), { sessions: 1, books: 1 });
    add(ymd(updated), {
      sessions: 1,
      words: Math.min(800, Math.max(50, Math.floor(totalWords * 0.08))),
    });

    const chapterCount =
      b.chapters?.length ?? Math.max(1, Math.floor(totalWords / 1500));
    const chapters =
      b.chapters ??
      Array.from({ length: chapterCount }, (_, i) => ({
        wordCount: Math.floor((totalWords / chapterCount) * (0.7 + rnd() * 0.6)),
        createdAt: new Date(
          created.getTime() +
            ((updated.getTime() - created.getTime()) * i) /
              Math.max(1, chapterCount - 1)
        ).toISOString(),
        updatedAt: new Date(
          created.getTime() +
            ((updated.getTime() - created.getTime()) * (i + 0.8)) /
              Math.max(1, chapterCount - 1)
        ).toISOString(),
      }));

    chapters.forEach((ch) => {
      const chCreated = new Date(ch.createdAt ?? b.createdAt);
      const chUpdated = new Date(ch.updatedAt ?? ch.createdAt ?? b.updatedAt);
      const wc = ch.wordCount ?? 0;
      add(ymd(chCreated), { sessions: 1, words: Math.floor(wc * 0.35) });
      add(ymd(chUpdated), { sessions: 1, words: Math.floor(wc * 0.65) });

      const mid = new Date((chCreated.getTime() + chUpdated.getTime()) / 2);
      if (wc > 600 && Math.abs(mid.getTime() - chCreated.getTime()) > 86400000) {
        add(ymd(mid), {
          sessions: 1,
          words: Math.max(80, Math.floor(wc * 0.2 * rnd())),
        });
      }
    });

    if (b.isPublished) {
      add(ymd(updated), { books: 1, sessions: 1, words: 200 });
    }

    (b.coverImages ?? []).forEach((img) => {
      if (img.createdAt) add(ymd(new Date(img.createdAt)), { sessions: 1, words: 80 });
    });
  });

  const now = new Date();
  const nowStr = ymd(now);
  if (!byDate.has(nowStr) && books.length > 0) {
    const last = books[0];
    const lastWords =
      last.chapters?.reduce((s, c) => s + c.wordCount, 0) ?? last.wordCount ?? 0;
    const recentWords = Math.min(
      1200,
      Math.floor(lastWords * 0.04 * (0.5 + rnd()))
    );
    if (recentWords > 50) add(nowStr, { words: recentWords, sessions: 1 });
  }

  for (let i = 1; i <= 10; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = ymd(d);
    if (!byDate.has(key) && rnd() < 0.18 && books.length > 0) {
      add(key, { words: Math.floor(120 + rnd() * 600), sessions: 1 });
    }
  }

  return Array.from(byDate.values()).sort((a, z) => a.date.localeCompare(z.date));
}

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export function ymd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
