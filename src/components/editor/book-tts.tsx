"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ────────────────────── Types ────────────────────── */

export interface TTSState {
  /** Index of the sentence currently being spoken (within the full chapter text) */
  activeSentenceIdx: number;
  /** Text of the currently spoken sentence for highlighting */
  activeSentenceText: string;
  /** Whether TTS is currently playing */
  isPlaying: boolean;
}

interface BookTTSProps {
  /** All paragraphs of the current chapter, joined into one block */
  text: string;
  /** Chapter title for transcript header */
  chapterTitle: string;
  /** Callback so parent (ReadTab) can highlight the active sentence */
  onStateChange: (state: TTSState) => void;
}

/* ────────────────── Sentence splitter ────────────── */

function splitSentences(text: string): string[] {
  // Split on sentence-ending punctuation, keeping the delimiter attached
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/* ────────────── Voice helpers ─────────────────────── */

function getVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis?.getVoices() ?? [];
}

/** Group voices by language tag (e.g. "en-US", "es-ES") */
function groupByLang(voices: SpeechSynthesisVoice[]): Map<string, SpeechSynthesisVoice[]> {
  const map = new Map<string, SpeechSynthesisVoice[]>();
  for (const v of voices) {
    const key = v.lang;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(v);
  }
  return map;
}

/** Friendly language label from a BCP-47 tag */
function langLabel(tag: string): string {
  try {
    const dn = new Intl.DisplayNames(["en"], { type: "language" });
    return dn.of(tag) ?? tag;
  } catch {
    return tag;
  }
}

/* ═════════════════════ COMPONENT ═════════════════════ */

