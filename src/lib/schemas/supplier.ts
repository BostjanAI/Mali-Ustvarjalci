import { z } from 'zod';

export const supplierSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  feedUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  authToken: z.string().max(500).optional().or(z.literal('')),
  syncFrequency: z.string().max(100).optional().or(z.literal('')),
  active: z.boolean(),
});

export type SupplierInput = z.infer<typeof supplierSchema>;
