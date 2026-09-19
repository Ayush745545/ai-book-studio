import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeBook } from "@/lib/serialize";
import { apiError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/store/books — public list of published books with author name. */
export async function GET() {
  try {
    const books = await prisma.book.findMany({
      where: { isPublished: true },
      include: { author: { select: { name: true, email: true } } },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ books: books.map(serializeBook) });
  } catch (err) {
    return apiError(err);
  }
}
