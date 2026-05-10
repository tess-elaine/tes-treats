# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# TES Treats — engineering notes

Greenfield Next.js commerce site for Tess Elaine Smith's home bakery. See
`/home/charlie/.claude/projects/-home-charlie-tes-treats/memory/` for product
context (drops, custom requests, fulfillment, tax) — this file is for code only.

## Stack

- Next.js 16.2 (App Router, Turbopack default) + React 19.2 + TypeScript
- Tailwind CSS v4 (CSS-first `@theme` config in `src/app/globals.css`)
- Drizzle ORM + Postgres (Railway Postgres in prod, Docker locally)
- Auth.js v5 (Google OAuth + Resend magic link + email/password, admin role on users.role)
- Stripe Checkout (catalog/drops) + Stripe payment links (custom-request quotes)
- Resend for transactional email
- DO Spaces (S3-compatible) for image uploads — falls back to `public/uploads/` locally
- Deployed via Railway (Docker; auto-detects Dockerfile on push)

## Commands

```bash
npm run dev          # Turbopack dev server on :3000
npm run build        # Production build — run this to verify no TS/compile errors
npm run lint
npm run db:generate  # Generate a new Drizzle migration from schema changes
npm run db:migrate   # Apply pending migrations (drizzle-kit)
npm run db:push      # Push schema directly (dev only, skips migration files)
npm run db:seed      # Seed sample data (safe to re-run)
npm run db:studio    # Drizzle Studio GUI
```

**Local DB** runs in Docker (`docker-compose.yml`):
```bash
docker compose up -d        # start Postgres (:5432) + Mailpit (:1025 SMTP, :8025 UI)
docker exec -i tes_treats_pg psql -U tes -d tes_treats < drizzle/XXXX.sql  # run a migration manually
```

No test suite yet. **Always run `npm run build` after changes** to catch TypeScript errors before reporting done. Also check the running dev server visually for both the public site AND admin pages affected by the change.

## Production deployment — Railway

**This is a live commerce site. Broken deployments cost Tess sales and trust. Treat production stability as the top constraint.**

### How deploys work
1. Push to `main` → Railway builds the Docker image (`Dockerfile`)
2. Container starts: `node scripts/migrate.mjs && node server.js`
3. Railway polls `GET /api/health` until it returns 200 (timeout: 120s)
4. **Only if health check passes** does Railway cut traffic to the new container — the old deployment stays live until then
5. If health check never passes, Railway rolls back automatically

### Health check — `src/app/api/health/route.ts`
Verifies DB connectivity **and** that the current schema is fully applied by querying columns/tables that migrations add. Returns 503 if anything is missing. **Every schema migration must be reflected here** — if you add a table or a column that customer-facing pages depend on, add a probe for it so a missed migration fails the health check rather than taking down the site.

### Migration rules — `scripts/migrate.mjs`
Railway runs migrations via the Drizzle runtime migrator (`drizzle-orm/postgres-js/migrator`), **not** `drizzle-kit`. The runtime migrator tracks applied migrations by hashing the SQL file. Migrations written manually (not via `drizzle-kit generate`) can fall out of sync with the tracker.

**The reliable pattern** — always add new DDL to `migrate.mjs` as belt-and-suspenders direct SQL, alongside the migration file:

```js
// In scripts/migrate.mjs, before the migrate() call:
await client`ALTER TABLE "my_table" ADD COLUMN IF NOT EXISTS "my_col" text`;
await client`CREATE TABLE IF NOT EXISTS "new_table" ( ... )`;
```

Rules:
- Always use `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` so statements are idempotent and safe to re-run on every deploy
- Add the same DDL to both the `.sql` migration file (with `IF NOT EXISTS`) AND `migrate.mjs`
- Never rely solely on the Drizzle migration tracker for columns/tables that customer-facing pages depend on

### Schema change checklist
When making any schema change:
1. Add the migration SQL to `drizzle/XXXX_name.sql` (using `IF NOT EXISTS`)
2. Register it in `drizzle/meta/_journal.json`
3. Add the same DDL to `scripts/migrate.mjs` (belt-and-suspenders)
4. Apply locally: `docker exec -i tes_treats_pg psql -U tes -d tes_treats < drizzle/XXXX_name.sql`
5. Update `src/app/api/health/route.ts` to probe any new table/column that pages depend on
6. Run `npm run build` — zero errors required before pushing

## Next 16 things that will bite you

- **`middleware.ts` is deprecated; use `proxy.ts` with named export `proxy`.**
  Runtime is `nodejs` only — Auth.js v5 handlers must run there.
- **`cookies()`, `headers()`, `draftMode()`, `params`, `searchParams` are async-only.**
  Always `await` them. Run `npx next typegen` to get `PageProps<'/path'>` helpers.
- Image generators (`opengraph-image`, `icon`, `apple-icon`, `sitemap`) get Promise-wrapped params.
- Local `next/image` with query strings requires `localPatterns` config.
- Authoritative source: `node_modules/next/dist/docs/` — read it before guessing.

