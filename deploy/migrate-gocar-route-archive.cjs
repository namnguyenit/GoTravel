// For the existing GoCar database, which was provisioned without _prisma_migrations.
// Apply this additive migration only; do not replay the initial schema migrations.
// Run with Node 22: node deploy/migrate-gocar-route-archive.cjs
const { createRequire } = require('node:module');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const carDir = resolve(__dirname, '../car');
if (!process.env.DATABASE_URL) process.loadEnvFile(resolve(carDir, '.env'));
const { PrismaClient } = createRequire(resolve(carDir, 'package.json'))('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sql = readFileSync(resolve(carDir, 'prisma/migrations/20261018010000_archive_routes/migration.sql'), 'utf8');
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '5s'");
    for (const statement of sql.split(';').map((part) => part.trim()).filter(Boolean)) {
      await tx.$executeRawUnsafe(statement);
    }
  });
  console.log('GoCar route archive migration applied (column and index only).');
}

main().catch((error) => {
  console.error('GoCar route archive migration failed:', error.code || error.name);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
