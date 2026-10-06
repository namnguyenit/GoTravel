// Fingerprint transaction history and legacy inventory before/after the import.
// Only aggregated hashes leave these connections; no customer data is printed.
const fs = require('node:fs');
const path = require('node:path');
const { connect } = require('../expansion/db');
const { createHash } = require('node:crypto');
const dir = __dirname;
const baselineFile = path.join(dir, '.private', 'transaction-baseline.json');
const hash = rows => createHash('sha256').update(JSON.stringify(rows)).digest('hex');

async function snapshot() {
  const b = await connect('BookingandInventory');
  const o = await connect('CartandOrder');
  try {
    const ids = JSON.parse(fs.readFileSync(path.join(dir, 'plan.json'))).listings.map(x => x.id);
    const result = {};
    for (const table of ['orders', 'order_items']) {
      const rows = (await o.query(`SELECT * FROM ${table} ORDER BY id`)).rows;
      result[table] = { count: rows.length, sha256: hash(rows) };
    }
    const locks = (await b.query('SELECT * FROM inventory_locks ORDER BY id')).rows;
    result.inventory_locks = { count: locks.length, sha256: hash(locks) };
    for (const table of ['inventory_configs', 'inventory_calendars']) {
      result[table] = (await b.query(`SELECT count(*)::integer AS count, bit_xor(hashtextextended(to_jsonb(r)::text,0))::text AS checksum FROM ${table} r WHERE NOT (listing_id=ANY($1::uuid[]))`, [ids])).rows[0];
    }
    result.legacy_quantity_sum = (await b.query('SELECT sum(available_quantity)::text AS quantity FROM inventory_calendars WHERE NOT (listing_id=ANY($1::uuid[]))', [ids])).rows[0].quantity;
    return result;
  } finally { await b.end(); await o.end(); }
}

async function main() {
  if (!process.argv.includes('--capture')) throw Error('Use --capture once before applying the catalog');
  if (fs.existsSync(baselineFile)) throw Error('The protected baseline already exists; it must not be overwritten');
  const current = await snapshot();
  fs.writeFileSync(baselineFile, JSON.stringify(current, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  console.log(JSON.stringify({ captured: true, legacyConfigs: current.inventory_configs.count, legacyCalendars: current.inventory_calendars.count, orders: current.orders.count, locks: current.inventory_locks.count }));
}
if (require.main === module) main().catch(e => { console.error(e.message); process.exitCode = 1; });
module.exports = { snapshot, baselineFile };
