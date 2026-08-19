import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { fileTypeFromBuffer } from 'file-type';

// Ensure uploads directory exists at runtime
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'products');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export function extFromMime(mime: string): string {
  return EXT_BY_MIME[mime] || '';
}

// Use memoryStorage so the file buffer is available in-memory for content
// (magic-byte) inspection before anything is ever written to disk. The
// client-supplied filename/extension is never trusted for the on-disk name.
const storage = multer.memoryStorage();

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Cheap first-pass rejection based on client-supplied Content-Type. This
  // is a UX optimization only (rejects obviously-wrong uploads early) — it
  // is NOT the security boundary, since file.mimetype is client-controlled
  // and trivially spoofable. The real boundary is the magic-byte check via
  // fileTypeFromBuffer(), performed in the controller after multer parses
  // the upload into memory.
  if (ALLOWED_IMAGE_MIMES.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed.'));
};

export const uploadImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

/**
 * Write a verified image buffer to disk using a randomized filename and an
 * extension derived from the detected (magic-byte-verified) MIME type —
 * never from client-supplied originalname.
 */
export function writeVerifiedBufferToDisk(buffer: Buffer, mime: string): string {
  const ext = extFromMime(mime);
  const name = `product-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buffer);
  return name;
}

export { fileTypeFromBuffer };
