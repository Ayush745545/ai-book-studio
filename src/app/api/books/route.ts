import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { serializeBook } from "@/lib/serialize";
import { apiError, unauthorized } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional().nullable(),
  genre: z.string().max(100).optional().nullable(),
  language: z.string().max(50).optional(),
  price: z.number().min(0).max(10000).optional(),
  digitalPrice: z.number().min(0).max(10000).optional(),
});

/** GET /api/books — list the current user's books. */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const books = await prisma.book.findMany({
      where: { authorId: user.id, originalBookId: null },
      include: { 
        chapters: { select: { wordCount: true } },
        editions: {
          include: { chapters: { select: { wordCount: true } } }
        }
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      books: books.map(({ chapters, editions, ...bookOnly }) => ({
        ...serializeBook(bookOnly as any),
        chapterCount: chapters.length,
        wordCount: chapters.reduce((sum, c) => sum + c.wordCount, 0),
        editions: editions?.map((ed) => ({
          ...serializeBook(ed as any),
          chapterCount: ed.chapters.length,
          wordCount: ed.chapters.reduce((sum, c) => sum + c.wordCount, 0),
        })) || []
      })),
    });
  } catch (err) {
    return apiError(err);
  }
}

/** POST /api/books — create a new book. */
export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const body = createSchema.parse(await req.json());

    const book = await prisma.book.create({
      data: {
        title: body.title,
        description: body.description ?? null,
        genre: body.genre ?? null,
        language: body.language || "English",
        price: body.price ?? 0,
        digitalPrice: body.digitalPrice ?? 0,
        authorId: user.id,
        status: "DRAFT",
      },
    });

    return NextResponse.json({ book: serializeBook(book) }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
