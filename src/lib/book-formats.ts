export interface BookFormat {
  id: string;
  name: string;
  credits: number;
  pages: string;
  description: string;
  icon: string;
}

export const BOOK_FORMATS: BookFormat[] = [
  {
    id: "book",
    name: "Book",
    credits: 1,
    pages: "120 pages",
    description: "Full-length authority builder",
    icon: "BookOpen",
  },
  {
    id: "ebook",
    name: "E-Book",
    credits: 1,
    pages: "50 pages",
    description: "Digital-optimized content",
    icon: "Tablet",
  },
  {
    id: "guide",
    name: "Guide",
    credits: 1,
    pages: "30 pages",
    description: "Focused how-to content",
    icon: "Compass",
  },
  {
    id: "workbook",
    name: "Workbook",
    credits: 1,
    pages: "10–20 pages",
    description: "Interactive exercises",
    icon: "ClipboardList",
  },
  {
    id: "audiobook",
    name: "Audiobook",
    credits: 1,
    pages: "AI Narration",
    description: "Professional voice narration from any book",
    icon: "Headphones",
  },
];

export function getFormatById(id: string): BookFormat | undefined {
  return BOOK_FORMATS.find((f) => f.id === id);
}
