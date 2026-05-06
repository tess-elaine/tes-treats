# Deploying TES Treats

The app ships as a Docker image. The same image runs on:
- DigitalOcean App Platform (with managed Postgres)
- A single $5/mo VPS (Hetzner, Linode, DO Droplet) via `docker-compose.prod.yml`
- Railway, Fly.io, Render, Coolify — anywhere that runs containers + Postgres

Pick the option that matches the client's budget. The codebase doesn't change.

## Required env vars

See `.env.example` for the full list. Production minimums:

| Var | What |
|---|---|
| `DATABASE_URL` | `postgres://user:pass@host:5432/db` |
| `AUTH_SECRET` | 32+ random bytes (`openssl rand -base64 32`) |
| `AUTH_URL` | Public origin, e.g. `https://tes-treats.com` |
| `ADMIN_EMAILS` | Comma-separated. Auto-promotes to admin on first sign-in. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Any SMTP provider (Resend, SES, Postmark, Mailgun) |
| `EMAIL_FROM` | `TES Treats <hi@yourdomain.com>` (must be a verified sender at your provider) |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | From the Stripe dashboard |
| `SPACES_*` | DigitalOcean Spaces, Cloudflare R2, AWS S3, or MinIO — all S3-compatible |

OAuth and `AUTH_GOOGLE_*` are optional — without them, sign-in still works via password + magic-link.

## Option A — DigitalOcean App Platform (managed)

Best if you don't want to think about ops.

```bash
# One-time
doctl auth init
doctl apps create --spec .do/app.yaml

# Subsequent deploys
git push origin main          # auto-deploy from GitHub if configured
# OR
doctl apps update <APP_ID> --spec .do/app.yaml

# Set/rotate secrets
doctl apps update <APP_ID> --spec .do/app.yaml \
  --env AUTH_SECRET=$(openssl rand -base64 32)
```

Cost: ~$5 web + ~$15 managed Postgres dev tier = **~$20/mo**.

After first deploy:
1. Add the deploy URL as `https://your-app.ondigitalocean.app/api/webhooks/stripe` in Stripe → Developers → Webhooks. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
2. Add `https://your-app.ondigitalocean.app/api/auth/callback/google` to your Google OAuth client redirect URIs (if using Google sign-in).
3. Verify your email-from domain at your SMTP provider.

## Option B — Single VPS (cheapest, fully portable)

Best when $20/mo is too steep — runs the whole stack on one $5/mo server.

```bash
# On the VPS (Ubuntu/Debian)
curl -fsSL https://get.docker.com | sh
git clone <your-repo> tes-treats && cd tes-treats

# Create .env from .env.example with real production values, including
#   POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
cp .env.example .env
nano .env

# Edit Caddyfile with your real domain
sed -i 's/tes-treats.example.com/yourdomain.com/' Caddyfile

# Bring it up
docker compose -f docker-compose.prod.yml up -d --build

# Apply migrations (only needed once; the Dockerfile CMD also does this on every start)
docker compose -f docker-compose.prod.yml run --rm app \
  node node_modules/drizzle-kit/bin.cjs migrate
```

Caddy automatically obtains a Let's Encrypt cert as soon as the domain resolves to your VPS.

Cost: $5–6/mo for the VPS. Postgres lives on the same box; back it up with `pg_dump` to S3 on a cron.

## Option C — Other PaaS

The same Dockerfile works on Fly.io (`fly launch`), Railway (link the GitHub repo), Render (Web Service from Dockerfile), Coolify, etc. The only thing that changes is how you wire env vars and the database connection string.

## Stripe webhook setup (any host)

1. In the Stripe dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://YOUR-DOMAIN/api/webhooks/stripe`
3. Events: `checkout.session.completed`
4. Copy the signing secret → set `STRIPE_WEBHOOK_SECRET` env var on the host
5. For local dev with real Stripe: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

## Local dev quick-start

```bash
docker compose up -d         # postgres + mailpit
npm install
npm run db:migrate
npm run db:seed              # creates admin@admin.com / customer@customer.com (password: "password")
npm run dev
```

- App: http://localhost:3000
- Mailpit (catches all outbound email): http://localhost:8025
- Drizzle Studio: `npm run db:studio` → https://local.drizzle.studio
