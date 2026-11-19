import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { sendOrderConfirmation } from '@/lib/email';
import { forwardOrderToSupplier } from '@/lib/supplierForward';
import { rateLimit } from '@/lib/rateLimit';
import { readCartMetadata } from '@/lib/checkoutPricing';

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' });
  const ip = headers().get('x-forwarded-for') || 'unknown';
  if (!rateLimit(`stripe-webhook:${ip}`, 60, 60_000)) {
    return new NextResponse('Too many requests', { status: 429 });
  }
  const signature = headers().get('stripe-signature') as string;
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET || '');
  } catch (err: any) {
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = session.customer_details?.email || 'guest@example.com';
    const amountTotal = session.amount_total || 0;

    let cart: Array<{ id?: string; slug?: string; title: string; priceCents: number; quantity: number }> = [];
    try {
      cart = readCartMetadata(session.metadata);
    } catch {}

    const order = await prisma.order.create({
      data: {
        email,
        totalCents: amountTotal,
        stripePaymentIntentId: session.payment_intent?.toString() || null,
        items: {
          create: await Promise.all(
            (cart || []).map(async (ci) => {
              const product = ci.slug
                ? await prisma.product.findUnique({ where: { slug: ci.slug } })
                : ci.id
                ? await prisma.product.findFirst({ where: { OR: [{ id: ci.id }, { supplierProductId: ci.id }] } })
                : null;
              const productId = product?.id ?? 'unknown';
              return {
                productId,
                title: ci.title,
                unitPriceCents: ci.priceCents,
                quantity: ci.quantity,
                sku: product ? undefined : ci.id,
              };
            })
          ),
        },
      },
      include: {
        items: true,
      },
    });
    // Decrement inventory for ordered items
    for (const item of order.items) {
      if (!item.productId || item.productId === 'unknown') continue;
      await prisma.inventory.updateMany({
        where: { productId: item.productId },
        data: { quantity: { decrement: item.quantity } },
      });
    }
    // Send order confirmation email (best-effort)
    if (order.email) {
      sendOrderConfirmation(order.email, order.id).catch(() => {});
    }
    // Forward to supplier
    forwardOrderToSupplier(order.id).catch((e) => console.error('Supplier forward failed', e));
  }

  return NextResponse.json({ received: true });
}

 


