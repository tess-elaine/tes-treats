/**
 * Object storage — S3-compatible. Same code path works with:
 *   - DigitalOcean Spaces (default in our .env.example)
 *   - Cloudflare R2 (set SPACES_ENDPOINT=https://<account>.r2.cloudflarestorage.com)
 *   - AWS S3 (omit SPACES_ENDPOINT, set SPACES_REGION + creds)
 *   - MinIO running locally for dev
 *
 * Without any of those env vars set, we fall through to local filesystem
 * writes under public/uploads/* so dev still works with zero infra. Files
 * land at /uploads/{key} and Next serves them as static assets.
 *
 * Portability: caller code goes through `putObject()` only — never imports
 * @aws-sdk/* directly.
 */
import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import sharp from "sharp";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

let cachedS3: S3Client | null = null;

function getS3(): S3Client | null {
  if (cachedS3) return cachedS3;
  const region = process.env.SPACES_REGION;
  const accessKeyId = process.env.SPACES_ACCESS_KEY;
  const secretAccessKey = process.env.SPACES_SECRET_KEY;
  if (!region || !accessKeyId || !secretAccessKey) return null;
  cachedS3 = new S3Client({
    region,
    endpoint: process.env.SPACES_ENDPOINT, // optional; AWS S3 doesn't need it
    forcePathStyle: !!process.env.SPACES_ENDPOINT, // needed for MinIO; harmless for Spaces
    credentials: { accessKeyId, secretAccessKey },
  });
  return cachedS3;
}

const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export type UploadResult = { url: string; key: string };

/**
 * Normalize an uploaded image:
 *   - honor EXIF orientation so iPhone vertical shots don't render sideways
 *   - cap the longest edge at 1600px (covers hero use; saves disk + bandwidth)
 *   - re-encode to WebP @ q82 — ~5–10x smaller than source JPEG with no
 *     visible quality loss for product photos. next/image still re-optimizes
 *     for browser-best-format on serve, so AVIF clients get an even smaller
 *     payload.
 *
 * Returns processed buffer + the canonical content type / extension to use
 * when storing.
 */
export async function processUploadedImage(
  input: Buffer | Uint8Array,
): Promise<{ buffer: Buffer; contentType: string; extension: string }> {
  const buffer = await sharp(input)
    .rotate()
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer();
  return { buffer, contentType: "image/webp", extension: ".webp" };
}

export async function putObject(opts: {
  /** Logical folder, e.g. "custom-requests/photos" */
  prefix: string;
  filename: string;
  body: Buffer | Uint8Array;
  contentType: string;
  /**
   * Optional explicit key (full path). If provided, used as-is. Otherwise
   * the key is generated from `prefix` + random hex + extension.
   */
  key?: string;
}): Promise<UploadResult> {
  let key: string;
  if (opts.key) {
    key = opts.key;
  } else {
    const ext = path.extname(opts.filename).toLowerCase().replace(/[^.a-z0-9]/g, "");
    key = `${opts.prefix.replace(/^\/|\/$/g, "")}/${randomBytes(12).toString("hex")}${ext}`;
  }

  const s3 = getS3();
  const bucket = process.env.SPACES_BUCKET;
  const publicBase = process.env.SPACES_PUBLIC_BASE;
  if (s3 && bucket) {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: opts.body,
        ContentType: opts.contentType,
        ACL: "public-read",
      }),
    );
    const url = publicBase
      ? `${publicBase.replace(/\/$/, "")}/${key}`
      : `${process.env.SPACES_ENDPOINT?.replace(/\/$/, "")}/${bucket}/${key}`;
    return { url, key };
  }

  // Local filesystem fallback (dev). Files are served from /public.
  const dest = path.join(LOCAL_UPLOAD_DIR, key);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, opts.body);
  return { url: `/uploads/${key}`, key };
}
