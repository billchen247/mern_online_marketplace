import { SellerApplication, Shop, User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { buildPagination } from '../utils/response.js';
import { audit, notify } from './audit.service.js';

export async function submit(userId: string, roles: string[], input: Record<string, any>) {
  if (roles.includes('seller')) throw ApiError.conflict('You are already an approved seller');
  const open = await SellerApplication.findOne({ user: userId, applicationStatus: { $in: ['pending', 'suspended'] } });
  if (open) throw ApiError.conflict(`You already have a ${open.applicationStatus} seller application`);
  try {
    return await SellerApplication.create({
      user: userId,
      businessName: input.businessName,
      businessDescription: input.businessDescription,
      contactInformation: input.contactInformation,
    });
  } catch (e: any) {
    if (e.code === 11000) throw ApiError.conflict('You already have a pending seller application');
    throw e;
  }
}

export const getMine = (userId: string) => SellerApplication.findOne({ user: userId }).sort({ createdAt: -1 });

export async function adminList(q: { status?: string; page: number; limit: number }) {
  const filter: Record<string, any> = q.status ? { applicationStatus: q.status } : {};
  const [data, total] = await Promise.all([
    SellerApplication.find(filter)
      .populate('user', 'name email roles')
      .sort({ createdAt: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    SellerApplication.countDocuments(filter),
  ]);
  return { data, pagination: buildPagination(q.page, q.limit, total) };
}

export async function review(adminId: string, id: string, input: { status: 'approved' | 'rejected'; reviewNotes?: string }) {
  const app = await SellerApplication.findById(id);
  if (!app) throw ApiError.notFound('Application not found');
  if (app.applicationStatus !== 'pending') throw ApiError.conflict(`Application already ${app.applicationStatus}`);
  app.applicationStatus = input.status;
  app.reviewNotes = input.reviewNotes;
  app.reviewedBy = adminId as any;
  app.reviewedAt = new Date();
  await app.save();
  if (input.status === 'approved') {
    // $addToSet: never removes existing roles (e.g. admin).
    await User.updateOne({ _id: app.user }, { $addToSet: { roles: 'seller' } });
  }
  await audit(adminId, `seller_application.${input.status}`, 'SellerApplication', app._id, { user: app.user });
  await notify(
    app.user,
    'seller_application',
    `Seller application ${input.status}`,
    input.status === 'approved'
      ? 'Congratulations! You can now open shops and list products.'
      : `Your seller application was not approved.${input.reviewNotes ? ' Notes: ' + input.reviewNotes : ''}`,
    '/seller/apply',
  );
  return app;
}

export async function listSellers(q: { search?: string; page: number; limit: number }) {
  const filter: Record<string, any> = { roles: 'seller' };
  if (q.search)
    filter.$or = [
      { name: new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      { email: new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
    ];
  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    User.countDocuments(filter),
  ]);
  const data = await Promise.all(
    users.map(async (u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      roles: u.roles,
      status: u.status,
      shops: await Shop.countDocuments({ seller: u._id }),
    })),
  );
  return { data, pagination: buildPagination(q.page, q.limit, total) };
}

/** Suspend removes the seller role and suspends shops; reactivate restores both. Admin role is untouched. */
export async function setSellerState(adminId: string, userId: string, action: 'suspend' | 'reactivate', notes?: string) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('Seller not found');
  if (action === 'suspend') {
    if (!user.roles.includes('seller')) throw ApiError.conflict('User is not an active seller');
    await User.updateOne({ _id: userId }, { $pull: { roles: 'seller' } });
    await Shop.updateMany({ seller: userId, status: 'active' }, { $set: { status: 'suspended' } });
    await SellerApplication.updateMany(
      { user: userId, applicationStatus: 'approved' },
      { $set: { applicationStatus: 'suspended', reviewNotes: notes } },
    );
  } else {
    const suspended = await SellerApplication.findOne({ user: userId, applicationStatus: 'suspended' });
    if (!suspended) throw ApiError.conflict('Seller is not suspended');
    await User.updateOne({ _id: userId }, { $addToSet: { roles: 'seller' } });
    await Shop.updateMany({ seller: userId, status: 'suspended' }, { $set: { status: 'active' } });
    await SellerApplication.updateMany({ user: userId, applicationStatus: 'suspended' }, { $set: { applicationStatus: 'approved' } });
  }
  await audit(adminId, `seller.${action}`, 'User', user._id, { notes });
  await notify(userId, 'seller_status', `Seller account ${action === 'suspend' ? 'suspended' : 'reactivated'}`, notes ?? '', '/seller');
  return User.findById(userId);
}
