import { prisma } from "@/lib/prisma";
import { serializeBook } from "@/lib/serialize";
import { getSessionUser } from "@/lib/session";
import { apiError, unauthorized, forbidden, notFound } from "@/lib/api";
import { createEpub } from "@/lib/epub";
import { slugify } from "@/lib/utils";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();
    const book = await prisma.book.findUnique({
      where: { id: params.id },
      include: {
        chapters: { orderBy: { order: "asc" } },
        author: { select: { name: true, email: true } },
      },
    });
    if (!book) return notFound("Book");
    if (book.authorId !== user.id && user.role !== "ADMIN") return forbidden();
    const format = new URL(req.url).searchParams.get("format") || "txt";
    if (!["epub", "txt"].includes(format))
      return Response.json(
        { error: "Choose EPUB or plain text." },
        { status: 400 },
      );
    const content =
      format === "epub"
        ? createEpub(serializeBook(book))
        : `${book.title}\n${book.author.name || ""}\n\n${book.description || ""}\n\n${book.chapters.map((c) => `${c.title}\n${"─".repeat(40)}\n\n${c.content}`).join("\n\n\n")}\n`;
    return new Response(
      typeof content === "string" ? content : new Uint8Array(content),
      {
        headers: {
          "Content-Type":
            format === "epub"
              ? "application/epub+zip"
              : "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="${slugify(book.title) || "manuscript"}.${format}"`,
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (e) {
    return apiError(e);
  }
}
