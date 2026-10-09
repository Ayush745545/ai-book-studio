import {
  BookOpen,
  Tablet,
  Compass,
  ClipboardList,
  Headphones,
} from "@/components/icons";
export function FormatIcon({
  id,
  className = "h-5 w-5",
}: {
  id: string;
  className?: string;
}) {
  const Icon =
    (
      {
        book: BookOpen,
        ebook: Tablet,
        guide: Compass,
        workbook: ClipboardList,
        audiobook: Headphones,
      } as const
    )[id as "book"] ?? BookOpen;
  return <Icon className={className} aria-hidden="true" />;
}
