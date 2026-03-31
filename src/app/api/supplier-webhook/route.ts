import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendShippingUpdate } from '@/lib/email';
import { rateLimit } from '@/lib/rateLimit';
import { z } from 'zod';

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  if (!rateLimit(`supplier-webhook:${ip}`, 60, 60_000)) {
    return new NextResponse('Too many requests', { status: 429 });
  }
  // Simple supplier auth via API key header
  const apiKey = req.headers.get('x-api-key');
  if (!process.env.SUPPLIER_API_KEY || apiKey !== process.env.SUPPLIER_API_KEY) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  if (process.env.DATABASE_URL?.startsWith('file:')) {
    return new NextResponse('DB disabled in mock mode', { status: 400 });
  }

  const BodySchema = z.object({
    supplierOrderId: z.string().min(1),
    status: z.enum(['pending', 'confirmed', 'shipped', 'cancelled', 'refunded']),
    trackingNumber: z.string().optional(),
  });
  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return new NextResponse('Bad Request', { status: 400 });
  const body = parsed.data;

  const order = await prisma.order.findFirst({ where: { supplierOrderId: body.supplierOrderId } });
  if (!order) return new NextResponse('Not Found', { status: 404 });

  await prisma.order.update({ where: { id: order.id }, data: { supplierStatus: body.status } });

  if (body.status === 'shipped' && order.email) {
    await sendShippingUpdate(order.email, order.id, body.trackingNumber);
  }

  return NextResponse.json({ ok: true });
}



