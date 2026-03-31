# Kontrolni seznam za produkcijsko namestitev

## Status dokončanja Faze 4

### ✅ 1. SEO optimizacija

- [x] Odstranjeni podvojeni SEO sistemi (odstranjena next-seo knjižnica)
- [x] Uporabljen samo Next.js Metadata API
- [x] Dodani dinamični meta podatki za strani izdelkov z OG tags
- [x] Dodani canonical URL-ji za vse strani
- [x] Generirana sitemap z Next.js 14 konvencijami (`src/app/sitemap.ts`)
- [x] Generiran robots.txt z Next.js 14 konvencijami (`src/app/robots.ts`)
- [x] Dodana viewport konfiguracija
- [x] Dodane ključne besede in avtor meta podatki
- [x] Dodani JSON-LD strukturirani podatki za izdelke

### ✅ 2. Optimizacija slik

- [x] Zamenjane vse `<img>` oznake z `next/image`
- [x] Ponovno omogočeno ESLint pravilo `@next/next/no-img-element`
- [x] Konfigurirane pravilne velikosti in formati slik (AVIF, WebP)
- [x] Dodane odzivne velikosti slik z `sizes` atributom

### ✅ 3. Krepitev varnosti

- [x] Ustvarjena `.env.example` z dokumentacijo
- [x] Ustvarjena `.gitignore` za preprečevanje uhajanja skrivnosti
- [x] Izboljšani CSP headerji s strožjimi politikami
- [x] Konfiguriran CORS za API poti
- [x] Dodana obravnava CORS preflight v middleware
- [x] Preverjena validacija Stripe webhook podpisa
- [x] Posodobljena validacija okolja s strožjimi pravili
- [x] Onemogočen `X-Powered-By` header
- [x] Dodani varnostni headerji: X-XSS-Protection, frame-ancestors
- [x] Preverjeno, da skrivnosti ne uhajajo v kodo na strani odjemalca

### ✅ 4. CI/CD konfiguracija

- [x] Popravljene podvojene definicije CI workflow
- [x] Dodan pravilen korak gradnje s Prisma generacijo
- [x] Dodane okoljske spremenljivke za CI
- [x] Konfiguriran Playwright artifact upload ob napaki
- [x] Optimizirani CI koraki s pravilnim vrstnim redom

### ✅ 5. Produkcijska dodelava

- [x] Ustvarjena dinamična ikona (`src/app/icon.tsx`)
- [x] Ustvarjena Apple touch ikona (`src/app/apple-icon.tsx`)
- [x] Ustvarjena OG slika (`src/app/opengraph-image.tsx`)
- [x] Ustvarjen web app manifest (`src/app/manifest.ts`)
- [x] Ustvarjena `.dockerignore` za optimizirane Docker gradnje
- [x] Omogočena kompresija v Next.js konfiguraciji
- [x] Dodana optimizacija uvoza paketov
- [x] Konfigurirane nastavitve optimizacije slik

---

## Kontrolni seznam pred namestitvijo

### Okoljske spremenljivke (produkcija)

Pred namestitvijo zagotovi, da so nastavljene naslednje okoljske spremenljivke:

#### Obvezno:

- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `NEXTAUTH_URL` - Produkcijski URL (npr. https://www.mali-ustvarjalci.si)
- [ ] `NEXTAUTH_SECRET` - Varen naključni niz (min 32 znakov) - Generiraj: `openssl rand -base64 32`

#### Plačila (obvezno, če sprejemate plačila):

- [ ] `STRIPE_PUBLISHABLE_KEY` - Produkcijski javni ključ
- [ ] `STRIPE_SECRET_KEY` - Produkcijski skrivni ključ
- [ ] `STRIPE_WEBHOOK_SECRET` - Produkcijska webhook skrivnost

#### Integracija dobavitelja (obvezno):

- [ ] `SUPPLIER_FEED_URL` - URL feed-a izdelkov dobavitelja
- [ ] `SUPPLIER_ORDER_URL` - URL API-ja za naročila dobavitelja
- [ ] `SUPPLIER_API_KEY` - API ključ dobavitelja

#### Cron opravila (obvezno):

- [ ] `CRON_SECRET` - Varen naključni niz (min 16 znakov) - Generiraj: `openssl rand -base64 32`

#### E-pošta (opcijsko):

- [ ] `SMTP_HOST` - Ime gostitelja SMTP strežnika
- [ ] `SMTP_PORT` - Vrata SMTP strežnika (običajno 587)
- [ ] `SMTP_USER` - SMTP uporabniško ime
- [ ] `SMTP_PASS` - SMTP geslo

#### Monitoring (opcijsko):

- [ ] `SENTRY_DSN` - Sentry DSN za sledenje napakam

#### Samo za razvoj (odstrani v produkciji):

- [ ] Odstrani `AUTH_MODE=mock`
- [ ] Odstrani `MOCK_ADMIN_EMAIL`
- [ ] Odstrani `MOCK_ADMIN_PASSWORD`
- [ ] Odstrani `NEXT_PUBLIC_MOCK_MODE`

---

## Preverjanje varnosti

### Upravljanje skrivnosti:

- [x] `.env` datoteka je v `.gitignore`
- [x] `.env.example` obstaja z dokumentacijo
- [x] Vse skrivnosti so samo na strani strežnika
- [x] Brez `NEXT_PUBLIC_` predpone na občutljivih spremenljivkah
- [x] Validacija okolja z Zod shemo

### Headerji & CSP:

- [x] CSP headerji konfigurirani
- [x] X-Frame-Options: DENY
- [x] X-Content-Type-Options: nosniff
- [x] X-XSS-Protection omogočen
- [x] Referrer-Policy konfiguriran
- [x] Permissions-Policy konfiguriran
- [x] CORS konfiguriran za API poti

### Varnost API-ja:

- [x] Rate limiting na vseh API poteh
- [x] Stripe webhook preverjanje podpisa
- [x] Validacija vnosov z Zod shemami
- [x] Server actions uporabljajo 'use server' direktivo

---

## Optimizacije zmogljivosti

### Next.js konfiguracija:

- [x] Standalone output za Docker
- [x] Kompresija omogočena
- [x] Optimizacija slik (AVIF, WebP)
- [x] Optimizacija uvoza paketov
- [x] Powered-by header onemogočen

### Optimizacija kode:

- [x] Uporaba `next/image` za vse slike
- [x] Dinamični uvozi za težke komponente (CookieBanner)
- [x] Pravilna konfiguracija velikosti slik
- [x] React Strict Mode omogočen

### Monitoring:

- [x] Vercel Analytics integriran
- [x] Sentry sledenje napakam konfigurirano

---

## Naloge pred zagonom

### DNS & domena:

- [ ] Konfiguriraj DNS A/CNAME zapise
- [ ] Nastavi SSL certifikat (običajno avtomatsko na Vercel/hosting platformi)
- [ ] Posodobi `NEXTAUTH_URL` na produkcijsko domeno

### Baza podatkov:

- [ ] Nastavi produkcijsko PostgreSQL bazo podatkov
- [ ] Poženi migracije: `npx prisma migrate deploy`
- [ ] Napolni začetne podatke, če je potrebno
- [ ] Nastavi varnostne kopije baze podatkov

### Stripe nastavitev:

- [ ] Preklopi iz testnih ključev na produkcijske ključe
- [ ] Konfiguriraj produkcijski webhook endpoint
- [ ] Testiraj plačilni proces v produkciji
- [ ] Nastavi monitoring webhook-ov

### Monitoring:

- [ ] Konfiguriraj Sentry projekt
- [ ] Nastavi uptime monitoring
- [ ] Konfiguriraj agregacijo dnevnikov
- [ ] Nastavi opozarjanje ob napakah

### Testiranje:

- [ ] Poženi celotno E2E testno zbirko
- [ ] Testiraj plačilni proces od začetka do konca
- [ ] Testiraj posredovanje naročil dobavitelju
- [ ] Testiraj e-poštna obvestila
- [ ] Testiraj funkcionalnost admin panela
- [ ] Testiraj na mobilnih napravah
- [ ] Testiraj v več brskalnikih

### SEO:

- [ ] Oddaj sitemap v Google Search Console
- [ ] Oddaj sitemap v Bing Webmaster Tools
- [ ] Preveri, da je robots.txt dostopen
- [ ] Dodaj Google Analytics (če je potrebno)
- [ ] Zamenjaj placeholder Google verifikacijsko kodo v metapodatkih

### Pravno & skladnost:

- [ ] Dodaj politiko zasebnosti
- [ ] Dodaj splošne pogoje poslovanja
- [ ] Dodaj politiko piškotkov
- [ ] Preveri skladnost z GDPR
- [ ] Dodaj politiko vračil/povračil

---

## Preverjanje po namestitvi

### Takojšnje preverjanje:

- [ ] Stran se pravilno naloži na produkcijskem URL-ju
- [ ] SSL certifikat je veljaven
- [ ] Vse strani se pravilno prikažejo
- [ ] Slike se naložijo in so optimizirane
- [ ] Sitemap je dostopen na `/sitemap.xml`
- [ ] Robots.txt je dostopen na `/robots.txt`
- [ ] Ikona se prikaže v zavihku brskalnika
- [ ] OG slika se prikaže pri deljenju na družbenih omrežjih

### Testi funkcionalnosti:

- [ ] Uporabnik lahko brska po izdelkih
- [ ] Iskanje deluje pravilno
- [ ] Funkcionalnost košarice deluje
- [ ] Checkout proces se dokonča
- [ ] Stripe plačilo se obdela
- [ ] E-poštna potrditev naročila se pošlje
- [ ] Naročilo se prikaže v admin panelu
- [ ] Naročilo se posreduje dobavitelju
- [ ] Admin lahko povračila naročila
- [ ] Supplier webhook posodobi status naročila

### Testi zmogljivosti:

- [ ] Poženi Lighthouse pregled (cilj: 90+ točk)
- [ ] Preveri Core Web Vitals
- [ ] Preveri optimizacijo slik
- [ ] Preveri čase nalaganja strani
- [ ] Testiraj na počasni 3G povezavi

### Varnostni testi:

- [ ] Poženi preverjanje varnostnih headerjev (securityheaders.com)
- [ ] Preveri, da CSP deluje
- [ ] Testiraj rate limiting
- [ ] Preveri, da ni skrivnosti v client bundle-u
- [ ] Preveri za XSS ranljivosti
- [ ] Preveri CSRF zaščito

---

## Tekoče vzdrževanje

### Dnevno:

- Spremljaj stopnjo napak v Sentry
- Preveri obdelavo naročil
- Spremljaj opravila sinhronizacije dobavitelja

### Tedensko:

- Preglej spodletela naročila
- Preveri ravni zalog
- Preglej metrike zmogljivosti

### Mesečno:

- Posodobi odvisnosti
- Preglej varnostna opozorila
- Varnostna kopija baze podatkov
- Preglej in rotiraj API ključe

---

## Načrt za vrnitev nazaj

Če se pojavijo težave v produkciji:

1. **Hitra vrnitev**: Vrni se na prejšnjo namestitev
2. **Težave z bazo**: Imej pripravljeno varnostno kopijo baze
3. **Težave s plačili**: Takoj kontaktiraj Stripe podporo
4. **Težave z dobaviteljem**: Onemogoči avtomatsko sinhronizacijo, ročno obdelaj naročila

---

## Kontakti za podporo

- Stripe podpora: https://support.stripe.com
- Vercel podpora: https://vercel.com/support
- Sentry podpora: https://sentry.io/support

---

## Generiranje varnih skrivnosti

### Ukazi:

```bash
# Generiraj NEXTAUTH_SECRET (32+ znakov)
openssl rand -base64 32

# Generiraj CRON_SECRET (16+ znakov)
openssl rand -base64 24

# Ali uporabi Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Podrobni kontrolni seznam

### 1. Priprava okolja (30 minut)

#### Lokalno okolje:

- [ ] Ustvari `.env` datoteko iz `.env.example`
- [ ] Izpolni vse obvezne spremenljivke
- [ ] Generiraj NEXTAUTH_SECRET (min 32 znakov)
- [ ] Generiraj CRON_SECRET (min 16 znakov)
- [ ] Dodaj Stripe test ključe
- [ ] Dodaj SMTP credentials (opcijsko)

#### Produkcijsko okolje:

- [ ] Ustvari `.env.production`
- [ ] Uporabi produkcijske Stripe ključe (ne test!)
- [ ] Uporabi produkcijsko PostgreSQL bazo
- [ ] Generiraj NOVE skrivnosti (ne uporabljaj razvojnih!)
- [ ] Preveri, da ni `AUTH_MODE=mock`
- [ ] Preveri, da ni `MOCK_*` spremenljivk

### 2. Baza podatkov (1 ura)

#### Lokalni razvoj:

- [ ] Namesti SQLite: `npm run prisma:generate`
- [ ] Poženi migracije: `npm run prisma:migrate`
- [ ] Napolni demo podatke: `npm run db:seed`
- [ ] Preveri, da je `dev.db` ustvarjena

#### Produkcija:

- [ ] Ustvari PostgreSQL bazo (Vercel Postgres, Supabase, Neon, Railway)
- [ ] Kopiraj connection string
- [ ] Posodobi `prisma/schema.prisma`: `provider = "postgresql"`
- [ ] Posodobi `DATABASE_URL` v `.env.production`
- [ ] Poženi migracije: `npx prisma migrate deploy`
- [ ] Generiraj Prisma client: `npx prisma generate`
- [ ] Napolni začetne podatke (opcijsko): `npm run db:seed`
- [ ] Nastavi avtomatične varnostne kopije (daily)
- [ ] Testiraj restore proceduro

### 3. Stripe konfiguracija (30 minut)

#### Lokalno testiranje:

- [ ] Ustvari Stripe račun (če še nimaš)
- [ ] Pridobi test ključe iz Dashboard
- [ ] Dodaj v `.env`:
  - `STRIPE_PUBLISHABLE_KEY=pk_test_...`
  - `STRIPE_SECRET_KEY=sk_test_...`
- [ ] Namesti Stripe CLI: https://stripe.com/docs/stripe-cli
- [ ] Poženi: `stripe listen --forward-to localhost:3000/api/stripe-webhook`
- [ ] Kopiraj `whsec_...` v `.env` kot `STRIPE_WEBHOOK_SECRET`
- [ ] Testiraj checkout flow
- [ ] Uporabi test kartico: `4242 4242 4242 4242`
- [ ] Preveri, da se naročilo ustvari v bazi

#### Produkcija:

- [ ] Preklopi na produkcijske ključe v Stripe Dashboard
- [ ] Ustvari webhook v Stripe Dashboard:
  - URL: `https://www.mali-ustvarjalci.si/api/stripe-webhook`
  - Eventi: `checkout.session.completed`
- [ ] Kopiraj webhook secret v `.env.production`
- [ ] Testiraj plačilni flow v produkciji (majhen znesek)
- [ ] Nastavi webhook monitoring v Stripe Dashboard
- [ ] Konfiguriraj email obvestila za spodletela plačila

### 4. SMTP konfiguracija (20 minut)

#### Izberi ponudnika:

**Priporočeno: SendGrid** (brezplačno: 100 emailov/dan)
- [ ] Ustvari SendGrid račun
- [ ] Ustvari API key
- [ ] Preveri sender identity

**Alternativa: Gmail**
- [ ] Omogoči 2FA
- [ ] Ustvari App Password
- [ ] Uporabi `smtp.gmail.com:587`

**Alternativa: Mailgun, AWS SES**

#### Konfiguracija:

- [ ] Dodaj v `.env`:
  ```
  SMTP_HOST=smtp.sendgrid.net
  SMTP_PORT=587
  SMTP_USER=apikey
  SMTP_PASS=[tvoj-sendgrid-api-key]
  ```
- [ ] Testiraj pošiljanje emaila
- [ ] Preveri spam folder
- [ ] Preveri email predloge (OrderConfirmation, ShippingUpdate)

### 5. Dobavitelj konfiguracija (1 ura)

#### Feed URL:

- [ ] Pridobi feed URL od dobavitelja
- [ ] Preveri format (JSON/CSV/XML)
- [ ] Preveri polja: id, title, description, price, quantity, images
- [ ] Dodaj v `.env`: `SUPPLIER_FEED_URL=...`

#### API ključ:

- [ ] Pridobi API ključ od dobavitelja
- [ ] Dodaj v `.env`: `SUPPLIER_API_KEY=...`

#### Order forwarding:

- [ ] Pridobi order API URL od dobavitelja
- [ ] Dodaj v `.env`: `SUPPLIER_ORDER_URL=...`
- [ ] Testiraj posredovanje naročila (test naročilo)
- [ ] Preveri, da dobavitelj prejme naročilo

#### Testiranje:

- [ ] Poženi ročno sinhronizacijo: `npm run sync:supplier`
- [ ] Preveri sync logs v admin panelu
- [ ] Preveri, da so izdelki dodani v bazo
- [ ] Preveri, da so slike pravilne
- [ ] Preveri, da so cene pravilne

### 6. Varnostni pregled (1 ura)

#### Skrivnosti:

- [ ] Preveri, da so vse skrivnosti min 32 znakov (NEXTAUTH_SECRET)
- [ ] Preveri, da so vse skrivnosti min 16 znakov (CRON_SECRET)
- [ ] Preveri, da ni skrivnosti v Git repozitoriju
- [ ] Preveri, da ni skrivnosti v client bundle (Network tab)
- [ ] Preveri, da so Stripe ključi produkcijski (ne test!)

#### Headers:

- [ ] Testiraj na securityheaders.com (cilj: A+)
- [ ] Preveri CSP headers v browser console
- [ ] Preveri, da ni CSP violations
- [ ] Preveri CORS headers (samo za API routes)

#### Rate limiting:

- [ ] Testiraj rate limiting na `/api/search` (30 req/min)
- [ ] Testiraj rate limiting na `/api/stripe` (10 req/min)
- [ ] Testiraj rate limiting na webhooks (60 req/min)
- [ ] Uporabi Apache Bench ali podobno orodje

#### Webhooks:

- [ ] Testiraj Stripe webhook signature verification
- [ ] Testiraj supplier webhook API key validation
- [ ] Testiraj invalid signatures (morajo failati)

#### Dependency audit:

- [ ] Poženi `npm audit`
- [ ] Popravi vse high/critical vulnerabilities
- [ ] Preveri `npm outdated`
- [ ] Posodobi kritične pakete

### 7. Testiranje (2-4 ure)

#### Unit testi:

- [ ] Poženi `npm test`
- [ ] Preveri, da vsi testi passajo
- [ ] Preveri test coverage (cilj: 70%+)

#### E2E testi:

- [ ] Poženi `npm run e2e`
- [ ] Preveri, da vsi testi passajo
- [ ] Preveri Playwright report

#### Manualno testiranje:

- [ ] **Browse products**: Obišči `/sl/shop`, preveri slike, cene
- [ ] **Search**: Išči izdelke, preveri rezultate
- [ ] **Product detail**: Klikni na izdelek, preveri podrobnosti
- [ ] **Add to cart**: Dodaj v košarico, preveri quantity
- [ ] **Cart**: Preveri košarico, posodobi quantity, odstrani izdelek
- [ ] **Checkout**: Izpolni obrazec, preveri validacijo
- [ ] **Payment**: Plačaj s test kartico, preveri redirect
- [ ] **Order confirmation**: Preveri email, preveri admin panel
- [ ] **Admin login**: Prijavi se kot admin
- [ ] **Admin dashboard**: Preveri statistiko
- [ ] **Suppliers**: Dodaj/uredi/izbriši dobavitelja
- [ ] **Sync**: Ročna sinhronizacija, preveri logs
- [ ] **Orders**: Preveri seznam naročil, preveri podrobnosti
- [ ] **Refund**: Testiraj povračilo
- [ ] **Language switch**: Preklopi med SL/EN

#### Mobilno testiranje:

- [ ] Testiraj na Android (Chrome)
- [ ] Testiraj na iOS (Safari)
- [ ] Preveri responsive design
- [ ] Preveri touch targets (min 44x44px)
- [ ] Preveri scrolling performance

#### Browser testiranje:

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### 8. Staging deployment (2 ure)

#### Vercel staging:

- [ ] Push na GitHub branch `staging`
- [ ] Import v Vercel
- [ ] Dodaj environment variables (staging vrednosti)
- [ ] Deploy
- [ ] Preveri deployment URL

#### Testiranje na staging:

- [ ] Celoten user flow (browse → cart → checkout → pay)
- [ ] Admin funkcije
- [ ] Email delivery
- [ ] Supplier sync
- [ ] Order forwarding
- [ ] Performance (Lighthouse)
- [ ] Security headers

#### Bug fixes:

- [ ] Dokumentiraj vse najdene bugge
- [ ] Popravi kritične bugge
- [ ] Re-deploy na staging
- [ ] Re-test

### 9. Production deployment (2-4 ure)

#### Priprava:

- [ ] Ustvari produkcijsko PostgreSQL bazo
- [ ] Generiraj NOVE produkcijske skrivnosti
- [ ] Uporabi produkcijske Stripe ključe
- [ ] Nastavi vse produkcijske environment variables
- [ ] Preveri, da ni `AUTH_MODE=mock`
- [ ] Preveri, da ni test/dev vrednosti

#### Deployment:

- [ ] Push na GitHub branch `main`
- [ ] Deploy na Vercel production
- [ ] Preveri deployment status
- [ ] Preveri build logs

#### DNS konfiguracija:

- [ ] Dodaj A/CNAME record za domeno
- [ ] Preveri DNS propagacijo (lahko traja do 24 ur)
- [ ] Preveri SSL certifikat (avtomatsko na Vercel)
- [ ] Posodobi `NEXTAUTH_URL` na produkcijsko domeno

#### Stripe webhook:

- [ ] Ustvari produkcijski webhook v Stripe Dashboard
- [ ] URL: `https://www.mali-ustvarjalci.si/api/stripe-webhook`
- [ ] Eventi: `checkout.session.completed`
- [ ] Kopiraj webhook secret v produkcijsko `.env`
- [ ] Testiraj z majhnim plačilom

#### Final testing:

- [ ] Obišči produkcijski URL
- [ ] Celoten checkout flow (pravo plačilo, majhen znesek)
- [ ] Preveri email delivery
- [ ] Preveri admin panel
- [ ] Preveri supplier forwarding
- [ ] Monitor Sentry za napake

### 10. Post-launch monitoring (prvi teden)

#### Dan 1:

- [ ] Spremljaj error rate vsako uro
- [ ] Spremljaj order success rate
- [ ] Spremljaj payment success rate
- [ ] Spremljaj email delivery rate
- [ ] Preveri supplier sync

#### Dan 2-7:

- [ ] Dnevno preveri Sentry errors
- [ ] Dnevno preveri order processing
- [ ] Dnevno preveri supplier sync logs
- [ ] Preveri performance metrics
- [ ] Preveri user feedback (če je)

#### Opozorila:

- [ ] Nastavi Sentry alerts za critical errors
- [ ] Nastavi uptime monitoring (UptimeRobot, Pingdom)
- [ ] Nastavi alerts za failed payments
- [ ] Nastavi alerts za failed supplier sync

---

## Varnostni kontrolni seznam

### Pred produkcijo - KRITIČNO ⚠️

#### Skrivnosti:

- [ ] ✅ Generiraj NOVE skrivnosti za produkcijo (ne uporabljaj razvojnih!)
- [ ] ✅ NEXTAUTH_SECRET je min 32 znakov
- [ ] ✅ CRON_SECRET je min 16 znakov
- [ ] ✅ Stripe ključi so produkcijski (začnejo z `pk_live_` in `sk_live_`)
- [ ] ✅ Database URL uporablja SSL/TLS povezavo
- [ ] ✅ SMTP credentials so varni
- [ ] ✅ Ni test/dev secrets v produkciji

#### Mock mode:

- [ ] ✅ `AUTH_MODE=mock` je ODSTRANJEN iz produkcijske `.env`
- [ ] ✅ `MOCK_ADMIN_EMAIL` je ODSTRANJEN
- [ ] ✅ `MOCK_ADMIN_PASSWORD` je ODSTRANJEN
- [ ] ✅ `NEXT_PUBLIC_MOCK_MODE` je ODSTRANJEN

#### Network varnost:

- [ ] ✅ HTTPS je vsiljen (brez HTTP dostopa)
- [ ] ✅ SSL certifikat je veljaven
- [ ] ✅ Baza uporablja šifrirano povezavo
- [ ] ✅ SMTP uporablja TLS/SSL

#### Dostopni nadzor:

- [ ] ✅ Admin panel zahteva avtentikacijo
- [ ] ✅ API poti imajo pravilno avtorizacijo
- [ ] ✅ Webhook endpoints validirajo podpise
- [ ] ✅ Rate limiting je aktiven

### Varnostni testi:

- [ ] Poženi `npm audit` (0 vulnerabilities)
- [ ] Testiraj na securityheaders.com (cilj: A+)
- [ ] Preveri, da ni secrets v client bundle (DevTools → Network)
- [ ] Testiraj rate limiting (Apache Bench)
- [ ] Testiraj webhook signature verification
- [ ] Testiraj CORS configuration
- [ ] Testiraj XSS resistance (input validation)
- [ ] Testiraj SQL injection resistance (Prisma že preprečuje)

---

## Performance kontrolni seznam

### Optimizacije:

- [x] ✅ Vse slike uporabljajo `next/image`
- [x] ✅ AVIF in WebP formati omogočeni
- [x] ✅ Kompresija omogočena
- [x] ✅ Powered-by header onemogočen
- [x] ✅ Package import optimization
- [x] ✅ Dynamic imports za težke komponente

### Testi:

- [ ] Lighthouse audit (cilj: 90+ za vse metrike)
- [ ] Core Web Vitals:
  - [ ] LCP < 2.5s
  - [ ] FID < 100ms
  - [ ] CLS < 0.1
- [ ] PageSpeed Insights (mobile & desktop)
- [ ] WebPageTest (multiple locations)
- [ ] Load testing (Apache Bench, k6):
  - [ ] 100 concurrent users
  - [ ] 1000 requests
  - [ ] Response time < 500ms

### Monitoring:

- [ ] Nastavi Vercel Analytics
- [ ] Nastavi Sentry performance monitoring
- [ ] Nastavi Web Vitals tracking
- [ ] Nastavi alerts za slow pages (> 3s)

---

## SEO kontrolni seznam

### Meta podatki:

- [x] ✅ Title tags za vse strani
- [x] ✅ Description tags za vse strani
- [x] ✅ OpenGraph tags (og:title, og:description, og:image)
- [x] ✅ Twitter Card tags
- [x] ✅ Canonical URLs
- [x] ✅ Language alternates (hreflang)

### Structured data:

- [x] ✅ JSON-LD za izdelke (schema.org/Product)
- [x] ✅ Offer podatki (price, currency, availability)
- [ ] Dodaj Organization schema (opcijsko)
- [ ] Dodaj BreadcrumbList schema (opcijsko)

### Sitemap & Robots:

- [x] ✅ Sitemap generiran (`/sitemap.xml`)
- [x] ✅ Robots.txt generiran (`/robots.txt`)
- [ ] Submit sitemap v Google Search Console
- [ ] Submit sitemap v Bing Webmaster Tools
- [ ] Preveri, da je sitemap dostopen
- [ ] Preveri, da je robots.txt dostopen

### Slike:

- [x] ✅ Favicon (32x32)
- [x] ✅ Apple touch icon (180x180)
- [x] ✅ OG image (1200x630)
- [ ] Testiraj OG image na Facebook Debugger
- [ ] Testiraj OG image na Twitter Card Validator
- [ ] Testiraj OG image na LinkedIn Post Inspector

### Google Search Console:

- [ ] Dodaj in preveri lastništvo domene
- [ ] Submit sitemap
- [ ] Preveri index coverage
- [ ] Preveri mobile usability
- [ ] Preveri Core Web Vitals
- [ ] Nastavi email alerts

---

## GDPR & pravna skladnost

### Pravne strani - KRITIČNO ⚠️⚠️⚠️

- [ ] **Politika zasebnosti** (Privacy Policy)
  - [ ] Napiši vsebino (posvetuj se s pravnikom)
  - [ ] Vključi: zbiranje podatkov, uporaba, hranjenje, pravice uporabnikov
  - [ ] Dodaj v `src/i18n/messages/sl.json` → `legal.privacy.body`
  - [ ] Prevedi v angleščino → `en.json`

- [ ] **Splošni pogoji** (Terms & Conditions)
  - [ ] Napiši vsebino
  - [ ] Vključi: uporaba storitve, plačila, dostava, odgovornost
  - [ ] Dodaj v `src/i18n/messages/sl.json` → `legal.terms.body`
  - [ ] Prevedi v angleščino

- [ ] **Politika vračil** (Returns Policy)
  - [ ] Napiši vsebino (EU zakon: 14 dni za vračilo)
  - [ ] Vključi: pogoji vračila, postopek, povračilo denarja
  - [ ] Dodaj v `src/i18n/messages/sl.json` → `legal.returns.body`
  - [ ] Prevedi v angleščino

- [ ] **Obvestilo o piškotkih** (Cookie Policy)
  - [ ] Napiši vsebino
  - [ ] Vključi: vrste piškotkov, namen, kako onemogočiti
  - [ ] Dodaj v `src/i18n/messages/sl.json` → `legal.cookies.body`
  - [ ] Prevedi v angleščino

### GDPR skladnost:

- [x] ✅ Cookie banner implementiran (`CookieBanner.tsx`)
- [ ] Implementiraj user data export funkcionalnost
- [ ] Implementiraj user data deletion funkcionalnost
- [ ] Dodaj consent tracking
- [ ] Ustvari data processing agreement z dobavitelji
- [ ] Dokumentiraj data breach notification procedure

### Viri:

- https://www.freeprivacypolicy.com/ (generator)
- https://termsfeed.com/ (generator)
- https://gdpr.eu/ (informacije)
- EU template generators

---

## Deployment platforme

### Možnost 1: Vercel (priporočeno)

#### Prednosti:
- Zero-config deployment za Next.js
- Avtomatski HTTPS
- Edge functions
- Preview deployments
- Vercel Postgres integration
- Vercel Analytics vključen

#### Koraki:

1. **Priprava:**
   - [ ] Push projekt na GitHub
   - [ ] Ustvari Vercel račun
   - [ ] Import repozitorija v Vercel

2. **Konfiguracija:**
   - [ ] Dodaj vse environment variables v Vercel Dashboard
   - [ ] Nastavi production branch (main)
   - [ ] Nastavi build command: `npm run build`
   - [ ] Nastavi output directory: `.next`

3. **Deployment:**
   - [ ] Deploy na production
   - [ ] Preveri deployment logs
   - [ ] Preveri, da je build uspešen

4. **Post-deployment:**
   - [ ] Konfiguriraj custom domain
   - [ ] Preveri SSL certifikat
   - [ ] Testiraj celoten flow

#### Cena:
- Hobby: Brezplačno (omejitve)
- Pro: ~$20/mesec (priporočeno za produkcijo)

### Možnost 2: Docker (self-hosted)

#### Prednosti:
- Popoln nadzor
- Brez vendor lock-in
- Cenejše za večji traffic

#### Koraki:

1. **Build:**
   ```bash
   docker build -t mali-ustvarjalci:latest .
   ```

2. **Run:**
   ```bash
   docker run -p 3000:3000 --env-file .env.production mali-ustvarjalci:latest
   ```

3. **Production setup:**
   - [ ] Nastavi reverse proxy (Nginx, Caddy)
   - [ ] Konfiguriraj SSL (Let's Encrypt)
   - [ ] Nastavi process manager (PM2, systemd)
   - [ ] Konfiguriraj firewall
   - [ ] Nastavi backups

#### Cena:
- Server: $5-20/mesec (DigitalOcean, Linode)
- Domain: ~$10/leto
- SSL: Brezplačno (Let's Encrypt)

### Možnost 3: Railway / Render

#### Prednosti:
- Enostavna konfiguracija
- PostgreSQL vključen
- Automatic deployments
- Brezplačen tier za testiranje

#### Koraki:

1. **Railway:**
   - [ ] Ustvari račun na railway.app
   - [ ] Ustvari nov projekt
   - [ ] Connect GitHub repo
   - [ ] Dodaj PostgreSQL service
   - [ ] Dodaj environment variables
   - [ ] Deploy

2. **Render:**
   - [ ] Ustvari račun na render.com
   - [ ] Ustvari nov Web Service
   - [ ] Connect GitHub repo
   - [ ] Dodaj PostgreSQL database
   - [ ] Dodaj environment variables
   - [ ] Deploy

#### Cena:
- Railway: $5-20/mesec
- Render: $7-25/mesec

---

## Backup strategija

### Baza podatkov:

- [ ] Nastavi dnevne avtomatične backups
- [ ] Shrani backups off-site (AWS S3, Backblaze)
- [ ] Retention policy: 30 dni
- [ ] Testiraj restore proceduro (POMEMBNO!)
- [ ] Dokumentiraj restore korake

### Koda:

- [x] ✅ Git repozitorij (GitHub)
- [ ] Nastavi branch protection rules
- [ ] Zahtevaj pull request reviews
- [ ] Zahtevaj passing CI checks

### Environment variables:

- [ ] Shrani `.env.production` varno (1Password, LastPass)
- [ ] Dokumentiraj vse spremenljivke
- [ ] Backup Stripe ključev
- [ ] Backup SMTP credentials

---

## Monitoring & alerting

### Sentry setup:

- [ ] Ustvari Sentry projekt
- [ ] Dodaj `SENTRY_DSN` v `.env.production`
- [ ] Konfiguriraj alerts:
  - [ ] Critical errors → email takoj
  - [ ] Error rate > 1% → email v 5 min
  - [ ] Performance issues → email dnevno
- [ ] Dodaj Slack integration (opcijsko)

### Uptime monitoring:

- [ ] Izberi ponudnika (UptimeRobot, Pingdom, StatusCake)
- [ ] Dodaj monitor za homepage
- [ ] Dodaj monitor za `/api/health` (če dodaš)
- [ ] Nastavi alerts (email, SMS)
- [ ] Check interval: 5 minut

### Log aggregation:

- [ ] Izberi ponudnika (Logtail, Papertrail, Datadog)
- [ ] Konfiguriraj log shipping
- [ ] Nastavi log retention (30 dni)
- [ ] Ustvari dashboards za ključne metrike

---

## Rollback procedura

### Če pride do težav:

#### Manjša težava (bug, ne vpliva na plačila):

1. [ ] Dokumentiraj težavo
2. [ ] Ustvari hotfix branch
3. [ ] Popravi bug
4. [ ] Testiraj na staging
5. [ ] Deploy hotfix
6. [ ] Monitor

#### Večja težava (vpliva na plačila, podatke):

1. [ ] **TAKOJ**: Revert na prejšnjo verzijo (Vercel: instant rollback)
2. [ ] Obvestilo uporabnikom (če je potrebno)
3. [ ] Analiziraj težavo
4. [ ] Popravi v staging okolju
5. [ ] Temeljito testiraj
6. [ ] Re-deploy

#### Kritična težava (data loss, security breach):

1. [ ] **TAKOJ**: Ugasni aplikacijo (če je potrebno)
2. [ ] Obvestilo uporabnikom
3. [ ] Kontaktiraj Stripe support (če vpliva na plačila)
4. [ ] Restore iz backup-a
5. [ ] Rotiraj vse skrivnosti
6. [ ] Preglej access logs
7. [ ] Dokumentiraj incident
8. [ ] Post-mortem analiza

---

## Kontaktne informacije

### Nujni kontakti:

- **Stripe podpora**: https://support.stripe.com (24/7)
- **Vercel podpora**: https://vercel.com/support
- **Sentry podpora**: https://sentry.io/support

### Dobavitelj:

- [ ] Dodaj kontaktne informacije dobavitelja
- [ ] Dodaj 24/7 support številko (če je na voljo)
- [ ] Dodaj backup kontakt

### Interni tim:

- [ ] Dodaj kontakt za tehnično podporo
- [ ] Dodaj kontakt za customer support
- [ ] Dodaj kontakt za management

---

## Opombe

- Vse zahteve Faze 4 so bile dokončane
- Projekt je produkcijsko pripravljen, čaka na konfiguracijo okoljskih spremenljivk
- Ne pozabi zamenjati placeholder vrednosti v `.env.example` z dejanskimi produkcijskimi vrednostmi
- Posodobi Google verifikacijsko kodo v root layout metapodatkih
- Testiraj CELOTEN flow pred javnim zagonom
- Imej rollback načrt pripravljen
- Monitor napake prvi teden po zagonu

---

## Časovnica do produkcije

### Realistična ocena:

**Teden 1: Setup & konfiguracija** (8-12 ur)
- Dan 1-2: Lokalni setup, PostgreSQL migracija
- Dan 3-4: Stripe & SMTP konfiguracija
- Dan 5: Testiranje

**Teden 2: Vsebina & testiranje** (10-16 ur)
- Dan 1-3: Pravne strani (SL + EN)
- Dan 4-5: Celotno testiranje, security audit

**Teden 3: Deployment** (8-12 ur)
- Dan 1-2: Staging deployment
- Dan 3-4: Testiranje na staging, bug fixes
- Dan 5: Production deployment

**Teden 4: Monitoring & launch** (4-8 ur)
- Dan 1-2: Monitoring setup, backup strategija
- Dan 3: Soft launch
- Dan 4-5: Public launch, marketing

**Skupaj:** 30-48 ur efektivnega dela = **3-4 tedne**

---

## Zadnji koraki pred launch

### 24 ur pred launch:

- [ ] Final security audit
- [ ] Final performance test
- [ ] Backup baze podatkov
- [ ] Preveri vse environment variables
- [ ] Preveri, da so vsi testi passing
- [ ] Preveri, da je dokumentacija posodobljena
- [ ] Obvestilo tima o launch času

### Launch dan:

- [ ] Deploy na produkcijo
- [ ] Spremljaj errors v Sentry (vsako uro)
- [ ] Spremljaj performance metrics
- [ ] Spremljaj order processing
- [ ] Spremljaj email delivery
- [ ] Bodi na voljo za hitro reševanje težav

### Prvi teden po launch:

- [ ] Dnevno preverjanje Sentry errors
- [ ] Dnevno preverjanje order processing
- [ ] Dnevno preverjanje supplier sync
- [ ] Zbiranje user feedback
- [ ] Hitro reševanje kritičnih bugov
- [ ] Performance optimization (če je potrebno)

---

**Status:** ✅ Faza 4 dokončana - Pripravljen za produkcijo  
**Zadnja posodobitev:** 3. marec 2026  
**Naslednji korak:** Izpolni ta kontrolni seznam in deploy! 🚀
