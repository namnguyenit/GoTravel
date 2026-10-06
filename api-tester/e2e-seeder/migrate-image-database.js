// Update only public Catalog image fields. Never runs a seed or deletes records.
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const { manifestPath } = require('./image-store');
const targets = {
  complexes: { thumbnail_url: 'text', gallery_urls: 'jsonb' },
  landmarks: { thumbnail_url: 'text', gallery_urls: 'jsonb' },
  listings: { thumbnail_url: 'text', attributes: 'jsonb' },
};
const stateDir = path.join(__dirname, '.image-migration');

function connection() {
  if (process.env.CATALOG_DATABASE_URL) return { connectionString: process.env.CATALOG_DATABASE_URL };
  const config = fs.readFileSync(path.resolve(__dirname, '../../CatalogandListing/src/main/resources/database.yaml'), 'utf8');
  const values = {};
  for (const line of config.split('\n')) {
    const match = line.match(/^\s*(url|username|password):\s*(.+)\s*$/);
    if (match) values[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '')
      .replace(/\$\{([^:}]+)(?::([^}]*))?\}/g, (_, key, fallback) => process.env[key] || fallback || '');
  }
  const address = new URL(values.url.replace(/^jdbc:/, ''));
  return { host: address.hostname, port: Number(address.port || 5432),
    database: address.pathname.slice(1), user: values.username, password: values.password };
}

function replaceUrls(value, mapping, stats) {
  if (typeof value === 'string') {
    if (mapping.has(value)) { stats.references++; return mapping.get(value); }
    if (/^https:\/\/(images\.unsplash\.com|upload\.wikimedia\.org)\//.test(value)) stats.unmapped.add(value);
    return value;
  }
  if (Array.isArray(value)) return value.map(item => replaceUrls(item, mapping, stats));
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, replaceUrls(item, mapping, stats)]));
  return value;
}

async function snapshot(client) {
  const result = {};
  for (const [table, columns] of Object.entries(targets)) {
    result[table] = (await client.query(`SELECT id, ${Object.keys(columns).join(', ')} FROM ${table} ORDER BY id`)).rows;
  }
  return result;
}

async function applyRows(client, changes, direction) {
  for (const change of changes) {
    const columns = Object.keys(change.after);
    const from = direction === 'restore' ? change.after : change.before;
    const to = direction === 'restore' ? change.before : change.after;
    const values = [change.id];
    const assignments = columns.map(column => {
      const type = targets[change.table][column];
      values.push(type === 'jsonb' && to[column] !== null ? JSON.stringify(to[column]) : to[column]);
      return `${column} = $${values.length}::${type}`;
    });
    const predicates = columns.map(column => {
      const type = targets[change.table][column];
      values.push(type === 'jsonb' && from[column] !== null ? JSON.stringify(from[column]) : from[column]);
      return `${column} IS NOT DISTINCT FROM $${values.length}::${type}`;
    });
    const updated = await client.query(`UPDATE ${change.table} SET ${assignments.join(', ')}
      WHERE id = $1 AND ${predicates.join(' AND ')}`, values);
    if (updated.rowCount !== 1) throw new Error(`Concurrent change in ${change.table} ${change.id}; transaction rolled back`);
  }
}

