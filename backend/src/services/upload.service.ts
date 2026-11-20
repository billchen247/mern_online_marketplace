import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';
import { detectImageType } from '../middleware/upload.js';
import { ApiError } from '../utils/ApiError.js';

export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

if (env.cloudinary.enabled) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });
}

export interface StoredImage {
  url: string;
  publicId: string;
}

/** Stores an image in Cloudinary, or in ./uploads (served at /uploads) when Cloudinary is not configured. */
export async function storeImage(file: Express.Multer.File, folder = 'marketplace'): Promise<StoredImage> {
  const type = detectImageType(file.buffer);
  if (!type) throw ApiError.badRequest('File content is not a valid JPEG, PNG or WebP image');
  if (env.cloudinary.enabled) {
    const res = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder, resource_type: 'image' }, (err, r) =>
          err || !r ? reject(err ?? new Error('upload failed')) : resolve(r as any),
        )
        .end(file.buffer);
    });
    return { url: res.secure_url, publicId: res.public_id };
  }
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${crypto.randomBytes(12).toString('hex')}.${type}`; // server-generated; never use client filename
  await fs.writeFile(path.join(UPLOAD_DIR, name), file.buffer);
  return { url: `/uploads/${name}`, publicId: `local:${name}` };
}

export async function deleteImage(publicId?: string | null): Promise<void> {
  if (!publicId) return;
  try {
    if (publicId.startsWith('local:')) {
      const name = path.basename(publicId.slice(6)); // basename prevents path traversal
      await fs.unlink(path.join(UPLOAD_DIR, name));
    } else if (env.cloudinary.enabled) {
      await cloudinary.uploader.destroy(publicId);
    }
  } catch {
    /* best effort */
  }
}
