import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { sendShippingUpdate } from '@/lib/email';
import { refreshSupplierStatus } from '@/lib/supplierForward';
import { rateLimit } from '@/lib/rateLimit';
import { z } from 'zod';
const schema = z.object({
  supplierOrderId: z.string().min(1).max(150),
  status: z.enum(['pending', 'confirmed', 'shipped', 'cancelled', 'refunded']),
  trackingNumber: z.string().trim().max(200).optional(),
});
const transitions: Record<string, string[]> = {
  pending: ['confirmed', 'shipped', 'cancelled', 'refunded'],
  confirmed: ['shipped', 'cancelled', 'refunded'],
  shipped: ['refunded'],
  cancelled: ['refunded'],
  refunded: [],
};
export async function POST(req: Request) {
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true')
    return new NextResponse('Disabled in demo mode', { status: 409 });
  if (
    !rateLimit(
      'supplier-webhook:' + (req.headers.get('x-forwarded-for') || 'unknown'),
      60,
      60000,
    )
  )
    return new NextResponse('Too many requests', { status: 429 });
  const supplierId = req.headers.get('x-supplier-id');
  const provided = req.headers.get('x-api-key');
  if (!supplierId || !provided)
    return new NextResponse('Unauthorized', { status: 401 });
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: { orderWebhookToken: true },
  });
  const token = supplier?.orderWebhookToken;
  if (
    !token ||
    Buffer.byteLength(provided) !== Buffer.byteLength(token) ||
    !timingSafeEqual(Buffer.from(provided), Buffer.from(token))
  )
    return new NextResponse('Unauthorized', { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new NextResponse('Bad request', { status: 400 });
  const body = parsed.data;
  const dispatch = await prisma.supplierDispatch.findUnique({
    where: {
      supplierId_supplierOrderId: {
        supplierId,
        supplierOrderId: body.supplierOrderId,
      },
    },
    include: { order: { select: { email: true } } },
  });
  if (!dispatch || dispatch.status !== 'sent')
    return new NextResponse('Not found', { status: 404 });
  const current = dispatch.supplierStatus || 'pending';
  if (body.status === current || !transitions[current]?.includes(body.status))
    return NextResponse.json({ received: true });
  const updated = await prisma.supplierDispatch.updateMany({
    where: { id: dispatch.id, supplierStatus: dispatch.supplierStatus },
    data: {
      supplierStatus: body.status,
      ...(body.trackingNumber ? { trackingNumber: body.trackingNumber } : {}),
    },
  });
  if (updated.count) {
    await refreshSupplierStatus(dispatch.orderId);
    if (body.status === 'shipped')
      await sendShippingUpdate(
        dispatch.order.email,
        dispatch.orderId,
        body.trackingNumber,
      ).catch(() => {});
  }
  return NextResponse.json({ received: true });
}
