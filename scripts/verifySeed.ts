import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findUnique({
    where: { email: (process.env.ADMIN_EMAIL || 'admin@example.com').trim().toLowerCase() },
  });
  const [userCount, productCount, supplierCount] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.supplier.count(),
  ]);

  console.log('Preverjanje seed podatkov:');
  console.log(`  Uporabniki: ${userCount}`);
  console.log(`  Izdelki: ${productCount}`);
  console.log(`  Dobavitelji: ${supplierCount}`);
  console.log(
    `  Admin: ${admin ? `${admin.email} (${admin.role})` : 'manjka'}`,
  );

  if (!admin || admin.role !== 'admin') {
    console.error('Napaka: pričakovan uporabnik z vlogo admin.');
    process.exit(1);
  }
  if (productCount < 20) {
    console.error('Napaka: pričakovano vsaj 20 demo izdelkov.');
    process.exit(1);
  }
  console.log('V redu: baza je posjana.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
