import Link from "next/link";

/**
 * Friendly banner shown on public pages when the database can't be reached,
 * instead of crashing with a runtime error screen.
 */
export function DbSetupNotice({ detail }: { detail?: string }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
      <div className="rounded-2xl border border-amber-300/60 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-sm">
        <p className="font-bold">🔌 Database not connected</p>
        <p className="mt-1 leading-relaxed">
          This page needs PostgreSQL. Put a real connection string in{" "}
          <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[12px]">.env.local</code>{" "}
          (the file ships with a placeholder{" "}
          <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[12px]">ep-xxx…neon.tech</code>{" "}
          in <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[12px]">.env.example</code> —
          replace it), then create the schema and restart:
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 font-mono text-[12.5px]">
          <li>DATABASE_URL=&quot;postgresql://user:password@host:5432/db?sslmode=require&quot;</li>
          <li>npx prisma migrate dev</li>
          <li>npm run dev</li>
        </ol>
        <p className="mt-2 text-[12.5px]">
          Free hosted Postgres:{" "}
          <Link className="underline" href="https://neon.tech">neon.tech</Link> ·{" "}
          <Link className="underline" href="https://supabase.com">supabase.com</Link> — or run
          Postgres locally (e.g. <code className="font-mono">brew services start postgresql@16</code>{" "}
          then <code className="font-mono">createdb ai_book_studio</code> and use{" "}
          <code className="font-mono">postgresql://YOUR_MAC_USERNAME@localhost:5432/ai_book_studio</code>).
        </p>
        {detail && (
          <details className="mt-2 text-[12px] text-amber-800/80">
            <summary className="cursor-pointer select-none">Technical detail</summary>
            <p className="mt-1 whitespace-pre-wrap font-mono text-[11.5px]">{detail}</p>
          </details>
        )}
      </div>
    </div>
  );
}
