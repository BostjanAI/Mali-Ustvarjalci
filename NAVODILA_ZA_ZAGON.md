# Navodila za zagon Mali Ustvarjalci – od nič do delujoče trgovine

> Datum: 17. 3. 2026  
> Stanje projekta: tehnično pripravljen, manjkajo konfiguracija, vsebina in 2 manjši popravki kode.

---

## FAZA 1: Infrastruktura in baza podatkov

### Korak 1: Pridobi PostgreSQL bazo podatkov

Projekt trenutno deluje na SQLite (samo za razvoj) – za produkcijo potrebuješ pravo bazo.

Možnosti:
- **Neon** (brezplačni tier): [neon.tech](https://neon.tech) – ustvari projekt, kopiraj `DATABASE_URL`
- **Supabase** (brezplačni tier): [supabase.com](https://supabase.com) – kopiraj PostgreSQL connection string
- **Railway**: [railway.app](https://railway.app) – dodaj PostgreSQL plugin
- Lastni strežnik: `postgresql://user:password@host:5432/dbname`

Connection string bo v obliki:
```
postgresql://user:password@host:5432/dbname?sslmode=require
```

---

### Korak 2: Pridobi Stripe račun in ključe

1. Pojdi na [stripe.com](https://stripe.com) in ustvari račun
2. V Stripe Dashboard → **Developers → API keys**:
   - Kopiraj `Publishable key` (začne se z `pk_live_...` ali za testiranje `pk_test_...`)
   - Kopiraj `Secret key` (začne se z `sk_live_...` ali `sk_test_...`)
3. Stripe Webhook uredi po deploymentu – glej Korak 8

---

### Korak 3: Ustvari `.env` datoteko

V korenskem direktoriju projekta ustvari datoteko `.env` (kopiraj `.env.example`):

```env
# Baza podatkov (PostgreSQL – NE SQLite!)
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

# NextAuth – OBVEZNO
NEXTAUTH_URL="https://tvoja-domena.com"
NEXTAUTH_SECRET="generiraj-z-ukazom-spodaj"

# Stripe
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."    # dodaj po Koraku 8

# SMTP email (npr. Gmail, Sendgrid, Mailgun)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="tvoj@email.com"
SMTP_PASS="geslo-ali-app-password"

# Dobavitelj (izpolni z resničnimi vrednostmi)
SUPPLIER_FEED_URL="https://dobavitelj.com/feed.csv"
SUPPLIER_ORDER_URL="https://dobavitelj.com/api/orders"
SUPPLIER_API_KEY="tvoj-api-kljuc"

# Cron zaščita (naključni niz)
CRON_SECRET="generiraj-z-ukazom-spodaj"

# Sentry (opcijsko – za monitoring napak)
# SENTRY_DSN="https://..."
```

**Generiraj varne skrivnosti** – zaženi dvakrat (enkrat za `NEXTAUTH_SECRET`, enkrat za `CRON_SECRET`):
```bash
openssl rand -base64 32
```

---

### Korak 4: Posodobi Prisma shemo za PostgreSQL

V datoteki `prisma/schema.prisma` **zamenjaj** vrstico:
```
provider = "sqlite"
```
z:
```
provider = "postgresql"
```

---

### Korak 5: Namesti odvisnosti in pripravi bazo

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run db:seed
```

Po `db:seed` bo ustvarjen admin uporabnik:
- Email: `admin@example.com`
- Geslo: `admin123`

> **Takoj po prvem vpisu geslo zamenjaj!**

---

## FAZA 2: Vsebinska priprava

### Korak 6: Izpolni pravne strani

V datoteki `src/i18n/messages/sl.json` zamenjaj placeholder besedila za vse 4 strani:
- `legal.terms.body` → splošni pogoji poslovanja
- `legal.privacy.body` → politika zasebnosti (GDPR!)
- `legal.returns.body` → politika vračil
- `legal.cookies.body` → politika piškotkov

In enako v `src/i18n/messages/en.json` za angleško različico.

> **Opozorilo**: GDPR zahteva natančno politiko zasebnosti. Priporoča se posvet s pravnikom ali vsaj uporaba generatorja kot je [gdprprivacypolicy.net](https://www.gdprprivacypolicy.net).

---

### Korak 7: FeaturedProducts na domači strani

**Opravljeno:** `FeaturedProducts` uporablja `getFeaturedProducts()` (`src/lib/getFeaturedProducts.ts`) — aktivni produkti iz baze (ali mock, če je `NEXT_PUBLIC_MOCK_MODE=true`).

---

## FAZA 3: Deployment

### Korak 8: Deploy aplikacije

**Možnost A: Vercel (priporočeno)**

**Predpogoji**
- Koda je v GitHub repozitoriju (npr. `BostjanAl/Mali-Ustvarjalci`). Če v mapi projekta še ni `.git`, namesti [Git for Windows](https://git-scm.com/download/win), nato v mapi projekta: `git init`, `git add .`, `git commit`, `git remote add origin …`, `git push -u origin main`.
- PostgreSQL za produkcijo (Neon, Supabase, …) in connection string za `DATABASE_URL`.

**Vercel (korak za korakom)**
1. [vercel.com](https://vercel.com) → **Add New → Project**.
2. Izberi **GitHub** in repozitorij **`Mali-Ustvarjalci`** (ime Vercel projekta: samo male črke, npr. `mali-ustvarjalci`).
3. **Environment Variables** (Production) — minimalno:
   - `DATABASE_URL` — celoten URI z geslom (PostgreSQL)
   - `NEXTAUTH_SECRET` — naključen niz (npr. `openssl rand -base64 32`)
   - `NEXTAUTH_URL` — `https://<ime-projekta>.vercel.app` (točen URL po prvem deployu; brez končnega `/`)
   Po potrebi še Stripe, dobavitelj, SMTP itd. (glej `PRODUCTION_CHECKLIST.md`).
4. **Deploy**. Build uporabi `postinstall` → `prisma generate` (že v `package.json`).
5. **Migracije baze** (enkrat, proti produkcijski `DATABASE_URL`):
   ```bash
   npx prisma migrate deploy
   ```
   Lokalno z nastavljenim `DATABASE_URL` na produkcijsko bazo ali prek Vercel CLI / CI. Brez tega tabele ne obstajajo.
6. Če spremeniš env (npr. `NEXTAUTH_URL`), naredi **Redeploy**.

**Če `git push` vrne `remote: Repository not found` (repozitorij na GitHubu obstaja)**  
GitHub pogosto vrne 404, če **OAuth / shranjene poverilnice** pripadajo **drugemu** računu kot lastniku repozitorija. Rešitve:

1. **Personal Access Token (hitro)** — prijavi se kot **BostjanAl** → **Settings → Developer settings → Personal access tokens (classic)** → **Generate** → obkljukaj **`repo`**. V CMD (zamenjaj `TOKEN`):
   ```cmd
   git push -u https://BostjanAl:TOKEN@github.com/BostjanAl/Mali-Ustvarjalci.git main
   ```
   Token ne sme vsebovati presledkov. Ukaz lahko ostane v zgodovini CMD — po uspehu raje uporabi **SSH** spodaj ali shrani poverilnico varno. Nato `git remote -v` še vedno kaže `https://github.com/...` — to je v redu.

2. **SSH (priporočeno za stalno)** — `ssh-keygen -t ed25519`, javni ključ dodaj na GitHub (**Settings → SSH keys**), nato:
   ```cmd
   git remote set-url origin git@github.com:BostjanAl/Mali-Ustvarjalci.git
   git push -u origin main
   ```

3. Pomoč: skripta `scripts/clear-github-credentials.ps1` + v **Credential Manager** zavihek **Web Credentials** → odstrani `github.com`.

**Možnost B: Docker (lastni strežnik)**
```bash
npm run build
docker build -t mali-ustvarjalci .
docker run -p 3000:3000 --env-file .env mali-ustvarjalci
```

---

### Korak 9: Nastavi Stripe Webhook

1. V Stripe Dashboard → **Developers → Webhooks → Add endpoint**
2. URL: `https://tvoja-domena.com/api/stripe-webhook`
3. Events ki jih je treba poslušati: `checkout.session.completed`
4. Po ustvaritvi kopiraj `Signing secret` (`whsec_...`)
5. Dodaj ga v `.env` kot `STRIPE_WEBHOOK_SECRET`
6. Redeploy aplikacijo (da pobere novo env spremenljivko)

---

### Korak 10: Nastavi GitHub Secrets za avtomatski daily sync

V GitHub repozitoriju → **Settings → Secrets and variables → Actions** dodaj:
- `CRON_SECRET` → ista vrednost kot v `.env`
- `SYNC_ENDPOINT_URL` → `https://tvoja-domena.com/api/admin/sync-now`

---

## FAZA 4: Google in SEO

### Korak 11: Google Search Console

1. Pojdi na [search.google.com/search-console](https://search.google.com/search-console)
2. Dodaj svojo domeno → izberi verifikacijo z HTML tag
3. Kopiraj verifikacijsko kodo
4. V datoteki `src/app/layout.tsx` zamenjaj:
   ```
   google: 'add-your-google-verification-code'
   ```
   z dejansko kodo iz Search Console
5. Oddaj sitemap: `https://tvoja-domena.com/sitemap.xml`

---

## FAZA 5: Preverjanje pred odprtjem

### Korak 12: Testiranje celotnega toka

Preveri vsako od teh točk:

| Točka | Kako preveriti |
|---|---|
| Domača stran prikazuje prave produkte | Odpri `https://domena.com/sl` |
| Iskanje in filtriranje deluje | Pojdi na `/sl/shop`, iskaj produkt |
| Košarica deluje | Dodaj produkt, poglej `/sl/cart` |
| Checkout z Stripe (TEST) | Uporabi Stripe test kartico: `4242 4242 4242 4242` |
| Potrditveni email prispe | Po testnem nakupu preveri inbox |
| Admin dashboard dostopen | Vpiši se na `/sl/admin` z admin računom |
| Supplier sync deluje | Admin → Suppliers → Sync now |
| Pravne strani prikazujejo pravo vsebino | Preveri `/sl/legal/terms` itd. |

---

## Povzetek prioritet

| Prioriteta | Naloga | Datoteka / lokacija |
|---|---|---|
| 🔴 BLOCKER | PostgreSQL `DATABASE_URL` nastaviti | `.env` |
| 🔴 BLOCKER | Prisma schema → `postgresql` + migrate | `prisma/schema.prisma` |
| 🔴 BLOCKER | Stripe ključi + webhook | `.env`, Stripe Dashboard |
| 🔴 BLOCKER | `NEXTAUTH_SECRET` nastaviti | `.env` |
| 🟠 NUJNO | Pravne strani – prava vsebina (GDPR) | `src/i18n/messages/sl.json`, `en.json` |
| 🟠 NUJNO | SMTP email konfiguracija | `.env` |
| ✅ | FeaturedProducts – iz baze (`getFeaturedProducts`) | `src/lib/getFeaturedProducts.ts` |
| 🟡 POMEMBNO | Supplier feed URL (pravi podatki) | `.env` |
| 🟡 POMEMBNO | GitHub Secrets za daily sync | GitHub → Settings → Secrets |
| 🟡 POMEMBNO | Google Search Console verifikacija | `src/app/layout.tsx` |
| 🟢 PRIPOROČENO | Sentry DSN za monitoring napak | `.env` |

---

## Opombe

- **Mock način**: Za lokalni razvoj brez baze nastavi `AUTH_MODE=mock` in `NEXT_PUBLIC_MOCK_MODE=true` v `.env`. V produkciji teh spremenljivk **ne smeš** imeti nastavljenih.
- **Stripe test vs. live**: Med razvojem uporabljaj test ključe (`pk_test_`, `sk_test_`) in test kartico `4242 4242 4242 4242`. Pred odprtjem zamenjaj z live ključi.
- **Slike produktov**: Če dobaviteljev CDN ni na seznamu dovoljenih v `next.config.mjs`, slike ne bodo naložene. Dodaj hostname dobavitelja v `remotePatterns`.
- **Varnost**: Nikoli ne commita `.env` datoteke v git repozitorij.
