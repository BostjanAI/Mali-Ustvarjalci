# Mali Ustvarjalci - Project Onboarding Guide

**Last Updated**: 2025-01-27  
**For**: Single developer returning to the project after a break

---

## 📋 Project Summary

**Mali Ustvarjalci** is a **dropshipping e-commerce platform** built with:
- **Tech Stack**: Next.js 14 (App Router), TypeScript, Prisma (SQLite for local dev), Stripe, NextAuth, next-intl (bilingual SL/EN)
- **Purpose**: Small creators marketplace that syncs products from supplier feeds, processes orders via Stripe, forwards them to suppliers, and handles shipping updates
- **Users**: 
  - **Customers**: Browse products, checkout with Stripe
  - **Admins**: Manage suppliers, view orders, sync product feeds, view sync logs

---

## ✅ Current State Analysis

### What's Implemented (Production-Ready)

1. **✅ Complete authentication system**
   - Mock mode (no DB needed) + full NextAuth with Prisma adapter
   - Admin/customer roles
   - Credentials + optional Google OAuth

2. **✅ Full shop functionality**
   - Product catalog with search/sort/pagination (`/[locale]/shop`)
   - Product detail pages with schema.org structured data
   - Zustand-based cart (client-side)
   - Stripe Checkout integration

3. **✅ Admin panel** (`/[locale]/admin`)
   - Dashboard with counts
   - Supplier management (CRUD operations)
   - Orders page
   - Products page
   - Sync logs page
   - Manual sync trigger

4. **✅ Supplier integration**
   - Feed parsing (CSV/JSON/XML)
   - Product sync with deduplication
   - Order forwarding to supplier API with retry logic
   - Webhook for supplier status updates (shipped, cancelled, etc.)
   - Inventory tracking

5. **✅ E-commerce flow**
   - Stripe webhook creates Order + OrderItems
   - Email confirmations (order + shipping updates)
   - Inventory decrement on purchase
   - VAT calculation utilities

6. **✅ CI/CD**
   - GitHub Actions CI: lint, typecheck, test, build, e2e
   - Scheduled supplier sync workflow (daily at 3:17 AM)

7. **✅ Testing**
   - 8 Jest unit tests (supplier sync, forward, webhook, emails, etc.)
   - 5 Playwright e2e tests (admin, checkout, home, refund, search)

8. **✅ Internationalization**
   - SL/EN locales with next-intl
   - Legal pages (terms, privacy, returns, cookies) - **content placeholders**

### What's Unfinished/Placeholder

1. **⚠️ Legal page content**: All legal pages have "Insert your ... here" placeholders
2. **⚠️ No .env file**: You'll need to create `.env` (see Setup below)
3. **⚠️ CI file has duplicate config**: `ci.yml` has two `name: CI` blocks (lines 1-32 and 33-56) - should clean this up

---

## 🚀 How to Run the Project

### Step 1: Install Dependencies
```bash
cd mali-ustvarjalci
npm install
```

### Step 2: Create `.env` file

Create `mali-ustvarjalci/.env`:

```bash
# Database (SQLite for local dev)
DATABASE_URL="file:./dev.db"

# Auth (NextAuth)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-32-char-secret-here-generate-with-openssl"

# Mock auth (optional - simplifies local dev)
AUTH_MODE=mock
MOCK_ADMIN_EMAIL=admin@example.com
MOCK_ADMIN_PASSWORD=

# Stripe (get test keys from Stripe dashboard)
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Supplier (optional for testing)
SUPPLIER_FEED_URL=https://example.com/feed.json
SUPPLIER_ORDER_URL=https://example.com/orders
SUPPLIER_API_KEY=test-key

# Cron secret for scheduled sync
CRON_SECRET=some-random-secret

# Email (optional - leave empty to skip)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email
# SMTP_PASS=your-password

# Monitoring (optional)
# SENTRY_DSN=...
```

**Generate NEXTAUTH_SECRET**:
```bash
openssl rand -base64 32
```

### Step 3: Database Setup
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations (creates tables)
npm run prisma:migrate

# Seed demo data (20 products + admin user)
npm run db:seed
```

### Step 4: Development Server
```bash
npm run dev
```

Visit: `http://localhost:3000`

### Step 5: Run Tests

```bash
# Typecheck
npm run typecheck

# Lint
npm run lint

# Unit tests
npm test

# E2E tests (needs dev server running)
npm run dev  # in one terminal
npm run e2e  # in another terminal
```

---

## 🗺️ What to Expect at Main Routes