async function migrate(mode, backupFile) {
  fs.mkdirSync(stateDir, { recursive: true, mode: 0o700 });
  const client = new Client({ ...connection(), connectionTimeoutMillis: 5000, application_name: 'gotravel_image_migration' });
  let artifact;
  try {
    await client.connect();
    const database = (await client.query('SELECT current_database() AS name')).rows[0].name;
    if (mode === '--restore') {
      if (!backupFile) throw new Error('Provide the backup JSON path to --restore');
      artifact = JSON.parse(fs.readFileSync(backupFile));
      if (artifact.schemaVersion !== 1 || artifact.database !== database || !artifact.changes?.length) {
        throw new Error('Invalid backup, wrong database, or empty changes');
      }
      for (const change of artifact.changes) {
        if (!targets[change.table] || !/^[0-9a-f-]{36}$/i.test(change.id) ||
            !change.before || !change.after || !Object.keys(change.after).length ||
            Object.keys(change.after).some(key => !targets[change.table][key] || !(key in change.before)) ||
            Object.keys(change.before).some(key => !(key in change.after))) throw new Error('Invalid backup row');
      }
    } else {
      const manifest = JSON.parse(fs.readFileSync(manifestPath));
      const mapping = new Map();
      for (const [source, entry] of Object.entries(manifest.assets)) {
        if (entry.state !== 'verified' || !entry.verifiedAt || entry.deliveryHttpStatus !== 200 ||
            !entry.publicId?.startsWith('admin-uploads/seeder/') ||
            !entry.secureUrl?.startsWith(`https://res.cloudinary.com/${manifest.cloudName}/image/upload/`)) {
          throw new Error('Manifest contains an unverified or unexpected Cloudinary asset');
        }
        if (entry.secureUrl.length > 255) throw new Error('Cloudinary URL exceeds thumbnail column length');
        mapping.set(source, entry.secureUrl);
      }
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const before = await snapshot(client);
      await client.query('ROLLBACK');
      const stats = { references: 0, unmapped: new Set() };
      const changes = [];
      for (const [table, rows] of Object.entries(before)) for (const row of rows) {
        const old = {}, next = {};
        for (const column of Object.keys(targets[table])) {
          const replaced = replaceUrls(row[column], mapping, stats);
          if (JSON.stringify(replaced) !== JSON.stringify(row[column])) {
            old[column] = row[column]; next[column] = replaced;
          }
        }
        if (Object.keys(next).length) changes.push({ table, id: row.id, before: old, after: next });
      }
      if (stats.unmapped.size) throw new Error(`${stats.unmapped.size} external URLs are not migrated; database unchanged`);
      artifact = { schemaVersion: 1, database, createdAt: new Date().toISOString(),
        status: 'prepared', cloudName: manifest.cloudName, references: stats.references,
        rowCounts: Object.fromEntries(Object.entries(before).map(([table, rows]) => [table, rows.length])), changes };
      backupFile = path.join(stateDir, `database-backup-${Date.now()}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(artifact, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
      console.log(JSON.stringify({ mode, references: stats.references, rows: changes.length, backupFile }));
      if (mode !== '--apply' || !changes.length) return artifact;
    }
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout='5s'");
    await client.query("SET LOCAL statement_timeout='30s'");
    const locked = (await client.query("SELECT pg_try_advisory_xact_lock(hashtext('gotravel-image-migration')) AS locked")).rows[0].locked;
    if (!locked) throw new Error('Another image database migration is running');
    await applyRows(client, artifact.changes, mode === '--restore' ? 'restore' : 'apply');
    const after = await snapshot(client);
    for (const [table, rows] of Object.entries(after)) if (rows.length !== artifact.rowCounts[table]) {
      throw new Error(`Row count changed in ${table}; transaction rolled back`);
    }
    if (mode === '--apply') {
      const stats = { references: 0, unmapped: new Set() };
      for (const rows of Object.values(after)) for (const row of rows) replaceUrls(row, new Map(), stats);
      if (stats.unmapped.size) throw new Error('External source URL remains; transaction rolled back');
    }
    await client.query('COMMIT');
    artifact.status = mode === '--restore' ? 'restored' : 'applied';
    artifact.completedAt = new Date().toISOString();
    fs.writeFileSync(backupFile, JSON.stringify(artifact, null, 2) + '\n', { mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, rows: artifact.changes.length, references: artifact.references, backupFile }));
    return artifact;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { await client.end(); }
}

if (require.main === module) {
  const mode = process.argv[2] || '--dry-run';
  if (!['--dry-run', '--apply', '--restore'].includes(mode)) throw new Error('Use --dry-run, --apply or --restore <backup.json>');
  migrate(mode, process.argv[3]).catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { replaceUrls, applyRows, migrate, targets };
