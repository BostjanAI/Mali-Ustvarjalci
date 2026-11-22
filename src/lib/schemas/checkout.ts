import { z } from 'zod';
import { deliveryCountries } from '../orderDelivery';

export const checkoutSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email address'),
  street: z.string().trim().min(1, 'Street address is required').max(200),
  city: z.string().trim().min(1, 'City is required').max(100),
  postalCode: z.string().trim().min(1, 'Postal code is required').max(20),
  country: z.enum(deliveryCountries),
  phone: z.string().trim().min(1, 'Phone number is required').max(30),
});

export type CheckoutFormData = z.infer<typeof checkoutSchema>;
