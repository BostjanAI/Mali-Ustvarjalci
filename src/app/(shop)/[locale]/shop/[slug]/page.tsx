import { serializeJsonLd } from '@/lib/security';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Info } from 'lucide-react';
import { getProduct } from '@/lib/getProduct';
import { getFeaturedProducts } from '@/lib/getFeaturedProducts';
import { categoryLabel } from '@/lib/catalog';
import { formatCurrencyCents } from '@/lib/i18n';
import ProductImage from '@/components/ProductImage';
import ProductCard from '@/components/ProductCard';
import StockStatus from '@/components/StockStatus';
import { vatLabel } from '@/lib/business';
import AddToCartButton from './AddToCartButton';
const siteUrl = process.env.NEXTAUTH_URL || 'https://www.mali-ustvarjalci.si';
export async function generateMetadata({
  params,
}: {
  params: { slug: string; locale: string };
}): Promise<Metadata> {
  const p = await getProduct(params.slug, params.locale);
  if (!p) return {};
  return {
    title: p.title,
    description: p.description || p.title,
    alternates: {
      canonical: siteUrl + '/' + params.locale + '/shop/' + p.slug,
    },
    openGraph: {
      title: p.title,
      description: p.description || p.title,
      images: p.images.map((url) => ({ url, alt: p.title })),
    },
  };
}
export default async function ProductDetail({
  params,
}: {
  params: { slug: string; locale: string };
}) {
  const p = await getProduct(params.slug, params.locale);
  if (!p) return notFound();
  const en = params.locale === 'en';
  const demo = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
  const related = (await getFeaturedProducts(5, params.locale))
    .filter((item) => item.id !== p.id)
    .slice(0, 3);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.title,
    sku: p.id,
    description: p.description,
    image: p.images,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'EUR',
      price: (p.priceCents / 100).toFixed(2),
      url: siteUrl + '/' + params.locale + '/shop/' + p.slug,
    },
  };
  return (
    <div className="site-wrap product-detail">
      <nav
        className="breadcrumb"
        aria-label={en ? 'Breadcrumb' : 'Pot do izdelka'}
      >
        <Link href={'/' + params.locale}>{en ? 'Home' : 'Domov'}</Link>
        <span>/</span>
        <Link href={'/' + params.locale + '/shop'}>
          {en ? 'Shop' : 'Trgovina'}
        </Link>
        <span>/</span>
        <span>{p.title}</span>
      </nav>
      <div className="product-detail-grid">
        <div>
          <div className="detail-image">
            <ProductImage
              src={p.images[0]}
              title={p.title}
              priority
              sizes="(max-width:760px) 100vw, 50vw"
            />
          </div>
          {demo && (
            <p className="demo-note">
              <Info size={16} />
              {en
                ? 'Illustrative demo product.'
                : 'Ilustracija predstavitvenega izdelka.'}
            </p>
          )}
        </div>
        <div className="detail-info">
          <Link
            className="eyebrow"
            href={
              '/' +
              params.locale +
              '/shop?category=' +
              encodeURIComponent(p.categoryPath || '')
            }
          >
            {categoryLabel(p.categoryPath, params.locale)}
          </Link>
          <StockStatus product={p} locale={params.locale} />
          <h1 className="display-title">{p.title}</h1>
          <p className="body-copy">{p.description}</p>
          <div className="detail-price">
            {formatCurrencyCents(p.priceCents, en ? 'en-IE' : 'sl-SI')}
          </div>
          <p className="detail-subtitle">
            {demo
              ? en
                ? 'Example price.'
                : 'Predstavitvena cena.'
              : vatLabel(params.locale)}{' '}
            {en
              ? 'Shipping is calculated at checkout.'
              : 'Dostava se obračuna ob zaključku nakupa.'}
          </p>
          <AddToCartButton
            product={{
              id: p.id,
              slug: p.slug,
              title: p.title,
              priceCents: p.priceCents,
              image: p.images[0],
              availability: p.availability,
              stockQuantity: p.stockQuantity,
            }}
            locale={params.locale}
          />
          {demo && (
            <div className="detail-callout">
              {en
                ? 'Demo collection: price, illustration and description are examples. Availability and age suitability have not been verified.'
                : 'Predstavitveni katalog: cena, ilustracija in opis so primeri. Dobavljivost in starostna primernost nista potrjeni.'}
            </div>
          )}
          {p.details && (
            <section
              className="product-facts"
              aria-label={en ? 'Product information' : 'Podatki o izdelku'}
            >
              <h2>{en ? 'Age and safety' : 'Starost in varnost'}</h2>
              <p>
                <strong>{p.ageLabel}</strong>
              </p>
              <p className="product-warnings">{p.details.warnings}</p>
              {p.details.instructionsUrl && (
                <p>
                  <a
                    className="text-link"
                    href={p.details.instructionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {en ? 'Instructions for use' : 'Navodila za uporabo'} (
                    {p.details.instructionsLanguage})
                  </a>
                </p>
              )}
              <h3>{en ? 'Manufacturer' : 'Proizvajalec'}</h3>
              <p>
                {p.details.manufacturer.name}
                <br />
                {p.details.manufacturer.address}
                <br />
                {p.details.manufacturer.email}
              </p>
              {p.details.euResponsiblePerson.name && (
                <>
                  <h3>
                    {en ? 'EU responsible person' : 'Odgovorna oseba v EU'}
                  </h3>
                  <p>
                    {p.details.euResponsiblePerson.name}
                    <br />
                    {p.details.euResponsiblePerson.address}
                    <br />
                    {p.details.euResponsiblePerson.email}
                  </p>
                </>
              )}
              {p.stockCheckedAt && (
                <p className="detail-subtitle">
                  {en ? 'Stock last confirmed: ' : 'Zaloga nazadnje potrjena: '}
                  {new Date(p.stockCheckedAt).toLocaleString(
                    en ? 'en-GB' : 'sl-SI',
                    { timeZone: 'Europe/Ljubljana' },
                  )}
                </p>
              )}
            </section>
          )}
          <details open>
            <summary>
              {en ? 'About this little discovery' : 'O tem malem odkritju'}
            </summary>
            <p>{p.description}</p>
          </details>
          <details>
            <summary>{en ? 'Before you choose' : 'Preden izbereš'}</summary>
            <p>
              {en
                ? 'Check the manufacturer’s age recommendation, contents and safety instructions before use. If information is missing, contact us before purchasing.'
                : 'Pred uporabo preveri starostno priporočilo, vsebino in varnostna navodila proizvajalca. Če podatki manjkajo, nam pred nakupom piši.'}
            </p>
          </details>
          <details>
            <summary>
              {en ? 'Purchasing and returns' : 'Nakup in vračila'}
            </summary>
            <p>
              <Link
                className="text-link"
                href={'/' + params.locale + '/legal/terms'}
              >
                {en ? 'Purchase terms' : 'Pogoji nakupa'}
              </Link>
              {' · '}
              <Link
                className="text-link"
                href={'/' + params.locale + '/legal/returns'}
              >
                {en ? 'Returns' : 'Vračila in reklamacije'}
              </Link>
            </p>
          </details>
        </div>
      </div>
      {related.length > 0 && (
        <section>
          <div className="section-head">
            <h2 className="section-title">
              {en ? 'More little discoveries' : 'Še več malih odkritij'}
            </h2>
            <Link className="text-link" href={'/' + params.locale + '/shop'}>
              {en ? 'All products' : 'Vsi izdelki'}
            </Link>
          </div>
          <div className="product-grid">
            {related.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                locale={params.locale}
              />
            ))}
          </div>
        </section>
      )}
      {!demo && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(jsonLd),
          }}
        />
      )}
    </div>
  );
}
