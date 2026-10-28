import {connectAll} from './seeds/goticket/runner/src/core.mjs';
import {readFileSync} from 'node:fs';
const db=await connectAll();
try {
 await db.cart.query('BEGIN');
 try {
  await db.cart.query("SET LOCAL lock_timeout='5s'");
  await db.cart.query(readFileSync(new URL('./sql/goticket-automatic-cash-batches.sql',import.meta.url),'utf8'));
  await db.cart.query('COMMIT');
 }catch(error){await db.cart.query('ROLLBACK');throw error;}
 console.log('Automatic cash accounting metadata ready; existing receipts and closed history preserved.');
}finally{await Promise.all(Object.values(db).map(client=>client.end()));}
