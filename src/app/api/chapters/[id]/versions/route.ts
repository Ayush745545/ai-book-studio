import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { apiError, unauthorized, forbidden, notFound } from "@/lib/api";
export const dynamic = "force-dynamic";
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();
    const chapter = await prisma.chapter.findUnique({
      where: { id: params.id },
      include: { book: { select: { authorId: true } } },
    });
    if (!chapter) return notFound("Section");
    if (chapter.book.authorId !== user.id && user.role !== "ADMIN")
      return forbidden();
    const versions = await prisma.version.findMany({
      where: { chapterId: chapter.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    return NextResponse.json({ versions });
  } catch (e) {
    return apiError(e);
  }
}
