import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { formatCurrencyCents } from '@/lib/i18n';
import { safeParseJsonArray } from '@/lib/utils';
import AddToCartButton from './AddToCartButton';
import type { Metadata } from 'next';
import Image from 'next/image';

const siteUrl = process.env.NEXTAUTH_URL || 'https://www.mali-ustvarjalci.si';

export async function generateMetadata({ params }: { params: { slug: string; locale: string } }): Promise<Metadata> {
  const product = await prisma.product.findUnique({ where: { slug: params.slug } });
  if (!product) return {};

  const images = safeParseJsonArray(product.imagesJson);
  const imageUrl = images.length > 0 ? images[0] : undefined;
  const canonicalUrl = `${siteUrl}/${params.locale}/shop/${params.slug}`;

  return {
    title: product.title,
    description: product.description || `Buy ${product.title} at Mali Ustvarjalci`,
    openGraph: {
      title: product.title,
      description: product.description || `Buy ${product.title} at Mali Ustvarjalci`,
      type: 'website',
      url: canonicalUrl,
      images: imageUrl ? [{ url: imageUrl, alt: product.title }] : [],
      locale: params.locale === 'en' ? 'en_US' : 'sl_SI',
      siteName: 'Mali Ustvarjalci',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.title,
      description: product.description || `Buy ${product.title} at Mali Ustvarjalci`,
      images: imageUrl ? [imageUrl] : [],
    },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'sl': `${siteUrl}/sl/shop/${params.slug}`,
        'en': `${siteUrl}/en/shop/${params.slug}`,
      },
    },
  };
}

export default async function ProductDetail({ params }: { params: { slug: string; locale: string } }) {
  const product = await prisma.product.findUnique({ where: { slug: params.slug } });
  if (!product) return notFound();
  const t = await getTranslations();
  const intlLocale = params.locale === 'en' ? 'en-US' : 'sl-SI';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    sku: product.id,
    description: product.description,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'EUR',
      price: (product.priceCents / 100).toFixed(2),
      availability: 'https://schema.org/InStock',
    },
  };

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="aspect-square bg-gray-100 rounded overflow-hidden relative">
          {(() => {
            const images = safeParseJsonArray(product.imagesJson);
            if (images.length === 0) return null;
            return (
              <Image 
                src={images[0]} 
                alt={product.title} 
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            );
          })()}
        </div>
        <div>
          <h1 className="text-2xl font-semibold">{product.title}</h1>
          <p className="text-gray-600 mt-2">{product.description}</p>
          <div className="mt-4 text-xl font-semibold">{formatCurrencyCents(product.priceCents, intlLocale)} ({t('shop.withVat')})</div>
          <AddToCartButton product={{ id: product.id, slug: product.slug, title: product.title, priceCents: product.priceCents }} />
        </div>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </main>
  );
}





