"use client";

import { useEffect, useRef, createContext, useContext } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type SmoothCtx = { ready: boolean };
const Ctx = createContext<SmoothCtx>({ ready: false });

export const useSmoothScroll = () => useContext(Ctx);

const LERP_EASE = 0.11;
const LERP_THRESHOLD = 0.05;

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const prefersReduced = typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const supportBackdropFilter =
      typeof document !== "undefined" &&
      "backdropFilter" in (document.body.style as any);

    const docRoot = document.documentElement;
    docRoot.style.scrollBehavior = "auto";
    docRoot.style.overscrollBehavior = "none";

    const pathname = typeof window !== "undefined" ? window.location.pathname : "";
    const onEditor =
      /^\/books\//.test(pathname) ||
      /^\/dashboard\/?$/.test(pathname) === false && /\/edit/.test(pathname);
    const bypassVirtual = (typeof navigator !== "undefined" &&
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) || onEditor;

    if (
      prefersReduced ||
      typeof window === "undefined" ||
      !supportBackdropFilter ||
      bypassVirtual
    ) {
      ScrollTrigger.defaults({ scroller: window });
      docRoot.style.scrollBehavior = "smooth";

      const revealEls = gsap.utils.toArray<HTMLElement>(".reveal, .section-reveal");
      const st: ScrollTrigger[] = [];
      revealEls.forEach((el) => {
        const t = gsap.fromTo(
          el,
          { y: 24, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power3.out",
            paused: true,
          }
        );
        st.push(
          ScrollTrigger.create({
            trigger: el,
            start: "top 90%",
            once: true,
            onEnter: () => t.play(),
          })
        );
      });

      return () => {
        docRoot.style.scrollBehavior = "auto";
        st.forEach((s) => s.kill());
      };
    }

    const scroller = scrollerRef.current;
    const content = contentRef.current;
    if (!scroller || !content) return;

    let target = 0;
    let current = 0;
    let viewport = window.innerHeight;
    let contentHeight = 0;
    let maxScroll = 0;
    let rafId = 0;
    let rafRunning = false;
    let resizeRaf = 0;
    let scrollTriggerRefreshTimer: ReturnType<typeof setTimeout> | null = null;

    const setBodyHeight = () => {
      contentHeight = content.getBoundingClientRect().height;
      maxScroll = Math.max(0, contentHeight - viewport);
      document.body.style.height = contentHeight + "px";
      if (target > maxScroll) target = maxScroll;
    };

    const syncViewport = () => {
      viewport = window.innerHeight;
      scroller.style.height = viewport + "px";
      setBodyHeight();
      if (scrollTriggerRefreshTimer) clearTimeout(scrollTriggerRefreshTimer);
      scrollTriggerRefreshTimer = setTimeout(() => {
        ScrollTrigger.refresh();
      }, 120);
    };

    const onScroll = () => {
      target = window.scrollY || window.pageYOffset || 0;
      if (target > maxScroll) target = maxScroll;
      if (target < 0) target = 0;
      if (!rafRunning) {
        rafRunning = true;
        rafId = requestAnimationFrame(tick);
      }
    };

    const tick = () => {
      const diff = target - current;
      if (Math.abs(diff) < LERP_THRESHOLD) {
        current = target;
        scroller.style.transform = `translate3d(0, ${-current}px, 0)`;
        rafRunning = false;
        return;
      }
      current += diff * LERP_EASE;
      scroller.style.transform = `translate3d(0, ${-current}px, 0)`;
      rafId = requestAnimationFrame(tick);
    };

    ScrollTrigger.defaults({ scroller: scroller });
    ScrollTrigger.scrollerProxy(scroller, {
      scrollTop(value) {
        if (arguments.length && typeof value === "number") {
          window.scrollTo({ top: value, behavior: "auto" });
          return value;
        }
        return current;
      },
      getBoundingClientRect() {
        return {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
          right: window.innerWidth,
          bottom: window.innerHeight,
        };
      },
    });

    docRoot.classList.add("sscroll-on");
    content.style.position = "fixed";
    content.style.top = "0";
    content.style.left = "0";
    content.style.width = "100%";
    content.style.willChange = "transform";
    content.style.backfaceVisibility = "hidden";
    scroller.style.position = "relative";
    scroller.style.width = "100%";
    scroller.style.backfaceVisibility = "hidden";
    scroller.style.willChange = "transform";
    scroller.style.transform = "translate3d(0, 0, 0)";

    const onScrollPassive = onScroll as EventListener;
    const onResize = () => {
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(syncViewport);
    };

    window.addEventListener("scroll", onScrollPassive, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });

    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        if (resizeRaf) cancelAnimationFrame(resizeRaf);
        resizeRaf = requestAnimationFrame(setBodyHeight);
      });
      ro.observe(content);
    }

    syncViewport();

    const revealEls = gsap.utils.toArray<HTMLElement>(".reveal");
    revealEls.forEach((el) => {
      const tween = gsap.fromTo(
        el,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.85,
          ease: "power3.out",
          paused: true,
        }
      );
      ScrollTrigger.create({
        trigger: el,
        start: "top 88%",
        end: "bottom 15%",
        toggleActions: "play none none reverse",
        onEnter: () => tween.play(),
        onLeaveBack: () => tween.reverse(),
      });
    });

    gsap.utils.toArray<HTMLElement>(".section-reveal").forEach((el) => {
      const tween = gsap.fromTo(
        el,
        { y: 48, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1.0,
          ease: "power4.out",
          paused: true,
        }
      );
      ScrollTrigger.create({
        trigger: el,
        start: "top 92%",
        once: true,
        onEnter: () => tween.play(),
      });
    });

    const onVis = () => {
      if (document.hidden) {
        if (rafRunning) {
          cancelAnimationFrame(rafId);
          rafRunning = false;
        }
      } else {
        if (!rafRunning && Math.abs(target - current) >= LERP_THRESHOLD) {
          rafRunning = true;
          rafId = requestAnimationFrame(tick);
        }
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(rafId);
      cancelAnimationFrame(resizeRaf);
      if (scrollTriggerRefreshTimer) clearTimeout(scrollTriggerRefreshTimer);
      window.removeEventListener("scroll", onScrollPassive);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      ro?.disconnect();
      ScrollTrigger.getAll().forEach((st) => st.kill());
      docRoot.classList.remove("sscroll-on");
      document.body.style.height = "";
      content.style.position = "";
      content.style.top = "";
      content.style.left = "";
      content.style.width = "";
      content.style.willChange = "";
      content.style.backfaceVisibility = "";
      scroller.style.transform = "";
      scroller.style.position = "";
      scroller.style.willChange = "";
      scroller.style.backfaceVisibility = "";
      ScrollTrigger.defaults({ scroller: window });
    };
  }, []);

  return (
    <Ctx.Provider value={{ ready: true }}>
      <div ref={contentRef}>
        <div ref={scrollerRef}>{children}</div>
      </div>
    </Ctx.Provider>
  );
}