## Tailwind v4 things

- No `tailwind.config.ts`. Theme tokens live in `src/app/globals.css` under `@theme { ... }`.
- Adding `--color-foo: #...` makes `bg-foo`, `text-foo`, `border-foo` etc. immediately available.
- The Artisanal Crumb tokens (cocoa primary, cream surface, Epilogue/Newsreader fonts,
  scalloped-bite clip-path, ghost border, chocolate shadow) all live in `globals.css`.

## Architecture

### Route groups
- `src/app/(site)/` — public customer-facing site (header + footer chrome via layout)
- `src/app/admin/` — admin panel (sidebar chrome via layout, protected by `proxy.ts`)
- `src/app/api/` — API routes: Auth.js handler + Stripe webhook

### Auth & admin protection
- `proxy.ts` (not `middleware.ts`) guards `/admin/*` — redirects unauthenticated to `/sign-in`, non-admins to `/`.
- Page-level: `requireAdmin()` / `requireUser()` from `lib/auth-helpers.ts` for granular control.
- Admin role is set automatically on first sign-in for emails listed in `ADMIN_EMAILS` env var (comma-separated), via `src/lib/admin-bootstrap.ts`. No SQL needed.
- Session strategy is JWT (required by Credentials provider). Role is baked into the token and re-hydrated from DB on `trigger === "update"`.

### Database
- Single `db` export from `src/db/index.ts` (postgres-js + Drizzle, connection reused across hot reloads via `global.__pg`).
- Schema files in `src/db/schema/` — each domain in its own file, all re-exported from `src/db/schema/index.ts`.
- **All money is stored in cents (integer).** Never store dollars as floats.
- Migrations live in `drizzle/`. Run `npm run db:generate` after schema changes to produce a new migration file, then apply with `npm run db:migrate` or manually via `docker exec psql`.

### Schema domains

**catalog**: `product_category → product → product_variant + product_image`
- `product.isAvailable` controls `/shop` visibility. Drop-only cookies stay `false`.
- One `product_image` per product has `isPrimary=true` — enforced in app code, not DB constraint.

**drops**: `cookie_box → cookie_box_item (3-4 cookies) → drop → drop_item`
- `cookie_box` is the reusable curated product (name, description, tagline, hero image).
- `cookie_box_item` defines which cookies are in the box and their display order.
- `drop` is a timed sale of a box — has open/close timestamps, fulfillment dates, pricing, inventory.
- `drop_item` is per-drop à la carte pricing for each cookie; auto-populated from `cookie_box_item` rows when a drop is created. Sorted by `sort_order` (denormalized from box item).
- `drop_subscriber` — "notify me" email list, separate from user accounts.

**orders**: `order → order_item` (polymorphic: variant OR drop box OR drop dozen)
- `order_item` keeps snapshot fields (`nameSnapshot`, `unitPriceCents`) so historical orders survive catalog edits.
- Order number format: `TT-XXXX` (auto-generated on insert).
- Payment confirmed via Stripe webhook at `/api/webhooks/stripe` AND on the success-redirect confirmation page (belt + suspenders).

**cart**: `cart → cart_item` (same polymorphic shape as order_item)
- Signed-in users: DB-backed (`cart` table, one per user).
- Guests: HTTP-only cookie `tt_cart` (JSON of line keys + quantities — never prices/names).
- Merge-on-sign-in is automatic inside `getCart()`.

**custom_requests**: `custom_request + custom_request_photo`
- Workflow: `submitted → reviewing → quoted → paid → in_kitchen → fulfilled`
- Payment via Stripe payment link (not Checkout) — Tess generates the link in admin.

**site_config**: singleton row (id=1) — bakery address, pickup/delivery settings, tax toggle, delivery zones. **Tess is moving — always read address from `site_config`, never hardcode.**

### Lib helpers worth knowing
- `lib/drops.ts` — `activeDrops()`, `pastDrops()`, `nextDrop()`, `phaseOf()`, `inventoryRemaining()`
- `lib/cart.ts` — `getCart()`, `addToCart()`, `clearCart()` — covers both cookie + DB backends
- `lib/orders.ts` — `createPendingOrder()` — shared between checkout and webhook
- `lib/storage.ts` — `putObject()` — S3/Spaces/local fallback; `processUploadedImage()` normalizes to WebP ≤1600px
- `lib/stripe.ts` — `getStripe()` returns `null` when unconfigured; set `STRIPE_DISABLED=true` to force dev path
- `lib/format.ts` — `formatCents()`, `formatDate()` — use these everywhere, never inline

