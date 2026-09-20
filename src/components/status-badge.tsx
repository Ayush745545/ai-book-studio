import type { BookStatus } from "@/types";

const styles: Record<BookStatus, string> = {
  DRAFT: "bg-zinc-100 text-zinc-700 border-zinc-200",
  WRITING: "bg-sky-100 text-sky-700 border-sky-200",
  EDITING: "bg-amber-100 text-amber-700 border-amber-200",
  DESIGNING: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
  READY: "bg-emerald-100 text-emerald-700 border-emerald-200",
  PUBLISHED: "bg-indigo-100 text-indigo-700 border-indigo-200",
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
