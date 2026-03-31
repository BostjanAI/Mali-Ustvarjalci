import { z } from 'zod';

export const productSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  priceCents: z.number().int().min(0, 'Price must be positive'),
  active: z.boolean(),
  supplierManaged: z.boolean(),
});

export const productImageSchema = z.object({
  url: z.string().url('Must be a valid URL'),
});

export type ProductInput = z.infer<typeof productSchema>;
export type ProductImageInput = z.infer<typeof productImageSchema>;
