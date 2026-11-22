import { stockAvailability } from './productDetails';
import settings from '../../config/supplier-import.json';
export type RequestedItem = { id: string; quantity: number };
export type PricedProduct = {
  id: string;
  slug: string;
  title: string;
  priceCents: number;
  currency: string;
  supplierId?: string | null;
  supplierProductId?: string | null;
  inventory?: { quantity: number; syncedAt?: Date | string | null } | null;
};
export function priceCart(items: RequestedItem[], products: PricedProduct[]) {
  const quantities = new Map<string, number>();
  for (const item of items) {
    if (
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 99
    )
      throw new Error('Invalid quantity');
    const quantity = (quantities.get(item.id) || 0) + item.quantity;
    if (quantity > 99) throw new Error('Invalid quantity');
    quantities.set(item.id, quantity);
  }
  return Array.from(quantities, ([id, quantity]) => {
    const product = products.find((p) => p.id === id);
    if (
      !product ||
      product.priceCents <= 0 ||
      !Number.isInteger(product.priceCents) ||
      product.currency !== 'EUR'
    )
      throw new Error('Product unavailable');
    if (
      stockAvailability(
        product.inventory?.quantity,
        product.inventory?.syncedAt,
        Date.now(),
        settings.stockMaxAgeHours,
      ) !== 'in_stock'
    )
      throw new Error('Inventory is not confirmed');
    if (product.inventory!.quantity < quantity)
      throw new Error('Insufficient inventory');
    return {
      id: product.id,
      slug: product.slug,
      title: product.title,
      priceCents: product.priceCents,
      quantity,
      supplierId: product.supplierId ?? null,
      supplierProductId: product.supplierProductId ?? null,
    };
  });
}
export function cartMetadata(cart: ReturnType<typeof priceCart>) {
  const json = JSON.stringify(cart);
  const chunks = json.match(/[\s\S]{1,450}/g) || [];
  if (chunks.length > 35) throw new Error('Cart too large');
  return Object.fromEntries([
    ['cart_chunks', String(chunks.length)],
    ...chunks.map((chunk, i) => ['cart_' + i, chunk]),
  ]);
}
export function readCartMetadata(metadata: Record<string, string> | null) {
  if (!metadata) return [];
  const count = Number(metadata.cart_chunks);
  const raw =
    Number.isInteger(count) && count > 0 && count <= 35
      ? Array.from(
          { length: count },
          (_, i) => metadata['cart_' + i] || '',
        ).join('')
      : metadata.cart;
  if (!raw) return [];
  return JSON.parse(raw) as ReturnType<typeof priceCart>;
}
