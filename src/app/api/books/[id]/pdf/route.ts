import PDFDocument from "pdfkit";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { slugify } from "@/lib/utils";
import { apiError, forbidden, notFound, unauthorized } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 6x9 inch trade paperback page, in points (1in = 72pt)
const PAGE_SIZE: [number, number] = [432, 648];
const MARGIN = 54;

type Params = { params: { id: string } };

/**
 * GET /api/books/[id]/pdf — stream a print-ready PDF (6x9 pages):
 * title page + one chapter per section.
 */
export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const book = await prisma.book.findUnique({
      where: { id: params.id },
      include: {
        author: { select: { name: true, email: true } },
        chapters: { orderBy: { order: "asc" } },
      },
    });
    if (!book) return notFound("Book");
    
    const digitalPrice = book.digitalPrice ?? 0;
    let hasAccess = digitalPrice === 0 || book.authorId === user.id || user.role === "ADMIN";

    if (!hasAccess && book.isPublished) {
      const paidOrder = await prisma.order.findFirst({
        where: { userId: user.id, bookId: book.id, status: "PAID" },
      });
      if (paidOrder) hasAccess = true;
    }

    if (!hasAccess) return forbidden();

    const doc = new PDFDocument({
      size: PAGE_SIZE,
      margin: MARGIN,
      info: {
        Title: book.title,
        Author: book.author?.name ?? "AI Book Studio",
        Creator: "AI Book Studio",
      },
    });

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        doc.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
        doc.on("end", () => controller.close());
        doc.on("error", (e) => controller.error(e));
      },
    });

    const authorName = book.author?.name ?? book.author?.email ?? "Unknown Author";

    // ── Title page ─────────────────────────────────────────────
    doc.font("Helvetica").fontSize(12);
    doc.text("", MARGIN, 180); // spacer
    doc.font("Helvetica-Bold").fontSize(30).fillColor("#111111");
    doc.text(book.title, MARGIN, 220, { align: "center" });

    doc.font("Helvetica").fontSize(14).fillColor("#444444");
    doc.text(authorName, MARGIN, doc.y + 36, { align: "center" });

    if (book.genre) {
      doc.fontSize(10).fillColor("#888888");
      doc.text(book.genre.toUpperCase(), MARGIN, doc.y + 16, {
        align: "center",
        characterSpacing: 2,
      });
    }

    // Decorative rule
    const ruleY = doc.y + 40;
    doc
      .moveTo(PAGE_SIZE[0] / 2 - 40, ruleY)
      .lineTo(PAGE_SIZE[0] / 2 + 40, ruleY)
      .strokeColor("#bbbbbb")
      .lineWidth(1)
      .stroke();

    doc.fontSize(9).fillColor("#999999");
    doc.text("Created with AI Book Studio", MARGIN, PAGE_SIZE[1] - MARGIN - 20, {
      align: "center",
    });

    // ── Description page (optional) ────────────────────────────
    if (book.description?.trim()) {
      doc.addPage({ size: PAGE_SIZE, margin: MARGIN });
      doc.font("Helvetica-Bold").fontSize(16).fillColor("#111111");
      doc.text("About this book", { align: "left" });
      doc.moveDown(1);
      doc.font("Helvetica").fontSize(11).fillColor("#333333");
      doc.text(book.description, { align: "justify", lineGap: 2 });
    }

    // ── Chapters ───────────────────────────────────────────────
    book.chapters.forEach((chapter, i) => {
      doc.addPage({ size: PAGE_SIZE, margin: MARGIN });

      doc.font("Helvetica").fontSize(10).fillColor("#999999");
      doc.text(`Chapter ${i + 1}`, { align: "center", characterSpacing: 2 });
      doc.moveDown(0.5);

      doc.font("Helvetica-Bold").fontSize(18).fillColor("#111111");
      doc.text(chapter.title, { align: "center" });
      doc.moveDown(1.5);

      doc.font("Helvetica").fontSize(11).fillColor("#222222");
      const paragraphs = chapter.content
        .split(/\r?\n/)
        .map((p) => p.trim())
        .filter(Boolean);

      if (paragraphs.length === 0) {
        doc.text("(empty chapter)", { align: "center" });
      } else {
        paragraphs.forEach((p) => {
          doc.text(p, { align: "justify", lineGap: 2, paragraphGap: 10 });
        });
      }
    });

    doc.end();

    const filename = `${slugify(book.title)}.pdf`;
    return new Response(stream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return apiError(err);
  }
}
