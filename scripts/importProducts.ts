import fs from 'node:fs/promises';
import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import { parseSupplierFeed } from '../src/lib/supplierFeed';
import { feedReport } from '../src/lib/feedReport';
loadEnvConfig(process.cwd());
async function main() {
  const args = process.argv.slice(2);
  const file = args[0];
  if (!file || file.startsWith('--'))
    throw new Error(
      'Usage: npm run import:products -- catalog.csv --supplier SUPPLIER_ID [--apply]',
    );
  const supplierIndex = args.indexOf('--supplier');
  const supplierId = supplierIndex >= 0 ? args[supplierIndex + 1] : undefined;
  const absolute = path.resolve(file);
  const stat = await fs.stat(absolute);
  if (stat.size > 10 * 1024 * 1024) throw new Error('Catalog exceeds 10 MB');
  const items = parseSupplierFeed(
    await fs.readFile(absolute, 'utf8'),
    path.extname(absolute),
    supplierId || 'environment-supplier',
  );
  console.log(JSON.stringify(feedReport(items), null, 2));
  if (!args.includes('--apply')) {
    console.log('Dry run only. No database changes.');
    return;
  }
  if (!supplierId) throw new Error('--supplier is required for --apply');
  const { prisma } = await import('../src/lib/prisma');
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });
    if (!supplier) throw new Error('Supplier does not exist');
    const { applySupplierItems } = await import('../src/lib/supplierSync');
    console.log(await applySupplierItems(supplierId, items));
  } finally {
    await prisma.$disconnect();
  }
}
main().catch(() => {
  console.error({ event: 'import_failed' });
  process.exitCode = 1;
});
