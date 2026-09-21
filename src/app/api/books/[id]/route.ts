import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { serializeBook } from "@/lib/serialize";
import { apiError, forbidden, notFound, unauthorized } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const coverUrlSchema = z
  .string()
  .max(2000)
  .refine((value) => z.string().url().safeParse(value).success || value.startsWith("/"), {
    message: "Cover URL must be an absolute URL or local path",
  })
  .nullable()
  .optional();

const patchSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).nullable().optional(),
    coverUrl: coverUrlSchema,
    backCoverUrl: coverUrlSchema,
    status: z
      .enum(["DRAFT", "WRITING", "EDITING", "DESIGNING", "READY", "PUBLISHED"])
      .optional(),
    genre: z.string().max(100).nullable().optional(),
    language: z.string().max(50).optional(),
    isPublished: z.boolean().optional(),
    price: z.number().min(0).max(10000).optional(),
    digitalPrice: z.number().min(0).max(10000).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No fields to update" });

type Params = { params: { id: string } };

/** DELETE /api/books/[id] — delete a book and all its related data. */
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const book = await prisma.book.findUnique({ where: { id: params.id } });
    if (!book) return notFound("Book");
    if (book.authorId !== user.id && user.role !== "ADMIN") return forbidden();

    // Delete cover image records if they're local
    await prisma.coverImage.deleteMany({ where: { bookId: book.id } });

    await prisma.book.delete({ where: { id: book.id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}

/** GET /api/books/[id] — book with its chapters (owner or admin). */
export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const book = await prisma.book.findUnique({
      where: { id: params.id },
      include: {
        author: { select: { name: true, email: true } },
        chapters: { orderBy: { order: "asc" } },
        coverImages: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!book) return notFound("Book");
    if (book.authorId !== user.id && user.role !== "ADMIN") return forbidden();

    return NextResponse.json({ book: serializeBook(book) });
  } catch (err) {
    return apiError(err);
  }
}

/** PATCH /api/books/[id] — update book fields (also used for publishing). */
export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const book = await prisma.book.findUnique({ where: { id: params.id } });
    if (!book) return notFound("Book");
    if (book.authorId !== user.id && user.role !== "ADMIN") return forbidden();

    const body = patchSchema.parse(await req.json());

    // Publishing flips the status to PUBLISHED as well
    if (body.isPublished === true) body.status = "PUBLISHED";

    const updated = await prisma.book.update({
      where: { id: params.id },
      data: body,
      include: { chapters: { orderBy: { order: "asc" } }, coverImages: { orderBy: { createdAt: "desc" } } },
    });

    return NextResponse.json({ book: serializeBook(updated) });
  } catch (err) {
    return apiError(err);
  }
}
