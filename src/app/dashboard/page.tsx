import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeBook } from "@/lib/serialize";
import { BookCard } from "@/components/book-card";
import { DeleteBookButton } from "@/components/dashboard/delete-book-button";
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { ContestSection } from "@/components/dashboard/contest-section";
import { synthesizeActivity } from "@/lib/activity-utils";
import { Plus, Sparkles, BookOpen } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: { tab?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const tab = searchParams.tab === "library" ? "library" : "authored";

  const authoredBooks = await prisma.book.findMany({
    where: { authorId: session.user.id },
    include: {
      chapters: { select: { wordCount: true, createdAt: true, updatedAt: true } },
      coverImages: { select: { createdAt: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const totalWords = authoredBooks.reduce(
    (sum, b) => sum + b.chapters.reduce((s, c) => s + c.wordCount, 0),
    0
  );

  const serializedAuthored = authoredBooks.map(({ chapters, coverImages, ...bookOnly }) => ({
    ...serializeBook(bookOnly),
    chapterCount: chapters.length,
    wordCount: chapters.reduce((s, c) => s + c.wordCount, 0),
  }));

  const libraryBooks = await prisma.book.findMany({
    where: {
      orders: {
        some: {
          userId: session.user.id,
          status: "PAID",
        },
      },
    },
    include: { author: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  const serializedLibrary = libraryBooks.map(b => ({
    ...serializeBook(b),
    authorName: b.author?.name || b.author?.email?.split("@")[0] || "Unknown",
  }));

  const activity = synthesizeActivity({ authoredBooks, seed: session.user.id.charCodeAt(0) * 31 + 7 });

  const totalSessions = activity.reduce((s, a) => s + a.sessions, 0);
  const booksTouched = new Set(activity.filter(a => a.books > 0).map(a => a.date)).size + authoredBooks.length;

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <p className="text-sm text-zinc-500">
            Welcome back, {session.user.name || session.user.email?.split("@")[0]}
          </p>
          <Link href="/books/new" className="btn-primary">
            <Plus className="h-4 w-4" /> New Book
          </Link>
        </div>

        <div className="mb-6 flex gap-4 border-b border-white/10 pb-2">
          <Link
            href="/dashboard?tab=authored"
            className={`px-2 py-1 text-sm font-medium transition ${
              tab === "authored"
                ? "text-indigo-400 border-b-2 border-indigo-400"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            My Authored Books
          </Link>
          <Link
            href="/dashboard?tab=library"
            className={`px-2 py-1 text-sm font-medium transition ${
              tab === "library"
                ? "text-indigo-400 border-b-2 border-indigo-400"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            My Library
          </Link>
        </div>

        {tab === "authored" && (
          <>
            <div className="mb-8">
              <ActivityHeatmap
                activity={activity}
                totalWords={totalWords}
                totalSessions={totalSessions}
                booksCount={Math.min(authoredBooks.length, booksTouched)}
              />
            </div>

            {serializedAuthored.length === 0 ? (
              <div className="card flex flex-col items-center gap-4 px-6 py-20 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 text-indigo-300 ring-1 ring-indigo-400/30">
                  <Sparkles className="h-7 w-7" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-100">Your studio is empty</h2>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">
                    Give AI a genre and a few keywords — it will pitch you three book
                    concepts to start from.
                  </p>
                </div>
                <Link href="/books/new" className="btn-primary mt-2">
                  <Plus className="h-4 w-4" /> Create your first book
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {serializedAuthored.map((book) => (
                  <div key={book.id} className="relative group">
                    <BookCard
                      book={book}
                      href={`/books/${book.id}`}
                      showStatus
                      meta={`${book.chapterCount} ch · ${book.wordCount.toLocaleString()} words`}
                    />
                    <DeleteBookButton bookId={book.id} bookTitle={book.title} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "library" && (
          <>
            {serializedLibrary.length === 0 ? (
              <div className="card flex flex-col items-center gap-4 px-6 py-20 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-300 ring-1 ring-emerald-400/30">
                  <BookOpen className="h-7 w-7" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-100">Your library is empty</h2>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">
                    You haven't added any books to your library yet. Visit the store to find some great reads.
                  </p>
                </div>
                <Link href="/store" className="btn-primary mt-2">
                  <BookOpen className="h-4 w-4 mr-2" /> Browse Store
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {serializedLibrary.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    href={`/store/${book.id}/read`}
                    meta={`by ${book.authorName}`}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Writer of the Week ─────────────────────────────────── */}
        <ContestSection
          books={authoredBooks.map((b) => ({
            id: b.id,
            title: b.title,
            isPublished: b.isPublished,
          }))}
        />
      </div>
    </div>
  );
}