| Route | What You'll See |
|-------|----------------|
| `/` or `/sl` or `/en` | Home page with nav links (minimal scaffold) |
| `/sl/shop` | Product catalog (20 demo products from seed) with search/sort |
| `/sl/shop/demo-product-1` | Product detail page |
| `/sl/cart` | Cart page (Zustand state) |
| `/sl/checkout` | Checkout form → redirects to Stripe |
| `/sl/thank-you` | Order confirmation page |
| `/sl/admin` | Admin dashboard (requires login) |
| `/sl/admin/suppliers` | Supplier management + manual sync button |
| `/sl/admin/orders` | Orders list |
| `/sl/admin/products` | Products list |
| `/sl/admin/sync-logs` | Sync history |
| `/sl/legal/terms` | Legal pages (placeholder content) |

**Auth**: 
- Mock mode: `admin@example.com` / `locally configured password` (admin) or any email / `password` (customer)
- DB mode: Use seeded admin or create user

---

## 📝 High-Level Status Summary

### ✅ Production-Ready Components
- Core e-commerce flow (catalog → cart → checkout → order)
- Supplier integration (sync, forward, webhooks)
- Admin panel
- Auth system
- Payment processing (Stripe)
- Email notifications
- CI/CD pipelines

### ⚠️ Needs Attention Before Go-Live
1. **Legal content**: Fill placeholders in `src/i18n/messages/{sl,en}.json` under `legal.*`
2. **Environment setup**: Configure all production env vars
3. **Stripe webhook**: Set up in Stripe dashboard → point to `/api/stripe-webhook`
4. **CI duplication**: Clean up duplicate CI config
5. **Database migration**: Switch to PostgreSQL for production (currently SQLite)

---

## 🎯 Concrete Next Steps (Prioritized Roadmap)

### Week 1: Get Running Locally + Fix Issues

#### Step 1: Get Project Running (30 min)
**Goal**: Verify everything works on your machine

1. **Create `.env` file** (see template above)
   - Minimum required: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `AUTH_MODE=mock`
   - Get Stripe test keys from https://dashboard.stripe.com/test/apikeys

2. **Run setup commands**:
   ```bash
   cd mali-ustvarjalci
   npm install
   npm run prisma:generate
   npm run prisma:migrate
   npm run db:seed
   npm run dev
   ```

3. **Verify routes**:
   - Open http://localhost:3000/sl/shop
   - Add product to cart → go to checkout
   - Login to admin at http://localhost:3000/sl/admin (use `admin@example.com` / `locally configured password`)

**Files to check**: 
- `mali-ustvarjalci/.env` (create this)
- `mali-ustvarjalci/prisma/dev.db` (should exist after migration)

---

#### Step 2: Fix CI Duplication (5 min)
**Goal**: Clean up duplicate CI configuration

**File**: `mali-ustvarjalci/.github/workflows/ci.yml`

**Issue**: Lines 1-32 and 33-56 both define `name: CI` with duplicate jobs

**Fix**: Delete lines 1-32 (first duplicate block), keep lines 33-56

---

#### Step 3: Run All Tests (15 min)
**Goal**: Ensure test suite passes

```bash
# Typecheck
npm run typecheck

# Lint
npm run lint

# Unit tests
npm test

# E2E (in separate terminal with dev server running)
npm run e2e
```

**Expected**: All tests should pass. If any fail, note which ones and we'll fix them.

---

### Week 1-2: Content & Configuration

#### Step 4: Fill Legal Pages Content (2-3 hours)
**Goal**: Replace placeholder legal text with real content

**Files to edit**:
- `mali-ustvarjalci/src/i18n/messages/sl.json`
- `mali-ustvarjalci/src/i18n/messages/en.json`

**What to do**:
1. Consult with legal advisor or use online generators for Slovenia/EU GDPR compliance
2. Fill these keys:
   - `legal.terms.body` (Terms & Conditions)
   - `legal.privacy.body` (Privacy Policy - **critical for GDPR**)
   - `legal.returns.body` (Return policy - required by EU consumer law)
   - `legal.cookies.body` (Cookie notice - **critical for GDPR**)

**Resources**:
- https://www.freeprivacypolicy.com/
- https://termsfeed.com/
- EU template generators

---

#### Step 5: Configure Stripe Webhook (15 min)
**Goal**: Enable order creation from successful payments

**Local testing**:
```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

Copy the webhook signing secret (`whsec_...`) and add to `.env`:
```
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Test flow**:
1. Add product to cart
2. Go to checkout
3. Use Stripe test card: `4242 4242 4242 4242`
4. Check admin orders page - should see new order

