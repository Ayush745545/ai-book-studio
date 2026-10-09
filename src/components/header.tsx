"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { BookOpen, ArrowRight, LogOut, Spinner } from "@/components/icons";
export function Header() {
  const { data: session, status } = useSession(),
    pathname = usePathname(),
    [leaving, setLeaving] = useState(false);
  const editor = /^\/books\/(?!new)[^/]+$/.test(pathname);
  return (
    <header className="studio-site-header">
      <div>
        <Link className="studio-brand" href="/">
          <span>
            <BookOpen className="h-5 w-5" />
          </span>
          Book<span className="studio-brand-light">Studio</span>
          <small>AI</small>
        </Link>
        <nav aria-label="Main navigation">
          {!editor && (
            <>
              <Link className={pathname === "/" ? "active" : ""} href="/">
                Create
              </Link>
              <Link
                className={pathname === "/store" ? "active" : ""}
                href="/store"
              >
                Bookstore
              </Link>
              <Link
                className={pathname === "/pools" ? "active" : ""}
                href="/pools"
              >
                Community
              </Link>
            </>
          )}
          {session?.user && (
            <Link
              className={pathname.startsWith("/dashboard") ? "active" : ""}
              href="/dashboard"
            >
              My projects
            </Link>
          )}
        </nav>
        <div className="studio-header-account">
          {status === "loading" ? (
            <Spinner />
          ) : session?.user ? (
            <>
              <Link
                href="/settings"
                className="studio-account-avatar"
                aria-label="Account settings"
              >
                {(session.user.name || session.user.email || "A")
                  .slice(0, 1)
                  .toUpperCase()}
              </Link>
              <button
                className="studio-icon-button"
                disabled={leaving}
                title="Sign out"
                aria-label="Sign out"
                onClick={async () => {
                  if (leaving) return;
                  setLeaving(true);
                  await signOut({ callbackUrl: "/" });
                }}
              >
                <LogOut />
              </button>
            </>
          ) : (
            <Link className="studio-header-login" href="/login">
              Your writing space <ArrowRight />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
