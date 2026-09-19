import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { generateChapter } from "@/lib/openai";
import { serializeChapter } from "@/lib/serialize";
import { countWords } from "@/lib/utils";
import { apiError, forbidden, notFound, unauthorized } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const schema = z.object({
  title: z.string().min(1, "Chapter title is required").max(200),
  content: z.string().max(200000).optional(),
  outline: z.string().max(4000).optional(),
  tone: z.string().max(50).optional(),
  aiGenerate: z.boolean().optional(),
  provider: z.enum(["openai", "ollama"]).optional(),
  model: z.string().min(1).max(100).optional(),
  type: z.enum(["FRONT_MATTER", "CHAPTER", "BACK_MATTER"]).optional(),
});

type Params = { params: { id: string } };

/**
 * POST /api/books/[id]/chapters — add a chapter to a book.
 * With { aiGenerate: true } the chapter body is written by the configured
 * text provider (OpenAI or Ollama) using the supplied outline + tone.
 */
export async function POST(req: Request, { params }: Params) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const book = await prisma.book.findUnique({ where: { id: params.id } });
    if (!book) return notFound("Book");
    if (book.authorId !== user.id && user.role !== "ADMIN") return forbidden();

    const body = schema.parse(await req.json());

    let content = body.content ?? "";
    if (body.aiGenerate) {
      content = await generateChapter(
        book.title,
        body.title,
        body.outline ?? "",
        body.tone ?? "engaging",
        { provider: body.provider, model: body.model }
      );
    }

    const last = await prisma.chapter.aggregate({
      where: { bookId: book.id },
      _max: { order: true },
    });

    const chapter = await prisma.chapter.create({
      data: {
        title: body.title,
        content,
        wordCount: countWords(content),
        order: (last._max.order ?? -1) + 1,
        type: body.type ?? "CHAPTER",
        bookId: book.id,
      },
    });

    // Book moves out of DRAFT once writing starts
    if (book.status === "DRAFT") {
      await prisma.book.update({
        where: { id: book.id },
        data: { status: "WRITING" },
      });
    }

    return NextResponse.json({ chapter: serializeChapter(chapter) }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
