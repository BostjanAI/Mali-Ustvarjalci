import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions as any);
  if ((session as any)?.user?.role !== 'admin') {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (!rateLimit(`admin-refund:${ip}`, 5, 60_000)) {
    return NextResponse.json({ ok: false, message: 'Too many requests' }, { status: 429 });
  }

  const { orderId, amountCents } = (await request.json().catch(() => ({}))) as { orderId?: string; amountCents?: number };
  if (!orderId) return NextResponse.json({ ok: false, message: 'orderId required' }, { status: 400 });

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return NextResponse.json({ ok: false, message: 'Order not found' }, { status: 404 });
  if (!order.stripePaymentIntentId) return NextResponse.json({ ok: false, message: 'No Stripe payment for this order' }, { status: 400 });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' });

  const refund = await stripe.refunds.create({
    payment_intent: order.stripePaymentIntentId,
    amount: amountCents && amountCents > 0 ? amountCents : undefined,
  });

  // Restore inventory proportionally based on refunded amount
  const restoreRatio = !amountCents || amountCents >= order.totalCents ? 1 : amountCents / order.totalCents;
  for (const item of order.items) {
    const restoreQty = Math.floor(item.quantity * restoreRatio);
    if (restoreQty > 0) {
      await prisma.inventory.updateMany({ where: { productId: item.productId }, data: { quantity: { increment: restoreQty } } });
    }
  }

  await prisma.order.update({ where: { id: order.id }, data: { supplierStatus: 'refunded' } });
  await prisma.auditLog.create({ data: { userId: (session as any)?.user?.id, action: 'admin.refund', metadata: JSON.stringify({ orderId, amountCents: amountCents || 'full', refundId: refund.id }) } });
  return NextResponse.json({ ok: true, refund });
}


