// Public seed images only. Identity documents must use the private media API.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { createRequire } = require('node:module');
const mediaRequire = createRequire(path.resolve(__dirname, '../../cloudinary-service/package.json'));
const sharp = mediaRequire('sharp');
const cloudinary = mediaRequire('cloudinary').v2;
const manifestPath = path.join(__dirname, 'cloudinary-images.json');
// New publisher hosts are added deliberately after checking item-specific image
// bindings. Keep this list finite: seed URLs must never become arbitrary fetches.
const hosts = new Set(['images.unsplash.com', 'upload.wikimedia.org', 'thumb.wikimedia.org',
  ...require('./real-catalog/approved-image-hosts.json')]);
const maxBytes = 32 * 1024 * 1024;
const sha = value => createHash('sha256').update(value).digest('hex');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let manifest;
let credentials;
const pending = new Map();

function configure() {
  if (manifest) return;
  const envPath = process.env.MEDIA_ENV_FILE || path.resolve(__dirname, '../../cloudinary-service/.env');
  const file = fs.existsSync(envPath) ? mediaRequire('dotenv').parse(fs.readFileSync(envPath)) : {};
  credentials = Object.fromEntries(['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']
    .map(key => [key, process.env[key] || file[key]]));
  for (const [key, value] of Object.entries(credentials)) {
    if (!value || /^(your_|replace|changeme|<|xxx)/i.test(value)) throw new Error(`${key} is not configured`);
  }
  cloudinary.config({ cloud_name: credentials.CLOUDINARY_CLOUD_NAME,
    api_key: credentials.CLOUDINARY_API_KEY, api_secret: credentials.CLOUDINARY_API_SECRET, secure: true });
  const existing = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath)) : null;
  if (existing && existing.cloudName !== credentials.CLOUDINARY_CLOUD_NAME) {
    throw new Error('Image manifest belongs to another Cloudinary cloud; use a separate migration');
  }
  manifest = existing || { schemaVersion: 1, cloudName: credentials.CLOUDINARY_CLOUD_NAME,
    processing: { maxDimension: 2560, format: 'webp', quality: 85, private: false }, assets: {} };
}

