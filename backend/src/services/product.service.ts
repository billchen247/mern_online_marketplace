import { Category, InventoryLog, Product, Shop } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { compact, escapeRegex, randomSuffix, slugify } from '../utils/helpers.js';
import { effectivePrice } from '../utils/pricing.js';
import { buildPagination } from '../utils/response.js';
import { audit } from './audit.service.js';
import { getSettings } from './settings.service.js';
import { assertOwnsShop, inactiveShopIds } from './shop.service.js';
import { deleteImage } from './upload.service.js';

export interface ProductQuery {
  search?: string;
  category?: string;
  shop?: string;
  seller?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStock?: boolean;
  featured?: boolean;
  sortBy: 'price' | 'popularity' | 'rating' | 'newest';
  order: 'asc' | 'desc';
  page: number;
  limit: number;
}

const SORT_FIELD = { price: 'price', popularity: 'salesCount', rating: 'ratingAverage', newest: 'createdAt' } as const;

export function decorate(p: any) {
  const o = typeof p.toObject === 'function' ? p.toObject() : p;
  return { ...o, finalPrice: effectivePrice(o.price, o.discount), inStock: o.stock > 0 };
}

async function categoryIds(idOrSlug: string): Promise<string[]> {
  const cat = /^[a-f0-9]{24}$/.test(idOrSlug) ? await Category.findById(idOrSlug) : await Category.findOne({ slug: idOrSlug });
  if (!cat) return [];
  const children = await Category.find({ parentCategory: cat._id }).distinct('_id');
  return [String(cat._id), ...children.map(String)];
}

export async function listPublic(q: ProductQuery) {
  const filter: Record<string, any> = { status: 'active', deletedAt: null };
  const hidden = await inactiveShopIds();
  if (hidden.length) filter.shop = { $nin: hidden };
  if (q.shop) filter.shop = Object.assign({}, filter.shop, { $eq: q.shop });
  if (q.seller) filter.seller = q.seller;
  if (q.category) filter.category = { $in: await categoryIds(q.category) };
  if (q.search) {
    const re = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ name: re }, { description: re }];
  }
  if (q.minPrice !== undefined || q.maxPrice !== undefined) {
    filter.price = {
      ...(q.minPrice !== undefined && { $gte: q.minPrice }),
      ...(q.maxPrice !== undefined && { $lte: q.maxPrice }),
    };
  }
  if (q.minRating) filter.ratingAverage = { $gte: q.minRating };
  if (q.inStock) filter.stock = { $gt: 0 };
  if (q.featured) filter.featured = true;
  const dir = q.order === 'asc' ? 1 : -1;
  const sort: Record<string, 1 | -1> = { [SORT_FIELD[q.sortBy]]: dir, _id: -1 };
  const [data, total] = await Promise.all([
    Product.find(filter)
      .populate('shop', 'name slug logo')
      .populate('category', 'name slug')
      .sort(sort)
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    Product.countDocuments(filter),
  ]);
  return { data: data.map(decorate), pagination: buildPagination(q.page, q.limit, total) };
}

export async function getPublic(idOrSlug: string) {
  const p = /^[a-f0-9]{24}$/.test(idOrSlug) ? await Product.findById(idOrSlug) : await Product.findOne({ slug: idOrSlug });
  if (!p || p.deletedAt || p.status !== 'active') throw ApiError.notFound('Product not found');
  await p.populate([
    { path: 'shop', select: 'name slug logo description status contact' },
    { path: 'category', select: 'name slug' },
    { path: 'seller', select: 'name' },
  ]);
  if ((p.shop as any)?.status !== 'active') throw ApiError.notFound('Product not found');
  const related = await Product.find({ category: (p.category as any)._id, _id: { $ne: p._id }, status: 'active', deletedAt: null, shop: { $nin: await inactiveShopIds() } })
    .populate('shop', 'name slug')
    .sort({ ratingAverage: -1, salesCount: -1 })
    .limit(8);
  return { ...decorate(p), related: related.map(decorate) };
}

export async function home() {
  const base = async (sort: Record<string, 1 | -1>, extra: Record<string, any> = {}, limit = 8) => {
    const hidden = await inactiveShopIds();
    const items = await Product.find({ status: 'active', deletedAt: null, ...(hidden.length && { shop: { $nin: hidden } }), ...extra })
      .populate('shop', 'name slug')
      .sort(sort)
      .limit(limit);
    return items.map(decorate);
  };
  const [featured, popular, newArrivals, recommended, shops, categories] = await Promise.all([
    base({ ratingAverage: -1, salesCount: -1 }, { featured: true }),
    base({ salesCount: -1 }),
    base({ createdAt: -1 }),
    base({ ratingAverage: -1, ratingCount: -1 }, { ratingCount: { $gt: 0 } }),
    Shop.find({ status: 'active' }).sort({ createdAt: -1 }).limit(6),
    Category.find({ status: 'active', parentCategory: null }).sort({ name: 1 }),
  ]);
  return { featured, popular, newArrivals, recommended, shops, categories };
}

// ---------- Seller management ----------

async function assertCategory(id: string) {
  const c = await Category.findOne({ _id: id, status: 'active' });
  if (!c) throw ApiError.badRequest('Category does not exist or is inactive');
}

export async function assertOwnsProduct(sellerId: string, id: string) {
  const p = await Product.findById(id);
  if (!p || p.deletedAt || String(p.seller) !== String(sellerId)) throw ApiError.notFound('Product not found');
  return p;
}