**Production setup**: Add webhook in Stripe Dashboard → point to `https://your-domain.com/api/stripe-webhook`

---

#### Step 6: Test Supplier Sync (30 min)
**Goal**: Verify supplier feed parsing works

**Option A: Test with demo supplier**
```bash
npm run sync:supplier
```

**Option B: Use real supplier feed**
1. Get supplier feed URL (CSV/JSON/XML)
2. Add to `.env`:
   ```
   SUPPLIER_FEED_URL=https://supplier.com/feed.json
   SUPPLIER_API_KEY=your-key
   ```
3. Run sync:
   ```bash
   npm run sync:supplier
   ```
4. Check `/sl/admin/sync-logs` to see results

**Files to inspect**:
- `mali-ustvarjalci/src/lib/supplierSync.ts` - parsing logic
- `mali-ustvarjalci/scripts/syncSupplierProducts.ts` - CLI script

---

### Week 2: Hardening & Production Prep

#### Step 7: Switch to PostgreSQL (1 hour)
**Goal**: Prepare for production deployment (SQLite not recommended for production)

**Why**: SQLite is file-based; Vercel/Netlify don't persist files between deployments

**How**:
1. Create PostgreSQL database (options: Vercel Postgres, Supabase, Railway, Neon)
2. Update `.env`:
   ```
   DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"
   ```
3. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"  // Change from "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
4. Run migrations:
   ```bash
   npm run prisma:migrate
   npm run db:seed
   ```

**Files to check**:
- `mali-ustvarjalci/prisma/schema.prisma` (line 6: `provider = "sqlite"` → change to `"postgresql"`)

---

#### Step 8: Set Up SMTP for Emails (20 min)
**Goal**: Enable order confirmation emails

**Options**:
- Gmail with App Password
- SendGrid (free tier: 100 emails/day)
- Mailgun
- AWS SES

