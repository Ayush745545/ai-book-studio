import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PoolsBoard } from "@/components/pools/pools-board";

export const metadata: Metadata = { title: "Pools · AI Book Studio" };
export const dynamic = "force-dynamic";

export default async function PoolsPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;

  const books = userId
    ? await prisma.book.findMany({
        where: { authorId: userId, isPublished: true },
        select: { id: true, title: true },
        orderBy: { updatedAt: "desc" },
      })
    : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PoolsBoard userId={userId} books={books} />
    </div>
  );
}
