const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { connect } = require('../expansion/db');
const { snapshot, baselineFile } = require('./protected-data');
const { save } = require('./research');
const dir = __dirname;

async function main() {
  const plan = JSON.parse(fs.readFileSync(path.join(dir, 'plan.json')));
  const receipt = JSON.parse(fs.readFileSync(path.join(dir, 'receipt.json')));
  assert.equal(receipt.status, 'committed');
  const result = { at: new Date().toISOString(), batchId: plan.batchId, checks: {}, api: [] };
  assert.deepEqual(await snapshot(), JSON.parse(fs.readFileSync(baselineFile)), 'Legacy transaction/inventory data changed');
  result.checks.transactionHistoryAndLegacyInventoryUnchanged = true;
  const c = await connect('CatalogandListing'), b = await connect('BookingandInventory'), i = await connect('Identity');
  try {
    const rows = (await c.query("SELECT * FROM listings WHERE status='ACTIVE' ORDER BY id")).rows;
    const parents = (await c.query("SELECT * FROM complexes WHERE status='ACTIVE' ORDER BY id")).rows;
    assert.equal(rows.length, plan.listings.length);
    assert.equal(parents.length, plan.complexes.length);
    assert.deepEqual(rows.map(x => x.id).sort(), plan.listings.map(x => x.id).sort());
    assert.deepEqual(parents.map(x => x.id).sort(), plan.complexes.map(x => x.id).sort());
    const accounts = (await i.query("SELECT u.id,u.is_active,u.is_deleted,p.operator_kind,h.approval_status,e.approval_status AS enterprise_approval FROM seed_host_provenance p JOIN users u ON u.id=p.user_id JOIN host_profiles h ON h.user_id=u.id LEFT JOIN enterprise_profiles e ON e.user_id=u.id WHERE p.identity_kind='FICTIONAL_TEST_OPERATOR'")).rows;
    assert.equal(accounts.length, 50);
    assert.equal(accounts.filter(x => x.operator_kind === 'HOST').length, 25);
    assert.equal(accounts.filter(x => x.operator_kind === 'ENTERPRISE').length, 25);
    assert.ok(accounts.every(x => x.is_active && !x.is_deleted && x.approval_status === 'APPROVED' && (x.operator_kind !== 'ENTERPRISE' || x.enterprise_approval === 'APPROVED')));
    const byHost = new Map(accounts.map(x => [x.id, x]));
    const byParent = new Map(parents.map(x => [x.id, x]));
    for (const l of rows) { assert.ok(byHost.has(l.host_id)); assert.ok(!l.complex_id || byParent.get(l.complex_id)?.host_id === l.host_id); assert.equal(l.total_reviews, 0); assert.equal(Number(l.average_rating), 0); }
    for (const p of parents) assert.equal(byHost.get(p.host_id)?.operator_kind, 'ENTERPRISE');
    assert.equal(new Set(rows.map(x => x.host_id)).size, 50);
    result.checks.hostOwnershipRolesAndParentRelationships = true;
    result.accounts = { total: 50, HOST: 25, ENTERPRISE: 25 };
    result.catalog = { listings: rows.length, complexes: parents.length, STAY: rows.filter(x => x.category === 'STAY').length, EXP: rows.filter(x => x.category === 'EXP').length, SVC: rows.filter(x => x.category === 'SVC').length };
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, '../cloudinary-images.json')));
    const verified = new Map(Object.values(manifest.assets).filter(x => x.state === 'verified').map(x => [x.secureUrl, x]));
    const used = new Map();
    for (const record of [...rows, ...parents]) {
      const urls = new Set([record.thumbnail_url, ...(record.gallery_urls || record.attributes?.galleryUrls || [])]);
      for (const u of urls) {
        assert.ok(u.startsWith('https://res.cloudinary.com/' + manifest.cloudName + '/image/upload/'));
        assert.ok(verified.has(u), 'Unverified Cloudinary photograph');
        const hash = verified.get(u).optimizedSha256;
        assert.ok(!used.has(hash) || used.get(hash) === record.id, 'Same photograph used by different active catalog records');
        used.set(hash, record.id);
      }
    }
    result.checks.catalogImagesOwnedVerifiedAndNotSharedAcrossRecords = true;
    result.uniqueCatalogPhotographs = used.size;
    const ids = rows.map(x => x.id);
    const configs = (await b.query('SELECT count(*)::int AS count FROM inventory_configs WHERE listing_id=ANY($1::uuid[]) AND is_active', [ids])).rows[0].count;
    const calendars = (await b.query('SELECT count(*)::int AS count FROM inventory_calendars WHERE listing_id=ANY($1::uuid[])', [ids])).rows[0].count;
    assert.equal(configs, rows.length);
    assert.equal(calendars, result.catalog.STAY * 91 + (result.catalog.EXP + result.catalog.SVC) * 182);
    result.inventory = { configs, calendars, startDate: plan.inventoryStart, days: 91, simulated: true };
    result.coverage = plan.coverage;
    assert.equal(plan.coverage.length, 34);
    assert.ok(plan.coverage.every(x => x.STAY > 0 && x.EXP > 0 && x.SVC > 0));
    result.checks.all34ProvincesHaveAll3Categories = true;
    const newReviews = (await c.query('SELECT count(*)::int AS count FROM reviews WHERE listing_id=ANY($1::uuid[])', [ids])).rows[0].count;
    assert.equal(newReviews, 0);
    result.checks.noInventedCustomerReviews = true;
    result.activeLandmarks = (await c.query("SELECT count(*)::int AS count FROM landmarks WHERE status='ACTIVE'")).rows[0].count;
  } finally { await c.end(); await b.end(); await i.end(); }

  async function request(endpoint) {
    const started = Date.now();
    const r = await fetch('http://127.0.0.1:5555' + endpoint, { signal: AbortSignal.timeout(15000) });
    const payload = await r.json();
    result.api.push({ endpoint, http: r.status, durationMs: Date.now() - started });
    assert.equal(r.status, 200, endpoint + ': ' + payload.message);
    return payload;
  }
  for (const category of ['STAY', 'EXP', 'SVC']) {
    const data = await request('/api/v1/search/listings?category=' + category + '&limit=500');
    assert.equal(data.data.length, result.catalog[category]);
    assert.ok(data.data.every(x => plan.listings.some(l => l.id === x.id)));
    const samples = plan.listings.filter(x => x.category === category).slice(0, 2);
    for (const l of samples) {
      const detail = await request('/api/v1/catalog/listings/' + l.id);
      assert.equal(detail.data.id, l.id);
      assert.equal(detail.data.attributes.categoryType, l.attributes.categoryType);
      const calendar = await request('/api/v1/public/inventory/listings/' + l.id + '/availability?startDate=' + plan.inventoryStart + '&endDate=' + plan.inventoryStart);
      assert.ok(calendar.data.length > 0, 'Missing public availability');
    }
  }
  const complexes = await request('/api/v1/recommendations/complexes?limit=200');
  const list = Array.isArray(complexes) ? complexes : complexes.data;
  assert.equal(list.length, result.catalog.complexes);
  assert.ok(list.every(x => plan.complexes.some(p => p.id === x.id)));
  result.status = 'passed';
  save(path.join(dir, 'verification.json'), result);
  console.log(JSON.stringify({ status: result.status, catalog: result.catalog, accounts: result.accounts, photographs: result.uniqueCatalogPhotographs, inventory: result.inventory, protectedData: 'unchanged', apiChecks: result.api.length }));
}
if (require.main === module) main().catch(e => { console.error(e.message); process.exitCode = 1; });
