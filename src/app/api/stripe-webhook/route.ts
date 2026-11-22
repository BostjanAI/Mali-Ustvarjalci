import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { sendOrderConfirmation } from '@/lib/email';
import { forwardOrderToSupplier } from '@/lib/supplierForward';
import { recordPaidOrder } from '@/lib/paidOrder';
import { rateLimit } from '@/lib/rateLimit';
export async function POST(req: Request) {
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true')
    return new NextResponse('Disabled in demo mode', { status: 409 });
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET)
    return new NextResponse('Webhook not configured', { status: 503 });
  if (
    !rateLimit(
      'stripe-webhook:' + (req.headers.get('x-forwarded-for') || 'unknown'),
      60,
      60000,
    )
  )
    return new NextResponse('Too many requests', { status: 429 });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
  });
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      await req.text(),
      req.headers.get('stripe-signature') || '',
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return new NextResponse('Invalid webhook signature', { status: 400 });
  }
  if (
    event.type !== 'checkout.session.completed' &&
    event.type !== 'checkout.session.async_payment_succeeded'
  )
    return NextResponse.json({ received: true });
  try {
    // Retrieve using the pinned API version: shipping_details is the delivery address, not billing.
    const session = await stripe.checkout.sessions.retrieve(
      (event.data.object as Stripe.Checkout.Session).id,
    );
    const saved = await recordPaidOrder(session);
    if (!saved) return NextResponse.json({ received: true });
    if (saved.created)
      await sendOrderConfirmation(saved.order.email, saved.order.id).catch(
        () => {},
      );
    const forwarded = await forwardOrderToSupplier(saved.order.id);
    if (forwarded.retryable)
      return new NextResponse('Order saved; supplier delivery pending', {
        status: 503,
      });
    return NextResponse.json({ received: true });
  } catch {
    console.error(
      'Paid checkout processing failed; inspect orders and Stripe event delivery.',
    );
    return new NextResponse('Order processing pending', { status: 500 });
  }
}
