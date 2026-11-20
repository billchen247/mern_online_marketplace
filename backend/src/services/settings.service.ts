import { Settings } from '../models/index.js';

export async function getSettings() {
  const existing = await Settings.findOne({ key: 'marketplace' });
  if (existing) return existing;
  try {
    return await Settings.create({ key: 'marketplace' });
  } catch {
    return (await Settings.findOne({ key: 'marketplace' }))!;
  }
}

export async function updateSettings(patch: Record<string, any>) {
  const s = await getSettings();
  const set: Record<string, unknown> = {};
  const flatten = (obj: Record<string, any>, prefix = '') => {
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined) continue;
      if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, `${prefix}${k}.`);
      else set[`${prefix}${k}`] = v;
    }
  };
  flatten(patch);
  return Settings.findByIdAndUpdate(s._id, { $set: set }, { new: true, runValidators: true });
}

export async function getPublicSettings() {
  const s = await getSettings();
  return {
    marketplaceName: s.marketplaceName,
    tagline: s.tagline,
    primaryColor: s.primaryColor,
    shipping: { flatRate: s.shipping!.flatRate, freeShippingThreshold: s.shipping!.freeShippingThreshold },
    taxRate: s.tax!.rate,
  };
}
