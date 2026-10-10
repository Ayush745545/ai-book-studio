"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, Download, PenLine, Sparkles } from "@/components/icons";

export function HomeMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPaused(media.matches);
    const update = () => setPaused(media.matches);
    media.addEventListener("change", update);
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.setAttribute("data-visible", "true"); observer.unobserve(entry.target); } });
    }, { threshold: 0.12 });
    root.current?.querySelectorAll("[data-reveal]").forEach(element => observer.observe(element));
    return () => { observer.disconnect(); media.removeEventListener("change", update); };
  }, []);
  return <div ref={root} className="studio-home-motion" data-motion={paused ? "paused" : "playing"}>
    <div className="studio-home-tools"><span>A SPACE FOR YOUR NEXT CHAPTER</span><button aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? "Play motion" : "Pause motion"}<span aria-hidden="true">{paused ? "▷" : "Ⅱ"}</span></button></div>
    {children}
  </div>;
}

const stages = [
  { name: "Plan", eyebrow: "A LITTLE STRUCTURE. A LOT OF POSSIBILITY.", title: "Give your idea a clear direction.", copy: "Start with your reader and the change you want to make. Build an outline, move chapters around, and keep your research beside the page.", points: ["An outline for your chosen format", "A home for chapter notes", "Your audience, tone, and goal"], link: "Shape your idea" },
  { name: "Write", eyebrow: "YOUR VOICE, WITH ROOM TO GROW.", title: "Stay with the thought. We’ll keep the page.", copy: "Settle into a focused editor with autosave and saved versions. Connect OpenRouter when you want help drafting or refining a passage.", points: ["Autosave as you work", "Restore an earlier version", "Review AI suggestions before adding them"], link: "Find your writing space" },
  { name: "Export", eyebrow: "FROM YOUR DESK TO THEIR HANDS.", title: "Make something ready to be read.", copy: "Bring your chapters together, preview the manuscript, and give it a cover. Download a PDF, EPUB, or plain text file when you’re ready.", points: ["Print settings that fit your book", "EPUB for digital reading", "A script for your audiobook"], link: "Create your first project" },
];

export function StudioTour() {
  const [active, setActive] = useState(0);
  const stage = stages[active];
  const tabs = useRef<HTMLDivElement>(null);
  return <section className="studio-tour" id="studio-tour" data-reveal>
    <div className="studio-section-heading"><div><span className="studio-eyebrow">MEET YOUR WRITING SPACE</span><h2>From “what if” to the final page.</h2></div><p>A little structure.<br />More room for your imagination.</p></div>
    <div className="studio-tour-tabs" role="tablist" aria-label="Explore the studio" ref={tabs}>{stages.map((item, index) => <button key={item.name} role="tab" id={`tour-tab-${index}`} aria-controls={`tour-panel-${index}`} aria-selected={active === index} tabIndex={active === index ? 0 : -1} onClick={() => setActive(index)} onKeyDown={event => {
      let next = index;
      if (event.key === "ArrowRight") next = (index + 1) % 3;
      else if (event.key === "ArrowLeft") next = (index + 2) % 3;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = 2;
      else return;
      event.preventDefault(); setActive(next); tabs.current?.querySelectorAll<HTMLButtonElement>("button")[next].focus();
    }}><span>0{index + 1}</span>{item.name}</button>)}</div>
    <div className="studio-tour-panel" role="tabpanel" id={`tour-panel-${active}`} aria-labelledby={`tour-tab-${active}`} key={active}>
      <div className="studio-tour-copy"><span className="studio-eyebrow">{stage.eyebrow}</span><h3>{stage.title}</h3><p>{stage.copy}</p><ul>{stage.points.map(point => <li key={point}><Check />{point}</li>)}</ul><Link href="/books/new" className="studio-text-link">{stage.link}<ArrowRight /></Link></div>
      <div className={`studio-tour-visual stage-${active}`} aria-label={`${stage.name} workspace illustration`}>
        <div className="studio-demo-bar"><span><i /><i /><i /></span><small>THE ART OF BEGINNING · EXAMPLE PROJECT</small><BookOpen /></div>
        {active === 0 ? <div className="studio-demo-outline"><span className="studio-eyebrow">YOUR TABLE OF CONTENTS</span><h4>Every chapter has a purpose.</h4>{["Start where you are", "Make space for the idea", "Find a rhythm that lasts", "Share what you’ve learned"].map((title, i) => <div className="studio-demo-chapter" key={title} style={{ "--step": i } as React.CSSProperties}><span>0{i + 1}</span><strong>{title}</strong><Check /></div>)}</div>
        : active === 1 ? <div className="studio-demo-page"><span className="studio-eyebrow">CHAPTER ONE</span><h4>Start where you are.</h4><p>You don’t need the whole story to begin. Sometimes, all you need is a quiet moment and one honest sentence.</p><div className="studio-ink-lines" aria-hidden="true"><i /><i /><i /><i /></div><span className="studio-demo-save"><Check />Your words, kept safe</span><span className="studio-demo-ai"><Sparkles />A fresh perspective, when you need it.</span></div>
        : <div className="studio-demo-export"><div className="studio-mini-book"><BookOpen /><h4>The art of<br /><em>beginning.</em></h4><span>YOUR NAME</span></div><div className="studio-export-files">{["PDF · Ready for print", "EPUB · Ready for readers", "TXT · Ready for what’s next"].map((text, i) => <div key={text} style={{ "--step": i } as React.CSSProperties}><Download /><span>{text}</span><Check /></div>)}</div></div>}
      </div>
    </div>
  </section>;
}

