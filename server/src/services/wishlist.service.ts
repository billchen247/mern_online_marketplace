import { Product, Wishlist } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { decorate } from './product.service.js';
import * as cartService from './cart.service.js';

async function getOrCreate(userId: string) {
  return (await Wishlist.findOne({ user: userId })) ?? (await Wishlist.create({ user: userId, products: [] }));
}

export async function view(userId: string) {
  const w = await getOrCreate(userId);
  const products = await Product.find({ _id: { $in: w.products }, deletedAt: null }).populate('shop', 'name slug');
  return products.map(decorate);
}

export async function add(userId: string, productId: string) {
  const p = await Product.findOne({ _id: productId, status: 'active', deletedAt: null });
  if (!p) throw ApiError.notFound('Product not found');
  await Wishlist.updateOne({ user: userId }, { $addToSet: { products: p._id } }, { upsert: true });
  return view(userId);
}

export async function remove(userId: string, productId: string) {
  await Wishlist.updateOne({ user: userId }, { $pull: { products: productId } });
  return view(userId);
}

export async function moveToCart(userId: string, productId: string) {
  await cartService.addItem(userId, productId, 1);
  await Wishlist.updateOne({ user: userId }, { $pull: { products: productId } });
  return view(userId);
}
