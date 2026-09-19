# 📚 AI Book Studio

A full-stack, AI-powered book creation and publishing platform. Go from a rough
idea to a **published, print-ready paperback** — AI brainstorming, chapter
writing, grammar polish, DALL-E covers, Stripe checkout and Lulu
print-on-demand, all in one app.

## Tech stack

| Layer      | Tech                                                        |
| ---------- | ----------------------------------------------------------- |
| Framework  | Next.js 14 (App Router) + TypeScript                        |
| Styling    | Tailwind CSS                                                |
| Database   | PostgreSQL (Neon) + Prisma ORM                              |
| Auth       | NextAuth (Credentials provider, JWT sessions, auto-create)  |
| AI         | OpenAI — `gpt-4o-mini` (text) + `dall-e-3` (covers)         |
| Payments   | Stripe Checkout + webhooks                                  |
| Printing   | Lulu Print API (print-on-demand)                            |
| PDF        | PDFKit (6×9in trade paperback export)                       |

## Quick start

```bash
# 1. Install dependencies (runs `prisma generate` automatically)
npm install

# 2. Configure environment
cp .env.example .env.local   # then fill in the values

# 3. Create the database schema (Neon or any PostgreSQL)
npx prisma migrate dev     # applies the committed migrations (fresh DBs)
# – or, for an existing DB that already has tables/data (non-destructive):
#   npx prisma db push
#   npx prisma migrate resolve --applied 20260919065612_init   # baseline history

# 4. Run
npm run dev                  # http://localhost:3000
```

### Verification

The repo ships with an end-to-end smoke test (`scripts/smoke.mjs`) that boots
the production build against a local Postgres and exercises auth, book/chapter
CRUD, publishing, the store, PDF export, validation and missing-key handling:

```bash
npm run build && npm start &   # server on :3000
npm run smoke                  # 34 checks
```

### Required environment variables (`.env.local`)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (Neon) |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` (or prod URL) |
| `OPENAI_API_KEY` | Powers ideas, chapters, grammar, covers |
| `STRIPE_SECRET_KEY` | Checkout sessions |
| `STRIPE_WEBHOOK_SECRET` | From `stripe listen` / Stripe dashboard |
| `NEXT_PUBLIC_APP_URL` | Used for Stripe redirect URLs |
| `LULU_API_TOKEN`, `LULU_PRINT_SKU`, `LULU_CONTACT_EMAIL` | Optional — print-on-demand (orders stay PAID if unset) |
| `NEXT_PUBLIC_DEFAULT_PRINT_PRICE` | Optional — retail price when a book has none (default 24.99) |

