import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { serializeBook } from "@/lib/serialize";
import { apiError, forbidden, notFound, unauthorized } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  side: z.enum(["FRONT", "BACK"]).default("FRONT"),
});

type Params = { params: { id: string } };

const allowedTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

/** POST /api/books/[id]/cover/upload — upload a custom front or back cover. */
export async function POST(req: Request, { params }: Params) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const book = await prisma.book.findUnique({ where: { id: params.id } });
    if (!book) return notFound("Book");
    if (book.authorId !== user.id && user.role !== "ADMIN") return forbidden();

    const formData = await req.formData();
    const file = formData.get("file") ?? formData.get("image") ?? formData.get("cover");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Choose an image file" }, { status: 400 });
    }

    const { side } = schema.parse({ side: formData.get("side") ?? "FRONT" });
    const extension = allowedTypes.get(file.type) ?? (file.name.toLowerCase().endsWith(".jpg") || file.name.toLowerCase().endsWith(".jpeg") ? ".jpg" : file.name.toLowerCase().endsWith(".png") ? ".png" : file.name.toLowerCase().endsWith(".webp") ? ".webp" : undefined);
    if (!extension) {
      return NextResponse.json({ error: "Use a JPG, PNG, or WebP image" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Cover images must be 10MB or smaller" }, { status: 400 });
    }

    // Store the image as base64 in the database so it survives serverless
    // deployments (Vercel function filesystems are ephemeral).
    const buffer = Buffer.from(await file.arrayBuffer());
    const data = buffer.toString("base64");

    const coverImage = await prisma.coverImage.create({
      data: {
        bookId: book.id,
        url: "", // filled below with the cover's own id
        data,
        mimeType: file.type,
        source: "UPLOAD",
        side,
      },
    });
    const url = `/api/covers/${coverImage.id}`;
    await prisma.coverImage.update({
      where: { id: coverImage.id },
      data: { url },
    });

    const updated = await prisma.book.update({
      where: { id: book.id },
      data: side === "FRONT" ? { coverUrl: url } : { backCoverUrl: url },
      include: {
        chapters: { orderBy: { order: "asc" } },
        coverImages: { orderBy: { createdAt: "desc" } },
      },
    });

    return NextResponse.json(
      {
        coverImage: {
          id: coverImage.id,
          url: coverImage.url,
          source: coverImage.source,
          side: coverImage.side,
          createdAt: coverImage.createdAt.toISOString(),
        },
        book: serializeBook(updated),
      },
      { status: 201 }
    );
  } catch (err) {
    return apiError(err);
  }
}
