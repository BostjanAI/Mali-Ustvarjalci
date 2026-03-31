import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function importCsv(filePath: string) {
  const records: any[] = [];
  const parser = fs
    .createReadStream(path.resolve(filePath))
    .pipe(parse({ columns: true, skip_empty_lines: true }));

  for await (const record of parser) records.push(record);

  for (const row of records) {
    const slug = row.slug || row.title.toLowerCase().replace(/\s+/g, '-');
    await prisma.product.upsert({
      where: { slug },
      update: {
        title: row.title,
        description: row.description ?? null,
        priceCents: Math.round(parseFloat(row.price) * 100),
        brand: row.brand ?? null,
        categoryPath: row.categoryPath ?? null,
      },
      create: {
        title: row.title,
        slug,
        description: row.description ?? null,
        priceCents: Math.round(parseFloat(row.price) * 100),
        imagesJson: JSON.stringify([]),
        brand: row.brand ?? null,
        categoryPath: row.categoryPath ?? null,
        variants: { create: [{ name: 'Default', sku: row.sku ?? slug, priceCents: Math.round(parseFloat(row.price) * 100) }] },
        inventory: { create: { quantity: parseInt(row.quantity ?? '0', 10) } },
      },
    });
  }
}

async function main() {
  const [, , csvPath] = process.argv;
  if (!csvPath) {
    console.error('Usage: npm run import:products -- <path-to-csv>');
    process.exit(1);
  }
  await importCsv(csvPath);
  console.log('Import completed');
}

main().finally(async () => prisma.$disconnect());







