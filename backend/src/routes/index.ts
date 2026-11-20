import { Router } from 'express';
import { z } from 'zod';
import * as admin from '../controllers/admin.controller.js';
import * as authC from '../controllers/auth.controller.js';
import * as catalog from '../controllers/catalog.controller.js';
import * as seller from '../controllers/seller.controller.js';
import * as shopping from '../controllers/shopping.controller.js';
import * as userC from '../controllers/user.controller.js';
import { authenticate, optionalAuth, requireAdmin, requireSeller } from '../middleware/auth.js';
import { authLimiter } from '../middleware/security.js';
import { imageUpload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import * as v from '../validators/index.js';

const r = Router();
const q = (schema: z.ZodType) => validate(schema, 'query');
const body = (schema: z.ZodType) => validate(schema, 'body');
const pageQ = q(v.pageQuery);

// ---- Auth ----
r.post('/auth/register', authLimiter, body(v.registerSchema), authC.register);
r.post('/auth/login', authLimiter, body(v.loginSchema), authC.login);
r.post('/auth/refresh', authLimiter, authC.refresh);
r.post('/auth/logout', authC.logout);
r.get('/auth/me', authenticate, authC.me);

// ---- Public catalog ----
r.get('/settings/public', catalog.publicSettings);
r.get('/home', catalog.home);
r.get('/categories', catalog.listCategories);
r.get('/categories/:id', catalog.getCategory);
r.get('/products', q(v.productListQuery), catalog.listProducts);
r.get('/products/:id', catalog.getProduct);
r.get('/shops', q(v.pageQuery.extend({ search: z.string().max(100).optional(), seller: v.objectId.optional() })), catalog.listShops);
r.get('/shops/:id', catalog.getShop);
r.get('/products/:id/reviews', pageQ, catalog.listReviews);
r.get('/products/:id/reviews/me', authenticate, catalog.myReviewState);
r.post('/products/:id/reviews', authenticate, body(v.reviewSchema), catalog.createReview);
r.patch('/reviews/:id', authenticate, body(v.reviewPatchSchema), catalog.updateReview);
r.delete('/reviews/:id', authenticate, catalog.deleteReview);
void optionalAuth;

// ---- Buyer ----
r.get('/users/me', authenticate, userC.getMe);
r.patch('/users/me', authenticate, body(v.profileSchema), userC.updateMe);
r.get('/users/me/addresses', authenticate, userC.listAddresses);
r.post('/users/me/addresses', authenticate, body(v.addressSchema), userC.createAddress);
r.patch('/users/me/addresses/:id', authenticate, body(v.addressPatchSchema), userC.updateAddress);
r.delete('/users/me/addresses/:id', authenticate, userC.deleteAddress);

r.get('/notifications', authenticate, pageQ, userC.listNotifications);
r.post('/notifications/read-all', authenticate, userC.markAllNotifications);
r.patch('/notifications/:id/read', authenticate, userC.markNotification);

r.post('/seller-applications', authenticate, body(v.sellerApplicationSchema), userC.submitApplication);
r.get('/seller-applications/me', authenticate, userC.myApplication);

r.get('/cart', authenticate, q(v.cartQuery), shopping.getCart);
r.post('/cart/items', authenticate, body(v.cartAddSchema), shopping.addCartItem);
r.patch('/cart/items/:id', authenticate, body(v.cartUpdateSchema), shopping.updateCartItem);
r.delete('/cart/items/:id', authenticate, shopping.removeCartItem);
r.delete('/cart', authenticate, shopping.clearCart);

r.get('/wishlist', authenticate, shopping.getWishlist);
r.post('/wishlist/items', authenticate, body(v.wishlistAddSchema), shopping.addWishlist);
r.delete('/wishlist/items/:productId', authenticate, shopping.removeWishlist);
r.post('/wishlist/items/:productId/move-to-cart', authenticate, shopping.wishlistToCart);

r.post('/orders/checkout', authenticate, body(v.checkoutSchema), shopping.checkout);
r.get('/orders', authenticate, q(v.orderListQuery), shopping.listOrders);
r.get('/returns', authenticate, shopping.listReturns);
r.get('/orders/:id', authenticate, shopping.getOrder);
r.post('/orders/:id/cancel', authenticate, body(v.cancelSchema), shopping.cancelOrder);
r.post('/orders/:id/returns', authenticate, body(v.returnSchema), shopping.createReturn);

// ---- Seller ----
const s = Router();
s.use(authenticate, requireSeller);
s.get('/shops', seller.listShops);
s.post('/shops', body(v.shopSchema), seller.createShop);
s.get('/shops/:id', seller.getShop);
s.patch('/shops/:id', body(v.shopPatchSchema), seller.updateShop);
s.delete('/shops/:id', seller.deleteShop);
s.get('/products', q(v.sellerProductQuery), seller.listProducts);
s.post('/products', body(v.productSchema), seller.createProduct);
s.get('/products/:id', seller.getProduct);
s.patch('/products/:id', body(v.productPatchSchema), seller.updateProduct);
s.delete('/products/:id', seller.deleteProduct);
s.patch('/products/:id/stock', body(v.stockSchema), seller.adjustStock);
s.get('/products/:id/inventory', seller.inventoryHistory);
s.post('/uploads', imageUpload.array('images', 8), seller.uploadImages);
s.get('/orders', q(v.orderListQuery), seller.listOrders);
s.get('/orders/:id', seller.getOrder);
s.patch('/orders/:id/status', body(v.sellerOrderStatusSchema), seller.updateOrderStatus);
s.patch('/orders/:id/tracking', body(v.trackingSchema), seller.updateTracking);
s.get('/dashboard', seller.dashboardSummary);
s.get('/analytics', q(z.object({ days: z.coerce.number().int().min(7).max(90).default(30) })), seller.analytics);
s.get('/earnings', pageQ, seller.earnings);
s.get('/payouts', pageQ, seller.payouts);
s.post('/payouts', seller.requestPayout);
r.use('/seller', s);

// ---- Admin ----
const a = Router();
a.use(authenticate, requireAdmin);
a.get('/dashboard', admin.dashboardSummary);
a.get('/users', q(v.adminUserQuery), admin.listUsers);
a.get('/users/:id', admin.getUser);
a.patch('/users/:id', body(v.adminUserPatchSchema), admin.updateUser);
a.get('/audit-logs', admin.auditLogs);
a.get(
  '/seller-applications',
  q(v.pageQuery.extend({ status: z.enum(['pending', 'approved', 'rejected', 'suspended']).optional() })),
  admin.listApplications,
);
a.patch('/seller-applications/:id', body(v.reviewApplicationSchema), admin.reviewApplication);
a.get('/sellers', q(v.pageQuery.extend({ search: z.string().max(100).optional() })), admin.listSellers);
a.patch('/sellers/:id', body(v.sellerStateSchema), admin.updateSeller);
a.get(
  '/shops',
  q(v.pageQuery.extend({ search: z.string().max(100).optional(), status: z.string().optional(), seller: v.objectId.optional() })),
  admin.listShops,
);
a.patch('/shops/:id', body(v.adminShopPatchSchema), admin.updateShop);
a.get(
  '/products',
  q(
    v.pageQuery.extend({
      search: z.string().max(100).optional(),
      status: z.string().optional(),
      shop: v.objectId.optional(),
      seller: v.objectId.optional(),
      category: v.objectId.optional(),
    }),
  ),
  admin.listProducts,
);
a.patch('/products/:id', body(v.adminProductPatchSchema), admin.updateProduct);
a.get('/categories', admin.listAllCategories);
a.post('/categories', body(v.categorySchema), admin.createCategory);
a.patch('/categories/:id', body(v.categoryPatchSchema), admin.updateCategory);
a.delete('/categories/:id', admin.deleteCategory);
a.get('/orders', q(v.orderListQuery), admin.listOrders);
a.get('/orders/:id', admin.getOrder);
a.post('/seller-orders/:id/cancel', body(v.cancelSchema), admin.cancelSellerOrder);
a.get('/returns', q(v.pageQuery.extend({ status: z.string().optional() })), admin.listReturns);
a.patch('/returns/:id', body(v.returnResolveSchema), admin.resolveReturn);
a.get('/reviews', q(v.pageQuery.extend({ status: z.string().optional() })), admin.listReviews);
a.get('/settings', admin.getSettings);
a.patch('/settings', body(v.settingsSchema), admin.updateSettings);
r.use('/admin', a);

export default r;
