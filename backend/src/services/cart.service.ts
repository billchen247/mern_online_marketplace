import { Cart, Product } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { effectivePrice } from '../utils/pricing.js';
import { priceLines } from './pricing.service.js';
import { getSettings } from './settings.service.js';
import { inactiveShopIds } from './shop.service.js';

async function getOrCreate(userId: string) {
  return (await Cart.findOne({ user: userId })) ?? (await Cart.create({ user: userId, items: [] }));
}

async function purchasable(productId: string, userId: string) {
  const p = await Product.findById(productId);
  if (!p || p.deletedAt || p.status !== 'active') throw ApiError.notFound('Product is not available');
  if ((await inactiveShopIds()).some((id) => String(id) === String(p.shop))) throw ApiError.notFound('Product is not available');
  if (String(p.seller) === String(userId)) throw ApiError.badRequest('You cannot purchase your own products');
  return p;
}

export async function view(userId: string, couponCode?: string) {
  const cart = await getOrCreate(userId);
  const ids = cart.items.map((i) => i.product);
  const products = await Product.find({ _id: { $in: ids } }).populate('shop', 'name slug status');
  const hidden = new Set((await inactiveShopIds()).map(String));
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const items = cart.items.map((i) => {
    const p = byId.get(String(i.product));
    const live = Boolean(p && !p.deletedAt && p.status === 'active' && !hidden.has(String((p.shop as any)?._id ?? p.shop)));
    const available = live && p!.stock >= 1;
    return {
      id: String(i._id),
      quantity: i.quantity,
      product: p
        ? {
            id: String(p._id),
            name: p.name,
            slug: p.slug,
            image: p.images?.[0]?.url,
            price: p.price,
            discount: p.discount,
            finalPrice: effectivePrice(p.price, p.discount),
            stock: p.stock,
            shop: { id: String((p.shop as any)._id), name: (p.shop as any).name },
          }
        : null,
      available,
      issue: !live ? 'This product is no longer available' : p!.stock < i.quantity ? `Only ${p!.stock} left in stock` : null,
    };
  });
  const settings = await getSettings();
  const valid = cart.items
    .map((i) => ({ product: byId.get(String(i.product)), quantity: i.quantity }))
    .filter((l) => l.product && !l.product.deletedAt && l.product.status === 'active') as any[];
  const pricing = priceLines(valid, settings, couponCode);
  return {
    items,
    summary: {
      subtotal: pricing.subtotal,
      discount: pricing.discount,
      shippingFee: pricing.shippingFee,
      tax: pricing.tax,
      total: pricing.total,
      couponCode: pricing.couponCode,
      itemCount: items.reduce((n, i) => n + i.quantity, 0),
      sellerCount: pricing.sellers.length,
      estimated: true,
    },
    hasIssues: items.some((i) => i.issue),
  };
}

export async function addItem(userId: string, productId: string, quantity: number) {
  const p = await purchasable(productId, userId);
  const cart = await getOrCreate(userId);
  const existing = cart.items.find((i) => String(i.product) === String(p._id));
  const newQty = (existing?.quantity ?? 0) + quantity;
  if (newQty > p.stock)
    throw ApiError.conflict(p.stock === 0 ? 'Product is out of stock' : `Only ${p.stock} available in stock`, 'INSUFFICIENT_STOCK');
  if (newQty > 99) throw ApiError.badRequest('Maximum quantity per item is 99');
  if (existing) existing.quantity = newQty;
  else cart.items.push({ product: p._id, shop: p.shop, seller: p.seller, quantity } as any);
  await cart.save();
  return view(userId);
}

export async function updateItem(userId: string, itemId: string, quantity: number) {
  const cart = await getOrCreate(userId);
  const item = cart.items.id(itemId);
  if (!item) throw ApiError.notFound('Cart item not found');
  const p = await purchasable(String(item.product), userId);
  if (quantity > p.stock) throw ApiError.conflict(`Only ${p.stock} available in stock`, 'INSUFFICIENT_STOCK');
  item.quantity = quantity;
  await cart.save();
  return view(userId);
}

export async function removeItem(userId: string, itemId: string) {
  const cart = await getOrCreate(userId);
  const item = cart.items.id(itemId);
  if (!item) throw ApiError.notFound('Cart item not found');
  item.deleteOne();
  await cart.save();
  return view(userId);
}

export async function clear(userId: string) {
  await Cart.updateOne({ user: userId }, { $set: { items: [] } });
}
