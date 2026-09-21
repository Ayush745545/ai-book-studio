import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { serializeBook } from "@/lib/serialize";
import { generateCover } from "@/lib/openai";
import { apiError, forbidden, notFound, unauthorized } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const schema = z.object({
  bookId: z.string().min(1),
  prompt: z.string().min(1).max(1000),
  side: z.enum(["FRONT", "BACK"]).default("FRONT"),
});

/** POST /api/ai/cover — DALL-E 3 book cover; downloads and persists the image. */
export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { bookId, prompt, side } = schema.parse(await req.json());

    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) return notFound("Book");
    if (book.authorId !== user.id && user.role !== "ADMIN") return forbidden();

    // Enrich the user prompt with book context for a better cover
    const enriched = `"${book.title}"${book.genre ? `, a ${book.genre} book` : ""}. Art direction: ${prompt}`;
    const remoteUrl = await generateCover(enriched);

    // Download the DALL-E image and persist it as base64 so it survives
    // serverless deployments and doesn't expire after ~1 hour.
    const imageRes = await fetch(remoteUrl);
    if (!imageRes.ok) throw new Error("Failed to download generated cover image");
    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
    const data = imageBuffer.toString("base64");
    const mimeType = imageRes.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";

    const coverImage = await prisma.coverImage.create({
      data: {
        bookId: book.id,
        url: "",
        data,
        mimeType,
        source: "AI",
        side,
      },
    });
    const url = `/api/covers/${coverImage.id}`;
    await prisma.coverImage.update({ where: { id: coverImage.id }, data: { url } });

    const updated = await prisma.book.update({
      where: { id: bookId },
      data: {
        ...(side === "FRONT" ? { coverUrl: url } : { backCoverUrl: url }),
        // Auto-advance status when a draft gets its first cover
        ...(book.status === "DRAFT" ? { status: "DESIGNING" as const } : {}),
      },
      include: {
        chapters: { orderBy: { order: "asc" } },
        coverImages: { orderBy: { createdAt: "desc" } },
      },
    });

    return NextResponse.json({ coverUrl: url, coverImage, book: serializeBook(updated) });
  } catch (err) {
    return apiError(err);
  }
}
