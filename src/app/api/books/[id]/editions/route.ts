import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { apiError, unauthorized, notFound } from "@/lib/api";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max duration on Vercel Pro

const createEditionSchema = z.object({
  language: z.string().min(1, "Language is required"),
});

const openai = new OpenAI();

async function translateText(text: string, language: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini", // Cost efficient model for large translation jobs
    messages: [
      {
        role: "system",
        content: `You are a professional book translator. Translate the following text into ${language}. Maintain the original tone, paragraph structure, formatting, and literary style. Output ONLY the translated text.`,
      },
      {
        role: "user",
        content: text,
      },
    ],
    temperature: 0.3,
  });

  return response.choices[0]?.message.content || text;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const originalBook = await prisma.book.findUnique({
      where: { id: params.id, authorId: user.id },
      include: { chapters: true, coverImages: true },
    });

    if (!originalBook) return notFound();

    const body = createEditionSchema.parse(await req.json());

    // 1. Create the new Book entity as an Edition
    const edition = await prisma.book.create({
      data: {
        title: originalBook.title, // Optionally translate title
        description: originalBook.description, // Optionally translate description
        genre: originalBook.genre,
        language: body.language,
        status: "DRAFT",
        authorId: user.id,
        price: originalBook.price,
        digitalPrice: originalBook.digitalPrice,
        coverUrl: originalBook.coverUrl,
        backCoverUrl: originalBook.backCoverUrl,
        originalBookId: originalBook.id,
      },
    });

    // 2. Copy cover images
    if (originalBook.coverImages.length > 0) {
      await prisma.coverImage.createMany({
        data: originalBook.coverImages.map(img => ({
          bookId: edition.id,
          url: img.url,
          source: img.source,
          side: img.side,
        }))
      });
    }

    // 3. Translate and copy chapters (Process sequentially to avoid rate limits)
    // In a production environment, this should be a background job.
    for (const chapter of originalBook.chapters) {
      const translatedTitle = await translateText(chapter.title, body.language);
      let translatedContent = "";
      
      if (chapter.content) {
        // Split content into chunks if it's too large, but GPT-4o-mini handles 128k context so it's fine.
        translatedContent = await translateText(chapter.content, body.language);
      }

      await prisma.chapter.create({
        data: {
          bookId: edition.id,
          title: translatedTitle,
          content: translatedContent,
          order: chapter.order,
          wordCount: translatedContent.split(/\s+/).filter(Boolean).length,
        }
      });
    }

    // Return the new edition
    const fullEdition = await prisma.book.findUnique({
      where: { id: edition.id },
      include: { chapters: true },
    });

    return NextResponse.json({ edition: fullEdition }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
