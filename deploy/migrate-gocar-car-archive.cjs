// Additive only: the existing database predates Prisma migration tracking.
const { createRequire } = require('node:module');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const carDir = resolve(__dirname, '../car');
if (!process.env.DATABASE_URL) process.loadEnvFile(resolve(carDir, '.env'));
const { PrismaClient } = createRequire(resolve(carDir, 'package.json'))('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const sql = readFileSync(resolve(carDir, 'prisma/migrations/20261027010000_archive_cars/migration.sql'), 'utf8');
  await prisma.$transaction(async tx => {
    await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '5s'");
    for (const statement of sql.split(';').map(s => s.trim()).filter(Boolean)) await tx.$executeRawUnsafe(statement);
  });
  console.log('GoCar vehicle archive column and index applied.');
}
main().catch(error => { console.error('Vehicle archive migration failed:', error.code || error.name); process.exitCode = 1; }).finally(() => prisma.$disconnect());
