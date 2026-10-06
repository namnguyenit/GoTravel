const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { storePublicImage, verifyAsset, manifestPath, configure } = require('./image-store');

async function run() {
  const args = process.argv.slice(2);
  const get = flag => args[args.indexOf(flag) + 1];
  if (!args.includes('--audit')) throw new Error('Use --audit <checks.json> [--cache <directory>]');
  const audit = JSON.parse(fs.readFileSync(get('--audit')));
  if (!Array.isArray(audit.results)) throw new Error('Invalid image audit');
  const healthy = [...new Map(audit.results.filter(entry => entry.state === 'ok')
    .map(entry => [entry.url, entry])).values()];
  const stateDir = path.join(__dirname, '.image-migration');
  fs.mkdirSync(stateDir, { recursive: true, mode: 0o700 });
  const lock = path.join(stateDir, 'upload.lock');
  fs.writeFileSync(lock, `${process.pid}\n`, { flag: 'wx', mode: 0o600 });
  let completed = 0;
  const failures = [];
  try {
    configure();
    const mediaRequire = createRequire(path.resolve(__dirname, '../../cloudinary-service/package.json'));
    const ping = await mediaRequire('cloudinary').v2.api.ping({ timeout: 15000 });
    if (ping.status !== 'ok') throw new Error('Cloudinary credentials are not ready');
    let cursor = 0;
    await Promise.all(Array.from({ length: 2 }, async () => {
      for (;;) {
        const entry = healthy[cursor++];
        if (!entry) return;
        try {
          await storePublicImage(entry.url, { audit: entry,
            cacheDirectory: args.includes('--cache') ? get('--cache') : undefined });
          const saved = JSON.parse(fs.readFileSync(manifestPath)).assets[entry.url];
          // Verify existing entries too, so resuming never trusts a deleted asset.
          await verifyAsset(saved);
          completed++;
          if (completed % 10 === 0) console.log(`Uploaded and verified ${completed}/${healthy.length}`);
        } catch (error) {
          failures.push({ url: entry.url, message: error.message });
          console.error(`Failed image ${entry.url}: ${error.message}`);
        }
      }
    }));
    const report = { completedAt: new Date().toISOString(), sources: healthy.length, completed, failures,
      excluded: audit.results.filter(entry => entry.state !== 'ok').map(entry => ({ url: entry.url, state: entry.state, httpStatus: entry.httpStatus })) };
    fs.writeFileSync(path.join(stateDir, 'upload-run.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ sources: healthy.length, verified: completed, failures: failures.length, excluded: report.excluded.length }));
    if (failures.length) throw new Error('Upload incomplete; database must remain unchanged. Retry using the same manifest');
  } finally { fs.unlinkSync(lock); }
}

run().catch(error => { console.error(error.message || 'Image migration failed'); process.exitCode = 1; });
