'use client';
import { vatLabel } from '@/lib/business';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ShoppingBag, Trash2, Info } from 'lucide-react';
import { useCartStore } from '@/lib/cartStore';
import { formatCurrencyCents } from '@/lib/i18n';
import ProductImage from '@/components/ProductImage';
export default function CartPage() {
  const locale = useParams<{ locale: string }>()?.locale || 'sl';
  const en = locale === 'en';
  const { items, totalCents, removeItem, updateQty } = useCartStore();
  const money = (c: number) => formatCurrencyCents(c, en ? 'en-IE' : 'sl-SI');
  return (
    <div className="site-wrap cart-page">
      <div className="breadcrumb">
        <Link href={'/' + locale}>{en ? 'Home' : 'Domov'}</Link>
        <span>/</span>
        <span>{en ? 'Your cart' : 'Tvoja košarica'}</span>
      </div>
      <h1
        className="display-title"
        style={{ fontSize: 'clamp(38px,5vw,55px)', margin: '15px 0 35px' }}
      >
        {en ? 'A basket of little discoveries' : 'Košarica malih odkritij'}
      </h1>
      {items.length === 0 ? (
        <div className="empty-state">
          <ShoppingBag size={40} style={{ margin: 'auto' }} />
          <h2>
            {en
              ? 'Your next discovery is waiting'
              : 'Tvoje naslednje odkritje še čaka'}
          </h2>
          <p>
            {en
              ? 'Your cart is empty. Find something that sparks their curiosity.'
              : 'Košarica je še prazna. Poišči nekaj, kar prebudi radovednost.'}
          </p>
          <Link href={'/' + locale + '/shop'} className="primary-btn">
            {en ? 'Explore the collection' : 'Razišči naš mali svet'}
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div>
            {items.map((item) => (
              <article key={item.id} className="cart-row">
                <Link
                  href={'/' + locale + '/shop/' + item.slug}
                  className="cart-image"
                >
                  <ProductImage
                    src={item.image}
                    title={item.title}
                    sizes="100px"
                  />
                </Link>
                <div className="cart-item-info">
                  <Link href={'/' + locale + '/shop/' + item.slug}>
                    <h2>{item.title}</h2>
                  </Link>
                  <p>{money(item.priceCents)}</p>
                </div>
                <label>
                  <span className="sr-only">
                    {(en ? 'Quantity: ' : 'Količina: ') + item.title}
                  </span>
                  <input
                    className="quantity-input"
                    style={{ height: 42, width: 60 }}
                    type="number"
                    min="1"
                    max="99"
                    value={item.quantity}
                    onChange={(e) => updateQty(item.id, Number(e.target.value))}
                  />
                </label>
                <strong>{money(item.priceCents * item.quantity)}</strong>
                <button
                  className="remove-item"
                  aria-label={(en ? 'Remove: ' : 'Odstrani: ') + item.title}
                  onClick={() => removeItem(item.id)}
                >
                  <Trash2 size={18} />
                </button>
              </article>
            ))}
            <Link
              href={'/' + locale + '/shop'}
              className="text-link"
              style={{ display: 'inline-block', marginTop: 25 }}
            >
              {en ? 'Keep exploring' : 'Nadaljuj z raziskovanjem'}
            </Link>
          </div>
          <aside className="order-summary">
            <h2>{en ? 'Your little collection' : 'Tvoj mali izbor'}</h2>
            <div className="summary-line">
              <span>{en ? 'Products' : 'Izdelki'}</span>
              <strong>{money(totalCents())}</strong>
            </div>
            <div className="summary-line">
              <span>{en ? 'Shipping' : 'Dostava'}</span>
              <span>{en ? 'At checkout' : 'Ob zaključku'}</span>
            </div>
            <div className="summary-total">
              <span>{en ? 'Subtotal' : 'Vmesni seštevek'}</span>
              <strong>{money(totalCents())}</strong>
            </div>
            <p className="detail-subtitle">
              {vatLabel(locale)}.{' '}
              {en
                ? 'Final prices are verified at checkout.'
                : 'Končne cene se preverijo ob plačilu.'}
            </p>
            <Link
              href={'/' + locale + '/checkout'}
              className="primary-btn"
              style={{ width: '100%' }}
            >
              {en ? 'Continue to checkout' : 'Na zaključek nakupa'}
            </Link>
            {process.env.NEXT_PUBLIC_MOCK_MODE === 'true' && (
              <p className="demo-note">
                <Info size={16} />
                {en
                  ? 'Demo mode. Purchasing is disabled.'
                  : 'Predstavitveni način. Nakup ni omogočen.'}
              </p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
