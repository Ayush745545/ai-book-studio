import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { serializeBook } from "@/lib/serialize";
import { apiError, forbidden, notFound, unauthorized } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  coverImageId: z.string().cuid(),
  side: z.enum(["FRONT", "BACK"]),
});

type Params = { params: { id: string } };

/** PATCH /api/books/[id]/cover — select an image from the book's cover gallery. */
export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const body = schema.parse(await req.json());
    const book = await prisma.book.findUnique({ where: { id: params.id } });
    if (!book) return notFound("Book");
    if (book.authorId !== user.id && user.role !== "ADMIN") return forbidden();

    const coverImage = await prisma.coverImage.findUnique({ where: { id: body.coverImageId } });
    if (!coverImage || coverImage.bookId !== book.id || coverImage.side !== body.side) {
      return notFound("Cover image");
    }

    const updated = await prisma.book.update({
      where: { id: book.id },
      data: body.side === "FRONT" ? { coverUrl: coverImage.url } : { backCoverUrl: coverImage.url },
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
