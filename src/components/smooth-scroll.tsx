"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

/**
 * Site-wide GSAP smooth scroll + scroll-reveal system.
 *
 * - Lenis provides the buttery inertial wheel/touch scroll; GSAP's ticker
 *   drives it and keeps ScrollTrigger in sync (no fixed/transform hacks, so
 *   sticky headers, anchors and mobile keep working).
 * - Declarative reveals: add these classes anywhere —
 *     .section-reveal   → whole section fades/rises in once
 *     .reveal           → single block fades/rises in once
 *     .reveal-stagger   → children animate in with a stagger
 * - Respects prefers-reduced-motion (everything stays visible, no smoothing).
 */
export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // ── Scroll reveals (run regardless of smoothing) ────────────────
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".section-reveal").forEach((el) => {
        gsap.fromTo(
          el,
          { y: 48, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1,
            ease: "power4.out",
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          }
        );
      });

      gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) => {
        gsap.fromTo(
          el,
          { y: 24, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 90%", once: true },
          }
        );
      });

      gsap.utils.toArray<HTMLElement>(".reveal-stagger").forEach((container) => {
        const items = container.querySelectorAll<HTMLElement>(":scope > *");
        if (!items.length) return;
        gsap.fromTo(
          items,
          { y: 32, opacity: 0, scale: 0.98 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.7,
            ease: "power3.out",
            stagger: 0.08,
            scrollTrigger: { trigger: container, start: "top 85%", once: true },
          }
        );
      });
    });

    if (reduced) {
      return () => ctx.revert();
    }

    // ── Lenis smooth scroll synced with GSAP ────────────────────────
    const lenis = new Lenis({
      lerp: 0.12,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
    });
    lenis.on("scroll", () => ScrollTrigger.update());
    const ticker = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(ticker);
    gsap.ticker.lagSmoothing(0);

    // In-page anchor links glide instead of jumping
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as Element)?.closest?.('a[href^="#"]');
      if (!anchor) return;
      const id = anchor.getAttribute("href")?.slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        lenis.scrollTo(target, { offset: -88 });
      }
    };
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      gsap.ticker.remove(ticker);
      lenis.destroy();
      ctx.revert();
    };
  }, []);

  return <>{children}</>;
}
