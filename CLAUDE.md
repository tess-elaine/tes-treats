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
- **Every primary CTA gets the bite.** Use `<BiteButton>` — the bite is built in.
- Cards: `bg-surface-container-lowest` (#fff), no border, with `scalloped-bite`.

## Bite mark system

Buttons use cream-colored oval `<span>` overlays — NOT mask-image — to simulate
a cookie bite at the top-right corner. This approach has zero pixel artifacts.

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

// Arbitrary hex:
<BiteButton biteColor="#f0ebe8">Shop</BiteButton>
```

### Size variants

`BiteButton` picks bite size automatically from the `size` prop:
- `size="lg"` → `btn-bite-1 / btn-bite-2 / btn-bite-3` (44×20, 32×14, 26×14 px)
- `size="md"` → `btn-bite-1-sm / btn-bite-2-sm / btn-bite-3-sm` (36×16, 26×12, 20×10 px)

Ghost variant gets no bites (transparent background = no bite to show).

### Adding bites to a new element (not a button)

1. Add `relative overflow-visible btn-bitten` to the element.
2. Insert bite spans inside it, before the content:
   ```tsx
   <div className="relative btn-bitten ...">
     <span className="btn-bite btn-bite-1" aria-hidden />
     <span className="btn-bite btn-bite-2" aria-hidden />
     <span className="btn-bite btn-bite-3" aria-hidden />
     <span className="relative z-10">content</span>
   </div>
   ```
3. If the element isn't on the default surface background, pass
   `style={{ "--bite-bg": "var(--color-surface-container)" }}`.

### Creating a new size variant

Add a new size block to the **Button Bite Marks** section in `globals.css`
following the same position-math pattern shown in the comments there. Then
reference the new suffix in the component (e.g. `btn-bite-1-xl`).

### Interactive workbench

`/src/app/(site)/lab/bites/page.tsx` is a local-only page at `/lab/bites`
for trying new bite sizes, crumb directions, and animations. Not linked from
any nav. The lab CSS is no longer in `globals.css` (graduated to production);
re-add lab-prefixed classes there if you need to experiment again.

## Local dev

```bash
npm run dev          # Turbopack dev server on :3000
npm run build        # Production build
npm run lint
```

When wiring DB/auth/Stripe, secrets live in `.env.local` (gitignored). Sample
values come from `.env.example` (committed). Never commit real keys.
