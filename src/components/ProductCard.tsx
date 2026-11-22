'use client';
import Link from 'next/link';
import { Plus, Check, Eye } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useCartStore } from '@/lib/cartStore';
import { useToast } from '@/components/ui/Toast';
import { CatalogProduct, categoryLabel, canAddToCart } from '@/lib/catalog';
import { formatCurrencyCents } from '@/lib/i18n';
import ProductImage from './ProductImage';
import QuickView from './QuickView';
import StockStatus from './StockStatus';
import { vatLabel } from '@/lib/business';
export default function ProductCard({
  product,
  locale,
}: {
  product: CatalogProduct;
  locale: string;
}) {
  const en = locale === 'en';
  const [added, setAdded] = useState(false);
  const [preview, setPreview] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>();
  const addItem = useCartStore((s) => s.addItem);
  const { addToast } = useToast();
  useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current);
    },
    [],
  );
  function add() {
    if (!canAddToCart(product)) return;
    addItem({
      id: product.id,
      slug: product.slug,
      title: product.title,
      priceCents: product.priceCents,
      image: product.images[0],
    });
    setAdded(true);
    addToast(en ? 'Added to your cart.' : 'Izdelek je v košarici.', 'success');
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setAdded(false), 1800);
  }
  return (
    <article className="product-card">
      <div className="product-media">
        <Link
          className="product-image"
          href={'/' + locale + '/shop/' + product.slug}
          aria-label={product.title}
        >
          <ProductImage src={product.images[0]} title={product.title} />
        </Link>
        <button
          type="button"
          className="quick-open"
          onClick={() => setPreview(true)}
          aria-label={(en ? 'Quick view: ' : 'Hitri ogled: ') + product.title}
        >
          <Eye size={17} />
          <span>{en ? 'Quick view' : 'Hitri ogled'}</span>
        </button>
      </div>
      <div className="product-info">
        <StockStatus product={product} locale={locale} />
        <p className="product-category">
          {categoryLabel(product.categoryPath, locale)}
        </p>
        <Link
          href={'/' + locale + '/shop/' + product.slug}
          className="product-name"
        >
          <h3>{product.title}</h3>
        </Link>
        {product.description && (
          <p className="product-desc">{product.description}</p>
        )}
        <div className="product-bottom">
          <div className="product-price">
            {formatCurrencyCents(product.priceCents, en ? 'en-IE' : 'sl-SI')}
            <small>
              {product.availability === 'demo'
                ? en
                  ? 'Example price'
                  : 'Prikaz cene'
                : vatLabel(locale)}
            </small>
          </div>
          <button
            type="button"
            className="add-button"
            disabled={!canAddToCart(product)}
            onClick={add}
            aria-label={
              (en ? 'Add to cart: ' : 'Dodaj v košarico: ') + product.title
            }
          >
            {added ? <Check size={18} /> : <Plus size={18} />}
            <span className="add-label">
              {added ? (en ? 'Added' : 'Dodano') : en ? 'Add' : 'Dodaj'}
            </span>
            <span className="sr-only" role="status">
              {added ? (en ? 'Added' : 'Dodano') : ''}
            </span>
          </button>
        </div>
      </div>
      {preview && (
        <QuickView
          product={product}
          locale={locale}
          onClose={() => setPreview(false)}
          onAdd={add}
        />
      )}
    </article>
  );
}
