import { z } from 'zod';
import { bool, imageRef, objectId, paginationQuery } from './common.js';

export * from './common.js';

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72)
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().max(200),
  password,
});
export const loginSchema = z.object({ email: z.email(), password: z.string().min(1).max(200) });

export const profileSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    phone: z.string().trim().max(30).optional(),
    currentPassword: z.string().optional(),
    newPassword: password.optional(),
  })
  .strict();

const addressFields = {
  recipientName: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(5).max(30),
  addressLine1: z.string().trim().min(3).max(200),
  addressLine2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(2).max(20),
  country: z.string().trim().min(2).max(60).default('US'),
  isDefault: z.boolean().optional(),
};
export const addressSchema = z.object(addressFields).strict();
export const addressPatchSchema = z.object(addressFields).partial().strict();

export const sellerApplicationSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  businessDescription: z.string().trim().min(10).max(2000),
  contactInformation: z.object({
    email: z.email(),
    phone: z.string().trim().min(5).max(30),
    address: z.string().trim().max(300).optional(),
  }),
});
export const reviewApplicationSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reviewNotes: z.string().trim().max(1000).optional(),
});
export const sellerStateSchema = z.object({ action: z.enum(['suspend', 'reactivate']), notes: z.string().max(1000).optional() });

const contact = z.object({ email: z.email().optional(), phone: z.string().max(30).optional(), address: z.string().max(300).optional() });
export const shopSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(2000).optional(),
  logo: imageRef.optional(),
  banner: imageRef.optional(),
  contact: contact.optional(),
  categories: z.array(objectId).max(20).optional(),
});
export const shopPatchSchema = shopSchema.partial().extend({ status: z.enum(['active', 'inactive']).optional() });
export const adminShopPatchSchema = z.object({ status: z.enum(['pending', 'active', 'inactive', 'suspended']) });

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
  image: z.string().max(500).optional(),
  parentCategory: objectId.nullable().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});
export const categoryPatchSchema = categorySchema.partial();

export const productListQuery = z.object({
  ...paginationQuery,
  search: z.string().trim().max(100).optional(),
  category: z.string().max(100).optional(),
  shop: objectId.optional(),
  seller: objectId.optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  inStock: bool.optional(),
  featured: bool.optional(),
  sortBy: z.enum(['price', 'popularity', 'rating', 'newest']).default('newest'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

const productFields = {
  shop: objectId,
  category: objectId,
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().min(10).max(5000),
  images: z.array(imageRef).max(10).default([]),
  price: z.number().min(0.01).max(1_000_000),
  discount: z.number().min(0).max(90).default(0),
  stock: z.number().int().min(0).max(1_000_000),
  lowStockThreshold: z.number().int().min(0).max(10000).optional(),
  sku: z.string().trim().min(2).max(60),
  specifications: z.array(z.object({ key: z.string().trim().min(1).max(60), value: z.string().trim().min(1).max(200) })).max(30).default([]),
  status: z.enum(['draft', 'active', 'inactive']).default('active'),
};
export const productSchema = z.object(productFields).strict();
export const productPatchSchema = z
  .object({ ...productFields, status: z.enum(['draft', 'active', 'inactive']) })
  .partial()
  .strict();
export const stockSchema = z
  .object({ adjustment: z.number().int().min(-100000).max(100000).optional(), set: z.number().int().min(0).max(1_000_000).optional(), note: z.string().max(200).optional() })
  .refine((v) => (v.adjustment === undefined) !== (v.set === undefined), 'Provide exactly one of adjustment or set')
  .refine((v) => v.adjustment !== 0, 'Adjustment cannot be zero');
export const sellerProductQuery = z.object({
  ...paginationQuery,
  search: z.string().max(100).optional(),
  shop: objectId.optional(),
  status: z.enum(['draft', 'pending', 'active', 'inactive', 'blocked']).optional(),
  lowStock: bool.optional(),
});
export const adminProductPatchSchema = z
  .object({ status: z.enum(['draft', 'pending', 'active', 'inactive', 'blocked']).optional(), featured: z.boolean().optional() })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export const cartAddSchema = z.object({ productId: objectId, quantity: z.number().int().min(1).max(99).default(1) });
export const cartUpdateSchema = z.object({ quantity: z.number().int().min(1).max(99) });
export const cartQuery = z.object({ coupon: z.string().max(40).optional() });
export const wishlistAddSchema = z.object({ productId: objectId });

export const checkoutSchema = z.object({
  addressId: objectId,
  paymentMethod: z.enum(['card', 'paypal', 'cod']),
  paymentToken: z.string().max(100).optional(),
  couponCode: z.string().trim().max(40).optional(),
  idempotencyKey: z.string().min(8).max(100).optional(),
});
export const cancelSchema = z.object({ reason: z.string().trim().max(500).optional() });
export const returnSchema = z.object({
  sellerOrderId: objectId,
  items: z.array(z.object({ itemId: objectId, quantity: z.number().int().min(1) })).min(1),
  reason: z.string().trim().min(5).max(1000),
});
export const orderListQuery = z.object({ ...paginationQuery, status: z.string().max(40).optional(), search: z.string().max(60).optional() });

export const sellerOrderStatusSchema = z.object({
  status: z.enum(['processing', 'shipped', 'delivered', 'cancelled']),
  carrier: z.string().trim().max(60).optional(),
  trackingNumber: z.string().trim().max(80).optional(),
  trackingUrl: z.url().max(300).optional(),
});
export const trackingSchema = z.object({
  carrier: z.string().trim().min(2).max(60),
  trackingNumber: z.string().trim().min(3).max(80),
  trackingUrl: z.url().max(300).optional(),
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  comment: z.string().trim().min(3).max(2000),
});
export const reviewPatchSchema = reviewSchema.partial().extend({ status: z.enum(['published', 'hidden']).optional() });

export const adminUserQuery = z.object({
  ...paginationQuery,
  search: z.string().max(100).optional(),
  role: z.enum(['user', 'seller', 'admin']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
});
export const adminUserPatchSchema = z
  .object({
    status: z.enum(['active', 'inactive', 'suspended']).optional(),
    addRoles: z.array(z.enum(['seller', 'admin'])).optional(),
    removeRoles: z.array(z.enum(['user', 'seller', 'admin'])).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');
export const returnResolveSchema = z.object({ status: z.enum(['approved', 'rejected', 'refunded']), adminNotes: z.string().max(1000).optional() });

export const settingsSchema = z
  .object({
    marketplaceName: z.string().trim().min(2).max(60),
    tagline: z.string().trim().max(160),
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    commissionRate: z.number().min(0).max(100),
    shipping: z.object({ flatRate: z.number().min(0).max(1000), freeShippingThreshold: z.number().min(0).max(100000) }).partial(),
    tax: z.object({ rate: z.number().min(0).max(100) }).partial(),
    moderation: z.object({ requireProductApproval: z.boolean(), requireShopApproval: z.boolean() }).partial(),
    coupons: z
      .array(
        z.object({
          code: z.string().trim().min(3).max(30).regex(/^[A-Za-z0-9_-]+$/).transform((s) => s.toUpperCase()),
          percentOff: z.number().min(1).max(100),
          minSubtotal: z.number().min(0).default(0),
          active: z.boolean().default(true),
          expiresAt: z.coerce.date().optional(),
        }),
      )
      .max(50),
  })
  .partial()
  .strict();
