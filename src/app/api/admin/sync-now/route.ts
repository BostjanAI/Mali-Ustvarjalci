import { permittedAdminOrigin } from '@/lib/security';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rateLimit';
import { runSupplierSync } from '@/lib/supplierSync';

export async function POST(request: Request) {
  if (!permittedAdminOrigin(request)) return new Response('Forbidden', { status: 403 });
  if (
    process.env.NEXT_PUBLIC_MOCK_MODE === 'true' ||
    process.env.DATABASE_URL?.startsWith('file:')
  ) {
    return NextResponse.json(
      {
        ok: false,
        message: 'DB not enabled; supplier sync disabled in mock mode.',
      },
      { status: 400 },
    );
  }

  // Allow either admin session or CRON secret header
  const cronHeader = request.headers.get('x-cron-secret');
  const cronOk =
    !!process.env.CRON_SECRET && cronHeader === process.env.CRON_SECRET;
  let isAdmin = false;
  let userId: string | undefined = undefined;
  if (!cronOk) {
    const session = await getServerSession(authOptions as any);
    isAdmin = (session as any)?.user?.role === 'admin';
    userId = (session as any)?.user?.id;
  }
  if (!cronOk && !isAdmin) {
    return NextResponse.json(
      { ok: false, message: 'Unauthorized' },
      { status: 401 },
    );
  }

  // Rate limit by IP
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (!rateLimit(`admin-sync:${ip}`, 10, 60_000)) {
    return NextResponse.json(
      { ok: false, message: 'Too many requests' },
      { status: 429 },
    );
  }

  let result;
  try {
    result = await runSupplierSync();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message:
          'Supplier configuration or feed is not ready. No products were changed.',
      },
      { status: 503 },
    );
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'admin.sync-now',
      metadata: JSON.stringify(result),
    },
  });
  return NextResponse.json(result, { status: result.errors ? 502 : 200 });
}