### Components
- `<BiteButton>` — **the only button component**. Use it for every clickable action that looks like a button. Never write a raw `<button>` or `<a>` with manual `bg-primary`/`rounded-md`/`px-*` styling — that's the old pre-component approach and must not come back. Props: `size` (`"lg"` only — `"md"` is retired), `variant` (`"primary"` | `"secondary"` | `"ghost"`), `href` (renders as Next.js `<Link>`), `biteColor` (see below). Small inline text-link actions (table row actions, pagination) may remain as plain styled text links.
- `<NibbleCard>` — card surface. `bite` prop is accepted but all positions resolve to `rounded-lg` — the scalloped-mask bite was removed from cards.
- `<ConfirmSubmit>` — wraps a submit button with a JS `confirm()` dialog. Used for destructive admin actions.

## Design system — "The Artisanal Crumb"

Source of truth is `globals.css`. Reference Stitch project (not source of truth):
`projects/17660998352866033967` — fetch screens via `mcp__stitch__get_screen`
when porting layouts; the HTML in `htmlCode.downloadUrl` is the most useful reference.

Hard rules from the design doc:
- **No 1px solid borders for sectioning.** Use background color shifts between `surface`, `surface-container-low`, `surface-container`, etc.
- **No `<hr>`.** Same reason.
- **No pure black.** Use `on-surface` (#1c1b1a).
- **Every primary CTA gets the bite.** Use `<BiteButton>` — the bite is built in.
- Cards: `bg-surface-container-lowest` (#fff), no border, with `scalloped-bite`.

## Bite mark system

Buttons use cream-colored oval `<span>` overlays — NOT mask-image — to simulate
a cookie bite at the top-right corner. This approach has zero pixel artifacts.

The old `scalloped-bite-sm` / `scalloped-bite` CSS mask approach has been fully
removed. Do not re-introduce it. Always use `<BiteButton>` — never copy its
styles manually.

### How it works

`BiteButton` renders three hidden spans (`btn-bite-1/2/3`) inside the button.
They are filled with `--bite-bg` (defaults to `var(--color-surface)`).

- **bite-1** — main corner oval, always visible
- **bite-2** — smaller nibble to its left, always visible
- **bite-3** — third bite to the right/lower, appears on hover (wobble animation)

On hover: the button wobbles (`bite-chomp` keyframe), bite-3 scales in, and five
`btn-crumb` spans fly out around the bite cluster.

### Setting `--bite-bg`

The bites must match the **parent background**, not the button color. The default
matches the global page surface (`#fdf8f5`). Override when the button is on a
different surface:

```tsx
// On a surface-container card (#f2edea):
<BiteButton biteColor="var(--color-surface-container)">Shop</BiteButton>

// On a white card (#fff):
<BiteButton biteColor="var(--color-surface-container-lowest)">Shop</BiteButton>
```

### Size variants

Both sizes use the same three-bite cluster geometry (top-right, bites going right and down). `size="md"` is ~75% scale.

- `size="lg"` → hero CTAs, primary page actions (`px-8 py-4 text-lg`)
- `size="md"` → form actions, inline buttons (`px-6 py-3 text-base`)

Ghost variant gets no bites (transparent background = no bite to show).

## Working checklist — before marking any task done

1. `npm run build` passes with zero errors.
2. Visually check the **public-facing page(s)** affected (dev server at :3000).
3. Visually check the **admin page(s)** affected (sign in as admin@admin.com / password).
4. Check **both desktop and mobile** nav when touching header/footer/nav.
5. If schema changed: follow the full **Schema change checklist** above — migration file, journal, migrate.mjs, local apply, health check update.
6. Search the full codebase for any other files referencing the changed symbol/table/column — Drizzle schema changes ripple into lib helpers, server actions, AND public pages simultaneously.
7. **Never push a change that breaks `/`, `/shop`, `/shop/[slug]`, or `/cart`** — these are the customer-facing purchase paths. If uncertain, verify visually before pushing.

## Copy conventions

- Public-facing: "treat drops" (not "holiday drops"). The drop section is for any time of year.
- Bakery name: always "TES Treats" — never "Tes Treats" or "TES treats".
- Money: always display via `formatCents()`. Never construct price strings manually.
- Dates: always display via `formatDate()`. Accepts a `Date`, string, or `Intl.DateTimeFormatOptions` override.

## Local dev

Secrets live in `.env.local` (gitignored). Copy `.env.example` and fill in values.
`STRIPE_DISABLED=true` lets you run checkout without real Stripe keys.
Mailpit web UI at http://localhost:8025 catches all outbound email.

### GitHub

- Remote: `https://github.com/tess-elaine/tes-treats.git`
- Username: `tess-elaine`
- Auth token: stored in `.env.local` as `GITHUB_AUTH`
- To push: `git push https://tess-elaine:$GITHUB_AUTH@github.com/tess-elaine/tes-treats.git main`

### Dev server restarts

After replacing static files in `public/` (images, fonts, etc.), always:
1. Kill the running dev server (`pkill -f "next dev"`)
2. Clear the Next.js image cache (`rm -rf .next/cache/images`)
3. Restart it (`npm run dev > /tmp/next-dev.log 2>&1 &`)

Static file swaps are not picked up by Turbopack hot reload — a full restart is required.