export async function createForSeller(sellerId: string, input: Record<string, any>) {
  const shop = await assertOwnsShop(sellerId, input.shop);
  if (shop.status === 'suspended') throw ApiError.forbidden('This shop is suspended');
  await assertCategory(input.category);
  const settings = await getSettings();
  let slug = slugify(input.name);
  if (await Product.exists({ slug })) slug = `${slug}-${randomSuffix()}`;
  const status = input.status === 'active' && settings.moderation!.requireProductApproval ? 'pending' : (input.status ?? 'active');
  try {
    const product = await Product.create({ ...input, seller: sellerId, shop: shop._id, slug, status });
    await InventoryLog.create({ product: product._id, seller: sellerId, change: product.stock, resultingStock: product.stock, reason: 'initial', actor: sellerId });
    return product;
  } catch (e: any) {
    if (e.code === 11000) throw ApiError.conflict('SKU already exists in this shop');
    throw e;
  }
}

export async function updateForSeller(sellerId: string, id: string, input: Record<string, any>) {
  const p = await assertOwnsProduct(sellerId, id);
  if (p.status === 'blocked' && input.status) throw ApiError.forbidden('This product was blocked by moderation');
  if (input.shop && String(input.shop) !== String(p.shop)) {
    await assertOwnsShop(sellerId, input.shop);
  }
  if (input.category) await assertCategory(input.category);
  const settings = await getSettings();
  if (input.status === 'active' && p.status !== 'active' && settings.moderation!.requireProductApproval) input.status = 'pending';
  const before = p.stock;
  const oldImages = (p.images ?? []).map((i) => i.publicId).filter(Boolean) as string[];
  p.set(compact(input));
  try {
    await p.save();
  } catch (e: any) {
    if (e.code === 11000) throw ApiError.conflict('SKU already exists in this shop');
    throw e;
  }
  if (input.stock !== undefined && input.stock !== before) {
    await InventoryLog.create({ product: p._id, seller: sellerId, change: p.stock - before, resultingStock: p.stock, reason: 'adjustment', actor: sellerId });
  }
  if (input.images) {
    const kept = new Set((input.images as any[]).map((i) => i.publicId));
    await Promise.all(oldImages.filter((x) => !kept.has(x)).map(deleteImage));
  }
  return p;
}

export async function adjustStock(sellerId: string, id: string, input: { adjustment?: number; set?: number; note?: string }) {
  await assertOwnsProduct(sellerId, id);
  let updated;
  if (input.set !== undefined) {
    updated = await Product.findByIdAndUpdate(id, { $set: { stock: input.set } }, { new: true });
  } else {
    // Atomic conditional decrement: never allows negative stock.
    updated = await Product.findOneAndUpdate(
      { _id: id, ...(input.adjustment! < 0 && { stock: { $gte: -input.adjustment! } }) },
      { $inc: { stock: input.adjustment! } },
      { new: true },
    );
    if (!updated) throw ApiError.badRequest('Adjustment would make stock negative');
  }
  const prev = input.set !== undefined ? undefined : updated!.stock - input.adjustment!;
  await InventoryLog.create({
    product: id,
    seller: sellerId,
    change: input.set !== undefined ? 0 : input.adjustment,
    resultingStock: updated!.stock,
    reason: 'adjustment',
    note: input.note ?? (input.set !== undefined ? `Stock set to ${input.set}` : undefined),
    actor: sellerId,
  });
  void prev;
  return updated!;
}

export async function inventoryHistory(sellerId: string, id: string) {
  await assertOwnsProduct(sellerId, id);
  return InventoryLog.find({ product: id }).sort({ createdAt: -1 }).limit(50);
}

export async function removeForSeller(sellerId: string, id: string) {
  const p = await assertOwnsProduct(sellerId, id);
  p.deletedAt = new Date();
  p.status = 'inactive';
  await p.save();
}

export async function listForSeller(sellerId: string, q: { search?: string; shop?: string; status?: string; lowStock?: boolean; page: number; limit: number }) {
  const filter: Record<string, any> = { seller: sellerId, deletedAt: null };
  if (q.shop) filter.shop = q.shop;
  if (q.status) filter.status = q.status;
  if (q.search) filter.name = new RegExp(escapeRegex(q.search), 'i');
  if (q.lowStock) filter.$expr = { $lte: ['$stock', '$lowStockThreshold'] };
  const [data, total] = await Promise.all([
    Product.find(filter).populate('shop', 'name').populate('category', 'name').sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit),
    Product.countDocuments(filter),
  ]);
  return { data: data.map(decorate), pagination: buildPagination(q.page, q.limit, total) };
}

export async function getForSeller(sellerId: string, id: string) {
  const p = await assertOwnsProduct(sellerId, id);
  return decorate(p);
}

// ---------- Admin ----------

export async function adminList(q: { search?: string; status?: string; shop?: string; seller?: string; category?: string; page: number; limit: number }) {
  const filter: Record<string, any> = { deletedAt: null };
  for (const k of ['status', 'shop', 'seller', 'category'] as const) if (q[k]) filter[k] = q[k];
  if (q.search) filter.name = new RegExp(escapeRegex(q.search), 'i');
  const [data, total] = await Promise.all([
    Product.find(filter).populate('shop', 'name').populate('seller', 'name').populate('category', 'name').sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit),
    Product.countDocuments(filter),
  ]);
  return { data: data.map(decorate), pagination: buildPagination(q.page, q.limit, total) };
}

export async function adminUpdate(adminId: string, id: string, input: Record<string, any>) {
  const p = await Product.findById(id);
  if (!p || p.deletedAt) throw ApiError.notFound('Product not found');
  p.set(compact(input));
  await p.save();
  await audit(adminId, 'product.moderate', 'Product', p._id, input);
  return p;
}
