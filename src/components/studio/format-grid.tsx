"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { BOOK_FORMATS } from "@/lib/book-formats";
import { ArrowRight, Check } from "@/components/icons";
import { FormatIcon } from "./format-icon";
const labels: Record<string, string> = { book: "PRINT & PUBLISH", ebook: "READ ANYWHERE", guide: "TEACH A SKILL", workbook: "LEARN BY DOING", audiobook: "TELL IT ALOUD" };
export function FormatGrid({ selected, onSelect }: { selected?: string; onSelect?: (id: string) => void }) {
  const grid = useRef<HTMLDivElement>(null), [animate, setAnimate] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { setAnimate(true); observer.disconnect(); } }, { threshold: .1 });
    if (grid.current) observer.observe(grid.current);
    return () => observer.disconnect();
  }, []);
  function tilt(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === "touch" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const card = event.currentTarget, bounds = card.getBoundingClientRect(), x = (event.clientX - bounds.left) / bounds.width, y = (event.clientY - bounds.top) / bounds.height;
    card.style.setProperty("--tilt-x", `${(0.5 - y) * 5}deg`); card.style.setProperty("--tilt-y", `${(x - 0.5) * 6}deg`);
    card.style.setProperty("--spot-x", `${x * 100}%`); card.style.setProperty("--spot-y", `${y * 100}%`);
  }
  function reset(event: PointerEvent<HTMLElement>) { event.currentTarget.style.setProperty("--tilt-x", "0deg"); event.currentTarget.style.setProperty("--tilt-y", "0deg"); }
  return <div className="studio-format-grid" ref={grid} data-animate={animate ? "ready" : undefined}>{BOOK_FORMATS.map((format, index) => {
    const content = <><div className="studio-format-art"><span className={`studio-format-icon ${format.color}`}><FormatIcon id={format.id} className="h-7 w-7" /></span><span className="studio-card-kicker">{labels[format.id]}</span><span className="studio-card-decoration" aria-hidden="true" /></div><div className="studio-format-heading"><h3>{format.name}</h3>{selected === format.id && <span className="studio-card-selected"><Check className="h-3 w-3" /></span>}</div><div className="studio-format-meta"><span>{format.credits} credit</span><span>{format.pages}</span></div><p>{format.description}</p><span className="studio-format-start">{onSelect ? selected === format.id ? "Selected" : "Choose format" : "Get Started"}<span><ArrowRight className="h-4 w-4" /></span></span></>;
    const props = { className: `studio-format-card premium ${selected === format.id ? "selected" : ""}`, "data-format": format.id, style: { "--card-index": index } as CSSProperties, onPointerMove: tilt, onPointerLeave: reset };
    return onSelect ? <button type="button" key={format.id} {...props} aria-pressed={selected === format.id} onClick={() => onSelect(format.id)}>{content}</button> : <Link key={format.id} {...props} href={`/books/new?format=${format.id}`}>{content}</Link>;
  })}</div>;
}
