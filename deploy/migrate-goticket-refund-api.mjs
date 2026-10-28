import {connectAll} from './seeds/goticket/runner/src/core.mjs';
import {readFileSync} from 'node:fs';
const db=await connectAll();
try {
 for (const key of ['cart','pay']) {
  await db[key].query('BEGIN');
  try {
   await db[key].query("SET LOCAL lock_timeout='5s'");
   await db[key].query(readFileSync(new URL(`./sql/goticket-refunds-${key}.sql`,import.meta.url),'utf8'));
   if (key === 'pay') await db[key].query(readFileSync(new URL('./sql/goticket-refund-observations.sql',import.meta.url),'utf8'));
   await db[key].query(readFileSync(new URL(`./sql/goticket-refund-simulation-${key}.sql`,import.meta.url),'utf8'));
   await db[key].query('COMMIT');
  } catch(error) {await db[key].query('ROLLBACK');throw error;}
 }
 console.log('Additive refund API tables ready in Cart and GoPay.');
} finally {await Promise.all(Object.values(db).map(client=>client.end()));}
