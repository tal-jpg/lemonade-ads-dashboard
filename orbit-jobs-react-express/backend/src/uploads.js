/**
 * CV file storage. Local disk for the demo (data/uploads); production swaps
 * this module for blob storage (S3 / R2) — the call sites only use
 * saveCV / cvPath.
 *
 * Files arrive as multer memory-storage objects: { originalname, mimetype,
 * size, buffer }.
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";

export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "data", "uploads");
export const MAX_CV_BYTES = 5 * 1024 * 1024;
const CV_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export class UploadError extends Error {}

export const CV_TYPE_MESSAGE = "CVs must be PDF, DOC or DOCX (max 5 MB).";

/** Validates and persists an uploaded CV; returns the stored filename or null when absent. */
export function saveCV(file) {
  if (!file || !file.buffer || file.size === 0) return null;
  if (file.size > MAX_CV_BYTES) throw new UploadError(CV_TYPE_MESSAGE);
  if (!CV_MIME.includes(file.mimetype) && !/\.(pdf|docx?|rtf)$/i.test(file.originalname))
    throw new UploadError(CV_TYPE_MESSAGE);
  const safe = file.originalname.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-60);
  const name = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}_${safe}`;
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(path.join(UPLOAD_DIR, name), file.buffer);
  return { file: name, original: file.originalname };
}

export function cvPath(fileName) {
  const base = path.basename(fileName);
  const full = path.join(UPLOAD_DIR, base);
  return fs.existsSync(full) ? full : null;
}