export function HomeSections() {
  return <>
    <StudioTour />
    <section className="studio-craft-section" data-reveal>
      <div className="studio-craft-copy"><span className="studio-eyebrow">BUILT FOR THE DAYS BETWEEN</span><h2>Good books grow.<br /><em>One session at a time.</em></h2><p>A place to keep your ideas, find your rhythm, and see how far you’ve come.</p><Link href="/dashboard" className="studio-text-link">Make yourself at home<ArrowRight /></Link></div>
      <div className="studio-craft-grid">
        <article><PenLine /><h3>Less clutter. More writing.</h3><p>A focused page, chapter notes, and a structure you can change as your ideas grow.</p></article>
        <article><div className="studio-rhythm-art" aria-hidden="true">{Array.from({ length: 28 }, (_, i) => <i key={i} style={{ "--step": i % 7, opacity: [0.25, 0.5, 0.8, 1][(i * 3) % 4] } as React.CSSProperties} />)}</div><h3>Small steps, made visible.</h3><p>Your writing calendar tracks saved edits and streaks so you can see your progress.</p></article>
        <article><Sparkles /><h3>A partner for the blank page.</h3><p>Bring your OpenRouter key for AI drafting and editing. You decide what belongs in your book.</p></article>
        <article><BookOpen /><h3>Your next version is safe.</h3><p>Explore a new direction with saved versions you can return to as you refine your work.</p></article>
      </div>
    </section>
    <section className="studio-home-faq" data-reveal><div><span className="studio-eyebrow">BEFORE YOUR FIRST CHAPTER</span><h2>A few things<br />you might wonder.</h2><p>Your story starts with a little clarity.</p></div><div className="studio-faq-list">
      {[
        ["Do I need a finished idea to start?", "A working title is enough. Choose a format, describe your reader, and shape an outline. You can change your title, chapters, and notes as you write."],
        ["Can I write without AI?", "Yes. The editor, autosave, saved versions, and document exports work without a provider key. Connect OpenRouter in Settings whenever you want AI writing help."],
        ["What can I download?", "Export your manuscript as a PDF, EPUB, or plain text file. Audiobook projects include a narration script and a device voice preview. Downloadable AI audio requires a separately configured audio provider."],
        ["Will my book have exactly the listed number of pages?", "Page counts are planning targets. Your finished length depends on how much you write and the font, spacing, and page size you choose."],
      ].map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}
    </div></section>
    <section className="studio-home-invitation" data-reveal><div className="studio-invitation-orbits" aria-hidden="true"><i /><i /><i /></div><span className="studio-eyebrow">THERE’S A BOOK ONLY YOU CAN WRITE</span><h2>Let’s start with<br /><em>the first page.</em></h2><p>Your ideas have been waiting long enough.</p><Link href="/books/new" className="studio-button">Start my book<ArrowRight /></Link><Link href="#formats" className="studio-invitation-secondary">Explore the five formats</Link></section>
    <footer className="studio-home-footer"><Link href="/" className="studio-footer-brand"><BookOpen />Book Studio<span>A little idea. A whole new chapter.</span></Link><nav aria-label="Footer"><Link href="#formats">Formats</Link><Link href="#studio-tour">The studio</Link><Link href="/store">Bookstore</Link><Link href="/dashboard">My projects</Link></nav></footer>
  </>;
}
