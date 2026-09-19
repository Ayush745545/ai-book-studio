"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
import { useUserSettings, type AiProvider } from "@/components/user-settings-context";
import {
  User as UserIcon,
  Settings as SettingsIcon,
  Save,
  RotateCcw,
  Sparkles,
  Check,
} from "@/components/icons";
import { useToast } from "@/components/ui/toast";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const toast = useToast();

  if (status === "unauthenticated") redirect("/login");

  const {
    settings,
    setSettings,
    resetSettings,
    effectiveProvider,
    effectiveModel,
    effectiveBaseUrl,
  } = useUserSettings();

  const [savedFlash, setSavedFlash] = useState(false);
  const flash = () => {
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1400);
  };

  const save = (patch: Record<string, unknown>) => {
    setSettings(patch as any);
    toast("Saved", "success");
    flash();
  };

  const resetAll = () => {
    if (!window.confirm("Reset all settings to defaults?")) return;
    resetSettings();
    toast("Reset to defaults", "success");
    flash();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
            <SettingsIcon className="h-3.5 w-3.5" /> Preferences
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Settings</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Configure your profile and the AI model used for writing, proofreading and covers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetAll}
            className="btn-ghost inline-flex items-center gap-1.5 !text-zinc-400 hover:!text-white"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
          <div
            className={`pointer-events-none transition-all duration-300 ${
              savedFlash ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
            }`}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/25">
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <aside className="lg:col-span-2 space-y-3 self-start">
          <div className="card p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/30 to-violet-500/30 text-indigo-200 ring-1 ring-indigo-400/30">
                <UserIcon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {session?.user?.name || session?.user?.email || "Signed in user"}
                </p>
                <p className="truncate text-xs text-zinc-500">
                  {session?.user?.email || "Signed in"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-2">
                <p className="text-zinc-500">Active provider</p>
                <p className="mt-0.5 text-sm font-semibold capitalize text-white">
                  {effectiveProvider}
                </p>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-2">
                <p className="text-zinc-500">Active model</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-white">
                  {effectiveModel}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Tip
            </p>
            <p className="text-sm leading-relaxed text-zinc-400">
              Pick <span className="font-medium text-white">Ollama</span> for fully local,
              privacy-first writing — or <span className="font-medium text-white">OpenAI</span> if
              you want cloud quality. Settings are saved in your browser.
            </p>
          </div>
        </aside>

        <div className="space-y-6 lg:col-span-3">
          <section className="card p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/25">
                <UserIcon className="h-4.5 w-4.5" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-white">Profile</h2>
                <p className="text-xs text-zinc-500">Shown on the dashboard and store listings.</p>
              </div>
            </div>
            <div className="space-y-4">
              <Field label="Display name" hint="How your name appears on published books.">
                <input
                  type="text"
                  value={settings.displayName}
                  onChange={(e) => setSettings({ displayName: e.target.value })}
                  onBlur={(e) => save({ displayName: e.target.value })}
                  placeholder={session?.user?.name || "Your author name"}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-400/30"
                />
              </Field>
              <Field label="Short bio" hint="One-line description used as your byline.">
                <textarea
                  value={settings.bio}
                  onChange={(e) => setSettings({ bio: e.target.value })}
                  onBlur={(e) => save({ bio: e.target.value })}
                  rows={3}
                  placeholder="Author, dreamer, cartographer of strange worlds…"
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-400/30"
                />
              </Field>
            </div>
          </section>

          <section className="card p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/25">
                <Sparkles className="h-4.5 w-4.5" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-white">AI Model Configuration</h2>
                <p className="text-xs text-zinc-500">
                  Applied everywhere: proofread, rewrite, chapter writes, cover prompts, chat.
                </p>
              </div>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-1.5">
              {(["ollama", "openai"] as AiProvider[]).map((p) => (
                <button
                  key={p}
                  onClick={() => save({ aiProvider: p })}
                  className={`rounded-lg px-3 py-2.5 text-sm font-semibold capitalize transition ${
                    settings.aiProvider === p
                      ? "bg-white/10 text-white shadow ring-1 ring-indigo-400/30"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {p === "ollama" ? "🦙 Ollama (local)" : "🤖 OpenAI (cloud)"}
                </button>
              ))}
            </div>

            {settings.aiProvider === "ollama" ? (
              <div className="space-y-4">
                <Field label="Ollama model" hint="e.g. llama3, qwen2.5, mistral, gemma2">
                  <input
                    type="text"
                    value={settings.ollamaModel}
                    onChange={(e) => setSettings({ ollamaModel: e.target.value })}
                    onBlur={(e) => save({ ollamaModel: e.target.value })}
                    placeholder="llama3"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 font-mono text-sm text-white placeholder-zinc-500 outline-none transition focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-400/30"
                  />
                </Field>
                <Field label="Ollama base URL" hint="Default: http://localhost:11434">
                  <input
                    type="text"
                    value={settings.ollamaBaseUrl}
                    onChange={(e) => setSettings({ ollamaBaseUrl: e.target.value })}
                    onBlur={(e) => save({ ollamaBaseUrl: e.target.value })}
                    placeholder="http://localhost:11434"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 font-mono text-sm text-white placeholder-zinc-500 outline-none transition focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-400/30"
                  />
                </Field>
              </div>
            ) : (
              <div className="space-y-4">
                <Field label="OpenAI model" hint="e.g. gpt-4o-mini, gpt-4o, gpt-4.1-mini">
                  <input
                    type="text"
                    value={settings.openAIModel}
                    onChange={(e) => setSettings({ openAIModel: e.target.value })}
                    onBlur={(e) => save({ openAIModel: e.target.value })}
                    placeholder="gpt-4o-mini"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 font-mono text-sm text-white placeholder-zinc-500 outline-none transition focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-400/30"
                  />
                </Field>
                <Field label="API base URL" hint="Use an OpenAI-compatible endpoint (or leave default).">
                  <input
                    type="text"
                    value={settings.openAIBaseUrl}
                    onChange={(e) => setSettings({ openAIBaseUrl: e.target.value })}
                    onBlur={(e) => save({ openAIBaseUrl: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 font-mono text-sm text-white placeholder-zinc-500 outline-none transition focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-400/30"
                  />
                </Field>
                <Field
                  label="OpenAI API key"
                  hint={`Saved to NEXT_PUBLIC_OPENAI_API_KEY on your server. ${
                    typeof window !== "undefined" &&
                    (window as any).__NEXT_DATA__?.props?.pageProps || ""
                      ? ""
                      : ""
                  }Stored in your system environment, not in the browser.`}
                >
                  <div className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs text-zinc-400">
                    API keys are read from your server environment variables. They never appear in
                    the browser or in settings UI.
                  </div>
                </Field>
              </div>
            )}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field
                label={`Temperature · ${settings.temperature.toFixed(2)}`}
                hint="0 = factual, 1 = creative"
              >
                <input
                  type="range"
                  min={0}
                  max={1.5}
                  step={0.05}
                  value={settings.temperature}
                  onChange={(e) => setSettings({ temperature: parseFloat(e.target.value) })}
                  onMouseUp={() => save({ temperature: settings.temperature })}
                  onTouchEnd={() => save({ temperature: settings.temperature })}
                  className="w-full accent-indigo-400"
                />
              </Field>
              <Field
                label={`Context window · ${settings.contextWindow.toLocaleString()}`}
                hint="Token context used for local Ollama generations."
              >
                <input
                  type="range"
                  min={1024}
                  max={32768}
                  step={512}
                  value={settings.contextWindow}
                  onChange={(e) => setSettings({ contextWindow: parseInt(e.target.value, 10) })}
                  onMouseUp={() => save({ contextWindow: settings.contextWindow })}
                  onTouchEnd={() => save({ contextWindow: settings.contextWindow })}
                  className="w-full accent-indigo-400"
                />
              </Field>
            </div>
          </section>

          <section className="card p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25">
                <Save className="h-4.5 w-4.5" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-white">Editor behavior</h2>
                <p className="text-xs text-zinc-500">General writing & workspace options.</p>
              </div>
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-white/15">
              <input
                type="checkbox"
                checked={settings.autoSave}
                onChange={(e) => save({ autoSave: e.target.checked })}
                className="mt-0.5 h-4 w-4 accent-indigo-400"
              />
              <div>
                <p className="text-sm font-medium text-white">Auto-save chapters</p>
                <p className="text-xs text-zinc-500">
                  Debounced saves while you type. Disable to only save via the Save button.
                </p>
              </div>
            </label>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          {label}
        </label>
        {hint && <span className="text-[11px] text-zinc-500">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
