import nodemailer from 'nodemailer';
import { render } from '@react-email/render';

export function getTransport() {
  if (!process.env.SMTP_HOST) {
    // No-op transport for dev
    return nodemailer.createTransport({ jsonTransport: true });
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    } : undefined,
  });
}

function renderBaseHtml(content: string, title: string) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background:#f7f7f8; margin:0; padding:24px; }
      .card { max-width:600px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; padding:24px; }
      .brand { font-weight:600; font-size:18px; color:#111827; }
      .muted { color:#6b7280; font-size:14px; }
      .button { display:inline-block; background:#111827; color:#fff; padding:10px 16px; border-radius:8px; text-decoration:none; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="brand">Mali Ustvarjalci</div>
      <div style="height:12px"></div>
      ${content}
      <div style="height:16px"></div>
      <div class="muted">This is an automated message. Please do not reply.</div>
    </div>
  </body>
 </html>`;
}

export async function sendOrderConfirmation(to: string, orderId: string) {
  const transport = getTransport();
  const { OrderConfirmation } = await import('../mail/OrderConfirmation');
  const html = render(OrderConfirmation({ orderId } as any));
  await transport.sendMail({
    from: process.env.SMTP_USER || 'no-reply@mali-ustvarjalci.si',
    to,
    subject: `Order ${orderId} confirmation`,
    text: `Thank you for your order ${orderId}.`,
    html,
  });
}

export async function sendShippingUpdate(to: string, orderId: string, trackingNumber?: string) {
  const transport = getTransport();
  const { ShippingUpdate } = await import('../mail/ShippingUpdate');
  const html = render(ShippingUpdate({ orderId, trackingNumber } as any));
  await transport.sendMail({
    from: process.env.SMTP_USER || 'no-reply@mali-ustvarjalci.si',
    to,
    subject: `Your order ${orderId} has shipped`,
    text: `Good news! Your order ${orderId} has shipped.${trackingNumber ? ` Tracking number: ${trackingNumber}.` : ''}`,
    html,
  });
}





