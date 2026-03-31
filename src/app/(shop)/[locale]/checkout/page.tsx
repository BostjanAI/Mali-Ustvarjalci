"use client";

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCartStore } from '@/lib/cartStore';
import { formatCurrencyCents } from '@/lib/i18n';
import { computeVatBreakdown } from '@/lib/vat';
import { checkoutSchema, type CheckoutFormData } from '@/lib/schemas/checkout';

export default function CheckoutPage() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale || 'sl';
  const intlLocale = locale === 'en' ? 'en-US' : 'sl-SI';
  const t = useTranslations();
  const { items, totalCents, clear } = useCartStore();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      street: '',
      city: '',
      postalCode: '',
      country: 'SI',
      phone: '',
    },
  });

  async function onSubmit(data: CheckoutFormData) {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          items: items.map((i) => ({ id: i.id, slug: i.slug, title: i.title, priceCents: i.priceCents, quantity: i.quantity })),
          successUrl: `${window.location.origin}/${locale}/thank-you`,
          cancelUrl: `${window.location.origin}/${locale}/checkout`,
          shipping: {
            firstName: data.firstName,
            lastName: data.lastName,
            street: data.street,
            city: data.city,
            postalCode: data.postalCode,
            country: data.country,
            phone: data.phone,
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
          return;
        }
      }
      const stub = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      });
      if (stub.ok) {
        clear();
        router.push(`/${locale}/thank-you`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">{t('checkout.title')}</h1>
      
      {items.length === 0 ? (
        <div className="rounded border p-4">{t('checkout.cartEmpty')}</div>
      ) : (
        <>
          <div className="rounded border p-4 space-y-3">
            <h2 className="font-semibold text-lg">Order Summary</h2>
            {items.map((i) => (
              <div key={i.id} className="flex justify-between text-sm">
                <div>
                  {i.title} × {i.quantity}
                </div>
                <div>{formatCurrencyCents(i.priceCents * i.quantity, intlLocale)}</div>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t font-semibold">
              <div>{t('cart.total')}</div>
              <div>{formatCurrencyCents(totalCents(), intlLocale)}</div>
            </div>
            {(() => {
              const b = computeVatBreakdown(totalCents());
              return (
                <div className="text-xs text-gray-600 text-right">
                  {formatCurrencyCents(b.netCents, intlLocale)} + {formatCurrencyCents(b.vatCents, intlLocale)} {t('cart.vat')} ({22}%)
                </div>
              );
            })()}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="rounded border p-4 space-y-4">
            <h2 className="font-semibold text-lg">Shipping Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  {...register('firstName')}
                  className="w-full rounded border px-3 py-2"
                  placeholder="John"
                />
                {errors.firstName && (
                  <p className="text-red-600 text-xs mt-1">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  {...register('lastName')}
                  className="w-full rounded border px-3 py-2"
                  placeholder="Doe"
                />
                {errors.lastName && (
                  <p className="text-red-600 text-xs mt-1">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {t('checkout.email')}
              </label>
              <input
                type="email"
                {...register('email')}
                className="w-full rounded border px-3 py-2"
                placeholder={t('checkout.emailPlaceholder')}
              />
              {errors.email && (
                <p className="text-red-600 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Street Address
              </label>
              <input
                type="text"
                {...register('street')}
                className="w-full rounded border px-3 py-2"
                placeholder="123 Main St"
              />
              {errors.street && (
                <p className="text-red-600 text-xs mt-1">{errors.street.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  City
                </label>
                <input
                  type="text"
                  {...register('city')}
                  className="w-full rounded border px-3 py-2"
                  placeholder="Ljubljana"
                />
                {errors.city && (
                  <p className="text-red-600 text-xs mt-1">{errors.city.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Postal Code
                </label>
                <input
                  type="text"
                  {...register('postalCode')}
                  className="w-full rounded border px-3 py-2"
                  placeholder="1000"
                />
                {errors.postalCode && (
                  <p className="text-red-600 text-xs mt-1">{errors.postalCode.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Country
                </label>
                <select
                  {...register('country')}
                  className="w-full rounded border px-3 py-2"
                >
                  <option value="SI">Slovenia</option>
                  <option value="AT">Austria</option>
                  <option value="DE">Germany</option>
                  <option value="HR">Croatia</option>
                  <option value="IT">Italy</option>
                </select>
                {errors.country && (
                  <p className="text-red-600 text-xs mt-1">{errors.country.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                {...register('phone')}
                className="w-full rounded border px-3 py-2"
                placeholder="+386 40 123 456"
              />
              {errors.phone && (
                <p className="text-red-600 text-xs mt-1">{errors.phone.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-black text-white py-3 px-4 disabled:opacity-50 font-medium"
            >
              {loading ? t('checkout.processing') : t('checkout.pay')}
            </button>
          </form>
        </>
      )}
    </main>
  );
}
