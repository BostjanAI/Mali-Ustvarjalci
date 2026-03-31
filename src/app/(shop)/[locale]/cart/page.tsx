"use client";

import { useCartStore } from '@/lib/cartStore';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { formatCurrencyCents } from '@/lib/i18n';
import { computeVatBreakdown } from '@/lib/vat';

export default function CartPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale || 'sl';
  const intlLocale = locale === 'en' ? 'en-US' : 'sl-SI';
  const t = useTranslations();
  const { items, totalCents, removeItem, updateQty, clear } = useCartStore();
  const total = formatCurrencyCents(totalCents(), intlLocale);

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">{t('cart.title')}</h1>
      {items.length === 0 ? (
        <p>{t('cart.empty')}</p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-4 border-b pb-3">
              <div className="flex-1">
                <div className="font-medium">{item.title}</div>
                <div className="text-sm text-gray-500">{formatCurrencyCents(item.priceCents, intlLocale)}</div>
              </div>
              <input
                type="number"
                min={1}
                className="w-20 rounded border px-2 py-1"
                value={item.quantity}
                onChange={(e) => updateQty(item.id, Math.max(1, Number(e.target.value)))}
              />
              <button className="text-red-600" onClick={() => removeItem(item.id)}>
                {t('cart.remove')}
              </button>
            </div>
          ))}
          <div className="flex items-center justify-between pt-4">
            <button className="text-sm text-gray-600" onClick={() => clear()}>
              {t('cart.clear')}
            </button>
            <div className="text-right">
              <div className="text-xl font-semibold">{t('cart.total')}: {total}</div>
              {(() => {
                const b = computeVatBreakdown(totalCents());
                return (
                  <div className="text-xs text-gray-600">{formatCurrencyCents(b.netCents, intlLocale)} + {formatCurrencyCents(b.vatCents, intlLocale)} {t('cart.vat')} (22%)</div>
                );
              })()}
            </div>
          </div>
          {/* Native <a> avoids client transition OOM/hang when dev compile of /checkout is heavy */}
          <a
            href={`/${locale}/checkout`}
            className="mt-6 block w-full rounded-lg bg-black px-4 py-3 text-center text-sm font-medium text-white no-underline transition-colors hover:bg-gray-800"
          >
            {t('cart.goToCheckout')}
          </a>
        </div>
      )}
    </div>
  );
}





