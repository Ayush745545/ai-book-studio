"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { BOOK_FORMATS, type BookFormat } from "@/lib/book-formats";
import { getFormatById } from "@/lib/book-formats";
import { X, ArrowRight, Bot, Sparkles } from "@/components/icons";

interface FormatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function iconFor(name: string, className?: string) {
  switch (name) {
    case "BookOpen":
      return <BookOpenIcon className={className} />;
    case "Tablet":
      return <TabletIcon className={className} />;
    case "Compass":
      return <CompassIcon className={className} />;
    case "ClipboardList":
      return <ClipboardListIcon className={className} />;
    case "Headphones":
      return <HeadphonesIcon className={className} />;
    default:
      return <Sparkles className={className} />;
  }
}

function BookOpenIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "h-6 w-6"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function TabletIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "h-6 w-6"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M12 18h.01" />
    </svg>
  );
}

function CompassIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "h-6 w-6"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function ClipboardListIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "h-6 w-6"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </svg>
  );
}

function HeadphonesIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "h-6 w-6"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 14v-2a9 9 0 0 1 18 0v2" />
      <path d="M21 16a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v5z" />
      <path d="M3 16a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v5z" />
    </svg>
  );
}

export function FormatSelectionModal({ isOpen, onClose }: FormatModalProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiThinking, setAiThinking] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedId(null);
      setShowAI(false);
      setAiPrompt("");
      setAiThinking(false);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSelect = useCallback((formatId: string) => {
    setSelectedId(formatId);
    timerRef.current = setTimeout(() => {
      const format = getFormatById(formatId);
      if (format) {
        router.push(`/books/new?format=${format.id}`);
      }
      onClose();
    }, 400);
  }, [router, onClose]);

  const recommendFormat = useCallback((text: string): string | null => {
    const t = text.toLowerCase();
    if (/(listen|audio|voice|narration|read to me|spoken|hearing)/.test(t)) return "audiobook";
    if (/(learn|teach|how to|tutorial|guide|understand|skill|lesson|educate)/.test(t)) return "guide";
    if (/(exercise|worksheet|practice|activity|quiz|workout|drill|answer key)/.test(t)) return "workbook";
    if (/(digital|e-?book|tablet|kindle|electronic|read on)/.test(t)) return "ebook";
    if (/(story|novel|book|fiction|author|chapter|publish|authority)/.test(t)) return "book";
    return null;
  }, []);

  const handleAIRecommend = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    setAiThinking(true);
    await new Promise((r) => setTimeout(r, 1200));
    const result = recommendFormat(aiPrompt);
    setAiThinking(false);
    if (result) {
      handleSelect(result);
    }
  }, [aiPrompt, recommendFormat, handleSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") handleClose();
  }, [handleClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      autoFocus
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="absolute top-[15%] left-1/2 -translate-x-1/2 h-[180px] w-[180px] overflow-hidden rounded-full opacity-20 pointer-events-none">
        <video src="/covers/Untitled - September 21, 2026 at 18.21.22.mp4" autoPlay muted loop playsInline className="h-full w-full object-cover" />
      </div>
      <div className="animate-modal-in relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#0f0f14]/95 p-6 sm:p-10 shadow-2xl shadow-black/50 backdrop-blur-xl">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-white/5 hover:text-zinc-300"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Choose your format
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
            Start with the format that fits your idea. You can write, design, publish, and promote it inside AI Book Studio.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BOOK_FORMATS.map((format, i) => (
            <FormatCard
              key={format.id}
              format={format}
              index={i}
              selected={selectedId === format.id}
              onSelect={handleSelect}
            />
          ))}
        </div>

        <AIRecommendSection
          show={showAI}
          aiPrompt={aiPrompt}
          setAiPrompt={setAiPrompt}
          aiThinking={aiThinking}
          onStart={() => setShowAI(true)}
          onRecommend={handleAIRecommend}
        />
      </div>
    </div>
  );
}

interface FormatCardProps {
  format: BookFormat;
  index: number;
  selected: boolean;
  onSelect: (id: string) => void;
}

function FormatCard({ format, index, selected, onSelect }: FormatCardProps) {
  return (
    <button
      onClick={() => onSelect(format.id)}
      className={`animate-card-stagger group relative flex flex-col items-start rounded-2xl border p-5 text-left transition-all duration-300 ${
        selected
          ? "border-indigo-400/60 bg-indigo-500/10 shadow-lg shadow-indigo-500/20"
          : "border-white/10 bg-white/[0.03] hover:border-indigo-400/40 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-indigo-500/15 hover:-translate-y-1"
      }`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 text-indigo-300 transition group-hover:from-indigo-500/30 group-hover:to-violet-500/30">
        {iconFor(format.icon, "h-5 w-5")}
      </div>
      <h3 className="text-base font-bold text-white">{format.name}</h3>
      <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
        <span>{format.credits} credit</span>
        <span className="h-3 w-px bg-zinc-700" />
        <span>{format.pages}</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-zinc-400">{format.description}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 transition group-hover:text-indigo-300">
        Get Started <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

interface AIRecommendSectionProps {
  show: boolean;
  aiPrompt: string;
  setAiPrompt: (v: string) => void;
  aiThinking: boolean;
  onStart: () => void;
  onRecommend: () => void;
}

function AIRecommendSection({ show, aiPrompt, setAiPrompt, aiThinking, onStart, onRecommend }: AIRecommendSectionProps) {
  return (
    <div className="mt-6">
      {!show ? (
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onStart}
            className="h-[120px] w-[120px] overflow-hidden rounded-full ring-1 ring-white/10 ring-offset-2 ring-offset-[#0f0f14] transition hover:scale-105 hover:shadow-xl hover:shadow-indigo-500/20 hover:ring-indigo-400/40"
            title="Let AI recommend a format"
          >
            <video src="/covers/Untitled - September 21, 2026 at 18.21.22.mp4" autoPlay muted loop playsInline className="h-full w-full object-cover" />
          </button>
        </div>
      ) : (
        <div className="animate-fade-in rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="h-4 w-4 text-indigo-400" />
            <span className="text-sm font-semibold text-white">AI Format Recommender</span>
          </div>
          <p className="text-xs text-zinc-500 mb-3">Tell us what you want to create and we&apos;ll recommend the best format.</p>
          <div className="flex gap-2">
            <input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g. I want to teach cooking to beginners"
              className="input flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") onRecommend();
              }}
            />
            <button
              onClick={onRecommend}
              disabled={!aiPrompt.trim() || aiThinking}
              className="btn-primary shrink-0"
            >
              {aiThinking ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
