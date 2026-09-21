import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiError, unauthorized, notFound, forbidden } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const schema = z.object({
  message: z.string().min(1).max(4000),
  chapterTitle: z.string().max(200).optional(),
  chapterId: z.string().max(100).optional(),
  provider: z.enum(["openai", "openrouter"]).optional().default("openai"),
  model: z.string().max(100).optional().default("llama3"),
  baseUrl: z.string().max(400).optional(),
  temperature: z.number().min(0).max(2).optional().default(0.6),
  contextWindow: z.number().int().min(512).max(128000).optional().default(4096),
  stream: z.boolean().optional().default(true),
});

type Params = { params: { id: string } };

export async function POST(req: Request, { params }: Params) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const book = await prisma.book.findUnique({
      where: { id: params.id },
      select: { id: true, authorId: true, title: true, description: true, genre: true },
    });
    if (!book) return notFound("Book");
    if (book.authorId !== user.id && user.role !== "ADMIN") return forbidden();

    const body = schema.parse(await req.json());

    const systemPrompt = `You are a helpful AI writing assistant for an author working on a book called "${book.title}"${book.genre ? ` in the ${book.genre} genre` : ""}${book.description ? `. Synopsis: ${book.description}` : ""}${body.chapterTitle ? `. Currently editing chapter: "${body.chapterTitle}"` : ""}.

Help the author with their writing. Be creative, specific, and actionable. Keep responses concise but helpful.

IMPORTANT: output plain text only — no markdown, no asterisks (** or *), no backticks, no headings, no HTML. Use blank lines between paragraphs.`;

    if (body.provider === "openrouter") {
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({
        baseURL: (body.baseUrl || "https://openrouter.ai/api/v1").replace(/\/$/, ""),
        apiKey: process.env.OPENROUTER_API_KEY || "",
      });
      const useModel = !body.model || body.model === "llama3" ? "openai/gpt-4o-mini" : body.model;
      const completion = await openai.chat.completions.create({
        model: useModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: body.message },
        ],
        max_tokens: 1500,
        temperature: body.temperature,
        stream: body.stream,
      });
      if (!body.stream) {
        return NextResponse.json({
          result: (completion as any).choices?.[0]?.message?.content ?? "No response.",
        });
      }
      const stream = new ReadableStream({
        async pull(controller) {
          // @ts-ignore stream is async iterable
          for await (const part of completion) {
            const delta = part.choices?.[0]?.delta?.content ?? "";
            if (delta) controller.enqueue(new TextEncoder().encode(delta));
          }
          controller.close();
        },
      });
      return new NextResponse(stream, {
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
      });
    } else {
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({
        baseURL: body.baseUrl || undefined,
      });
      const useModel = !body.model || body.model === "llama3" ? "gpt-4o-mini" : body.model;
      const completion = await openai.chat.completions.create({
        model: useModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: body.message },
        ],
        max_tokens: 1500,
        temperature: body.temperature,
        stream: body.stream,
      });
      if (!body.stream) {
        return NextResponse.json({
          result: (completion as any).choices?.[0]?.message?.content ?? "No response.",
        });
      }
      const stream = new ReadableStream({
        async pull(controller) {
          // @ts-ignore stream is async iterable
          for await (const part of completion) {
            const delta = part.choices?.[0]?.delta?.content ?? "";
            if (delta) controller.enqueue(new TextEncoder().encode(delta));
          }
          controller.close();
        },
      });
      return new NextResponse(stream, {
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
      });
    }
  } catch (err) {
    return apiError(err);
  }
}
