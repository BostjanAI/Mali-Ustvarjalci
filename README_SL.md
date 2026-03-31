# Mali Ustvarjalci – Dropshipping trgovina

Tehnološki sklad: Next.js 14 (App Router), TypeScript, Tailwind, Prisma, NextAuth, Stripe, next-intl, Zustand, Zod.

## Namestitev

1. Ustvari `.env` datoteko (ali kopiraj `.env.example`):
   - DATABASE_URL="file:./dev.db" (SQLite za lokalni razvoj) ali Postgres URL
   - NEXTAUTH_URL, NEXTAUTH_SECRET
   - AUTH_MODE=mock (opcijsko: omogoči mock avtentikacijo brez baze)
   - MOCK_ADMIN_EMAIL=admin@example.com / MOCK_ADMIN_PASSWORD=admin123 (opcijsko)
   - STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (za plačila)
   - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (opcijsko)
   - SUPPLIER_FEED_URL, SUPPLIER_ORDER_URL, SUPPLIER_API_KEY

2. Namesti odvisnosti: `npm install`

3. Razvojni strežnik: `npm run dev`

4. Opcijsko (ko je baza pripravljena): `npm run prisma:migrate` in `npm run db:seed`

5. Monitoring (opcijsko): nastavi `SENTRY_DSN` za sledenje napakam

## Sinhronizacija dobavitelja & uvoz (potrebna baza)

- Sync now API: `POST /api/admin/sync-now` (potrebna admin pravica ali header `x-cron-secret` ki se ujema z `CRON_SECRET`; vrne 400 v mock/SQLite načinu)
- CLI skripte:
  - `npm run sync:supplier` (uporablja SUPPLIER_FEED_URL)
  - `npm run import:products -- pot/do/datoteke.csv`

### Konfiguracija dobavitelja

- **SUPPLIER_FEED_URL**: CSV/JSON/XML feed s polji id, title, description, price, quantity, images[]
- **SUPPLIER_API_KEY**: Opcijski bearer token za feed in supplier API
- **SUPPLIER_ORDER_URL**: Endpoint za posredovanje plačanih naročil (POST JSON)

### Načrtovana dnevna sinhronizacija

- Možnost A: Zunanji cron (npr. GitHub Actions ali hosted cron), ki kliče vaš deployed sync endpoint enkrat na dan/uro
- Zahteve:
  - Endpoint: `POST /api/admin/sync-now`
  - Header: `x-cron-secret: $CRON_SECRET`
  - Env spremenljivka: nastavi `CRON_SECRET` v produkcijskem okolju
- Primer curl:
  - `curl -X POST -H "x-cron-secret: $CRON_SECRET" https://vasa-aplikacija.vercel.app/api/admin/sync-now`

### Testiranje od začetka do konca

1. Kopiraj `.env.example` v `.env` in izpolni vrednosti
2. `npm run prisma:migrate && npm run db:seed`
3. Poženi sync: `npm run sync:supplier` (ali uporabi Admin → Dobavitelji → Sinhroniziraj zdaj)
4. Checkout: iz `/sl/checkout`, plačaj preko Stripe (test ključi) → Stripe webhook ustvari naročilo in sproži posredovanje dobavitelju
5. Simuliraj posodobitev statusa dobavitelja: `POST /api/supplier-webhook` z headerjem `x-api-key: SUPPLIER_API_KEY` in telesom `{ "supplierOrderId": "...", "status": "shipped" }`

## Avtentikacija

- Mock način (`AUTH_MODE=mock`): uporabi Credentials
  - Admin: `admin@example.com` / `admin123` (nastavljivo)
  - Uporabnik: katerikoli email z geslom `password`
- DB način: NextAuth + Prisma adapter (email/geslo in Google opcijsko)

## Opombe

- Non-DB flow uporablja mock izdelke za shop/product strani in stub checkout
- Zamenjaj checkout stub s Stripe Checkout in Prisma Orders, ko je baza konfigurirana

## Produkcijska namestitev

### Faza 4 dokončana ✅

Ta projekt je produkcijsko pripravljen z:
- ✅ SEO optimiziran (Next.js Metadata API, dinamični OG tags, sitemap, robots.txt)
- ✅ Vse slike optimizirane (next/image z AVIF/WebP)
- ✅ Varnost okrepljena (CSP, CORS, rate limiting, upravljanje skrivnosti)
- ✅ CI/CD konfiguriran (avtomatizirano testiranje in gradnja)
- ✅ Produkcijska sredstva (favicon, OG slika, manifest)

### Hitra namestitev:

```bash
# 1. Nastavi okolje
cp .env.example .env.production
# Uredi .env.production s produkcijskimi vrednostmi

# 2. Namesti in zgradi
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build

# 3. Zaženi
npm start  # ali uporabi Docker
```

### Kontrolni seznam za namestitev:

- [ ] Nastavi vse okoljske spremenljivke (glej `.env.example`)
- [ ] Generiraj varne skrivnosti: `openssl rand -base64 32`
- [ ] Uporabi produkcijske Stripe ključe
- [ ] Konfiguriraj PostgreSQL bazo podatkov
- [ ] Poženi migracije baze: `npx prisma migrate deploy`
- [ ] Konfiguriraj Stripe webhook → `/api/stripe-webhook`
- [ ] Konfiguriraj GitHub Action skrivnosti za supplier sync
- [ ] Posodobi Google verifikacijsko kodo v `src/app/layout.tsx`
- [ ] Oddaj sitemap v Google Search Console
- [ ] Poženi varnostni pregled: `npm audit`
- [ ] Testiraj vse kritične procese

