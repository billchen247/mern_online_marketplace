import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    email: z.email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Za-z]/, 'Must contain a letter')
      .regex(/\d/, 'Must contain a number'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

export const addressSchema = z.object({
  recipientName: z.string().trim().min(2, 'Recipient name is required'),
  phone: z.string().trim().min(5, 'Phone is required'),
  addressLine1: z.string().trim().min(3, 'Address is required'),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().min(1, 'City is required'),
  state: z.string().trim().min(1, 'State is required'),
  postalCode: z.string().trim().min(2, 'Postal code is required'),
  country: z.string().trim().min(2, 'Country is required'),
  isDefault: z.boolean().optional(),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  phone: z.string().trim().max(30).optional(),
});

export const sellerApplicationSchema = z.object({
  businessName: z.string().trim().min(2, 'Business name is required'),
  businessDescription: z.string().trim().min(10, 'Describe your business (min 10 characters)'),
  email: z.email('Enter a valid contact email'),
  phone: z.string().trim().min(5, 'Phone is required'),
  address: z.string().trim().optional(),
});

export const shopSchema = z.object({
  name: z.string().trim().min(2, 'Shop name is required'),
  description: z.string().trim().max(2000).optional(),
  email: z.union([z.email('Enter a valid email'), z.literal('')]).optional(),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(300).optional(),
});

export const productFormSchema = z.object({
  shop: z.string().min(1, 'Select a shop'),
  category: z.string().min(1, 'Select a category'),
  name: z.string().trim().min(2, 'Name is required'),
  description: z.string().trim().min(10, 'Description must be at least 10 characters'),
  price: z.number({ error: 'Enter a price' }).min(0.01, 'Price must be at least 0.01'),
  discount: z.number({ error: 'Enter a discount' }).min(0, 'Min 0').max(90, 'Max 90'),
  stock: z.number({ error: 'Enter stock' }).int('Whole numbers only').min(0, 'Min 0'),
  sku: z.string().trim().min(2, 'SKU is required'),
  status: z.enum(['draft', 'active', 'inactive']),
  specifications: z.array(z.object({ key: z.string().trim().min(1, 'Required'), value: z.string().trim().min(1, 'Required') })),
});

export const reviewFormSchema = z.object({
  rating: z.number().int().min(1, 'Select a rating').max(5),
  title: z.string().trim().max(120).optional(),
  comment: z.string().trim().min(3, 'Write at least 3 characters'),
});

export const trackingSchema = z.object({
  carrier: z.string().trim().min(2, 'Carrier is required'),
  trackingNumber: z.string().trim().min(3, 'Tracking number is required'),
  trackingUrl: z.union([z.url('Enter a valid URL'), z.literal('')]).optional(),
});

export const returnFormSchema = z.object({ reason: z.string().trim().min(5, 'Please explain the reason (min 5 characters)') });

export const categoryFormSchema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  description: z.string().trim().max(500).optional(),
  parentCategory: z.string().optional(),
  status: z.enum(['active', 'inactive']),
});

export const settingsFormSchema = z.object({
  marketplaceName: z.string().trim().min(2),
  tagline: z.string().trim().max(160),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex color like #4f46e5'),
  commissionRate: z.number().min(0).max(100),
  flatRate: z.number().min(0),
  freeShippingThreshold: z.number().min(0),
  taxRate: z.number().min(0).max(100),
  requireProductApproval: z.boolean(),
  requireShopApproval: z.boolean(),
});
