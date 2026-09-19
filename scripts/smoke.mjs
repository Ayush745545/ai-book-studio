/* End-to-end smoke test for AI Book Studio (no external keys needed).
 * Runs against a live server at http://localhost:3000 with a local Postgres.
 * Usage: node scripts/smoke.mjs
 */
const BASE = "http://localhost:3000";
let cookies = {};
let passed = 0;
let failed = 0;

function saveCookies(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  for (const c of raw) {
    const [pair] = c.split(";");
    const idx = pair.indexOf("=");
    cookies[pair.slice(0, idx)] = pair.slice(idx + 1);
  }
}
function cookieHeader() {
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ");
}
async function req(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    redirect: "manual",
    headers: {
      ...(opts.body && !opts.form ? { "Content-Type": "application/json" } : {}),
      ...(opts.form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      Cookie: cookieHeader(),
      ...(opts.headers ?? {}),
    },
    body: opts.form
      ? new URLSearchParams(opts.bodyObj).toString()
      : opts.body
        ? JSON.stringify(opts.body)
        : undefined,
  });
  saveCookies(res);
  return res;
}
function check(name, cond, extra = "") {
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name} ${extra}`);
  }
}

// ── 1. Public pages ─────────────────────────────────────────────
console.log("\n── Public pages");
let r = await req("/");
check("GET / → 200", r.status === 200);
let html = await r.text();
check("landing mentions AI Book Studio", html.includes("AI Book"));

r = await req("/store");
check("GET /store → 200 (empty)", r.status === 200);

r = await req("/login");
check("GET /login → 200", r.status === 200);

// ── 2. Auth: protected routes redirect, sign-in auto-creates ────
console.log("\n── Auth");
r = await req("/dashboard");
check("GET /dashboard (anon) → redirect to /login", r.status === 307 && (r.headers.get("location") ?? "").includes("/login"), `got ${r.status} ${r.headers.get("location")}`);

r = await req("/api/books");
check("GET /api/books (anon) → 401", r.status === 401);

r = await req("/api/auth/csrf");
const { csrfToken } = await r.json();
check("GET /api/auth/csrf → token", !!csrfToken);

const email = `author${Date.now()}@example.com`;
r = await req("/api/auth/callback/credentials", {
  method: "POST",
  form: true,
  bodyObj: { csrfToken, email, password: "secret123", json: "true" },
});
check("sign-in (auto-create) → 200", r.status === 200, `status ${r.status}`);
check("session cookie set", Object.keys(cookies).some((k) => k.includes("session-token")));

r = await req("/api/auth/session");
const session = await r.json();
check("session has user.id", !!session?.user?.id, JSON.stringify(session));
check("session has role AUTHOR", session?.user?.role === "AUTHOR");
const userId = session.user.id;

// wrong password rejected
r = await req("/api/auth/csrf");
const csrf2 = (await r.json()).csrfToken;
const savedCookies = { ...cookies };
r = await req("/api/auth/callback/credentials", {
  method: "POST",
  form: true,
  bodyObj: { csrfToken: csrf2, email, password: "wrongpass", json: "true" },
});
let body = await r.text();
check("wrong password → error, no session", body.includes("CredentialsSignin") || !r.headers.getSetCookie?.().some((c) => c.includes("session-token")));
cookies = savedCookies; // restore good session

// ── 3. Books + chapters CRUD ────────────────────────────────────
console.log("\n── Books & chapters");
r = await req("/api/books");
let j = await r.json();
check("GET /api/books → empty list", r.status === 200 && j.books.length === 0);

r = await req("/api/books", {
  method: "POST",
  body: { title: "The Martian Gardener", description: "A botanist terraforms Mars.", genre: "Science Fiction", language: "English", price: 29.99 },
});
j = await r.json();
check("POST /api/books → 201", r.status === 201, JSON.stringify(j));
const bookId = j.book?.id;
check("book has id + DRAFT status", !!bookId && j.book.status === "DRAFT");

r = await req(`/api/books/${bookId}`);
j = await r.json();
check("GET /api/books/[id] → book with chapters[]", r.status === 200 && Array.isArray(j.book.chapters));

r = await req(`/api/books/${bookId}/chapters`, {
  method: "POST",
  body: { title: "Chapter 1: Red Dust", content: "The soil was dead. Maya knelt in the regolith and opened the seed vault. One by one she planted the future.\n\nNothing grew that first week." },
});
j = await r.json();
check("POST chapter → 201", r.status === 201, JSON.stringify(j));
const chapterId = j.chapter?.id;
check("wordCount computed (26)", j.chapter?.wordCount === 26, `got ${j.chapter?.wordCount}`);

// another user cannot touch it
r = await req(`/api/books/${bookId}/chapters`, { method: "POST", body: { title: "hack" }, headers: { Cookie: "" } });
check("POST chapter (anon) → 401", r.status === 401);

r = await req(`/api/chapters/${chapterId}`, {
  method: "PUT",
  body: { title: "Chapter 1: Red Dust (revised)", content: "The soil was dead, but Maya had brought life with her.\n\nShe knelt in the red regolith, opened the seed vault, and planted the future one seed at a time.\n\nNothing grew that first week — but she kept watering." },
});
j = await r.json();
check("PUT chapter → updated title", r.status === 200 && j.chapter.title.includes("revised"), JSON.stringify(j));
check("PUT chapter → new wordCount", j.chapter.wordCount > 26, `got ${j.chapter?.wordCount}`);

// ── 4. Publish + store ──────────────────────────────────────────
console.log("\n── Publish & store");
r = await req(`/api/books/${bookId}`, { method: "PATCH", body: { isPublished: true } });
j = await r.json();
check("PATCH publish → isPublished + PUBLISHED", j.book?.isPublished === true && j.book?.status === "PUBLISHED");

r = await req("/api/store/books", { headers: { Cookie: "" } });
j = await r.json();
check("GET /api/store/books (public) → contains book + authorName", j.books?.some((b) => b.id === bookId && b.authorName));

r = await req(`/store/${bookId}`, { headers: { Cookie: "" } });
html = await r.text();
check("GET /store/[id] → 200 shows title + Buy", r.status === 200 && html.includes("The Martian Gardener") && html.includes("Buy printed copy"));

// ── 5. PDF export ───────────────────────────────────────────────
console.log("\n── PDF export");
r = await req(`/api/books/${bookId}/pdf`);
const buf = Buffer.from(await r.arrayBuffer());
check("GET pdf → 200 application/pdf", r.status === 200 && r.headers.get("content-type") === "application/pdf");
check("pdf magic bytes %PDF", buf.subarray(0, 5).toString() === "%PDF-");
check("pdf > 2KB", buf.length > 2048, `${buf.length} bytes`);
check("content-disposition filename", (r.headers.get("content-disposition") ?? "").includes("the-martian-gardener.pdf"));

// ── 6. Graceful degradation without keys ───────────────────────
console.log("\n── Missing-key handling");
r = await req("/api/ai/idea", { method: "POST", body: { genre: "Fantasy", keywords: "dragons" } });
j = await r.json();
check("POST /api/ai/idea w/o OPENAI key → 500 + clear message", r.status === 500 && j.error.includes("OPENAI_API_KEY"), JSON.stringify(j));

r = await req("/api/ai/grammar", { method: "POST", body: { text: "me go store yesterday" } });
j = await r.json();
check("POST /api/ai/grammar w/o key → 500 + clear message", r.status === 500 && j.error.includes("OPENAI_API_KEY"));

r = await req("/api/orders", { method: "POST", body: { bookId, quantity: 1 } });
j = await r.json();
check("POST /api/orders w/o STRIPE key → 500 + clear message", r.status === 500 && j.error.includes("STRIPE_SECRET_KEY"), JSON.stringify(j));

// ── 7. Validation ───────────────────────────────────────────────
console.log("\n── Validation");
r = await req("/api/books", { method: "POST", body: { title: "" } });
check("POST /api/books empty title → 400", r.status === 400);

r = await req("/api/books/nonexistent-id");
check("GET /api/books/bad-id → 404", r.status === 404);

r = await req("/api/webhooks/stripe", { method: "POST", body: {} });
check("stripe webhook w/o secret/signature → 4xx/5xx", r.status >= 400 && r.status < 600, `status ${r.status}`);

// ── 8. DB state sanity ──────────────────────────────────────────
console.log(`\n── Summary: ${passed} passed, ${failed} failed (userId=${userId})`);
process.exit(failed > 0 ? 1 : 0);
