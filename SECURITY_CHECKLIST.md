# Security Checklist - Production Deployment

## ✅ Completed Security Measures

### 1. Secret Management
- [x] Created `.gitignore` to prevent committing secrets
- [x] Created `.env.example` with documentation
- [x] All secrets use server-side only access
- [x] No `NEXT_PUBLIC_` prefix on sensitive variables
- [x] Environment validation with Zod schema (`src/lib/env.ts`)

### 2. HTTP Security Headers
- [x] **X-Content-Type-Options:** `nosniff` - Prevents MIME type sniffing
- [x] **X-Frame-Options:** `DENY` - Prevents clickjacking
- [x] **X-XSS-Protection:** `1; mode=block` - XSS protection
- [x] **Referrer-Policy:** `strict-origin-when-cross-origin` - Controls referrer information
- [x] **Permissions-Policy:** Restricts camera, microphone, geolocation
- [x] **Powered-By Header:** Disabled - Hides technology stack

### 3. Content Security Policy (CSP)
**Configured in:** `next.config.mjs`

```
default-src 'self'
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://va.vercel-scripts.com
connect-src 'self' https://api.stripe.com https://vitals.vercel-insights.com
img-src 'self' data: https: blob:
style-src 'self' 'unsafe-inline'
frame-src https://js.stripe.com https://hooks.stripe.com
font-src 'self' data:
object-src 'none'
base-uri 'self'
form-action 'self'
frame-ancestors 'none'
upgrade-insecure-requests
```

**Notes:**
- `unsafe-inline` and `unsafe-eval` are required for Next.js and Stripe
- Consider using nonce-based CSP for stricter security in future
- All external domains are explicitly whitelisted

### 4. CORS Configuration
- [x] CORS headers configured for API routes
- [x] Restricted to production domain
- [x] Allowed methods: GET, POST, PUT, DELETE, OPTIONS
- [x] OPTIONS preflight handling in middleware
- [x] Stripe signature header allowed

### 5. Rate Limiting
**Implemented in:** `src/lib/rateLimit.ts`

- [x] `/api/search` - 30 requests per 60 seconds
- [x] `/api/stripe` - 10 requests per 60 seconds
- [x] `/api/stripe-webhook` - 60 requests per 60 seconds
- [x] `/api/supplier-webhook` - 60 requests per 60 seconds
- [x] `/api/admin/refund` - 5 requests per 60 seconds
- [x] `/api/admin/sync-now` - 10 requests per 60 seconds
- [x] NextAuth endpoints - 10 requests per 60 seconds

### 6. Authentication & Authorization
- [x] NextAuth configured with secure secret
- [x] Session encryption with NEXTAUTH_SECRET (min 32 chars)
- [x] Admin routes protected
- [x] Mock mode for development only
- [x] Credentials validation

### 7. Payment Security (Stripe)
- [x] Webhook signature verification
- [x] Server-side only secret key access
- [x] Rate limiting on payment endpoints
- [x] Input validation with Zod schemas
- [x] HTTPS required in production

### 8. API Security
- [x] Input validation on all API routes
- [x] Zod schemas for request validation
- [x] Error handling without information leakage
- [x] Server actions use 'use server' directive
- [x] No secrets exposed to client

### 9. Database Security
- [x] Prisma ORM prevents SQL injection
- [x] Database URL not exposed to client
- [x] Prepared statements used throughout
- [x] Connection pooling configured

### 10. Docker Security
- [x] `.dockerignore` prevents sensitive file inclusion
- [x] Multi-stage build minimizes attack surface
- [x] Non-root user in production container
- [x] Minimal base image (node:20-alpine)

---

## 🔍 Pre-Deployment Security Audit

### Critical Items to Verify:

#### Environment Variables:
- [ ] All production secrets are unique and strong
- [ ] `NEXTAUTH_SECRET` is at least 32 characters
- [ ] `CRON_SECRET` is at least 16 characters
- [ ] Stripe keys are production keys (not test keys)
- [ ] Database URL uses SSL/TLS connection
- [ ] SMTP credentials are secure
- [ ] No development secrets in production

#### Secrets Rotation:
- [ ] Generate new `NEXTAUTH_SECRET` for production
- [ ] Generate new `CRON_SECRET` for production
- [ ] Use production Stripe keys
- [ ] Use production database credentials

#### Network Security:
- [ ] HTTPS enforced (no HTTP access)
- [ ] SSL certificate is valid
- [ ] Database uses encrypted connection
- [ ] SMTP uses TLS/SSL

