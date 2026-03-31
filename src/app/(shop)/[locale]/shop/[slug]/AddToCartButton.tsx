"use client";

import { useTranslations } from 'next-intl';
import { useCartStore } from '@/lib/cartStore';

export default function AddToCartButton({ product }: { product: { id: string; slug: string; title: string; priceCents: number } }) {
  const t = useTranslations();
  const addItem = useCartStore((s) => s.addItem);
  return (
    <button className="mt-6 rounded bg-black text-white py-2 px-4" onClick={() => addItem(product)}>
      {t('shop.addToCart')}
    </button>
  );
}


