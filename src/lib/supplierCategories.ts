import rules from '../../config/supplier-categories.json';
import { CATEGORIES } from './catalog';
export type CategoryId = (typeof CATEGORIES)[number]['id'];
type Rules = {
  default: Record<string, string>;
  suppliers: Record<string, Record<string, string>>;
};
export function normalizeCategory(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s_]+/g, ' ')
    .trim();
}
export function mapSupplierCategory(
  raw: string | undefined,
  supplierKey = '',
  config: Rules = rules,
): CategoryId | null {
  if (!raw?.trim()) return null;
  const ids = new Set<string>(CATEGORIES.map((c) => c.id));
  const normalized = normalizeCategory(raw);
  const lookup = (entries: Record<string, string>) => {
    const found = Object.entries(entries).find(
      ([key]) => normalizeCategory(key) === normalized,
    );
    if (!found) return null;
    if (!ids.has(found[1]))
      throw new Error('Invalid category target: ' + found[1]);
    return found[1] as CategoryId;
  };
  const exact =
    lookup(config.suppliers[supplierKey] || {}) || lookup(config.default);
  if (exact) return exact;
  const parts = raw.split(/\s*(?:>|\/|\|)\s*/);
  const leaf = normalizeCategory(parts[parts.length - 1]);
  const category = CATEGORIES.find((c) =>
    [c.id, c.sl, c.en].some(
      (label) =>
        normalizeCategory(label) === normalized ||
        normalizeCategory(label) === leaf,
    ),
  );
  return category?.id || null;
}
