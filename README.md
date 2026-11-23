# Mali Ustvarjalci – Dropshipping Shop

Set ADMIN_NEW_PASSWORD before seeding (at least 16 characters and at most 72 bytes). Rotate existing admin passwords with db:set-admin-password. Development mock administrators require MOCK_ADMIN_PASSWORD. Generate a fresh NEXTAUTH_SECRET for each environment.

Tech stack: Next.js 14 (App Router), TypeScript, Tailwind, Prisma, NextAuth, Stripe, next-intl, Zustand, Zod.

## Setup
1. Create `.env` (or copy `.env.example`):
   - DATABASE_URL="file:./dev.db" (SQLite for local dev) or Postgres URL
   - NEXTAUTH_URL, NEXTAUTH_SECRET
   - AUTH_MODE=mock (optional: enables mock auth without DB)
   - MOCK_ADMIN_EMAIL=admin@example.com / MOCK_ADMIN_PASSWORD= (optional)
   - STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (when enabling payments)
   - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (optional)
   - SUPPLIER_FEED_URL, SUPPLIER_ORDER_URL, SUPPLIER_API_KEY
2. Install deps: `npm install`.
3. Dev server: `npm run dev`.
4. Optional (when DB ready): `npm run prisma:migrate` and `npm run db:seed`.
5. Monitoring (optional): set `SENTRY_DSN` to enable error tracing.

## Supplier sync & import (DB required)
- Sync now API: `POST /api/admin/sync-now` (requires admin, or header `x-cron-secret` matching `CRON_SECRET`; returns 400 in mock/SQLite)
- CLI scripts:
  - `npm run sync:supplier` (uses SUPPLIER_FEED_URL)
  - `npm run import:products -- path/to/file.csv`

### Supplier configuration
- **SUPPLIER_FEED_URL**: CSV/JSON/XML feed with fields id,title,description,price,quantity,images[]
- **SUPPLIER_API_KEY**: Optional bearer token for feed and supplier API
- **SUPPLIER_ORDER_URL**: Endpoint to forward paid orders (POST JSON)

### Scheduled daily sync
- Option A: External cron (e.g., GitHub Actions or hosted cron) hitting your deployed sync endpoint once per day/hour.
- Requirements:
  - Endpoint: `POST /api/admin/sync-now`
  - Header: `x-cron-secret: $CRON_SECRET`
  - Env var: set `CRON_SECRET` in your deployment environment.
- Example curl:
  - `curl -X POST -H "x-cron-secret: $CRON_SECRET" https://your-app.vercel.app/api/admin/sync-now`

### Testing end-to-end
1. Copy `.env.example` to `.env` and fill values.
2. `npm run prisma:migrate && npm run db:seed`.
3. Run sync: `npm run sync:supplier` (or use Admin → Suppliers → Sync now).
4. Checkout: from `/sl/checkout`, pay via Stripe (test keys) → Stripe webhook creates Order and triggers supplier forwarding.
5. Simulate supplier status update: `POST /api/supplier-webhook` with header `x-api-key: SUPPLIER_API_KEY` and body `{ "supplierOrderId": "...", "status": "shipped" }`.

## Auth
- Mock mode (`AUTH_MODE=mock`): use Credentials
  - Admin: `admin@example.com` / `locally configured password` (configurable)
  - User: any email with password `password`
- DB mode: NextAuth + Prisma adapter (email/password and Google optional)

## Notes
- Non-DB flow uses mocked products for shop/product pages and a stub checkout.
- Replace checkout stub with Stripe Checkout and Prisma Orders when DB is configured.

## Production Deployment

### Phase 4 Completed ✅
This project is production-ready with:
- ✅ SEO optimized (Next.js Metadata API, dynamic OG tags, sitemap, robots.txt)
- ✅ All images optimized (next/image with AVIF/WebP)
- ✅ Security hardened (CSP, CORS, rate limiting, secret management)
- ✅ CI/CD configured (automated testing and builds)
- ✅ Production assets (favicon, OG image, manifest)

### Quick Deploy:
```bash
# 1. Set up environment
cp .env.example .env.production
# Edit .env.production with production values

# 2. Install and build
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build

# 3. Deploy
npm start  # or use Docker
```

### Deployment Checklist:
- [ ] Set all environment variables (see `.env.example`)
- [ ] Generate secure secrets: `openssl rand -base64 32`
- [ ] Use production Stripe keys
- [ ] Configure PostgreSQL database
- [ ] Run database migrations: `npx prisma migrate deploy`
- [ ] Configure Stripe webhook → `/api/stripe-webhook`
- [ ] Configure GitHub Action secrets for supplier sync
- [ ] Update Google verification code in `src/app/layout.tsx`
- [ ] Submit sitemap to Google Search Console
- [ ] Run security audit: `npm audit`
- [ ] Test all critical flows

### Documentation:
- `PRODUCTION_CHECKLIST.md` - Complete pre-deployment checklist
- `SECURITY_CHECKLIST.md` - Security audit and guidelines
- `PHASE_4_DELIVERABLES.md` - Phase 4 implementation summary


