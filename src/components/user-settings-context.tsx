"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AiProvider = "ollama" | "openai";

export type UserSettings = {
  displayName: string;
  bio: string;
  aiProvider: AiProvider;
  ollamaModel: string;
  ollamaBaseUrl: string;
  openAIModel: string;
  openAIBaseUrl: string;
  temperature: number;
  contextWindow: number;
  autoSave: boolean;
};

const DEFAULTS: UserSettings = {
  displayName: "",
  bio: "",
  aiProvider: "ollama",
  ollamaModel: "llama3",
  ollamaBaseUrl: "http://localhost:11434",
  openAIModel: "gpt-4o-mini",
  openAIBaseUrl: "https://api.openai.com/v1",
  temperature: 0.6,
  contextWindow: 4096,
  autoSave: true,
};

const STORAGE_KEY = "aibook-user-settings";

type UserSettingsContextValue = {
  settings: UserSettings;
  setSettings: (patch: Partial<UserSettings>) => void;
  resetSettings: () => void;
  effectiveProvider: AiProvider;
  effectiveModel: string;
  effectiveBaseUrl: string;
  applyToPayload: (body: Record<string, unknown>) => Record<string, unknown>;
};

const UserSettingsContext = createContext<UserSettingsContextValue | null>(null);

export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setRaw] = useState<UserSettings>(() => {
    if (typeof window === "undefined") return DEFAULTS;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULTS;
      const parsed = JSON.parse(raw);
      return { ...DEFAULTS, ...parsed };
    } catch {
      return DEFAULTS;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  const setSettings = useCallback((patch: Partial<UserSettings>) => {
    setRaw((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetSettings = useCallback(() => setRaw(DEFAULTS), []);

  const effectiveProvider = settings.aiProvider;
  const effectiveModel =
    effectiveProvider === "ollama"
      ? settings.ollamaModel || DEFAULTS.ollamaModel
      : settings.openAIModel || DEFAULTS.openAIModel;
  const effectiveBaseUrl =
    effectiveProvider === "ollama"
      ? settings.ollamaBaseUrl || DEFAULTS.ollamaBaseUrl
      : settings.openAIBaseUrl || DEFAULTS.openAIBaseUrl;

  const applyToPayload = useCallback(
    (body: Record<string, unknown>) => {
      return {
        provider: effectiveProvider,
        model: effectiveModel,
        temperature: settings.temperature,
        contextWindow: settings.contextWindow,
        baseUrl: effectiveBaseUrl,
        ...body,
      };
    },
    [effectiveProvider, effectiveModel, effectiveBaseUrl, settings.temperature, settings.contextWindow]
  );

  const value = useMemo(
    () => ({
      settings,
      setSettings,
      resetSettings,
      effectiveProvider,
      effectiveModel,
      effectiveBaseUrl,
      applyToPayload,
    }),
    [settings, setSettings, resetSettings, effectiveProvider, effectiveModel, effectiveBaseUrl, applyToPayload]
  );

  return (
    <UserSettingsContext.Provider value={value}>
      {children}
    </UserSettingsContext.Provider>
  );
}

export function useUserSettings() {
  const ctx = useContext(UserSettingsContext);
  if (!ctx) {
    throw new Error("useUserSettings must be used within UserSettingsProvider");
  }
  return ctx;
}

export function useSafeUserSettings(): UserSettingsContextValue {
  const ctx = useContext(UserSettingsContext);
  const fallback = useMemo<UserSettingsContextValue>(() => {
    const effectiveProvider = DEFAULTS.aiProvider;
    const effectiveModel = DEFAULTS.ollamaModel;
    const effectiveBaseUrl = DEFAULTS.ollamaBaseUrl;
    return {
      settings: DEFAULTS,
      setSettings: () => {},
      resetSettings: () => {},
      effectiveProvider,
      effectiveModel,
      effectiveBaseUrl,
      applyToPayload: (body) => ({
        provider: effectiveProvider,
        model: effectiveModel,
        temperature: DEFAULTS.temperature,
        contextWindow: DEFAULTS.contextWindow,
        baseUrl: effectiveBaseUrl,
        ...body,
      }),
    };
  }, []);
  return ctx ?? fallback;
}

export { DEFAULTS as DEFAULT_USER_SETTINGS };
