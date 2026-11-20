import * as users from '../services/user.service.js';
import * as notifications from '../services/notification.service.js';
import * as sellerApps from '../services/sellerApplication.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok, paginated } from '../utils/response.js';

export const getMe = asyncHandler(async (req, res) => ok(res, 'Profile retrieved', await users.getProfile(req.user!.id)));
export const updateMe = asyncHandler(async (req, res) => ok(res, 'Profile updated', await users.updateProfile(req.user!.id, req.body)));
export const listAddresses = asyncHandler(async (req, res) => ok(res, 'Addresses retrieved', await users.listAddresses(req.user!.id)));
export const createAddress = asyncHandler(async (req, res) =>
  created(res, 'Address created', await users.createAddress(req.user!.id, req.body)),
);
export const updateAddress = asyncHandler(async (req, res) =>
  ok(res, 'Address updated', await users.updateAddress(req.user!.id, String(req.params.id), req.body)),
);
export const deleteAddress = asyncHandler(async (req, res) => {
  await users.deleteAddress(req.user!.id, String(req.params.id));
  return ok(res, 'Address deleted');
});

export const listNotifications = asyncHandler(async (req, res) => {
  const r = await notifications.list(req.user!.id, req.valid.query);
  return res.json({ success: true, message: 'Notifications retrieved', data: r.data, unread: r.unread, pagination: r.pagination });
});
export const markNotification = asyncHandler(async (req, res) =>
  ok(res, 'Notification updated', await notifications.markRead(req.user!.id, String(req.params.id))),
);
export const markAllNotifications = asyncHandler(async (req, res) => {
  await notifications.markAllRead(req.user!.id);
  return ok(res, 'All notifications marked as read');
});

export const submitApplication = asyncHandler(async (req, res) =>
  created(res, 'Application submitted', await sellerApps.submit(req.user!.id, req.user!.roles, req.body)),
);
export const myApplication = asyncHandler(async (req, res) => ok(res, 'Application retrieved', await sellerApps.getMine(req.user!.id)));
export { paginated };
