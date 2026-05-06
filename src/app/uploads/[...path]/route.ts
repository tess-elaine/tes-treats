/**
 * Static file server for runtime-uploaded images.
 *
 * Next.js's `output: "standalone"` build snapshots the public/ directory at
 * build time — files added to /public/uploads/ at runtime (admin uploads on
 * the Railway volume) are invisible to the standalone static handler and
 * always 404. This route handler reads them straight off disk so they serve
 * regardless of what Next did or didn't trace.
 *
 * Files are written by lib/storage.ts to UPLOADS_DIR (defaulting to
 * <cwd>/public/uploads) — same path read here.
 */
import { promises as fs } from "node:fs";
import path from "node:path";

const UPLOADS_DIR =
  process.env.UPLOADS_DIR ?? path.join(process.cwd(), "public", "uploads");

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await ctx.params;
  if (!parts || parts.length === 0) {
    return new Response("not found", { status: 404 });
  }

  // Path-traversal guard: resolve, then ensure result is still under root.
  const root = path.resolve(UPLOADS_DIR);
  const abs = path.resolve(root, parts.join("/"));
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    return new Response("forbidden", { status: 403 });
  }

  try {
    const buf = await fs.readFile(abs);
    const ext = path.extname(abs).toLowerCase();
    const type = MIME[ext] ?? "application/octet-stream";
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": type,
        // Filenames carry a random suffix so the URL is effectively immutable
        // for a given file; safe to long-cache.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("not found", { status: 404 });
  }
}
