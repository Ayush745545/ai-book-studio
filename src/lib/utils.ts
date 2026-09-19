/** Shared helpers (isomorphic — safe for client and server). */

export const DEFAULT_PRINT_PRICE = Number(
  process.env.NEXT_PUBLIC_DEFAULT_PRINT_PRICE ?? "24.99"
);

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")
      .slice(0, 60) || "book"
  );
}

export function formatPrice(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatDate(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Retail unit price for a printed copy of a book. */
export function unitPriceFor(price: number): number {
  return price > 0 ? price : DEFAULT_PRINT_PRICE;
}
