# Production Deployment Checklist

## Phase 4 Completion Status

### ✅ 1. SEO Optimization
- [x] Removed duplicate SEO systems (removed next-seo library)
- [x] Using only Next.js Metadata API
- [x] Added dynamic metadata for product pages with OG tags
- [x] Added canonical URLs for all pages
- [x] Generated sitemap using Next.js 14 conventions (`src/app/sitemap.ts`)
- [x] Generated robots.txt using Next.js 14 conventions (`src/app/robots.ts`)
- [x] Added viewport configuration
- [x] Added keywords and author metadata
- [x] Added JSON-LD structured data for products

### ✅ 2. Image Optimization
- [x] Replaced all `<img>` tags with `next/image`
- [x] Re-enabled ESLint rule `@next/next/no-img-element`
- [x] Configured proper image sizes and formats (AVIF, WebP)
- [x] Added responsive image sizes with `sizes` attribute

### ✅ 3. Security Hardening
- [x] Created `.env.example` with documentation
- [x] Created `.gitignore` to prevent secret leaks
- [x] Enhanced CSP headers with stricter policies
- [x] Configured CORS for API routes
- [x] Added CORS preflight handling in middleware
- [x] Verified Stripe webhook signature validation
- [x] Updated environment validation with stricter rules
- [x] Disabled `X-Powered-By` header
- [x] Added security headers: X-XSS-Protection, frame-ancestors
- [x] Verified no secrets leak to client-side code

### ✅ 4. CI/CD Configuration
- [x] Fixed duplicated CI workflow definitions
- [x] Added proper build step with Prisma generation
- [x] Added environment variables for CI
- [x] Configured Playwright artifact upload on failure
- [x] Optimized CI steps with proper ordering

### ✅ 5. Production Polish
- [x] Created dynamic favicon (`src/app/icon.tsx`)
- [x] Created Apple touch icon (`src/app/apple-icon.tsx`)
- [x] Created OG image (`src/app/opengraph-image.tsx`)
- [x] Created web app manifest (`src/app/manifest.ts`)
- [x] Created `.dockerignore` for optimized Docker builds
- [x] Enabled compression in Next.js config
- [x] Added package import optimization
- [x] Configured image optimization settings

---

## Pre-Deployment Checklist

### Environment Variables (Production)
Before deploying, ensure these environment variables are set:

