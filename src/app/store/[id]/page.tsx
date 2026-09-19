import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unitPriceFor } from "@/lib/utils";
import { BookCover } from "@/components/book-card";
import { BuyButton } from "@/components/buy-button";
import { DigitalAccessButtons } from "@/components/store/digital-access-buttons";
import { ArrowLeft, Check, Printer, Truck } from "@/components/icons";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const book = await prisma.book.findUnique({
    where: { id: params.id },
    select: { title: true, description: true },
  });
  return {
    title: book?.title ?? "Book",
    description: book?.description?.slice(0, 160) ?? undefined,
  };
}

export default async function StoreBookPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { purchased?: string };
}) {
  const book = await prisma.book.findFirst({
    where: { id: params.id, isPublished: true },
    include: {
      author: { select: { name: true, email: true } },
      chapters: { orderBy: { order: "asc" }, select: { title: true, order: true, wordCount: true } },
    },
  });
  if (!book) notFound();

  const authorName = book.author?.name ?? book.author?.email?.split("@")[0] ?? "Unknown";
  const unit = unitPriceFor(book.price);
  const digitalPrice = book.digitalPrice ?? 0;
  const totalWords = book.chapters.reduce((s, c) => s + c.wordCount, 0);

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  let hasAccess = digitalPrice === 0 || book.authorId === userId;

  if (!hasAccess && userId) {
    const paidOrder = await prisma.order.findFirst({
      where: { userId, bookId: book.id, status: "PAID" },
    });
    if (paidOrder) hasAccess = true;
  }

  // Fetch editions (original + translated) — wrapped in try-catch for cache safety
  let allEditions: { id: string; language: string; originalBookId: string | null }[] = [];
  try {
    const originalBookId = (book as any).originalBookId || book.id;
    allEditions = await prisma.book.findMany({
      where: { 
        OR: [{ id: originalBookId }, { originalBookId: originalBookId }],
        isPublished: true 
      },
      select: { id: true, language: true, originalBookId: true },
      orderBy: { language: "asc" }
    });
  } catch {
    // originalBookId field may not exist yet if Prisma client is stale — just skip editions
    allEditions = [];
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link href="/store" className="btn-ghost -ml-3 mb-6 !px-2 !py-1 text-xs">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to store
      </Link>

      {searchParams.purchased === "1" && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-300">
          <Check className="h-5 w-5 shrink-0" />
          <p>
            <span className="font-semibold">Payment received — thank you!</span>{" "}
            Your order has been sent to the printer and will ship soon.
          </p>
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-[320px_1fr]">
        {/* Cover */}
        <div className="mx-auto w-full max-w-[320px] lg:mx-0">
          <div className="overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-indigo-500/20">
            <div className="aspect-[1024/1792]">
              <BookCover book={{ title: book.title, coverUrl: book.coverUrl, genre: book.genre }} />
            </div>
          </div>
        </div>

        {/* Details */}
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {book.genre && (
              <span className="rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 font-medium text-indigo-300">
                {book.genre}
              </span>
            )}
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-zinc-400">
              {book.chapters.length} chapters · {totalWords.toLocaleString()} words
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {book.title}
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            by <span className="font-medium text-zinc-200">{authorName}</span>
          </p>

          {allEditions.length > 1 && (
            <div className="mt-4 flex items-center gap-3">
              <span className="text-sm font-medium text-zinc-400">Edition:</span>
              <div className="flex flex-wrap gap-2">
                {allEditions.map(ed => (
                  <Link 
                    key={ed.id} 
                    href={`/store/${ed.id}`}
                    className={`px-3 py-1.5 rounded-lg text-sm transition ${
                      ed.id === book.id 
                        ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" 
                        : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200 border border-transparent"
                    }`}
                  >
                    {ed.language} {ed.originalBookId === null && "(Original)"}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {book.description && (
            <div className="card mt-6 p-5">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                About this book
              </h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-300">
                {book.description}
              </p>
            </div>
          )}

          {book.chapters.length > 0 && (
            <div className="card mt-6 p-5">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Inside
              </h2>
              <ol className="grid gap-1.5 sm:grid-cols-2">
                {book.chapters.map((c) => (
                  <li key={c.order} className="flex items-baseline gap-2 text-sm text-zinc-300">
                    <span className="w-5 shrink-0 text-right text-xs text-zinc-600">{c.order + 1}.</span>
                    <span className="truncate">{c.title}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Buy box */}
          <div className="card mt-6 max-w-md p-5">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-500">Printed paperback</p>
                <p className="text-3xl font-extrabold text-white">
                  ${unit.toFixed(2)}
                </p>
              </div>
              <p className="text-right text-[11px] leading-relaxed text-zinc-600">
                6×9in trade paperback
                <br />
                print-on-demand
              </p>
            </div>

            <BuyButton bookId={book.id} unitPrice={unit} />

            <DigitalAccessButtons bookId={book.id} hasAccess={hasAccess} digitalPrice={digitalPrice} />

            <div className="mt-4 flex items-center justify-center gap-5 text-[11px] text-zinc-600">
              <span className="flex items-center gap-1">
                <Check className="h-3 w-3 text-emerald-500" /> Secure Stripe checkout
              </span>
              <span className="flex items-center gap-1">
                <Printer className="h-3 w-3" /> Printed by Lulu
              </span>
              <span className="flex items-center gap-1">
                <Truck className="h-3 w-3" /> Ships to your door
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
