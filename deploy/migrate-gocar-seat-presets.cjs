// Additive migration for the existing GoCar DB; never replays initial schemas.
const { createRequire } = require('node:module');
const { readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const { resolve } = require('node:path');
const carDir = resolve(__dirname, '../car');
if (!process.env.DATABASE_URL) process.loadEnvFile(resolve(carDir, '.env'));
const { PrismaClient } = createRequire(resolve(carDir, 'package.json'))('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const sql = readFileSync(resolve(carDir, 'prisma/migrations/20261026010000_seat_class_presets/migration.sql'), 'utf8');
  await prisma.$transaction(async tx => {
    await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '5s'");
    for (const statement of sql.split(';').map(s => s.trim()).filter(Boolean)) await tx.$executeRawUnsafe(statement);
  });
  const cars = await prisma.car.findMany({ where: { seatTemplates: { none: {} } } });
  const backupDir = resolve(__dirname, '../.release-backups/goticket-seat-refund-20261026');
  mkdirSync(backupDir, { recursive: true });
  if (cars.length) writeFileSync(resolve(backupDir, 'cars-before-empty-layout-repair.json'), JSON.stringify(cars, null, 2), { mode: 0o600, flag: 'wx' });
  let repaired = 0;
  for (const car of cars) {
    if (car.totalSeats < 1 || car.totalSeats > 100) continue;
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM cars WHERE id = ${car.id} FOR UPDATE`;
      if (await tx.seatTemplate.count({ where: { carId: car.id } })) return;
      const lower = car.type === 'SLEEPER' && car.totalSeats > 1 ? Math.ceil(car.totalSeats / 2) : car.totalSeats;
      await tx.seatTemplate.createMany({ data: Array.from({ length: car.totalSeats }, (_, index) => {
        const level = index < lower ? 1 : 2, position = level === 1 ? index : index - lower;
        return { carId: car.id, code: `${level === 1 ? 'A' : 'B'}${String(position + 1).padStart(2, '0')}`, level, seatClass: 'STANDARD', row: Math.floor(position / 4), column: position % 4 };
      }) });
      repaired++;
    });
  }
  console.log('Seat class table ready; empty vehicle layouts initialized:', repaired);
})().catch(error => { console.error('Migration failed:', error.code || error.name); process.exitCode = 1; }).finally(() => prisma.$disconnect());
