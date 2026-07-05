import { Hono } from 'hono';
import type { Env } from '../env';
import { requireAccess } from '../middleware/auth';
import { jsonError } from '../util/errors';

export const mediaUploadRoute = new Hono<{ Bindings: Env; Variables: { userEmail?: string } }>();
export const mediaServeRoute = new Hono<{ Bindings: Env }>();

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

function extensionFor(filename: string, mime: string): string {
  const fromName = filename.includes('.') ? filename.split('.').pop()!.toLowerCase() : '';
  if (fromName && /^[a-z0-9]{1,5}$/.test(fromName)) return fromName;
  return EXT_BY_MIME[mime] ?? 'bin';
}

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// POST /api/media — multipart upload -> R2, content-hash key.
mediaUploadRoute.post('/', requireAccess, async (c) => {
  let form: Record<string, unknown>;
  try {
    form = await c.req.parseBody();
  } catch {
    return jsonError(c, 400, 'Expected multipart/form-data body.');
  }

  const file = form.file;
  if (!(file instanceof File)) {
    return jsonError(c, 400, 'Missing "file" field in multipart body.');
  }

  const buf = await file.arrayBuffer();
  if (buf.byteLength === 0) return jsonError(c, 400, 'Uploaded file is empty.');

  const hash = await sha256Hex(buf);
  const mime = file.type || 'application/octet-stream';
  const ext = extensionFor(file.name ?? '', mime);
  const key = `${hash}.${ext}`;

  await c.env.MEDIA.put(key, buf, {
    httpMetadata: { contentType: mime },
  });

  const alt = typeof form.alt === 'string' ? form.alt : '';

  await c.env.DB.prepare(
    'INSERT INTO media (r2_key, filename, mime, width, height, alt) VALUES (?, ?, ?, NULL, NULL, ?) ' +
      'ON CONFLICT(r2_key) DO UPDATE SET filename = excluded.filename, alt = excluded.alt'
  )
    .bind(key, file.name ?? key, mime, alt)
    .run();

  // Width/height probing is optional (per BUILD-CONTRACTS) — left null; the
  // front-end/editor can fill these in client-side from the loaded <img> if needed.
  return c.json({ src: `/media/${key}`, width: null, height: null }, 201);
});

// GET /media/* — stream an object straight from R2.
mediaServeRoute.get('/*', async (c) => {
  const key = c.req.path.replace(/^\/media\//, '');
  if (!key) return jsonError(c, 404, 'Not found.');

  const object = await c.env.MEDIA.get(key);
  if (!object) return jsonError(c, 404, 'Not found.');

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/octet-stream');
  }

  return new Response(object.body, { headers });
});
