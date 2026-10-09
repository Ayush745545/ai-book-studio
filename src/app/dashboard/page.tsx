import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeBook } from "@/lib/serialize";
import { ProjectLibrary } from "@/components/studio/project-library";
import { FormatGrid } from "@/components/studio/format-grid";
import { Plus } from "@/components/icons";
import { WritingCalendar } from "@/components/dashboard/writing-calendar";
export const dynamic = "force-dynamic";
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const library = searchParams.tab === "library";
  const books = await prisma.book.findMany({
    where: library
      ? { orders: { some: { userId: session.user.id, status: "PAID" } } }
      : { authorId: session.user.id },
    include: {
      chapters: { select: { wordCount: true } },
      author: { select: { name: true, email: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  const serialized = books.map(({ chapters, ...book }) => ({
    ...serializeBook(book),
    chapterCount: chapters.length,
    wordCount: chapters.reduce((sum, c) => sum + c.wordCount, 0),
  }));
  const totalWords = serialized.reduce((sum, book) => sum + book.wordCount, 0);
  return (
    <div className="studio-shell studio-dashboard">
      <div className="studio-dashboard-inner">
        <div className="studio-dashboard-heading">
          <div>
            <span className="studio-eyebrow">YOUR CREATIVE HOME</span>
            <h1 className="studio-title">
              Welcome back, {session.user.name || "writer"}.
            </h1>
            <p className="studio-muted">
              A little progress today. A book you’re proud of tomorrow.
            </p>
          </div>
          <Link href="/books/new" className="studio-button primary">
            <Plus />
            New project
          </Link>
        </div>
        <div className="studio-dashboard-stats">
          <div>
            <span>
              {library ? "On your bookshelf" : "Projects in your studio"}
            </span>
            <strong>{books.length}</strong>
          </div>
          <div>
            <span>Words written</span>
            <strong>{totalWords.toLocaleString()}</strong>
          </div>
          <div>
            <span>{library ? "Authors discovered" : "Published projects"}</span>
            <strong>
              {library
                ? new Set(books.map((b) => b.authorId)).size
                : books.filter((b) => b.isPublished).length}
            </strong>
          </div>
        </div>
        {!library && <WritingCalendar />}
        <div className="studio-library-heading">
          <nav>
            <Link className={!library ? "active" : ""} href="/dashboard">
              My writing
            </Link>
            <Link
              className={library ? "active" : ""}
              href="/dashboard?tab=library"
            >
              My bookshelf
            </Link>
          </nav>
          <span>
            {books.length} {books.length === 1 ? "project" : "projects"}
          </span>
        </div>
        <ProjectLibrary books={serialized} purchased={library} />
        {!library && (
          <section className="studio-dashboard-formats">
            <span className="studio-eyebrow">WHAT WILL YOU MAKE NEXT?</span>
            <h2>There’s more than one way to tell it.</h2>
            <FormatGrid />
          </section>
        )}
      </div>
    </div>
  );
}
