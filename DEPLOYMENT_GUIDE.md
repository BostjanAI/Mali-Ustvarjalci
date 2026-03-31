# 🚀 Production Deployment Guide

## Quick Start

```bash
# 1. Clone and install
git clone <repository-url>
cd mali-ustvarjalci
npm ci

# 2. Configure environment
cp .env.example .env.production
# Edit .env.production with your values

# 3. Generate secrets
openssl rand -base64 32  # Use for NEXTAUTH_SECRET
openssl rand -base64 32  # Use for CRON_SECRET

# 4. Set up database
npx prisma generate
npx prisma migrate deploy

# 5. Build and deploy
npm run build
npm start
```

---

## 🌍 Deployment Options

### Option 1: Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Configure environment variables in Vercel dashboard
```

**Vercel Setup:**
1. Connect GitHub repository
2. Add environment variables from `.env.example`
3. Configure build command: `npm run build`
4. Configure start command: `npm start`
5. Set Node.js version: 20
6. Enable automatic deployments

### Option 2: Docker
```bash
# Build image
docker build -t mali-ustvarjalci:latest .

# Run container
docker run -d \
  -p 3000:3000 \
  --env-file .env.production \
  --name mali-ustvarjalci \
  mali-ustvarjalci:latest

# Check logs
docker logs -f mali-ustvarjalci
```

**Docker Compose:**
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    restart: unless-stopped
    
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: mali_ustvarjalci
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

### Option 3: Traditional VPS
```bash
# On your server
git clone <repository-url>
cd mali-ustvarjalci
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build

# Use PM2 for process management
npm i -g pm2
pm2 start npm --name "mali-ustvarjalci" -- start
pm2 save
pm2 startup
```

---

## 🔐 Environment Variables

### Required for Production:
```bash
# Database (PostgreSQL recommended)
DATABASE_URL=postgresql://user:password@host:5432/database?schema=public

# Auth (generate with: openssl rand -base64 32)
NEXTAUTH_URL=https://www.mali-ustvarjalci.si
NEXTAUTH_SECRET=<32+ character random string>

# Stripe (production keys)
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Supplier Integration
SUPPLIER_FEED_URL=https://supplier.com/feed.json
SUPPLIER_ORDER_URL=https://supplier.com/api/orders
SUPPLIER_API_KEY=<supplier api key>

# Cron (generate with: openssl rand -base64 32)
CRON_SECRET=<16+ character random string>
```

### Optional:
```bash
# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
```

### Remove from Production:
```bash
# These are for development only!
# AUTH_MODE=mock
# MOCK_ADMIN_EMAIL=admin@example.com
# MOCK_ADMIN_PASSWORD=admin123
# NEXT_PUBLIC_MOCK_MODE=true
```

---

## 🗄️ Database Setup

### PostgreSQL (Production):
```bash
# Create database
createdb mali_ustvarjalci

# Set DATABASE_URL
export DATABASE_URL="postgresql://user:password@localhost:5432/mali_ustvarjalci"

# Run migrations
npx prisma migrate deploy

# Optional: Seed data
npm run db:seed
```

### Managed Database Services:
- **Vercel Postgres:** Integrated with Vercel deployments
- **Supabase:** Free tier available, PostgreSQL compatible
- **Railway:** Easy setup with automatic backups
- **AWS RDS:** Enterprise-grade, scalable
- **DigitalOcean:** Managed PostgreSQL with backups

---

## 💳 Stripe Configuration

### 1. Get Production Keys:
- Go to https://dashboard.stripe.com/apikeys
- Switch to "Live mode"
- Copy Publishable key → `STRIPE_PUBLISHABLE_KEY`
- Copy Secret key → `STRIPE_SECRET_KEY`

### 2. Configure Webhook:
- Go to https://dashboard.stripe.com/webhooks
- Click "Add endpoint"
- URL: `https://your-domain.com/api/stripe-webhook`
- Events: Select `checkout.session.completed`
- Copy webhook secret → `STRIPE_WEBHOOK_SECRET`

### 3. Test Payment:
```bash
# Use Stripe test cards in test mode
# Card: 4242 4242 4242 4242
# Expiry: Any future date
# CVC: Any 3 digits
```

---

## 🔄 Supplier Sync Setup

### Manual Sync:
```bash
# Via CLI
npm run sync:supplier

# Via API (requires admin auth or CRON_SECRET)
curl -X POST \
  -H "x-cron-secret: $CRON_SECRET" \
  https://your-domain.com/api/admin/sync-now
```

### Automated Sync (GitHub Actions):
Already configured in `.github/workflows/supplier-sync.yml`

**Required GitHub Secrets:**
- `CRON_SECRET` - Matches your env variable
- `SYNC_ENDPOINT_URL` - Your production URL + `/api/admin/sync-now`

