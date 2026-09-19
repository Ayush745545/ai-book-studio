"use client";

import { useRouter } from "next/navigation";
import { Trash } from "@/components/icons";

export function DeleteBookButton({ bookId, bookTitle }: { bookId: string; bookTitle: string }) {
  const router = useRouter();

  return (
    <button
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!window.confirm(`Delete "${bookTitle}"? This cannot be undone.`)) return;
        try {
          await fetch(`/api/books/${bookId}`, { method: "DELETE" });
          router.refresh();
        } catch (err) {
          console.error(err);
          alert("Failed to delete");
        }
      }}
      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition p-1 rounded hover:bg-red-500/20 text-red-400"
      title="Delete book"
    >
      <Trash className="h-4 w-4" />
    </button>
  );
}
