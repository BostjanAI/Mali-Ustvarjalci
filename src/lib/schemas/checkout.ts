import { z } from 'zod';

export const checkoutSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email address'),
  street: z.string().min(1, 'Street address is required').max(200),
  city: z.string().min(1, 'City is required').max(100),
  postalCode: z.string().min(1, 'Postal code is required').max(20),
  country: z.string().min(2, 'Country is required').max(2),
  phone: z.string().min(1, 'Phone number is required').max(30),
});

export type CheckoutFormData = z.infer<typeof checkoutSchema>;
