"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useCartStore } from '@/lib/cartStore';
import { formatCurrencyCents } from '@/lib/i18n';

export default function ShopPage() {
  const addItem = useCartStore((s) => s.addItem);
  const params = useParams<{ locale: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations();
  const locale = params?.locale || 'sl';
  const intlLocale = locale === 'en' ? 'en-US' : 'sl-SI';
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Array<{ id: string; slug: string; title: string; priceCents: number; images: string[] }>>([]);
  const [total, setTotal] = useState(0);
  const page = parseInt(searchParams?.get('page') || '1', 10);
  const sort = searchParams?.get('sort') || 'newest';
  const q = searchParams?.get('q') || '';

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?${new URLSearchParams({ page: String(page), sort, q })}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        setItems(data.items);
        setTotal(data.total);
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [page, sort, q]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / 12)), [total]);
  const jsonLd = items.map((p) => ({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.title,
    sku: p.id,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'EUR',
      price: (p.priceCents / 100).toFixed(2),
      availability: 'https://schema.org/InStock',
    },
  }));

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-semibold mb-6">{t('shop.title')}</h1>
      <div className="flex items-center gap-3 mb-4">
        <input
          className="border rounded px-3 py-2 text-sm"
          placeholder={t('shop.search')}
          defaultValue={q}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const next = new URLSearchParams(searchParams?.toString() || '');
              next.set('q', (e.target as HTMLInputElement).value);
              next.set('page', '1');
              router.push(`/${locale}/shop?${next.toString()}`);
            }
          }}
        />
        <select
          className="border rounded px-2 py-2 text-sm"
          value={sort}
          onChange={(e) => {
            const next = new URLSearchParams(searchParams?.toString() || '');
            next.set('sort', e.target.value);
            router.push(`/${locale}/shop?${next.toString()}`);
          }}
        >
          <option value="newest">{t('shop.sortNewest')}</option>
          <option value="price_asc">{t('shop.sortPriceAsc')}</option>
          <option value="price_desc">{t('shop.sortPriceDesc')}</option>
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((p) => (
          <div key={p.id} className="border rounded p-3 hover:shadow flex flex-col">
            <Link href={`/${locale}/shop/${p.slug}`} className="block">
              <div className="aspect-square bg-gray-100 overflow-hidden rounded relative">
                {Array.isArray(p.images) && p.images.length > 0 ? (
                  <Image 
                    src={p.images[0]} 
                    alt={p.title} 
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                ) : (
                  <div className="w-full h-full" />
                )}
              </div>
              <div className="mt-2 font-medium">{p.title}</div>
              <div className="text-sm text-gray-600">{formatCurrencyCents(p.priceCents, intlLocale)} ({t('shop.withVat')})</div>
            </Link>
            <button
              className="mt-3 rounded bg-black text-white py-2 text-sm"
              onClick={() => addItem({ id: p.id, slug: p.slug, title: p.title, priceCents: p.priceCents })}
            >
              {t('shop.addToCart')}
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-3 mt-6">
        <button
          className="px-3 py-1 border rounded disabled:opacity-50"
          disabled={page <= 1 || loading}
          onClick={() => {
            const next = new URLSearchParams(searchParams?.toString() || '');
            next.set('page', String(page - 1));
            router.push(`/${locale}/shop?${next.toString()}`);
          }}
        >
          {t('shop.prev')}
        </button>
        <div className="text-sm">
          {t('shop.page')} {page} / {totalPages}
        </div>
        <button
          className="px-3 py-1 border rounded disabled:opacity-50"
          disabled={page >= totalPages || loading}
          onClick={() => {
            const next = new URLSearchParams(searchParams?.toString() || '');
            next.set('page', String(page + 1));
            router.push(`/${locale}/shop?${next.toString()}`);
          }}
        >
          {t('shop.next')}
        </button>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </main>
  );
}


