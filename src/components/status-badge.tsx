import type { BookStatus } from "@/types";

const styles: Record<BookStatus, string> = {
  DRAFT: "bg-zinc-500/15 text-zinc-300 border-zinc-400/20",
  WRITING: "bg-sky-500/15 text-sky-300 border-sky-400/20",
  EDITING: "bg-amber-500/15 text-amber-300 border-amber-400/20",
  DESIGNING: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-400/20",
  READY: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",
  PUBLISHED: "bg-indigo-500/15 text-indigo-300 border-indigo-400/20",
};

export function StatusBadge({ status }: { status: BookStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${styles[status]}`}
    >
      {status}
    </span>
  );
}
