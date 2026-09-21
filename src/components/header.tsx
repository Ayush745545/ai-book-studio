"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { BookOpen, LayoutGrid, LogOut, Settings, Star, Store, Moon, Sun } from "@/components/icons";
import { Spinner } from "@/components/icons";
import { useTheme } from "@/components/theme-provider";

export function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();

  const navLink = (href: string, label: string, icon: React.ReactNode) => (
    <Link
      href={href}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        pathname === href
          ? "bg-white/10 text-white"
          : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
            <BookOpen className="h-4 w-4 text-white" />
          </span>
          <span className="text-sm font-bold tracking-tight text-white sm:text-base">
            AI Book <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Studio</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {navLink("/store", "Store", <Store className="h-4 w-4" />)}
          {navLink("/pools", "Pools", <Star className="h-4 w-4" />)}
          {session?.user && navLink("/dashboard", "Dashboard", <LayoutGrid className="h-4 w-4" />)}
          {session?.user && navLink("/settings", "Settings", <Settings className="h-4 w-4" />)}

          {status === "loading" ? (
            <span className="px-3 text-zinc-500"><Spinner className="h-4 w-4" /></span>
          ) : session?.user ? (
            <div className="ml-2 flex items-center gap-2">
              <span className="hidden max-w-[140px] truncate text-sm text-zinc-400 md:inline">
                {session.user.name || session.user.email}
              </span>
              <button
                onClick={async () => {
                  await signOut({ callbackUrl: "/" });
                }}
                className="btn-ghost !px-2.5 !py-1.5"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link href="/login" className="btn-primary ml-2 !px-3.5 !py-1.5 text-xs">
              Sign in
            </Link>
          )}
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="ml-2 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition"
            title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </nav>
      </div>
    </header>
  );
}