export function BookTTS({ text, chapterTitle, onStateChange }: BookTTSProps) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedLang, setSelectedLang] = useState("");
  const [selectedVoiceURI, setSelectedVoiceURI] = useState("");
  const [rate, setRate] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [showSettings, setShowSettings] = useState(false);
  const [supported, setSupported] = useState(true);

  const sentences = splitSentences(text);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const idxRef = useRef(-1);
  const stoppedRef = useRef(false);

  /* ── Load voices ── */
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setSupported(false);
      return;
    }

    const load = () => {
      const v = getVoices();
      setVoices(v);
      if (v.length && !selectedLang) {
        // Default to first English voice, or first available
        const en = v.find((x) => x.lang.startsWith("en"));
        const def = en ?? v[0];
        setSelectedLang(def.lang);
        setSelectedVoiceURI(def.voiceURI);
      }
    };

    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  /* ── Emit state to parent ── */
  useEffect(() => {
    onStateChange({
      activeSentenceIdx: currentIdx,
      activeSentenceText: currentIdx >= 0 ? sentences[currentIdx] : "",
      isPlaying
    });
  }, [currentIdx, isPlaying, onStateChange, sentences]);

  /* ── Cleanup on unmount ── */
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  /* ── Speak a sentence by index ── */
  const speakSentence = useCallback(
    (idx: number) => {
      if (idx >= sentences.length || stoppedRef.current) {
        // Done
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentIdx(-1);
        idxRef.current = -1;
        return;
      }

      const synth = window.speechSynthesis;
      const utter = new SpeechSynthesisUtterance(sentences[idx]);
      utter.rate = rate;

      // Try to find the selected voice
      const voice = voices.find((v) => v.voiceURI === selectedVoiceURI);
      if (voice) {
        utter.voice = voice;
        utter.lang = voice.lang;
      } else if (selectedLang) {
        // Fallback: pick any voice for the selected language
        const fallback = voices.find((v) => v.lang === selectedLang);
        if (fallback) {
          utter.voice = fallback;
          utter.lang = fallback.lang;
        }
      }

      utter.onstart = () => {
        setCurrentIdx(idx);
        idxRef.current = idx;
      };

      utter.onend = () => {
        if (!stoppedRef.current) {
          speakSentence(idx + 1);
        }
      };

      utter.onerror = (e) => {
        if (e.error !== "canceled" && e.error !== "interrupted") {
          console.warn("[TTS] error on sentence", idx, e.error);
          // Try next sentence
          if (!stoppedRef.current) speakSentence(idx + 1);
        }
      };

      utterRef.current = utter;
      synth.speak(utter);
    },
    [sentences, rate, selectedVoiceURI, selectedLang, voices],
  );

  /* ── Controls ── */
  const play = useCallback(() => {
    const synth = window.speechSynthesis;
    if (isPaused) {
      synth.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }
    synth.cancel();
    stoppedRef.current = false;
    setIsPlaying(true);
    setIsPaused(false);
    // Start from where we left off, or from the beginning
    const startIdx = currentIdx >= 0 ? currentIdx : 0;
    speakSentence(startIdx);
  }, [isPaused, currentIdx, speakSentence]);

  const pause = useCallback(() => {
    window.speechSynthesis.pause();
    setIsPaused(true);
    setIsPlaying(false);
  }, []);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentIdx(-1);
    idxRef.current = -1;
  }, []);

  const skipFwd = useCallback(() => {
    const next = Math.min(idxRef.current + 1, sentences.length - 1);
    window.speechSynthesis.cancel();
    stoppedRef.current = false;
    speakSentence(next);
  }, [sentences.length, speakSentence]);

  const skipBwd = useCallback(() => {
    const prev = Math.max(idxRef.current - 1, 0);
    window.speechSynthesis.cancel();
    stoppedRef.current = false;
    speakSentence(prev);
  }, [speakSentence]);

  /* ── Download transcript ── */
  const downloadTranscript = useCallback(() => {
    const header = `${chapterTitle}\n${"=".repeat(chapterTitle.length)}\n\n`;
    const body = sentences.map((s, i) => `[${i + 1}] ${s}`).join("\n\n");
    const blob = new Blob([header + body], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${chapterTitle.replace(/[^a-zA-Z0-9]/g, "_")}_transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [chapterTitle, sentences]);

  /* ── Lang/voice selectors ── */
  const langMap = groupByLang(voices);
  const langKeys = Array.from(langMap.keys()).sort();
  const voicesForLang = langMap.get(selectedLang) ?? [];

  const onLangChange = (lang: string) => {
    setSelectedLang(lang);
    const first = langMap.get(lang)?.[0];
    if (first) setSelectedVoiceURI(first.voiceURI);
    // If currently playing, restart with new voice
    if (isPlaying) {
      window.speechSynthesis.cancel();
      stoppedRef.current = false;
      setTimeout(() => speakSentence(idxRef.current >= 0 ? idxRef.current : 0), 100);
    }
  };

  /* ── Progress ── */
  const progress = sentences.length > 0 && currentIdx >= 0 ? ((currentIdx + 1) / sentences.length) * 100 : 0;

  if (!supported) return null;

  /* ═══════════════════ JSX ═══════════════════ */
  return (
    <div className="flex flex-col gap-1">
      {/* ── Main control bar ── */}
      <div className="flex items-center gap-1.5">
        {/* Skip back */}
        <button
          onClick={skipBwd}
          disabled={!isPlaying && !isPaused}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition disabled:opacity-30"
          title="Previous sentence"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
        </button>

        {/* Play / Pause */}
        {isPlaying ? (
          <button
            onClick={pause}
            className="p-2 rounded-full bg-amber-600/80 text-white hover:bg-amber-600 transition shadow-lg shadow-amber-900/30"
            title="Pause"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>
          </button>
        ) : (
          <button
            onClick={play}
            className="p-2 rounded-full bg-indigo-500/80 text-white hover:bg-indigo-500 transition shadow-lg shadow-indigo-900/30"
            title={isPaused ? "Resume" : "Play"}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </button>
        )}

        {/* Stop */}
        <button
          onClick={stop}
          disabled={!isPlaying && !isPaused}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition disabled:opacity-30"
          title="Stop"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
        </button>

        {/* Skip forward */}
        <button
          onClick={skipFwd}
          disabled={!isPlaying && !isPaused}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition disabled:opacity-30"
          title="Next sentence"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zm10 0h2V6h-2v12z"/></svg>
        </button>

        {/* Speed badge */}
        <span className="text-[10px] text-zinc-500 font-mono ml-1">{rate.toFixed(1)}×</span>

        {/* Progress bar (tiny) */}
        <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden mx-2 min-w-[40px]">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, background: isPlaying ? "#8b7355" : "#555" }}
          />
        </div>

        {/* Settings toggle */}
        <button
          onClick={() => setShowSettings((s) => !s)}
          className={`p-1.5 rounded-lg transition ${showSettings ? "text-indigo-400 bg-indigo-500/15" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"}`}
          title="TTS Settings"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>

        {/* Download transcript */}
        <button
          onClick={downloadTranscript}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition"
          title="Download transcript"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
      </div>

      {/* ── Settings panel ── */}
      {showSettings && (
        <div className="mt-1.5 p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] grid gap-3 sm:grid-cols-3">
          {/* Language */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1 block">Language</label>
            <select
              value={selectedLang}
              onChange={(e) => onLangChange(e.target.value)}
              className="input text-xs !py-1.5"
            >
              {langKeys.map((lang) => (
                <option key={lang} value={lang}>
                  {langLabel(lang)} ({lang})
                </option>
              ))}
            </select>
          </div>

          {/* Voice */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1 block">Voice</label>
            <select
              value={selectedVoiceURI}
              onChange={(e) => setSelectedVoiceURI(e.target.value)}
              className="input text-xs !py-1.5"
            >
              {voicesForLang.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} {v.localService ? "" : "🌐"}
                </option>
              ))}
              {voicesForLang.length === 0 && (
                <option disabled>No voices for this language</option>
              )}
            </select>
          </div>

          {/* Speed */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1 block">
              Speed: {rate.toFixed(1)}×
            </label>
            <input
              type="range"
              min={0.5}
              max={3.0}
              step={0.1}
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-[9px] text-zinc-600 mt-0.5">
              <span>0.5×</span>
              <span>1.0×</span>
              <span>2.0×</span>
              <span>3.0×</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
