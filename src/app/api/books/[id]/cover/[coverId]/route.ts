import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { serializeBook } from "@/lib/serialize";
import { apiError, forbidden, notFound, unauthorized } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { id: string; coverId: string } };

/** DELETE /api/books/[id]/cover/[coverId] — remove a gallery image. */
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const book = await prisma.book.findUnique({ where: { id: params.id } });
    if (!book) return notFound("Book");
    if (book.authorId !== user.id && user.role !== "ADMIN") return forbidden();

    const coverImage = await prisma.coverImage.findFirst({
      where: { id: params.coverId, bookId: book.id },
    });
    if (!coverImage) return notFound("Cover image");

    await prisma.coverImage.delete({ where: { id: coverImage.id } });

    const updated = await prisma.book.update({
      where: { id: book.id },
      data: {
        ...(book.coverUrl === coverImage.url ? { coverUrl: null } : {}),
        ...(book.backCoverUrl === coverImage.url ? { backCoverUrl: null } : {}),
      },
      include: {
        chapters: { orderBy: { order: "asc" } },
        coverImages: { orderBy: { createdAt: "desc" } },
      },
    });

    return NextResponse.json({ book: serializeBook(updated) });
  } catch (err) {
    return apiError(err);
  }
}
