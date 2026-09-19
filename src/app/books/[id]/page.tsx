import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeBook } from "@/lib/serialize";
import { BookEditor } from "@/components/editor/book-editor";

export const metadata: Metadata = { title: "Book Editor" };
export const dynamic = "force-dynamic";

export default async function BookEditorPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const book = await prisma.book.findUnique({
    where: { id: params.id },
    include: { chapters: { orderBy: { order: "asc" } }, coverImages: { orderBy: { createdAt: "desc" } } },
  });

  if (!book) notFound();
  if (book.authorId !== session.user.id && session.user.role !== "ADMIN") notFound();

  return <BookEditor initialBook={serializeBook(book)} />;
}
