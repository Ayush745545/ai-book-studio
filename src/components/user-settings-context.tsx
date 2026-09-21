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

export type AiProvider = "openai" | "openrouter";

export type UserSettings = {
  displayName: string;
  bio: string;
  aiProvider: AiProvider;
  openAIModel: string;
  openAIBaseUrl: string;
  openRouterModel: string;
  openRouterBaseUrl: string;
  temperature: number;
  contextWindow: number;
  autoSave: boolean;
};

const DEFAULTS: UserSettings = {
  displayName: "",
  bio: "",
  aiProvider: "openai",
  openAIModel: "gpt-4o-mini",
  openAIBaseUrl: "https://api.openai.com/v1",
  openRouterModel: "",
  openRouterBaseUrl: "https://openrouter.ai/api/v1",
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
  availableModels: string[];
  setAvailableModels: (models: string[]) => void;
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

  const [availableModels, setAvailableModels] = useState<string[]>([]);

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
    effectiveProvider === "openrouter"
      ? settings.openRouterModel || DEFAULTS.openRouterModel
      : settings.openAIModel || DEFAULTS.openAIModel;
  const effectiveBaseUrl =
    effectiveProvider === "openrouter"
      ? settings.openRouterBaseUrl || DEFAULTS.openRouterBaseUrl
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
      availableModels,
      setAvailableModels,
    }),
    [settings, setSettings, resetSettings, effectiveProvider, effectiveModel, effectiveBaseUrl, applyToPayload, availableModels]
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
    const effectiveModel = DEFAULTS.openAIModel;
    const effectiveBaseUrl = DEFAULTS.openAIBaseUrl;
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
      availableModels: [],
      setAvailableModels: () => {},
    };
  }, []);
  return ctx ?? fallback;
}

export { DEFAULTS as DEFAULT_USER_SETTINGS };
