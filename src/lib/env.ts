import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(32).optional(),
  CRON_SECRET: z.string().min(16).optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SUPPLIER_FEED_URL: z.string().url().optional(),
  SUPPLIER_ORDER_URL: z.string().url().optional(),
  SUPPLIER_API_KEY: z.string().optional(),
  AUTH_MODE: z.enum(['mock', 'credentials']).optional(),
  MOCK_ADMIN_EMAIL: z.string().email().optional(),
  MOCK_ADMIN_PASSWORD: z.string().optional(),
});

export type AppEnv = z.infer<typeof schema>;

export const env: AppEnv = schema.parse(process.env);





