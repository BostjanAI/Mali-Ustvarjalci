import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';
import { rateLimit } from '@/lib/rateLimit';



type Item = { id: string; slug?: string; title: string; priceCents: number; quantity: number };

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  if (!rateLimit(`stripe:${ip}`, 10, 60_000)) {
    return new NextResponse('Too many requests', { status: 429 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return new NextResponse('Stripe not configured', { status: 400 });
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

  const BodySchema = z.object({
    items: z
      .array(
        z.object({
          id: z.string(),
          slug: z.string().optional(),
          title: z.string().min(1),
          priceCents: z.number().int().positive(),
          quantity: z.number().int().positive(),
        })
      )
      .min(1),
    successUrl: z.string().url(),
    cancelUrl: z.string().url(),
    email: z.string().email().optional(),
    shipping: z.object({
      firstName: z.string(),
      lastName: z.string(),
      street: z.string(),
      city: z.string(),
      postalCode: z.string(),
      country: z.string(),
      phone: z.string(),
    }).optional(),
  });
  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const { items, successUrl, cancelUrl, email, shipping } = parsed.data;

  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = (items || []).map((i) => ({
    quantity: i.quantity,
    price_data: {
      currency: 'eur',
      unit_amount: i.priceCents,
      product_data: { name: i.title },
    },
  }));

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    currency: 'eur',
    customer_email: email,
    line_items,
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    automatic_tax: { enabled: false },
    metadata: {
      cart: JSON.stringify(
        (items || []).map((i) => ({ id: i.id, slug: i.slug, title: i.title, priceCents: i.priceCents, quantity: i.quantity }))
      ),
    },
  };

  if (shipping) {
    sessionParams.metadata = {
      ...sessionParams.metadata,
      firstName: shipping.firstName,
      lastName: shipping.lastName,
      street: shipping.street,
      city: shipping.city,
      postalCode: shipping.postalCode,
      country: shipping.country,
      phone: shipping.phone,
      email: email || '',
    };

    sessionParams.shipping_options = [
      {
        shipping_rate_data: {
          display_name: 'Standard (3-5 days)',
          type: 'fixed_amount',
          fixed_amount: { currency: 'eur', amount: 499 },
        },
      },
      {
        shipping_rate_data: {
          display_name: 'Express (1-2 days)',
          type: 'fixed_amount',
          fixed_amount: { currency: 'eur', amount: 999 },
        },
      },
    ];
  } else {
    sessionParams.shipping_address_collection = { allowed_countries: ['SI', 'AT', 'DE', 'HR', 'IT'] };
    sessionParams.shipping_options = [
      { shipping_rate_data: { display_name: 'Standard (3-5 days)', type: 'fixed_amount', fixed_amount: { currency: 'eur', amount: 499 } } },
      { shipping_rate_data: { display_name: 'Express (1-2 days)', type: 'fixed_amount', fixed_amount: { currency: 'eur', amount: 999 } } },
    ];
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  return NextResponse.json({ id: session.id, url: session.url });
}



