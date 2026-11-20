import * as categories from '../services/category.service.js';
import * as adminUsers from '../services/adminUser.service.js';
import * as dashboard from '../services/dashboard.service.js';
import * as orders from '../services/order.service.js';
import * as products from '../services/product.service.js';
import * as returns from '../services/return.service.js';
import * as reviews from '../services/review.service.js';
import * as sellerApps from '../services/sellerApplication.service.js';
import * as settings from '../services/settings.service.js';
import * as shops from '../services/shop.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok, paginated } from '../utils/response.js';

const admin = (req: any) => req.user!.id as string;

export const dashboardSummary = asyncHandler(async (_req, res) => ok(res, 'Dashboard retrieved', await dashboard.adminDashboard()));

export const listUsers = asyncHandler(async (req, res) => {
  const r = await adminUsers.list(req.valid.query);
  return paginated(res, 'Users retrieved', r.data, r.pagination);
});
export const getUser = asyncHandler(async (req, res) => ok(res, 'User retrieved', await adminUsers.get(String(req.params.id))));
export const updateUser = asyncHandler(async (req, res) =>
  ok(res, 'User updated', await adminUsers.update(admin(req), String(req.params.id), req.body)),
);
export const auditLogs = asyncHandler(async (_req, res) => ok(res, 'Audit log retrieved', await adminUsers.auditLogs()));

export const listApplications = asyncHandler(async (req, res) => {
  const r = await sellerApps.adminList(req.valid.query);
  return paginated(res, 'Applications retrieved', r.data, r.pagination);
});
export const reviewApplication = asyncHandler(async (req, res) =>
  ok(res, 'Application reviewed', await sellerApps.review(admin(req), String(req.params.id), req.body)),
);
export const listSellers = asyncHandler(async (req, res) => {
  const r = await sellerApps.listSellers(req.valid.query);
  return paginated(res, 'Sellers retrieved', r.data, r.pagination);
});
export const updateSeller = asyncHandler(async (req, res) =>
  ok(res, 'Seller updated', await sellerApps.setSellerState(admin(req), String(req.params.id), req.body.action, req.body.notes)),
);

export const listShops = asyncHandler(async (req, res) => {
  const r = await shops.adminList(req.valid.query);
  return paginated(res, 'Shops retrieved', r.data, r.pagination);
});
export const updateShop = asyncHandler(async (req, res) =>
  ok(res, 'Shop updated', await shops.adminUpdate(admin(req), String(req.params.id), req.body)),
);

export const listProducts = asyncHandler(async (req, res) => {
  const r = await products.adminList(req.valid.query);
  return paginated(res, 'Products retrieved', r.data, r.pagination);
});
export const updateProduct = asyncHandler(async (req, res) =>
  ok(res, 'Product updated', await products.adminUpdate(admin(req), String(req.params.id), req.body)),
);

export const listAllCategories = asyncHandler(async (_req, res) => ok(res, 'Categories retrieved', await categories.list(true)));
export const createCategory = asyncHandler(async (req, res) => created(res, 'Category created', await categories.create(req.body)));
export const updateCategory = asyncHandler(async (req, res) =>
  ok(res, 'Category updated', await categories.update(String(req.params.id), req.body)),
);
export const deleteCategory = asyncHandler(async (req, res) => {
  await categories.remove(String(req.params.id));
  return ok(res, 'Category deleted');
});

export const listOrders = asyncHandler(async (req, res) => {
  const r = await orders.adminList(req.valid.query);
  return paginated(res, 'Orders retrieved', r.data, r.pagination);
});
export const getOrder = asyncHandler(async (req, res) => ok(res, 'Order retrieved', await orders.adminGet(String(req.params.id))));
export const cancelSellerOrder = asyncHandler(async (req, res) =>
  ok(res, 'Seller order cancelled', await orders.adminCancelSellerOrder(String(req.params.id), req.body?.reason)),
);

export const listReturns = asyncHandler(async (req, res) => {
  const r = await returns.adminList(req.valid.query);
  return paginated(res, 'Returns retrieved', r.data, r.pagination);
});
export const resolveReturn = asyncHandler(async (req, res) =>
  ok(res, 'Return updated', await returns.adminResolve(admin(req), String(req.params.id), req.body)),
);

export const listReviews = asyncHandler(async (req, res) => {
  const r = await reviews.adminList(req.valid.query);
  return paginated(res, 'Reviews retrieved', r.data, r.pagination);
});

export const getSettings = asyncHandler(async (_req, res) => ok(res, 'Settings retrieved', await settings.getSettings()));
export const updateSettings = asyncHandler(async (req, res) => ok(res, 'Settings updated', await settings.updateSettings(req.body)));
