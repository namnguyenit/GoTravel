// A repeated request must not create another batch or reset existing inventory.
// Research/upload/application of a NEW batch are reviewed steps in README.md.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { connect } = require('../expansion/db');
async function main() {
  const plan = JSON.parse(fs.readFileSync(path.join(__dirname, 'plan.json')));
  const receipt = JSON.parse(fs.readFileSync(path.join(__dirname, 'receipt.json')));
  assert.equal(receipt.status, 'committed', 'Finish or reconcile the existing batch before creating another');
  const accounts = JSON.parse(fs.readFileSync(path.join(__dirname, 'hosts.json'))).accounts;
  const c = await connect('CatalogandListing'), i = await connect('Identity');
  try {
    const existing = (await c.query("SELECT count(*)::integer AS count FROM real_catalog_source_provenance WHERE batch_id=$1 AND record_type='listings' AND record_id=ANY($2::uuid[])", [plan.batchId, plan.listings.map(x => x.id)])).rows[0].count;
    const hosts = (await i.query("SELECT count(*)::integer AS count FROM seed_host_provenance WHERE identity_kind='FICTIONAL_TEST_OPERATOR' AND user_id=ANY($1::text[])", [accounts.map(x => x.id)])).rows[0].count;
    assert.equal(existing, plan.listings.length);
    assert.equal(hosts, 50);
    console.log(JSON.stringify({ status: 'already_completed', batchId: plan.batchId, listings: existing, virtualHosts: hosts, action: 'No new accounts, uploads or inventory writes' }));
  } finally { await c.end(); await i.end(); }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
