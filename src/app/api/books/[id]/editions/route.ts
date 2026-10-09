import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { apiError, unauthorized, notFound } from "@/lib/api";
import { writingCredentials } from "@/lib/ai-credentials";
import { serializeBook } from "@/lib/serialize";
import { countWords } from "@/lib/utils";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
const schema = z.object({ language: z.string().trim().min(1).max(50), provider: z.enum(["openrouter", "openai"]).default("openrouter"), model: z.string().max(100).optional() });
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(); if (!user) return unauthorized();
    const original = await prisma.book.findFirst({ where: { id: params.id, authorId: user.id }, include: { chapters: { orderBy: { order: "asc" } }, coverImages: true } });
    if (!original) return notFound("Book");
    const body = schema.parse(await req.json()), credentials = await writingCredentials(user.id, body.provider);
    const client = new OpenAI({ apiKey: credentials.apiKey, baseURL: body.provider === "openrouter" ? "https://openrouter.ai/api/v1" : undefined });
    const translate = async (text: string) => {
      if (!text.trim()) return "";
      const result = await client.chat.completions.create({ model: body.model || (body.provider === "openrouter" ? "openai/gpt-4o-mini" : "gpt-4o-mini"), temperature: .3, max_tokens: 8000, messages: [{ role: "system", content: `Translate into ${body.language}. Keep the original voice, paragraph structure and meaning. Return only the translation, without commentary.` }, { role: "user", content: text }] });
      const content = result.choices[0]?.message.content;
      if (!content?.trim() || result.choices[0]?.finish_reason === "length") throw new Error("A translation was incomplete. Split long chapters into shorter sections and try again.");
      return content;
    };
    // Complete every translation before storing the edition, so provider failures
    // cannot leave a partially translated book in the author's library.
    const translated: { title: string; content: string; notes: string; type: "FRONT_MATTER" | "CHAPTER" | "BACK_MATTER"; order: number }[] = [];
    for (const chapter of original.chapters) translated.push({ title: await translate(chapter.title), content: await translate(chapter.content), notes: chapter.notes, type: chapter.type, order: chapter.order });
    const edition = await prisma.$transaction(async tx => {
      const created = await tx.book.create({ data: { title: original.title, description: original.description, genre: original.genre, format: original.format, targetPages: original.targetPages, audience: original.audience, writingGoal: original.writingGoal, tone: original.tone, language: body.language, authorId: user.id, originalBookId: original.id, price: original.price, digitalPrice: original.digitalPrice, coverUrl: original.coverUrl, backCoverUrl: original.backCoverUrl, chapters: { create: translated.map(c => ({ ...c, wordCount: countWords(c.content) })) } } });
      let coverUrl = original.coverUrl, backCoverUrl = original.backCoverUrl;
      for (const image of original.coverImages) {
        const copied = await tx.coverImage.create({ data: { bookId: created.id, url: image.url, data: image.data, mimeType: image.mimeType, source: image.source, side: image.side } });
        const url = image.data ? `/api/covers/${copied.id}` : image.url;
        if (image.data) await tx.coverImage.update({ where: { id: copied.id }, data: { url } });
        if (image.url === original.coverUrl) coverUrl = url;
        if (image.url === original.backCoverUrl) backCoverUrl = url;
      }
      return tx.book.update({ where: { id: created.id }, data: { coverUrl, backCoverUrl }, include: { chapters: { orderBy: { order: "asc" } }, coverImages: true } });
    });
    return NextResponse.json({ edition: serializeBook(edition) }, { status: 201 });
  } catch (e) { return apiError(e); }
}
