"use client";

import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/ui/toast";
import { UserSettingsProvider } from "@/components/user-settings-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <UserSettingsProvider>
        <ToastProvider>{children}</ToastProvider>
      </UserSettingsProvider>
    </SessionProvider>
  );
}
