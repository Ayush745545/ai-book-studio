import OpenAI from "openai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { apiError, unauthorized, forbidden, notFound } from "@/lib/api";
import { slugify } from "@/lib/utils";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
const schema = z.object({
  chapterId: z.string().min(1),
  voice: z
    .enum(["alloy", "echo", "fable", "onyx", "nova", "shimmer"])
    .default("alloy"),
  speed: z.number().min(0.75).max(1.5).default(1),
});
export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();
    const body = schema.parse(await req.json());
    const chapter = await prisma.chapter.findFirst({
      where: { id: body.chapterId, bookId: params.id },
      include: { book: { select: { authorId: true } } },
    });
    if (!chapter) return notFound("Track");
    if (chapter.book.authorId !== user.id && user.role !== "ADMIN")
      return forbidden();
    if (!process.env.OPENAI_API_KEY)
      return Response.json(
        {
          error:
            "AI narration is not connected. Configure OPENAI_API_KEY to export MP3 audio. Device voice preview remains available.",
        },
        { status: 503 },
      );
    const text = `${chapter.title}.\n\n${chapter.content}`.trim();
    if (!chapter.content.trim())
      return Response.json(
        { error: "Write this track before generating narration." },
        { status: 400 },
      );
    if (text.length > 24000)
      return Response.json(
        {
          error: "Split this script into tracks of 24,000 characters or fewer.",
        },
        { status: 400 },
      );
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 25000,
      maxRetries: 0,
    });
    const chunks: string[] = [];
    for (let remaining = text; remaining.length;) {
      let end = Math.min(3500, remaining.length);
      if (end < remaining.length) {
        const boundary = remaining.lastIndexOf(" ", end);
        if (boundary > 2000) end = boundary;
      }
      chunks.push(remaining.slice(0, end));
      remaining = remaining.slice(end);
    }
    const audio: Buffer[] = [];
    for (const input of chunks) {
      const response = await client.audio.speech.create({
        model: "tts-1",
        voice: body.voice,
        speed: body.speed,
        input,
        response_format: "mp3",
      });
      audio.push(Buffer.from(await response.arrayBuffer()));
    }
    return new Response(new Uint8Array(Buffer.concat(audio)), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="${slugify(chapter.title) || "track"}.mp3"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
