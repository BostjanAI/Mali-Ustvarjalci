import { seedPassword } from '../src/lib/security';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash(seedPassword(process.env.ADMIN_NEW_PASSWORD), 12);
  const supplier = await prisma.supplier.upsert({
    where: { id: 'demo-supplier' },
    update: {},
    create: {
      id: 'demo-supplier',
      name: 'Demo Supplier',
      active: true,
      feedUrl: process.env.SUPPLIER_FEED_URL || 'https://example.com/feed.json',
    },
  });

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@example.com').trim().toLowerCase();
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, name: 'Admin', role: 'admin', passwordHash },
  });

  for (let i = 1; i <= 20; i++) {
    const slug = `demo-product-${i}`;
    await prisma.product.upsert({
      where: { slug },
      update: {},
      create: {
        title: `Demo Product ${i}`,
        slug,
        description: 'Placeholder description',
        priceCents: 1999 + i,
        imagesJson: "[]",
        supplierId: supplier.id,
        supplierProductId: `SUP-${i}`,
        supplierManaged: true,
        variants: {
          create: [
            { name: 'Default', sku: `SKU-${i}`, priceCents: 1999 + i },
          ],
        },
        inventory: {
          create: { quantity: 10 + i },
        },
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error({ event: 'seed_failed' });
    await prisma.$disconnect();
    process.exit(1);
  });


