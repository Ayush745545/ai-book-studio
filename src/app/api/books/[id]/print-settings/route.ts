import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { apiError, unauthorized, notFound } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  pageSize: z.enum(["5x8", "6x9", "8.5x11", "a4"]).optional(),
  margin: z.string().regex(/^(0\.[5-9]|1(?:\.0)?)in$/, "Margins must be between 0.5in and 1in").optional(),
  font: z.enum(["serif", "sans", "mono"]).optional(),
  fontSize: z.number().int().min(8).max(24).optional(),
  lineSpacing: z.number().min(1).max(3).optional(),
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const book = await prisma.book.findUnique({
      where: { id: params.id, authorId: user.id },
      include: { printSettings: true },
    });

    if (!book) return notFound();

    return NextResponse.json({ printSettings: book.printSettings });
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const book = await prisma.book.findUnique({
      where: { id: params.id, authorId: user.id },
    });

    if (!book) return notFound();

    const body = patchSchema.parse(await req.json());

    const settings = await prisma.printSettings.upsert({
      where: { bookId: params.id },
      update: body,
      create: {
        bookId: params.id,
        pageSize: book.format === "workbook" ? "a4" : "6x9",
        font: book.format === "workbook" ? "sans" : "serif",
        ...body,
      },
    });

    return NextResponse.json({ printSettings: settings });
  } catch (err) {
    return apiError(err);
  }
}
