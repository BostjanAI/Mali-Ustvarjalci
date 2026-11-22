import { loadEnvConfig } from '@next/env';
import { fetchFeed } from '../src/lib/supplierFeed';
import { feedReport } from '../src/lib/feedReport';
loadEnvConfig(process.cwd());
async function main() {
  if (!process.argv.includes('--apply')) {
    if (!process.env.SUPPLIER_FEED_URL)
      throw new Error('SUPPLIER_FEED_URL is missing');
    const items = await fetchFeed(
      process.env.SUPPLIER_FEED_URL,
      process.env.SUPPLIER_API_KEY,
      'environment-supplier',
    );
    console.log(JSON.stringify(feedReport(items), null, 2));
    console.log('Dry run only. No database changes.');
    return;
  }
  const { prisma } = await import('../src/lib/prisma');
  try {
    const { runSupplierSync } = await import('../src/lib/supplierSync');
    const result = await runSupplierSync();
    console.log(result);
    if (result.errors) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : 'Supplier sync failed',
  );
  process.exitCode = 1;
});
