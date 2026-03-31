import Link from 'next/link';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { ArrowRight, ShoppingCart } from 'lucide-react';
import { getFeaturedProducts } from '@/lib/getFeaturedProducts';
import { formatCurrencyCents } from '@/lib/i18n';
import Card from '@/components/ui/Card';

interface FeaturedProductsProps {
  locale: string;
}

const PRODUCT_COLORS = [
  'from-brand-50 to-brand-100',
  'from-amber-50 to-amber-100',
  'from-pink-50 to-pink-100',
  'from-violet-50 to-violet-100',
];

export default async function FeaturedProducts({ locale }: FeaturedProductsProps) {
  const t = await getTranslations('home.featured');
  const intlLocale = locale === 'en' ? 'en-US' : 'sl-SI';
  const products = await getFeaturedProducts(4);

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="bg-gray-50 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">{t('title')}</h2>
          <Link
            href={`/${locale}/shop`}
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-700 no-underline transition-colors"
          >
            {t('viewAll')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product, idx) => (
            <Link
              key={product.id}
              href={`/${locale}/shop/${product.slug}`}
              className="group no-underline"
            >
              <Card hover className="h-full flex flex-col">
                <div
                  className={[
                    'h-48 bg-gradient-to-br flex items-center justify-center overflow-hidden relative',
                    product.images.length > 0 ? 'bg-gray-100' : PRODUCT_COLORS[idx % PRODUCT_COLORS.length],
                  ].join(' ')}
                >
                  {product.images.length > 0 ? (
                    <Image
                      src={product.images[0]}
                      alt={product.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  ) : (
                    <ShoppingCart className="w-12 h-12 text-brand-300 group-hover:text-brand-400 transition-colors" />
                  )}
                </div>

                {/* Product info */}
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-semibold text-gray-900 text-sm group-hover:text-brand transition-colors leading-snug">
                    {product.title}
                  </h3>
                  {product.description && (
                    <p className="mt-1.5 text-xs text-gray-500 leading-relaxed line-clamp-2 flex-1">
                      {product.description}
                    </p>
                  )}
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-base font-bold text-gray-900">
                      {formatCurrencyCents(product.priceCents, intlLocale)}
                    </span>
                    <span className="text-xs font-semibold text-brand bg-brand-50 px-2.5 py-1 rounded-full group-hover:bg-brand group-hover:text-white transition-colors">
                      {t('viewAll').split(' ')[0]}
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {/* Mobile "view all" button */}
        <div className="mt-8 text-center sm:hidden">
          <Link
            href={`/${locale}/shop`}
            className="inline-flex items-center gap-2 bg-brand text-white font-semibold px-7 py-3 rounded-full hover:bg-brand-600 transition-all no-underline text-sm shadow-sm"
          >
            {t('viewAll')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
