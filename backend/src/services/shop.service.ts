import { Product, Shop } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { compact, escapeRegex, randomSuffix, slugify } from '../utils/helpers.js';
import { buildPagination } from '../utils/response.js';
import { audit } from './audit.service.js';
import { getSettings } from './settings.service.js';
import { deleteImage } from './upload.service.js';

export async function assertOwnsShop(sellerId: string, shopId: string) {
  const shop = await Shop.findById(shopId);
  // 404 (not 403) so sellers cannot probe for other sellers' shop ids.
  if (!shop || String(shop.seller) !== String(sellerId)) throw ApiError.notFound('Shop not found');
  return shop;
}

export async function inactiveShopIds() {
  return Shop.find({ status: { $ne: 'active' } }).distinct('_id');
}

export async function listPublic(q: { search?: string; page: number; limit: number; seller?: string }) {
  const filter: Record<string, any> = { status: 'active' };
  if (q.seller) filter.seller = q.seller;
  if (q.search) filter.name = new RegExp(escapeRegex(q.search), 'i');
  const [data, total] = await Promise.all([
    Shop.find(filter)
      .populate('seller', 'name')
      .sort({ createdAt: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    Shop.countDocuments(filter),
  ]);
  const counts = await Product.aggregate([
    { $match: { shop: { $in: data.map((s) => s._id) }, status: 'active', deletedAt: null } },
    { $group: { _id: '$shop', n: { $sum: 1 } } },
  ]);
  const map = new Map(counts.map((c) => [String(c._id), c.n]));
  return {
    data: data.map((s) => ({ ...s.toObject(), productCount: map.get(String(s._id)) ?? 0 })),
    pagination: buildPagination(q.page, q.limit, total),
  };
}

export async function getPublic(idOrSlug: string) {
  const shop = /^[a-f0-9]{24}$/.test(idOrSlug) ? await Shop.findById(idOrSlug) : await Shop.findOne({ slug: idOrSlug });
  if (!shop || shop.status !== 'active') throw ApiError.notFound('Shop not found');
  await shop.populate('seller', 'name');
  await shop.populate('categories', 'name slug');
  return shop;
}

async function uniqueSlug(name: string) {
  let slug = slugify(name);
  if (await Shop.exists({ slug })) slug = `${slug}-${randomSuffix()}`;
  return slug;
}

export async function create(sellerId: string, input: Record<string, any>) {
  const settings = await getSettings();
  return Shop.create({
    ...input,
    seller: sellerId, // always from auth context
    slug: await uniqueSlug(input.name),
    status: settings.moderation!.requireShopApproval ? 'pending' : 'active',
  });
}

export const listMine = (sellerId: string) => Shop.find({ seller: sellerId }).sort({ createdAt: -1 });

export async function getMine(sellerId: string, id: string) {
  return assertOwnsShop(sellerId, id);
}

export async function updateMine(sellerId: string, id: string, input: Record<string, any>) {
  const shop = await assertOwnsShop(sellerId, id);
  if (shop.status === 'suspended' && input.status) throw ApiError.forbidden('Suspended shops can only be reactivated by an administrator');
  if (input.status && !['active', 'inactive'].includes(input.status)) throw ApiError.badRequest('Invalid status');
  if (input.status === 'active' && shop.status === 'pending') throw ApiError.forbidden('Shop is awaiting moderation approval');
  const oldLogo = shop.logo?.publicId;
  const oldBanner = shop.banner?.publicId;
  const { name, ...rest } = input;
  shop.set(compact(rest));
  if (name && name !== shop.name) {
    shop.name = name;
  }
  await shop.save();
  if (input.logo && oldLogo && oldLogo !== input.logo.publicId) await deleteImage(oldLogo);
  if (input.banner && oldBanner && oldBanner !== input.banner.publicId) await deleteImage(oldBanner);
  return shop;
}

/** "Delete" deactivates the shop: order history references products/shops and must remain intact. */
export async function deactivateMine(sellerId: string, id: string) {
  const shop = await assertOwnsShop(sellerId, id);
  if (shop.status !== 'suspended') shop.status = 'inactive';
  await shop.save();
  return shop;
}

export async function adminList(q: { search?: string; status?: string; seller?: string; page: number; limit: number }) {
  const filter: Record<string, any> = {};
  if (q.status) filter.status = q.status;
  if (q.seller) filter.seller = q.seller;
  if (q.search) filter.name = new RegExp(escapeRegex(q.search), 'i');
  const [data, total] = await Promise.all([
    Shop.find(filter)
      .populate('seller', 'name email')
      .sort({ createdAt: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    Shop.countDocuments(filter),
  ]);
  return { data, pagination: buildPagination(q.page, q.limit, total) };
}

export async function adminUpdate(adminId: string, id: string, input: Record<string, any>) {
  const shop = await Shop.findById(id);
  if (!shop) throw ApiError.notFound('Shop not found');
  shop.set(compact(input));
  await shop.save();
  await audit(adminId, 'shop.update', 'Shop', shop._id, input);
  return shop;
}
