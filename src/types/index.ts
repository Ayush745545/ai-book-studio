// Shared types — mirror the Prisma enums but as plain string literals so
// client components don't need to import @prisma/client.

export type AiProvider = "openai" | "ollama";

export type Role = "AUTHOR" | "READER" | "ADMIN";

export type BookStatus =
  | "DRAFT"
  | "WRITING"
  | "EDITING"
  | "DESIGNING"
  | "READY"
  | "PUBLISHED";

export type CoverSource = "AI" | "UPLOAD";
export type CoverSide = "FRONT" | "BACK";

export type ChapterType = "FRONT_MATTER" | "CHAPTER" | "BACK_MATTER";

export interface SerializedChapter {
  id: string;
  title: string;
  content: string;
  order: number;
  type: ChapterType;
  wordCount: number;
  bookId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SerializedCoverImage {
  id: string;
  url: string;
  source: CoverSource;
  side: CoverSide;
  createdAt: string;
}

export interface SerializedPrintSettings {
  id: string;
  bookId: string;
  pageSize: string;
  margin: string;
  font: string;
  fontSize: number;
  lineSpacing: number;
  updatedAt: string;
}

export interface SerializedBook {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  backCoverUrl: string | null;
  coverImages?: SerializedCoverImage[];
  status: BookStatus;
  genre: string | null;
  language: string;
  isPublished: boolean;
  price: number;
  digitalPrice: number;
  authorId: string;
  originalBookId: string | null;
  createdAt: string;
  updatedAt: string;
  chapters?: SerializedChapter[];
  authorName?: string;
  chapterCount?: number;
  printSettings?: SerializedPrintSettings | null;
  editions?: SerializedBook[];
}

export interface BookIdea {
  title: string;
  hook: string;
  synopsis: string;
  targetAudience: string;
}

export interface GrammarChange {
  original: string;
  corrected: string;
  reason: string;
}
