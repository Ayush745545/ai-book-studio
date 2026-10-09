"use client";
import { useEffect, useState } from "react";
import type { SerializedBook } from "@/types";
import { BookTTS, type TTSState } from "./book-tts";
import { Headphones, Spinner, FileText } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/client";
export function NarrationTab({
  book,
  onExport,
}: {
  book: SerializedBook;
  onExport: (format: string) => void;
}) {
  const chapters = book.chapters ?? [],
    [chapterId, setChapterId] = useState(chapters[0]?.id ?? "");
  const chapter = chapters.find((c) => c.id === chapterId),
    [state, setState] = useState<TTSState>({
      activeSentenceIdx: -1,
      activeSentenceText: "",
      isPlaying: false,
    });
  const [voice, setVoice] = useState("alloy"),
    [speed, setSpeed] = useState(1),
    [available, setAvailable] = useState(false),
    [busy, setBusy] = useState(false);
  const toast = useToast();
  useEffect(() => {
    apiFetch<{ narration: boolean }>("/api/studio/status")
      .then((data) => setAvailable(data.narration))
      .catch(() => {});
  }, []);
  async function download() {
    setBusy(true);
    try {
      const res = await fetch(`/api/books/${book.id}/audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId, voice, speed }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Narration failed");
      }
      const url = URL.createObjectURL(await res.blob()),
        link = document.createElement("a");
      link.href = url;
      link.download = `${chapter?.title.replace(/[^a-z0-9-]/gi, "_") || "track"}.mp3`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not create audio", "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="studio-narration">
      <div className="studio-narration-heading">
        <span className="studio-format-icon violet">
          <Headphones className="h-8 w-8" />
        </span>
        <span className="studio-eyebrow">WORDS WORTH LISTENING TO</span>
        <h2 className="studio-title">Give your story a voice.</h2>
        <p>
          Listen to your script as you refine it. Export each finished track
          with AI narration.
        </p>
      </div>
      <div className="studio-narration-layout">
        <div className="studio-panel">
          <label className="studio-label">
            Choose a track
            <select
              className="studio-input"
              value={chapterId}
              onChange={(e) => setChapterId(e.target.value)}
            >
              {chapters.map((c, i) => (
                <option key={c.id} value={c.id}>
                  {String(i + 1).padStart(2, "0")} · {c.title}
                </option>
              ))}
            </select>
          </label>
          <div className="studio-device-narration">
            <span className="studio-eyebrow">
              LISTENING PREVIEW · DEVICE VOICE
            </span>
            <BookTTS
              key={chapterId}
              text={chapter?.content || ""}
              chapterTitle={chapter?.title || "Track"}
              onStateChange={setState}
            />
          </div>
          <div className="studio-narration-transcript">
            {chapter?.content ? (
              chapter.content.split(/\n\s*\n/).map((p, i) => (
                <p
                  key={i}
                  className={
                    state.isPlaying &&
                    state.activeSentenceText &&
                    p.includes(state.activeSentenceText)
                      ? "speaking"
                      : ""
                  }
                >
                  {p}
                </p>
              ))
            ) : (
              <p className="studio-muted">
                Write some content in the editor before listening to this track.
              </p>
            )}
          </div>
        </div>
        <aside className="studio-panel">
          <h3>AI narration export</h3>
          <p className="studio-muted">
            Download an MP3 for the selected track. The voice is AI-generated.
          </p>
          <label className="studio-label">
            Narrator
            <select
              className="studio-input"
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
            >
              {["alloy", "echo", "fable", "onyx", "nova", "shimmer"].map(
                (v) => (
                  <option key={v} value={v}>
                    {v[0].toUpperCase() + v.slice(1)}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="studio-label">
            Narration speed
            <select
              className="studio-input"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            >
              {[0.75, 1, 1.25, 1.5].map((v) => (
                <option key={v} value={v}>
                  {v}×
                </option>
              ))}
            </select>
          </label>
          <button
            className="studio-button primary"
            disabled={!available || busy || !chapter?.content.trim()}
            onClick={() => void download()}
          >
            {busy ? <Spinner /> : <Headphones />}
            {busy ? "Creating narration…" : "Download track MP3"}
          </button>
          <p className="studio-footnote">
            {available
              ? "Up to 24,000 characters per track. Longer scripts can be split into additional tracks. Provider usage charges apply."
              : "Connect OPENAI_API_KEY to enable downloadable AI narration. Device listening preview works without an API key."}
          </p>
          <button
            className="studio-button secondary"
            onClick={() => onExport("txt")}
          >
            <FileText />
            Download narration script
          </button>
        </aside>
      </div>
    </div>
  );
}
