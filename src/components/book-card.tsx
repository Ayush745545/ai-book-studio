import Link from "next/link";
import type { SerializedBook } from "@/types";
import { StatusBadge } from "@/components/status-badge";
import { formatPrice, unitPriceFor } from "@/lib/utils";
import { BookOpen } from "@/components/icons";

/** Cover image or a gradient placeholder with the title. */
export function BookCover({
  book,
  className = "",
}: {
  book: Pick<SerializedBook, "title" | "coverUrl" | "genre">;
  className?: string;
}) {
  if (book.coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={book.coverUrl}
        alt={`Cover of ${book.title}`}
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }
  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-indigo-600/40 via-violet-600/30 to-fuchsia-600/40 p-4 text-center ${className}`}
    >
      <BookOpen className="h-8 w-8 text-white/50" />
      <p className="line-clamp-4 font-serif text-sm font-semibold leading-snug text-white/90">
        {book.title}
      </p>
    </div>
  );
}

interface BookCardProps {
  book: SerializedBook & { wordCount?: number };
  href: string;
  showStatus?: boolean;
  showPrice?: boolean;
  meta?: string;
}

export function BookCard({ book, href, showStatus, showPrice, meta }: BookCardProps) {
  return (
    <Link
      href={href}
      className="card group overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:border-indigo-400/30 hover:shadow-xl hover:shadow-indigo-500/10"
    >
      <div className="aspect-[3/4] overflow-hidden border-b border-white/10">
        <div className="h-full w-full transition duration-300 group-hover:scale-[1.03]">
          <BookCover book={book} />
        </div>
      </div>
      <div className="space-y-1.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold text-white">{book.title}</h3>
          {showStatus && <StatusBadge status={book.status} />}
        </div>
        <p className="text-xs text-zinc-500">
          {meta ?? (book.authorName ? `by ${book.authorName}` : book.genre ?? "—")}
        </p>
        {showPrice && (
          <p className="pt-1 text-sm font-bold text-indigo-300">
            {formatPrice(unitPriceFor(book.price))}
          </p>
        )}
      </div>
    </Link>
  );
}
