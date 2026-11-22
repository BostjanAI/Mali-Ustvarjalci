import type { CatalogProduct } from '@/lib/catalog';
export default function StockStatus({
  product,
  locale,
}: {
  product: Pick<CatalogProduct, 'availability' | 'stockCheckedAt'>;
  locale: string;
}) {
  if (product.availability === 'demo') return null;
  const en = locale === 'en';
  const status = product.availability || 'unknown';
  return (
    <span className="stock-status" data-stock={status}>
      {status === 'in_stock'
        ? en
          ? 'In stock'
          : 'Na zalogi'
        : status === 'out_of_stock'
          ? en
            ? 'Out of stock'
            : 'Ni na zalogi'
          : en
            ? 'Availability not confirmed'
            : 'Dobavljivost ni potrjena'}
    </span>
  );
}
