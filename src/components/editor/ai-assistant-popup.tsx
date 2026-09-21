"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/client";
import { useToast } from "@/components/ui/toast";
import { useUserSettings } from "@/components/user-settings-context";
import {
  X,
  Spinner,
  Send,
  Sparkles,
  Wand,
  Settings,
  Lightbulb,
  Book,
  BookOpen,
  Users,
  Rocket,
  Flame,
  RefreshCw,
} from "@/components/icons";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
}

interface AIAssistantPopupProps {
  bookId: string;
  chapterId: string | null;
  chapterTitle: string;
  onClose: () => void;
  onInsert: (text: string) => void;
}

export function AIAssistantPopup({
  bookId,
  chapterId,
  chapterTitle,
  onClose,
  onInsert,
}: AIAssistantPopupProps) {
  const toast = useToast();
  const userSettings = useUserSettings();
  const provider = userSettings.effectiveProvider;
  const model = userSettings.effectiveModel;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text:
        "Hi, I'm your AI writing assistant. Tell me what you'd like to write, improve, or brainstorm. You can also ask me to continue a chapter, fix the pacing, or give you alternate versions. Try the quick ideas below 👇",
    },
  ]);

  const [pos, setPos] = useState({ left: 0, top: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, left: 0, top: 0 });
  const hasAnimated = useRef(false);
  const [fetchingModels, setFetchingModels] = useState(false);

  useEffect(() => {
    setPos({ left: window.innerWidth - 494, top: 80 });
    hasAnimated.current = false;
  }, []);

  async function fetchModels() {
    if (provider !== "openrouter") return;
    setFetchingModels(true);
    try {
      const base = (userSettings.settings.openRouterBaseUrl || "https://openrouter.ai/api/v1").replace(/\/+$/, "");
      const res = await fetch(`${base}/models`, {
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || ""}` },
      });
      if (!res.ok) throw new Error(`Failed to fetch models (${res.status})`);
      const data = (await res.json()) as { data?: { id?: string }[] };
      const models = (data.data ?? []).map((m) => m.id ?? "").filter(Boolean);
      if (models.length === 0) {
        toast("No models found. Check your API key and connection.", "error");
      } else {
        userSettings.setAvailableModels(models);
        if (!userSettings.settings.openRouterModel || !models.includes(userSettings.settings.openRouterModel)) {
          userSettings.setSettings({ openRouterModel: models[0] });
        }
        toast(`Loaded ${models.length} models`, "success");
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to fetch models", "error");
    } finally {
      setFetchingModels(false);
    }
  }

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest("button, a, textarea, input")) return;
      e.preventDefault();
      hasAnimated.current = true;
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        left: pos.left,
        top: pos.top,
      };
    },
    [pos.left, pos.top]
  );

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      const d = dragStartRef.current;
      const newLeft = d.left + (e.clientX - d.x);
      const newTop = d.top + (e.clientY - d.y);
      setPos({
        left: Math.max(0, Math.min(window.innerWidth - 470, newLeft)),
        top: Math.max(0, Math.min(window.innerHeight - 640, newTop)),
      });
    };
    const onUp = () => setIsDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging]);

  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  useEffect(() => {
    const t = setTimeout(() => textareaRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, []);

  const SUGGESTIONS: { icon: React.ReactNode; label: string; prompt: string }[] = [
    {
      icon: <Wand className="h-3.5 w-3.5" />,
      label: "Rewrite this chapter",
      prompt: "Please rewrite the current chapter to improve flow, imagery, and tension while keeping the original story points. Keep it in the same POV and style.",
    },
    {
      icon: <BookOpen className="h-3.5 w-3.5" />,
      label: "Continue the story",
      prompt: "Continue the current chapter naturally for about 200–300 words, advancing the scene and building towards the next beat. Stay in the same POV and voice.",
    },
    {
      icon: <Users className="h-3.5 w-3.5" />,
      label: "Deepen characters",
      prompt: "Analyze the current chapter and suggest 3 specific edits that deepen character voice, add small mannerisms, or sharpen dialogue so each character sounds distinct.",
    },
    {
      icon: <Lightbulb className="h-3.5 w-3.5" />,
      label: "Pacing & tension",
      prompt: "Look at the current chapter and give me 3 targeted improvements to pacing and tension. Be concise and actionable.",
    },
    {
      icon: <Flame className="h-3.5 w-3.5" />,
      label: "Hook the reader",
      prompt: "Rewrite the opening of the current chapter to give it a stronger hook that pulls the reader in immediately. Keep it the same length.",
    },
    {
      icon: <Book className="h-3.5 w-3.5" />,
      label: "Chapter outline",
      prompt: "Based on the current chapter content, suggest a 5-point outline for the next chapter, including a midpoint twist and a cliffhanger ending.",
    },
  ];

  async function send(promptText?: string) {
    const text = (promptText ?? input).trim();
    if (!text || streaming) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      text,
    };
    const assistantId = `a-${Date.now() + 1}`;
    setMessages((m) => [
      ...m,
      userMsg,
      { id: assistantId, role: "assistant", text: "" },
    ]);
    setInput("");
    setStreaming(true);

    const isJsonLike = (s: string) =>
      (s.startsWith("{") && s.includes("\"result\"")) ||
      (s.startsWith("{") && s.includes("result"));
    const stripAsterisks = (s: string) =>
      s.replace(/\*\*/g, "").replace(/(^|\s)\*(?=\S)/g, "$1").replace(/(\S)\*(?=\s|$)/g, "$1");
    const unwrap = (s: string) => {
      if (!isJsonLike(s.trimStart())) return s;
      try {
        const obj = JSON.parse(s.trim());
        if (typeof obj?.result === "string") return obj.result;
        return s;
      } catch {
        return s;
      }
    };

    try {
      const body = userSettings.applyToPayload({
        message: text,
        chapterTitle: chapterTitle || undefined,
        chapterId: chapterId ?? undefined,
        stream: true,
      });
      const res = await fetch(`/api/books/${bookId}/ai-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok || !res.body) {
        // Try extracting non-stream JSON from error body
        let msg = "AI request failed";
        try {
          const errText = await res.text();
          msg = unwrap(errText) || msg;
        } catch {}
        throw new Error(msg);
      }

      const contentType = res.headers.get("content-type") || "";
      const isStream = contentType.includes("text/plain") || body.stream;

      if (!isStream) {
        const raw = await res.text();
        setMessages((ms) =>
          ms.map((m) =>
            m.id === assistantId ? { ...m, text: stripAsterisks(unwrap(raw)) } : m
          )
        );
      } else {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          const chunk = decoder.decode(value || new Uint8Array(), { stream: !done });
          buffer += chunk;
          setMessages((ms) =>
            ms.map((m) =>
              m.id === assistantId ? { ...m, text: stripAsterisks(unwrap(buffer)) } : m
            )
          );
          if (done) break;
        }
      }
    } catch (e) {
      setMessages((ms) =>
        ms.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                text:
                  "⚠️ Couldn't reach the AI. If you're using OpenAI, check your API key. If you're using OpenRouter, check your API key.",
              }
            : m
        )
      );
      toast("AI request failed", "error");
    } finally {
      setStreaming(false);
    }
  }

