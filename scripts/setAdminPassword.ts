/**
 * Enkratno posodobi geslo admin uporabnika v bazi (bcrypt, enako kot seed).
 *
 * Uporaba (PowerShell):
 *   $env:ADMIN_NEW_PASSWORD="moje-varno-geslo"; npm run db:set-admin-password
 *
 * Uporaba (bash):
 *   ADMIN_NEW_PASSWORD='moje-varno-geslo' npm run db:set-admin-password
 *
 * Opcijsko: ADMIN_EMAIL=drug@email.com (privzeto admin@example.com)
 *
 * Zahteva: DATABASE_URL v .env ali okolju mora kazati na isto bazo kot aplikacija.
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const MIN_LENGTH = 8;

async function main() {
  const password = process.env.ADMIN_NEW_PASSWORD?.trim();
  const email = (process.env.ADMIN_EMAIL || 'admin@example.com').trim().toLowerCase();

  if (!password) {
    console.error(
      'Manjka ADMIN_NEW_PASSWORD. Primer (PowerShell): $env:ADMIN_NEW_PASSWORD="..."; npm run db:set-admin-password',
    );
    process.exit(1);
  }

  if (password.length < MIN_LENGTH) {
    console.error(`Geslo mora imeti vsaj ${MIN_LENGTH} znakov.`);
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    console.error(
      `Uporabnik ${email} ne obstaja. Najprej zaženi: npm run db:seed (ali ustvari uporabnika ročno).`,
    );
    process.exit(1);
  }

  const passwordHash = await hash(password, 10);
  await prisma.user.update({
    where: { email },
    data: { passwordHash },
  });

  console.log(`Geslo je posodobljeno za ${email}.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
