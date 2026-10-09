"use client";
import { useEffect, useRef } from "react";
import { X } from "@/components/icons";
import { FormatGrid } from "./studio/format-grid";
export function FormatSelectionModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        dialog.current?.querySelectorAll<HTMLElement>("button, a[href]") ?? [],
      );
      const first = focusable[0],
        last = focusable[focusable.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === dialog.current)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  return (
    <div
      className="studio-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="format-heading"
        className="studio-shell studio-modal"
      >
        <button
          className="studio-icon-button studio-modal-close"
          onClick={onClose}
          aria-label="Close format selection"
        >
          <X />
        </button>
        <span className="studio-eyebrow">EVERY IDEA HAS A FORMAT</span>
        <h2 id="format-heading" className="studio-title">
          What will you create?
        </h2>
        <p className="studio-muted">
          Choose a starting point. We’ll give you the right structure and tools.
        </p>
        <FormatGrid />
        <p className="studio-footnote">
          Page counts are writing targets. Final length depends on your content
          and layout.
        </p>
      </div>
    </div>
  );
}
