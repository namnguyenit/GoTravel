// Close remaining legacy discovery paths after the new catalog commit.
// All affected rows already have a private pre-import backup. No rows are deleted.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { connect } = require('../expansion/db');
const { save } = require('./research');
const dir = __dirname;
function commonsFile(source) {
  const u = new URL(source);
  if (!['upload.wikimedia.org', 'thumb.wikimedia.org'].includes(u.hostname)) return null;
  const xs = u.pathname.split('/');
  return decodeURIComponent(u.pathname.includes('/thumb/') ? xs.at(-2) : xs.at(-1));
}
async function main() {
  if (!process.argv.includes('--apply')) throw Error('Use --apply after the catalog has committed');
  const receipt = JSON.parse(fs.readFileSync(path.join(dir, 'receipt.json')));
  assert.equal(receipt.status, 'committed');
  const before = JSON.parse(fs.readFileSync(receipt.backupFile));
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, '../cloudinary-images.json')));
  const byUrl = new Map(Object.values(manifest.assets).filter(x => x.state === 'verified').map(x => [x.secureUrl, x]));
  const publicIds = new Set(before.sourceProvenance.filter(x => x.record_type === 'landmarks' && x.origin === 'public-sourced').map(x => x.record_id));
  const sourcedPhotos = new Map();
  for (const l of before.landmarks.filter(x => publicIds.has(x.id))) {
    const entry = byUrl.get(l.thumbnail_url);
    const file = entry && commonsFile(entry.sourceUrl);
    if (file) sourcedPhotos.set(l.province + ':' + file, l.id);
  }
  const landmarkIds = [];
  const reasons = [];
  for (const l of before.landmarks.filter(x => !publicIds.has(x.id))) {
    const entry = byUrl.get(l.thumbnail_url);
    if (!entry) continue;
    const u = new URL(entry.sourceUrl);
    const duplicate = sourcedPhotos.get(l.province + ':' + commonsFile(entry.sourceUrl));
    if (u.hostname === 'images.unsplash.com' || (duplicate && duplicate !== l.id)) {
      landmarkIds.push(l.id);
      reasons.push({ id: l.id, name: l.name, reason: u.hostname === 'images.unsplash.com' ? 'Unverified illustrative stock photograph' : 'Legacy duplicate of the same verified place photograph', retainedId: duplicate || null });
    }
  }
  const c = await connect('CatalogandListing');
  try {
    await c.query('BEGIN');
    await c.query('SELECT pg_advisory_xact_lock(hashtext($1))', [receipt.batchId]);
    const oldIds = before.complexes.map(x => x.id);
    const remaining = (await c.query("SELECT id FROM complexes c WHERE id=ANY($1::uuid[]) AND status='ACTIVE' AND NOT EXISTS(SELECT 1 FROM listings l WHERE l.complex_id=c.id AND l.status='ACTIVE')", [oldIds])).rows.map(x => x.id);
    const hiddenComplexes = (await c.query("UPDATE complexes SET status='HIDDEN',updated_at=now() WHERE id=ANY($1::uuid[]) AND status='ACTIVE'", [remaining])).rowCount;
    const hiddenLandmarks = (await c.query("UPDATE landmarks SET status='HIDDEN',updated_at=now() WHERE id=ANY($1::uuid[]) AND status='ACTIVE'", [landmarkIds])).rowCount;
    await c.query('COMMIT');
    const result = { at: new Date().toISOString(), batchId: receipt.batchId, hiddenComplexes, hiddenLandmarks, complexCandidates: remaining, landmarkCandidates: reasons };
    save(path.join(dir, 'legacy-cleanup.json'), result);
    console.log(JSON.stringify({ hiddenComplexes, hiddenLandmarks, retainedVerifiedLandmarks: publicIds.size - receipt.hiddenIllustrationLandmarks }));
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { await c.end(); }
}
if (require.main === module) main().catch(e => { console.error(e.message); process.exitCode = 1; });
