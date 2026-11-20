import * as categories from '../services/category.service.js';
import * as products from '../services/product.service.js';
import * as shops from '../services/shop.service.js';
import * as reviews from '../services/review.service.js';
import * as settings from '../services/settings.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok, paginated } from '../utils/response.js';

export const publicSettings = asyncHandler(async (_req, res) => ok(res, 'Settings retrieved', await settings.getPublicSettings()));
export const home = asyncHandler(async (_req, res) => ok(res, 'Home retrieved', await products.home()));

export const listCategories = asyncHandler(async (_req, res) => ok(res, 'Categories retrieved', await categories.list()));
export const getCategory = asyncHandler(async (req, res) => ok(res, 'Category retrieved', await categories.get(String(req.params.id))));

export const listProducts = asyncHandler(async (req, res) => {
  const r = await products.listPublic(req.valid.query);
  return paginated(res, 'Products retrieved successfully', r.data, r.pagination);
});
export const getProduct = asyncHandler(async (req, res) => ok(res, 'Product retrieved', await products.getPublic(String(req.params.id))));

export const listShops = asyncHandler(async (req, res) => {
  const r = await shops.listPublic(req.valid.query);
  return paginated(res, 'Shops retrieved successfully', r.data, r.pagination);
});
export const getShop = asyncHandler(async (req, res) => ok(res, 'Shop retrieved', await shops.getPublic(String(req.params.id))));

export const listReviews = asyncHandler(async (req, res) => {
  const r = await reviews.list(String(req.params.id), req.valid.query);
  return paginated(res, 'Reviews retrieved', r.data, r.pagination);
});
export const myReviewState = asyncHandler(async (req, res) =>
  ok(res, 'Review eligibility', await reviews.eligibility(req.user!.id, String(req.params.id))),
);
export const createReview = asyncHandler(async (req, res) =>
  created(res, 'Review submitted', await reviews.create(req.user!.id, String(req.params.id), req.body)),
);
export const updateReview = asyncHandler(async (req, res) =>
  ok(res, 'Review updated', await reviews.update(req.user!, String(req.params.id), req.body)),
);
export const deleteReview = asyncHandler(async (req, res) => {
  await reviews.remove(req.user!, String(req.params.id));
  return ok(res, 'Review deleted');
});
