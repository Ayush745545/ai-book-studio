import PDFDocument from "pdfkit";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { slugify } from "@/lib/utils";
import { getFormatById } from "@/lib/book-formats";
import { apiError, forbidden, notFound, unauthorized } from "@/lib/api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();
    const book = await prisma.book.findUnique({
      where: { id: params.id },
      include: {
        author: { select: { name: true, email: true } },
        chapters: { orderBy: { order: "asc" } },
        coverImages: true,
        printSettings: true,
      },
    });
    if (!book) return notFound("Book");
    let access =
      book.authorId === user.id ||
      user.role === "ADMIN" ||
      (book.isPublished && book.digitalPrice === 0);
    if (!access && book.isPublished)
      access = Boolean(
        await prisma.order.findFirst({
          where: {
            userId: user.id,
            bookId: book.id,
            status: "PAID",
            type: "DIGITAL",
          },
        }),
      );
    if (!access) return forbidden();
    const format = getFormatById(book.format) ?? getFormatById("book")!,
      workbook = book.format === "workbook",
      sizes: Record<string, [number, number]> = { "5x8": [360, 576], "6x9": [432, 648], "8.5x11": [612, 792], a4: [595.28, 841.89] },
      size: [number, number] = sizes[book.printSettings?.pageSize ?? ""] ?? (workbook ? sizes.a4 : sizes["6x9"]),
      margin = book.printSettings ? parseFloat(book.printSettings.margin) * 72 : workbook ? 58 : 48,
      fontSize = book.printSettings?.fontSize ?? 12,
      bodyFont = book.printSettings?.font === "mono" ? "Courier" : book.printSettings?.font === "sans" || workbook ? "Helvetica" : "Times-Roman",
      lineGap = book.printSettings ? fontSize * (book.printSettings.lineSpacing - 1) : workbook ? 6 : 3;
    const doc = new PDFDocument({
      size,
      margin,
      bufferPages: true,
      info: {
        Title: book.title,
        Author: book.author.name || "Author",
        Creator: "Book Studio",
      },
    });
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        doc.on("data", (chunk: Buffer) =>
          controller.enqueue(new Uint8Array(chunk)),
        );
        doc.on("end", () => controller.close());
        doc.on("error", (e) => controller.error(e));
      },
    });
    const front = book.coverImages.find(
      (c) =>
        c.url === book.coverUrl &&
        c.data &&
        ["image/png", "image/jpeg"].includes(c.mimeType || ""),
    );
    if (front?.data) {
      try {
        doc.image(Buffer.from(front.data, "base64"), 0, 0, {
          fit: size,
          align: "center",
          valign: "center",
        });
        doc.addPage();
      } catch {
        /* Unsupported cover bytes do not prevent manuscript export. */
      }
    }
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#87947b")
      .text(format.name.toUpperCase(), margin, 95, {
        align: "center",
        characterSpacing: 2,
      });
    doc.moveDown(4);
    doc
      .font("Times-Roman")
      .fontSize(30)
      .fillColor("#294c37")
      .text(book.title, { align: "center" });
    doc.moveDown(1.5);
    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor("#708563")
      .text(book.author.name || "Author", { align: "center" });
    if (book.description) {
      doc.moveDown(3);
      doc
        .font("Times-Roman")
        .fontSize(11)
        .fillColor("#8b967e")
        .text(book.description, { align: "center", lineGap: 3 });
    }
    doc.addPage();
    doc.font("Times-Roman").fontSize(24).fillColor("#294c37").text("Contents");
    doc.moveDown(1.5);
    book.chapters.forEach((c, i) => {
      doc
        .font("Helvetica")
        .fontSize(11)
        .fillColor("#5a7050")
        .text(`${String(i + 1).padStart(2, "0")}    ${c.title}`, {
          lineGap: 4,
          paragraphGap: 10,
          goTo: `section-${c.id}`,
        });
    });
    for (let i = 0; i < book.chapters.length; i++) {
      const chapter = book.chapters[i];
      doc.addPage();
      const label =
        chapter.type === "FRONT_MATTER"
          ? "FRONT MATTER"
          : chapter.type === "BACK_MATTER"
            ? "BACK MATTER"
            : `${format.unit.toUpperCase()} ${String(i + 1).padStart(2, "0")}`;
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#91a183")
        .text(label, {
          characterSpacing: 2,
          destination: `section-${chapter.id}`,
        });
      doc.moveDown(1.5);
      doc
        .font("Times-Roman")
        .fontSize(25)
        .fillColor("#294c37")
        .text(chapter.title);
      doc.moveDown(0.8);
      doc
        .moveTo(margin, doc.y)
        .lineTo(margin + 35, doc.y)
        .strokeColor("#b8c7a9")
        .lineWidth(0.8)
        .stroke();
      doc.moveDown(1.5);
      doc
        .font(bodyFont)
        .fontSize(fontSize)
        .fillColor("#435738");
      if (!chapter.content.trim())
        doc
          .fontSize(11)
          .fillColor("#9daa91")
          .text("This section has not been written yet.");
      else
        chapter.content.split(/\n\s*\n/).forEach((p) => {
          doc.text(p.trim(), {
            align: "left",
            lineGap,
            paragraphGap: 12,
          });
          doc.moveDown(0.6);
        });
    }
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.page.margins.bottom = 0;
      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor("#a4b396")
        .text(book.title, margin, size[1] - 30, {
          width: size[0] - margin * 2 - 25,
          lineBreak: false,
        });
      doc.text(String(i + 1), size[0] - margin - 20, size[1] - 30, {
        width: 20,
        align: "right",
        lineBreak: false,
      });
    }
    doc.end();
    return new Response(stream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${slugify(book.title) || "manuscript"}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
