import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { randomUUID } from 'node:crypto';

test('a real admin session loses privileges when its database role changes', async ({
  request,
}) => {
  const url = process.env.TEST_DATABASE_URL;
  test.skip(
    !url ||
      url !== process.env.DATABASE_URL ||
      !new URL(url).pathname.endsWith('_test'),
    'Requires an isolated migrated test database',
  );
  const db = new PrismaClient();
  const password = randomUUID();
  const email = randomUUID() + '@example.invalid';
  try {
    const user = await db.user.create({
      data: { email, role: 'admin', passwordHash: await hash(password, 10) },
    });
    const { csrfToken } = await (await request.get('/api/auth/csrf')).json();
    await request.post('/api/auth/callback/credentials', {
      form: { csrfToken, email, password, json: 'true' },
    });
    const session = async () =>
      (await (await request.get('/api/auth/session')).json()).user;
    expect(await session()).toMatchObject({ id: user.id, role: 'admin' });
    await db.user.update({
      where: { id: user.id },
      data: { role: 'customer' },
    });
    expect(await session()).toMatchObject({ id: user.id, role: 'customer' });
    expect(
      (await request.post('/api/admin/refund', { data: {} })).status(),
    ).toBe(401);
  } finally {
    await db.user.deleteMany({ where: { email } });
    await db.$disconnect();
  }
});
