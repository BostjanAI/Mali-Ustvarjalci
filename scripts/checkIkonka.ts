import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
async function main() {
  const id = process.argv[process.argv.indexOf('--supplier') + 1];
  if (!process.argv.includes('--supplier') || !id)
    throw new Error('Usage: tsx scripts/checkIkonka.ts --supplier ID');
  const { prisma } = await import('../src/lib/prisma');
  const { ikonkaCatalog } = await import('../src/lib/ikonka');
  try {
    const supplier = await prisma.supplier.findUniqueOrThrow({ where: { id } });
    console.log(JSON.stringify(await ikonkaCatalog(supplier), null, 2));
  } finally {
    await prisma.$disconnect();
  }
}
main().catch(() => {
  console.error(
    'Ikonka account catalogue could not be verified; check configuration without printing credentials.',
  );
  process.exitCode = 1;
});
