import { permittedAdminOrigin } from '@/lib/security';
import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runFulfillmentWorker } from '@/lib/fulfillmentWorker';
export const maxDuration = 120;
export async function POST(req: Request) {
  if (!permittedAdminOrigin(req)) return new Response('Forbidden', { status: 403 });
  const provided = req.headers.get('x-cron-secret') || '';
  const expected = process.env.CRON_SECRET || '';
  const cron =
    !!expected &&
    Buffer.byteLength(provided) === Buffer.byteLength(expected) &&
    timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  if (!cron) {
    const session = await getServerSession(authOptions);
    if ((session?.user as { role?: string })?.role !== 'admin')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true')
    return NextResponse.json({ disabled: true }, { status: 409 });
  try {
    return NextResponse.json(await runFulfillmentWorker());
  } catch {
    return NextResponse.json(
      { error: 'Worker failed; retry later' },
      { status: 503 },
    );
  }
}
