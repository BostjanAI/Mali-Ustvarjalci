import type { FeedItem } from './supplierFeed';
import { reviewIssues } from './productDetails';
export function feedReport(items: FeedItem[]) {
  return {
    products: items.length,
    mapped: items.filter((i) => i.category).length,
    unmappedCategories: Array.from(
      new Set(
        items
          .filter((i) => !i.category)
          .map((i) => i.rawCategory || '(missing)'),
      ),
    ),
    withStock: items.filter((i) => i.quantity !== undefined).length,
    withImages: items.filter((i) => i.images.length > 0).length,
    manualImageReviewRequired: items.length,
    review: items
      .slice(0, 100)
      .map((item) => ({
        id: item.id,
        category: item.category,
        missing: reviewIssues(item.details, item.images, false),
      })),
  };
}