### Stripe webhooks (local)

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# copy the whsec_... it prints into STRIPE_WEBHOOK_SECRET
```

## Features

- **Auth** — email/password at `/login`; the account is **auto-created on first
  sign-in** (no registration form). JWT sessions expose `user.id` + `role`.
  `/dashboard` and `/books/*` are protected by middleware.
- **Idea wizard** (`/books/new`) — genre + keywords → 3 AI concepts (title,
  hook, synopsis, target audience) → pick one → book created.
- **Book editor** (`/books/[id]`) — three tabs:
  - **Write**: chapter sidebar (add / delete / reorder), *AI Write Chapter*
    (~1,200 words from outline + tone), title & content editing, Save
    (snapshots the previous content into a `Version` row), Grammar Check with an
    explainable change list + one-click apply.
  - **Cover**: DALL-E 3 art direction prompt → 1024×1792 cover, saved on the
    book; style suggestion chips; regenerate anytime.
  - **Order Print**: quantity + shipping address → Stripe Checkout; on payment
    the webhook marks the order `PAID` and submits a Lulu print job
    (`PRINTING`).
- **Publish** — header button flips `isPublished` + status `PUBLISHED`; the
  book appears in the public **store** (`/store`, `/store/[id]`) where anyone
  can buy a printed copy.
- **PDF export** — `GET /api/books/[id]/pdf` streams a print-ready 6×9in PDF
  (title page, about page, chapters).

## API routes

| Method & path | Description |
| --- | --- |
| `POST /api/ai/idea` | 3 book ideas from `{ genre, keywords }` |
| `POST /api/ai/chapter` | Full ~1,200-word chapter `{ bookTitle, chapterTitle, outline, tone }` |
| `POST /api/ai/grammar` | `{ text }` → `{ corrected, changes[] }` |
| `POST /api/ai/cover` | `{ bookId, prompt }` → DALL-E 3 cover URL saved on book |
| `GET /api/books` | List current user's books |
| `POST /api/books` | Create a book |
| `GET /api/books/[id]` | Book with chapters (owner) |
| `PATCH /api/books/[id]` | Update book / publish |
| `POST /api/books/[id]/chapters` | Add chapter (optionally AI-written) |
| `PUT /api/chapters/[id]` | Update chapter (archives previous version) |
| `DELETE /api/chapters/[id]` | Delete chapter |
| `GET /api/books/[id]/pdf` | Stream 6×9in PDF |
| `POST /api/orders` | Create order + Stripe Checkout session → `{ orderId, url }` |
| `GET /api/store/books` | Public list of published books |
| `POST /api/webhooks/stripe` | `checkout.session.completed` → PAID → Lulu print job |

## Data model

```
User ──< Book ──< Chapter ──< Version
  └─────< Order >──┘
```

- **User** — email (unique), name, image, password hash, role
  (`AUTHOR`/`READER`/`ADMIN`)
- **Book** — title, description, coverUrl, status
  (`DRAFT→WRITING→EDITING→DESIGNING→READY→PUBLISHED`), genre, language,
  isPublished, price, authorId
- **Chapter** — title, content, order, wordCount, bookId (cascade delete)
- **Version** — content snapshot of a chapter before each save
- **Order** — userId, bookId, quantity, amount, status
  (`PENDING/PAID/PRINTING/SHIPPED/DELIVERED/CANCELLED`), shippingAddr (JSON),
  stripeId, printOrderId

## File structure

```
ai-book-studio/
├── prisma/schema.prisma            # User, Book, Chapter, Version, Order
├── src/
│   ├── middleware.ts               # Protects /dashboard + /books
│   ├── app/
│   │   ├── layout.tsx  page.tsx    # Shell + landing page
│   │   ├── globals.css             # Tailwind + component classes
│   │   ├── login/page.tsx          # Credentials sign-in (auto-create)
│   │   ├── dashboard/page.tsx      # My books grid + stats
│   │   ├── books/new/page.tsx      # 2-step AI idea wizard
│   │   ├── books/[id]/page.tsx     # 3-tab editor (Write/Cover/Print)
│   │   ├── store/page.tsx          # Public bookstore
│   │   ├── store/[id]/page.tsx     # Book detail + buy
│   │   ├── not-found.tsx
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── ai/{idea,chapter,grammar,cover}/route.ts
│   │       ├── books/route.ts                  # GET list, POST create
│   │       ├── books/[id]/route.ts             # GET, PATCH (publish)
│   │       ├── books/[id]/chapters/route.ts    # POST (AI write)
│   │       ├── books/[id]/pdf/route.ts         # PDFKit stream
│   │       ├── chapters/[id]/route.ts          # PUT (versions), DELETE
│   │       ├── orders/route.ts                 # Stripe Checkout
│   │       ├── store/books/route.ts            # public catalog
│   │       └── webhooks/stripe/route.ts        # PAID → Lulu
│   ├── components/
│   │   ├── providers.tsx  header.tsx  icons.tsx
│   │   ├── book-card.tsx  status-badge.tsx  buy-button.tsx
│   │   ├── ui/toast.tsx
│   │   └── editor/{book-editor,write-tab,cover-tab,print-tab}.tsx
│   ├── lib/
│   │   ├── prisma.ts  auth.ts  session.ts  api.ts
│   │   ├── openai.ts  stripe.ts  lulu.ts
│   │   ├── serialize.ts  utils.ts  client.ts
│   └── types/{index.ts,next-auth.d.ts}
├── .env.example
└── package.json
```

## Writer of the Week + Pools

Weekly and community pot contests (dashboard section + public `/pools` page):

- **Enter / apply** — register a *published* book into the system weekly pool
  (fee `CONTEST_ENTRY_FEE`, default 10, currency `CONTEST_CURRENCY`, default
  `inr` → ₹10) or into any user-created pool (creator sets fee + duration,
  1–30 days). Payment via Stripe Checkout; the webhook flips the entry PAID.
- **Create** — any signed-in user can open a pool: `POST /api/pools`
  `{ title, fee, days }` (or the Create-pool form on `/pools`).
- **Pot** — paid entry fees accumulate per pool (live on `/pools` + dashboard).
- **Auto-announce + auto-transfer** — when a pool's end time passes it closes
  automatically (lazily on `GET /api/contest` / `GET /api/pools`, plus
  `POST /api/cron/contests` for punctuality — see `vercel.json`): ONE winner is
  drawn from the paid entries, announced on `/pools` (Winners list) and the
  dashboard banner, and the whole pot is marked transferred to the winner
  (`payoutStatus: PAID`, `payoutPaidAt`). Move the money via your payment
  provider / bank (Stripe Connect for programmatic transfers).

Models: `Contest` (system week when `title` is null, user pool when set,
`creatorId`, `entryFee`), `ContestEntry`. Env: `CONTEST_ENTRY_FEE`,
`CONTEST_CURRENCY`, `CRON_SECRET` (optional cron auth).

## Production notes

- **DALL-E URLs expire after ~1 hour.** For production, download generated
  covers and re-host them (S3/R2/`public/`) before persisting `coverUrl`.
- Set `LULU_PRINT_SKU` to a real Lulu SKU that encodes your 6×9 trim size,
  paper and binding options.
- Use `prisma migrate deploy` in CI instead of `db push`.
- Rate-limit the AI routes (e.g. Upstash) before exposing publicly.
