import { randomUUID } from 'node:crypto';
import * as cart from '../services/cart.service.js';
import * as orders from '../services/order.service.js';
import * as returns from '../services/return.service.js';
import * as wishlist from '../services/wishlist.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok, paginated } from '../utils/response.js';

export const getCart = asyncHandler(async (req, res) => ok(res, 'Cart retrieved', await cart.view(req.user!.id, req.valid.query?.coupon)));
export const addCartItem = asyncHandler(async (req, res) =>
  created(res, 'Item added to cart', await cart.addItem(req.user!.id, req.body.productId, req.body.quantity)),
);
export const updateCartItem = asyncHandler(async (req, res) =>
  ok(res, 'Cart updated', await cart.updateItem(req.user!.id, String(req.params.id), req.body.quantity)),
);
export const removeCartItem = asyncHandler(async (req, res) =>
  ok(res, 'Item removed', await cart.removeItem(req.user!.id, String(req.params.id))),
);
export const clearCart = asyncHandler(async (req, res) => {
  await cart.clear(req.user!.id);
  return ok(res, 'Cart cleared');
});

export const getWishlist = asyncHandler(async (req, res) => ok(res, 'Wishlist retrieved', await wishlist.view(req.user!.id)));
export const addWishlist = asyncHandler(async (req, res) =>
  ok(res, 'Added to wishlist', await wishlist.add(req.user!.id, req.body.productId)),
);
export const removeWishlist = asyncHandler(async (req, res) =>
  ok(res, 'Removed from wishlist', await wishlist.remove(req.user!.id, String(req.params.productId))),
);
export const wishlistToCart = asyncHandler(async (req, res) =>
  ok(res, 'Moved to cart', await wishlist.moveToCart(req.user!.id, String(req.params.productId))),
);

export const checkout = asyncHandler(async (req, res) => {
  const key = (req.header('Idempotency-Key') ?? req.body.idempotencyKey ?? randomUUID()) as string;
  const r = await orders.checkout(req.user!.id, { ...req.body, idempotencyKey: key });
  return r.duplicate
    ? ok(res, 'Duplicate checkout request: returning the original order', r.order)
    : created(res, 'Order placed successfully', r.order);
});
export const listOrders = asyncHandler(async (req, res) => {
  const r = await orders.listBuyer(req.user!.id, req.valid.query);
  return paginated(res, 'Orders retrieved', r.data, r.pagination);
});
export const getOrder = asyncHandler(async (req, res) =>
  ok(res, 'Order retrieved', await orders.getBuyer(req.user!.id, String(req.params.id))),
);
export const cancelOrder = asyncHandler(async (req, res) =>
  ok(res, 'Cancellation processed', await orders.cancelByBuyer(req.user!.id, String(req.params.id), req.body?.reason)),
);
export const createReturn = asyncHandler(async (req, res) =>
  created(res, 'Return requested', await returns.create(req.user!.id, String(req.params.id), req.body)),
);
export const listReturns = asyncHandler(async (req, res) => ok(res, 'Returns retrieved', await returns.listBuyer(req.user!.id)));
