import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { serializeBook } from "@/lib/serialize";
import { apiError, unauthorized } from "@/lib/api";
import { FORMAT_IDS, getFormatById, chapterNotes } from "@/lib/book-formats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  format: z.enum(FORMAT_IDS).default("book"),
  targetPages: z.number().int().min(1).max(1000).optional(),
  audience: z.string().max(1000).default(""),
  writingGoal: z.string().max(4000).default(""),
  tone: z.string().max(100).default("Engaging"),
  outline: z.array(z.string().trim().min(1).max(200)).min(1).max(60).optional(),
  sourceBookId: z.string().optional(),
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
    const format = getFormatById(body.format)!;
    const source = body.sourceBookId ? await prisma.book.findFirst({
      where: { id: body.sourceBookId, authorId: user.id },
      include: { chapters: { orderBy: { order: "asc" } } },
    }) : null;
    if (body.sourceBookId && (!source || body.format !== "audiobook")) {
      return NextResponse.json({ error: "Choose one of your own books to create an audiobook." }, { status: 400 });
    }

    const book = await prisma.book.create({
      data: {
        title: body.title,
        description: body.description ?? null,
        genre: body.genre ?? null,
        language: body.language || "English",
        format: body.format,
        targetPages: body.targetPages ?? format.targetPages,
        audience: body.audience,
        writingGoal: body.writingGoal,
        tone: body.tone,
        price: body.price ?? 0,
        digitalPrice: body.digitalPrice ?? 0,
        authorId: user.id,
        status: "DRAFT",
        chapters: {
          create: source ? source.chapters.map((chapter, order) => ({
            title: chapter.title, content: chapter.content, notes: chapter.notes,
            wordCount: chapter.wordCount, type: chapter.type, order,
          })) : (body.outline ?? []).map((title, order) => ({
            title, order, notes: chapterNotes(format, title, body.writingGoal),
          })),
        },
      },
      include: { chapters: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ book: serializeBook(book) }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
