import type { CatalogProduct } from './catalog';
import {
  parseProductDetails,
  stockAvailability,
  ageText,
} from './productDetails';
import { safeParseJsonArray } from './utils';
import settings from '../../config/supplier-import.json';
type Row = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  priceCents: number;
  imagesJson: string | null;
  categoryPath: string | null;
  brand: string | null;
  detailsJson: string | null;
  inventory: {
    quantity: number;
    allocatedQuantity: number;
    syncedAt: Date | null;
  } | null;
};
export function catalogProduct(row: Row, locale: string): CatalogProduct {
  const details = parseProductDetails(row.detailsJson);
  const availability = stockAvailability(
    row.inventory
      ? Math.max(0, row.inventory.quantity - row.inventory.allocatedQuantity)
      : null,
    row.inventory?.syncedAt,
    Date.now(),
    settings.stockMaxAgeHours,
  );
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    priceCents: row.priceCents,
    images: safeParseJsonArray(row.imagesJson),
    categoryPath: row.categoryPath,
    brand: row.brand,
    details,
    ageLabel: ageText(details, locale),
    availability,
    stockQuantity:
      availability === 'unknown'
        ? null
        : row.inventory
          ? Math.max(
              0,
              row.inventory.quantity - row.inventory.allocatedQuantity,
            )
          : null,
    stockCheckedAt: row.inventory?.syncedAt?.toISOString() || null,
  };
}
export const publishedProducts = {
  active: true,
  catalogReviewedAt: { not: null },
  imagesVerifiedAt: { not: null },
};
export const catalogSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  priceCents: true,
  imagesJson: true,
  categoryPath: true,
  brand: true,
  detailsJson: true,
  inventory: {
    select: { quantity: true, allocatedQuantity: true, syncedAt: true },
  },
} as const;
