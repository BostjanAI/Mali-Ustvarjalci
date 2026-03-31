import { NextResponse } from 'next/server';
import { sendOrderConfirmation } from '@/lib/email';

export async function POST(req: Request) {
  const { email } = (await req.json().catch(() => ({}))) as { email?: string };
  if (email) {
    await sendOrderConfirmation(email, 'DEV-STUB');
  }
  return NextResponse.json({ ok: true });
}