**Schedule:** Daily at 3:17 AM UTC

---

## 🧪 Testing Before Deploy

### 1. Local Testing:
```bash
# Install dependencies
npm ci

# Generate Prisma client
npx prisma generate

# Run all checks
npm run lint
npm run typecheck
npm test

# Build
npm run build

# Test production build locally
npm start
```

### 2. E2E Testing:
```bash
# Install browsers
npx playwright install

# Run E2E tests
npm run e2e

# Run in UI mode for debugging
npx playwright test --ui
```

### 3. Security Testing:
```bash
# Check for vulnerabilities
npm audit

# Fix auto-fixable issues
npm audit fix

# Check outdated packages
npm outdated
```

---

## 📊 Monitoring & Observability

### Sentry (Error Tracking):
1. Create project at https://sentry.io
2. Copy DSN
3. Set `SENTRY_DSN` environment variable
4. Errors automatically tracked

### Vercel Analytics:
- Already integrated (`<Analytics />` in layout)
- Automatically tracks Core Web Vitals
- View metrics in Vercel dashboard

### Custom Monitoring:
Consider adding:
- Uptime monitoring (UptimeRobot, Pingdom)
- Log aggregation (Datadog, LogRocket)
- Performance monitoring (New Relic, AppDynamics)

---

## 🔒 Security Post-Deployment

### Immediate Checks:
```bash
# 1. Verify headers
curl -I https://your-domain.com

# 2. Check CSP
# Open browser console, look for CSP violations

# 3. Test rate limiting
# Make rapid requests to API endpoints

# 4. Verify webhook signature
# Send test webhook from Stripe dashboard
```

### Security Scanners:
- **Security Headers:** https://securityheaders.com
- **SSL Test:** https://www.ssllabs.com/ssltest/
- **Mozilla Observatory:** https://observatory.mozilla.org

---

## 🐛 Troubleshooting

### Build Fails:
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm ci
npx prisma generate
npm run build
```

### Database Connection Issues:
```bash
# Test connection
npx prisma db pull

# Check migrations
npx prisma migrate status

# Reset (development only!)
npx prisma migrate reset
```

### Image Loading Issues:
- Verify remote patterns in `next.config.mjs`
- Check CSP img-src directive
- Ensure images are accessible

### Stripe Webhook Not Working:
- Verify webhook URL is correct
- Check webhook secret matches
- Review Stripe dashboard for delivery attempts
- Check rate limiting isn't blocking webhooks

---

## 📈 Performance Optimization

### After Deployment:
1. **Run Lighthouse Audit**
   - Open Chrome DevTools
   - Go to Lighthouse tab
   - Run audit
   - Target: 90+ score

2. **Check Core Web Vitals**
   - LCP (Largest Contentful Paint): < 2.5s
   - FID (First Input Delay): < 100ms
   - CLS (Cumulative Layout Shift): < 0.1

3. **Optimize Further:**
   - Enable CDN caching
   - Configure Redis for session storage
   - Add database indexes
   - Enable database connection pooling

---

## 🔄 Continuous Deployment

### GitHub Actions:
- **CI Workflow:** Runs on every push/PR
- **Supplier Sync:** Runs daily at 3:17 AM UTC

### Vercel:
- Automatic deployments on git push
- Preview deployments for PRs
- Instant rollback capability

---

## 📞 Support & Resources

### Documentation:
- Next.js: https://nextjs.org/docs
- Prisma: https://www.prisma.io/docs
- Stripe: https://stripe.com/docs
- NextAuth: https://next-auth.js.org

### Community:
- Next.js Discord: https://nextjs.org/discord
- Stripe Support: https://support.stripe.com

---

## 🎯 Post-Launch Checklist

### Day 1:
- [ ] Monitor error rates in Sentry
- [ ] Check order processing
- [ ] Verify email delivery
- [ ] Test payment flow
- [ ] Monitor server resources

### Week 1:
- [ ] Review performance metrics
- [ ] Check SEO indexing status
- [ ] Monitor conversion rates
- [ ] Review security logs
- [ ] Test all user flows

### Month 1:
- [ ] Run security audit
- [ ] Update dependencies
- [ ] Review and optimize slow queries
- [ ] Analyze user behavior
- [ ] Plan improvements

---

## 🎊 You're Ready to Launch!

All Phase 4 requirements completed. Your ecommerce platform is production-ready with:

- ✅ Enterprise-grade security
- ✅ Optimized SEO
- ✅ High performance
- ✅ Professional assets
- ✅ Comprehensive monitoring

**Next Step:** Deploy to production and start selling! 🚀

---

**Need Help?** Refer to:
- `PRODUCTION_CHECKLIST.md` - Complete deployment steps
- `SECURITY_CHECKLIST.md` - Security guidelines
- `PHASE_4_COMPLETE.md` - What was implemented
