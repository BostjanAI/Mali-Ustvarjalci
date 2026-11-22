import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rateLimit';
import { checkoutSchema } from '@/lib/schemas/checkout';
import { priceCart, cartMetadata } from '@/lib/checkoutPricing';
import { businessReady } from '@/lib/business';
import { publishedProducts } from '@/lib/catalogProduct';
import { deliveryCountries } from '@/lib/orderDelivery';
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
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  if (!rateLimit('stripe:' + ip, 10, 60_000))
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true')
    return NextResponse.json(
      { error: 'Purchasing is disabled in demo mode' },
      { status: 409 },
    );
  if (!businessReady())
    return NextResponse.json(
      { error: 'The store is not ready to accept purchases' },
      { status: 503 },
    );
  if (!process.env.STRIPE_SECRET_KEY || !process.env.NEXTAUTH_URL)
    return NextResponse.json(
      { error: 'Payment not configured' },
      { status: 503 },
    );
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Invalid checkout data' },
      { status: 400 },
    );
  const { items, locale, email, shipping } = parsed.data;
  try {
    const products = await prisma.product.findMany({
      where: { id: { in: items.map((i) => i.id) }, ...publishedProducts },
      select: {
        id: true,
        slug: true,
        title: true,
        priceCents: true,
        currency: true,
        supplierId: true,
        supplierProductId: true,
        inventory: { select: { quantity: true, syncedAt: true } },
      },
    });
    let cart;
    try {
      cart = priceCart(items, products);
    } catch {
      return NextResponse.json(
        {
          error:
            'One or more products are unavailable. Please review your cart.',
        },
        { status: 409 },
      );
    }
    const origin = new URL(process.env.NEXTAUTH_URL).origin;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    });
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
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
      allow_promotion_codes: true,
      phone_number_collection: { enabled: true },
      metadata: {
        checkout_version: '2',
        ...cartMetadata(cart),
        firstName: shipping.firstName,
        lastName: shipping.lastName,
        street: shipping.street,
        city: shipping.city,
        postalCode: shipping.postalCode,
        country: shipping.country,
        phone: shipping.phone,
        email,
      },
      shipping_address_collection: {
        allowed_countries: [...deliveryCountries],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            display_name:
              locale === 'en' ? 'Standard delivery' : 'Standardna dostava',
            type: 'fixed_amount',
            fixed_amount: { currency: 'eur', amount: 499 },
          },
        },
        {
          shipping_rate_data: {
            display_name:
              locale === 'en' ? 'Express delivery' : 'Hitra dostava',
            type: 'fixed_amount',
            fixed_amount: { currency: 'eur', amount: 999 },
          },
        },
      ],
    });
    return NextResponse.json({ id: session.id, url: session.url });
  } catch {
    return NextResponse.json(
      {
        error:
          'Payment is temporarily unavailable. No order has been confirmed.',
      },
      { status: 503 },
    );
  }
}