### Dokumentacija:

- `PRODUKCIJSKI_KONTROLNI_SEZNAM.md` - Popoln kontrolni seznam pred namestitvijo
- `SECURITY_CHECKLIST.md` - Varnostni pregled in smernice (angleško)
- `PHASE_4_DELIVERABLES.md` - Povzetek implementacije Faze 4 (angleško)
- `POROCILO_PROJEKTA.md` - Podrobno poročilo o projektu

## Ukazi

```bash
# Razvoj
npm run dev              # Zaženi razvojni strežnik
npm run build            # Zgradi za produkcijo
npm start                # Zaženi produkcijski strežnik

# Baza podatkov
npm run prisma:generate  # Generiraj Prisma client
npm run prisma:migrate   # Poženi migracije
npm run db:seed          # Napolni bazo s demo podatki

# Dobavitelj
npm run sync:supplier    # Sinhroniziraj izdelke iz feed-a
npm run import:products  # Uvozi izdelke iz CSV

# Testiranje
npm run lint             # ESLint
npm run typecheck        # TypeScript preverjanje
npm test                 # Jest unit testi
npm run e2e              # Playwright E2E testi
```

## Struktura projekta

```
src/
├── app/                 # Next.js App Router
│   ├── (shop)/         # Javna trgovina
│   │   └── [locale]/
│   │       ├── shop/   # Katalog izdelkov
│   │       ├── cart/   # Košarica
│   │       ├── checkout/ # Blagajna
│   │       └── legal/  # Pravne strani
│   ├── (admin)/        # Admin panel
│   │   └── [locale]/admin/
│   │       ├── suppliers/  # Dobavitelji
│   │       ├── orders/     # Naročila
│   │       ├── products/   # Izdelki
│   │       └── sync-logs/  # Dnevniki
│   └── api/            # API endpoints
├── components/         # React komponente
├── lib/                # Poslovna logika
├── i18n/               # Prevodi (SL/EN)
├── mail/               # E-poštne predloge
└── middleware.ts       # Next.js middleware
```

## Funkcionalnosti

### ✅ Implementirano

- **E-trgovina**: Katalog, iskanje, sortiranje, košarica, checkout
- **Plačila**: Stripe Checkout integration
- **Admin panel**: Dashboard, upravljanje dobaviteljev, naročil, izdelkov
- **Sinhronizacija**: Avtomatična sinhronizacija izdelkov iz CSV/JSON/XML feed-ov
- **Posredovanje naročil**: Avtomatično posredovanje plačanih naročil dobavitelju
- **E-pošta**: Potrditve naročil, obvestila o pošiljki
- **Večjezičnost**: Slovenščina in angleščina
- **SEO**: Sitemap, robots.txt, meta podatki, structured data
- **Varnost**: CSP headers, CORS, rate limiting, input validation
- **Testiranje**: Unit testi (Jest), E2E testi (Playwright)
- **CI/CD**: GitHub Actions za avtomatizirano testiranje

### ⚠️ Potrebno pred produkcijo

- Izpolni pravne strani (splošni pogoji, politika zasebnosti, vračila, piškotki)
- Konfiguriraj PostgreSQL bazo
- Nastavi SMTP za e-pošto
- Konfiguriraj Stripe webhook
- Generiraj produkcijske skrivnosti

## Poti (Routes)

| Pot | Opis |
|-----|------|
| `/` | Domača stran |
| `/sl/shop` | Katalog izdelkov (slovensko) |
| `/en/shop` | Katalog izdelkov (angleško) |
| `/sl/shop/[slug]` | Podrobnosti izdelka |
| `/sl/cart` | Košarica |
| `/sl/checkout` | Blagajna |
| `/sl/thank-you` | Potrditev naročila |
| `/sl/admin` | Admin dashboard (zahteva prijavo) |
| `/sl/admin/suppliers` | Upravljanje dobaviteljev |
| `/sl/admin/orders` | Pregled naročil |
| `/sl/admin/products` | Pregled izdelkov |
| `/sl/admin/sync-logs` | Dnevniki sinhronizacije |
| `/sl/legal/terms` | Splošni pogoji |
| `/sl/legal/privacy` | Politika zasebnosti |
| `/sl/legal/returns` | Politika vračil |
| `/sl/legal/cookies` | Obvestilo o piškotkih |

## Prijava

**Mock način** (razvoj):
- Admin: `admin@example.com` / `admin123`
- Uporabnik: katerikoli email / `password`

**DB način** (produkcija):
- Ustvari uporabnika ali uporabi seed-anega admina

## Docker

```bash
# Zgradi sliko
docker build -t mali-ustvarjalci:latest .

# Zaženi kontejner
docker run -p 3000:3000 --env-file .env.production mali-ustvarjalci:latest
```

## Podpora

Za vprašanja in težave:
- Stripe: https://support.stripe.com
- Vercel: https://vercel.com/support
- Sentry: https://sentry.io/support

## Licenca

Zasebno - Vse pravice pridržane

---

**Status projekta:** ✅ Produkcijsko pripravljen  
**Verzija:** 0.1.0  
**Zadnja posodobitev:** 3. marec 2026
