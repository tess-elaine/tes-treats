# TES Treats — TODO

Living list. Each item describes the gap and what "done" looks like so we
can pick any of them up later without re-explaining.

---

## Polish & UX

- [ ] **Vary bite positions across stacked cards** so a row of three product
  cards uses `bite="tr"`, `bite="tl"`, `bite="br"` (or similar) rather than
  all the same. Right now `NibbleCard` accepts `bite` but most callers leave
  it default. Walk the homepage / shop / drops listings and assign a mix.

- [ ] **Bite shape variety beyond circular**. Current bite is a single smooth
  arc per corner. Charlie wants "doesn't look so repetitive" — explore 2–3
  alternate bite shapes (oval, asymmetric, double-bite) and add as `bite-*`
  utilities in `globals.css`. Could use `mask-composite` to combine shapes.

- [ ] **Real product photography**. Hero, featured cards, drop hero, drop
  cookies, account cards all use gradients/brand-mark JPG as placeholders.
  Replace `products.image_url` and `drops.hero_image_url` with real photos
  once Tess shoots her cookies. Drop into `public/products/` or upload via
  admin once that UI exists.

- [ ] **Content pages that footer links to**: `/about`, `/contact`, `/pickup`,
  `/terms`, `/privacy`. Footer references all of them; they currently 404.
  Skeleton pages with placeholder copy are fine for v1.

- [ ] **Header behavior on scroll**. The glassmorphic header is fixed; could
  shrink/condense after scroll past hero. Nice-to-have.

---

## Admin

- [x] ~~Product CRUD UI~~. `/admin/products` is now full CRUD: list +
  `/new` create form + `/[id]` edit page with inline variant management
  (add/edit/delete/set-default). Image upload via `lib/storage.ts`.

- [x] ~~Order management actions~~. `/admin/orders` filters by status;
  `/admin/orders/[id]` has status transition buttons (paid → in_kitchen
  → ready → fulfilled, plus cancel from any state) and a refund button
  that issues a Stripe refund and emails the customer. Internal admin
  notes per order. "Mark ready" auto-emails the customer.

- [x] ~~Holiday CRUD~~. `/admin/holidays` is full CRUD: list, new, edit,
  hide toggle, delete. Create dedupes on (name, date) so the yearly seed
  is idempotent.

- [x] ~~Drop item per-cookie editing~~. `/admin/drops/[id]` now has an
  inline-editable cookie table — change dozen price, inventory, sort, or
  remove. "Add a cookie" picker pulls from products that aren't already
  in the box.

- [x] ~~Subscriber export~~. `/admin/subscribers/export` streams a CSV
  download (active by default; `?all=1` includes unsubscribed).

- [x] ~~Drop notification send~~. `/admin/drops/[id]` has a "Send
  announcement" button that blasts a "&lt;drop name&gt; is live" email
  to every active subscriber via `lib/email.ts`. Stamps
  `announcementSentAt` on the drop to prevent accidental double-send;
  re-send requires explicit toggle.

- [x] ~~Replace `kind` enum with full `product_category` table~~. Schema
  migration 0004 backfills existing kinds into categories and rewires
  product.category_id. Five categories seed by default (Cookies, Pies,
  Bars, Loaves, Other).

- [x] ~~Categories admin CRUD~~. `/admin/categories` list + new + edit +
  show/hide + delete (FK-protected from deleting in-use categories).
  New "Categories" item in the admin sidebar.

- [x] ~~Multi-image per product~~. Replaced the single `imageUrl` column
  with a `product_image` table. Exactly one row per product is
  `isPrimary` (used as the thumbnail everywhere). The rest form a
  gallery on the product page. Admin edit page has full image
  management (upload, replace, set primary, reorder, alt text, delete).

- [x] ~~Type-ahead category picker on the product form~~. Native HTML5
  `<input list="…">` + `<datalist>` combobox: type to filter or click
  to dropdown, no JS required. New `<CategoryTypeahead>` component.

- [x] ~~Public product page image carousel~~. New
  `<ProductGallery>` client component on `/shop/[slug]` with main
  image + thumbnail strip + prev/next buttons + counter. Falls back to
  the gradient placeholder when no images exist.

---

## Customer flows

- [ ] **Drop inventory enforcement at checkout**. `dropItems.dozen_sold` and
  `drops.assorted_box_sold` show in admin but are never incremented when an
  order containing a drop_box / drop_dozen is placed. The webhook handler
  (and the dev-mode bypass in `/checkout/actions.ts`) needs to bump these.
  Bug: a drop can oversell.

- [ ] **Order confirmation email**. Webhook + dev-checkout flow currently
  mark orders paid but don't email the customer a receipt. Add to
  `/api/webhooks/stripe/route.ts` and the dev-mode branch in checkout.

- [ ] **Account settings page**. Change password, change name, add phone,
  delete account.

- [ ] **Forgot password** flow. Magic-link covers it implicitly, but a real
  "reset password" email is more conventional UX.