function saveManifest() {
  manifest.updatedAt = new Date().toISOString();
  const tmp = `${manifestPath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(manifest, null, 2) + '\n');
  fs.renameSync(tmp, manifestPath);
}

function safeError(error) {
  const detail = error.error || error;
  let message = String(detail.message || 'Image operation failed');
  for (const value of Object.values(credentials || {})) if (value) message = message.replaceAll(value, '[REDACTED]');
  const safe = new Error(`${detail.http_code ? `HTTP ${detail.http_code}: ` : ''}${message}`);
  if (error.retryAfterMs) safe.retryAfterMs = error.retryAfterMs;
  return safe;
}

function checkSource(source) {
  const url = new URL(source);
  if (url.protocol !== 'https:' || !hosts.has(url.hostname) || url.port || url.username || url.password) {
    throw new Error('Only HTTPS image URLs on the approved public source hosts are allowed');
  }
  return url;
}

async function download(source) {
  checkSource(source);
  let target = source;
  const signal = AbortSignal.timeout(30000);
  for (let redirect = 0; redirect <= 5; redirect++) {
    const response = await fetch(target, { redirect: 'manual', signal,
      headers: { 'user-agent': 'GoTravel-Image-Migration/1.0', accept: 'image/*' } });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const next = new URL(response.headers.get('location'), target).href;
      checkSource(next);
      await response.body?.cancel();
      target = next;
      continue;
    }
    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) {
      await response.body?.cancel();
      const error = new Error(`Image source returned HTTP ${response.status} or a non-image response`);
      if (response.status === 429) {
        const retry = response.headers.get('retry-after');
        const ms = /^\d+$/.test(retry || '') ? Number(retry) * 1000 : Date.parse(retry) - Date.now();
        error.retryAfterMs = Number.isFinite(ms) && ms > 0 ? Math.min(ms, 3600000) : 60000;
      }
      throw error;
    }
    if (Number(response.headers.get('content-length')) > maxBytes) {
      await response.body?.cancel();
      throw new Error('Source image exceeds 32 MiB');
    }
    const chunks = [];
    let total = 0;
    for await (const chunk of response.body) {
      total += chunk.length;
      if (total > maxBytes) throw new Error('Source image exceeds 32 MiB');
      chunks.push(chunk);
    }
    return Buffer.concat(chunks, total);
  }
  throw new Error('Too many image redirects');
}

async function verifyAsset(entry) {
  configure();
  checkSource(entry.sourceUrl);
  // Invalidate the old verification first; a failed recheck must block DB apply.
  entry.state = 'verifying';
  manifest.assets[entry.sourceUrl] = entry;
  saveManifest();
  const url = new URL(entry.secureUrl);
  if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' ||
      !url.pathname.startsWith(`/${manifest.cloudName}/image/upload/`) || url.username || url.password) {
    throw new Error('Invalid asset URL or Cloudinary cloud');
  }
  const response = await fetch(entry.secureUrl, { redirect: 'error', signal: AbortSignal.timeout(30000) });
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) {
    await response.body?.cancel();
    throw new Error(`Cloudinary delivery failed: HTTP ${response.status}`);
  }
  const chunks = [];
  let total = 0;
  for await (const chunk of response.body) {
    total += chunk.length;
    if (total > 10 * 1024 * 1024) throw new Error('Cloudinary image exceeds verification limit');
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks, total);
  const decoder = sharp(buffer, { limitInputPixels: 60e6, failOn: 'warning' });
  const info = await decoder.metadata();
  await decoder.resize(1, 1).raw().toBuffer();
  if (info.width !== entry.width || info.height !== entry.height || info.format !== 'webp') {
    throw new Error('Cloudinary asset dimensions/format differ from the uploaded image');
  }
  if (sha(buffer) !== entry.optimizedSha256) throw new Error('Cloudinary asset checksum mismatch');
  entry.verifiedAt = new Date().toISOString();
  entry.deliveryHttpStatus = response.status;
  entry.state = 'verified';
  saveManifest();
  return entry;
}

async function store(source, options = {}) {
  configure();
  const parsed = new URL(source);
  if (parsed.hostname === 'res.cloudinary.com' && parsed.protocol === 'https:' &&
      parsed.pathname.startsWith(`/${manifest.cloudName}/image/upload/`)) return source;
  checkSource(source);
  if (manifest.assets[source]?.state === 'verified') return manifest.assets[source].secureUrl;
  const audit = options.audit;
  let buffer;
  if (audit?.state === 'ok' && options.cacheDirectory) {
    const cached = path.join(options.cacheDirectory, sha(source));
    if (fs.existsSync(cached)) {
      buffer = fs.readFileSync(cached);
      if (sha(buffer) !== audit.hash) throw new Error('Cached source checksum mismatch');
    }
  }
  buffer ||= await download(source);
  if (buffer.length > maxBytes) throw new Error('Source image exceeds 32 MiB');
  const decoder = sharp(buffer, { limitInputPixels: 60e6, failOn: 'warning' });
  const original = await decoder.metadata();
  // Unsplash auto=format can deliver AVIF (reported as heif by Sharp).
  if (!['jpeg', 'png', 'webp', 'avif', 'heif'].includes(original.format) || (original.pages || 1) > 1) {
    throw new Error('Unsupported source image format or animated image');
  }
  const optimized = await decoder.rotate().resize(2560, 2560, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 }).toBuffer();
  const info = await sharp(optimized).metadata();
  const optimizedSha256 = sha(optimized);
  const publicId = `admin-uploads/seeder/${optimizedSha256}`;
  const result = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream({ public_id: publicId, resource_type: 'image', type: 'upload',
      overwrite: false, tags: ['gotravel', 'seed-migration'], timeout: 60000 },
    (error, value) => error ? reject(safeError(error)) : resolve(value)).end(optimized);
  });
  if (result.public_id !== publicId || !result.secure_url || result.format !== 'webp') {
    throw new Error('Cloudinary returned an unexpected asset');
  }
  const entry = { state: 'uploaded', sourceUrl: source, sourceSha256: sha(buffer), sourceBytes: buffer.length,
    sourceCheckedAt: audit?.checkedAt || new Date().toISOString(), originalWidth: original.width,
    originalHeight: original.height, publicId, secureUrl: result.secure_url, resourceType: 'image',
    deliveryType: 'upload', optimizedSha256, bytes: result.bytes, width: info.width, height: info.height,
    uploadedAt: new Date().toISOString() };
  manifest.assets[source] = entry;
  saveManifest();
  await verifyAsset(entry);
  return entry.secureUrl;
}

async function storePublicImage(source, options = {}) {
  if (pending.has(source)) return pending.get(source);
  const task = (async () => {
    for (let attempt = 0; ; attempt++) {
      try { return await store(source, options); }
      catch (error) {
        if (attempt >= 2 || /HTTP (400|401|403|404)|checksum|Unsupported|not configured|another Cloudinary/.test(error.message)) throw safeError(error);
        if (error.retryAfterMs) console.log(`Image provider rate limited; waiting ${Math.ceil(error.retryAfterMs / 1000)} seconds`);
        await sleep(error.retryAfterMs || 1000 * (attempt + 1));
      }
    }
  })();
  pending.set(source, task);
  try { return await task; } finally { pending.delete(source); }
}

async function migrateLandmarkImages(provinces) {
  // Finish all uploads before the caller writes a new vietnam-data.js.
  for (const province of provinces) for (const landmark of province.landmarks) {
    if (landmark.thumbnail) landmark.thumbnail = await storePublicImage(landmark.thumbnail);
    landmark.gallery = await Promise.all((landmark.gallery || []).map(url => storePublicImage(url)));
  }
}

module.exports = { storePublicImage, migrateLandmarkImages, verifyAsset, manifestPath, configure };
