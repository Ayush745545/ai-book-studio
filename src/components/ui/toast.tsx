"use client";

import { createContext, useCallback, useContext, useState } from "react";

type ToastType = "success" | "error" | "info";
interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

const ToastContext = createContext<(message: string, type?: ToastType) => void>(
  () => {}
);

/** Returns a `toast(message, type)` function. */
export const useToast = () => useContext(ToastContext);

const styles: Record<ToastType, string> = {
  success: "border-emerald-400/30 bg-emerald-950/90 text-emerald-200",
  error: "border-red-400/30 bg-red-950/90 text-red-200",
  info: "border-indigo-400/30 bg-indigo-950/90 text-indigo-200",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto animate-fade-in-up rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur ${styles[t.type]}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
