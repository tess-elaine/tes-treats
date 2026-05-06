# TES Treats — engineering notes

Greenfield Next.js commerce site for Tess Elaine Smith's home bakery. See
`/home/charlie/.claude/projects/-home-charlie-tes-treats/memory/` for product
context (drops, custom requests, fulfillment, tax) — this file is for code only.

## Stack

- Next.js 16.2 (App Router, Turbopack default) + React 19.2 + TypeScript
- Tailwind CSS v4 (CSS-first `@theme` config in `src/app/globals.css`)
- Drizzle ORM + Postgres (DO Managed in prod, Docker locally)
- Auth.js v5 (Google OAuth + Resend magic link, admin role on users.role)
- Stripe Checkout (catalog/drops) + Stripe payment links (custom-request quotes)
- Resend for transactional email
- DO Spaces (S3) for image uploads
- Deployed via DO App Platform (`.do/app.yaml`, `doctl`)

## Next 16 things that will bite you (read before editing)

- **`middleware.ts` is deprecated; use `proxy.ts` with named export `proxy`.**
  Runtime is `nodejs` only — Auth.js v5 handlers must run there. Config flags
  renamed too (`skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`).
- **`cookies()`, `headers()`, `draftMode()`, `params`, `searchParams` are async-only.**
  No more sync access. Always `await` them. Run `npx next typegen` to get
  `PageProps<'/path'>` / `LayoutProps<'/path'>` / `RouteContext<'/path'>` helpers.
- Image generators (`opengraph-image`, `icon`, `apple-icon`, `sitemap`) get
  Promise-wrapped params now.
- Local `next/image` with query strings requires `localPatterns` config; defaults
  for `minimumCacheTTL`, `imageSizes`, `qualities` changed.
- Authoritative source for any of this: `node_modules/next/dist/docs/` —
  read it before guessing.

## Tailwind v4 things

- No `tailwind.config.ts`. Theme tokens live in `src/app/globals.css` under
  `@theme { ... }`. Adding a `--color-foo: #...` makes `bg-foo`, `text-foo`,
  `border-foo` etc. immediately available.
- The Artisanal Crumb tokens (cocoa primary, cream surface, Epilogue/Newsreader
  fonts, scalloped-bite clip-path, ghost border, chocolate shadow) all live in
  `globals.css`. Never reintroduce Tailwind 3 patterns (`@layer base` with
  config-style declarations are fine; `tailwind.config.js` is not).

## Design system — "The Artisanal Crumb"

Source of truth is `globals.css`. Reference Stitch project (not source of truth):
`projects/17660998352866033967` — fetch screens via `mcp__stitch__get_screen`
when porting layouts; the HTML in `htmlCode.downloadUrl` is the most useful
reference.

Hard rules from the design doc:
- **No 1px solid borders for sectioning.** Use background color shifts between
  `surface`, `surface-container-low`, `surface-container`, etc.
- **No `<hr>`.** Same reason.
- **No pure black.** Use `on-surface` (#1c1b1a).
- **Every primary CTA gets the bite.** `class="scalloped-bite"` (defined in
  globals.css). On hover the bite expands.
- Cards: `bg-surface-container-lowest` (#fff), no border, with `scalloped-bite`.

## Local dev

```bash
npm run dev          # Turbopack dev server on :3000
npm run build        # Production build
npm run lint
```

When wiring DB/auth/Stripe, secrets live in `.env.local` (gitignored). Sample
values come from `.env.example` (committed). Never commit real keys.
