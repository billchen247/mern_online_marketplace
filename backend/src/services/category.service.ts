import { Category, Product } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { compact, randomSuffix, slugify } from '../utils/helpers.js';

export const list = (includeInactive = false) => Category.find(includeInactive ? {} : { status: 'active' }).sort({ name: 1 });

export async function get(idOrSlug: string) {
  const c = /^[a-f0-9]{24}$/.test(idOrSlug) ? await Category.findById(idOrSlug) : await Category.findOne({ slug: idOrSlug });
  if (!c) throw ApiError.notFound('Category not found');
  return c;
}

async function assertParent(parent: string | null | undefined, selfId?: string) {
  if (!parent) return;
  if (selfId && parent === selfId) throw ApiError.badRequest('A category cannot be its own parent');
  if (!(await Category.exists({ _id: parent }))) throw ApiError.badRequest('Parent category does not exist');
}

export async function create(input: Record<string, any>) {
  await assertParent(input.parentCategory);
  let slug = slugify(input.name);
  if (await Category.exists({ slug })) slug = `${slug}-${randomSuffix()}`;
  return Category.create({ ...input, slug });
}

export async function update(id: string, input: Record<string, any>) {
  const c = await Category.findById(id);
  if (!c) throw ApiError.notFound('Category not found');
  await assertParent(input.parentCategory, id);
  c.set(compact(input));
  if (input.name)
    c.slug = (await Category.exists({ slug: slugify(input.name), _id: { $ne: id } }))
      ? `${slugify(input.name)}-${randomSuffix()}`
      : slugify(input.name);
  await c.save();
  return c;
}

export async function remove(id: string) {
  const c = await Category.findById(id);
  if (!c) throw ApiError.notFound('Category not found');
  const [products, children] = await Promise.all([
    Product.countDocuments({ category: id, deletedAt: null }),
    Category.countDocuments({ parentCategory: id }),
  ]);
  if (products > 0) throw ApiError.conflict('Category has products; reassign or deactivate it instead', 'CATEGORY_IN_USE');
  if (children > 0) throw ApiError.conflict('Category has sub-categories; remove them first', 'CATEGORY_IN_USE');
  await c.deleteOne();
}
