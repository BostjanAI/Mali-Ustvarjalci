import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { sendOrderConfirmation } from '@/lib/email';
import { prisma } from '@/lib/prisma';
import { releaseReservation } from '@/lib/stockReservations';
import { applyRefundResult } from '@/lib/refunds';
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
    ['refund.created', 'refund.updated', 'refund.failed'].includes(event.type)
  ) {
    try {
      const object = event.data.object as Stripe.Refund;
      const latest = await stripe.refunds.retrieve(object.id);
      const operation = await prisma.refundOperation.findFirst({
        where: {
          OR: [
            { stripeRefundId: latest.id },
            ...(latest.metadata?.refundOperationId
              ? [{ id: latest.metadata.refundOperationId }]
              : []),
          ],
        },
      });
      if (operation) await applyRefundResult(operation.id, latest);
      return NextResponse.json({ received: true });
    } catch {
      return new NextResponse('Refund reconciliation pending', { status: 500 });
    }
  }
  if (
    [
      'checkout.session.expired',
      'checkout.session.async_payment_failed',
    ].includes(event.type)
  ) {
    try {
      const session = await stripe.checkout.sessions.retrieve(
        (event.data.object as Stripe.Checkout.Session).id,
      );
      const id = session.metadata?.reservation_id;
      if (
        id &&
        (session.status === 'expired' ||
          (event.type === 'checkout.session.async_payment_failed' &&
            session.payment_status === 'unpaid'))
      ) {
        const reservation = await prisma.checkoutReservation.findUnique({
          where: { id },
        });
        if (reservation?.stripeSessionId === session.id)
          await releaseReservation(
            id,
            session.status === 'expired'
              ? 'stripe-expired'
              : 'async-payment-failed',
          );
      }
      return NextResponse.json({ received: true });
    } catch {
      return new NextResponse('Reservation reconciliation pending', {
        status: 500,
      });
    }
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
    // Durable dispatches are processed by the independent worker.
    return NextResponse.json({ received: true });
  } catch {
    console.error(
      'Paid checkout processing failed; inspect orders and Stripe event delivery.',
    );
    return new NextResponse('Order processing pending', { status: 500 });
  }
}