**Add to `.env`**:
```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

**Test**: Place an order and check if confirmation email arrives

**Files**:
- `mali-ustvarjalci/src/lib/email.ts` - email logic
- `mali-ustvarjalci/src/mail/OrderConfirmation.tsx` - email template

---

#### Step 9: Improve Error Handling (2-3 hours)
**Goal**: Add better error messages and logging

**Suggestions**:
1. **Add error boundaries**: Currently only basic error.tsx exists
2. **Add logging**: Consider adding structured logging (e.g., `pino`)
3. **User-facing errors**: Checkout errors should be more specific
4. **Supplier sync errors**: Should alert admin if sync fails

**Files to enhance**:
- `mali-ustvarjalci/src/app/error.tsx` - add more context
- `mali-ustvarjalci/src/app/api/stripe-webhook/route.ts` - better error responses
- `mali-ustvarjalci/src/lib/supplierSync.ts` - catch and log specific errors

---

#### Step 10: Performance & SEO (2-3 hours)
**Goal**: Optimize for production

**Tasks**:
1. **Add proper metadata** to all pages (currently minimal)
   - File: `mali-ustvarjalci/src/app/[locale]/layout.tsx`
   - Add Open Graph, Twitter Card metadata

2. **Optimize images**: Products use raw `<img>` tags
   - Replace with Next.js `<Image>` component where possible
   - Add image optimization

3. **Add loading states**: Shop page already has loading, but cart/checkout could use it

4. **Add rate limiting to public APIs**:
   - Already implemented for webhooks
   - Consider adding to `/api/search`

**Files**:
- `mali-ustvarjalci/src/components/SeoDefaults.tsx` - enhance this
- `mali-ustvarjalci/src/app/(shop)/[locale]/shop/page.tsx` - replace `<img>` with `<Image>`

---

#### Step 11: Security Audit (1 hour)
**Goal**: Check for security issues before go-live

**Checklist**:
- ✅ CSRF protection (Next.js has built-in)
- ✅ Rate limiting (already implemented for sensitive endpoints)
- ✅ SQL injection (Prisma prevents this)
- ✅ Auth tokens (NextAuth handles securely)
- ⚠️ **Validate all user inputs** in forms
- ⚠️ **Add Content Security Policy** headers
- ⚠️ **HTTPS only** in production

**Files to review**:
- All API routes in `mali-ustvarjalci/src/app/api/`
- Add CSP headers in `next.config.mjs`

---

#### Step 12: Deploy to Staging (1-2 hours)
**Goal**: Test in production-like environment

**Recommended**: Vercel (built for Next.js)

**Steps**:
1. Push to GitHub (if not already)
2. Import to Vercel
3. Add all environment variables from `.env`
4. Deploy
5. Configure Stripe webhook for staging URL
6. Run through full checkout flow
7. Test admin functions

**Go-Live Checklist** (from `docs/GO_LIVE.md`):
- [ ] All env vars set
- [ ] DB migrations run
- [ ] Stripe webhook configured
- [ ] Legal pages filled
- [ ] Supplier sync tested
- [ ] Order flow tested end-to-end
- [ ] CI passing

---

## 🔧 Quick Fixes

### Fix Duplicate CI Config
**File**: `mali-ustvarjalci/.github/workflows/ci.yml`
- Delete lines 1-32, keep only the second CI job definition (lines 33-56)

### Add TypeScript Strict Mode (optional)
Currently `strict: true` is set - good! But you might want to enable additional flags:
```json
// mali-ustvarjalci/tsconfig.json
{
  "compilerOptions": {
    "strictNullChecks": true,  // already enabled
    "noUncheckedIndexedAccess": true,  // add this
    "noImplicitReturns": true  // add this
  }
}
```

---

## 📊 Testing Coverage

**Jest Unit Tests** (8 tests in `__tests__/`):
- ✅ Email snapshot tests
- ✅ Sitemap generation
- ✅ Smoke test (env parsing)
- ✅ Supplier forward auth/logic
- ✅ Supplier frequency checks
- ✅ Supplier sync logic
- ✅ Supplier webhook handling

**Playwright E2E** (5 tests in `e2e/`):
- ✅ Admin page loads
- ✅ Checkout flow
- ✅ Home page loads
- ✅ Refund process
- ✅ Search functionality

**Coverage is good!** No additional tests urgently needed, but consider adding:
- Cart operations (add/remove/update quantity)
- Product detail page
- Supplier CRUD operations

---

## 🎯 TL;DR - Do This First

1. **Create `.env`** with minimum config (5 min)
2. **Run `npm install && npm run prisma:migrate && npm run db:seed && npm run dev`** (2 min)
3. **Browse shop, add to cart, test checkout** (5 min)
4. **Login to admin, check dashboard** (2 min)
5. **Fix CI duplication** (1 min)
6. **Fill legal pages** (2 hours)
7. **Set up Stripe webhook** (15 min)
8. **Plan PostgreSQL migration** (research 30 min, execute 1 hour)

---

## 📚 Important Files Reference

### Core Application Files
- `src/app/` - Next.js App Router pages
- `src/lib/` - Business logic (auth, cart, supplier sync, email, etc.)
- `src/components/` - Reusable React components
- `src/i18n/` - Internationalization (SL/EN translations)
- `prisma/schema.prisma` - Database schema
- `prisma/seed.ts` - Database seed script

### Configuration Files
- `package.json` - Dependencies and scripts
- `next.config.mjs` - Next.js configuration
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `.github/workflows/` - CI/CD pipelines

### Key Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run prisma:migrate` - Run database migrations
- `npm run db:seed` - Seed database with demo data
- `npm run sync:supplier` - Sync products from supplier feed
- `npm test` - Run Jest unit tests
- `npm run e2e` - Run Playwright e2e tests

---

## 🆘 Troubleshooting

### Database Issues
- **SQLite locked**: Close any DB viewers or restart dev server
- **Migration fails**: Check `prisma/migrations/` for conflicts
- **Seed fails**: Ensure migrations ran first

### Auth Issues
- **Can't login**: Check `AUTH_MODE` in `.env` (mock vs DB mode)
- **Session expires**: Check `NEXTAUTH_SECRET` is set

### Stripe Issues
- **Webhook fails**: Verify `STRIPE_WEBHOOK_SECRET` matches Stripe CLI output
- **Payment fails**: Use test card `4242 4242 4242 4242` with any future date

### Build Issues
- **Type errors**: Run `npm run typecheck` to see all errors
- **Import errors**: Check `tsconfig.json` paths alias `@/*`

---

## 📞 Next Steps After Onboarding

Once you've completed the initial setup:
1. Review the codebase structure
2. Run through the full user journey (browse → cart → checkout)
3. Test admin functions (supplier sync, order management)
4. Review and fill legal pages
5. Plan production deployment

---

**Good luck! The project is ~85% production-ready. Main gaps are content (legal pages) and production infrastructure (PostgreSQL, SMTP, deployment).**