- [ ] **Cart "saved for later"** — nice-to-have, lets customers stash items
  off the cart without removing them.

---

## Operational

- [ ] **Tax YTD threshold banner**. `site_config.tax_threshold_cents` is wired
  but no UI yet warns admin when YTD revenue crosses 80% of it. Compute
  YTD `sum(orders.total_cents)` filtered to current calendar year, compare
  to threshold, show banner on `/admin` dashboard.

- [ ] **Backups for self-hosted Postgres**. `docker-compose.prod.yml` runs
  Postgres on the VPS but doesn't dump to S3 on a cron. Add a `backup`
  service (postgres image with a cron + `pg_dump` to Spaces).

- [ ] **Stripe Connect / multi-tenant**. If Charlie hosts multiple clients
  off this same codebase, each business needs its own Stripe account +
  Spaces bucket + admin email set. Currently one set of env vars per
  deploy. Either deploy one app per client (simple) or formalize tenant
  isolation in DB (big lift). Punt until there's a second client.

---

## Bugs / paper cuts found in testing

- [x] ~~Admin layout double-rendered "Admin · admin@... · Sign out" because
  the public SiteHeader was wrapping admin pages too.~~ Fixed via route
  groups: public pages live under `(site)/`, admin has its own root layout.

- [x] ~~Bite shape was a jagged zigzag and the cards translated up on hover.~~
  Now smooth circular bites via `mask-image: radial-gradient`. Four
  positional variants (`tr`/`tl`/`br`/`bl`) + a small `scalloped-bite-sm`
  for buttons. Hover translation removed.

- [x] ~~Admin drops + tax-threshold inputs were in cents.~~ All money inputs
  now USD with 2-decimal precision; converted to cents server-side.

- [x] ~~Homepage "Join the secret nibbler list" headline + subtext were
  invisible (cocoa text on cocoa card).~~ Now explicitly `text-on-primary`.

- [x] ~~Runtime error on `/account`: AccountIndex negative timestamp from a
  redirect-only server component.~~ `/account` is now a real landing page
  with order + custom-request snapshots.

- [x] ~~Header showed "Admin Admin Sign out" because the user's first name
  was "Admin".~~ Replaced inline account text with a `ProfileDropdown` —
  click the avatar (initials) to get a menu with name, account links, admin
  link if applicable, and sign out.

- [x] ~~Admin sidebar "View site" / "Sign out" links weren't aligned.~~
  Form uses `display: contents` and parent uses `items-baseline gap-4`.

- [x] ~~Bite shape was a single perfect circle, looked nothing like a real
  bite.~~ Each variant is now 3-4 overlapping circular arcs composed via
  `mask-composite: intersect` — ragged edges that read as teeth marks.

- [x] ~~Newsletter section subtext was invisible because NibbleCard's default
  `bg-surface-container-lowest` was winning over user `bg-primary` override
  due to CSS source order.~~ `cn()` now uses `tailwind-merge` so utility
  conflicts resolve based on className order — last one wins.

- [x] ~~Bite marks on form fields sometimes clipped form content / inputs.~~
  Every form-containing NibbleCard now passes `bite="none"` (rounded-lg
  corners, no mask). The button-level `scalloped-bite-sm` on BiteButton
  stays — Charlie wanted to keep that.

- [x] ~~Admin section had bite marks on every card.~~ All admin NibbleCards
  pass `bite="none"`.

- [x] ~~No mobile nav — only desktop links visible past the md breakpoint.~~
  New `MobileNav` client component: hamburger (left) opens a full-height
  drawer with the nav items. Header on mobile is now a 3-zone grid:
  hamburger left, logo centered, account+cart right.

---

## Engineering hygiene

- [ ] **Image optimization for uploaded photos**. Custom-request photos go
  through `lib/storage.ts` and get rendered via `next/image`. In dev they
  come from `/public/uploads` which Next optimizes; in prod they come from
  Spaces (S3) and need `remotePatterns` matching the bucket host. The
  current `remotePatterns: { protocol: "https", hostname: "**" }` is loose
  — tighten once we know the production bucket URL.

- [ ] **Error boundaries**. No `error.tsx` files yet — a server-side error
  bubbles to the default Next 500 page. Add `error.tsx` per route segment
  (or at least one global) that matches the brand.

- [ ] **404 page**. Same as above: no custom `not-found.tsx`. Brand it.

- [ ] **CSRF on server actions**. Next auto-protects server actions from
  cross-origin POSTs via origin headers, but verify the policy is on for
  prod (`serverActions.allowedOrigins` in `next.config.ts`).

- [ ] **Rate limiting** on `/custom` (photo upload), `/drops/notify`
  (subscribe), `/sign-in` (magic link request). Currently anyone can spam
  these. Easy add: a small in-memory or Redis-backed rate limiter per IP.

- [ ] **Audit logs** for admin actions (set quote, decline, change drop
  inventory, change site config). Append-only `admin_action` table.

- [ ] **Tests**. Zero test coverage so far. Priorities: cart merge logic,
  order creation, Stripe webhook signature handling.
