import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { serializeChapter } from "@/lib/serialize";
import { countWords } from "@/lib/utils";
import { apiError, forbidden, notFound, unauthorized } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const putSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().max(200000).optional(),
    notes: z.string().max(10000).optional(),
    type: z.enum(["FRONT_MATTER", "CHAPTER", "BACK_MATTER"]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Provide title, content, notes, or section type",
  });

type Params = { params: { id: string } };

/**
 * PUT /api/chapters/[id] — update a chapter.
 * The previous content is snapshotted into a Version row first.
 */
export async function PUT(req: Request, { params }: Params) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const chapter = await prisma.chapter.findUnique({
      where: { id: params.id },
      include: { book: { select: { authorId: true, isPublished: true, title: true } } },
    });
    if (!chapter) return notFound("Chapter");
    if (chapter.book.authorId !== user.id && user.role !== "ADMIN") return forbidden();

    const body = putSchema.parse(await req.json());

    const contentChanged = body.content !== undefined && body.content !== chapter.content;

    const updated = await prisma.$transaction(async (tx) => {
      if (contentChanged) {
        const difference = countWords(body.content!) - chapter.wordCount;
        await tx.writingActivity.create({ data: {
          userId: user.id, bookId: chapter.bookId, chapterId: chapter.id,
          bookTitle: chapter.book.title, wordsAdded: Math.max(0, difference), wordsRemoved: Math.max(0, -difference),
        } });
      }
      if (contentChanged && chapter.content.trim()) {
        await tx.version.create({
          data: { chapterId: chapter.id, content: chapter.content },
        });
      }
      await tx.book.update({
        where: { id: chapter.bookId },
        data: { updatedAt: new Date(), ...(contentChanged && !chapter.book.isPublished ? { status: "WRITING" } : {}) },
      });
      return tx.chapter.update({
        where: { id: chapter.id },
        data: {
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.type !== undefined ? { type: body.type } : {}),
          ...(body.notes !== undefined ? { notes: body.notes } : {}),
          ...(body.content !== undefined
            ? { content: body.content, wordCount: countWords(body.content) }
            : {}),
        },
      });
    });

    return NextResponse.json({ chapter: serializeChapter(updated) });
  } catch (err) {
    return apiError(err);
  }
}

/** DELETE /api/chapters/[id] — remove a chapter (versions cascade). */
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const chapter = await prisma.chapter.findUnique({
      where: { id: params.id },
      include: { book: { select: { authorId: true } } },
    });
    if (!chapter) return notFound("Chapter");
    if (chapter.book.authorId !== user.id && user.role !== "ADMIN") return forbidden();

    await prisma.chapter.delete({ where: { id: chapter.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
