# Go-Live Checklist

## Environment Variables
- NEXTAUTH_SECRET, NEXTAUTH_URL
- DATABASE_URL
- STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
- SUPPLIER_FEED_URL (optional if using per-supplier configs), SUPPLIER_ORDER_URL, SUPPLIER_API_KEY
- CRON_SECRET
- SENTRY_DSN (optional)

## Steps
1. Run database migrations and seed
   - `npx prisma migrate deploy`
   - `node prisma/seed.ts` (or `npm run db:seed` in dev)
2. Configure Stripe webhook to `/api/stripe-webhook`
   - Stripe CLI test: `stripe listen --forward-to localhost:3000/api/stripe-webhook`
3. Fill localized legal pages in `src/i18n/messages/{sl,en}.json`
4. Configure supplier URLs/tokens in Admin → Suppliers; run a manual sync
5. Verify order forwarding and supplier webhook
6. CI green; run E2E checkout on staging
7. Set up daily cron to POST `/api/admin/sync-now` with header `x-cron-secret: $CRON_SECRET`