#### Access Control:
- [ ] Admin panel requires authentication
- [ ] API routes have proper authorization
- [ ] Webhook endpoints validate signatures
- [ ] Rate limiting is active

---

## 🚨 Security Warnings

### Known Issues:
1. **CSP uses `unsafe-inline` and `unsafe-eval`**
   - Required for Next.js and Stripe integration
   - Consider implementing nonce-based CSP in future
   - Monitor for XSS vulnerabilities

2. **CORS allows credentials**
   - Necessary for authenticated API calls
   - Ensure origin is properly restricted

3. **Mock mode in development**
   - MUST be disabled in production
   - Remove `AUTH_MODE=mock` from production env
   - Remove all `MOCK_*` variables from production

### Recommendations:
1. Set up Web Application Firewall (WAF)
2. Enable DDoS protection
3. Configure automated security scanning
4. Set up intrusion detection
5. Regular security audits
6. Dependency vulnerability scanning (npm audit)

---

## 🔐 Secrets Management Best Practices

### Generating Secure Secrets:

```bash
# Generate NEXTAUTH_SECRET (32+ characters)
openssl rand -base64 32

# Generate CRON_SECRET (16+ characters)
openssl rand -base64 24

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Secret Storage:
- Use environment variables (never hardcode)
- Use secret management service (AWS Secrets Manager, HashiCorp Vault)
- Rotate secrets regularly
- Use different secrets for each environment
- Never commit secrets to version control

### Stripe Keys:
- Use test keys for development/staging
- Use production keys only in production
- Restrict API key permissions
- Monitor webhook signatures
- Set up webhook endpoint monitoring

---

## 🛡️ Ongoing Security Tasks

### Daily:
- Monitor error logs in Sentry
- Check for failed authentication attempts
- Review rate limit violations

### Weekly:
- Review access logs
- Check for suspicious activity
- Verify webhook deliveries

### Monthly:
- Run `npm audit` and fix vulnerabilities
- Review and update dependencies
- Rotate API keys and secrets
- Review CSP violations (if logging enabled)
- Security headers check (securityheaders.com)

### Quarterly:
- Full security audit
- Penetration testing
- Review access controls
- Update security policies

---

## 📋 Compliance Checklist

### GDPR (if applicable):
- [ ] Privacy policy published
- [ ] Cookie consent implemented (✅ CookieBanner exists)
- [ ] Data processing agreement with suppliers
- [ ] User data export capability
- [ ] User data deletion capability
- [ ] Data breach notification procedure

### PCI DSS (Stripe handles most):
- [x] No credit card data stored locally
- [x] Stripe handles PCI compliance
- [x] Webhook signature verification
- [ ] Regular security scans
- [ ] Access logging

---

## 🚀 Security Testing Before Launch

### Automated Tests:
```bash
# Run security audit
npm audit

# Check for outdated packages
npm outdated

# Run linter
npm run lint

# Run type checking
npm run typecheck

# Run all tests
npm test
npm run e2e
```

### Manual Tests:
- [ ] Test authentication flows
- [ ] Test authorization (admin vs user)
- [ ] Test rate limiting (use tools like Apache Bench)
- [ ] Test webhook signature validation
- [ ] Test CORS configuration
- [ ] Test CSP headers (check browser console)
- [ ] Test with security headers analyzer
- [ ] Test SQL injection resistance
- [ ] Test XSS resistance

### External Tools:
- [ ] Run Lighthouse security audit
- [ ] Check headers at securityheaders.com
- [ ] Run OWASP ZAP scan
- [ ] Check SSL configuration at ssllabs.com
- [ ] Verify no secrets in client bundle (inspect Network tab)

---

## 🔗 Security Resources

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Next.js Security: https://nextjs.org/docs/app/building-your-application/configuring/security
- Stripe Security: https://stripe.com/docs/security
- CSP Guide: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
- Security Headers: https://securityheaders.com

---

## Emergency Response

### If Security Breach Detected:
1. Immediately rotate all secrets
2. Review access logs
3. Notify affected users (if data compromised)
4. Document the incident
5. Implement fixes
6. Conduct post-mortem

### Contacts:
- Stripe Security: security@stripe.com
- Report vulnerabilities: security@mali-ustvarjalci.si (set this up)

---

**Last Updated:** March 2, 2026
**Phase:** 4 - Production Deployment
**Status:** ✅ All security measures implemented
