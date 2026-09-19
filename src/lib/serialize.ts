import type { Book, Chapter, CoverImage, User } from "@prisma/client";
import type { SerializedBook, SerializedChapter } from "@/types";

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function serializeChapter(c: Chapter): SerializedChapter {
  return {
    id: c.id,
    title: c.title,
    content: c.content,
    order: c.order,
    type: c.type,
    wordCount: c.wordCount,
    bookId: c.bookId,
    createdAt: toIsoString(c.createdAt),
    updatedAt: toIsoString(c.updatedAt),
  };
}

type BookWithExtras = Book & {
  chapters?: Chapter[];
  coverImages?: CoverImage[];
  author?: Pick<User, "name" | "email"> | null;
  _count?: { chapters: number };
  printSettings?: any;
  editions?: BookWithExtras[];
};

export function serializeBook(b: BookWithExtras): SerializedBook {
  return {
    id: b.id,
    title: b.title,
    description: b.description,
    coverUrl: b.coverUrl,
    backCoverUrl: b.backCoverUrl,
    status: b.status,
    genre: b.genre,
    language: b.language,
    isPublished: b.isPublished,
    price: b.price,
    digitalPrice: b.digitalPrice,
    authorId: b.authorId,
    originalBookId: b.originalBookId,
    createdAt: toIsoString(b.createdAt),
    updatedAt: toIsoString(b.updatedAt),
    ...(b.chapters ? { chapters: b.chapters.map(serializeChapter) } : {}),
    ...(b.coverImages
      ? {
          coverImages: b.coverImages.map((cover) => ({
            id: cover.id,
            url: cover.url,
            source: cover.source,
            side: cover.side,
            createdAt: toIsoString(cover.createdAt),
          })),
        }
      : {}),
    ...(b.printSettings ? {
      printSettings: {
        id: b.printSettings.id,
        bookId: b.printSettings.bookId,
        pageSize: b.printSettings.pageSize,
        margin: b.printSettings.margin,
        font: b.printSettings.font,
        fontSize: b.printSettings.fontSize,
        lineSpacing: b.printSettings.lineSpacing,
        updatedAt: toIsoString(b.printSettings.updatedAt),
      }
    } : {}),
    ...(b.editions ? { editions: b.editions.map(serializeBook) } : {}),
    ...(b.author ? { authorName: b.author.name ?? b.author.email } : {}),
    ...(b._count ? { chapterCount: b._count.chapters } : {}),
  };
}
