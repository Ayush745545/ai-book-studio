import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { apiError, unauthorized, notFound } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reorderSchema = z.array(
  z.object({
    id: z.string(),
    order: z.number(),
    type: z.enum(["FRONT_MATTER", "CHAPTER", "BACK_MATTER"]),
  })
);

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const book = await prisma.book.findUnique({
      where: { id: params.id, authorId: user.id },
    });

    if (!book) return notFound();

    const items = reorderSchema.parse(await req.json());

    // Run all updates in a transaction
    await prisma.$transaction(
      items.map((item) =>
        prisma.chapter.update({
          where: { id: item.id, bookId: params.id },
          data: {
            order: item.order,
            type: item.type,
          },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    return apiError(err);
  }
}