return (
    <div
      className={`fixed z-[100] flex h-[640px] w-[470px] max-w-[92vw] flex-col overflow-hidden rounded-[26px] border border-white/60 bg-white shadow-[0_30px_90px_-30px_rgba(79,70,229,0.55),0_15px_40px_-15px_rgba(30,27,75,0.35),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-2xl ${!hasAnimated.current ? "animate-slidein" : ""} ${isDragging ? "" : ""}`}
      style={{
        left: `${pos.left}px`,
        top: `${pos.top}px`,
      }}
      data-lenis-prevent
    >
      <style>{`
        @keyframes slidein {
          from { opacity: 0; transform: translateX(16px) translateY(-8px) scale(.98); }
          to   { opacity: 1; transform: translateX(0) translateY(0) scale(1); }
        }
        .animate-slidein { animation: slidein .26s cubic-bezier(.2,1.05,.36,1); }
        .grain { background-image: radial-gradient(rgba(255,255,255,.18) 1px, transparent 1px); background-size: 3px 3px; }
      `}</style>

      {/* Drag handle — only the header strip is draggable, so clicking inside
          the chat, the input, or the model picker never accidentally moves it. */}
      <div
        className="relative cursor-grab select-none border-b border-zinc-100/80 bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 px-5 pb-4 pt-5"
        onMouseDown={handleDragStart}
      >
        <div className="pointer-events-none absolute inset-0 grain opacity-40 mix-blend-overlay" />
        <div className="pointer-events-none absolute -top-16 right-0 h-40 w-40 rounded-full bg-gradient-to-br from-indigo-400/25 via-violet-400/20 to-fuchsia-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-8 h-32 w-32 rounded-full bg-gradient-to-br from-sky-300/15 to-indigo-300/15 blur-3xl" />

        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-[0_10px_22px_-10px_rgba(99,102,241,0.85)] ring-1 ring-white/60">
              <Sparkles className="h-5 w-5" />
              <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/30" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[15px] font-extrabold tracking-tight text-zinc-900">
                  AI Writing Assistant
                </p>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 shadow-sm ring-1 ring-inset ring-white/60">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,.9)]" />
                  {provider === "openrouter" ? "Cloud · OpenRouter" : "OpenAI"}
                </span>
              </div>
              <p className="mt-0.5 truncate text-[12px] text-zinc-500">
                {chapterTitle ? `Editing: ${chapterTitle}` : "Pick a chapter to get started"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/settings"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-white/80 hover:text-zinc-700 hover:shadow-sm"
              title="Provider / model settings"
            >
              <Settings className="h-4 w-4" />
            </Link>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-white/80 hover:text-zinc-700 hover:shadow-sm"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="relative mt-4 flex items-center justify-between gap-3 rounded-2xl border border-indigo-100/90 bg-white/90 px-3.5 py-2.5 shadow-[0_6px_18px_-10px_rgba(79,70,229,0.35)] ring-1 ring-inset ring-white/80 backdrop-blur">
          <div className="min-w-0 flex items-center gap-2.5">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-100 via-violet-100 to-fuchsia-100 text-indigo-600 shadow-sm ring-1 ring-inset ring-white/80">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold text-zinc-800">
                {provider === "openrouter" ? "🌐 OpenRouter" : "✨ OpenAI"} · <span className="font-mono text-zinc-700">{model}</span>
              </p>
              <p className="truncate text-[10px] text-zinc-500">
                {userSettings.settings.temperature.toFixed(2)} temp ·{" "}
                {userSettings.settings.contextWindow.toLocaleString()} token context
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {provider === "openrouter" && (
              <button
                onClick={fetchModels}
                disabled={fetchingModels}
                className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-[10px] font-medium text-zinc-600 transition hover:bg-white/10 disabled:opacity-50"
                title="Fetch available models from OpenRouter"
              >
                {fetchingModels ? (
                  <Spinner className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                {fetchingModels ? "Loading…" : "Models"}
              </button>
            )}
            {provider === "openrouter" && userSettings.availableModels.length > 0 && (
              <select
                value={model}
                onChange={(e) => userSettings.setSettings({ openRouterModel: e.target.value })}
                className="max-w-[140px] rounded-lg border border-white/10 bg-white/5 px-1.5 py-1.5 text-[10px] font-mono text-zinc-700 outline-none focus:border-indigo-300"
              >
                {userSettings.availableModels.map((m) => (
                  <option key={m} value={m} className="bg-white">
                    {m}
                  </option>
                ))}
              </select>
            )}
            <Link
              href="/settings"
              className="shrink-0 rounded-xl bg-gradient-to-br from-zinc-50 to-white px-2.5 py-1.5 text-[10px] font-bold text-zinc-700 ring-1 ring-zinc-200 transition hover:from-indigo-50 hover:to-violet-50 hover:text-indigo-700 hover:ring-indigo-200"
            >
              Configure →
            </Link>
          </div>
        </div>
      </div>

      <div ref={bodyRef} data-lenis-prevent className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-zinc-50/80 via-white/70 to-white px-4 py-4">
        {messages.map((m) => (
          <ChatRow key={m.id} m={m} streaming={streaming} onInsert={onInsert} />
        ))}

        {messages.length <= 1 && !input && (
          <div className="mt-1 grid grid-cols-1 gap-2">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => send(s.prompt)}
                disabled={streaming}
                className="group relative flex w-full items-start gap-2.5 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white px-3.5 py-3 text-left transition hover:-translate-y-[1px] hover:border-indigo-200 hover:bg-gradient-to-br hover:from-white hover:to-indigo-50/50 hover:shadow-[0_10px_22px_-14px_rgba(79,70,229,0.45)] disabled:opacity-60 disabled:hover:translate-y-0"
              >
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-fuchsia-500/5 opacity-0 transition group-hover:opacity-100" />
                <span className="relative mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-50 to-violet-50 text-indigo-600 ring-1 ring-inset ring-white/80 transition group-hover:from-indigo-100 group-hover:to-violet-100 group-hover:ring-indigo-200">
                  {s.icon}
                </span>
                <span className="relative flex-1 text-[13px] font-semibold leading-snug text-zinc-800 group-hover:text-indigo-900">
                  {s.label}
                </span>
                <span className="relative ml-auto text-[10px] font-bold text-zinc-300 transition group-hover:text-indigo-500">
                  Run <Rocket className="ml-0.5 inline h-2.5 w-2.5 -translate-y-px" />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-zinc-100/80 bg-gradient-to-b from-white to-zinc-50/80 px-4 pb-4 pt-3">
        <div className="relative flex items-end gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-[0_8px_24px_-14px_rgba(30,27,75,0.25)] transition focus-within:border-indigo-200 focus-within:shadow-[0_10px_30px_-14px_rgba(79,70,229,0.55)] focus-within:ring-2 focus-within:ring-indigo-100">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={2}
            placeholder={`Ask anything — continue, rewrite, brainstorm…  (Enter to send · Shift+Enter for newline)`}
            className="flex-1 resize-none bg-transparent px-2 py-1 text-[13.5px] leading-relaxed text-zinc-800 placeholder-zinc-400 outline-none"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || streaming}
            className="mb-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-[0_10px_20px_-10px_rgba(99,102,241,0.95)] ring-1 ring-white/60 transition hover:brightness-110 active:scale-[.97] disabled:opacity-40 disabled:shadow-none"
            title="Send"
          >
            {streaming ? <Spinner className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-2 px-1 text-[10.5px] leading-snug text-zinc-500">
          💡 Tip: select text in the editor first, then click <b>Insert</b> on any assistant reply to drop it directly at your cursor / selection.
        </p>
      </div>
    </div>
  );
}

function ChatRow({
  m,
  streaming,
  onInsert,
}: {
  m: Message;
  streaming: boolean;
  onInsert: (text: string) => void;
}) {
  const isUser = m.role === "user";
  const isEmpty = !m.text && streaming;
  // Only strip stray markdown asterisks from assistant replies — user input
  // is shown verbatim.
  const display = isUser
    ? m.text
    : m.text.replace(/\*\*/g, "").replace(/(^|\s)\*(?=\S)/g, "$1").replace(/(\S)\*(?=\s|$)/g, "$1");
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`relative max-w-[92%] whitespace-pre-wrap break-words px-3.5 py-2.5 text-[13px] leading-relaxed ${
          isUser
            ? "rounded-2xl rounded-br-md bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-[0_8px_20px_-10px_rgba(99,102,241,0.85)] ring-1 ring-white/50"
            : "rounded-2xl rounded-bl-md border border-zinc-200/80 bg-white text-zinc-800 shadow-[0_6px_18px_-12px_rgba(30,27,75,0.35)] ring-1 ring-inset ring-white/60"
        }`}
      >
        {isEmpty ? (
          <div className="flex items-center gap-1.5 py-0.5">
            <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,.8)]" style={{ animationDelay: "0s" }} />
            <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,.8)]" style={{ animationDelay: ".15s" }} />
            <span className="h-2 w-2 animate-bounce rounded-full bg-fuchsia-400 shadow-[0_0_6px_rgba(232,121,249,.8)]" style={{ animationDelay: ".3s" }} />
          </div>
        ) : (
          <>{display}</>
        )}
        {!isUser && !isEmpty && !streaming && (
          <div className="mt-2 -mb-1 flex items-center justify-end gap-1 pt-1">
            <button
              onClick={() => onInsert(display)}
              className="group inline-flex items-center gap-1 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 px-2.5 py-1 text-[10.5px] font-bold text-indigo-700 ring-1 ring-indigo-100 transition hover:-translate-y-[1px] hover:from-indigo-100 hover:to-violet-100 hover:shadow-[0_6px_14px_-10px_rgba(79,70,229,0.7)]"
              title="Insert at cursor / selection"
            >
              <Wand className="h-3 w-3 transition group-hover:rotate-12" />
              Insert into text
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
