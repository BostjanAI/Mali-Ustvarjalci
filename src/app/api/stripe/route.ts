import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rateLimit';
import { checkoutSchema } from '@/lib/schemas/checkout';
import { businessReady } from '@/lib/business';
import { reserveCheckout, releaseReservation } from '@/lib/stockReservations';
import { sessionShippingAddress, supplierPayload } from '@/lib/orderDelivery';
import { callIkonka, SupplierApiError } from '@/lib/ikonka';
const schema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(20),
  locale: z.enum(['sl', 'en']).default('sl'),
  email: z.string().email(),
  shipping: checkoutSchema,
});

export async function POST(req: NextRequest) {
  if (
    !rateLimit(
      'stripe:' + (req.headers.get('x-forwarded-for') || 'unknown'),
      10,
      60000,
    )
  )
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true')
    return NextResponse.json(
      { error: 'Purchasing disabled in demo mode' },
      { status: 409 },
    );
  if (
    !businessReady() ||
    !process.env.STRIPE_SECRET_KEY ||
    !process.env.NEXTAUTH_URL
  )
    return NextResponse.json({ error: 'Store not ready' }, { status: 503 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Invalid checkout data' },
      { status: 400 },
    );
  const { items, locale, email, shipping } = parsed.data;
  let reserved: Awaited<ReturnType<typeof reserveCheckout>>;
  try {
    reserved = await reserveCheckout(items, shipping.country);
  } catch {
    return NextResponse.json(
      { error: 'Stock or delivery is unavailable. Review the cart.' },
      { status: 409 },
    );
  }
  const { reservation, cart, quote, suppliers } = reserved;
  const metadata = {
    checkout_version: '3',
    reservation_id: reservation.id,
    firstName: shipping.firstName,
    lastName: shipping.lastName,
    street: shipping.street + ' ' + shipping.streetNumber1,
    streetName: shipping.street,
    streetNumber1: shipping.streetNumber1,
    addressLine2: shipping.addressLine2 || '',
    city: shipping.city,
    postalCode: shipping.postalCode,
    country: shipping.country,
    phone: shipping.phone,
    email,
  };
  const address = sessionShippingAddress({ metadata });
  if (!address) {
    await releaseReservation(reservation.id, 'creation-rejected');
    return NextResponse.json(
      { error: 'Invalid delivery address' },
      { status: 400 },
    );
  }
  try {
    for (const supplier of suppliers) {
      if (supplier.orderAdapter !== 'ikonka') continue;
      const group = cart.filter((i) => i.supplierId === supplier.id);
      await callIkonka(
        supplier,
        {
          ...supplierPayload(reservation.id, email, address, group),
          shippingService: quote.bySupplier[supplier.id],
        },
        reservation.id,
        true,
      );
    }
  } catch {
    await releaseReservation(reservation.id, 'creation-rejected');
    return NextResponse.json(
      {
        error:
          'Supplier could not confirm this order or delivery. No payment was created.',
      },
      { status: 409 },
    );
  }
  const origin = new URL(process.env.NEXTAUTH_URL).origin;
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: email,
    expires_at: Math.floor(reservation.expiresAt.getTime() / 1000),
    line_items: cart.map((i) => ({
      quantity: i.quantity,
      price_data: {
        currency: 'eur',
        unit_amount: i.priceCents,
        product_data: { name: i.title },
      },
    })),
    success_url:
      origin + '/' + locale + '/thank-you?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: origin + '/' + locale + '/checkout',
    phone_number_collection: { enabled: true },
    metadata,
    shipping_options: [
      {
        shipping_rate_data: {
          display_name:
            locale === 'en'
              ? 'Confirmed supplier delivery'
              : 'Potrjena dostava dobavitelja',
          type: 'fixed_amount',
          fixed_amount: { currency: 'eur', amount: quote.totalCents },
        },
      },
    ],
  };
  await prisma.checkoutReservation.update({
    where: { id: reservation.id },
    data: { stripeRequestJson: JSON.stringify(params) },
  });
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    });
    const session = await stripe.checkout.sessions.create(params, {
      idempotencyKey: reservation.id,
    });
    await prisma.checkoutReservation.update({
      where: { id: reservation.id },
      data: { status: 'open', stripeSessionId: session.id },
    });
    return NextResponse.json({ id: session.id, url: session.url });
  } catch {
    await prisma.operationsAlert.upsert({
      where: { key: 'reservation:' + reservation.id },
      create: {
        key: 'reservation:' + reservation.id,
        code: 'checkout-creation-unconfirmed',
      },
      update: { acknowledgedAt: null },
    });
    return NextResponse.json(
      { error: 'Payment creation is pending review. Stock remains reserved.' },
      { status: 503 },
    );
  }
}
