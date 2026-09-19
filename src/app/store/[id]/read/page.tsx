import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeBook } from "@/lib/serialize";
import { ReadTab } from "@/components/editor/read-tab";
import Link from "next/link";
import { ArrowLeft } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function StoreReadPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  const book = await prisma.book.findUnique({
    where: { id: params.id, isPublished: true },
    include: { chapters: { orderBy: { order: "asc" } } },
  });

  if (!book) notFound();

  const digitalPrice = book.digitalPrice ?? 0;
  let hasAccess = digitalPrice === 0 || book.authorId === userId;

  if (!hasAccess && userId) {
    const paidOrder = await prisma.order.findFirst({
      where: { userId, bookId: book.id, status: "PAID" },
    });
    if (paidOrder) hasAccess = true;
  }

  if (!hasAccess) {
    if (!userId) redirect(`/login?callbackUrl=/store/${book.id}`);
    redirect(`/store/${book.id}`);
  }

  return (
    <div className="h-screen w-full flex flex-col bg-[#0a0a0a]">
      <ReadTab 
        book={serializeBook(book)} 
        onBackToWrite={null as any} 
        isStoreView={true}
        storeUrl={`/store/${book.id}`}
      />
    </div>
  );
}
