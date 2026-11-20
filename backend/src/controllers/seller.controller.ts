import type { Request } from 'express';
import * as dashboard from '../services/dashboard.service.js';
import * as products from '../services/product.service.js';
import * as sellerOrders from '../services/sellerOrder.service.js';
import * as shops from '../services/shop.service.js';
import { storeImage } from '../services/upload.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok, paginated } from '../utils/response.js';

const uid = (req: Request) => req.user!.id;

export const listShops = asyncHandler(async (req, res) => ok(res, 'Shops retrieved', await shops.listMine(uid(req))));
export const getShop = asyncHandler(async (req, res) => ok(res, 'Shop retrieved', await shops.getMine(uid(req), String(req.params.id))));
export const createShop = asyncHandler(async (req, res) => created(res, 'Shop created', await shops.create(uid(req), req.body)));
export const updateShop = asyncHandler(async (req, res) =>
  ok(res, 'Shop updated', await shops.updateMine(uid(req), String(req.params.id), req.body)),
);
export const deleteShop = asyncHandler(async (req, res) =>
  ok(res, 'Shop deactivated', await shops.deactivateMine(uid(req), String(req.params.id))),
);

export const listProducts = asyncHandler(async (req, res) => {
  const r = await products.listForSeller(uid(req), req.valid.query);
  return paginated(res, 'Products retrieved', r.data, r.pagination);
});
export const getProduct = asyncHandler(async (req, res) =>
  ok(res, 'Product retrieved', await products.getForSeller(uid(req), String(req.params.id))),
);
export const createProduct = asyncHandler(async (req, res) =>
  created(res, 'Product created', await products.createForSeller(uid(req), req.body)),
);
export const updateProduct = asyncHandler(async (req, res) =>
  ok(res, 'Product updated', await products.updateForSeller(uid(req), String(req.params.id), req.body)),
);
export const deleteProduct = asyncHandler(async (req, res) => {
  await products.removeForSeller(uid(req), String(req.params.id));
  return ok(res, 'Product deleted');
});
export const adjustStock = asyncHandler(async (req, res) =>
  ok(res, 'Stock updated', await products.adjustStock(uid(req), String(req.params.id), req.body)),
);
export const inventoryHistory = asyncHandler(async (req, res) =>
  ok(res, 'Inventory history', await products.inventoryHistory(uid(req), String(req.params.id))),
);

export const listOrders = asyncHandler(async (req, res) => {
  const r = await sellerOrders.list(uid(req), req.valid.query);
  return paginated(res, 'Orders retrieved', r.data, r.pagination);
});
export const getOrder = asyncHandler(async (req, res) =>
  ok(res, 'Order retrieved', await sellerOrders.get(uid(req), String(req.params.id))),
);
export const updateOrderStatus = asyncHandler(async (req, res) =>
  ok(res, 'Order status updated', await sellerOrders.updateStatus(uid(req), String(req.params.id), req.body)),
);
export const updateTracking = asyncHandler(async (req, res) =>
  ok(res, 'Tracking updated', await sellerOrders.updateTracking(uid(req), String(req.params.id), req.body)),
);

export const dashboardSummary = asyncHandler(async (req, res) => ok(res, 'Dashboard retrieved', await dashboard.sellerDashboard(uid(req))));
export const analytics = asyncHandler(async (req, res) =>
  ok(res, 'Analytics retrieved', await dashboard.sellerAnalytics(uid(req), req.valid.query.days)),
);
export const earnings = asyncHandler(async (req, res) =>
  ok(res, 'Earnings retrieved (simulated)', await dashboard.sellerEarnings(uid(req), req.valid.query)),
);
export const payouts = asyncHandler(async (req, res) =>
  ok(res, 'Payouts retrieved (simulated)', await dashboard.sellerPayouts(uid(req), req.valid.query)),
);
export const requestPayout = asyncHandler(async (req, res) =>
  created(res, 'Simulated payout created', await dashboard.requestPayout(uid(req))),
);

export const uploadImages = asyncHandler(async (req, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) throw ApiError.badRequest('No image files were uploaded (field name: images)');
  const stored = [];
  for (const f of files) stored.push(await storeImage(f, `marketplace/${uid(req)}`));
  return created(res, 'Images uploaded', stored);
});
