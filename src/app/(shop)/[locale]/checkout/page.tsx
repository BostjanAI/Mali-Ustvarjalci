'use client';
import { vatLabel } from '@/lib/business';
import Link from 'next/link';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Info, LockKeyhole } from 'lucide-react';
import { useCartStore } from '@/lib/cartStore';
import { formatCurrencyCents } from '@/lib/i18n';
import { checkoutSchema, CheckoutFormData } from '@/lib/schemas/checkout';
export default function CheckoutPage() {
  const locale = useParams<{ locale: string }>()?.locale || 'sl';
  const en = locale === 'en';
  const demo = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
  const { items, totalCents } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { country: 'SI' },
  });
  const money = (n: number) => formatCurrencyCents(n, en ? 'en-IE' : 'sl-SI');
  async function submit(data: CheckoutFormData) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale,
          email: data.email,
          items: items.map((i) => ({ id: i.id, quantity: i.quantity })),
          shipping: data,
        }),
      });
      if (!res.ok) throw new Error('Payment unavailable');
      const result = await res.json();
      if (!result.url) throw new Error('Missing checkout URL');
      window.location.assign(result.url);
    } catch {
      setError(
        en
          ? 'Payment could not be started. Your cart has been saved. Please try again later.'
          : 'Plačila ni bilo mogoče začeti. Košarica je shranjena. Poskusi znova pozneje.',
      );
      setLoading(false);
    }
  }
  const fields: Array<{
    name: keyof CheckoutFormData;
    sl: string;
    en: string;
    auto: string;
    type?: string;
    wide?: boolean;
  }> = [
    { name: 'firstName', sl: 'Ime', en: 'First name', auto: 'given-name' },
    { name: 'lastName', sl: 'Priimek', en: 'Last name', auto: 'family-name' },
    {
      name: 'email',
      sl: 'E-pošta',
      en: 'Email',
      auto: 'email',
      type: 'email',
      wide: true,
    },
    {
      name: 'street',
      sl: 'Ulica in hišna številka',
      en: 'Street address',
      auto: 'street-address',
      wide: true,
    },
    {
      name: 'postalCode',
      sl: 'Poštna številka',
      en: 'Postal code',
      auto: 'postal-code',
    },
    { name: 'city', sl: 'Kraj', en: 'City', auto: 'address-level2' },
    {
      name: 'phone',
      sl: 'Telefon',
      en: 'Phone',
      auto: 'tel',
      type: 'tel',
      wide: true,
    },
  ];
  return (
    <div className="site-wrap" style={{ paddingBottom: 65 }}>
      <nav className="breadcrumb">
        <Link href={'/' + locale + '/cart'}>
          {en ? 'Your cart' : 'Tvoja košarica'}
        </Link>
        <span>/</span>
        <span>{en ? 'Checkout' : 'Zaključek nakupa'}</span>
      </nav>
      <h1
        className="display-title"
        style={{ fontSize: 'clamp(38px,5vw,55px)', margin: '15px 0 35px' }}
      >
        {en
          ? 'Almost ready for a new adventure'
          : 'Še malo do nove dogodivščine'}
      </h1>
      {!items.length ? (
        <div className="empty-state">
          <p>{en ? 'Your cart is empty.' : 'Tvoja košarica je še prazna.'}</p>
          <Link href={'/' + locale + '/shop'} className="primary-btn">
            {en ? 'Explore the collection' : 'Razišči izdelke'}
          </Link>
        </div>
      ) : (
        <div className="checkout-layout">
          {demo ? (
            <section className="empty-state">
              <Info size={35} style={{ margin: 'auto' }} />
              <h2>
                {en
                  ? 'You are exploring a demo'
                  : 'Raziskuješ predstavitveno trgovino'}
              </h2>
              <p>
                {en
                  ? 'The cart and collection are ready to explore. Purchasing is disabled in demo mode, and no order will be placed.'
                  : 'Košarico in katalog lahko preizkusiš. Nakup v predstavitvenem načinu ni omogočen in naročilo ne bo oddano.'}
              </p>
              <Link href={'/' + locale + '/shop'} className="primary-btn">
                {en ? 'Keep exploring' : 'Nadaljuj z raziskovanjem'}
              </Link>
            </section>
          ) : (
            <form onSubmit={handleSubmit(submit)} noValidate>
              <h2 className="checkout-title">
                {en
                  ? 'Where should we send it?'
                  : 'Kam pošljemo tvoj mali izbor?'}
              </h2>
              <div className="checkout-fields">
                {fields.map((f) => (
                  <div className={f.wide ? 'wide-field' : ''} key={f.name}>
                    <label
                      htmlFor={'checkout-' + f.name}
                      className="field-label"
                    >
                      {en ? f.en : f.sl}
                    </label>
                    <input
                      id={'checkout-' + f.name}
                      autoComplete={f.auto}
                      type={f.type || 'text'}
                      {...register(f.name)}
                      aria-invalid={Boolean(errors[f.name])}
                      aria-describedby={
                        errors[f.name] ? 'error-' + f.name : undefined
                      }
                    />
                    {errors[f.name] && (
                      <p id={'error-' + f.name} className="field-error">
                        {en
                          ? 'Please check this field.'
                          : 'Preveri vnos v tem polju.'}
                      </p>
                    )}
                  </div>
                ))}
                <div className="wide-field">
                  <label htmlFor="checkout-country" className="field-label">
                    {en ? 'Country' : 'Država'}
                  </label>
                  <select
                    id="checkout-country"
                    className="styled-select"
                    autoComplete="country"
                    {...register('country')}
                  >
                    <option value="SI">{en ? 'Slovenia' : 'Slovenija'}</option>
                    <option value="AT">{en ? 'Austria' : 'Avstrija'}</option>
                    <option value="DE">{en ? 'Germany' : 'Nemčija'}</option>
                    <option value="HR">{en ? 'Croatia' : 'Hrvaška'}</option>
                    <option value="IT">{en ? 'Italy' : 'Italija'}</option>
                  </select>
                </div>
              </div>
              <p className="demo-note">
                {en
                  ? 'Final product prices and shipping are shown before you pay in Stripe Checkout.'
                  : 'Končne cene izdelkov in dostave bodo prikazane pred plačilom v Stripe Checkout.'}
              </p>
              {error && (
                <p
                  role="alert"
                  className="status-message"
                  style={{ marginTop: 20 }}
                >
                  {error}
                </p>
              )}
              <button
                type="submit"
                className="primary-btn"
                disabled={loading}
                style={{ width: '100%', marginTop: 22 }}
              >
                <LockKeyhole size={18} />
                {loading
                  ? en
                    ? 'Preparing checkout…'
                    : 'Pripravljamo plačilo …'
                  : en
                    ? 'Continue to secure payment'
                    : 'Nadaljuj na varno plačilo'}
              </button>
              <p className="demo-note">
                <Link
                  className="text-link"
                  href={'/' + locale + '/legal/terms'}
                >
                  {en ? 'Purchase terms' : 'Pogoji nakupa'}
                </Link>
              </p>
            </form>
          )}
          <aside className="order-summary">
            <h2>{en ? 'Your little collection' : 'Tvoj mali izbor'}</h2>
            {items.map((i) => (
              <div key={i.id} className="summary-line">
                <span>
                  {i.title} × {i.quantity}
                </span>
                <strong style={{ whiteSpace: 'nowrap' }}>
                  {money(i.priceCents * i.quantity)}
                </strong>
              </div>
            ))}
            <div className="summary-total">
              <span>{en ? 'Subtotal' : 'Vmesni seštevek'}</span>
              <strong>{money(totalCents())}</strong>
            </div>
            <p className="detail-subtitle">
              {vatLabel(locale)}.{' '}
              {en
                ? 'Shipping is added before payment.'
                : 'Dostava se doda pred plačilom.'}
            </p>
            <Link className="text-link" href={'/' + locale + '/cart'}>
              {en ? 'Edit cart' : 'Uredi košarico'}
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
