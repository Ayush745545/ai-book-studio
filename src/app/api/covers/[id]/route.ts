import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, notFound } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/covers/[id] — serve an uploaded cover image from the database. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const cover = await prisma.coverImage.findUnique({ where: { id: params.id } });
    if (!cover || !cover.data || !cover.mimeType) return notFound("Cover");
    const buffer = Buffer.from(cover.data, "base64");
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": cover.mimeType,
        "Content-Length": String(buffer.length),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    return apiError(err);
  }
}