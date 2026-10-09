"use client";
import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BookOpen, ArrowRight, Spinner, Check } from "@/components/icons";
function Login() {
  const params = useSearchParams();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const raw = params.get("callbackUrl") || "/dashboard";
      const destination = new URL(raw, window.location.origin);
      const callbackUrl =
        destination.origin === window.location.origin
          ? destination.href
          : `${window.location.origin}/dashboard`;
      const result = await signIn("credentials", {
        email,
        password,
        callbackUrl,
        redirect: false,
      });
      if (result?.error)
        setError("We couldn’t sign you in. Check your password and try again.");
      else if (result?.url) window.location.href = result.url;
      else setError("Could not connect. Please try again.");
    } catch {
      setError("Could not connect to your writing space. Please try again.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="studio-shell studio-login">
      <div className="studio-login-story">
        <span className="studio-eyebrow">AI BOOK STUDIO</span>
        <h1>
          Your next chapter
          <br />
          starts <em>here.</em>
        </h1>
        <p>
          A home for the stories only you can tell.
          <br />
          And the ideas the world should hear.
        </p>
        <div className="studio-login-book">
          <BookOpen className="h-12 w-12" />
          <blockquote>
            “You don’t have to see the whole staircase. Just take the first
            step.”
          </blockquote>
          <span>ONE PAGE AT A TIME.</span>
        </div>
        <div className="studio-login-formats">
          Book · E-Book · Guide · Workbook · Audiobook
        </div>
      </div>
      <div className="studio-login-form">
        <form onSubmit={submit}>
          <span className="studio-format-icon green">
            <BookOpen className="h-7 w-7" />
          </span>
          <h2>Welcome to your studio.</h2>
          <p className="studio-muted">
            Sign in to pick up where you left off, or start your first project.
          </p>
          {error && (
            <div className="studio-error" role="alert">
              {error}
            </div>
          )}
          <label className="studio-label" htmlFor="email">
            Email address
            <input
              id="email"
              className="studio-input"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={254}
            />
          </label>
          <label className="studio-label" htmlFor="password">
            Password
            <input
              id="password"
              className="studio-input"
              type="password"
              autoComplete="current-password"
              minLength={6}
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button className="studio-button primary" disabled={loading}>
            {loading ? <Spinner /> : <ArrowRight />}
            {loading ? "Opening your studio…" : "Continue to my studio"}
          </button>
          <p className="studio-login-note">
            <Check />
            New here? Your first sign-in creates your account.
          </p>
          <Link href="/" className="studio-back">
            ← Back to home
          </Link>
        </form>
      </div>
    </div>
  );
}
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="studio-shell studio-loading">
          <Spinner />
          Opening your studio…
        </div>
      }
    >
      <Login />
    </Suspense>
  );
}
