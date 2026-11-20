import { AuditLog, Notification } from '../models/index.js';

export async function audit(actor: string, action: string, targetType: string, target: any, details?: unknown) {
  await AuditLog.create({ actor, action, targetType, target, details });
}

export async function notify(user: any, type: string, title: string, message: string, link?: string) {
  try {
    await Notification.create({ user, type, title, message, link });
  } catch {
    /* notifications are best-effort and must never break the main flow */
  }
}
