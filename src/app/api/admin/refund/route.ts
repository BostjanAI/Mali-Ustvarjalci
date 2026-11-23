import { permittedAdminOrigin } from '@/lib/security';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import { refundInput, requestOrderRefund } from '@/lib/refunds';
export async function POST(request: Request) {
  if (!permittedAdminOrigin(request)) return new Response('Forbidden', { status: 403 });
  const session = await getServerSession(authOptions);
  if ((session?.user as { role?: string })?.role !== 'admin')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!rateLimit('refund:' + (session?.user as { id?: string })?.id, 5, 60000))
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  const parsed = refundInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Invalid refund request' },
      { status: 400 },
    );
  try {
    const refund = await requestOrderRefund(
      parsed.data,
      (session?.user as { id: string }).id,
    );
    return NextResponse.json({
      ok: true,
      refund: {
        id: refund.id,
        status: refund.status,
        amountCents: refund.amountCents,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Refund requires review; no stock has been restored' },
      { status: 409 },
    );
  }
}
