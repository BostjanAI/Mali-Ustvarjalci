'use client';
import { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/lib/cartStore';
import { useToast } from '@/components/ui/Toast';
import { canAddToCart, type CatalogProduct } from '@/lib/catalog';
export default function AddToCartButton({
  product,
  locale = 'sl',
}: {
  product: Pick<
    CatalogProduct,
    'id' | 'slug' | 'title' | 'priceCents' | 'availability' | 'stockQuantity'
  > & { image?: string };
  locale?: string;
}) {
  const en = locale === 'en';
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((s) => s.addItem);
  const { addToast } = useToast();
  const available = canAddToCart(product);
  const max = Math.max(1, Math.min(99, product.stockQuantity ?? 99));
  return (
    <div className="detail-buy">
      <label>
        <span className="sr-only">{en ? 'Quantity' : 'Količina'}</span>
        <input
          className="quantity-input"
          style={{ height: '100%' }}
          type="number"
          min="1"
          max={max}
          disabled={!available}
          value={quantity}
          onChange={(e) =>
            setQuantity(Math.min(max, Math.max(1, Number(e.target.value) || 1)))
          }
        />
      </label>
      <button
        className="primary-btn"
        style={{ flex: 1 }}
        disabled={!available}
        onClick={() => {
          if (!available) return;
          addItem(product, Math.floor(quantity));
          addToast(
            en ? 'Added to your cart.' : 'Izdelek je v košarici.',
            'success',
          );
        }}
      >
        <ShoppingBag size={19} />
        {en ? 'Add to cart' : 'Dodaj v košarico'}
      </button>
    </div>
  );
}
