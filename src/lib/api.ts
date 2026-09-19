import { NextResponse } from "next/server";
import { ZodError } from "zod";

/** Uniform error responses for API routes. */
export function apiError(err: unknown, fallback = "Something went wrong") {
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: err.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }
  console.error("[api]", err);
  const message = err instanceof Error ? err.message : fallback;
  return NextResponse.json({ error: message }, { status: 500 });
}

export function unauthorized() {
  return NextResponse.json({ error: "You must be signed in" }, { status: 401 });
}

export function notFound(what = "Resource") {
  return NextResponse.json({ error: `${what} not found` }, { status: 404 });
}

export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
