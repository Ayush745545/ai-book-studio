import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { apiError, unauthorized, notFound } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  pageSize: z.string().optional(),
  margin: z.string().optional(),
  font: z.string().optional(),
  fontSize: z.number().optional(),
  lineSpacing: z.number().optional(),
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
        ...body,
      },
    });

    return NextResponse.json({ printSettings: settings });
  } catch (err) {
    return apiError(err);
  }
}