#### Required:
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `NEXTAUTH_URL` - Production URL (e.g., https://www.mali-ustvarjalci.si)
- [ ] `NEXTAUTH_SECRET` - Secure random string (min 32 chars) - Generate: `openssl rand -base64 32`

#### Payment (Required if accepting payments):
- [ ] `STRIPE_PUBLISHABLE_KEY` - Production publishable key
- [ ] `STRIPE_SECRET_KEY` - Production secret key
- [ ] `STRIPE_WEBHOOK_SECRET` - Production webhook secret

#### Supplier Integration (Required):
- [ ] `SUPPLIER_FEED_URL` - Supplier product feed URL
- [ ] `SUPPLIER_ORDER_URL` - Supplier order API URL
- [ ] `SUPPLIER_API_KEY` - Supplier API key

#### Cron Jobs (Required):
- [ ] `CRON_SECRET` - Secure random string (min 16 chars) - Generate: `openssl rand -base64 32`

#### Email (Optional):
- [ ] `SMTP_HOST` - SMTP server hostname
- [ ] `SMTP_PORT` - SMTP server port (usually 587)
- [ ] `SMTP_USER` - SMTP username
- [ ] `SMTP_PASS` - SMTP password

#### Monitoring (Optional):
- [ ] `SENTRY_DSN` - Sentry error tracking DSN

#### Development Only (Remove in production):
- [ ] Remove `AUTH_MODE=mock`
- [ ] Remove `MOCK_ADMIN_EMAIL`
- [ ] Remove `MOCK_ADMIN_PASSWORD`
- [ ] Remove `NEXT_PUBLIC_MOCK_MODE`

---

## Security Verification

### Secrets Management:
- [x] `.env` file is in `.gitignore`
- [x] `.env.example` exists with documentation
- [x] All secrets are server-side only
- [x] No `NEXT_PUBLIC_` prefix on sensitive variables
- [x] Environment validation with Zod schema

### Headers & CSP:
- [x] CSP headers configured
- [x] X-Frame-Options: DENY
- [x] X-Content-Type-Options: nosniff
- [x] X-XSS-Protection enabled
- [x] Referrer-Policy configured
- [x] Permissions-Policy configured
- [x] CORS configured for API routes

### API Security:
- [x] Rate limiting on all API routes
- [x] Stripe webhook signature verification
- [x] Input validation with Zod schemas
- [x] Server actions use 'use server' directive

---

## Performance Optimizations

### Next.js Configuration:
- [x] Standalone output for Docker
- [x] Compression enabled
- [x] Image optimization (AVIF, WebP)
- [x] Package import optimization
- [x] Powered-by header disabled

### Code Optimization:
- [x] Using `next/image` for all images
- [x] Dynamic imports for heavy components (CookieBanner)
- [x] Proper image sizes configuration
- [x] React Strict Mode enabled

### Monitoring:
- [x] Vercel Analytics integrated
- [x] Sentry error tracking configured

---

## Pre-Launch Tasks

### DNS & Domain:
- [ ] Configure DNS A/CNAME records
- [ ] Set up SSL certificate (usually automatic on Vercel/hosting platform)
- [ ] Update `NEXTAUTH_URL` to production domain

### Database:
- [ ] Set up production PostgreSQL database
- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Seed initial data if needed
- [ ] Set up database backups

### Stripe Setup:
- [ ] Switch from test keys to production keys
- [ ] Configure production webhook endpoint
- [ ] Test payment flow in production
- [ ] Set up webhook monitoring

### Monitoring:
- [ ] Configure Sentry project
- [ ] Set up uptime monitoring
- [ ] Configure log aggregation
- [ ] Set up error alerting

### Testing:
- [ ] Run full E2E test suite
- [ ] Test payment flow end-to-end
- [ ] Test order forwarding to supplier
- [ ] Test email notifications
- [ ] Test admin panel functionality
- [ ] Test on mobile devices
- [ ] Test in multiple browsers

### SEO:
- [ ] Submit sitemap to Google Search Console
- [ ] Submit sitemap to Bing Webmaster Tools
- [ ] Verify robots.txt is accessible
- [ ] Add Google Analytics (if needed)
- [ ] Replace placeholder Google verification code in metadata

### Legal & Compliance:
- [ ] Add privacy policy
- [ ] Add terms of service
- [ ] Add cookie policy
- [ ] Verify GDPR compliance
- [ ] Add return/refund policy

---

## Post-Deployment Verification

### Immediate Checks:
- [ ] Site loads correctly at production URL
- [ ] SSL certificate is valid
- [ ] All pages render correctly
- [ ] Images load and are optimized
- [ ] Sitemap is accessible at `/sitemap.xml`
- [ ] Robots.txt is accessible at `/robots.txt`
- [ ] Favicon appears in browser tab
- [ ] OG image appears when sharing on social media

### Functionality Tests:
- [ ] User can browse products
- [ ] Search works correctly
- [ ] Cart functionality works
- [ ] Checkout flow completes
- [ ] Stripe payment processes
- [ ] Order confirmation email sends
- [ ] Order appears in admin panel
- [ ] Order forwards to supplier
- [ ] Admin can refund orders
- [ ] Supplier webhook updates order status

### Performance Tests:
- [ ] Run Lighthouse audit (target: 90+ score)
- [ ] Check Core Web Vitals
- [ ] Verify image optimization
- [ ] Check page load times
- [ ] Test on slow 3G connection

### Security Tests:
- [ ] Run security headers check (securityheaders.com)
- [ ] Verify CSP is working
- [ ] Test rate limiting
- [ ] Verify no secrets in client bundle
- [ ] Check for XSS vulnerabilities
- [ ] Verify CSRF protection

---

## Ongoing Maintenance

### Daily:
- Monitor error rates in Sentry
- Check order processing
- Monitor supplier sync jobs

### Weekly:
- Review failed orders
- Check inventory levels
- Review performance metrics

### Monthly:
- Update dependencies
- Review security advisories
- Backup database
- Review and rotate API keys

---

## Rollback Plan

If issues occur in production:

1. **Quick Rollback**: Revert to previous deployment
2. **Database Issues**: Have database backup ready
3. **Payment Issues**: Contact Stripe support immediately
4. **Supplier Issues**: Disable automatic sync, process orders manually

---

## Support Contacts

- Stripe Support: https://support.stripe.com
- Vercel Support: https://vercel.com/support
- Sentry Support: https://sentry.io/support

---

## Notes

- All Phase 4 requirements have been completed
- Project is production-ready pending environment variable configuration
- Remember to replace placeholder values in `.env.example` with actual production values
- Update Google verification code in root layout metadata
