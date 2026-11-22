import type { ProductDetails, Availability } from './productDetails';
export const CATEGORIES = [
  { id: 'wooden-toys', sl: 'Lesene igrače', en: 'Wooden toys', icon: 'blocks' },
  {
    id: 'art-craft',
    sl: 'Risanje in slikanje',
    en: 'Art & craft',
    icon: 'palette',
  },
  {
    id: 'educational-games',
    sl: 'Miselne igre',
    en: 'Learning games',
    icon: 'brain',
  },
  {
    id: 'outdoor-play',
    sl: 'Igra na prostem',
    en: 'Outdoor play',
    icon: 'sun',
  },
  {
    id: 'books-puzzles',
    sl: 'Knjige in sestavljanke',
    en: 'Books & puzzles',
    icon: 'puzzle',
  },
  {
    id: 'diy-kits',
    sl: 'Ustvarjalni kompleti',
    en: 'Creative kits',
    icon: 'scissors',
  },
] as const;
export type CatalogProduct = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  priceCents: number;
  images: string[];
  categoryPath?: string | null;
  brand?: string | null;
  details?: ProductDetails;
  ageLabel?: string;
  availability?: Availability;
  stockQuantity?: number | null;
  stockCheckedAt?: string | null;
};
export function categoryLabel(id: string | null | undefined, locale: string) {
  const category = CATEGORIES.find((c) => c.id === id);
  return category
    ? locale === 'en'
      ? category.en
      : category.sl
    : locale === 'en'
      ? 'Discover through play'
      : 'Odkrivanje skozi igro';
}
export function positiveInt(
  value: string | null,
  fallback: number,
  max = 10000,
) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0
    ? Math.min(number, max)
    : fallback;
}
export function priceLimit(value: string | null) {
  if (!value?.trim()) return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0
    ? Math.min(Math.round(number * 100), 10000000)
    : undefined;
}

export function productCount(count: number, locale: string) {
  if (locale === 'en')
    return count + ' ' + (count === 1 ? 'product' : 'products');
  const n = count % 100;
  return (
    count +
    ' ' +
    (n === 1
      ? 'izdelek'
      : n === 2
        ? 'izdelka'
        : n === 3 || n === 4
          ? 'izdelki'
          : 'izdelkov')
  );
}

export function canAddToCart(product: Pick<CatalogProduct, 'availability'>) {
  return product.availability === 'demo' || product.availability === 'in_stock';
}
