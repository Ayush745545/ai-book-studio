import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { serializeBook } from "@/lib/serialize";
import { BookCard } from "@/components/book-card";
import { Store } from "@/components/icons";
import { DbSetupNotice } from "@/components/db-setup-notice";
import type { Prisma } from "@prisma/client";

type BookWithAuthor = Prisma.BookGetPayload<{
  include: { author: { select: { name: true, email: true } } };
}>;

export const metadata: Metadata = { title: "Store" };
export const dynamic = "force-dynamic";

export default async function StorePage() {
  let dbError: string | null = null;
  let books: BookWithAuthor[] = [];
  try {
    books = await prisma.book.findMany({
      where: { isPublished: true },
      include: { author: { select: { name: true, email: true } } },
      orderBy: { updatedAt: "desc" },
    });
  } catch (e) {
    dbError = e instanceof Error ? e.message : "Database unreachable";
  }

  const serialized = books.map(serializeBook);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {dbError && <DbSetupNotice detail={dbError} />}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          The Bookstore
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-500">
          Published books from the AI Book Studio community — order a printed
          paperback, shipped print-on-demand via Lulu.
        </p>
      </div>

      {serialized.length === 0 ? (
        <div className="card mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-zinc-500 ring-1 ring-white/10">
            <Store className="h-7 w-7" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white">The shelves are empty</h2>
            <p className="mt-1 text-sm text-zinc-500">
              No books have been published yet. Be the first!
            </p>
          </div>
          <Link href="/books/new" className="btn-primary mt-2">
            Create a book
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {serialized.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              href={`/store/${book.id}`}
              showPrice
              meta={book.authorName ? `by ${book.authorName}` : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
