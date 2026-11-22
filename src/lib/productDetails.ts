import { z } from 'zod';
const httpsUrl = z
  .string()
  .url()
  .refine((value) => new URL(value).protocol === 'https:', 'HTTPS is required');
const contact = z.object({
  name: z.string().max(250).default(''),
  address: z.string().max(1000).default(''),
  email: z.union([z.literal(''), z.string().email()]).default(''),
});
export const productDetailsSchema = z
  .object({
    minAgeMonths: z.number().int().min(0).max(216).nullable().default(null),
    maxAgeMonths: z.number().int().min(0).max(216).nullable().default(null),
    ageLabel: z.string().max(200).default(''),
    warnings: z.string().max(10000).default(''),
    instructionsUrl: z.union([z.literal(''), httpsUrl]).default(''),
    instructionsLanguage: z.string().max(20).default(''),
    manufacturer: contact.default({}),
    euResponsiblePerson: contact.default({}),
    sourceUrl: z.union([z.literal(''), httpsUrl]).default(''),
    imageRightsSource: z.string().max(2000).default(''),
  })
  .refine(
    (d) =>
      d.minAgeMonths === null ||
      d.maxAgeMonths === null ||
      d.minAgeMonths <= d.maxAgeMonths,
    { message: 'Invalid age range', path: ['maxAgeMonths'] },
  );
export type ProductDetails = z.infer<typeof productDetailsSchema>;
export function parseProductDetails(json?: string | null): ProductDetails {
  try {
    return productDetailsSchema.parse(json ? JSON.parse(json) : {});
  } catch {
    return productDetailsSchema.parse({});
  }
}
export function reviewIssues(
  details: ProductDetails,
  images: string[],
  imagesVerified: boolean,
) {
  const issues: string[] = [];
  if (details.minAgeMonths === null) issues.push('minAgeMonths');
  if (!details.warnings.trim()) issues.push('warnings');
  if (!details.instructionsUrl || details.instructionsLanguage !== 'sl')
    issues.push('instructionsSl');
  if (
    !details.manufacturer.name ||
    !details.manufacturer.address ||
    !details.manufacturer.email
  )
    issues.push('manufacturer');
  if (!details.sourceUrl) issues.push('sourceUrl');
  if (
    !images.length ||
    !images.every((url) => {
      try {
        return new URL(url).protocol === 'https:';
      } catch {
        return false;
      }
    })
  )
    issues.push('images');
  if (!imagesVerified || !details.imageRightsSource.trim())
    issues.push('imageRights');
  return issues;
}
export type Availability = 'demo' | 'in_stock' | 'out_of_stock' | 'unknown';
export function stockAvailability(
  quantity: number | undefined | null,
  checkedAt: Date | string | undefined | null,
  now = Date.now(),
  maxAgeHours = 24,
): Availability {
  if (
    !Number.isInteger(quantity) ||
    quantity === null ||
    quantity === undefined ||
    quantity < 0 ||
    !checkedAt
  )
    return 'unknown';
  const timestamp = new Date(checkedAt).getTime();
  if (
    !Number.isFinite(timestamp) ||
    timestamp > now + 60000 ||
    now - timestamp > maxAgeHours * 3600000
  )
    return 'unknown';
  return quantity > 0 ? 'in_stock' : 'out_of_stock';
}
export function ageText(
  details: Pick<ProductDetails, 'minAgeMonths' | 'maxAgeMonths' | 'ageLabel'>,
  locale: string,
) {
  if (details.ageLabel) return details.ageLabel;
  if (details.minAgeMonths === null)
    return locale === 'en'
      ? 'Age information pending'
      : 'Starostni podatek še ni potrjen';
  const unit =
    details.minAgeMonths % 12 === 0 &&
    (details.maxAgeMonths === null || details.maxAgeMonths % 12 === 0)
      ? 12
      : 1;
  const min = details.minAgeMonths / unit;
  const max =
    details.maxAgeMonths === null ? null : details.maxAgeMonths / unit;
  return (
    (max === null ? min + '+' : min + '–' + max) +
    ' ' +
    (unit === 12
      ? locale === 'en'
        ? 'years'
        : 'let'
      : locale === 'en'
        ? 'months'
        : 'mesecev')
  );
}
